// v2.7.19: 👁 보일 것 — 관계 탭에만 있던 「보일 것」을 모든 탭에 (화면에서만 숨김 · 다시 켜면 그대로)
import { open, makeStatus, sleep, check } from './lib.mjs';
const { page, logs, close } = await open();
try {
    const ids = await page.evaluate(async () => (await import('/ext/src/core.js')).MOD_IDS);
    await makeStatus(page, ids);
    // 연락 대화 · 퀘스트가 보이게 조금 채움
    await page.evaluate(async () => {
        const { commit } = await import('/ext/src/engine.js');
        const app = window.__SS_TEST__.api.app;
        const q = structuredClone(app.current.state.data.quest);
        q.list.push({ id: 'q1', title: 'Find cat', status: 'active', desc: 'lost cat', giver: 'Ann', place: 'Town', steps: [{ text: 'look', done: false }], reward: 'thanks', cash: 10, items: [] });
        await commit('quest', q, 'q');
    });
    const r = await page.evaluate(async () => {
        const { GROUPS } = await import('/ext/src/views.js');
        const { PARTS, NO_PARTS } = await import('/ext/src/parts.js');
        const app = window.__SS_TEST__.api.app;
        const el = document.querySelector('.ss-panel');
        const hidden = (n) => getComputedStyle(n).display === 'none' || !n.offsetParent;
        const out = { noBar: [], badToggle: [], badRestore: [], allOff: [], tabs: 0, pills: 0 };
        const go = (t, ui = {}) => { el._ss.tab = t; el._ss.mode = 'view'; el._ss.ui = ui; app.renderPanel(el); };
        const click = (arg) => el.querySelector(`.ss-partbar [data-act="partshow"][data-arg="${CSS.escape(arg)}"]`)?.click();
        for (const t of [...new Set(GROUPS.flatMap(g => g.tabs))]) {
            if (NO_PARTS.has(t)) continue;
            go(t, t === 'quest' ? { qf: 'active' } : {});
            const bar = el.querySelector('.ss-body > .ss-partbar');
            if (!bar) { out.noBar.push(t); continue; }
            out.tabs++;
            const defs = typeof PARTS[t] === 'function' ? PARTS[t]() : PARTS[t] ?? [];
            const keys = [...bar.querySelectorAll('[data-act="partshow"]')].map(b => b.dataset.arg).filter(k => !k.startsWith('__'));
            for (const k of keys) {
                const def = defs.find(d => d[0] === k);
                const find = () => def ? [...el.querySelector('.ss-body').querySelectorAll(def[3])].filter(n => !n.closest('.ss-partbar'))
                    : [...el.querySelectorAll('.ss-body .ss-sec')].filter(s => { const h = s.querySelector('h4').cloneNode(true); h.querySelectorAll('small,i').forEach(x => x.remove()); return h.textContent.replace(/\d[\d/.,%]*\S*/g, '').replace(/\s+/g, ' ').trim() === k.slice(2); });
                const before = find(); if (!before.length) continue;
                out.pills++;
                if (before.every(hidden)) continue; // 원래 접혀 있는 것
                click(k);
                const after = find();
                if (!after.length || !after.every(hidden)) out.badToggle.push(`${t}:${k}`);
                click(k);
                if (find().every(hidden)) out.badRestore.push(`${t}:${k}`);
            }
            click('__none');
            const vis = [...el.querySelectorAll('.ss-body > :not(.ss-partbar)')].filter(n => !hidden(n)).length;
            if (!el.querySelector('.ss-partbar')) out.allOff.push(`${t}: bar gone`);
            const offN = (window.__st.extensionSettings.statussim.partsOff?.[t] ?? []).length;
            if (offN !== keys.length) out.allOff.push(`${t}: ${offN}/${keys.length}`);
            click('__all');
            if (window.__st.extensionSettings.statussim.partsOff?.[t]) out.allOff.push(`${t}: not restored`);
            void vis;
        }
        // 관계는 자기 막대만 · 편집 화면엔 막대 없음
        go('rel'); out.relOwn = !!el.querySelector('.ss-relshow:not(.ss-partbar)') && !el.querySelector('.ss-partbar');
        el._ss.tab = 'stats'; el._ss.mode = 'edit'; el._ss.work = structuredClone(app.current.state.data.stats); app.renderPanel(el); out.editNoBar = !el.querySelector('.ss-partbar');
        // 연락 대화창: 첨부 단추 끄기
        const ct = app.current.state.data.contact; const who = ct.contacts[0]?.name ?? 'Ann';
        go('contact', { who }); click('att');
        out.attHidden = !!el.querySelector('.ss-phone-att, .ss-enclose') && [...el.querySelectorAll('.ss-phone-att, .ss-enclose')].every(hidden);
        // 다른 채팅에서도(설정 공통) · 새로 그려도 유지
        go('contact', {}); go('contact', { who }); out.attKeep = [...el.querySelectorAll('.ss-phone-att, .ss-enclose')].every(hidden);
        // 데이터는 그대로 (화면에서만)
        out.dataSame = JSON.stringify(app.current.state.data.contact) === JSON.stringify(ct);
        // 숨긴 것 모두 다시 보이기
        const { resetParts, partsCount } = await import('/ext/src/parts.js');
        out.cnt = partsCount(); resetParts(); out.cnt2 = partsCount();
        go('contact', { who }); out.attBack = [...el.querySelectorAll('.ss-phone-att, .ss-enclose')].every(n => !hidden(n));
        // 홈 위젯 하나만 끄기
        go('home'); click('w:date'); out.homeDate = hidden(el.querySelector('.ss-home-grid [data-w="date"]')) && !hidden(el.querySelector('.ss-home-grid [data-w="bars"]'));
        resetParts();
        return out;
    });
    check(!r.noBar.length, `every tab (except 관계 · 관리) has 「보일 것」 (${r.tabs} tabs · missing: ${r.noBar.join(',') || '-'})`);
    check(!r.badToggle.length && r.pills > 60, `each switch hides exactly its part (${r.pills} checked · bad: ${r.badToggle.join(', ') || '-'})`);
    check(!r.badRestore.length, `turning it back on shows it again (${r.badRestore.join(', ') || 'ok'})`);
    check(!r.allOff.length, `다 끄기 / 다 보기 (${r.allOff.join(', ') || 'ok'})`);
    check(r.relOwn, '관계 keeps its own bar (no double bar)');
    check(r.editNoBar, 'no bar in the editor');
    check(r.attHidden && r.attKeep, 'contact thread: 첨부 단추 hidden and stays hidden after re-render');
    check(r.dataSame, 'hiding does not touch the data');
    check(r.cnt === 1 && r.cnt2 === 0 && r.attBack, `숨긴 것 모두 다시 보이기 (${r.cnt}→${r.cnt2})`);
    check(r.homeDate, 'home: one widget off, others stay');
    // ── 상태 복사에서 찾은 것 ──
    const x = await page.evaluate(async () => {
        const app = window.__SS_TEST__.api.app;
        const { getMeta, settings } = await import('/ext/src/core.js');
        const { commit } = await import('/ext/src/engine.js');
        const el = document.querySelector('.ss-panel');
        const out = {};
        // 1) 「HP +25」 같은 약어 · 숫자만인 글은 번역 남은 글로 안 셈
        const st = window.__st.extensionSettings.statussim; st.ssGenLang = 'enview';
        const w = structuredClone(app.current.state.data.wallet); w.items.push({ name: 'Salve', qty: 1, desc: 'A small jar', effect: 'HP +25' }); await commit('wallet', w, 'w');
        const T = await import('/ext/src/translate.js');
        const miss = T.missingTr(); out.hp = miss.includes('HP +25'); out.salve = miss.includes('A small jar');
        st.ssGenLang = 'ko';
        // 2) 기사 열기: 편집 기록에 뉴스 목록 전체를 복사하지 않음
        const n = structuredClone(app.current.state.data.news); n.items = [1, 2, 3].map(i => ({ id: `n${i}`, title: `T${i}`, body: 'x'.repeat(300), tag: '', date: '', read: false })); await commit('news', n, 'n');
        const before = getMeta().adjust.length;
        el._ss.tab = 'news'; el._ss.mode = 'view'; el._ss.ui = {}; app.renderPanel(el);
        el.querySelector('[data-act="nopen"][data-arg="n2"]').click(); await new Promise(r => setTimeout(r, 300));
        const added = getMeta().adjust.slice(before);
        out.newsLog = added.length === 1 && JSON.stringify(added[0]).length < 200;
        out.read = app.current.state.data.news.items.find(i => i.id === 'n2').read === true && app.current.state.data.news.items.find(i => i.id === 'n1').read === false;
        // 3) 빈 달력 → 기본 일정 넣기
        const c = structuredClone(app.current.state.data.calendar); c.events = []; await commit('calendar', c, 'c');
        el._ss.tab = 'calendar'; el._ss.ui = {}; app.renderPanel(el);
        const b = el.querySelector('[data-act="calfill"]'); out.calBtn = !!b; b?.click(); await new Promise(r => setTimeout(r, 300));
        out.calN = app.current.state.data.calendar.events.length;
        app.renderPanel(el); out.calBtnGone = !el.querySelector('[data-act="calfill"]');
        // 4) 뺀 기능의 설정이 「켜짐」으로 남지 않음
        out.dead = ['romIntent', 'romInit', 'storyPush'].filter(k => k in settings());
        return out;
    });
    check(!x.hp && x.salve, `「HP +25」 is not counted as untranslated, real English still is (${x.hp}/${x.salve})`);
    check(x.newsLog && x.read, 'opening an article logs a tiny read mark, not the whole news list');
    check(x.calBtn && x.calN > 0 && x.calBtnGone, `empty calendar → 기본 일정 넣기 (${x.calN})`);
    check(!x.dead.length, `removed features' settings are gone (${x.dead.join(',') || 'ok'})`);
    // ── 💸 상대가 보낸 돈 · 선물 ──
    const pay = await page.evaluate(async () => {
        const { commit } = await import('/ext/src/engine.js');
        const app = window.__SS_TEST__.api.app;
        const c = structuredClone(app.current.state.data.contact); c.mode = 'phone'; if (!c.contacts.some(x => x.name === 'Mira')) c.contacts.push({ name: 'Mira' }); await commit('contact', c, 'x');
        const w = structuredClone(app.current.state.data.wallet); w.cash = 100; await commit('wallet', w, 'w');
        let sysSeen = '';
        window.__ai = (p, sys) => { sysSeen = sys || p; return '여기 용돈이야\n[SEND money: 300]\n[SEND gift: Silver Ring]'; };
        app.openSheet('contact'); await new Promise(r => setTimeout(r, 300));
        const el = document.querySelector('dialog .ss-panel'); el._ss.ui = { who: 'Mira' }; app.renderPanel(el);
        const ta = el.querySelector('.ss-cin'); ta.value = '돈 좀 빌려줄래?';
        el.querySelector('[data-act="csend"]').click();
        await new Promise(r => setTimeout(r, 900));
        const st = app.current.state;
        const th = st.data.contact.threads.Mira ?? [];
        const out = {
            rule: /\[SEND money/.test(sysSeen),
            cash: st.data.wallet.cash, ring: st.data.wallet.items.some(i => i.name === 'Silver Ring'),
            bubbles: th.filter(m => m.from === 'them').map(m => m.kind ?? 'text').join(','),
            noTag: !th.some(m => /\[SEND/.test(m.text ?? '')),
        };
        // 선톡에 돈만 (말 없이)
        window.__ai = () => '[SEND money: 50]';
        const { receivePing } = await import('/ext/src/contact.js');
        await receivePing('Mira', false); await new Promise(r => setTimeout(r, 300));
        out.cash2 = app.current.state.data.wallet.cash;
        // 태그 없이 말만 「보냈어」 → 아무것도 안 옴
        window.__ai = () => '돈 보냈어!';
        app.renderPanel(el); const ta2 = el.querySelector('.ss-cin'); ta2.value = '고마워'; el.querySelector('[data-act="csend"]').click();
        await new Promise(r => setTimeout(r, 900));
        out.cash3 = app.current.state.data.wallet.cash;
        document.querySelector('dialog .popup-button-ok')?.click();
        return out;
    });
    check(pay.rule, 'reply prompt tells the AI how to really send money/gifts');
    check(pay.cash === 400 && pay.ring, `money and gift actually arrive (cash ${pay.cash} · ring ${pay.ring})`);
    check(/money/.test(pay.bubbles) && /gift/.test(pay.bubbles) && pay.noTag, `shown as 💸 · 🎁 bubbles, tag removed (${pay.bubbles})`);
    check(pay.cash2 === 450, `money with a first-contact message (${pay.cash2})`);
    check(pay.cash3 === 450, 'just saying "I sent it" without the tag changes nothing');

    // ── 🌐 번역: 묻지 않음 · 못 바꾼 글은 알아서 번역 모델 · 긴 글도 ──
    const trx = await page.evaluate(async () => {
        const { commit } = await import('/ext/src/engine.js'); const { getMeta } = await import('/ext/src/core.js');
        const app = window.__SS_TEST__.api.app; const s = window.__st.extensionSettings.statussim;
        s.ssGenLang = 'enview'; s.trEngine = 'st'; s.trAuto = 'off';
        const long = 'Dear friend, ' + 'the harvest went well and the river was calm all week. '.repeat(15);
        const n = structuredClone(app.current.state.data.news); n.items.push({ id: 'nl', title: 'Odd Title Nobody Knows', body: long, tag: '', date: '', read: true }); await commit('news', n, 'n');
        let asked = 0; const P = SillyTavern.getContext().Popup.show; const oc = P.confirm; P.confirm = async () => { asked++; return true; };
        globalThis.translate = async (t) => t.split('\n').map(l => (/Odd Title/.test(l) ? l : `[ko]${l}`)).join('\n');
        let llm = 0; window.__ai = async (p) => { llm++; const src = JSON.parse(p.match(/\{[\s\S]*\}/)[0]); return JSON.stringify({ list: src.list.map(x => `[AI]${x}`) }); };
        const T = await import('/ext/src/translate.js');
        const before = T.missingTr();
        await T.translateMissing(null);
        P.confirm = oc;
        const d = getMeta().tr;
        const r = { asked, llm, longCounted: before.includes(long.trim()), longDone: !!d[long.trim()], odd: d['Odd Title Nobody Knows'], left: T.missingTr().length };
        s.ssGenLang = 'ko';
        return r;
    });
    check(trx.asked === 0, `no "translate?" popups (${trx.asked})`);
    check(trx.odd === '[AI]Odd Title Nobody Knows' && trx.llm >= 1, `text the free translator left in English goes to the model by itself (${trx.odd})`);
    check(trx.longCounted && trx.longDone, 'long text (letters, articles) is counted and translated');

    const fix = await page.evaluate(async () => {
        const app = window.__SS_TEST__.api.app; const s = window.__st.extensionSettings.statussim; s.ssGenLang = 'enview';
        const { getMeta } = await import('/ext/src/core.js');
        delete getMeta().tr['Odd Title Nobody Knows'];
        const T = await import('/ext/src/translate.js');
        let box = null; const op = app.popup; app.popup = async (el) => { box = el; return false; };
        await T.openTrFix(null, 'news');
        app.popup = op; s.ssGenLang = 'ko';
        const sel = box.querySelector('.ss-trf-mod');
        const rows = [...box.querySelectorAll('.ss-trf-row')];
        return { sel: sel?.value, first: rows[0]?.textContent ?? '', long: rows.some(r => r.querySelector('textarea')), n: rows.length, opts: sel ? sel.options.length : 0 };
    });
    check(fix.sel === 'news' && fix.opts > 2, `번역 고치기 opens on the current tab with a panel picker (${fix.sel} · ${fix.opts})`);
    check(/번역 없음/.test(fix.first) && /Odd Title/.test(fix.first), `untranslated text is listed first without searching (${fix.first.slice(0, 40)})`);
    check(fix.long, 'long texts are in the list (as a text box)');
    // ── 🔧 번역 고치기: 이름 고치면 다른 문장도 실시간 · 📌 단추 ──
    const nm = await page.evaluate(async () => {
        const { commit } = await import('/ext/src/engine.js'); const { getMeta } = await import('/ext/src/core.js');
        const app = window.__SS_TEST__.api.app; const s = window.__st.extensionSettings.statussim;
        s.ssGenLang = 'enview'; s.trEngine = 'st'; s.trAuto = 'off';
        const r = structuredClone(app.current.state.data.rel); r.user.push({ name: 'Elias Grey', label: 'x', aff: 1, trust: 1, memo: 'Boil water for Grey\'s tea' });
        r.user.push({ name: 'Mo', label: 'Grey likes quiet beans', aff: 0, trust: 0, memo: 'Elias Grey said the water is fine' }); await commit('rel', r, 'r');
        const d = getMeta().tr;
        Object.assign(d, { 'Elias Grey': '엘리아스 그래', "Boil water for Grey's tea": '그리스 차를 위한 물', 'Grey likes quiet beans': 'Grey는 조용한 콩을 좋아해', 'Elias Grey said the water is fine': '엘리아스 그래는 물이 괜찮다고 했다' });
        let seen = []; globalThis.translate = async (t) => { seen.push(t); return t.split('\n').map(l => `[ko]${l}`).join('\n'); };
        let box = null; const op = app.popup; let resolve; app.popup = async (el) => { box = el; return new Promise(r => { resolve = r; }); };
        const T = await import('/ext/src/translate.js');
        const done = T.openTrFix(null, 'rel');
        await new Promise(r => setTimeout(r, 50));
        box.querySelector('.ss-trf-q').value = 'Grey'; box.querySelector('.ss-trf-q').dispatchEvent(new Event('input'));
        const inp = box.querySelector('[data-en="Elias Grey"]'); inp.value = '엘리아스 그레이'; inp.dispatchEvent(new Event('input', { bubbles: true }));
        await new Promise(r => setTimeout(r, 300));
        const get = (en) => box.querySelector(`[data-en="${CSS.escape(en)}"]`)?.value;
        const live = { likes: get('Grey likes quiet beans'), said: get('Elias Grey said the water is fine'), tea: get("Boil water for Grey's tea") };
        const pinOn = box.querySelector('[data-pin="Elias Grey"]').classList.contains('on');
        const teaTag = box.querySelector(`[data-row="${CSS.escape("Boil water for Grey's tea")}"] small`).textContent;
        // 📌 단추로 고정 풀기 / 다른 줄 고정하기
        box.querySelector('[data-pin="Elias Grey said the water is fine"]')?.click();
        resolve(true); await done; await new Promise(r => setTimeout(r, 300));
        app.popup = op; s.ssGenLang = 'ko';
        const m = getMeta();
        return { live, pinOn, teaTag, saved: m.tr['Grey likes quiet beans'], piece: m.tr.Grey, pieceLock: !!m.trLock.Grey, lockName: !!m.trLock['Elias Grey'], autoNotLocked: !m.trLock['Grey likes quiet beans'], tea: m.tr["Boil water for Grey's tea"], sent: seen.join('|'), moLock: !!m.trLock['Elias Grey said the water is fine'] };
    });
    check(nm.live.likes === '그레이는 조용한 콩을 좋아해' && nm.live.said === '엘리아스 그레이는 물이 괜찮다고 했다', `renaming updates other sentences live, also part of the name (${nm.live.likes} / ${nm.live.said})`);
    check(nm.pinOn, 'edited row gets its 📌 turned on');
    check(/다시 번역/.test(nm.teaTag), `sentence where the name was garbled is marked for re-translation (${nm.teaTag})`);
    check(nm.saved === '그레이는 조용한 콩을 좋아해' && nm.autoNotLocked, 'auto-updated sentences are saved (not locked)');
    check(nm.piece === '그레이' && nm.pieceLock && nm.lockName, `name pieces are kept too (Grey = ${nm.piece})`);
    check(/그레이/.test(nm.tea ?? '') && /그레이/.test(nm.sent), `garbled sentence re-translated with the new name (${nm.tea})`);
    check(nm.moLock, '📌 button pins a row without editing it');
    const errs = logs.filter(l => /error|TypeError|ReferenceError/i.test(l) && !/translate/i.test(l));
    check(!errs.length, `no console errors ${errs.slice(0, 3).join(' | ')}`);
} finally { await close(); }
