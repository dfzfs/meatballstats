// 모든 칸을 켜고 탭마다 열어 보며 오류가 없는지 · 스와이프 · 설정 바꾸기
import { open, makeStatus, sleep, check } from './lib.mjs';
const { page, logs, close } = await open();
try {
    const all = await page.evaluate(async () => (await import('/ext/src/core.js')).MOD_IDS);
    await makeStatus(page, all);
    await page.evaluate(() => window.__addUser('hi'));
    await page.evaluate(() => window.__addAI('Leon.\n<meatball>\ncash: -5\naff: Leon +2\nloc: 시장\ndate: +1\nnews: Big storm | A storm hits the city\nmemo: meet at noon\nquest: Help | new\n</meatball>'));
    await sleep(200);
    const tabs = ['home', ...all.filter(x => x !== 'home'), 'base', 'manage', 'album', 'record'];
    await page.evaluate(() => { window.__SS_TEST__.api.app.openSheet('home'); });
    await sleep(300);
    const bad = [];
    for (const t of tabs) {
        const r = await page.evaluate(async (t) => {
            const el = document.querySelector('dialog .ss-panel'); if (!el) return 'no panel';
            el._ss.tab = t; el._ss.ui = {}; el._ss.mode = 'view';
            try { window.__SS_TEST__.api.app.renderPanel(el); } catch (e) { return String(e.stack || e); }
            return el.querySelector('.ss-body') ? '' : 'no body';
        }, t);
        if (r) bad.push(`${t}: ${r.slice(0, 200)}`);
    }
    check(!bad.length, `all ${tabs.length} tabs render`, bad.join('\n'));
    // 스와이프
    await page.evaluate(async () => { const st = window.__st; const m = st.chat.at(-1); m.swipes.push('Leon v2.\n<meatball>\ncash: -50\n</meatball>'); m.swipe_id = 1; m.mes = m.swipes[1]; m.swipe_info.push({ extra: {} }); await SillyTavern.getContext().eventSource.emit('message_swiped', st.chat.length - 1); });
    await sleep(300);
    check(await page.evaluate(() => window.__SS_TEST__.api.app.current.state.data.wallet.cash) === 50, 'swipe recalculates (100 → 50)');
    // 설정 칸 모든 스위치 바꿔 보기
    await page.evaluate(() => document.body.classList.add('show-settings'));
    const n = await page.evaluate(() => { let k = 0; for (const i of document.querySelectorAll('#ss-settings input[type=checkbox][data-s]')) { i.click(); i.click(); k++; } return k; });
    await sleep(300);
    check(n > 40, `toggled ${n} switches twice without errors`);
    await page.click('#ss-settings [data-s-act="lightall"]'); await sleep(300);
    check(await page.evaluate(() => window.__st.extensionSettings.statussim.albumOn === false && window.__st.extensionSettings.statussim.memoOn === false), '부가 기능 한 번에 끄기');
    const errs = logs.filter(l => /error/i.test(l) && !/favicon|404|Failed to load resource/.test(l));
    check(!errs.length, 'no console errors', errs.slice(0, 5).join('\n'));
} finally { await close(); }
