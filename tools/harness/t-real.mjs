// 진짜 실리와 같은 시각 꼴(Date ↔ ISO)에서도 되감기 묶음이 유지되는지: 다시 읽기 · 이어쓰기 · 다시 생성 · 옛 꼴 열쇠
import { open, makeStatus, sleep, check } from './lib.mjs';
const { page, logs, close } = await open();
const S = (f, a) => page.evaluate(f, a);
const ai = async (b) => { await S((u) => window.__addUser(u), 'go'); await S((x) => window.__addAI(x), b); await sleep(120); };
const buy = (n, label) => S(async ([n, label]) => { const e = await import('/ext/src/engine.js'); await e.addAdjust({ ops: [['cash', `+${n}`]], label }); }, [n, label]);
const last = (label) => S((label) => { window.__SS_TEST__.api.refreshNow(); const a = window.__st.chatMetadata.statussim.adjust.findLast(x => x.label === label); return a ? { off: !!a._off, an: a.an, at: a.at } : null; }, label);
const cash = () => S(() => { window.__SS_TEST__.api.refreshNow(); return window.__SS_TEST__.api.app.current.state.data.wallet.cash; });
try {
    const ids = await S(async () => (await import('/ext/src/core.js')).MOD_IDS);
    await makeStatus(page, ids);
    await ai('Hi.\n<meatball>\n</meatball>');
    const c0 = await cash();
    await buy(777, 'A');
    const a1 = await last('A');
    check(a1 && !a1.off && /:\d+\|0$/.test(a1.an), `anchor uses a millisecond number (${a1?.an})`);
    check(await cash() === c0 + 777, 'action applies in the same session');
    await S(() => window.__reload()); await sleep(200);
    const a2 = await last('A');
    check(a2 && !a2.off && await cash() === c0 + 777, 'action survives reloading the chat (Date → ISO text)');

    // 이어쓰기: 생성 시각이 바뀌어도 그 답 뒤의 행동은 남음
    await S(() => window.__continue(' More.')); await sleep(200);
    const a3 = await last('A');
    check(a3 && !a3.off && a3.an !== a2.an && await cash() === c0 + 777, 'action survives Continue (anchor moved to the new key)');
    await S(() => window.__reload()); await sleep(200);
    check(!(await last('A')).off && await cash() === c0 + 777, 'and still there after another reload');

    // 다시 생성: 그 답 뒤의 행동은 사라짐 (다시 읽은 뒤에도)
    await ai('Second.\n<meatball>\n</meatball>');
    await buy(100, 'B');
    check(await cash() === c0 + 877, 'second action applies');
    await S(() => window.__reload()); await sleep(150);
    await S(async () => { const st = window.__st; st.chat.pop(); window.__renderAll(); await SillyTavern.getContext().eventSource.emit('message_deleted', st.chat.length); await window.__addAI('Second again.\n<meatball>\n</meatball>', { type: 'regenerate' }); }); await sleep(200);
    const b = await last('B');
    check(b.off && await cash() === c0 + 777, 'regenerating removes the action made after the old reply · earlier one stays');

    // 옛 꼴 열쇠 (시험판): Date 글자 · ISO 글자 → 지금 메시지에 맞춰 새 꼴로
    const mig = await S(() => { const st = window.__st, adj = st.chatMetadata.statussim.adjust, a = adj.find(x => x.label === 'A'); const m = st.chat.find(x => !x.is_user); const d = new Date(m.swipe_info[0].gen_started);
        a.an = `a:${m.name}:${String(d)}|0`; window.__SS_TEST__.api.refreshNow(); const r1 = { off: !!a._off, an: a.an };
        a.an = `a:${m.name}:${d.toISOString()}|0`; window.__SS_TEST__.api.refreshNow(); return [r1, { off: !!a._off, an: a.an }]; });
    check(mig.every(x => !x.off && /:\d+\|0$/.test(x.an)), 'old-style anchors (Date text · ISO text) are matched and rewritten');
    check(!logs.filter(l => /error|TypeError|ReferenceError/i.test(l)).length, 'no console errors');
} finally { await close(); }
