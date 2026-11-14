// 퀘스트: 수락 · 포기 · 완료(판정) · 지우기 · 다시 진행 + AI가 끝난/지운 퀘스트를 되살리지 못하는지
import { open, makeStatus, sleep, check } from './lib.mjs';
const { page, logs, close } = await open();
const click = async (sel) => { await page.click(sel); await sleep(250); };
try {
    await makeStatus(page);
    await page.evaluate(() => window.__addUser('Find the cat'));
    await page.evaluate(() => window.__addAI('Leon nods.\n<meatball>\nquest: Lost Cat | new | find the cat in the market\nquest: Escort | 수락\n</meatball>'));
    await sleep(200);
    const q = () => page.evaluate(() => (window.__SS_TEST__.api.app.current.state.data.quest.list).map(q => `${q.title}:${q.status}${q.judge ? `/${q.judge}` : ''}`).join(', '));
    console.log('quests:', await q());
    await page.evaluate(() => { window.__SS_TEST__.api.app.openSheet('quest'); });
    await sleep(300);
    check((await page.$$('dialog .ss-quest .ss-fresh')).length === 1, 'fresh dot on the visible (active) quest');
    check((await page.$$('dialog .ss-qcheck select')).length === 2, 'judge selects (attr + dc) on active quest');
    // 판정 능력치 고르기
    const attr = await page.$eval('dialog .ss-qcheck select', s => s.options[1]?.value ?? '');
    await page.selectOption('dialog .ss-qcheck select', attr); await sleep(250);
    check((await page.evaluate(() => window.__SS_TEST__.api.app.current.state.data.quest.list.find(x => x.title === 'Escort').check?.attr)) === attr, `check.attr saved (${attr})`);
    await click('dialog .ss-quest button:has-text("포기")');
    check((await q()).includes('Escort:failed'), '포기 → failed');
    await click('dialog .ss-quests .ss-seg button:has-text("받을 수 있음")');
    await click('dialog .ss-quest button:has-text("수락")');
    // 완료 → 판정 창

    await page.evaluate(() => { window.__autoPopup = null; });
    await page.click('dialog .ss-quest button:has-text("완료")'); await sleep(300);
    const judgeOpen = await page.$('dialog .ss-qjudge [data-choice="roll"]');
    check(!!judgeOpen, 'judge popup opened');
    await page.click('dialog .ss-qjudge [data-choice="roll"]'); await sleep(500);
    const res = await page.$eval('dialog .ss-qjudge .ss-dice-res b', b => b.textContent).catch(() => '');
    console.log('   roll result:', res);
    await page.evaluate(() => { const d = [...document.querySelectorAll('dialog')].at(-1); d.querySelector('.popup-button-ok').click(); window.__autoPopup = 'ok'; });
    await sleep(300);
    console.log('after 완료:', await q());
    check(/Lost Cat:(done|failed)\/(crit|ok|fail|fumble)/.test(await q()), '완료 → judged');
    const cash = await page.evaluate(() => window.__SS_TEST__.api.app.current.state.data.wallet.cash);
    console.log('   cash:', cash);
    // 끝남 → 지우기, Escort 다시 진행 → 포기 유지 확인 위해 다시 포기
    await click('dialog .ss-quests .ss-seg button:has-text("끝남")');
    await click('dialog .ss-quest:has-text("Lost Cat") button:has-text("지우기")');
    console.log('after 지우기:', await q());
    // AI가 다시 언급
    await page.evaluate(() => window.__addAI('Leon keeps searching.\n<meatball>\nquest: Escort | 진행\nquest: Lost Cat | checked the bakery\nquest: New Job | new\n</meatball>'));
    await sleep(300);
    const after = await q();
    console.log('after next AI turn:', after);
    check(after.includes('Escort:failed') && !after.includes('Lost Cat') && after.includes('New Job:open'), 'AI cannot revive ended/deleted quests; new quest ok');
    // 다시 진행
    await click('dialog .ss-quests .ss-seg button:has-text("끝남")');
    await click('dialog .ss-quest:has-text("Escort") button:has-text("다시 진행")');
    check((await q()).includes('Escort:active'), '다시 진행 → active');
    await page.screenshot({ path: '/tmp/q-final.png' });
} finally { console.log(logs.join('\n')); await close(); }
