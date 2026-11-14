// v2.7.16: 연락 간단 — 편지 세계도 바로 · 말풍선은 지우기 · 다시 받기만
import { open, makeStatus, sleep, check } from './lib.mjs';
const { page, logs, close } = await open();
try {
    await makeStatus(page, ['profile', 'contact']);
    const r = await page.evaluate(async () => {
        const { commit, inTransit } = await import('/ext/src/engine.js');
        const app = window.__SS_TEST__.api.app;
        window.__st.extensionSettings.statussim.contactSimple = true; // v2.7.18: 간단 모드는 기본 꺼짐 → 직접 켜고 시험
        const ct = structuredClone(app.current.state.data.contact); ct.mode = 'letter'; ct.contacts.push({ name: 'Leon' }); ct.threads.Leon = [{ id: 'a', from: 'them', text: 'hello', at: 0 }];
        await commit('contact', ct, 'x');
        window.__ai = () => 'reply line';
        app.openSheet('contact'); await new Promise(r => setTimeout(r, 300));
        const el = document.querySelector('dialog .ss-panel'); el._ss.ui = { who: 'Leon' }; app.renderPanel(el);
        const html = el.innerHTML;
        return { phone: !!el.querySelector('.ss-phone'), letter: !!el.querySelector('.ss-letters'), pin: !!el.querySelector('[data-act="cpin"]'), del: !!el.querySelector('[data-act="cmsgdel"]'), transit: inTransit(app.current.state).length };
    });
    check(r.phone && !r.letter, 'letter world shows chat bubbles in simple mode');
    check(r.pin && r.del, 'v2.7.18: simple mode keeps bubble actions (pin · delete)');
    const old = await page.evaluate(async () => { window.__st.extensionSettings.statussim.contactSimple = false; const app = window.__SS_TEST__.api.app; const el = document.querySelector('dialog .ss-panel'); el._ss.ui = { who: 'Leon' }; app.renderPanel(el); const v = !!el.querySelector('.ss-letters'); window.__st.extensionSettings.statussim.contactSimple = true; return v; });
    check(old, 'turning simple off brings back letters');
    // 번역: 고정 이름을 넣으면 번역기가 그대로 돌려줄 때 → 이름 없이 다시 · 반쯤 된 옛 번역은 다시 · 그래도 안 되면 번역 모델로 (물어보고)
    const tr = await page.evaluate(async () => {
        const s = window.__st.extensionSettings.statussim; s.ssGenLang = 'enview'; s.trEngine = 'st'; s.trAuto = 'off'; s.trRules = 'affection = 애정';
        const { commit } = await import('/ext/src/engine.js'); const { getMeta } = await import('/ext/src/core.js');
        const app = window.__SS_TEST__.api.app;
        const ct = structuredClone(app.current.state.data.contact); ct.contacts.push({ name: 'Mo', status: 'Open romantic affection and mutual commitment.' }, { name: 'Jo', status: 'Life Saver & Close Sanctuary' }); await commit('contact', ct, 'y');
        getMeta().tr = { ...(getMeta().tr ?? {}), 'Open romantic affection and mutual commitment.': 'Open romantic 애정 and mutual commitment.' };
        // 가짜 구글: 한글이 섞이면 그대로 · 「Life Saver」는 고유명사라 그대로 · 나머지는 [ko]
        globalThis.translate = async (t) => t.split('\n').map(l => (/[가-힣]/.test(l) || /Life Saver/.test(l) ? l : `[ko]${l}`)).join('\n');
        window.__ai = () => JSON.stringify({ list: ['생명의 은인 & 가까운 안식처'] });
        window.__autoPopup = 'ok';
        const T = await import('/ext/src/translate.js');
        await T.translateMissing(null);
        const d = getMeta().tr;
        return { a: d['Open romantic affection and mutual commitment.'], b: d['Life Saver & Close Sanctuary'] };
    });
    check(/^\[ko\]Open romantic 애정/.test(tr.a ?? ''), `mixed-language identity retried without names, names put back (${tr.a})`);
    check(tr.b === '생명의 은인 & 가까운 안식처', `what the translator can't change goes to the model after asking (${tr.b})`);
} finally { if (logs.length) console.log(logs.filter(l => !/404/.test(l)).slice(0, 5).join('\n')); await close(); }
