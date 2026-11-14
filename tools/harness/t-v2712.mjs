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
        const rel = structuredClone(st.data.rel); rel.user.push({ name: 'Ellis', label: 'Old Friend', aff: 10, trust: 10 }); const q = structuredClone(st.data.contact); q.contacts.push({ name: 'Bot', status: 'active' }, { name: 'Doc', status: 'sleeping' }); await commit('contact', q, 'z');
        await commit('rel', rel, 'x');
        const ct = structuredClone(window.__SS_TEST__.api.app.current.state.data.contact); ct.contacts.push({ name: 'Corin', status: 'Busy with paperwork.' });
        await commit('contact', ct, 'y');
    });
    await sleep(200);
    const miss = await page.evaluate(async () => (await import('/ext/src/translate.js')).missingTr());
    check(miss.includes('Old Friend') && miss.includes('Busy with paperwork.'), `role · status message counted as text (${miss.length})`, JSON.stringify(miss));
    check(!miss.includes('active'), 'code value status:active still left alone');
    check(miss.includes('sleeping'), 'lowercase one-word status (sleeping) is translated', JSON.stringify(miss));
    await page.evaluate(() => { window.__SS_TEST__.api.app.openSheet('rel'); }); await sleep(300);
    const badge = await page.evaluate(() => document.querySelector('dialog [data-act="trfix"] .ss-badge')?.textContent ?? '');
    check(Number(badge) > 0, `🌐 button shows how many are left (${badge})`);
    await page.evaluate(async () => { const { translateMissing } = await import('/ext/src/translate.js'); await translateMissing(null); });
    await sleep(300);
    const left = await page.evaluate(async () => (await import('/ext/src/translate.js')).missingTr().length);
    const d = await page.evaluate(() => window.__st.chatMetadata.statussim.tr ?? {});
    check(left === 0 && d['Old Friend'] === '[ko]Old Friend', `translate-missing fills only what was left (left ${left})`);
    // 번역기가 영어 그대로 돌려주면: 다시 안 보내고 한 번 알림 · 남은 수에서 빠짐
    const st2 = await page.evaluate(async () => {
        const { commit } = await import('/ext/src/engine.js');
        const ct = structuredClone(window.__SS_TEST__.api.app.current.state.data.contact); ct.contacts.push({ name: 'Zed', status: 'Close Sanctuary Keeper' }); await commit('contact', ct, 'w');
        let calls = 0; globalThis.translate = async (t) => { calls++; return t; };
        const warns = []; const o = toastr.warning; toastr.warning = (m) => warns.push(m);
        const T = await import('/ext/src/translate.js');
        await T.translateMissing(null); const c1 = calls; await T.translateMissing(null);
        toastr.warning = o;
        return { c1, c2: calls, warns: warns.length, left: T.missingTr().length };
    });
    // v2.7.18: 그대로 돌아온 글은 실리 번역기로 다시 안 보내지만, 「남은 글」에는 계속 센다 (번역 모델로 넘길 기회를 주려고)
    check(st2.c1 > 0 && st2.c2 === st2.c1 && st2.warns === 0 && st2.left > 0, `identity result: not resent to the free translator, no popup/warning (v2.7.19), still counted as left (${JSON.stringify(st2)})`);
    // 화면만 번역이면 키 설명에 한국어가 없다
    const ko = await page.evaluate(async () => { const E = await import('/ext/src/engine.js'); const { getMeta } = await import('/ext/src/core.js'); return (E.tagKeysFor(getMeta()).join(' ').match(/[가-힣]+/g) ?? []); });
    check(!ko.length, `no Korean in key hints when English storage (${ko.join(',')})`);
    // 팁: 칸에서 뭔가 해도 접속당 1번
    const n = await page.evaluate(async () => {
        const T = await import('/ext/src/tips.js'); const s = window.__st.extensionSettings.statussim; s.hintAt = 0; s.hintDay = null; s.hintSeen = {};
        const o = Math.random; Math.random = () => 0; let k = 0; const on = window.__SS_TEST__.api.app.notify; window.__SS_TEST__.api.app.notify = (x) => { if (x.kind === 'hint') k++; };
        for (let i = 0; i < 6; i++) { T.hintAfterAction('rel'); await new Promise(r => setTimeout(r, 1600)); }
        Math.random = o; window.__SS_TEST__.api.app.notify = on; return k;
    });
    check(n === 1, `tips at most once per session (${n})`);
} finally { if (logs.length) console.log(logs.filter(l => !/404/.test(l)).slice(0, 5).join('\n')); await close(); }
