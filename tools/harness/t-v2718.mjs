// v2.7.18: 페이블 점검 반영 — 번역 남은 글 · 모델 전환이 전역이 아님 · 반쯤 된 번역 되돌림 · 섞인 줄 번역 ·
//          연락(자세히 기본 · 보낸 메시지 바로 · 첨부 단추 · 간단 모드 세계 규칙) · 관계 보일 것 · 칸 전체 삭제 · 주사위 기록 지우기 · 달력 · 상태 복사 · 설렘 50턴
import { open, makeStatus, sleep, check } from './lib.mjs';
const { page, logs, close } = await open();
try {
    await makeStatus(page, ['profile', 'rel', 'contact', 'dice', 'calendar', 'wallet', 'stats']);

    // ── 번역 ──
    const tr = await page.evaluate(async () => {
        const s = window.__st.extensionSettings.statussim; s.ssGenLang = 'enview'; s.trEngine = 'st'; s.trAuto = 'off';
        const { commit } = await import('/ext/src/engine.js'); const { getMeta } = await import('/ext/src/core.js');
        const app = window.__SS_TEST__.api.app;
        const ct = structuredClone(app.current.state.data.contact); ct.contacts.push({ name: 'Jo', status: 'Life Saver & Close Sanctuary' }); await commit('contact', ct, 'y');
        let stCalls = 0; globalThis.translate = async (t) => { stCalls++; return t.split('\n').map(l => (/Life Saver/.test(l) ? l : `[ko]${l}`)).join('\n'); };
        const T = await import('/ext/src/translate.js');
        // 1) 첫 번역: 실리 번역기가 「Life Saver …」를 그대로 → 번역 모델로 넘길지 물을 때 「취소」
        window.__autoPopup = 'ok';
        let asked = 0; const P = SillyTavern.getContext().Popup.show; const oc = P.confirm; P.confirm = async (h, t) => { if (/번역 모델/.test(t) && /영어 그대로/.test(t)) { asked++; return false; } return true; };
        await T.translateMissing(null);
        const left1 = T.missingTr();
        // 2) 다시 누르면: 실리 번역기로 다시 안 보내고 바로 번역 모델로 넘길지 물음 → 「예」 · 그 사이 다른 번역(자동)은 실리 번역 그대로
        P.confirm = async () => true;
        const st0 = stCalls;
        let concurrent = null;
        window.__ai = async () => { concurrent = await T.trJSON({ list: ['Quiet harbor'] }); return JSON.stringify({ list: ['생명의 은인 & 가까운 안식처'] }); };
        await T.translateMissing(null);
        P.confirm = oc;
        const d = getMeta().tr;
        return { asked, left1: left1.includes('Life Saver & Close Sanctuary'), stAgain: stCalls - st0, b: d['Life Saver & Close Sanctuary'], concurrent: concurrent?.list?.[0], left2: T.missingTr().length };
    });
    check(tr.asked === 0, `stuck text → goes to the translation model without asking (v2.7.19 · ${tr.asked})`);
    check(tr.left1, 'text the translator could not change is still counted as left (🌐 button / 남은 글)');
    check(tr.b === '생명의 은인 & 가까운 안식처', `second press sends it to the model (${tr.b})`);
    check(tr.concurrent === '[ko]Quiet harbor' && tr.stAgain === 1, `model switch is per call — a translation running meanwhile still uses ST (${tr.concurrent} · st ${tr.stAgain})`);

    const half = await page.evaluate(async () => {
        const { getMeta } = await import('/ext/src/core.js'); const { commit } = await import('/ext/src/engine.js');
        const app = window.__SS_TEST__.api.app;
        const ct = structuredClone(app.current.state.data.contact); ct.contacts.push({ name: 'Mo', status: 'Open romantic affection and mutual commitment.' }); await commit('contact', ct, 'z');
        window.__st.extensionSettings.statussim.trRules = 'affection = 애정';
        getMeta().tr['Open romantic affection and mutual commitment.'] = 'Open romantic 애정 and mutual commitment.';
        globalThis.translate = async () => { throw new Error('offline'); };
        window.__ai = () => { throw new Error('offline'); };
        const T = await import('/ext/src/translate.js');
        await T.translateMissing(null);
        return getMeta().tr['Open romantic affection and mutual commitment.'];
    });
    check(half === 'Open romantic 애정 and mutual commitment.', `half-done translation is restored when re-translation fails (${half})`);

    const seg = await page.evaluate(async () => {
        const { trString } = await import('/ext/src/translate.js');
        const d = { 'Open confessions, soft domestic kisses, and quiet promises.': '솔직한 고백, 다정한 입맞춤, 조용한 약속.' };
        return trString('다음 「평화」까지 애정 25 → Open confessions, soft domestic kisses, and quiet promises.', d);
    });
    check(seg === '다음 「평화」까지 애정 25 → 솔직한 고백, 다정한 입맞춤, 조용한 약속.', `mixed line translates the sentence part (${seg})`);
    await page.evaluate(() => { const s = window.__st.extensionSettings.statussim; s.ssGenLang = 'ko'; s.trRules = ''; });

    // ── 연락 ──
    const ct = await page.evaluate(async () => {
        const { commit } = await import('/ext/src/engine.js'); const { contactSimple } = await import('/ext/src/core.js');
        const app = window.__SS_TEST__.api.app;
        const simpleDefault = contactSimple();
        const c = structuredClone(app.current.state.data.contact); c.mode = 'phone'; c.contacts.push({ name: 'Leon' }); await commit('contact', c, 'x');
        const w = structuredClone(app.current.state.data.wallet); w.items.push({ name: '꽃다발', qty: 1, desc: '' }); w.cash = 500; await commit('wallet', w, 'w');
        let release; window.__ai = () => new Promise(r => { release = () => r('응 알았어'); });
        app.openSheet('contact'); await new Promise(r => setTimeout(r, 300));
        const el = document.querySelector('dialog .ss-panel'); el._ss.ui = { who: 'Leon' }; app.renderPanel(el);
        const att = [...el.querySelectorAll('[data-act="catt"]')].map(b => b.dataset.arg);
        const ta = el.querySelector('.ss-cin'); ta.focus(); ta.value = '안녕 레온';
        ta.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
        await new Promise(r => setTimeout(r, 400));
        const shownBefore = [...el.querySelectorAll('.ss-bub.me')].some(b => b.textContent.includes('안녕 레온'));
        release?.(); await new Promise(r => setTimeout(r, 500));
        const reply = [...el.querySelectorAll('.ss-bub:not(.me)')].some(b => b.textContent.includes('응 알았어'));
        return { simpleDefault, att, shownBefore, reply };
    });
    check(ct.simpleDefault === false, 'contacts default to detailed (simple off)');
    check(ct.att.includes('gift') && ct.att.includes('money') && ct.att.includes('photo'), `gift · money · photo buttons are back (${ct.att.join(',')})`);
    check(ct.shownBefore, 'sent message shows right away (before the reply comes)');
    check(ct.reply, 'reply shows without leaving the chat');

    const sim = await page.evaluate(async () => {
        const { commit, buildInjection } = await import('/ext/src/engine.js');
        const app = window.__SS_TEST__.api.app; const s = window.__st.extensionSettings.statussim;
        s.contactSimple = true; s.contactSimpleReflect = 'off';
        const c = structuredClone(app.current.state.data.contact); c.mode = 'letter'; await commit('contact', c, 'l');
        const inj = buildInjection(app.current); const all = `${inj.main}\n${inj.people}`;
        const noPhones = /no phones/i.test(all) || /전화 없음/.test(all);
        const leak = /with Leon|✉Leon/.test(all);
        s.contactSimpleReflect = 'recent'; app.refreshNow();
        const inj2 = buildInjection(app.current);
        const has = /with Leon|✉Leon/.test(`${inj2.main}\n${inj2.people}`);
        s.contactSimple = false; s.contactSimpleReflect = 'off';
        const c2 = structuredClone(app.current.state.data.contact); c2.mode = 'phone'; await commit('contact', c2, 'p');
        return { noPhones, leak, has };
    });
    check(sim.noPhones, 'simple mode in a letter world still tells the AI there are no phones');
    check(!sim.leak, 'simple mode: contacts are not sent to the story by default');
    check(sim.has, 'simple mode + 「recent」: the latest contact is sent briefly');

    // ── 관계 보일 것 ──
    const rel = await page.evaluate(async () => {
        const { commit, buildInjection } = await import('/ext/src/engine.js');
        const app = window.__SS_TEST__.api.app; const s = window.__st.extensionSettings.statussim;
        const r = structuredClone(app.current.state.data.rel); r.user.push({ name: 'Ellis', label: '동반자', aff: 25, trust: 85, memo: '메모 한 줄' }); await commit('rel', r, 'r');
        app.openSheet('rel'); await new Promise(r0 => setTimeout(r0, 300));
        const el = document.querySelector('dialog .ss-panel'); Object.assign(el._ss, { tab: 'rel', mode: 'view', ui: {} }); app.renderPanel(el);
        const before = { stage: !!el.querySelector('.ss-relc .ss-stage'), memo: /메모 한 줄/.test(el.innerHTML), next: /다음 「/.test(el.innerHTML) };
        el.querySelector('[data-act="relshow"][data-arg="__min"]').click(); await new Promise(r0 => setTimeout(r0, 400));
        const el2 = document.querySelector('dialog .ss-panel');
        const card = el2.querySelector('.ss-relc');
        const after = { stage: !!card.querySelector('.ss-stage'), memo: /메모 한 줄/.test(card.innerHTML), next: /다음 「/.test(card.innerHTML), unlock: !!card.querySelector('.ss-unlock'), btns: card.querySelectorAll('.ss-ib').length, meters: card.querySelectorAll('.ss-meter').length };
        const inj = buildInjection(app.current);
        const stageInInj = /단계 「|<[^>]+>/.test(inj.people) && /단계 「/.test(inj.people);
        el2.querySelector('[data-act="relshow"][data-arg="__all"]').click(); await new Promise(r0 => setTimeout(r0, 300));
        const back = s.relStagesOn !== false && s.relShowMemo !== false;
        return { before, after, stageInInj, back };
    });
    check(rel.before.stage && rel.before.memo, 'relationship card shows stage · memo by default');
    check(!rel.after.stage && !rel.after.memo && !rel.after.next && !rel.after.unlock && rel.after.btns === 0 && rel.after.meters === 2, `「숫자만」 leaves only the two numbers (${JSON.stringify(rel.after)})`);
    check(!rel.stageInInj, 'stage off → not sent to the AI either');
    check(rel.back, '「다 보기」 turns everything back on');

    // ── 주사위 기록 지우기 · 칸 전체 삭제 ──
    const wipe = await page.evaluate(async () => {
        const { addAdjust, purgeRolls, wipeModule } = await import('/ext/src/engine.js'); const { getMeta } = await import('/ext/src/core.js');
        const app = window.__SS_TEST__.api.app;
        for (let i = 0; i < 3; i++) await addAdjust({ ops: [['_roll', JSON.stringify({ res: '성공', cls: 'ok', label: `t${i}`, detail: 'd20', t: 1000 + i })]], silent: true });
        const n0 = app.current.state.data.dice.log.length;
        await purgeRolls(app.current.state.data.dice.log[1]);
        const one = app.current.state.data.dice.log.map(x => x.label).join(',');
        await purgeRolls();
        const all = app.current.state.data.dice.log.length, rollAdj = getMeta().adjust.filter(a => a.ops?.some(([k]) => k === '_roll')).length;
        // 연락 칸 전체 삭제: 대화 · 기록 · AI 답의 msg 변화까지 (틀 = 방식 · 앱 이름은 남김)
        const chat = window.__st.chat; chat.push({ name: 'AI', is_user: false, mes: 'x\n<meatball>\nmsg: Leon | 보고 싶어\n</meatball>', swipe_id: 0, swipes: ['x'] });
        app.refreshNow(); await new Promise(r => setTimeout(r, 100));
        const had = (app.current.state.data.contact.threads.Leon ?? []).length;
        const mode0 = app.current.state.data.contact.mode, app0 = app.current.state.data.contact.app;
        await wipeModule('contact'); await new Promise(r => setTimeout(r, 100));
        const c = app.current.state.data.contact;
        const left = Object.values(c.threads).flat().length + c.contacts.length;
        const adjLeft = getMeta().adjust.filter(a => a.set?.mod === 'contact').length;
        return { n0, one, all, rollAdj, had, left, adjLeft, keep: c.mode === mode0 && c.app === app0 };
    });
    check(wipe.n0 === 3 && wipe.one === 't0,t2', `one dice record deleted (${wipe.one})`);
    check(wipe.all === 0 && wipe.rollAdj === 0, 'all dice records deleted with no leftover edit records');
    check(wipe.had > 0 && wipe.left === 0 && wipe.adjLeft === 0, `🧹 wipe empties the panel, its records and old AI changes (had ${wipe.had} → ${wipe.left})`);
    check(wipe.keep, 'wipe keeps the frame (mode · app name)');

    // ── 달력 ──
    const cal = await page.evaluate(async () => {
        const { skeleton } = await import('/ext/src/skeleton.js');
        const ev = skeleton('calendar', 'fantasy').events.length;
        const app = window.__SS_TEST__.api.app;
        app.openSheet('calendar'); await new Promise(r => setTimeout(r, 300));
        const el = document.querySelector('dialog .ss-panel'); Object.assign(el._ss, { tab: 'calendar', mode: 'view', ui: {} }); app.renderPanel(el);
        const t0 = app.current.state.data.calendar.time;
        el.querySelector('[data-act="timenext"]').click(); await new Promise(r => setTimeout(r, 300));
        const t1 = app.current.state.data.calendar.time;
        const el2 = document.querySelector('dialog .ss-panel'); const undo = el2.querySelector('[data-act="timeundo"]');
        const enabled = undo && !undo.disabled; undo?.click(); await new Promise(r => setTimeout(r, 300));
        return { ev, t0, t1, enabled, t2: app.current.state.data.calendar.time, cut: !!document.querySelector('dialog .ss-cal-c i:not(.ss-cal-dots)') };
    });
    check(cal.ev >= 4, `default calendar has yearly events (${cal.ev})`);
    check(cal.t0 !== cal.t1 && cal.enabled && cal.t2 === cal.t0, `time skip can be undone (${cal.t0} → ${cal.t1} → ${cal.t2})`);
    check(!cal.cut, 'no truncated titles inside day cells');

    // ── 상태 복사 · 설렘 50턴 ──
    const dump = await page.evaluate(async () => { const { buildDump } = await import('/ext/src/report.js'); const t = await buildDump(); return { ok: /최근 메시지 원문/.test(t) && /지금 상태 전체/.test(t) && /주입문/.test(t), len: t.length }; });
    check(dump.ok, `state dump has raw messages · state · injection (${dump.len} chars)`);
    const spark = await page.evaluate(async () => {
        const { seeded } = await import('/ext/src/engine.js');
        // 쉬는 턴 3 · 확률 60%: 0턴부터 쭉 굴린 결과와, 턴마다 따로 물어본 결과(50 경계 포함)가 같아야
        const p = 60, cool = 3, key = 'chat1:spark';
        let last = -Infinity; const truth = new Set(); for (let t = 0; t <= 160; t++) if (t - last > cool && seeded(`${key}:${t}`)() * 100 < p) { last = t; truth.add(t); }
        const gaps = [...truth].sort((a, b) => a - b).every((t, i, a) => i === 0 || t - a[i - 1] > cool);
        return { gaps, n: truth.size };
    });
    check(spark.gaps && spark.n > 10, `spark rest turns never break (${spark.n} hits in 160 turns)`);
    const noDead = await page.evaluate(async () => { const { PROMPT_DEFS } = await import('/ext/src/prompts.js'); return PROMPT_DEFS.filter(p => /의도 먼저|먼저 움직이기|사건 한 스푼/.test(p.label)).length; });
    check(noDead === 0, 'removed features are gone from the prompt editor');
    check(!logs.filter(l => !/404|offline/.test(l)).length, 'no console errors', logs.filter(l => !/404|offline/.test(l)).join('\n'));
} finally { await close(); }
