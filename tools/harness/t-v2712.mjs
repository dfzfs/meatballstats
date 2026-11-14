// v2.7.12: 화면만 번역 — 직업(role) · 상태 메시지(status) 같은 글도 번역 · 🌐에 「남은 글 번역하기」 · 팁 덜 자주
import { open, makeStatus, sleep, check } from './lib.mjs';
const { page, logs, close } = await open();
try {
    await makeStatus(page, ['profile', 'stats', 'rel', 'contact']);
    await page.evaluate(() => {
        globalThis.translate = async (text, lang) => text.split('\n').map(l => `[ko]${l}`).join('\n');
        const s = window.__st.extensionSettings.statussim; s.ssGenLang = 'enview'; s.trEngine = 'st'; s.trAuto = 'off';
    });
    await page.evaluate(async () => {
        const { commit } = await import('/ext/src/engine.js');
        const st = window.__SS_TEST__.api.app.current.state;
        const rel = structuredClone(st.data.rel); rel.user.push({ name: 'Law', label: 'Life Saver & Clown', aff: 10, trust: 10 }); const q = structuredClone(st.data.contact); q.contacts.push({ name: 'Bot', status: 'active' }); await commit('contact', q, 'z');
        await commit('rel', rel, 'x');
        const ct = structuredClone(st.data.contact); ct.contacts.push({ name: 'Sabo', status: 'Buried in treaty paperwork.' });
        await commit('contact', ct, 'y');
    });
    await sleep(200);
    const miss = await page.evaluate(async () => (await import('/ext/src/translate.js')).missingTr());
    check(miss.includes('Life Saver & Clown') && miss.includes('Buried in treaty paperwork.'), `role · status message counted as text (${miss.length})`, JSON.stringify(miss));
    check(!miss.includes('active'), 'code value status:active still left alone');
    await page.evaluate(() => { window.__SS_TEST__.api.app.openSheet('rel'); }); await sleep(300);
    const badge = await page.evaluate(() => document.querySelector('dialog [data-act="trfix"] .ss-badge')?.textContent ?? '');
    check(Number(badge) > 0, `🌐 button shows how many are left (${badge})`);
    await page.evaluate(async () => { const { translateMissing } = await import('/ext/src/translate.js'); await translateMissing(null); });
    await sleep(300);
    const left = await page.evaluate(async () => (await import('/ext/src/translate.js')).missingTr().length);
    const d = await page.evaluate(() => window.__st.chatMetadata.statussim.tr ?? {});
    check(left === 0 && d['Life Saver & Clown'] === '[ko]Life Saver & Clown', `translate-missing fills only what was left (left ${left})`);
    // 팁: 칸에서 뭔가 해도 접속당 1번
    const n = await page.evaluate(async () => {
        const T = await import('/ext/src/tips.js'); const s = window.__st.extensionSettings.statussim; s.hintAt = 0; s.hintDay = null; s.hintSeen = {};
        const o = Math.random; Math.random = () => 0; let k = 0; const on = window.__SS_TEST__.api.app.notify; window.__SS_TEST__.api.app.notify = (x) => { if (x.kind === 'hint') k++; };
        for (let i = 0; i < 6; i++) { T.hintAfterAction('rel'); await new Promise(r => setTimeout(r, 1600)); }
        Math.random = o; window.__SS_TEST__.api.app.notify = on; return k;
    });
    check(n === 1, `tips at most once per session (${n})`);
} finally { if (logs.length) console.log(logs.filter(l => !/404/.test(l)).slice(0, 5).join('\n')); await close(); }
