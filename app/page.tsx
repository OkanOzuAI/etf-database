import Dashboard from "@/components/Dashboard";

// Sunucu bileşeni: burada veri çekilmez, bu yüzden sayfa derleme sırasında statik üretilir.
// Veriyi tarayıcıda Dashboard bileşeni public/data altındaki JSON dosyalarından okur.
export default function Home() {
  return (
    <div className="mx-auto max-w-[1100px] px-4 py-8 sm:py-12">
      <main>
        <h1 className="text-2xl font-semibold sm:text-3xl">SMA Kesişim Stratejisi ve Buy & Hold Karşılaştırması</h1>
        <Dashboard />
      </main>
      <footer className="mt-10 text-sm text-ink-2">Veri: Yahoo Finance · Ders ödevi · Yatırım tavsiyesi değildir.</footer>
    </div>
  );
}
