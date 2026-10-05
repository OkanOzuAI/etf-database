# ETF & Stock Database: SMA Crossover Strategy vs Buy & Hold

A small end-to-end data science project for a course homework. It downloads 10 years of daily prices for 20 symbols (10 ETFs and 10 large companies) with its own code, cleans the data, compares a simple moving average strategy with Buy & Hold, and shows the results on a web page.

**Live site:** https://etf-database.vercel.app

## Goal

The question: does the rule "be in the position while the 50-day average is above the 200-day average, otherwise stay in cash" give a better result than simply buying and holding?

Every step (download, clean, transform, analyze, visualize) is done with the code in this repository. No ready-made data library (such as yfinance), no API key and no backtest library is used.

### Symbols

| Symbol | What it is | Group |
|---|---|---|
| SPY | S&P 500 | US index ETFs |
| QQQ | Nasdaq 100 | US index ETFs |
| DIA | Dow Jones | US index ETFs |
| IWM | Russell 2000 | US index ETFs |
| EFA | Developed markets (ex-US) | International ETFs |
| EEM | Emerging markets | International ETFs |
| TUR | Turkey (MSCI Turkey) | International ETFs |
| GLD | Gold | Commodity ETFs |
| SLV | Silver | Commodity ETFs |
| TLT | Long-term US Treasury bonds | Bond ETFs |
| NVDA | Nvidia | Companies |
| AAPL | Apple | Companies |
| MSFT | Microsoft | Companies |
| GOOGL | Alphabet (Google) | Companies |
| AMZN | Amazon | Companies |
| META | Meta Platforms | Companies |
| TSLA | Tesla | Companies |
| JPM | JPMorgan Chase | Companies |
| XOM | Exxon Mobil | Companies |
| KO | Coca-Cola | Companies |

The list is the `SYMBOLS` variable in `scripts/config.py`.

## Project structure

| File / folder | What it does |
|---|---|
| `scripts/config.py` | All settings: symbols, period, strategy settings |
| `scripts/fetch_data.py` | Step 1: downloads the data → `data/raw/<SYMBOL>.csv` |
| `scripts/clean_data.py` | Step 2: cleans the data → `data/clean/<SYMBOL>.csv` |
| `scripts/backtest.py` | Step 3: returns, strategy, metrics → `public/data/*.json` |
| `run_all.py` | Runs the three steps in order |
| `notebook/analysis.ipynb` | All steps explained with code, tables and charts |
| `app/`, `components/`, `lib/` | Dashboard (Next.js + Tailwind + Recharts) |
| `.github/workflows/update-data.yml` | GitHub Action that updates the data every day |

The `data/` folder is not stored in the repository; `python run_all.py` creates it from scratch.

## Data source and how the data is downloaded

**Source:** Yahoo Finance's public chart address.

```
https://query1.finance.yahoo.com/v8/finance/chart/<SYMBOL>?period1=<start>&period2=<end>&interval=1d
```

- The request is sent with `requests`. There is no API key, no account and no cost.
- `period1` and `period2` are Unix seconds. The period is the last 10 years before the day the script runs. The end is the start of the day (00:00 UTC), so the unfinished trading day is never included.
- The answer is JSON: the dates and the open, high, low, close, volume and adjusted close values come as separate lists. The `fetch_yahoo` function puts them into one pandas DataFrame and converts the Unix seconds to dates in the time zone of the exchange.
- The script waits 2 seconds between requests and tries a failed request up to 3 times. If a symbol cannot be downloaded, it prints a warning and continues with the other symbols.

**Which source works without a key?** Tested with `requests` on October 5, 2026:

| Test | Result |
|---|---|
| Yahoo with the header `User-Agent: Mozilla/5.0` | 200, 2512 rows per symbol |
| Yahoo with the default `User-Agent` of `requests` | 429 Too Many Requests |
| Stooq CSV address: `https://stooq.com/q/d/l/?s=spy.us&i=d` | an HTML page that asks for a browser check instead of a CSV |

