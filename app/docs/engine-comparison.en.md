# Mechanical engine choice

Review for version 0.8.1, 25 October 2026. The task is two knobs and two buttons. Relevant criteria are correct constraints, physical scale, solver tolerances, selected parameters and measured behavior.

| Claim | Verified conclusion |
| --- | --- |
| Rapier supports Rust/WASM and determinism | Yes. Its JS/WASM documentation promises cross-platform repeatability with matching initial values, version, construction order and timesteps. Repeatability is distinct from agreement with a physical instrument. |
| WASM or C++ is automatically more accurate than JS | No. JavaScript Number is binary64. Box2D 3.2 keeps its main local calculations single-precision and offers double-precision positions for large worlds. Rapier has different numeric variants. The actual build and numerical results must be compared. |
| Very small timesteps have no FPS cost | This general promise is unsupported. Smaller steps require more solver calls per second. We measure the cost of the actual four-body model. |
| CCD guarantees flawless latch mechanisms | CCD concerns collisions of moving shapes. Our buttons use a bounded prismatic joint and a position threshold for the contact. Tooth and latch geometry is absent. |
| Matter.js is more accurate because it uses pixels | This ranking is unsupported. Physical units are mapped to pixels at presentation. Planck and Box2D document scale and tolerances. |
| WASM removes application garbage collection | An engine can change allocation behavior, but the browser UI, adapters and presentation still execute JS. A general pause-free guarantee is unjustified. |

The proposed `project-chip/matter.js` link concerns the Matter smart-device protocol. The physics engine is `liabru/matter-js`. Current mainline Box2D is C; third-party WASM wrappers may use older C++ versions. The npm `box2d-wasm` 7.0.0 package dates from 2021 and must not be treated as equivalent to current Box2D 3.2.

## Project decision

The instrument uses MIT-licensed Planck.js 1.5.0. It supplies the needed joints and friction limits for four dynamic bodies. A 0.5 ms step is checked against 0.25 ms. Cost, sensitivity and numerical differences are recorded in `mechanics-validation.json`. Performance numbers describe Linux/Node, not measured Mac M1 browser FPS.

Rapier remains a reviewed option for more complex contact-rich mechanisms and larger linked-body models. Its code is not included. This release contains no head-to-head Rapier/Box2D-WASM run; star ratings and absolute-leader claims from the supplied comparison are not used as engineering evidence.

## Primary sources

- Rapier JS/WASM determinism: https://rapier.rs/docs/user_guides/javascript/determinism/
- Rapier joints: https://rapier.rs/docs/user_guides/javascript/joints/
- Rapier rigid bodies and CCD: https://rapier.rs/docs/user_guides/javascript/rigid_bodies/
- Box2D 3.2, author's announcement, 18 October 2026: https://box2d.org/posts/2026/10/box2d-3.2/
- Box2D units and scale: https://box2d.org/documentation/
- Planck units and tolerances: https://piqnt.dev/planck.js/docs/api-conventions/units.html
- ECMAScript Number type: https://tc39.es/ecma262/multipage/ecmascript-data-types-and-values.html#sec-ecmascript-language-types-number-type
- Matter.js physics engine: https://github.com/liabru/matter-js
- Matter smart-device protocol: https://github.com/matter-js/matter.js
