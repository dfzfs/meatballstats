// 화면만 번역: 타일 판(HUD · 미니창)의 게이지 이름도 한국어로 (영어를 3글자로 자르기 전에 번역)
import { open, makeStatus, sleep, check } from './lib.mjs';
const { page, logs, close } = await open();
try {
    await makeStatus(page, ['profile', 'stats', 'wallet', 'map', 'calendar']);
    const r = await page.evaluate(async () => {
        const st = window.__st, app = window.__SS_TEST__.api.app;
        const key = Object.keys(st.extensionSettings).find(k => st.extensionSettings[k]?.ssGenLang !== undefined);
        st.extensionSettings[key].ssGenLang = 'enview';
        const meta = st.chatMetadata[Object.keys(st.chatMetadata)[0]];
        meta.base.data.stats.bars = [{ name: 'Health', cur: 100, max: 100 }, { name: 'Stamina', cur: 100, max: 100 }, { name: 'Stress', cur: 0, max: 100 }];
        meta.tr = { Health: '체력', Stamina: '기력', Stress: '스트레스' };
        await window.__addUser('hi'); await window.__addAI('x'); app.refreshNow(); await new Promise(r => setTimeout(r, 400));
        return [...document.querySelectorAll('.ss-tb .t-bars .g em, .ss-tb .ss-t .g em')].map(e => e.textContent);
    });
    check(r.length && r.every(t => /[가-힣]/.test(t)) && r.includes('스트레스') && r.includes('기력'), `gauge names on the tile board are Korean (${r.join(', ')})`);
    check(!logs.length, `no console errors (${logs.length})`, logs.slice(0, 3).join('\n'));
} finally { await close(); }
