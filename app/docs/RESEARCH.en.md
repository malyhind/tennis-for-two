# Tennis for Two: reconstructing an electrical instrument

Research and engineering report. Version 0.8.4, 25 October 2026.

Project author: Dmitry Malykhin, Gremlin. Research and development in dialogue with ChatGPT (OpenAI). External authors are credited in the provenance register. Our code and explanatory writing are released under MIT.

## 1. The result

The working browser instrument joins the ball computer, transistor display switch and electrical oscilloscope macromodel in one ngspice/WASM transient analysis. Every circuit element shares the same physical time. The electrical model determines ball position, bounces and interlocks. The screen receives deflection-voltage and beam-current traces.

The reconstruction follows surviving documentation, with declared equivalents where component details are unavailable. Its acceptance criteria are documented connections, justified substitutions and a checked numerical calculation. The lost original is not a prerequisite for completing this reconstruction.

| Evidence | What it establishes |
| --- | --- |
| Historical sources | Accounts, surviving schematics and manufacturer documentation |
| Electrical model | Implemented connections, selected equivalents and explicit parameters |
| Numerical checks | Convergence, solver comparisons, state continuity and repeatability |

Numerical differences describe the chosen model and test scenarios. Component assumptions and historical interpretation are recorded separately.

The optional Demo mode additionally replays a lossless thirty-second circuit/operator/control recording at 1.00x real time. Its screen and glass remain calculated in the browser. Demo is off by default; the three game modes retain live electrical simulation. The recording and timing checks are documented in the Demo appendix.

## 2. Historical basis

Tennis for Two was shown to Brookhaven visitors on 18 October 1958. William Higinbotham and Robert Dvorak used an analog computer, two handheld controllers and an oscilloscope. The display showed a side view of the court, net and ball. A knob selected the shot direction; a button hit the ball from its current position. Source: BNL [H1].

The published computer drawing EH 1-900-1-3 A is dated 15 October 1958 [H2]. The display-switch drawing EH 1-900-2-3 A is dated 18 November 1959 [H3]. We retain both dates: the joined model reconstructs the documented instrument principle rather than asserting an exact component inventory for the October 1958 demonstration.

Raiford Guins describes assembly corrections that were not entered into the surviving drawing [H7]. We therefore record interpretations explicitly when the drawing leaves a conflict.

### Peter Takacs and the hardware restorations

Takacs’s team recreated the game for the laboratory anniversary in 1997. BNL’s account of the 2008 demonstration names Peter Takacs, Gene Von Achen, Paul O’Connor and Scott Coburn. Mechanical relays and germanium transistors were used with a modern analog replacement for the computer [H4].

In his 2010 account, Takacs describes semiconductor damage from relay-switching transients and preparations to connect a restored Donner Model 3400 [H5]. This is relevant hardware experience; Model 3400 is kept distinct from the original Model 30.

BNL’s explanation quotes Takacs’s 36 Hz display-switching figure [H1]. Treating it as the full cycle of our three-channel network is an interpretation; the publication supplies no phase-resolved electrical traces.

## 3. What other projects contributed

Angel De La Cruz and John Ryan’s MIT 6.101 project of 2016 demonstrates a working modern analog architecture, using its own components, generators and voltage scales [H6]. Its values are not presented here as 1958 component specifications.

MEGA/T42 provides hardware and functional comparisons [H8]. TeTS is an independent software interpretation whose author describes a selected drag law and display-trail model [H9]. We found no primary support for describing it as an official BNL simulator with millimetre accuracy.

The existing **woscope** algorithm [S3, S4] supplies an analytical Gaussian-beam integral; its authors and MIT license are preserved. MAME/BGFX [S5] informed the separation of phosphor excitation, decay, HDR accumulation and presentation. We make no claim of worldwide priority.

## 4. The ball computer

