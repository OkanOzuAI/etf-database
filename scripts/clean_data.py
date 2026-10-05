"""Step 2 - Clean the data.

Reads the data/raw/<SYMBOL>.csv files, cleans them and saves them as
data/clean/<SYMBOL>.csv. Prints a short data quality summary for every symbol.
"""
import pandas as pd

import config

PRICE_COLUMNS = ["open", "high", "low", "close", "adj_close"]


def clean(raw):
    """Cleans a raw DataFrame. Returns (clean DataFrame, quality summary)."""
    df = raw.copy()

    # 1) Simplify the column names: "Adj Close" -> "adj_close"
    df.columns = [name.strip().lower().replace(" ", "_") for name in df.columns]

    # 2) Convert the date to datetime and make it the index (rows with an unreadable date are dropped)
    df["date"] = pd.to_datetime(df["date"], errors="coerce")
    df = df.dropna(subset=["date"]).set_index("date")

    # 3) Drop repeated days (keep the last one in the file), then sort from old to new
    is_duplicate = df.index.duplicated(keep="last")
    df = df[~is_duplicate].sort_index()

    # 4) If there is no adjusted close column (for example Stooq), use the close
    if "adj_close" not in df.columns:
        df["adj_close"] = df["close"]

    # 5) Type conversion: every column becomes a number; values that are not numbers become NaN (missing)
    df = df[PRICE_COLUMNS + ["volume"]].apply(pd.to_numeric, errors="coerce").astype(float)
    missing = int(df.isna().sum().sum())

    # 6) A price cannot be zero or negative; count such values as missing too
    invalid = int((df[PRICE_COLUMNS] <= 0).sum().sum())
    df[PRICE_COLUMNS] = df[PRICE_COLUMNS].where(df[PRICE_COLUMNS] > 0)

    # 7) Fill the missing values.
    # Prices use forward-fill: a missing day gets the last known price.
    # This only uses information from the past. Back-fill or interpolation
    # would bring a later price into an earlier day and mislead the backtest.
    df[PRICE_COLUMNS] = df[PRICE_COLUMNS].ffill()
    df["volume"] = df["volume"].fillna(0)  # unknown volume becomes 0 (volume is not used in the analysis)
    df = df.dropna()                       # rows at the very start that could not be filled
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
    """Cleans and saves every symbol that has raw data."""
    config.CLEAN_DIR.mkdir(parents=True, exist_ok=True)
    for symbol in config.SYMBOLS:
        raw_path = config.RAW_DIR / f"{symbol}.csv"
        if not raw_path.exists():
            print(f"  WARNING: no raw data for {symbol}, skipping")
            continue

        df, summary = clean(pd.read_csv(raw_path))
        df.to_csv(config.CLEAN_DIR / f"{symbol}.csv")
        print(
            f"  {symbol}: {summary['rows']} rows, {summary['start']} to {summary['end']}, "
            f"missing values: {summary['missing']}, repeated days: {summary['duplicates']}, "
            f"invalid prices: {summary['invalid_prices']}"
        )


if __name__ == "__main__":
    main()
