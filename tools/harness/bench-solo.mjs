// 「수치 기능만 켠 미트볼」 vs 「수치만 있는 가상의 단독 확장」 vs 「확장 없음」 — 폰 흉내(CPU 4배 느리게)
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import { serve } from './server.mjs';
const RATE = Number(process.env.RATE || 4), HIST = Number(process.env.HIST || 120), TURNS = 20;
const srv = await serve(0); const port = srv.address().port;
const browser = await chromium.launch({ executablePath: process.env.PW_CHROME || undefined });
async function run(mode, light = false) {
    const page = await browser.newPage({ viewport: { width: 1100, height: 900 } });
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Performance.enable'); await cdp.send('Emulation.setCPUThrottlingRate', { rate: RATE });
    await page.goto(`http://127.0.0.1:${port}/harness/bench.html?mode=${mode === 'none' ? '' : mode}`);
    await page.waitForFunction(() => window.__ready === true, null, { timeout: 60000 });
    const loadMs = await page.evaluate(() => window.__loadMs);
    if (mode === 'meatball') await page.evaluate(async (light) => {
        const { skeleton, skeletonCore } = await import('/ext/src/skeleton.js');
        const { setBase } = await import('/ext/src/shell.js');
        const { MOD_IDS } = await import('/ext/src/core.js');
        await setBase({ core: skeletonCore('fantasy'), data: { stats: skeleton('stats', 'fantasy') } }, Object.fromEntries(MOD_IDS.map(id => [id, id === 'stats'])), 'normal');
        if (light) Object.assign(window.__st.extensionSettings.statussim, { memoOn: false, albumOn: false, peekOn: false, recordOn: false, daySummary: false, featureTips: false, showMascot: false, mascotBuddy: false, musicToast: false, freshDot: false, pipCheck: false });
    }, light);
    await page.evaluate(async (H) => {
        const st = window.__st; let t0 = Date.UTC(2026, 0, 1);
        for (let i = 0; i < H; i++) {
            st.chat.push({ name: 'Me', is_user: true, mes: `turn ${i}`, send_date: String(t0 += 60000), swipe_id: 0, swipes: ['x'], extra: {} });
            const b = `Story ${i}. `.repeat(40) + '\n<meatball>\n체력: -1\n</meatball>';
            st.chat.push({ name: 'Leon', is_user: false, mes: b, send_date: String(t0 += 60000), swipe_id: 0, swipes: [b], swipe_info: [{ extra: {} }], extra: {} });
        }
        window.__renderAll(); await SillyTavern.getContext().eventSource.emit('chat_changed');
    }, HIST);
    await page.waitForTimeout(1500);
    const M = async () => Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(m => [m.name, m.value]));
    // ① 한 턴 (내 메시지 + AI 답) — 뒤따라 도는 타이머까지 포함한 메인 스레드 시간
    let a = await M();
    for (let k = 0; k < TURNS; k++) { await page.evaluate(async (k) => { await window.__addUser(`go ${k}`); await window.__addAI(`Leon nods ${k}. `.repeat(40) + '\n<meatball>\n체력: -2\n</meatball>'); }, k); await page.waitForTimeout(150); }
    let b = await M();
    const turn = ((b.TaskDuration - a.TaskDuration) * 1000) / TURNS;
    const turnJS = ((b.ScriptDuration - a.ScriptDuration) * 1000) / TURNS;
    const turnStyle = ((b.RecalcStyleDuration - a.RecalcStyleDuration) * 1000) / TURNS, turnLayout = ((b.LayoutDuration - a.LayoutDuration) * 1000) / TURNS;
    // ② 답이 써지는 동안 (스트리밍 흉내: 마지막 답 글을 300번 바꿈)
    a = await M();
    await page.evaluate(async () => { const el = [...document.querySelectorAll('#chat .mes .mes_text')].at(-1); let s = ''; for (let i = 0; i < 300; i++) { s += 'word '; el.innerHTML = `<p>${s}</p>`; await new Promise(r => setTimeout(r, 0)); } });
    b = await M();
    const stream = (b.TaskDuration - a.TaskDuration) * 1000;
    // ③ 가만히 10초 (애니메이션 · 타이머)
    a = await M(); await page.waitForTimeout(10000); b = await M();
    const idle = (b.TaskDuration - a.TaskDuration) * 1000;
    await cdp.send('HeapProfiler.collectGarbage');
    const heap = (await cdp.send('Runtime.getHeapUsage')).usedSize / 1048576;
    const m = await M();
    await page.close();
    return { loadMs: Math.round(loadMs), turn: +turn.toFixed(1), turnJS: +turnJS.toFixed(1), style: +turnStyle.toFixed(1), layout: +turnLayout.toFixed(1), stream300: Math.round(stream), idle10s: Math.round(idle), heapMB: +heap.toFixed(1), nodes: m.Nodes, listeners: m.JSEventListeners };
}
const out = {};
for (const [k, mode, light] of [['none', 'none'], ['mini', 'mini'], ['meatball(수치만)', 'meatball'], ['meatball(수치만+부가끔)', 'meatball', true]]) {
    const rs = []; for (let r = 0; r < 3; r++) rs.push(await run(mode, light));
    out[k] = Object.fromEntries(Object.keys(rs[0]).map(key => [key, [...rs.map(x => x[key])].sort((p, q) => p - q)[1]])); // 3번 중 가운데 값
    console.log(k, JSON.stringify(out[k]));
}
await browser.close(); srv.close();
