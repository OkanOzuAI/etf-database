"""Tüm pipeline'ı sırayla çalıştırır: veri çekme -> temizleme -> backtest.

Kullanım:  python run_all.py
"""
import sys
from pathlib import Path

# scripts/ klasöründeki dosyaları import edebilmek için Python yoluna ekliyoruz
sys.path.insert(0, str(Path(__file__).resolve().parent / "scripts"))

import backtest
import clean_data
import fetch_data


def main():
    print("1/3 Veri çekiliyor")
    failed = fetch_data.main()

    print("2/3 Veri temizleniyor")
    clean_data.main()

    print("3/3 Backtest çalıştırılıyor")
    backtest.main()

    if failed:
        # Eksik sembol varsa hata koduyla çık: otomatik güncelleme (GitHub Action)
        # eksik veriyi yayınlamasın.
        print(f"UYARI: indirilemeyen semboller: {', '.join(failed)}")
        sys.exit(1)
    print("Tamamlandı.")


if __name__ == "__main__":
    main()
