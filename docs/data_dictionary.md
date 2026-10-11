# Data dictionary

This file describes the dataset of the project: what is in it, where it comes from, what every column means, and how each instrument is traded. It belongs to Phase 1 (data collection and preparation).

## 1. The dataset in short

| | |
|---|---|
| Instruments | 20: 10 US-listed ETFs and 10 Turkish funds (4 ETFs traded on Borsa Istanbul, 6 mutual funds traded through TEFAS) |
| Extra series | the USD/TRY exchange rate |
| Frequency | daily (one row per trading day) |
| Period | US ETFs and exchange rate: the last 10 years. Turkish funds: the last 5 years (the limit of TEFAS) |
| Currencies | US ETFs in US dollars (USD), Turkish funds in Turkish lira (TRY) |
| How to get it | `python run_all.py` downloads and cleans everything; `python scripts/describe_data.py` writes the instrument table |

The price files are not stored in the repository. Every run downloads them again, so the dataset can be rebuilt by anyone. The numbers in this file are from the run of 2026-10-11 (prices until 2026-10-09). [`instruments.csv`](instruments.csv) has the numbers of the last time `python scripts/describe_data.py` was run; the daily automatic update does not change it.

## 2. Instruments

Each instrument is identified by its code at the source and by an official identifier: the exchange and ticker for US ETFs, the ISIN code for Turkish funds.

| Symbol | Full name | Type | Market | Currency | Identifier |
|---|---|---|---|---|---|
| SPY | State Street SPDR S&P 500 ETF Trust | ETF | United States | USD | NYSEArca: SPY |
| QQQ | Invesco QQQ Trust | ETF | United States | USD | NasdaqGM: QQQ |
| DIA | State Street SPDR Dow Jones Industrial Average ETF Trust | ETF | United States | USD | NYSEArca: DIA |
| IWM | iShares Russell 2000 ETF | ETF | United States | USD | NYSEArca: IWM |
| EFA | iShares MSCI EAFE ETF | ETF | United States | USD | NYSEArca: EFA |
| EEM | iShares MSCI Emerging Markets ETF | ETF | United States | USD | NYSEArca: EEM |
| TUR | iShares MSCI Turkey ETF | ETF | United States | USD | NasdaqGM: TUR |
| GLD | SPDR Gold Shares | ETF | United States | USD | NYSEArca: GLD |
| SLV | iShares Silver Trust | ETF | United States | USD | NYSEArca: SLV |
| TLT | iShares 20+ Year Treasury Bond ETF | ETF | United States | USD | NasdaqGM: TLT |
| ZBB | ZİRAAT PORTFÖY BIST 30 ENDEKSİ HİSSE SENEDİ YOĞUN BORSA YATIRIM FONU | ETF | Türkiye | TRY | ISIN TRYZIPO00105, Borsa Istanbul: ZPX30 |
| FGA | QNB PORTFÖY ALTIN KATILIM BORSA YATIRIM FONU | ETF | Türkiye | TRY | ISIN TRYFNBK00055, Borsa Istanbul: GLDTR |
| FGS | QNB PORTFÖY GÜMÜŞ KATILIM BORSA YATIRIM FONU | ETF | Türkiye | TRY | ISIN TRYFNBK00030, Borsa Istanbul: GMSTR |
| FUS | QNB PORTFÖY AMERİKAN DOLARI YABANCI BORSA YATIRIM FONU | ETF | Türkiye | TRY | ISIN TRYFNBK00089, Borsa Istanbul: USDTR |
| TI2 | İŞ PORTFÖY HİSSE SENEDİ (TL) FONU (HİSSE SENEDİ YOĞUN FON) | Mutual fund | Türkiye | TRY | ISIN TRMTI2WWWWW8, TEFAS: TI2 |
| AFA | AK PORTFÖY AMERİKA YABANCI HİSSE SENEDİ FONU | Mutual fund | Türkiye | TRY | ISIN TRYAKBK00458, TEFAS: AFA |
| TI6 | İŞ PORTFÖY BORÇLANMA ARAÇLARI (TL) FONU | Mutual fund | Türkiye | TRY | ISIN TRMTI6WWWWW9, TEFAS: TI6 |
| AKE | AK PORTFÖY EUROBOND (AMERİKAN DOLARI) BORÇLANMA ARAÇLARI FONU | Mutual fund | Türkiye | TRY | ISIN TRYAKBK00318, TEFAS: AKE |
| DLY | DENİZ PORTFÖY PARA PİYASASI (TL) FONU | Mutual fund | Türkiye | TRY | ISIN TRMDLYWWWWW9, TEFAS: DLY |
| TI7 | İŞ PORTFÖY DENGELİ DEĞİŞKEN FON | Mutual fund | Türkiye | TRY | ISIN TRMTI7WWWWW7, TEFAS: TI7 |

