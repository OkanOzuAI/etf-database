// Grafiklerin ortak küçük parçaları: açıklama satırı (legend), ipucu kutusu (tooltip)
// ve eksen yardımcıları. Üç grafik de bunları kullanır.

import { formatDate, formatDollar } from "@/lib/format";
import type { DailyRow } from "@/lib/types";

// ---- Eksen yardımcıları ----

// X ekseninde yılda bir etiket olsun: yılın değiştiği satırların tarihlerini döndürür.
export function yearTicks(dates: string[]): string[] {
  return dates.filter((date, i) => i > 0 && date.slice(0, 4) !== dates[i - 1].slice(0, 4));
}

// "2017-01-03" -> "2017"
export function toYear(date: string): string {
  return date.slice(0, 4);
}

// Y ekseni için yuvarlak etiket değerleri üretir (örn. 0, 10.000, 20.000 ...).
// Veri aralığı yaklaşık 5 parçaya bölünür; adım 1, 2, 5 ya da 10'un bir 10 kuvvetiyle
// çarpımına yuvarlanır. İlk etiket en küçük değeri, son etiket en büyük değeri kapsar.
export function roundTicks(values: number[]): number[] {
  const min = Math.min(...values);
  const max = Math.max(...values);

  // 1) Kaba adım (etiketler tam sayı yazıldığı için en az 1) ve onun basamağı: 1, 10, 100 ...
  const rough = Math.max((max - min) / 5, 1);
  const power = 10 ** Math.floor(Math.log10(rough));

  // 2) Kaba adımı, ondan küçük olmayan en yakın yuvarlak adıma çıkar.
  let step = 10 * power;
  if (rough <= 5 * power) step = 5 * power;
  if (rough <= 2 * power) step = 2 * power;
  if (rough <= power) step = power;

  // 3) En küçük değerin altındaki ilk kattan başlayıp en büyük değeri geçene kadar ilerle.
  const ticks = [];
  for (let tick = Math.floor(min / step) * step; tick < max + step; tick += step) {
    ticks.push(tick);
  }
  return ticks;
}

// ---- Al / sat üçgeni ----

// Merkezi (cx, cy) olan, yukarı ya da aşağı bakan üçgenin SVG yolu.
export function trianglePath(cx: number, cy: number, half: number, up: boolean): string {
  const tip = up ? cy - half : cy + half;
  const base = up ? cy + half : cy - half;
  return `M${cx},${tip} L${cx + half},${base} L${cx - half},${base} Z`;
}

// ---- Açıklama satırı (legend) ----

type LegendItem = {
  label: string;
  color: string;
  shape?: "up" | "down"; // yukarı üçgen (al) ya da aşağı üçgen (sat); yazılmazsa çizgi
};

// Her serinin rengini ve adını grafiğin üstünde gösterir.
// Simge, grafikteki işaretin biçimini taşır: çizgi için kısa çizgi, al/sat için üçgen.
export function Legend({ items }: { items: LegendItem[] }) {
  return (
    <ul className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-2">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-1.5">
          <svg width="16" height="12" aria-hidden="true">
            {item.shape ? (
              <path d={trianglePath(8, 6, 5, item.shape === "up")} fill={item.color} />
            ) : (
              <line x1="1" y1="6" x2="15" y2="6" stroke={item.color} strokeWidth="2" strokeLinecap="round" />
            )}
          </svg>
          {item.label}
        </li>
      ))}
    </ul>
  );
}

// ---- İpucu kutusu (tooltip) ----

type TooltipRow = { label: string; value: string; color: string };

// Fareyle üzerine gelinen noktanın değerlerini gösteren kutu.
// Her satırda serinin rengi, değer (kalın) ve serinin adı bulunur.
export function TooltipBox({ title, rows }: { title: string; rows: TooltipRow[] }) {
  return (
    <div className="rounded-md border border-line bg-surface px-3 py-2 text-sm shadow-md">
      <p className="mb-1 text-xs text-ink-2">{title}</p>
      <table>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label}>
              <td>
                <span className="block h-0.5 w-3 rounded-full" style={{ background: row.color }} />
              </td>
              <td className="px-2 text-right font-semibold">{row.value}</td>
              <td className="text-ink-2">{row.label}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Çizgi grafiklerindeki bir seri: günlük verinin hangi alanı, hangi adla ve renkle çizilecek.
export type LineSeries = {
  key: "price" | "sma_short" | "sma_long" | "strategy" | "buy_hold";
  label: string;
  color: string;
};

// Çizgi grafiklerinin ipucu kutusu: seçilen günün bütün serilerini dolar olarak listeler.
export function DailyTooltip({ row, series }: { row: DailyRow; series: LineSeries[] }) {
  const rows: TooltipRow[] = [];
  for (const item of series) {
    const value = row[item.key];
    // Hareketli ortalama henüz oluşmadıysa (null) o satır yazılmaz.
    if (value !== null) {
      rows.push({ label: item.label, color: item.color, value: formatDollar(value) });
    }
  }
  return <TooltipBox title={formatDate(row.date)} rows={rows} />;
}
