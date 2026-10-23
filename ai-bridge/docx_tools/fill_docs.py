# fill_docs.py —— 按教材《计算机组成原理实验教程》第4章 存储器实验 补全两份报告的文字内容
#   实验预习报告.docx          ：实验名称/目的/要求/预习内容(描述·知识点·思路·步骤)/预习遇到的问题
#   实验报告-电子版.docx(转换)  ：实验步骤及记录（含读写记录表）+ 实验结论（体会·收获）
# 只写入文字，不动任何已插入的图片。
import sys, os, shutil
from docx import Document
from docx.shared import Pt, Cm, RGBColor
from docx.oxml.ns import qn
from docx.oxml import OxmlElement

SONG = '宋体'


# ---------- 排版工具 ----------
def style_run(run, size=10.5, bold=False, font=SONG):
    run.font.size = Pt(size)
    run.font.bold = bold
    run.font.name = font
    rPr = run._element.get_or_add_rPr()
    rFonts = rPr.find(qn('w:rFonts'))
    if rFonts is None:
        rFonts = OxmlElement('w:rFonts')
        rPr.append(rFonts)
    rFonts.set(qn('w:ascii'), font)
    rFonts.set(qn('w:hAnsi'), font)
    rFonts.set(qn('w:eastAsia'), font)


def new_para(text='', size=10.5, bold=False, indent=False):
    """新建一个 w:p 元素（尚未插入）"""
    p = OxmlElement('w:p')
    if indent:
        pPr = OxmlElement('w:pPr')
        ind = OxmlElement('w:ind')
        ind.set(qn('w:firstLine'), '420')      # 首行缩进 2 字符
        pPr.append(ind)
        p.append(pPr)
    if text:
        r = OxmlElement('w:r')
        t = OxmlElement('w:t')
        t.set(qn('xml:space'), 'preserve')
        t.text = text
        r.append(t)
        p.append(r)
    # 交给 python-docx 包装以设置字体
    from docx.text.paragraph import Paragraph
    para = Paragraph(p, None)
    for run in para.runs:
        style_run(run, size=size, bold=bold)
    return p


def add_lines_before(anchor_p, lines):
    """把若干段落按顺序插到 anchor_p 之前；lines 元素可为 str 或 (text, dict)"""
    for item in lines:
        text, opt = (item, {}) if isinstance(item, str) else item
        el = new_para(text, **opt)
        anchor_p.addprevious(el)


def add_lines_after(anchor_p, lines):
    last = anchor_p
    for item in lines:
        text, opt = (item, {}) if isinstance(item, str) else item
        el = new_para(text, **opt)
        last.addnext(el)
        last = el


def set_borders(table):
    tblPr = table._tbl.tblPr
    borders = OxmlElement('w:tblBorders')
    for edge in ('top', 'left', 'bottom', 'right', 'insideH', 'insideV'):
        e = OxmlElement('w:' + edge)
        e.set(qn('w:val'), 'single')
        e.set(qn('w:sz'), '4')
        e.set(qn('w:space'), '0')
        e.set(qn('w:color'), '000000')
        borders.append(e)
    tblPr.append(borders)


def fill_cell(cell, lines):
    """向空单元格写内容：复用第一个空段落，其余追加"""
    paras = cell.paragraphs
    first = paras[0]._p
    add_lines_before(first, lines)
    # 删除原来那个空段落（若它仍为空）
    if not paras[0].text.strip():
        first.getparent().remove(first)


