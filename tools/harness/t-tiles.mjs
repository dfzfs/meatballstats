// v2.7.21: 타일 판 (HUD · 사이드 공통) — 아이폰처럼 편집: 끌어서 순서 · − 빼기 · ＋ 더하기 · ↗ 크기
import { open, makeStatus, sleep, check } from './lib.mjs';
const { page, logs, close } = await open();
const S = (f, a) => page.evaluate(f, a);
const keys = () => S(() => window.__st.extensionSettings.statussim.sideMini.join(','));
try {
    const ids = await S(async () => (await import('/ext/src/core.js')).MOD_IDS);
    await makeStatus(page, ids);
    await S(() => Object.assign(window.__st.extensionSettings.statussim, { sideMini: ['date', 'loc', 'bars', 'rel', 'cash', 'diff'], tileSize: {} }));
    await S((u) => window.__addUser(u), 'hi'); await S((b) => window.__addAI(b), 'ok\n<meatball>\n</meatball>'); await sleep(200);
    const tiles = () => S(() => [...document.querySelectorAll('#ss-hud .ss-tb .ss-t[data-k]')].map(t => t.dataset.k).join(','));
    check(await tiles() === 'date,loc,bars,rel,cash,diff', `HUD shows the chosen tiles in order (${await tiles()})`);
    check(await S(() => !document.querySelector('#ss-hud .ss-tb button, #ss-hud .ss-tb .ss-ava, #ss-hud .ss-tb .ss-gauge')), 'tiles use no theme-styled parts (button · .ss-ava · .ss-gauge)');
    await page.click('#ss-hud [data-hud="edit"]'); await sleep(150);
    check(await S(() => !!document.querySelector('#ss-hud .ss-tb.editing')), 'edit mode on');
    // 다른 줄 · 다른 자리로: 돈 칸을 판 맨 아래 새 줄 왼쪽 끝으로
    const lay = () => S(async () => { const v = await import('/ext/src/views.js'); return window.__st.extensionSettings.statussim.tileLayout?.[v.gridOf('hud').key] ?? {}; });
    const a = await (await page.$('#ss-hud .ss-t[data-k="cash"]')).boundingBox(), gb = await (await page.$('#ss-hud .ss-tg')).boundingBox();
    await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2); await page.mouse.down(); await page.mouse.move(gb.x + a.width / 2 + 1, gb.y + gb.height + 14, { steps: 10 }); await page.mouse.up(); await sleep(200);
    const L1 = await lay();
    check(L1.cash && L1.cash.c === 0 && L1.cash.r >= 1, `drag moves a tile into another row at that spot (${JSON.stringify(L1.cash)})`);
    // ⤡ 끌어서 크기: 관계 칸을 두 줄 높이로
    const rb = await (await page.$('#ss-hud .ss-t[data-k="rel"] .ss-t-rs')).boundingBox();
    await page.mouse.move(rb.x + rb.width / 2, rb.y + rb.height / 2); await page.mouse.down(); await page.mouse.move(rb.x + 60, rb.y + 48, { steps: 10 }); await page.mouse.up(); await sleep(200);
    const L2 = await lay();
    check(L2.rel?.h === 2, `corner drag resizes (rel ${JSON.stringify(L2.rel)})`);
    check(!Object.entries(L2).some(([k, p]) => Object.entries(L2).some(([k2, q]) => k !== k2 && p.c < q.c + q.w && q.c < p.c + p.w && p.r < q.r + q.h && q.r < p.r + p.h)), 'no tiles overlap after moving and resizing');
    await page.click('#ss-hud [data-hud="del:loc"]', { force: true }); await sleep(120);
    check(!(await keys()).includes('loc'), 'minus removes a tile');
    await page.click('#ss-hud [data-hud="addmenu"]', { force: true }); await sleep(120);
    await page.click('#ss-hud [data-hud="addk:loc"]', { force: true }); await sleep(120);
    check((await keys()).endsWith('loc'), 'plus adds it back at the end');
    await page.click('#ss-hud [data-hud="edit"]', { force: true }); await sleep(120);
    check(await S(() => !document.querySelector('#ss-hud .ss-tb.editing') && !!document.querySelector('#ss-hud .ss-t.tall[data-k="rel"]')), 'done leaves edit mode and keeps the tall tile');
    await page.click('#ss-hud .ss-t[data-k="cash"]'); await sleep(150);
    check(await S(() => !!document.querySelector('#ss-hud .ss-t-det')), 'tapping a tile opens its details');
    // 글자: 자르지 않고 칸에 맞게 줄어듦
    const fit = await S(async () => {
        const { commit } = await import('/ext/src/engine.js'); const app = window.__SS_TEST__.api.app;
        const m = structuredClone(app.current.state.data.map); m.here = '아주아주 긴 이름의 산꼭대기 오두막'; m.places.push({ name: m.here, desc: '', kind: '', x: 1, y: 1, links: [], known: true }); await commit('map', m, 'm');
        await new Promise(r => setTimeout(r, 200));
        const c = document.querySelector('#ss-hud .t-loc > .c'), ci = c.firstElementChild;
        return { zoom: parseFloat(ci.style.zoom || '1'), text: c.textContent, fits: ci.getBoundingClientRect().width <= c.getBoundingClientRect().width + 1 };
    });
    check(fit.zoom < 1 && fit.fits && /오두막/.test(fit.text), `long text shrinks to fit instead of being cut (${JSON.stringify(fit)})`);
    await page.addStyleTag({ content: '#ss-hud span, #ss-hud b, #ss-hud small { font-size: 17px !important; }' });
    const of = await S(async () => { (await import('/ext/src/views.js')).fitTiles(document.getElementById('ss-hud')); return [...document.querySelectorAll('#ss-hud .ss-t > .c')].filter(c => c.firstElementChild.getBoundingClientRect().width > c.getBoundingClientRect().width + 1).map(c => c.parentElement.dataset.k); });
    check(!of.length, `still fits when a theme forces big fonts with !important (${of})`);
    // 꾸미기: 스티커 · 올리기 · 색
    await page.click('#ss-hud [data-hud="edit"]', { force: true }); await sleep(120);
    await page.click('#ss-hud [data-hud="stkmenu"]', { force: true }); await sleep(120);
    await page.click('#ss-hud [data-hud="stkadd:happy"]', { force: true }); await sleep(150);
    const deco = () => S(() => window.__st.extensionSettings.statussim.tileDeco?.hud ?? []);
    check((await deco()).length === 1 && (await deco())[0].m === 'happy', 'built-in sticker added');
    await page.click('#ss-hud [data-hud="stkemo:🌸"]', { force: true }); await sleep(100); await page.click('#ss-hud [data-hud="stkemo:✨"]', { force: true }); await sleep(100);
    check((await deco()).filter(x => x.e).length === 2, 'several emoji stickers can be added');
    await S(async () => { const st = window.__st.extensionSettings.statussim; st.tileDeco.hud = st.tileDeco.hud.filter(x => !x.e); window.__SS_TEST__.api.refreshNow(); }); await sleep(150);
    const st = await (await page.$('#ss-hud .ss-stk')).boundingBox(), g = await (await page.$('#ss-hud .ss-tg')).boundingBox();
    await page.mouse.move(st.x + st.width / 2, st.y + st.height / 2); await page.mouse.down(); await page.mouse.move(g.x + 10, g.y + 6, { steps: 6 }); await page.mouse.up(); await sleep(150);
    check((await deco())[0].x < 20, `sticker can be dragged anywhere on the board (x=${(await deco())[0].x})`);
    await page.click('#ss-hud .ss-stk', { force: true }); await sleep(120);
    const w0 = (await deco())[0].w; await page.click('#ss-hud [data-hud="stk:+"]', { force: true }); await sleep(120);
    check((await deco())[0].w > w0, 'selected sticker can be resized');
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAYAAACp8Z5+AAAAEklEQVR4nGP43+DwHxkzkC4AANZPK+E8+RW7AAAAAElFTkSuQmCC', 'base64');
    await (await page.$('#ss-hud [data-stkup]')).setInputFiles({ name: 'me.png', mimeType: 'image/png', buffer: png }); await sleep(400);
    check((await deco()).some(x => /^data:image\//.test(x.src ?? '')), 'own picture uploaded as a sticker (shrunk to a data URL)');
    await page.click('#ss-hud [data-hud="colmenu"]', { force: true }); await sleep(120);
    await S(() => { const i = document.querySelector('#ss-hud [data-col="board:bd"]'); i.value = '#ff0000'; i.dispatchEvent(new Event('input', { bubbles: true })); });
    const K = await S(() => [...document.querySelectorAll('#ss-hud .ss-tg > .ss-t[data-k]')].find(t => { const r = t.getBoundingClientRect(); return document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)?.closest('.ss-t') === t; })?.dataset.k);
    const t = await (await page.$(`#ss-hud .ss-t[data-k="${K}"]`)).boundingBox();
    await page.mouse.click(t.x + t.width / 2, t.y + t.height / 2); await sleep(150);
    await S((K) => { const i = document.querySelector(`#ss-hud [data-col="tile:${K}:bd"]`); i.value = '#00ff00'; i.dispatchEvent(new Event('input', { bubbles: true })); }, K);
    const cs = await S((K) => ({ b: window.__st.extensionSettings.statussim.boardStyle?.bd, t: window.__st.extensionSettings.statussim.tileStyle?.[K]?.bd }), K);
    check(cs.b === '#ff0000' && cs.t === '#00ff00', `board border and a single tile's border color can be changed (${JSON.stringify(cs)})`);
    await (await page.$('#ss-hud [data-bgup]')).setInputFiles({ name: 'bg.png', mimeType: 'image/png', buffer: png }); await sleep(400);
    check(await S(() => /^data:image\//.test(window.__st.extensionSettings.statussim.tileDeco?.hudBg ?? '')), 'board background picture can be uploaded');
    await page.click('#ss-hud [data-hud="edit"]', { force: true }); await sleep(150);
    check(await S((K) => getComputedStyle(document.querySelector(`#ss-hud .ss-t[data-k="${K}"]`)).borderTopColor === 'rgb(0, 255, 0)', K), 'tile color shows after leaving edit mode');
    const errs = logs.filter(l => /error|TypeError|ReferenceError/i.test(l));
    check(!errs.length, `no console errors ${errs.slice(0, 3).join(' | ')}`);
} finally { await close(); }
