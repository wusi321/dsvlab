# page_sheet.py —— 把多页 PDF 渲染图拼成一张总览图（便于快速检查版面）
import sys, os, glob
from PIL import Image, ImageDraw, ImageFont

out = sys.argv[1]
cols = int(sys.argv[2])
width = int(sys.argv[3])
files = sorted(sys.argv[4:], key=lambda s: int(''.join(c for c in os.path.basename(s) if c.isdigit()) or 0))

def font(size):
    for p in ('C:/Windows/Fonts/msyh.ttc', 'C:/Windows/Fonts/simhei.ttf'):
        if os.path.exists(p):
            return ImageFont.truetype(p, size)
    return ImageFont.load_default()
F = font(22)

pages = []
for f in files:
    im = Image.open(f).convert('RGB')
    h = int(im.height * width / im.width)
    pages.append((os.path.basename(f), im.resize((width, h), Image.LANCZOS)))
rows = (len(pages) + cols - 1) // cols
ch = max(p.height for _, p in pages)
sheet = Image.new('RGB', (cols * width, rows * (ch + 30)), (240, 240, 240))
d = ImageDraw.Draw(sheet)
for i, (name, p) in enumerate(pages):
    r, c = divmod(i, cols)
    d.text((c * width + 6, r * (ch + 30) + 4), name, font=F, fill=(180, 0, 0))
    sheet.paste(p, (c * width, r * (ch + 30) + 28))
sheet.save(out)
print('%s %dx%d (%d 页)' % (out, sheet.width, sheet.height, len(pages)))
