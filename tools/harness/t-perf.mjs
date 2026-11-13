// 🏎 긴 채팅 부하: 메시지 N개 · 칩 · 상태창을 열어 둔 채 한 턴 처리 시간 (EXT_DIR로 옛 판과 비교)
import { open, makeStatus, sleep } from './lib.mjs';
const N = Number(process.env.N || 300);
const { page, logs, close } = await open();
try {
    await makeStatus(page);
    await page.evaluate(async (N) => {
        const st = window.__st;
        let t0 = Date.UTC(2026, 0, 1);
        const ops = ['cash: -12', '체력: -3', 'aff: Leon +1', 'item: +Bread', 'loc: 시장', 'time: 저녁', 'quest: Errand | 진행', 'memo: remember the red door'];
        for (let i = 0; i < N; i++) {
            st.chat.push({ name: 'Me', is_user: true, mes: `turn ${i}`, send_date: String(t0 += 60000), swipe_id: 0, swipes: [`turn ${i}`], extra: {} });
            const body = `Story ${i}. `.repeat(30) + `\n<meatball>\n${ops[i % ops.length]}\n${ops[(i * 3) % ops.length]}\n</meatball>`;
            st.chat.push({ name: 'Leon', is_user: false, mes: body, send_date: String(t0 += 60000), swipe_id: 0, swipes: [body], swipe_info: [{ extra: {} }], extra: {} });
        }
        window.__renderAll();
        await SillyTavern.getContext().eventSource.emit('chat_changed');
    }, N);
    await sleep(500);
    if (process.env.TR) await page.evaluate(async () => {
        window.__st.extensionSettings.statussim.ssGenLang = 'enview';
        window.__st.extensionSettings.statussim.trAuto = 'off';
        const { getMeta } = await import('/ext/src/core.js');
        const d = (getMeta().tr ??= {});
        for (let i = 0; i < 2500; i++) d[i % 3 ? `Some long english description sentence number ${i} about the world and its people` : `Name${i}`] = i % 3 ? `긴 설명 문장 ${i}` : `이름${i}`;
        d['Gold'] = '골드'; d['Market'] = '시장';
    });
    await page.evaluate(() => { window.__SS_TEST__.api.app.openSheet('home'); });
    await sleep(300);
    const r = await page.evaluate(async () => {
        const api = window.__SS_TEST__.api;
        const t = (fn, n = 10) => { const a = performance.now(); for (let k = 0; k < n; k++) fn(); return +((performance.now() - a) / n).toFixed(2); };
        const { compute, buildInjection } = await import('/ext/src/engine.js');
        const out = {};
        out.compute = t(() => compute());
        const r = compute();
        out.inject = t(() => buildInjection(r));
        out.refreshForce = t(() => api.refreshNow(), 5);
        out.decorate = t(() => api.decorateAll(), 10);
        const tr = await import('/ext/src/translate.js');
        out.translateView = t(() => { document.querySelectorAll('dialog .ss-panel').forEach(p => window.__SS_TEST__.api.app.renderPanel(p)); tr.translateView(); }, 5);
        // 실제 한 턴: 유저 메시지 + AI 답 이벤트 전체
        const a = performance.now();
        await window.__addUser('next');
        await window.__addAI('Leon walks.\n<meatball>\ncash: -1\n</meatball>');
        out.fullTurn = +(performance.now() - a).toFixed(2);
        out.mes = document.querySelectorAll('#chat .mes').length;
        return out;
    });
    console.log(JSON.stringify(r));
} finally { if (logs.length) console.log(logs.slice(0, 5).join('\n')); await close(); }
