// Small parts shared by the tables and the stat tiles.

import type { ReactNode } from "react";
import { formatPercent } from "@/lib/format";
import type { PickedSymbol } from "@/lib/types";

// Text colour of a change: green for a gain, red for a loss, normal for zero.
export function toneClass(value: number): string {
  if (value > 0) return "text-good-text";
  if (value < 0) return "text-critical-text";
  return "";
}

// Colour key of a series: a short line in the colour of its chart line or bars.
export function ColorKey({ color }: { color: string }) {
  return (
    <span aria-hidden="true" className="inline-block h-1 w-3.5 shrink-0 rounded-full" style={{ background: color }} />
  );
}

// Frame of a table. On a narrow screen the table scrolls sideways inside its own box,
// so the page itself never scrolls sideways. "relative" keeps the hidden screen-reader
// texts (sr-only) inside this box too.
export function Table({ children }: { children: ReactNode }) {
  return (
    <div className="relative overflow-x-auto">
      <table className="w-full text-sm tabular-nums">{children}</table>
    </div>
  );
}

// Header cell of a column. Numbers are right-aligned, so their headers are too.
export function HeadCell({ children, left = false }: { children: ReactNode; left?: boolean }) {
  return (
    <th
      scope="col"
      className={`px-2.5 py-2 text-xs font-medium whitespace-nowrap text-ink-2 ${left ? "text-left" : "text-right"}`}
    >
      {children}
    </th>
  );
}

// First cell of a row: the name of the row.
export function RowHead({ children }: { children: ReactNode }) {
  return (
    <th scope="row" className="px-2.5 py-2.5 text-left font-normal">
      {children}
    </th>
  );
}

// Row name in the Compare tables: colour key and symbol of a picked symbol.
// withName adds the name; a phone has no room for it, so it is hidden there.
export function PickedName({ item, withName = false }: { item: PickedSymbol; withName?: boolean }) {
  return (
    <RowHead>
      <span className="flex items-center gap-2 whitespace-nowrap">
        <ColorKey color={item.color} />
        <span className="font-semibold">{item.info.symbol}</span>
        {withName && <span className="hidden text-ink-2 sm:inline">{item.info.name}</span>}
      </span>
    </RowHead>
  );
}

// Cell with a plain value (a price, a ratio, a count).
export function ValueCell({ children }: { children: ReactNode }) {
  return <td className="px-2.5 py-2.5 text-right whitespace-nowrap">{children}</td>;
}

// Cell with a percent return: green if positive, red if negative. The sign is written
// too, so the meaning is not in the colour alone. A missing value is shown as a dash.
// strong: the highlighted column (bold text on a light background).
export function PercentCell({ value, strong = false }: { value: number | undefined; strong?: boolean }) {
  const highlight = strong ? "bg-accent-soft font-semibold" : "";
  if (value === undefined) {
    return <td className={`px-2.5 py-2.5 text-right text-ink-2 ${highlight}`}>–</td>;
  }
  return (
    <td className={`px-2.5 py-2.5 text-right whitespace-nowrap ${highlight} ${toneClass(value)}`}>
      {formatPercent(value, 2, true)}
    </td>
  );
}
