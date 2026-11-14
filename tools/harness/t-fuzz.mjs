// 모든 탭 · 보기/편집 화면의 버튼을 하나씩 다 눌러 본다 — 오류 · 멈춤 · 화면 깨짐 찾기
import { open, makeStatus, sleep, check } from './lib.mjs';
const { page, logs, close } = await open();
const SKIP = new Set(['partshow', 'reset', 'purgeall', 'chatoff', 'filerestore', 'blank', 'wizard', 'cardload', 'carrystart', 'carryprep', 'pause', 'leave', 'restore', 'slotload', 'fullbackup', 'export', 'savejson', 'json']);
try {
    const all = await page.evaluate(async () => (await import('/ext/src/core.js')).MOD_IDS);
    await makeStatus(page, all);
    await page.evaluate((junk) => {
        // JUNK=1: AI가 이상한 답을 줄 때 (빈 답 · 깨진 JSON · 엉뚱한 모양 · 아주 긴 글 · 생각 태그)
        const J = ['', 'null', '[]', '{"items":"x","posts":5,"text":null}', '{"reply":["a",1,null],"news":[{"title":null}]}', '<think>hmm</think>{"text":"ok"}', 'x'.repeat(20000), '```json\n{"a":1}\n```', '{"contacts":[{"name":""}],"threads":{"":[]}}'];
        let k = 0;
        window.__aiCalls = []; window.__ai = (sys, prompt) => { window.__aiCalls.push(String(sys ?? '').slice(0, 40)); return junk ? J[k++ % J.length] : '{}'; };
    }, !!process.env.JUNK);
    const ops = ['cash: -12', 'item: +빵', 'aff: Leon +3', 'loc: 시장', 'time: 저녁', 'quest: 심부름 | 진행', 'memo: 붉은 문', 'msg: Leon | 오늘 어땠어?', 'news: 축제 | 광장에서 축제가 열려요', 'hp: -5'];
    for (let i = 0; i < 6; i++) { await page.evaluate(() => window.__addUser('go')); await page.evaluate((b) => window.__addAI(b), `Story ${i}.\n<meatball>\n${ops.slice(i, i + 4).join('\n')}\n</meatball>`); }
    await sleep(300);
    await page.evaluate(() => { window.__SS_TEST__.api.app.openSheet('home'); });
    await sleep(400);
    const tabs = await page.evaluate(() => [...new Set([...document.querySelectorAll('dialog .ss-panel [data-tab], dialog .ss-panel [data-act="tab"]')].map(b => b.dataset.tab ?? b.dataset.arg).filter(Boolean))]);
    const tabList = [...new Set([...tabs, ...all, 'base', 'manage', 'album', 'record'])];
    const bad = [];
    let clicked = 0, moved = 0;
    const hangs = [];
    for (const tab of tabList) for (const mode of (['manage', 'album', 'record'].includes(tab) ? ['view'] : ['view', 'edit'])) {
        const acts = await page.evaluate(({ tab, mode }) => {
            const el = document.querySelector('dialog .ss-panel'); if (!el) return [];
            el._ss.tab = tab; el._ss.mode = mode; el._ss.ui = {};
            try { window.__SS_TEST__.api.app.renderPanel(el); } catch (e) { return [`RENDER:${e.message}`]; }
            // v2.7.18: 「몇 번째 단추」가 아니라 「같은 이름 단추 중 몇 번째」로 찾는다 — 예전엔 🙈 가리기처럼 화면 위에 줄이 하나 생기면
            //          뒤의 단추가 모두 「moved」로 건너뛰어져서, AI 부르는 단추가 한 번도 안 눌렸음 (AI 호출 0회)
            const seen = {}; return [...el.querySelectorAll('[data-act]')].map((b) => { const a = b.dataset.act; seen[a] = (seen[a] ?? -1) + 1; return `${a}#${seen[a]}`; });
        }, { tab, mode });
        for (const a of acts) {
            if (a.startsWith('RENDER:')) { bad.push(`${tab}/${mode} render: ${a}`); continue; }
            const [act, idx] = a.split('#');
            if (SKIP.has(act) || act === 'tab') continue;
            const before = logs.length;
            const r = await Promise.race([page.evaluate(async ({ tab, mode, act, idx }) => {
                const el = document.querySelector('dialog .ss-panel'); if (!el) return 'nopanel';
                el._ss.tab = tab; el._ss.mode = mode; el._ss.ui = {};
                window.__SS_TEST__.api.app.renderPanel(el);
                const b = [...el.querySelectorAll(`[data-act="${act}"]`)][Number(idx)];
                if (!b) return 'moved';
                const e0 = window.__errors.length;
                b.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
                await new Promise(r => setTimeout(r, 40));
                for (let w = 0; w < 10 && document.querySelector('dialog.popup'); w++) await new Promise(r => setTimeout(r, 50)); // 확인 창은 스스로 「확인」될 때까지
                await new Promise(r => setTimeout(r, 30));
                // 열린 다른 창은 닫는다 (본 창만 남김)
                [...document.querySelectorAll('dialog')].filter(d => !d.querySelector('.ss-panel') || d.querySelector('.ss-panel') !== el).forEach(d => { try { d.close?.(); d.remove(); } catch { /* */ } });
                return window.__errors.length > e0 ? `listener error: ${window.__errors.at(-1)}` : 'ok';
            }, { tab, mode, act, idx }), sleep(4000).then(() => 'HANG')]);
            clicked++; if (r === 'moved') moved++;
            if (r === 'HANG') hangs.push(`${tab}/${mode}/${act}`);
            else if (r !== 'ok' && r !== 'moved') bad.push(`${tab}/${mode}/${act}: ${r}`);
            const fresh = logs.slice(before).filter(l => /pageerror|TypeError|ReferenceError|is not|undefined/.test(l) && !/404|net::|scripts\/extensions\/translate/.test(l)); // 가짜 실리엔 Chat Translation 확장이 없음
            if (fresh.length) bad.push(`${tab}/${mode}/${act}: ${fresh[0].slice(0, 220)}`);
            if (!(await page.evaluate(() => !!document.querySelector('dialog .ss-panel')))) { await page.evaluate(() => { window.__SS_TEST__.api.app.openSheet('home'); }); await sleep(200); }
        }
    }
    await sleep(1500);
    const nAI = await page.evaluate(() => window.__aiCalls.length);
    console.log(`  clicked ${clicked} buttons in ${tabList.length} tabs (${moved} gone after an earlier click) · AI called ${nAI} times`);
    check(nAI > 20, `AI buttons really ran (${nAI} AI calls)`);
    if (process.env.WARN) { const w = new Map(); for (const l of logs) { const k = l.replace(/\d+/g, '#').slice(0, 110); w.set(k, (w.get(k) ?? 0) + 1); } console.log([...w].sort((a, b) => b[1] - a[1]).slice(0, 25).map(([k, v]) => `    ${v}× ${k}`).join('\n')); }
    check(!bad.length, `no errors from any button (${bad.length})`, '\n    ' + [...new Set(bad)].slice(0, 40).join('\n    '));
    check(!hangs.length, `no button froze the page (${hangs.length})`, hangs.join(', '));
} finally { await close(); }
