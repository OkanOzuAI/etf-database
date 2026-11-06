import { CartesianGrid, Line, LineChart, Tooltip, XAxis, YAxis } from "recharts";
import { formatDate, formatMoney } from "@/lib/format";
import Card from "./Card";
import { dateTicks, Legend, roundTicks, TooltipBox } from "./ChartParts";

// One portfolio in the chart: its name in validation.json, its label and its colour
export type Series = {
  key: string;
  label: string;
  color: string;
};

type Props = {
  values: Record<string, Record<string, number>>; // weekly value of each portfolio: name -> date -> lira
  series: Series[];
  capital: number; // starting capital (lira)
};

// One row of the chart: a Friday and the value of every portfolio on that day
type Row = { date: string } & Record<string, number | string>;

// Line chart: the value of the strategy and of the benchmarks after costs, one point per week.
export default function ValueChart({ values, series, capital }: Props) {
  // ---- Rows: the dates of the first portfolio; the other portfolios have the same dates ----
  const dates = Object.keys(values[series[0].key]);
  const rows: Row[] = dates.map((date) => {
    const row: Row = { date };
    for (const item of series) row[item.key] = values[item.key][date];
    return row;
  });

  // ---- Axis ticks ----
  const valueTicks = roundTicks(rows.flatMap((row) => series.map((item) => Number(row[item.key]))));
  const xAxis = dateTicks(dates);

  return (
    <Card
      title={`Value of ${formatMoney(capital, "TRY", 0)}`}
      description="Value of each portfolio after all costs, in Turkish lira, at the end of every week. All three start with the same capital on the same day."
    >
      <Legend items={series.map((item) => ({ label: item.label, color: item.color }))} />

      <LineChart
        responsive
        aria-label="Value of the strategy and of the two benchmarks over time"
        className="h-64 w-full text-xs tabular-nums sm:h-80"
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
          ticks={valueTicks}
          domain={[valueTicks[0], valueTicks[valueTicks.length - 1]]}
          tickFormatter={(value: number) => formatMoney(value, "TRY", 0)}
          tick={{ fill: "var(--ink-2)" }}
          tickLine={false}
          axisLine={false}
        />

        {/* ---- Tooltip: the vertical line finds the nearest week, the box lists every portfolio ---- */}
        <Tooltip
          isAnimationActive={false}
          cursor={{ stroke: "var(--axis)" }}
          content={({ active, payload }) => {
            if (!active || payload.length === 0) return null;
            const row: Row = payload[0].payload;
            return (
              <TooltipBox
                title={`Week ending ${formatDate(row.date)}`}
                rows={series.map((item) => ({
                  label: item.label,
                  color: item.color,
                  value: formatMoney(Number(row[item.key]), "TRY", 0),
                }))}
              />
            );
          }}
        />

        {/* ---- Lines: 2 px, no dots, no animation ---- */}
        {series.map((item) => (
          <Line
            key={item.key}
            dataKey={item.key}
            name={item.label}
            stroke={item.color}
            strokeWidth={2}
            strokeLinejoin="round"
            dot={false}
            activeDot={{ r: 4, stroke: "var(--surface)", strokeWidth: 2 }}
            isAnimationActive={false}
          />
        ))}
      </LineChart>
    </Card>
  );
}
