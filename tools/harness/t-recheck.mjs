// 페이블 지적 다시 확인 (v2.7.17): 설렘 실제 확률 · 연인 단계 없는 세계 · 편지 답장 갇힘 · 저장 묶음
import { open, makeStatus, sleep, check } from './lib.mjs';
const { page, logs, close } = await open();
try {
    await makeStatus(page, ['profile', 'rel', 'contact']);
    await page.evaluate(() => window.__addUser('hi')); await page.evaluate(() => window.__addAI('x\n<meatball>\naff: Leon +30\ntrust: Leon +40\n</meatball>'));
    await sleep(200);
    const r = await page.evaluate(async () => {
        const E = await import('/ext/src/engine.js');
        const s = window.__st.extensionSettings.statussim; s.romSpark = true; s.romSparkPct = 12;
        const app = window.__SS_TEST__.api.app, st = app.current.state;
        let n = 0; const N = 600;
        for (let t = 0; t < N; t++) if (/heart-fluttering/.test(E.buildInjection({ ...app.current, state: { ...st, turn: t } }).romance ?? '')) n++;
        // 연인 단계 없는 세계관
        const rel = structuredClone(st.data.rel); rel.stages = [{ name: 'Stranger', at: -100, trust: -100, unlock: '' }, { name: 'Ally', at: 0, trust: 0, unlock: '' }, { name: 'Sworn Friend', at: 20, trust: 30, unlock: '' }];
        s.romSparkPct = 100;
        const st2 = { ...st, turn: 0, data: { ...st.data, rel } };
        let msg = ''; for (let t = 0; t < 8 && !msg; t++) { const x = E.buildInjection({ ...app.current, state: { ...st2, turn: t } }).romance ?? ''; if (/heart-fluttering/.test(x)) msg = x; }
        s.romSpark = false;
        return { rate: n / N, msg };
    });
    check(r.rate > 0.06 && r.rate < 0.12, `spark 12% → real rate with 3-turn rest ≈ 9% (${(r.rate * 100).toFixed(1)}%)`);
    check(/friendship only/i.test(r.msg), 'world without a lover stage → friendship-only spark');
    // 간단 모드: 예전에 부친 편지의 답장이 말풍선에서 열린다
    const lt = await page.evaluate(async () => {
        const { commit } = await import('/ext/src/engine.js'); const app = window.__SS_TEST__.api.app;
        const ct = structuredClone(app.current.state.data.contact); ct.mode = 'letter'; ct.contacts.push({ name: 'Leon' });
        ct.threads.Leon = [{ id: 'm1', from: 'me', text: 'hi', at: 0 }, { id: 'p1', from: 'them', text: '', pending: true, at: 0, arrive: 0 }];
        await commit('contact', ct, 'x');
        window.__ai = () => 'Dear you, thanks.';
        app.openSheet('contact'); await new Promise(r => setTimeout(r, 300));
        const el = document.querySelector('dialog .ss-panel'); el._ss.ui = { who: 'Leon' }; app.renderPanel(el);
        const b = el.querySelector('[data-act="lopen"]'); if (!b) return 'no button';
        b.dispatchEvent(new MouseEvent('click', { bubbles: true })); await new Promise(r => setTimeout(r, 800));
        return app.current.state.data.contact.threads.Leon.map(m => (m.pending ? 'P' : m.text)).join('|');
    });
    check(/thanks/.test(lt), `pending letter reply can be opened in simple mode (${lt})`);
} finally { if (logs.length) console.log(logs.filter(l => !/404/.test(l)).slice(0, 5).join('\n')); await close(); }