Four 1 µF charge banks charge through 50 kΩ. Contacts switch these banks into the velocity amplifiers’ feedback paths. Networks of 1 MΩ and 1 µF integrate the outputs. Feedback also includes 10 MΩ in parallel with 0.01 µF. U7 represents X; U2 is the vertical coordinate relative to the top of the net.

Holding capacitors of 10 µF and 5 µF are reconnected at ground and net collisions. A bounce follows from changed connections and charge redistribution. The game JavaScript contains no separate projectile integrator or velocity-restitution multiplier.

### Declared equivalents

The amplifier has finite gain, a dominant pole, rail saturation and output resistance. The relay has an R–L coil, rectification and protection paths, hysteretic thresholds and an RC equivalent for armature motion. Contacts use finite conductance and smooth transitions. Interlocks use electrical state and behavioral sources.

| Parameter | Working setting | Basis |
| --- | --- | --- |
| Integrator network | 1 MΩ / 1 µF | Surviving drawing |
| Bank charging | 50 kΩ / 1 µF | Surviving drawing |
| Ground / net holding capacitors | 10 µF / 5 µF | Surviving drawing |
| −G voltage | −60 V | Reconstruction setting |
| Net height / X limits | 20 V / ±75 V | Selected scale |
| Serve position | X = ±62 V | Calibration |
| Amplifier | A0 = 10000, 1 Hz pole, 100 Ω output | Macromodel |
| Relay coil | 10 kΩ, 10 H, 50 µA threshold | Engineering equivalent |
| Closed contact | Approximately 50 Ω | Engineering equivalent |

The full parameter set, control laws and C01–C07 substitution register are in `model.json`, `corrections.json` and `tennis.cir`. The executable netlist defines the connections; JSON indexes them.

## 5. The transistor display switch

The switch has 15 PNP transistors: two in the oscillator, two in the bistable divider, five drivers and six analog keys. It selects the ball, net and court channels electrically, without a programmed phase schedule.

Two 1 kΩ resistors form a load with a differentiated-pulse tap. The network includes 20 kΩ, 0.5 µF, 510 Ω, 10 kΩ in parallel with 1 nF, and 51 kΩ / 1 kΩ input dividers. Detailed connections are in `display-switch.cir` and `display-model.json`.

The preliminary Ge PNP model uses BF = 75, leakage and reverse gain, series resistances, capacitances and transit times. RCA SC-11 supports identification of the 2N140 and one small-signal operating point [H10]; the remaining switching parameters are selected model values. Reverse operation and breakdown are not identified from the original parts.

The separate bench produces approximately 39.09 Hz per full cycle. The historical 36 Hz figure is shown for comparison; capacitors were not silently retuned to force that value.

In the game, the transformer, bridge, divider and four filter capacitors are calculated with the load. Net and court signals have separate AC branches and finite potentiometer resistance. Supply phase survives continuation. Transformer parameters, offsets and regulator settings are listed as calibration choices.

## 6. One transient analysis

U2/U7 connect directly to the keys. Display loading participates in the common electrical calculation. The switch feeds the oscilloscope inputs. Computer, switch, supply and oscilloscope are solved by one ngspice matrix with one clock; the renderer consumes the resulting beam trace.

The separate diagnostic bench holds the ball input fixed to measure frequency, transfer and isolation. The playable model continuously updates the switch input through the ball computer.

The maximum internal step is 50 µs, using second-order Gear, reltol = 10⁻⁴, abstol = 10⁻⁹ A and vntol = 10⁻⁶ V. Controller state is exchanged every 5 ms of simulated time. Beam traces retain actual accepted adaptive points.

### Trace extraction and memory

Dense resumed output exposed distortion with ngspice 45.2’s `interp` mode. The joined live session disables it at load time. The display keeps accepted points and their timestamps. Post-analysis linearization appears only in explicitly identified comparison benches.

Checkpoints transfer node voltages, capacitor states and coil currents into the next analysis segment. Algebraic amplifier guesses are also retained for a stable restart. Gear history restarts, so boundary error is measured against uninterrupted analysis. External sine sources include the accumulated time offset.

