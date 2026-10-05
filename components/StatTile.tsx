import { ColorKey, toneClass } from "./TableParts";

type Props = {
  label: string;
  value: string;
  note?: string; // small line under the value
  color?: string; // colour key in front of the label (Compare view)
  tone?: number; // a change: its sign colours the value green or red
};

// One number with a label: used for the summary tiles and the range returns.
export default function StatTile({ label, value, note, color, tone = 0 }: Props) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-3.5 sm:p-4">
      <p className="flex items-center gap-2 text-sm text-ink-2">
        {color && <ColorKey color={color} />}
        {label}
      </p>
      <p className={`mt-1 text-xl font-semibold sm:text-2xl ${toneClass(tone)}`}>{value}</p>
      {note && <p className="mt-1 text-xs text-ink-2">{note}</p>}
    </div>
  );
}
