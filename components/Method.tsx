import type { ReactNode } from "react";
import { formatDollar, formatRate } from "@/lib/format";
import type { Params } from "@/lib/types";
import Card from "./Card";

// Verinin çekildiği adres. <SEMBOL> yerine SPY, QQQ gibi semboller gelir.
const SOURCE_URL = "https://query1.finance.yahoo.com/v8/finance/chart/<SEMBOL>";

// Başlığı olan kısa bir madde listesi.
function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <h3 className="font-semibold">{title}</h3>
      <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm">{children}</ul>
    </div>
  );
}

// "Yöntem" bölümü: veri kaynağı, temizleme adımları, strateji kuralı ve varsayımlar.
// Sayılar (yıl, SMA günleri, komisyon, sermaye) summary.json içindeki parametrelerden gelir.
export default function Method({ params }: { params: Params }) {
  const short = params.sma_short;
  const long = params.sma_long;

  return (
    <Card title="Yöntem">
      <div className="grid gap-6 md:grid-cols-2">
        <Section title="Veri kaynağı ve çekme">
          <li>
            {"Fiyatlar Yahoo Finance'in halka açık grafik adresinden alınır:"}
            {/* Adres kendi satırında durur; dar ekranda taşmasın diye her harften bölünebilir. */}
            <code className="my-1 block text-xs break-all">{SOURCE_URL}</code>
            {"API anahtarı, üyelik ya da hazır veri kütüphanesi kullanılmaz."}
          </li>
          <li>{`scripts/fetch_data.py dosyası requests ile son ${params.years} yılın günlük verisini (açılış, en yüksek, en düşük, kapanış, düzeltilmiş kapanış, hacim) JSON olarak indirir ve pandas DataFrame'ine çevirir.`}</li>
          <li>{"İstekler arasında kısa bir bekleme ve yeniden deneme vardır; bir sembol indirilemezse uyarı verilir ve diğerleriyle devam edilir."}</li>
          <li>{"Bu sayfa canlı veri çekmez; yalnızca pipeline'ın ürettiği JSON dosyalarını okur."}</li>
        </Section>

        <Section title="Temizleme (scripts/clean_data.py)">
          <li>{"Tarih sütunu datetime index yapılır ve sıralanır; aynı güne ait tekrarlı satırlar atılır."}</li>
          <li>{"Tüm sütunlar sayıya çevrilir; sıfır ya da negatif fiyatlar geçersiz sayılır."}</li>
          <li>{"Eksik fiyatlar bilinen son fiyatla doldurulur (forward-fill); böylece geleceğe ait bilgi kullanılmaz."}</li>
          <li>{"Düzeltilmiş kapanış sütunu yoksa kapanış fiyatı kullanılır."}</li>
        </Section>

        <Section title="Strateji">
          <li>{`${short} günlük ortalama (SMA${short}), ${long} günlük ortalamanın (SMA${long}) üstündeyse pozisyonda olunur; değilse nakitte beklenir.`}</li>
          <li>{"Sinyal bir gün kaydırılır: bugünkü pozisyonu dünün kapanışındaki sinyal belirler. Böylece look-ahead bias oluşmaz."}</li>
          <li>{`Her alım ve satımda ${formatRate(params.commission)} komisyon düşülür.`}</li>
          <li>{"Karşılaştırma ölçütü (benchmark): ilk gün alıp son güne kadar tutan Buy & Hold."}</li>
        </Section>

        <Section title="Varsayımlar">
          <li>{`Başlangıç sermayesi ${formatDollar(params.initial_capital, 0)}; her işlemde sermayenin tamamı kullanılır.`}</li>
          <li>{"Hesaplarda temettü ve bölünmelere göre düzeltilmiş kapanış fiyatı kullanılır; işlemler kapanış fiyatından yapılır."}</li>
          <li>{"Alım-satım farkı (spread), kayma (slippage) ve vergi hesaba katılmaz; nakitte beklerken faiz geliri yoktur."}</li>
          <li>{`SMA${long} oluşana kadar (ilk ${long} işlem günü) strateji nakitte bekler; Buy & Hold ise ilk günden yatırımdadır.`}</li>
          <li>{"Grafikteki al/sat işaretleri sinyalin oluştuğu günü gösterir: işlem o günün kapanış fiyatıyla yapılır, getiri bir sonraki işlem gününden itibaren işler."}</li>
          <li>{"Sharpe oranında risksiz faiz 0 alınır; yıllıklandırmada 252 işlem günü kullanılır."}</li>
        </Section>
      </div>

      <div className="mt-6 border-t border-line pt-4">
        <h3 className="font-semibold">Uyarı</h3>
        <p className="mt-2 text-sm">
          Bu çalışma bir ders ödevidir; yatırım tavsiyesi değildir. Geçmiş performans gelecekteki sonuçların göstergesi
          değildir.
        </p>
      </div>
    </Card>
  );
}
