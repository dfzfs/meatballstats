// 배경 그림 자르기 창: 판 모양 틀 · 끌기 · 크기 → 자른 그림이 판 배경으로 · 취소하면 그대로 · 설정 체크 줄이 쪼개지지 않음
import { open, makeStatus, sleep, check } from './lib.mjs';
const { page, logs, close } = await open({ width: 1300, height: 900 });
try {
    await page.addStyleTag({ content: '.menu_button{width:min-content;display:flex}.checkbox_label{display:flex;flex-direction:row;column-gap:5px;align-items:baseline}' });
    await makeStatus(page); await page.evaluate(async () => { await window.__addUser('hi'); await window.__addAI('x\n<meatball>\ncash: -5\n</meatball>'); }); await sleep(300);
    await page.evaluate(() => { window.__autoPopup = null; });
    await page.click('#ss-hud [data-hud="edit"]'); await sleep(150); await page.click('#ss-hud [data-hud="colmenu"]'); await sleep(150);
    const pick = async () => { const [ch] = await Promise.all([page.waitForEvent('filechooser'), page.click('#ss-hud label.ss-t.up:has([data-bgup])')]); await ch.setFiles('/home/claude/meatballstats/img/mascot_party.webp'); await page.waitForSelector('dialog .ss-crop canvas'); await sleep(200); };
    const key = () => page.evaluate(() => { const s = window.__st.extensionSettings; const k = Object.keys(s).find(x => s[x]?.tileDeco !== undefined); return s[k]?.tileDeco?.hudBg ?? null; });
    // 취소
    await pick(); await page.click('dialog .popup-button-cancel'); await sleep(300);
    check(!(await key()), 'cancel leaves the board as it was');
    // 자르기
    await pick();
    const box = await page.evaluate(() => { const b = document.querySelector('dialog .ss-crop-box').getBoundingClientRect(), h = document.getElementById('ss-hud').getBoundingClientRect(); return { ar: b.width / b.height, hud: h.width / h.height, x: b.x, y: b.y, w: b.width, h: b.height }; });
    check(Math.abs(box.ar - box.hud) < 0.05, `crop frame has the board's shape (${box.ar.toFixed(2)} vs ${box.hud.toFixed(2)})`);
    await page.evaluate(() => { const r = document.querySelector('dialog .ss-crop input[type=range]'); r.value = '250'; r.dispatchEvent(new Event('input')); });
    await page.mouse.move(box.x + box.w / 2, box.y + box.h / 2); await page.mouse.down(); await page.mouse.move(box.x + box.w / 2 + 60, box.y + box.h / 2 + 10, { steps: 5 }); await page.mouse.up();
    await page.screenshot({ path: '/tmp/mytests/crop-dialog.png' });
    await page.click('dialog .popup-button-ok'); await sleep(500);
    const img = await key();
    const dims = img && await page.evaluate((u) => new Promise(r => { const i = new Image(); i.onload = () => r([i.width, i.height]); i.src = u; }), img);
    check(!!img && img.length < 160000, `cropped picture saved (${img?.length} chars, ${dims})`);
    check(dims && Math.abs(dims[0] / dims[1] - box.hud) < 0.1, `saved picture matches the board's shape (${dims && (dims[0] / dims[1]).toFixed(2)})`);
    const painted = await page.evaluate(() => { const cs = getComputedStyle(document.getElementById('ss-hud')); return `${cs.backgroundSize}|${cs.backgroundRepeat}|${cs.backgroundImage.slice(0, 22)}`; });
    check(/cover\|no-repeat\|url\("data:image/.test(painted), `board shows it (${painted})`);
    await page.screenshot({ path: '/tmp/mytests/crop-after.png', clip: { x: 0, y: 0, width: 1300, height: 200 } });
    // 설정 체크 줄
    await page.evaluate(() => { const el = document.querySelector('#ss-settings'); for (let e = el; e && e !== document.body; e = e.parentElement) { e.style.setProperty('display', 'block', 'important'); } el.querySelectorAll('.inline-drawer-content, details').forEach(d => { d.style.setProperty('display', 'block', 'important'); if (d.tagName === 'DETAILS') d.open = true; }); el.style.width = '420px'; });
    await sleep(150);
    const lab = await page.evaluate(() => [...document.querySelectorAll('#ss-settings label.checkbox_label')].filter(l => l.querySelector(':scope > input[type=checkbox]:first-child')).map(l => { const r = document.createRange(); const t = [...l.childNodes].find(n => n.nodeType === 3 && n.textContent.trim()); if (!t) return null; r.selectNodeContents(t); const rects = [...r.getClientRects()]; const w = Math.max(...rects.map(x => x.width)); return { t: t.textContent.trim().slice(0, 12), lines: rects.length, w: Math.round(w), chars: t.textContent.trim().length }; }).filter(Boolean).filter(x => x.chars > 3 && x.w < 40));
    check(!lab.length, `checkbox names are not squeezed into a narrow column (${JSON.stringify(lab.slice(0, 3))})`);
    check(!logs.length, `no console errors (${logs.length})`, logs.slice(0, 3).join('\n'));
} finally { await close(); }
