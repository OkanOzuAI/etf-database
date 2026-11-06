# ETF & Fund Portfolio: Algorithmic Portfolio Management

A course project for DS588 Data Science Algorithms. It is a Python tool that builds one portfolio from **Turkish investment funds** and **US-listed ETFs**: it downloads and cleans the prices with its own code, turns them into weekly portfolio weights with a price-only algorithm, and shows the result on a web page.

**Live site:** https://etf-database.vercel.app

This repository covers the first three phases of the project:

- **Phase 1, data collection and preparation:** a reproducible pipeline for 20 instruments and the USD/TRY exchange rate, a documented dataset and a data dictionary.
- **Phase 2, algorithm design using price action:** an algorithm that turns prices into portfolio weights, with pseudocode, documented rules and a computational analysis.
- **Phase 3, historical validation against benchmarks:** a simulation with trading costs, settlement days and exchange rates, a comparison with two equal-weight benchmarks, a rolling validation, parameter sensitivity and a discussion of the weaknesses.

The later phases (extra information, weekly competition) are not part of this version.

## Where to find each part

| Phase output | Where |
|---|---|
| Data collection code | [`scripts/fetch_data.py`](scripts/fetch_data.py), [`scripts/clean_data.py`](scripts/clean_data.py), [`run_all.py`](run_all.py) |
| Documented dataset | [`docs/instruments.csv`](docs/instruments.csv), written by [`scripts/describe_data.py`](scripts/describe_data.py); notebook sections 1 to 4 |
| Data dictionary | [`docs/data_dictionary.md`](docs/data_dictionary.md) |
| Working price-only algorithm | [`scripts/portfolio.py`](scripts/portfolio.py); its result is `public/data/portfolio.json` |
| Pseudocode and portfolio rules | [`docs/portfolio_rules.md`](docs/portfolio_rules.md); notebook section 8 |
| Computational analysis | [`docs/portfolio_rules.md`](docs/portfolio_rules.md) (complexity), [`scripts/runtime_test.py`](scripts/runtime_test.py) and notebook section 9 (measured runtime) |
| Reproducible historical comparisons (Phase 3) | [`scripts/simulate.py`](scripts/simulate.py), [`scripts/validation.py`](scripts/validation.py); results in [`docs/validation.md`](docs/validation.md) sections 2 to 4 and `public/data/validation.json` |
| Parameter sensitivity results | [`docs/validation.md`](docs/validation.md) section 5; notebook `validation.ipynb` section 5 |
| Critical discussion of weaknesses and improvements | [`docs/validation.md`](docs/validation.md) section 6 |
| Everything step by step, with code and results | [`notebook/analysis.ipynb`](notebook/analysis.ipynb) (Phases 1 and 2), [`notebook/validation.ipynb`](notebook/validation.ipynb) (Phase 3) |

## Investment universe

20 instruments from two markets: 10 US-listed ETFs and 10 Turkish funds (4 ETFs traded on Borsa Istanbul and 6 mutual funds traded through TEFAS). Together they cover stocks, bonds, the money market, gold and silver in both currencies.

