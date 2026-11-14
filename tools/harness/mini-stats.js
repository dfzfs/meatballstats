// 가상의 「수치 단독」 확장: 할 수 있는 한 가장 단순하게 — 태그 읽기 · 막대 2개 · HUD 한 줄 · 주입 한 줄
(() => {
    const c = SillyTavern.getContext();
    const { eventSource, event_types: E } = c;
    const bars = { 체력: 100, 기력: 100 };
    const RE = /<meatball>([\s\S]*?)<\/meatball>/i;
    const hud = document.createElement('div'); hud.id = 'mini-hud'; document.getElementById('sheld').prepend(hud);
    const render = () => { hud.textContent = Object.entries(bars).map(([k, v]) => `${k} ${v}`).join(' · '); };
    const apply = (mes) => { const m = RE.exec(mes ?? ''); if (!m) return; for (const line of m[1].split('\n')) { const [k, v] = line.split(':').map(s => s?.trim()); if (k in bars && v) bars[k] = Math.max(0, Math.min(100, bars[k] + Number(v))); } };
    eventSource.on(E.CHARACTER_MESSAGE_RENDERED, (i) => { apply(c.chat[i]?.mes); render(); });
    eventSource.on(E.GENERATION_AFTER_COMMANDS, () => { c.setExtensionPrompt('mini', `[Stats] ${hud.textContent}. End reply with <meatball> changes.`, 1, 0); });
    eventSource.on(E.CHAT_CHANGED, () => { bars.체력 = 100; bars.기력 = 100; for (const m of c.chat) if (!m.is_user) apply(m.mes); render(); });
    render();
})();
