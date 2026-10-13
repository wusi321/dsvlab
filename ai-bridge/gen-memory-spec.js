/*
 * gen-memory-spec.js —— 生成《计算机组成原理实验教程》第4章 存储器实验 的电路规格
 *
 * 依据：教材 4.3 实验电路 图4-1（第17-18页）+ 4.5 实验内容与步骤（第19页）
 * 元件：RAM6116(2Kx8)、74LS273(地址寄存器AR)、74LS245(三态门SW-BUS)、
 *       与非门(生成6116的-WE)、与门(生成AR的CP)、13个开关、16个指示灯、2个单脉冲
 *
 * 芯片模型的既定约定（来自 js/component/*.js，勿改）：
 *   - RAM6116: -OE(pin9)=0、A10/A9/A8(pin20/21/22)=0 是模型内置默认值，即"接地"，无需连线
 *   - RAM6116: 写 = (-CE==0 && -WE==0)；读 = (-CE==0 && -WE==1)
 *   - 74LS273: -MR=1 且 CP 出现 0->1 上升沿时锁存 D->Q；-MR=0 清零
 *   - 74LS245: -E==0 时 B=A（DIR 引脚模型未使用，方向固定 A->B）
 *   - 因此 6116 的 -WE 必须由【与非门】(WE控制信号, P1) 产生：
 *       P1空闲 -> 与非输出1 -> 读；WE=1 且 P1脉冲 -> 与非输出0 -> 写（与教材4.5第(3)(4)条一致）
 *   - AR 的 CP 由【与门】(LDAR, P2) 产生：LDAR=1 时 P2 上升沿装地址
 *
 * 数据总线（图4-2：不使用总线元件，两两直接连线）：
 *   245.Bj -> AR.Dj、RAM.IOj、数据指示灯j
 *   RAM.IOj -> 数据指示灯j      （读操作时数据由6116输出到灯，方向必须由6116出发）
 */
const fs = require('fs');
const path = require('path');

const OUT_DIR = path.join(__dirname, 'out');
const SPEC_DIR = path.join(__dirname, 'specs');

// ---- 芯片坐标与引脚几何（用于把"互连的引脚"排成整齐的直线）----
const RAM = { x: 700, y: 170, width: 226, pad: 2, span: 222, cols: 12 };
const AR = { x: 700, y: 380, width: 180, pad: 5, span: 170, cols: 10 };
const LS = { x: 700, y: 560, width: 180, pad: 5, span: 170, cols: 10 };
const fracPin = (chip, frac) => chip.x + chip.pad + chip.span * frac;   // 引脚左边界页坐标
// RAM6116: A0..A7 = pin7..pin0 (frac k/12)、IO0..IO7 = pin12..19 (frac (11-j)/12)
const ramA = j => fracPin(RAM, j / RAM.cols);            // j=A编号0..7 -> pin(7-j)
const ramIO = j => fracPin(RAM, (11 - j) / RAM.cols);    // j=IO编号0..7 -> pin(12+j)
// 74LS273: D0..D7 = pin8..pin1 (frac (8-i)/10)、Q0..Q7 = pin11..18 (frac (8-j)/10)、CP=pin10(0.9)、-MR=pin0(0)
const arD = j => fracPin(AR, (8 - j) / AR.cols);
const arQ = j => fracPin(AR, (8 - j) / AR.cols);
const arCP = fracPin(AR, 9 / AR.cols), arMR = fracPin(AR, 0);
// 74LS245: A0..A7 = pin8..pin1 (frac (8-i)/10)、B0..B7 = pin10..17 (frac (9-j)/10)、-E=pin18(0.1)
const lsA = j => fracPin(LS, (8 - j) / LS.cols);
const lsB = j => fracPin(LS, (9 - j) / LS.cols);
const lsE = fracPin(LS, 1 / LS.cols);
// RAM 控制脚：-CE = pin8 (frac 8/12)、-WE = pin10 (frac 10/12)
const ramCE = fracPin(RAM, 8 / RAM.cols), ramWE = fracPin(RAM, 10 / RAM.cols);

const comps = [], wires = [];
const add = (ref, type, x, y, id) => { comps.push({ ref, type, x: Math.round(x), y: Math.round(y), id }); return ref; };
const wire = (a, b) => wires.push([a, b]);

// id 采用实验室惯例 CP0..CPn，顺序即生成顺序
let n = 0; const id = () => 'CP' + (n++);

