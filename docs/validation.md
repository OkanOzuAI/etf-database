# Historical validation against benchmarks

This file describes Phase 3: how the price-only algorithm of Phase 2 was tested on past data, how it compares with two simple benchmarks, how much the results depend on the settings, and what its weaknesses are.

| What | Where |
|---|---|
| Simulation of a portfolio (trades, costs, settlement, exchange rate) | [`scripts/simulate.py`](../scripts/simulate.py) |
| Benchmarks, rolling validation, sensitivity, checks | [`scripts/validation.py`](../scripts/validation.py) |
| Walk-through with code, tables and charts | [`notebook/validation.ipynb`](../notebook/validation.ipynb) |
| All results as data (updated every day) | `public/data/validation.json` |

The sources of the methods (moving averages, 1 / volatility weights, equal-weight benchmarks, rolling validation, Sharpe ratio) are listed in the README, section References.

**The numbers below use the prices until November 5, 2026** (the US close of that day; for the Turkish funds the market until November 4). The daily update computes everything again with new prices, so `validation.json` and the notebook can show slightly different numbers later.

**These results are development and validation evidence, not an untouched final test.** We have seen them, and we may use them to change the algorithm in the next phases. Only the real-time competition (Phase 5) tests the algorithm on market outcomes that nobody has seen.

## 1. How a portfolio is simulated

The strategy and both benchmarks go through the same function (`simulate` in `scripts/simulate.py`), so they get the same capital, currency, prices and costs. The rules follow the facts collected in Phase 1 (data dictionary, sections 5, 7 and 8).

| Item | Rule |
|---|---|
| Initial capital | 10,000 Turkish lira (`INITIAL_CAPITAL`), all in cash before the first order |
| Reporting currency | Turkish lira. US ETFs are valued as dollar price × USD/TRY rate |
| Prices | adjusted closing prices of the US ETFs (dividends included); TEFAS prices of the Turkish funds, moved back by one business day to the market day they come from |
| Exchange rate | for the US close of day D, the first USD/TRY value dated after D (Yahoo takes the value of a day in its first hours, London time, so this is the value closest in time to the US close). On the last day of the data there is no later value yet; then the value dated that day is used |
| Decision | every Friday, with the prices known on that day (Phase 2) |
| Orders | on the next day on which both markets are open (normally Monday) |
| Fill price | the closing price of the order day, which is not known when the decision is made. For a Turkish mutual fund this is the price calculated at the end of the order day |
| Sales and purchases | everything above its target weight is sold first. A purchase is made only so that its payment is not due before the money from the sales has arrived (settlement days of every instrument, data dictionary section 7; US ETFs T+2 before May 28, 2024 and T+1 after). A purchase that has to wait is made on a later day at that day's closing price; until then the money is held as cash |
| Costs | 0.1% commission on every trade (`COMMISSION`), plus 0.2% for changing lira into dollars or back on every trade of a US ETF (`FX_COST`). The costs are paid from the portfolio |
| Cash | held in lira, earns no interest |
| Not allowed | borrowing (the simulation stops with an error if cash becomes negative) and short selling |

**Simplifications** (each one is small for a weekly portfolio, but they are not exact):

- Fractions of shares can be bought.
- The money market fund DLY is treated like the other mutual funds. In reality an order before 13:30 is filled on the same day at the price already known, so a purchase of DLY would earn about one more day of interest.
- The commission is also charged for Turkish mutual funds, although many of them can be bought on TEFAS without a commission. This makes the strategy and the benchmarks a little worse, not better.
- The exchange cost is charged on every US trade. A real portfolio could keep the dollars of a sale for a purchase in the same week.
- Holidays are handled with the price calendars: a market without a price on a day is closed on that day. Settlement days are counted as weekdays.

## 2. The two benchmarks

Both benchmarks use the same 20 instruments as the strategy and start on the same day with the same capital.

