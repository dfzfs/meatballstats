// v2.7.10: 밤샘 점검 — 메인 연결 대기 · 채팅 바뀜 · 답 고침 · 칩 복구 · 분기 + 바뀐 부분 기록
import { open, makeStatus, sleep, check } from './lib.mjs';
const { page, logs, close } = await open();
const S = (f, a) => page.evaluate(f, a);
const st = () => S(() => window.__SS_TEST__.api.app.current.state);
try {
    await makeStatus(page, ['profile', 'stats', 'wallet', 'rel', 'contact']);
    await S(() => { window.__st.extensionSettings.statussim.sync = 'tag'; });
    await S(() => window.__addUser('hi')); await S(() => window.__addAI('ok\n<meatball>\ncash: -5\n</meatball>')); await sleep(150);
    // ① 슬래시 명령처럼 GENERATION_STARTED만 오고 ENDED가 안 와도 확장 AI가 기다리지 않는다
    const t1 = await S(async () => {
        const { aiGenerate } = await import('/ext/src/prompts.js');
        await SillyTavern.getContext().eventSource.emit('generation_started', 'normal', {}, false);
        window.__ai = () => 'pong';
        const a = performance.now(); await aiGenerate('phone', 's', 'p1'); return performance.now() - a;
    });
    check(t1 < 1000, `no wait after a slash-command-only start (${Math.round(t1)}ms)`);
    // ② 실리가 「생성 중」이면 끝날 때까지 기다린다
    const t2 = await S(async () => {
        const { aiGenerate } = await import('/ext/src/prompts.js');
        document.body.dataset.generating = 'true';
        setTimeout(() => { delete document.body.dataset.generating; }, 700);
        const a = performance.now(); await aiGenerate('phone', 's', 'p2'); return performance.now() - a;
    });
    check(t2 >= 650, `waits while main generation runs (${Math.round(t2)}ms)`);
    // ③ 기다리는 동안 채팅이 바뀌면 결과를 버린다 (만들기 창 · 도우미 · 번역은 예외)
    const r3 = await S(async () => {
        const { aiGenerate } = await import('/ext/src/prompts.js');
        window.__ai = () => new Promise(r => setTimeout(() => r('late'), 300));
        const p = aiGenerate('phone', 's', 'p3').then(() => 'kept', e => `dropped: ${e.message}`);
        const q = aiGenerate('help', 's', 'p3').then(() => 'kept', e => `dropped: ${e.message}`);
        await new Promise(r => setTimeout(r, 50));
        const id0 = window.__st.chatId;
        window.__st.chatId = 'other-chat';
        const out = [await p, await q];
        window.__st.chatId = id0;
        return out;
    });
    check(r3[0].startsWith('dropped'), `phone reply dropped after chat switch (${r3[0].slice(0, 40)})`);
    check(r3[1] === 'kept', 'help answer kept after chat switch');
    // ④ 답 글을 고치면 숫자도 바뀐다 (변화 줄 캐시)
    const c0 = (await st()).data.wallet.cash;
    await S(async () => { const st = window.__st; const i = st.chat.length - 1; st.chat[i].mes = 'ok\n<meatball>\ncash: -50\n</meatball>'; st.chat[i].swipes[0] = st.chat[i].mes; await SillyTavern.getContext().eventSource.emit('message_edited', i); });
    await sleep(200);
    check((await st()).data.wallet.cash === c0 - 45, `edited reply recomputed (${c0} → ${(await st()).data.wallet.cash})`);
    // ⑤ 다른 확장이 옛 답 본문을 다시 그려 칩 자리를 지워도 다시 붙는다
    for (let k = 0; k < 3; k++) { await S(() => window.__addUser('go')); await S((k) => window.__addAI(`walk ${k}\n<meatball>\ncash: -1\n</meatball>`), k); }
    await sleep(200);
    const had = await S(() => { const el = document.querySelector('#chat .mes[mesid="3"] .ss-slot'); return !!el?.firstChild; });
    await S(() => { const t = document.querySelector('#chat .mes[mesid="3"] .mes_text'); t.innerHTML = '<p>translated text</p>'; });
    await sleep(300);
    const back = await S(() => !!document.querySelector('#chat .mes[mesid="3"] .ss-slot')?.firstChild);
    check(had && back, `chip restored after another extension re-rendered the message (${had}/${back})`);
    // ⑥ 분기: 분기 지점 뒤의 편집 기록(바뀐 부분 기록 포함)을 버려도 계산이 맞다
    await S(async () => {
        const { commit } = await import('/ext/src/engine.js');
        const add = async (who, text) => { const ct = structuredClone(window.__SS_TEST__.api.app.current.state.data.contact); (ct.threads[who] ??= []).push({ id: text, from: 'me', text, at: 1 }); if (!ct.contacts.some(c => c.name === who)) ct.contacts.push({ name: who }); await commit('contact', ct, text); };
        await add('Mina', 'before-branch');
        await window.__addUser('more'); await window.__addAI('fine');
        await add('Mina', 'after-branch');
    });
    const before = await S(() => window.__SS_TEST__.api.app.current.state.data.contact.threads.Mina.map(m => m.text));
    await S(async () => {
        const st = window.__st; const n = st.chat.length - 2; // 마지막 두 메시지 전에서 분기
        st.chat = st.chat.slice(0, n); st.chatId = 'branch-1'; window.__renderAll();
        await SillyTavern.getContext().eventSource.emit('chat_changed');
    });
    await sleep(300);
    const after = await S(() => window.__SS_TEST__.api.app.current?.state?.data?.contact?.threads?.Mina?.map(m => m.text) ?? []);
    check(before.includes('after-branch') && after.includes('before-branch') && !after.includes('after-branch'), `branch keeps earlier edits only (${JSON.stringify(after)})`);
    // ⑦ 앞 스와이프를 지워도 지금 스와이프의 변화를 그대로 찾는다 (실리처럼 스와이프마다 extra를 따로 둠)
    const sw = await S(async () => {
        const ev = SillyTavern.getContext().eventSource;
        await window.__addUser('swipe test'); const i = await window.__addAI('v0\n<meatball>\ncash: -10\n</meatball>');
        const m = window.__st.chat[i];
        const cash = () => window.__SS_TEST__.api.app.current.state.data.wallet.cash;
        const base = cash() + 10;
        const go = async (sid, text) => { // 실리의 스와이프: 지금 것을 칸에 저장 → 새 칸의 글 · extra를 불러옴
            m.swipe_info[m.swipe_id] = { ...(m.swipe_info[m.swipe_id] ?? {}), extra: structuredClone(m.extra) }; m.swipes[m.swipe_id] = m.mes;
            if (text) { m.swipes[sid] = text; m.swipe_info[sid] = { extra: {} }; }
            m.swipe_id = sid; m.mes = m.swipes[sid]; m.extra = structuredClone(m.swipe_info[sid]?.extra ?? {});
            await ev.emit('message_swiped', i); await new Promise(r => setTimeout(r, 120));
        };
        await go(1, 'v1\n<meatball>\ncash: -20\n</meatball>');
        await go(2, 'v2\n<meatball>\ncash: -30\n</meatball>');
        const at2 = base - cash();
        m.swipes.splice(0, 1); m.swipe_info.splice(0, 1); m.swipe_id = 1;
        await ev.emit('message_swipe_deleted', { messageId: i, swipeId: 0, newSwipeId: 1 }); await new Promise(r => setTimeout(r, 150));
        const afterDel = base - cash();
        await go(0); const back = base - cash();
        return { at2, afterDel, back };
    });
    check(sw.at2 === 30 && sw.afterDel === 30 && sw.back === 20, `swipe delete keeps each swipe's changes (${JSON.stringify(sw)})`);
    // ⑧ 옛 채팅(통째 기록)을 한 번 줄여도 상태는 그대로
    const sl = await S(async () => {
        const E = await import('/ext/src/engine.js'); const { getMeta, normalize } = await import('/ext/src/core.js');
        const meta = getMeta(); delete meta.slim277;
        for (let k = 0; k < 12; k++) {
            const ct = structuredClone(window.__SS_TEST__.api.app.current.state.data.contact);
            (ct.threads.Old ??= []).push({ id: `o${k}`, from: k % 2 ? 'me' : 'them', text: `old message ${k} `.repeat(6), at: k });
            if (!ct.contacts.some(c => c.name === 'Old')) ct.contacts.push({ name: 'Old' });
            meta.adjust.push({ at: window.__st.chat.length, t: Date.now() + k, set: { mod: 'contact', data: normalize('contact', ct) }, label: `legacy ${k}` });
            window.__SS_TEST__.api.refreshNow();
            if (k % 4 === 3) { await window.__addUser('t'); await window.__addAI('x\n<meatball>\nmsg: Old | AI line\n</meatball>'); }
        }
        const J = (o) => JSON.stringify(o, (k, v) => (k === 'arrive' && !v ? 0 : v)); // 같은 뜻 비교: 칸 모양을 맞춘 뒤 (arrive: null = 0)
        const before = J(normalize('contact', E.compute().state.data.contact).threads);
        const kb0 = JSON.stringify(meta.adjust).length;
        const n = E.slimLegacy(meta);
        const after = J(normalize('contact', E.compute().state.data.contact).threads);
        return { n, same: before === after, kb0: Math.round(kb0 / 1024), kb1: Math.round(JSON.stringify(meta.adjust).length / 1024) };
    });
    check(sl.n >= 10 && sl.same && sl.kb1 < sl.kb0, `legacy full records slimmed without changing state (${JSON.stringify(sl)})`);
    // ⑨ (v2.7.11) 저장은 0.3초 안에 · 다른 상태창(MVU)이 같이 돌면 한 번만 알림
    const sv = await S(async () => {
        const c = SillyTavern.getContext(); let n = 0; const orig = c.saveMetadata; c.saveMetadata = async () => { n++; };
        const { saveMeta } = await import('/ext/src/core.js');
        saveMeta(); saveMeta(); saveMeta();
        await new Promise(r => setTimeout(r, 450));
        c.saveMetadata = orig; return n;
    });
    check(sv === 1, `quick saves are batched into one within 0.3s (${sv})`);
    const toasts = await S(async () => {
        const seen = []; const o = toastr.info; toastr.info = (t) => { seen.push(String(t)); };
        await window.__addUser('mvu?'); await window.__addAI('ok\n<UpdateVariable>\n_.set(\'gold\', 1, 2);\n</UpdateVariable>');
        await new Promise(r => setTimeout(r, 150));
        await window.__addUser('again'); await window.__addAI('ok\n<UpdateVariable>\n_.set(\'gold\', 2, 3);\n</UpdateVariable>');
        await new Promise(r => setTimeout(r, 150));
        toastr.info = o; return seen.filter(t => t.includes('MVU')).length;
    });
    check(toasts === 1, `other tracker warned once (${toasts})`);
    check(!(await S(() => window.__errors.length)), 'no listener errors');
} finally { if (logs.length) console.log(logs.slice(0, 5).join('\n')); await close(); }
