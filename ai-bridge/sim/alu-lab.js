/* 运算器实验 3.5 实验内容与步骤 —— 在实验室页面内自动执行
 * 由 verify.js --script 调用，页面内可直接访问 mycircuit / cDispatch / __REF
 *
 * 步骤严格按教材：
 *   预设置: ALU-BUS=1(关闭 ALU 输出三态门), 两片 74LS273 的 MR=1(不清零)
 *   开电源
 *   置数: SW-BUS=0 → SW0~SW7=01100101 → P1 脉冲 → DR1=65H
 *                       → SW0~SW7=10100111 → P2 脉冲 → DR2=A7H → SW-BUS=1
 *   检验: ALU-BUS=0, Cn=1, S3S2S1S0M=00000 → 灯显示 DR1=65H
 *                       S3S2S1S0M=10101 → 灯显示 DR2=A7H
 *   表 3-1: 16 种 S3~S0 × (M=0/1) 逐一测量，与数据手册标准结果比较
 */
cDispatch.pulseWidth = 80;                 // 脉冲宽度缩短以便快速自动验证（界面默认 800ms）
const report = [];
const C = ref => mycircuit.findById(__REF[ref]);
const click = ref => cDispatch.sourceTrigger(C(ref));
const swVal = ref => Number(C(ref).pinValue[0]);          // Switch 的 pinValue 是 [[0]]，必须 Number()
const setSw = (ref, v) => { if (swVal(ref) !== (v ? 1 : 0)) click(ref); };
const presetTo = (ref, v) => { let c = C(ref), guard = 0; while (swVal(ref) !== v && guard++ < 4) c.input(); };
const bitOf = ref => document.getElementById(__REF[ref]).style.backgroundImage.indexOf('ledon') >= 0 ? 1 : 0;
const hex = v => '0x' + v.toString(16).toUpperCase().padStart(2, '0');
const bin = v => v.toString(2).padStart(8, '0');

function pulse(ref) { if (C(ref).count === 0) click(ref); click(ref); }
const waitPulse = ref => new Promise(res => {
    const c = C(ref), t0 = Date.now();
    const iv = setInterval(() => {
        if (c.timer === null && c.count === 1) { clearInterval(iv); res('ok'); }
        else if (Date.now() - t0 > 6000) { clearInterval(iv); res('timeout'); }
    }, 5);
});
const pulseWait = async ref => { pulse(ref); return await waitPulse(ref); };

const setByte = v => { for (let i = 0; i < 8; i++) setSw('sw' + i, (v >> i) & 1); };
const setS = s => { setSw('s3', (s >> 3) & 1); setSw('s2', (s >> 2) & 1); setSw('s1', (s >> 1) & 1); setSw('s0', s & 1); };
const readF = () => { let v = 0; for (let j = 0; j < 8; j++) v += bitOf('dled' + j) << j; return v; };
const readCn4 = () => bitOf('cn4led');

/* ---- 按教材表 3-1 独立的参考实现（与实验室代码无关）---- */
const NOT = x => (~x) & 0xFF;
const ARITH = [                        // M=0 且 Cn=1（无进位输入）
    // 注意教材表 3-1 的记号：「+ 表示逻辑或，plus 表示算术求和」，
    // 所以 0001 的 "A+B"、0010 的 "A+B̄" 是逻辑或，不是加法。
    A => A,                                     // 0000 A
    (A, B) => A | B,                            // 0001 A+B   （逻辑或）
    (A, B) => A | NOT(B),                       // 0010 A+B̄  （逻辑或）
    () => 0 - 1,                                // 0011 0 minus 1
    (A, B) => A + (A & NOT(B)),                 // 0100 A plus AB̄
    (A, B) => (A | B) + (A & NOT(B)),           // 0101 (A+B) plus AB̄
    (A, B) => A - B - 1,                        // 0110 A minus B minus 1
    (A, B) => (A & NOT(B)) - 1,                 // 0111 AB̄ minus 1
    (A, B) => A + (A & B),                      // 1000 A plus AB
    (A, B) => A + B,                            // 1001 A plus B
    (A, B) => (A | NOT(B)) + (A & B),           // 1010 (A+B̄) plus AB
    (A, B) => (A & B) - 1,                      // 1011 AB minus 1
    A => A + A,                                 // 1100 A plus A
    (A, B) => (A | B) + A,                      // 1101 (A+B) plus A
    (A, B) => (A | NOT(B)) + A,                 // 1110 (A+B̄) plus A
    A => A - 1                                  // 1111 A minus 1
];
const LOGIC = [                        // M=1
    A => NOT(A),                                // 0000 Ā
    (A, B) => NOT(A | B),                       // 0001 (A+B)̄
    (A, B) => NOT(A) & B,                       // 0010 ĀB
    () => 0,                                    // 0011 Logical 0
    (A, B) => NOT(A & B),                       // 0100 (AB)̄
    (A, B) => NOT(B),                           // 0101 B̄
    (A, B) => A ^ B,                            // 0110 A⊕B
    (A, B) => A & NOT(B),                       // 0111 AB̄
    (A, B) => NOT(A) | B,                       // 1000 Ā+B
    (A, B) => NOT(A ^ B),                       // 1001 (A⊕B)̄
    (A, B) => B,                                // 1010 B
    (A, B) => A & B,                            // 1011 AB
    () => 0xFF,                                 // 1100 Logical 1
    (A, B) => A | NOT(B),                       // 1101 A+B̄
    (A, B) => A | B,                            // 1110 A+B
    A => A                                      // 1111 A
];
const ARITH_NAME = ['A', 'A plus B', 'A plus B̄', '0 minus 1', 'A plus AB̄', '(A+B) plus AB̄',
    'A minus B minus 1', 'AB̄ minus 1', 'A plus AB', 'A plus B', '(A+B̄) plus AB', 'AB minus 1',
    'A plus A', '(A+B) plus A', '(A+B̄) plus A', 'A minus 1'];
