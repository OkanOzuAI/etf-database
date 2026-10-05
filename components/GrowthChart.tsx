import { useState } from "react";
import { CartesianGrid, Line, LineChart, Tooltip, XAxis, YAxis } from "recharts";
import { formatDate, formatNumber } from "@/lib/format";
import { growthRows } from "@/lib/range";
import type { GrowthRow } from "@/lib/range";
import type { Mode, PickedSymbol } from "@/lib/types";
import Card from "./Card";
import { dateTicks, Legend, logTicks, roundTicks, TooltipBox } from "./ChartParts";

type Props = {
  picked: PickedSymbol[];
  mode: Mode;
  modeName: string; // "Buy & Hold" or "SMA strategy"
};

// Overlay chart "Growth of 100": one line per picked symbol on one y axis.
// Every line starts at 100 on the first day of the selected range.
export default function GrowthChart({ picked, mode, modeName }: Props) {
  // A log axis shows equal percent changes as equal steps. It helps when one symbol
  // grew much more than the others and would make their lines look flat.
  const [logScale, setLogScale] = useState(false);

  const rows = growthRows(picked, mode);

  // ---- Axis ticks ----
  const values = rows.flatMap((row) => Object.values(row.values));
  const valueTicks = logScale ? logTicks(values) : roundTicks(values);
  const xAxis = dateTicks(rows.map((row) => row.date));

  return (
    <Card
      title="Growth of 100"
      description={`${modeName} value of each symbol, rebased to 100 on ${formatDate(rows[0].date)}, the first day of the selected range. A value of 150 means +50% since that day.`}
      aside={
        <label className="flex items-center gap-2 text-sm text-ink-2">
          <input
            type="checkbox"
            className="size-4 accent-accent"
            checked={logScale}
            onChange={(event) => setLogScale(event.target.checked)}
          />
          Log scale
        </label>
      }
    >
      <Legend items={picked.map((item) => ({ label: item.info.symbol, color: item.color }))} />

      <LineChart
        responsive
        aria-label={`Growth of 100 chart, ${modeName}`}
        className="h-72 w-full text-xs tabular-nums sm:h-96"
        data={rows}
        margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
      >
        {/* ---- Grid and axes: one y axis for every line, linear or log ---- */}
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
          scale={logScale ? "log" : "linear"}
          ticks={valueTicks}
          domain={[valueTicks[0], valueTicks[valueTicks.length - 1]]}
          tickFormatter={(value: number) => formatNumber(value, 0)}
          tick={{ fill: "var(--ink-2)" }}
          tickLine={false}
          axisLine={false}
        />

        {/* ---- Tooltip: the vertical line finds the nearest day, the box lists every line ---- */}
        <Tooltip
          isAnimationActive={false}
          cursor={{ stroke: "var(--axis)" }}
          content={({ active, payload }) => {
            if (!active || payload.length === 0) return null;
            const row: GrowthRow = payload[0].payload;
            return (
              <TooltipBox
                title={formatDate(row.date)}
                rows={picked
                  .filter((item) => item.info.symbol in row.values) // skip a symbol with no value on this day
                  .map((item) => ({
                    label: item.info.symbol,
                    value: formatNumber(row.values[item.info.symbol]),
                    color: item.color,
                  }))}
              />
            );
          }}
        />

        {/* ---- Lines: 2 px, no dots, no animation ---- */}
        {picked.map((item) => (
          <Line
            key={item.info.symbol}
            name={item.info.symbol}
            dataKey={(row: GrowthRow) => row.values[item.info.symbol]}
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
