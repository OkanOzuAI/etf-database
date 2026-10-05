// Types of the JSON files under public/data, plus a few small types used by the page.
// Field names are the same as in the JSON written by the Python side (scripts/backtest.py).

// ---- summary.json ----

// Performance metrics of one portfolio (the strategy or Buy & Hold)
export type Metrics = {
  final_value: number; // last portfolio value ($)
  profit: number; // profit ($)
  total_return_pct: number; // total return (%)
  cagr_pct: number; // compound annual growth rate (%)
  volatility_pct: number; // yearly volatility (%)
  sharpe: number; // Sharpe ratio
  max_drawdown_pct: number; // max drawdown (%, a negative number)
  trades: number; // number of trades
};

// Settings of the pipeline (scripts/config.py)
export type Params = {
  years: number; // years of data
  sma_short: number; // short moving average (days)
  sma_long: number; // long moving average (days)
  commission: number; // a rate: 0.001 = 0.1%
  initial_capital: number; // starting capital ($)
};

// What the SMA rule says after the last close
export type SignalLabel = "BUY" | "HOLD" | "SELL" | "WAIT";

// Look-back windows of the trailing returns ("1M" = the last month, "ALL" = the whole data)
export type TrailingKey = "1D" | "1M" | "3M" | "6M" | "YTD" | "1Y" | "3Y" | "5Y" | "ALL";

export type SymbolSummary = {
  symbol: string; // "SPY"
  name: string; // "S&P 500"
  group: string; // "US index ETFs"
  start: string; // first data day, "2016-10-05"
  end: string; // last data day
  rows: number; // number of trading days
  last_price: number; // last adjusted close ($)
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
  price: number; // adjusted close ($)
  sma_short: number | null; // null until the average exists
  sma_long: number | null;
  strategy: number; // value of the strategy portfolio ($)
  buy_hold: number; // value of the Buy & Hold portfolio ($)
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

// ---- Page ----

// The four views of the page
export type View = "overview" | "compare" | "details" | "method";

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
