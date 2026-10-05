"""Adım 3 - Analiz ve backtest.

data/clean/<SEMBOL>.csv dosyalarından dönemsel getirileri, SMA stratejisini ve
Buy & Hold'u hesaplar; sonuçları dashboard için public/data/ altına JSON yazar.
Hazır backtest kütüphanesi yok; hesapların hepsi pandas/numpy ile yapılır.
"""
import json

import numpy as np
import pandas as pd

import config

# Dönemsel getiriler: ad -> (resample kuralı, tarih etiketi biçimi)
PERIODS = {
    "daily": ("D", "%Y-%m-%d"),
    "weekly": ("W-FRI", "%Y-%m-%d"),  # haftalar cuma günü biter
    "monthly": ("ME", "%Y-%m"),       # ay sonu
    "yearly": ("YE", "%Y"),           # yıl sonu
}


def load_clean(symbol):
    """Temiz veriyi tarih index'li DataFrame olarak okur."""
    path = config.CLEAN_DIR / f"{symbol}.csv"
    return pd.read_csv(path, index_col="date", parse_dates=True)


def period_returns(price, freq):
    """Bir fiyat (ya da portföy değeri) serisinden dönemsel yüzde getirileri hesaplar."""
    if freq == "D":  # günlük: bir önceki işlem gününe göre değişim
        return price.pct_change().dropna() * 100

    period_end = price.resample(freq).last().dropna()  # her dönemin son değeri
    returns = period_end.pct_change()
    # İlk dönemin bir öncesi yok; onun getirisini verideki ilk değere göre hesaplıyoruz.
    returns.iloc[0] = period_end.iloc[0] / price.iloc[0] - 1
    return returns * 100


def add_signals(df):
    """Fiyata hareketli ortalamaları, sinyali ve pozisyonu ekler."""
    # Fiyat olarak düzeltilmiş kapanışı kullanıyoruz (temettü ve bölünmeler dahil).
    data = pd.DataFrame({"price": df["adj_close"]})
    data["sma_short"] = data["price"].rolling(config.SMA_SHORT).mean()
    data["sma_long"] = data["price"].rolling(config.SMA_LONG).mean()

    # Sinyal: kısa ortalama uzun ortalamanın üstündeyse 1 (pozisyonda ol), değilse 0 (nakit).
    # İlk SMA_LONG - 1 günde uzun ortalama yoktur (NaN); karşılaştırma False verir, yani nakit.
    data["signal"] = (data["sma_short"] > data["sma_long"]).astype(int)

    # Look-ahead bias olmaması için sinyali 1 gün kaydırıyoruz: bugünkü pozisyonu
    # dünün kapanışında oluşan sinyal belirler, bugünün fiyatı karara girmez.
    data["position"] = data["signal"].shift(1).fillna(0).astype(int)
    return data


def equity_curve(price, position):
    """Verilen pozisyon serisi (1 = pozisyonda, 0 = nakit) için portföy değerini hesaplar."""
    daily_return = price.pct_change().fillna(0)
    trade = position.diff().abs().fillna(0)  # yeni pozisyonun ilk günü 1, diğer günler 0
    # Pozisyondaysak günün getirisini alırız. İşlem bir önceki günün kapanışında
    # yapılmıştır; komisyonunu yeni pozisyonun ilk gününde düşeriz.
    growth = (1 + position * daily_return) * (1 - trade * config.COMMISSION)
    return config.INITIAL_CAPITAL * growth.cumprod()


def compute_metrics(equity, trades):
    """Bir portföy değeri serisinden performans metriklerini hesaplar."""
    daily_return = equity.pct_change().dropna()
    years = (equity.index[-1] - equity.index[0]).days / 365.25
    total_return = equity.iloc[-1] / config.INITIAL_CAPITAL - 1
    cagr = (1 + total_return) ** (1 / years) - 1  # yıllık bileşik getiri
    volatility = daily_return.std() * np.sqrt(config.TRADING_DAYS)
    # Sharpe oranı (risksiz faiz 0): yıllık ortalama getiri / yıllık oynaklık.
    # Portföy hiç pozisyona girmediyse oynaklık 0 olur; o durumda Sharpe 0 yazılır.
    sharpe = 0.0
    if volatility > 0:
        sharpe = daily_return.mean() * config.TRADING_DAYS / volatility
    drawdown = equity / equity.cummax() - 1  # o güne kadarki zirveye göre düşüş

    return {
        "final_value": round(float(equity.iloc[-1]), 2),
        "profit": round(float(equity.iloc[-1] - config.INITIAL_CAPITAL), 2),
        "total_return_pct": round(float(total_return * 100), 2),
        "cagr_pct": round(float(cagr * 100), 2),
        "volatility_pct": round(float(volatility * 100), 2),
        "sharpe": round(float(sharpe), 2),
        "max_drawdown_pct": round(float(drawdown.min() * 100), 2),
        "trades": trades,
    }