So Yahoo is the main source. Stooq stays in the code as a backup (`fetch_stooq`): it is tried when Yahoo fails, and a warning is printed if the answer is not a CSV. No code was written to get around Stooq's browser check.

## Pipeline steps

**1. Download** (`scripts/fetch_data.py`)
For every symbol the daily open, high, low, close, adjusted close and volume are downloaded and saved unchanged under `data/raw/`.

**2. Clean** (`scripts/clean_data.py`)
- The date column becomes a datetime index; repeated days are removed and the rows are sorted by date.
- All columns are converted to numbers; zero or negative prices are treated as invalid.
- Missing prices are filled with the last known price (forward-fill), so no future information is used.
- If there is no adjusted close column, the close price is used.
- A short quality summary is printed for every symbol: number of rows, date range, number of missing values.

**3. Analysis and backtest** (`scripts/backtest.py`)
- Daily, weekly, monthly and yearly percent returns are computed with `resample`, plus trailing returns (1 month, 1 year, ...).
- Strategy: if SMA50 > SMA200 be in the position, otherwise stay in cash. The signal is shifted by one day (`shift(1)`): today's position is decided by the signal at yesterday's close, so there is no look-ahead bias. A 0.1% commission is paid on every buy and sell.
- Benchmark: Buy & Hold, which buys on the first day and holds until the last day.
- With a starting capital of $10,000, these metrics are computed for both: total return, profit, CAGR, yearly volatility, Sharpe ratio (risk-free rate 0), maximum drawdown and number of trades.
- A signal label is computed for every symbol from the last two days: `BUY` (the signal just turned on), `HOLD` (it was already on), `SELL` (it just turned off) or `WAIT` (it was already off). The label only repeats what the SMA rule says; it is not investment advice.
- The results are written as JSON under `public/data/`: `summary.json` (metric table, trailing returns, signal labels, settings, last update time) and one `<SYMBOL>.json` per symbol (daily price, averages, portfolio values, buy / sell days, period returns).

**4. Visualization**
The dashboard is a static page. It only reads the files in `public/data/*.json` and makes no live data calls.

### Assumptions

- All calculations use the adjusted close (it includes dividends and splits). A trade is made at the closing price of the day the signal appears; returns start on the next trading day.
- Each trade uses all of the capital. Bid-ask spread, slippage and taxes are ignored; cash earns no interest.
- Until SMA200 exists (the first 200 trading days) the strategy stays in cash, while Buy & Hold is invested from day one.
- 252 trading days are used to annualize.

## The dashboard

The site has four views:

- **Overview:** one table with all symbols: last price, trailing returns, strategy and Buy & Hold total return, the winner and the current signal label.
- **Compare:** pick up to five symbols and see them on the same chart. Every line starts at 100 on the first day of the selected date range. The table shows the return of each symbol in that range.
- **Details:** one symbol in detail: price with the two moving averages and the buy / sell markers, portfolio value of the strategy and of Buy & Hold, metric table, period returns and yearly returns.
- **Method:** data source, cleaning steps, strategy rule and assumptions.

In Compare and Details the date range can be chosen with the 1Y / 3Y / 5Y / All buttons or typed by hand.

## How to run

**Data and analysis** (tested with Python 3.9 and 3.12)

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python run_all.py
```

`run_all.py` downloads the data, cleans it, runs the backtest and writes the JSON files again. The steps can also be run one by one: `python scripts/fetch_data.py`, `python scripts/clean_data.py`, `python scripts/backtest.py`.

**Notebook**

```bash
jupyter notebook notebook/analysis.ipynb
```

**Dashboard** (Node.js 20.9 or newer)

```bash
npm install
npm run dev
```

The page opens at `http://localhost:3000`. For the production version run `npm run build` and then `npm run start`.

## Automatic update

`.github/workflows/update-data.yml` runs `python run_all.py` every day at 01:30 UTC and commits the changed JSON files. When the repository is connected to Vercel, every commit publishes the site again. If a symbol cannot be downloaded, `run_all.py` ends with an error code and nothing is committed that day, so the site keeps the data of the day before.

