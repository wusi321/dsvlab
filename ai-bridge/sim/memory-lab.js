/* 存储器实验 4.5 实验内容与步骤 —— 在实验室页面内自动执行
 * 由 verify.js --script 调用，页面内可直接访问 mycircuit / cDispatch / __REF
 * 步骤严格按教材：
 *   预设置: MR=1(AR不清零), CE=1(6116未片选), SW-BUS=1(三态门关闭)
 *   写: ① SW0~7=地址, SW-BUS=0 打开三态门 ② LDAR=1, P2脉冲 -> 地址装入AR
 *       ③ CE=0, WE=1 ④ SW0~7=数据 ⑤ P1脉冲 -> 写入 ⑥ CE=1, SW-BUS=1
 *   读: 同样的地址装入步骤, 然后 SW-BUS=1 关闭三态门, WE=0, CE=0 -> 数据灯显示
 */
const PW = 80;                     // 脉冲宽度(界面默认800ms)，缩短以便快速自动验证
cDispatch.pulseWidth = PW;
const report = [];
const C = ref => mycircuit.findById(__REF[ref]);
const click = ref => cDispatch.sourceTrigger(C(ref));            // 等同界面上点一下
const preset = ref => { const c = C(ref); c.input(); };           // 关电源时点开关=只改值不传播
// 注意：Switch 的 pinValue 是 new Array([0])，即 pinValue[0] === [0]（数组），
// 源码内部用宽松比较(pinValue[0] == 0)，这里也必须先 Number() 再严格比较，否则永远判为"不等于"。
const swVal = ref => Number(C(ref).pinValue[0]);
const setSw = ref => { if (swVal(ref) !== 1) click(ref); };
const clrSw = ref => { if (swVal(ref) !== 0) click(ref); };
const bitOf = ref => document.getElementById(__REF[ref]).style.backgroundImage.indexOf('ledon') >= 0 ? 1 : 0;
const val = (pre, j0) => { let v = 0; for (let j = 0; j < 8; j++) v += bitOf(pre + j) << (j0 === undefined ? j : j); return v; };
const hex = v => '0x' + v.toString(16).toUpperCase().padStart(2, '0');

function pulse(ref) {                       // 单脉冲：首次点击只把 count 0->1，第二次才产生脉冲
    if (C(ref).count === 0) click(ref);
    click(ref);
}
const waitPulse = ref => new Promise(res => {
    const c = C(ref), t0 = Date.now();
    const iv = setInterval(() => {
        if (c.timer === null && c.count === 1) { clearInterval(iv); res('ok'); }
        else if (Date.now() - t0 > 6000) { clearInterval(iv); res('timeout'); }
    }, 5);
});
async function pulseWait(ref) { pulse(ref); return await waitPulse(ref); }

function setSwitches(prefix, v) {           // prefix='sw' 数据开关 / 'sw' 地址也是同一组
    for (let j = 0; j < 8; j++) ((v >> j) & 1) ? setSw(prefix + j) : clrSw(prefix + j);
}
const dataLeds = () => { let v = 0; for (let j = 0; j < 8; j++) v += bitOf('dataLed' + j) << j; return v; };
const addrLeds = () => { let v = 0; for (let j = 0; j < 8; j++) v += bitOf('addrLed' + j) << j; return v; };

async function loadAddr(a) {                // 步骤 ①②
    clrSw('swbus');                         // 打开三态门
    setSwitches('sw', a);                   // 数据开关送地址
    setSw('ldar');                          // LDAR=1
    await pulseWait('p2');                  // P2 上升沿 -> 装入 AR
}
async function writeRam(a, d) {             // 步骤 ①~⑥
    await loadAddr(a);
    const addrShown = addrLeds();
    clrSw('ce'); setSw('we');               // ③ CE=0, WE=1（-WE=1，读出原数据）
    setSwitches('sw', d);                   // ④ 送数据
    const busShown = dataLeds();
    await pulseWait('p1');                  // ⑤ P1 脉冲 -> -WE=0 -> 写入
    setSw('ce'); setSw('swbus');            // ⑥ 停片选、关三态门
    report.push(`写 ${hex(a)} <- ${hex(d)}  地址灯=${hex(addrShown)} 写入前数据灯=${hex(busShown)}`);
    return addrShown === a;
}
async function readRam(a) {                 // 读操作
    await loadAddr(a);
    setSw('swbus'); clrSw('we');            // 关三态门, WE=0 -> -WE=1 读
    clrSw('ce');                            // 片选 -> 读出
    const v = dataLeds();
    setSw('ce'); setSw('swbus');
    return v;
}

// ================= 正式流程 =================
preset('mr');            // MR=1   AR 不清零
preset('ce');            // CE=1   6116 未片选
preset('swbus');         // SW-BUS=1 三态门关闭
preset('we');            // WE=1
preset('ldar'); preset('ldar');   // LDAR 回到 0
preset('p1'); preset('p1');       // 单脉冲内部计数复位到0（等同刚拖入时的状态）
preset('p2'); preset('p2');
// 上面两次 preset 只是把开关/计数器摆到"上电前"的典型状态；单脉冲内部 count 仍为 0，由 pulse() 处理
cDispatch.powerOn();
report.push('开电源  runState=' + cDispatch.runState +
    '  AR白置1=' + C('mr').pinValue[0] + '  AR.Q=' + addrLeds());

const cases = [[0x01, 0x11], [0x02, 0x12], [0x03, 0x13], [0x04, 0x14], [0x05, 0x15]];
let addrOk = 0;
for (const [a, d] of cases) if (await writeRam(a, d)) addrOk++;

const results = [];
let pass = 0;
for (const [a, d] of cases) {
    const got = await readRam(a);
    const ok = got === d;
    if (ok) pass++;
    results.push({ 地址: hex(a), 写入: hex(d), 读出: hex(got), 结果: ok ? '正确' : '错误' });
}
report.push(`写地址装入正确 ${addrOk}/5`);
report.push(`读回正确 ${pass}/5`);
report.push('结束时 地址灯=' + hex(addrLeds()) + '（AR 中的地址）  数据灯=' + hex(dataLeds()) + '（CE=1 已停片选，6116 输出高阻）');
report.push('（数据灯同时显示读出的数据，地址灯显示 AR 中的地址）');
return { report, results, pass, total: cases.length, runState: cDispatch.runState,
         finalAddrLeds: hex(addrLeds()), finalDataLeds: hex(dataLeds()) };