| Benchmark | Rule | Market allocation |
|---|---|---|
| **Equal weights, weekly** | every instrument gets 1/20 = 5% on every decision day, no cash | 50% Türkiye and 50% United States after every weekly rebalance (on average 49.94% / 49.95%; the rest is money waiting for settlement) |
| **Equal weights, buy and hold** | 5% in every instrument on the first order day, then never traded again | starts at 50% / 50%; the weights drift with the prices: 49.07% Türkiye and 50.93% United States at the end, 50.74% / 49.26% on average |

The strategy held on average **60.48% in Türkiye, 39.20% in the United States and 0.32% in cash** (money waiting for the settlement of a sale), and 58.73% / 41.27% at the end.

## 3. Results over the whole period

219 weekly decisions from August 26, 2022 to October 30, 2026; the first orders were filled on August 29, 2022.

| | Strategy | Equal weights, weekly | Equal weights, buy and hold |
|---|---:|---:|---:|
| Final value (lira) | 47,371.91 | 50,048.01 | 48,973.07 |
| Total return | 373.72% | 400.48% | 389.73% |
| Yearly return (CAGR) | 45.00% | 46.92% | 46.16% |
| Yearly volatility | 9.04% | 11.62% | 14.08% |
| Sharpe ratio (risk-free rate 0) | 4.16 | 3.37 | 2.77 |
| Maximum drawdown | −6.22% | −9.43% | −16.52% |
| Total return counted in US dollars | 72.11% | 81.84% | 77.93% |
| Turnover per year (value traded / average value) | 2.86 | 1.02 | 0.08 |
| Costs paid (lira) | 648.05 | 241.64 | 19.95 |

For comparison: in the same period the lira money market fund **DLY alone returned 373.42%** (about 45% per year) with almost no price changes, and the US dollar rose from 18.18 to 50.04 lira.

## 4. Rolling validation

**Method.** The data gives 219 weekly decisions. The validation goes through them in time order; there is no random split.

1. **Training window:** 52 weeks. Each of 9 settings (trend windows 20/100, 50/150, 50/200 days × volatility windows 21, 63, 126 days) is simulated on these weeks, with only the price and rate data published until the day before the first test decision. The setting with the highest Sharpe ratio is chosen.
2. **Test window:** the next 26 weeks use the chosen setting.
3. The windows move forward by 26 weeks and the steps are repeated.

The signals of every week are computed only from prices up to that Friday (Phase 2), so every setting is also free of future data inside the test windows. The test windows together form one continuous portfolio, the *walk-forward strategy*. It is compared with the fixed setting of `config.py` (SMA 50/200, volatility 63 days) and with the two benchmarks over the same test weeks.

**Return in each test window** (decision days; the last window is shorter, 11 weeks):

| Test window | Chosen setting | Walk-forward | Fixed setting | Equal weights, weekly | Buy and hold |
|---|---|---:|---:|---:|---:|
| 2023-08-25 to 2024-02-16 | SMA 50/150, vol 126 days | 22.16% | 23.14% | 24.66% | 24.47% |
| 2024-02-23 to 2024-08-16 | SMA 50/150, vol 21 days | 20.83% | 21.35% | 22.43% | 21.91% |
| 2024-08-23 to 2025-02-14 | SMA 50/200, vol 63 days | 12.91% | 12.90% | 12.68% | 12.87% |
| 2025-02-21 to 2025-08-15 | SMA 50/150, vol 63 days | 17.02% | 17.34% | 21.94% | 21.58% |
| 2025-08-22 to 2026-02-13 | SMA 20/100, vol 126 days | 25.81% | 25.84% | 32.51% | 37.51% |
| 2026-02-20 to 2026-08-14 | SMA 20/100, vol 21 days | 10.97% | 10.51% | 10.20% | 7.22% |
| 2026-08-21 to 2026-10-30 | SMA 20/100, vol 21 days | −0.59% | −0.42% | −5.08% | −6.07% |

**All test windows together** (August 28, 2023 to November 5, 2026):

