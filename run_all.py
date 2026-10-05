"""Runs the whole pipeline in order: download -> clean -> backtest.

Usage:  python run_all.py
"""
import sys
from pathlib import Path

# Add the scripts/ folder to the Python path so we can import its files
sys.path.insert(0, str(Path(__file__).resolve().parent / "scripts"))

import backtest
import clean_data
import fetch_data


def main():
    print("1/3 Downloading data")
    failed = fetch_data.main()

    print("2/3 Cleaning data")
    clean_data.main()

    print("3/3 Running the backtest")
    backtest.main()

    if failed:
        # Exit with an error code if a symbol is missing, so the automatic update
        # (GitHub Action) does not publish incomplete data.
        print(f"WARNING: symbols that could not be downloaded: {', '.join(failed)}")
        sys.exit(1)
    print("Done.")


if __name__ == "__main__":
    main()
