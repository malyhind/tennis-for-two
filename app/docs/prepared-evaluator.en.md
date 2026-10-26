# Prepared expression execution · 0.5.2

Research into prepared execution of ngspice behavioral sources. Compared builds use the same Tennis for Two circuit, profile 0.3.1, component models and solver tolerances. This is a historical engine experiment; the current instrument is described in [the complete research](research.en.html).

## Execution

Ordinary PTeval recursively visits expression and derivative trees. The prepared version constructs an instruction sequence once, then executes it iteratively using assigned intermediate-value slots.

Argument and arithmetic order are retained. Conditional expressions use jumps and evaluate only the selected branch. Shared subexpressions are reused within one IFeval call. Every following call receives a fresh stamp, including Newton iterations and later time points.

Mathematical functions, division and powers use the existing ngspice routines and double precision. ddt and unknown/private-data operators use the original evaluator. PWL and its derivatives are supported. Limits are 8192 nodes, 65536 instructions and preparation depth 256; exceeding a limit falls back to the original evaluator. Deleting the circuit tree releases the plan.

The implementation targets this single-threaded build. The test does not cover every ngspice extension.

## Checks

A differential C test compares results and auxiliary outputs bitwise against 0.5.1: 100401 calls, 1000 random graphs, domain errors in unselected branches, changed PWL private data, stateful fallback, time, temperature, frequency and depth-limit fallback.

AddressSanitizer and UBSan passed. An isolated allocation counter returned to zero after each graph deletion. LeakSanitizer failed to access /proc in this environment and its result was excluded. The repeated run used ASan with detect_leaks=0 and the separate counter. This checks the new evaluator’s selected memory behavior, not all ngspice allocations.

Nine SPICE integration cases cover nonlinear expressions, conditions, ddt, two gmin settings, the AC Jacobian, PWL, time/temperature, frequency and 20 sequential resets with circuit recreation. Native execution confirmed preparation of 94 expressions in the joined circuit.

Signal comparisons concern exported samples rather than every internal adaptive point.

## Source patch

The cumulative C patch is `../vendor/source/ngspice45.2-tft-eval2.patch`, applied to original ngspice 45.2. Variants change evaluator, optimization level and LTO.

## Measured result

| Build | Node/WASM, s | Chrome Worker, s |
| --- | --- | --- |
| 0.5.1 · O2 / cache | 6.607 | 6.528 |
| Cache · O3 | 6.306 | 6.465 |
| Cache · O3 / LTO | 6.563 | 6.431 |
| Prepared expressions · O3 | 5.319 | 5.499 |
| Prepared expressions · O3 / LTO | 5.357 | 5.717 |

Each candidate had three runs per environment. Node time fell 19.5%, from 6.607 to 5.319 s; browser time fell 15.8%, from 6.528 to 5.499 s. O3 with the prepared evaluator and without LTO was selected.

The same continuous PWL-serve bench represented 0.4 s, 69 signals and 400 rows on a1 ms grid with 17 significant digits. All 15 Node and 15 browser exports matched. WASM/source loading was excluded from timing; initial circuit settling was included. This measures computation, not interactive frame rate.

An initial browser batch loaded five modules into one Worker and produced uneven timings, including a slower new candidate. It is retained in full and the cause remains unresolved. The subsequent series used a fresh Worker per run and varied candidate order between repetitions, matching the production one-engine-per-Worker arrangement more closely.

All 32 game checks passed again: 15 computer, 9 display-bench and 8 CPU, including native comparisons, with no skips. Data: [prepared-evaluator-validation.json](prepared-evaluator-validation.json).

This historical browser bench required about 13.7 seconds of wall time per simulated second. It is not a benchmark of the current interactive loop or Mac M1/Firefox. The current game joins computer, switch and passive display supply in one transient; remaining macromodels are documented.
