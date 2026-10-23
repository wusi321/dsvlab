# ai-bridge —— DS-VLAB 虚拟实验室接口驱动工具链

本目录用程序直接操作 DS-VLAB v1.2 的真实接口，实现**元件自动放置 + 自动连线 + 结果验证**。
不需要人工拖拽，也不需要浏览器插件。

## 一、结论：可行（已端到端验证）

实验室暴露了两条稳定接口，两条都已跑通：

| 接口 | 位置 | 用途 |
|---|---|---|
| `recovercircuit('demo', mycircuit, 存档文本)` | `js/fileoperation.js` | 由存档文本一次性重建整张电路（“文件→打开”的同一路径） |
| `mycircuit.addComponent / lineCreate / lineAdjust / addLineToComponent` | `js/circuitdiagram.js` | 逐个放置元件、逐条生成连线 |
| `circuitdata(mycircuit)` | `js/fileoperation.js` | 由当前电路回存文本（“文件→保存”的同一路径） |

注意：`recovercircuit` 内部只做 4 件事——`addComponent` 放置元件、`lineCreate` 建线、
`lineAdjust` 定位、`addLineToComponent` 记账。所以“注入存档文本”与“逐条调用接口”完全等价。

**已交付的成品电路：**

| 实验 | 规模 | 验证 |
|---|---|---|
| [实验四 存储器实验（教材第4章）](实验四-存储器实验-操作指导.md) | 36 元件 / 65 连线，按教材图 4-1 生成 | 按教材 4.5 步骤写入 01H~05H 后读回 **5/5 正确** |
| [运算器实验（教材第3章）](运算器实验-操作指导.md) | 34 元件 / 75 连线，按教材图 3-1/3-2 生成 | 置数 DR1=65H/DR2=A7H，**表 3-1 验证 48/48 一致** |

### 验证记录（无头 Chrome + CDP 真实页面，脚本见 `verify.js`）

| 用例 | 规模 | 结果 |
|---|---|---|
| `out/demo-and.txt`（开关+与门+LED） | 5 元件 / 3 线 | 元件 5/5、引脚 7、连线 3、**SVG 路径异常 0 条** ✅ |
| `out/circuit4-regen.txt`（实验四真实电路再生成） | 53 元件 / 359 引脚 / 124 线 | 元件 53/53、连线 124、路径异常 0 ✅ |
| **`out/memory-lab.txt`（教材第4章 存储器实验）** | **36 元件 / 101 引脚 / 65 线** | **元件 36/36、连线 65、路径异常 0 ✅** |
| **`out/alu-lab.txt`（教材第3章 运算器实验）** | **34 元件 / 156 引脚 / 75 线** | **元件 34/34、连线 75、路径异常 0 ✅** |
| 回存比对 `circuitdata(mycircuit)` vs 输入文件 | 四个用例 | 逐字节一致或**语义完全一致** ✅（证明存档格式与实验室自身完全兼容） |
| 功能仿真 `cDispatch.powerOn()` + 翻转开关 | demo-and | 与门真值：两开关全 1 时 LED 才 `ledon.gif` ✅ |
| **按教材 4.5 步骤写/读存储器** | memory-lab | 写入 11H~15H 到 01H~05H 再读回：**5/5 正确** ✅ |
| **按教材 3.5 步骤做运算器实验** | alu-lab | DR1=65H/DR2=A7H 置数正确，16 种 S×3 模式：**48/48 与教材表 3-1 一致** ✅ |

`out/circuit4-regen.png`、`out/demo-and.png`、`out/memory-lab.png` 是无头浏览器渲染出的实图。

## 二、三种用法

### 1) 生成存档文件，然后在实验室里“文件→打开” （最稳，推荐给学生用）
```powershell
node circuit.js build specs\demo-and.json out\demo-and.txt
```
把 `out\demo-and.txt` 通过界面的“打开”载入即可。

### 2) 生成一段代码，粘到实验室页面的 F12 控制台（不用存文件，立刻生效）
```powershell
node circuit.js console specs\demo-and.json
```
复制输出的整段 JS 粘贴回车，元件与连线立即出现在当前页面上。

### 3) 无头验证（改完电路后自动检查是否画对、是否通）
```powershell
node verify.js out\demo-and.txt --sim --shot out\demo-and.png
node verify.js out\memory-lab.txt --refs out\memory.refs.json --script sim\memory-lab.js --shot out\memory-lab.png
node verify.js out\alu-lab.txt --refs out\alu.refs.json --script sim\alu-lab.js --shot out\alu-lab.png
```
输出元件数/DOM 数/连线数/异常路径数，回存比对，截图；`--sim` 会开电源翻转全部开关，
`--script` 可以在页面里跑一段任意实验脚本并把返回的 JSON 打出来（`--refs` 注入 ref→器件id 别名表）。

## 三、其它命令

```powershell
node dump-pins.js "D:\桌面\计算机组成原理实验\dsvlab1.2"   # 重新提取全部元件引脚 -> pins.json
node circuit.js list                    # 列出全部可用元件类型
node circuit.js pins 74LS181            # 查某芯片引脚表（脚号/名称/方向/上下侧）
node circuit.js parse 某个存档.txt       # 校验已有存档（引脚越界、器件不存在等）
node circuit.js roundtrip 原图.txt 新图.txt  # 解析原图再重新生成（大规模回归用）
node gen-memory-spec.js                 # 重新计算《存储器实验》电路的坐标与连线
node gen-alu-spec.js                    # 重新计算《运算器实验》电路的坐标与连线
node check-alu-model.js 5 7             # 独立校验 74LS181 模型与教材表 3-1
node verify.js out\alu-lab.txt --refs out\alu.refs.json --script sim\alu-lab.js --shot out\alu-lab.png
python annotate.py                      # 在渲染截图上标注元件功能（需 Pillow）
python annotate-alu.py                  # 运算器电路的标注图
```

