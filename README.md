# SMA Kesişim Stratejisi ve Buy & Hold Karşılaştırması

Veri bilimi dersi için hazırlanmış, uçtan uca küçük bir proje: dört ETF'in (SPY, QQQ, GLD, TUR) son 10 yıllık günlük fiyat verisi kodla indirilir, temizlenir, basit bir hareketli ortalama stratejisi "al ve tut" (Buy & Hold) yaklaşımıyla karşılaştırılır ve sonuçlar bir web sayfasında gösterilir.

**Canlı site:** https://etf-database.vercel.app

## Amaç

Soru şu: "50 günlük ortalama 200 günlük ortalamanın üstündeyken pozisyonda ol, değilse nakitte bekle" kuralı, aynı dönemde hiçbir şey yapmadan elde tutmaktan daha iyi sonuç verir mi?

Veri çekme, temizleme, dönüştürme, analiz ve görselleştirme adımlarının hepsi bu depodaki kodla yapılır. Hazır veri kütüphanesi (yfinance vb.), API anahtarı ya da hazır backtest kütüphanesi kullanılmaz.

## Proje yapısı

| Dosya / klasör | Görevi |
|---|---|
| `scripts/config.py` | Tüm ayarlar: semboller, dönem, strateji parametreleri |
| `scripts/fetch_data.py` | 1. adım: veriyi indirir → `data/raw/<SEMBOL>.csv` |
| `scripts/clean_data.py` | 2. adım: veriyi temizler → `data/clean/<SEMBOL>.csv` |
| `scripts/backtest.py` | 3. adım: getiriler, strateji, metrikler → `public/data/*.json` |
| `run_all.py` | Üç adımı sırayla çalıştırır |
| `notebook/analiz.ipynb` | Tüm adımların kod, tablo ve grafiklerle anlatımı |
| `app/`, `components/`, `lib/` | Dashboard (Next.js + Tailwind + Recharts) |
| `.github/workflows/update-data.yml` | Veriyi her gün güncelleyen GitHub Action |

`data/` klasörü depoda tutulmaz; `python run_all.py` çalıştırılınca sıfırdan oluşur.

## Veri kaynağı ve çekme yöntemi

**Kaynak:** Yahoo Finance'in halka açık grafik adresi.

```
https://query1.finance.yahoo.com/v8/finance/chart/<SEMBOL>?period1=<başlangıç>&period2=<bitiş>&interval=1d
```

- İstek `requests` ile atılır; API anahtarı, üyelik ya da ücret yoktur.
- `period1` ve `period2` Unix saniyesidir. Dönem, çalıştırma gününden geriye 10 yıldır. Bitiş olarak günün başlangıcı (UTC 00:00) alınır; böylece henüz kapanmamış günün yarım verisi gelmez.
- Yanıt JSON'dır: tarihler ile açılış, en yüksek, en düşük, kapanış, hacim ve düzeltilmiş kapanış ayrı listeler halinde gelir. `fetch_yahoo` fonksiyonu bunları tek bir pandas DataFrame'ine çevirir ve Unix saniyelerini borsanın saat dilimine göre tarihe dönüştürür.
- İstekler arasında 2 saniye beklenir; hata alınırsa istek en fazla 3 kez denenir. Bir sembol indirilemezse uyarı yazılır ve diğer sembollerle devam edilir.

**Hangi kaynak anahtarsız çalışıyor?** 5 Ekim 2026'da `requests` ile test edildi:

| Deneme | Sonuç |
|---|---|
| Yahoo, `User-Agent: Mozilla/5.0` başlığıyla | 200, sembol başına 2512 satır |
| Yahoo, `requests`'in varsayılan `User-Agent` başlığıyla | 429 Too Many Requests |
| Stooq CSV adresi: `https://stooq.com/q/d/l/?s=spy.us&i=d` | CSV yerine tarayıcı doğrulaması isteyen bir HTML sayfası |

Bu yüzden birincil kaynak Yahoo'dur. Stooq kodda yedek olarak durur (`fetch_stooq`): Yahoo başarısız olursa denenir, yanıt CSV değilse uyarı verilir. Stooq'un doğrulama adımını aşmaya çalışan bir kod yazılmamıştır.

## Pipeline adımları

**1. Veri çekme** (`scripts/fetch_data.py`)
Her sembol için günlük açılış, en yüksek, en düşük, kapanış, düzeltilmiş kapanış ve hacim indirilir; ham haliyle `data/raw/` altına kaydedilir.

**2. Temizleme** (`scripts/clean_data.py`)
- Tarih sütunu datetime index yapılır; aynı güne ait tekrarlı satırlar atılır ve veri tarihe göre sıralanır.
- Tüm sütunlar sayıya çevrilir; sıfır ya da negatif fiyatlar geçersiz sayılır.
- Eksik fiyatlar bilinen son fiyatla doldurulur (forward-fill). Böylece geleceğe ait bilgi kullanılmaz.
- Düzeltilmiş kapanış sütunu yoksa kapanış fiyatı kullanılır.
- Her sembol için kısa bir kalite özeti yazdırılır: satır sayısı, tarih aralığı, eksik değer sayısı.