| Symbol | What it is | Type | Market | Currency | Source | Data since |
|---|---|---|---|---|---|---|
| SPY | S&P 500 | ETF | United States | USD | Yahoo Finance | 2016 |
| QQQ | Nasdaq 100 | ETF | United States | USD | Yahoo Finance | 2016 |
| DIA | Dow Jones | ETF | United States | USD | Yahoo Finance | 2016 |
| IWM | Russell 2000 | ETF | United States | USD | Yahoo Finance | 2016 |
| EFA | Developed markets (ex-US) | ETF | United States | USD | Yahoo Finance | 2016 |
| EEM | Emerging markets | ETF | United States | USD | Yahoo Finance | 2016 |
| TUR | Turkey (MSCI Turkey) | ETF | United States | USD | Yahoo Finance | 2016 |
| GLD | Gold | ETF | United States | USD | Yahoo Finance | 2016 |
| SLV | Silver | ETF | United States | USD | Yahoo Finance | 2016 |
| TLT | Long-term US Treasury bonds | ETF | United States | USD | Yahoo Finance | 2016 |
| ZBB | BIST 30 stocks (Ziraat) | ETF | Türkiye | TRY | TEFAS | 2021 |
| FGA | Gold in lira (QNB) | ETF | Türkiye | TRY | TEFAS | 2021 |
| FGS | Silver in lira (QNB) | ETF | Türkiye | TRY | TEFAS | 2021 |
| FUS | US dollar Treasury bills (QNB) | ETF | Türkiye | TRY | TEFAS | 2021 |
| TI2 | Turkish stocks (İş Portföy) | Mutual fund | Türkiye | TRY | TEFAS | 2021 |
| AFA | US stocks (Ak Portföy) | Mutual fund | Türkiye | TRY | TEFAS | 2021 |
| TI6 | Lira bonds (İş Portföy) | Mutual fund | Türkiye | TRY | TEFAS | 2021 |
| AKE | US dollar Eurobonds (Ak Portföy) | Mutual fund | Türkiye | TRY | TEFAS | 2021 |
| DLY | Lira money market (Deniz Portföy) | Mutual fund | Türkiye | TRY | TEFAS | 2021 |
| TI7 | Balanced mixed fund (İş Portföy) | Mutual fund | Türkiye | TRY | TEFAS | 2021 |

The list is in `scripts/config.py`. For a Turkish fund the symbol is its TEFAS fund code. The official names, the ISIN codes and the trading rules of all instruments are in [`docs/instruments.csv`](docs/instruments.csv).

## Project structure

| File / folder | What it does |
|---|---|
| `scripts/config.py` | All settings: instruments, periods, signal and portfolio settings |
| `scripts/fetch_data.py` | Step 1: downloads the data → `data/raw/<SYMBOL>.csv` |
| `scripts/clean_data.py` | Step 2: cleans the data → `data/clean/<SYMBOL>.csv` |
| `scripts/backtest.py` | Step 3: returns and a test of the trend signal on every instrument alone → `public/data/<SYMBOL>.json`, `summary.json` |
| `scripts/portfolio.py` | Step 4: weekly portfolio weights → `public/data/portfolio.json` |
| `scripts/simulate.py` | Simulation of a portfolio in lira: orders, fill prices, settlement days, costs, exchange rate (used by step 5) |
| `scripts/validation.py` | Step 5: strategy against two benchmarks, rolling validation, sensitivity → `public/data/validation.json` |
| `run_all.py` | Runs the five steps in order |
| `scripts/describe_data.py` | Writes the instrument table `docs/instruments.csv` |
| `scripts/runtime_test.py` | Measures the runtime of the algorithm for growing inputs |
| `docs/` | Data dictionary, instrument table, portfolio rules, validation report |
| `notebook/analysis.ipynb` | Phases 1 and 2 explained with code, tables and charts |
| `notebook/validation.ipynb` | Phase 3 explained with code, tables and charts |
| `app/`, `components/`, `lib/` | Dashboard (Next.js + Tailwind + Recharts) |
| `.github/workflows/update-data.yml` | GitHub Action that updates the data every day |

The `data/` folder is not stored in the repository; `python run_all.py` creates it from scratch.

## Phase 1: data

**Sources**

| Data | Source | Address |
|---|---|---|
| US-listed ETFs, USD/TRY rate | Yahoo Finance | `https://query1.finance.yahoo.com/v8/finance/chart/<SYMBOL>?period1=<start>&period2=<end>&interval=1d` |
| Turkish funds | TEFAS | `https://www.tefas.gov.tr/api/funds/fonFiyatBilgiGetir` |

- The requests are sent with `requests`. There is no API key, no account and no cost. No ready-made data library (such as yfinance) is used.
- US ETFs and the exchange rate cover the last 10 years. Turkish funds cover the last 5 years, because TEFAS gives at most 60 months.
- A price from TEFAS is shown one trading day after the market it comes from: the price dated Friday is from Thursday's market (see the data dictionary, section 5).
- The period ends at 00:00 UTC on the day the script runs, so an unfinished trading day is never included.
- The script waits 2 seconds between Yahoo requests and 11 seconds between TEFAS requests, and tries each request up to 3 times. A download that still fails is tried once more after all the others. If anything cannot be downloaded, `run_all.py` stops with an error and writes no results.