`docx_tools/` 是**实验报告文档处理工具**（配合本实验的纸质/电子报告）：

| 脚本 | 作用 |
|---|---|
| `docx_tools/walk_docx.py` | 递归打印 docx 结构，含表格单元格内部的段落与图片位置（排查"文字该填哪儿"） |
| `docx_tools/fill_docs.py` | 按教材第 4 章内容补全《实验预习报告》和《实验报告》，只写文字、不动图片 |
| `docx_tools/convert_doc.ps1` | 用本机 Word COM 转换 .doc / .docx / PDF（原文件不动，无需 pywin32） |
| `docx_tools/read_leds.py`、`strips.py` | 从界面截图中识别指示灯亮灭、按行裁切拼接做对照 |
| `docx_tools/contact_sheet.py`、`page_sheet.py` | 把文档内嵌图片、PDF 页面拼成总览图便于核验 |

## 四、规格文件（spec JSON）

```json
{
  "title": "demo-and",
  "count": 5,
  "components": [
    { "ref": "sw1",  "type": "Switch",  "x": 210, "y": 520 },
    { "ref": "and1", "type": "ANDgate", "x": 420, "y": 320 },
    { "ref": "led1", "type": "Led",     "x": 660, "y": 300 }
  ],
  "wires": [ ["sw1.0", "and1.0"], ["sw2.0", "and1.1"], ["and1.2", "led1.0"] ]
}
```
- `ref` 是自定义别名，`wires` 里用 `ref.脚号`；脚号可查 `node circuit.js pins <类型>`。
- `count` 可省略；沿用已有电路（器件 id 稀疏）时务必写上，否则以后手工拖入的新元件 id 会与老元件冲突。
- 连线必须是 **输出(fn=1/11) → 输入(fn=0/10/11)**，否则保存时该连线会被实验室丢弃，校验器会提示。

## 五、存档文件格式（逆向自 `circuitdata`）

```
元件1类型,x px,y px,器件id$元件2类型,...$&CP0Pin0ToCP2Pin0,CP1Pin0ToCP2Pin1,@器件计数器
```
- 器件 id 形如 `CP7`，引脚 id 即 `器件id + "Pin" + 脚号`，连线文本即 `起点引脚id + "To" + 终点引脚id`。
- 坐标为绝对页面向素值。**注意 x 要大于 250**，否则会被左侧“实验设备列表”浮窗压住。
- 编码：实验室源码混杂 UTF-8(带 BOM) 与 GBK，`dump-pins.js` 会自动判别；存档文本本身是纯 ASCII。

## 六、踩过的坑（写脚本驱动接口时务必注意）

1. **`Switch` 的 `pinValue` 是"数组套数组"**：源码写的是 `new Array([0])`，所以 `pinValue[0] === [0]`（数组），
   组件内部用宽松比较 `pinValue[0] == 0` 才成立。脚本里若写 `pinValue[0] !== 0` 会**永远为真**，
   于是每次判断都去点开关，结果一按就全部翻转（这个 bug 让我误判"地址装成了 0xFF"）。
   **正确写法：`Number(c.pinValue[0]) !== 0`。**
2. 部分元件的 `pinFunction` 同样是数组（如 `new Array([10],[10],[1])`），`dump-pins.js` 已用 `Number()` 归一化。
3. **连线的方向决定仿真能否传播**：`dispatch.js` 的 `cRun` 只沿 `line.id` 的起点器件往外传。
   所以"总线"上的每一段线，要按需要的数据流方向各建一条（例如存储器实验里
   `245.B → 数据灯` 管写入显示，`6116.IO → 数据灯` 管读出显示，缺一不可），
   而 `circuitdata()` 只保存从输出脚（`pinFunction` 为 1 或 11）出发的线——正好兼容。
4. **RAM6116 / 74LS273 / 74LS245 的模型是简化版**（详见各 `js/component/*.js`）：
   6116 的 `-OE`、`A8~A10` 出厂即 0（等于接地）；245 的 `DIR` 未被使用，方向固定 A→B；
   273 只在 `CP` 出现 0→1 上升沿且 `-MR=1` 时锁存。设计电路时要按模型而不是按真实器件手册。
5. 存档里 `@后面的 count` 是**器件计数器**，不只是数量：沿用已有图纸时必须保留原值，否则以后手工拖入的新元件 id 会与老元件冲突。
6. 坐标为绝对页面坐标，`x` 要 **大于 250**，否则会被左侧"实验设备列表"浮窗压住。

## 七、已知边界

- 我无法远程操控你正在浏览的那个标签页：要么你“打开”我生成的 txt，要么把控制台代码粘贴进去。
  两者都是实验室自己的接口，效果与手工拖拽完全一致。
- `circuit.js` 只做**结构与方向**校验（引脚存在性、输入/输出方向、重复线），不校验电路逻辑是否正确；
  逻辑正确性请用 `verify.js --sim / --script` 或直接在界面上开电源跑。
- 无头验证跑的是本机 Chrome/Edge，用的是 `file://` 打开的同一份 `index.html`，与你在浏览器里看到的是同一套代码。

