import type { ReactNode } from "react";
import { formatDate, formatDateTime, formatMoney, formatNumber, formatPercent, formatRate } from "@/lib/format";
import type { SensitivityRow, Validation, ValidationMetrics } from "@/lib/types";
import Card from "./Card";
import StatTile from "./StatTile";
import { ColorKey, HeadCell, PercentCell, RowHead, Table, ValueCell } from "./TableParts";
import ValueChart from "./ValueChart";

const DOCS_URL = "https://github.com/OkanOzuAI/etf-database/blob/main/docs";

// ---- The portfolios, with their names in validation.json ----
// "short" is the column header in the tables. The colours are the same as in the other
// views: the strategy is orange and buy and hold is blue.
type Column = { key: string; label: string; short: string; color: string };
const STRATEGY: Column = { key: "Strategy", label: "Strategy", short: "Strategy", color: "var(--series-2)" };
const WEEKLY: Column = {
  key: "Equal weights, weekly",
  label: "Equal weights, rebalanced weekly",
  short: "Equal, weekly",
  color: "var(--series-3)",
};
const HOLD: Column = {
  key: "Equal weights, buy and hold",
  label: "Equal weights, buy and hold",
  short: "Buy and hold",
  color: "var(--series-1)",
};
const PORTFOLIOS = [STRATEGY, WEEKLY, HOLD];
// In the rolling validation "Strategy" is the walk-forward strategy; the fixed setting is a fourth portfolio.
const ROLLING: Column[] = [
  { ...STRATEGY, label: "Walk-forward strategy", short: "Walk-forward" },
  { key: "Strategy, fixed setting", label: "Strategy, fixed setting", short: "Fixed setting", color: "var(--series-4)" },
  WEEKLY,
  HOLD,
];

// ---- Rows of the result tables ----
type Measure = { label: string; show: (metrics: ValidationMetrics) => string };
const RETURN_ROWS: Measure[] = [
  { label: "Final value", show: (m) => formatMoney(m.final_value, "TRY", 0) },
  { label: "Total return", show: (m) => formatPercent(m.total_return_pct) },
  { label: "Yearly return (CAGR)", show: (m) => formatPercent(m.cagr_pct) },
  { label: "Yearly volatility", show: (m) => formatPercent(m.volatility_pct) },
  { label: "Sharpe ratio (risk-free rate 0)", show: (m) => formatNumber(m.sharpe) },
  { label: "Maximum drawdown", show: (m) => formatPercent(m.max_drawdown_pct) },
  { label: "Total return in US dollars", show: (m) => formatPercent(m.total_return_usd_pct) },
  { label: "Turnover per year", show: (m) => `${formatNumber(m.turnover_per_year)}×` },
  { label: "Costs paid", show: (m) => formatMoney(m.costs, "TRY", 0) },
];
const SHARE_ROWS: Measure[] = [
  { label: "Türkiye, on average", show: (m) => formatPercent(m.average_share_pct["Türkiye"]) },
  { label: "United States, on average", show: (m) => formatPercent(m.average_share_pct["United States"]) },
  { label: "Türkiye, last day", show: (m) => formatPercent(m.last_share_pct["Türkiye"]) },
  { label: "United States, last day", show: (m) => formatPercent(m.last_share_pct["United States"]) },
];

// Columns of the sensitivity table that a phone has no room for
const WIDE_ONLY = "hidden md:table-cell";
const HEAD = "px-2.5 py-2 text-xs font-medium whitespace-nowrap text-ink-2 text-right";

// "once", "2 times", ...
function times(count: number): string {
  return count === 1 ? "once" : `${count} times`;
}

// A difference found by a check, in lira
function difference(value: number): string {
  return value < 0.000001 ? "less than ₺0.000001" : formatMoney(value, "TRY", 6);
}

