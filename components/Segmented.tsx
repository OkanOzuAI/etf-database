type Option<T> = {
  value: T;
  label: string;
};

type Props<T> = {
  label: string; // name of the control for screen readers
  options: Option<T>[];
  value: T | null; // the selected option (null: none is selected)
  onChange: (value: T) => void;
};

// A row of buttons where one is selected. Used for the view tabs, the range presets,
// the group filter, the Compare mode and the period tabs.
// T is the type of the option values, so onChange gives back exactly one of them.
export default function Segmented<T extends string>({ label, options, value, onChange }: Props<T>) {
  return (
    // On a narrow screen the row scrolls sideways inside its own box instead of the page.
    <div role="group" aria-label={label} className="flex max-w-full gap-0.5 overflow-x-auto rounded-xl bg-track p-1">
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(option.value)}
            className={`flex-1 rounded-lg px-3 py-1.5 text-sm whitespace-nowrap transition-colors ${
              selected ? "bg-thumb font-semibold text-accent shadow-sm" : "text-ink-2 hover:text-ink"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
