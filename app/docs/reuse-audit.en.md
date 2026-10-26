# Provenance, authors and reuse

Version 0.8.4. Inventory checked on 25 October 2026.

Our code, circuit descriptions and explanatory writing use MIT. External source retains its original licenses. The project’s MIT license does not relicense ngspice, manufacturer documents, archival drawings or papers.

ReportLab (BSD), Matplotlib (PSF-based license), Pillow (HPND) and DejaVu Fonts produce the report and figures; their code is not part of the browser runtime. DejaVu text fonts are embedded in the PDF. The notice is retained in `DejaVu-Fonts-LICENSE.txt`.

## Planck.js / Box2D: controller mechanics

Planck.js 1.5.0 calculates the revolute and prismatic joints in the controllers. Authors: Erin Catto and Ali Shakiba; MIT license. The original [engine module](../vendor/planck/planck.mjs), [source package](../vendor/planck/planck-1.5.0.tgz) and [license text](../vendor/planck/LICENSE.txt) are retained. The [Planck.js provenance record](../vendor/planck/provenance.json) identifies the version, file origins and SHA-256 hashes. See [Controller mechanics](mechanics.en.md) for the historical comparison and [Mechanical engine choice](engine-comparison.en.md) for the alternative-engine review. Rapier, Box2D-WASM and Matter.js were reviewed through documentation; their code is not included.

## Faceplate optics

Independent MIT implementation of Snell/Fresnel equations, attenuation and a bounded internal reflection. References: DuMont 5ADP manufacturer data; A. E. Martin and R. M. Bowie, Sylvania, Electronics August 1950; Pharr, Jakob and Humphreys, Physically Based Rendering 4e; Michael Deering US5446834A. These are credited mathematical and historical references. Their source code is not incorporated. Chosen glass and room parameters are documented in [Screen glass optics](glass-optics.en.md).

## Reconstruction components

| Component | Purpose |
| --- | --- |
| `tennis.cir` | Charge banks, integrators, switched bounce capacitors, relay/amplifier equivalents |
| `display-switch.cir` | 15-PNP oscillator, divider, drivers and six keys |
| `instrument-model.js` | Archival passive-supply topology, loaded line controls and calibration |
| `joint-circuit.js` | Direct connection of U2/U7, keys and oscilloscope inputs |
| ngspice 45.2-tft-eval2 | WASM numerical solver with recorded source and changes |
| `SpiceSession`, `TennisCircuit` | Command session, controller inputs, events and electrical state |
| `CPUPlayer` | Delayed observation, bounded knob movement and the ordinary button |
| Beam and phosphor | Electrical-trace presentation with energy accumulation and decay |
| Numerical checks | Joined circuit, individual networks and state transfer |

Checkpoints include computer, switch, supply and scope states. External sine sources retain their phase through the accumulated time offset. The image comes from the electrical beam trace.

## Included code and tools

### ngspice and its contributors

- Source: https://ngspice.sourceforge.io/
- Version 45.2 with our cumulative `ngspice45.2-tft-eval2.patch`.
- Supplies the numerical core, device models, transient analysis, matrix and solver.
- Principal license: Modified BSD; individual parts are listed in `../vendor/COPYING`.
- Complete source and build records are included. Changes to existing files are considered with those files’ original licenses.
- Current WASM SHA-256: `7e92084ce97153e5288919cfcd64a2255dad37a7e5d9abf2d1350f09df667a5c`.

### EElab.dev / EEcircuit-engine

- Source: https://github.com/eelab-dev/EEcircuit-engine
- Interface basis: npm 1.8.0, commit `f4dab6458d3865a1db9766008480690d23410c3a`.
- Wrapper license: MIT, Copyright 2024 EElab.dev.
- Used: ngspice command interface, Emscripten/Asyncify wrapper and original build structure. The high-level schematic editor and device libraries are not included.
- License, original build archive, hashes and our changes are retained.

### Emscripten, LLVM/Clang and Binaryen

- Compile the numerical core to WebAssembly.
- Recorded toolchain: Emscripten 3.1.6, LLVM/Clang 15.0.7 and Binaryen 108 from the documented Ubuntu snapshot.
- Exact packages and hashes: `../vendor/source/toolchain-record.json`.
- Notices: `../vendor/Emscripten-COPYRIGHT.txt` and source archives.

### woscope — Igor Null and Chad von Nau

- Source: https://github.com/m1el/woscope
- Commit: `74af1e3f3c1ff9e0da8e82bf01b5b2dd52f3da5d`.
- MIT, Copyright 2015 Igor Null and Chad von Nau.
- Used: analytical integration of a Gaussian spot along a segment and its shader bounding quadrilateral. Original files: `shaders/fsLine.glsl`, `shaders/vsLine.glsl`.
- Adaptation: `../beam-model.js`, `../phosphor-webgl.js`, `../phosphor-cpu.js`.
- Added: area normalization, beam current, irregular SPICE timestamps, physical deflection scale, HDR accumulation and two declared decay components.
- The audio-buffer/uniform-sampling dependency was removed. Audio loading, the woscope UI and recording were not copied.
- Original files, MIT license, commit and SHA-256 are in `../vendor/woscope/`.
- Author’s explanation: https://m1el.github.io/woscope-how/ . It credits Evan Wallace’s erf approximation. The CC 0 original is https://madebyevan.com/shaders/fast-rounded-rectangle-shadows/ . We preserve this attribution chain.

## Ideas and engineering references

### MAME / BGFX vector CRT

