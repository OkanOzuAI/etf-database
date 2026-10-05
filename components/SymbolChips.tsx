import type { SymbolSummary } from "@/lib/types";

// CSS colour of a colour slot: slot 0 -> var(--series-1) ... slot 4 -> var(--series-5).
export function slotColor(slot: number): string {
  return `var(--series-${slot + 1})`;
}

type Props = {
  symbols: SymbolSummary[];
  slots: (string | null)[]; // the picked symbol of every colour slot (null: the slot is free)
  onToggle: (symbol: string) => void;
};

// Chips to pick the symbols of the Compare view. The chips are sorted into their groups.
export default function SymbolChips({ symbols, slots, onToggle }: Props) {
  const groups = [...new Set(symbols.map((item) => item.group))]; // group names in data order
  const full = !slots.includes(null); // every colour slot is taken

  return (
    // Phone: one row that scrolls sideways inside its own box. Wider screens: the groups wrap.
    <div className="flex gap-x-5 gap-y-3 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible sm:pb-0">
      {groups.map((group) => (
        <div key={group} role="group" aria-label={group} className="shrink-0">
          <p className="mb-1.5 text-xs text-ink-2">{group}</p>
          <div className="flex gap-1.5">
            {symbols
              .filter((item) => item.group === group)
              .map((item) => {
                const slot = slots.indexOf(item.symbol); // -1: not picked
                const isPicked = slot >= 0;
                return (
                  <button
                    key={item.symbol}
                    type="button"
                    title={item.name}
                    aria-pressed={isPicked}
                    disabled={!isPicked && full} // five are picked: one must be removed first
                    onClick={() => onToggle(item.symbol)}
                    className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-40 ${
                      isPicked
                        ? "border-accent/40 bg-accent-soft text-ink"
                        : "border-line bg-surface text-ink-2 hover:text-ink"
                    }`}
                  >
                    {/* The dot has the colour of the symbol's line; an empty ring means "not picked". */}
                    <span
                      aria-hidden="true"
                      className={`size-2 rounded-full ${isPicked ? "" : "border border-axis"}`}
                      style={isPicked ? { background: slotColor(slot) } : undefined}
                    />
                    {item.symbol}
                  </button>
                );
              })}
          </div>
        </div>
      ))}
    </div>
  );
}
