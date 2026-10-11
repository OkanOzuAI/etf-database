# Portfolio rules and algorithm

This file describes the price-only algorithm of Phase 2: the rules of the portfolio, the algorithm in pseudocode, its computational cost, and how future data is kept out. The code is in [`scripts/portfolio.py`](../scripts/portfolio.py).

## 1. Portfolio rules

| Rule | Value | Where |
|---|---|---|
| Investment universe | 10 US-listed ETFs and 10 Turkish funds | `SYMBOLS` in `scripts/config.py` |
| Decision | once a week, with the prices published up to and including Friday (for Turkish funds this is the market until Thursday; see the data dictionary, section 5) | `weekly_weights` |
| When it applies | from the next trading day (normally Monday) until the next decision | |
| Signals | price only: trend and volatility, in the instrument's own currency | `compute_signals` |
| Trend (asset selection) | uptrend if the 50-day average price is above the 200-day average | `SMA_SHORT`, `SMA_LONG` |
| Volatility | standard deviation of the last 63 daily returns, as a yearly value | `VOL_WINDOW` |
| Allocation method | weight in proportion to 1 / volatility, only for instruments in an uptrend (one exception: the minimum per market) | `allocate` |
| Volatility floor | a volatility below 10% is counted as 10% | `VOL_FLOOR` |
| Limit per instrument | at most 20% of the portfolio | `MAX_WEIGHT` |
| Minimum per market | at least 20% in Türkiye and at least 20% in the United States; if a market has no instrument in an uptrend, its calmest instrument is held to reach this minimum | `MIN_MARKET_WEIGHT` |
| Cash | what the rules cannot give to an instrument stays in cash (lira) | |
| Not allowed | negative weights (short selling) and a total above 100% (borrowing) | `check_rules` |
| Reporting currency | Turkish lira | `REPORT_CURRENCY` |

**Observation window.** The longest window is 200 trading days. An instrument has no signal before it has 200 prices, so the first decision is on the first Friday on which all 20 instruments have 200 prices (July 29, 2022 with the current data).

**Why these limits?**

- *20% per instrument:* no single fund can decide the result, and a fully invested portfolio holds at least five instruments.
- *20% per market:* the project asks for investment in both markets at all times. With 20% the algorithm can still move 60% of the portfolio between the two markets when their trends differ.
- *Volatility floor of 10%:* a money market fund has a yearly volatility near 1%. Without the floor, 1 / volatility would give it and the other calm lira funds almost the whole portfolio.
- All limits are settings in `scripts/config.py`. They will be set to the common competition limits when these are announced.

**Cash policy.** Cash is not a target; it is what is left. It can appear only when fewer than five instruments are in an uptrend, because each of them can take at most 20%. Cash is held in lira and earns no interest in our calculations. With the current data at least 10 instruments were in an uptrend in every week, so cash was 0% in all decisions.

**The exchange rate is not a signal.** In Phase 2 only price signals are allowed. Every signal is computed from the instrument's own prices in its own currency. The USD/TRY rate is used only to value US holdings in lira.

## 2. Weekly decision procedure

1. On Saturday, after 03:00 Istanbul time (00:00 UTC), download and clean the prices (`python run_all.py`). The script only takes days that have ended in UTC, so a run on Friday evening does not have Friday's prices yet. The automatic update on GitHub does this at 01:30 UTC.
2. For every instrument compute the two signals from its prices up to Friday.
3. Run `ALLOCATE` (below). The result is one weight per instrument and a cash weight; together they are 100%.
4. Report the weights, the total of each market and the cash (`public/data/portfolio.json` and the Portfolio page of the dashboard).
5. The weights are the target for the following week. Nothing is changed before the next Friday.

## 3. Pseudocode

```
WEEKLY_DECISION(day):
    for each instrument i:
        p = prices of i up to and including day        # no later price is read
        uptrend[i]    = mean(last 50 values of p) > mean(last 200 values of p)
        volatility[i] = standard deviation(last 63 daily returns of p) * sqrt(252)
    return ALLOCATE(uptrend, volatility)


ALLOCATE(uptrend, volatility):
    # 1. score: calm instruments in an uptrend get a high score
    for each instrument i:
        if uptrend[i]:  score[i] = 1 / max(volatility[i], VOL_FLOOR)
        else:           score[i] = 0

    # 2. weights in proportion to the scores
    if sum(score) > 0:  w[i] = score[i] / sum(score)   for each i
    else:               w[i] = 0                       for each i

    # 3. no instrument above the cap
    w = CAP(w)

    # 4. every market at least its minimum
    for each market m:
        need = MIN_MARKET_WEIGHT - sum(w[i] for i in m)
        if need > 0:  w = FILL(w, m, need)

    # 5. never more than 100% in total
    extra = sum(w) - 1
    if extra > 0:
        for each market m:  room[m] = max(total(m) - MIN_MARKET_WEIGHT, 0)
        for each market m, for each i in m:
            w[i] = w[i] * (1 - extra * room[m] / sum(room) / total(m))

    cash = 1 - sum(w)
    return w, cash


CAP(w):
    repeat:
        over = all i with w[i] > MAX_WEIGHT
        if over is empty:  return w
        excess = sum(w[i] - MAX_WEIGHT for i in over)
        w[i] = MAX_WEIGHT for i in over
        free = all i with 0 < w[i] < MAX_WEIGHT
        if free is empty:  return w                    # the excess stays in cash
        for i in free:  w[i] = w[i] + excess * w[i] / sum(w[j] for j in free)


FILL(w, m, need):
    order = instruments of m: first those in an uptrend, then the others;
            inside each group from the lowest to the highest volatility
    for i in order:
        added = min(need, MAX_WEIGHT - w[i])
        w[i]  = w[i] + added
        need  = need - added
        if need = 0:  stop
    return w
```

