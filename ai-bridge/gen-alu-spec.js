/*
 * gen-alu-spec.js —— 生成《计算机组成原理实验教程》第3章 运算器实验 的电路规格
 *
 * 依据：教材 3.3 实验电路（图 3-1，第13页）、3.4 实验原理、3.5 实验内容与步骤（第14页）、
 *       图 3-2 运算器虚拟实验电路（第15页）、表 3-1（第15-16页）
 *
 * 元件：74LS181×2（8 位 ALU）、74LS273×2（DR1/DR2 工作寄存器）、74LS245×2（数据输入三态门、
 *       ALU 输出三态门）、数据显示灯×8、进位指示灯 Cn+4×1、数据开关 SW0~SW7、
 *       控制开关 S3/S2/S1/S0/M/Cn/SW-BUS/ALU-BUS/MR、单脉冲 P1/P2
 *
 * 连接（与图 3-1 一致）：
 *   数据开关 SWi → 245in.Ai；245in.Bj → DR1.Dj、DR2.Dj（数据总线）
 *   DR1.Q0~Q3 → ALU(1).A0~A3   DR1.Q4~Q7 → ALU(2).A4~A7      (DR1 = A 端操作数)
 *   DR2.Q0~Q3 → ALU(1).B0~B3   DR2.Q4~Q7 → ALU(2).B4~B7      (DR2 = B 端操作数)
 *   ALU(1).F0~F3 → 245out.A0~A3   ALU(2).F0~F3 → 245out.A4~A7
 *   245out.Bj → 数据显示灯 j
 *   ALU(1).Cn+4 → ALU(2).Cn（低 4 位进位输出接高 4 位进位输入）
 *   ALU(2).Cn+4 → 进位指示灯；Cn 开关 → ALU(1).Cn
 *   S3~S0、M 开关 → 两片 181 的对应引脚；MR 开关 → 两片 273 的 MR
 *   P1 → DR1.CP，P2 → DR2.CP；SW-BUS → 245in.-E，ALU-BUS → 245out.-E
 */
const fs = require('fs');
const path = require('path');

const OUT_DIR = path.join(__dirname, 'out');
const SPEC_DIR = path.join(__dirname, 'specs');

// ---- 芯片几何 ----
const LS_OUT = { x: 700, y: 140, pad: 5, span: 170, cols: 10 };   // 74LS245 ALU 输出三态门
const ALU2 = { x: 700, y: 300, pad: 5, span: 204, cols: 12 };     // 74LS181(2) 高 4 位
const ALU1 = { x: 1000, y: 300, pad: 5, span: 204, cols: 12 };    // 74LS181(1) 低 4 位
const DR1 = { x: 600, y: 470, pad: 5, span: 170, cols: 10 };      // 74LS273 DR1(A)
const DR2 = { x: 1080, y: 470, pad: 5, span: 170, cols: 10 };     // 74LS273 DR2(B)
const LS_IN = { x: 830, y: 640, pad: 5, span: 170, cols: 10 };    // 74LS245 数据输入三态门

const px = (c, frac) => c.x + c.pad + c.span * frac;
// 74LS245: A_i = pin(8-i) frac (8-i)/10 ; B_i = pin(10+i) frac (9-i)/10 ; -E=pin18 frac 1/10
const lsA = (c, i) => px(c, (8 - i) / c.cols);
const lsB = (c, i) => px(c, (9 - i) / c.cols);
// 74LS181: A_i=pin(3-i) frac (3-i)/12 ; B_i=pin(7-i) ; F_i=pin(13+i) frac (11-i)/12 ;
//          S3=pin8(8/12) S2=pin9 S1=pin10 S0=pin12(11/12) ; Cn=pin21(2/12) M=pin22(1/12) Cn+4=pin19(4/12)
const aluA = (c, i) => px(c, (3 - i) / c.cols);
const aluB = (c, i) => px(c, (7 - i) / c.cols);
const aluS = (c, k) => px(c, [8, 9, 10, 11][k] / c.cols);          // k=3,2,1,0 -> S3,S2,S1,S0
const aluCn = c => px(c, 2 / c.cols);
const aluM = c => px(c, 1 / c.cols);
const aluCn4 = c => px(c, 4 / c.cols);
// 74LS273: D_i=pin(8-i) frac (8-i)/10 ; Q_i=pin(11+i) frac (8-i)/10 ; CP=pin10 frac 9/10 ; -MR=pin0
const regD = (c, i) => px(c, (8 - i) / c.cols);
const regQ = (c, i) => px(c, (8 - i) / c.cols);
const regCP = c => px(c, 9 / c.cols);
const regMR = c => px(c, 0);

const comps = [], wires = [];
let n = 0;
const id = () => 'CP' + (n++);
const add = (ref, type, x, y) => { comps.push({ ref, type, x: Math.round(x), y: Math.round(y), id: id() }); };
const wire = (a, b) => wires.push([a, b]);

// 1) 芯片
add('lsOut', '74LS245', LS_OUT.x, LS_OUT.y);
add('alu2', '74LS181', ALU2.x, ALU2.y);
add('alu1', '74LS181', ALU1.x, ALU1.y);
add('dr1', '74LS273', DR1.x, DR1.y);
add('dr2', '74LS273', DR2.x, DR2.y);
add('lsIn', '74LS245', LS_IN.x, LS_IN.y);

