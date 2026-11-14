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
    check(sparks >= 1 && sparks <= 3, `spark happens but rests between (${sparks}/8 turns at 100%)`);
    check(pushes >= 1 && pushes <= 2, `story push happens but rests between (${pushes}/8)`);
    const one = r.out.find(x => /heart-fluttering/.test(x)) ?? '';
    check(/Leon/.test(one) && /(NOT|not close yet|barely|no romantic|friendship)/i.test(one), 'spark names the person and keeps the stage limit', one.slice(0, 300));
    if (process.env.SHOW) console.log(one);
    check(!/RELATIONSHIP FACTS/.test(one), 'no facts header when only the spark line is sent');
    check(r.same, 'same turn → same roll (swipes agree)');
    check(!/heart-fluttering|new development/.test(r.off), 'off by default → nothing sent');
} finally { if (logs.length) console.log(logs.filter(l => !/404/.test(l)).slice(0, 5).join('\n')); await close(); }
