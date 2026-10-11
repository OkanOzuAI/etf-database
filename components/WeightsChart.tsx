import { CartesianGrid, Line, LineChart, ReferenceLine, Tooltip, XAxis, YAxis } from "recharts";
import { formatDate, formatPercent } from "@/lib/format";
import type { PortfolioWeek } from "@/lib/types";
import Card from "./Card";
import { dateTicks, Legend, TooltipBox } from "./ChartParts";
import { ColorKey, Table } from "./TableParts";

// One part of the portfolio in the chart: a market or cash
export type Part = {
  key: string; // its name in the totals of portfolio.json ("Türkiye", "United States", "CASH")
  label: string;
  color: string;
};

type Props = {
  history: PortfolioWeek[]; // every weekly decision, oldest first
  parts: Part[];
  minMarket: number; // smallest share a market can have (%), drawn as a guide line
};

// End labels are only drawn if they are at least this far apart (percentage points),
// so that two labels never lie on top of each other.
const LABEL_GAP = 6;

// Look of the cells in the small table. A phone has less room, so the cells are a little
// narrower there and the "Average" column is hidden.
const CELL = "px-1 py-2.5 text-right whitespace-nowrap sm:px-2.5";
const HEAD = "px-1 py-2 text-xs font-medium whitespace-nowrap text-ink-2 sm:px-2.5";
const WIDE_ONLY = "hidden sm:table-cell";

// Line chart: the share of each market and of cash in every weekly decision, with a small
// table of the same numbers below it.
export default function WeightsChart({ history, parts, minMarket }: Props) {
  const xAxis = dateTicks(history.map((week) => week.date));
  const lastIndex = history.length - 1;
  const last = history[lastIndex];

  // ---- Which parts get a line: only the ones that were above zero at least once ----
  // A part that was always 0% (cash, with the current data) would only lie on the axis.
  // It stays in the tooltip and in the table.
  const drawn = parts.filter((part) => history.some((week) => week.totals[part.key] > 0));
  const hidden = parts.filter((part) => !drawn.includes(part));

  // ---- Which line ends get a label: a part above zero whose end is not too close to another one ----
  const labelled = parts.filter((part) => {
    const value = last.totals[part.key];
    const tooClose = parts.some(
      (other) => other.key !== part.key && Math.abs(last.totals[other.key] - value) < LABEL_GAP,
    );
    return value > 0 && !tooClose;
  });

  // ---- Numbers for the table: last, lowest, average and highest share of every part ----
  const rows = parts.map((part) => {
    const values = history.map((week) => week.totals[part.key]);
    return {
      part,
      last: last.totals[part.key],
      lowest: Math.min(...values),
      average: values.reduce((sum, value) => sum + value, 0) / values.length,
      highest: Math.max(...values),
    };
  });

  return (
    <Card
      title="Market shares over time"
      description={
        `Share of each market and of cash in every weekly decision since ${formatDate(history[0].date)}. The shares always add up to 100%.` +
        // Say why a part has no line.
        hidden.map((part) => ` ${part.label} was 0% in every decision, so it has no line.`).join("")
      }
    >
      <Legend items={drawn.map((part) => ({ label: part.label, color: part.color }))} />

      <LineChart
        responsive
        aria-label="Share of each market and of cash in every weekly decision"
        className="h-64 w-full text-xs tabular-nums sm:h-80"
        data={history}
        // The right margin leaves room for the labels at the line ends.
        margin={{ top: 8, right: 60, bottom: 0, left: 0 }}
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

        {/* ---- Guide line: no market can be below this share ---- */}
        <ReferenceLine
          y={minMarket}
          stroke="var(--axis)"
          strokeDasharray="4 4"
          label={{ value: "Minimum per market", position: "insideTopRight", fill: "var(--ink-2)", fontSize: 11 }}
        />

        {/* ---- Tooltip: the vertical line finds the nearest week, the box lists every share ---- */}
        <Tooltip
          isAnimationActive={false}
          cursor={{ stroke: "var(--axis)" }}
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

        {/* ---- Lines: 2 px, no fill, no dots, no animation. One point per weekly decision.
             Only the last point gets a dot and (if there is room) its value. ---- */}
        {drawn.map((part) => (
          <Line
            key={part.key}
            name={part.label}
            dataKey={(week: PortfolioWeek) => week.totals[part.key]}
            stroke={part.color}
            strokeWidth={2}
            strokeLinejoin="round"
            isAnimationActive={false}
            activeDot={{ r: 4, stroke: "var(--surface)", strokeWidth: 2 }}
            dot={({ cx, cy, index }) =>
              index === lastIndex ? (
                <circle key={part.key} cx={cx} cy={cy} r={4} fill={part.color} stroke="var(--surface)" strokeWidth={2} />
              ) : (
                <g key={index} />
              )
            }
            label={({ x, y, index, value }) =>
              index === lastIndex && labelled.includes(part) ? (
                <text x={Number(x) + 9} y={Number(y) + 4} fill="var(--ink)" fontWeight={600}>
                  {formatPercent(Number(value))}
                </text>
              ) : (
                <g />
              )
            }
          />
        ))}
      </LineChart>

      {/* ---- The same numbers as a table ---- */}
      <div className="mt-4">
        <Table>
          <thead>
            <tr className="border-b border-line">
              <th scope="col" className={`${HEAD} text-left`}>
                Share
              </th>
              <th scope="col" className={`${HEAD} text-right`}>
                Latest
              </th>
              <th scope="col" className={`${HEAD} text-right`}>
                Lowest
              </th>
              <th scope="col" className={`${HEAD} ${WIDE_ONLY} text-right`}>
                Average
              </th>
              <th scope="col" className={`${HEAD} text-right`}>
                Highest
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.part.key} className="border-b border-line last:border-b-0">
                {/* On a very narrow phone a long name may use two lines. */}
                <th scope="row" className="px-1 py-2.5 text-left font-normal sm:px-2.5">
                  <span className="flex items-center gap-2">
                    <ColorKey color={row.part.color} />
                    {row.part.label}
                  </span>
                </th>
                <td className={CELL}>{formatPercent(row.last)}</td>
                <td className={CELL}>{formatPercent(row.lowest)}</td>
                <td className={`${CELL} ${WIDE_ONLY}`}>{formatPercent(row.average)}</td>
                <td className={CELL}>{formatPercent(row.highest)}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>
    </Card>
  );
}
