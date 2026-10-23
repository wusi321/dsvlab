# DS-VLAB v1.2 目录说明（多思计算机组成原理网络虚拟实验系统）

一套纯前端的计算机组成原理虚拟实验室：在浏览器里拖放芯片、连导线、开电源，就能做全加器、
运算器、存储器、总线、累加器、程序计数器、控制器、模型机等 10 个实验。

| 项目 | 说明 |
|---|---|
| 版本 | DS-VLAB **v1.2**（2021-05；在 v1.0 基础上把 VML 改为 SVG，以支持 Chrome/Edge/Firefox） |
| 作者 | 张雯雰（湘南学院），GPL 自由软件，见 [license.txt](license.txt) |
| 技术栈 | 原生 JS + jQuery 1.8.2 + jQuery UI 1.10.2 + SVG，**无构建、无需安装依赖** |
| 元件库 | 23 种（数字芯片 / 门电路 / 基本元件 / 虚拟组件） |
| 文件数 | 111 个，约 61 MB（教材 PDF 占 59 MB） |

---

## 一、如何运行

1. **最简单**：直接双击 [index.html](index.html)。实测 `file://` 方式在 Chrome / Edge 下完全可用
   （无头浏览器验证也走这条路）。
2. 也可以丢进任意静态服务器（IIS / nginx / `python -m http.server`）。
   [Web.config](Web.config) 只是 ASP.NET 的编译调试配置，与运行无关。

### 界面四块区域

| 区域 | 内容 |
|---|---|
| 顶部菜单 | 文件（新建 / 打开 / 保存）、运行（开电源 / 关电源 / 重启）、工具（存储器芯片读写 / 连接线颜色设置 / 时钟周期设置）、实验指导、帮助 |
| 工具条（4 个图标） | 电源、复位、新建、**显示/隐藏左侧元件列表** |
| 左侧「实验设备列表」 | 4 个可折叠分类；按住元件名拖到画布即可放置 |
| 中间画布 `#demo` | 所有元件与连线都画在这里，可滚动 |

### 画布上的操作

- 拖动元件本体移动（连线会自动重排）；
- **从输出脚按住拖到另一个输入脚**连线（引脚颜色：蓝=输入、绿=输出、紫=双向）；
- **右键**元件或连线 = 删除（会弹确认框）；
- **双击**元件 = 弹出该元件所有引脚的当前值（芯片类元件；门电路/开关/灯没有引脚编号，不支持）；
- 单击开关切换 0/1；单击单脉冲器件输出一个脉冲（**要点两下**，第一下只是内部计数）；
- 单击连续脉冲器件开始/停止连续输出（宽度同样由「时钟周期设置」决定）。

### 二次开发常用接口（全局对象）

| 接口 | 说明 |
|---|---|
| `mycircuit` | `Circuit` 实例（[js/circuitdiagram.js](js/circuitdiagram.js)），管理所有元件与连线 |
| `cDispatch` | `Dispatch` 实例（[js/dispatch.js](js/dispatch.js)），电源状态与信号传播 |
| `mycircuit.addComponent('demo', 'Compo74LS181', x, y, id)` | 在画布上放一个元件（构造函数名 = `Compo` + 类型名） |
| `mycircuit.lineCreate/lineAdjust/addLineToComponent` | 建一条连线：建 SVG → 定位 → 记录到两端器件 |
| `recovercircuit('demo', mycircuit, 文本)` | 由存档文本还原整张电路（"文件→打开"用的就是它） |
| `circuitdata(mycircuit)` | 由当前电路生成存档文本（"文件→保存"用的就是它） |
| `cDispatch.powerOn() / powerOff() / sourceTrigger(器件)` | 开电源 / 关电源 / 触发一个源器件（开关、脉冲） |
| `cDispatch.runState` / `cDispatch.pulseWidth` | 电源状态（0 关 / 1 开）/ 单脉冲宽度（100~800 ms） |

---

## 二、目录总览

