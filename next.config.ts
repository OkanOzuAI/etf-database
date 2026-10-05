import type { NextConfig } from "next";

// Sayfa statik üretilir ve veriyi public/data altından okur; başka ayar gerekmiyor.
const nextConfig: NextConfig = {
  // "next dev" bazı ortamlarda proje köküne kendiliğinden AGENTS.md ve CLAUDE.md
  // dosyaları yazar; projeyle ilgisi olmayan dosyalar oluşmasın diye kapatıyoruz.
  agentRules: false,
};

export default nextConfig;
