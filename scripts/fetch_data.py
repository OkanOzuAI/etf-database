"""Step 1 - Download the data.

Downloads daily prices and saves them as data/raw/<SYMBOL>.csv:
- US-listed ETFs and the USD/TRY exchange rate from Yahoo Finance's public "chart" address,
- Turkish funds from the public data address of TEFAS (tefas.gov.tr).
No API key and no ready-made data library; only requests + pandas.
"""
import io
import time

import pandas as pd
import requests

import config

YAHOO_URL = "https://query1.finance.yahoo.com/v8/finance/chart/{symbol}"
TEFAS_URL = "https://www.tefas.gov.tr/api/funds/fonFiyatBilgiGetir"
STOOQ_URL = "https://stooq.com/q/d/l/"

# Yahoo rejects requests whose User-Agent header is "python-requests" (error 429),
# so we send a plain browser-style header.
HEADERS = {"User-Agent": "Mozilla/5.0"}


def date_range():
    """Returns the period to download: the last YEARS years.

    The end is the start of today (00:00 UTC). This way the unfinished
    trading day is never included, only completed days.
    """
    end = pd.Timestamp.now(tz="UTC").normalize()
    start = end - pd.DateOffset(years=config.YEARS)
    return start, end


def request_with_retry(url, params=None, json=None):
    """Sends a request; on an error it waits a little and tries again.

    Without a JSON body it is a GET request (Yahoo, Stooq), with one it is a POST request (TEFAS).
    """
    for attempt in range(1, config.MAX_TRIES + 1):
        try:
            if json is None:
                response = requests.get(url, params=params, headers=HEADERS, timeout=config.REQUEST_TIMEOUT)
            else:
                response = requests.post(url, json=json, headers=HEADERS, timeout=config.REQUEST_TIMEOUT)
            response.raise_for_status()  # treat 4xx / 5xx answers as errors
            return response
        except requests.RequestException as error:
            print(f"    attempt {attempt}/{config.MAX_TRIES} failed: {error}")
            if attempt == config.MAX_TRIES:
                raise
            time.sleep(config.SLEEP_SECONDS * attempt)  # wait a bit longer each time


def fetch_yahoo(symbol, start, end):
    """Downloads the daily data of one symbol from Yahoo Finance as a DataFrame."""
    params = {
        "period1": int(start.timestamp()),  # start (Unix seconds)
        "period2": int(end.timestamp()),    # end (Unix seconds)
        "interval": "1d",                   # daily data
    }
    response = request_with_retry(YAHOO_URL.format(symbol=symbol), params=params)
    result = response.json()["chart"]["result"][0]

    # The answer holds the dates and the prices as separate lists of the same length.
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

    # Dates arrive as Unix seconds (the moment the session opens). We convert
    # them to the time zone of the exchange and keep only the day.
    timezone = result["meta"]["exchangeTimezoneName"]
    dates = pd.to_datetime(df["Date"], unit="s", utc=True).dt.tz_convert(timezone)
    df["Date"] = dates.dt.strftime("%Y-%m-%d")

    # Yahoo can add the current, unfinished day as the last row (it does this for
    # exchange rates). We keep only the days before the end day.
    return df[df["Date"] < end.strftime("%Y-%m-%d")]


def fetch_tefas(symbol, start, end):
    """Downloads the daily prices of one Turkish fund from TEFAS as a DataFrame.

    TEFAS gives one price per day in Turkish lira: the price of one fund share, or for
    an ETF its closing price on the exchange. The price shown for a day comes from the
    market of the trading day before. TEFAS gives at most the last 60 months, so the
    Turkish history is shorter than YEARS.
    """
    body = {"fonKodu": symbol, "dil": "TR", "periyod": config.TEFAS_MONTHS}
    response = request_with_retry(TEFAS_URL, json=body)
    rows = response.json()["resultList"]  # one row per day: "tarih" (date) and "fiyat" (price)
    if not rows:
        raise ValueError("TEFAS returned no rows for this fund code")

    df = pd.DataFrame({
        "Date": [row["tarih"] for row in rows],
        "Close": [row["fiyat"] for row in rows],
    })
    # Keep the same period rule as for Yahoo: from the start day to the day before the end day
    in_period = (df["Date"] >= start.strftime("%Y-%m-%d")) & (df["Date"] < end.strftime("%Y-%m-%d"))
    return df[in_period]


def fetch_stooq(symbol, start, end):
    """Backup source for US ETFs: Stooq's CSV download address (it has no adjusted close column)."""
    params = {
        "s": f"{symbol.lower()}.us",     # US symbols end with ".us" on Stooq
        "d1": start.strftime("%Y%m%d"),  # start
        "d2": (end - pd.Timedelta(days=1)).strftime("%Y%m%d"),  # end (yesterday included)
        "i": "d",                        # daily data
    }
    response = request_with_retry(STOOQ_URL, params=params)
    # Stooq can also answer with a verification or error page; check that it is a CSV.
    if not response.text.startswith("Date,"):
        raise ValueError("Stooq returned a page instead of a CSV file")
    # read_csv expects a file; StringIO lets it read the downloaded text like a file.
    return pd.read_csv(io.StringIO(response.text))


# Which functions are tried for each kind of source, in this order
SOURCES = {
    "yahoo": [("Yahoo Finance", fetch_yahoo), ("Stooq", fetch_stooq)],  # US ETFs (Stooq is the backup)
    "tefas": [("TEFAS", fetch_tefas)],                                  # Turkish funds
    "fx": [("Yahoo Finance", fetch_yahoo)],                             # exchange rate
}


def fetch_symbol(symbol, source="yahoo"):
    """Tries the sources of this symbol in order. Returns None if all of them fail."""
    start, end = date_range()
    for source_name, fetch in SOURCES[source]:
        try:
            df = fetch(symbol, start, end)
            print(f"  {symbol}: {len(df)} rows downloaded ({source_name})")
            return df
        except Exception as error:  # network error, unexpected answer... do not stop the script
            print(f"  WARNING: could not get {symbol} from {source_name}: {error}")
    return None


def main():
    """Downloads every instrument and the exchange rate. Returns the list of names that failed."""
    config.RAW_DIR.mkdir(parents=True, exist_ok=True)

    # (file name, symbol at the source, kind of source)
    downloads = [(symbol, symbol, info["source"]) for symbol, info in config.SYMBOLS.items()]
    downloads.append((config.FX_NAME, config.FX_YAHOO_SYMBOL, "fx"))

    failed = []
    for name, symbol, source in downloads:
        df = fetch_symbol(symbol, source)
        if df is None:
            failed.append(name)  # skip this one and continue with the others
        else:
            df.to_csv(config.RAW_DIR / f"{name}.csv", index=False)
        # Short pause so we do not overload the server (TEFAS allows fewer requests per minute)
        time.sleep(config.TEFAS_SLEEP_SECONDS if source == "tefas" else config.SLEEP_SECONDS)
    return failed


if __name__ == "__main__":
    main()
