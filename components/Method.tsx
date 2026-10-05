import type { ReactNode } from "react";
import { formatDollar, formatRate } from "@/lib/format";
import type { Params } from "@/lib/types";

// The address the data is downloaded from. <SYMBOL> stands for a symbol such as SPY or QQQ.
const SOURCE_URL = "https://query1.finance.yahoo.com/v8/finance/chart/<SYMBOL>";

// A short list with a heading.
function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-surface p-4 sm:p-6">
      <h2 className="font-semibold">{title}</h2>
      <ul className="mt-3 list-disc space-y-2 pl-5 text-sm">{children}</ul>
    </section>
  );
}

// Method view: data source, cleaning steps, the strategy rule, the signal labels and the assumptions.
// The numbers (years, SMA days, commission, capital) come from the settings in summary.json.
export default function Method({ params }: { params: Params }) {
  const short = params.sma_short;
  const long = params.sma_long;
  const capital = formatDollar(params.initial_capital, 0);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Method</h1>
        <p className="mt-2 max-w-3xl text-ink-2">Where the data comes from and how the numbers on this site are calculated.</p>
      </header>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Section title="Data source and download">
          <li>
            {"Prices come from Yahoo Finance's public chart address:"}
            {/* The address has its own line; it may break at any letter so it fits a narrow screen. */}
            <code className="my-1 block text-xs break-all">{SOURCE_URL}</code>
            {"No API key, no account and no ready-made data library is used."}
          </li>
          <li>{`scripts/fetch_data.py downloads the last ${params.years} years of daily data (open, high, low, close, adjusted close, volume) as JSON with requests and turns it into a pandas DataFrame.`}</li>
          <li>{"There is a short pause between requests, and a failed request is tried again. If one symbol cannot be downloaded, a warning is printed and the script continues with the others."}</li>
          <li>{"This page does not fetch live data. It only reads the JSON files produced by the pipeline."}</li>
        </Section>

        <Section title="Cleaning (scripts/clean_data.py)">
          <li>{"The date column becomes a datetime index; repeated days are removed and the rows are sorted by date."}</li>
          <li>{"All columns are converted to numbers; zero or negative prices are treated as invalid."}</li>
          <li>{"Missing prices are filled with the last known price (forward-fill), so no future information is used."}</li>
          <li>{"If there is no adjusted close column, the close price is used."}</li>
        </Section>

        <Section title="Strategy">
          <li>{`If the ${short}-day average (SMA${short}) is above the ${long}-day average (SMA${long}), the strategy holds the symbol; otherwise it stays in cash.`}</li>
          <li>{"The signal is shifted by one day: today's position is decided by the signal at yesterday's close. This avoids look-ahead bias."}</li>
          <li>{`A ${formatRate(params.commission)} commission is paid on every buy and sell.`}</li>
          <li>{"Benchmark: Buy & Hold, which buys on the first day and holds until the last day."}</li>
        </Section>

        <Section title="Signal label">
          <li>{"BUY: the signal turned on at the last close. HOLD: the signal was already on. SELL: the signal turned off at the last close. WAIT: the signal was already off, so the rule says stay in cash."}</li>
          <li>{"The label only repeats what the SMA rule says for the latest data. It is not investment advice."}</li>
        </Section>

        <div className="md:col-span-2">
          <Section title="Assumptions">
            <li>{`Starting capital is ${capital}; each trade uses all of the capital.`}</li>
            <li>{"All calculations use the adjusted close (it includes dividends and splits). A trade is made at the closing price of the day the signal appears; returns start on the next trading day."}</li>
            <li>{"Bid-ask spread, slippage and taxes are ignored; cash earns no interest."}</li>
            <li>{`Until SMA${long} exists (the first ${long} trading days) the strategy stays in cash, while Buy & Hold is invested from day one.`}</li>
            <li>{"Buy and sell markers on the price chart show the day the signal appeared."}</li>
            <li>{"The Sharpe ratio uses a risk-free rate of 0; 252 trading days are used to annualize."}</li>
            <li>{"In the Compare view every line starts at 100 on the first day of the selected range, so symbols with very different prices can be compared."}</li>
            <li>{"Trailing returns (1M, 1Y, ...) and calendar-year returns are price returns of the symbol (adjusted close), without commission."}</li>
          </Section>
        </div>
      </div>

      <section className="rounded-2xl border border-line bg-surface p-4 sm:p-6">
        <h2 className="font-semibold">Disclaimer</h2>
        <p className="mt-3 text-sm">
          This project is homework for a course. It is not investment advice. Past performance does not guarantee future results.
        </p>
      </section>
    </div>
  );
}
