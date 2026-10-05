"""All project settings in one place. The scripts and the notebook read them from here."""
from pathlib import Path

# The symbols we study (10 ETFs and 10 large companies): what each one is and its group
SYMBOLS = {
    "SPY": {"name": "S&P 500", "group": "US index ETFs"},
    "QQQ": {"name": "Nasdaq 100", "group": "US index ETFs"},
    "DIA": {"name": "Dow Jones", "group": "US index ETFs"},
    "IWM": {"name": "Russell 2000", "group": "US index ETFs"},
    "EFA": {"name": "Developed markets (ex-US)", "group": "International ETFs"},
    "EEM": {"name": "Emerging markets", "group": "International ETFs"},
    "TUR": {"name": "Turkey (MSCI Turkey)", "group": "International ETFs"},
    "GLD": {"name": "Gold", "group": "Commodity ETFs"},
    "SLV": {"name": "Silver", "group": "Commodity ETFs"},
    "TLT": {"name": "Long-term US Treasury bonds", "group": "Bond ETFs"},
    "NVDA": {"name": "Nvidia", "group": "Companies"},
    "AAPL": {"name": "Apple", "group": "Companies"},
    "MSFT": {"name": "Microsoft", "group": "Companies"},
    "GOOGL": {"name": "Alphabet (Google)", "group": "Companies"},
    "AMZN": {"name": "Amazon", "group": "Companies"},
    "META": {"name": "Meta Platforms", "group": "Companies"},
    "TSLA": {"name": "Tesla", "group": "Companies"},
    "JPM": {"name": "JPMorgan Chase", "group": "Companies"},
    "XOM": {"name": "Exxon Mobil", "group": "Companies"},
    "KO": {"name": "Coca-Cola", "group": "Companies"},
}

YEARS = 10                 # how many years of data to download

# Strategy settings
SMA_SHORT = 50             # short moving average (days)
SMA_LONG = 200             # long moving average (days)
COMMISSION = 0.001         # 0.1% commission on every trade
INITIAL_CAPITAL = 10_000   # starting capital ($)
TRADING_DAYS = 252         # trading days in a year (used to annualize)

# Download settings
REQUEST_TIMEOUT = 30       # longest wait for one request (seconds)
MAX_RETRIES = 3            # how many times one request is tried
SLEEP_SECONDS = 2          # pause between requests (seconds)

# Folders
ROOT = Path(__file__).resolve().parent.parent
RAW_DIR = ROOT / "data" / "raw"          # downloaded raw data
CLEAN_DIR = ROOT / "data" / "clean"      # cleaned data
OUTPUT_DIR = ROOT / "public" / "data"    # JSON files read by the dashboard
