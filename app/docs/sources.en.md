# Sources and provenance

1. [BNL: The First Video Game?](https://www.bnl.gov/about/history/firstvideo.php) — history, controls, amplifiers, the 36 Hz reference and archival links.
2. [Tennis Programming, EH 1-900-1-3 A](https://www.bnl.gov/about/docs/videogameschematic1.jpg) — computing network, 15 October 1958.
3. [Electronic Switch, EH 1-900-2-3 A](https://www.bnl.gov/about/docs/videogameschematic2.jpg) — display-switch network, 18 November 1959; included in the joined instrument.
4. [Higinbotham’s notes](https://www.bnl.gov/about/docs/Higinbotham_Notes.pdf) and the 1976 account linked from [BNL’s archive](https://www.bnl.gov/about/history/firstvideo.php) — creator testimony.
5. [BNL: hardware reconstruction](https://www.bnl.gov/newsroom/news.php?a=2964) — mechanical relays, germanium transistors and an IC analog replacement for the computer.
6. [The Strong: Following the Bouncing Ball](https://www.museumofplay.org/blog/following-the-bouncing-ball-tennis-for-two-at-the-strong/) — reconstruction history and issues in the surviving documentation.
7. [MEGA T42](https://www.m-e-g-a.org/research-education/research/t42-tennis-for-two/) — independent hardware reconstruction for comparison.
8. [MIT, Angel De La Cruz and John Ryan, 2016](https://web.mit.edu/6.101/www/s2016/projects/angeld19_Project_Final_Report.pdf) — modern analog implementation; its values remain separate from 1958 specifications.
9. [TeTS](https://www.retrogamedeconstructionzone.com/2021/08/the-tennis-for-two-simulator-tets.html) — independent browser simulator for visual comparison. The author states an air-drag assumption. Official BNL authorship and millimetre accuracy were not established. No code, graphics or sounds copied.

## Solver

- [ngspice](https://ngspice.sourceforge.io/), version 45.2.
- [EEcircuit-engine](https://github.com/eelab-dev/EEcircuit-engine), npm 1.8.0, commit `f4dab6458d3865a1db9766008480690d23410c3a`.
- The initial package supplied an Emscripten factory and WASM wrapper. Its high-level editor and other model libraries were not included. Our subsequent evaluator/build changes are recorded separately.
- Hashes and transformations: `../vendor/PROVENANCE.json`; current build: `../vendor/source/wasm-build.json` and `ngspice45.2-tft-eval2.patch`.
- ngspice/component licenses: `../vendor/COPYING`; wrapper license: `../vendor/EEcircuit-LICENSE.txt`.

Our circuit descriptions and UI are project source. The [research](research.en.html) distinguishes source evidence, model choices and numerical checks.

## Peter Takacs: restoration stages

- [BNL: Celebrating Tennis for Two With A Video Game Extravaganza, 3 November 2008](https://www.bnl.gov/newsroom/news.php?a=2964) — team, relays/transistors and computer replacement.
- [Peter Takacs: Resurrecting One of the World’s1st Video Games, 14 December 2010](https://scienceblogs.com/brookhaven/2010/12/14/resurrecting-one-of-the-worlds) — guest text explicitly credited to Takacs, posted through the ksnyder account. It describes relay-switching transients and preparations for a restored Donner Model 3400.
- [BNL history](https://www.bnl.gov/about/history/firstvideo.php) — Takacs’s36 Hz explanation for the three image components.

These publications inform transient tests and distinguish restoration stages. They do not specify our selected coil R/L, gain, bandwidth, protection or calibration coefficients.

## Electronic switch

- BNL EH 1-900-2-3 A, 18 November 1959 — oscillator, divider, driver and six-key connections/values.
- [RCA Transistor Manual SC-11, 1964, p.131](https://manuals.plus/m/db7d541ddf75928e77eb98d8259325b533a3e448761ab34769aa85c3f69a86b6.pdf) — Ge PNP type and one 2N140 small-signal operating point. The other SPICE parameters are explicit engineering settings.
- Original ngspice 45.2 `src/frontend/outitf.c`, in `../vendor/source/ngspice-45.2.tar.gz` — inspection of interp behavior.

Parameters: `display-model.json`. Topology: `display-fidelity.en.md`. Interpreting 36 Hz as our full cycle is kept separate from a direct phase measurement.

## Additional primary documents

See the complete bibliography in [Tennis for Two: reconstructing an electrical instrument](RESEARCH.en.md): Higinbotham’s1976 account; RCA semiconductor manuals; Taitron 1N100 data; Dana Peckworth’s1959 study; DuMont/RCA 5ADP1 data; RCA P1 curve 92CM-5380R2; Donner’s October 1957 Model 3000 handbook; Irvin H. Swift’s US 2581456 A. It gives links, page identifiers and the reference IDs used in the report.