| 路径 | 内容 |
|---|---|
| [index.html](index.html) | **唯一入口页面**：菜单、工具条、元件列表、画布、各对话框都在这里；末尾 `$(window).load` 里初始化 `mycircuit` / `cDispatch` |
| [css/](css) | 界面样式（含 jQuery UI、取色器样式） |
| [js/](js) | 仿真引擎 + 元件库 + 第三方库 |
| [img/](img) | 全部图标与元件图片（门电路、开关、灯、工具条按钮等） |
| [files/](files) | 实验指导 PDF、芯片数据手册、现成实验电路 |
| [ai-bridge/](ai-bridge) | **后加的工具链**：用程序自动生成电路存档、无头浏览器验证（详见第八节） |
| [experimentguidance.html](experimentguidance.html) | 「实验指导」菜单打开的页面：10 个实验 PDF 的链接 |
| [chipdatasheet.html](chipdatasheet.html) | 「实验器件资料」菜单打开的页面：8 种芯片数据手册链接 |
| [修改说明.txt](修改说明.txt) | 作者写的 v1.2 相对 v1.0 的改动清单 |
| [license.txt](license.txt) | GNU GPL 许可证全文 |
| [Web.config](Web.config) | IIS/ASP.NET 配置（仅调试用，静态托管可忽略） |
| 计算机组成原理实验教程-基于多思网络虚拟实验系统.pdf | 配套教材（张雯雰主编，清华大学出版社）**扫描版**，164 页，59 MB。无文字层，需按页渲染后阅读；页码偏移：**教材书页 N = PDF 第 N+10 页** |
| [readme.md](readme.md) | 本文件 |

---

## 三、js/ —— 仿真引擎

| 文件 | 作用 |
|---|---|
| [js/circuitdiagram.js](js/circuitdiagram.js) | **`Circuit` 类**：把元件画成 `div`、逐个生成引脚 `div`、用 SVG `path` 画连线；拖动元件时 `lineReplace()` 重排所有相关连线；右键删除器件/连线；双击查看引脚值。**注意此文件是 GBK 编码** |
| [js/dispatch.js](js/dispatch.js) | **`Dispatch` 类**：电源开关、器件工作队列、沿连线传播信号（`cRun` → `runCircuit`）；`pulseWidth` 控制单脉冲宽度；`powerOff()` 会对所有器件调 `reset()` |
| [js/fileoperation.js](js/fileoperation.js) | 新建 / 打开 / 保存；**存档格式的实现就在这里**：`circuitdata()` 生成文本、`recovercircuit()` 还原电路 |
| [js/memu.js](js/memu.js) | 菜单行为与各对话框：存储器芯片读写（把 6116/2716 的 `memory` 数组导出/导入成 0/1 文本）、连接线颜色、时钟周期（100~800 ms）、关于 |
| [js/toolbar.js](js/toolbar.js) | 工具条四个按钮：电源、复位、新建、元件列表显示/隐藏 |
| [js/toolbox.js](js/toolbox.js) | 左侧「实验设备列表」（jQuery UI accordion）；按下元件名并在画布上松开即放置元件 |
| [js/makedrag.js](js/makedrag.js) | `dragEnabled()`：让任意 `div` 可拖动，拖动过程中回调 `mycircuit.lineReplace()` 让连线跟着走 |
| [js/lib/jquery.js](js/lib/jquery.js) | jQuery **1.8.2**（压缩版，文件头注释已被去掉） |
| [js/lib/jqueryui1102.js](js/lib/jqueryui1102.js) | jQuery UI 1.10.2：对话框、滑块、手风琴、可拖动/可缩放 |
| [js/lib/colorpicker.min.js](js/lib/colorpicker.min.js) | 连接线颜色设置用的取色器 |

> 加载顺序很重要：`index.html` 先引 jQuery/jQuery UI → 引擎（memu、toolbar、toolbox、makedrag、
> circuitdiagram、dispatch、fileoperation）→ 再引 18 个元件文件。**新增元件必须同时在
> `index.html` 的 `<script>` 列表和左侧元件列表 `<ul>` 里各加一条**。

---

## 四、js/component/ —— 元件库（23 种）

命名约定：构造函数名 = **`Compo` + 类型名**（在存档文件里写的是去掉 `Compo` 的类型名）。
每个元件都实现 `beReady() / input() / work() / reset()` 四件套，`Dispatch` 只认这四个方法。

**引脚类型码**：`0` 输入、`10` 必要输入（没赋值就不工作）、`1` 输出、`11` 输入/输出、
`2` 地、`3` 电源、`4` 其它（模型内部使用，如 6116 的 -OE、245 的 DIR）。

