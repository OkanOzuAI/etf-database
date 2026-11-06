"""Step 5 - Historical validation against benchmarks (Phase 3).

1. Benchmarks: the strategy is compared with two simple portfolios of the same 20
   instruments: equal weights rebalanced every week, and equal weights bought once and
   then held. All three use the same capital, currency, prices and costs (simulate.py).
2. Rolling (walk-forward) validation: in every step a setting is chosen with the
   results of the last TRAIN_WEEKS weeks only, and then used for the next TEST_WEEKS
   weeks. Then the window moves forward by TEST_WEEKS weeks.
3. Parameter sensitivity: the strategy is run with other settings over the whole period.
The results are written to public/data/validation.json.
"""
from contextlib import contextmanager

import pandas as pd

import backtest
import config
import portfolio
import simulate

TRAIN_WEEKS = 52  # weeks used to choose the setting
TEST_WEEKS = 26   # weeks in which the chosen setting is used

# Settings tried in the rolling validation: three trend windows x three volatility windows
GRID = [
    {"SMA_SHORT": short, "SMA_LONG": long, "VOL_WINDOW": window}
    for short, long in [(20, 100), (50, 150), (50, 200)]
    for window in [21, 63, 126]
]
DEFAULT = {"SMA_SHORT": config.SMA_SHORT, "SMA_LONG": config.SMA_LONG, "VOL_WINDOW": config.VOL_WINDOW}  # the setting in config.py

# Settings changed one at a time (the others stay as in config.py)
ONE_AT_A_TIME = [
    {"MAX_WEIGHT": 0.15}, {"MAX_WEIGHT": 0.25},
    {"MIN_MARKET_WEIGHT": 0.10}, {"MIN_MARKET_WEIGHT": 0.30},
    {"VOL_FLOOR": 0.05}, {"VOL_FLOOR": 0.20},
]


@contextmanager
def use_settings(settings):
    """Changes some values in config for a moment and puts the old values back afterwards.

    The Phase 2 functions read their settings from config, so this is how another setting is tried.
    """
    old = {name: getattr(config, name) for name in settings}
    for name, value in settings.items():
        setattr(config, name, value)
    try:
        yield
    finally:
        for name, value in old.items():
            setattr(config, name, value)


def label(settings):
    """Short name of a setting, for example 'SMA 50/200, vol 63 days'."""
    if "SMA_SHORT" in settings:
        return f"SMA {settings['SMA_SHORT']}/{settings['SMA_LONG']}, vol {settings['VOL_WINDOW']} days"
    return ", ".join(f"{name} = {value}" for name, value in settings.items())


def strategy_weights(prices, settings):
    """Weekly target weights of the Phase 2 algorithm with the given settings."""
    with use_settings(settings):
        trend, volatility, first_day = portfolio.compute_signals(prices)
        weights = portfolio.weekly_weights(trend, volatility, first_day)
        portfolio.check_rules(weights)
    return weights


def equal_weights(decision_days):
    """Benchmark weights: every instrument 1/N on every decision day, no cash."""
    weights = pd.DataFrame(1 / len(simulate.SYMBOLS), index=decision_days, columns=simulate.SYMBOLS)
    weights[portfolio.CASH] = 0.0
    return weights


def compare(strategy, data, start):
    """Simulates the strategy and both benchmarks from the decision day `start` on.

    The buy-and-hold benchmark gets only the first row of equal weights: it is bought
    once and never rebalanced, so its weights drift with the prices.
    """
    days = strategy.index[strategy.index >= start]
    benchmark = equal_weights(days)
    results = {
        "Strategy": simulate.simulate(strategy.loc[days], data),
        "Equal weights, weekly": simulate.simulate(benchmark, data),
        "Equal weights, buy and hold": simulate.simulate(benchmark.iloc[:1], data),
    }
    return results


def window_return(value, start, end):
    """Return of a value series between two decision days (the last values known on these days)."""
    begin = value.asof(start)
    if pd.isna(begin):  # before its first order the portfolio is all cash
        begin = config.INITIAL_CAPITAL
    return float(value.asof(end) / begin - 1)


def walk_forward(prices, data):
    """Chooses a setting on every training window and uses it on the test window after it.

    Returns (folds, weights): one row of information per step, and the weekly weights of the
    walk-forward strategy (in every test window the weights of the setting chosen for it).
    """
    by_setting = [strategy_weights(prices, settings) for settings in GRID]
    # Use only the weeks on which every setting has a decision
    weeks = by_setting[0].index
    for weights in by_setting[1:]:
        weeks = weeks.intersection(weights.index)

    folds, parts = [], []
    start = 0
    while start + TRAIN_WEEKS < len(weeks):
        train = weeks[start:start + TRAIN_WEEKS]
        test = weeks[start + TRAIN_WEEKS:start + TRAIN_WEEKS + TEST_WEEKS]

        # Training: each setting is simulated on the training weeks with the prices known
        # before the first test decision (until the day before it).
        known = simulate.prepare(last_day=test[0] - pd.Timedelta(days=1))
        sharpe = [simulate.metrics(simulate.simulate(weights.loc[train], known))["sharpe"] for weights in by_setting]
        best = max(range(len(GRID)), key=lambda k: sharpe[k])  # highest Sharpe ratio in training

        folds.append({
            "train": [train[0].strftime("%Y-%m-%d"), train[-1].strftime("%Y-%m-%d")],
            "test": [test[0].strftime("%Y-%m-%d"), test[-1].strftime("%Y-%m-%d")],
            "chosen": label(GRID[best]),
            "train_sharpe": sharpe[best],
            "default_train_sharpe": sharpe[GRID.index(DEFAULT)],
        })
        parts.append(by_setting[best].loc[test])
        start += TEST_WEEKS
    return folds, pd.concat(parts)



