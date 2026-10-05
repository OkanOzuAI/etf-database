"""Step 3 - Analysis and backtest.

Reads data/clean/<SYMBOL>.csv, computes the returns, the SMA strategy and
Buy & Hold, and writes the results as JSON files under public/data/ for the
dashboard. No backtest library; everything is computed with pandas / numpy.
"""
import json

import numpy as np
import pandas as pd

import config

# Period returns: name -> (resample rule, date label format)
PERIODS = {
    "daily": ("D", "%Y-%m-%d"),
    "weekly": ("W-FRI", "%Y-%m-%d"),  # weeks end on Friday
    "monthly": ("ME", "%Y-%m"),       # month end
    "yearly": ("YE", "%Y"),           # year end
}

# Look-back windows for the trailing returns (for example "1Y" = the last 1 year)
TRAILING = {
    "1M": pd.DateOffset(months=1),
    "3M": pd.DateOffset(months=3),
    "6M": pd.DateOffset(months=6),
    "1Y": pd.DateOffset(years=1),
    "3Y": pd.DateOffset(years=3),
    "5Y": pd.DateOffset(years=5),
}


def load_clean(symbol):
    """Reads the clean data as a DataFrame with the date as index."""
    path = config.CLEAN_DIR / f"{symbol}.csv"
    return pd.read_csv(path, index_col="date", parse_dates=True)


def period_returns(price, freq):
    """Computes percent returns per period from a price (or portfolio value) series."""
    if freq == "D":  # daily: change from the previous trading day
        return price.pct_change().dropna() * 100

    period_end = price.resample(freq).last().dropna()  # last value of each period
    returns = period_end.pct_change()
    # The first period has no period before it; we measure it from the first value in the data.
    returns.iloc[0] = period_end.iloc[0] / price.iloc[0] - 1
    return returns * 100


def trailing_returns(price):
    """Computes the percent change of the price over look-back windows that end on the last day."""
    last_day = price.index[-1]
    last_price = price.iloc[-1]

    returns = {"1D": price.pct_change().iloc[-1]}
    for label, offset in TRAILING.items():
        start_day = last_day - offset
        if start_day >= price.index[0]:  # skip windows that are longer than our data
            # asof: the last known price on or before that day
            returns[label] = last_price / price.asof(start_day) - 1
    # YTD (year to date): measured from the last close of the previous year
    previous_year_end = pd.Timestamp(year=last_day.year, month=1, day=1) - pd.Timedelta(days=1)
    if previous_year_end >= price.index[0]:
        returns["YTD"] = last_price / price.asof(previous_year_end) - 1
    returns["ALL"] = last_price / price.iloc[0] - 1  # the whole period

    return {label: round(float(value * 100), 2) for label, value in returns.items()}


def add_signals(df):
    """Adds the moving averages, the signal and the position to the price."""
    # We use the adjusted close as the price (it includes dividends and splits).
    data = pd.DataFrame({"price": df["adj_close"]})
    data["sma_short"] = data["price"].rolling(config.SMA_SHORT).mean()
    data["sma_long"] = data["price"].rolling(config.SMA_LONG).mean()

    # Signal: 1 (be in the position) if the short average is above the long one, else 0 (cash).
    # The long average does not exist for the first SMA_LONG - 1 days (NaN); the comparison is False, so cash.
    data["signal"] = (data["sma_short"] > data["sma_long"]).astype(int)

    # To avoid look-ahead bias we shift the signal by 1 day: today's position is
    # decided by the signal at yesterday's close, so today's price is not used.
    data["position"] = data["signal"].shift(1).fillna(0).astype(int)
    return data


def equity_curve(price, position):
    """Computes the portfolio value for a position series (1 = in the position, 0 = cash)."""
    daily_return = price.pct_change().fillna(0)
    trade = position.diff().abs().fillna(0)  # 1 on the first day of a new position, else 0
    # In the position we earn the day's return. The trade itself was made at the
    # previous day's close; we take its commission on the first day of the new position.
    growth = (1 + position * daily_return) * (1 - trade * config.COMMISSION)
    return config.INITIAL_CAPITAL * growth.cumprod()