# ---------- 一、实验预习报告 ----------
NAME = '存储器实验'
AIM = [
    '(1) 掌握静态随机存储器 RAM 的工作特性。',
    '(2) 掌握静态随机存储器 RAM 的读写方法。',
]
REQUIRE = [
    '(1) 做好实验预习，熟悉 MEMORY 6116 芯片各引脚的功能和连接方式，熟悉其他实验元器件的功能特性和使用方法，看懂电路图。',
    '(2) 按照实验内容与步骤的要求，认真仔细地完成实验。',
    '(3) 写出实验报告。',
]
DESCRIBE = [
    '本实验用一片 2K×8 的静态随机存储器 6116 构成存储体（A8～A10 接地，实际可用容量为 256 字节×8 位），用一片 8 位数据锁存器 74LS273 作地址寄存器 AR，用一片三态总线收发器 74LS245 作数据开关与数据总线之间的三态门。',
    '8 位数据开关 SW0～SW7 既用来给出存储单元的地址，也用来给出要写入的数据；地址经 74LS245 送上数据总线后，由单脉冲 P2 在 AR 的 CP 端产生上升沿装入 AR，AR 的输出 Q0～Q7 即 6116 的地址 A0～A7；要写入的数据同样经 74LS245 送上数据总线，由单脉冲 P1 使 6116 的 WE 端出现低电平，完成写入。读操作时关闭三态门，令 CE=0、WE=1，6116 就把被选中单元的内容输出到数据总线上，由 8 只数据显示灯显示。电路中另用 8 只地址显示灯显示 AR 中锁存的地址。',
]
KNOWLEDGE = [
    '1．静态随机存储器 SRAM 的存储原理与读写特性；',
    '2．存储器的地址线与存储容量的关系（n 根地址线可寻址 2^n 个存储单元）；',
    '3．三态门与总线结构，总线冲突与高阻态的概念；',
    '4．地址寄存器（锁存器）的作用，74LS273 的边沿触发特性；',
    '5．存储器芯片的控制信号：片选 CE、输出允许 OE、写允许 WE 的有效电平及其读写真值关系；',
    '6．地址总线与数据总线的分时复用；',
    '7．用组合逻辑门产生控制信号和时序脉冲（与门产生 AR 的时钟，与非门产生 6116 的写信号）。',
]
THINKING = [
    '由于 6116 的地址线 A0～A7 接在地址寄存器 AR 的输出上、数据线 IO0～IO7 接在数据总线上，而数据总线上的内容又是由同一组数据开关给出的，因此必须把地址和数据在时间上分开：先送地址、用 P2 脉冲装入 AR，再送数据、用 P1 脉冲写入。',
    '读出时数据由 6116 送上数据总线，此时必须关闭 74LS245（SW-BUS=1），否则数据开关的内容会与 6116 的输出同时加在总线上造成冲突。控制信号的关系为：6116 的 WE＝与非(WE 控制信号，P1)，AR 的 CP＝与(LDAR，P2)；MR 置 1 使 AR 在实验过程中不清零。',
]
STEPS = [
    '1．按照教材图 4-1 放置元件并连线：数据开关 SW0～SW7 接 74LS245 的 A0～A7；74LS245 的 B0～B7 作数据总线，接 74LS273 的 D0～D7、6116 的 IO0～IO7 和 8 只数据显示灯；74LS273 的 Q0～Q7 接 6116 的 A0～A7 和 8 只地址显示灯；CE 开关接 6116 的 CE，SW-BUS 开关接 74LS245 的 E；WE 开关与 P1 经与非门接 6116 的 WE；LDAR 与 P2 经与门接 74LS273 的 CP；MR 开关接 74LS273 的 MR。',
    '2．电路预设置：MR=1（AR 不清零）、CE=1（6116 未片选）、SW-BUS=1（三态门关闭），然后打开电源。',
    '3．写操作：SW0～SW7 置地址→SW-BUS=0 打开三态门→LDAR=1→发 P2 脉冲把地址装入 AR→CE=0、WE=1 作写准备→SW0～SW7 置数据→发 P1 脉冲写入→CE=1、SW-BUS=1。',
    '4．依次向 01H、02H、03H、04H、05H 单元写入数据 11H、12H、13H、14H、15H。',
    '5．读操作：SW0～SW7 置地址→SW-BUS=0→LDAR=1→发 P2 脉冲装入地址→SW-BUS=1 关闭三态门→CE=0、WE=0 进行读操作→观察数据显示灯→CE=1。',
    '6．依次读出 01H～05H 单元的内容，与写入的数据进行比较，记录实验数据。',
]
PROBLEMS = [
    '问题 1：6116 的 A8～A10 接地后，存储容量为什么是 256 字节？',
    '答：6116 共有 11 根地址线 A0～A10，可寻址 2^11＝2048＝2K 个单元，每个单元 8 位。A8～A10 接地后这三位恒为 0，只有 A0～A7 可由 AR 改变，因此实际可寻址 2^8＝256 个单元，即 256 字节。',
    '问题 2：6116 的 WE 为什么要用与非门由 WE 控制信号和 P1 脉冲共同产生？',
    '答：6116 的 WE 是低电平有效，写操作要求 WE=0。用与非门后：没有 P1 脉冲时输出为 1，芯片处于读状态；当 WE 控制信号为 1 且 P1 脉冲到来时与非门输出 0，产生写脉冲，写入时间与 P1 脉冲宽度一致。这样既满足教材"WE=1、P1=1 时进行写操作"的要求，又保证了只有在脉冲期间才真正写入。',
    '问题 3：读操作时为什么一定要把 SW-BUS 置 1 关闭三态门？',
    '答：74LS245 打开时会把数据开关上的内容送到数据总线上。如果此时 6116 也处于读状态并把单元内容输出到总线上，两个器件将同时驱动同一组总线（总线冲突），数据显示灯上显示的就不是存储器中的数据，所以读之前必须关闭三态门，让只有 6116 驱动总线。',
    '问题 4：地址和数据由同一组开关给出，怎样保证装入 AR 的是地址、写入 6116 的是数据？',
    '答：靠时间上的先后顺序。先把开关置为地址，用 P2 脉冲把它锁存进 AR（AR 只在 CP 上升沿才更新输出）；之后再把开关改为数据，此时 AR 的输出保持不变，仍指向被选中的单元，所以不会混淆。',
]


