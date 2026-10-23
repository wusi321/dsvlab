# walk_docx.py —— 递归打印 docx 结构（含表格单元格内部段落与图片位置）
# 用法: python walk_docx.py <文件> [路径前缀过滤]
import sys
from docx import Document
from docx.table import Table
from docx.text.paragraph import Paragraph
from docx.oxml.ns import qn

NS_A = 'http://schemas.openxmlformats.org/drawingml/2006/main'
NS_V = 'urn:schemas-microsoft-com:vml'
NS_W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'


def para_info(p_el):
    p = Paragraph(p_el, None)
    imgs = len(p_el.findall('.//{%s}blip' % NS_A)) + len(p_el.findall('.//{%s}imagedata' % NS_V))
    return p, imgs


def walk(container, doc, path='', depth=0, out=None):
    pad = '  ' * depth
    for child in container.iterchildren():
        tag = child.tag.split('}')[-1]
        if tag == 'p':
            p, imgs = para_info(child)
            txt = p.text
            if not txt.strip() and not imgs:
                continue
            mark = ('  <<图片 %d 张>>' % imgs) if imgs else ''
            out.append('%s%s%s%s' % (pad, path, ('「%s」' % txt) if txt.strip() else '(空段落)', mark))
        elif tag == 'tbl':
            t = Table(child, doc)
            for ri, row in enumerate(t.rows):
                seen = set()
                for ci, cell in enumerate(row.cells):
                    if id(cell._tc) in seen:
                        continue
                    seen.add(id(cell._tc))
                    out.append('%s[表格 r%d c%d] ----' % (pad, ri, ci))
                    walk(cell._tc, doc, path='', depth=depth + 2, out=out)


f = sys.argv[1]
doc = Document(f)
out = []
walk(doc.element.body, doc, out=out)
print('\n'.join(out))
print('\n--- 共 %d 行 ---' % len(out))
