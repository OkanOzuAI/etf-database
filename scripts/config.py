"""Projenin tüm ayarları tek yerde. Scriptler ve notebook buradan okur."""
from pathlib import Path

# İncelenecek semboller (ETF) ve kısa açıklamaları
SYMBOLS = {
    "SPY": "S&P 500",
    "QQQ": "Nasdaq 100",
    "GLD": "Altın",
    "TUR": "iShares MSCI Turkey ETF",
}

YEARS = 10                 # kaç yıllık veri çekilecek

# Strateji parametreleri
SMA_SHORT = 50             # kısa hareketli ortalama (gün)
SMA_LONG = 200             # uzun hareketli ortalama (gün)
COMMISSION = 0.001         # her işlemde %0.1 komisyon
INITIAL_CAPITAL = 10_000   # başlangıç sermayesi ($)
TRADING_DAYS = 252         # bir yıldaki işlem günü sayısı (yıllıklandırma için)

# Veri çekme ayarları
REQUEST_TIMEOUT = 30       # bir isteğin en fazla bekleme süresi (saniye)
MAX_RETRIES = 3            # bir istek en fazla kaç kez denenir
SLEEP_SECONDS = 2          # istekler arasındaki bekleme (saniye)

# Klasörler
ROOT = Path(__file__).resolve().parent.parent
RAW_DIR = ROOT / "data" / "raw"          # indirilen ham veri
CLEAN_DIR = ROOT / "data" / "clean"      # temizlenmiş veri
OUTPUT_DIR = ROOT / "public" / "data"    # dashboard'un okuduğu JSON dosyaları