### 数字功能器件（[js/component/](js/component)）

| 元件 | 文件 | 尺寸 | 引脚数 | 输入 | 输出 | 其它 |
|---|---|---|---|---|---|---|
| 74LS181 算逻运算器 | 74ls181.js | 214×55 | 24 | 14 | 8 | 2 |
| 74LS245 八路总线收发器 | 74ls245.js | 180×55 | 20 | 9 | 8 | 3 |
| 74LS273 八D触发器（常用作寄存器） | 74ls273.js | 180×55 | 20 | 10 | 8 | 2 |
| 74LS374 八D触发器（三态输出） | 74ls374.js | 180×55 | 20 | 10 | 8 | 2 |
| 74LS175 四D触发器 | 74ls175.js | 112×55 | 12 | 6 | 4 | 2 |
| 74LS174 六D触发器 | 74ls174.js | 146×55 | 16 | 8 | 6 | 2 |
| 74LS163 四位同步计数器 | 74ls163.js | 150×55 | 16 | 9 | 5 | 2 |
| 74LS139 双2-4译码器 | 74ls139.js | 180×55 | 16 | 6 | 8 | 2 |
| RAM6116 2K×8 静态存储器 | ram6116.js | 226×55 | 24 | 10 | 8 | 6 |

### 逻辑门电路（都在 [gateCircuit.js](js/component/gateCircuit.js)）

| 元件 | 尺寸 | 引脚数 | 说明 |
|---|---|---|---|
| ANDgate / ORgate / NANDgate / XORgate | 31×20 或 31×26 | 3 | 两个输入 + 一个输出 |
| Triplegate 三态门 | 31×20 | 3 | 使能脚=1 时把数据脚送到输出，否则输出高阻（值 2） |
| NOTgate | 31×26 | 2 | 一个输入 + 一个输出 |

### 基本元件

| 元件 | 文件 | 尺寸 | 说明 |
|---|---|---|---|
| Switch 开关 | switch.js | 17×35 | 1 个输出脚；单击在 0/1 之间切换 |
| Led 指示灯 | led.js | 17×26 | 1 个输入脚；值为 1 时显示 `ledon.gif` |
| SinglePulse 单脉冲 | SinglePulse.js | 17×35 | 输出一个脉冲后自动回 0（宽度=`cDispatch.pulseWidth`）；**第一次点击不产生脉冲** |
| ContinuousPulse 连续脉冲 | ContinuousPulse.js | 17×35 | 周期性输出脉冲 |

### 虚拟组件

| 元件 | 文件 | 说明 |
|---|---|---|
| BUS 总线 | bus.js | 1217×30，128 个双向引脚 = 16 组插座（每组 8 位）。**自动仲裁**：最新写入的插座成为总线实际输入，该插座断开后自动回退到次新的输入，以此类推 |
| SequeTimer 时序发生器 | SequeTimer.js | 8 脚：输入 `Ts/Stop/Step/Start`，输出 `T1~T4` 节拍电位 |
| EPROM2716C3 | eprom2716c3.js | 40 脚，`Q0~Q23`（24 位）输出；内容已按教材第二版修订 |
| EPROM2716C4 | eprom2716c4.js | 48 脚，`Q0~Q31`（32 位）输出 |

> **模型是教学简化版**，引脚行为请以源码为准，不完全等同真实器件手册。已确认的几个约定：
> - 6116：写 = `-CE=0 且 -WE=0`；读 = `-CE=0 且 -WE=1`；`-OE` 与 `A8~A10` 出厂值就是 0（相当于接地）
> - 245：方向固定 A→B，`DIR` 引脚模型里没用到；`-E=1` 时输出变高阻
> - 273：只有 `-MR=1` 且 `CP` 出现 0→1 **上升沿**时才锁存 D→Q
> - 开关的 `pinValue[0]` 实际是 `[0]`（数组套数组），源码内部靠宽松比较使用

---

## 五、css/ 与 img/

