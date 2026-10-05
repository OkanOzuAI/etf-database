import { formatDate, formatDollar, formatNumber, formatPercent } from "@/lib/format";
import type { DateRange, Mode, Params, PickedSymbol } from "@/lib/types";
import Card from "./Card";
import { HeadCell, PercentCell, PickedName, Table, ValueCell } from "./TableParts";

type Props = {
  picked: PickedSymbol[];
  mode: Mode;
  modeName: string; // "Buy & Hold" or "SMA strategy"
  dataRange: DateRange; // first and last day of the data
  params: Params;
};

// Table of the Compare view: the full-period metrics of the picked symbols (from summary.json).
export default function RiskTable({ picked, mode, modeName, dataRange, params }: Props) {
  return (
    <Card
      title="Risk and return, full period"
      description={`${modeName} from ${formatDate(dataRange.from)} to ${formatDate(dataRange.to)}, starting with ${formatDollar(params.initial_capital, 0)}. The date range does not change this table.`}
    >
      <Table>
        <thead>
          <tr className="border-b border-line">
            <HeadCell left>Symbol</HeadCell>
            <HeadCell>Total return</HeadCell>
            <HeadCell>CAGR</HeadCell>
            <HeadCell>Volatility</HeadCell>
            <HeadCell>Sharpe ratio</HeadCell>
            <HeadCell>Max drawdown</HeadCell>
            <HeadCell>Trades</HeadCell>
          </tr>
        </thead>
        <tbody>
          {picked.map((item) => {
            const metrics = item.info[mode]; // the metrics of the strategy or of Buy & Hold
            return (
              <tr key={item.info.symbol} className="border-b border-line">
                <PickedName item={item} withName />
                <PercentCell value={metrics.total_return_pct} />
                <PercentCell value={metrics.cagr_pct} />
                <ValueCell>{formatPercent(metrics.volatility_pct)}</ValueCell>
                <ValueCell>{formatNumber(metrics.sharpe)}</ValueCell>
                <ValueCell>{formatPercent(metrics.max_drawdown_pct)}</ValueCell>
                <ValueCell>{formatNumber(metrics.trades, 0)}</ValueCell>
              </tr>
            );
          })}
        </tbody>
      </Table>
    </Card>
  );
}