def list_trades(data):
    """Al/sat işlemlerini listeler. İşlem, sinyalin değiştiği günün kapanış fiyatıyla yapılır."""
    data = data.iloc[:-1]  # son günün sinyali henüz işleme dönüşmedi (pozisyon ertesi gün değişir)
    changed = data[data["signal"].diff().abs() == 1]
    return [
        {
            "date": date.strftime("%Y-%m-%d"),
            "type": "AL" if row["signal"] == 1 else "SAT",
            "price": round(float(row["price"]), 2),
        }
        for date, row in changed.iterrows()
    ]


def to_points(series, date_format):
    """Bir seriyi [{"date": ..., "value": ...}] listesine çevirir."""
    return [
        {"date": date.strftime(date_format), "value": round(float(value), 2)}
        for date, value in series.items()
    ]


def to_records(df):
    """DataFrame'i JSON'a yazılabilir satır listesine çevirir (NaN -> null)."""
    df = df.round(2).reset_index()
    df["date"] = df["date"].dt.strftime("%Y-%m-%d")
    return json.loads(df.to_json(orient="records"))


def analyze(symbol):
    """Bir sembolün tüm hesaplarını yapar. (özet, detay) sözlüklerini döndürür."""
    data = add_signals(load_clean(symbol))
    price = data["price"]

    # Buy & Hold: sinyal her gün 1. Stratejiyle aynı kuraldan geçer, yani ilk günün
    # kapanışında alınır ve o tek işlem için komisyon ödenir.
    hold = pd.Series(1, index=price.index).shift(1).fillna(0)
    data["strategy"] = equity_curve(price, data["position"])
    data["buy_hold"] = equity_curve(price, hold)

    signals = list_trades(data)
    returns = {
        name: to_points(period_returns(price, freq), date_format)
        for name, (freq, date_format) in PERIODS.items()
    }

    detail = {
        "symbol": symbol,
        "daily": to_records(data[["price", "sma_short", "sma_long", "strategy", "buy_hold"]]),
        "signals": signals,
        "returns": returns,
        "strategy_yearly": to_points(period_returns(data["strategy"], "YE"), "%Y"),
    }
    summary = {
        "symbol": symbol,
        "name": config.SYMBOLS[symbol],
        "start": price.index[0].strftime("%Y-%m-%d"),
        "end": price.index[-1].strftime("%Y-%m-%d"),
        "rows": len(price),
        "strategy": compute_metrics(data["strategy"], trades=len(signals)),
        "buy_hold": compute_metrics(data["buy_hold"], trades=1),  # tek işlem: ilk alım
    }
    return summary, detail


def write_json(path, content, indent=None):
    """İçeriği JSON dosyasına yazar."""
    with open(path, "w", encoding="utf-8") as file:
        json.dump(content, file, ensure_ascii=False, indent=indent)


def main():
    """Temiz verisi olan her sembolü analiz eder ve JSON dosyalarını yazar."""
    config.OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    summaries = []
    for symbol in config.SYMBOLS:
        if not (config.CLEAN_DIR / f"{symbol}.csv").exists():
            print(f"  UYARI: {symbol} için temiz veri yok, atlanıyor")
            continue

        summary, detail = analyze(symbol)
        write_json(config.OUTPUT_DIR / f"{symbol}.json", detail)
        summaries.append(summary)
        print(
            f"  {symbol}: strateji %{summary['strategy']['total_return_pct']}, "
            f"Buy & Hold %{summary['buy_hold']['total_return_pct']}"
        )

    # Özet dosyası: son güncelleme zamanı, parametreler ve her sembolün metrik tablosu
    write_json(
        config.OUTPUT_DIR / "summary.json",
        {
            "updated_at": pd.Timestamp.now(tz="UTC").strftime("%Y-%m-%dT%H:%M:%SZ"),
            "params": {
                "years": config.YEARS,
                "sma_short": config.SMA_SHORT,
                "sma_long": config.SMA_LONG,
                "commission": config.COMMISSION,
                "initial_capital": config.INITIAL_CAPITAL,
            },
            "symbols": summaries,
        },
        indent=2,
    )


if __name__ == "__main__":
    main()