const LOGIC_NAME = ['Ā', '(A+B)̄', 'ĀB', 'Logical 0', '(AB)̄', 'B̄', 'A⊕B', 'AB̄',
    'Ā+B', '(A⊕B)̄', 'B', 'AB', 'Logical 1', 'A+B̄', 'A+B', 'A'];

/* ================= 实验流程 ================= */
// 1) 预设置（开电源之前）
presetTo('alubus', 1);       // 关闭 ALU 输出三态门
presetTo('mr', 1);           // 两片 74LS273 不清零
presetTo('swbus', 1);        // 关闭数据输入三态门
presetTo('cn', 1);           // 先置无进位输入
presetTo('s3', 0); presetTo('s2', 0); presetTo('s1', 0); presetTo('s0', 0);
presetTo('m', 0);
cDispatch.powerOn();
report.push('开电源  runState=' + cDispatch.runState + '  ALU-BUS=' + swVal('alubus') + '  MR=' + swVal('mr'));

// 2) 向 DR1、DR2 置数：DR1=65H，DR2=A7H
const A = 0x65, B = 0xA7;
setSw('swbus', 0);                                   // 打开数据输入三态门
setByte(A); await pulseWait('p1');                   // P1 上升沿 -> DR1
setByte(B); await pulseWait('p2');                   // P2 上升沿 -> DR2
setSw('swbus', 1);                                   // 关闭数据输入三态门
report.push(`置数完成：DR1=${hex(A)}(${bin(A)})  DR2=${hex(B)}(${bin(B)})`);

// 3) 检验 DR1 / DR2
setSw('alubus', 0);                                  // 打开 ALU 输出三态门
setSw('cn', 1);                                      // Cn=1 无进位输入
setS(0); setSw('m', 0);                              // S=0000, M=0 -> F=A
const showA = readF();
setS(10); setSw('m', 1);                             // S=1010, M=1 -> F=B
const showB = readF();
report.push(`检验：S3S2S1S0M=00000 时灯显示 ${hex(showA)}（应 ${hex(A)}）${showA === A ? ' ✓' : ' ✗'}`);
report.push(`检验：S3S2S1S0M=10101 时灯显示 ${hex(showB)}（应 ${hex(B)}）${showB === B ? ' ✓' : ' ✗'}`);

// 4) 表 3-1 逐项验证：16 种 S × (M=0, Cn=1) / (M=0, Cn=0) / (M=1)
const rows = [];
let pass = 0, total = 0;
for (let S = 0; S < 16; S++) {
    // 逻辑运算
    setSw('m', 1); setS(S);
    const fL = readF(), eL = LOGIC[S](A, B) & 0xFF;
    total++; if (fL === eL) pass++;
    // 算术运算：Cn=1（无进位）
    setSw('m', 0); setSw('cn', 1); setS(S);
    const fA1 = readF(), eA1 = (ARITH[S](A, B)) & 0xFF;
    const c4 = readCn4();
    total++; if (fA1 === eA1) pass++;
    // 算术运算：Cn=0（有进位输入，相当于 +1）
    setSw('cn', 0); setS(S);
    const fA0 = readF(), eA0 = (ARITH[S](A, B) + 1) & 0xFF;
    total++; if (fA0 === eA0) pass++;
    setSw('cn', 1);
    rows.push({
        S: S.toString(2).padStart(4, '0'),
        算术功能: ARITH_NAME[S], 算术_Cn1: hex(fA1),
        算术_Cn0: hex(fA0),
        逻辑功能: LOGIC_NAME[S], 逻辑值: hex(fL),
        Cn4: c4,
        一致: (fL === eL && fA1 === eA1 && fA0 === eA0) ? 'OK' : 'MISMATCH'
    });
}

// 5) 进位标志：A+B 产生进位时 Cn+4 应变为 0（灯灭）
setSw('m', 0); setSw('cn', 1); setS(9);              // S=1001 A plus B
const sum = readF(), carry = readCn4();
report.push(`进位检查：F(65H+A7H)=${hex(sum)}（应 0x0C），Cn+4=${
    carry}（应 0，即有进位输出）`);

report.push(`表 3-1 验证：${pass}/${total} 项与教材标准一致`);
return { report, rows, pass, total, DR1: hex(A), DR2: hex(B) };
