## Electrical validation of profile 0.7.0

Release 0.8.4 retains the checked 0.7.0 circuit equations. Measurements below belong to the stated Linux/Node/WASM scenarios.

| Check | Measurement | Scope |
| --- | --- | --- |
| Joined circuit | 7 / 7 | Wiring, accepted beam, state transfer, screen and CPU |
| Coordinate transfer | 124.081 µV | Maximum on the control trajectory |
| Normal checkpoints | 2.667 µs | Maximum edge shift in the declared window |
| Frequent checkpoints | 1.396 µs | Maximum edge shift in the declared window |
| Cold-start coordinates | 0.405 mV | Entire 0.4 s window, including startup |
| Cold-start matching edges | 13660.128 µs | 20 µs post-analysis grid; original maxima retained |
| Cold-start settled maximum | 76.363 V | Explicit ±150 µs edge exclusions |
| Cold-start raw maximum | 76.363 V | Original pointwise 20 mV criterion failed |
| Forced Worker transfer | 0.040 s / — hits | 8 transfers; peak WASM 83.06 MiB |
| Production Worker | 12.002 s / 9 hits | 24 transfers; peak WASM 119.62 MiB |
| Common initial state: coordinates | 0.208 mV | Native/WASM continue one accepted point after 0.25 s |
| Common state: edges / settled | 19.985 µs / 3.327 mV | Reported separately from cold startup |

### Interpretation

At cold start, the bistable can choose a different initial B/C order. Same-labelled signals then differ outside edges too. The failed cold-start comparison remains in the report. A separate shared-initial-state experiment checks numerical continuation of the same accepted state. Its original pointwise 20 mV edge criterion also fails; timing and settled-voltage criteria are reported separately.

The initial 25 µs / 10⁻⁶ profile increased direct-session memory and exposed a fresh-Worker continuation error. The production restore first establishes saved UIC state over 1 µs with the previous inputs, then applies the next controller command. No startup or serve is repeated. Original failed logs are retained.

E1 contains 40 completed transients, two convergence failures, one timeout and two completed AC cases. These are research variants, separate from production checks.

M1/Firefox speed and hardware WebGL are unmeasured. CPU fallback is available. Machine reports: joint-validation.json, worker-validation.json, joint-phase-validation.json, joint-native-validation.json, joint-native-warm-validation.json.
