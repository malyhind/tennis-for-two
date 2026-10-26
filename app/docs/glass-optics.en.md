# Screen glass optics

Version 0.8.2. The instrument has a Glass optics on/off switch. Optics is enabled by default and the browser remembers the choice. Switching presents the existing phosphor state while retaining the rally, circuit time and accumulated excitation.

## Evidence and historical proxies

The initial proposal assumed convex glass. Source checking changed the decision: DuMont's 5ADP manufacturer data, printed page 48, explicitly specifies a flat face. RCA's 1965 guide also lists 5ADP1 among flat-faceplate types. The later guide is a comparator, not proof of the 1958 assembly. Our profile already uses 5ADP-family calibration, so artificial television-style curvature has not been added.

The closest construction proxy is the small oscillographic 5ADP family itself and comparable flat five-inch types. The checked data sheets do not establish 5ADP1 glass thickness. Dimensions of large television picture tubes have not been assigned to this small oscilloscope tube.

Alfred E. Martin and Robert M. Bowie of Sylvania Physics Laboratories discuss faceplate absorption, reflections and halos in *Electronics*, August 1950, printed page 110. They give a refractive index of approximately 1.5. This is period evidence for optical scale; their television thickness and tint are not specifications for our tube. American Optical patent US2599739A, published in 1952, separately describes internal/external reflections and phosphor scattering.

| Parameter | Working value | Basis |
| --- | --- | --- |
| Shape | Plane-parallel slab | Flat face from 5ADP data; parallel surfaces are a selected geometric model |
| Thickness | 4 mm | Selected equivalent; manufacturer thickness unestablished |
| Refractive index | 1.52 | Selected glass, compared with period data around 1.5 |
| Viewing distance | 0.5 m | Fixed viewing geometry |
| Absorption coefficient | 1 per metre | Selected nearly clear glass |
| Room lighting | Ambient 0.012; soft source 0.45 | Visual calibration, not reconstruction of the Brookhaven room |

## Optical calculation

An eye ray is traced through the outside face to the phosphor on the inside face. Snell's law gives `sin(theta_glass) = sin(theta_air) / n`. The sampling displacement is `t * tan(theta_glass)` and the distance inside glass is `t / cos(theta_glass)`.

Fresnel equations determine reflected and transmitted fractions for both polarizations. Absorption follows `exp(-alpha * path)`. The calculation includes direct transmission and one internal round trip with two reflections. Under current parameters, subsequent round trips sum to less than 3e-6 of the original light within the aperture. This bounds the selected specular model, not all scattering in real glass.

The outside surface reflects a declared room: ambient radiance 0.012 and a soft source of 0.45, width 0.04 rad, direction -0.06/-0.06/1. These relative visual settings make the glass switch observable; the reflection is stationary. Viewer and lighting are fixed; head tracking is absent. Flat glass viewed from the front has a small effect: the control point's sampling-map displacement is approximately 1.18 pixels at size 512. A sensitivity study uses 2/4/8 mm thickness and indices 1.48/1.52/1.56. These are selected parameter variations, not manufacturer tolerances.

The original spot and small Gaussian beam halo are retained. Phosphor microstructure, diffuse re-emission of high-angle light, the complete total-internal-reflection halo, spectral dispersion, coatings and a separate protective window are not identified or modeled in detail. The glass interfaces are smooth surfaces with unit external refractive index.

## Instrument connection and cost

Optics follows phosphor accumulation. It receives only the calculated excitation field, never game objects or ball coordinates. Electrical equations, timestep, controls and phosphor excitation are retained.

Ray coordinates and transmission are built once. CPU and WebGL consume the same map and interpolate in the linear excitation field. Repeated CPU presentation of an unchanged frame reuses the completed image. The CPU bypass is checked byte for byte against the previous presentation. GPU bypass retains its original formulas; hardware comparison is a separate check.

Numerical results and CPU composition timing are in `glass-validation.json`. Timing describes Linux/Node and distinguishes new frames from repeated presentation. Final CPU/WebGL image comparison is included in the browser bench; unavailable WebGL is recorded as skipped. Mac M1/Firefox speed and hardware GPU parity require target-machine checks.

## Other reconstructions

| Project | Publicly supported result |
| --- | --- |
| BNL anniversary reconstruction, 2008 | A real five-inch oscilloscope supplies physical glass optics |
| MIT, De La Cruz / Ryan, 2016 | An analog circuit drives a laboratory oscilloscope; a separate digital glass simulation is unnecessary |
| TeTS author description, 2021 | Persistence uses earlier ball positions and two spot images; a separate refraction calculation is not described |
| Included woscope source | Supplies the moving-beam integral; our implementation adds the faceplate layer |

The absence of a glass description in TeTS is not a complete source audit. Comparisons are limited to the identified public materials.

## Sources and attribution

- DuMont, 5ADP cathode-ray tubes, printed p.48: https://frank.pocnet.net/sheets/041/5/5ADP1.pdf
- RCA Industrial Tubes Product Guide 1965, flat-faceplate types: https://frank.pocnet.net/other/RCA/RCA_IndustrialTubesProductGuide_1965.pdf
- A. E. Martin, R. M. Bowie, Sylvania Physics Laboratories, *Electronics*, August 1950, printed p.110: https://www.worldradiohistory.com/Archive-Electronics/50s/Electronics-1950-08.pdf
- R. B. Barnes, American Optical, US2599739A, 1952: https://patents.google.com/patent/US2599739A/en
- Matt Pharr, Wenzel Jakob, Greg Humphreys, *Physically Based Rendering*, 4e, Specular Reflection and Transmission: https://pbr-book.org/4ed/Reflection_Models/Specular_Reflection_and_Transmission
- Michael Deering, US5446834A, 1995, CRT optics: https://patents.google.com/patent/US5446834A/en
- BNL, 2008: https://www.bnl.gov/newsroom/news.php?a=2964
- MIT, 2016: https://web.mit.edu/6.101/www/s2016/projects/angeld19_Project_Final_Report.pdf
- TeTS author's description, 2021: https://www.retrogamedeconstructionzone.com/2021/08/the-tennis-for-two-simulator-tets.html

Our optical code is an independent MIT implementation of general equations. No PBRT or other optical-engine source is included. References also credit mathematical foundations. The previously used woscope source retains its authors and MIT license. Manufacturer documents and publications retain their own rights.
