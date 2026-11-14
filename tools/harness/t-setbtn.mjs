import { open, sleep, check } from './lib.mjs';
for (const w of [1300, 390]) {
  const { page, logs, close } = await open({ width: w, height: 900 });
  try {
    // 실리 기본 단추 모양을 흉내 (width: min-content)
    await page.addStyleTag({ content: '.menu_button{width:min-content;display:flex;align-items:center;justify-content:center;text-align:center;padding:3px 5px;margin:5px 0;border:1px solid #555;border-radius:5px}' });
    await sleep(300);
    await page.evaluate(() => { const el = document.querySelector("#ss-settings"); for (let e = el; e && e !== document.body; e = e.parentElement) { e.style.setProperty("display", e.classList.contains("ss-set-btns") ? "flex" : "block", "important"); e.removeAttribute("hidden"); } el.querySelectorAll(".inline-drawer-content, details").forEach(d => { d.style.setProperty("display","block","important"); if (d.tagName==="DETAILS") d.open = true; }); const host = el.closest("#extensions_settings, #extensions_settings2") ?? el.parentElement; host.style.width = Math.min(innerWidth - 20, 520) + "px"; });
    await sleep(200);
    const r = await page.evaluate(() => {
      const btns = [...document.querySelectorAll('#ss-settings .menu_button')].filter(b => b.offsetParent || b.getClientRects().length);
      const all = [...document.querySelectorAll('#ss-settings .menu_button')];
      const tall = all.map(b => { const cs = getComputedStyle(b), lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.3; return { t: b.textContent.trim().slice(0, 14), h: b.scrollHeight, lines: Math.round((b.scrollHeight - 8) / lh), w: b.getBoundingClientRect().width }; });
      return { n: all.length, drawerW: document.querySelector('#ss-settings')?.getBoundingClientRect().width, worst: tall.sort((a, b) => b.lines - a.lines).slice(0, 4) };
    });
    console.log(w, JSON.stringify(r));
    check(r.n > 10 && r.worst[0].lines <= 2, `settings buttons stay horizontal at ${w}px (worst ${r.worst[0].lines} lines: ${r.worst[0].t})`);
  } finally { await close(); }
}
