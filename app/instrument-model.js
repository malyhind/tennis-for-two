// Declared electrical reconstruction. BNL1959 supply transcription and
// separately loaded 60Hz line controls; operating settings are our calibration.
// The transformer core and actual Ge reverse characteristics are unresolved.
export const INSTRUMENT_CIRCUIT=String.raw`
* BNL EH1-900-2-3 A: passive supply, transcription research.
* 117/36 interpreted as RMS, 60Hz chosen US mains. Core effects omitted.
* RW, ESR and semiconductor parameters are declared uncertain assumptions.
* Ideal transformer has reciprocal primary current: energy conservation.
.subckt TFT_SUPPLY primary pp12 pp6 mm6 mm22 params: RATIO=.3076923076923077 RW=2 ESR=.5 CF=50u DRS=10 DIS=1u
Etransform secdrive secreturn primary 0 {RATIO}
Fprimary primary 0 Etransform {-RATIO}
Rwinding secdrive sec_a {RW}
Rreference secreturn 0 1g
.model RECT_GE D(IS={DIS} N=1.3 RS={DRS} CJO=2p EG=.67 XTI=3 TNOM=25)
D1 sec_a rect_p RECT_GE
D2 secreturn rect_p RECT_GE
D3 mm22 sec_a RECT_GE
D4 mm22 secreturn RECT_GE
Rseries rect_p pp12 10
Rdivider1 pp12 pp6 120
Rdivider2 pp6 0 180
Rdivider3 0 mm6 120
Rdivider4 mm6 mm22 390
Resrp12 pp12 cp12 {ESR}
Cfp12 cp12 0 {CF}
Resrp6 pp6 cp6 {ESR}
Cfp6 cp6 0 {CF}
Resrm6 mm6 cm6 {ESR}
Cfm6 0 cm6 {CF}
Resrm22 mm22 cm22 {ESR}
Cfm22 0 cm22 {CF}
.ends TFT_SUPPLY

* Operating calibration preserves the calculator's raw ground=-20V/net-top=0V.
* NET_AC=50Vrms comes from the annotated input. Its DC reference and both
* potentiometer positions are declared reconstruction settings, not recovered.
* Court secondary131.5Vrms is chosen, not specified in the surviving drawing.
.subckt TFT_INSTRUMENT mains net_v net_h court_v court_h pp12 pp6 mm6 mm22
Xsupply mains pp12 pp6 mm6 mm22 TFT_SUPPLY
VnetRef net_ref 0 -11.5
Enet net_drive net_ref mains 0 {50/117}
Fnet mains 0 Enet {-50/117}
RnetTop net_drive net_v 41650
RnetBottom net_v net_ref 8350
VnetH net_h 0 0
VcourtV court_v 0 -20
Ecourt court_drive 0 mains 0 {131.5/117}
Fcourt mains 0 Ecourt {-131.5/117}
RcourtTop court_drive court_h 25k
RcourtBottom court_h 0 25k
.ends TFT_INSTRUMENT
`;
