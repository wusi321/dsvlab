/*
 * circuit.js —— DS-VLAB 电路生成器 / 校验器
 *
 * 规格文件(JSON)示例：
 * {
 *   "title": "示例",
 *   "components": [
 *     { "ref": "sw1",  "type": "Switch", "x": 200, "y": 560 },
 *     { "ref": "and1", "type": "ANDgate", "x": 420, "y": 320 },
 *     { "ref": "led1", "type": "Led", "x": 640, "y": 300 }
 *   ],
 *   "wires": [ ["sw1.0", "and1.0"], ["and1.2", "led1.0"] ]
 * }
 *
 * 用法:
 *   node circuit.js build <spec.json> [out.txt]   生成实验室存档文件并校验
 *   node circuit.js parse <circuit.txt>           解析已有存档并校验
 *   node circuit.js pins <Type>                   打印某元件引脚表
 *   node circuit.js list                          列出全部可用元件类型
 */
const fs = require('fs');
const path = require('path');

const PINS = JSON.parse(fs.readFileSync(path.join(__dirname, 'pins.json'), 'utf8'));
const TYPE_BY_NAME = {};
for (const [ctor, c] of Object.entries(PINS)) if (!c.error) TYPE_BY_NAME[c.type] = c;

const isOut = fn => fn === 1 || fn === 11;
const isIn = fn => fn === 0 || fn === 10 || fn === 11;

/* ---------- 生成 ---------- */
function build(spec) {
    const comps = spec.components || [];
    const byRef = new Map();
    const parts = [];
    comps.forEach((c, i) => {
        const meta = TYPE_BY_NAME[c.type];
        if (!meta) throw new Error(`第 ${i} 个元件类型未知: ${c.type}（可用类型见 node circuit.js list）`);
        const id = c.id || ('CP' + i);
        if (byRef.has(c.ref || id)) throw new Error('重复的 ref/id: ' + (c.ref || id));
        byRef.set(c.ref || id, { id, type: c.type, meta, x: c.x | 0, y: c.y | 0 });
        parts.push(`${c.type},${c.x | 0}px,${c.y | 0}px,${id}$`);
    });

    const wires = (spec.wires || []).map(w => {
        if (typeof w === 'string') {
            const m = w.split(/->|--|,/).map(s => s.trim()).filter(Boolean);
            return m;
        }
        return w;
    }).map(w => (Array.isArray(w) ? w : [w.from, w.to]));

    const lines = [];
    const problems = [];
    const seen = new Set();
    for (const [a, b] of wires) {
        const [ra, pa] = String(a).split('.');
        const [rb, pb] = String(b).split('.');
        const ca = byRef.get(ra), cb = byRef.get(rb);
        if (!ca || !cb) { problems.push(`连线 ${a}->${b}: 端点 ref 不存在`); continue; }
        const na = Number(pa), nb = Number(pb);
        if (!(na >= 0 && na < ca.meta.pins.length)) { problems.push(`连线 ${a}->${b}: ${ca.type} 无 ${pa} 号脚（共 ${ca.meta.pins.length} 脚）`); continue; }
        if (!(nb >= 0 && nb < cb.meta.pins.length)) { problems.push(`连线 ${a}->${b}: ${cb.type} 无 ${pb} 号脚（共 ${cb.meta.pins.length} 脚）`); continue; }
        const fa = ca.meta.pins[na].fn, fb = cb.meta.pins[nb].fn;
        if (!isOut(fa)) problems.push(`连线 ${a}->${b}: 起点 ${ca.type}.${na}(${ca.meta.pins[na].label}) 是${ca.meta.pins[na].fnText}，存档时会被丢弃`);
        if (!isIn(fb)) problems.push(`连线 ${a}->${b}: 终点 ${cb.type}.${nb}(${cb.meta.pins[nb].label}) 是${cb.meta.pins[nb].fnText}，不能作输入`);
        const key = ca.id + 'Pin' + na + 'To' + cb.id + 'Pin' + nb;
        if (seen.has(key)) { problems.push(`重复连线: ${a}->${b}`); continue; }
        seen.add(key);
        lines.push(key);
    }

    // count 是实验室“器件计数器”，决定以后新拖入元件的 id。
    // 若沿用已有图纸（id 稀疏），必须取 max(已有数量, 最大id+1)，否则新元件 id 会与既有元件冲突。
    const autoCount = comps.reduce((m, c, i) => Math.max(m, i + 1, Number(String(c.id || '').replace(/^CP/, '')) + 1 || 0), 0);
    const count = spec.count ? Math.max(spec.count, autoCount) : autoCount;
    const text = parts.join('') + '&' + lines.map(l => l + ',').join('') + '@' + count;
    return { text, problems, comps, wires: lines, count };
}

/* ---------- 解析已有存档 ---------- */
function parse(text) {
    const p1 = text.indexOf('&'), p2 = text.lastIndexOf('@');
    const compStr = text.slice(0, p1), lineStr = text.slice(p1 + 1, p2), count = Number(text.slice(p2 + 1));
    const comps = [];
    for (const chunk of compStr.split('$')) {
        if (!chunk) continue;
        const [type, x, y, id] = chunk.split(',');
        comps.push({ type, x, y, id });
    }
    const wires = lineStr.split(',').filter(Boolean);
    const problems = [];
    const ids = new Set(comps.map(c => c.id));
    for (const w of wires) {
        const m = /^(.*)Pin(\d+)To(.*)Pin(\d+)$/.exec(w);
        if (!m) { problems.push('无法解析连线: ' + w); continue; }
        const [, sid, sp, eid, ep] = m;
        if (!ids.has(sid)) problems.push(`${w}: 起点器件 ${sid} 不存在`);
        if (!ids.has(eid)) problems.push(`${w}: 终点器件 ${eid} 不存在`);
        const sc = comps.find(c => c.id === sid), ec = comps.find(c => c.id === eid);
        if (sc && TYPE_BY_NAME[sc.type] && +sp >= TYPE_BY_NAME[sc.type].pins.length) problems.push(`${w}: ${sc.type} 无 ${sp} 号脚`);
        if (ec && TYPE_BY_NAME[ec.type] && +ep >= TYPE_BY_NAME[ec.type].pins.length) problems.push(`${w}: ${ec.type} 无 ${ep} 号脚`);
    }
    return { comps, wires, count, problems };
}

