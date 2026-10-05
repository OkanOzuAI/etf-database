"""Step 1 - Download the data.

Downloads daily prices from Yahoo Finance's public "chart" address, parses the
JSON answer into a DataFrame and saves it as data/raw/<SYMBOL>.csv.
No API key and no ready-made data library; only requests + pandas.
"""
import io
import time

import pandas as pd
import requests

import config

YAHOO_URL = "https://query1.finance.yahoo.com/v8/finance/chart/{symbol}"
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


def get_with_retry(url, params):
    """Sends a GET request; on an error it waits a little and tries again."""
    for attempt in range(1, config.MAX_TRIES + 1):
        try:
            response = requests.get(
                url, params=params, headers=HEADERS, timeout=config.REQUEST_TIMEOUT
            )
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
    response = get_with_retry(YAHOO_URL.format(symbol=symbol), params)
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
    return df


def fetch_stooq(symbol, start, end):
    """Backup source: Stooq's CSV download address (it has no adjusted close column)."""
    params = {
        "s": f"{symbol.lower()}.us",     # US symbols end with ".us" on Stooq
        "d1": start.strftime("%Y%m%d"),  # start
        "d2": (end - pd.Timedelta(days=1)).strftime("%Y%m%d"),  # end (yesterday included)
        "i": "d",                        # daily data
    }
    response = get_with_retry(STOOQ_URL, params)
    # Stooq can also answer with a verification or error page; check that it is a CSV.
    if not response.text.startswith("Date,"):
        raise ValueError("Stooq returned a page instead of a CSV file")
    # read_csv expects a file; StringIO lets it read the downloaded text like a file.
    return pd.read_csv(io.StringIO(response.text))


def fetch_symbol(symbol):
    """Tries Yahoo first, then Stooq. Returns None if both fail."""
    start, end = date_range()
    for source, fetch in [("Yahoo Finance", fetch_yahoo), ("Stooq", fetch_stooq)]:
        try:
            df = fetch(symbol, start, end)
            print(f"  {symbol}: {len(df)} rows downloaded ({source})")
            return df
        except Exception as error:  # network error, unexpected answer... do not stop the script
            print(f"  WARNING: could not get {symbol} from {source}: {error}")
    return None


def main():
    """Downloads every symbol. Returns the list of symbols that could not be downloaded."""
    config.RAW_DIR.mkdir(parents=True, exist_ok=True)
    failed = []
    for symbol in config.SYMBOLS:
        df = fetch_symbol(symbol)
        if df is None:
            failed.append(symbol)  # skip this symbol and continue with the others
        else:
            df.to_csv(config.RAW_DIR / f"{symbol}.csv", index=False)
        time.sleep(config.SLEEP_SECONDS)  # short pause so we do not overload the server
    return failed


if __name__ == "__main__":
    main()
