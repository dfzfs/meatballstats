// v2.7.20: 편집 기록 차례 · 메시지 지우기 · 분기 채팅 · 다시 생성 후 옛 소문 · 영어 저장 연락 열쇠 · 빈 기록 · 짧은 주입문
import { open, makeStatus, sleep, check } from './lib.mjs';
const { page, logs, close } = await open();
const S = (f, a) => page.evaluate(f, a);
const ai = async (body, user = 'go') => { await S((u) => window.__addUser(u), user); await S((b) => window.__addAI(b), body); await sleep(120); };
const st = () => S(() => { window.__SS_TEST__.api.refreshNow(); return JSON.parse(JSON.stringify(window.__SS_TEST__.api.app.current.state)); });
const meta = () => S(async () => JSON.parse(JSON.stringify((await import('/ext/src/core.js')).getMeta())));
// 실리태번처럼: 마지막 메시지를 빼고 MESSAGE_DELETED (다시 생성도 이 길로 지움)
const delLast = () => S(async () => { const st = window.__st; st.chat.pop(); window.__renderAll(); await window.__SS_TEST__.emit?.('message_deleted', st.chat.length); });
try {
    // 이벤트를 테스트에서 직접 쏠 수 있게
    await S(() => { const c = SillyTavern.getContext(); window.__SS_TEST__.emit = (n, ...a) => c.eventSource.emit(n, ...a); });
    const ids = await S(async () => (await import('/ext/src/core.js')).MOD_IDS);
    await makeStatus(page, ids);
    await S(async () => { Object.assign(window.__st.extensionSettings.statussim, { deltaMode: true, deltaEvery: 20 }); });

    // ⓪ orderAdjust: 시간 순 · 뒤 편집의 at으로 당김
    const ord = await S(async () => { const { orderAdjust } = await import('/ext/src/engine.js'); return orderAdjust([{ at: 2, t: 1, n: 'a' }, { at: 1, t: 2, n: 'b' }, { at: 3, t: 3, n: 'c' }]).map(e => `${e.n}${e.at}`).join(','); });
    check(ord === 'a1,b1,c3', `orderAdjust keeps time order and pulls earlier edits down (${ord})`);

    // ① 첫 턴은 전체 주입
    await ai('Leon nods.\n<meatball>\n</meatball>');
    const inj1 = await S(async () => (await import('/ext/src/engine.js')).buildInjection(window.__SS_TEST__.api.app.current).main);
    check(!/short form/.test(inj1), 'turn 1 sends the full state, not the short form');

    // ② 짧은 꼴에도 소지품 · 진행 퀘스트 다음 단계 · 근처 장소
    await S(async () => {
        const { commit } = await import('/ext/src/engine.js'); const app = window.__SS_TEST__.api.app;
        const w = structuredClone(app.current.state.data.wallet); w.items = [{ name: 'Rusty Key', qty: 1, desc: '', effect: '' }]; await commit('wallet', w, 'w');
        const q = structuredClone(app.current.state.data.quest); q.list = [{ id: 'q1', title: 'Find Cat', status: 'active', desc: '', giver: 'Ann', place: '', steps: [{ text: 'Ask the baker', done: false }], reward: '', cash: 0, items: [] }]; await commit('quest', q, 'q');
    });
    await ai('Leon walks.\n<meatball>\n</meatball>');
    const inj2 = await S(async () => (await import('/ext/src/engine.js')).buildInjection(window.__SS_TEST__.api.app.current).main);
    check(/short form/.test(inj2), 'turn 2 uses the short form');
    check(/Rusty Key/.test(inj2), 'short form carries item names');
    check(/Find Cat → Ask the baker/.test(inj2), 'short form carries the active quest and its next step');
    check(!/sent a few turns ago/.test(inj2), 'short form no longer claims the full state was sent earlier');

    // ③ 빈 기록은 남기지 않음
    const n0 = (await meta()).adjust.length;
    await S(async () => { const { commit } = await import('/ext/src/engine.js'); const app = window.__SS_TEST__.api.app; await commit('contact', structuredClone(app.current.state.data.contact), ''); });
    check((await meta()).adjust.length === n0, 'a commit that changes nothing is not recorded');

    // ④ 메시지를 지운 뒤 한 삭제가 그 전 편집에 덮이지 않음 (지운 대화방이 되살아나던 것)
    await S(async () => {
        const { commit } = await import('/ext/src/engine.js'); const app = window.__SS_TEST__.api.app;
        const c = structuredClone(app.current.state.data.contact);
        c.contacts = [{ name: 'Kai', handle: '', status: '', courier: '', reflect: '', blocked: false }];
        c.threads = { Kai: [{ id: 'm1', from: 'me', text: 'hi', kind: 'text' }] };
        await commit('contact', c, 'add thread');
    });
    await delLast();
    await S(async () => {
        const { commit } = await import('/ext/src/engine.js'); const app = window.__SS_TEST__.api.app;
        window.__SS_TEST__.api.refreshNow();
        const c = structuredClone(app.current.state.data.contact); delete c.threads.Kai; c.contacts = []; await commit('contact', c, 'del thread');
    });
    await S((b) => window.__addAI(b), 'Leon is back.\n<meatball>\n</meatball>'); await sleep(120);
    const s4 = await st();
    check(!s4.data.contact.threads?.Kai && !s4.data.contact.contacts.length, `thread deleted after a message delete stays deleted (${Object.keys(s4.data.contact.threads ?? {})})`);

    // ⑤ v2.7.21: 답을 보고 한 행동(구매 등)은 그 답에 묶임 — 다시 생성하면 사라지고, 원래 스와이프로 돌아오면 살아남
    const cash0 = (await st()).data.wallet.cash;
    await S(async () => { const { addAdjust } = await import('/ext/src/engine.js'); await addAdjust({ ops: [['cash', '+777']], label: 'tip' }); });
    check((await st()).data.wallet.cash - cash0 === 777, 'action after a reply is applied');
    await S(async () => { const st = window.__st, m = st.chat.at(-1); m.swipe_info ??= [{}]; m.swipe_info[0].send_date ??= m.send_date; m.swipes.push('Leon B.\n<meatball>\n</meatball>'); m.swipe_info.push({ extra: {} }); m.swipe_id = 1; m.mes = m.swipes[1]; window.__renderAll(); await window.__SS_TEST__.emit('message_swiped', st.chat.length - 1); });
    await sleep(150);
    check((await st()).data.wallet.cash === cash0, `swiping to another reply removes the action (${(await st()).data.wallet.cash - cash0})`);
    await S(async () => { const st = window.__st, m = st.chat.at(-1); m.swipe_id = 0; m.mes = m.swipes[0]; window.__renderAll(); await window.__SS_TEST__.emit('message_swiped', st.chat.length - 1); });
    await sleep(150);
    check((await st()).data.wallet.cash - cash0 === 777, 'swiping back to that reply brings it back');
    await delLast(); await S((b) => window.__addAI(b), 'Leon again.\n<meatball>\n</meatball>'); await sleep(150);
    const cash1 = (await st()).data.wallet.cash;
    check(cash1 === cash0, `regenerating the reply removes the action made after it (${cash1 - cash0})`);
    // 같은 1분 안에 다시 생성 (send_date가 같음 · 생성 시각만 다름)
    await S(async () => { const st = window.__st, m = st.chat.at(-1); m.swipe_info = [{ extra: {}, send_date: m.send_date, gen_started: '2026-11-14T12:00:00.111Z' }]; });
    const c2 = (await st()).data.wallet.cash;
    await S(async () => { const { addAdjust } = await import('/ext/src/engine.js'); await addAdjust({ ops: [['cash', '+50']], label: 'buy' }); });
    await S(async () => { const st = window.__st, old = st.chat.pop(); await window.__SS_TEST__.emit('message_deleted', st.chat.length); st.chat.push({ ...structuredClone(old), mes: 'Leon re.\n<meatball>\n</meatball>', swipes: ['Leon re.\n<meatball>\n</meatball>'], swipe_info: [{ extra: {}, send_date: old.send_date, gen_started: '2026-11-14T12:00:20.999Z' }] }); window.__renderAll(); await window.__SS_TEST__.emit('message_received', st.chat.length - 1); });
    await sleep(150);
    check((await st()).data.wallet.cash === c2, `regenerating within the same minute (same send_date) still removes the action (${(await st()).data.wallet.cash - c2})`);
    // 몇 챗 전으로 지우기: 그 뒤의 행동 · 답의 변화가 모두 빠짐 · 정리 편집(라벨 없는 저장)은 남음
    await ai('Leon pays.\n<meatball>\ncash: +100\n</meatball>');
    await S(async () => { const { addAdjust } = await import('/ext/src/engine.js'); await addAdjust({ ops: [['cash', '+5']], label: 'buy' }); });
    await ai('Leon pays more.\n<meatball>\ncash: +1000\n</meatball>');
    await S(async () => { const { addAdjust, commit } = await import('/ext/src/engine.js'); await addAdjust({ ops: [['cash', '+9']], label: 'buy2' }); const app = window.__SS_TEST__.api.app; const q = structuredClone(app.current.state.data.memo ?? { list: [] }); await commit('memo', { ...q, list: [...(q.list ?? []), { id: 'keep1', text: 'KEEP-ME', by: 'user', inject: true, pin: false }] }, ''); });
    const before = (await st()).data.wallet.cash;
    await S(async () => { const st = window.__st; for (let i = 0; i < 4; i++) { st.chat.pop(); await window.__SS_TEST__.emit('message_deleted', st.chat.length); } window.__renderAll(); });
    await sleep(150);
    const after = await st();
    check(before - after.data.wallet.cash === 1114, `deleting several messages back removes their changes and the actions after them (${before - after.data.wallet.cash})`);
    check((after.data.memo?.list ?? []).some(x => x.text === 'KEEP-ME'), 'housekeeping edits (no label) stay');

    // 상점 구매 뒤 그 답까지 지우면: 소지품 · 돈 · 상점 재고가 모두 돌아오고 AI 글에도 안 나옴 (재고 −1은 라벨 없는 조용한 저장)
    const shop = await S(async () => {
        const { commit, addAdjust, buildInjection } = await import('/ext/src/engine.js'); const app = window.__SS_TEST__.api.app;
        const sh = structuredClone(app.current.state.data.shop); sh.shops[0].items.push({ name: 'JELLY', price: 5, desc: '', kind: 'item', stock: 3 }); await commit('shop', sh, '상점 정리');
        await window.__addAI('Shop.\n<meatball>\n</meatball>');
        const nd = structuredClone(app.current.state.data.shop); nd.shops[0].items.find(i => i.name === 'JELLY').stock--; await addAdjust({ set: { mod: 'shop', data: nd }, silent: true });
        await addAdjust({ ops: [['item', '+JELLY 1|']], label: 'buy jelly' });
        await window.__addAI('He sees the JELLY.\n<meatball>\n</meatball>');
        const st = window.__st; st.chat.pop(); await window.__SS_TEST__.emit('message_deleted', st.chat.length); st.chat.pop(); await window.__SS_TEST__.emit('message_deleted', st.chat.length); window.__renderAll();
        window.__SS_TEST__.api.refreshNow(); const s = app.current.state;
        return { item: s.data.wallet.items.some(i => i.name === 'JELLY'), stock: s.data.shop.shops[0].items.find(i => i.name === 'JELLY')?.stock, inj: /JELLY/.test(buildInjection(app.current).main), gone: s.gone.some(g => g.name === 'JELLY') };
    });
    check(!shop.item && shop.stock === 3 && !shop.inj && !shop.gone, `deleting back past a purchase restores items, shop stock and keeps it out of the AI text (${JSON.stringify(shop)})`);
    // 되감기 범위: 편집 기록이 많아 정리해도 최근 rewindKeep(기본 40)개 메시지는 굳히지 않음
    const rk = await S(async () => {
        const { addAdjust } = await import('/ext/src/engine.js'), { getMeta } = await import('/ext/src/core.js');
        for (let i = 0; i < 30; i++) { window.__st.chat.push({ name: 'Me', is_user: true, mes: 'u' + i, send_date: 'rk-u' + i, swipe_id: 0, swipes: ['u' + i], extra: {} }); window.__st.chat.push({ name: 'Leon', is_user: false, mes: 'a' + i + '\n<meatball>\n</meatball>', send_date: 'rk-a' + i, swipe_id: 0, swipes: ['a'], swipe_info: [{ extra: {} }], extra: {} }); }
        for (let i = 0; i < 82; i++) await addAdjust({ ops: [['cash', '+1']], label: 'x' });
        const m = getMeta(); return { len: window.__st.chat.length, startAt: m.startAt ?? 0 };
    });
    check(rk.len - rk.startAt >= 40, `tidy-up keeps the last 40 messages rewindable (kept ${rk.len - rk.startAt})`);
    // ⑥ 분기 채팅: 원래 채팅 뒷부분의 편집이 새지 않음 (채팅 id가 바뀌고 짧아진 채팅 → followBranch가 지움 · 다시 길어져도 안 되살아남)
    await S(async () => { const { addAdjust } = await import('/ext/src/engine.js'); await addAdjust({ ops: [['cash', '+5000']], label: 'late' }); });
    const withLate = (await st()).data.wallet.cash;
    await S(async () => { const st = window.__st; st.chat.splice(2); st.chatId = 'branch-1'; window.__renderAll(); await window.__SS_TEST__.api.onChatChanged(); });
    const branch = (await st()).data.wallet.cash;
    check(withLate - branch >= 5000, `branched chat does not inherit later edits (${withLate} → ${branch})`);
    for (let i = 0; i < 4; i++) await ai('Leon idles.\n<meatball>\n</meatball>');
    const grown = (await st()).data.wallet.cash;
    check(grown === branch, `…and they do not come back when the branch grows past that point (${branch} → ${grown})`);

    // ⑦ 다시 생성 · 스와이프한 답의 소문이 편집에 남은 옛 소문에 덮이지 않음
    await ai('Rumor time.\n<meatball>\nrumor: Old Phantom | horned shadow\n</meatball>');
    await S(async () => { // 소문 읽음 표시 같은 편집: 소문 목록 통째가 기록됨
        const { commit } = await import('/ext/src/engine.js'); const app = window.__SS_TEST__.api.app; window.__SS_TEST__.api.refreshNow();
        const g = structuredClone(app.current.state.data.gossip); g.issues = g.issues.map(x => ({ ...x, read: true })); await commit('gossip', g, '');
    });
    await sleep(20);
    await S(async () => { // 같은 메시지를 새 답으로 (스와이프 · 다시 생성) — 편집보다 나중에 만들어짐
        const st = window.__st, m = st.chat.at(-1);
        const body = 'Rumor time.\n<meatball>\nrumor: Blue Phantom | glowing digger\n</meatball>';
        m.swipes.push(body); m.swipe_info.push({ extra: {}, gen_finished: new Date(Date.now() + 1000).toISOString() }); m.swipe_id = m.swipes.length - 1; m.mes = body;
        window.__renderAll(); await window.__SS_TEST__.emit('message_swiped', st.chat.length - 1);
    });
    await sleep(150);
    const titles = (await st()).data.gossip.issues.map(x => x.title);
    check(titles.includes('Blue Phantom') && !titles.includes('Old Phantom'), `regenerated reply's rumor wins over the stale copy in an edit (${titles.join(' | ')})`);

    // ⑧ 영어 저장: 연락처 이름이 바뀌면 대화방 · 최근 열쇠도
    const fk = await S(async () => {
        const { fixContactKeys } = await import('/ext/src/translate.js');
        const cur = { contacts: [{ name: '카이' }], threads: { '카이': [{ id: 'a', from: 'me', text: '안녕' }] }, unread: { '카이': 1 }, summaries: {}, recent: ['카이'] };
        const out = { contacts: [{ name: 'Kai' }], threads: { '카이': [{ id: 'a', from: 'me', text: 'Hello' }] }, unread: { '카이': 1 }, summaries: {}, recent: ['카이'] };
        const r = fixContactKeys(cur, out);
        return { keys: Object.keys(r.threads), unread: Object.keys(r.unread), recent: r.recent, orig: r.threads.Kai?.[0]?.orig };
    });
    check(fk.keys.join() === 'Kai' && fk.unread.join() === 'Kai' && fk.recent.join() === 'Kai', `thread · unread · recent keys follow the translated contact name (${JSON.stringify(fk)})`);
    check(!fk.orig, 'messages are not given an orig (that field is for deleted messages)');

    const errs = logs.filter(l => /error|TypeError|ReferenceError/i.test(l));
    check(!errs.length, `no console errors ${errs.slice(0, 3).join(' | ')}`);
} finally { await close(); }
