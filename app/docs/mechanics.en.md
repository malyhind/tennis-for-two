# Controller mechanics

Version 0.8.1. Enabled by default; the instrument has a Mechanics on/off switch. This browser remembers the choice. Switching preserves the electrical state, rally and current angle, while cancelling incomplete presses.

## Historical proxy

A documentation gap is investigated by comparing devices of the same period, purpose, size and construction. Characteristics of the proxy, selected model parameters and sensitivity are recorded separately. A matching manufacture date alone is insufficient.

General Radio, *Experimenter*, January 1955, page 4: compact types 971/972 specify 1 oz·in average torque; 973 specifies 1¼ oz·in. Adding two sections on a common shaft gives a calculated comparison range of 2–2½ oz·in, or 14.123–17.654 mN·m. These are period comparators, not an identified original controller part.

The working model uses the lower pair value, 14.1231 mN·m of sliding resistance. A starting threshold of 18.83 mN·m is chosen separately. The article specifies average torque, not a complete dependence on speed, temperature or wear. Those extra parameters remain selected equivalents.

A MICRO SWITCH 1PB81-T2 advertisement in *Electronic Design*, 1 August 1957, describes one-finger manual operation, snap action and an overtravel spring. It supports the mechanism type. Numeric force and stroke are absent from the available text. Accordingly, 3 mm stroke, 3 N virtual-finger force, 0.65 N preload and 500 N/m spring stiffness remain selected proxy values. Heavy industrial and automotive mechanisms are excluded as direct comparators for this hand controller.

## Dynamics and circuit connection

Planck.js 1.5.0, an existing Box2D-based engine, solves the fixed housing, knob rotor and button plunger. Each controller has revolute and prismatic joints. The engine solves inertia, friction and travel limits. Our code supplies virtual-hand forces, the return spring and the electrical input connection.

Hand torque is `T = clamp(Kh × (theta_target − theta) − Ch × omega, ±Tmax)`. Viscous resistance and joint braking torque also act. Releasing the knob removes the hand torque; friction dissipates motion. Reversal takes up 0.4° total coupling play before the wiper follows. Inertia 2×10⁻⁵ kg·m², 80 g mass, grip stiffness and play are selected equivalents. The interface keeps its 270° working sweep; the proxy's specified 330° is not assigned to the original game controller.

Plunger force is `F = Ffinger − Fpreload − k × x − c × v`, with friction and stops. The contact closes at 1.7 mm and opens at 0.9 mm. A short digital command requests a complete press with at least 70 ms of force. This is an interface rule, not a measured historical characteristic. Holding produces one closure; another press requires return. Original synthesized clicks accompany closure and return.

The controllers use browser interaction time, representing an external operator's hand. Integration uses a fixed 0.5 ms step, independently of display frequency; hidden-tab time is not accumulated for catch-up. CPU observation and motion planning remain on circuit time, with their commands passing through the same controllers. ngspice samples actual wiper positions and closure edges at its next interval boundary. Ball, display-switch and scope equations remain unchanged.

Direct mode immediately forwards knob positions and press commands. Both modes check hit eligibility at closure. An out-of-turn press is discarded rather than queued for a later opportunity. Focus loss, pointer cancellation, pause, reset and mode changes clear held commands.

## Numerical checks

`mechanics-validation.json` checks energy dissipation, stops, return, single closure, switching, frame-chunk independence and 0.5/0.25 ms refinement. The period-derived pair torque range is 2–2½ oz·in. Button stiffness ×0.5/×1.5 is a separate sensitivity study, not a historical manufacturing tolerance. `mechanics-joint-validation.json` exercises actual two-CPU play through these ports in the joined SPICE instrument.

Mouse and touch show computed movement and clicks. Physical torque at the fingers requires force-feedback hardware. Hidden latch geometry, metal deformation, wear and contact bounce are outside this controller model.


## Electrical-state continuation

The first extended browser candidate stopped while establishing a resumed initial point at approximately 20.30 s of circuit time. The cause and validation of the fix are described in [Circuit continuation after an initial-point rejection](continuation-recovery.en.md). Continuation now retains previous button/reset source voltages during the microsecond UIC interval before applying the next command. If that initial point fails, the same point is retried with a 200-iteration Newton limit. Equations, convergence tolerances and maximum step are retained; power-up and serve are not repeated. An unrecovered failure stops the calculation visibly.

`restart-input-validation.json` checks source preservation and a separately identified fault-injection experiment. `controller-worker-validation.json` exercises a 30-second sequence with CPU play, reset, a low-angle hit and real Worker transfers. It is an additional scenario, not an exact replay of the earlier unseeded browser match. `joint-phase-validation.json` compares continuation with an uninterrupted calculation.

## Sources and attribution

- General Radio, *Experimenter*, January 1955, pages 2–4: https://www.grwiki.org/grwiki/images/4/4d/GR_Exp_970_Series_01_1955.pdf
- MICRO SWITCH 1PB81-T2 advertisement, *Electronic Design*, 1 August 1957: https://www.worldradiohistory.com/Archive-Electronic-Design/1957/Electronic-Design-1957-08-01.pdf
- Planck.js revolute joints and friction: https://piqnt.dev/planck.js/docs/joint/revolute-joint.html
- Planck.js prismatic joints: https://piqnt.dev/planck.js/docs/joint/prismatic-joint.html
- Modelica Association, sticking and sliding: https://doc.modelica.org/Modelica%204.0.0/Resources/helpWSM/Modelica/Modelica.Mechanics.Rotational.Components.BearingFriction.html

Planck.js / Box2D: Erin Catto, Ali Shakiba, MIT. The unmodified module, original package, license and SHA-256 are retained in `app/vendor/planck/`. Coupling code and selected parameters are this project's MIT work. Historical publications provide reference information; their text and images are not relicensed under our MIT license.
