import { formatDate, formatDollar, formatNumber, formatPercent } from "@/lib/format";
import { rangeReturn, rowsInRange } from "@/lib/range";
import type { DateRange, Params, Summary, SymbolData, SymbolSummary } from "@/lib/types";
import EquityChart from "./EquityChart";
import MetricsTable from "./MetricsTable";
import PriceChart from "./PriceChart";
import RangeBar from "./RangeBar";
import ReturnsChart from "./ReturnsChart";
import SignalCard from "./SignalCard";
import StatTile from "./StatTile";
import YearlyTable from "./YearlyTable";

type Props = {
  summary: Summary;
  selected: string; // the symbol chosen in the picker
  data: SymbolData | undefined; // the file on screen: the chosen symbol, or the one before it while the new file loads
  onSelect: (symbol: string) => void;
  range: DateRange; // the selected date range
  dataRange: DateRange; // first and last day of the data
  onRangeChange: (range: DateRange) => void;
};

// Details view: the signal, the charts and the tables of one symbol.
export default function Details({ summary, selected, data, onSelect, range, dataRange, onRangeChange }: Props) {
  const { params, symbols } = summary;
  const groups = [...new Set(symbols.map((item) => item.group))]; // group names in data order
  const info = symbols.find((item) => item.symbol === data?.symbol); // summary row of the symbol on screen
  const loading = data?.symbol !== selected; // the file of the chosen symbol is still loading

  return (
    <div className="space-y-6">
      {/* ---- Controls: one block above everything they change ---- */}
      <section
        aria-label="Details settings"
        className="flex flex-wrap items-end gap-x-8 gap-y-3 rounded-2xl border border-line bg-surface p-4 sm:px-6"
      >
        <label className="w-full text-xs text-ink-2 sm:w-auto">
          Symbol
          {/* A native select: it stays small with many symbols and is easy to use on a phone. */}
          <span className="relative mt-1 block">
            <select
              value={selected}
              onChange={(event) => onSelect(event.target.value)}
              className="w-full appearance-none rounded-lg border border-line bg-surface py-1.5 pr-9 pl-3 text-base font-semibold text-ink sm:w-72 sm:text-sm"
            >
              {groups.map((group) => (
                <optgroup key={group} label={group}>
                  {symbols
                    .filter((item) => item.group === group)
                    .map((item) => (
                      <option key={item.symbol} value={item.symbol}>
                        {`${item.symbol} · ${item.name}`}
                      </option>
                    ))}
                </optgroup>
              ))}
            </select>
            {/* The arrow of the select */}
            <svg
              width="12"
              height="12"
              viewBox="0 0 12 12"
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-ink-2"
            >
              <path d="M2 4.5 6 8.5 10 4.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </span>
        </label>
        <RangeBar range={range} dataRange={dataRange} onChange={onRangeChange} />
      </section>

      {/* ---- First load: nothing to show yet ---- */}
      {(!data || !info) && <p>Loading data…</p>}

      {data && info && (
        // While another symbol loads, the previous one stays on screen (dimmed).
        <div aria-busy={loading} className={`space-y-6 transition-opacity ${loading ? "opacity-50" : ""}`}>
          {/* ---- Which symbol this is ---- */}
          <header>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              {info.symbol} <span className="font-normal text-ink-2">{info.name}</span>
            </h1>
            <p className="mt-1 text-sm text-ink-2">{info.group}</p>
          </header>

          <SignalCard info={info} lastDay={data.daily[data.daily.length - 1]} params={params} />

          <RangeSections info={info} data={data} range={range} params={params} />

          {/* ---- The full period: metrics and yearly returns (side by side on a wide screen) ---- */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <MetricsTable info={info} params={params} />
            <YearlyTable info={info} data={data} />
          </div>
        </div>
      )}
    </div>
  );
}

type RangeProps = {
  info: SymbolSummary;
  data: SymbolData;
  range: DateRange;
  params: Params;
};

// The sections that follow the selected date range: return tiles and the three charts.
function RangeSections({ info, data, range, params }: RangeProps) {
  const rows = rowsInRange(data.daily, range);
  if (rows.length < 2) {
    return <p>This symbol has fewer than two trading days in the selected range. Please pick a later or longer range.</p>;
  }

  // ---- Returns in the range: last value / first value - 1 ----
  const strategyReturn = rangeReturn(rows, "strategy");
  const buyHoldReturn = rangeReturn(rows, "buy_hold");
  const capital = params.initial_capital;

  // ---- Which one was better in the range (compared with two decimals, as shown) ----
  const gap = Number((strategyReturn - buyHoldReturn).toFixed(2));
  let better = "Same return";
  if (gap > 0) better = "SMA strategy";
  if (gap < 0) better = "Buy & Hold";

  return (
    <>
      <section>
        <h2 className="font-semibold">
          {`Return from ${formatDate(rows[0].date)} to ${formatDate(rows[rows.length - 1].date)}`}
        </h2>
        <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-3">
          <StatTile
            label="SMA strategy"
            value={formatPercent(strategyReturn, 2, true)}
            tone={strategyReturn}
            note={`${formatDollar(capital, 0)} → ${formatDollar(capital * (1 + strategyReturn / 100))}`}
          />
          <StatTile
            label="Buy & Hold"
            value={formatPercent(buyHoldReturn, 2, true)}
            tone={buyHoldReturn}
            note={`${formatDollar(capital, 0)} → ${formatDollar(capital * (1 + buyHoldReturn / 100))}`}
          />
          <div className="col-span-2 lg:col-span-1">
            <StatTile
              label="Better in this range"
              value={better}
              note={gap === 0 ? "to two decimals" : `by ${formatNumber(Math.abs(gap))} percentage points`}
            />
          </div>
        </div>
      </section>

      <PriceChart symbol={info.symbol} rows={rows} signals={data.signals} params={params} />
      <EquityChart rows={rows} params={params} />
      <ReturnsChart symbol={info.symbol} returns={data.returns} rows={rows} />
    </>
  );
}