Long runs revealed increasing allocated WASM memory after repeated circuit loads. In 0.8.4 a fresh Worker validates the saved electrical state before the live one is released. Handoff is requested at safe half-second boundaries or above the selected heap threshold. An initial-point rejection keeps the original solver running and defers another attempt by 50 ms. The continuation appendix documents the public failure and regression checks. An active button pulse finishes before transfer. The saved point is first established with the old inputs over 1 µs, then the waiting controller command is applied. There is no repeated 0.25 s startup or new serve.

## 7. Electrical oscilloscope model

Published DuMont 5ADP-family and 304-A specifications provide the scale [D1, D2]. Deflection is electrostatic; magnetic deflection coils are not introduced.

| Quantity | Value | Basis |
| --- | --- | --- |
| X input | 2.2 MΩ in parallel with 50 pF | 304-A nominal specification |
| Y input | 2 MΩ in parallel with 50 pF | 304-A nominal specification |
| Accelerating-voltage reference | 1.6 kV | Selected operating reference |
| X / Y sensitivity | 48 / 36.8 V per inch | 5ADP-family scale at that reference |
| Macromodel bandwidth | Two poles at 300 kHz | Our implementation of the published response limit |
| X / Y gain | 54 / 44 | Scale calibration |
| Plate offset and limits | Explicit, ±110 V | Calibration |
| Beam current | Nominally 25 µA | Selected setting |

Two cascaded poles give magnitude 0.9 at 100 kHz and 0.5 at 300 kHz. Input R/C loads the switch in the common circuit. The tube stages, high-voltage supply, cathode heating and aging are represented at macromodel level.

## 8. Beam and phosphor

The renderer receives only time, X/Y plate voltages and beam current. It does not identify ball, net or court objects. Pause, hints and diagnostics stay on the external panel.

woscope integrates a Gaussian spot along a short movement segment. Longer dwell deposits more energy. Our adaptation uses a normalized two-dimensional spot and a segment charge proportional to current and duration. woscope’s erf approximation traces back to Evan Wallace’s published CC 0 code [S6]; this attribution is preserved.

Two linear accumulation-and-decay components describe the phosphor. Each stores energy and decays as exp(−Δt/τ); presentation follows accumulation. A generic RCA P1 removal curve from 1951 is the reference. Ten graphically read points were fitted with 2.858 and 20.932 ms time constants. Assuming linear steady excitation, these correspond to a 4.719% slow impulse-deposition fraction. The graph’s excitation history is unknown; this is a declared interpretation of generic P1. Spot width, halo and photometric scale are calibration parameters.

WebGL2 stores energy in RGBA32F and checks EXT_color_buffer_float and EXT_float_blend against Khronos specifications [S7]. CPU fallback uses the same integral and clock, with a smaller buffer to reduce presentation cost. Re-presenting a paused frame adds no energy. On context loss, CPU rendering replays one second of recent beam history, covering more than 47 slow time constants.

## 9. CPU operators

The three modes are Me and Opponent, Me and Fox, and Gremlin vs Fox. Automatic operators use the same knobs and buttons as people. They observe delayed ball positions and permission lamps. Velocity is estimated from observation history; future trajectories and instantaneous internal solver velocities are not exposed to the decision logic.

Brenner and colleagues distinguish position corrections from responses to changed motion [C1, C2]. Van Zon and colleagues model rotary-control movement duration with Fitts’s law [C3]. Firoiu and colleagues study action delay in game agents [C4]. These support the model structure.

Our profile uses 200–300 ms delays, a maximum knob speed of 0.60 ranges per second and movement duration depending on distance and accuracy. They are open game parameters. [CPU as a controller operator: evidence and implementation](cpu-research.en.md) gives the studies, numerical examples and transfer assumptions. Human gameplay comparison remains a separate validation task.

