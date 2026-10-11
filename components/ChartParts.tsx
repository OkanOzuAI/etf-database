// Small parts shared by the charts: axis helpers, the legend row and the tooltip box.

import { formatDate, formatDay, formatMonth, formatPrice } from "@/lib/format";

// ---- X axis ----

// Picks the x-axis ticks for a list of date labels and how to write them:
//  - long range: one tick where a new year starts ("2017")
//  - shorter range: one tick per month ("Mar 2025")
//  - very short range: one tick per row, so the axis is never empty
// Recharts hides labels that would overlap, so the list may hold more ticks than fit.
export function dateTicks(dates: string[]): { ticks: string[]; format: (date: string) => string } {
  // Rows where the first `length` letters change: 4 = a new year, 7 = a new month.
  const starts = (length: number) =>
    dates.filter((date, i) => i > 0 && date.slice(0, length) !== dates[i - 1].slice(0, length));

  const years = starts(4);
  if (years.length >= 3) {
    return { ticks: years, format: (date) => date.slice(0, 4) };
  }
  const months = [...dates.slice(0, 1), ...starts(7)]; // the first row and every new month
  if (months.length >= 3) {
    return { ticks: months, format: (date) => formatMonth(date.slice(0, 7)) };
  }
  // A label is a day ("2026-10-02") or, on the monthly tab, a month ("2026-10").
  return { ticks: dates, format: (date) => (date.length === 7 ? formatMonth(date) : formatDay(date)) };
}

// ---- Y axis ----

// Makes round tick values for the y axis (for example 0, 10,000, 20,000 ...).
// The data range is cut into about 5 parts; the step is rounded up to 1, 2, 5 or 10 times a
// power of ten. The first tick is at or below the smallest value, the last at or above the largest.
// The step is at least minStep: 1 where the labels are whole numbers, much less for a price
// axis, because a share of a Turkish fund can cost less than one lira.
export function roundTicks(values: number[], minStep = 1): number[] {
  const min = Math.min(...values);
  const max = Math.max(...values);

  // 1) Rough step and its size: ... 0.01, 0.1, 1, 10, 100 ...
  const rough = Math.max((max - min) / 5, minStep);
  const power = 10 ** Math.floor(Math.log10(rough));

  // 2) Round the rough step up to the nearest round step.
  let step = 10 * power;
  if (rough <= 5 * power) step = 5 * power;
  if (rough <= 2 * power) step = 2 * power;
  if (rough <= power) step = power;

  // 3) Start at the last multiple of the step at or below the smallest value and stop at the
  //    first one at or above the largest.
  const first = Math.floor(min / step);
  const last = Math.ceil(max / step);
  const ticks = [];
  for (let multiple = first; multiple <= last; multiple += 1) {
    ticks.push(multiple * step);
  }
  return ticks;
}

// How many decimals the tick labels need, so that two neighbouring ticks get different labels:
// 0 for a step of 1 or more, 2 for a step of 0.05, 3 for a step of 0.002 ...
export function tickDigits(ticks: number[]): number {
  const step = ticks.length > 1 ? ticks[1] - ticks[0] : 1;
  return step >= 1 ? 0 : Math.ceil(-Math.log10(step));
}

// Tick values for a log axis. A log axis cannot show zero, so:
//  - small range: the usual round ticks are used if all of them are above zero
//  - large range: 1, 2, 5, 10, 20, 50 ... from just below the smallest value to just above the largest
export function logTicks(values: number[]): number[] {
  const linear = roundTicks(values);
  if (linear[0] > 0) return linear;

  const min = Math.min(...values);
  const max = Math.max(...values);
  // Candidates from the power of ten below the smallest value to the one above the largest.
  const candidates = [];
  for (let power = 10 ** Math.floor(Math.log10(min)); power < max * 10; power *= 10) {
    candidates.push(power, 2 * power, 5 * power);
  }
  // Keep the last candidate at or below the smallest value ... the first one at or above the largest.
  const first = candidates.filter((tick) => tick <= min).length - 1;
  const last = candidates.findIndex((tick) => tick >= max);
  return candidates.slice(first, last + 1);
}

// ---- Buy / sell triangle ----

// SVG path of a triangle with its centre at (cx, cy) that points up or down.
export function trianglePath(cx: number, cy: number, half: number, up: boolean): string {
  const tip = up ? cy - half : cy + half;
  const base = up ? cy + half : cy - half;
  return `M${cx},${tip} L${cx + half},${base} L${cx - half},${base} Z`;
}

// ---- Legend row ----

type LegendItem = {
  label: string;
  color: string;
  shape?: "bar" | "up" | "down"; // a bar, an up triangle (buy) or a down triangle (sell); a line if left out
};

// Shows the colour and the name of every series above the chart.
// The symbol has the shape of the mark in the chart: a short line, a small bar or a triangle.
export function Legend({ items }: { items: LegendItem[] }) {
  return (
    <ul className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-2">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-1.5">
          <svg width="16" height="12" aria-hidden="true">
            {item.shape === "bar" && <rect x="3" y="1" width="10" height="10" rx="2" fill={item.color} />}
            {(item.shape === "up" || item.shape === "down") && (
              <path d={trianglePath(8, 6, 5, item.shape === "up")} fill={item.color} />
            )}
            {!item.shape && (
              <line x1="1" y1="6" x2="15" y2="6" stroke={item.color} strokeWidth="2" strokeLinecap="round" />
            )}
          </svg>
          {item.label}
        </li>
      ))}
    </ul>
  );
}

// ---- Tooltip box ----

type TooltipRow = {
  label: string;
  value: string;
  color: string;
};

// The box with the values of the point under the pointer.
// Every row has the colour of the series, the value (bold) and the name of the series.
export function TooltipBox({ title, rows }: { title: string; rows: TooltipRow[] }) {
  return (
    <div className="rounded-lg border border-line bg-surface px-3 py-2 text-sm shadow-md">
      <p className="mb-1 text-xs text-ink-2">{title}</p>
      <table>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label}>
              <td>
                <span className="block h-0.5 w-3 rounded-full" style={{ background: row.color }} />
              </td>
              <td className="px-2 text-right font-semibold">{row.value}</td>
              <td className="text-ink-2">{row.label}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// One series of a money line chart: which field is drawn, with which name and colour.
export type LineSeries = {
  key: "price" | "sma_short" | "sma_long" | "strategy" | "buy_hold";
  label: string;
  color: string;
};

// A row of a money line chart: a date and the values of its series.
type MoneyRow = { date: string } & Partial<Record<LineSeries["key"], number | null>>;

type MoneyTooltipProps = {
  row: MoneyRow;
  series: LineSeries[];
  currency: string; // "USD" or "TRY"
};

// Tooltip of the money line charts: lists every series of the chosen day.
export function MoneyTooltip({ row, series, currency }: MoneyTooltipProps) {
  const rows: TooltipRow[] = [];
  for (const item of series) {
    const value = row[item.key];
    // A moving average that does not exist yet (null) gets no row.
    if (value != null) {
      rows.push({ label: item.label, color: item.color, value: formatPrice(value, currency) });
    }
  }
  return <TooltipBox title={formatDate(row.date)} rows={rows} />;
}
