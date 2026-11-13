// v2.7.6: 골라 되돌리기 · 흥정 · 일하기 판정 · 번역 사전 정리
import { open, makeStatus, sleep, check } from './lib.mjs';
const { page, logs, close } = await open();
const S = (f, a) => page.evaluate(f, a);
const st = () => S(() => window.__SS_TEST__.api.app.current.state);
try {
    await makeStatus(page, ['profile', 'stats', 'wallet', 'shop', 'rel', 'map', 'calendar', 'quest', 'home']);
    await S(() => window.__addUser('hi')); await S(() => window.__addAI('ok')); await sleep(100);
    // 골라 되돌리기: 세 번 편집 후 가운데 것만
    for (const [o, l] of [['cash: +10', 'A'], ['cash: +20', 'B'], ['cash: +40', 'C']]) await S(async ([o, l]) => { const { addAdjust } = await import('/ext/src/engine.js'); const [k, v] = o.split(': '); await addAdjust({ ops: [[k, v]], label: l }); }, [o, l]);
    const c1 = (await st()).data.wallet.cash;
    await S(() => { window.__SS_TEST__.api.app.openSheet('manage'); }); await sleep(300);
    check((await page.$$('dialog .ss-undolist [data-act="undoat"]')).length >= 3, 'undo list shows edits');
    const tB = await S(() => (window.__st.chatMetadata.statussim.adjust.find(a => a.label === 'B')).t);
    await S(() => { document.querySelector('dialog .ss-undolist').open = true; }); await page.click(`dialog [data-act="undoat"][data-arg="${tB}"]`); await sleep(400);
    check((await st()).data.wallet.cash === c1 - 20, `only B undone (${c1} → ${(await st()).data.wallet.cash})`);
    await S(() => document.querySelector('dialog .popup-button-ok').click()); await sleep(150);
    // 흥정
    await S(async () => { const { commit } = await import('/ext/src/engine.js'); await commit('shop', { shops: [{ name: 'Market', desc: '', place: '', items: [{ name: 'Rope', price: 100, desc: '', kind: 'item', stock: -1 }] }] }, ''); });
    await S(() => { window.__SS_TEST__.api.app.openSheet('shop'); }); await sleep(300);
    await page.click('dialog [data-act="haggle"]'); await sleep(300);
    const h = await S(() => Object.values(window.__st.chatMetadata.statussim.haggle ?? {})[0]);
    check([0.7, 0.85, 1, 1.1].includes(h), `haggle stored (${h})`);
    check(await page.$eval('dialog [data-act="haggle"]', b => b.disabled), 'haggle once per day');
    const cash0 = (await st()).data.wallet.cash;
    await page.click('dialog [data-act="buy"]'); await sleep(300);
    check((await st()).data.wallet.cash === cash0 - Math.round(100 * h), `bought at haggled price (${cash0} → ${(await st()).data.wallet.cash})`);
    await S(() => document.querySelector('dialog .popup-button-ok').click()); await sleep(150);
    // 일하기 판정
    await S(async () => { const { commit } = await import('/ext/src/engine.js'); const w = structuredClone(window.__SS_TEST__.api.app.current.state.data.wallet); w.jobs = [{ name: 'Porter', pay: 40, effect: '' }]; await commit('wallet', w, ''); });
    const c2 = (await st()).data.wallet.cash;
    await S(() => { window.__SS_TEST__.api.app.openSheet('wallet'); }); await sleep(300);
    await page.click('dialog [data-act="mwork"]'); await sleep(300);
    const got = (await st()).data.wallet.cash - c2;
    check([60, 40, 20, 0].includes(got), `job pay judged (+${got})`);
    await S(() => document.querySelector('dialog .popup-button-ok').click()); await sleep(150);
    // 번역 사전 정리
    await S(async () => { const { getMeta } = await import('/ext/src/core.js'); window.__st.extensionSettings.statussim.ssGenLang = 'enview'; const m = getMeta(); m.tr = { Rope: '밧줄', 'Old Sword We Sold Long Ago': '옛날 칼', Porter: '짐꾼' }; m.trLock = { 'Locked Thing': true }; m.tr['Locked Thing'] = '고정'; });
    const n = await S(async () => (await import('/ext/src/translate.js')).pruneTr());
    const left = await S(() => Object.keys(window.__st.chatMetadata.statussim.tr));
    check(n === 1 && left.includes('Rope') && left.includes('Locked Thing') && !left.includes('Old Sword We Sold Long Ago'), `prune removed only unused (${left})`);
} finally { console.log(logs.join('\n')); await close(); }
