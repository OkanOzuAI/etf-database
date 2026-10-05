"use client";
// "use client": bu dosya ve import ettiği bileşenler tarayıcıda çalışır (useState, useEffect, fetch).

import { useEffect, useState } from "react";
import { formatDate, formatDateTime, formatDollar, formatList } from "@/lib/format";
import type { Summary, SymbolData } from "@/lib/types";
import EquityChart from "./EquityChart";
import Method from "./Method";
import MetricsTable from "./MetricsTable";
import PriceChart from "./PriceChart";
import ReturnsChart from "./ReturnsChart";
import YearlyTable from "./YearlyTable";

// Bir JSON dosyasını indirir; sunucu hata kodu dönerse hata fırlatır.
async function loadJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`${url} yüklenemedi (HTTP ${response.status})`);
  }
  return response.json();
}

// Sayfanın veriye bağlı kısmı: veriyi yükler, sembol seçimini tutar, bölümleri sıralar.
export default function Dashboard() {
  const [summary, setSummary] = useState<Summary | null>(null); // summary.json
  const [selected, setSelected] = useState<string | null>(null); // seçili sembol
  const [detail, setDetail] = useState<SymbolData | null>(null); // ekrandaki sembolün verisi
  const [failed, setFailed] = useState(false); // bir dosya yüklenemedi mi?

  // ---- 1) Özet dosyası sayfa açılınca bir kez yüklenir; ilk sembol seçili gelir ----
  useEffect(() => {
    loadJson<Summary>("/data/summary.json")
      .then((data) => {
        if (data.symbols.length === 0) {
          throw new Error("summary.json içinde sembol yok");
        }
        setSummary(data);
        setSelected(data.symbols[0].symbol);
      })
      .catch(() => setFailed(true));
  }, []);

  // ---- 2) Seçili sembol değişince o sembolün dosyası yüklenir ----
  useEffect(() => {
    if (!selected) return;
    // Yanıt gelmeden başka sembol seçilirse eski yanıt yok sayılır.
    let cancelled = false;
    loadJson<SymbolData>(`/data/${selected}.json`)
      .then((data) => {
        if (!cancelled) setDetail(data);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [selected]);

  // ---- 3) Yükleme ve hata durumları ----
  if (failed) {
    return <p className="mt-6">Veri yüklenemedi.</p>;
  }
  if (!summary || !detail) {
    return <p className="mt-6">Veri yükleniyor…</p>;
  }

  // ---- 4) Ekranda gösterilecek değerler ----
  // Yeni sembolün dosyası gelene kadar önceki sembol gösterilmeye devam eder;
  // bu sırada içerik soluklaştırılır, böylece sayfa boşalıp zıplamaz.
  const info = summary.symbols.find((item) => item.symbol === detail.symbol);
  if (!info) {
    return <p className="mt-6">Veri yüklenemedi.</p>;
  }
  const loading = detail.symbol !== selected;
  const { params } = summary;

  // Başlıkta gösterilecek veri aralığı: bütün sembollerin en erken ve en geç günü.
  // "2016-10-05" biçimindeki tarihler metin olarak sıralanınca tarih sırasına girer.
  const firstDate = summary.symbols.map((item) => item.start).sort()[0];
  const lastDate = summary.symbols.map((item) => item.end).sort().reverse()[0];

  return (
    <>
      {/* ---- Başlık altı: sayfanın ne gösterdiği, veri aralığı, son güncelleme ---- */}
      <p className="mt-3 max-w-3xl text-ink-2">
        {`${formatList(summary.symbols.map((item) => item.symbol))} için SMA${params.sma_short}/SMA${params.sma_long} kesişim stratejisini, ilk gün alıp son güne kadar tutan Buy & Hold ile ${formatDollar(params.initial_capital, 0)} başlangıç sermayesi üzerinden karşılaştırır.`}
      </p>
      <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-2">
        <span>
          Veri aralığı: {formatDate(firstDate)} – {formatDate(lastDate)} (günlük)
        </span>
        <span>Son güncelleme: {formatDateTime(summary.updated_at)}</span>
      </p>

      {/* ---- Sembol seçici: sayfanın tek filtresi, altındaki grafik ve tabloları belirler ---- */}
      <div role="group" aria-label="Sembol seçimi" className="mt-6 flex flex-wrap gap-2">
        {summary.symbols.map((item) => {
          const isSelected = item.symbol === selected;
          return (
            <button
              key={item.symbol}
              type="button"
              aria-pressed={isSelected}
              onClick={() => setSelected(item.symbol)}
              className={`min-w-36 flex-1 rounded-lg border px-4 py-2 text-left ${
                isSelected ? "border-ink bg-ink text-surface" : "border-line bg-surface hover:border-ink-2"
              }`}
            >
              <span className="block font-semibold">{item.symbol}</span>
              <span className="block text-xs opacity-80">{item.name}</span>
            </button>
          );
        })}
      </div>

      {/* ---- Seçili sembolün grafikleri ve tabloları ---- */}
      <div aria-busy={loading} className={`mt-6 space-y-6 transition-opacity ${loading ? "opacity-50" : ""}`}>
        <PriceChart
          symbol={info.symbol}
          name={info.name}
          daily={detail.daily}
          signals={detail.signals}
          params={params}
        />
        <EquityChart daily={detail.daily} params={params} />
        <MetricsTable symbol={info.symbol} strategy={info.strategy} buyHold={info.buy_hold} />
        <ReturnsChart symbol={info.symbol} returns={detail.returns} />
        <YearlyTable
          symbol={info.symbol}
          start={info.start}
          end={info.end}
          symbolYearly={detail.returns.yearly}
          strategyYearly={detail.strategy_yearly}
        />
      </div>

      {/* ---- Yöntem: sembolden bağımsızdır, bu yüzden soluklaşan bölümün dışında durur ---- */}
      <div className="mt-6">
        <Method params={params} />
      </div>
    </>
  );
}
