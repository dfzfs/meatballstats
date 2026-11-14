// v2.7.16: 연락 간단 — 편지 세계도 바로 · 말풍선은 지우기 · 다시 받기만
import { open, makeStatus, sleep, check } from './lib.mjs';
const { page, logs, close } = await open();
try {
    await makeStatus(page, ['profile', 'contact']);
    const r = await page.evaluate(async () => {
        const { commit, inTransit } = await import('/ext/src/engine.js');
        const app = window.__SS_TEST__.api.app;
        const ct = structuredClone(app.current.state.data.contact); ct.mode = 'letter'; ct.contacts.push({ name: 'Leon' }); ct.threads.Leon = [{ id: 'a', from: 'them', text: 'hello', at: 0 }];
        await commit('contact', ct, 'x');
        window.__ai = () => 'reply line';
        app.openSheet('contact'); await new Promise(r => setTimeout(r, 300));
        const el = document.querySelector('dialog .ss-panel'); el._ss.ui = { who: 'Leon' }; app.renderPanel(el);
        const html = el.innerHTML;
        return { phone: !!el.querySelector('.ss-phone'), letter: !!el.querySelector('.ss-letters'), pin: !!el.querySelector('[data-act="cpin"]'), del: !!el.querySelector('[data-act="cmsgdel"]'), transit: inTransit(app.current.state).length };
    });
    check(r.phone && !r.letter, 'letter world shows chat bubbles in simple mode');
    check(!r.pin && r.del, 'bubbles only have delete / re-roll');
    const old = await page.evaluate(async () => { window.__st.extensionSettings.statussim.contactSimple = false; const app = window.__SS_TEST__.api.app; const el = document.querySelector('dialog .ss-panel'); el._ss.ui = { who: 'Leon' }; app.renderPanel(el); const v = !!el.querySelector('.ss-letters'); window.__st.extensionSettings.statussim.contactSimple = true; return v; });
    check(old, 'turning simple off brings back letters');
} finally { if (logs.length) console.log(logs.filter(l => !/404/.test(l)).slice(0, 5).join('\n')); await close(); }