// Validation view (Phase 3): the strategy against two benchmarks, the rolling validation,
// the parameter sensitivity and the checks. All numbers come from validation.json.
export default function ValidationView({ validation }: { validation: Validation }) {
  const { assumptions, whole_period: whole, rolling, sensitivity, money_market: moneyMarket, checks } = validation;
  const strategy = whole[STRATEGY.key];
  const weekly = whole[WEEKLY.key];
  const hold = whole[HOLD.key];
  const capital = formatMoney(assumptions.initial_capital, "TRY", 0);

  // ---- What the whole period shows. The sentences are made from the numbers, so they stay
  //      true when the data is updated. ----
  const best = Math.max(weekly.total_return_pct, hold.total_return_pct);
  const worst = Math.min(weekly.total_return_pct, hold.total_return_pct);
  const returns = `${formatPercent(strategy.total_return_pct)} against ${formatPercent(weekly.total_return_pct)} and ${formatPercent(hold.total_return_pct)}`;
  let returnText = `Its total return was between the two benchmarks: ${returns}.`;
  if (strategy.total_return_pct < worst) returnText = `It earned less than both benchmarks: ${returns}.`;
  if (strategy.total_return_pct > best) returnText = `It earned more than both benchmarks: ${returns}.`;

  const calmer =
    strategy.volatility_pct < Math.min(weekly.volatility_pct, hold.volatility_pct) &&
    strategy.max_drawdown_pct > Math.max(weekly.max_drawdown_pct, hold.max_drawdown_pct);
  const risk = `yearly volatility ${formatPercent(strategy.volatility_pct)} against ${formatPercent(weekly.volatility_pct)} and ${formatPercent(hold.volatility_pct)}, maximum drawdown ${formatPercent(strategy.max_drawdown_pct)} against ${formatPercent(weekly.max_drawdown_pct)} and ${formatPercent(hold.max_drawdown_pct)}`;
  const riskText = calmer
    ? `It was calmer than both benchmarks: ${risk}.`
    : `It was not calmer than both benchmarks: ${risk}.`;

  // A difference of less than one percentage point is counted as "about as much".
  const gap = moneyMarket.total_return_pct - strategy.total_return_pct;
  let comparedWith = "about as much as the strategy";
  if (gap >= 1) comparedWith = "more than the strategy";
  if (gap <= -1) comparedWith = "less than the strategy";
  const moneyMarketText = `The lira money market fund ${moneyMarket.symbol} alone returned ${formatPercent(moneyMarket.total_return_pct)} in the same period (without costs), ${comparedWith}. Lira interest rates were very high, so a Sharpe ratio with a risk-free rate of 0 makes every portfolio here look better than it is.`;

  // ---- What the rolling validation shows ----
  const walk = ROLLING[0].key;
  const fixed = ROLLING[1].key;
  const folds = rolling.folds;
  const bothAhead = folds.filter(
    (fold) => fold.returns_pct[WEEKLY.key] > fold.returns_pct[walk] && fold.returns_pct[HOLD.key] > fold.returns_pct[walk],
  ).length;
  const behindFixed = folds.filter((fold) => fold.returns_pct[walk] < fold.returns_pct[fixed]).length;
  const changes = folds.filter((fold, i) => i > 0 && fold.chosen !== folds[i - 1].chosen).length;

  // ---- What the sensitivity shows: the range of the nine settings of the rolling validation ----
  const grid = sensitivity.filter((row) => row.setting.startsWith("SMA"));
  const gridReturns = grid.map((row) => row.total_return_pct);
  const defaultRow = sensitivity.find((row) => row.default);
  const noCosts = sensitivity.find((row) => row.setting === "No costs");

  return (
    <div className="space-y-6">
      {/* ---- What this view is ---- */}
      <header>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-4xl">Historical validation against benchmarks</h1>
        <p className="mt-3 max-w-3xl text-ink-2 sm:text-lg">
          The weekly algorithm is tested on past prices with real trading rules and costs, and compared with two simple
          portfolios of the same 20 funds.
        </p>
        <p className="mt-3 max-w-3xl text-sm text-ink-2">
          These results are development and validation evidence, not an untouched final test: we have seen them and may
          improve the algorithm with them. The real-time competition tests it on prices that nobody has seen yet.
        </p>
        <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-2">
          <span>
            Period: {formatDate(strategy.start)} to {formatDate(strategy.end)}
          </span>
          <span>Starting capital: {capital}</span>
          <span>Last update: {formatDateTime(validation.updated_at)}</span>
        </p>
      </header>

      {/* ---- Total return of the three portfolios ---- */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {PORTFOLIOS.map((item) => (
          <StatTile
            key={item.key}
            label={item.label}
            color={item.color}
            value={formatPercent(whole[item.key].total_return_pct)}
            note={`total return in lira · volatility ${formatPercent(whole[item.key].volatility_pct)} · max drawdown ${formatPercent(whole[item.key].max_drawdown_pct)}`}
          />
        ))}
      </div>

      <ValueChart
        values={validation.whole_period_values}
        series={PORTFOLIOS.map((item) => ({ key: item.key, label: item.label, color: item.color }))}
        capital={assumptions.initial_capital}
      />

      {/* ---- Whole period: all numbers, and what they show ---- */}
      <Card
        title="Results over the whole period"
        description={`From ${formatDate(strategy.start)} to ${formatDate(strategy.end)}, after all costs. The market shares are shares of the portfolio value; the rest is cash, mostly money waiting for the settlement of a sale.`}
      >
        <MetricsTable columns={PORTFOLIOS} metrics={whole} measures={[...RETURN_ROWS, ...SHARE_ROWS]} />
        <Findings items={[riskText, returnText, moneyMarketText]} />
      </Card>

      {/* ---- Rolling validation ---- */}
      <Card
        title="Rolling validation"
        description={`The weeks are used in time order, never in a random split. On every step one of ${grid.length} settings (trend and volatility windows) is chosen with the results of the last ${assumptions.train_weeks} weeks, using only data published before the first test decision. It is then used for the next ${assumptions.test_weeks} weeks, and both windows move forward by ${assumptions.test_weeks} weeks. The test windows together form the walk-forward strategy.`}
      >
        <Table>
          <thead>
            <tr className="border-b border-line">
              <HeadCell left>Test window</HeadCell>
              <th scope="col" className={`${HEAD} ${WIDE_ONLY} text-left`}>
                Chosen setting
              </th>
              {ROLLING.map((item) => (
                <HeadCell key={item.key}>
                  <ColumnName item={item} />
                </HeadCell>
              ))}
            </tr>
          </thead>
          <tbody>
            {folds.map((fold) => (
              <tr key={fold.test[0]} className="border-b border-line last:border-b-0">
                <RowHead>
                  <span className="whitespace-nowrap">{formatDate(fold.test[0])}</span>
                  <span className="block text-xs whitespace-nowrap text-ink-2">to {formatDate(fold.test[1])}</span>
                </RowHead>
                <td className={`px-2.5 py-2.5 text-left whitespace-nowrap text-ink-2 ${WIDE_ONLY}`}>{fold.chosen}</td>
                {ROLLING.map((item) => (
                  <PercentCell key={item.key} value={fold.returns_pct[item.key]} />
                ))}
              </tr>
            ))}
          </tbody>
        </Table>

        <h3 className="mt-6 mb-2 text-sm font-semibold">All test windows together</h3>
        <MetricsTable columns={ROLLING} metrics={rolling.metrics} measures={RETURN_ROWS} />
        <Findings
          items={[
            `In ${bothAhead} of ${folds.length} test windows both benchmarks returned more than the walk-forward strategy.`,
            `The walk-forward strategy was behind the fixed setting of config.py in ${behindFixed} of ${folds.length} windows, and the chosen setting changed ${times(changes)}. ${
              behindFixed > folds.length / 2
                ? "Choosing the setting on the last weeks did not help in this period: the small differences between settings in training did not continue in the next window."
                : "Choosing the setting on the last weeks helped in this period."
            }`,
          ]}
        />
      </Card>

      {/* ---- Parameter sensitivity ---- */}
      <Card
        title="Parameter sensitivity"
        description="The strategy with other settings over the whole period, with the same start, capital and costs. The first rows are the settings of the rolling validation; then one setting at a time is changed, and finally the costs."
      >
        <SensitivityTable rows={sensitivity} />
        <Findings
          items={[
            `The trend and volatility windows change the total return only between ${formatPercent(Math.min(...gridReturns))} and ${formatPercent(Math.max(...gridReturns))}, so the result does not depend on one lucky setting.`,
            "The volatility floor decides how much of the portfolio goes to the calm lira funds: a lower floor gives them more weight, a higher floor gives the other funds more.",
            ...(defaultRow && noCosts
              ? [
                  `The costs took ${formatNumber(noCosts.total_return_pct - defaultRow.total_return_pct)} percentage points of total return (${formatPercent(noCosts.total_return_pct)} without costs, ${formatPercent(defaultRow.total_return_pct)} with them).`,
                ]
              : []),
          ]}
        />
      </Card>

      {/* ---- Rules of the simulation, checks and weaknesses ---- */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card title="How the portfolios are simulated">
          <List>
            <li>{`Starting capital ${capital}, reported in Turkish lira. A US ETF is valued with the first USD/TRY rate after the US close.`}</li>
            <li>
              {
                "A decision uses the prices up to Friday. The orders are given on the next day on which both markets are open and filled at that day's closing price, which is not known on Friday."
              }
            </li>
            <li>{"Sales come first. A purchase waits until the money of the sales has arrived (settlement days of every fund)."}</li>
            <li>{`Costs: ${formatRate(assumptions.commission)} commission on every trade, and ${formatRate(assumptions.fx_cost)} for changing lira into dollars or back on every US trade. Cash earns no interest; no borrowing, no short selling.`}</li>
            <li>
              {
                "Benchmarks: the same 20 funds with 1/20 each. \"Equal weights, rebalanced weekly\" goes back to 1/20 every week (50% Türkiye, 50% United States). \"Buy and hold\" is bought once and never traded again, so its weights drift with the prices."
              }
            </li>
          </List>
        </Card>

        <Card title="Checks">
          <List>
            <li>{`Buy-and-hold formula: the value of the buy-and-hold benchmark is computed again with a formula that can be checked by hand. Largest difference: ${difference(checks.buy_and_hold_formula_difference)}.`}</li>
            <li>{`No future data: everything is computed again as if the data had been downloaded on June 30, 2025. Largest difference in the values before that day: ${difference(checks.future_data_difference)}.`}</li>
            <li>{"Portfolio rules: every weekly decision of every setting follows the rules of the algorithm, and the simulation stops if cash would become negative."}</li>
          </List>
        </Card>
      </div>

      <Card title="Known weaknesses">
        <List>
          <li>{"1 / volatility gives the calm lira funds (money market, bonds) a large weight, so much of the low risk comes from the weighting and not from the trend signal."}</li>
          <li>{"The history is short: TEFAS gives five years of prices and the 200-day average needs almost one of them. All test windows come from one period in which the lira lost value quickly, so they are too few for a reliable statistical conclusion."}</li>
          <li>{"The trend signal reacts weeks after a market turns, and the weekly rebalancing makes many small trades."}</li>
          <li>{"The funds were chosen in 2026, among funds that still exist (selection bias)."}</li>
          <li>{"The execution is simplified: fractions of shares, closing prices as fill prices, the same commission for every fund."}</li>
          <li>
            {"The full discussion and ideas for improvement are in "}
            <a className="text-accent underline" href={`${DOCS_URL}/validation.md`}>
              validation.md
            </a>
            {"."}
          </li>
        </List>
      </Card>
    </div>
  );
}

// Column header with the colour key of the portfolio
function ColumnName({ item }: { item: Column }) {
  return (
    <span className="inline-flex items-center gap-1.5" title={item.label}>
      <ColorKey color={item.color} />
      {item.short}
    </span>
  );
}

// Table with one row per measure and one column per portfolio
function MetricsTable({
  columns,
  metrics,
  measures,
}: {
  columns: Column[];
  metrics: Record<string, ValidationMetrics>;
  measures: Measure[];
}) {
  return (
    <Table>
      <thead>
        <tr className="border-b border-line">
          <HeadCell left>
            <span className="sr-only">Measure</span>
          </HeadCell>
          {columns.map((item) => (
            <HeadCell key={item.key}>
              <ColumnName item={item} />
            </HeadCell>
          ))}
        </tr>
      </thead>
      <tbody>
        {measures.map((measure) => (
          <tr key={measure.label} className="border-b border-line last:border-b-0">
            <RowHead>{measure.label}</RowHead>
            {columns.map((item) => (
              <ValueCell key={item.key}>{measure.show(metrics[item.key])}</ValueCell>
            ))}
          </tr>
        ))}
      </tbody>
    </Table>
  );
}

// Sensitivity table: one row per setting. The setting of config.py is highlighted.
function SensitivityTable({ rows }: { rows: SensitivityRow[] }) {
  return (
    <Table>
      <thead>
        <tr className="border-b border-line">
          <HeadCell left>Setting</HeadCell>
          <HeadCell>Total return</HeadCell>
          <th scope="col" className={`${HEAD} ${WIDE_ONLY}`}>
            Volatility
          </th>
          <HeadCell>Sharpe</HeadCell>
          <HeadCell>Max drawdown</HeadCell>
          <th scope="col" className={`${HEAD} ${WIDE_ONLY}`}>
            In US dollars
          </th>
          <th scope="col" className={`${HEAD} ${WIDE_ONLY}`}>
            Turnover / year
          </th>
          <th scope="col" className={`${HEAD} ${WIDE_ONLY}`}>
            Türkiye on average
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr
            key={row.setting}
            className={`border-b border-line last:border-b-0 ${row.default ? "bg-accent-soft font-semibold" : ""}`}
          >
            <RowHead>
              {row.setting}
              {row.default && <span className="block text-xs font-normal text-ink-2">setting in config.py</span>}
            </RowHead>
            <ValueCell>{formatPercent(row.total_return_pct)}</ValueCell>
            <td className={`px-2.5 py-2.5 text-right whitespace-nowrap ${WIDE_ONLY}`}>{formatPercent(row.volatility_pct)}</td>
            <ValueCell>{formatNumber(row.sharpe)}</ValueCell>
            <ValueCell>{formatPercent(row.max_drawdown_pct)}</ValueCell>
            <td className={`px-2.5 py-2.5 text-right whitespace-nowrap ${WIDE_ONLY}`}>
              {formatPercent(row.total_return_usd_pct)}
            </td>
            <td className={`px-2.5 py-2.5 text-right whitespace-nowrap ${WIDE_ONLY}`}>
              {`${formatNumber(row.turnover_per_year)}×`}
            </td>
            <td className={`px-2.5 py-2.5 text-right whitespace-nowrap ${WIDE_ONLY}`}>
              {formatPercent(row.average_share_pct["Türkiye"])}
            </td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}

// "What this shows": short sentences under a table
function Findings({ items }: { items: string[] }) {
  return (
    <div className="mt-4 rounded-xl bg-track p-3 text-sm sm:p-4">
      <p className="mb-1 font-semibold">What this shows</p>
      <List>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </List>
    </div>
  );
}

// Bulleted list with the look of the other text lists of the site
function List({ children }: { children: ReactNode }) {
  return <ul className="list-disc space-y-2 pl-5 text-sm">{children}</ul>;
}
