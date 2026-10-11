"""Step 4 - Portfolio weights (Phase 2).

Every Friday the algorithm looks at the prices up to that day and decides which
share of the portfolio goes to each instrument. The rest stays in cash.
Only price signals are used: the trend (two moving averages) and the volatility.
The signals are computed in the instrument's own currency; the exchange rate is
not a signal. The result is written to public/data/portfolio.json.
"""
import numpy as np
import pandas as pd

import backtest
import config

CASH = "CASH"
VERSION = "1.0 (price only)"  # version of the algorithm, reported with every decision
TOLERANCE = 1e-9              # two weights that differ by less than this are counted as equal

# The market of every instrument: "Türkiye" or "United States"
MARKETS = pd.Series({symbol: info["market"] for symbol, info in config.SYMBOLS.items()})


def load_prices(last_day=None):
    """Reads the clean price (adjusted close, own currency) of every instrument.

    If last_day is given, prices after that day are left out. The look-ahead test
    uses this to show that a decision does not depend on later prices.
    """
    return {symbol: backtest.load_clean(symbol)["adj_close"].loc[:last_day] for symbol in config.SYMBOLS}


def compute_signals(prices):
    """Computes the two price signals of every instrument for every calendar day.

    prices is a dictionary {symbol: price series}. Returns (trend, volatility, first_day):
    - trend: True if the short moving average is above the long one (uptrend),
    - volatility: yearly volatility of the daily returns of the last VOL_WINDOW days,
    - first_day: the first day on which every instrument has both signals.
    """
    trend, volatility, ready = {}, {}, []
    for symbol, price in prices.items():
        data = backtest.add_signals(pd.DataFrame({"adj_close": price}))
        trend[symbol] = data["signal"]  # 1: the short average is above the long one, 0: it is not
        daily_return = data["price"].pct_change()
        volatility[symbol] = daily_return.rolling(config.VOL_WINDOW).std() * np.sqrt(config.TRADING_DAYS)
        ready.append(data["sma_long"].first_valid_index())  # first day with a long average

    # Put all instruments on one calendar. The two markets have different holidays: a day
    # without a price gets the last known signal, so only past information is used.
    trend = pd.DataFrame(trend)
    days = pd.date_range(trend.index[0], trend.index[-1], freq="D")
    trend = trend.reindex(days).ffill().fillna(0) == 1  # True: uptrend. Before the first price: False
    volatility = pd.DataFrame(volatility).reindex(days).ffill()
    return trend, volatility, max(ready)


def cap_weights(weights, cap):
    """Limits every weight to the cap. The cut part goes to the holdings below the cap."""
    weights = weights.copy()
    while True:
        over = weights > cap + TOLERANCE
        if not over.any():
            return weights
        excess = (weights[over] - cap).sum()
        weights[over] = cap
        free = (weights > 0) & (weights < cap - TOLERANCE)  # holdings that can still grow
        if not free.any():
            return weights  # nobody can take the excess: it stays in cash
        weights[free] += excess * weights[free] / weights[free].sum()


def fill_market(weights, in_market, need, uptrend, volatility):
    """Raises the total weight of one market by `need`, so that it reaches its minimum."""
    # Who receives it: instruments in an uptrend first, then the others; inside each
    # group the calmest one first. An instrument without a known volatility is left out.
    known = volatility[in_market].dropna()
    order = sorted(known.index, key=lambda symbol: (not uptrend[symbol], known[symbol]))

    weights = weights.copy()
    for symbol in order:
        added = min(need, config.MAX_WEIGHT - weights[symbol])  # never above the cap
        weights[symbol] += added
        need -= added
        if need <= TOLERANCE:
            break
    return weights


def allocate(uptrend, volatility, market):
    """Turns the signals of one decision day into portfolio weights.

    All three inputs have one value per instrument. The weights that come back add
    up to 1 or less; what is not given to an instrument stays in cash.
    """
    # 1) Score: 1 / volatility for an instrument in an uptrend, 0 for the others.
    #    A volatility below VOL_FLOOR is counted as VOL_FLOOR. Without this a very calm
    #    fund (for example a money market fund) would take almost the whole portfolio.
    score = (1 / volatility.clip(lower=config.VOL_FLOOR)).where(uptrend, 0).fillna(0)

    # 2) Weights in proportion to the scores (all zero if nothing is in an uptrend)
    weights = score / score.sum() if score.sum() > 0 else score

    # 3) No instrument above MAX_WEIGHT
    weights = cap_weights(weights, config.MAX_WEIGHT)

    # 4) Every market holds at least MIN_MARKET_WEIGHT, also when it has no uptrend
    for name in market.unique():
        in_market = market == name
        need = config.MIN_MARKET_WEIGHT - weights[in_market].sum()
        if need > TOLERANCE:
            weights = fill_market(weights, in_market, need, uptrend, volatility)

    # 5) The total cannot be above 100%. This can only happen after step 4. Then the
    #    markets that are above their minimum give the extra part back, in proportion.
    extra = weights.sum() - 1
    if extra > TOLERANCE:
        totals = weights.groupby(market).sum()
        room = (totals - config.MIN_MARKET_WEIGHT).clip(lower=0)  # what each market can give back
        keep = 1 - extra * room / room.sum() / totals.where(totals > 0, 1)
        weights = weights * market.map(keep)
    return weights


