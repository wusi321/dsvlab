# annotate.py —— 在无头渲染截图上标注各元件的功能与位置，便于对着图做实验
from PIL import Image, ImageDraw, ImageFont
import os, sys

SRC = os.path.join(os.path.dirname(__file__), 'out', 'memory-lab.png')
DST = os.path.join(os.path.dirname(__file__), 'out', 'memory-lab-annotated.png')
S = 1.5                                     # 放大倍数，便于阅读

def font(size):
    for p in ('C:/Windows/Fonts/msyh.ttc', 'C:/Windows/Fonts/msyhbd.ttc', 'C:/Windows/Fonts/simhei.ttf'):
        if os.path.exists(p):
            return ImageFont.truetype(p, size)
    return ImageFont.load_default()

im = Image.open(SRC).convert('RGB')
im = im.resize((int(im.width * S), int(im.height * S)), Image.LANCZOS)
d = ImageDraw.Draw(im)
F, FS = font(19), font(16)
RED = (214, 30, 30)

# (标注文字, 箭头指向的页面坐标, 文字左上角页面坐标)
ITEMS = [
    ('数据指示灯 ×8（数据总线 D7…D0）', (840, 100), (250, 40)),
    ('RAM 6116  2K×8 静态存储器\n（A8~A10 与 -OE 由模型内置接地）', (800, 175), (1330, 95)),
    ('地址指示灯 ×8（AR 输出的地址）', (1090, 166), (1330, 200)),
    ('与非门：(WE, P1) → 6116 的 -WE\nP1 空闲时输出1=读；WE=1且P1脉冲时输出0=写', (1096, 250), (1330, 300)),
    ('WE 开关（写控制信号）与 P1 单脉冲', (1090, 315), (1330, 400)),
    ('与门：(LDAR, P2) → AR 的 CP\nLDAR=1 时 P2 上升沿把总线数据装入 AR', (1096, 405), (1330, 500)),
    ('LDAR 开关与 P2 单脉冲', (1090, 470), (1330, 590)),
    ('74LS273 = 地址寄存器 AR', (700, 400), (240, 400)),
    ('MR 开关（置1，AR 不清零）', (600, 480), (240, 470)),
    ('SW-BUS 开关\n（0=打开三态门，把 SW0~SW7 送到总线）', (608, 570), (240, 545)),
    ('74LS245 = 三态门\nA侧接数据开关，B侧接数据总线', (700, 580), (240, 640)),
    ('数据开关 SW7…SW0（左=高位）\n00H~FFH 地址/数据都由这 8 个开关给出', (785, 715), (240, 780)),
    ('CE 开关（片选：0=6116 工作）', (850, 285), (940, 330)),
]

for text, (ax, ay), (tx, ty) in ITEMS:
    A = (ax * S, ay * S)
    T = (tx * S, ty * S)
    d.ellipse([A[0] - 6, A[1] - 6, A[0] + 6, A[1] + 6], outline=RED, width=3)
    # 引线：从文字靠箭头的一侧出发
    sx = T[0] + (d.textlength(text.split('\n')[0], font=F) if tx > ax else 0)
    sy = T[1] + 12
    d.line([(sx, sy), (A[0], A[1])], fill=RED, width=2)
    d.text(T, text, font=F, fill=(20, 20, 160), spacing=4)

d.rectangle([0, 0, im.width - 1, im.height - 1], outline=(120, 120, 120))
im.save(DST)
print('已生成 ' + DST)
