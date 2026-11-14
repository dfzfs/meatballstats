// 탭을 직접 고친 것(AI로 수정 · 직접 편집 · 다시 생성)은 그 앞 답을 리롤해도 남는다 · 구매 같은 행동은 리롤하면 되감긴다
import { open, makeStatus, sleep, check } from './lib.mjs';
const { page, logs, close } = await open();
try {
    await makeStatus(page, ['profile', 'stats', 'wallet', 'rel', 'map', 'calendar']);
    const r = await page.evaluate(async () => {
        const { commit, addAdjust } = await import('/ext/src/engine.js'); const st = window.__st, app = window.__SS_TEST__.api.app, ev = SillyTavern.getContext().eventSource;
        const wait = (ms) => new Promise(r => setTimeout(r, ms));
        await window.__addUser('hi'); const i = await window.__addAI('A0'); await wait(200);
        const nd = structuredClone(app.current.state.data.stats); nd.bars.push({ name: '광기', cur: 10, max: 50 });
        await commit('stats', nd, '💬 수치 수정: 광기 추가', { keep: true }); // 탭 「AI로 수정」과 같은 길
        await addAdjust({ ops: [['cash', '+30']], label: '구매' }); await wait(200);
        const edited = [app.current.state.data.stats.bars.length, app.current.state.data.wallet.cash];
        const m = st.chat[i];
        m.swipe_info[0] = { ...(m.swipe_info[0] ?? {}), extra: structuredClone(m.extra) }; m.swipes[0] = m.mes;
        const g = new Date(Date.now() + 9999); m.swipes[1] = 'A0b'; m.swipe_info[1] = { send_date: m.send_date, gen_started: g, gen_finished: g, extra: {} }; m.swipe_id = 1; m.mes = 'A0b'; m.extra = {};
        await ev.emit('message_swiped', i); await wait(200);
        return { edited, rerolled: [app.current.state.data.stats.bars.length, app.current.state.data.wallet.cash] };
    });
    check(r.rerolled[0] === r.edited[0], `tab edit survives a reroll (${r.edited[0]} → ${r.rerolled[0]} bars)`);
    check(r.rerolled[1] === r.edited[1] - 30, `story action is still rewound (${r.edited[1]} → ${r.rerolled[1]})`);
    // 2.7.21 로 이미 묶인 옛 기록도 풀림
    const r2 = await page.evaluate(async () => {
        const st = window.__st, app = window.__SS_TEST__.api.app; const meta = st.chatMetadata[Object.keys(st.chatMetadata)[0]];
        const a = meta.adjust.find(x => /광기/.test(x.label)); a.an = 'a:Leon:1|0'; delete a.keep; delete meta.editFix;
        app.refreshNow(); await new Promise(r => setTimeout(r, 200));
        return { an: a.an ?? null, bars: app.current.state.data.stats.bars.length };
    });
    check(!r2.an && r2.bars === r.edited[0], `old bound tab edit is unbound once (${JSON.stringify(r2)})`);
    check(!logs.length, `no console errors (${logs.length})`, logs.slice(0, 3).join('\n'));
} finally { await close(); }
