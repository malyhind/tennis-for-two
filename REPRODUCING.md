**English** · [Русский](REPRODUCING.ru.md)

# Reproduce the instrument

[Imperial School Laboratory](https://games.oopssre.ru/en/lab/) · [Imperial School Arcade](https://games.oopssre.ru/)

## Runtime and tests

The supplied JS/WASM pair is ready to run over HTTP. CLI checks were executed with Node.js 24.22.1. Use the named scripts in package.json:

| Command | Scope |
| --- | --- |
| `npm test` | Ball computer and optional native comparison |
| `npm run test:display` | Separate transistor switch |
| `npm run test:cpu` | Operators and circuit inputs |
| `npm run test:joint` | Joined circuit, beam and state transfer |
| `npm run test:worker` | Production Worker and memory-driven transfers |
| `npm run test:continuity` | Edge timing around continuation |
| `npm run test:joint-native` | Cold-start native/WASM comparison |
| `npm run test:joint-warm` | Native/WASM continuation from a shared state |
| `npm run test:mechanics` | Knob/button mechanics |
| `npm run test:mechanics-joint` | Mechanics and electrical inputs |
| `npm run test:restart-inputs` | Input preservation through transfers |
| `npm run test:controller-worker` | CPU/controllers over the production Worker |
| `npm run test:transactional-worker` | Rejected candidate recovery |
| `npm run test:glass` | Snell/Fresnel and retained phosphor |
| `npm run test:demo` | Clock, loops, hashes and bundled-recording compatibility |

Serve the root over HTTP and open `tests/scope-check.en.html` for the browser display bench. Missing GPU features are reported as SKIP. This bench supplies the actual target-machine hardware check.

Tests update individual JSON reports in `app/docs/` and may create `tests/results/`. The initial reports preserve their measured dates and scenario scope. Native comparisons require ngspice 45.2; specify `NGSPICE=/path/to/ngspice`. The cold-start native comparison has known transition/initial-branch differences; its failing strict pointwise criterion is retained. A common-state continuation is a separate test, not a replacement for the cold-start case. See the research for thresholds and excluded windows.

## Rebuild WASM

Ready-made `app/vendor/spice.wasm` SHA-256:
`7e92084ce97153e5288919cfcd64a2255dad37a7e5d9abf2d1350f09df667a5c`.

Prerequisites: Python 3.12+, patch, make and an activated Emscripten toolchain. The supplied build record identifies Emscripten 3.1.6 and the selected O3/prepared-evaluator flags. Source preparation can be checked independently:

```sh
python3 tools/build_solver.py --prepare-only
python3 tools/build_solver.py --optimization O3 --no-lto --evaluator prepared
```

Each invocation uses a fresh directory under `.solver-build/`. The complete build prints its output directory containing `spice.js`, `spice.wasm` and `build.json`. Replace the shipped pair together only after comparing the relevant numerical checks. The script verifies included source archive hashes, applies the cumulative eval2 patch and uses the retained EEcircuit bridge. Tool versions and flags are recorded in `app/vendor/source/`; different compilers can change artifact bytes.

## Model and optional recording

The three live control modes use the same electrical model. Circuit files are `app/tennis.cir`, `app/display-switch.cir` and `app/scope.cir`; `app/joint-circuit.js` builds the actual joined deck. `app/joint.cir` is a saved inspectable deck.

A ready looped recording is included in `app/demo/`; Demo is immediately available and live simulation remains the default. `node tools/record-demo.mjs` generates another replay. By default it targets 30 seconds of rally time, then closes the loop; `DEMO_SECONDS` changes that target. It uses the production Worker, CPU profiles, Planck controls and lossless binary64 codec. Reload the page after replacing a recording. Each recording's duration is declared in its manifest.

`python3 tools/study_supply_divider.py` repeats the separately declared static DC-divider calculation. The dated reports and research distinguish numerical reproducibility, reconstruction assumptions and historical evidence.
