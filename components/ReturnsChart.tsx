import { memo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Rectangle, ReferenceLine, Tooltip, XAxis, YAxis } from "recharts";
import type { BarShapeProps } from "recharts";
import { formatDate, formatMonth, formatPercent } from "@/lib/format";
import type { Period, ReturnPoint, SymbolData } from "@/lib/types";
import Card from "./Card";
import { roundTicks, TooltipBox, toYear, yearTicks } from "./ChartParts";

// ---- Sekmeler: sıraları ve Türkçe adları ----
const PERIODS: Period[] = ["daily", "weekly", "monthly", "yearly"];
const LABELS: Record<Period, string> = {
  daily: "Günlük",
  weekly: "Haftalık",
  monthly: "Aylık",
  yearly: "Yıllık",
};

// Pozitif getiri yeşil, negatif getiri kırmızı.
function barColor(value: number): string {
  return value >= 0 ? "var(--good)" : "var(--critical)";
}

// Tek bir çubuğun çizimi. Konumu ve boyutu (x, y, width, height) Recharts hesaplayıp verir.
function ReturnBar(bar: BarShapeProps) {
  const point: ReturnPoint = bar.payload; // çubuğun ait olduğu veri satırı
  // Veri ucu yuvarlatılır: geniş çubukta 4 px, dar çubukta genişliğin dörtte biri.
  const radius = Math.min(4, bar.width / 4);
  return (
    <Rectangle
      x={bar.x}
      y={bar.y}
      // Günlük sekmede binlerce çubuk vardır ve her biri 1 pikselden incedir;
      // soluk görünmesinler diye en az 1 piksel genişlikte çizilir.
      width={Math.max(bar.width, 1)}
      height={bar.height}
      radius={[radius, radius, 0, 0]}
      fill={barColor(point.value)}
    />
  );
}

// İpucu kutusunun başlığı: çubuğun ait olduğu dönem.
function periodTitle(period: Period, date: string): string {
  if (period === "daily") return formatDate(date);
  if (period === "weekly") return `${formatDate(date)} ile biten hafta`; // tarih haftanın son günü (cuma)
  if (period === "monthly") return formatMonth(date);
  return date; // yıllık: "2016"
}

type Props = {
  symbol: string;
  returns: SymbolData["returns"];
};

// Dönemsel getiri grafiği: günlük / haftalık / aylık / yıllık sekmeli çubuk grafik.
function ReturnsChart({ symbol, returns }: Props) {
  const [period, setPeriod] = useState<Period>("monthly"); // açılışta "Aylık" sekmesi seçili
  const points = returns[period];

  // Y ekseni etiketleri. Çubuklar sıfırdan başladığı için sıfır her zaman eksende olmalı.
  const percentTicks = roundTicks([0, ...points.map((point) => point.value)]);

  // Günlük ve haftalık sekmelerde çubuklar çok incedir: üzerine gelinen çubuğu dikey bir
  // çizgi gösterir. Aylık ve yıllık sekmelerde çubuğun arkası hafifçe boyanır.
  const dense = period === "daily" || period === "weekly";

  return (
    <Card
      title="Dönemsel getiriler"
      description={`${symbol} fiyatının her dönemdeki yüzde değişimi. Sıfır çizgisinin üstündeki yeşil çubuklar kazancı, altındaki kırmızı çubuklar kaybı gösterir.`}
    >
      {/* ---- Sekme düğmeleri ---- */}
      <div role="tablist" aria-label="Getiri dönemi" className="mb-3 flex gap-1">
        {PERIODS.map((key) => {
          const selected = key === period;
          return (
            <button
              key={key}
              type="button"
              role="tab"
              id={`returns-tab-${key}`}
              aria-selected={selected}
              aria-controls="returns-panel"
              onClick={() => setPeriod(key)}
              className={`rounded-md px-3 py-1.5 text-sm ${
                selected ? "bg-ink font-semibold text-surface" : "text-ink-2 hover:text-ink"
              }`}
            >
              {LABELS[key]}
            </button>
          );
        })}
      </div>

      {/* ---- Seçili sekmenin grafiği ---- */}
      <div role="tabpanel" id="returns-panel" aria-labelledby={`returns-tab-${period}`}>
        <BarChart
          responsive
          aria-label={`${LABELS[period]} getiri grafiği`}
          className="h-72 w-full text-xs tabular-nums sm:h-80"
          data={points}
          margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
        >
          {/* ---- Izgara ve eksenler ---- */}
          <CartesianGrid vertical={false} stroke="var(--grid)" />
          {/* Yıllık sekmede her çubuğun altına yılı yazılır; diğer sekmelerde yılda bir etiket olur. */}
          <XAxis
            dataKey="date"
            ticks={period === "yearly" ? undefined : yearTicks(points.map((point) => point.date))}
            tickFormatter={toYear}
            tick={{ fill: "var(--ink-2)" }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            width="auto"
            ticks={percentTicks}
            domain={[percentTicks[0], percentTicks[percentTicks.length - 1]]}
            tickFormatter={(value: number) => formatPercent(value, 0)}
            tick={{ fill: "var(--ink-2)" }}
            tickLine={false}
            axisLine={false}
          />
          {/* Sıfır çizgisi: çubuklar buradan yukarı ya da aşağı uzanır. */}
          <ReferenceLine y={0} stroke="var(--axis)" />

          {/* ---- İpucu: üzerine gelinen çubuğun dönemi ve getirisi ---- */}
          <Tooltip
            isAnimationActive={false}
            cursor={dense ? { fill: "none", stroke: "var(--axis)" } : { fill: "var(--grid)" }}
            content={({ active, payload }) => {
              if (!active || payload.length === 0) return null;
              const point: ReturnPoint = payload[0].payload;
              return (
                <TooltipBox
                  title={periodTitle(period, point.date)}
                  rows={[
                    {
                      label: `${LABELS[period]} getiri`,
                      value: formatPercent(point.value, 2, true),
                      color: barColor(point.value),
                    },
                  ]}
                />
              );
            }}
          />

          {/* ---- Çubuklar: en fazla 24 px kalınlık, animasyon yok ---- */}
          <Bar dataKey="value" maxBarSize={24} isAnimationActive={false} shape={ReturnBar} />
        </BarChart>
      </div>
    </Card>
  );
}

// memo: girdiler değişmediyse yeniden çizilmez (açıklaması PriceChart.tsx dosyasının sonunda).
export default memo(ReturnsChart);