| | Walk-forward | Fixed setting | Equal weights, weekly | Buy and hold |
|---|---:|---:|---:|---:|
| Total return | 170.70% | 174.12% | 190.67% | 188.38% |
| Yearly return (CAGR) | 36.64% | 37.18% | 39.73% | 39.38% |
| Yearly volatility | 7.60% | 7.76% | 10.77% | 13.12% |
| Sharpe ratio (risk-free rate 0) | 4.16 | 4.12 | 3.17 | 2.60 |
| Maximum drawdown | −6.34% | −6.22% | −9.43% | −15.73% |
| Total return in US dollars | 42.33% | 44.13% | 52.83% | 51.63% |
| Turnover per year | 5.16 | 2.87 | 1.09 | 0.16 |

**What this shows**

- The strategy was more stable than both benchmarks in every view: lower volatility, a smaller drawdown and a higher Sharpe ratio. It lost much less in the falling market of the last window.
- It did **not** earn more. In four of the seven windows both benchmarks returned more, and over all test windows the benchmarks returned 14 to 20 percentage points more.
- Choosing the setting on the training window did **not** help. The walk-forward strategy was behind the fixed setting in five of seven windows, and the chosen setting changed five times. The differences between the settings in training are small and do not continue in the next window, so they are mostly noise. Changing the setting also almost doubled the turnover.

## 5. Parameter sensitivity

The strategy with other settings over the whole period (same start, capital and costs). The first nine rows are the settings of the rolling validation; in the other rows one setting is changed and the rest stays as in `config.py`.

| Setting | Total return | Volatility | Sharpe | Max drawdown | In US dollars | Turnover / year | Türkiye on average |
|---|---:|---:|---:|---:|---:|---:|---:|
| SMA 20/100, vol 21 days | 337.98% | 8.31% | 4.29 | −5.45% | 59.13% | 6.59 | 61.11% |
| SMA 20/100, vol 63 days | 338.07% | 8.42% | 4.24 | −5.54% | 59.16% | 4.92 | 61.95% |
| SMA 20/100, vol 126 days | 344.55% | 8.45% | 4.26 | −5.69% | 61.52% | 4.49 | 62.60% |
| SMA 50/150, vol 21 days | 369.23% | 8.81% | 4.24 | −6.23% | 70.48% | 5.09 | 60.20% |
| SMA 50/150, vol 63 days | 372.09% | 8.88% | 4.23 | −6.34% | 71.52% | 3.21 | 60.98% |
| SMA 50/150, vol 126 days | 380.83% | 8.90% | 4.26 | −6.28% | 74.70% | 2.73 | 61.63% |
| SMA 50/200, vol 21 days | 369.23% | 8.96% | 4.17 | −6.15% | 70.48% | 4.75 | 59.79% |
| **SMA 50/200, vol 63 days (config.py)** | **373.72%** | **9.04%** | **4.16** | **−6.22%** | **72.11%** | **2.86** | **60.48%** |
| SMA 50/200, vol 126 days | 383.86% | 9.04% | 4.22 | −6.17% | 75.80% | 2.36 | 61.12% |
| Limit per instrument 15% | 364.85% | 8.88% | 4.19 | −6.22% | 68.89% | 2.84 | 60.46% |
| Limit per instrument 25% | 373.72% | 9.04% | 4.16 | −6.22% | 72.11% | 2.86 | 60.48% |
| Minimum per market 10% | 359.04% | 8.73% | 4.22 | −6.22% | 66.78% | 2.82 | 61.35% |
| Minimum per market 30% | 369.67% | 9.10% | 4.11 | −6.22% | 70.64% | 2.91 | 59.10% |
| Volatility floor 5% | 351.95% | 7.55% | 4.82 | −5.23% | 64.21% | 2.82 | 68.30% |
| Volatility floor 20% | 394.91% | 10.46% | 3.71 | −7.05% | 79.81% | 2.76 | 56.87% |
| No costs | 386.50% | 9.04% | 4.23 | −6.17% | 76.76% | 2.86 | 60.48% |
| Double costs | 361.33% | 9.04% | 4.10 | −6.27% | 67.62% | 2.86 | 60.49% |

**What this shows**

