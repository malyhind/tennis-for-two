# Tennis for Two · historical SPICE profile 0.3

This document preserves the earlier computer-profile description. Since 0.6 the playable chain is joined: computer →15 PNP →scope macromodel →beam/phosphor. Current supply, parameters and checks are in [the complete research](research.en.html) and `model.json`. Statements below about a separate display refer to the earlier stage.

The basis is BNL’s Tennis Programming, EH 1-900-1-3 A, 15 October 1958. The open SPICE reconstruction records substitutions and parameters in `corrections.json` and `model.json`.

## What the circuit calculates

- Four 1 µF charge capacitors, 50 kΩ charging paths and connection to velocity-amplifier feedback.
- Coordinate integrators with 1 MΩ /1 µF and 10 MΩ ∥0.01 µF branches.
- Reconnection of 10 µF ground and 5 µF net holding capacitors; velocity changes follow charge redistribution.
- R–L coil current, rectification, current continuation after disconnection and contact actuation/release.
- Finite amplifier gain, bandwidth, output resistance and rail limits.

JavaScript changes knob, button, gravity-reference and reset sources. U7/U2 provide ball position. Collision handling does not assign coordinates, velocity, capacitor charge or a restitution coefficient.

## Engineering assumptions

The op-amp macromodel represents terminal behavior. Donner 30 tube internals are not transcribed here. Gain, bandwidth, output resistance, coil R/L, thresholds and contact dynamics are selected parameters.

Hit interlock and player-selection memory use electrical macromodels with capacitive memory, rather than every RY 1/RY 2/RY 5/RY 6/RY 7 contact and 117 VAC connection. End detectors and symmetric net passage are documented separately.

Knob ranges, −G=−60 V, 20 V net height and±62 V serve positions are calibration choices. Serve X offset is a profile addition. Y reset corresponds to net top: U2=0 V; displayed height=U2+20 V.

At this historical stage, display commutation and CRT electronics from EH 1-900-2-3 A were outside the playable profile. The separate 0.4 switch bench supplied the oscillator and keys. Color/persistence were display parameters and relay clicks were synthesized in Web Audio.

## Historical numerical profile

ngspice 45.2/WASM uses f64 and adaptive Gear 2 with maximum 1 ms. Saved output uses a1 ms grid; the UI/CSV receives actual 50 Hz samples. Browser FPS is separate; a slower device slows simulated game time.

About every 30 s, capacitor voltages and coil currents transfer into a new transient segment, releasing the preceding saved plot. Gear history restarts and its error is checked on an active rally. Pause finishes the current interval of up to 20 ms; closing the instrument destroys the Worker.

Reports and file hashes are in `validation.json`. These characterize the selected model’s numerical behavior.

## Development topics at that stage

Remaining relay logic, calibration/reset interpretation, Donner identification, display supply and component models, and a direct joined computer/display analysis were listed for refinement. Each change has a separate basis in the substitution register. Later joined work is described in the current report.

## Peter Takacs’s reconstructions

BNL’s2008 material and Takacs’s14 December 2010 account distinguish the 1997/2008 modern analog replacement from preparations for a restored Donner Model 3400.

Model 30, Model 3400 and modern replacement-computer parameters are kept separate. Takacs’s relay-spike damage motivates transient checks. Our freewheel diode remains assumption C01, not a component established by those publications.

Takacs’s36 Hz describes image commutation of ball, net and court. A50 Hz CSV grid does not replace it. This document’s stage had a separate display bench and frozen U7/U2 transfer; the subsequent joined instrument resolves the earlier coupling task.

## Profile 0.3.1 stability

A long automatic rally with changing knobs exposed transient failure at the previous strict settings. Values/topology were retained; tolerances became reltol 10⁻⁵, abstol 10⁻⁹ A, vntol 10⁻⁶ V, chgtol 10⁻¹² C. On identical inputs over 3.2 s, the maximum coordinate difference was 0.304 mV. All 15 computer checks, including native comparison, passed.

## Our automatic operators

Me and Opponent and Gremlin vs Fox are our additions. CPUs observe delayed position and controller lamps, then set knob voltage and ordinary button input. Perception, movement and persona parameters are in `cpu-model.json`; evidence is in [CPU as a controller operator: evidence and implementation](cpu-research.en.md). Human-participant gameplay comparison has not been performed.
