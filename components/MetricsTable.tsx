import { formatDollar, formatNumber, formatPercent } from "@/lib/format";
import type { Metrics } from "@/lib/types";
import Card from "./Card";

// Bir satırda hangi değer daha iyi sayılır?
// "high": büyük olan, "low": küçük olan, "zero": sıfıra yakın olan, "none": karşılaştırma yok
type Better = "high" | "low" | "zero" | "none";

type Row = {
  key: keyof Metrics;
  label: string;
  format: (value: number) => string;
  better: Better;
};

// ---- Tablonun satırları ----
// Getiri ve kâr birer değişim olduğu için artı/eksi işaretiyle yazılır.
const ROWS: Row[] = [
  { key: "final_value", label: "Son değer", format: (v) => formatDollar(v), better: "high" },
  { key: "total_return_pct", label: "Toplam getiri", format: (v) => formatPercent(v, 2, true), better: "high" },
  { key: "profit", label: "Kâr", format: (v) => formatDollar(v, 2, true), better: "high" },
  { key: "cagr_pct", label: "CAGR (yıllık bileşik getiri)", format: (v) => formatPercent(v, 2, true), better: "high" },
  { key: "volatility_pct", label: "Yıllık volatilite", format: (v) => formatPercent(v), better: "low" },
  { key: "sharpe", label: "Sharpe oranı", format: (v) => formatNumber(v), better: "high" },
  { key: "max_drawdown_pct", label: "Maksimum drawdown", format: (v) => formatPercent(v), better: "zero" },
  { key: "trades", label: "İşlem sayısı", format: (v) => formatNumber(v, 0), better: "none" },
];

// a değeri b'den daha iyi mi? Eşit değerlerde ikisi için de false döner (kazanan yok).
function isBetter(a: number, b: number, better: Better): boolean {
  if (better === "high") return a > b;
  if (better === "low") return a < b;
  if (better === "zero") return Math.abs(a) < Math.abs(b);
  return false;
}

// Tek bir değer hücresi. Kazanan hücre yalnızca renkle değil, kalın yazı ve ✓ işaretiyle
// de belirtilir; ekran okuyucular için "(daha iyi)" metni eklenir.
function ValueCell({ text, wins }: { text: string; wins: boolean }) {
  return (
    <td className={`px-2 py-2 text-right whitespace-nowrap sm:px-3 ${wins ? "bg-good/10 font-semibold" : ""}`}>
      {wins && <span aria-hidden="true">✓ </span>}
      {text}
      {wins && <span className="sr-only"> (daha iyi)</span>}
    </td>
  );
}

type Props = {
  symbol: string;
  strategy: Metrics;
  buyHold: Metrics;
};

// Metrik karşılaştırma tablosu: strateji ve Buy & Hold yan yana.
export default function MetricsTable({ symbol, strategy, buyHold }: Props) {
  return (
    <Card title="Metrik karşılaştırması" description={`${symbol} için stratejinin ve Buy & Hold'un sonuçları yan yana.`}>
      <div className="overflow-x-auto">
        <table className="w-full text-xs tabular-nums sm:text-sm">
          <thead>
            <tr className="border-b border-line text-ink-2">
              <th scope="col" className="py-2 pr-2 text-left font-medium">
                Metrik
              </th>
              <th scope="col" className="w-[30%] px-2 py-2 text-right font-medium whitespace-nowrap sm:px-3">
                Strateji
              </th>
              <th scope="col" className="w-[30%] px-2 py-2 text-right font-medium whitespace-nowrap sm:px-3">
                Buy & Hold
              </th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row) => {
              const strategyValue = strategy[row.key];
              const buyHoldValue = buyHold[row.key];
              return (
                <tr key={row.key} className="border-b border-line">
                  <th scope="row" className="py-2 pr-2 text-left font-normal">
                    {row.label}
                  </th>
                  <ValueCell
                    text={row.format(strategyValue)}
                    wins={isBetter(strategyValue, buyHoldValue, row.better)}
                  />
                  <ValueCell
                    text={row.format(buyHoldValue)}
                    wins={isBetter(buyHoldValue, strategyValue, row.better)}
                  />
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-sm text-ink-2">
        {"✓ işaretli kalın değer o satırda daha iyi olandır (volatilitede düşük, drawdown'da sıfıra yakın olan). Eşit değerlerde ve işlem sayısında kazanan gösterilmez."}
      </p>
    </Card>
  );
}
