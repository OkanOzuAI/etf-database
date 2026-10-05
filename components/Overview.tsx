import { useState } from "react";
import { formatDate, formatDateTime, formatDollar, formatMonth } from "@/lib/format";
import type { DateRange, SignalLabel, Summary, SymbolSummary, TrailingKey, View } from "@/lib/types";
import Segmented from "./Segmented";
import SignalBadge from "./SignalBadge";
import StatTile from "./StatTile";
import { PercentCell, ValueCell } from "./TableParts";

// ---- Trailing-return columns of the table ----
const WINDOWS: TrailingKey[] = ["1M", "YTD", "1Y", "5Y", "ALL"];

// ---- The four signal labels and what each one means (the legend under the table) ----
const SIGNALS: { label: SignalLabel; meaning: string }[] = [
  { label: "BUY", meaning: "the signal turned on at the last close" },
  { label: "HOLD", meaning: "the signal was already on" },
  { label: "SELL", meaning: "the signal turned off at the last close" },
  { label: "WAIT", meaning: "the signal was already off (stay in cash)" },
];

const ALL_GROUPS = "All"; // the filter option that shows every group

// Shared look of the header cells of the table.
const HEAD = "px-2.5 py-2 text-xs font-medium whitespace-nowrap text-ink-2";

// Which one had the higher total return over the full period?
function winner(item: SymbolSummary): string {
  const strategy = item.strategy.total_return_pct;
  const buyHold = item.buy_hold.total_return_pct;
  if (strategy > buyHold) return "Strategy";
  if (buyHold > strategy) return "Buy & Hold";
  return "Tie";
}

type Props = {
  summary: Summary;
  dataRange: DateRange; // first and last day of the data
  onOpenSymbol: (symbol: string) => void; // a row was selected: open the Details view of that symbol
  onOpenView: (view: View) => void;
};