/* ---------- 报告 ---------- */
function report(title, r, count) {
    console.log(`\n=== ${title} ===`);
    const tally = {};
    r.comps.forEach(c => tally[c.type] = (tally[c.type] || 0) + 1);
    console.log(`元件 ${r.comps.length} 个 (计数@${count})：` + Object.entries(tally).map(([t, n]) => `${t}×${n}`).join(', '));
    console.log(`连线 ${r.wires.length} 条`);
    if (r.problems.length) {
        console.log(`校验问题 ${r.problems.length} 项：`);
        [...new Set(r.problems)].forEach(p => console.log('  ! ' + p));
    } else console.log('校验：通过（引脚编号与方向均合法）');
}

/* ---------- CLI ---------- */
const [cmd, a1, a2] = process.argv.slice(2);
if (cmd === 'build') {
    const spec = JSON.parse(fs.readFileSync(a1, 'utf8'));
    const r = build(spec);
    const out = a2 || path.join(path.dirname(a1), (spec.title || 'circuit') + '.txt');
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, r.text, 'utf8');
    report(spec.title || path.basename(a1), r, r.count);
    console.log('已写出: ' + out + `  (${r.text.length} 字节)`);
} else if (cmd === 'parse') {
    const r = parse(fs.readFileSync(a1, 'utf8'));
    report(path.basename(a1), r, r.count);
} else if (cmd === 'roundtrip') {
    // 把已有存档解析成规格再重新生成，用于大规模回归验证
    const src = fs.readFileSync(a1, 'utf8');
    const p = parse(src);
    const refs = {};
    p.comps.forEach((c, i) => refs[c.id] = 'c' + i);
    const spec = {
        title: path.basename(a1, '.txt') + '-regen',
        count: p.count, // 保留原图器件计数器，避免以后新元件 id 冲突
        components: p.comps.map((c, i) => ({ ref: refs[c.id], type: c.type, x: parseInt(c.x), y: parseInt(c.y) })),
        wires: p.wires.map(w => {
            const m = /^(.*)Pin(\d+)To(.*)Pin(\d+)$/.exec(w);
            return m ? [refs[m[1]] + '.' + m[2], refs[m[3]] + '.' + m[4]] : null;
        }).filter(Boolean)
    };
    const specFile = (a2 ? a2.replace(/\.txt$/, '') : path.join(__dirname, 'out', spec.title)) + '.spec.json';
    fs.mkdirSync(path.dirname(specFile), { recursive: true });
    fs.writeFileSync(specFile, JSON.stringify(spec, null, 1), 'utf8');
    const r = build(spec);
    const out = (a2 || path.join(__dirname, 'out', spec.title + '.txt'));
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, r.text, 'utf8');
    console.log(`源文件: ${p.comps.length} 元件 / ${p.wires.length} 连线`);
    report(spec.title, r, r.count);
    console.log('规格: ' + specFile + '\n新存档: ' + out);
} else if (cmd === 'console') {
    // 生成浏览器控制台一键注入代码（直接调用实验室接口，无需保存/打开文件）
    const spec = JSON.parse(fs.readFileSync(a1, 'utf8'));
    const r = build(spec);
    if (r.problems.length) { console.log('校验问题:'); [...new Set(r.problems)].forEach(p => console.log('  ! ' + p)); }
    const out = path.join(__dirname, 'out', (spec.title || 'circuit') + '.txt');
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, r.text, 'utf8');
    console.log('/* ==== 复制下面整段，粘贴到实验室页面按 F12 打开的控制台，回车即可 ==== */');
    console.log('(function(){');
    console.log('  var data = ' + JSON.stringify(r.text) + ';');
    console.log('  if (typeof mycircuit === "undefined") { console.warn("请先打开虚拟实验室页面再执行"); return; }');
    console.log('  mycircuit.deletecircuit();');
    console.log('  recovercircuit("demo", mycircuit, data);');
    console.log('  console.log("已放置 " + mycircuit.componentAll.length + " 个元件，连线 " + document.querySelectorAll("#demo div.div-line").length + " 条");');
    console.log('})();');
    console.log('/* 存档文本同时已写出到: ' + out + ' */');
} else if (cmd === 'pins') {
    const c = TYPE_BY_NAME[a1];
    if (!c) { console.log('未知元件: ' + a1); process.exit(1); }
    console.log(`${c.type}  ${c.width}x${c.height}  ${c.pins.length} 脚`);
    c.pins.forEach(p => console.log(`  ${String(p.no).padStart(3)}  ${(p.label || '(空)').padEnd(6)} ${p.fnText}  ${p.side}侧`));
} else if (cmd === 'list') {
    console.log(Object.keys(TYPE_BY_NAME).join('\n'));
} else {
    console.log('用法: node circuit.js build <spec.json> [out.txt] | parse <circuit.txt> | pins <Type> | list');
}
module.exports = { build, parse, PINS, TYPE_BY_NAME };