| 文件 | 作用 |
|---|---|
| [css/flowchart.css](css/flowchart.css) | 画布、元件外框（`.window`/`.window2`）、引脚 `.pin`、连线 `.div-line`/`.my-line` 的基础样式 |
| [css/menu.css](css/menu.css) | 顶部下拉菜单 |
| [css/toolbox.css](css/toolbox.css) | 左侧元件列表浮窗 |
| [css/toolbar.css](css/toolbar.css) | 工具条 |
| [css/mreadwrite.css](css/mreadwrite.css) | 存储器读写对话框 |
| [css/jquery-ui.css](css/jquery-ui.css) | jQuery UI 主题 |
| [css/colorpicker.css](css/colorpicker.css) | 取色器 |
| [img/](img) | 24 个图标：门电路（`andgate.gif` 等）、开关（`switchL/switchH.gif`）、灯（`ledon/ledoff.gif`）、单脉冲（`spulseup/spulsedown.gif`）、连续脉冲（`cpulseon/cpulseoff.gif`）、工具条按钮（`poweron/poweroff/reset/new/tools.png`）、背景与 logo |

---

## 六、files/ —— 实验指导与器件资料

### 实验指导（[experimentguidance.html](experimentguidance.html) 里链接的就是这些）

| 实验室编号 | 实验名称 | 指导文档 | 现成参考电路 |
|---|---|---|---|
| 实验一 | 全加器实验 | [files/shiyan1.pdf](files/shiyan1.pdf) | — |
| 实验二 | 运算器实验 | [files/shiyan2.pdf](files/shiyan2.pdf) | — |
| 实验三 | 存储器实验 | [files/shiyan3.pdf](files/shiyan3.pdf) | —（本仓库已用 [ai-bridge](ai-bridge) 生成） |
| 实验四 | 总线与微命令实验 | [files/shiyan4.pdf](files/shiyan4.pdf) | [files/circuit4.rar](files/circuit4.rar)，已解压到 [files/circuit4/circuit4.txt](files/circuit4/circuit4.txt) |
| 实验五 | 累加寄存器实验 | [files/shiyan5.pdf](files/shiyan5.pdf) | [files/circuit5.rar](files/circuit5.rar) |
| 实验六 | 程序计数器实验 | [files/shiyan6.pdf](files/shiyan6.pdf) | [files/circuit6.rar](files/circuit6.rar) |
| 实验七 | 控制器实验 | [files/shiyan7.pdf](files/shiyan7.pdf) | — |
| 实验八 | 简单模型机实验 | [files/shiyan8.pdf](files/shiyan8.pdf) | [files/circuit8.rar](files/circuit8.rar) |
| 实验九 | 微程序设计实验 | [files/shiyan9.pdf](files/shiyan9.pdf) | [files/circuit8.rar](files/circuit8.rar) |
| 实验十 | 模型机课程设计 | [files/shiyan10.pdf](files/shiyan10.pdf) | — |

> `.rar` 解压后得到 `.txt` 存档，用界面「文件 → 打开」直接载入即可。
> 配套教材的章节号比实验室编号大 1，例如**教材第 4 章 存储器实验 = 实验室「实验三 存储器实验」**；
> 教材 PDF 是扫描版，按页阅读时记住页码偏移 **+10**。

### 器件资料（[chipdatasheet.html](chipdatasheet.html) 里链接的就是这些）

| 文件 | 内容 |
|---|---|
| [files/74ls181.pdf](files/74ls181.pdf)、[74ls163](files/74ls163.pdf)、[74ls245](files/74ls245.pdf)、[74ls273](files/74ls273.pdf)、[74ls374](files/74ls374.pdf)、[74ls139](files/74ls139.pdf)、[eprom2716](files/eprom2716.pdf)、[ram6116](files/ram6116.pdf) | 各芯片数据手册 |
| [files/help.pdf](files/help.pdf) | 系统使用帮助 |

---

## 七、电路存档文件格式（`.txt`）

「文件 → 保存」导出的就是这个格式，纯 ASCII 单行文本：

```
元件类型,x px,y px,器件id$元件类型,...$&起点引脚idTo终点引脚id,....@器件计数器
```

| 部分 | 说明 |
|---|---|
| 元件段 | 每个元件四段：类型名（`Compo` 后面的部分）、`左px`、`上px`、器件 id（形如 `CP7`），以 `$` 分隔 |
| `&` | 元件段与连线段的分隔符 |
| 连线段 | `CP7Pin11ToCP9Pin8` 形式：**起点必须是输出脚**（引脚类型 1 或 11），以 `,` 结尾 |
| `@` 后的数字 | **器件计数器**，不只是数量。它是以后新拖入元件的 id 起点，沿用旧图时必须保留原值 |