**Which source works with a plain request?** Tested with `requests` in October 2026:

| Test | Result |
|---|---|
| Yahoo with the header `User-Agent: Mozilla/5.0` | 200, about 2,510 rows for a US ETF |
| Yahoo with the default `User-Agent` of `requests` | 429 Too Many Requests |
| Yahoo for an ETF listed on Borsa Istanbul (for example `GLDTR.IS`) | 200, but only the last day |
| TEFAS, current data address (`/api/funds/fonFiyatBilgiGetir`) | 200, about 1,260 rows for a fund |
| TEFAS, older data address (`/api/DB/BindHistoryInfo`) | 404 "Method not found or disabled" |
| Stooq CSV address: `https://stooq.com/q/d/l/?s=spy.us&i=d` | an HTML page that asks for a browser check instead of a CSV |

So Yahoo is the source for US ETFs and the exchange rate, and TEFAS is the source for all Turkish funds, also for the ETFs. Stooq stays in the code as a backup for US ETFs (`fetch_stooq`): it is tried when Yahoo fails, and a warning is printed if the answer is not a CSV. No code was written to get around a browser check; the only change to a plain request is the `User-Agent` header (see the table above).

**Cleaning** (`scripts/clean_data.py`, the same rules for every source)

- The date column becomes a datetime index; repeated days are removed and the rows are sorted by date.
- All columns are converted to numbers; zero or negative prices are treated as invalid.
- Missing prices are filled with the last known price (forward-fill), so no future information is used.
- If there is no adjusted close column, the close price is used.
- A short quality summary is printed for every file: number of rows, date range, and the number of missing values, repeated days and invalid prices.

**Documentation.** [`docs/data_dictionary.md`](docs/data_dictionary.md) describes the sources, every file and column, which price is used and how it is adjusted, the missing observations, the trading and settlement rules of each instrument, and the currency conversion. `python scripts/describe_data.py` writes [`docs/instruments.csv`](docs/instruments.csv) again from the sources and from the downloaded files.

## Phase 2: algorithm

Every Friday the algorithm decides which share of the portfolio goes to each instrument. Only price signals are used.

| Rule | Value |
|---|---|
| Signals | trend (50-day average above 200-day average) and volatility (last 63 daily returns), in the instrument's own currency |
| Asset selection | an instrument gets a weight only while it is in an uptrend (one exception: the minimum per market) |
| Allocation method | weight in proportion to 1 / volatility; a volatility below 10% is counted as 10% |
| Limit per instrument | at most 20% of the portfolio |
| Minimum per market | at least 20% in Türkiye and at least 20% in the United States; if a market has no instrument in an uptrend, its calmest instrument is held to reach this minimum |
| Cash | what the rules cannot give to an instrument stays in cash (lira) |
| Not allowed | short selling and borrowing: weights are never negative and never add up to more than 100% |
| Reporting currency | Turkish lira; the USD/TRY rate is used for valuing only, not as a signal |

- The allocation is our own code (`allocate`, `cap_weights` and `fill_market` in `scripts/portfolio.py`); no portfolio or trading library is used.
- A decision uses only the prices up to its day, and the weights apply from the next trading day. The notebook tests this: it deletes all prices after a decision day, runs the algorithm again and gets exactly the same weights.
- `check_rules` stops the pipeline if any weekly decision breaks a rule.
- The pseudocode, the reasons for the limits, the complexity (close to linear in the number of instruments and in the number of days) and the known limits are in [`docs/portfolio_rules.md`](docs/portfolio_rules.md).

The trend signal is also tested on every instrument alone (`scripts/backtest.py`): hold the instrument while the signal is on, otherwise stay in cash, with a 0.1% commission on every trade, compared with Buy & Hold. This test is in the instrument's own currency and starts with 10,000.

### Assumptions

