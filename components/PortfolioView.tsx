import { formatDate, formatDateTime, formatNumber, formatPercent, formatRate } from "@/lib/format";
import type { Holding, Portfolio, View } from "@/lib/types";
import Card from "./Card";
import StatTile from "./StatTile";
import { ColorKey, HeadCell, Table, ValueCell } from "./TableParts";
import WeightsChart from "./WeightsChart";
import type { Part } from "./WeightsChart";

const CASH: Part = { key: "CASH", label: "Cash", color: "var(--axis)" };
const MARKET_COLORS = ["var(--series-1)", "var(--series-2)"]; // one colour per market, in data order

// The table has six columns: Fund, Type, Trend, Volatility, Weight, Change.
// A narrow screen (below 768 px) only has room for Fund, Trend and Weight, so the cells of the other three are hidden there.
const WIDE_ONLY = "hidden md:table-cell";
const HEAD = "px-2.5 py-2 text-xs font-medium whitespace-nowrap text-ink-2"; // look of a header cell

type Props = {
  portfolio: Portfolio;
  onOpenSymbol: (symbol: string) => void; // a fund was selected: open its Details view
  onOpenView: (view: View) => void;
};

// Portfolio view: the last weekly decision (target weight of every fund), the share of
// each market and of cash, and how these shares changed over time.
export default function PortfolioView({ portfolio, onOpenSymbol, onOpenView }: Props) {
  const { holdings, settings, totals } = portfolio;
  const maxWeight = settings.max_weight * 100; // the cap in percent: a full weight bar

  // ---- Markets in data order, each with its colour ----
  const marketNames = [...new Set(holdings.map((item) => item.market))];
  const markets: Part[] = marketNames.map((name, i) => ({ key: name, label: name, color: MARKET_COLORS[i] }));
  const held = holdings.filter((item) => item.weight > 0);

  return (
    <div className="space-y-6">
      {/* ---- What the site is for and which decision is shown ---- */}
      <header>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-4xl">
          A weekly portfolio of Turkish funds and US ETFs
        </h1>
        <p className="mt-3 max-w-3xl text-ink-2 sm:text-lg">
          {`Every Friday a price-based algorithm decides which share of the portfolio goes to each of the ${holdings.length} funds below. A fund gets a weight only while its price is in an uptrend, and calmer funds get more. No fund can be more than ${formatRate(settings.max_weight)} of the portfolio, and each market keeps at least ${formatRate(settings.min_market_weight)}.`}
        </p>
        <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-2">
          <span>Decision day: {formatDate(portfolio.decision_day)}</span>
          <span>Applies from the next trading day</span>
          <span>Algorithm version {portfolio.version}</span>
          <span>Last update: {formatDateTime(portfolio.updated_at)}</span>
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => onOpenView("overview")}
            className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-page transition-opacity hover:opacity-90"
          >
            See the funds
          </button>
          <button
            type="button"
            onClick={() => onOpenView("method")}
            className="rounded-full border border-line bg-surface px-4 py-2 text-sm font-semibold transition-colors hover:bg-hover"
          >
            How it works
          </button>
        </div>
      </header>

      {/* ---- Summary tiles: one per market, cash and the number of holdings ---- */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {markets.map((market) => (
          <StatTile
            key={market.key}
            label={market.label}
            color={market.color}
            value={formatPercent(totals[market.key])}
            note={`${held.filter((item) => item.market === market.key).length} of ${holdings.filter((item) => item.market === market.key).length} funds held · prices until ${formatDate(portfolio.data_until[market.key])}`}
          />
        ))}
        <StatTile label="Cash" color={CASH.color} value={formatPercent(portfolio.cash)} note="held in Turkish lira" />
        <StatTile
          label="Holdings"
          value={`${held.length} of ${holdings.length}`}
          note="funds with a weight above zero"
        />
      </div>

      {/* ---- The decision: target weight of every fund ---- */}
      <Card
        title={`Target weights from ${formatDate(portfolio.decision_day)}`}
        description="Every fund of the investment universe, by market. A fund in a downtrend gets no weight, unless it is needed to keep its market at the minimum. Select a fund to open its details."
      >
        <Table>
          <thead>
            <tr className="border-b border-line">
              <HeadCell left>Fund</HeadCell>
              <th scope="col" className={`${HEAD} ${WIDE_ONLY} text-left`}>
                Type
              </th>
              <HeadCell left>Trend</HeadCell>
              <th scope="col" className={`${HEAD} ${WIDE_ONLY} text-right`}>
                Volatility
              </th>
              <HeadCell>Weight</HeadCell>
              <th scope="col" className={`${HEAD} ${WIDE_ONLY} text-right`}>
                Change
              </th>
            </tr>
          </thead>
          {markets.map((market) => (
            <tbody key={market.key}>
              {/* Name and total of the market above its funds */}
              <tr className="border-b border-line bg-track/60">
                <th scope="rowgroup" className="px-2.5 py-1.5 text-left text-xs font-semibold text-ink-2">
                  <span className="flex items-center gap-2">
                    <ColorKey color={market.color} />
                    {market.label}
                  </span>
                </th>
                <EmptyCells />
                <td className="px-2.5 py-1.5 text-right text-xs font-semibold">{formatPercent(totals[market.key])}</td>
                <td className={WIDE_ONLY} />
              </tr>
              {holdings
                .filter((item) => item.market === market.key)
                .sort((a, b) => b.weight - a.weight) // the largest holding first
                .map((item) => (
                  <HoldingRow
                    key={item.symbol}
                    item={item}
                    color={market.color}
                    maxWeight={maxWeight}
                    onOpen={() => onOpenSymbol(item.symbol)}
                  />
                ))}
            </tbody>
          ))}
          <tfoot>
            <tr className="border-b border-line">
              <th scope="row" className="px-2.5 py-2.5 text-left font-normal">
                <span className="flex items-center gap-2">
                  <ColorKey color={CASH.color} />
                  Cash (Turkish lira)
                </span>
              </th>
              <EmptyCells />
              <ValueCell>{formatPercent(portfolio.cash)}</ValueCell>
              <td className={WIDE_ONLY} />
            </tr>
            <tr>
              <th scope="row" className="px-2.5 py-2.5 text-left font-semibold">
                Total
              </th>
              <EmptyCells />
              <td className="px-2.5 py-2.5 text-right font-semibold whitespace-nowrap">
                {formatPercent(holdings.reduce((sum, item) => sum + item.weight, portfolio.cash))}
              </td>
              <td className={WIDE_ONLY} />
            </tr>
          </tfoot>
        </Table>
        <p className="mt-3 text-sm text-ink-2">
          {`Trend: up if the ${settings.sma_short}-day average price is above the ${settings.sma_long}-day average.`}
          {/* The next columns and the bar are not shown on a narrow screen, so their notes are not shown there either. */}
          <span className="hidden md:inline">
            {` Volatility: yearly, from the last ${settings.vol_window} daily returns, in the fund's own currency. Change: difference from the weight of the week before, in percentage points. The bar is full at ${formatRate(settings.max_weight)}, the largest weight a fund can have.`}
          </span>
        </p>
      </Card>

      <WeightsChart history={portfolio.history} parts={[...markets, CASH]} />

      {/* ---- What the numbers mean and what they do not include ---- */}
      <Card title="How to read this page">
        <ul className="list-disc space-y-2 pl-5 text-sm">
          <li>{"The weights are targets for the week after the decision day. They are computed from prices only; no later price can enter a decision."}</li>
          <li>{`The portfolio is reported in Turkish lira. One US dollar was ${formatNumber(portfolio.usdtry, 4)} lira on the decision day. This rate is used to value US holdings in lira; it is not a signal.`}</li>
          <li>{"Real holdings can differ from the targets, because orders are filled later at other prices, payments take one or two days, and trading has costs. These effects are not simulated on this page."}</li>
          <li>{"This is homework for a course, not investment advice."}</li>
        </ul>
      </Card>
    </div>
  );
}

