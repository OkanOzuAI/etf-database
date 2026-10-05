import { useState } from "react";
import { Bar, BarChart, CartesianGrid, Rectangle, ReferenceLine, Tooltip, XAxis, YAxis } from "recharts";
import type { BarShapeProps } from "recharts";
import { formatDate, formatMonth, formatPercent } from "@/lib/format";
import { returnsInRange } from "@/lib/range";
import type { DailyRow, Period, ReturnPoint, SymbolData } from "@/lib/types";
import Card from "./Card";
import { dateTicks, roundTicks, TooltipBox } from "./ChartParts";
import Segmented from "./Segmented";

// ---- Tabs: their order and names ----
const PERIODS: Period[] = ["daily", "weekly", "monthly", "yearly"];
const LABELS: Record<Period, string> = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
  yearly: "Yearly",
};

// A gain is green, a loss is red.
function barColor(value: number): string {
  return value >= 0 ? "var(--good)" : "var(--critical)";
}

// Draws one bar. Recharts works out its place and size (x, y, width, height).
function ReturnBar(bar: BarShapeProps) {
  const point: ReturnPoint = bar.payload; // the data row of this bar
  // The data end is rounded: 4 px on a wide bar, a quarter of the width on a thin bar.
  const radius = Math.min(4, bar.width / 4);
  return (
    <Rectangle
      x={bar.x}
      y={bar.y}
      // The daily tab can have thousands of bars, each thinner than 1 pixel.
      // They are drawn at least 1 pixel wide so that they do not look faded.
      width={Math.max(bar.width, 1)}
      height={bar.height}
      radius={[radius, radius, 0, 0]}
      fill={barColor(point.value)}
    />
  );
}

// Title of the tooltip: the period of the bar.
function periodTitle(period: Period, date: string): string {
  if (period === "daily") return formatDate(date);
  if (period === "weekly") return `Week ending ${formatDate(date)}`; // the date is the Friday of the week
  if (period === "monthly") return formatMonth(date);
  return date; // yearly: "2016"
}

type Props = {
  symbol: string;
  returns: SymbolData["returns"]; // price returns of the full period
  rows: DailyRow[]; // daily rows of the selected range
};

// Period returns chart: a bar chart with the tabs Daily / Weekly / Monthly / Yearly.
export default function ReturnsChart({ symbol, returns, rows }: Props) {
  const [period, setPeriod] = useState<Period>("monthly"); // the "Monthly" tab is open at first
  const points = returnsInRange(returns[period], rows);

  // ---- Axis ticks ----
  // The bars start at zero, so zero must always be on the y axis.
  const percentTicks = roundTicks([0, ...points.map((point) => point.value)]);
  // The yearly tab writes the year under every bar; the other tabs use the date ticks.
  const xAxis = period === "yearly" ? null : dateTicks(points.map((point) => point.date));

  // On the daily and weekly tabs the bars are very thin, so a vertical line shows the bar
  // under the pointer. On the monthly and yearly tabs the area behind the bar is shaded.
  const dense = period === "daily" || period === "weekly";

  return (
    <Card
      title="Period returns"
      description={`Percent change of the ${symbol} price in each day, week, month or year of the selected range. A period at the edge of the range is shown in full. Only the first and the last period of the data can be incomplete. Green bars are gains, red bars are losses.`}
      aside={
        <Segmented
          label="Return period"
          options={PERIODS.map((value) => ({ value, label: LABELS[value] }))}
          value={period}
          onChange={setPeriod}
        />
      }
    >
      {points.length === 0 ? (
        <p className="text-sm text-ink-2">The selected range has no {LABELS[period].toLowerCase()} returns.</p>
      ) : (
        <BarChart
          responsive
          aria-label={`${LABELS[period]} returns of ${symbol}`}
          className="h-72 w-full text-xs tabular-nums sm:h-80"
          data={points}
          margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
        >
          {/* ---- Grid and axes ---- */}
          <CartesianGrid vertical={false} stroke="var(--grid)" />
          <XAxis
            dataKey="date"
            ticks={xAxis?.ticks}
            tickFormatter={xAxis?.format}
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

          {/* ---- Tooltip: the period and the return of the bar under the pointer ---- */}
          <Tooltip
            isAnimationActive={false}
            cursor={dense ? { fill: "none", stroke: "var(--axis)" } : { fill: "var(--grid)" }}
            content={({ active, payload }) => {
              if (!active || payload.length === 0) return null;
              const point: ReturnPoint = payload[0].payload;
              return (
                <TooltipBox
                  title={periodTitle(period, point.date)}
                  rows={[
                    {
                      label: `${LABELS[period]} return`,
                      value: formatPercent(point.value, 2, true),
                      color: barColor(point.value),
                    },
                  ]}
                />
              );
            }}
          />

          {/* ---- Bars: at most 24 px thick, no animation ---- */}
          <Bar dataKey="value" maxBarSize={24} isAnimationActive={false} shape={ReturnBar} />
        </BarChart>
      )}
    </Card>
  );
}
