# Schematics and independent calculation

## Archival basis

- `figures/bnl-schematic-1.jpg`: ball computer, EH 1-900-1-3 A, 15 October 1958.
- `figures/bnl-schematic-2.jpg`: electronic switch, EH 1-900-2-3 A, 18 November 1959.

Original values are retained in the images. Provenance and rights are listed in [Research sources](sources.en.md). Interpretations and substitutions are recorded in `corrections.json`.

## Readable connection diagrams

- `figures/computing-chain.en.svg`: charge banks, amplifiers and switching.
- `figures/display-topology.en.svg`: oscillator, divider, drivers and six keys.
- `figures/operator-layer.en.svg`: human/CPU observation, controller movement and circuit.

These are structural drawings. Executable netlists specify complete connections.

## Executable models

- `../tennis.cir`: ball computer and switching macromodels.
- `../display-switch.cir`: 15-PNP subcircuits, without external sources or an analysis command.
- `circuits/tennis-demo.cir`: standalone four-second demonstration rally.
- `circuits/display-reference.cir`: full 0.24 s reference display bench.
- `circuits/display-bounded.cir`: full 0.12 s bounded display bench.

The last three require ngspice. From the `circuits` directory:

```sh
ngspice -b tennis-demo.cir
ngspice -b display-reference.cir
ngspice -b display-bounded.cir
```

Each deck runs an analysis and writes a `.dat` table. Both display examples write `display-trace.dat`; run them in different directories or change the output name in `.control`. Units are seconds and volts. U2 is vertical position relative to net top; the game adds 20 V to express height above ground.

## Joined instrument

- `../joint.cir`: materialized circuit joining computer, 15 PNP transistors, passive supply, loaded lines and scope inputs. An analysis scenario must be added; see `tests/verify-joint-native.mjs`.
- `../scope.cir`: electrical oscilloscope macromodel.
- `figures/joint-topology.en.png`: common-simulation topology.
- `figures/joint-trace.en.png`: actual plate voltages and beam current.

The separate bench holds ball position fixed. The game feeds the transistor keys from the continuously running computer.

## Model choices

Donner internals and part of the relay wiring use macromodels. The switch supply and loaded line branches are included electrically. Winding, diode, offset and regulator parameters are explicit in `instrument-model.js`. Amplifier and CRT supplies remain idealized. Generic RCA P1 persistence uses the stated excitation assumption. Full details are in [Adopted electrical reconstruction choices](NEXT-STAGE.en.md) and `model.json`.
