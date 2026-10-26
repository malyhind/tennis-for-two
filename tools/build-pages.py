"""Export the standalone instrument and browser benches for a static host."""
from pathlib import Path
import hashlib
import json
import os
import shutil
from html.parser import HTMLParser
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / 'public'


class Page(HTMLParser):
    def __init__(self, path):
        super().__init__()
        self.links, self.ids = [], set()
        self.feed(path.read_text())

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if 'id' in attrs:
            self.ids.add(attrs['id'])
        self.links.extend(attrs[k] for k in ('href', 'src') if k in attrs)


def verify_links():
    pages = {p.resolve(): Page(p) for p in OUTPUT.rglob('*.html')}
    checked = 0
    for path, page in pages.items():
        for value in page.links:
            url = urlsplit(value)
            if url.scheme or url.netloc or not value:
                continue
            if url.path.startswith('/'):
                raise ValueError(f'Host-root link breaks project subpaths: {path.name}: {value}')
            target = (path.parent / unquote(url.path)).resolve() if url.path else path
            if not target.is_relative_to(OUTPUT.resolve()) or not target.is_file():
                raise ValueError(f'Missing published link: {path.relative_to(OUTPUT)}: {value}')
            if url.fragment and target in pages and unquote(url.fragment) not in pages[target].ids:
                raise ValueError(f'Missing fragment: {path.name}: {value}')
            checked += 1
    return {'htmlPages': len(pages), 'localLinks': checked}


def main():
    # A fixed output prevents accidental removal of a caller-supplied directory.
    if OUTPUT.is_symlink():
        raise ValueError('public must not be a symbolic link')
    if OUTPUT.exists():
        shutil.rmtree(OUTPUT)
    OUTPUT.mkdir()
    for name in ('index.html', 'project.html', 'LICENSE'):
        shutil.copy2(ROOT / name, OUTPUT / name)
    shutil.copytree(ROOT / 'app', OUTPUT / 'app', ignore=shutil.ignore_patterns(
        '__pycache__', 'PROJECT.md', 'PROJECT.en.md', 'downloads'))
    shutil.copytree(ROOT / 'checks', OUTPUT / 'checks')
    (OUTPUT / 'tests' / 'fixtures').mkdir(parents=True)
    for name in ('scope-check.html', 'scope-check.en.html', 'scope-check.js',
                 'fixtures/joint-beam.f64', 'verify-joint-native.mjs'):
        shutil.copy2(ROOT / 'tests' / name, OUTPUT / 'tests' / name)
    version = json.loads((ROOT / 'package.json').read_text())['version']
    info = {'version': version, 'commit': os.environ.get('CI_COMMIT_SHA'),
            'repository': os.environ.get('CI_PROJECT_URL'),
            'pages': os.environ.get('CI_PAGES_URL'),
            'wasmSHA256': hashlib.sha256((OUTPUT / 'app/vendor/spice.wasm').read_bytes()).hexdigest()}
    (OUTPUT / 'publication.json').write_text(json.dumps(info, indent=2) + '\n')
    paths = [p for p in OUTPUT.rglob('*') if p.is_file()]
    links = verify_links()
    print(json.dumps({'directory': str(OUTPUT), 'files': len(paths), **links,
                      'bytes': sum(p.stat().st_size for p in paths), **info}))


if __name__ == '__main__':
    main()
