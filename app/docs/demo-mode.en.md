# Demo: recorded simulation at 1.00×

Demo is an additional mode, off by default. Once a recording is prepared, one recorded second takes one real second. The standalone source includes its recorder, codec and player. Generate optional data with `node tools/record-demo.mjs`; reload the page to make Demo available.

## Calculated in advance

The recorder uses the production Worker: ball computer, supply, 15 PNP devices and electrical scope macromodel. CPU operators sit above the circuit; knob and button motion passes through Planck. Accepted beam points and controller states are retained. Binary64 values are packed losslessly by byte-plane shuffling and gzip; the codec does not replace the circuit or gameplay.

The recording manifest declares duration, hits, sizes and hashes. `DEMO_SECONDS` sets the desired main-rally length; closing the rally and preparing the seam may extend it. Nine source hashes identify the electrical and controller model used.

## Calculated in the browser

Playback still calculates the moving-beam integral, phosphor excitation/decay, glass refraction and reflections. Sound is synthesized from recorded events. Controller angles, travel and contacts replay their recorded values. Mechanics is enabled in the recording and the panel says so explicitly; playback cannot change already recorded motion.

Glass and language switches retain the playback position. WebGL uses 512×512; the demo CPU fallback uses 128×128 at up to 20 Hz presentation. Normal live-play CPU rendering remains 384×384. Beam, phosphor and glass equations are shared.

## Real-time clock and loops

Replay follows absolute animation timestamps rather than accumulating rounded frame durations. Pauses exclude stopped time. The same fragment restarts at its end while the global playback clock continues.

For the closing sequence, operators choose low shots and late returns near the edge. If a reset is required, it is allowed only after the ball leaves below the calibrated screen aperture. Both controls then approach their initial settings from the same direction. The last point is selected among accepted SPICE samples to match beam phase.

The boundary matches the serve position and controller settings. A path break prevents a fabricated segment between the end and beginning. Phosphor is retained; initial light is warmed from the actual recorded tail. This is a selected boundary of a finite recording, not a claimed exact periodic solution of the entire circuit.

## Validation and reproduction

`node tests/verify-demo.mjs` checks lossless binary64, tempo at 30/60/144 Hz, irregular frame delivery, pause/reset and a path break retaining phosphor. Recorded-trace validation and its rendering cost run after data generation; absent data is explicitly SKIP. Ready-made WASM supports immediate use; numerical-core source and patches support rebuilding.

Each recording is separately checked for the final rally height, endpoint coordinates, control positions and phosphor images around the seam. Playback rate and continuous electrical-solver speed are different measurements.

## Sources and attribution

The circuit, ngspice, woscope, Planck and historical materials retain the authors and licenses listed in the research. The recording format, player and checks are independent MIT project code. Browser references: [requestAnimationFrame](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame), [Page Visibility API](https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API), [Compression Streams API](https://developer.mozilla.org/en-US/docs/Web/API/Compression_Streams_API).
