/*
 * check-alu-model.js —— 校验实验室的 74LS181 模型是否与教材表 3-1 一致
 * 做法：实例化 Compo74LS181，对 16 种 S3S2S1S0 × M × Cn 组合逐一 work()，
 *       与按数据手册独立实现的标准 74LS181 结果比较。
 * 用法: node check-alu-model.js [A] [B]      (A、B 为 0~15 的 4 位操作数)
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const file = path.join(ROOT, 'js', 'component', '74ls181.js');
const code = new TextDecoder('utf-8', { fatal: true }).decode(fs.readFileSync(file));
const sandbox = { Math, Array, Number, String, Object, console, document: { getElementById: () => null } };
sandbox.window = sandbox;
const ctx = vm.createContext(sandbox);
vm.runInContext(code, ctx, { filename: '74ls181.js' });
const Compo = sandbox.Compo74LS181;

const A = Number(process.argv[2] ?? 5) & 15;
const B = Number(process.argv[3] ?? 7) & 15;

/* ---- 按数据手册独立实现（与教材表 3-1 一一对应）---- */
const mask = x => x & 15;
const NOT = x => mask(~x);
const L_NOT_A = () => NOT(A);
const L_NOR_AB = () => NOT(A | B);
const L_NOT_A_AND_B = () => NOT(A) & B;
const L_ZERO = () => 0;
const L_NAND_AB = () => NOT(A & B);
const L_NOT_B = () => NOT(B);
const L_XOR = () => A ^ B;
const L_A_AND_NOTB = () => A & NOT(B);
const L_NOT_A_OR_B = () => NOT(A) | B;
const L_XNOR = () => NOT(A ^ B);
const L_B = () => B;
const L_AND = () => A & B;
const L_ONE = () => 15;
const L_A_OR_NOTB = () => A | NOT(B);
const L_OR = () => A | B;
const L_A = () => A;

const LOGIC = [L_NOT_A, L_NOR_AB, L_NOT_A_AND_B, L_ZERO, L_NAND_AB, L_NOT_B, L_XOR, L_A_AND_NOTB,
    L_NOT_A_OR_B, L_XNOR, L_B, L_AND, L_ONE, L_A_OR_NOTB, L_OR, L_A];

// 算术：M=0。CnPin=1 表示"无进位输入"，CnPin=0 表示"有进位输入"(+1)
function arith(S, cin) {
    const plus = k => mask(A + k);
    const sum = mask(A + B);
    switch (S) {
        case 0: return plus(cin);
        case 1: return mask((A | B) + cin);
        case 2: return mask((A | NOT(B)) + cin);
        case 3: return mask(0 + cin - 1);
        case 4: return mask((A + (A & NOT(B))) + cin);
        case 5: return mask(((A | B) + (A & NOT(B))) + cin);
        case 6: return mask((A - B) - 1 + cin);
        case 7: return mask((A & NOT(B)) - 1 + cin);
        case 8: return mask((A + (A & B)) + cin);
        case 9: return mask(sum + cin);
        case 10: return mask((A | NOT(B)) + (A & B) + cin);
        case 11: return mask((A & B) - 1 + cin);
        case 12: return mask((A + A) + cin);
        case 13: return mask(((A | B) + A) + cin);
        case 14: return mask(((A | NOT(B)) + A) + cin);
        case 15: return mask(A - 1 + cin);
    }
}

const h = v => v.toString(16).toUpperCase();
let bad = 0;
console.log(`操作数 A=${h(A)}  B=${h(B)}   (4 位，教材表 3-1 验证)\n`);
console.log('S3S2S1S0  M  Cn | 模型F 标准F | 模型Cn+4 | 结果');
console.log('---------------------------------------------------------------');
for (let M = 0; M <= 1; M++) {
    for (let S = 0; S < 16; S++) {
        for (const CnPin of [1, 0]) {
            const c = new Compo();
            // 引脚: 0..3=A3..A0  4..7=B3..B0  8..10=S3..S1  12=S0  21=Cn  22=M
            for (let i = 0; i < 4; i++) {
                c.pinValue[3 - i] = (A >> i) & 1;      // A_i -> pin(3-i)
                c.pinValue[7 - i] = (B >> i) & 1;      // B_i -> pin(7-i)
            }
            c.pinValue[8] = (S >> 3) & 1;
            c.pinValue[9] = (S >> 2) & 1;
            c.pinValue[10] = (S >> 1) & 1;
            c.pinValue[12] = S & 1;
            c.pinValue[21] = CnPin;                     // Cn: 1=无进位输入
            c.pinValue[22] = M;
            c.work();
            let F = 0;
            for (let i = 0; i < 4; i++) F |= c.pinValue[13 + i] << i;   // F0=13..F3=16
            const ref = M ? LOGIC[S]() : arith(S, CnPin ? 0 : 1);
            const ok = F === ref;
            if (!ok) bad++;
            const bin = S.toString(2).padStart(4, '0');
            if (!ok || CnPin === 1) {
                console.log(`  ${bin}   ${M}   ${CnPin} |   ${h(F)}     ${h(ref)}   |    ${c.pinValue[19]}     | ${ok ? 'OK' : '<<< 不一致'}`);
            }
        }
    }
}
console.log('---------------------------------------------------------------');
console.log(bad === 0 ? '结论：74LS181 模型与教材表 3-1（数据手册标准）完全一致 ✅' : `结论：有 ${bad} 处不一致 ❌`);
