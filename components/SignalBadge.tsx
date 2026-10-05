import type { SignalLabel } from "@/lib/types";

// Colours of the four signal labels. BUY is green and SELL is red; HOLD and WAIT are calm.
// The badge always shows the word too, so the meaning is never in the colour alone.
const STYLES: Record<SignalLabel, string> = {
  BUY: "border-good/40 bg-good/10 text-good-text",
  HOLD: "border-accent/30 bg-accent-soft text-accent",
  SELL: "border-critical/40 bg-critical/10 text-critical-text",
  WAIT: "border-line bg-track text-ink-2",
};

type Props = {
  label: SignalLabel;
  large?: boolean; // the big badge of the signal card
};

// Pill-shaped badge with the signal label of a symbol.
export default function SignalBadge({ label, large = false }: Props) {
  const size = large ? "px-5 py-1.5 text-xl" : "px-2.5 py-0.5 text-xs";
  return (
    <span className={`inline-block rounded-full border font-semibold tracking-wide ${size} ${STYLES[label]}`}>
      {label}
    </span>
  );
}