- The trend and volatility windows change the total return only between 338% and 384%, and the Sharpe ratio between 4.16 and 4.29. The result does not depend on one lucky setting, but no setting beats the equal-weight benchmarks in return either.
- Short windows (20/100 days, 21 days) trade more (up to 2.3 times as much) and earned less.
- The **volatility floor** matters most. It decides how much of the portfolio goes to the calm lira funds: with a floor of 5% the portfolio holds 68% in Türkiye, is calmer and earns less; with 20% it holds 57%, takes more risk and earns about as much as the benchmarks (394.91%).
- With a limit of 25% the result is the same as with 20%: in this period no instrument reached 20% through its score. A weight of 20% appeared only in 16 weeks in which one instrument alone filled the minimum of its market, and that gives the same weight with both limits. A limit of 15% was reached in 21 weeks.
- The costs take about 13 percentage points of total return over four years (no costs: 386.50%, with costs: 373.72%).

## 6. Weaknesses and possible improvements

**Weaknesses**

1. **The strategy did not earn more than the simple benchmarks.** Its advantage is lower risk: volatility about 9% instead of 12–14%, and a maximum drawdown of about 6% instead of 9–17%.
2. **A Sharpe ratio with a risk-free rate of 0 flatters it.** Lira interest rates were very high in this period: the money market fund DLY alone earned as much as the strategy (373.42% against 373.72%) with almost no risk. Measured against that, the strategy added nothing and the benchmarks less than 2 percentage points per year.
3. **Much of the low risk comes from the weighting, not from timing.** 1 / volatility gives the calm lira funds (money market, bonds) a large weight, so the strategy is on average 60% in Türkiye. The volatility floor sets this split more than the trend signal does.
4. **Choosing settings on the past did not work.** In the rolling validation the chosen setting was worse than simply keeping one setting in five of seven windows.
5. **The history is short and comes from one period.** TEFAS gives at most 60 months, and the 200-day average needs almost a year of it, so there are about four years of decisions and seven test windows. In all of them the lira lost value quickly (the dollar went from 18 to 50 lira). Seven windows are too few for a reliable statistical conclusion.
6. **The trend signal is slow.** A 50/200-day average reacts weeks after a market turns. The weekly rebalancing also makes many small trades: the strategy paid 648 lira of costs, almost three times as much as the weekly benchmark.
7. **Selection bias.** The 20 instruments were chosen in 2026, among funds that still exist and are well known. Funds that closed or did badly in the past could not be chosen.
8. **Simplified execution.** See the list in section 1: fractions of shares, closing prices as fill prices, the same commission for every fund, no interest on cash.

**Possible improvements**

- Compare with the lira money market fund as well (return above DLY), and report the results in US dollars as well as in lira.
- Trade only when a weight is more than about two percentage points away from its target. This would cut most of the small weekly trades and their costs.
- Keep idle money and waiting cash in the money market fund instead of cash without interest.
- Use relative momentum (the instruments that rose most in the last months) next to the trend filter, so that the portfolio reacts faster.
- Use the correlations between the instruments (also a price signal) so that similar funds, for example gold in lira and gold in dollars, do not both get a large weight.
- Find a source for longer Turkish fund histories, to have more and more varied test windows.
- Phase 4 will test whether information other than prices helps.

## 7. How to repeat it

```bash
python run_all.py                     # download, clean, Phase 2 weights, and this validation (step 5)
cd scripts && python validation.py    # only the validation, with the data already downloaded
```

The script checks itself and stops with an error if a check fails:

- **Buy-and-hold formula:** the value of the buy-and-hold benchmark is computed again with a formula that can be checked by hand, value(t) = Σ capital / 20 × price(t) / (price at purchase × (1 + cost)). The two results differ by less than 0.000001 lira.
- **No future data:** everything is computed again as if the data had been downloaded on June 30, 2025 (every price file and the exchange rate file end on that day). The portfolio values until the day before are exactly the same as with the full data. We also tested the check itself: with a deliberate error that lets the Turkish prices of the next day into the simulation, it stops with an error.
- **Portfolio rules:** every week of every setting is checked with the Phase 2 rules (no negative weight, limits, sum 100%), and the simulation stops if cash becomes negative.