// Overview: what the site is for, a few summary numbers and one table of all symbols.
export default function Overview({ summary, dataRange, onOpenSymbol, onOpenView }: Props) {
  const { params, symbols } = summary;
  const [filter, setFilter] = useState(ALL_GROUPS); // group filter of the table

  // ---- Numbers for the tiles ----
  const groups = [...new Set(symbols.map((item) => item.group))]; // group names in data order
  const buyHoldWins = symbols.filter((item) => winner(item) === "Buy & Hold");
  const strategyWins = symbols.filter((item) => winner(item) === "Strategy");

  // ---- Groups shown in the table ----
  const shownGroups = filter === ALL_GROUPS ? groups : [filter];

  return (
    <div className="space-y-6">
      {/* ---- What the site is for, data range and last update ---- */}
      <header>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-4xl">
          Does a moving average strategy beat Buy &amp; Hold?
        </h1>
        <p className="mt-3 max-w-3xl text-ink-2 sm:text-lg">
          {`This site tests one simple trading rule on the ${symbols.length} symbols below: hold a symbol while its ${params.sma_short}-day average price (SMA${params.sma_short}) is above its ${params.sma_long}-day average (SMA${params.sma_long}), otherwise stay in cash. The result is compared with Buy & Hold, which buys on the first day and never sells. Every test starts with ${formatDollar(params.initial_capital, 0)}.`}
        </p>
        <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-2">
          <span>
            Daily data: {formatDate(dataRange.from)} – {formatDate(dataRange.to)}
          </span>
          <span>Last update: {formatDateTime(summary.updated_at)}</span>
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => onOpenView("compare")}
            className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-page transition-opacity hover:opacity-90"
          >
            Compare symbols
          </button>
          <button
            type="button"
            onClick={() => onOpenView("method")}
            className="rounded-full border border-line bg-surface px-4 py-2 text-sm font-semibold transition-colors hover:bg-hover"
          >
            How it works
          </button>
        </div>
      </header>

      {/* ---- Summary tiles ---- */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Symbols" value={String(symbols.length)} note={`in ${groups.length} groups`} />
        <StatTile
          label="Data period"
          value={`${params.years} years`}
          note={`${formatDate(dataRange.from)} – ${formatDate(dataRange.to)}`}
        />
        <StatTile
          label="Buy & Hold won"
          value={`${buyHoldWins.length} of ${symbols.length}`}
          note="symbols with a higher total return than the strategy"
        />
        <StatTile
          label="SMA strategy won"
          value={`${strategyWins.length} of ${symbols.length}`}
          note={strategyWins.length > 0 ? strategyWins.map((item) => item.symbol).join(", ") : "no symbol"}
        />
      </div>

      {/* ---- Table of all symbols ---- */}
      <section className="overflow-hidden rounded-2xl border border-line bg-surface">
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3 p-4 sm:p-6">
          <div className="max-w-2xl">
            <h2 className="font-semibold">All symbols</h2>
            <p className="mt-1 text-sm text-ink-2">
              {`Select a row to open the details of a symbol. Price return: change of the price up to the last data day (${formatDate(dataRange.to)}). Total return: the two portfolios over the full period. A symbol marked "since ..." was listed later, so its numbers cover a shorter period.`}
            </p>
          </div>
          <Segmented
            label="Group filter"
            options={[ALL_GROUPS, ...groups].map((group) => ({ value: group, label: group }))}
            value={filter}
            onChange={setFilter}
          />
        </div>

        {/* On a narrow screen the table scrolls sideways inside this box; the first column stays in place. */}
        <div className="overflow-x-auto border-t border-line">
          <table className="w-full text-sm tabular-nums">
            <thead>
              {/* First header row: the two column groups */}
              <tr>
                <th scope="col" rowSpan={2} className={`${HEAD} sticky left-0 bg-surface pl-4 text-left align-bottom sm:pl-6`}>
                  Symbol
                </th>
                <th scope="col" rowSpan={2} className={`${HEAD} text-right align-bottom`}>
                  Last price
                </th>
                <th scope="colgroup" colSpan={WINDOWS.length} className={`${HEAD} border-b border-line text-center`}>
                  Price return
                </th>
                <th scope="colgroup" colSpan={3} className={`${HEAD} border-b border-line text-center`}>
                  Total return, full period
                </th>
                <th scope="col" rowSpan={2} className={`${HEAD} pr-4 text-left align-bottom sm:pr-6`}>
                  Signal
                </th>
              </tr>
              {/* Second header row: the columns inside the two groups */}
              <tr>
                {WINDOWS.map((key) => (
                  <th key={key} scope="col" className={`${HEAD} text-right`}>
                    {key === "ALL" ? "All" : key}
                  </th>
                ))}
                <th scope="col" className={`${HEAD} text-right`}>
                  Strategy
                </th>
                <th scope="col" className={`${HEAD} text-right`}>
                  Buy &amp; Hold
                </th>
                <th scope="col" className={`${HEAD} text-left`}>
                  Winner
                </th>
              </tr>
            </thead>

            {/* One block of rows per group, with the group name above it */}
            {shownGroups.map((group) => (
              <tbody key={group}>
                <tr className="border-t border-line bg-track/60">
                  <th scope="rowgroup" colSpan={WINDOWS.length + 6} className="py-1.5 text-left text-xs font-semibold text-ink-2">
                    {/* sticky: the group name stays visible when the table scrolls sideways */}
                    <span className="sticky left-4 sm:left-6">{group}</span>
                  </th>
                </tr>
                {symbols
                  .filter((item) => item.group === group)
                  .map((item) => (
                    // A click anywhere in the row opens the details. The symbol is a real button,
                    // so the row can be opened with the keyboard too (its click reaches the row).
                    <tr
                      key={item.symbol}
                      onClick={() => onOpenSymbol(item.symbol)}
                      className="group cursor-pointer border-t border-line hover:bg-hover"
                    >
                      <th
                        scope="row"
                        className="sticky left-0 bg-surface py-2.5 pr-2.5 pl-4 text-left font-normal group-hover:bg-hover sm:pl-6"
                      >
                        {/* The width keeps a long name on one or two lines. */}
                        <button type="button" className="w-28 rounded-sm text-left sm:w-32">
                          <span className="block font-semibold text-accent group-hover:underline">{item.symbol}</span>
                          <span className="block text-xs text-ink-2">{item.name}</span>
                          {/* Listed after the data starts: show since when it has data. */}
                          {item.start > dataRange.from && (
                            <span className="block text-xs text-ink-2">since {formatMonth(item.start.slice(0, 7))}</span>
                          )}
                        </button>
                      </th>
                      <ValueCell>{formatDollar(item.last_price)}</ValueCell>
                      {WINDOWS.map((key) => (
                        <PercentCell key={key} value={item.trailing[key]} />
                      ))}
                      <PercentCell value={item.strategy.total_return_pct} />
                      <PercentCell value={item.buy_hold.total_return_pct} />
                      <td className="px-2.5 py-2.5 whitespace-nowrap">{winner(item)}</td>
                      <td className="py-2.5 pr-4 pl-2.5 sm:pr-6">
                        <SignalBadge label={item.recommendation} />
                      </td>
                    </tr>
                  ))}
              </tbody>
            ))}
          </table>
        </div>

        {/* ---- Legend of the signal labels ---- */}
        <p className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line p-4 text-sm text-ink-2 sm:px-6">
          <span>Signal after the last close:</span>
          {SIGNALS.map((item) => (
            <span key={item.label} className="flex items-center gap-1.5">
              <SignalBadge label={item.label} />
              {item.meaning}
            </span>
          ))}
          <span className="font-medium text-ink">Not investment advice.</span>
        </p>
      </section>
    </div>
  );
}
