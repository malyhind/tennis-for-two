"""Optional developer rebuild. Requires an already activated Emscripten SDK.

Installs nothing and writes only a new build directory. The shipped game uses
the ready-made JS/WASM pair and does not run this script.
"""
from pathlib import Path
import argparse,hashlib,json,os,re,shutil,subprocess,tarfile,tempfile

root=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--workdir',type=Path,default=root/'.solver-build')
parser.add_argument('--jobs',type=int,default=4)
parser.add_argument('--optimization',choices=['O2','O3'],default='O3')
parser.add_argument('--lto',action=argparse.BooleanOptionalAction,default=False)
parser.add_argument('--evaluator',choices=['memo','prepared'],default='prepared')
parser.add_argument('--prepare-only',action='store_true')
args=parser.parse_args()
compile_flags='-'+args.optimization+(' -flto' if args.lto else '')
if not args.prepare_only and (not shutil.which('emconfigure') or not shutil.which('emcc')):
 raise SystemExit('Activate an existing Emscripten SDK first. No SDK is installed by this script.')
args.workdir.mkdir(parents=True,exist_ok=True)
work=Path(tempfile.mkdtemp(prefix='ngspice45.2-',dir=args.workdir.resolve()))
vendor=root/'app/vendor';source=vendor/'source'
provenance=json.loads((vendor/'PROVENANCE.json').read_text())
for name,expected in provenance['reference_distribution']['sources'].items():
 assert hashlib.sha256((source/name).read_bytes()).hexdigest()==expected,name
with tarfile.open(source/'ngspice-45.2.tar.gz') as archive:archive.extractall(work,filter='data')
src=work/'ngspice-45.2'
with tarfile.open(source/'EEcircuit-build-f4dab645.tar.gz') as archive:
 (work/'pre.js').write_bytes(archive.extractfile('EEcircuit-engine/Docker/pre.js').read())
p=src/'src/frontend/control.c';text=p.read_text()
bridge='''#include <emscripten.h>
EM_ASYNC_JS(void, eesim_sleep_hack, (), {
    if (Module["handleThings"]) {
        await new Promise((resolve) => { Module["handleThings"](); });
    }
});
'''
text=text.replace('#include "ngspice/ngspice.h"',bridge+'\n#include "ngspice/ngspice.h"',1)
assert text.count('freewl = wlist = getcommand(string);')==1
p.write_text(text.replace('freewl = wlist = getcommand(string);','eesim_sleep_hack();\n        freewl = wlist = getcommand(string);'))
p=src/'src/main.c';text=p.read_text();entry='int main(int argc, char **argv)';assert text.count(entry)==1;p.write_text(text.replace(entry,'__attribute__((used, export_name("main")))\n'+entry))
# Match the pre-existing EEcircuit device set; HICUM2 source stays in the archive.
p=src/'src/spicelib/devices/dev.c';p.write_text(''.join(l for l in p.read_text().splitlines(True) if 'get_hicum_info' not in l))
p=src/'src/Makefile.in';p.write_text(''.join(l for l in p.read_text().splitlines(True) if 'spicelib/devices/hicum2/libhicum2.la' not in l))
p=src/'src/spicelib/devices/Makefile.in';p.write_text(re.sub(r'\bhicum2\b','',p.read_text()))
p=src/'configure';p.write_text(p.read_text().replace('for ac_func in time getrusage','for ac_func in time').replace('XTRALIBS="$XTRALIBS -lstdc++"','XTRALIBS="$XTRALIBS"'))
patch_name='ngspice45.2-tft-eval2.patch' if args.evaluator=='prepared' else 'ngspice45.2-tft-evaluator.patch'
subprocess.run(['patch','-p1','-i',str(source/patch_name)],cwd=src,check=True)
for p in [src/'aclocal.m4',src/'configure',src/'src/include/ngspice/config.h.in',*src.rglob('Makefile.in')]:
 if p.exists():os.utime(p,None)
build=work/'build';build.mkdir()
if args.prepare_only:
 print('Prepared source: '+str(src));raise SystemExit(0)
subprocess.run(['emconfigure',str(src/'configure'),'--host=wasm32-unknown-emscripten','--disable-debug','--disable-openmp','--disable-xspice','--disable-cider','--disable-osdi','--without-x','--with-readline=no','CFLAGS='+compile_flags,'CXXFLAGS='+compile_flags],cwd=build,check=True)
remove=['PTeval','IFeval','PTstateful','ASRCload',*re.findall(r'^(PT\w+)\(double',(src/'src/spicelib/parser/ptfuncs.c').read_text(),re.M)]
if args.evaluator=='prepared':remove+=['TFTrun','TFTcompile','TFTcompileNode','TFTslot','TFTemit','TFTfreePlan']
flags=compile_flags+' -g2 -sASYNCIFY=1 -sASYNCIFY_ADVISE=1 -sASYNCIFY_IGNORE_INDIRECT=0 -sENVIRONMENT=web,worker -sALLOW_MEMORY_GROWTH=1 -sMODULARIZE=1 -sEXPORT_ES6=1 -sEXPORTED_RUNTIME_METHODS=FS,Asyncify,callMain --pre-js '+str(work/'pre.js')+' -o spice.mjs -sASYNCIFY_REMOVE='+','.join(remove)
p=build/'src/Makefile';text=p.read_text();link='$(AM_V_CCLD)$(ngspice_LINK) $(ngspice_OBJECTS) $(ngspice_LDADD) $(LIBS)';assert text.count(link)==1;p.write_text(text.replace(link,link+' '+flags))
subprocess.run(['make','-j'+str(max(1,args.jobs))],cwd=build,check=True)
assert (build/'src/spice.wasm').stat().st_size>1000000,'Missing retained engine'
output=work/'output';output.mkdir()
for original,dest in [('spice.mjs','spice.js'),('spice.wasm','spice.wasm')]:shutil.copyfile(build/'src'/original,output/dest)
record={'compiler':subprocess.check_output(['emcc','--version'],text=True),'flags':flags,'hashes':{p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in output.iterdir()}}
(output/'build.json').write_text(json.dumps(record,indent=2)+'\n')
print('Build complete:',output)
