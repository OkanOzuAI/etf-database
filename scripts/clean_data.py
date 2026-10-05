"""Adım 2 - Veri temizleme.

data/raw/<SEMBOL>.csv dosyalarını okur, temizler ve data/clean/<SEMBOL>.csv
olarak kaydeder. Her sembol için kısa bir veri kalite özeti yazdırır.
"""
import pandas as pd

import config

PRICE_COLUMNS = ["open", "high", "low", "close", "adj_close"]


def clean(raw):
    """Ham DataFrame'i temizler. (temiz DataFrame, kalite özeti) döndürür."""
    df = raw.copy()

    # 1) Sütun adlarını sadeleştir: "Adj Close" -> "adj_close"
    df.columns = [name.strip().lower().replace(" ", "_") for name in df.columns]

    # 2) Tarihi datetime'a çevir ve index yap (tarihi okunamayan satırlar atılır)
    df["date"] = pd.to_datetime(df["date"], errors="coerce")
    df = df.dropna(subset=["date"]).set_index("date")

    # 3) Aynı güne ait tekrarlı satırları at (dosyadaki sonuncuyu tut), sonra eskiden yeniye sırala
    is_duplicate = df.index.duplicated(keep="last")
    df = df[~is_duplicate].sort_index()

    # 4) Düzeltilmiş kapanış sütunu yoksa (ör. Stooq) kapanışı kullan
    if "adj_close" not in df.columns:
        df["adj_close"] = df["close"]

    # 5) Tip dönüşümü: tüm sütunlar sayıya çevrilir; çevrilemeyen değerler NaN (eksik) olur
    df = df[PRICE_COLUMNS + ["volume"]].apply(pd.to_numeric, errors="coerce").astype(float)
    missing = int(df.isna().sum().sum())

    # 6) Fiyat sıfır ya da negatif olamaz; böyle değerleri de eksik say
    invalid = int((df[PRICE_COLUMNS] <= 0).sum().sum())
    df[PRICE_COLUMNS] = df[PRICE_COLUMNS].where(df[PRICE_COLUMNS] > 0)

    # 7) Eksik değerleri doldur.
    # Fiyatlarda forward-fill: eksik günün fiyatı yerine bilinen son fiyatı yazarız.
    # Böylece sadece geçmişteki bilgi kullanılır; backfill ya da interpolasyon
    # sonraki günün fiyatını bugüne taşıyıp backtest'i yanıltırdı.
    df[PRICE_COLUMNS] = df[PRICE_COLUMNS].ffill()
    df["volume"] = df["volume"].fillna(0)  # hacim bilinmiyorsa 0 (analizde kullanılmıyor)
    df = df.dropna()                       # en başta kalan, doldurulamayan satırlar
    df["volume"] = df["volume"].astype("int64")

    summary = {
        "rows": len(df),
        "start": df.index[0].strftime("%Y-%m-%d"),
        "end": df.index[-1].strftime("%Y-%m-%d"),
        "missing": missing,
        "duplicates": int(is_duplicate.sum()),
        "invalid_prices": invalid,
    }
    return df, summary


def main():
    """Ham verisi olan her sembolü temizler ve kaydeder."""
    config.CLEAN_DIR.mkdir(parents=True, exist_ok=True)
    for symbol in config.SYMBOLS:
        raw_path = config.RAW_DIR / f"{symbol}.csv"
        if not raw_path.exists():
            print(f"  UYARI: {symbol} için ham veri yok, atlanıyor")
            continue

        df, summary = clean(pd.read_csv(raw_path))
        df.to_csv(config.CLEAN_DIR / f"{symbol}.csv")
        print(
            f"  {symbol}: {summary['rows']} satır, {summary['start']} - {summary['end']}, "
            f"eksik değer: {summary['missing']}, tekrarlı gün: {summary['duplicates']}, "
            f"geçersiz fiyat: {summary['invalid_prices']}"
        )


if __name__ == "__main__":
    main()
