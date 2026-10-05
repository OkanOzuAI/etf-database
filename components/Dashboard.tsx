"use client";
// "use client": this file and the components it imports run in the browser (useState, useEffect, fetch).

import { useEffect, useRef, useState } from "react";
import type { DateRange, Mode, Summary, SymbolData, SymbolFiles, SymbolSummary, View } from "@/lib/types";
import Compare from "./Compare";
import Details from "./Details";
import Method from "./Method";
import Overview from "./Overview";
import TopBar from "./TopBar";

const MAX_PICKS = 5; // Compare: one colour slot per picked symbol (--series-1 ... --series-5)
const DEFAULT_PICKS = ["SPY", "QQQ", "GLD", "TLT"]; // Compare: the symbols picked at the start

// Downloads one JSON file. Throws an error if the server answers with an error code.
async function loadJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`${url} could not be loaded (HTTP ${response.status})`);
  }
  return response.json();
}

// Compare starts with the default symbols if the data has all of them, else with the first four.
// The list has one place per colour slot; null means the slot is free.
function defaultSlots(symbols: SymbolSummary[]): (string | null)[] {
  const all = symbols.map((item) => item.symbol);
  const hasDefaults = DEFAULT_PICKS.every((symbol) => all.includes(symbol));
  const picks = hasDefaults ? DEFAULT_PICKS : all.slice(0, 4);
  return Array.from({ length: MAX_PICKS }, (_, slot) => picks[slot] ?? null);
}

// Entry of the page: loads summary.json once, then shows the site.
export default function Dashboard() {
  const [summary, setSummary] = useState<Summary | null>(null); // summary.json
  const [failed, setFailed] = useState(false); // could the file not be loaded?

  useEffect(() => {
    loadJson<Summary>("/data/summary.json")
      .then((data) => {
        if (data.symbols.length === 0) {
          throw new Error("summary.json has no symbols");
        }
        setSummary(data);
      })
      .catch(() => setFailed(true));
  }, []);

  // ---- Plain text for the first load and for an error ----
  if (failed || !summary) {
    return (
      <p className="mx-auto max-w-[1150px] px-4 py-10 sm:px-6">
        {failed ? "The data could not be loaded." : "Loading data…"}
      </p>
    );
  }
  return <Site summary={summary} />;
}

// The site: top bar and the four views. It keeps everything the views share:
// the open view, the date range, the picked symbols and the loaded symbol files.
function Site({ summary }: { summary: Summary }) {
  const { symbols } = summary;

  // ---- Data range: the earliest first day and the latest last day of all symbols ----
  // Dates like "2016-10-05" are in date order when they are sorted as text.
  const dataRange: DateRange = {
    from: symbols.map((item) => item.start).sort()[0],
    to: symbols.map((item) => item.end).sort().reverse()[0],
  };

  // ---- State ----
  const [view, setView] = useState<View>("overview"); // the view on screen
  const [range, setRange] = useState(dataRange); // date range of Compare and Details (at first: all data)
  const [mode, setMode] = useState<Mode>("buy_hold"); // Compare: which portfolio is compared
  const [slots, setSlots] = useState(() => defaultSlots(symbols)); // Compare: picked symbol per colour slot
  const [selected, setSelected] = useState(symbols[0].symbol); // Details: the chosen symbol
  const [previous, setPrevious] = useState(selected); // Details: the symbol shown before the chosen one
  const [files, setFiles] = useState<SymbolFiles>({}); // loaded <SYMBOL>.json files, kept in memory
  const [failed, setFailed] = useState(false); // could a file not be loaded?
  const requested = useRef(new Set<string>()); // symbols whose file was already requested

  // ---- Load the files that the open view needs. Every file is requested only once. ----
  useEffect(() => {
    let needed: (string | null)[] = [];
    if (view === "compare") needed = slots;
    if (view === "details") needed = [selected];

    for (const symbol of needed) {
      if (symbol === null || requested.current.has(symbol)) continue;
      requested.current.add(symbol);
      loadJson<SymbolData>(`/data/${symbol}.json`)
        .then((data) => setFiles((loaded) => ({ ...loaded, [symbol]: data })))
        .catch(() => setFailed(true));
    }
  }, [view, slots, selected]);

  // ---- Actions ----

  // Opens a view and scrolls back to the top of the page.
  function openView(next: View) {
    setView(next);
    window.scrollTo(0, 0);
  }

  // Details: chooses a symbol. The symbol on screen is remembered, so it can stay visible
  // while the file of the new one loads.
  function selectSymbol(symbol: string) {
    if (files[selected]) setPrevious(selected);
    setSelected(symbol);
  }

  // Compare: picks a symbol or removes it. A new symbol gets the lowest free colour slot;
  // the other symbols keep their slots, so their colours do not change.
  function togglePick(symbol: string) {
    const next = [...slots];
    const slot = slots.indexOf(symbol);
    if (slot >= 0) {
      next[slot] = null; // remove: its slot becomes free
    } else {
      const free = slots.indexOf(null);
      if (free < 0) return; // every slot is taken
      next[free] = symbol;
    }
    setSlots(next);
  }

  return (
    <>
      <TopBar view={view} onChange={openView} />

      <main className="mx-auto max-w-[1150px] px-4 py-6 sm:px-6 sm:py-10">
        {failed && <p>The data could not be loaded.</p>}

        {!failed && view === "overview" && (
          <Overview
            summary={summary}
            dataRange={dataRange}
            onOpenView={openView}
            onOpenSymbol={(symbol) => {
              selectSymbol(symbol);
              openView("details");
            }}
          />
        )}
        {!failed && view === "compare" && (
          <Compare
            summary={summary}
            files={files}
            slots={slots}
            onToggle={togglePick}
            mode={mode}
            onModeChange={setMode}
            range={range}
            dataRange={dataRange}
            onRangeChange={setRange}
          />
        )}
        {!failed && view === "details" && (
          <Details
            summary={summary}
            selected={selected}
            // While the file of the chosen symbol loads, the symbol before it stays on screen.
            data={files[selected] ?? files[previous]}
            onSelect={selectSymbol}
            range={range}
            dataRange={dataRange}
            onRangeChange={setRange}
          />
        )}
        {!failed && view === "method" && <Method params={summary.params} />}
      </main>
    </>
  );
}
