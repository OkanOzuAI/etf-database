"""Adım 1 - Veri çekme.

Yahoo Finance'in halka açık "chart" adresinden günlük fiyat verisini indirir,
JSON yanıtını ayrıştırıp DataFrame'e çevirir ve data/raw/<SEMBOL>.csv olarak kaydeder.
API anahtarı ya da hazır veri kütüphanesi yok; sadece requests + pandas.
"""
import io
import time

import pandas as pd
import requests

import config

YAHOO_URL = "https://query1.finance.yahoo.com/v8/finance/chart/{symbol}"
STOOQ_URL = "https://stooq.com/q/d/l/"

# Yahoo, User-Agent başlığı "python-requests" olan istekleri 429 hatasıyla reddediyor.
# Bu yüzden sade bir tarayıcı başlığı gönderiyoruz.
HEADERS = {"User-Agent": "Mozilla/5.0"}


def date_range():
    """Çekilecek dönemi döndürür: bugünden geriye YEARS yıl.

    Bitiş olarak bugünün başlangıcını (UTC 00:00) alıyoruz. Böylece henüz
    kapanmamış günün yarım verisi gelmez, sadece tamamlanmış günler gelir.
    """
    end = pd.Timestamp.now(tz="UTC").normalize()
    start = end - pd.DateOffset(years=config.YEARS)
    return start, end


def get_with_retry(url, params):
    """GET isteği atar; hata alırsa kısa bir süre bekleyip yeniden dener."""
    for attempt in range(1, config.MAX_RETRIES + 1):
        try:
            response = requests.get(
                url, params=params, headers=HEADERS, timeout=config.REQUEST_TIMEOUT
            )
            response.raise_for_status()  # 4xx / 5xx yanıtlarını hata say
            return response
        except requests.RequestException as error:
            print(f"    deneme {attempt}/{config.MAX_RETRIES} başarısız: {error}")
            if attempt == config.MAX_RETRIES:
                raise
            time.sleep(config.SLEEP_SECONDS * attempt)  # her denemede biraz daha uzun bekle


def fetch_yahoo(symbol, start, end):
    """Bir sembolün günlük verisini Yahoo Finance'ten çeker, DataFrame döndürür."""
    params = {
        "period1": int(start.timestamp()),  # başlangıç (Unix saniyesi)
        "period2": int(end.timestamp()),    # bitiş (Unix saniyesi)
        "interval": "1d",                   # günlük veri
    }
    response = get_with_retry(YAHOO_URL.format(symbol=symbol), params)
    result = response.json()["chart"]["result"][0]

    # Yanıtta tarihler ve fiyatlar ayrı listeler halinde gelir (hepsi aynı uzunlukta).
    quote = result["indicators"]["quote"][0]
    df = pd.DataFrame({
        "Date": result["timestamp"],
        "Open": quote["open"],
        "High": quote["high"],
        "Low": quote["low"],
        "Close": quote["close"],
        "Adj Close": result["indicators"]["adjclose"][0]["adjclose"],
        "Volume": quote["volume"],
    })

    # Tarihler Unix saniyesi olarak gelir (seansın açılış anı). Borsanın saat
    # dilimine çevirip sadece gün kısmını alıyoruz.
    timezone = result["meta"]["exchangeTimezoneName"]
    dates = pd.to_datetime(df["Date"], unit="s", utc=True).dt.tz_convert(timezone)
    df["Date"] = dates.dt.strftime("%Y-%m-%d")
    return df


def fetch_stooq(symbol, start, end):
    """Yedek kaynak: Stooq'un CSV indirme adresi (düzeltilmiş kapanış sütunu yok)."""
    params = {
        "s": f"{symbol.lower()}.us",     # Stooq'ta ABD sembolleri ".us" ile biter
        "d1": start.strftime("%Y%m%d"),  # başlangıç
        "d2": (end - pd.Timedelta(days=1)).strftime("%Y%m%d"),  # bitiş (dün dahil)
        "i": "d",                        # günlük veri
    }
    response = get_with_retry(STOOQ_URL, params)
    # Stooq veri yerine bir doğrulama/hata sayfası da döndürebiliyor; CSV mi diye bakıyoruz.
    if not response.text.startswith("Date,"):
        raise ValueError("Stooq CSV yerine başka bir sayfa döndürdü")
    # read_csv bir dosya bekler; StringIO indirilen metni dosya gibi okunabilir yapar.
    return pd.read_csv(io.StringIO(response.text))


def fetch_symbol(symbol):
    """Önce Yahoo'yu, olmazsa Stooq'u dener. İkisi de olmazsa None döndürür."""
    start, end = date_range()
    for source, fetch in [("Yahoo Finance", fetch_yahoo), ("Stooq", fetch_stooq)]:
        try:
            df = fetch(symbol, start, end)
            print(f"  {symbol}: {len(df)} satır indirildi ({source})")
            return df
        except Exception as error:  # ağ hatası, beklenmeyen yanıt vb. - script durmasın
            print(f"  UYARI: {symbol} {source} kaynağından alınamadı: {error}")
    return None


def main():
    """Tüm sembolleri indirir. İndirilemeyen sembollerin listesini döndürür."""
    config.RAW_DIR.mkdir(parents=True, exist_ok=True)
    failed = []
    for symbol in config.SYMBOLS:
        df = fetch_symbol(symbol)
        if df is None:
            failed.append(symbol)  # bu sembolü atla, diğerleriyle devam et
        else:
            df.to_csv(config.RAW_DIR / f"{symbol}.csv", index=False)
        time.sleep(config.SLEEP_SECONDS)  # sunucuyu yormamak için kısa bekleme
    return failed


if __name__ == "__main__":
    main()
