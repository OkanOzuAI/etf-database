import { formatDate } from "@/lib/format";
import type { SymbolData, SymbolSummary } from "@/lib/types";
import Card from "./Card";
import { HeadCell, PercentCell, RowHead, Table } from "./TableParts";

type Props = {
  info: SymbolSummary;
  data: SymbolData;
};

// Yearly returns table: the calendar-year returns of the symbol and of the strategy side by side.
export default function YearlyTable({ info, data }: Props) {
  // To find the return of the strategy by year: year -> return
  const strategyByYear = new Map(data.strategy_yearly.map((point) => [point.date, point.value]));

  // The first and the last year are not full years: the data starts in the middle of a year
  // and the last year is not over yet. These two years are marked with an asterisk (*).
  const partialYears = [info.start.slice(0, 4), info.end.slice(0, 4)];

  return (
    <Card
      title="Yearly returns"
      description={`Return of the ${info.symbol} price and of the strategy in every calendar year. Full period: the date range does not change this table.`}
    >
      <Table>
        <thead>
          <tr className="border-b border-line">
            <HeadCell left>Year</HeadCell>
            <HeadCell>{info.symbol} price</HeadCell>
            <HeadCell>Strategy</HeadCell>
          </tr>
        </thead>
        <tbody>
          {data.returns.yearly.map((point) => (
            <tr key={point.date} className="border-b border-line">
              <RowHead>
                {point.date}
                {partialYears.includes(point.date) && "*"}
              </RowHead>
              <PercentCell value={point.value} />
              {/* A dash is shown if the strategy has no value for that year. */}
              <PercentCell value={strategyByYear.get(point.date)} />
            </tr>
          ))}
        </tbody>
      </Table>
      <p className="mt-3 text-sm text-ink-2">
        * Not a full year: the data starts on {formatDate(info.start)} and ends on {formatDate(info.end)}.
      </p>
    </Card>
  );
}