def compute_metrics(equity, trades):
    """Computes the performance metrics from a portfolio value series."""
    daily_return = equity.pct_change().dropna()
    years = (equity.index[-1] - equity.index[0]).days / 365.25
    total_return = equity.iloc[-1] / config.INITIAL_CAPITAL - 1
    cagr = (1 + total_return) ** (1 / years) - 1  # compound annual growth rate
    volatility = daily_return.std() * np.sqrt(config.TRADING_DAYS)
    # Sharpe ratio (risk-free rate 0): yearly average return / yearly volatility.
    # If the portfolio never entered a position the volatility is 0; then we write 0.
    sharpe = 0.0
    if volatility > 0:
        sharpe = daily_return.mean() * config.TRADING_DAYS / volatility
    drawdown = equity / equity.cummax() - 1  # fall from the highest value so far

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
    """Lists the buy / sell trades. A trade is made at the close of the day the signal changes."""
    data = data.iloc[:-1]  # the last day's signal is not a trade yet (the position changes the next day)
    changed = data[data["signal"].diff().abs() == 1]
    return [
        {
            "date": date.strftime("%Y-%m-%d"),
            "type": "BUY" if row["signal"] == 1 else "SELL",
            "price": round(float(row["price"]), 2),
        }
        for date, row in changed.iterrows()
    ]


def recommendation(signal):
    """Returns what the SMA rule says after the last close: BUY, HOLD, SELL or WAIT."""
    today = signal.iloc[-1]
    yesterday = signal.iloc[-2]
    if today == 1:
        return "BUY" if yesterday == 0 else "HOLD"  # signal just turned on -> BUY, already on -> HOLD
    return "SELL" if yesterday == 1 else "WAIT"     # signal just turned off -> SELL, already off -> WAIT


def to_points(series, date_format):
    """Turns a series into a list like [{"date": ..., "value": ...}]."""
    return [
        {"date": date.strftime(date_format), "value": round(float(value), 2)}
        for date, value in series.items()
    ]


def to_records(df):
    """Turns a DataFrame into a list of rows that can be written to JSON (NaN -> null)."""
    df = df.round(2).reset_index()
    df["date"] = df["date"].dt.strftime("%Y-%m-%d")
    return json.loads(df.to_json(orient="records"))


def analyze(symbol):
    """Runs every calculation for one symbol. Returns the (summary, detail) dictionaries."""
    data = add_signals(load_clean(symbol))
    price = data["price"]

    # Buy & Hold: the signal is 1 every day. It goes through the same rule as the
    # strategy, so it buys at the first day's close and pays commission for that one trade.
    hold = pd.Series(1, index=price.index).shift(1).fillna(0)
    data["strategy"] = equity_curve(price, data["position"])
    data["buy_hold"] = equity_curve(price, hold)

    signals = list_trades(data)
    returns = {
        name: to_points(period_returns(price, freq), date_format)
        for name, (freq, date_format) in PERIODS.items()
    }
    signal_changes = data.index[data["signal"].diff().abs() == 1]  # days when the signal changed

    detail = {
        "symbol": symbol,
        "daily": to_records(data[["price", "sma_short", "sma_long", "strategy", "buy_hold"]]),
        "signals": signals,
        "returns": returns,
        "strategy_yearly": to_points(period_returns(data["strategy"], "YE"), "%Y"),
    }
    summary = {
        "symbol": symbol,
        "name": config.SYMBOLS[symbol]["name"],
        "group": config.SYMBOLS[symbol]["group"],
        "start": price.index[0].strftime("%Y-%m-%d"),
        "end": price.index[-1].strftime("%Y-%m-%d"),
        "rows": len(price),
        "last_price": round(float(price.iloc[-1]), 2),
        "recommendation": recommendation(data["signal"]),
        # the day the signal last changed (the first day if it never changed)
        "signal_since": (signal_changes[-1] if len(signal_changes) else price.index[0]).strftime("%Y-%m-%d"),
        "trailing": trailing_returns(price),
        "strategy": compute_metrics(data["strategy"], trades=len(signals)),
        "buy_hold": compute_metrics(data["buy_hold"], trades=1),  # one trade: the first buy
    }
    return summary, detail


def write_json(path, content, indent=None):
    """Writes the content to a JSON file."""
    with open(path, "w", encoding="utf-8") as file:
        json.dump(content, file, ensure_ascii=False, indent=indent)


def main():
    """Analyzes every symbol that has clean data and writes the JSON files."""
    config.OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    summaries = []
    for symbol in config.SYMBOLS:
        if not (config.CLEAN_DIR / f"{symbol}.csv").exists():
            print(f"  WARNING: no clean data for {symbol}, skipping")
            continue

        summary, detail = analyze(symbol)
        write_json(config.OUTPUT_DIR / f"{symbol}.json", detail)
        summaries.append(summary)
        print(
            f"  {symbol}: strategy {summary['strategy']['total_return_pct']}%, "
            f"Buy & Hold {summary['buy_hold']['total_return_pct']}%, "
            f"signal {summary['recommendation']}"
        )

    # Summary file: last update time, settings and the metric table of every symbol
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
