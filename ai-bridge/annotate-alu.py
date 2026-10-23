# annotate-alu.py —— 在运算器实验电路的无头渲染截图上标注元件功能
from PIL import Image, ImageDraw, ImageFont
import os

SRC = os.path.join(os.path.dirname(__file__), 'out', 'alu-lab.png')
DST = os.path.join(os.path.dirname(__file__), 'out', 'alu-lab-annotated.png')
S = 1.5

def font(size):
    for p in ('C:/Windows/Fonts/msyh.ttc', 'C:/Windows/Fonts/msyhbd.ttc', 'C:/Windows/Fonts/simhei.ttf'):
        if os.path.exists(p):
            return ImageFont.truetype(p, size)
    return ImageFont.load_default()

im = Image.open(SRC).convert('RGB')
im = im.resize((int(im.width * S), int(im.height * S)), Image.LANCZOS)
d = ImageDraw.Draw(im)
F = font(19)
RED = (214, 30, 30)

# (标注文字, 箭头指向的页面坐标, 文字左上角页面坐标)
ITEMS = [
    ('数据显示灯 ×8（运算结果 F7…F0）', (860, 92), (1000, 58)),
    ('74LS245：ALU 输出三态门', (790, 168), (300, 105)),
    ('ALU-BUS 开关\n0=打开三态门，把结果送上总线', (608, 150), (300, 150)),
    ('74LS181(2)：高 4 位\nA7~A4 / B7~B4', (700, 330), (240, 215)),
    ('74LS181(1)：低 4 位\nA3~A0 / B3~B0', (1010, 330), (1020, 205)),
    ('Cn 开关（0=有进位输入）', (1258, 235), (1070, 245)),
    ('S3~S0、M 开关\n选择 16 种运算功能', (1338, 370), (1400, 300)),
    ('74LS273 DR1：A 端操作数', (690, 495), (240, 390)),
    ('74LS273 DR2：B 端操作数', (1175, 468), (1290, 520)),
    ('MR 开关\n置 1 时两片 273 不清零', (548, 420), (240, 445)),
    ('P1 单脉冲\n上升沿把数据装入 DR1', (528, 530), (240, 520)),
    ('P2 单脉冲\n上升沿把数据装入 DR2', (1158, 540), (1180, 565)),
    ('SW-BUS 开关\n0=打开输入三态门', (768, 725), (560, 700)),
    ('74LS245：数据输入三态门', (1010, 668), (1030, 640)),
    ('数据开关 SW7…SW0（左=高位）', (900, 810), (620, 835)),
    ('进位指示灯 Cn+4\n0=有进位输出', (773, 248), (240, 285)),
]

for text, (ax, ay), (tx, ty) in ITEMS:
    A = (ax * S, ay * S)
    T = (tx * S, ty * S)
    d.ellipse([A[0] - 6, A[1] - 6, A[0] + 6, A[1] + 6], outline=RED, width=3)
    first = text.split('\n')[0]
    sx = T[0] + (d.textlength(first, font=F) if tx > ax else 0)
    sy = T[1] + 12
    d.line([(sx, sy), (A[0], A[1])], fill=RED, width=2)
    d.text(T, text, font=F, fill=(20, 20, 160), spacing=4)

d.rectangle([0, 0, im.width - 1, im.height - 1], outline=(120, 120, 120))
im.save(DST)
print('已生成 ' + DST)
