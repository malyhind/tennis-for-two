# Tennis for Two electronic switch · standalone bench

Detailed standalone-network documentation, originally introduced in project 0.4 and retained with its stated test settings. The current playable instrument additionally joins the ball computer, passive supply, switch and electrical scope. See [the complete research](research.en.html).

## Transcribed topology

Basis: BNL EH 1-900-2-3 A, 18 November 1959.

| Section | Implementation |
| --- | --- |
| Oscillator | Two PNP, 20 kΩ base resistors, 0.5 µF cross-coupling, 2 kΩ collector loads |
| Pulse tap | Right load split into two 1 kΩ resistors; midpoint feeds 1 nF /5.1 kΩ differentiator |
| Divider | Two cross-coupled PNP, 10 kΩ ∥1 nF, 30 kΩ base bias |
| Drivers | Five PNP read emitter currents through 510 Ω and drive three phases |
| Selection | Six PNP, 51 kΩ /1 kΩ input dividers, 51 kΩ base resistors and shared X/Y emitter outputs |

The oscillator’s right stage blocks B and C together. The bistable alternates them in the remaining intervals, producing A–B–A–C or A–C–A–B depending on startup phase. A occupies about half the time; B and C about a quarter each. The network has no behavioral clock or ideal keys. Component names were introduced by us because the drawing has none.

## Selected approximations

The drawing supplies 2N140 identity and values. RCA SC-11(1964), p.131 gives a small-signal gain of 75 at one operating point. It supports the initial gain parameter, not a complete SPICE identification. Reverse gain, leakage, junction capacitance, transit times and diode parameters are selected. Absolute-maximum ratings are not avalanche parameters. The model does not establish original-device rating compliance or simulate junction breakdown.

The standalone bench uses four nominal DC ports: +12, +6, −6, −22 V. Its six inputs are test sources; 60 Hz sweeps are declared stimuli. Scope loading is 1 MΩ ∥30 pF. Initial voltages select a repeatable phase; 40 ms of startup is excluded from settled-cycle metrics. The playable game’s supply and scope loading are documented separately.

## Frequency and numerical accuracy

The original separate model produces about 39.09 Hz per full cycle. BNL quotes Takacs’s36 Hz without phase traces; comparison with our full cycle is an interpretation. Capacitors were not retuned to force the frequency.

Reference: Gear 2, maximum 20 µs, reltol 10⁻⁶, 0.24 s window. Bounded: same network, maximum 50 µs, reltol 10⁻⁴, 0.12 s. Supported bounded variations are BF 50–100 and 10–40 °C. Limits are checked before execution. Both export a20 µs grid after analysis with linearize.

In ngspice 45.2 `src/frontend/outitf.c`, the static interpolated flag stays set after interp is enabled; unset interp does not reset it. Every standalone-display run therefore starts a separate session without interp and linearizes after solving. Internal adaptive step and measurement grid remain separate.

The bounded/reference criteria are frequency error≤0.1%, edge shift≤50 µs, settled X/Y≤10 mV, RMS≤3 mV and duty difference≤0.3 percentage points. Settled measurements exclude±100 µs around switches. They characterize numerical approximation of this network.

## Connection to the game

This bench measures a separate network. The current game directly connects the switch to its computer and scope loading in one analysis. The times below belong to the standalone bench.

Checks: `display-validation.json`. Three-repeat timing comparison: `display-performance.json`.

## Measured performance

Three alternating runs per profile on the same 0.24 s window gave medians 2.188 s and 0.841 s, or 2.603×. The short 0.12 s window took 0.410 s. Environment: Node.js v24.22.1 with WASM already loaded. Timing includes circuit loading, transient analysis, linearization and trace parsing; initial WASM download/compilation is excluded.

At BF 75 and 25 °C, relative frequency error was 0.01117%, edge shift 20.001 µs and maximum settled X/Y difference 3.688 µV. Parameter-range checks are recorded in the validation report.

## Frozen computer frame

The instrument’s engineering link pauses play and passes calculated U7 horizontal and U2 vertical voltages into the bench as constant ball sources. Net and court retain the test sweeps. The transistors switch these three pairs in a transient calculation. The URL contains no internal C/L state and cannot resume the original session; it describes one frozen input frame.
