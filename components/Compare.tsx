import { formatDate, formatNumber, formatPercent } from "@/lib/format";
import { rangeReturn, rowsInRange } from "@/lib/range";
import type { DateRange, Mode, PickedSymbol, Summary, SymbolFiles } from "@/lib/types";
import GrowthChart from "./GrowthChart";
import RangeBar from "./RangeBar";
import RangeTable from "./RangeTable";
import RiskTable from "./RiskTable";
import Segmented from "./Segmented";
import StatTile from "./StatTile";
import SymbolChips, { slotColor } from "./SymbolChips";
import YearlyCompare from "./YearlyCompare";

// ---- The two portfolios that can be compared ----
const MODES: { value: Mode; label: string }[] = [
  { value: "buy_hold", label: "Buy & Hold" },
  { value: "strategy", label: "SMA strategy" },
];

type Props = {
  summary: Summary;
  files: SymbolFiles; // the <SYMBOL>.json files that are loaded
  slots: (string | null)[]; // the picked symbol of every colour slot (null: the slot is free)
  onToggle: (symbol: string) => void; // picks or removes a symbol
  mode: Mode;
  onModeChange: (mode: Mode) => void;
  range: DateRange; // the selected date range
  dataRange: DateRange; // first and last day of the data
  onRangeChange: (range: DateRange) => void;
};

// Compare view: several symbols in one chart and in the same tables.
export default function Compare(props: Props) {
  const { summary, files, slots, onToggle, mode, onModeChange, range, dataRange, onRangeChange } = props;
  const modeName = mode === "strategy" ? "SMA strategy" : "Buy & Hold";

  // ---- The range in use ----
  // A symbol that was listed later has no data at the start of a long range. The range in
  // use therefore starts on the latest first data day of the picked symbols, so that every
  // line starts at 100 on the same day.
  const lateSymbols = summary.symbols.filter((item) => slots.includes(item.symbol) && item.start > range.from);
  const latestStart = lateSymbols.map((item) => item.start).sort().reverse()[0]; // undefined: no late symbol
  const usedRange: DateRange = latestStart ? { from: latestStart, to: range.to } : range;

  // ---- Picked symbols whose file is loaded, in the order of their colour slots ----
  // The colour belongs to the slot, so removing one symbol does not repaint the others.
  const picked: PickedSymbol[] = [];
  slots.forEach((symbol, slot) => {
    const info = summary.symbols.find((item) => item.symbol === symbol);
    const data = symbol ? files[symbol] : undefined;
    if (info && data) {
      picked.push({ info, data, color: slotColor(slot), rows: rowsInRange(data.daily, usedRange) });
    }
  });
  const pickedCount = slots.filter((symbol) => symbol !== null).length;
  // While a picked file is still loading, the symbols that are ready stay on screen (dimmed).
  const loading = picked.length < pickedCount;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Compare symbols</h1>
        <p className="mt-2 max-w-3xl text-ink-2">
          {`Pick up to ${slots.length} symbols and a date range. Every line starts at 100, so symbols with very different prices can be compared.`}
        </p>
      </header>

      {/* ---- Controls: one block above everything they change ---- */}
      <section aria-label="Compare settings" className="space-y-4 rounded-2xl border border-line bg-surface p-4 sm:p-6">
        <div>
          <p className="mb-3 text-sm font-medium">
            Symbols <span className="font-normal text-ink-2">{`· ${pickedCount} of ${slots.length} picked`}</span>
          </p>
          <SymbolChips symbols={summary.symbols} slots={slots} onToggle={onToggle} />
        </div>
        <div className="flex flex-wrap items-end gap-x-8 gap-y-3 border-t border-line pt-4">
          <div>
            <p className="mb-1 text-xs text-ink-2">Portfolio</p>
            <Segmented label="Portfolio to compare" options={MODES} value={mode} onChange={onModeChange} />
          </div>
          <RangeBar range={range} dataRange={dataRange} onChange={onRangeChange} />
        </div>
      </section>

      {/* ---- Nothing to show yet ---- */}
      {pickedCount === 0 && <p>Pick at least one symbol.</p>}
      {pickedCount > 0 && picked.length === 0 && <p>Loading data…</p>}

      {picked.length > 0 && (
        <div aria-busy={loading} className={`space-y-6 transition-opacity ${loading ? "opacity-50" : ""}`}>
          {/* ---- The selected range: return tiles, overlay chart and table ---- */}
          {picked.some((item) => item.rows.length < 2) ? (
            <p>The picked symbols have fewer than two trading days together in the selected range. Please pick a later or longer range.</p>
          ) : (
            <>
              <section>
                <h2 className="font-semibold">
                  {`${modeName} return from ${formatDate(picked[0].rows[0].date)} to ${formatDate(picked[0].rows[picked[0].rows.length - 1].date)}`}
                </h2>
                {/* A late symbol moved the start of the range: say so. */}
                {latestStart && (
                  <p className="mt-1 text-sm text-ink-2">
                    {`The range starts on ${formatDate(latestStart)}, the first day that every picked symbol has data.`}
                  </p>
                )}
                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                  {picked.map((item) => {
                    const change = rangeReturn(item.rows, mode);
                    return (
                      <StatTile
                        key={item.info.symbol}
                        label={item.info.symbol}
                        color={item.color}
                        value={formatPercent(change, 2, true)}
                        tone={change}
                        note={`100 → ${formatNumber(100 + change)}`}
                      />
                    );
                  })}
                </div>
              </section>
              <GrowthChart picked={picked} mode={mode} modeName={modeName} />
              <RangeTable picked={picked} mode={mode} modeName={modeName} lastDataDay={dataRange.to} />
            </>
          )}

          {/* ---- The full period: yearly returns and metrics ---- */}
          <YearlyCompare picked={picked} mode={mode} dataRange={dataRange} />
          <RiskTable picked={picked} mode={mode} modeName={modeName} dataRange={dataRange} params={summary.params} />
        </div>
      )}
    </div>
  );
}
