// Helpers for the date range: picking the rows of a range and rebasing values.

import type { DailyRow, DateRange, Mode, PickedSymbol, ReturnPoint } from "./types";

// ---- Dates ----

// The day that is `years` years before a date: ("2026-10-02", 1) -> "2025-10-02".
export function yearsBefore(date: string, years: number): string {
  const day = new Date(date); // read as midnight UTC
  day.setUTCFullYear(day.getUTCFullYear() - years);
  return day.toISOString().slice(0, 10);
}

// ---- Rows of a range ----

// The daily rows of a date range.
// The first row is the last trading day on or before "from": if "from" is a weekend or a
// holiday, the close of the trading day before it is the starting point. The pipeline uses
// the same rule for the trailing returns, so the 1Y / 3Y / 5Y presets give the same numbers.
// The last row is the last trading day on or before "to".
export function rowsInRange(rows: DailyRow[], range: DateRange): DailyRow[] {
  let first = 0;
  let last = 0;
  rows.forEach((row, i) => {
    if (row.date <= range.from) first = i;
    if (row.date <= range.to) last = i;
  });
  return rows.slice(first, last + 1);
}

// The return periods (days, weeks, months or years) that overlap the rows of a range.
// The first row is only the starting point, so the returns begin with the second row.
// Period labels are compared as text with the same part of the date: a month label
// "2020-03" with "2020-03", a year label "2020" with "2020".
export function returnsInRange(points: ReturnPoint[], rows: DailyRow[]): ReturnPoint[] {
  if (rows.length < 2) return [];
  const first = rows[1].date;
  const last = rows[rows.length - 1].date;

  return points.filter((point, i) => {
    const length = point.date.length;
    // The period must not end before the range starts ...
    const endsInRange = point.date >= first.slice(0, length);
    // ... and it must start before the range ends: the period before it ends earlier than the last day.
    const startsInRange = i === 0 || points[i - 1].date < last.slice(0, length);
    return endsInRange && startsInRange;
  });
}

// ---- Returns and rebasing ----

// Percent return of a portfolio between the first and the last row: last / first - 1.
export function rangeReturn(rows: DailyRow[], mode: Mode): number {
  return (rows[rows.length - 1][mode] / rows[0][mode] - 1) * 100;
}

// Rebases the two portfolios so that both start with `capital` on the first row:
// value / value on the first day * capital.
export function rebasePortfolios(rows: DailyRow[], capital: number) {
  const first = rows[0];
  return rows.map((row) => ({
    date: row.date,
    strategy: (row.strategy / first.strategy) * capital,
    buy_hold: (row.buy_hold / first.buy_hold) * capital,
  }));
}

// One row of the "Growth of 100" chart: a date and the rebased value of every picked symbol
export type GrowthRow = {
  date: string;
  values: Record<string, number>; // symbol -> value (100 on the first day of the range)
};

// Builds the rows of the "Growth of 100" chart. Every symbol is rebased to 100 on the first
// day of the range: value / value on the first day * 100.
export function growthRows(picked: PickedSymbol[], mode: Mode): GrowthRow[] {
  // The symbols share the same trading days. Collecting by date also works if one has a gap.
  const byDate = new Map<string, GrowthRow>();
  for (const item of picked) {
    const firstValue = item.rows[0][mode];
    for (const row of item.rows) {
      const point = byDate.get(row.date) ?? { date: row.date, values: {} };
      point.values[item.info.symbol] = (row[mode] / firstValue) * 100;
      byDate.set(row.date, point);
    }
  }
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}
