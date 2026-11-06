// Types of the JSON files under public/data, plus a few small types used by the page.
// Field names are the same as in the JSON written by the Python side (scripts/backtest.py
// and scripts/portfolio.py). Money values are in the currency of the fund (USD or TRY).

// ---- summary.json ----

// Performance metrics of one portfolio (the strategy or Buy & Hold)
export type Metrics = {
  final_value: number; // last portfolio value
  profit: number; // profit
  total_return_pct: number; // total return (%)
  cagr_pct: number; // compound annual growth rate (%)
  volatility_pct: number; // yearly volatility (%)
  sharpe: number; // Sharpe ratio
  max_drawdown_pct: number; // max drawdown (%, a negative number)
  trades: number; // number of trades
};

// Settings of the pipeline (scripts/config.py)
export type Params = {
  years: number; // years of data from Yahoo (US ETFs)
  tefas_months: number; // months of data from TEFAS (Turkish funds)
  sma_short: number; // short moving average (days)
  sma_long: number; // long moving average (days)
  commission: number; // a rate: 0.001 = 0.1%
  initial_capital: number; // starting capital, in the currency of the fund
};

// What the SMA rule says after the last close
export type SignalLabel = "BUY" | "HOLD" | "SELL" | "WAIT";

// Look-back windows of the trailing returns ("1M" = the last month, "ALL" = the whole data)
export type TrailingKey = "1D" | "1M" | "3M" | "6M" | "YTD" | "1Y" | "3Y" | "5Y" | "ALL";

export type SymbolSummary = {
  symbol: string; // "SPY"
  name: string; // "S&P 500"
  group: string; // "US index ETFs"
  type: "ETF" | "Mutual fund"; // traded on an exchange, or bought and sold through TEFAS
  market: string; // "United States" or "Türkiye"
  currency: string; // "USD" or "TRY"
  start: string; // first data day, "2016-10-05"
  end: string; // last data day
  rows: number; // number of trading days
  last_price: number; // last adjusted close
  recommendation: SignalLabel;
  signal_since: string; // the day the signal last changed
  // Price return (%) over each look-back window. A window is missing if the data is shorter than it.
  trailing: Partial<Record<TrailingKey, number>>;
  strategy: Metrics;
  buy_hold: Metrics;
};

export type Summary = {
  updated_at: string; // when the pipeline last ran (UTC, ISO 8601)
  params: Params;
  symbols: SymbolSummary[];
};

// ---- <SYMBOL>.json ----

// One trading day: price, moving averages and the value of the two portfolios
export type DailyRow = {
  date: string; // "2016-10-05"
  price: number; // adjusted close
  sma_short: number | null; // null until the average exists
  sma_long: number | null;
  strategy: number; // value of the strategy portfolio
  buy_hold: number; // value of the Buy & Hold portfolio
};

// A day the signal changed
export type Signal = {
  date: string;
  type: "BUY" | "SELL";
  price: number;
};

// Percent return of one period
export type ReturnPoint = {
  date: string; // daily and weekly: "2016-10-07", monthly: "2016-10", yearly: "2016"
  value: number; // percent: 0.07 = 0.07%
};

export type Period = "daily" | "weekly" | "monthly" | "yearly";

export type SymbolData = {
  symbol: string;
  daily: DailyRow[];
  signals: Signal[];
  returns: Record<Period, ReturnPoint[]>; // price returns of the symbol
  strategy_yearly: ReturnPoint[]; // returns of the strategy per calendar year
};

// The <SYMBOL>.json files that are already in memory, by symbol
export type SymbolFiles = Partial<Record<string, SymbolData>>;

// ---- portfolio.json ----

// One fund in the weekly portfolio decision
export type Holding = {
  symbol: string;
  name: string;
  type: "ETF" | "Mutual fund";
  market: string; // "United States" or "Türkiye"
  currency: string; // "USD" or "TRY"
  weight: number; // target weight (%)
  change: number; // difference from the weight of the week before (percentage points)
  uptrend: boolean; // is the short moving average above the long one?
  volatility: number; // yearly volatility (%)
};

