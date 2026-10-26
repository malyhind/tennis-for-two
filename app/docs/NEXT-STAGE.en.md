# Adopted electrical reconstruction choices

## Included in the working circuit

The ball computer, all 15 PNP transistors, display-switch supply, loaded net/court sources, oscilloscope inputs and electrical scope macromodel share one ngspice clock. The renderer receives accepted deflection and beam-current points. Supply-filter states transfer with the other capacitors and coil currents.

The passive supply follows the 1959 BNL topology: transformer, four diodes, 10 Ω, a 120/180/120/390 Ω divider and four 50 µF capacitors. 117/36 V is interpreted as RMS at 60 Hz. Winding resistance of 2 Ω, ESR of 0.5 Ω and diode parameters are reconstruction settings. Core behavior, part spread and original reverse diode curves are not identified.

The net branch uses the 50 V AC label. Its 50 kΩ regulator at 16.7%, −11.5 V DC reference and the court’s 131.5 Vrms secondary are our working calibration. The court has the documented 50 kΩ regulator, set halfway. These settings align the lines with the computer’s selected reference: ground at −20 V and net top at 0 V. Source resistance now participates in the circuit calculation.

## Additional calculations

The loaded passive-supply bench produced approximately +14.99 / +7.50 / −6.05 / −24.57 V. The drawing’s +12/+6/−6/−22 labels are not imposed as regulated ideal outputs. Ripple and timing follow the selected components and load. These are simulated bench results.

With 50 kΩ regulators halfway, loading reduced 25 Vrms to 20.16 Vrms. Auditing every transistor found reverse base–emitter voltages above the 0.5 V rating. That rating is not used as a breakdown threshold: the reverse I–V curve remains unknown and the device model is preliminary.

E1 contains 43 transient cases: 40 completed, two stopped on convergence and one timed out. Two additional AC cases completed. Conditions, failures and original plots are retained in the research source package.

The game uses Gear 2, a 50 µs maximum step and reltol 10⁻⁴, retaining the previous interactive cost profile and the same circuit equations. On the E1 bench, edge shift against a stricter reference was 179.21 µs, failing the original 50 µs criterion. 25 µs / 10⁻⁶ gave 54.43 µs; 10 µs / 10⁻⁷ gave 9.24 µs. These results remain available. The interactive profile is an explicit cost/accuracy choice.

## Donner amplifier: available basis and selected equivalent

The complete October 1957 Model 3000 handbook contains an internal amplifier schematic using 6AU6, 6BQ7 A, 0A2 and half a 12AV7. It gives operating information, overload indication and a reference to Irvin H. Swift’s US 2581456 A. This is a close primary source, kept distinct from an identified Model 30 circuit.

Takacs’s 1997 reconstruction used modern op-amps; his 2010 account describes restoration of a Model 3400. The 2016 MIT project uses a modern ±15 V analog circuit. Their published approaches inform this reconstruction.

The release retains the checked finite amplifier macromodel: gain 10⁴, 1 Hz pole, 100 Ω output resistance and declared voltage limits. Wider-band and current-response candidates encountered convergence or checkpoint-restoration failures and were rejected. Their observed outcomes are recorded separately. Model 30’s ±5 mA specification describes load capability, not evidence of a hard current limiter.

## Screen model

The X input is 2.2 MΩ, Y 2 MΩ, both with 50 pF. The gun, tube amplifiers and high-voltage supply are represented by a macromodel. Spot size, focus and photometric scale are selected settings. Generic RCA P1 data supports the two-component persistence model under a declared excitation assumption.

The release is a working reconstruction of the documented instrument principle. A future tube-level implementation or new component evidence can refine it without making the current release unfinished.
