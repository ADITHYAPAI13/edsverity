"""HTML5 parsing and route checks across the actual site documents."""
import unittest
from pathlib import Path
from urllib.parse import urlsplit, unquote
import html5lib

ROOT=Path(__file__).resolve().parents[1]


class StructureTests(unittest.TestCase):
    def test_html5_documents_routes_ids_and_labels(self):
        for path in sorted(ROOT.glob('*.html')):
            with self.subTest(page=path.name):
                parser=html5lib.HTMLParser(namespaceHTMLElements=False)
                doc=parser.parse(path.read_text())
                self.assertEqual(parser.errors,[])
                ids=[el.get('id') for el in doc.iter() if el.get('id')]
                self.assertEqual(len(ids),len(set(ids)))
                for el in doc.iter():
                    if el.get('for'):
                        self.assertIn(el.get('for'),ids)
                    for attr in ('src','href'):
                        raw=el.get(attr)
                        if not raw:continue
                        url=urlsplit(raw)
                        if url.scheme or url.netloc:continue
                        target=ROOT/unquote(url.path) if url.path else path
                        self.assertTrue(target.is_file(),f'{path.name}: missing {raw}')
                if path.name!='backend-test.html':
                    self.assertEqual(len(doc.findall('.//nav[@class="top-nav"]')),1)
                    self.assertEqual(len(doc.findall('.//script')),1)


if __name__=='__main__':unittest.main()