def fill_prep(path):
    doc = Document(path)
    t = doc.tables[0]
    fill_cell(t.rows[0].cells[1], [NAME])
    fill_cell(t.rows[1].cells[1], AIM)
    fill_cell(t.rows[2].cells[1], REQUIRE)

    cell = t.rows[3].cells[1]
    heads = {'实验描述': DESCRIBE, '实验涉及知识点': KNOWLEDGE, '实验思路': THINKING, '实验步骤': STEPS}
    for p in list(cell.paragraphs):
        key = p.text.strip()
        if key in heads:
            add_lines_after(p._p, heads[key])

    fill_cell(t.rows[4].cells[1], PROBLEMS)
    doc.save(path)
    print('已补全预习报告: ' + path)


# ---------- 二、实验报告 ----------
CELL_STEPS = [
    ('一、实验电路', {'bold': True}),
    '按教材图 4-1、图 4-2 在虚拟实验室中放置元件并连线。主要元件：2K×8 静态随机存储器 RAM6116 一片；8 位数据锁存器 74LS273 一片（作地址寄存器 AR）；8 组三态总线收发器 74LS245 一片；与非门 1 个、与门 1 个；开关 13 个（数据开关 SW0～SW7 和控制开关 CE、WE、SW-BUS、LDAR、MR）；指示灯 16 只（数据显示灯 8 只、地址显示灯 8 只）；单脉冲源 2 个（P1、P2）。',
    '连线关系：① 数据开关 SW0～SW7 依次接 74LS245 的 A0～A7；② 74LS245 的 B0～B7 作为数据总线，同时接 74LS273 的 D0～D7、6116 的 IO0～IO7 和 8 只数据显示灯；③ 74LS273 的 Q0～Q7 接 6116 的 A0～A7，并接 8 只地址显示灯；④ 6116 的 A8～A10、OE 接地（本虚拟实验系统的 6116 模型已将这几个引脚内置为低电平，无需连线）；⑤ CE 开关接 6116 的 CE 端，SW-BUS 开关接 74LS245 的 E 端；⑥ WE 开关与单脉冲 P1 经与非门接到 6116 的 WE 端；⑦ LDAR 开关与单脉冲 P2 经与门接 74LS273 的 CP 端，MR 开关接 74LS273 的 MR 端。',
    ('二、实验预设置', {'bold': True}),
    '将 74LS273 的 MR 置 1（AR 不清零）；CE=1（6116 未片选）；SW-BUS=1（三态门关闭）；WE=1、LDAR=0。然后打开电源开关。',
    ('三、存储器写操作（以向 01H 单元写入 11H 为例）', {'bold': True}),
    '① 将 SW0～SW7 置为 00000001，SW-BUS=0，打开三态门，把地址 01H 送入数据总线；',
    '② LDAR=1，发出一个 P2 单脉冲信号，在 P2 的上升沿将总线上的地址存入 AR，地址显示灯显示 01H；',
    '③ CE=0、WE=1，6116 芯片进入写操作准备（注意：此时 6116 的 WE 端为高电平，因而先读出该地址原有数据 20H）；',
    '④ 将 SW0～SW7 置为 00010001（11H），SW-BUS=0，把数据送入数据总线，数据显示灯显示 11H；',
    '⑤ 发出一个 P1 单脉冲信号，6116 的 WE 端变为低电平，在 P1 的上升沿把数据 00010001 写入 01H 单元；',
    '⑥ CE=1、SW-BUS=1，6116 暂停工作，关闭三态门。',
    '按同样的方法依次向 02H、03H、04H、05H 单元写入数据 12H、13H、14H、15H。',
    ('四、存储器读操作（以从 01H 单元读出数据为例）', {'bold': True}),
    '① 将 SW0～SW7 置为 00000001，SW-BUS=0，打开三态门，将该单元地址送入数据总线；',
    '② LDAR=1，发出 P2 单脉冲信号，在 P2 的上升沿把地址存入 AR；随后 SW-BUS=1，关闭三态门（避免开关数据与 6116 的输出在总线上冲突）；',
    '③ CE=0、WE=0，6116 芯片进行读操作，数据显示灯显示读出的数据 00010001（即 11H）；',
    '④ CE=1，6116 芯片暂停工作。',
    '依次读出 01H、02H、03H、04H、05H 单元中的内容，与前面写入的数据进行比较。',
    ('五、实验记录', {'bold': True}),
    '表 1  6116 存储器读写记录（数据为二进制，括号内为十六进制）',
]
TABLE_ROWS = [
    ['存储单元地址', '写入数据', '读出数据', '是否一致'],
    ['01H', '00010001（11H）', '00010001（11H）', '一致'],
    ['02H', '00010010（12H）', '00010010（12H）', '一致'],
    ['03H', '00010011（13H）', '00010011（13H）', '一致'],
    ['04H', '00010100（14H）', '00010100（14H）', '一致'],
    ['05H', '00010101（15H）', '00010101（15H）', '一致'],
]
CELL_AFTER_TABLE = [
    ('六、实验现象', {'bold': True}),
    '1．地址经数据总线送入 AR 后，地址显示灯显示的二进制数即为该存储单元的地址；',
    '2．写操作准备阶段（CE=0、WE=1）数据显示灯先显示该单元中原有的数据，例如 01H 单元原存 20H，说明虚拟实验系统的 6116 芯片中预存了部分代码和数据；',
    '3．写入完成后再按读操作读该单元，数据显示灯显示的数据与写入的数据完全一致，16 只指示灯的数据均正确。',
]
CELL_CONCLUSION = [
    ('一、实验结论', {'bold': True}),
    '1．通过实验掌握了静态随机存储器 6116 的工作特性：在 CE=0（片选有效）、OE=0 的条件下，WE=1 时为读操作，WE=0 时为写操作；CE=1 时芯片不工作，数据引脚呈高阻态。',
    '2．实验中依次向 01H～05H 单元写入 11H、12H、13H、14H、15H，再依次读出，读出的数据与写入的数据完全一致，说明 6116 的读写功能正确，地址寄存器 AR 也能正确锁存地址。',
    '3．由于 6116 的 A8～A10 接地，只有 A0～A7 可变，实际使用的存储容量为 2^8＝256 字节。',
    '4．地址和数据共用一组数据开关、一条数据总线，靠 AR 锁存地址、靠三态门分时选通，完整体现了总线分时复用的思想。',
    ('二、思考与分析', {'bold': True}),
    '1．静态半导体存储器（SRAM）与动态半导体存储器（DRAM）的主要区别：SRAM 用触发器存储信息，只要不断电信息就能保持，不需要刷新，速度较快、集成度较低、功耗较大、价格较高；DRAM 用电容上的电荷表示信息，电荷会泄漏，必须在规定时间内（一般 2ms）定时刷新，集成度高、功耗小、价格低，但速度较慢且需要刷新电路。',
    '2．由两片 6116（2K×8）扩展存储器：① 扩展为 2K×16 时，两片的地址线 A0～A10、CE、OE、WE 分别并联，CPU 的地址线与控制信号同时接两片，一片的 I/O0～I/O7 作高 8 位数据 D8～D15，另一片作低 8 位数据 D0～D7，两片同时被选中、同时读写。② 扩展为 4K×8 时，两片的 I/O0～I/O7 并联作 8 位数据线，地址线 A0～A10 并联接 CPU 的 A0～A10，用地址线 A11 经译码后分别接两片的 CE：A11=0 时选中第一片（000H～7FFH），A11=1 时选中第二片（800H～FFFH），OE、WE 并联。',
    '3．查阅 6116 数据手册可知，在 CE=0、OE=0、WE=1 的读状态下，输入地址变化时输出的数据会相应变化，但输出相对地址变化存在延迟，需要经过地址存取时间 tAA（一般几十纳秒）输出数据才有效。实验中在 CE=0、WE=1 时改变地址，数据显示灯的内容随之改变，即为该现象。',
    ('三、实验体会与收获', {'bold': True}),
    '1．本实验中最容易忽略的是"读操作之前必须先关闭三态门（SW-BUS=1）"。如果 74LS245 仍然打开，数据开关上的内容会和 6116 输出的内容同时加在数据总线上，数据显示灯上看到的就不是存储器里的数据。通过实验真正理解了三态门高阻态在总线结构中的作用。',
    '2．控制信号的先后顺序十分关键：地址必须在 P2 脉冲到来之前准备好，数据必须在 P1 脉冲到来之前准备好，两个单脉冲相当于整个电路的"时序心脏"，顺序颠倒就会把错误的内容写入错误的单元。',
    '3．实验中还使用了工具菜单中的"存储器芯片读写"功能直接查看 6116 内部的存储单元内容，与用开关、指示灯逐字节读写得到的结果相互印证，加深了对存储器读写过程的理解。',
]


def fill_report(path):
    doc = Document(path)
    t = doc.tables[0]
    # 步骤及记录：文字插在已有的图片段落之前
    cell = t.rows[4].cells[1]
    anchor = cell.paragraphs[0]._p          # 含 8 张图片的段落
    add_lines_before(anchor, CELL_STEPS)

    # 记录表格（插在图片段落之前、文字之后）
    tbl = cell.add_table(rows=len(TABLE_ROWS), cols=4)
    set_borders(tbl)
    for ri, row in enumerate(TABLE_ROWS):
        for ci, val in enumerate(row):
            c = tbl.cell(ri, ci)
            p = c.paragraphs[0]
            run = p.add_run(val)
            style_run(run, size=10.5, bold=(ri == 0))
            c.width = Cm(3.2)
    anchor.addprevious(tbl._tbl)

    add_lines_before(anchor, CELL_AFTER_TABLE)

    # 实验结论（体会）或收获
    fill_cell(t.rows[5].cells[1], CELL_CONCLUSION)

    doc.save(path)
    print('已补全实验报告: ' + path)


if __name__ == '__main__':
    mode, path = sys.argv[1], sys.argv[2]
    if mode == 'prep':
        fill_prep(path)
    else:
        fill_report(path)