def check_no_future_data(prices, cut="2025-06-30"):
    """Shows that the simulation does not use prices or rates that come after a day.

    Everything is computed again as if the data had been downloaded on `cut`: every price
    file and the exchange rate file end on that day. The values must be the same as with
    the full data until the day before the cut (the value of the cut day itself needs the
    exchange rate of the next day).
    """
    cut = pd.Timestamp(cut)
    short = {symbol: price.loc[:cut] for symbol, price in prices.items()}
    full = simulate.simulate(strategy_weights(prices, {}), simulate.prepare())["value"]
    part = simulate.simulate(strategy_weights(short, {}), simulate.prepare(last_day=cut))["value"]
    until = cut - pd.Timedelta(days=1)
    difference = (full.loc[:until] - part.loc[:until]).abs().max()
    assert difference < 1e-9, f"the values before {cut.date()} depend on later prices"
    return float(difference)


def check_buy_and_hold(result, data):
    """Checks the simulation with a formula that can be computed by hand.

    Bought once with 1/N of the capital each (cost paid from the amount):
    value(t) = sum over i of  capital / N * price_i(t) / (price_i(start) * (1 + fee_i))
    """
    lira = data["lira"].loc[result["value"].index]
    fee = config.COMMISSION + config.FX_COST * (simulate.MARKET == simulate.US)
    by_hand = (config.INITIAL_CAPITAL / len(simulate.SYMBOLS) * lira / (lira.iloc[0] * (1 + fee))).sum(axis=1)
    difference = (by_hand - result["value"]).abs().max()
    assert difference < 1e-6, "the buy-and-hold value does not match the formula"
    return float(difference)


def weekly(series):
    """Keeps the last value of every week (Friday), to keep the JSON file small."""
    return series.resample("W-FRI").last().dropna()


def main():
    """Runs the comparison, the rolling validation and the sensitivity, and writes validation.json."""
    prices = portfolio.load_prices()
    data = simulate.prepare()
    strategy = strategy_weights(prices, {})

    # ---- 1) Whole period: strategy against the two benchmarks ----
    first_week = strategy.index[0]
    whole = compare(strategy, data, first_week)
    whole_metrics = {name: simulate.metrics(result) for name, result in whole.items()}
    checks = {
        "buy_and_hold_formula_difference": check_buy_and_hold(whole["Equal weights, buy and hold"], data),
        "future_data_difference": check_no_future_data(prices),
    }

    # ---- 2) Rolling validation ----
    folds, walk_weights = walk_forward(prices, data)
    test_start = walk_weights.index[0]
    tested = compare(walk_weights, data, test_start)
    tested["Strategy, fixed setting"] = simulate.simulate(strategy.loc[test_start:], data)
    tested_metrics = {name: simulate.metrics(result) for name, result in tested.items()}

    # Return of every portfolio in every test window
    boundaries = [pd.Timestamp(fold["test"][0]) for fold in folds] + [tested["Strategy"]["value"].index[-1]]
    for k, fold in enumerate(folds):
        fold["returns_pct"] = {
            name: round(window_return(result["value"], boundaries[k], boundaries[k + 1]) * 100, 2)
            for name, result in tested.items()
        }

    # ---- 3) Sensitivity: every setting over the whole period ----
    sensitivity = []
    for settings in GRID + ONE_AT_A_TIME:
        result = simulate.simulate(strategy_weights(prices, settings).loc[first_week:], data)
        sensitivity.append({"setting": label(settings), "default": settings == DEFAULT, **simulate.metrics(result)})
    for name, commission, fx_cost in [("no costs", 0.0, 0.0), ("double costs", 2 * config.COMMISSION, 2 * config.FX_COST)]:
        result = simulate.simulate(strategy, data, commission=commission, fx_cost=fx_cost)
        sensitivity.append({"setting": name, "default": False, **simulate.metrics(result)})

    backtest.write_json(
        config.OUTPUT_DIR / "validation.json",
        {
            "updated_at": pd.Timestamp.now(tz="UTC").strftime("%Y-%m-%dT%H:%M:%SZ"),
            "version": portfolio.VERSION,
            "assumptions": {
                "initial_capital": config.INITIAL_CAPITAL,
                "report_currency": config.REPORT_CURRENCY,
                "commission": config.COMMISSION,
                "fx_cost": config.FX_COST,
                "train_weeks": TRAIN_WEEKS,
                "test_weeks": TEST_WEEKS,
            },
            "whole_period": whole_metrics,
            "whole_period_values": {
                name: {day.strftime("%Y-%m-%d"): round(float(value), 2) for day, value in weekly(result["value"]).items()}
                for name, result in whole.items()
            },
            "rolling": {"folds": folds, "metrics": tested_metrics},
            "sensitivity": sensitivity,
            "checks": checks,
        },
    )

    for name, item in whole_metrics.items():
        print(f"  {name:28s} return {item['total_return_pct']:8.2f}%  Sharpe {item['sharpe']:5.2f}  max drawdown {item['max_drawdown_pct']:7.2f}%")
    for name, item in tested_metrics.items():
        print(f"  test windows: {name:28s} return {item['total_return_pct']:8.2f}%  Sharpe {item['sharpe']:5.2f}")


if __name__ == "__main__":
    main()