**ETF or mutual fund?** The `type` column separates the two kinds:

- **ETF (exchange-traded fund):** it is bought and sold on a stock exchange during the day, like a share. The 10 US instruments and four of the Turkish ones are ETFs. In Turkish an ETF is called *borsa yatırım fonu*.
- **Mutual fund:** it is not traded on an exchange. Orders go to the fund through TEFAS, and the fund has only one price per day. Six of the Turkish instruments are mutual funds.

For the Turkish ETFs the symbol is the TEFAS fund code (for example `ZBB`); the ticker on Borsa Istanbul is different (`ZPX30`) and is given in the identifier.

## 3. Sources and how we access them

| Data | Source | Address | Request |
|---|---|---|---|
| US ETFs, USD/TRY | Yahoo Finance | `https://query1.finance.yahoo.com/v8/finance/chart/<SYMBOL>` | GET with `period1`, `period2` (Unix seconds) and `interval=1d` |
| Turkish funds: prices | TEFAS (tefas.gov.tr) | `https://www.tefas.gov.tr/api/funds/fonFiyatBilgiGetir` | POST with the fund code and `periyod=60` (months) |
| Turkish funds: profile | TEFAS | `https://www.tefas.gov.tr/api/funds/fonProfilBilgiGetir` | POST with the fund code |

- No API key, no account and no paid service is used. The requests are sent with `requests` and the answers are parsed with our own code.
- Both are public addresses that the websites themselves use. They are not officially documented, so they can change. If that happens, only the functions in `scripts/fetch_data.py` must be changed.
- **Access conditions.** We only read public data, slowly: 2 seconds between Yahoo requests and 11 seconds between TEFAS requests (TEFAS allows about 6 requests per minute). We do not log in and we do not try to get around a browser check. The only thing we change in a plain request is the `User-Agent` header, because Yahoo rejects the default one of `requests` (see the limits below). A source that does not answer such a request is not used.

**Limits of the data access and what we do about them**

| Limit | What we do |
|---|---|
| TEFAS gives at most the last 60 months. | The Turkish history is 5 years, the US history 10 years. Results that need both markets start when both have enough data. |
| The older TEFAS address (`.../api/DB/BindHistoryInfo`) and the TEFAS web pages answer "Request Rejected" or "Method not found" to a plain request. | We use the current data address above, which answers plain requests. |
| Yahoo has almost no history for ETFs listed on Borsa Istanbul (only the last day). | We take the Turkish ETFs from TEFAS, which publishes their closing price on the exchange. |
| Yahoo rejects requests whose `User-Agent` is `python-requests` (error 429). | We send a plain browser-style header (`Mozilla/5.0`). |
| Stooq (the backup for US ETFs) answers with a browser check page. | The code notices it and prints a warning. We did not write code to get around the check. |

If a source stops answering, `run_all.py` stops with an error and writes no results, so old results are never mixed with incomplete data. A reproducible alternative for the Turkish funds is to save the daily prices of every run: each run adds the new days, and the history grows beyond 60 months.

## 4. Files and columns

### `data/raw/<SYMBOL>.csv`: the data as downloaded

| Column | Meaning | In files from |
|---|---|---|
| `Date` | Yahoo: the trading day (`YYYY-MM-DD`), in the time zone of the exchange. TEFAS: the day for which TEFAS shows the price; the price comes from the market of the trading day before (see section 5) | Yahoo, TEFAS |
| `Open`, `High`, `Low` | first, highest and lowest price of the day | Yahoo |
| `Close` | Yahoo: last price of the day, not adjusted. TEFAS: the price of the day (see section 5) | Yahoo, TEFAS |
| `Adj Close` | closing price adjusted for dividends and splits | Yahoo |
| `Volume` | number of shares traded in the day | Yahoo |

### `data/clean/<SYMBOL>.csv`: the data after cleaning

| Column | Meaning |
|---|---|
| `date` | trading day; the rows are sorted by date and every day appears once |
| `open`, `high`, `low`, `close` | as above, as numbers (only `close` for Turkish funds) |
| `adj_close` | **the price used in every calculation.** Yahoo: the adjusted close. TEFAS and exchange rate: equal to `close` |
| `volume` | shares traded (Yahoo files only). It is kept in the file but not used in any calculation |

Prices are in the currency of the instrument (USD or TRY). `data/clean/USDTRY.csv` has the same columns; its price is the number of lira for one US dollar.

### `docs/instruments.csv`: one row per instrument

