"""Phase 1 - Describe the dataset.

Writes docs/instruments.csv: one row per instrument with its exact name and
identifier, where its price comes from, how much data we have, how many
observations are missing, and how it is traded and settled.

Run it after the data is downloaded (python run_all.py) and whenever the list of
instruments changes:  python scripts/describe_data.py
The meaning of every column is explained in docs/data_dictionary.md.
"""
import time

import pandas as pd

import clean_data
import config
import fetch_data

TEFAS_PROFILE_URL = "https://www.tefas.gov.tr/api/funds/fonProfilBilgiGetir"

# General market rules (they are not specific to one instrument; sources in docs/data_dictionary.md)
US_SETTLEMENT_DAYS = 1      # US exchanges: paid one business day after the trade (T+1)
BIST_SETTLEMENT_DAYS = 2    # Borsa Istanbul: paid two business days after the trade (T+2)
BIST_HOURS = "10:00-18:00"  # continuous trading on Borsa Istanbul (Istanbul time)


def data_coverage(name):
    """Describes the data we have for one file: period, number of rows and data problems."""
    raw = pd.read_csv(config.RAW_DIR / f"{name}.csv")
    clean, summary = clean_data.clean(raw)
    price = clean["adj_close"]

    # Weekdays between the first and the last day that have no price. Most of them are
    # market holidays; the two markets have different holidays.
    weekdays = pd.bdate_range(price.index[0], price.index[-1])
    return {
        "first_day": summary["start"],
        "last_day": summary["end"],
        "rows": summary["rows"],
        "weekdays_without_price": len(weekdays.difference(price.index)),
        "missing_values": summary["missing"],
        "repeated_days": summary["duplicates"],
        "invalid_prices": summary["invalid_prices"],
        "largest_daily_move_pct": round(float(price.pct_change().abs().max() * 100), 2),
    }


def yahoo_details(symbol):
    """Asks Yahoo for the description of one symbol: full name, exchange and session hours."""
    params = {"range": "5d", "interval": "1d"}
    response = fetch_data.request_with_retry(fetch_data.YAHOO_URL.format(symbol=symbol), params=params)
    meta = response.json()["chart"]["result"][0]["meta"]

    # The regular session is given as two moments (Unix seconds); we show them as local clock times.
    session = meta["currentTradingPeriod"]["regular"]
    timezone = meta["exchangeTimezoneName"]
    hours = [
        pd.Timestamp(session[moment], unit="s", tz="UTC").tz_convert(timezone).strftime("%H:%M")
        for moment in ("start", "end")
    ]
    return {
        "full_name": meta["longName"],
        "exchange": meta["fullExchangeName"],
        "hours": f"{hours[0]}-{hours[1]} {timezone}",
    }


def tefas_details(symbol):
    """Asks TEFAS for the profile of one fund: full name, ISIN code, order hours and settlement days."""
    body = {"fonKodu": symbol, "dil": "TR"}
    response = fetch_data.request_with_retry(TEFAS_PROFILE_URL, json=body)
    return response.json()["resultList"][0]


def describe(symbol):
    """Builds the row of one instrument."""
    info = config.SYMBOLS[symbol]
    row = {
        "symbol": symbol,
        "name": info["name"],
        "type": info["type"],
        "market": info["market"],
        "currency": info["currency"],
    }

    if info["source"] == "yahoo":  # US-listed ETF
        details = yahoo_details(symbol)
        row.update({
            "full_name": details["full_name"],
            "identifier": f"{details['exchange']}: {symbol}",
            "source": "Yahoo Finance",
            "price_used": "adjusted closing price",
            "traded_on": details["exchange"],
            "trading_hours": details["hours"],
            "buy_settlement_days": US_SETTLEMENT_DAYS,
            "sell_settlement_days": US_SETTLEMENT_DAYS,
            "risk_value": "",
            "more_information": f"https://finance.yahoo.com/quote/{symbol}",
        })
        time.sleep(config.SLEEP_SECONDS)
    else:  # Turkish fund
        profile = tefas_details(symbol)
        row.update({
            "full_name": profile["fonUnvan"],
            "source": "TEFAS",
            "risk_value": profile["riskDegeri"] or "",  # 1 (lowest risk) to 7 (highest), set by the fund
            "more_information": profile["kapLink"],
        })
        if info["type"] == "ETF":  # traded on Borsa Istanbul; TEFAS shows its exchange closing price one day later
            row.update({
                "identifier": f"ISIN {profile['isinKodu']}, Borsa Istanbul: {info['bist']}",
                "price_used": "exchange closing price of the trading day before",
                "traded_on": "Borsa Istanbul",
                "trading_hours": f"{BIST_HOURS} Europe/Istanbul",
                "buy_settlement_days": BIST_SETTLEMENT_DAYS,
                "sell_settlement_days": BIST_SETTLEMENT_DAYS,
            })
        else:  # mutual fund: one price per day, orders go through TEFAS
            row.update({
                "identifier": f"ISIN {profile['isinKodu']}, TEFAS: {symbol}",
                "price_used": "fund share price published for that day",
                "traded_on": "TEFAS",
                "trading_hours": f"{profile['basIsSaat']}-{profile['sonIsSaat']} Europe/Istanbul",
                # TEFAS field names: "fonGeriAlisValor" is shown on the site as the buy
                # settlement ("Alış Valörü"), "fonSatisValor" as the sell settlement ("Satış Valörü").
                "buy_settlement_days": profile["fonGeriAlisValor"],
                "sell_settlement_days": profile["fonSatisValor"],
            })
        time.sleep(config.TEFAS_SLEEP_SECONDS)

    row.update(data_coverage(symbol))
    return row


def describe_exchange_rate():
    """Builds the row of the USD/TRY exchange rate (it is not an investment, only used for conversion)."""
    row = {
        "symbol": config.FX_NAME,
        "name": "US dollar in Turkish lira",
        "type": "Exchange rate",
        "market": "",
        "currency": "TRY per 1 USD",
        "full_name": "USD/TRY",
        "identifier": f"Yahoo Finance: {config.FX_YAHOO_SYMBOL}",
        "source": "Yahoo Finance",
        "price_used": "rate in the first hours of the day (London time)",
        "traded_on": "",
        "trading_hours": "",
        "buy_settlement_days": "",
        "sell_settlement_days": "",
        "risk_value": "",
        "more_information": f"https://finance.yahoo.com/quote/{config.FX_YAHOO_SYMBOL}",
    }
    row.update(data_coverage(config.FX_NAME))
    return row


def main():
    """Describes every instrument and the exchange rate and writes docs/instruments.csv."""
    config.DOCS_DIR.mkdir(parents=True, exist_ok=True)
    rows = []
    for symbol in config.SYMBOLS:
        rows.append(describe(symbol))
        print(f"  {symbol}: {rows[-1]['full_name']}")
    rows.append(describe_exchange_rate())

    columns = [
        "symbol", "name", "full_name", "type", "market", "currency", "identifier",
        "source", "price_used", "first_day", "last_day", "rows", "weekdays_without_price",
        "missing_values", "repeated_days", "invalid_prices", "largest_daily_move_pct",
        "traded_on", "trading_hours", "buy_settlement_days", "sell_settlement_days",
        "risk_value", "more_information",
    ]
    table = pd.DataFrame(rows)[columns]
    table.to_csv(config.DOCS_DIR / "instruments.csv", index=False)
    print(f"  {len(table)} rows written to docs/instruments.csv")
    return table


if __name__ == "__main__":
    main()