- Documentation: https://docs.mamedev.org/techspecs/bgfx_vector_crt.html
- Studied: `vectorrenderer.cpp`, `chains/vector-crt` shaders, commit `b7c0bfd16c9b8fe451c7e3d9cf7642c857642c44`.
- Shader author credit: Hans Andersson, BSD-3-Clause.
- Informed linear HDR accumulation, separate decay, emulation-time control and final brightness presentation.
- MAME source was not copied into the runtime. The beam integral comes from woscope.
- MAME approximates vector-list scan timing. Our renderer receives SPICE timestamps directly, so it does not distribute scan time by line length.

### William Higinbotham, Robert Dvorak and Brookhaven

- History and archive: https://www.bnl.gov/about/history/firstvideo.php
- Computer basis: Tennis Programming, EH 1-900-1-3 A, 15 October 1958.
- Switch basis: Electronic Switch for Tennis Programming, EH 1-900-2-3 A, 18 November 1959.
- Used: connections, published component values and the creator’s account. `corrections.json` separates sources from our substitutions.
- The drawings retain their different dates and BNL provenance. Their images are not covered by our MIT license.

### Peter Takacs and the restoration team

- Peter Takacs, Gene Von Achen, Paul O’Connor and Scott Coburn.
- BNL, 3 November 2008: https://www.bnl.gov/newsroom/news.php?a=2964
- Takacs’s account, 14 December 2010: https://scienceblogs.com/brookhaven/2010/12/14/resurrecting-one-of-the-worlds
- Considered the 1997/2008 semiconductor-computer replacement and subsequent restoration of Donner Model 3400.
- Relay-switching transients motivated amplifier testing; the account does not specify our protection or macromodel coefficients.
- The 36 Hz reference comes from Takacs’s BNL explanation. The publications provide no complete phase traces or SPICE model set.

### DuMont and RCA

- DuMont Oscillographer 14(1), January–March 1953, printed pp. 13, 19–20.
- Used 5ADP-family and 304-A specifications: electrostatic deflection, plate sensitivity and nominal input loading.
- Studied the 304-A manual as a primary construction reference; our tube-stage representation is an electrical macromodel.
- RCA Transistor Manual SC-11, 1964, p. 131 supports the Ge PNP 2N140 and a small-signal gain point.
- Other transistor, diode, amplifier, tube and phosphor parameters are listed as engineering choices.

### Studies of hand control and action delay

- Eli Brenner, Jeroen B. J. Smeets, Marc H. E. de Lussanet, 1998, Hitting moving targets, DOI 10.1007/s002210050535.
- Eli Brenner, Sem Bom, Jeroen B. J. Smeets, 2026, Intercepting moving targets, DOI 10.1007/s00221-026-07264-3.
- Nout C. M. van Zon, Clark Borst, Daan M. Pool, Marinus M. van Paassen, 2019/2020, Touchscreens for Aircraft Navigation Tasks, DOI 10.1177/0018720819862146.
- Vlad Firoiu, Tina Ju, Josh Tenenbaum, 2018, At Human Speed, arXiv: 1810.07286.
- These informed the separation of decision delay from knob-movement duration. Their code and trained models were not transferred. Our coefficients remain open settings; human likeness requires gameplay comparison.
- Details: [CPU as a controller operator: evidence and implementation](cpu-research.en.md).

## Studied alternatives whose code is not included

| Project | Role and outcome |
| --- | --- |
| hubertlim/oscilloscope_playground | MIT; studied a Three.js HDR pipeline. Selected the narrower woscope algorithm; backend, Docker and UI were not transferred |
| RamenFast/phosphor | GPL-3.0; considered CPU/GPU display descriptions and two-component P7. No code or coefficients copied; performance claims were not independently verified |
| NielsLeenheer/WebAudioOscilloscope | Studied browser X–Y presentation and beam modeling. Its proposed inductive-coil model was not applied to electrostatic 5ADP |
| TeTS / RetroAnalyst | Visual and declared-assumption comparison; no code, graphics or recorded sounds copied. Official BNL authorship and millimetre accuracy were not established |
| Angel De La Cruz, John Ryan, MIT 6.101, 2016 | Studied a modern analog implementation; its extra generators and values are not attributed to the original instrument |
| MEGA / T42 | Hardware and functional comparison; no engine or netlist included |
| Harrison 1/tennis-for-two | Considered as a software foundation. Its code and engine are not included; this project uses ngspice and published electrical schematics |

Comparisons concern published, inspectable material. This register documents engineering provenance rather than assigning credit for assumed unpublished work.

## Authors and contributions

Dmitry Malykhin defines the laboratory concept, reconstruction objective, controls and accuracy requirements. Work in dialogue with ChatGPT (OpenAI) covers source research, circuit descriptions, code, optimization, tests and documentation. ngspice, woscope and the historical drawings retain their credited authors.

Our contribution includes the electrical model and substitution register, controller inputs and modes, CPU operators, the joined continuous circuit, state transfer, SPICE-driven beam adaptation, prepared expression evaluator, measurements and reproducible checks.

Reused code entries identify author, source, version/commit, usage, changes and license. Ideas and documents identify their role and transfer assumptions.

## Additional schematics and data

Donner Scientific’s October 1957 Model 3000 handbook; Irvin H. Swift, US 2581456 A; Dana Peckworth’s 1959 work; DuMont and RCA 5ADP1 data; RCA P1 curve 92CM-5380R2. They inform research, model choices and reference parameters. Full scans retain their original rights. Links and scope appear in the research bibliography.

## Browser platform references

Demo uses native gzip decompression and animation timestamps. API usage was checked against MDN: https://developer.mozilla.org/en-US/docs/Web/API/Compression_Streams_API and https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame. Recording, byte-plane codec and replay code are independently implemented in the project; no additional browser compression library or recorded-video code is included.