## 10. Numerical-engine work

ngspice is an external solver with its own authors. Version 0.5.1 reduced repeated visits to shared subexpressions and unnecessary Asyncify wrappers for known synchronous functions. Version 0.5.2 prepares expression and derivative trees as operation sequences. Values are reused only inside one IFeval call; Newton iterations and time steps recompute them. Selected conditional branches are preserved. Stateful or unknown functions fall back to the original evaluator. Plans are released with their trees.

Five builds compared O2, O3, LTO, the prepared evaluator and combinations. O3 with the prepared evaluator and without LTO was selected. On the same historical joined bench, representing 0.4 s of model time:

| Environment and condition | Before | 0.5.2 | Time reduction |
| --- | --- | --- | --- |
| Node/WASM, median of three runs | 6.607 s | 5.319 s | 19.5% |
| Chrome/Linux, fresh Worker per run | 6.528 s | 5.499 s | 15.8% |

All 69 signals in that bench matched. The evaluator passed 100401 bitwise comparisons and nine SPICE scenarios. These measurements belong to that model and environment, not the current game’s FPS or M1 performance. An initial browser batch running multiple modules in one Worker had anomalous timings; those results are retained and their cause is unresolved.

Generated expression functions, SIMD and GPU circuit solving are proposals, not features in this release.

## 11. Checks and interpretation

Checks cover the ball computer, separate switch, CPU operators and joined circuit. State-transfer tests compare voltage and edge timing; renderer tests compare the beam integral and energy accumulation. Reports retain conditions, original criteria and failed cases.

WebGL2 is unavailable in the test cloud Chrome. CPU fallback starts successfully; GPU checks are skipped. This version has not been benchmarked on the target Mac M1 / Firefox.

## 12. Research materials

