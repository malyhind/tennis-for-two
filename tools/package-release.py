"""Package the standalone project with its bundled replay recording."""
from pathlib import Path
import argparse
import hashlib
import json
import os
import tempfile
import zipfile

ROOT = Path(__file__).resolve().parents[1]
VERSION = json.loads((ROOT / 'package.json').read_text())['version']


def included(path):
    rel = path.relative_to(ROOT)
    return (path.is_file()
            and not any(p in {'.git', '.solver-build', '__pycache__', 'node_modules', '.openai', 'public'} for p in rel.parts)
            and (rel.parts[:2] != ('tests', 'results') or rel.name == '.gitkeep')
            and rel.as_posix() != 'app/demo/progress.json'
            and rel.name not in {'PACKAGE.json', 'SHA256SUMS', 'PROJECT.md', 'PROJECT.en.md'}
            and path.suffix != '.zip')


def payload(path):
    return path.read_bytes()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, default=ROOT.parent / f'tennis-for-two-{VERSION}-source.zip')
    args = parser.parse_args()
    args.output.parent.mkdir(parents=True, exist_ok=True)
    paths = sorted(p for p in ROOT.rglob('*') if included(p))
    rows = [{'path': p.relative_to(ROOT).as_posix(), 'bytes': len(b),
             'sha256': hashlib.sha256(b).hexdigest()} for p in paths for b in [payload(p)]]
    recording = json.loads((ROOT / 'app/demo/manifest.json').read_text())
    recording_included = recording.get('available') is not False
    if recording_included:
        hashes = {row['path']: row['sha256'] for row in rows}
        for kind in ('beam', 'frames'):
            item = recording[kind]
            name = 'app/demo/' + item['url']
            if hashes.get(name) != item['sha256']:
                raise ValueError('Bundled recording missing or changed: ' + name)
    manifest = {'release': VERSION, 'edition': 'standalone-source', 'revision': 7,
                'optionalRecordingIncluded': recording_included, 'files': rows}
    prefix = 'tennis-for-two/'
    with tempfile.NamedTemporaryFile(dir=args.output.parent, suffix='.zip', delete=False) as handle:
        temp = Path(handle.name)
    try:
        with zipfile.ZipFile(temp, 'w', zipfile.ZIP_DEFLATED, compresslevel=6) as archive:
            for path in paths:
                archive.writestr(prefix + path.relative_to(ROOT).as_posix(), payload(path))
            archive.writestr(prefix + 'PACKAGE.json', json.dumps(manifest, indent=2) + '\n')
            archive.writestr(prefix + 'SHA256SUMS', ''.join(f"{r['sha256']}  {r['path']}\n" for r in rows))
        with zipfile.ZipFile(temp) as archive:
            bad = archive.testzip()
            if bad:
                raise ValueError('ZIP CRC failure: ' + bad)
        os.replace(temp, args.output)
    finally:
        temp.unlink(missing_ok=True)
    print(json.dumps({'file': str(args.output), 'bytes': args.output.stat().st_size,
                      'sha256': hashlib.sha256(args.output.read_bytes()).hexdigest(), 'files': len(rows)}))


if __name__ == '__main__':
    main()