- All calculations use the adjusted close. For US ETFs it includes dividends and splits; for Turkish funds it is the price published by TEFAS.
- The portfolio weights are targets. Trading costs, settlement days and the time between a decision and its execution are not part of the weights; they are simulated in Phase 3.
- In the test of one instrument a trade is made at the closing price of the day the signal appears, and returns start on the next trading day. This is a simplification: an order for a mutual fund is filled at the next fund price, and an ETF order after the close is filled on the next trading day (see the data dictionary, section 7). So this test is a first look at the signal and not a simulation of real trading. Bid-ask spread, slippage and taxes are ignored; cash earns no interest.
- In the test of one instrument a year is counted as 252 trading days (used for the yearly volatility and the Sharpe ratio). The Phase 3 simulation values the portfolio on every day on which one of the two markets is open, so it counts the days with a value per year instead (about 260).

## Phase 3: historical validation against benchmarks

`scripts/validation.py` simulates the strategy and two benchmarks with the same rules (`scripts/simulate.py`):

- **Benchmarks:** equal weights in all 20 instruments, rebalanced every week (50% Türkiye / 50% United States after every rebalance), and equal weights bought once and then held (the market shares drift with the prices).
- **Same conditions:** 10,000 lira at the start, reporting in lira, orders on the trading day after the decision at that day's closing price, settlement days of every instrument, 0.1% commission on every trade and 0.2% exchange cost on every US trade, cash without interest.
- **Rolling validation:** a setting (trend and volatility windows) is chosen on the last 52 weeks with the data known at that time, used for the next 26 weeks, and the windows move forward. No random splits.
- **Sensitivity:** the strategy with 16 other settings and cost levels.
- **Checks:** the buy-and-hold value is compared with a formula that can be checked by hand, and the values do not change when later prices are removed.

The method, all tables and the discussion of the weaknesses are in [`docs/validation.md`](docs/validation.md). These results are development and validation evidence, not an untouched final test: the real-time competition is the test on new data.

## The dashboard

The site has six views:

- **Portfolio:** the last weekly decision: the target weight of every fund, the total of each market and the cash, and how the market shares changed over time.
- **Validation:** the historical validation of Phase 3: the value of the strategy and of the two benchmarks after costs, the results over the whole period, the rolling validation, the parameter sensitivity, the checks and the known weaknesses.
- **Funds:** one table with all instruments: last price, trailing returns, the test of the trend signal against Buy & Hold and the current signal label.
- **Compare:** pick up to five instruments and see them on the same chart. Every line starts at 100 on the first day of the selected date range.
- **Details:** one instrument in detail: price with the two moving averages, portfolio value of the signal test and of Buy & Hold, metric table, period returns and yearly returns.
- **Method:** data sources, cleaning steps, portfolio rules and assumptions.

The dashboard is a static page. It only reads the files in `public/data/*.json` and makes no live data calls. Prices and returns of an instrument are shown in its own currency.

## How to run

**Data and analysis** (tested with Python 3.9 and 3.12)

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python run_all.py
```

`run_all.py` downloads the data, cleans it, tests the signal on every instrument, computes the portfolio weights, compares the portfolio with the benchmarks and writes the JSON files again. It takes two to three minutes, most of it waiting between TEFAS requests. The steps can also be run one by one: `python scripts/fetch_data.py`, `python scripts/clean_data.py`, `python scripts/backtest.py`, `python scripts/portfolio.py`, `python scripts/validation.py`.

```bash
python scripts/describe_data.py   # writes docs/instruments.csv again
python scripts/runtime_test.py    # measures the runtime of the algorithm
```

**Notebook**

```bash
jupyter notebook notebook/analysis.ipynb     # Phases 1 and 2
jupyter notebook notebook/validation.ipynb   # Phase 3
```

**Dashboard** (Node.js 20.9 or newer)

```bash
npm install
npm run dev
```

The page opens at `http://localhost:3000`. For the production version run `npm run build` and then `npm run start`.

## Automatic update

`.github/workflows/update-data.yml` runs `python run_all.py` every day at 01:30 UTC and commits the changed JSON files. The repository is connected to Vercel, so every commit publishes the site again. If anything cannot be downloaded, `run_all.py` ends with an error code and nothing is committed that day, so the site keeps the data of the day before.

