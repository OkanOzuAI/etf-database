"""Phase 2 - How the runtime of the portfolio algorithm grows with the input.

The real data has 20 instruments, so we build random price series of any size
and time the algorithm on them in three ways:
- signals: moving averages and volatility of every instrument (compute_signals),
- allocation: the weekly weights for every Friday (weekly_weights),
- one decision: the weights of a single Friday (allocate) for very many instruments.

Usage:  python scripts/runtime_test.py
"""
import time

import numpy as np
import pandas as pd

import config
import portfolio


def random_prices(instruments, days, seed=0):
    """Builds random price series: every day the price moves by a small random percent."""
    random = np.random.default_rng(seed)
    dates = pd.bdate_range("2000-01-03", periods=days)
    prices = {}
    for number in range(instruments):
        daily_return = random.normal(0.0003, 0.012, days)
        prices[f"X{number}"] = pd.Series(100 * np.cumprod(1 + daily_return), index=dates)
    # Half of the instruments are put into each market
    market = pd.Series({name: ("Türkiye" if number % 2 else "United States") for number, name in enumerate(prices)})
    return prices, market


def measure(instruments, days, repeats=3):
    """Times the two parts for one input size. Returns the fastest of a few runs (milliseconds)."""
    prices, market = random_prices(instruments, days)
    signal_times, allocation_times = [], []
    for _ in range(repeats):
        start = time.perf_counter()
        trend, volatility, first_day = portfolio.compute_signals(prices)
        middle = time.perf_counter()
        weights = portfolio.weekly_weights(trend, volatility, first_day, market)
        end = time.perf_counter()
        signal_times.append(middle - start)
        allocation_times.append(end - middle)
    portfolio.check_rules(weights, market)  # the rules also hold on the random data
    return {
        "instruments": instruments,
        "days": days,
        "decisions": len(weights),
        "signals_ms": round(min(signal_times) * 1000, 1),
        "allocation_ms": round(min(allocation_times) * 1000, 1),
    }


def measure_one_decision(instruments, repeats=5, seed=0):
    """Times a single call of allocate with random signals. Returns the fastest run (milliseconds)."""
    random = np.random.default_rng(seed)
    names = [f"X{number}" for number in range(instruments)]
    uptrend = pd.Series(random.random(instruments) < 0.6, index=names)          # about 60% in an uptrend
    volatility = pd.Series(np.exp(random.normal(-2, 0.8, instruments)), index=names)
    market = pd.Series(np.where(np.arange(instruments) % 2, "Türkiye", "United States"), index=names)
    times = []
    for _ in range(repeats):
        start = time.perf_counter()
        portfolio.allocate(uptrend, volatility, market)
        times.append(time.perf_counter() - start)
    return {"instruments": instruments, "one_decision_ms": round(min(times) * 1000, 2)}


def main():
    """Measures the runtime three ways: more instruments, more days, one decision."""
    measure(20, config.TRADING_DAYS)  # one run that is not counted, so that the first result is not slower
    five_years = 5 * config.TRADING_DAYS
    more_instruments = pd.DataFrame([measure(n, five_years) for n in [20, 40, 80, 160, 320, 640]])
    more_days = pd.DataFrame([measure(20, years * config.TRADING_DAYS) for years in [2, 5, 10, 20, 40]])
    one_decision = pd.DataFrame([measure_one_decision(n) for n in [100, 1_000, 10_000, 100_000, 1_000_000]])
    print("More instruments (5 years of prices):")
    print(more_instruments.to_string(index=False))
    print("\nMore days (20 instruments):")
    print(more_days.to_string(index=False))
    print("\nOne decision with very many instruments:")
    print(one_decision.to_string(index=False))
    return more_instruments, more_days, one_decision


if __name__ == "__main__":
    main()
