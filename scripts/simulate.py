"""Simulation of a portfolio in Turkish lira (Phase 3), used by validation.py.

Turns weekly target weights into trades and values the portfolio every day. The rules
follow the data dictionary (sections 5, 7 and 8):

- A decision uses the prices up to Friday. The orders are given on the next day on which
  both markets are open (normally Monday) and are filled at that day's closing price,
  which was not known when the decision was made.
- Sales come first. A purchase is made only so that its payment is not due before the
  money from the sales has arrived (settlement days of every instrument).
- Every trade pays COMMISSION. A trade of a US ETF also pays FX_COST, because lira has
  to be changed into dollars (or back).
- A US ETF is valued in lira with the first USD/TRY rate dated after its closing day,
  which is the rate closest in time to the US close.
- Cash is held in lira and earns no interest.
No backtest library; only pandas and numpy.
"""
import numpy as np
import pandas as pd

import backtest
import config

US = "United States"
TURKEY = "Türkiye"
T1_START = pd.Timestamp("2024-05-28")  # US trades are paid one business day later (T+1) from this day, two before
TINY = 1e-6                            # a trade smaller than this (in lira) is not made

SYMBOLS = list(config.SYMBOLS)
MARKET = np.array([config.SYMBOLS[symbol]["market"] for symbol in SYMBOLS])


def market_prices(last_day=None):
    """Reads the price of every instrument and puts it on the day of the market close it comes from.

    US ETFs: the adjusted close of the US trading day.
    Turkish funds: TEFAS dates a price one business day after the market day it comes from,
    so every price is moved back to the row before it.
    Returns a DataFrame with one row for every day on which at least one market was open,
    and NaN where the market of an instrument was closed.
    If last_day is given, only the rows of the files dated up to that day are used.
    """
    columns = {}
    for symbol in SYMBOLS:
        price = backtest.load_clean(symbol)["adj_close"].loc[:last_day]
        if config.SYMBOLS[symbol]["market"] == TURKEY:
            price = pd.Series(price.values[1:], index=price.index[:-1])  # row i comes from the day of row i-1
        columns[symbol] = price
    return pd.DataFrame(columns).sort_index()


def rate_after_us_close(days, last_day=None):
    """USD/TRY rate for every day: the first value dated after that day.

    Yahoo takes the value of day D in the first hours of day D (London time), so the value
    dated D+1 is the first one after the US close of day D. For the last day of the data
    there is no later value yet; then the last known value is used.
    If last_day is given, only the rows of the file dated up to that day are used.
    """
    rate = backtest.load_clean(config.FX_NAME)["adj_close"].loc[:last_day]
    following = pd.Series(rate.values[1:], index=rate.index[:-1])  # the value of the next row
    following = pd.concat([following, rate.iloc[-1:]])             # the last day keeps its own value
    return following.asof(days)


def prepare(last_day=None):
    """Loads everything the simulation needs.

    If last_day is given, only the rows of the price and rate files dated up to that day
    are used, as if the data had been downloaded on that day.

    Returns a dictionary with:
    - own: prices in the currency of each instrument (NaN on days its market is closed),
    - lira: the same prices in lira, with the last price carried over closed days,
    - usdtry: the rate used for each day.
    """
    own = market_prices(last_day)
    usdtry = rate_after_us_close(own.index, last_day)
    lira = own.ffill()
    for symbol in SYMBOLS:
        if config.SYMBOLS[symbol]["market"] == US:
            lira[symbol] = lira[symbol] * usdtry
    return {"own": own, "lira": lira, "usdtry": usdtry}


# Business days between a trade and its payment, from the instrument table (data dictionary, section 7)
SETTLEMENT = pd.read_csv(config.DOCS_DIR / "instruments.csv", index_col="symbol").loc[SYMBOLS]


def settlement_days(day):
    """Business days between a trade on `day` and its payment, for buying and for selling."""
    buy = SETTLEMENT["buy_settlement_days"].to_numpy(dtype=int)
    sell = SETTLEMENT["sell_settlement_days"].to_numpy(dtype=int)
    us_days = 2 if day < T1_START else 1
    buy[MARKET == US] = us_days
    sell[MARKET == US] = us_days
    return buy, sell


def order_days(decision_days, own):
    """For every decision day: the first later day on which both markets are open.

    Returns {position of the order day in the price table: decision day}.
    Decisions without such a day in the data (the most recent one) are left out.
    """
    us_open = own.loc[:, MARKET == US].notna().any(axis=1)
    tr_open = own.loc[:, MARKET == TURKEY].notna().any(axis=1)
    both_open = own.index[us_open & tr_open]
    orders = {}
    for decision in decision_days:
        later = both_open[both_open > decision]
        if len(later) > 0:
            orders[own.index.get_loc(later[0])] = decision
    return orders


