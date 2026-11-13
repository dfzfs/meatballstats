// v2.7.7: 연락 · 피드는 바뀐 부분만 기록 (채팅 파일 비대 방지) · 대화방 50개 · 생성 직전 계산 재사용
import { open, makeStatus, sleep, check } from './lib.mjs';
const { page, logs, close } = await open();
const S = (f, a) => page.evaluate(f, a);
const st = () => S(() => window.__SS_TEST__.api.app.current.state);
try {
    await makeStatus(page, ['profile', 'stats', 'wallet', 'rel', 'map', 'calendar', 'contact', 'sns']);
    await S(() => window.__addUser('hi')); await S(() => window.__addAI('ok')); await sleep(100);
    // 6명과 각 40개 대화를 만든 뒤, 턴을 넘기며 메시지를 하나씩 보낸다
    await S(async () => {
        const { commit } = await import('/ext/src/engine.js');
        const ct = structuredClone(window.__SS_TEST__.api.app.current.state.data.contact);
        for (let p = 0; p < 6; p++) { const nm = `P${p}`; ct.contacts.push({ name: nm }); ct.threads[nm] = Array.from({ length: 40 }, (_, j) => ({ id: `${p}_${j}`, from: j % 2 ? 'me' : 'them', text: `오늘 시장에 다녀왔어 ${j} `.repeat(4), at: j })); }
        await commit('contact', ct, 'seed');
    });
    for (let k = 0; k < 30; k++) {
        await S(async (k) => {
            const { commit } = await import('/ext/src/engine.js');
            const ct = structuredClone(window.__SS_TEST__.api.app.current.state.data.contact);
            ct.threads[`P${k % 6}`].push({ id: `new${k}`, from: 'me', text: `메시지 ${k}`, at: 100 + k });
            await commit('contact', ct, `to P${k % 6}: ${k}`);
        }, k);
        if (k % 3 === 2) { await S(() => window.__addUser('next')); await S(() => window.__addAI(`ok\n<meatball>\nmsg: P1 | AI가 보낸 문자 ${Math.random()}\n</meatball>`)); await sleep(30); }
    }
    await sleep(200);
    const kb = await S(() => Math.round(JSON.stringify(window.__st.chatMetadata.statussim.adjust).length / 1024));
    check(kb < 200, `edit history stays small (${kb}KB · was MBs)`);
    const s1 = await st();
    check(s1.data.contact.threads.P0.some(m => m.text === '메시지 24'), 'my message kept');
    check(s1.data.contact.threads.P1.filter(m => /AI가 보낸 문자/.test(m.text)).length === 10, `AI messages kept between my edits (${s1.data.contact.threads.P1.filter(m => /AI가 보낸 문자/.test(m.text)).length})`);
    check(Object.values(s1.data.contact.threads).every(t => t.length <= 50), 'threads capped at 50');
    check(s1.data.contact.contacts.length >= 6, 'contacts kept');
    // 되돌리기: 마지막 메시지만 빠진다
    await S(async () => { const { undoLast } = await import('/ext/src/engine.js'); await undoLast(); });
    const s2 = await st();
    check(!s2.data.contact.threads.P5.some(m => m.text === '메시지 29') && s2.data.contact.threads.P4.some(m => m.text === '메시지 28'), 'undo removes only the last message');
    // 굳히기 뒤에도 그대로
    const before = JSON.stringify((await st()).data.contact.threads);
    await S(async () => { const { squash } = await import('/ext/src/engine.js'); const { getMeta } = await import('/ext/src/core.js'); squash(getMeta(), 0); window.__SS_TEST__.api.refreshNow(); });
    check(JSON.stringify((await st()).data.contact.threads) === before, 'same after bake');
    // 다른 칸(지갑)은 예전처럼 통째로
    await S(async () => { const { commit } = await import('/ext/src/engine.js'); const w = structuredClone(window.__SS_TEST__.api.app.current.state.data.wallet); w.cash = 777; await commit('wallet', w, 'w'); });
    check((await st()).data.wallet.cash === 777 && await S(() => !!window.__st.chatMetadata.statussim.adjust.at(-1).set.data), 'other panels still full snapshot');
    // 지도 휠 확대: 문서 전체에 막는 휠 리스너 없이, 지도 위에서만
    await S(() => { window.__SS_TEST__.api.app.openSheet('map'); }); await sleep(400);
    const svg = await page.$('dialog svg.ss-map');
    if (svg) {
        const vb0 = await svg.evaluate(e => e.getAttribute('viewBox'));
        const b = await svg.boundingBox(); await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2); await page.mouse.wheel(0, -200); await sleep(200);
        check((await svg.evaluate(e => e.getAttribute('viewBox'))) !== vb0, 'map wheel zoom still works');
    } else check(false, 'map svg found');
} finally { if (logs.length) console.log(logs.slice(0, 5).join('\n')); await close(); }
