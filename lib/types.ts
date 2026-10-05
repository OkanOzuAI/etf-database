// public/data altındaki JSON dosyalarının tipleri.
// Alan adları Python tarafının (scripts/backtest.py) yazdığı JSON ile birebir aynıdır.

// ---- summary.json ----

// Bir portföyün (strateji ya da Buy & Hold) performans metrikleri
export type Metrics = {
  final_value: number; // son portföy değeri ($)
  profit: number; // kâr ($)
  total_return_pct: number; // toplam getiri (%)
  cagr_pct: number; // yıllık bileşik getiri (%)
  volatility_pct: number; // yıllık volatilite (%)
  sharpe: number; // Sharpe oranı
  max_drawdown_pct: number; // maksimum drawdown (%, negatif sayı)
  trades: number; // işlem sayısı
};

// Pipeline'ın config.py dosyasındaki parametreleri
export type Params = {
  years: number;
  sma_short: number;
  sma_long: number;
  commission: number; // oran: 0.001 = %0,1
  initial_capital: number;
};

export type SymbolSummary = {
  symbol: string; // "SPY"
  name: string; // "S&P 500"
  start: string; // ilk veri günü, "2016-10-05"
  end: string; // son veri günü
  rows: number; // işlem günü sayısı
  strategy: Metrics;
  buy_hold: Metrics;
};

export type Summary = {
  updated_at: string; // pipeline'ın son çalıştığı an (UTC, ISO 8601)
  params: Params;
  symbols: SymbolSummary[];
};

// ---- <SEMBOL>.json ----

// Bir işlem günü: fiyat, hareketli ortalamalar ve iki portföyün değeri
export type DailyRow = {
  date: string; // "2016-10-05"
  price: number; // düzeltilmiş kapanış ($)
  sma_short: number | null; // ortalama oluşana kadar null
  sma_long: number | null;
  strategy: number; // strateji portföyünün değeri ($)
  buy_hold: number; // Buy & Hold portföyünün değeri ($)
};

// Stratejinin pozisyon değiştirdiği gün
export type Signal = {
  date: string;
  type: "AL" | "SAT";
  price: number;
};

// Bir dönemin yüzde getirisi
export type ReturnPoint = {
  date: string; // günlük ve haftalık: "2016-10-07", aylık: "2016-10", yıllık: "2016"
  value: number; // yüzde: 0.07 = %0,07
};

export type Period = "daily" | "weekly" | "monthly" | "yearly";

export type SymbolData = {
  symbol: string;
  daily: DailyRow[];
  signals: Signal[];
  returns: Record<Period, ReturnPoint[]>; // sembolün kendi getirileri
  strategy_yearly: ReturnPoint[]; // stratejinin yıllık getirileri
};
