import { Area, AreaChart, CartesianGrid, Tooltip, XAxis, YAxis } from "recharts";
import { formatDate, formatPercent } from "@/lib/format";
import type { PortfolioWeek } from "@/lib/types";
import Card from "./Card";
import { dateTicks, Legend, TooltipBox } from "./ChartParts";

// One part of the portfolio in the chart: a market or cash
export type Part = {
  key: string; // its name in the totals of portfolio.json ("Türkiye", "United States", "CASH")
  label: string;
  color: string;
};

type Props = {
  history: PortfolioWeek[]; // every weekly decision, oldest first
  parts: Part[];
};

// Stacked area chart: the share of each market and of cash in every weekly decision.
export default function WeightsChart({ history, parts }: Props) {
  const xAxis = dateTicks(history.map((week) => week.date));

  return (
    <Card
      title="Market shares over time"
      description={`Share of each market and of cash in every weekly decision since ${formatDate(history[0].date)}. The parts always add up to 100%.`}
    >
      <Legend items={parts.map((part) => ({ label: part.label, color: part.color, shape: "bar" }))} />

      <AreaChart
        responsive
        aria-label="Share of each market and of cash in every weekly decision"
        className="h-64 w-full text-xs tabular-nums sm:h-80"
        data={history}
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
          ticks={[0, 20, 40, 60, 80, 100]}
          domain={[0, 100]}
          tickFormatter={(value: number) => formatPercent(value, 0)}
          tick={{ fill: "var(--ink-2)" }}
          tickLine={false}
          axisLine={false}
        />

        {/* ---- Tooltip: the shares of the week under the pointer ---- */}
        <Tooltip
          isAnimationActive={false}
          cursor={{ stroke: "var(--ink)" }}
          content={({ active, payload }) => {
            if (!active || payload.length === 0) return null;
            const week: PortfolioWeek = payload[0].payload;
            return (
              <TooltipBox
                title={`Decision of ${formatDate(week.date)}`}
                rows={parts.map((part) => ({
                  label: part.label,
                  color: part.color,
                  value: formatPercent(week.totals[part.key]),
                }))}
              />
            );
          }}
        />

        {/* ---- Areas: stacked, one per part. A decision holds until the next one, so the
             edge is drawn as steps. A thin line in the background colour separates the parts. ---- */}
        {parts.map((part) => (
          <Area
            key={part.key}
            name={part.label}
            dataKey={(week: PortfolioWeek) => week.totals[part.key]}
            stackId="shares"
            type="stepAfter"
            fill={part.color}
            fillOpacity={1}
            stroke="var(--surface)"
            strokeWidth={1}
            activeDot={false}
            isAnimationActive={false}
          />
        ))}
      </AreaChart>
    </Card>
  );
}
