# CPU as a controller operator: evidence and implementation

Automatic-operator model, primary studies and transfer assumptions. Sources and parameters checked on 24 October 2026.

## Three modes

- Me and Fox: two people, two controllers.
- Me and Opponent: a person on the left, CPU on the right.
- Gremlin vs Fox: two automatic operators; the observer can pause the instrument.

The CPU sits above the circuit and changes the ordinary knob and hit button. Humans and CPUs share the same inputs. Knob movement and presses are visible. SPICE calculates motion, bounces and interlocks.

## Research evidence

### Position corrections and responses to velocity have different delays

Brenner, Smeets and de Lussanet (1998) studied hitting moving targets with a rod. Directional correction based on target position was described at about 110 ms; hand-acceleration adjustment following a change of target velocity at about 200 ms. These belong to that experiment rather than every player decision.

Source: [Hitting moving targets](https://personal.fgb.vu.nl/~jsmeets/1998/Hitting-EBR98.pdf), Experimental Brain Research 122, 467–474. DOI: 10.1007/s002210050535.

### Fast correction of an ongoing movement

Brenner, Bom and Smeets (2026) compared tapping a screen with moving a finger through a target in 22 participants. Correction latency after an unexpected target displacement was 114 ms in both conditions. This does not measure the entire notice–choose–turn–press cycle.

Source: [Intercepting moving targets](https://pmc.ncbi.nlm.nih.gov/articles/PMC12992358/), Experimental Brain Research 244, 70. DOI: 10.1007/s00221-026-07264-3.

### Knob movement takes time and depends on precision

Van Zon, Borst, Pool and Van Paassen (online 2019, issue 2020) studied 14 participants, including a rotary heading control in an aircraft-navigation task. Rotation used a Fitts-law form:

`MT = a + b * log2(alpha / omega_e + 1)`

alpha is angular displacement; omega_e is effective angular target width. The MCP model was `MT_ms = 154.8 + 494.7 * ID_e`, R² = 0.969. MT included knob movement alone, excluding reaction and reaching. The device was a discrete encoder with 24 detents per revolution. Its coefficients are not measurements of our virtual controller or the original potentiometer; the useful transferable structure is that a larger, more precise rotation takes longer.

Source: [Touchscreens for Aircraft Navigation Tasks](https://journals.sagepub.com/doi/full/10.1177/0018720819862146), Human Factors 62(6), Table 2. DOI: 10.1177/0018720819862146.

### Action delays in game agents

Firoiu, Ju and Tenenbaum (2018), At Human Speed, introduced action delay and studied prediction under delayed control. For Super Smash Bros. Melee at 60 Hz, they discuss 12 frames (200 ms) as a selected lower bound for plausible reaction and 15 frames (250 ms) as an average-time reference. These are that paper’s settings and interpretation.

Source: [At Human Speed: Deep Reinforcement Learning with Action Delay](https://arxiv.org/pdf/1810.07286), arXiv: 1810.07286, Sections 2.3 and 3.1.

## Transfer into the implementation

- Available information is restricted to visible ball position and controller state. Velocity comes from observation history; internal voltages and future SPICE trajectories are excluded.
- Perception/decision delay and knob-movement duration are separate. The 200–300 ms working ranges are our settings informed by the literature.
- Rotation accelerates and decelerates gradually. Duration follows T = 0.14 + 0.20 log 2(1 + D/0.04) seconds, with a speed limit of 0.60 full ranges per second. These are virtual-controller coefficients; the aircraft encoder remains a published example.
- Earlier observations can support preparation. An unexpected bounce becomes visible after a delay; a single timer after net crossing does not represent this structure.
- Errors emerge from delay, aiming uncertainty and bounded movement. The game does not randomly cancel an otherwise valid hit.
- Watch mode uses two independent operator states and observation histories with the same physical limits.

Operator parameters are separate from circuit coefficients. Human gameplay comparison is needed to evaluate how human-like the resulting opponents feel.

## Actual parameters and checks

`cpu-player.js` keeps separate Gremlin, Fox and neutral Opponent states. Reaction ranges are respectively 220–290, 200–280 and 220–300 ms. Delay is selected when an operator is created; aim and reception depth vary by rally. A polynomial has zero velocity and acceleration at movement endpoints, with duration extended to respect the speed bound. Perceived coordinates are quantized to 0.5 V.

The operator receives only `time, x, y, playing, ready, server`. `operatorView` excludes velocity, currents, charge banks and future values. Its clock is simulated game time: pause and slower calculation preserve the same delays relative to ball flight.

Eight checks cover observation boundaries, delay, bounded movement, pause and memory, re-arming, distinct personas, two CPUs on real SPICE and a human/CPU scenario. A 30 s test produced 20 returns and two serves. To test another serve, one operator’s returns were deliberately omitted within a three-second test window. The playable CPU contains no such forced omission. Report: `cpu-validation.json`.
