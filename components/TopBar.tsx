import type { View } from "@/lib/types";
import AdviceNote from "./AdviceNote";
import Segmented from "./Segmented";

// ---- The four views and their tab names ----
const VIEWS: { value: View; label: string }[] = [
  { value: "overview", label: "Overview" },
  { value: "compare", label: "Compare" },
  { value: "details", label: "Details" },
  { value: "method", label: "Method" },
];

type Props = {
  view: View; // the view on screen
  onChange: (view: View) => void;
};

// Top bar: site name, view tabs and the "Not investment advice" note.
// It stays at the top while the page scrolls; its background is slightly see-through.
export default function TopBar({ view, onChange }: Props) {
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-page/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1150px] flex-wrap items-center gap-x-2 gap-y-2 px-4 py-2.5 sm:gap-x-6 sm:px-6">
        {/* ---- Site name: also a button that goes back to the Overview ---- */}
        <button
          type="button"
          onClick={() => onChange("overview")}
          className="flex items-center gap-2 text-sm font-semibold whitespace-nowrap sm:text-base"
        >
          <svg width="22" height="22" viewBox="0 0 32 32" aria-hidden="true">
            <rect width="32" height="32" rx="8" fill="var(--ink)" />
            <polyline
              points="6,22 13,15 18,19 26,9"
              fill="none"
              stroke="var(--page)"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          ETF &amp; Stock Database
        </button>

        {/* ---- Disclaimer: visible on every view ---- */}
        <div className="order-2 ml-auto sm:order-3">
          <AdviceNote />
        </div>

        {/* ---- View tabs: on a phone they get their own full-width row ---- */}
        <nav aria-label="Views" className="order-3 w-full sm:order-2 sm:w-auto">
          <Segmented label="View" options={VIEWS} value={view} onChange={onChange} />
        </nav>
      </div>
    </header>
  );
}