// 2) 数据显示灯（与 lsOut 的 B 脚对齐，bit7 在左）
for (let j = 7; j >= 0; j--) add('dled' + j, 'Led', lsB(LS_OUT, j), 80);
// 3) 进位指示灯（ALU(2) 的 Cn+4）
add('cn4led', 'Led', aluCn4(ALU2) - 8, 235);
// 4) 数据开关 SW0~SW7（与 lsIn 的 A 脚对齐，SW7 在左）
for (let i = 0; i < 8; i++) add('sw' + i, 'Switch', lsA(LS_IN, i) - 8, 790);
// 5) 控制开关
add('s3', 'Switch', 1330, 290);
add('s2', 'Switch', 1330, 330);
add('s1', 'Switch', 1330, 370);
add('s0', 'Switch', 1330, 410);
add('m', 'Switch', 1330, 450);
add('cn', 'Switch', 1250, 230);
add('mr', 'Switch', 540, 410);
add('swbus', 'Switch', 760, 720);
add('alubus', 'Switch', 600, 140);
// 6) 单脉冲
add('p1', 'SinglePulse', 520, 520);
add('p2', 'SinglePulse', 1150, 530);

// ---- 连线 ----
for (let i = 0; i < 8; i++) wire(`sw${i}.0`, `lsIn.${8 - i}`);          // SWi -> A(i)
for (let j = 0; j < 8; j++) {
    wire(`lsIn.${10 + j}`, `dr1.${8 - j}`);                            // 数据总线 -> DR1.D(j)
    wire(`lsIn.${10 + j}`, `dr2.${8 - j}`);                            // 数据总线 -> DR2.D(j)
}
for (let j = 0; j < 4; j++) {
    wire(`alu1.${13 + j}`, `lsOut.${8 - j}`);                          // ALU(1).F(j) -> 245.A(j)
    wire(`alu2.${13 + j}`, `lsOut.${4 - j}`);                          // ALU(2).F(j) -> 245.A(4+j)
    wire(`dr1.${11 + j}`, `alu1.${3 - j}`);                            // DR1.Q(j) -> ALU(1).A(j)
    wire(`dr1.${15 + j}`, `alu2.${3 - j}`);                            // DR1.Q(4+j) -> ALU(2).A(4+j)
    wire(`dr2.${11 + j}`, `alu1.${7 - j}`);                            // DR2.Q(j) -> ALU(1).B(j)
    wire(`dr2.${15 + j}`, `alu2.${7 - j}`);                            // DR2.Q(4+j) -> ALU(2).B(4+j)
}
for (let j = 0; j < 8; j++) wire(`lsOut.${10 + j}`, `dled${j}.0`);     // ALU 结果 -> 数据显示灯
wire('alu1.19', 'alu2.21');                                            // Cn+4(低) -> Cn(高)
wire('cn.0', 'alu1.21');                                               // Cn 开关 -> ALU(1).Cn
wire('alu2.19', 'cn4led.0');                                           // 高 4 位进位输出 -> 指示灯
// S3,S2,S1,S0 依次是 74LS181 的 pin8、pin9、pin10、pin12（pin11 是 GND）
const SPINS = [8, 9, 10, 12];
for (let k = 0; k < 4; k++) {
    wire(`s${3 - k}.0`, `alu1.${SPINS[k]}`);
    wire(`s${3 - k}.0`, `alu2.${SPINS[k]}`);
}
wire('m.0', 'alu1.22');                                                // M -> 两片 181
wire('m.0', 'alu2.22');
wire('mr.0', 'dr1.0');                                                 // MR -> 两片 273
wire('mr.0', 'dr2.0');
wire('p1.0', 'dr1.10');                                                // P1 -> DR1.CP
wire('p2.0', 'dr2.10');                                                // P2 -> DR2.CP
wire('swbus.0', 'lsIn.18');                                            // SW-BUS -> 245in.-E
wire('alubus.0', 'lsOut.18');                                          // ALU-BUS -> 245out.-E

const spec = {
    title: 'alu-lab',
    count: comps.length,
    components: comps.map(c => ({ ref: c.ref, type: c.type, x: c.x, y: c.y, id: c.id })),
    wires
};
fs.mkdirSync(SPEC_DIR, { recursive: true });
fs.writeFileSync(path.join(SPEC_DIR, 'alu.json'), JSON.stringify(spec, null, 1), 'utf8');
const refs = {};
comps.forEach(c => refs[c.ref] = c.id);
fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(path.join(OUT_DIR, 'alu.refs.json'), JSON.stringify(refs, null, 1), 'utf8');

const tally = {};
comps.forEach(c => tally[c.type] = (tally[c.type] || 0) + 1);
console.log('元件 ' + comps.length + ' 个：' + Object.entries(tally).map(([t, k]) => t + '×' + k).join(', '));
console.log('连线 ' + wires.length + ' 条');
console.log('规格: specs/alu.json    别名表: out/alu.refs.json');
