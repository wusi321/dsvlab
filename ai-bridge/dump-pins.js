/*
 * dump-pins.js —— 从 DS-VLAB 元件库源码中提取全部元件的引脚定义
 * 用法: node dump-pins.js [实验室根目录]   输出: pins.json + 控制台引脚表
 * 原理: 用 vm 沙箱执行 js/component/*.js（源码为 GBK），实例化 CompoXXX 构造函数，
 *       读取 name/width/height/pinName/pinFunction/pinPosition。
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { pathToFileURL } = require('url');

const ROOT = process.argv[2] || path.join(__dirname, '..');
const COMP_DIR = path.join(ROOT, 'js', 'component');

const sandbox = {
    console, Math, Array, Object, Number, String, Boolean, Date,
    parseInt, parseFloat, isNaN, JSON, RegExp, Error,
    document: { getElementById: () => null, createElement: () => ({ style: {}, appendChild() { } }) }
};
sandbox.window = sandbox;
const ctx = vm.createContext(sandbox);

// 元件源码编码混杂：部分是 UTF-8(带BOM)，部分是 GBK。先按 UTF-8 严格解码，失败则回退 GBK。
function readSource(file) {
    const buf = fs.readFileSync(file);
    let text;
    try { text = new TextDecoder('utf-8', { fatal: true }).decode(buf); }
    catch { text = new TextDecoder('gbk').decode(buf); }
    return text.replace(/^\uFEFF/, '');
}

const files = fs.readdirSync(COMP_DIR).filter(f => f.toLowerCase().endsWith('.js')).sort();
for (const f of files) {
    vm.runInContext(readSource(path.join(COMP_DIR, f)), ctx, { filename: f });
}

const FN = { 0: '输入', 1: '输出', 2: '地', 3: '电源', 4: '其它', 10: '必要输入', 11: '输入/输出' };
const names = Object.keys(sandbox).filter(k => /^Compo[A-Za-z0-9]+$/.test(k) && typeof sandbox[k] === 'function').sort();
const out = {};
for (const n of names) {
    let inst;
    try { inst = new sandbox[n](); } catch (e) { out[n] = { error: String(e) }; continue; }
    out[n] = {
        type: n.replace(/^Compo/, ''),
        width: inst.width, height: inst.height, image: inst.image,
        showName: !!inst.showName, showBorder: !!inst.showBorder,
        paddingLR: inst.paddingLR, pinWidth: inst.pinWidth, pinHeight: inst.pinHeight,
        pins: (inst.pinName || []).map((label, i) => ({
            no: i, label: label,
            // 注意：部分元件源码把引脚类型写成数组（如 new Array([10],[10],[1])），
            // 实验室代码用宽松比较 pinFun == 10 判断，这里统一归一化为数字。
            fn: Number(inst.pinFunction[i]),
            fnText: FN[Number(inst.pinFunction[i])] || String(inst.pinFunction[i]),
            side: inst.pinPosition[i][1] === 1 ? '下' : '上'
        }))
    };
}

fs.writeFileSync(path.join(__dirname, 'pins.json'), JSON.stringify(out, null, 1), 'utf8');

const only = process.argv[3];
console.log('元件总数: ' + Object.keys(out).length + '  ->  pins.json');
console.log('文件来源: ' + COMP_DIR + '\n');
for (const [n, c] of Object.entries(out)) {
    if (c.error) { console.log(n + '  [实例化失败] ' + c.error); continue; }
    if (only && c.type.toLowerCase() !== only.toLowerCase()) continue;
    console.log('== ' + c.type + '  (' + c.width + 'x' + c.height + ')  ' + c.pins.length + ' 脚');
    console.log('   ' + c.pins.map(p => `${p.no}:${p.label || '-'}[${p.fnText}/${p.side}]`).join('  '));
}
console.log('\n(file://' + pathToFileURL(path.join(ROOT, 'index.html')).href + ')');