From GitHub's servers a TEFAS request that comes soon after another one gets no answer. So the workflow waits about two minutes between TEFAS requests (the setting `TEFAS_SLEEP_SECONDS`), and one run takes about 25 minutes. If TEFAS still drops a request, the script waits just as long before it tries again, and a fund that still fails is tried once more at the end of the download. On a home connection the normal pause of 11 seconds is enough.

## Results so far

The results of Phases 1 and 2 use prices until October 9, 2026, the results of Phase 3 prices until November 5, 2026. The data is updated every day, so the numbers on the site change over time.

**Phase 1: the data**

- All 20 instruments and the exchange rate were downloaded with our own code. No instrument file had a missing value, a repeated day or an invalid price. The exchange rate had 8 empty days; they were filled with the rate of the day before.
- The two markets have different holidays. A US ETF has 96 weekdays without a price in its 10 years, a Turkish fund 47 in its 5 years. We do not fill these days; an instrument simply keeps its last known value.
- The Turkish history is only 5 years long, because TEFAS does not give more. Everything that needs both markets can only start when the Turkish funds have enough data.
- The largest one-day moves are market events, not data errors. For example, five Turkish funds that hold assets priced in dollars fell by 24% to 33% in lira on December 22, 2021, after the lira had gained strongly against the dollar.

**The trend signal on one instrument**

- Used alone, the signal earned less than Buy & Hold in 19 of the 20 instruments. The only exception is TLT, the long-term US bond ETF, whose price fell for a long time.
- The main reason is the delay. Moving averages turn after the price has turned, so the strategy sells after a fall and buys back after the recovery has started. It also waits in cash for the first 200 days.
- What the signal gives is lower risk: the volatility was lower with the strategy in 19 of the 20 instruments.
- Prices in lira rise with inflation. Buy & Hold in every Turkish fund shows a return of more than 300% in lira over 5 years (for example 1,047% for ZBB). Such a return cannot be compared with a return in dollars.

**Phase 2: the portfolio**

- The algorithm made 220 weekly decisions, from July 29, 2022 to October 9, 2026. Every decision follows all the rules: no negative weight, no instrument above 20%, at least 20% in each market, and a total of exactly 100%.
- It held between 10 and 20 instruments (17 on average). Cash was 0% in every week, because at least 10 instruments were in an uptrend in every week.
- Türkiye had 61% of the portfolio on average (between 44% and 80%), the United States 39% (between 20% and 56%).
- The United States was at its minimum of 20% in 24 weeks in a row, from July 2022 to January 2023, when most US ETFs were in a downtrend. In 5 of these weeks no US ETF was in an uptrend at all. Then the algorithm held GLD, the calmest US ETF at that time, only to keep the market at its minimum.
- The limit of 20% per instrument was reached in 20 weeks.
- From one week to the next the algorithm moved 2.6% of the portfolio on average (the median is 1.3%). The largest change was 20.4%, on September 2, 2022.
- The last decision (October 9, 2026) holds 13 instruments: 59.37% in Türkiye, 40.63% in the United States and no cash.

**Weaknesses we can already see**

- The Turkish funds were in an uptrend in 97% of all weeks, the US ETFs in 74%. Five of the ten Turkish funds were in an uptrend in every single week. Because lira prices rise with inflation, the trend filter almost never removes a Turkish fund.
- Because of the 10% floor, all calm lira funds get almost the same weight, so the volatility signal does not separate them.
- Cash was never used, so the cash rule has not been tested by the data.
- These results describe weights only. They do not show whether the portfolio earns more than a simple one. Phase 3 (below) compares it with two equal-weight benchmarks, with trading costs and with the real trading rules of each instrument.

**Phase 3: against the benchmarks** (August 29, 2022 to November 5, 2026, 10,000 lira, after costs)

| | Strategy | Equal weights, weekly | Equal weights, buy and hold |
|---|---:|---:|---:|
| Total return in lira | 373.72% | 400.48% | 389.73% |
| Yearly volatility | 9.04% | 11.62% | 14.08% |
| Maximum drawdown | −6.22% | −9.43% | −16.52% |
| Sharpe ratio (risk-free rate 0) | 4.16 | 3.37 | 2.77 |
| Total return in US dollars | 72.11% | 81.84% | 77.93% |