What the steps do:

- **Step 3 (CAP).** A weight above 20% is cut to 20%, and the cut part is shared by the holdings below 20% in proportion to their weights. This can push another holding above 20%, so the step is repeated.
- **Step 4 (FILL).** If a market is below 20%, it is raised to 20%. Instruments in an uptrend receive first. If the market has no instrument in an uptrend, its calmest instrument is held anyway, because the portfolio must stay invested in both markets.
- **Step 5.** Step 4 can push the total above 100% when the other market already held more than 80%. Then the market above its minimum is scaled down until the total is 100%.

## 4. Computational complexity

Let `n` be the number of instruments, `T` the number of days in the price history and `D` the number of weekly decisions (about `T / 5`).

| Part | Time | Why |
|---|---|---|
| Signals for all days | O(n · T) | A moving average is updated from the day before: one value enters the window and one leaves. So each day costs a constant amount of work, not 200 additions. |
| `CAP` | O(n) | One pass looks at every weight once. Every pass puts at least one more instrument at the cap, and at most 1 / MAX_WEIGHT = 5 instruments fit at the cap, so there are at most 6 passes. |
| `FILL` | O(n log n) | The instruments of the market are sorted once. It only runs when a market is below its minimum. |
| `ALLOCATE` (one decision) | O(n log n) | Steps 1, 2 and 5 look at every instrument once; step 3 is `CAP`; step 4 is `FILL`. |
| All decisions | O(D · n log n) | `ALLOCATE` is called once per week. |
| Whole algorithm | O(n · T + D · n log n) | signals + decisions |

Memory: O(n · T), the table of prices and the two tables of signals.

A simpler but slower design would compute every average again from its 200 prices on each decision day: O(D · n · 200). The running update avoids this.

## 5. Measured runtime

`python scripts/runtime_test.py` builds random price series of any size and times the algorithm on them. The tables and charts are in section 9 of the notebook. In short:

- **More instruments** (5 years of prices): the time for the signals doubles when the number of instruments doubles. The time for the weekly decisions hardly changes, because for these sizes the fixed cost of one call is larger than the cost per instrument.
- **More days** (20 instruments): the time for the weekly decisions grows in proportion to the number of decisions.
- **One decision** with 100 to 1,000,000 instruments: above about 10,000 instruments the time grows 10 times when the input grows 10 times.

In these random inputs a market is almost never below its minimum, so `FILL`, the only step that sorts, almost never runs, and never in the test of one decision. The measured times therefore show the steps that look at every instrument once.

These results match the table in section 4: the algorithm is close to linear in the number of instruments and in the number of days. With the real data (20 instruments, 10 years) one full run takes about a tenth of a second.

## 6. How future data is kept out

- A moving average or a volatility of day `d` is computed only from prices up to day `d`.
- The decision of a Friday reads only the signals of that Friday. On a market holiday the last known signal is used, never a later one.
- The weights apply from the next trading day, so the decision never earns the return of its own day.
- **Test.** The notebook recomputes several decisions after deleting all prices after the decision day. The weights are exactly the same as in the full run. If any later price entered a decision, the two would differ.

## 7. Known limits of this version

- The trend is measured in nominal prices. With high inflation the price of almost every lira fund rises, so lira funds are in an "uptrend" most of the time.
- Volatility is measured in the instrument's own currency. For an investor who counts in lira, a US ETF also carries the risk of the exchange rate, which this version does not see.
- A Turkish price is one trading day older than its date (see the data dictionary, section 5). On Friday the signals of the Turkish funds know the market until Thursday.
- The rules use fixed settings (50, 200, 63 days; 20%; 10%). Phase 3 tests how sensitive the results are to them.
- This version only produces target weights. Trading costs, settlement days and the gap between a decision and its execution are handled in the historical validation (Phase 3).