// 1) 数据开关 SW0..SW7（SW0 为最低位，摆在245的A脚正下方，MSB在左）
for (let i = 0; i < 8; i++) add('sw' + i, 'Switch', lsA(i) - 8, 700, id());
// 2) 74LS245 / 74LS273(AR) / RAM6116
add('ls', '74LS245', LS.x, LS.y, id());
add('ar', '74LS273', AR.x, AR.y, id());
add('ram', 'RAM6116', RAM.x, RAM.y, id());
// 3) 数据指示灯 bit7..bit0（与 RAM 的 IO 脚对齐，最高位在最左）
for (let j = 7; j >= 0; j--) add('dataLed' + j, 'Led', ramIO(j), 80, id());
// 4) 地址指示灯 bit7..bit0（放在AR上方、控制区左侧）
for (let j = 7; j >= 0; j--) add('addrLed' + j, 'Led', 1000 + (7 - j) * 26, 150, id());
// 5) 控制开关
add('ce', 'Switch', ramCE - 10, 268, id());     // CE   -> 6116 -CE(片选)
add('we', 'Switch', 1074, 300, id());           // WE   -> 与非门in0
add('swbus', 'Switch', 600, LS.y, id());        // SW-BUS -> 245 -E(三态门使能)
add('ldar', 'Switch', 1074, 460, id());         // LDAR -> 与门in0
add('mr', 'Switch', 590, 470, id());            // MR   -> AR -MR(置1不清零)
add('p1', 'SinglePulse', 1096, 300, id());      // P1   -> 与非门in1
add('p2', 'SinglePulse', 1096, 460, id());      // P2   -> 与门in1
// 6) 门电路
add('nand', 'NANDgate', 1080, 240, id());       // 与非门 -> 6116 -WE
add('andg', 'ANDgate', 1080, 400, id());        // 与门   -> AR CP

// ---- 连线 ----
for (let i = 0; i < 8; i++) wire(`sw${i}.0`, `ls.${8 - i}`);              // SWi -> A(i)
for (let j = 0; j < 8; j++) {
    wire(`ls.${10 + j}`, `ar.${8 - j}`);                                   // B(j) -> AR.D(j)
    wire(`ls.${10 + j}`, `ram.${12 + j}`);                                 // B(j) -> RAM.IO(j)
    wire(`ls.${10 + j}`, `dataLed${j}.0`);                                 // B(j) -> 数据灯
    wire(`ram.${12 + j}`, `dataLed${j}.0`);                                // RAM.IO(j) -> 数据灯（读通路）
    wire(`ar.${11 + j}`, `ram.${7 - j}`);                                  // AR.Q(j) -> RAM.A(j)
    wire(`ar.${11 + j}`, `addrLed${j}.0`);                                 // AR.Q(j) -> 地址灯
}
wire('ce.0', 'ram.8');        // -CE
wire('swbus.0', 'ls.18');     // -E
wire('we.0', 'nand.0');
wire('p1.0', 'nand.1');
wire('nand.2', 'ram.10');     // 与非门 -> -WE
wire('ldar.0', 'andg.0');
wire('p2.0', 'andg.1');
wire('andg.2', 'ar.10');      // 与门 -> AR.CP
wire('mr.0', 'ar.0');         // -MR

const spec = {
    title: 'memory-lab',
    count: comps.length,
    components: comps.map(c => ({ ref: c.ref, type: c.type, x: c.x, y: c.y, id: c.id })),
    wires
};
fs.mkdirSync(SPEC_DIR, { recursive: true });
fs.writeFileSync(path.join(SPEC_DIR, 'memory.json'), JSON.stringify(spec, null, 1), 'utf8');
const refs = {};
comps.forEach(c => refs[c.ref] = c.id);
fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(path.join(OUT_DIR, 'memory.refs.json'), JSON.stringify(refs, null, 1), 'utf8');

console.log('元件 ' + comps.length + ' 个，连线 ' + wires.length + ' 条');
console.log('规格: specs/memory.json    别名表: out/memory.refs.json');
console.log('\n控制信号接线：');
console.log('  CE   -> 6116.-CE(pin8)     SW-BUS -> 74LS245.-E(pin18)');
console.log('  MR   -> 74LS273.-MR(pin0)  LDAR   -> 与门in0 , P2 -> 与门in1 , 与门out -> AR.CP(pin10)');
console.log('  WE   -> 与非门in0 , P1 -> 与非门in1 , 与非门out -> 6116.-WE(pin10)');
