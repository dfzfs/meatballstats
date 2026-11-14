// v2.7.19: 「있는데 안 되는 기능」 점검 — 설정을 켰을 때 AI 답이 오면 정말 그렇게 되는지
import { open, makeStatus, sleep, check } from './lib.mjs';
const { page, logs, close } = await open();
const S = (f, a) => page.evaluate(f, a);
const ai = async (body, user = 'go') => { await S((u) => window.__addUser(u), user); await S((b) => window.__addAI(b), body); await sleep(150); };
const st = () => S(() => JSON.parse(JSON.stringify(window.__SS_TEST__.api.app.current.state)));
const inj = () => S(async () => { const E = await import('/ext/src/engine.js'); const r = E.buildInjection(window.__SS_TEST__.api.app.current); return `${r.main}\n${r.people}\n${r.romance ?? ''}`; });
const set = (o) => S((o) => { Object.assign(window.__st.extensionSettings.statussim, o); window.__SS_TEST__.api.app.refreshNow?.(); }, o);
const aff = (s, n) => s.data.rel.user.find(r => r.name === n);
try {
    const ids = await S(async () => (await import('/ext/src/core.js')).MOD_IDS);
    await makeStatus(page, ids);
    await S(async () => {
        const { commit } = await import('/ext/src/engine.js'); const app = window.__SS_TEST__.api.app;
        const r = structuredClone(app.current.state.data.rel);
        r.user = [{ name: 'Leon', label: '', aff: 10, trust: 10 }, { name: 'Mira', label: '', aff: 60, trust: 40 }];
        await commit('rel', r, 'r');
    });
    // ① 한 번에 오르는 상한
    await set({ romCap: true, romCapAff: 5, romFatigue: false });
    let a0 = aff(await st(), 'Leon').aff;
    await ai('Leon blushes.\n<meatball>\naff: Leon +20\n</meatball>');
    let a1 = aff(await st(), 'Leon').aff;
    check(a1 - a0 === 5, `romCap: +20 is capped to +5 (${a1 - a0})`);
    // ② 연달아 오르면 덜 오름
    await set({ romCap: false, romFatigue: true });
    const g = [];
    for (let i = 0; i < 4; i++) { const b = aff(await st(), 'Leon').aff; await ai('Leon smiles.\n<meatball>\naff: Leon +5\n</meatball>'); g.push(aff(await st(), 'Leon').aff - b); }
    check(g[0] === 5 && g.at(-1) < 5, `romFatigue: repeated gains shrink (${g.join(',')})`);
    await set({ romFatigue: false });
    // ③ 질투
    await set({ jealousy: true });
    const j0 = aff(await st(), 'Mira').jealous ?? 0;
    await ai('Leon kisses you.\n<meatball>\naff: Leon +8\n</meatball>');
    const j1 = aff(await st(), 'Mira').jealous ?? 0;
    check(j1 > j0, `jealousy: Mira gets jealous when Leon gets close (${j0}→${j1})`);
    await set({ jealousy: false });
    // ④ 단계 잠금 · 우정만 · 연인 확정 — 「변화 위주」의 짧은 턴에도 가야 함 (예전엔 4턴 중 3턴은 빠졌음)
    await set({ deltaMode: true, deltaEvery: 50, stageLock: true, romBond: true });
    await S(async () => { const { addAdjust } = await import('/ext/src/engine.js'); await addAdjust({ ops: [['_nolove', 'Mira']], label: 'x' }); });
    await ai('Leon and Mira wave.\n<meatball>\n</meatball>', 'Leon, Mira hi');
    const sh = await inj();
    check(/short form/.test(sh), 'short (delta) turn is being tested');
    check(/🚫♥/.test(sh) && /platonic only/.test(sh), 'short turn still tells the AI who is platonic-only (and what 🚫♥ means)');
    check(/do not act beyond/.test(sh), 'short turn still carries the stage lock');
    await set({ deltaMode: false, stageLock: false, romBond: false });
    await S(async () => { const { addAdjust } = await import('/ext/src/engine.js'); await addAdjust({ ops: [['_love', 'Mira']], label: 'x' }); });
    await set({ offscreen: true }); const o1 = await inj(); await set({ offscreen: false }); const o2 = await inj();
    check(o1 !== o2 || /off-?screen/i.test(o1), 'offscreen life changes what the AI is told');
    // ⑤ 아이템 효과 · 일거리 효과 (영어 게이지 이름도)
    const eff = await S(async () => {
        const { commit } = await import('/ext/src/engine.js'); const app = window.__SS_TEST__.api.app;
        const st0 = structuredClone(app.current.state.data.stats); st0.bars.push({ name: 'Stamina', cur: 50, max: 100 }, { name: 'Stress', cur: 20, max: 100 }); await commit('stats', st0, 's');
        const w = structuredClone(app.current.state.data.wallet); w.items.push({ name: 'Jerky', qty: 2, desc: '', effect: 'Stamina +30, Stress -5' }); await commit('wallet', w, 'w');
        app.openSheet('wallet'); await new Promise(r => setTimeout(r, 300));
        document.querySelector('dialog [data-act="useitem"][data-arg="Jerky"]')?.click(); await new Promise(r => setTimeout(r, 400));
        const b = app.current.state.data.stats.bars; document.querySelector('dialog .popup-button-ok')?.click();
        return { sta: b.find(x => x.name === 'Stamina').cur, str: b.find(x => x.name === 'Stress').cur, qty: app.current.state.data.wallet.items.find(i => i.name === 'Jerky')?.qty };
    });
    check(eff.sta === 80 && eff.str === 15 && eff.qty === 1, `item effect applies (Stamina ${eff.sta} · Stress ${eff.str} · left ${eff.qty})`);
    // ⑤-2 AI가 한 줄에 쉼표로 여러 개 적을 때
    const m0 = await st(); const sb = (x, n) => x.data.stats.bars.find(b => b.name === n).cur;
    await ai('Tired.\n<meatball>\nstat: Stamina -10, Stress +7\naff: Leon +2, Mira +3\nattr: 힘 +1, 민첩 +1\ncash: +1,000\n</meatball>');
    const m1 = await st();
    check(sb(m1, 'Stamina') - sb(m0, 'Stamina') === -10 && sb(m1, 'Stress') - sb(m0, 'Stress') === 7, `AI "stat: A -10, B +7" changes both (${sb(m1, 'Stamina') - sb(m0, 'Stamina')}, ${sb(m1, 'Stress') - sb(m0, 'Stress')})`);
    check(aff(m1, 'Leon').aff - aff(m0, 'Leon').aff > 0 && aff(m1, 'Mira').aff - aff(m0, 'Mira').aff > 0, `AI "aff: Leon +2, Mira +3" raises both (${aff(m1, 'Leon').aff - aff(m0, 'Leon').aff}, ${aff(m1, 'Mira').aff - aff(m0, 'Mira').aff})`);
    const at = (x, n) => x.data.stats.attrs.find(a => a.name === n)?.val;
    check(at(m1, '힘') - at(m0, '힘') === 1 && at(m1, '민첩') - at(m0, '민첩') === 1, 'AI "attr: A +1, B +1" changes both');
    check(m1.data.wallet.cash - m0.data.wallet.cash === 1000, `"cash: +1,000" stays one number (${m1.data.wallet.cash - m0.data.wallet.cash})`);
    await ai('Ugh.\n<meatball>\ncond: +Poisoned, +Tired\nitem: +Bread, +Water 2\n</meatball>');
    const m2 = await st();
    check(['Poisoned', 'Tired'].every(n => m2.data.stats.conds.some(c => c.name === n)), `AI "cond: +A, +B" adds both (${m2.data.stats.conds.map(c => c.name)})`);
    check(m2.data.wallet.items.some(i => i.name === 'Bread') && m2.data.wallet.items.find(i => i.name === 'Water')?.qty === 2, 'AI "item: +A, +B 2" adds both');
    // ⑤-3 연애 느낌 단계가 우정만으로 열리던 사다리
    const lad = await S(async () => {
        const { commit } = await import('/ext/src/engine.js'); const app = window.__SS_TEST__.api.app;
        const r = structuredClone(app.current.state.data.rel);
        r.affName = '애정'; r.trustName = '우정';
        r.stages = [{ name: 'Allies', at: -100, trust: 0, unlock: 'Guarded exchanges' }, { name: 'Comrades', at: -100, trust: 40, unlock: 'Casual teasing' }, { name: 'Sanctuary', at: -100, trust: 70, unlock: 'Shared porch naps' },
            { name: 'Lingering Warmth', at: -100, trust: 75, unlock: 'Involuntary lingering touches, gentle teasing, unspoken possessiveness' }, { name: "Heart's Anchor", at: 60, trust: 85, unlock: 'Mutual romantic devotion', love: true }];
        r.user = [{ name: 'Bro', label: 'Elder Brother', aff: 0, trust: 90 }, { name: 'Doc', label: 'Companion', aff: 25, trust: 80 }];
        await commit('rel', r, 'r');
        const stg = () => app.current.state.data.rel.user.map(u => app.current.state.data.rel.stages[u.stage]?.name);
        const before = stg();
        app.openSheet('rel'); await new Promise(r => setTimeout(r, 300));
        const btn = document.querySelector('dialog [data-act="relladder"]'); const had = !!btn; btn?.click(); await new Promise(r => setTimeout(r, 400));
        app.renderPanel(document.querySelector('dialog .ss-panel')); const gone = !document.querySelector('dialog [data-act="relladder"]');
        document.querySelector('dialog .popup-button-ok')?.click();
        return { before, after: stg(), had, gone };
    });
    check(lad.had && lad.gone, 'romantic-looking stage reachable by friendship alone is flagged, and 고치기 clears it');
    check(lad.after[0] !== 'Lingering Warmth' && lad.after[1] === 'Lingering Warmth', `after fixing: brother (aff 0) drops out of it, the love interest (aff 25) stays (${lad.before} → ${lad.after})`);
    // ⑤-4 기본 업적은 숫자로 직접 확인
    await ai('Leon grins.\n<meatball>\ntrust: Leon +30\n</meatball>');
    const ach = (await st()).data.ach.list;
    check(ach.find(a => a.name === '첫 친구')?.done === true, `「첫 친구」 is earned automatically once friendship passes 25 (${ach.filter(a => a.done).map(a => a.name)})`);
    check(ach.find(a => a.name === '해결사')?.done !== true, 'achievements whose condition is not met stay locked');
    // ⑥ 퀘스트 기한
    await S(async () => {
        const { commit } = await import('/ext/src/engine.js'); const app = window.__SS_TEST__.api.app; const c = app.current.state.data.calendar;
        const q = structuredClone(app.current.state.data.quest); q.list.push({ id: 'qx', title: 'Deliver bread', status: 'active', desc: '', giver: '', place: '', deadline: `${c.y}-${c.m}-${c.d}`, steps: [], reward: '', cash: 0, items: [] });
        await commit('quest', q, 'q');
    });
    await ai('Days pass.\n<meatball>\ndays: +3\n</meatball>');
    const qx = (await st()).data.quest.list.find(q => q.id === 'qx') ?? (await st()).data.quest.archive?.find(q => q.id === 'qx');
    check(qx && qx.status !== 'active', `questExpire: overdue quest stops being active (${qx?.status})`);
    // ⑧ 장면 필터: 최근에 안 나온 사람은 짧게
    await set({ sceneFilter: true, sceneTurns: 2 }); const sf1 = await inj();
    await set({ sceneFilter: false }); const sf2 = await inj();
    check(sf1.length <= sf2.length, `sceneFilter makes the people part shorter or equal (${sf1.length} vs ${sf2.length})`);
    // ⑩ 고백 확정 (romBond): 연인 단계는 💍 확정 전엔 안 넘어감
    await set({ romBond: true });
    await ai('Leon confesses.\n<meatball>\naff: Leon +90\ntrust: Leon +90\n</meatball>');
    const L = aff(await st(), 'Leon');
    check(L.bondReady === true && !L.bond, `romBond: love stage waits for 💍 confirmation (ready ${L.bondReady})`);
    await set({ romBond: false });
    const errs = logs.filter(l => /TypeError|ReferenceError|error/i.test(l) && !/translate/i.test(l));
    check(!errs.length, `no console errors ${errs.slice(0, 3).join(' | ')}`);
} finally { await close(); }