def simulate(targets, data, commission=None, fx_cost=None):
    """Simulates a portfolio that is brought to the target weights on every decision day.

    targets: one row per decision day, one column per instrument and a CASH column.
             A portfolio that is never rebalanced has only one row.
    data:    the result of prepare().
    Returns a dictionary with the daily value in lira, the value held in every
    instrument, the costs paid and the value traded.
    """
    commission = config.COMMISSION if commission is None else commission
    fx_cost = config.FX_COST if fx_cost is None else fx_cost
    fee = commission + fx_cost * (MARKET == US)  # cost of a trade, as a share of its value

    days = data["lira"].index
    price = data["lira"].to_numpy()
    is_open = data["own"].notna().to_numpy()
    orders = order_days(targets.index, data["own"])
    weights = targets[SYMBOLS].to_numpy()
    row_of = {day: row for row, day in enumerate(targets.index)}

    units = np.zeros(len(SYMBOLS))   # shares held of every instrument
    cash = float(config.INITIAL_CAPITAL)
    set_aside = 0.0                  # lira kept for purchases that are made on a later day
    planned = {}                     # day position -> list of (instrument, lira to spend)
    costs = traded = 0.0
    held, values = [], []
    first = min(orders) if orders else len(days)

    def make_purchases(t):
        """Makes the purchases planned for day t at that day's closing price; the cost is paid from the amount."""
        nonlocal costs, traded, set_aside
        for i, amount in planned.pop(t, []):
            units[i] += amount / (price[t, i] * (1 + fee[i]))
            costs += amount - amount / (1 + fee[i])
            traded += amount
            set_aside -= amount

    for t in range(first, len(days)):
        # 1) Purchases of an earlier order that are due today
        make_purchases(t)

        # 2) New orders on an order day
        if t in orders:
            assert not planned, "a purchase of the week before was not made yet"
            target = weights[row_of[orders[t]]] * (units @ price[t] + cash)
            holding = units * price[t]

            # Sales: everything above the target is sold at today's close
            sell = np.where(holding > target + TINY, holding - target, 0)
            units -= sell / price[t]
            cash += (sell * (1 - fee)).sum()
            costs += (sell * fee).sum()
            traded += sell.sum()

            # Purchases: what is below the target. If the money is not enough (the costs of
            # the sales are missing), every purchase is made smaller in the same proportion.
            buy = np.where(target > holding + TINY, target - holding, 0)
            if buy.sum() > cash:
                buy = buy * cash / buy.sum()

            # The money of the sales arrives after `wait` business days. A purchase whose
            # payment comes earlier than that is made later, on the first day its market is open.
            buy_days, sell_days = settlement_days(days[t])
            wait = sell_days[sell > 0].max() if (sell > 0).any() else 0
            for i in np.flatnonzero(buy):
                delay = max(0, wait - buy_days[i])
                start = np.busday_offset(days[t].date(), delay, roll="forward")
                later = np.flatnonzero(is_open[:, i] & (days >= pd.Timestamp(start)))
                if len(later) > 0:  # without a later price the money stays in cash
                    planned.setdefault(later[0], []).append((i, buy[i]))
                    cash -= buy[i]
                    set_aside += buy[i]

            # 3) Purchases of today's orders that do not have to wait
            make_purchases(t)

        assert cash >= -TINY, "cash is negative (borrowing)"
        held.append(units * price[t])
        values.append(units @ price[t] + cash + set_aside)

    index = days[first:]
    return {
        "value": pd.Series(values, index=index),
        "held": pd.DataFrame(held, index=index, columns=SYMBOLS),
        "usdtry": data["usdtry"].loc[index],
        "costs": costs,
        "traded": traded,
    }


def market_shares(result):
    """Share of the portfolio value in each market and in cash (lira), for every day."""
    held = result["held"]
    shares = held.T.groupby(MARKET).sum().T.div(result["value"], axis=0)
    shares["CASH"] = (1 - shares.sum(axis=1)).clip(lower=0)  # a tiny negative value from rounding is set to 0
    return shares[[TURKEY, US, "CASH"]]


def metrics(result):
    """Performance numbers of a simulated portfolio."""
    value = result["value"]
    capital = config.INITIAL_CAPITAL
    years = (value.index[-1] - value.index[0]).days / 365.25
    daily = value.pct_change().dropna()
    per_year = len(daily) / years  # days with a value per year (both calendars together)
    volatility = daily.std() * np.sqrt(per_year)
    total = value.iloc[-1] / capital - 1
    # The same portfolio counted in US dollars: the lira lost much of its value in this period
    in_usd = (value.iloc[-1] / result["usdtry"].iloc[-1]) / (capital / result["usdtry"].iloc[0]) - 1
    shares = market_shares(result)

    return {
        "start": value.index[0].strftime("%Y-%m-%d"),
        "end": value.index[-1].strftime("%Y-%m-%d"),
        "final_value": round(float(value.iloc[-1]), 2),
        "total_return_pct": round(float(total * 100), 2),
        "cagr_pct": round(float(((1 + total) ** (1 / years) - 1) * 100), 2),
        "volatility_pct": round(float(volatility * 100), 2),
        # Sharpe ratio with a risk-free rate of 0: yearly average return / yearly volatility
        "sharpe": round(float(daily.mean() * per_year / volatility), 2),
        "max_drawdown_pct": round(float((value / value.cummax() - 1).min() * 100), 2),
        "total_return_usd_pct": round(float(in_usd * 100), 2),
        "turnover_per_year": round(float(result["traded"] / value.mean() / years), 2),
        "costs": round(float(result["costs"]), 2),
        "average_share_pct": {name: round(float(shares[name].mean() * 100), 2) for name in shares.columns},
        "last_share_pct": {name: round(float(shares[name].iloc[-1] * 100), 2) for name in shares.columns},
    }
