"""Validate the published research links and actual PDF destinations."""
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit
import json
import re

from pypdf import PdfReader

ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / 'app/docs'


class Page(HTMLParser):
    def __init__(self, path):
        super().__init__()
        self.ids, self.links, self.text = [], [], []
        self.feed(path.read_text())

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if 'id' in attrs:
            self.ids.append(attrs['id'])
        for name in ('href', 'src'):
            if name in attrs:
                self.links.append(attrs[name])

    def handle_data(self, value):
        self.text.append(value)


def verify():
    result = {'htmlPages': 0, 'localLinks': 0, 'markdownDocuments': 0,
              'markdownLocalLinks': 0, 'pdfs': []}
    paths = sorted((ROOT / 'app').rglob('*.html')) + sorted(ROOT.glob('*.html'))
    for path in paths:
        page = Page(path)
        assert len(page.ids) == len(set(page.ids)), f'Duplicate ID: {path.name}'
        for value in page.links:
            url = urlsplit(value)
            if url.scheme or url.netloc or value.startswith('/'):
                assert not value.endswith(('.', ',', ';')), value
                continue
            if not url.path and not url.fragment:
                continue
            assert not url.path.endswith('.md'), value
            target = (path.parent / unquote(url.path)).resolve() if url.path else path
            assert target.is_file(), (path.name, value)
            if url.fragment and target.suffix == '.html':
                assert unquote(url.fragment) in Page(target).ids, (path.name, value)
            result['localLinks'] += 1
        result['htmlPages'] += 1
    markdown = [p for p in DOCS.glob('*.md') if not p.name.startswith('PROJECT')]
    markdown += list(ROOT.glob('*.md'))
    for path in markdown:
        text = re.sub(r'```.*?```', '', path.read_text(), flags=re.S)
        for match in re.finditer(r'!?\[[^\]]*\]\(([^)]+)\)', text):
            value = match[1].split(' "')[0]
            url = urlsplit(value)
            if url.scheme or url.netloc or value.startswith('/') or not url.path:
                continue
            target = (path.parent / unquote(url.path)).resolve()
            assert target.is_file(), (path.name, value)
            if url.fragment and target.suffix == '.html':
                assert unquote(url.fragment) in Page(target).ids, (path.name, value)
            result['markdownLocalLinks'] += 1
        result['markdownDocuments'] += 1
    for suffix in ('', '.en'):
        for base in ('research', 'reuse-audit', 'contacts'):
            path = DOCS / (base + suffix + '.html')
            page = Page(path)
            assert len(page.ids) == len(set(page.ids)), f'Duplicate ID: {path.name}'
            assert not re.search(r'[\w-]+(?:\.en)?\.md\b', ''.join(page.text)), path.name
        research = Page(DOCS / ('research' + suffix + '.html'))
        expected = ('mechanics', 'engine-comparison', 'glass-optics',
                    'cpu-research', 'sources', 'next-stage')
        assert all(name in research.ids for name in expected)
        audit = Page(DOCS / ('reuse-audit' + suffix + '.html'))
        for name in ('mechanics', 'engine-comparison', 'glass-optics', 'cpu-research'):
            assert 'research' + suffix + '.html#' + name in audit.links
        for name in ('LICENSE.txt', 'provenance.json', 'planck.mjs', 'planck-1.5.0.tgz'):
            assert '../vendor/planck/' + name in audit.links

        pdf = PdfReader(DOCS / ('Gremlin_Tennis_Research_0.8.4' + suffix + '.pdf'))
        page_ids = {p.indirect_reference.idnum: i for i, p in enumerate(pdf.pages)}
        internal, resources, planck_targets = 0, 0, set()
        mechanical_pages = {}
        for i, page in enumerate(pdf.pages):
            text = page.extract_text() or ''
            assert not re.search(r'[\w-]+(?:\.en)?\.md\b', text), (suffix, i + 1)
            for title in ('Механика пультов', 'Выбор движка механики',
                          'Controller mechanics', 'Mechanical engine choice'):
                if title in text and i > 2:
                    mechanical_pages.setdefault(title, []).append(i)
            for raw in page.get('/Annots', []):
                annotation = raw.get_object()
                destination = annotation.get('/Dest')
                action = annotation.get('/A', {})
                if not destination and action.get('/S') == '/GoTo':
                    destination = action['/D']
                if destination:
                    target = page_ids[destination[0].idnum]
                    internal += 1
                    if 'Planck.js 1.5.0' in text:
                        planck_targets.add(target)
                if action.get('/S') == '/URI':
                    url = urlsplit(action['/URI'])
                    if not url.scheme and not url.netloc:
                        assert (DOCS / unquote(url.path)).resolve().is_file(), action['/URI']
                        resources += 1
        titles = ('Controller mechanics', 'Mechanical engine choice') if suffix else ('Механика пультов', 'Выбор движка механики')
        for title in titles:
            # The chapter heading is on a later page than its cross-reference.
            assert max(mechanical_pages[title]) in planck_targets, (suffix, title)
        assert internal > 20 and resources > 10
        result['pdfs'].append({'language': 'en' if suffix else 'ru',
                               'pages': len(pdf.pages), 'internalLinks': internal,
                               'localResourceLinks': resources,
                               'planckChapterDestinationsChecked': True})
    return result


if __name__ == '__main__':
    print(json.dumps(verify(), ensure_ascii=False, indent=2))
