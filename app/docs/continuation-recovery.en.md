# Circuit continuation after an initial-point rejection

Version 0.8.3, 25 October 2026.

## Observed public failure

The published 0.8.1 instrument stopped at 30.84 seconds of circuit time. Its last accepted sample was 30.83979053324082 s. ngspice reported `Timestep too small; initial timepoint`, naming clamp diode `d.xu1.dpositive`. Restoration failed, including the retry with a larger iteration budget. The internal solver point was lost when its Worker terminated. The log and last 6000 measurements were retained; they record the failure rather than provide an exact executable replay of the entire match.

The earlier thirty-second scenario passed, but this run exposed another state. A passing scenario does not establish convergence for every state.

## Validate before handoff

The live Worker prepares node voltages, seven coil currents, external time phase and inputs without reloading its circuit. A second Worker validates restoration with the previous sources over the microsecond priming interval. Only after success does it become the live Worker, consume the waiting controller command and replace the previous Worker.

If restoration is rejected specifically at the initial point, only the candidate Worker terminates. The original solver retains its accepted point and Gear history, consumes the waiting command once and continues. Its next handoff attempt is deferred by 50 ms of circuit time. Other errors reach the normal stop handler.

In production this replaces the destructive internal circuit reload every 0.5 s. Two Workers briefly coexist during transfer. Their startup cost and total browser memory depend on the environment. The 240 MiB WASM-heap threshold remains. A successful restoration still begins a new Gear history; rejecting the candidate leaves the original history intact.

## Numerical model

Electrical netlists, SPICE session source, compiled WASM, joined-deck definition, beam, phosphor, glass and controller models retain their equations. Second-order Gear, f64, the 50 us maximum step and convergence tolerances remain. Handoff does not repeat the serve or instrument warm-up.

## Verification

`transactional-worker-validation.json` contains two checks. The first explicitly rejects candidate initialization five times using the error text observed on the public page. The original Worker continues: 45 consecutive state and electrical-beam samples match an independent uninterrupted reference bit for bit. Handoff succeeds once the injected rejection is removed. The second check confirms that an unrelated loading error remains an error rather than being counted as a deferred handoff.

`worker-validation.json` records an actual twelve-second run: 2398 intervals, nine hits and 24 successful handoffs. `controller-worker-validation.json` checks a longer sequence with mechanical controls, CPU play, reset and a low-angle hit. These scenarios differ from the lost internal state of the published failure.

Validation results and before/after byte comparisons are recorded in `continuation-fix-2026-10-25.json`. The optical model and its switch are included in this release.