例（开关 → 与门 → 指示灯）：

```
Switch,210px,520px,CP0$Switch,260px,520px,CP1$ANDgate,420px,320px,CP2$Led,660px,300px,CP3$&CP0Pin0ToCP2Pin0,CP1Pin0ToCP2Pin1,CP2Pin2ToCP3Pin0,@4
```

---

## 八、ai-bridge/ —— 用程序自动搭电路（后加的工具链）

用脚本直接调用实验室自己的接口来完成"元件放置 + 连线 + 验证"，不用手工拖拽。
详细说明见 [ai-bridge/README.md](ai-bridge/README.md)。

| 文件 | 作用 |
|---|---|
| [ai-bridge/dump-pins.js](ai-bridge/dump-pins.js) | 从 `js/component/*.js` 提取全部 23 个元件的引脚表 → [pins.json](ai-bridge/pins.json) |
| [ai-bridge/circuit.js](ai-bridge/circuit.js) | 电路生成器 / 校验器：JSON 规格 → 实验室存档；也可 `console` 生成控制台注入代码 |
| [ai-bridge/verify.js](ai-bridge/verify.js) | **无头 Chrome（CDP）验证器**：加载 `index.html`、注入电路、检查元件/连线/路径、回存比对、截图；`--sim` 跑逻辑、`--script` 跑任意实验脚本 |
| [ai-bridge/gen-memory-spec.js](ai-bridge/gen-memory-spec.js) | 按教材图 4-1 计算「存储器实验」36 元件 / 65 连线的坐标与连线 |
| [ai-bridge/sim/memory-lab.js](ai-bridge/sim/memory-lab.js) | 在页面内按教材 4.5 步骤自动完成写入与读回 |
| [ai-bridge/gen-alu-spec.js](ai-bridge/gen-alu-spec.js) | 按教材图 3-1/3-2 计算「运算器实验」34 元件 / 75 连线的坐标与连线 |
| [ai-bridge/check-alu-model.js](ai-bridge/check-alu-model.js) | 独立校验 74LS181 模型与教材表 3-1（48 种组合） |
| [ai-bridge/sim/alu-lab.js](ai-bridge/sim/alu-lab.js) | 在页面内按教材 3.5 步骤置数 DR1/DR2 并逐项验证表 3-1 |
| [ai-bridge/annotate.py](ai-bridge/annotate.py)、[annotate-alu.py](ai-bridge/annotate-alu.py) | 在渲染截图上标注元件功能（需 Pillow） |
| [ai-bridge/实验四-存储器实验-操作指导.md](ai-bridge/实验四-存储器实验-操作指导.md) | 存储器实验的逐步操作指导 + 元件位置对照 + 常见坑 |
| [ai-bridge/运算器实验-操作指导.md](ai-bridge/运算器实验-操作指导.md) | 运算器实验的逐步操作指导 + 实测表 3-1 + 思考与分析解答 |

### 已经生成好的电路（`ai-bridge/out/`）

| 文件 | 内容 | 验证结果 |
|---|---|---|
| [memory-lab.txt](ai-bridge/out/memory-lab.txt) | **教材第 4 章 存储器实验**：RAM6116 + 74LS273(AR) + 74LS245(三态门) + 与非门/与门 + 13 开关 + 16 灯 + 2 单脉冲，共 36 元件 / 65 连线 | 元件 36/36、路径异常 0、按教材步骤写入 01H~05H 后读回 **5/5 正确** |
| [alu-lab.txt](ai-bridge/out/alu-lab.txt) | **教材第 3 章 运算器实验**：74LS181×2 + 74LS273×2 + 74LS245×2 + 9 灯 + 17 开关 + 2 单脉冲，共 34 元件 / 75 连线 | 元件 34/34、路径异常 0、DR1=65H/DR2=A7H 置数正确、**表 3-1 验证 48/48 一致** |
| [memory-lab-annotated.png](ai-bridge/out/memory-lab-annotated.png)、[alu-lab-annotated.png](ai-bridge/out/alu-lab-annotated.png) | 上两图的标注版（每个元件的功能与位置） | — |
| [memory-lab.console.js](ai-bridge/out/memory-lab.console.js)、[alu-lab.console.js](ai-bridge/out/alu-lab.console.js) | 控制台一键注入代码（不想存文件时用） | — |
| [circuit4-regen.txt](ai-bridge/out/circuit4-regen.txt) | 教材自带实验四电路（53 元件 / 124 连线）的再生成版 | 连线 124 条全部有效，路径异常 0 |
| [demo-and.txt](ai-bridge/out/demo-and.txt) | 最小示例：2 开关 + 与门 + 灯 | 与门真值实测正确 |

