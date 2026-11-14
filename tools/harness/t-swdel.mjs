// 스와이프 삭제 뒤에도 그 답에 묶인 행동(구매 · 이동 …)이 남는가 · 연결 프로필 실패 때 다시 보내지 않는가 · 감시자 하나로 칩 되살리기
import { open, makeStatus, sleep, check } from './lib.mjs';
const { page, logs, close } = await open();
try {
    await makeStatus(page, ['profile', 'stats', 'wallet', 'rel', 'map', 'calendar']);
    const r = await page.evaluate(async () => {
        const { addAdjust } = await import('/ext/src/engine.js');
        const ev = SillyTavern.getContext().eventSource, st = window.__st, app = window.__SS_TEST__.api.app;
        const cash = () => app.current?.state?.data?.wallet?.cash;
        const wait = (ms) => new Promise(r => setTimeout(r, ms));
        const meta = () => st.chatMetadata[Object.keys(st.chatMetadata)[0]];
        await window.__addUser('go'); const i = await window.__addAI('v0');
        const m = st.chat[i];
        // 진짜 실리처럼 스와이프마다 생성 시각이 다르다
        const swipeTo = async (sid, text) => {
            m.swipe_info[m.swipe_id] = { ...(m.swipe_info[m.swipe_id] ?? {}), extra: structuredClone(m.extra) }; m.swipes[m.swipe_id] = m.mes;
            if (text) { const g = new Date(Date.now() + sid * 7777); m.swipes[sid] = text; m.swipe_info[sid] = { send_date: m.send_date, gen_started: g, gen_finished: g, extra: {} }; }
            m.swipe_id = sid; m.mes = m.swipes[sid]; m.extra = structuredClone(m.swipe_info[sid]?.extra ?? {});
            await ev.emit('message_swiped', i); await wait(150);
        };
        const del = async (sid) => {
            m.swipes.splice(sid, 1); m.swipe_info.splice(sid, 1);
            const cur = m.swipe_id === sid ? Math.min(sid, m.swipes.length - 1) : m.swipe_id > sid ? m.swipe_id - 1 : m.swipe_id;
            m.swipe_id = cur; m.mes = m.swipes[cur];
            await ev.emit('message_swipe_deleted', { messageId: i, swipeId: sid, newSwipeId: cur }); await wait(250);
        };
        const base = cash();
        await swipeTo(1, 'v1'); await addAdjust({ ops: [['cash', '+7']], label: 'on swipe 1' }); await wait(100);
        await swipeTo(2, 'v2'); await addAdjust({ ops: [['cash', '+50']], label: 'on swipe 2' }); await wait(100);
        const on2 = cash();
        await del(1); const afterMid = cash();            // 가운데 스와이프 삭제 (+7 의 스와이프) → 지금 스와이프는 2 → 1
        await del(0); const afterFirst = cash();          // 첫 스와이프 삭제 → 열쇠가 바뀜 · 지금 스와이프는 1 → 0
        const ans = meta().adjust.map(a => a.an);
        // 저장 → 다시 읽어도 그대로
        await window.__reload?.(); await wait(400); const afterReload = cash();
        return { base, on2, afterMid, afterFirst, afterReload, ans };
    });
    check(r.on2 === r.base + 50, `action counts on its own swipe (${r.base} → ${r.on2})`);
    check(r.afterMid === r.on2, `deleting an earlier swipe keeps the action (${r.afterMid})`);
    check(r.afterFirst === r.on2, `deleting the first swipe keeps the action (${r.afterFirst})`);
    check(r.afterReload === r.on2, `still there after reload (${r.afterReload})`);
    check(r.ans.some(a => /\|x$/.test(a)) && r.ans.some(a => /\|0$/.test(a)), `deleted swipe's action is parked, kept one is renumbered (${JSON.stringify(r.ans)})`);

    // 연결 프로필이 실패하면: 한 번만 보내고 · 메인 연결로 넘기지 않고 · 오류로 끝난다
    const f = await page.evaluate(async () => {
        const c = SillyTavern.getContext(), st = window.__st;
        const key = Object.keys(st.extensionSettings).find(k => st.extensionSettings[k]?.aiProfile !== undefined);
        const set = st.extensionSettings[key];
        st.extensionSettings.connectionManager = { profiles: [{ id: 'p1', name: 'Cheap', model: 'm' }] };
        set.aiProfile = 'p1';
        let sent = 0, raw = 0;
        const svc = c.ConnectionManagerRequestService, old = svc.sendRequest, oldRaw = c.generateRaw;
        svc.sendRequest = async () => { sent++; throw new Error('429 Too Many Requests'); };
        const { aiGenerate } = await import('/ext/src/prompts.js');
        const ctxProto = SillyTavern.getContext; let err = '';
        SillyTavern.getContext = () => { const x = ctxProto(); x.generateRaw = async () => { raw++; return 'main'; }; return x; };
        try { await aiGenerate('news', 'sys', 'user prompt', 100); } catch (e) { err = String(e.message); }
        SillyTavern.getContext = ctxProto; svc.sendRequest = old; set.aiProfile = '';
        return { sent, raw, err, def: set.aiFallbackMain };
    });
    check(f.sent === 1 && f.raw === 0 && /실패/.test(f.err) && f.def === false, `profile failure stops: sent ${f.sent}, main ${f.raw}, "${f.err.slice(0, 40)}"`);

    // 감시자 하나: 다른 확장이 본문을 통째로 다시 그려 칩 자리가 지워져도 돌아온다
    const h = await page.evaluate(async () => {
        const wait = (ms) => new Promise(r => setTimeout(r, ms));
        await window.__addUser('x'); const i = await window.__addAI('Leon.\n<meatball>\ncash: -5\n</meatball>'); await wait(300);
        const el = document.querySelector(`#chat .mes[mesid="${i}"] .mes_text`);
        const before = el.querySelectorAll('.ss-mchip').length;
        el.innerHTML = '<p>translated</p>'; await wait(600);
        const after = document.querySelector(`#chat .mes[mesid="${i}"]`).querySelectorAll('.ss-mchip').length;
        return { before, after };
    });
    check(h.before > 0 && h.after > 0, `chips come back after another extension redraws the text (${h.before} → ${h.after})`);
    const errs = logs.filter(l => /error/i.test(l) && !/429/.test(l));
    check(!errs.length, `no console errors (${errs.length})`, errs.slice(0, 5).join('\n'));
} finally { await close(); }