def weekly_weights(trend, volatility, first_day, market=MARKETS):
    """Runs the allocation for every Friday. Returns one row of weights per decision day."""
    rows = {}
    for day in pd.date_range(first_day, trend.index[-1], freq="W-FRI"):
        # Only the signals of this day are used. They were computed from prices up to this
        # day, so no later price can enter the decision. The weights apply from the next trading day.
        rows[day] = allocate(trend.loc[day], volatility.loc[day], market)
    weights = pd.DataFrame(rows).T
    # Cash is what is left. Adding up decimal numbers can give a result like -0.0000000000000004
    # instead of 0; such a tiny negative value is set to 0.
    weights[CASH] = (1 - weights.sum(axis=1)).clip(lower=0)
    return weights


def check_rules(weights, market=MARKETS):
    """Stops with an error if a row of weights breaks one of the portfolio rules."""
    holdings = weights.drop(columns=CASH)
    assert (weights >= -TOLERANCE).all().all(), "a weight is negative (short selling or borrowing)"
    assert (holdings <= config.MAX_WEIGHT + TOLERANCE).all().all(), "an instrument is above MAX_WEIGHT"
    assert ((weights.sum(axis=1) - 1).abs() <= TOLERANCE).all(), "the weights do not add up to 100%"
    for name in market.unique():
        total = holdings.loc[:, market == name].sum(axis=1)
        assert (total >= config.MIN_MARKET_WEIGHT - TOLERANCE).all(), f"{name} is below MIN_MARKET_WEIGHT"


def market_totals(weights, market=MARKETS):
    """Adds the weights up per market. Returns one column per market and one for cash."""
    totals = weights.drop(columns=CASH).T.groupby(market).sum().T
    totals[CASH] = weights[CASH]
    return totals


def round_to_total(points, total):
    """Rounds every value down to a whole number. The few units that are left over go
    to the values that lost the most by rounding down, so the result adds up to `total`."""
    whole = np.floor(points + TOLERANCE)
    left_over = int(round(total - whole.sum()))
    lost_most = (points - whole).sort_values(ascending=False).index[:left_over]
    whole[lost_most] += 1
    return whole


def to_percent(weights, market=MARKETS):
    """Turns a row of weights into percent with two decimals that add up to exactly 100.

    First the total of each market and of cash is rounded, then the weights inside each
    market. So a market that holds exactly its minimum also shows it after rounding.
    """
    points = weights * 10_000                            # in hundredths of a percent
    group = market.reindex(points.index).fillna(CASH)    # the market of every weight; cash is its own group
    totals = round_to_total(points.groupby(group).sum(), 10_000)
    parts = [round_to_total(points[group == name], totals[name]) for name in totals.index]
    return (pd.concat(parts)[points.index] / 100).round(2)


def main():
    """Computes the weekly weights and writes the last decision and the history as JSON."""
    prices = load_prices()
    trend, volatility, first_day = compute_signals(prices)
    weights = weekly_weights(trend, volatility, first_day)
    check_rules(weights)

    day = weights.index[-1]                 # the last decision day
    last = to_percent(weights.iloc[-1])
    previous = to_percent(weights.iloc[-2])
    rate = backtest.load_clean(config.FX_NAME)["adj_close"]  # lira per US dollar

    holdings = [
        {
            "symbol": symbol,
            "name": info["name"],
            "type": info["type"],
            "market": info["market"],
            "currency": info["currency"],
            "weight": float(last[symbol]),
            "change": round(float(last[symbol] - previous[symbol]), 2),  # against the week before
            "uptrend": bool(trend.loc[day, symbol]),
            "volatility": round(float(volatility.loc[day, symbol] * 100), 2),
        }
        for symbol, info in config.SYMBOLS.items()
    ]

    # Weekly history: every single weight, and the total of each market and of cash.
    # The totals are added up from the rounded weights, so they match the table exactly.
    history = []
    for date in weights.index:
        percent = to_percent(weights.loc[date])
        totals = {name: round(float(percent[MARKETS.index[MARKETS == name]].sum()), 2) for name in MARKETS.unique()}
        totals[CASH] = float(percent[CASH])
        history.append({
            "date": date.strftime("%Y-%m-%d"),
            "totals": totals,
            "weights": {name: float(value) for name, value in percent.items()},
        })

    backtest.write_json(
        config.OUTPUT_DIR / "portfolio.json",
        {
            "updated_at": pd.Timestamp.now(tz="UTC").strftime("%Y-%m-%dT%H:%M:%SZ"),
            "version": VERSION,
            "decision_day": day.strftime("%Y-%m-%d"),
            # the last day with a price in each market when the decision was made
            "data_until": {
                name: max(prices[symbol].loc[:day].index[-1] for symbol in MARKETS.index[MARKETS == name]).strftime("%Y-%m-%d")
                for name in MARKETS.unique()
            },
            "report_currency": config.REPORT_CURRENCY,
            # exchange rate of the decision day: used to value US holdings in lira, not as a signal
            "usdtry": round(float(rate.asof(day)), 4),
            "settings": {
                "sma_short": config.SMA_SHORT,
                "sma_long": config.SMA_LONG,
                "vol_window": config.VOL_WINDOW,
                "vol_floor": config.VOL_FLOOR,
                "max_weight": config.MAX_WEIGHT,
                "min_market_weight": config.MIN_MARKET_WEIGHT,
            },
            "holdings": holdings,
            "cash": float(last[CASH]),
            "totals": history[-1]["totals"],
            "history": history,
        },
    )

    shares = ", ".join(f"{name} {value}%" for name, value in history[-1]["totals"].items())
    print(f"  decision day {day.date()}: {shares}")
    for item in holdings:
        if item["weight"] > 0:
            print(f"    {item['symbol']:4s} {item['weight']:6.2f}%  {item['name']}")


if __name__ == "__main__":
    main()
