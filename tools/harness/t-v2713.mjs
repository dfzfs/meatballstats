// v2.7.13: ✨ 설렘 한 스푼 · 🎬 사건 한 스푼 — 단계에 맞는 문구 · 확률 · 쉬는 턴 · 같은 턴은 같은 결과
import { open, makeStatus, sleep, check } from './lib.mjs';
const { page, logs, close } = await open();
try {
    await makeStatus(page, ['profile', 'stats', 'rel', 'map']);
    await page.evaluate(() => window.__addUser('hi')); await page.evaluate(() => window.__addAI('Leon smiles.\n<meatball>\naff: Leon +20\ntrust: Leon +30\n</meatball>'));
    await sleep(200);
    const r = await page.evaluate(async () => {
        const E = await import('/ext/src/engine.js');
        const s = window.__st.extensionSettings.statussim; s.romSpark = true; s.romSparkPct = 100; s.storyPush = true; s.storyPushPct = 100;
        const app = window.__SS_TEST__.api.app;
        const st = app.current.state;
        const out = [];
        for (let t = 0; t < 8; t++) { const rr = { ...app.current, state: { ...st, turn: 100 + t } }; out.push(E.buildInjection(rr).romance ?? ''); }
        const again = E.buildInjection({ ...app.current, state: { ...st, turn: 100 } }).romance;
        s.romSpark = false; s.storyPush = false;
        const off = E.buildInjection(app.current).romance ?? '';
        return { out, same: again === out[0], off, stage: st.data.rel.user.find(x => x.name === 'Leon')?.stage };
    });
    const sparks = r.out.filter(x => /heart-fluttering/.test(x)).length, pushes = r.out.filter(x => /new development/.test(x)).length;
    check(sparks === 2, `spark at 100%: every 4th turn (rest 3) (${sparks}/8)`);
    check(pushes >= 1 && pushes <= 2, `story push at 100%: every 5th turn (rest 4) (${pushes}/8)`);
    const one = r.out.find(x => /heart-fluttering/.test(x)) ?? '';
    check(/Leon/.test(one) && /(NOT|not close yet|barely|no romantic|friendship)/i.test(one), 'spark names the person and keeps the stage limit', one.slice(0, 300));
    if (process.env.SHOW) console.log(one);
    check(!/RELATIONSHIP FACTS/.test(one), 'no facts header when only the spark line is sent');
    check(r.same, 'same turn → same roll (swipes agree)');
    check(!/heart-fluttering|new development/.test(r.off), 'off by default → nothing sent');
    // v2.7.15: 스트리밍 중엔 마지막 답에 칩이 없다가 끝나면 붙는다 · 인물 줄에 「등장 강요 안 함」
    const sm = await page.evaluate(async () => {
        document.body.dataset.generating = 'true';
        await window.__addUser('go'); await window.__addAI('walk\n<meatball>\ncash: -1\n</meatball>');
        await new Promise(r => setTimeout(r, 200));
        const last = () => [...document.querySelectorAll('#chat .mes')].at(-1);
        const during = !!last().querySelector('.ss-slot')?.firstChild;
        delete document.body.dataset.generating;
        await SillyTavern.getContext().eventSource.emit('generation_ended');
        await new Promise(r => setTimeout(r, 300));
        const after = !!last().querySelector('.ss-slot')?.firstChild;
        const E = await import('/ext/src/engine.js');
        return { during, after, people: E.buildInjection(window.__SS_TEST__.api.app.current).people };
    });
    check(!sm.during && sm.after, `no chip flicker while streaming, chip after (${sm.during}/${sm.after})`);
    check(!sm.people || /does NOT mean being present/.test(sm.people), 'people list says listed ≠ present');
} finally { if (logs.length) console.log(logs.filter(l => !/404/.test(l)).slice(0, 5).join('\n')); await close(); }