| Column | Meaning |
|---|---|
| `symbol`, `name`, `full_name` | our code, our short name, and the official name from the source |
| `type` | `ETF`, `Mutual fund` or `Exchange rate` |
| `market`, `currency` | `United States` / `Türkiye`, and `USD` / `TRY` |
| `identifier` | exchange and ticker (US), or ISIN code and code on TEFAS / Borsa Istanbul (Türkiye) |
| `source`, `price_used` | where the price comes from and which price it is |
| `first_day`, `last_day`, `rows` | observation period and number of daily rows |
| `weekdays_without_price` | weekdays inside the period that have no row (market holidays) |
| `missing_values`, `repeated_days`, `invalid_prices` | problems found in the raw file: empty or non-numeric cells, days that appear twice, prices that are zero or negative |
| `largest_daily_move_pct` | largest change from one day to the next, in percent (a check for jumps in the data) |
| `traded_on`, `trading_hours` | where and when orders can be given (local time of the market) |
| `buy_settlement_days`, `sell_settlement_days` | business days between a trade and its payment |
| `risk_value` | risk class of a Turkish fund, from 1 (lowest) to 7 (highest), as published on TEFAS |
| `more_information` | page of the instrument at the source or on the Public Disclosure Platform (KAP) |

### `public/data/*.json`: results read by the dashboard

| File | Content |
|---|---|
| `summary.json` | one entry per instrument: period, last price, trailing returns, results of the single-instrument backtest, signal label |
| `<SYMBOL>.json` | daily price, moving averages, portfolio values, trades and period returns of one instrument |
| `portfolio.json` | the last weekly portfolio decision (weights, market totals, cash) and the history of all weekly decisions |

## 5. Which price is used, and adjustments

| Instruments | Price in our data | Adjusted? |
|---|---|---|
| US ETFs | `adj_close`: Yahoo's adjusted closing price | Yes: dividends and splits are already inside the adjusted price |
| Turkish ETFs | closing price on Borsa Istanbul of the trading day before, as shown by TEFAS (*borsa bülten fiyatı*) | No adjustment is needed (see below) |
| Turkish mutual funds | price of one fund share that TEFAS shows for that day; it is calculated from the market of the trading day before | No adjustment is needed (see below) |
| USD/TRY | Yahoo's daily value: the rate in the first hours of the day, London time (see section 8) | No |