**三种用法**：

```powershell
cd ai-bridge
node circuit.js build specs\alu.json out\alu-lab.txt        # ① 生成存档 → 界面「文件→打开」
node circuit.js console specs\alu.json                      # ② 生成控制台注入代码 → F12 粘贴
node verify.js out\alu-lab.txt --refs out\alu.refs.json --script sim\alu-lab.js --shot out\alu-lab.png  # ③ 无头验证
```

---

## 九、改代码前必读：文件编码

这套源码的编码**不统一**，改错会直接让页面变乱码：

| 文件 | 编码 |
|---|---|
| [index.html](index.html)、[js/circuitdiagram.js](js/circuitdiagram.js) | **GBK（ANSI）** |
| 其余所有 `.js` / `.html` / `.css` / `.txt` | **UTF-8**（绝大多数带 BOM） |

原因：`index.html` 里**没有** `<meta charset>` 声明，浏览器只能回退到系统默认编码（中文 Windows = GBK），
所以这两个文件必须是 GBK；其他文件带 BOM，浏览器据此识别为 UTF-8。

**建议**：用 VS Code 打开（会自动识别）；保存 `index.html` / `circuitdiagram.js` 时选 **GBK**，
其余文件保持 **UTF-8（含 BOM）**。`ai-bridge/` 里的脚本会自动判断编码，不受影响。

---

## 十、已知限制与注意事项

1. **没有撤销功能**。删除操作（右键）有确认框，但删了就没了；重要电路先「保存」。
2. **连线必须从输出脚拉出**。`circuitdata()` 只保存起点是输出脚（类型 1/11）的线，反向拉出的线保存后会丢失。
3. **存档里 `@` 后的器件计数器要留意**。教材自带的 `circuit4.txt` 只有 53 个元件但计数器是 141，
   如果重新生成时把它改成 53，以后再手工拖入新元件就会和既有元件 id 撞车。
4. **元件坐标 `x` 建议大于 250**，否则会被左侧「实验设备列表」浮窗压住（浮窗可拖动，也可用工具条按钮隐藏）。
5. **芯片是简化教学模型**：例如 6116 的 `-OE`/`A8~A10` 出厂即 0、245 的 `DIR` 未实现、
   单脉冲要点两下、开关的 `pinValue` 是数组嵌套。做实验/写脚本前先看 `js/component/*.js`。
6. **信号只能沿"线"的单向记录传播**：同一段公共总线（比如数据总线）在不同器件之间要按数据流方向
   分别建线，否则某个方向的数据到不了目标器件（存储器实验里 `245→数据灯` 与 `6116→数据灯` 就是两条线）。
7. **`修改说明.txt` 第 3 条提到的"浏览器版本检查"在当前文件里没有对应代码**
   （全文检索 `navigator.` / `userAgent` / `浏览器` 只命中注释），应是作者在发布版里移除了。
8. **教材 PDF 是扫描件**：无文字层，需要按页渲染成图片再阅读；页码偏移 **+10**。

---

## 十一、相关文档索引

| 文档 | 内容 |
|---|---|
| [readme.md](readme.md) | 本文件：目录结构与功能总览 |
| [ai-bridge/README.md](ai-bridge/README.md) | 自动搭电路工具链的用法、接口清单、标准格式、踩过的坑 |
| [ai-bridge/实验四-存储器实验-操作指导.md](ai-bridge/实验四-存储器实验-操作指导.md) | 存储器实验逐步操作指导、元件位置对照、常见坑 |
| [ai-bridge/运算器实验-操作指导.md](ai-bridge/运算器实验-操作指导.md) | 运算器实验逐步操作指导、实测表 3-1、思考与分析解答 |
| [experimentguidance.html](experimentguidance.html) / [chipdatasheet.html](chipdatasheet.html) | 实验指导与器件资料入口 |
| [license.txt](license.txt) | GNU GPL 许可证 |
