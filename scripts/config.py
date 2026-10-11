"""All project settings in one place. The scripts and the notebook read them from here."""
import os
from pathlib import Path

# ---- Investment universe: 10 US-listed ETFs and 10 Turkish funds ----

# US-listed exchange-traded funds (prices in US dollars, from Yahoo Finance)
US_ETFS = {
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
}

# Turkish funds (prices in Turkish lira, from TEFAS). The key is the TEFAS fund code.
# "ETF": traded on Borsa Istanbul ("bist" is its ticker there).
# "Mutual fund": bought and sold through TEFAS at the fund's daily price.
TURKISH_FUNDS = {
    "ZBB": {"name": "BIST 30 stocks (Ziraat)", "group": "Turkish ETFs", "type": "ETF", "bist": "ZPX30"},
    "FGA": {"name": "Gold in lira (QNB)", "group": "Turkish ETFs", "type": "ETF", "bist": "GLDTR"},
    "FGS": {"name": "Silver in lira (QNB)", "group": "Turkish ETFs", "type": "ETF", "bist": "GMSTR"},
    "FUS": {"name": "US dollar Treasury bills (QNB)", "group": "Turkish ETFs", "type": "ETF", "bist": "USDTR"},
    "TI2": {"name": "Turkish stocks (İş Portföy)", "group": "Turkish mutual funds", "type": "Mutual fund"},
    "AFA": {"name": "US stocks (Ak Portföy)", "group": "Turkish mutual funds", "type": "Mutual fund"},
    "TI6": {"name": "Lira bonds (İş Portföy)", "group": "Turkish mutual funds", "type": "Mutual fund"},
    "AKE": {"name": "US dollar Eurobonds (Ak Portföy)", "group": "Turkish mutual funds", "type": "Mutual fund"},
    "DLY": {"name": "Lira money market (Deniz Portföy)", "group": "Turkish mutual funds", "type": "Mutual fund"},
    "TI7": {"name": "Balanced mixed fund (İş Portföy)", "group": "Turkish mutual funds", "type": "Mutual fund"},
}

# One dictionary with every instrument: its market, currency, type and data source
SYMBOLS = {}
for symbol, info in US_ETFS.items():
    SYMBOLS[symbol] = {**info, "type": "ETF", "market": "United States", "currency": "USD", "source": "yahoo"}
for symbol, info in TURKISH_FUNDS.items():
    SYMBOLS[symbol] = {**info, "market": "Türkiye", "currency": "TRY", "source": "tefas"}

# Exchange rate: how many Turkish lira one US dollar costs (from Yahoo Finance)
FX_NAME = "USDTRY"            # name of our file
FX_YAHOO_SYMBOL = "USDTRY=X"  # name of the rate on Yahoo
REPORT_CURRENCY = "TRY"       # the whole portfolio is reported in this currency

YEARS = 10                 # how many years of data to download from Yahoo
TEFAS_MONTHS = 60          # TEFAS gives at most the last 60 months (5 years)

# Strategy settings
SMA_SHORT = 50             # short moving average (days)
SMA_LONG = 200             # long moving average (days)
COMMISSION = 0.001         # 0.1% commission on every trade
INITIAL_CAPITAL = 10_000   # starting capital (in the currency of the instrument)
TRADING_DAYS = 252         # trading days in a year (turns daily values into yearly values)

# Portfolio settings (weekly decision)
VOL_WINDOW = 63            # days of returns used for the volatility (about 3 months)
VOL_FLOOR = 0.10           # a yearly volatility below 10% is counted as 10%
MAX_WEIGHT = 0.20          # one instrument can be at most 20% of the portfolio
MIN_MARKET_WEIGHT = 0.20   # each market (Türkiye, United States) gets at least 20%

# Download settings
REQUEST_TIMEOUT = 30       # longest wait for one request (seconds)
MAX_TRIES = 3              # how many times one request is tried
SLEEP_SECONDS = 2          # pause between Yahoo requests (seconds)
# Pause between TEFAS requests (seconds). 11 is enough from a home connection (TEFAS allows about
# 6 requests per minute). From GitHub's servers a TEFAS request that comes soon after another one
# gets no answer, so the daily update sets a longer pause with the environment variable below.
TEFAS_SLEEP_SECONDS = int(os.environ.get("TEFAS_SLEEP_SECONDS", 11))

# Folders
ROOT = Path(__file__).resolve().parent.parent
RAW_DIR = ROOT / "data" / "raw"          # downloaded raw data
CLEAN_DIR = ROOT / "data" / "clean"      # cleaned data
OUTPUT_DIR = ROOT / "public" / "data"    # JSON files read by the dashboard
DOCS_DIR = ROOT / "docs"                 # data dictionary and instrument table