- **No double counting.** For US ETFs the adjusted price already contains the dividends, so we never add dividends again. Returns computed from `adj_close` are total returns. The unadjusted `close` stays in the file because it is the price at which a trade really happens.
- **Adjusted prices change over time.** When a US ETF pays a new dividend, Yahoo rescales its whole adjusted history. Two runs on different days can therefore differ by small amounts in old prices.
- **Turkish funds.** These funds normally do not pay out their income; it stays in the fund and raises the price. So the price series is already a total return series and `adj_close` equals `close`. We checked every series for jumps that would point to a payout or a split: `largest_daily_move_pct` in `instruments.csv`. The large moves we found are market events, not data errors. For example, the funds that hold assets priced in dollars (gold, silver, US stocks and bonds) fell 24% to 33% in lira on December 22, 2021, after the lira had gained strongly against the dollar.
- **The TEFAS date is one trading day after the market.** For a Turkish ETF the price that TEFAS shows for day D is the closing price on Borsa Istanbul of the trading day before (not the fund's own share value). For a mutual fund it is the fund price calculated from the market of the trading day before. Example: our file has 204.50 for ZBB on October 9, 2026. This is the exchange close of October 8; the close of October 9 was 204.45. So a decision on Friday knows the Turkish market until Thursday. This cannot bring future data into a decision.

## 6. Missing observations and cleaning decisions

The same cleaning rules are used for every file (`scripts/clean_data.py`):

1. Column names are simplified (`Adj Close` becomes `adj_close`).
2. The date becomes the index. A row whose date cannot be read is dropped.
3. If a day appears twice, the last one in the file is kept. Then the rows are sorted by date.
4. If a source has no adjusted close, the close is used.
5. Every value is converted to a number. A value that is not a number becomes missing.
6. A price that is zero or negative is treated as missing.
7. A missing price is filled with the last known price (forward-fill). We never fill from a later day, because that would bring future information into the past.

What we found in this run:

| Series | Period | Rows | Missing values | Repeated days | Invalid prices | Weekdays without a row |
|---|---|---|---|---|---|---|
| each US ETF | 2016-10-11 to 2026-10-09 | 2513 | 0 | 0 | 0 | 96 |
| each Turkish fund | 2021-10-11 to 2026-10-09 | 1258 | 0 | 0 | 0 | 47 |
| USD/TRY | 2016-10-11 to 2026-10-09 | 2609 | 48 | 0 | 0 | 0 |

- The 48 missing values of USD/TRY are 8 days on which Yahoo returned an empty row. They were filled with the rate of the day before.
- **Weekdays without a row are market holidays, not errors.** The two markets have different holidays, so their calendars are different. We do not add rows for holidays to the clean files. When the portfolio is computed, an instrument without a price on some day simply keeps its last known value.

## 7. Trading, pricing and settlement

These are the facts a simulation needs. An observed price is not always a price at which one can trade.

**US ETFs**

- Traded on NYSE Arca or Nasdaq from 09:30 to 16:00 New York time. The price changes during the day; our data has the closing price.
- A decision that uses Friday's close can be traded on Monday at the earliest, at a price that is not known on Friday.
- Payment (settlement) is one business day after the trade (T+1) since May 28, 2024. Before that it was two days.
- They are priced in US dollars. A portfolio in lira must change lira into dollars to buy them, at the rate of that day and with a cost.

**Turkish ETFs**

- Traded on Borsa Istanbul from 10:00 to 18:00 Istanbul time (continuous trading). Payment is two business days after the trade (T+2).

**Turkish mutual funds**

- A mutual fund has one price per business day and cannot be traded during the day.
- **For most mutual funds the price of an order is not known when the order is given.** An order is filled at the first fund price that is calculated after the order. For example, for TI2 an order given until 13:30 on a business day gets the next calculated price, and an order given later gets the one after that. The money market fund DLY is the exception: an order given between 09:00 and 13:30 is filled on the same day, at a price that is already known (the price calculated on the business day before).
- The payment follows some business days later, and buying and selling can differ:

| Symbol | Orders go to | Order hours | Buy: payment after (days) | Sell: payment after (days) |
|---|---|---|---|---|
| ZBB | Borsa Istanbul | 10:00-18:00 | 2 | 2 |
| FGA | Borsa Istanbul | 10:00-18:00 | 2 | 2 |
| FGS | Borsa Istanbul | 10:00-18:00 | 2 | 2 |
| FUS | Borsa Istanbul | 10:00-18:00 | 2 | 2 |
| TI2 | TEFAS | 09:00-17:45 | 1 | 2 |
| AFA | TEFAS | 09:00-17:45 | 1 | 2 |
| TI6 | TEFAS | 09:00-17:45 | 1 | 1 |
| AKE | TEFAS | 09:00-17:45 | 1 | 2 |
| DLY | TEFAS | 09:00-13:30 | 0 | 0 |
| TI7 | TEFAS | 09:00-17:45 | 1 | 2 |

- So money from a sale can arrive one or two days later than a purchase must be paid. A simulation must not use that money before it arrives.

In Phase 2 the algorithm only produces target weights. The trading rules above are used when the portfolio is simulated (Phase 3) and reported every week (Phase 5).

## 8. Currency

- The portfolio is reported in one currency: Turkish lira (`REPORT_CURRENCY` in `scripts/config.py`).
- A US ETF is valued in lira as: price in dollars × USD/TRY rate of the same calendar day. If there is no rate on that day, the last known rate before it is used.
- The times are not equal. Yahoo's daily USD/TRY value of day D is taken in the first hours of day D, London time (in our file the close of a row is almost equal to its open). The US closing price of day D is from 16:00 New York time, about 20 hours later. The rate that is closest in time to the US close of day D is therefore the value dated the next day. Example: the lira gained strongly on the evening of December 20, 2021, but the row of December 20 still has 16.61; the new level, 13.48, is in the row of December 21. Phase 3 must take this into account when it values US holdings.
- In Phase 2 the exchange rate is used only for valuing. It is not a signal: the signals of an instrument are computed from its own prices in its own currency.

## 9. Sources for the market rules

- US settlement cycle (T+1 from May 28, 2024): U.S. Securities and Exchange Commission, press release 2024-62, https://www.sec.gov/news/press-release/2024-62
- US trading hours and exchanges: the `meta` part of Yahoo's answer for each ETF (read by `scripts/describe_data.py`).
- Borsa Istanbul trading hours: Borsa Istanbul announcement "Trading Session Hours Change", https://borsaistanbul.com/en/announcement/13376/borsa-istanbul-trading-session-hours-change . Settlement on the second business day is the rule of its Equity Market.
- Turkish funds (ISIN code, risk value; for the mutual funds also order hours and settlement days): the fund profile on TEFAS, read by `scripts/describe_data.py`. The order rule of each fund is in its documents on KAP (link in `instruments.csv`).

These rules can change. They should be checked again before the competition starts.
