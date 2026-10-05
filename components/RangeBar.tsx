import { useState } from "react";
import { yearsBefore } from "@/lib/range";
import type { DateRange } from "@/lib/types";
import Segmented from "./Segmented";

const PRESET_YEARS = [1, 3, 5]; // the "1Y", "3Y" and "5Y" buttons

const INPUT_CLASS = "mt-1 block rounded-lg border border-line bg-surface px-2.5 py-1.5 text-base text-ink sm:text-sm";

type Props = {
  range: DateRange; // the range in use
  dataRange: DateRange; // first and last day of the data
  onChange: (range: DateRange) => void;
};

// Date range control: preset buttons and two date inputs for a custom range.
// It is shared by the Compare and the Details view.
export default function RangeBar({ range, dataRange, onChange }: Props) {
  // Text of the two date inputs while the typed range is not valid yet (see changeDate).
  const [draft, setDraft] = useState<DateRange | null>(null);
  const shown = draft ?? range;

  // ---- Presets ----
  // Every preset ends on the last data day; its value is the day it starts.
  // A preset that is longer than the data is left out.
  const presets = PRESET_YEARS.map((years) => ({ value: yearsBefore(dataRange.to, years), label: `${years}Y` }))
    .filter((preset) => preset.value > dataRange.from)
    .concat({ value: dataRange.from, label: "All" });
  // A preset is marked as selected when the range in use is exactly that preset.
  const selectedPreset = range.to === dataRange.to ? range.from : null;

  // ---- Custom range ----
  // A typed date is used only if it gives a valid range: inside the data and "From" not
  // after "To". Until then the text is kept as a draft, so typing is not interrupted and
  // the charts keep the old range.
  function changeDate(field: "from" | "to", value: string) {
    const next = { ...shown, [field]: value };
    const valid = next.from >= dataRange.from && next.to <= dataRange.to && next.from <= next.to;
    if (valid) {
      onChange(next);
      setDraft(null);
    } else {
      setDraft(next);
    }
  }

  return (
    <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
      <div>
        <p className="mb-1 text-xs text-ink-2">Date range</p>
        <Segmented
          label="Date range presets"
          options={presets}
          value={selectedPreset}
          onChange={(from) => {
            onChange({ from, to: dataRange.to });
            setDraft(null);
          }}
        />
      </div>
      {/* Leaving an input drops a draft that was not valid: the input shows the old date again. */}
      <label className="text-xs text-ink-2">
        From
        <input
          type="date"
          className={INPUT_CLASS}
          value={shown.from}
          min={dataRange.from}
          max={range.to}
          onChange={(event) => changeDate("from", event.target.value)}
          onBlur={() => setDraft(null)}
        />
      </label>
      <label className="text-xs text-ink-2">
        To
        <input
          type="date"
          className={INPUT_CLASS}
          value={shown.to}
          min={range.from}
          max={dataRange.to}
          onChange={(event) => changeDate("to", event.target.value)}
          onBlur={() => setDraft(null)}
        />
      </label>
    </div>
  );
}
