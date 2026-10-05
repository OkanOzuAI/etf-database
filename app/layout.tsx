import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

// Kök yerleşim: her sayfayı saran <html> ve <body>. Sayfa dili Türkçe (lang="tr").

// Tarayıcı sekmesinde ve arama sonuçlarında görünen başlık ve açıklama.
export const metadata: Metadata = {
  title: "SMA Kesişim Stratejisi ve Buy & Hold Karşılaştırması",
  description:
    "Hareketli ortalama (SMA) kesişim stratejisini Buy & Hold ile karşılaştıran ders ödevi panosu. Yatırım tavsiyesi değildir.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}