## Short comment on the results

These results cover October 5, 2016 to October 2, 2026. The data is updated every day, so the numbers on the site change over time.

**Return:** Buy & Hold had a higher total return than the SMA strategy in 19 of the 20 symbols. The only symbol where the strategy won is TLT, the long-term bond fund.

| Symbol | Strategy | Buy & Hold | Winner |
|---|---|---|---|
| SPY | 143% | 318% | Buy & Hold |
| QQQ | 378% | 575% | Buy & Hold |
| DIA | 54% | 239% | Buy & Hold |
| IWM | 0% | 157% | Buy & Hold |
| EFA | 34% | 136% | Buy & Hold |
| EEM | 35% | 122% | Buy & Hold |
| TUR | -55% | 19% | Buy & Hold |
| GLD | 135% | 214% | Buy & Hold |
| SLV | 69% | 225% | Buy & Hold |
| TLT | 2% | -23% | Strategy |
| NVDA | 5,343% | 13,863% | Buy & Hold |
| AAPL | 258% | 1,189% | Buy & Hold |
| MSFT | 450% | 910% | Buy & Hold |
| GOOGL | 398% | 765% | Buy & Hold |
| AMZN | 147% | 495% | Buy & Hold |
| META | 247% | 472% | Buy & Hold |
| TSLA | 391% | 2,564% | Buy & Hold |
| JPM | 218% | 533% | Buy & Hold |
| XOM | 127% | 190% | Buy & Hold |
| KO | 27% | 179% | Buy & Hold |

**Why?**

- **Delay.** Moving averages follow the price with a delay: the strategy sells after a fall and buys back after the recovery has started. For example, in SPY the strategy sold at $235.74 on March 31, 2020 (the low was on March 23) and bought back at $291.25 on July 6, 2020. It missed a rise of about 24%.
- **Choppy markets.** When the price changes direction often, the strategy buys high and sells low. In TUR it made 18 trades, and in 7 of its 9 buy-sell rounds it sold below the buy price: Buy & Hold gained 19% while the strategy lost 55%. In IWM the strategy ended the 10 years where it started, while Buy & Hold gained 157%.
- **The first 200 days.** The strategy stays in cash until SMA200 exists. SPY rose about 16% in that time; Buy & Hold earned this, the strategy did not.
- **Long, strong rises.** The gap is largest in the fastest growing companies. With Buy & Hold, $10,000 in NVDA became about $1,396,000; with the strategy it became about $544,000. In TSLA the numbers are about $266,000 and $49,000. Every time the strategy steps out during a long rise, it gives up part of the gain.
- **Where the strategy helped: a long fall.** TLT lost 31% in 2022. The strategy sold on February 15, 2022, stayed in cash for the rest of the year and finished that year at -9%. After 10 years Buy & Hold lost 23%, while the strategy was about flat (2%).

**Risk:** The strategy is in cash part of the time, so its yearly volatility is lower in all 20 symbols (for example 15.1% against 17.9% in SPY). Even so, the Sharpe ratio is better for Buy & Hold in 19 symbols; TLT is again the exception. The worst loss (maximum drawdown) was clearly smaller with the strategy in 9 symbols, mostly the more volatile ones: META (-38.3% against -76.7%), NVDA (-37.5% against -66.3%), XOM (-37.1% against -61.0%). It was clearly larger in 3 (IWM, TUR, AAPL) and about the same in the rest.

**Conclusion:** In this period and with these settings (50/200 days, 0.1% commission) the simple SMA crossover strategy earned less than Buy & Hold in rising markets. What it offered was lower risk: lower volatility in every symbol and a smaller worst loss in many volatile ones. It only won on return in an asset that fell for a long time (TLT). The result depends on the period, the settings and the assumptions; in another period it may look different.

## Notes

- Yahoo updates its adjusted close values back in time when new dividends are paid. Because of this the results can change slightly depending on the day the script runs.
- This is a course homework. It is not investment advice. Past performance does not guarantee future results.