// The three empty cells between the name and the weight in a row without Type, Trend
// and Volatility (market name, cash, total). They keep the weight in its own column.
function EmptyCells() {
  return (
    <>
      <td className={WIDE_ONLY} />
      <td />
      <td className={WIDE_ONLY} />
    </>
  );
}

type RowProps = {
  item: Holding;
  color: string; // colour of its market
  maxWeight: number; // the weight (%) that fills the bar
  onOpen: () => void;
};

// One fund in the table of target weights.
function HoldingRow({ item, color, maxWeight, onOpen }: RowProps) {
  const heldClass = item.weight > 0 ? "" : "text-ink-2"; // a fund without a weight is shown in grey

  return (
    // A click anywhere in the row opens the details. The symbol is a real button,
    // so the row can be opened with the keyboard too (its click reaches the row).
    <tr onClick={onOpen} className={`group cursor-pointer border-b border-line hover:bg-hover ${heldClass}`}>
      <th scope="row" className="px-2.5 py-2.5 text-left font-normal">
        <button type="button" className="rounded-sm text-left">
          <span className="block font-semibold text-accent group-hover:underline">{item.symbol}</span>
          <span className="block text-xs text-ink-2">{item.name}</span>
        </button>
      </th>
      <td className={`${WIDE_ONLY} px-2.5 py-2.5 whitespace-nowrap`}>{item.type}</td>
      {/* The arrow and the word say the same thing, so the meaning is not in a colour. */}
      <td className="px-2.5 py-2.5 whitespace-nowrap">{item.uptrend ? "↑ Up" : "↓ Down"}</td>
      <td className={`${WIDE_ONLY} px-2.5 py-2.5 text-right whitespace-nowrap`}>{formatPercent(item.volatility)}</td>
      <td className="px-2.5 py-2.5">
        <div className="flex items-center justify-end gap-3">
          {/* Weight bar: hidden on a narrow screen, where there is no room for it */}
          <span aria-hidden="true" className="hidden h-2 w-28 overflow-hidden rounded-full bg-track md:block">
            <span
              className="block h-full rounded-full"
              style={{ width: `${(item.weight / maxWeight) * 100}%`, background: color }}
            />
          </span>
          <span className="w-14 text-right whitespace-nowrap">{formatPercent(item.weight)}</span>
        </div>
      </td>
      <td className={`${WIDE_ONLY} px-2.5 py-2.5 text-right whitespace-nowrap`}>
        {item.change === 0 ? "–" : formatNumber(item.change, 2, true)}
      </td>
    </tr>
  );
}
