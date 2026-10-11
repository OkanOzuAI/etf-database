import type { ReactNode } from "react";
import { formatNumber, formatRate } from "@/lib/format";
import type { Params, Portfolio } from "@/lib/types";

// The addresses the data is downloaded from. <SYMBOL> stands for a symbol such as SPY or QQQ.
const YAHOO_URL = "https://query1.finance.yahoo.com/v8/finance/chart/<SYMBOL>";
const TEFAS_URL = "https://www.tefas.gov.tr/api/funds/fonFiyatBilgiGetir";

// Where the longer documents are (the public repository of the project)
const DOCS_URL = "https://github.com/OkanOzuAI/etf-database/blob/main/docs";

// A short list with a heading.
function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-surface p-4 sm:p-6">
      <h2 className="font-semibold">{title}</h2>
      <ul className="mt-3 list-disc space-y-2 pl-5 text-sm">{children}</ul>
    </section>
  );
}

type Props = {
  params: Params; // settings of the pipeline (summary.json)
  settings: Portfolio["settings"]; // settings of the portfolio algorithm (portfolio.json)
};

// Method view: data sources, cleaning steps, the portfolio rules, the trend signal and the assumptions.
// The numbers (years, SMA days, limits, commission, capital) come from the settings in the JSON files.
export default function Method({ params, settings }: Props) {
  const short = params.sma_short;
  const long = params.sma_long;
  const capital = formatNumber(params.initial_capital, 0);
  const maxWeight = formatRate(settings.max_weight);
  const minMarket = formatRate(settings.min_market_weight);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Method</h1>
        <p className="mt-2 max-w-3xl text-ink-2">Where the data comes from and how the numbers on this site are calculated.</p>
      </header>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Section title="Data sources and download">
          <li>
            {"US-listed ETFs and the USD/TRY exchange rate come from Yahoo Finance's public chart address:"}
            {/* The address has its own line; it may break at any letter so it fits a narrow screen. */}
            <code className="my-1 block text-xs break-all">{YAHOO_URL}</code>
          </li>
          <li>
            {"Turkish funds come from the public data address of TEFAS:"}
            <code className="my-1 block text-xs break-all">{TEFAS_URL}</code>
          </li>
          <li>{`scripts/fetch_data.py downloads daily data with requests and turns it into a pandas DataFrame: the last ${params.years} years from Yahoo and the last ${params.tefas_months / 12} years from TEFAS (TEFAS does not give more). No API key, no account and no ready-made data library is used.`}</li>
          <li>{"There is a pause between requests, and a failed request is tried again. If something cannot be downloaded, the pipeline stops and publishes nothing."}</li>
          <li>{"This page does not fetch live data. It only reads the JSON files produced by the pipeline."}</li>
        </Section>

        <Section title="Cleaning (scripts/clean_data.py)">
          <li>{"The same rules are used for every source."}</li>
          <li>{"The date column becomes a datetime index; repeated days are removed and the rows are sorted by date."}</li>
          <li>{"All columns are converted to numbers; zero or negative prices are treated as invalid."}</li>
          <li>{"Missing prices are filled with the last known price (forward-fill), so no future information is used."}</li>
          <li>{"If there is no adjusted close column, the close price is used. TEFAS gives one price per day: the closing price on the exchange for an ETF, the fund share price for a mutual fund. Both come from the market of the trading day before."}</li>
        </Section>

        <div className="md:col-span-2">
          <Section title="Portfolio: the weekly decision (scripts/portfolio.py)">
            <li>{"Every Friday the algorithm uses the prices up to that day. The new weights apply from the next trading day. Later prices cannot enter a decision."}</li>
            <li>{`Only price signals are used. Trend: a fund is in an uptrend if SMA${settings.sma_short} is above SMA${settings.sma_long}. Volatility: the standard deviation of the last ${settings.vol_window} daily returns, as a yearly value. Both are computed in the fund's own currency.`}</li>
            <li>{`A fund in an uptrend gets a weight in proportion to 1 / volatility, so calmer funds get more. A volatility below ${formatRate(settings.vol_floor)} is counted as ${formatRate(settings.vol_floor)}. A fund that is not in an uptrend gets no weight.`}</li>
            <li>{`No fund can be more than ${maxWeight} of the portfolio. The part above ${maxWeight} goes to the other holdings.`}</li>
            <li>{`Each market (Türkiye and the United States) holds at least ${minMarket}. If a market has no fund in an uptrend, its calmest fund is held, because the portfolio must stay invested in both markets.`}</li>
            <li>{"What the rules cannot give to a fund stays in cash (lira). Weights are never negative and never add up to more than 100%, so there is no short selling and no borrowing."}</li>
            <li>{"The portfolio is reported in Turkish lira. The USD/TRY rate is used only to value US holdings in lira; it is not a signal."}</li>
            <li>
              {"The rules, the pseudocode and the computational cost are described in "}
              <a className="text-accent underline" href={`${DOCS_URL}/portfolio_rules.md`}>
                portfolio_rules.md
              </a>
              {"; the data is described in "}
              <a className="text-accent underline" href={`${DOCS_URL}/data_dictionary.md`}>
                data_dictionary.md
              </a>
              {"."}
            </li>
          </Section>
        </div>

        <Section title="The trend signal on one fund (Funds and Details views)">
          <li>{`If the ${short}-day average (SMA${short}) is above the ${long}-day average (SMA${long}), the strategy holds the fund; otherwise it stays in cash.`}</li>
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
            <li>{`In the test of one fund the starting capital is ${capital} in the fund's own currency (US dollar or Turkish lira); each trade uses all of the capital.`}</li>
            <li>{"Returns of US ETFs are in dollars and returns of Turkish funds are in lira, so they cannot be compared directly."}</li>
            <li>{"All calculations use the adjusted close (for US ETFs it includes dividends and splits). A trade is made at the closing price of the day the signal appears; returns start on the next trading day."}</li>
            <li>{"This is a simplification: an order for a mutual fund is filled at the next fund price, and an ETF order after the close is filled on the next trading day. So the test of one fund is a first look at the signal and not a simulation of real trading."}</li>
            <li>{"Bid-ask spread, slippage and taxes are ignored; cash earns no interest."}</li>
            <li>{`Until SMA${long} exists (the first ${long} trading days) the strategy stays in cash, while Buy & Hold is invested from day one.`}</li>
            <li>{"Buy and sell markers on the price chart show the day the signal appeared."}</li>
            <li>{"The Sharpe ratio uses a risk-free rate of 0. A year is counted as 252 trading days."}</li>
            <li>{`Turkish funds have ${params.tefas_months / 12} years of data. Their numbers cover only these years, and a comparison starts on the first day that every picked symbol has data.`}</li>
            <li>{"In the Compare view every line starts at 100 on the first day of the selected range, so symbols with very different prices can be compared."}</li>
            <li>{"Trailing returns (1M, 1Y, ...) and the calendar-year returns of a symbol are price returns (adjusted close), without commission. The calendar-year returns of the strategy come from its portfolio value, so they include commission."}</li>
            <li>{"The portfolio page shows target weights only. Trading costs, settlement days and the time between a decision and its execution are not simulated yet."}</li>
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
