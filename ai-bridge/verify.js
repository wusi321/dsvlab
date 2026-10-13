/*
 * verify.js —— 无头 Chrome 端到端验证器（通过 CDP 直接驱动实验室真实页面）
 *
 * 用法: node verify.js <circuit.txt> [--shot out.png] [--sim] [--keep]
 *   --sim   加载后开电源并翻转开关，检查逻辑是否真的传播到 LED
 *   --shot  截图输出路径（默认 out/<name>.png）
 *   --keep  验证后保留浏览器进程（调试用）
 *
 * 做法与实验室“文件→打开”走的是同一条代码路径：调用页面里的
 * recovercircuit('demo', mycircuit, 存档文本)，逐个 addComponent + lineCreate/lineAdjust/addLineToComponent。
 */
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { pathToFileURL } = require('url');

const ROOT = path.join(__dirname, '..');
const args = process.argv.slice(2);
const circuitFile = args.find(a => !a.startsWith('--'));
const flag = n => args.includes('--' + n);
const optVal = n => { const i = args.indexOf('--' + n); return i >= 0 ? args[i + 1] : null; };
if (!circuitFile) { console.error('用法: node verify.js <circuit.txt> [--shot out.png] [--sim]'); process.exit(1); }

const CHROME_CANDIDATES = [
    process.env.CHROME_PATH,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
].filter(Boolean);
const chromePath = CHROME_CANDIDATES.find(p => fs.existsSync(p));
if (!chromePath) { console.error('未找到 Chrome/Edge'); process.exit(1); }

