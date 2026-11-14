// v2.7.5: 퀘스트 기한 · 진행 기록 · 이야기에서 빠진 사람 · 쓸모없는 태그 자동 분석 · 본 탭 기억
import { open, makeStatus, sleep, check } from './lib.mjs';
const { page, logs, close } = await open();
const S = (f, a) => page.evaluate(f, a);
const st = () => S(() => window.__SS_TEST__.api.app.current.state);
try {
    await makeStatus(page);
    await S(() => window.__addUser('job?'));
    await S(() => window.__addAI('Leon gives you a job.\n<meatball>\nquest: Deliver Bread | 수락 | bring bread to the mill\n</meatball>'));
    await sleep(150);
    // 기한: 3일 안에 (직접 편집으로 기한 넣기)
    await S(async () => { const { commit } = await import('/ext/src/engine.js'); const s = window.__SS_TEST__.api.app.current.state; const nd = structuredClone(s.data.quest); nd.list[0].deadline = '3일 안에'; nd.list[0].steps = [{ text: 'buy bread', done: false }, { text: 'reach the mill', done: false }]; await commit('quest', nd, 'x'); });
    let q = (await st()).data.quest.list[0];
    check(Number.isFinite(q.due) && q.due - q.since === 3, `due resolved (since ${q.since} → due ${q.due})`);
    // 진행: 할 일과 비슷한 진행 → 체크 · 새 진행 → 해 둔 기록
    await S(() => window.__addUser('go'));
    await S(() => window.__addAI('You buy bread.\n<meatball>\nquest: Deliver Bread | buy bread\nquest: Deliver Bread | chatted with the baker\n</meatball>'));
    await sleep(150);
    q = (await st()).data.quest.list[0];
    check(q.steps.find(x => x.text === 'buy bread').done && q.steps.find(x => x.text === 'chatted with the baker')?.done && !q.steps.find(x => x.text === 'reach the mill').done, `steps: ${JSON.stringify(q.steps)}`);
    // 처음 보는 퀘스트의 진행만 → 진행 중
    await S(() => window.__addUser('more'));
    await S(() => window.__addAI('Side thing.\n<meatball>\nquest: Find Ring | searched the well\n</meatball>'));
    await sleep(150);
    const ring = (await st()).data.quest.list.find(x => x.title === 'Find Ring');
    check(ring?.status === 'active' && ring.steps[0]?.done, `progress-only quest → active (${ring?.status})`);
    // D-n 칩
    await S(() => { window.__SS_TEST__.api.app.openSheet('quest'); }); await sleep(300);
    const chipTxt = await page.$$eval('dialog .ss-quest .ss-meta .ss-chip', x => x.map(e => e.textContent));
    check(chipTxt.includes('D-3'), `D-n chip (${chipTxt})`);
    await S(() => document.querySelector('dialog .popup-button-ok').click()); await sleep(150);
    // 3일 지나면 → 마지막 날 알림 · 넘기면 실패
    await S(() => window.__addUser('wait'));
    await S(() => window.__addAI('Days pass.\n<meatball>\ndate: +3\n</meatball>'));
    await sleep(150);
    let snapAlerts = await S(() => { const a = window.__SS_TEST__.api.app.current; return a.snaps.get(a.lastAI).alerts; });
    check(snapAlerts.some(a => String(a).includes('오늘까지')), `last-day alert (${snapAlerts})`);
    await S(() => window.__addUser('wait more'));
    await S(() => window.__addAI('Another day.\n<meatball>\ndate: +1\n</meatball>'));
    await sleep(150);
    q = (await st()).data.quest.list.find(x => x.title === 'Deliver Bread');
    check(q.status === 'failed' && q.expired, `expired → failed (${q.status})`);
    // AI가 기한 지난 퀘스트를 되살리지 못함
    await S(() => window.__addUser('?'));
    await S(() => window.__addAI('x\n<meatball>\nquest: Deliver Bread | 진행\n</meatball>'));
    await sleep(150);
    check((await st()).data.quest.list.find(x => x.title === 'Deliver Bread').status === 'failed', 'expired stays failed');
    // 🕊 이야기에서 빠짐
    await S(async () => { const { addAdjust } = await import('/ext/src/engine.js'); await addAdjust({ ops: [['aff', 'Mia +5']], label: 'm' }); });
    await S(async () => { const { addAdjust } = await import('/ext/src/engine.js'); await addAdjust({ ops: [['_leave', 'Mia|dead']], label: 'd' }); });
    await sleep(100);
    const inj = await S(() => JSON.stringify(window.__prompts));
    check(/Out of the story \(Mia — died\)/.test(inj), 'out-of-story line sent');
    const people = await S(() => window.__prompts.statussim_people?.value ?? '');
    check(!/\bMia\b/.test(people), 'Mia removed from people block');
    await S(() => { window.__SS_TEST__.api.app.openSheet('rel'); }); await sleep(300);
    check(!!(await page.$('dialog .ss-relc.out')), 'rel card greyed');
    await S(() => document.querySelector('dialog .popup-button-ok').click()); await sleep(150);
    // 쓸모없는 태그 → 자동 분석 (A+B)
    await S(() => { window.__st.extensionSettings.statussim.sync = 'tagPlus'; window.__aiCalls = 0; window.__ai = () => { window.__aiCalls++; return '<meatball>\ncash: -7\n</meatball>'; }; });
    const c0 = (await st()).data.wallet.cash;
    await S(() => window.__addUser('buy'));
    await S(() => window.__addAI('She smiles.\n<meatball>\nmood: happy\n</meatball>'));
    await sleep(400);
    check((await S(() => window.__aiCalls)) === 1 && (await st()).data.wallet.cash === c0 - 7, 'unknown-only tag → analyzed automatically');
    await S(() => window.__addUser('nothing'));
    await S(() => window.__addAI('Quiet.\n<meatball>\n</meatball>'));
    await sleep(300);
    check((await S(() => window.__aiCalls)) === 1, 'empty tag (no change) → no extra AI call');
    // 본 탭 기억
    await S(() => window.__addUser('pay'));
    await S(() => window.__addAI('Pay.\n<meatball>\ncash: +1\n</meatball>'));
    await sleep(150);
    await S(() => { window.__SS_TEST__.api.app.openSheet('wallet'); }); await sleep(300);
    await S(() => document.querySelector('dialog .popup-button-ok').click()); await sleep(150);
    const saved = await S(async () => (await import('/ext/src/core.js')).getMeta().freshSeen);
    check(saved?.mods?.includes('wallet'), `seen saved (${JSON.stringify(saved)})`);
} finally { console.log(logs.join('\n')); await close(); }
