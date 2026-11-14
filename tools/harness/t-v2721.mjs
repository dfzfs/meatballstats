// v2.7.21: 👁 보일 것 × AI — 🤖 항목을 끄면 AI에게 보내는 글(전체 · 초압축 · 변화 위주 · 인물 · 로맨스)에서도 빠짐 · 예전에 꺼 둔 것은 화면에서만
import { open, makeStatus, sleep, check } from './lib.mjs';
const { page, logs, close } = await open();
const S = (f, a) => page.evaluate(f, a);
const ai = async (body) => { await S((u) => window.__addUser(u), 'go'); await S((b) => window.__addAI(b), body); await sleep(120); };
const set = (o) => S((o) => { Object.assign(window.__st.extensionSettings.statussim, o); window.__SS_TEST__.api.refreshNow(); }, o);
const inj = () => S(async () => { window.__SS_TEST__.api.refreshNow(); const r = (await import('/ext/src/engine.js')).buildInjection(window.__SS_TEST__.api.app.current); return `${r.main}\n${r.people}\n${r.romance ?? ''}`; });
try {
    const ids = await S(async () => (await import('/ext/src/core.js')).MOD_IDS);
    await makeStatus(page, ids);
    await S(async () => {
        const { commit } = await import('/ext/src/engine.js'); const app = window.__SS_TEST__.api.app;
        const p = structuredClone(app.current.state.data.profile); p.mode = 'detailed';
        p.list = [{ name: 'Leon', role: 'main', summary: 'SUMMARY-LEON', fields: [{ k: 'Age', v: 'FIELD-AGE' }], home: '', sched: '' }]; await commit('profile', p, 'p');
        const q = structuredClone(app.current.state.data.quest);
        q.list = [{ id: 'q1', title: 'Find Cat', status: 'active', desc: 'DESC-CAT', giver: 'GIVER-ANN', place: '', steps: [{ text: 'STEP-BAKER', done: false }], reward: '', cash: 0, items: [] }]; await commit('quest', q, 'q');
        const r = structuredClone(app.current.state.data.rel);
        r.user = [{ name: 'Leon', label: '', aff: 10, trust: 10, memo: 'MEMO-LEON' }]; r.pairs = [{ a: 'Leon', b: 'Mira', label: 'PAIR-RIVALS', memo: '' }]; await commit('rel', r, 'r');
    });
    await set({ deltaMode: false, injectMode: 'full', partsAiMig: true, partsKeepAI: {}, partsOff: {} });
    await ai('Leon waves.\n<meatball>\n</meatball>');

    const on = await inj();
    check(/SUMMARY-LEON/.test(on) && /FIELD-AGE/.test(on), 'profile summary · fields are sent while shown');
    check(/GIVER-ANN/.test(on), 'quest giver is sent while shown');
    check(/PAIR-RIVALS/.test(on), 'pairs are sent while shown');

    // 끄면 AI에게도 안 감
    await set({ partsOff: { profile: ['summary', 'fields'], quest: ['meta'] }, relShowPairs: false });
    const off = await inj();
    check(!/SUMMARY-LEON/.test(off) && !/FIELD-AGE/.test(off), 'hidden profile summary · fields are not sent');
    check(!/GIVER-ANN/.test(off) && /Find Cat/.test(off), 'hidden quest meta is not sent (quest title still is)');
    check(!/PAIR-RIVALS/.test(off), 'hidden relationship pairs are not sent');
    const kept = await S(() => { const d = window.__SS_TEST__.api.app.current.state.data; return d.profile.list[0].summary + '|' + d.quest.list[0].giver + '|' + d.rel.pairs.length; });
    check(kept === 'SUMMARY-LEON|GIVER-ANN|1', `data itself is untouched (${kept})`);

    // 변화 위주 짧은 꼴도 같은 규칙
    await set({ deltaMode: true, deltaEvery: 20, partsOff: { quest: ['steps'] }, relShowPairs: true });
    await ai('Leon walks.\n<meatball>\n</meatball>');
    const sh = await inj();
    check(/short form/.test(sh) && /Find Cat/.test(sh) && !/STEP-BAKER/.test(sh), 'short form also drops hidden quest steps');
    await set({ partsOff: {} });
    check(/STEP-BAKER/.test(await inj()), 'turning it back on sends it again');

    // 화면 전용 항목은 AI 글에 영향 없음
    await set({ deltaMode: false, partsOff: { quest: ['qbtns', 'filter'] } });
    check(/GIVER-ANN/.test(await inj()), 'screen-only parts (buttons · filters) do not change what the AI gets');

    // 2.7.21 앞에 꺼 둔 것: 처음 한 번 「화면에서만」으로 남김
    const mig = await S(async () => {
        const C = await import('/ext/src/core.js'); const st = window.__st.extensionSettings.statussim;
        Object.assign(st, { partsAiMig: false, partsKeepAI: undefined, partsOff: { profile: ['summary'] }, relShowMemo: false });
        const n = C.migrateParts();
        return { n, keep: st.partsKeepAI, offNow: C.aiOff('profile', 'summary'), memo: C.aiOff('rel', 'relShowMemo') };
    });
    check(mig.n === 2 && !mig.offNow && !mig.memo, `parts hidden before the update stay screen-only (${JSON.stringify(mig)})`);
    check(/SUMMARY-LEON/.test(await inj()), '…so the AI still gets them');
    await S(async () => { (await import('/ext/src/core.js')).partTouched('profile', 'summary'); });
    check(!/SUMMARY-LEON/.test(await inj()), 'after the user touches it again, hiding also hides it from the AI');

    // 화면: 🤖 표시
    const pill = await S(async () => {
        const app = window.__SS_TEST__.api.app; const el = document.querySelector('.ss-panel');
        el._ss.tab = 'profile'; el._ss.mode = 'view'; el._ss.ui = {}; app.renderPanel(el);
        const b = [...el.querySelectorAll('.ss-partbar [data-act="partshow"]')];
        return { ai: b.filter(x => x.querySelector('.fa-robot')).map(x => x.dataset.arg), plain: b.filter(x => !x.querySelector('.fa-robot')).map(x => x.dataset.arg) };
    });
    check(pill.ai.includes('summary') && pill.ai.includes('fields') && !pill.ai.includes('hint') && !pill.ai.includes('talk'), `🤖 mark only on AI-linked parts (${JSON.stringify(pill)})`);

    // 관계 「숫자만」: 로맨스 보정의 빈칸 채우는 문장까지 빠져서 실제로 줄어듦 (예전엔 더 긴 문장으로 바뀌어 토큰이 그대로)
    const rl = await S(async () => {
        const E = await import('/ext/src/engine.js'), C = await import('/ext/src/core.js'); const app = window.__SS_TEST__.api.app;
        const st = window.__st.extensionSettings.statussim;
        Object.assign(st, { injectMode: 'lite', romFacts: true, romDrive: true, partsKeepAI: {}, relStagesOn: true, relShowUnlock: true, relShowWants: true });
        const { commit } = E; const r = structuredClone(app.current.state.data.rel);
        r.stages = [{ name: 'Comrades', at: -100, trust: 0, unlock: 'UNLOCK-TEASING', love: false }, { name: 'Anchor', at: 60, trust: 85, unlock: 'UNLOCK-DEVOTION', love: true }];
        r.user = [{ name: 'Leon', label: '', aff: 25, trust: 80, likes: 'LIKES-COFFEE' }]; await commit('rel', r, 'r');
        const txt = () => { window.__SS_TEST__.api.refreshNow(); const x = E.buildInjection(app.current); return [x.main, x.people, x.romance].filter(Boolean).join('\n'); };
        const before = txt();
        const el = document.querySelector('.ss-panel'); el._ss.tab = 'rel'; el._ss.mode = 'view'; el._ss.ui = {}; app.renderPanel(el);
        el.querySelector('[data-act="relshow"][data-arg="__min"]').click(); await new Promise(r => setTimeout(r, 300));
        const after = txt();
        el.querySelector('[data-act="relshow"][data-arg="__all"]').click(); await new Promise(r => setTimeout(r, 300));
        return { b: before.length, a: after.length, unlock: /UNLOCK-/.test(after), likes: /LIKES-COFFEE|infer from the character/.test(after), stage: /stage 「/.test(after), had: /UNLOCK-TEASING/.test(before) && /LIKES-COFFEE/.test(before) };
    });
    check(rl.had && !rl.unlock && !rl.likes && !rl.stage && rl.a < rl.b - 200, `relationship 「numbers only」 really shrinks what the AI gets (${JSON.stringify(rl)})`);

    // 「AI에게 통째로 가리기」: 칸의 규칙 줄까지 빠져서 실제로 줄어듦
    const hid = await S(async () => {
        const E = await import('/ext/src/engine.js'); const app = window.__SS_TEST__.api.app; const el = document.querySelector('.ss-panel');
        const len = () => { window.__SS_TEST__.api.refreshNow(); return E.buildInjection(app.current).main; };
        const before = len();
        el._ss.tab = 'dice'; el._ss.mode = 'view'; el._ss.ui = {}; app.renderPanel(el);
        const btn = el.querySelector('.ss-partbar [data-act="hidetog"]'); if (!btn) return { nobtn: true };
        btn.click(); await new Promise(r => setTimeout(r, 300));
        const after = len();
        return { before: before.length, after: after.length, diceBefore: /Dice:/.test(before), diceAfter: /Dice:/.test(after) };
    });
    check(!hid.nobtn && hid.diceBefore && !hid.diceAfter && hid.after < hid.before, `hiding a whole tab from the AI drops its rule lines too (${JSON.stringify(hid)})`);

    // 💭 속마음: 켜면 그 턴 주입문에 요청 · AI가 적은 mind 줄이 카드 · 미니창에 · 사이드 미니창에서 빈도 바꾸기
    const md = await S(async () => {
        const E = await import('/ext/src/engine.js'); const app = window.__SS_TEST__.api.app; const st = window.__st.extensionSettings.statussim;
        const main = () => { window.__SS_TEST__.api.refreshNow(); return E.buildInjection(app.current).main; };
        Object.assign(st, { mindMode: 'off', mindFreq: 'always', sync: 'tag' });
        const off = /mind: Name/.test(main());
        const el = document.querySelector('.ss-panel'); el._ss.tab = 'rel'; el._ss.mode = 'view'; el._ss.ui = {}; app.renderPanel(el);
        el.querySelector('[data-act="mindset"][data-arg="mode:kaomoji"]').click(); await new Promise(r => setTimeout(r, 200));
        const inj = main();
        return { off, on: /mind: Name/.test(inj) && /kaomoji/.test(inj), side: st.sideMini.includes('mind'), mode: st.mindMode };
    });
    check(!md.off && md.on && md.side && md.mode === 'kaomoji', `mind mode on → this turn asks for mind lines (kaomoji) and adds the minibar widget (${JSON.stringify(md)})`);
    await S((u) => window.__addUser(u), 'Leon hi'); await S((b) => window.__addAI(b), 'Leon smiles.\n<meatball>\nmind: Leon | (⁄ ⁄•⁄ω⁄•⁄ ⁄)\n</meatball>'); await sleep(150);
    const shown = await S(async () => {
        const app = window.__SS_TEST__.api.app; window.__SS_TEST__.api.refreshNow();
        const el = document.querySelector('.ss-panel'); el._ss.tab = 'rel'; el._ss.mode = 'view'; el._ss.ui = {}; app.renderPanel(el);
        const { miniWidgets } = await import('/ext/src/views.js');
        const box = document.createElement('div'); box.innerHTML = miniWidgets(app.current.state, ['mind'], false); document.body.appendChild(box);
        const { renderHud } = await import('/ext/src/shell.js'); renderHud();
        return { stored: app.current.state.data.rel.user.find(x => x.name === 'Leon')?.mind?.text, card: el.querySelector('.ss-mind')?.textContent ?? '', mini: box.textContent, ctl: !!box.querySelector('[data-side]'), hud: [...document.querySelectorAll('#ss-hud .t-mind')].map(x => x.textContent).join('') };
    });
    check(shown.stored === '(⁄ ⁄•⁄ω⁄•⁄ ⁄)' && /ω/.test(shown.card) && /ω/.test(shown.mini) && /ω/.test(shown.hud) && !shown.ctl, `mind is stored and shown on the card, minibar (no buttons) and HUD (${JSON.stringify(shown)})`);
    // AI가 속마음을 msg 키로 적어도 (카모지 · 이모티콘) 연락이 아니라 속마음으로
    await S((u) => window.__addUser(u), 'Leon?'); await S((b) => window.__addAI(b), 'Leon sighs.\n<meatball>\nmsg: Leon | (￣ヘ￣)\n</meatball>'); await sleep(150);
    const mf = await S(() => { const d = window.__SS_TEST__.api.app.current.state.data; return { mind: d.rel.user.find(x => x.name === 'Leon')?.mind?.text, msgs: (d.contact?.threads?.Leon ?? []).filter(m => m.text === '(￣ヘ￣)').length }; });
    check(mf.mind === '(￣ヘ￣)' && mf.msgs === 0, `kaomoji written with the msg key becomes a mind, not a message (${JSON.stringify(mf)})`);
    const keys = await S(async () => { window.__SS_TEST__.api.refreshNow(); return (await import('/ext/src/engine.js')).buildInjection(window.__SS_TEST__.api.app.current).main; });
    check(/^Keys.*\bmind\b/m.test(keys) || /mind \(이름/.test(keys), `the key list given to the AI includes mind (${keys.split('\n').find(l => /^Keys/.test(l))?.slice(0, 400)})`);
    const rnd = await S(async () => {
        const E = await import('/ext/src/engine.js'); const st = window.__st.extensionSettings.statussim;
        Object.assign(st, { mindFreq: 'random', mindPct: 35 }); let n = 0; for (let t = 0; t < 200; t++) if (E.mindActive(t)) n++;
        st.mindMode = 'off'; return n;
    });
    check(rnd > 40 && rnd < 110, `random frequency fires on about 35% of turns (${rnd}/200)`);

    const errs = logs.filter(l => /error|TypeError|ReferenceError/i.test(l));
    check(!errs.length, `no console errors ${errs.slice(0, 3).join(' | ')}`);
} finally { await close(); }
