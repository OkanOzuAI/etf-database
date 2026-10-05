import { formatDate } from "@/lib/format";
import { rangeReturn } from "@/lib/range";
import type { Mode, PickedSymbol, TrailingKey } from "@/lib/types";
import Card from "./Card";
import { HeadCell, PercentCell, PickedName, Table } from "./TableParts";

// The trailing-return columns, from the shortest window to the longest
const WINDOWS: TrailingKey[] = ["1M", "3M", "6M", "YTD", "1Y", "3Y", "5Y", "ALL"];

type Props = {
  picked: PickedSymbol[];
  mode: Mode;
  modeName: string; // "Buy & Hold" or "SMA strategy"
  lastDataDay: string; // the trailing returns end on this day
};

// Table of the Compare view: the return in the selected range next to the trailing returns.
export default function RangeTable({ picked, mode, modeName, lastDataDay }: Props) {
  // The picked symbols share the same trading days, so the first one gives the days of the range.
  const rows = picked[0].rows;
  const rangeText = `${formatDate(rows[0].date)} – ${formatDate(rows[rows.length - 1].date)}`;

  return (
    <Card
      title="Return in the selected range"
      description={`The highlighted column is the ${modeName} return between the first and the last day of the selected range. The trailing returns are price returns of the symbol up to the last data day (${formatDate(lastDataDay)}); they do not depend on the selected range.`}
    >
      <Table>
        <thead>
          {/* ---- First header row: the names of the two column groups ---- */}
          <tr>
            <th />
            <HeadCell>Selected range</HeadCell>
            <th
              scope="colgroup"
              colSpan={WINDOWS.length}
              className="border-b border-line px-2.5 py-2 text-center text-xs font-medium whitespace-nowrap text-ink-2"
            >
              {`Trailing returns (to ${formatDate(lastDataDay)})`}
            </th>
          </tr>
          {/* ---- Second header row: the columns ---- */}
          <tr className="border-b border-line">
            <HeadCell left>Symbol</HeadCell>
            <HeadCell>{rangeText}</HeadCell>
            {WINDOWS.map((key) => (
              <HeadCell key={key}>{key === "ALL" ? "All" : key}</HeadCell>
            ))}
          </tr>
        </thead>
        <tbody>
          {picked.map((item) => (
            <tr key={item.info.symbol} className="border-b border-line">
              <PickedName item={item} />
              {/* The line of the symbol in the chart above ends at 100 + this return. */}
              <PercentCell value={rangeReturn(item.rows, mode)} strong />
              {WINDOWS.map((key) => (
                <PercentCell key={key} value={item.info.trailing[key]} />
              ))}
            </tr>
          ))}
        </tbody>
      </Table>
    </Card>
  );
}
