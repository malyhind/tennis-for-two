# ngspice 45.2-tft-eval1 · game 0.5.1

Historical behavioral-source evaluation experiment with identical circuits, values and tolerances. See [the complete research](research.en.html) for the current joined instrument.

## C changes

A behavioral source evaluates an expression and derivatives to fill the matrix. Shared subtrees were repeatedly traversed within one IFeval call. Our patch retains their results until that call ends. The next call uses a new 64-bit stamp, so no cache persists between Newton iterations or time points. Stateful/private operators such as ddt use ordinary traversal. Arithmetic +, − and * is direct; the division gmin adjustment is prepared at call entry. Double precision and dependent-operation order are retained.

The changes target the single-threaded build. General multithreading and every third-party extension were not tested.

## WASM changes

Asyncify lets the command loop await JavaScript input. Its conservative analysis also wrapped mathematical functions. We excluded specific known synchronous B-source functions while retaining indirect-call handling: `ASYNCIFY_IGNORE_INDIRECT=0`. The list is in `../vendor/source/wasm-build.json`.

For LLVM 15, main remains explicitly exported. Device coverage follows the EEcircuit build, retaining Tennis for Two components. Circuit topology and values are unchanged.

## Measurements

| Experiment | Baseline | Modified |
| --- | --- | --- |
| Native ngspice, identical 0.85 s, median of 3 pairs | 13.565 s | 10.331 s |
| Same-SDK WASM, identical 0.4 s, 3 alternating repeats | 11.155 s | 6.331 s |
| Chrome/Linux Worker, 0.4 s, one run | 11.911 s | 6.625 s |
| Previously shipped 0.5.0 in the same browser experiment | 12.735 s | 6.625 s |

The same-SDK WASM speedup was approximately 1.76×, a43% time reduction. Against the earlier shipped build, the browser run gave approximately 1.92×. A single browser run is not a statistical device-wide estimate.

The joined experimental circuit includes a PWL serve, test sweeps and initial settling. WASM loading and circuit parsing are excluded from WASM timing. It does not measure the interactive controller loop.

All three WASM repeats matched 69 signals, 400 rows on a1 ms grid with 17 significant digits. Native pairs matched 850 rows. This concerns observed samples rather than all internal adaptive points.

## Checks

- 15 computer checks: charge, R–L networks, bounces, hit interlocks, pause/resume, checkpoints, convergence and native comparison.
- Nine discrete-display checks.
- Eight automatic-operator checks.
- Five additional native/WASM cases: nonlinear expressions, conditions, ddt, division with different gmin values and AC Jacobian.

All listed checks passed. Reports and hashes: `engine-optimization-validation.json`, `validation.json`, `display-validation.json`, `cpu-validation.json`.

The test browser environment had large requestAnimationFrame intervals even on an empty page. Those intervals were excluded as evidence of game smoothness. Worker computation was measured separately; M1/Firefox requires its own benchmark.

## Source and scope

C patch: `../vendor/source/ngspice45.2-tft-evaluator.patch`. Original ngspice and EEcircuit wrapper: `../vendor/source/`.

This 0.5.1 browser bench needed approximately 16.6 wall seconds per model second. Current joined parameters and validation are in [the research](research.en.html).
