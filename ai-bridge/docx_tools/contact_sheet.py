# contact_sheet.py —— 取出 docx 内嵌图片，拼成一张带编号的联系表，便于一次看清全部截图
import sys, os, zipfile, io
from PIL import Image, ImageDraw, ImageFont

docx = sys.argv[1]
out = sys.argv[2]
cols = int(sys.argv[3]) if len(sys.argv) > 3 else 2
cell_w = int(sys.argv[4]) if len(sys.argv) > 4 else 640

z = zipfile.ZipFile(docx)
names = sorted([n for n in z.namelist() if n.startswith('word/media/') and not n.endswith('/')],
               key=lambda s: int(''.join(c for c in os.path.basename(s) if c.isdigit()) or 0))
imgs = []
for n in names:
    im = Image.open(io.BytesIO(z.read(n))).convert('RGB')
    imgs.append((os.path.basename(n), im))

def font(size):
    for p in ('C:/Windows/Fonts/msyh.ttc', 'C:/Windows/Fonts/simhei.ttf'):
        if os.path.exists(p):
            return ImageFont.truetype(p, size)
    return ImageFont.load_default()

F = font(28)
rows = (len(imgs) + cols - 1) // cols
cell_h = int(cell_w * imgs[0][1].height / imgs[0][1].width)
sheet = Image.new('RGB', (cols * cell_w, rows * (cell_h + 40)), (255, 255, 255))
d = ImageDraw.Draw(sheet)
for i, (name, im) in enumerate(imgs):
    t = im.resize((cell_w - 8, cell_h - 8), Image.LANCZOS)
    r, c = divmod(i, cols)
    x, y = c * cell_w + 4, r * (cell_h + 40) + 36
    sheet.paste(t, (x, y))
    d.rectangle([x - 2, y - 2, x + t.width + 1, y + t.height + 1], outline=(180, 180, 180))
    d.text((c * cell_w + 8, r * (cell_h + 40) + 4), '#%d  %s' % (i + 1, name), font=F, fill=(200, 0, 0))
sheet.save(out)
print('联系表已生成: %s  (%dx%d，共 %d 张)' % (out, sheet.width, sheet.height, len(imgs)))
