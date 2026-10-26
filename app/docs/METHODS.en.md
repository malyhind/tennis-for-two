# Technical method and units

The executable `tennis.cir`, `display-switch.cir`, `scope.cir`, `instrument-model.js` and joined `joint.cir` define connections and values. Structural drawings and explanatory equations help interpret those netlists.

## Integrators and initial velocity

For an ideal inverting integrator with a virtual-ground input, current is approximately Vin/R. The capacitor law gives `dVout/dt = -Vin/(R*C)`. With R = 1 MΩ and C = 1 µF, RC is one second. The following stage integrates the first stage’s output, giving velocity and position a common electrical scale.

The implemented amplifier has finite gain, a pole, output resistance and rail saturation. The 10 MΩ / 0.01 µF feedback branches are included in the common system. JavaScript does not substitute the ideal equation for this circuit.

A 1 µF storage bank charges through 50 kΩ with a 50 ms time constant. Closing the contacts inserts the bank’s charge into the computing network. The knob sets the charging sources before the hit; the button reconnects the network.

## Charge redistribution and bounces

For a capacitor, `Q = C*V`. Briefly connecting two ideal isolated capacitors gives `Vfinal = (C1*V1 + C2*V2)/(C1+C2)` by charge conservation. Our network also includes amplifiers, contacts and other branches, so every transition is solved as a complete system. The simple two-capacitor case is checked separately.

The 10 µF ground and 5 µF net holding capacitors differ. Their connections and contact states determine the result. There is no separate JavaScript restitution coefficient. C02–C04 document the detector and interlock equivalents that select the switching times.

## What ngspice solves

Modified nodal analysis produces node voltages and necessary branch currents as unknowns. The general transient system is `F(x,t) + dQ(x,t)/dt = 0`: x contains electrical unknowns, Q charge states, and F current and algebraic relations. Gear approximates time derivatives; Newton iterations solve the nonlinear step. Transistors, diodes and behavioral expressions participate together.

50 µs is a maximum step. Near a transition, ngspice can take much smaller accepted steps or retry. This is not a uniform 20000-update physical clock. The 5 ms operator exchange contains many internal steps. Browser FPS is a third frequency. Slower computation stretches real time without skipping simulated time.

The prepared-expression evaluator reduces repeated solver work. It retains Newton iteration, device models and charge storage. Expression values are not carried from one physical step into another. Equivalence tests apply to the published scenarios, not every possible ngspice netlist.

## Checkpoints and continuity

Transfer retains all exposed node voltages, including algebraic amplifier guesses, seven coil currents and external time phase. Ball position and controller state continue; phosphor remains in the renderer. A fresh Worker receives the same session state.

Multistep Gear history is restarted. Continuous simulation here means a continuously operating instrument with a common clock across blocks. Boundary error is measured against uninterrupted analysis. More frequent checkpoints introduce more integration boundaries; 0.5 s and 0.15 s stress scenarios are reported separately.

## From switch to deflection

X input loading is 2.2 MΩ in parallel with 50 pF; Y is 2 MΩ with 50 pF. These are circuit elements. Key outputs charge those loads; two electrical poles form the deflection voltages.

For each RC pole, `fc = 1/(2*pi*R*C)`. R = 1 kΩ and C = 530.516 pF give 300 kHz. Two buffered equal poles have magnitude `1/(1+(f/fc)^2)`: 0.9 at 100 kHz and 0.5 at 300 kHz. Buffers prevent mutual loading. This is the declared 304-A response macromodel.

At the selected 1.6 kV reference, the 5ADP-family scale gives `x_inches = VplateX/48` and `y_inches = VplateY/36.8`. Gains 54/44, Y offset and ±110 V limits are explicit in `scope.cir`. The renderer uses a 4.5-inch field and a 4.25-inch circular aperture. The family scale and optical calibration are identified separately.

## Current, charge and relative image energy

A segment carries `dQ = Ibeam*dt`. Nominal beam current is 25 µA under the selected gun law. Its 3/2 exponent and parameters are engineering settings. The gun and accelerating source are idealized; full tube current and thermal behavior is outside this macromodel.

At fixed accelerating voltage Va, ideal beam power is `P = Va*I`: 1600 V and 25 µA give 0.04 W before losses. Renderer brightness is not calibrated in watts or candelas. Stored phosphor energy is relative; efficiency and photometric scale are absorbed into energyGain. Absolute optical power, spectrum and quantum yield are not claimed.

The two-dimensional Gaussian spot integrates to one before aperture clipping. The moving-spot contribution is averaged analytically along a segment. woscope uses an erf difference along the segment and a transverse Gaussian. Very short segments use the point-spot limit to avoid division by near-zero length. Pixel-area variance of 1/12 is added for stable subpixel presentation.

Deposition is proportional to I*dt. A segment’s age within its packet is evaluated at its midpoint; pieces are bounded to 50 µs. Two components follow `Enew = Eold*exp(-dt/tau) + deposited`. Fast tau = 2.858 ms, slow tau = 20.932 ms and slow impulse fraction 0.04719 come from a generic RCA P1 curve under the declared linear steady-excitation assumption. `L = 1-exp(-exposure*E)` and a 1/2.2 display exponent are applied after accumulation. Monitor saturation does not clip stored HDR energy.

On pause there is no new circuit dt, so presenting a frame does not excite the phosphor again. CPU context-loss fallback replays one second of beam history. The oldest slow component retains less than 1.8*10^-21, using exp(-1/0.020932). This estimates decay of old excitation, not total GPU/CPU or color error.

## Scope of numerical evidence

Refinement, repeat runs and independent solver builds test numerical agreement. They can share erroneous historical values, contact readings or device models; source review and independent analysis remain necessary. Edge comparisons retain peak errors, failed criteria and exclusion windows. WebGL SKIP marks an unperformed check.
