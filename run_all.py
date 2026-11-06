"""Runs the whole pipeline in order: download -> clean -> backtest -> portfolio -> validation.

Usage:  python run_all.py
"""
import sys
from pathlib import Path

# Add the scripts/ folder to the Python path so we can import its files
sys.path.insert(0, str(Path(__file__).resolve().parent / "scripts"))

import backtest
import clean_data
import fetch_data
import portfolio
import validation


def main():
    print("1/5 Downloading data")
    failed = fetch_data.main()
    if failed:
        # Stop with an error code if something is missing, so the automatic update
        # (GitHub Action) does not publish incomplete data or a portfolio based on it.
        print(f"WARNING: could not be downloaded: {', '.join(failed)}")
        sys.exit(1)

    print("2/5 Cleaning data")
    clean_data.main()

    print("3/5 Running the backtest of every instrument")
    backtest.main()

    print("4/5 Computing the portfolio weights")
    portfolio.main()

    print("5/5 Comparing the portfolio with the benchmarks (historical validation)")
    validation.main()
    print("Done.")


if __name__ == "__main__":
    main()
