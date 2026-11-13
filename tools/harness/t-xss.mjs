// AI가 만든 글에 HTML이 섞여 와도 화면에서 실행되지 않는가 (모든 칸 · 모든 탭 · 변동 칩 · HUD)
import { open, makeStatus, sleep, check } from './lib.mjs';
const { page, logs, close } = await open();
const P = '<img src=x onerror="window.__xss=(window.__xss||0)+1">';
try {
    const all = await page.evaluate(async () => (await import('/ext/src/core.js')).MOD_IDS);
    await makeStatus(page, all);
    await page.evaluate(() => window.__addUser('hi'));
    await page.evaluate(() => window.__addAI('Leon.\n<meatball>\ncash: -5\naff: Leon +2\n</meatball>'));
    await sleep(200);
    await page.evaluate(() => { window.__xssWhere = []; new MutationObserver(ms => { for (const m of ms) for (const n of m.addedNodes) { const imgs = n.nodeType === 1 ? (n.matches?.('img[src="x"]') ? [n] : [...n.querySelectorAll?.('img[src="x"]') ?? []]) : []; for (const i of imgs) { const path = []; let e = i.parentElement; while (e && path.length < 4) { path.push((e.className?.baseVal ?? e.className ?? e.tagName).toString().split(' ').filter(c => c.startsWith('ss-')).slice(0, 2).join('.') || e.tagName); e = e.parentElement; } window.__xssWhere.push(path.join(' < ')); } } }).observe(document.body, { childList: true, subtree: true }); });
    // 모든 칸의 글자를 독이 든 글로 (숫자 · id는 그대로)
    await page.evaluate(async (P) => {
        const { addAdjust } = await import('/ext/src/engine.js');
        const st = window.__SS_TEST__.api.app.current.state;
        const poison = (x, k) => typeof x === 'string' ? (/^$/.test(k) ? x : `${x}${P}`) : Array.isArray(x) ? x.map(v => poison(v, k)) : x && typeof x === 'object' ? Object.fromEntries(Object.entries(x).map(([kk, v]) => [kk, poison(v, kk)])) : x;
        for (const [mod, d] of Object.entries(st.data)) if (d) await addAdjust({ set: { mod, data: poison(structuredClone(d), '') }, label: `edit ${mod}${P}` });
        await addAdjust({ set: { mod: 'core', data: poison(structuredClone(st.core), '') }, label: 'core' });
    }, P);
    await page.evaluate((P) => window.__addAI(`Leon.\n<meatball>\naff: Leon${P} +2\nitem: +Bread${P}\nloc: Market${P}\nmemo: x${P}\nnews: T${P} | B${P}\n</meatball>`), P);
    await sleep(300);
    const tabs = ['home', ...all.filter(x => x !== 'home'), 'base', 'manage', 'album', 'record'];
    await page.evaluate(() => { window.__SS_TEST__.api.app.openSheet('home'); });
    await sleep(300);
    for (const t of tabs) await page.evaluate(async (t) => { const el = document.querySelector('dialog .ss-panel'); if (!el) return; el._ss.tab = t; el._ss.ui = {}; el._ss.mode = 'view'; try { window.__SS_TEST__.api.app.renderPanel(el); } catch { /* */ } await new Promise(r => setTimeout(r, 30)); }, t);
    // 편집 화면 · 대화방 · 기사 펼침 · 알림
    for (const t of tabs) await page.evaluate(async (t) => {
        const el = document.querySelector('dialog .ss-panel'); if (!el) return;
        const st = window.__SS_TEST__.api.app.current.state;
        for (const [mode, ui] of [['edit', {}], ['view', { who: st.data.contact?.contacts?.[0]?.name, open: st.data[t]?.items?.[0]?.id ?? st.data[t]?.posts?.[0]?.id ?? 0 }]]) {
            el._ss.tab = t; el._ss.ui = ui; el._ss.mode = mode;
            try { window.__SS_TEST__.api.app.renderPanel(el); } catch { /* */ }
            await new Promise(r => setTimeout(r, 20));
        }
        el._ss.mode = 'view'; el._ss.ui = {};
    }, t);
    await page.evaluate(async (P) => { const { notify } = await import('/ext/src/notify.js'); notify({ kind: 'text', icon: P, title: `t${P}`, text: `x${P}`, tab: 'rel' }); }, P);
    await sleep(500);
    const r = await page.evaluate(() => ({ fired: window.__xss ?? 0, where: [...new Set(window.__xssWhere)], imgs: [...document.querySelectorAll('img[src="x"]')].map(i => (i.closest('[class*="ss-"]')?.className ?? i.parentElement?.className ?? '?').toString().slice(0, 60)) }));
    check(!r.fired && !r.imgs.length, `no HTML injection from AI text (fired ${r.fired}, imgs ${r.imgs.length})`, JSON.stringify(r.where, null, 1));
} finally { if (logs.length) console.log(logs.slice(0, 5).join('\n')); await close(); }