// Shares of the portfolio per market and in cash (%). The keys are "Türkiye", "United States" and "CASH".
export type MarketTotals = Record<string, number>;

// One weekly decision in the history
export type PortfolioWeek = {
  date: string; // decision day (a Friday)
  totals: MarketTotals;
  weights: Record<string, number>; // weight of every fund and of "CASH" (%)
};

export type Portfolio = {
  updated_at: string; // when the pipeline last ran (UTC, ISO 8601)
  version: string; // version of the algorithm
  decision_day: string; // the last decision day
  data_until: Record<string, string>; // last day with a price in each market
  report_currency: string; // "TRY"
  usdtry: number; // lira per US dollar on the decision day
  settings: {
    sma_short: number;
    sma_long: number;
    vol_window: number; // days of returns used for the volatility
    vol_floor: number; // a rate: 0.1 = 10%
    max_weight: number; // a rate: largest weight of one fund
    min_market_weight: number; // a rate: smallest total weight of one market
  };
  holdings: Holding[]; // every fund, also the ones with a weight of 0
  cash: number; // cash weight (%)
  totals: MarketTotals;
  history: PortfolioWeek[];
};

// ---- validation.json (Phase 3, written by scripts/validation.py) ----

// Results of one simulated portfolio. Values in lira, returns and shares in percent.
export type ValidationMetrics = {
  start: string; // first day with a value (the first order day)
  end: string; // last day with a value
  final_value: number;
  total_return_pct: number;
  cagr_pct: number; // yearly return
  volatility_pct: number; // yearly volatility
  sharpe: number; // Sharpe ratio with a risk-free rate of 0
  max_drawdown_pct: number; // largest fall from a previous high (negative)
  total_return_usd_pct: number; // the same portfolio counted in US dollars
  turnover_per_year: number; // value traded per year / average value
  costs: number; // commission and exchange costs paid (lira)
  average_share_pct: MarketTotals; // share of each market and of cash, average of all days
  last_share_pct: MarketTotals; // the same on the last day
};

// One step of the rolling validation
export type ValidationFold = {
  train: [string, string]; // first and last decision day used to choose the setting
  test: [string, string]; // first and last decision day of the test window
  chosen: string; // the setting chosen on the training window
  train_sharpe: number;
  default_train_sharpe: number;
  returns_pct: Record<string, number>; // return of every portfolio in the test window
};

// One row of the sensitivity table: a setting and the results of the strategy with it
export type SensitivityRow = ValidationMetrics & {
  setting: string;
  default: boolean; // true for the setting in config.py
};

export type Validation = {
  updated_at: string;
  version: string;
  assumptions: {
    initial_capital: number;
    report_currency: string;
    commission: number; // a rate: 0.001 = 0.1%
    fx_cost: number; // a rate, on every trade of a US ETF
    train_weeks: number;
    test_weeks: number;
  };
  whole_period: Record<string, ValidationMetrics>; // "Strategy" and the two benchmarks
  whole_period_values: Record<string, Record<string, number>>; // weekly value of each portfolio: date -> lira
  rolling: {
    folds: ValidationFold[];
    metrics: Record<string, ValidationMetrics>; // all test windows together
  };
  sensitivity: SensitivityRow[];
  money_market: { symbol: string; name: string; start: string; end: string; total_return_pct: number };
  checks: {
    buy_and_hold_formula_difference: number; // lira
    future_data_difference: number; // lira
  };
};

// ---- Page ----

// The six views of the page
export type View = "portfolio" | "validation" | "overview" | "compare" | "details" | "method";

// Which portfolio the Compare view shows. The names are also the field names in the JSON.
export type Mode = "buy_hold" | "strategy";

// A date range picked by the visitor, as "YYYY-MM-DD" texts.
// Dates in this format can be compared as plain text: "2020-01-31" < "2020-02-01".
export type DateRange = {
  from: string;
  to: string;
};

// One symbol picked in the Compare view
export type PickedSymbol = {
  info: SymbolSummary; // its row in summary.json
  data: SymbolData; // its <SYMBOL>.json file
  color: string; // CSS colour of its line, bars and colour keys
  rows: DailyRow[]; // its daily rows inside the selected range
};
