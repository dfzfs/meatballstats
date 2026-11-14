// 확장 설정 칸의 모든 버튼 · 스위치 · 선택 상자, 그리고 HUD · 떠 있는 버튼 · 메시지 칩을 다 눌러 본다
import { open, makeStatus, sleep, check } from './lib.mjs';
const { page, logs, close } = await open();
const SKIP = /reset|purge|restore|import|wipe|delete|del\b|uninstall|filerestore|fullbackup|backup|export/i;
try {
    const all = await page.evaluate(async () => (await import('/ext/src/core.js')).MOD_IDS);
    await makeStatus(page, all);
    await page.evaluate(() => { window.__ai = () => '{}'; });
    for (let i = 0; i < 3; i++) { await page.evaluate(() => window.__addUser('go')); await page.evaluate((i) => window.__addAI(`S${i}.\n<meatball>\ncash: -3\naff: Leon +1\n</meatball>`), i); }
    await sleep(300);
    const bad = [];
    const run = async (label, fn) => {
        const before = logs.length;
        const r = await Promise.race([page.evaluate(fn).then(x => x ?? 'ok', e => `throw: ${e.message}`), sleep(4000).then(() => 'HANG')]);
        await sleep(30);
        if (r !== 'ok') bad.push(`${label}: ${r}`);
        const fresh = logs.slice(before).filter(l => /pageerror|TypeError|ReferenceError/.test(l));
        if (fresh.length) bad.push(`${label}: ${fresh[0].slice(0, 200)}`);
    };
    // 설정 칸: 버튼
    const btns = await page.evaluate(() => [...document.querySelectorAll('#extensions_settings2 .ss-scope button, #extensions_settings2 .ss-scope [data-act]')].map((b, i) => `${i}|${(b.dataset.act || b.id || b.textContent).trim().slice(0, 30)}`));
    let n = 0;
    for (const b of btns) {
        const [i, name] = b.split('|');
        if (SKIP.test(name)) continue;
        n++;
        await run(`settings button ${name}`, new Function(`const b = [...document.querySelectorAll('#extensions_settings2 .ss-scope button, #extensions_settings2 .ss-scope [data-act]')][${i}]; b?.dispatchEvent(new MouseEvent('click', { bubbles: true })); return new Promise(r => setTimeout(() => { document.querySelectorAll('dialog').forEach(d => d.remove()); r('ok'); }, 60));`));
    }
    // 설정 칸: 스위치 · 선택 상자 (켰다 끄기 / 하나씩 고른 뒤 원래대로)
    const inputs = await page.evaluate(() => [...document.querySelectorAll('#extensions_settings2 [data-s], #extensions_settings2 [data-s-every]')].map((x, i) => `${i}|${x.dataset.s || x.dataset.sEvery}|${x.type || x.tagName}`));
    for (const x of inputs) {
        const [i, key, type] = x.split('|');
        n++;
        await run(`setting ${key}`, new Function(`
            const x = [...document.querySelectorAll('#extensions_settings2 [data-s], #extensions_settings2 [data-s-every]')][${i}]; if (!x) return 'gone';
            const fire = () => x.dispatchEvent(new Event('change', { bubbles: true }));
            if (x.type === 'checkbox') { x.checked = !x.checked; fire(); x.checked = !x.checked; fire(); }
            else if (x.tagName === 'SELECT') { const v0 = x.value; for (const o of x.options) { x.value = o.value; fire(); } x.value = v0; fire(); }
            else if (x.type === 'number' || x.type === 'range') { const v0 = x.value; x.value = x.min || 0; fire(); x.value = x.max || 999; fire(); x.value = v0; fire(); }
            else { const v0 = x.value; x.value = 'test'; fire(); x.value = v0; fire(); }
            document.querySelectorAll('dialog').forEach(d => d.remove());
            return 'ok';`));
    }
    // HUD · 떠 있는 버튼 · 칩
    const ui = await page.evaluate(() => [...document.querySelectorAll('#ss-hud [data-act], #ss-hud button, #ss-float, #ss-side [data-act], #chat .ss-mchip, #chat .ss-msgcard [data-act], #chat .ss-pip')].map((b, i) => `${i}|${b.dataset?.act || b.id || b.className}`.slice(0, 50)));
    for (const u of ui) {
        const [i, name] = u.split('|');
        if (SKIP.test(name)) continue;
        n++;
        await run(`ui ${name}`, new Function(`const b = [...document.querySelectorAll('#ss-hud [data-act], #ss-hud button, #ss-float, #ss-side [data-act], #chat .ss-mchip, #chat .ss-msgcard [data-act], #chat .ss-pip')][${i}]; b?.dispatchEvent(new MouseEvent('click', { bubbles: true })); return new Promise(r => setTimeout(() => { document.querySelectorAll('dialog').forEach(d => d.remove()); r('ok'); }, 80));`));
    }
    // 그 뒤에도 기본이 도는가
    await page.evaluate(() => window.__addUser('after'));
    await page.evaluate(() => window.__addAI('after\n<meatball>\ncash: -1\n</meatball>'));
    await sleep(300);
    const alive = await page.evaluate(() => !!window.__SS_TEST__.api.app.current?.state);
    console.log(`  tried ${n} settings · buttons · chips`);
    check(!bad.length, `no errors (${bad.length})`, '\n    ' + [...new Set(bad)].slice(0, 30).join('\n    '));
    check(alive, 'state still computes after all of it');
} finally { await close(); }