const PORT = 9333 + (process.pid % 200);
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
    const pageUrl = pathToFileURL(path.join(ROOT, 'index.html')).href;
    const userDir = path.join(require('os').tmpdir(), 'dsvlab-headless-' + process.pid);
    const chrome = spawn(chromePath, [
        '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
        '--allow-file-access-from-files', '--window-size=1680,1000',
        '--user-data-dir=' + userDir,
        '--remote-debugging-port=' + PORT,
        pageUrl
    ], { stdio: 'ignore' });

    let ws, msgId = 0;
    const pending = new Map();
    const send = (method, params = {}) => new Promise((res, rej) => {
        const id = ++msgId;
        pending.set(id, { res, rej });
        ws.send(JSON.stringify({ id, method, params }));
    });
    const evaluate = async (expression) => {
        const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
        if (r.exceptionDetails) throw new Error('页面内异常: ' + JSON.stringify(r.exceptionDetails.exception || r.exceptionDetails));
        return r.result.value;
    };

    const cleanup = async () => {
        try { ws && ws.close(); } catch { }
        if (!flag('keep')) {
            chrome.kill();
            await sleep(300);
            try { fs.rmSync(userDir, { recursive: true, force: true }); } catch { }
        }
    };
    try {
        // 1. 找到页面 target
        let target = null;
        for (let i = 0; i < 60 && !target; i++) {
            await sleep(250);
            try {
                const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
                target = list.find(t => t.type === 'page' && t.url.startsWith('file:'));
            } catch { }
        }
        if (!target) throw new Error('未能连接到页面（CDP 端口 ' + PORT + '）');

        // 2. 连 WebSocket
        ws = new WebSocket(target.webSocketDebuggerUrl);
        ws.onmessage = e => {
            const m = JSON.parse(e.data);
            if (m.id && pending.has(m.id)) {
                const { res, rej } = pending.get(m.id); pending.delete(m.id);
                m.error ? rej(new Error(m.error.message)) : res(m.result);
            }
        };
        await new Promise((res, rej) => { ws.onopen = res; ws.onerror = () => rej(new Error('WebSocket 连接失败')); });
        await send('Runtime.enable'); await send('Page.enable');

        // 3. 等实验室初始化完成
        const ready = await evaluate(`new Promise(res=>{const t0=Date.now();const t=setInterval(()=>{
            if(window.mycircuit&&window.cDispatch&&document.readyState==='complete'){clearInterval(t);res('ok')}
            else if(Date.now()-t0>25000){clearInterval(t);res('timeout')}},100)})`);
        if (ready !== 'ok') throw new Error('页面初始化超时（mycircuit 未就绪）');

        // 4. 按“打开文件”的同一路径注入电路
        const text = fs.readFileSync(circuitFile, 'utf8');
        const loaded = await evaluate(`(function(){
            mycircuit.deletecircuit();
            recovercircuit('demo', mycircuit, ${JSON.stringify(text)});
            var lines=[].slice.call(document.querySelectorAll('#demo div.div-line'));
            var bad=lines.filter(function(d){var p=d.querySelector('path.my-line');var s=p?p.getAttribute('d'):'';
                return !s||/NaN|undefined/.test(s);});
            var cAll=mycircuit.componentAll.filter(Boolean);
            var domComps=[].slice.call(document.querySelectorAll('#demo > div')).filter(function(d){return /^CP/.test(d.id)});
            var pinCount=cAll.reduce(function(a,c){return a+c.pinName.length},0);
            return {components:cAll.length, domComponents:domComps.length, lines:lines.length,
                    badLines:bad.length, badSample:bad.slice(0,3).map(function(d){var p=d.querySelector('path.my-line');return p&&p.getAttribute('d')}),
                    pins:pinCount, count:mycircuit.count,
                    sampleLines:lines.slice(0,3).map(function(d){var p=d.querySelector('path.my-line');return p.getAttribute('d')}),
                    types:cAll.map(function(c){return c.name+':'+c.id})};
        })()`);

        console.log('\n=== 无头加载验证 ===');
        console.log('存档文件      : ' + circuitFile);
        console.log('componentAll  : ' + loaded.components + ' 个元件, ' + loaded.pins + ' 个引脚');
        console.log('DOM 器件 div  : ' + loaded.domComponents);
        console.log('连接线        : ' + loaded.lines + ' 条（路径异常 ' + loaded.badLines + ' 条）');
        console.log('count 计数器  : ' + loaded.count);
        if (loaded.badSample.length) console.log('异常路径样本  : ' + JSON.stringify(loaded.badSample));
        if (loaded.sampleLines.length) console.log('路径样本      : ' + loaded.sampleLines.join(' | '));

        // 4b. 调用实验室自己的存档函数回存，与输入文件比对（格式正确性的最强证据）
        //     circuitdata() 按"器件顺序 + 引脚顺序"输出连线，所以连线顺序可能与输入不同，
        //     这里同时做逐字节比对与"语义比对"（器件段必须完全一致，连线集合必须一致）。
        const saved = await evaluate('circuitdata(mycircuit)');
        const same = saved === text;
        let semantic = false, detail = '';
        if (!same) {
            const cut = s => { const i = s.indexOf('&'), j = s.lastIndexOf('@'); return { comp: s.slice(0, i), lines: s.split('').length && s.slice(i + 1, j).split(',').filter(Boolean), count: s.slice(j + 1) }; };
            const A = cut(text), B = cut(saved);
            const sa = [...A.lines].sort(), sb = [...B.lines].sort();
            semantic = A.comp === B.comp && A.count === B.count && sa.length === sb.length && sa.every((v, i) => v === sb[i]);
            const onlyIn = sa.filter(v => !sb.includes(v)), onlyOut = sb.filter(v => !sa.includes(v));
            detail = '（器件段' + (A.comp === B.comp ? '一致' : '不一致') + '，连线段' + A.lines.length + '->' + B.lines.length +
                (onlyIn.length ? '，丢失 ' + onlyIn.slice(0, 3).join(' ') : '') + (onlyOut.length ? '，多出 ' + onlyOut.slice(0, 3).join(' ') : '') + '）';
        }
        console.log('回存比对      : ' + (same ? '与输入文件逐字节一致 ✅'
            : semantic ? '语义完全一致 ✅（连线顺序不同，实验室按器件/引脚顺序回存）' : '不一致 ⚠️ ' + detail));
        if (!semantic && !same) {
            let i = 0; while (i < saved.length && i < text.length && saved[i] === text[i]) i++;
            console.log('  首个差异位置 ' + i + ':');
            console.log('    输入: ...' + text.slice(Math.max(0, i - 30), i + 60));
            console.log('    回存: ...' + saved.slice(Math.max(0, i - 30), i + 60));
        }

        // 4c. 注入别名表（ref -> 实际器件id），供实验脚本使用
        const refsFile = optVal('refs');
        if (refsFile) {
            const refs = fs.readFileSync(refsFile, 'utf8');
            await evaluate('window.__REF = ' + refs + '; true');
        }

        // 4d. 运行实验脚本（在页面内驱动真实接口，返回 JSON）
        const scriptFile = optVal('script');
        if (scriptFile) {
            const code = fs.readFileSync(scriptFile, 'utf8');
            const result = await evaluate('(async function(){' + code + '})()');
            console.log('\n=== 实验脚本: ' + path.basename(scriptFile) + ' ===');
            if (result && result.report) {
                result.report.forEach(r => console.log('  ' + r));
                delete result.report;
            }
            console.log(JSON.stringify(result, null, 1));
        }

        let simResult = null;
        if (flag('sim')) {
            // 5. 用真实接口开电源 + 逐个翻转开关，观察结果是否沿连线传播到 LED
            simResult = await evaluate(`(function(){
                var rows=[];
                function ledPat(){return mycircuit.componentAll.filter(function(c){return c.name==='Led'})
                    .map(function(c){return c.pinValue[0]===2?'x':String(c.pinValue[0])}).join('');}
                function ledImgs(){return mycircuit.componentAll.filter(function(c){return c.name==='Led'})
                    .map(function(c){var d=document.getElementById(c.id);return (d.style.backgroundImage||'').indexOf('ledon')>=0?'1':'0'}).join('');}
                cDispatch.powerOn();
                rows.push({step:'开电源', led:ledPat(), icon:ledImgs()});
                var sws=mycircuit.componentAll.filter(function(c){return c.name==='Switch'});
                for (var i=0;i<sws.length;i++){
                    cDispatch.sourceTrigger(sws[i]);
                    rows.push({step:'开关'+sws[i].id+' 翻转', led:ledPat(), icon:ledImgs()});
                }
                return {rows:rows, runState:cDispatch.runState, switches:sws.length,
                        blocked:mycircuit.componentAll.filter(function(c){
                            return c.beReady&&c.beReady()===false;}).length};
            })()`);
            console.log('\n=== 功能仿真（开电源，依次翻转 ' + simResult.switches + ' 个开关） ===');
            console.log('  ' + '步骤'.padEnd(16) + 'LED引脚值    LED图标');
            for (const s of simResult.rows) {
                console.log('  ' + s.step.padEnd(16) + s.led.padEnd(12) + s.icon);
            }
            const patterns = new Set(simResult.rows.map(r => r.icon));
            console.log(`  共 ${simResult.rows.length} 个状态点，LED 图标出现 ${patterns.size} 种组合${patterns.size > 1 ? ' → 信号确实在传播' : ' → 无变化'}`);
            console.log(`  诊断: ${simResult.blocked} 个芯片因"必要输入尚未赋值"处于等待状态（属正常现象，需先给全部必要输入赋值）`);
        }

        // 6. 截图
        const shot = optVal('shot') || path.join(__dirname, 'out', path.basename(circuitFile).replace(/\.txt$/, '') + '.png');
        fs.mkdirSync(path.dirname(shot), { recursive: true });
        const cap = await send('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync(shot, Buffer.from(cap.data, 'base64'));
        console.log('\n截图: ' + shot);

        const ok = loaded.components > 0 && loaded.domComponents === loaded.components
            && loaded.lines > 0 && loaded.badLines === 0;
        console.log(ok ? '\n结果: 通过 ✅' : '\n结果: 未通过 ❌');
        await cleanup();
        process.exit(ok ? 0 : 2);
    } catch (e) {
        console.error('验证失败: ' + e.message);
        await cleanup();
        process.exit(1);
    }
})();