**3. Analiz ve backtest** (`scripts/backtest.py`)
- Günlük, haftalık, aylık ve yıllık yüzde getiriler hesaplanır (`resample`).
- Strateji: SMA50 > SMA200 ise pozisyonda ol, değilse nakitte bekle. Sinyal bir gün kaydırılır (`shift(1)`): bugünkü pozisyonu dünün kapanışındaki sinyal belirler, yani look-ahead bias yoktur. Her alım ve satımda %0,1 komisyon düşülür.
- Karşılaştırma ölçütü: ilk gün alıp son güne kadar tutan Buy & Hold.
- 10.000 $ başlangıç sermayesiyle her ikisi için toplam getiri, kâr, CAGR, yıllık volatilite, Sharpe oranı (risksiz faiz 0), maksimum drawdown ve işlem sayısı hesaplanır.
- Sonuçlar `public/data/` altına JSON olarak yazılır: `summary.json` (metrik tablosu, parametreler, son güncelleme zamanı) ve her sembol için `<SEMBOL>.json` (günlük fiyat, ortalamalar, portföy değerleri, al/sat günleri, dönemsel getiriler).

**4. Görselleştirme**
Dashboard statik bir sayfadır; yalnızca `public/data/*.json` dosyalarını okur, canlı veri çağrısı yapmaz.

### Varsayımlar

- Hesaplarda temettü ve bölünmelere göre düzeltilmiş kapanış kullanılır. İşlem, sinyalin oluştuğu günün kapanış fiyatından yapılır; getiri bir sonraki işlem gününden itibaren işler.
- Her işlemde sermayenin tamamı kullanılır. Alım-satım farkı, kayma ve vergi hesaba katılmaz; nakitte beklerken faiz geliri yoktur.
- SMA200 oluşana kadar (ilk 200 işlem günü) strateji nakitte bekler; Buy & Hold ise ilk günden yatırımdadır.
- Yıllıklandırmada 252 işlem günü kullanılır.

## Nasıl çalıştırılır

**Veri ve analiz** (Python 3.12 ile test edildi)

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python run_all.py
```

`run_all.py` veriyi indirir, temizler, backtest'i çalıştırır ve JSON dosyalarını yeniden üretir. Adımlar tek tek de çalıştırılabilir: `python scripts/fetch_data.py`, `python scripts/clean_data.py`, `python scripts/backtest.py`.

**Notebook**

```bash
jupyter notebook notebook/analiz.ipynb
```

**Dashboard** (Node.js 20.9 veya üzeri)

```bash
npm install
npm run dev
```

Sayfa `http://localhost:3000` adresinde açılır. Yayına hazır sürüm için `npm run build`, ardından `npm run start`.

## Otomatik güncelleme

`.github/workflows/update-data.yml` her gün 01:30 UTC'de `python run_all.py` komutunu çalıştırır ve değişen JSON dosyalarını commit eder. Depo Vercel'e bağlı olduğu için her commit siteyi yeniden yayınlar. Bir sembol indirilemezse `run_all.py` hata koduyla biter ve o gün commit atılmaz; sitede bir önceki günün verisi kalır.

## Sonuçların kısa yorumu

Aşağıdaki sonuçlar 5 Ekim 2016 - 2 Ekim 2026 dönemine aittir. Veri her gün güncellendiği için sitedeki rakamlar zamanla değişir.

**Getiri:** Dört sembolün dördünde de Buy & Hold, SMA stratejisinden daha yüksek toplam getiri sağladı.

| Sembol | Strateji | Buy & Hold | Kazanan |
|---|---|---|---|
| SPY | %143 | %318 | Buy & Hold |
| QQQ | %378 | %575 | Buy & Hold |
| GLD | %135 | %214 | Buy & Hold |
| TUR | -%55 | %19 | Buy & Hold |

**Neden?**

- **Gecikme.** Hareketli ortalamalar fiyatı geriden takip eder: strateji düşüşten sonra satar, toparlanma başladıktan sonra geri alır. Örneğin SPY'da strateji 31 Mart 2020'de 235,74 $'dan sattı (dip 23 Mart'taydı) ve 6 Temmuz 2020'de 291,25 $'dan geri aldı; aradaki yaklaşık %24'lük yükselişi kaçırdı.
- **Dalgalı piyasa.** TUR'da fiyat sık sık yön değiştirdiği için strateji 18 işlem yaptı; 9 al-sat turunun 7'sinde aldığından daha düşük fiyata sattı. Buy & Hold %19 kazandırırken strateji %55 kaybettirdi.
- **İlk 200 gün.** SMA200 oluşana kadar strateji nakitte bekler. Bu sürede SPY yaklaşık %16 yükseldi; Buy & Hold bu getiriyi aldı, strateji alamadı.

**Risk:** Strateji zamanın bir kısmında nakitte olduğu için yıllık volatilitesi dört sembolde de daha düşük (örneğin SPY'da %15,1'e karşı %17,9). Buna rağmen getiri kaybı daha büyük olduğu için Sharpe oranı da dört sembolde Buy & Hold lehine. Maksimum drawdown yalnızca QQQ'da belirgin biçimde iyileşti (-%28,6'ya karşı -%35,1); SPY'da aynı kaldı, GLD ve TUR'da kötüleşti.

**Sonuç:** Bu dönemde ve bu parametrelerle (50/200 gün, %0,1 komisyon) basit bir SMA kesişim stratejisi al ve tut yaklaşımını geçemedi. Sonuç seçilen döneme, parametrelere ve varsayımlara bağlıdır; farklı bir dönemde tablo değişebilir.

## Notlar

- Yahoo'nun düzeltilmiş kapanış değerleri yeni temettülerle birlikte geçmişe dönük güncellenir. Bu yüzden sonuçlar çalıştırma gününe göre küçük farklar gösterebilir.
- Bu çalışma bir ders ödevidir; yatırım tavsiyesi değildir. Geçmiş performans gelecekteki sonuçların göstergesi değildir.
