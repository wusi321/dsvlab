# read_leds.py —— 精确识别截图里每个指示灯（亮/灭）与开关状态
# 用法: python read_leds.py <图片...>
import sys, os
import numpy as np
from PIL import Image


def components(mask, min_size=18):
    ys, xs = np.nonzero(mask)
    pts = set(zip(xs.tolist(), ys.tolist()))
    seen, comps = set(), []
    for p in pts:
        if p in seen:
            continue
        stack, comp = [p], []
        seen.add(p)
        while stack:
            q = stack.pop()
            comp.append(q)
            for dx in (-2, -1, 0, 1, 2):
                for dy in (-2, -1, 0, 1, 2):
                    r = (q[0] + dx, q[1] + dy)
                    if r in pts and r not in seen:
                        seen.add(r)
                        stack.append(r)
        if len(comp) >= min_size:
            cx = sum(c[0] for c in comp) / len(comp)
            cy = sum(c[1] for c in comp) / len(comp)
            comps.append((cx, cy, len(comp)))
    return comps


for f in sys.argv[1:]:
    a = np.array(Image.open(f).convert('RGB')).astype(int)
    R, G, B = a[:, :, 0], a[:, :, 1], a[:, :, 2]
    on = (R > 240) & (G > 170) & (G < 240) & (B < 180)          # 暖色=点亮
    off = (R > 195) & (R < 250) & (G > 235) & (B > 230)         # 冷青=熄灭
    on[:48, :] = False; off[:48, :] = False                     # 排除工具条
    ons = components(on, 25)
    offs = components(off, 40)
    # 按 y 分行（相邻 40px 内算同一行）
    items = [(x, y, 'ON') for x, y, _ in ons] + [(x, y, 'off') for x, y, _ in offs]
    items.sort(key=lambda t: t[1])
    rows, cur = [], []
    for it in items:
        if cur and abs(it[1] - cur[-1][1]) > 40:
            rows.append(cur); cur = []
        cur.append(it)
    if cur:
        rows.append(cur)
    print('== %s ==' % os.path.basename(f))
    for r in rows:
        r.sort(key=lambda t: t[0])
        y = int(np.mean([t[1] for t in r]))
        bits = ''.join('1' if t[2] == 'ON' else '0' for t in r)
        xs = ','.join(str(int(t[0])) for t in r)
        print('   y≈%-4d 灯%d个 左->右: %s   (x: %s)' % (y, len(r), bits, xs))
    print()
