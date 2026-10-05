import { CartesianGrid, Line, LineChart, ReferenceDot, Tooltip, XAxis, YAxis } from "recharts";
import { formatDate, formatDollar } from "@/lib/format";
import type { DailyRow, Params, Signal } from "@/lib/types";
import Card from "./Card";
import { dateTicks, DollarTooltip, Legend, roundTicks, trianglePath } from "./ChartParts";
import type { LineSeries } from "./ChartParts";

type Props = {
  symbol: string;
  rows: DailyRow[]; // daily rows of the selected range
  signals: Signal[]; // every day the signal changed (full period)
  params: Params;
};

// Price chart: adjusted close, the two moving averages and the buy / sell markers.
export default function PriceChart({ symbol, rows, signals, params }: Props) {
  // ---- Series (the lines, the legend and the tooltip use the same list) ----
  const series: LineSeries[] = [
    { key: "price", label: "Price", color: "var(--series-1)" },
    { key: "sma_short", label: `SMA${params.sma_short}`, color: "var(--series-2)" },
    { key: "sma_long", label: `SMA${params.sma_long}`, color: "var(--series-3)" },
  ];

  // ---- Axis ticks ----
  // The y axis covers the price and both averages (an average does not exist on the first days).
  const values = rows.flatMap((row) => [row.price, row.sma_short ?? row.price, row.sma_long ?? row.price]);
  const priceTicks = roundTicks(values);
  const xAxis = dateTicks(rows.map((row) => row.date));

  // ---- Markers: only the signals inside the selected range ----
  const firstDay = rows[0].date;
  const lastDay = rows[rows.length - 1].date;
  const shownSignals = signals.filter((signal) => signal.date >= firstDay && signal.date <= lastDay);

  return (
    <Card
      title="Price and moving averages"
      description={`Adjusted close of ${symbol} with its ${params.sma_short}-day and ${params.sma_long}-day moving averages. The triangles mark the days the signal changed.`}
    >
      <Legend
        items={[
          ...series,
          { label: "Buy", color: "var(--good)", shape: "up" },
          { label: "Sell", color: "var(--critical)", shape: "down" },
        ]}
      />

      <LineChart
        responsive
        aria-label={`Price chart of ${symbol} with moving averages`}
        className="h-72 w-full text-xs tabular-nums sm:h-96"
        data={rows}
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
          ticks={priceTicks}
          domain={[priceTicks[0], priceTicks[priceTicks.length - 1]]}
          tickFormatter={(value: number) => formatDollar(value, 0)}
          tick={{ fill: "var(--ink-2)" }}
          tickLine={false}
          axisLine={false}
        />

        {/* ---- Tooltip: the vertical line finds the nearest day, the box lists all its series ---- */}
        <Tooltip
          isAnimationActive={false}
          cursor={{ stroke: "var(--axis)" }}
          content={({ active, payload }) =>
            active && payload.length > 0 ? <DollarTooltip row={payload[0].payload} series={series} /> : null
          }
        />

        {/* ---- Lines: 2 px, no dots, no animation ---- */}
        {series.map((item) => (
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

        {/* ---- Buy / sell markers: placed at the date and the price of the signal ---- */}
        {shownSignals.map((signal) => {
          const isBuy = signal.type === "BUY";
          // Buy: green triangle pointing up. Sell: red triangle pointing down. A 2 px ring in
          // the background colour keeps the triangle readable on top of the lines. The <title>
          // shows the type, date and price when the pointer rests on the triangle.
          return (
            <ReferenceDot
              key={signal.date}
              x={signal.date}
              y={signal.price}
              shape={({ cx = 0, cy = 0 }) => (
                <path
                  d={trianglePath(cx, cy, 6, isBuy)}
                  fill={isBuy ? "var(--good)" : "var(--critical)"}
                  stroke="var(--surface)"
                  strokeWidth={2}
                  strokeLinejoin="round"
                >
                  <title>{`${isBuy ? "Buy" : "Sell"} · ${formatDate(signal.date)} · ${formatDollar(signal.price)}`}</title>
                </path>
              )}
            />
          );
        })}
      </LineChart>
    </Card>
  );
}
