// 모바일(폭 390 · 360 · 손가락): HUD 타일 판이 화면 안에 들어오고 · 글자가 안 잘리고 · 손가락으로 옮기기 · 크기 바꾸기가 되는지
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import { serve } from './server.mjs';
import { makeStatus, sleep, check } from './lib.mjs';
const srv = await serve(0); const port = srv.address().port;
const browser = await chromium.launch({ executablePath: process.env.PW_CHROME || undefined });
const shot = process.env.SHOT;
try {
    for (const width of [390, 360]) {
        const cx = await browser.newContext({ viewport: { width, height: 800 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
        const page = await cx.newPage(); const logs = [];
        page.on('console', m => { if (m.type() === 'error') logs.push(m.text()); }); page.on('pageerror', e => logs.push(String(e)));
        await page.goto(`http://127.0.0.1:${port}/`); await page.waitForFunction(() => window.__ready === true);
        const S = (f, a) => page.evaluate(f, a);
        const ids = await S(async () => (await import('/ext/src/core.js')).MOD_IDS);
        await makeStatus(page, ids);
        await S(() => Object.assign(window.__st.extensionSettings.statussim, { mindMode: 'thought', mindFreq: 'always' }));
        await S(async () => { const { commit } = await import('/ext/src/engine.js'); const app = window.__SS_TEST__.api.app; const r = structuredClone(app.current.state.data.rel); r.user = [{ name: '아주아주 긴 이름을 가진 사람', label: '오랜 친구', aff: 40, trust: 60 }, { name: 'Mira', label: '', aff: 10, trust: 10 }]; await commit('rel', r, 'r'); });
        await S((u) => window.__addUser(u), 'hi'); await S((b) => window.__addAI(b), 'ok\n<meatball>\nmind: Mira | 오늘은 왠지 기분이 좋은걸\n</meatball>'); await sleep(400); await S(() => document.querySelectorAll('.ss-toast, #ss-toasts > *').forEach(x => x.remove()));
        const m = () => S(() => { const vw = document.documentElement.clientWidth, tb = document.querySelector('#ss-hud .ss-tb'); if (!tb) return null; const r = tb.getBoundingClientRect();
            const tiles = [...tb.querySelectorAll('.ss-t[data-k]')].map(t => { const b = t.getBoundingClientRect(), ci = t.querySelector('.ci'); const cb = ci?.getBoundingClientRect(); return { k: t.dataset.k, out: b.left < -0.5 || b.right > vw + 0.5, clip: ci ? (cb.right > b.right + 1 || cb.bottom > b.bottom + 1 || ci.scrollWidth > ci.clientWidth + 1) : false, h: Math.round(b.height), w: Math.round(b.width) }; });
            return { vw, left: r.left, right: r.right, scrollX: document.documentElement.scrollWidth > vw + 1, tiles, grid: tb.querySelector('.ss-tg') ? getComputedStyle(tb.querySelector('.ss-tg')).gridTemplateColumns.split(' ').length : 0 }; });
        const a = await m();
        check(!!a && a.tiles.length >= 4, `[${width}] HUD tile board shows (${a?.tiles.length} tiles · ${a?.grid} columns)`);
        check(a.left >= -0.5 && a.right <= a.vw + 0.5 && !a.scrollX, `[${width}] board fits the screen · no sideways scroll`);
        check(!a.tiles.some(t => t.out), `[${width}] no tile sticks out ${a.tiles.filter(t => t.out).map(t => t.k)}`);
        check(a.tiles.every(t => t.w >= 60), `[${width}] tiles are wide enough to read (${a.tiles.map(t => t.w)})`);
        check(!a.tiles.some(t => t.clip), `[${width}] no tile text is cut ${a.tiles.filter(t => t.clip).map(t => t.k)}`);
        if (shot) await page.screenshot({ path: `${shot}-${width}.png` });
        // 편집: 손가락으로
        await page.tap('#ss-hud [data-hud="edit"]'); await sleep(200);
        check(await S(() => !!document.querySelector('#ss-hud .ss-tb.editing')), `[${width}] tap opens edit mode`);
        const e = await m();
        check(!e.tiles.some(t => t.out) && !e.scrollX, `[${width}] edit mode still fits`);
        const hit = await S(() => [...document.querySelectorAll('#ss-hud .ss-tb.editing .ss-t-rs, #ss-hud .ss-tb.editing .ss-t-x, #ss-hud .ss-tb-acts [data-hud]')].map(x => { const b = x.getBoundingClientRect(), a = getComputedStyle(x, '::after'); const ex = a.content && a.content !== 'none' ? Math.max(0, -(parseFloat(a.inset) || parseFloat(a.top) || 0)) : 0; return { c: x.className || x.dataset.hud, s: Math.round(Math.min(b.width, b.height) + ex * 2) }; }).filter(x => x.s && x.s < 28));
        check(!hit.length, `[${width}] edit handles are big enough for a finger (≥28px)`, JSON.stringify(hit.slice(0, 6)));
        if (shot) await page.screenshot({ path: `${shot}-${width}-edit.png` });
        // 손가락 끌기 (pointer 이벤트 · touch)
        const lay = () => S(async () => { const v = await import('/ext/src/views.js'); return { key: v.gridOf('hud').key, L: window.__st.extensionSettings.statussim.tileLayout?.[v.gridOf('hud').key] ?? {} }; });
        const drag = async (sel, dx, dy, abs) => { const b = await (await page.$(sel)).boundingBox(); const x0 = b.x + b.width / 2, y0 = b.y + b.height / 2; const cdp = await cx.newCDPSession(page); const tp = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] });
            const x1 = abs ? abs.x : x0 + dx, y1 = abs ? abs.y : y0 + dy; await tp('touchStart', x0, y0); for (let i = 1; i <= 8; i++) { await tp('touchMove', x0 + (x1 - x0) * i / 8, y0 + (y1 - y0) * i / 8); await sleep(16); } await tp('touchEnd'); await sleep(250); };
        const k0 = e.tiles.at(-1).k, gb = await (await page.$('#ss-hud .ss-tg')).boundingBox();
        await drag(`#ss-hud .ss-t[data-k="${k0}"]`, 0, 0, { x: gb.x + 30, y: gb.y + gb.height + 16 });
        const l1 = await lay();
        check(l1.key === 'hudm4' && l1.L[k0]?.c === 0, `[${width}] finger drag moves a tile (${k0} → ${JSON.stringify(l1.L[k0])})`);
        const k1 = e.tiles[0].k; const before = l1.L[k1];
        await drag(`#ss-hud .ss-t[data-k="${k1}"] .ss-t-rs`, 6, 40);
        const l2 = await lay();
        check((l2.L[k1]?.h ?? 1) > (before?.h ?? 1), `[${width}] finger drag on the corner resizes (${k1} ${JSON.stringify(before)} → ${JSON.stringify(l2.L[k1])})`);
        check(await S(() => document.documentElement.scrollTop === 0 && window.scrollY === 0), `[${width}] page did not scroll while dragging`);
        await page.tap('#ss-hud [data-hud="edit"]'); await sleep(200);
        const z = await m();
        check(!z.tiles.some(t => t.out || t.clip) && !z.scrollX, `[${width}] after editing: still fits · text not cut`);
        check(!logs.length, `[${width}] no console errors ${logs.join(' | ').slice(0, 200)}`);
        await cx.close();
    }
} finally { await browser.close(); srv.close(); }
