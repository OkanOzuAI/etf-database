import { CartesianGrid, Line, LineChart, Tooltip, XAxis, YAxis } from "recharts";
import { formatDate, formatDollar } from "@/lib/format";
import { rebasePortfolios } from "@/lib/range";
import type { DailyRow, Params } from "@/lib/types";
import Card from "./Card";
import { dateTicks, DollarTooltip, Legend, roundTicks } from "./ChartParts";
import type { LineSeries } from "./ChartParts";

// ---- Series ----
// Buy & Hold has the colour of the price line in the price chart (it is the symbol itself).
const SERIES: LineSeries[] = [
  { key: "strategy", label: "Strategy", color: "var(--series-2)" },
  { key: "buy_hold", label: "Buy & Hold", color: "var(--series-1)" },
];

type Props = {
  rows: DailyRow[]; // daily rows of the selected range
  params: Params;
};

// Portfolio value chart: the strategy and Buy & Hold in one chart, on one dollar axis.
export default function EquityChart({ rows, params }: Props) {
  // Both portfolios start again with the starting capital on the first day of the range.
  const data = rebasePortfolios(rows, params.initial_capital);

  // ---- Axis ticks: the y axis covers both portfolios ----
  const valueTicks = roundTicks(data.flatMap((row) => [row.strategy, row.buy_hold]));
  const xAxis = dateTicks(data.map((row) => row.date));

  return (
    <Card
      title="Portfolio value: Strategy and Buy & Hold"
      description={`Both portfolios are rebased to ${formatDollar(params.initial_capital, 0)} on ${formatDate(rows[0].date)}, the first day of the selected range. For the full period this is the original backtest.`}
    >
      <Legend items={SERIES} />

      <LineChart
        responsive
        aria-label="Portfolio value chart: Strategy and Buy & Hold"
        className="h-72 w-full text-xs tabular-nums sm:h-96"
        data={data}
        margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
      >
        {/* ---- Grid and axes ---- */}
        <CartesianGrid vertical={false} stroke="var(--grid)" />
        <XAxis
          dataKey="date"
          ticks={xAxis.ticks}
          tickFormatter={xAxis.format}
          tick={{ fill: "var(--ink-2)" }}
          tickLine={false}
          axisLine={{ stroke: "var(--axis)" }}
        />
        <YAxis
          width="auto"
          ticks={valueTicks}
          domain={[valueTicks[0], valueTicks[valueTicks.length - 1]]}
          tickFormatter={(value: number) => formatDollar(value, 0)}
          tick={{ fill: "var(--ink-2)" }}
          tickLine={false}
          axisLine={false}
        />

        {/* ---- Tooltip: the value of both portfolios on the chosen day ---- */}
        <Tooltip
          isAnimationActive={false}
          cursor={{ stroke: "var(--axis)" }}
          content={({ active, payload }) =>
            active && payload.length > 0 ? <DollarTooltip row={payload[0].payload} series={SERIES} /> : null
          }
        />

        {/* ---- Lines: 2 px, no dots, no animation ---- */}
        {SERIES.map((item) => (
          <Line
            key={item.key}
            dataKey={item.key}
            stroke={item.color}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, stroke: "var(--surface)", strokeWidth: 2 }}
            isAnimationActive={false}
          />
        ))}
      </LineChart>
    </Card>
  );
}
