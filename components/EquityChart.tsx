import { memo } from "react";
import { CartesianGrid, Line, LineChart, Tooltip, XAxis, YAxis } from "recharts";
import { formatDollar } from "@/lib/format";
import type { DailyRow, Params } from "@/lib/types";
import Card from "./Card";
import { DailyTooltip, Legend, roundTicks, toYear, yearTicks } from "./ChartParts";
import type { LineSeries } from "./ChartParts";

// ---- Çizilecek seriler ----
// Buy & Hold, fiyat grafiğindeki fiyat çizgisiyle aynı renktedir (varlığın kendisi).
const SERIES: LineSeries[] = [
  { key: "strategy", label: "Strateji", color: "var(--series-2)" },
  { key: "buy_hold", label: "Buy & Hold", color: "var(--series-1)" },
];

type Props = {
  daily: DailyRow[];
  params: Params;
};

// Portföy değeri grafiği: strateji ve Buy & Hold aynı grafikte, tek dolar ekseninde.
function EquityChart({ daily, params }: Props) {
  // ---- Y ekseni etiketleri: iki portföyün değerlerini birlikte kapsar ----
  const valueTicks = roundTicks(daily.flatMap((row) => [row.strategy, row.buy_hold]));

  return (
    <Card
      title="Portföy değeri: Strateji ve Buy & Hold"
      description={`${formatDollar(params.initial_capital, 0)} başlangıç sermayesinin iki yöntemle gün gün ulaştığı değer.`}
    >
      <Legend items={SERIES} />

      <LineChart
        responsive
        aria-label="Portföy değeri grafiği: Strateji ve Buy & Hold"
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
          ticks={valueTicks}
          domain={[valueTicks[0], valueTicks[valueTicks.length - 1]]}
          tickFormatter={(value: number) => formatDollar(value, 0)}
          tick={{ fill: "var(--ink-2)" }}
          tickLine={false}
          axisLine={false}
        />

        {/* ---- İpucu: seçilen günde iki portföyün değeri ---- */}
        <Tooltip
          isAnimationActive={false}
          cursor={{ stroke: "var(--axis)" }}
          content={({ active, payload }) =>
            active && payload.length > 0 ? <DailyTooltip row={payload[0].payload} series={SERIES} /> : null
          }
        />

        {/* ---- Çizgiler: 2 px, nokta yok, animasyon yok ---- */}
        {SERIES.map((item) => (
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
      </LineChart>
    </Card>
  );
}

// memo: girdiler değişmediyse yeniden çizilmez (açıklaması PriceChart.tsx dosyasının sonunda).
export default memo(EquityChart);
