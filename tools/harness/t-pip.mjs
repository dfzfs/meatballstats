// 🔍 칩 점검: 씹힘(태그 없음 · 깨진 태그 · 모르는 키) vs 안 보임(칩 자리 사라짐 · 가려짐) + 손으로 다시 부르기
import { open, makeStatus, sleep, check } from './lib.mjs';
const { page, logs, close } = await open();
const diag = (i) => page.evaluate(async (i) => (await import('/ext/src/pip.js')).pipDiag(i ?? window.__SS_TEST__.api.app.current.lastAI), i);
try {
    await makeStatus(page);
    await page.evaluate(() => { const s = window.__st.extensionSettings.statussim; s.sync = 'tag'; });
    await page.evaluate(() => window.__addUser('hi'));
    // 1) 태그 없음
    await page.evaluate(() => window.__addAI('Leon smiles. No tag here.'));
    await sleep(200);
    let d = await diag();
    check(d.code === 'notag', `no tag → notag (${d.code})`);
    check(!!(await page.$('#chat .mes:last-child .ss-mchip.pip')), '🔍 chip shown on last answer');
    // 손으로: 분석 (AI 스텁이 변화 줄을 돌려줌)
    await page.evaluate(() => { window.__ai = () => '<meatball>\ncash: -30\n</meatball>'; });
    const r = await page.evaluate(async () => (await import('/ext/src/pip.js')).pipFix(window.__SS_TEST__.api.app.current.lastAI, 'analyze'));
    await sleep(200);
    check(r?.code === 'shown' || r?.code === 'detached', `after analyze → ${r?.code}`);
    check(await page.evaluate(() => window.__SS_TEST__.api.app.current.state.data.wallet.cash) === 70, 'cash applied 100→70');
    check(!(await page.$('#chat .mes:last-child .ss-mchip.pip')) && !!(await page.$('#chat .mes:last-child .ss-msgcard .ss-mchip')), 'pip replaced by real chip');
    // 2) 깨진 태그 (닫는 > 없음 + 키 줄이 다음 줄)
    await page.evaluate(() => window.__addUser('again'));
    await page.evaluate(() => window.__addAI('Leon pays.\n<meatball\ncash: -10\n'));
    await sleep(200);
    d = await diag();
    check(d.code === 'malformed', `broken tag → malformed (${d.code})`);
    const r2 = await page.evaluate(async () => (await import('/ext/src/pip.js')).pipFix(window.__SS_TEST__.api.app.current.lastAI, 'reread'));
    const c2 = await page.evaluate(() => window.__SS_TEST__.api.app.current.state.data.wallet.cash); check(c2 === 60, `reread fixed it (${r2?.code}, cash ${c2})`);
    // 3) 모르는 키
    await page.evaluate(() => window.__addUser('more'));
    await page.evaluate(() => window.__addAI('Leon waves.\n<meatball>\nmood: happy\n</meatball>'));
    await sleep(200);
    d = await diag();
    check(d.code === 'unknown', `unknown key → unknown (${d.code})`);
    // 4) 읽었는데 칩 자리가 사라짐 (번역 확장이 본문을 다시 그림)
    await page.evaluate(() => window.__addUser('go'));
    await page.evaluate(() => window.__addAI('Leon buys bread.\n<meatball>\ncash: -5\n</meatball>'));
    await sleep(200);
    await page.evaluate(() => { const t = document.querySelector('#chat .mes:last-child .mes_text'); t.innerHTML = 'Translated text'; });
    d = await diag();
    check(d.code === 'detached' || d.code === 'shown', `slot removed → ${d.code} (observer may re-add)`);
    await sleep(300);
    d = await diag();
    check(d.code === 'shown', `observer re-attached chip → ${d.code}`);
    // 5) 가려짐 (원문을 숨기는 번역 확장)
    await page.evaluate(() => { document.querySelector('#chat .mes:last-child .mes_text').style.display = 'none'; });
    d = await diag();
    check(d.code === 'hidden', `text hidden → hidden (${d.code})`);
    await page.evaluate(async () => (await import('/ext/src/pip.js')).pipFix(window.__SS_TEST__.api.app.current.lastAI, 'outside'));
    await sleep(200);
    d = await diag();
    check(d.code === 'shown', `outside placement → visible again (${d.code})`);
    // 6) 슬래시
    const t = await page.evaluate(() => window.__runSlash('ss-pip', {}, ''));
    check(typeof t === 'string' && t.length > 0, `/ss-pip returns: ${t}`);
    // 7) OOC 건너뛴 답
    await page.evaluate(() => window.__addUser('(( ooc: are you ok? ))'));
    await page.evaluate(() => window.__addAI('(( sure! ))'));
    await sleep(200);
    d = await diag();
    check(d.code === 'skipped', `OOC answer → skipped (${d.code})`);
    await page.screenshot({ path: '/tmp/pip.png' });
} finally { console.log(logs.join('\n')); await close(); }
