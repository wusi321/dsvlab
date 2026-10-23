# dump_docx.py —— 打印 docx 的结构：段落(样式/文本)、表格、图片数量
import sys, zipfile, re
from docx import Document
from docx.shared import Pt

def dump(path):
    print('=' * 100)
    print('文件: ' + path)
    z = zipfile.ZipFile(path)
    media = [n for n in z.namelist() if n.startswith('word/media/')]
    print('内嵌图片: %d 个 -> %s' % (len(media), ', '.join(media[:12])))
    doc = Document(path)
    body = doc.element.body
    from docx.table import Table
    from docx.text.paragraph import Paragraph
    idx = 0
    for child in body.iterchildren():
        tag = child.tag.split('}')[-1]
        if tag == 'p':
            p = Paragraph(child, doc)
            txt = p.text
            imgs = len(child.findall('.//{http://schemas.openxmlformats.org/drawingml/2006/main}blip'))
            marks = []
            if imgs: marks.append('IMG×%d' % imgs)
            if p.style is not None and p.style.name != 'Normal': marks.append('style=' + p.style.name)
            if txt.strip() or marks:
                print('[%3d] %s%s' % (idx, ('<%s> ' % ' '.join(marks)) if marks else '', txt))
        elif tag == 'tbl':
            t = Table(child, doc)
            print('[%3d] <TABLE %d行 x %d列>' % (idx, len(t.rows), len(t.columns)))
            for r, row in enumerate(t.rows):
                cells = [c.text.replace('\n', ' / ') for c in row.cells]
                print('        r%d: %s' % (r, ' | '.join(cells)))
        idx += 1

for p in sys.argv[1:]:
    dump(p)
