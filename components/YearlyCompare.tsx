import { Bar, BarChart, CartesianGrid, ReferenceLine, Tooltip, XAxis, YAxis } from "recharts";
import { formatDate, formatPercent } from "@/lib/format";
import type { DateRange, Mode, PickedSymbol } from "@/lib/types";
import Card from "./Card";
import { Legend, roundTicks, TooltipBox } from "./ChartParts";
import { ColorKey, HeadCell, PercentCell, RowHead, Table } from "./TableParts";

// One row of the chart and of the table: a year and the return of every picked symbol
type YearRow = {
  year: string;
  values: Record<string, number>; // symbol -> return of that year (%)
};

type Props = {
  picked: PickedSymbol[];
  mode: Mode;
  dataRange: DateRange; // first and last day of the data
};

// Calendar-year returns of the picked symbols: a grouped bar chart and the same numbers as a table.
export default function YearlyCompare({ picked, mode, dataRange }: Props) {
  // ---- Rows: one per year ----
  const byYear = new Map<string, YearRow>();
  for (const item of picked) {
    // Buy & Hold mode: price returns of the symbol. SMA strategy mode: returns of the strategy.
    const points = mode === "strategy" ? item.data.strategy_yearly : item.data.returns.yearly;
    for (const point of points) {
      const row = byYear.get(point.date) ?? { year: point.date, values: {} };
      row.values[item.info.symbol] = point.value;
      byYear.set(point.date, row);
    }
  }
  const rows = [...byYear.values()].sort((a, b) => a.year.localeCompare(b.year));

  // The first and the last year are not full years, so they are marked with an asterisk (*).
  const partialYears = [dataRange.from.slice(0, 4), dataRange.to.slice(0, 4)];
  const yearLabel = (year: string) => (partialYears.includes(year) ? `${year}*` : year);

  // The bars start at zero, so zero must always be on the y axis.
  const percentTicks = roundTicks([0, ...rows.flatMap((row) => Object.values(row.values))]);

  return (
    <Card
      title="Calendar-year returns"
      description={
        mode === "strategy"
          ? "Return of the SMA strategy on each symbol in every calendar year. Full period: the date range does not change this section."
          : "Price return of each symbol in every calendar year. Full period: the date range does not change this section."
      }
    >
      <Legend items={picked.map((item) => ({ label: item.info.symbol, color: item.color, shape: "bar" }))} />

      <BarChart
        responsive
        aria-label="Calendar-year returns of the picked symbols"
        className="h-72 w-full text-xs tabular-nums sm:h-80"
        data={rows}
        margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
        barGap={2}
        barCategoryGap="20%"
      >
        {/* ---- Grid and axes ---- */}
        <CartesianGrid vertical={false} stroke="var(--grid)" />
        <XAxis
          dataKey="year"
          tickFormatter={yearLabel}
          tick={{ fill: "var(--ink-2)" }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          width="auto"
          ticks={percentTicks}
          domain={[percentTicks[0], percentTicks[percentTicks.length - 1]]}
          tickFormatter={(value: number) => formatPercent(value, 0)}
          tick={{ fill: "var(--ink-2)" }}
          tickLine={false}
          axisLine={false}
        />
        {/* Zero line: the bars grow up or down from here. */}
        <ReferenceLine y={0} stroke="var(--axis)" />

        {/* ---- Tooltip: every symbol's return in the year under the pointer ---- */}
        <Tooltip
          isAnimationActive={false}
          cursor={{ fill: "var(--grid)" }}
          content={({ active, payload }) => {
            if (!active || payload.length === 0) return null;
            const row: YearRow = payload[0].payload;
            return (
              <TooltipBox
                title={yearLabel(row.year)}
                rows={picked
                  .filter((item) => item.info.symbol in row.values) // skip a symbol with no data in this year
                  .map((item) => ({
                    label: item.info.symbol,
                    value: formatPercent(row.values[item.info.symbol], 2, true),
                    color: item.color,
                  }))}
              />
            );
          }}
        />

        {/* ---- Bars: one per symbol in every year, at most 24 px thick, rounded at the data end ---- */}
        {picked.map((item) => (
          <Bar
            key={item.info.symbol}
            name={item.info.symbol}
            dataKey={(row: YearRow) => row.values[item.info.symbol]}
            fill={item.color}
            maxBarSize={24}
            radius={[4, 4, 0, 0]}
            isAnimationActive={false}
          />
        ))}
      </BarChart>

      {/* ---- The same numbers as a table ---- */}
      <div className="mt-4">
        <Table>
          <thead>
            <tr className="border-b border-line">
              <HeadCell left>Year</HeadCell>
              {picked.map((item) => (
                <HeadCell key={item.info.symbol}>
                  <span className="inline-flex items-center gap-1.5">
                    <ColorKey color={item.color} />
                    {item.info.symbol}
                  </span>
                </HeadCell>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.year} className="border-b border-line">
                <RowHead>{yearLabel(row.year)}</RowHead>
                {picked.map((item) => (
                  <PercentCell key={item.info.symbol} value={row.values[item.info.symbol]} />
                ))}
              </tr>
            ))}
          </tbody>
        </Table>
      </div>
      <p className="mt-3 text-sm text-ink-2">
        * Not a full year: the data starts on {formatDate(dataRange.from)} and ends on {formatDate(dataRange.to)}. For a symbol
        that was listed later, its first year is not a full year either.
      </p>
    </Card>
  );
}
