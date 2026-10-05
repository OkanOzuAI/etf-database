import { formatDate, formatDollar, formatNumber, formatPercent } from "@/lib/format";
import type { Metrics, Params, SymbolSummary } from "@/lib/types";
import Card from "./Card";
import { HeadCell, RowHead, Table } from "./TableParts";

// Which value is better in a row?
// "high": the larger one, "low": the smaller one, "zero": the one closer to zero, "none": no comparison
type Better = "high" | "low" | "zero" | "none";

type Row = {
  key: keyof Metrics;
  label: string;
  format: (value: number) => string;
  better: Better;
};

// ---- The rows of the table ----
// Returns and profit are changes, so they are written with a plus or minus sign.
const ROWS: Row[] = [
  { key: "final_value", label: "Final value", format: (v) => formatDollar(v), better: "high" },
  { key: "total_return_pct", label: "Total return", format: (v) => formatPercent(v, 2, true), better: "high" },
  { key: "profit", label: "Profit", format: (v) => formatDollar(v, 2, true), better: "high" },
  { key: "cagr_pct", label: "CAGR (yearly growth rate)", format: (v) => formatPercent(v, 2, true), better: "high" },
  { key: "volatility_pct", label: "Volatility (yearly)", format: (v) => formatPercent(v), better: "low" },
  { key: "sharpe", label: "Sharpe ratio", format: (v) => formatNumber(v), better: "high" },
  { key: "max_drawdown_pct", label: "Max drawdown", format: (v) => formatPercent(v), better: "zero" },
  { key: "trades", label: "Trades", format: (v) => formatNumber(v, 0), better: "none" },
];

// Is value a better than value b? For equal values the answer is false for both (no winner).
function isBetter(a: number, b: number, better: Better): boolean {
  if (better === "high") return a > b;
  if (better === "low") return a < b;
  if (better === "zero") return Math.abs(a) < Math.abs(b);
  return false;
}

// One value cell. The better value is marked with bold text and a check mark, not by
// colour alone; the text "(better)" is added for screen readers.
function MetricCell({ text, wins }: { text: string; wins: boolean }) {
  return (
    <td className={`px-2.5 py-2.5 text-right whitespace-nowrap ${wins ? "bg-good/10 font-semibold" : ""}`}>
      {wins && <span aria-hidden="true">✓ </span>}
      {text}
      {wins && <span className="sr-only"> (better)</span>}
    </td>
  );
}

type Props = {
  info: SymbolSummary;
  params: Params;
};

// Metrics table: the strategy and Buy & Hold side by side, for the full period.
export default function MetricsTable({ info, params }: Props) {
  return (
    <Card
      title="Metrics, full period"
      description={`${info.symbol} from ${formatDate(info.start)} to ${formatDate(info.end)}, starting with ${formatDollar(params.initial_capital, 0)}. The date range does not change this table.`}
    >
      <Table>
        <thead>
          <tr className="border-b border-line">
            <HeadCell left>Metric</HeadCell>
            <HeadCell>Strategy</HeadCell>
            <HeadCell>Buy &amp; Hold</HeadCell>
          </tr>
        </thead>
        <tbody>
          {ROWS.map((row) => {
            const strategyValue = info.strategy[row.key];
            const buyHoldValue = info.buy_hold[row.key];
            return (
              <tr key={row.key} className="border-b border-line">
                <RowHead>{row.label}</RowHead>
                <MetricCell text={row.format(strategyValue)} wins={isBetter(strategyValue, buyHoldValue, row.better)} />
                <MetricCell text={row.format(buyHoldValue)} wins={isBetter(buyHoldValue, strategyValue, row.better)} />
              </tr>
            );
          })}
        </tbody>
      </Table>
      <p className="mt-3 text-sm text-ink-2">
        ✓ and bold text mark the better value in a row (lower volatility, a max drawdown closer to zero). Equal
        values and the number of trades get no mark.
      </p>
    </Card>
  );
}