The [game page](https://games.oopssre.ru/en/lab/tennis-for-two.html) provides the report and source archive. Executable circuits, parameters, dependency source, solver changes, tests and logs support reproduction of the results. Reproduction instructions accompany the source.

Our code and writing use MIT. External components retain their licenses and credits. The report includes the complete provenance register.

## 13. Adopted reconstruction choices

The working release uses primary schematics, published specifications and declared equivalents. The passive supply and loaded line sources participate in the common simulation. Relay contacts, Donner amplifiers and tube oscilloscope stages use documented macromodels.

The 1957 Donner Model 3000 handbook supplies an internal tube schematic and response information. Its identity with Model 30 is not established. Takacs used modern op-amps and later restored a Model 3400; these models are kept distinct.

The playable amplifier remains the checked finite macromodel. Wider-band and current-limited candidates produced convergence or checkpoint-continuation errors and were rejected for this release. The experimental observations are recorded separately from successful production checks.

## Research sources

- [H1] BNL, The First Video Game?: https://www.bnl.gov/about/history/firstvideo.php
- [H2] Tennis Programming, 1958: https://www.bnl.gov/about/docs/videogameschematic1.jpg
- [H3] Electronic Switch, 1959: https://www.bnl.gov/about/docs/videogameschematic2.jpg
- [H4] Diane Greenberg, BNL, 03.11.2008: https://www.bnl.gov/newsroom/news.php?a=2964
- [H5] Peter Takacs, 14.12.2010: https://scienceblogs.com/brookhaven/2010/12/14/resurrecting-one-of-the-worlds
- [H6] Angel De La Cruz, John Ryan, MIT 6.101, 2016: https://web.mit.edu/6.101/www/s2016/projects/angeld19_Project_Final_Report.pdf
- [H7] Raiford Guins, The Strong, 13.01.2017: https://www.museumofplay.org/blog/following-the-bouncing-ball-tennis-for-two-at-the-strong/
- [H8] MEGA, T42: https://www.m-e-g-a.org/research-education/research/t42-tennis-for-two/
- [H9] RetroAnalyst, TeTS, 04.08.2021: https://www.retrogamedeconstructionzone.com/2021/08/the-tennis-for-two-simulator-tets.html
- [H10] RCA Transistor Manual SC-11, 1964, p.131: https://manuals.plus/m/db7d541ddf75928e77eb98d8259325b533a3e448761ab34769aa85c3f69a86b6.pdf
- [D1] DuMont Oscillographer, 14(1), 1953: https://www.oscilloscopemuseum.org/uploads/8/9/7/7/89778727/dumont_-_oscillographer_-_vol._14_no._1.pdf
- [D2] DuMont 304-A Operating and Maintenance Manual: https://www.opweb.de/en/manufacturer/dumont-oscilloscope-laboratories-inc/304a
- [S1] ngspice: https://ngspice.sourceforge.io/ ; license inventory: `../vendor/COPYING`.
- [S2] EElab.dev, EEcircuit-engine: https://github.com/eelab-dev/EEcircuit-engine
- [S3] Igor Null, Chad von Nau, woscope: https://github.com/m1el/woscope
- [S4] Igor Null, How to draw oscilloscope lines with math and WebGL, 17.09.2015: https://m1el.github.io/woscope-how/
- [S5] MAME, BGFX vector CRT renderer: https://docs.mamedev.org/techspecs/bgfx_vector_crt.html
- [S6] Evan Wallace, Fast Rounded Rectangle Shadows, CC 0: https://madebyevan.com/shaders/fast-rounded-rectangle-shadows/
- [S7] Khronos: https://registry.khronos.org/webgl/extensions/EXT_color_buffer_float/ ; https://registry.khronos.org/webgl/extensions/EXT_float_blend/
- [C1] Brenner, Smeets, de Lussanet, 1998: https://doi.org/10.1007/s002210050535
- [C2] Brenner, Bom, Smeets, 2026: https://doi.org/10.1007/s00221-026-07264-3
- [C3] van Zon, Borst, Pool, van Paassen, 2019/2020: https://doi.org/10.1177/0018720819862146
- [C4] Firoiu, Ju, Tenenbaum, 2018: https://arxiv.org/abs/1810.07286

## Additional primary documents

- [B3] William Higinbotham, 1976 technical account, BNL archive: https://www.bnl.gov/about/docs/higinbotham_deposition.pdf

- [G1] RCA Semiconductor Products, 1960: https://n4trb.com/AmateurRadio/SemiconductorHistory/RCA_Semiconductor_Products_1960.pdf

- [G2] RCA Transistor Manual SC-12, 1966, printed p. 122: https://ftpmirror.your.org/pub/misc/bitsavers/components/rca/1966_SC-12_RCA_Transistor_Manual.pdf

- [G3] Taitron 1N100 datasheet, modern: https://www.taitroncomponents.com/catalog/Datasheet/1N100.pdf

- [A1] Dana Peckworth, Resolution of complex decay curves by analog computer techniques, 1959, printed pp. 4–5, 37: https://archive.org/download/resolutionofcomp00peck/resolutionofcomp00peck.pdf

- [E1-C1] DuMont 5ADP1 manufacturer data: https://frank.pocnet.net/sheets/041/5/5ADP1.pdf

- [E1-C2] RCA 5ADP1 manufacturer data, curves 92CM-9099, 7910, 6820R1: https://frank.pocnet.net/sheets/049/5/5ADP1.pdf

- [E1-C3] RCA HB-3 Picture Tube Guide, P1 curve 92CM-5380R2, 1951-02-01, PDF p. 31: https://frank.pocnet.net/sheets/049/suppinfo/rca_hb3_pic.pdf

- [A2] Donner Scientific, Operating Handbook Model 3000, October 1957, printed pp. 1–2, 5–7, 25–26, schematic E25: https://www.analogmuseum.org/library/donner_3000.PDF

- [A3] Irvin H. Swift, Computing amplifier, US 2581456 A, published 1952-01-08: https://patents.google.com/patent/US2581456A/en