- The strategy was calmer than both benchmarks but did not earn more. In the rolling validation the benchmarks also returned more over all test windows (171% for the strategy against 188% to 191%), and choosing the setting on the past was worse than keeping one fixed setting in five of seven windows.
- Lira interest rates were very high: the lira money market fund DLY alone returned 373.42% in the same period. Measured against that, the strategy added nothing.
- The volatility floor decides most of the result, because it sets how much goes to the calm lira funds. The trend and volatility windows change the total return only between 338% and 384%.
- Details and ideas for improvement: [`docs/validation.md`](docs/validation.md).

## References

The methods are well known; the code that implements them is our own. These are the sources of the ideas:

| Method | Where it is used | Source |
|---|---|---|
| Trend rule with two moving averages | trend signal (`backtest.add_signals`, `portfolio.compute_signals`) | Brock, W., Lakonishok, J. and LeBaron, B. (1992). Simple Technical Trading Rules and the Stochastic Properties of Stock Returns. *The Journal of Finance*, 47(5), 1731–1764. Faber, M. T. (2007). A Quantitative Approach to Tactical Asset Allocation. *The Journal of Wealth Management*, 9(4), 69–79. |
| Weights in proportion to 1 / volatility | allocation (`portfolio.allocate`) | Maillard, S., Roncalli, T. and Teïletche, J. (2010). The Properties of Equally Weighted Risk Contribution Portfolios. *The Journal of Portfolio Management*, 36(4), 60–70 (1 / volatility is the special case without correlations). |
| Equal weights (1/N) as a benchmark | benchmarks (`validation.equal_weights`) | DeMiguel, V., Garlappi, L. and Uppal, R. (2009). Optimal Versus Naive Diversification: How Inefficient Is the 1/N Portfolio Strategy? *The Review of Financial Studies*, 22(5), 1915–1953. |
| Rolling (walk-forward) validation in time order | `validation.walk_forward` | Pardo, R. (2008). *The Evaluation and Optimization of Trading Strategies* (2nd ed.). Wiley. Hyndman, R. J. and Athanasopoulos, G. (2021). *Forecasting: Principles and Practice* (3rd ed.), section 5.10, Time series cross-validation. OTexts. https://otexts.com/fpp3/tscv.html |
| Why choosing settings on past results can mislead | discussion in `docs/validation.md`, section 6 | Bailey, D. H., Borwein, J. M., López de Prado, M. and Zhu, Q. J. (2014). Pseudo-Mathematics and Financial Charlatanism: The Effects of Backtest Overfitting on Out-of-Sample Performance. *Notices of the American Mathematical Society*, 61(5), 458–471. |
| Sharpe ratio | `backtest.compute_metrics`, `simulate.metrics` | Sharpe, W. F. (1994). The Sharpe Ratio. *The Journal of Portfolio Management*, 21(1), 49–58. |

The data sources (Yahoo Finance, TEFAS) and the sources for the trading and settlement rules (U.S. Securities and Exchange Commission, Borsa Istanbul, TEFAS and KAP fund documents) are listed in [`docs/data_dictionary.md`](docs/data_dictionary.md).

## Notes

- Yahoo updates its adjusted close values back in time when new dividends are paid. Because of this the results can change slightly depending on the day the script runs.
- The data addresses of Yahoo and TEFAS are public but not officially documented. If one of them changes, only the functions in `scripts/fetch_data.py` must be changed.
- The current TEFAS data addresses and the form of their requests were found by reading open-source TEFAS clients on GitHub, mainly [tefas-crawler](https://github.com/burakyilmaz321/tefas-crawler) and [pytefas](https://github.com/mirzazad/pytefas). No code was copied from them and they are not used as libraries; the download code in `scripts/fetch_data.py` is our own.
- Use of generative AI: an AI coding assistant (Claude Code by Anthropic) was used to help write, test and review the code and the documentation of this project.
- This project is homework for a course. It is not investment advice. Past performance does not guarantee future results.
