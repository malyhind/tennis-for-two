"""Static sensitivity study of the 1959 supply divider, not a game model.

Outer rail separation is held at a chosen 34 V. The rectifier, transformer,
capacitors and transistor loads are deliberately outside this experiment.
Load current is positive when leaving its tap toward ground. Fractions keep
all circuit calculations exact until JSON serialization.
"""
from pathlib import Path
from fractions import Fraction as Q
import json
ROOT=Path(__file__).resolve().parents[1]

def solve(ip=Q(0), im=Q(0), span=Q(34)):
    # 120 / 180 / ground / 120 / 390 ohm, one floating outer source.
    j=(span+180*ip-120*im)/810
    q=180*(j-ip);r=-120*(j+im)
    p=q+120*j;n=r-390*j
    # Independently check both loaded tap KCLs and the outer supernode.
    residuals=[(q-p)/120+q/180+ip,
               r/120+(r-n)/390+im,
               (p-q)/120+(n-r)/390,p-n-span]
    assert all(v==0 for v in residuals),residuals
    return {'positive6_A':float(ip),'negative6_A':float(im),
            'rails_V':dict(zip(['plus12','plus6','minus6','minus22'],map(float,[p,q,r,n]))),
            'kcl_max_residual_A':0.0,'outer_span_V':float(p-n)}

def main():
    base=solve()
    a=solve(Q('0.001'),Q(0));b=solve(Q(0),Q('0.001'))
    delta=lambda row:{k:row['rails_V'][k]-base['rails_V'][k] for k in base['rails_V']}
    report={
      'scope':'Research-only static ideal divider; not the complete supply, not a measured historical working point, not connected to game runtime.',
      'source':'https://www.bnl.gov/about/docs/videogameschematic2.jpg',
      'drawing':'EH1-900-2-3 A, 1959-11-18',
      'resistors_ohm':[120,180,120,390],
      'chosen_outer_span_V':34,
      'outer_span_basis':'Difference of handwritten +12/-22 rail annotations; assumed fixed only for this sensitivity study. Not an assertion about the 36 V transformer RMS rating.',
      'load_model':'Unloaded baseline; one outward 1mA test current at either middle tap. Actual transistor currents and handwritten current notes are not used as identified loads.',
      'cases':{'unloaded':base,
               'plus6_additional_outward_1mA':a,'minus6_additional_outward_1mA':b},
      'delta_V_for_outward_1mA':{'plus6':delta(a),'minus6':delta(b)},
      'currents_required_by_exact_rail_labels_mA':{
        'plus6_outward':float((Q(12-6,120)-Q(6,180))*1000),
        'minus6_outward':float(-(Q(6,120)-Q(22-6,390))*1000)},
      'conclusion':'The passive taps are load dependent and mutually coupled. Fixed outer span omits rectification, sag, ripple, capacitor ESR, transformer impedance and switching loads. It cannot predict actual oscillator frequency or original rail voltages.'}
    target=ROOT/'app/docs/supply-divider-study.json'
    target.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps(report,ensure_ascii=False,indent=2))
if __name__=='__main__':main()
