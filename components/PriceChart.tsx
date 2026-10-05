import { memo } from "react";
import { CartesianGrid, Line, LineChart, ReferenceDot, Tooltip, XAxis, YAxis } from "recharts";
import { formatDate, formatDollar } from "@/lib/format";
import type { DailyRow, Params, Signal } from "@/lib/types";
import Card from "./Card";
import { DailyTooltip, Legend, roundTicks, toYear, trianglePath, yearTicks } from "./ChartParts";
import type { LineSeries } from "./ChartParts";

type Props = {
  symbol: string;
  name: string;
  daily: DailyRow[];
  signals: Signal[];
  params: Params;
};

// Fiyat grafiği: düzeltilmiş kapanış, iki hareketli ortalama ve al/sat işaretleri.
function PriceChart({ symbol, name, daily, signals, params }: Props) {
  // ---- Çizilecek seriler (çizgiler, legend ve tooltip aynı listeyi kullanır) ----
  const series: LineSeries[] = [
    { key: "price", label: "Fiyat", color: "var(--series-1)" },
    { key: "sma_short", label: `SMA${params.sma_short}`, color: "var(--series-2)" },
    { key: "sma_long", label: `SMA${params.sma_long}`, color: "var(--series-3)" },
  ];

  // ---- Y ekseni etiketleri ----
  // Ortalamalar her zaman en düşük ve en yüksek fiyatın arasında kalır; fiyata bakmak yeterli.
  const priceTicks = roundTicks(daily.map((row) => row.price));

  return (
    <Card
      title="Fiyat ve hareketli ortalamalar"
      description={`${symbol} (${name}) düzeltilmiş kapanış fiyatı, ${params.sma_short} ve ${params.sma_long} günlük hareketli ortalamalar. Üçgenler stratejinin alım ve satım günlerini gösterir.`}
    >
      <Legend
        items={[
          ...series,
          { label: "Al", color: "var(--good)", shape: "up" },
          { label: "Sat", color: "var(--critical)", shape: "down" },
        ]}
      />

      <LineChart
        responsive
        aria-label="Fiyat ve hareketli ortalamalar grafiği"
        className="h-72 w-full text-xs tabular-nums sm:h-96"
        data={daily}
        margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
      >
        {/* ---- Izgara ve eksenler ---- */}
        <CartesianGrid vertical={false} stroke="var(--grid)" />
        <XAxis
          dataKey="date"
          ticks={yearTicks(daily.map((row) => row.date))}
          tickFormatter={toYear}
          tick={{ fill: "var(--ink-2)" }}
          tickLine={false}
          axisLine={{ stroke: "var(--axis)" }}
        />
        <YAxis
          width="auto"
          ticks={priceTicks}
          domain={[priceTicks[0], priceTicks[priceTicks.length - 1]]}
          tickFormatter={(value: number) => formatDollar(value, 0)}
          tick={{ fill: "var(--ink-2)" }}
          tickLine={false}
          axisLine={false}
        />

        {/* ---- İpucu: dikey çizgi en yakın günü bulur, kutu o günün tüm serilerini listeler ---- */}
        <Tooltip
          isAnimationActive={false}
          cursor={{ stroke: "var(--axis)" }}
          content={({ active, payload }) =>
            active && payload.length > 0 ? <DailyTooltip row={payload[0].payload} series={series} /> : null
          }
        />

        {/* ---- Çizgiler: 2 px, nokta yok, animasyon yok ---- */}
        {series.map((item) => (
          <Line
            key={item.key}
            dataKey={item.key}
            stroke={item.color}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, stroke: "var(--surface)", strokeWidth: 2 }}
            isAnimationActive={false}
          />
        ))}

        {/* ---- Al / sat işaretleri: sinyalin tarihine ve fiyatına yerleştirilir ---- */}
        {signals.map((signal) => {
          const isBuy = signal.type === "AL";
          // Al: yeşil yukarı üçgen, sat: kırmızı aşağı üçgen. Çizgilerin üstünde seçilebilsin
          // diye üçgenin çevresinde zemin renginde 2 px halka var. <title>, fare üçgenin
          // üzerinde bekletilince işlemin türünü, tarihini ve fiyatını gösterir.
          return (
            <ReferenceDot
              key={signal.date}
              x={signal.date}
              y={signal.price}
              shape={({ cx = 0, cy = 0 }) => (
                <path
                  d={trianglePath(cx, cy, 6, isBuy)}
                  fill={isBuy ? "var(--good)" : "var(--critical)"}
                  stroke="var(--surface)"
                  strokeWidth={2}
                  strokeLinejoin="round"
                >
                  <title>{`${isBuy ? "Al" : "Sat"} · ${formatDate(signal.date)} · ${formatDollar(signal.price)}`}</title>
                </path>
              )}
            />
          );
        })}
      </LineChart>
    </Card>
  );
}

// memo: bileşenin girdileri (props) değişmediyse React onu yeniden çizmez. Başka bir sembole
// basıldığında yeni veri gelene kadar grafik aynı kalır; binlerce noktanın boşuna yeniden
// çizilmesi önlenir ve düğme anında tepki verir.
export default memo(PriceChart);
