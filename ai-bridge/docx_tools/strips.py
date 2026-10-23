# strips.py —— 从多张同尺寸截图中裁出同一区域，纵向拼接成对照表（便于一次读清每张的状态）
# 用法: python strips.py <输出> <y0> <y1> <x0> <x1> <图片1> <图片2> ...
import sys, os
from PIL import Image, ImageDraw, ImageFont

out, y0, y1, x0, x1 = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), int(sys.argv[4]), int(sys.argv[5])
files = sys.argv[6:]

def font(size):
    for p in ('C:/Windows/Fonts/msyh.ttc', 'C:/Windows/Fonts/simhei.ttf'):
        if os.path.exists(p):
            return ImageFont.truetype(p, size)
    return ImageFont.load_default()
F = font(22)

crops = []
for f in files:
    im = Image.open(f).convert('RGB')
    x1c = min(x1, im.width); y1c = min(y1, im.height)
    crops.append((os.path.basename(f), im.crop((x0, y0, x1c, y1c))))
w = max(c.width for _, c in crops)
h = sum(c.height + 34 for _, c in crops)
sheet = Image.new('RGB', (w, h), (255, 255, 255))
d = ImageDraw.Draw(sheet)
y = 0
for name, c in crops:
    d.text((6, y + 4), name, font=F, fill=(200, 0, 0))
    sheet.paste(c, (0, y + 30))
    d.line([(0, y + 30 + c.height), (w, y + 30 + c.height)], fill=(200, 200, 200))
    y += c.height + 34
sheet.save(out)
print('%s  %dx%d  (%d 张)' % (out, sheet.width, sheet.height, len(crops)))
