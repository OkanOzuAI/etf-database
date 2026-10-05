import { formatDate, formatPercent } from "@/lib/format";
import type { ReturnPoint } from "@/lib/types";
import Card from "./Card";

// Getiri hücresi: pozitif yeşil, negatif kırmızı. Anlam yalnızca renkte kalmasın diye
// sayının önüne + ya da - işareti de yazılır.
function ReturnCell({ value }: { value: number | undefined }) {
  // O yıl için değer yoksa (iki listede yıllar eşleşmiyorsa) çizgi konur.
  if (value === undefined) {
    return <td className="px-3 py-2 text-right">–</td>;
  }
  let color = "";
  if (value > 0) color = "text-good-text";
  if (value < 0) color = "text-critical-text";
  return <td className={`px-3 py-2 text-right ${color}`}>{formatPercent(value, 2, true)}</td>;
}

type Props = {
  symbol: string;
  start: string; // sembolün ilk veri günü
  end: string; // sembolün son veri günü
  symbolYearly: ReturnPoint[]; // sembolün yıllık getirileri
  strategyYearly: ReturnPoint[]; // stratejinin yıllık getirileri
};

// Yıllık getiri tablosu: sembolün ve stratejinin takvim yılı getirileri yan yana.
export default function YearlyTable({ symbol, start, end, symbolYearly, strategyYearly }: Props) {
  // Stratejinin getirilerini yıla göre bulabilmek için: yıl -> getiri
  const strategyByYear = new Map(strategyYearly.map((point) => [point.date, point.value]));

  // İlk ve son yıl tam yıl değildir: veri yılın ortasında başlar, son yıl ise henüz bitmemiştir.
  // Bu iki yıl tabloda yıldızla (*) işaretlenir.
  const partialYears = [start.slice(0, 4), end.slice(0, 4)];

  return (
    <Card
      title="Yıllık getiriler"
      description={`${symbol} fiyatının ve stratejinin her takvim yılındaki getirisi.`}
    >
      <div className="overflow-x-auto">
        <table className="w-full text-sm tabular-nums">
          <thead>
            <tr className="border-b border-line text-ink-2">
              <th scope="col" className="py-2 pr-3 text-left font-medium">
                Yıl
              </th>
              <th scope="col" className="w-[30%] px-3 py-2 text-right font-medium">
                {symbol} getirisi
              </th>
              <th scope="col" className="w-[30%] px-3 py-2 text-right font-medium">
                Strateji getirisi
              </th>
            </tr>
          </thead>
          <tbody>
            {symbolYearly.map((point) => (
              <tr key={point.date} className="border-b border-line">
                <th scope="row" className="py-2 pr-3 text-left font-normal">
                  {point.date}
                  {partialYears.includes(point.date) && "*"}
                </th>
                <ReturnCell value={point.value} />
                <ReturnCell value={strategyByYear.get(point.date)} />
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-sm text-ink-2">
        * Tam yıl değildir: veri {formatDate(start)} tarihinde başlar ve {formatDate(end)} tarihinde biter.
      </p>
    </Card>
  );
}
