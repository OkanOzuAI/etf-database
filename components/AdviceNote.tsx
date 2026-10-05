// The small "Not investment advice" pill. It is shown in the top bar of every view
// and beside the signal in the Details view.
export default function AdviceNote() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-line px-2 py-1 text-[11px] font-medium whitespace-nowrap text-ink-2 sm:px-2.5 sm:text-xs">
      {/* Info sign: a circle with the letter "i" (left out on a phone to save room) */}
      <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true" className="hidden sm:block">
        <circle cx="6" cy="6" r="5.25" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <rect x="5.25" y="5" width="1.5" height="4" fill="currentColor" />
        <rect x="5.25" y="2.75" width="1.5" height="1.5" fill="currentColor" />
      </svg>
      Not investment advice
    </span>
  );
}
