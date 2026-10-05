import { formatDate, formatDollar } from "@/lib/format";
import type { DailyRow, Params, SignalLabel, SymbolSummary } from "@/lib/types";
import AdviceNote from "./AdviceNote";
import SignalBadge from "./SignalBadge";

// One plain sentence for each label. short and long are the names of the two averages
// with the current settings, for example "SMA50" and "SMA200".
function explain(label: SignalLabel, short: string, long: string): string {
  if (label === "BUY") return `${short} moved above ${long} at the last close, so the rule says: buy.`;
  if (label === "HOLD") return `${short} is above ${long}, so the rule says: stay in the position.`;
  if (label === "SELL") return `${short} moved below ${long} at the last close, so the rule says: sell and go to cash.`;
  return `${short} is below ${long}, so the rule says: stay in cash.`;
}

// An average in dollars, or a dash if it does not exist yet (not enough days of data).
function formatAverage(value: number | null): string {
  return value === null ? "–" : formatDollar(value);
}

type Props = {
  info: SymbolSummary;
  lastDay: DailyRow; // the last row of the daily data
  params: Params;
};

// Signal card: what the SMA rule says after the last close, as a large badge with one sentence.
// It always shows the latest data; the date range does not change it.
export default function SignalCard({ info, lastDay, params }: Props) {
  const short = `SMA${params.sma_short}`;
  const long = `SMA${params.sma_long}`;

  return (
    <section className="rounded-2xl border border-line bg-surface p-4 sm:p-6">
      <h2 className="text-sm text-ink-2">Signal after the last close ({formatDate(info.end)})</h2>

      <div className="mt-3 flex flex-wrap items-center gap-x-8 gap-y-4">
        {/* ---- The label and the day it started ---- */}
        <div className="flex items-center gap-3">
          <SignalBadge label={info.recommendation} large />
          <span className="text-sm text-ink-2">since {formatDate(info.signal_since)}</span>
        </div>

        {/* ---- The sentence with the disclaimer beside it, and the three numbers behind the signal ---- */}
        <div className="min-w-0 flex-1 basis-80">
          <p className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <span>{explain(info.recommendation, short, long)}</span>
            <AdviceNote />
          </p>
          <p className="mt-2 text-sm text-ink-2">
            {`Last close: ${formatDollar(lastDay.price)} · ${short}: ${formatAverage(lastDay.sma_short)} · ${long}: ${formatAverage(lastDay.sma_long)}`}
          </p>
        </div>
      </div>
    </section>
  );
}
