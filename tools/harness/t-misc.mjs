// 🔴 빨간 점 · 기능 끄기(메모 · 앨범 · 속마음) · 🗑 버린 물건 「이제 없음」 · 🏎 부하 재기
import { open, makeStatus, sleep, check } from './lib.mjs';
const { page, logs, close } = await open();
const S = (f) => page.evaluate(f);
try {
    await makeStatus(page);
    await S(() => window.__addUser('hello'));
    await S(() => window.__addAI('Leon hands you a coin.\n<meatball>\ncash: +50\n체력: -10\nitem: +Old Lantern\n</meatball>'));
    await sleep(200);
    // 🔴
    check(await page.$('#ss-hud .ss-fresh, #ss-hud .ss-t-dot') !== null, 'HUD has a red dot');
    check(!!(await page.$('#ss-side .t-cash .ss-t-dot')) && !!(await page.$('#ss-side .t-bars .ss-t-dot')), 'side mini: cash tile dot + gauge tile dot');
    await S(() => { window.__SS_TEST__.api.app.openSheet('wallet'); }); await sleep(300);
    check((await page.$$('dialog .ss-fresh')).length >= 2, `wallet tab dots (cash + lantern): ${(await page.$$('dialog .ss-fresh')).length}`);
    const tabDots = await page.$$eval('dialog .ss-tabs button', b => b.filter(x => x.querySelector('.ss-fresh')).map(x => x.textContent.trim()));
    check(tabDots.some(t => /수치/.test(t)) && !tabDots.some(t => /재산/.test(t)), `stats tab has dot, opened wallet tab doesn't: ${tabDots}`);
    await page.screenshot({ path: '/tmp/fresh.png' });
    await S(() => document.querySelector('dialog .popup-button-ok').click()); await sleep(200);
    // 다음 답에서 바뀐 게 없으면 점이 사라짐
    await S(() => window.__addUser('ok'));
    await S(() => window.__addAI('Leon nods.\n<meatball>\nloc: 시장\n</meatball>'));
    await sleep(200);
    check(await page.$('#ss-hud .ss-chip .ss-fresh') === null, 'cash dot gone after next reply');
    // 🗑 창고 → 버리기 → 「이제 없음」
    await S(async () => { const { addAdjust } = await import('/ext/src/engine.js'); await addAdjust({ ops: [['decor', '+Rocking Chair'], ['decor', '+Blue Rug']], label: 'x' }); });
    await S(async () => { const { addAdjust } = await import('/ext/src/engine.js'); await addAdjust({ ops: [['_trash', 'Rocking Chair'], ['_trash', 'Blue Rug']], label: 'trash' }); });
    await sleep(100);
    await S(() => window.__addUser('look around'));
    await sleep(100);
    const inj = await S(() => JSON.stringify(window.__prompts));
    check(/No longer owned by [^"]*Rocking Chair, Blue Rug/.test(inj), 'injection tells the AI the chair & rug are gone');
    // AI가 다시 얻으면 목록에서 빠짐
    await S(() => window.__addAI('You find another rug.\n<meatball>\ndecor: +Blue Rug\n</meatball>'));
    await sleep(100);
    await S(() => window.__SS_TEST__.api.onBeforeGenerate('normal', {}, false));
    const inj2 = await S(() => window.__prompts.statussim_state?.value ?? '');
    check(/No longer owned[^\n]*Rocking Chair/.test(inj2) && !/No longer owned[^\n]*Blue Rug/.test(inj2), 're-acquired rug leaves the list');
    // 기능 끄기
    check((await page.$$('#chat .ss-star')).length > 0, 'album buttons exist (on)');
    await S(() => { document.body.classList.add('show-settings'); });
    await page.click('#ss-settings [data-s="albumOn"]'); await sleep(150);
    check((await page.$$('#chat .ss-star')).length === 0, 'album off → buttons removed');
    await page.click('#ss-settings [data-s="memoOn"]'); await sleep(150);
    const memoTab = await S(async () => { const { modOn } = await import('/ext/src/core.js'); return modOn('memo'); });
    check(memoTab === false, 'memo off → module off in every chat');
    await S(() => window.__SS_TEST__.api.onBeforeGenerate('normal', {}, false));
    const inj3 = await S(() => window.__prompts.statussim_state?.value ?? '');
    check(!/\bmemo\b/i.test(inj3.split('Keys')[1] ?? inj3.slice(-800)), 'memo key no longer offered to the AI');
    await page.click('#ss-settings [data-s="peekOn"]'); await sleep(150);
    await S(() => { window.__SS_TEST__.api.app.openSheet('rel'); }); await sleep(300);
    check((await page.$$('dialog [data-act="peek"]')).length === 0, 'peek off → no peek button');
    const tabs = await page.$$eval('dialog .ss-groups button, dialog .ss-tabs button', b => b.map(x => x.textContent.trim()));
    check(!tabs.some(t => /메모/.test(t)), `no memo tab (${tabs.join(',')})`);
    await S(() => document.querySelector('dialog .popup-button-ok').click()); await sleep(200);
    // 🏎
    await S(() => { window.__SS_TEST__.api.app.measureLoad(); }); await sleep(800);
    const perf = await page.$eval('dialog .ss-perf', e => e.innerText).catch(() => '');
    check(/한 턴 합계/.test(perf), 'perf popup');
    console.log(perf.split('\n').slice(0, 12).join('\n'));
} finally { console.log(logs.join('\n')); await close(); }
