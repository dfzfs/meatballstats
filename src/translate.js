// 🌐 상태창 번역: 확장 AI가 상태창을 영어로 만들면 → 번역 모델(따로 고른 싼 모델)이 한국어로 옮긴다
// 「상태창 전체 번역」 버튼은 이미 있는 칸들을 통째로 번역한다.
import { app, ctx, settings, esc, TITLE, LOG, MOD_IDS, MOD, modOn, getMeta, saveMeta, viewTr, trDict, ssWarn } from './core.js';
import { P, aiGenerate, parseJSON, mainBusy } from './prompts.js';
import { commit } from './engine.js';

export const needTr = () => settings().ssGenLang === 'en' || settings().ssGenLang === 'enview';
const trOpts = () => ({ profile: settings().trProfile || '' });

// 이미 정해진 이름들 → 번역할 때 그대로 쓰게
function glossary(extra) {
    const s = app.current?.state;
    const names = new Set();
    const add = (x) => { if (x && typeof x === 'string' && x.length <= 30) names.add(x); };
    if (s) {
        add(s.core?.title);
        for (const p of s.data.profile?.list ?? []) add(p.name);
        for (const r of s.data.rel?.user ?? []) add(r.name);
        for (const p of s.data.map?.places ?? []) add(p.name);
        add(s.data.wallet?.currency);
    }
    if (extra?.title) add(extra.title);
    const list = [...names].filter(Boolean).slice(0, 50);
    return list.length ? `Known names (use exactly when the same person/place appears): ${list.join(', ')}` : '';
}

// ───── 번역 지침 (v2.6) ─────
const rulesText = () => String(settings().trRules ?? '').trim();
const llmRules = () => { const lk = lockedPairs(); return (rulesText() ? `\n\nExtra rules from the user (follow them exactly):\n${rulesText()}` : '') + (lk.length ? `\n\nFixed translations (always use exactly these): ${lk.map(([a, b]) => `${a} = ${b}`).join('; ')}` : ''); };
// 「원문 = 번역」 · 「원문 -> 번역」 · 「원문 → 번역」 줄 → 이름·용어 고정
// 📌 「번역 고치기」로 고정한 이름 (이 채팅 · 40자 이하 = 이름 · 낱말) — 지침의 「원문 = 번역」처럼 새 글을 번역할 때도 미리 바꿔 넣는다 (v2.7.2)
export const lockedPairs = () => { try { const m = getMeta(); const d = m?.tr ?? {}; return Object.keys(m?.trLock ?? {}).filter(en => en.length <= 40 && d[en]).map(en => [en, d[en]]); } catch { return []; } };
export function rulePairs() {
    const base = rulesText().split(/\r?\n/).map(l => l.match(/^\s*(.+?)\s*(?:=|->|→)\s*(.+?)\s*$/)).filter(Boolean).map(m => [m[1], m[2]]).filter(([a]) => /[A-Za-z]/.test(a)).sort((a, b) => b[0].length - a[0].length);
    return [...new Map([...base, ...lockedPairs()])].sort((a, b) => b[0].length - a[0].length); // 이 채팅에서 고정한 게 이김
}
// 번역기에 보내기 전에 「원문 = 번역」 · 고정한 이름을 미리 바꿔 넣기 — 영어 쪽은 낱말 통째로만 (「Leon」가 「Lawyer」 안에서 바뀌지 않게)
const wordRe = (w) => new RegExp(`(^|[^A-Za-z])${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![A-Za-z])`, 'g');
// 번역 결과에 남은 고정 이름 영어 → 한국어
const postSub = (text) => { let t = String(text); for (const [a, b] of rulePairs()) t = t.replace(wordRe(a), (m0, pre) => pre + b); return t; };
const preSub = (text, rev = false) => { let t = String(text); for (const [a, b] of rulePairs()) t = rev ? t.split(b).join(a) : t.replace(wordRe(a), (m0, pre) => pre + b); return t; };

// ───── 실리 기본 번역 (Chat Translation 확장의 translate()) ─────
let forceLLM = false; // 실리 번역기가 못 바꾼 글을 번역 모델로 한 번 (v2.7.16)
const engineST = () => !forceLLM && settings().trEngine === 'st';
let stMod = null;
async function stTranslate(text, rev = false, raw = false) {
    // 실리가 이미 올려 둔 translate()를 먼저 쓰고 (새 버전), 없으면 모듈을 직접 불러온다
    let fn = typeof globalThis.translate === 'function' ? globalThis.translate : null;
    if (!fn) { stMod ??= await import('/scripts/extensions/translate/index.js'); fn = stMod?.translate; }
    if (typeof fn !== 'function') throw new Error('실리 번역 확장을 찾지 못했어요');
    const es = ctx().extensionSettings?.translate ?? {};
    const out = await fn(raw ? String(text) : preSub(text, rev), rev ? 'en' : String(settings().trCode || 'ko').trim(), es.provider || 'google');
    if (typeof out !== 'string') throw new Error('실리 번역이 실패했어요 (확장 메뉴 › Chat Translation에서 번역기를 확인해 주세요)');
    return out;
}
// 여러 줄을 묶어서 한 번에 (요청 수 줄이기). 줄 수가 안 맞으면 그 묶음만 하나씩.
async function stMany(list, rev = false) {
    const out = new Map();
    const flat = (x) => x.replace(/\s*\r?\n\s*/g, ' / ');
    const batches = [];
    let cur = [], len = 0;
    for (const s of list) { const f = flat(s); if (cur.length && (len + f.length > 1500 || cur.length >= 40)) { batches.push(cur); cur = []; len = 0; } cur.push(s); len += f.length + 1; }
    if (cur.length) batches.push(cur);
    const one = async (b) => {
        let lines = null;
        try { lines = (await stTranslate(b.map(flat).join('\n'), rev)).split(/\r?\n/).map(x => x.trim()).filter(Boolean); } catch (e) { ssWarn(LOG, 'st batch', e); }
        const back = (s, x) => (/\r?\n/.test(s) ? x.replace(/\s*\/\s*/g, '\n') : x); // 줄바꿈을 「 / 」로 보냈던 글은 되돌린다 (v2.7.3)
        if (lines && lines.length === b.length) b.forEach((s, i) => out.set(s, back(s, lines[i])));
        else await Promise.all(b.map(async (s) => { try { out.set(s, (await stTranslate(s, rev)).trim()); } catch (e) { ssWarn(LOG, 'st one', e); } }));
        // v2.7.16: 고정 이름을 한국어로 미리 넣으면 글이 「한국어+영어」로 섞여서, 구글이 원문을 한국어로 보고 그대로 돌려줄 때가 있었다
        // → 그대로 돌아온 글은 이름을 안 넣고 다시 보낸 뒤, 결과에 고정 이름을 맞춰 넣는다
        if (!rev) await Promise.all(b.filter(s => { const o = out.get(s); return o !== undefined && (o === preSub(s).trim() || o === s.trim()); }).map(async (s) => {
            try { const r = (await stTranslate(s, false, true)).trim(); if (r && r !== s.trim()) out.set(s, postSub(r)); } catch (e) { ssWarn(LOG, 'st raw', e); }
        }));
    };
    // v2.7.2: 묶음을 3개씩 동시에 (예전엔 하나씩 차례로라 느렸음)
    const q = [...batches];
    await Promise.all(Array.from({ length: Math.min(3, q.length) }, async () => { while (q.length) await one(q.shift()); }));
    return out;
}
// 코드 값(상태·종류·id 같은 것)은 번역하면 안 된다
const CODE_KEYS = new Set(['id', 'unit', 'genre', 'cls', 'repeat', 'icon', 'color', 'every', 'key', 'currencyCode', 'system', 'sys', 'judge', 'sort', 'show', 'pick', 'mesid', 'chatId', 'seed', 'url', 'link', 'src', 'img', 'avatar', 'handle']);
// 이 칸들은 코드일 때도 글일 때도 있다 (v2.7.12): role = 'npc' 또는 「Life Saver & Clown」, status = 'active' 또는 「Buried in treaty paperwork」
// → 띄어쓰기 없는 소문자 낱말일 때만 코드로 본다 (예전엔 늘 코드로 봐서 직업 · 상태 메시지가 영어로 남았음)
// v2.7.14: 소문자 한 낱말이라도 미트볼이 쓰는 코드 값일 때만 코드 (surgeon · sleeping 같은 직업 · 상태는 번역)
const SOFT_KEYS = new Set(['kind', 'role', 'status', 'mode', 'type', 'by', 'from', 'contact', 'play']);
const SOFT_VALS = new Set(['dead', 'left', 'lost', 'never', 'custom', 'cream', 'ink', 'mint', 'rose', 'white', 'npc', 'main', 'user', 'active', 'open', 'done', 'failed']);
const softCode = (v) => { const t = String(v).trim(); return codeLike(t) || SOFT_VALS.has(t) || /[_\d]/.test(t) && /^[a-z0-9_\-.]{1,24}$/.test(t); };
// 이름 모를 칸에 든 값이 코드인지: 예전엔 「소문자 한 낱말」을 모두 코드로 봐서 bread · rope · lantern 같은 소지품 이름이 영어로 남았어요 (v2.7.3)
// → 이제 밑줄 · 하이픈 · 숫자가 섞인 것과, 미트볼이 쓰는 정해진 코드 값만 코드로 봐요
const CODE_VALS = new Set(['open', 'active', 'done', 'failed', 'user', 'main', 'npc', 'minimal', 'detailed', 'phone', 'instant', 'letter', 'curse', 'bless', 'luck', 'bad', 'event', 'yearly', 'once', 'day', 'week', 'month', 'num', 'bar', 'text', 'ai', 'me', 'them', 'deco', 'item', 'mes', 'peek', 'song', 'auto', 'pinned', 'summary', 'off', 'on', 'true', 'false', 'none', 'rp', 'multi', 'director', 'easy', 'normal', 'hard', 'crit', 'ok', 'fail', 'fumble', 'info', 'bank', 'loan', 'pawn', 'shark', 'paid', 'late', 'tag', 'kw', 'always', 'aff', 'trust', 'stage', 'jealous', 'up', 'down', 'neg', 'pos', 'hi', 'warn', 'free', 'st', 'llm', 'ko', 'en', 'enview']);
const codeLike = (v) => { const t = v.trim(); return /^[a-z0-9_\-]{1,14}$/.test(t) && (/[_\-\d]/.test(t) || CODE_VALS.has(t)); };
// rev = 한국어 → 영어 (옛 번역본을 영어 저장으로 바꿀 때): 한글이 든 칸만
// SNS 아이디 · 핸들(@lucy, mugiwara_lucy, leon.d.water 같은 것)은 이름이 아니라 번역하지 않는다 (v2.7.2)
const HANDLE = (v) => /^@?[A-Za-z0-9_.]{2,30}$/.test(v.trim()) && (v.trim().startsWith('@') || /[_.\d]/.test(v));
const isCode = (k, v, rev = false) => CODE_KEYS.has(k) || (SOFT_KEYS.has(k) && softCode(v)) || (rev ? !/[가-힣]/.test(v) : (codeLike(v) || !/[A-Za-z]/.test(v) || HANDLE(v)));
function leaves(o, acc = new Set(), k = '', rev = false) {
    if (typeof o === 'string') { if (o.trim() && !isCode(k, o, rev)) acc.add(o); return acc; }
    if (Array.isArray(o)) { for (const v of o) leaves(v, acc, k, rev); return acc; }
    if (o && typeof o === 'object') for (const [kk, v] of Object.entries(o)) leaves(v, acc, kk, rev);
    return acc;
}
function rebuild(o, map, k = '', rev = false) {
    if (typeof o === 'string') return !isCode(k, o, rev) && map.has(o) ? map.get(o) : o;
    if (Array.isArray(o)) return o.map(v => rebuild(v, map, k, rev));
    if (o && typeof o === 'object') return Object.fromEntries(Object.entries(o).map(([kk, v]) => [kk, rebuild(v, map, kk, rev)]));
    return o;
}
export const hasHangul = (o) => leaves(o, new Set(), '', true).size > 0;
// 번역 결과를 원본 모양에 덮어씌운다: 숫자·참거짓·빠진 칸은 원본 그대로, 같은 자리의 글자만 바꾼다 (모델이 칸을 빼먹어도 데이터가 안 사라짐)
export function overlay(orig, out, k = '', rev = true) {
    if (typeof orig === 'string') return typeof out === 'string' && out.trim() && !isCode(k, orig, rev) ? out : orig;
    if (Array.isArray(orig)) return orig.map((v, i) => overlay(v, Array.isArray(out) ? out[i] : undefined, k, rev));
    if (orig && typeof orig === 'object') return Object.fromEntries(Object.entries(orig).map(([kk, v]) => [kk, overlay(v, out && typeof out === 'object' ? out[kk] : undefined, kk, rev)]));
    return orig;
}
// 영어 → 원본으로 짝지을 때, 원본에서 한글이 든 칸만
const pairsKo = (en, ko, acc = []) => { for (const [a, b] of pairsOf(en, ko)) if (/[가-힣]/.test(String(b))) acc.push([a, b]); return acc; };
// 한국어로 저장된 칸 → 영어 (화면만 번역으로 옮길 때 1번). 실패하면 원본 그대로.
// known = 앞 칸에서 이미 정해진 이름 (한국어 → 영어): 칸마다 따로 번역해도 같은 이름은 같은 영어로
export async function trJSONToEnglish(obj, known = new Map()) {
    if (engineST()) {
        const fixed = new Map([...known, ...rulePairs().map(([en, ko]) => [ko, en])]);
        const names = [...fixed].filter(([ko]) => ko.length >= 2).sort((a, b) => b[0].length - a[0].length);
        const all = [...leaves(obj, new Set(), '', true)];
        const map = new Map(), send = new Map(); // 원문 → 이름을 영어로 미리 바꾼 글
        for (const s of all) {
            if (fixed.has(s.trim())) { map.set(s, fixed.get(s.trim())); continue; }
            let x = s; for (const [ko, en] of names) x = x.split(ko).join(en);
            if (!/[가-힣]/.test(x)) map.set(s, x); else send.set(s, x);
        }
        const got = await stMany([...new Set(send.values())], true);
        for (const [s, x] of send) if (got.has(x)) map.set(s, got.get(x));
        return rebuild(obj, map, '', true);
    }
    const src = JSON.stringify(obj);
    const fix = [...new Map([...[...known].map(([ko, en]) => [en, ko]), ...rulePairs()])].slice(-80);
    const rules = fix.length ? `\nFixed names (English = Korean; whenever the Korean side appears, use exactly the English side): ${fix.map(([a, b]) => `${a} = ${b}`).join('; ')}` : '';
    const sys = P('ai.translate', { lang: 'English', glossary: '' }) + rules;
    const max = Math.min(16000, Math.max(1000, Math.ceil(src.length * 1.4)));
    let out;
    try { out = parseJSON(await aiGenerate('translate', sys, src, max, trOpts())); }
    catch { out = parseJSON(await aiGenerate('translate', `${sys}\n\nIMPORTANT: Output ONLY one complete, valid JSON object with exactly the same structure.`, src, max, trOpts())); } // 깨지면 1번 더
    return overlay(obj, out);
}

export async function trJSON(obj, extra) {
    const set = settings();
    if (engineST()) {
        try {
            const d = trDict() ?? {};
            const known = (s) => (Object.hasOwn(d, s.trim()) ? d[s.trim()] : undefined);
            const fixed = new Map(rulePairs());
            const all = [...leaves(obj)];
            const map = await stMany(all.filter(s => !fixed.has(s.trim()) && !known(s))); // 지침에 있는 이름 · 이미 아는 건 안 보냄
            for (const s of all) { if (fixed.has(s.trim())) map.set(s, fixed.get(s.trim())); else if (!map.has(s) && known(s)) map.set(s, known(s)); }
            return rebuild(obj, map);
        } catch (e) {
            ssWarn(LOG, 'st translate json', e);
            toastr.warning(`번역하지 못해 원문으로 둬요: ${esc(e.message)}`, TITLE);
            return obj;
        }
    }
    const src = JSON.stringify(obj);
    try {
        const out = await aiGenerate('translate', P('ai.translate', { lang: set.trLang || '한국어', glossary: glossary(extra) }) + llmRules(), src, Math.min(16000, Math.max(1000, Math.ceil(src.length * 1.3))), trOpts());
        // v2.7.3: 원본 모양에 덮어씌운다 — 번역 모델이 칸을 빼먹거나 숫자 · id · 상태 코드를 바꿔도 데이터가 안 망가지게 (「영어로 생성 → 번역본 저장」은 이 결과를 그대로 저장해요)
        return overlay(obj, parseJSON(out), '', false);
    } catch (e) {
        ssWarn(LOG, 'translate json', e);
        toastr.warning(`번역하지 못해 원문으로 둬요: ${esc(e.message)}`, TITLE);
        return obj;
    }
}
export async function trText(text) {
    const set = settings();
    if (!String(text ?? '').trim()) return text;
    if (engineST()) {
        try { return (await stTranslate(String(text))).trim() || text; } catch (e) { ssWarn(LOG, 'st translate text', e); toastr.warning(`번역하지 못해 원문으로 둬요: ${esc(e.message)}`, TITLE); return text; }
    }
    try {
        const out = await aiGenerate('translate', P('ai.translateText', { lang: set.trLang || '한국어', glossary: glossary() }) + llmRules(), String(text), Math.min(4000, Math.max(400, Math.ceil(String(text).length * 1.5))), trOpts());
        return String(out ?? '').replace(/^```[a-z]*\s*|```\s*$/g, '').trim() || text;
    } catch (e) { ssWarn(LOG, 'translate text', e); return text; }
}
// ───── 화면만 번역 (enview): 번역본은 저장하지 않고 사전(meta.tr)에만 남긴다 ─────
const TR_MAX = 3000;
const TR_CHARS = 300000; // 사전 전체 글자 수 상한 (약 300KB)
let trVer = 0; // 사전이 바뀔 때마다 +1 (화면 번역기 캐시 갱신)
const hasLatin = (x) => /[A-Za-z]/.test(x);
app.addTrPairs = (p) => addPairs(p);
// ───── 🌐 번역 고치기 (v2.7.2): 화면에 보이는 한국어가 이상할 때 직접 고친다 (토큰 0 · 이 채팅만) ─────
// 고친 짝은 잠가서 자동 번역이 다시 덮어쓰지 않고, 이름을 고치면 그 이름이 든 다른 번역 문장 속 옛 이름도 같이 바꾼다
export async function openTrFix(only = null) {
    const meta = getMeta(true); if (!meta) return;
    const st = app.current?.state; if (!st && !only) return;
    const d = (meta.tr ??= {}), lock = (meta.trLock ??= {});
    // 상태창 전체(켜진 칸 모두)의 영어 글 · 짧은 것(이름)부터 · 고정한 것 맨 위
    const srcs = only ? [only] : [st.core, ...MOD_IDS.filter(id => modOn(id, meta) && st.data[id]).map(id => st.data[id])];
    const all = [...new Set(srcs.flatMap(o => [...leaves(o)]).map(x => x.trim()).filter(x => /[A-Za-z]/.test(x) && x.length >= 2 && x.length <= 300))]
        .sort((a, b) => (lock[b] ? 1 : 0) - (lock[a] ? 1 : 0) || a.length - b.length);
    const edits = new Map(); // en → 새 한국어 (목록을 다시 그려도 고친 게 남게)
    const el = document.createElement('div');
    el.className = 'ss-root ss-scope ss-trfix ss-notr';
    const nMiss = only ? 0 : missingTr().length;
    el.innerHTML = `<div class="ss-wz-head"><i class="fa-solid fa-language"></i><div><b>🌐 번역 고치기</b><small>상태창 전체 · 고친 건 📌 고정 — 모든 탭과 앞으로 새로 생기는 글에도 그대로 (AI 0회)</small></div></div>
        ${nMiss ? `<div class="ss-card ss-trf-miss"><b>🔤 아직 영어로 남은 글 ${nMiss}개</b><small class="ss-hint">AI가 나중에 새로 쓴 글이에요. ${engineST() ? '실리 기본 번역으로 (토큰 0)' : '번역 모델로 (AI 호출 · 자동 번역은 토큰을 아끼려고 꺼져 있어요)'} 한 번에 번역해요.</small><button class="ss-btn pri ss-trf-go"><i class="fa-solid fa-language"></i> 남은 글 번역하기</button></div>` : ''}
        <div class="ss-inline"><input class="ss-in ss-trf-q" placeholder="찾기 — 영어나 한국어 (예: Leon, 레온)"><label class="ss-tog sm"><input type="checkbox" class="ss-switch ss-trf-pin"><span>📌 고정만</span></label></div>
        <small class="ss-hint ss-trf-n"></small>
        <div class="ss-trf-list"></div>
        <p class="ss-hint">왼쪽은 저장된 영어, 칸에 적은 한국어가 화면에 보여요. 이름을 고치면 그 이름이 든 다른 문장 번역도 같이 바뀌고, 새 글을 번역할 때도 그 이름으로 넣어요. 칸을 비우면 고정이 풀리고 자동 번역으로 돌아가요.</p>`;
    const listEl = el.querySelector('.ss-trf-list'), qEl = el.querySelector('.ss-trf-q'), pinEl = el.querySelector('.ss-trf-pin'), nEl = el.querySelector('.ss-trf-n');
    const val = (en) => (edits.has(en) ? edits.get(en) : d[en] ?? '');
    const draw = () => {
        const q = qEl.value.trim().toLowerCase();
        const hits = all.filter(en => (!pinEl.checked || lock[en]) && (!q || en.toLowerCase().includes(q) || String(val(en)).toLowerCase().includes(q)));
        const shown = hits.slice(0, 150); // 한 번에 150줄까지 (찾기로 좁혀요)
        nEl.textContent = `${hits.length}개${hits.length > shown.length ? ` 중 ${shown.length}개 보임 — 찾기로 좁혀 보세요` : ''}`;
        listEl.innerHTML = shown.map(en => `<label class="ss-trf-row"><small>${lock[en] ? '<b class="ss-trf-lock">📌</b> ' : ''}${esc(en)}</small><input class="ss-in" data-en="${esc(en)}" value="${esc(val(en))}" placeholder="(아직 번역 없음 — 비워 두면 자동)"></label>`).join('') || '<p class="ss-hint">찾는 글이 없어요.</p>';
    };
    el.querySelector('.ss-trf-go')?.addEventListener('click', (e) => { el.closest('dialog')?.querySelector('.popup-button-cancel')?.click(); translateMissing(null); });
    listEl.addEventListener('input', (e) => { const en = e.target.dataset?.en; if (en !== undefined) edits.set(en, e.target.value.trim()); });
    qEl.addEventListener('input', draw); pinEl.addEventListener('change', draw);
    draw();
    const ok = await app.popup(el, { okButton: '저장', cancelButton: '취소', large: true });
    if (!ok || !edits.size) return;
    let n = 0;
    for (const [en, ko] of edits) {
        const old = d[en] ?? '';
        if (ko === old) continue;
        n++;
        if (!ko) { delete d[en]; delete lock[en]; continue; }
        d[en] = ko; lock[en] = true;
        if (en.length <= 40) for (const [k, v] of Object.entries(d)) {
            if (k === en || edits.has(k) || typeof v !== 'string') continue;
            let nv = v;
            if (old && (k.includes(en) || old.length >= 4) && nv.includes(old)) nv = nv.split(old).join(ko); // 옛 한국어 이름 (원문에 이름이 없어도 4글자 이상이면)
            if (nv.includes(en)) nv = nv.replace(wordRe(en), (m0, pre) => pre + ko); // 번역문 안에 영어 그대로 남은 이름 (「Leon 외과 과장」)
            if (nv !== v) d[k] = nv;
        } // 이 이름이 든 다른 문장도
    }
    if (!n) return;
    trVer++; memo.clear();
    await saveMeta();
    app.rerenderPanels?.(true); translateView(); app.renderHud?.();
    toastr.success(`번역 ${n}개를 고쳐서 고정했어요.`, TITLE);
}
app.openTrFix = openTrFix;
// 🧹 번역 사전 정리 (v2.7.6): 지금 상태창 · 변동 칩 어디에도 없는 옛 번역을 지워요 (📌 고정한 건 남김 · AI 0회)
// 사전은 채팅 파일에 저장돼서, 오래 쓰면 지워진 아이템 · 옛 소식 번역이 쌓여 파일이 커지고 화면 번역이 느려져요
export async function pruneTr() {
    const meta = getMeta(); const d = meta?.tr;
    if (!d || !Object.keys(d).length) { toastr.info('정리할 번역 사전이 없어요.', TITLE); return 0; }
    const s = app.current?.state; if (!s) { toastr.info('상태창이 있는 채팅에서 눌러 주세요.', TITLE); return 0; }
    const parts = [JSON.stringify(s.core), JSON.stringify(s.data), JSON.stringify(s.recent ?? [])];
    for (const sn of app.current.snaps?.values?.() ?? []) parts.push(sn.labels.join('\n'));
    const hay = parts.join('\n');
    const lock = meta.trLock ?? {};
    const drop = Object.keys(d).filter(k => !lock[k] && !hay.includes(k) && !hay.includes(JSON.stringify(k).slice(1, -1)));
    if (!drop.length) { toastr.success('지울 옛 번역이 없어요. 사전이 깔끔해요.', TITLE); return 0; }
    const kb = Math.round(drop.reduce((n, k) => n + k.length + String(d[k]).length, 0) / 1024 * 3) ; // 한글은 3바이트쯤
    if (!(await SillyTavern.getContext().Popup.show.confirm(TITLE, `번역 사전 ${Object.keys(d).length}개 중 지금 상태창에 없는 ${drop.length}개를 지울까요? (약 ${kb}KB · 📌 고정한 건 남겨요)<br><small>나중에 그 글이 다시 나오면 다시 번역돼요.</small>`))) return 0;
    for (const k of drop) delete d[k];
    trVer++; memo.clear();
    await saveMeta();
    app.rerenderPanels?.(true); translateView();
    toastr.success(`옛 번역 ${drop.length}개를 지웠어요.`, TITLE);
    return drop.length;
} // 기본 틀 영어판이 화면 번역 짝을 넣을 때 (skeleton.js → 순환 import 없이)
export function addPairs(pairs) {
    const meta = getMeta(true);
    if (!meta) return 0;
    const d = (meta.tr ??= {});
    let n = 0;
    for (const [en0, ko0] of pairs) {
        const en = String(en0 ?? '').trim(), ko = String(ko0 ?? '').trim();
        if (!en || !ko || en === ko || !hasLatin(en)) continue;
        if (Object.hasOwn(d, en) && d[en] === ko) continue;
        if (meta.trLock?.[en]) continue; // 내가 「번역 고치기」로 고친 건 덮어쓰지 않음
        delete d[en]; d[en] = ko; n++;
    }
    const keys = Object.keys(d);
    for (const k of keys.slice(0, Math.max(0, keys.length - TR_MAX))) delete d[k];
    // 채팅 파일이 커지지 않게: 사전 전체 글자 수에 상한 (오래된 것부터 지움 · 지워진 건 다음에 다시 번역)
    let size = 0; for (const k of Object.keys(d)) size += k.length + d[k].length;
    if (size > TR_CHARS) for (const k of Object.keys(d)) { if (size <= TR_CHARS * 0.9) break; size -= k.length + d[k].length; delete d[k]; }
    if (n) { trVer++; Promise.resolve().then(() => saveMeta()).catch(() => { /* ignore */ }); }
    return n;
}
// 원문 JSON과 번역 JSON을 같은 모양대로 따라가며 글자 칸끼리 짝짓기
export function pairsOf(src, out, acc = []) {
    if (typeof src === 'string') { if (typeof out === 'string') acc.push([src, out]); return acc; }
    if (Array.isArray(src)) { if (Array.isArray(out)) src.forEach((v, i) => pairsOf(v, out[i], acc)); return acc; }
    if (src && typeof src === 'object' && out && typeof out === 'object') for (const k of Object.keys(src)) pairsOf(src[k], out[k], acc);
    return acc;
}
// 생성 결과 마무리: en = 번역본을 저장 (예전) · enview = 원문 저장 + 사전만
export const finJSON = async (obj, extra) => {
    if (!needTr()) return obj;
    const out = await trJSON(obj, extra);
    if (!viewTr()) return out;
    if (out !== obj) addPairs(pairsOf(obj, out));
    addPairs(rulePairs()); // 지침의 「원문 = 번역」이 늘 이긴다
    return obj;
};
export const finText = async (t) => {
    if (!needTr()) return t;
    const out = await trText(t);
    if (!viewTr()) return out;
    addPairs([[t, out]]); addPairs(rulePairs());
    return t;
};
export const finLines = async (lines) => {
    if (!needTr() || !lines.length) return lines;
    const out = (await trText(lines.join('\n'))).split(/\r?\n/).map(x => x.trim()).filter(Boolean);
    if (!viewTr()) return out;
    addPairs(out.length === lines.length ? lines.map((x, i) => [x, out[i]]) : [[lines.join('\n'), out.join('\n')]]); addPairs(rulePairs());
    return lines;
};

// ───── 화면 번역기: 상태창 UI의 글자(텍스트 노드)만 바꾼다. 데이터·입력칸·속성(data-arg 등)·본편 메시지는 그대로 ─────
// 미트볼이 직접 그린 화면만 (body에도 ss-nohud 같은 이름이 붙으므로 「ss-로 시작하는 아무거나」는 안 됨 → 실리 화면 전체가 번역됐었음)
const SCOPE = '.ss-scope, .ss-root, .ss-panel, .ss-msgcard, .ss-slot, #ss-hud, #ss-side, #ss-float, #ss-settings, #ss-toasts, .ss-toasts';
const SKIP = 'input, textarea, select, option, script, style, code, pre, .ss-pw, [contenteditable="true"], .ss-notr';
let sorted = { d: null, n: -1, ver: -1, list: [] };
const memo = new Map(); // 같은 글자는 한 번만 계산 (상태창을 다시 그릴 때마다 사전 전체를 돌지 않게)
function entries(d) {
    // 사전이 바뀌는 곳(addPairs · 번역 고치기)은 모두 trVer를 올려요 → 글자마다 Object.keys(사전)을 세던 것 빼기 (사전이 크면 화면 번역이 느렸던 원인 · v2.7.3)
    if (sorted.d === d && sorted.ver === trVer) return sorted.list;
    const n = Object.keys(d).length;
    if (sorted.d !== d || sorted.n !== n || sorted.ver !== trVer) {
        // (^|글자 아님)단어(?!글자) — 뒤돌아보기(lookbehind)는 구형 사파리에서 오류라 쓰지 않는다
        // 글 속에서 바꿔 끼우는 건 이름 · 낱말(3~40자)만 — 긴 문장까지 넣으면 사전이 클 때 글마다 수천 번 훑어 화면이 느려졌어요 (v2.7.3)
        sorted = { d, n, ver: trVer, list: Object.entries(d).filter(([e]) => e.length >= 3 && e.length <= 40).sort((a, b) => b[0].length - a[0].length).map(([e, k]) => [e, k, new RegExp(`(^|[^A-Za-z])${e.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![A-Za-z])`, 'g')]) };
        memo.clear();
    }
    return sorted.list;
}
// 화면에서 「…」로 잘린 글(short())은 사전의 원문과 안 맞아서 영어로 남았음 → 앞부분이 같은 원문을 찾아 그 번역을 같은 길이쯤으로 잘라 보여 준다 (v2.7.2)
let prefixIdx = { d: null, ver: -1, n: -1, m: null };
function prefixHit(d, pre) {
    if (prefixIdx.d !== d || prefixIdx.ver !== trVer) {
        const m = new Map();
        for (const key of Object.keys(d)) { if (key.length < 12) continue; const h = key.slice(0, 10); (m.get(h) ?? m.set(h, []).get(h)).push(key); }
        prefixIdx = { d, ver: trVer, n: Object.keys(d).length, m };
    }
    return (prefixIdx.m.get(pre.slice(0, 10)) ?? []).find(key => key.replace(/\s+/g, ' ').startsWith(pre)) ?? null;
}
// 📌 고정한 이름이 번역문 안에 영어로 남아 있으면 (번역기가 고유명사를 안 옮긴 경우) 화면에서 바꿔 보여 준다
let lockRe = { ver: -1, m: null, list: [] };
function fixLocked(t) {
    if (!t || !hasLatin(t)) return t;
    const m = getMeta();
    if (lockRe.ver !== trVer || lockRe.m !== m) lockRe = { ver: trVer, m, list: lockedPairs().sort((a, b) => b[0].length - a[0].length).map(([en, ko]) => [wordRe(en), ko]) };
    for (const [re, ko] of lockRe.list) t = t.replace(re, (m0, pre) => pre + ko);
    return t;
}
export function trString(v, d = trDict()) {
    if (!d || !v || !hasLatin(v)) return v;
    const k = v.trim();
    if (Object.hasOwn(d, k)) return v.replace(k, () => fixLocked(String(d[k])));
    if (k.endsWith('…') && k.length >= 12) {
        const pre = k.slice(0, -1).trimEnd(), full = prefixHit(d, pre);
        if (full) { const ko = fixLocked(String(d[full])); const n = Math.max(12, Math.round(pre.length * 0.75)); return v.replace(k, () => (ko.length > n + 1 ? `${ko.slice(0, n).trimEnd()}…` : ko)); }
    }
    const list = entries(d); // (사전이 바뀌었으면 여기서 memo가 비워진다)
    const hit = memo.get(v);
    if (hit !== undefined) return hit;
    let out = v;
    for (const [en, ko, re] of list) if (out.includes(en)) out = out.replace(re, (m, pre) => pre + ko);
    if (memo.size > 4000) memo.clear();
    memo.set(v, out);
    return out;
}
// 본편 메시지 글(.mes_text)은 절대 안 건드리되, 그 안에 붙는 미트볼 변동 칩(.ss-slot)만은 번역한다
function eligible(p) {
    if (p.closest(SKIP)) return false;
    if (p.closest('#chat, .mes')) return !!p.closest('.ss-slot, .ss-msgcard'); // 채팅 안: 이름표·본문은 절대 안 건드리고, 미트볼 변동 칩만
    const sc = p.closest(SCOPE);
    return !!sc && sc !== document.body && sc !== document.documentElement;
}
function trNode(node, d) {
    const p = node.parentElement;
    if (!p || !eligible(p)) return;
    const v = node.nodeValue;
    const out = trString(v, d);
    if (out !== v) node.nodeValue = out;
}
function walk(root, d) {
    if (!root) return;
    if (root.nodeType === 3) return trNode(root, d);
    if (root.nodeType !== 1) return;
    if (!root.closest(SCOPE) && !root.querySelector(SCOPE)) return;
    const tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (tw.nextNode()) nodes.push(tw.currentNode);
    for (const n of nodes) trNode(n, d);
}
export function translateView(root = null) {
    const d = trDict();
    if (!d) return;
    if (root) return walk(root, d);
    for (const el of document.querySelectorAll(SCOPE)) walk(el, d); // 미트볼 화면만 훑는다 (채팅 전체를 돌지 않게)
}
let observer = null;
export function startViewTr() {
    if (observer || typeof MutationObserver === 'undefined') return;
    observer = new MutationObserver((muts) => {
        const d = trDict();
        if (!d) return;
        for (const m of muts) {
            // 본편 메시지 글이 바뀐 것(스트리밍 · 다른 확장)은 미트볼 칩이 아니면 건너뛴다 — 답을 쓰는 동안 글자마다 훑던 것 (v2.7.3)
            const t = m.target;
            if (t?.nodeType === 1 && t.closest?.('.mes_text') && !t.closest('.ss-slot, .ss-msgcard')) { let mine = false; for (const n of m.addedNodes) if (n.nodeType === 1 && (n.classList?.contains('ss-slot') || n.querySelector?.('.ss-slot, .ss-msgcard'))) { mine = true; break; } if (!mine) continue; }
            for (const n of m.addedNodes) walk(n, d);
        }
    });
    observer.observe(document.body, { childList: true, subtree: true });
}

// 「상태창 전체 번역」: 세계 핵심 + 켜진 칸 하나씩
let running = false, stop = false;
export async function translateSheet(btn) {
    if (running) { stop = true; return; }
    if (viewTr() && koPanels().length) return convertToEnglish(btn); // 화면만 번역인데 한국어로 저장된 칸이 있으면 → 그걸 먼저 영어 저장으로
    const s = app.current?.state;
    if (!s) return;
    if (viewTr()) return translateMissing(btn); // 화면만 번역: 아직 번역 안 된 글만 (v2.7.12 · 예전엔 다 번역된 칸까지 칸마다 다시)
    const meta = getMeta();
    const ids = ['core', ...MOD_IDS.filter(id => modOn(id, meta) && s.data[id])];
    if (!(await SillyTavern.getContext().Popup.show.confirm(TITLE, `상태창 ${ids.length}칸을 「${esc(settings().trLang || '한국어')}」로 번역해요 (번역 모델 ${ids.length}회). 숫자·구조는 그대로 둬요. 다시 누르면 멈춰요.`))) return;
    running = true; stop = false;
    const old = btn?.innerHTML;
    let k = 0;
    try {
        for (const id of ids) {
            if (stop) break;
            if (btn) btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> ${k}/${ids.length} · 누르면 멈춤`;
            const cur = id === 'core' ? app.current.state.core : app.current.state.data[id];
            const out = await trJSON(cur);
            if (viewTr()) { if (out !== cur) addPairs(pairsOf(cur, out)); addPairs(rulePairs()); } // 화면만 번역: 데이터는 그대로
            else if (out !== cur) await commit(id, out, '');
            k++;
        }
    } finally { running = false; if (btn) btn.innerHTML = old; }
    if (viewTr()) { app.refreshNow?.(); translateView(); }
    toastr.success(`${k}칸 번역했어요${stop ? ' (멈춤)' : ''}.${viewTr() ? ' 데이터는 영어 그대로고, 화면에만 번역이 보여요.' : ''}`, TITLE);
}
// 화면에 영어로 남은 글 (사전에 없는 것)
let missMemo = { s: null, v: -1, out: [] };
const halfDone = (en, ko) => { const v = String(ko ?? '').trim(); return v !== en.trim() && v === preSub(en).trim(); }; // 이름만 한국어로 바뀐 채 저장된 옛 번역 (번역기가 섞인 글을 그대로 돌려줬던 것)
const lockOf = (k) => getMeta()?.trLock?.[k];
// 번역기가 영어를 그대로 돌려준 글 (이번 접속) — 다시 보내지 않고, 왜 그런지 한 번 알려 준다 (v2.7.14)
const stuck = new Set();
let stuckWarned = false;
function noteStuck(list) {
    const d = trDict() ?? {};
    const same = list.filter(k => !Object.hasOwn(d, k));
    for (const k of same) stuck.add(k);
    if (!same.length || stuckWarned) return same.length;
    stuckWarned = true;
    const es = ctx().extensionSettings?.translate ?? {};
    const who = engineST() ? `실리 기본 번역 (번역기: ${es.provider || 'google'} · 언어 코드: ${settings().trCode || 'ko'})` : '번역 모델';
    toastr.warning(`번역기가 ${same.length}개 글을 <b>영어 그대로</b> 돌려줬어요 — ${esc(who)}.<br>• 실리 기본 번역이면: 확장 메뉴 › Chat Translation에서 번역기가 동작하는지, 미트볼 설정 › 🌐 「번역 언어 코드」가 <b>ko</b>인지 확인해 주세요.<br>• 고유명사(별명 · 칭호)는 번역기가 일부러 안 바꾸기도 해요 → 🌐 「번역 고치기」에서 직접 적으면 고정돼요.`, TITLE, { timeOut: 20000, escapeHtml: false });
    return same.length;
}
export function missingTr() {
    const s = app.current?.state; if (!s || !viewTr()) return [];
    if (missMemo.s === s && missMemo.v === trVer) return missMemo.out; // 상태 · 사전이 그대로면 다시 안 훑음 (화면 그릴 때마다 불려서)
    const d = trDict() ?? {}, meta = getMeta(), out = new Set();
    for (const o of [s.core, ...MOD_IDS.filter(id => modOn(id, meta) && s.data[id]).map(id => s.data[id])]) {
        for (const x of leaves(o)) {
            const k = x.trim();
            if (!k || k.length > 600 || /[가-힣]/.test(k) || stuck.has(k)) continue;
            // 예전에 「이름만 한국어로 바꾼 영어 문장」이 번역으로 저장된 것(Open romantic 애정 and …)도 아직 번역 안 된 걸로 본다
            if (Object.hasOwn(d, k) && !(lockOf(k) === undefined && halfDone(k, d[k]))) continue;
            out.add(k);
        }
    }
    missMemo = { s, v: trVer, out: [...out] };
    return missMemo.out;
}
// 🌐 버튼 (화면만 번역): 영어로 남은 글만 모아 번역한다 — 자동 번역을 꺼 둔 경우(번역 모델 · 토큰 아끼기)에 직접 누르는 용
export async function translateMissing(btn) {
    const need = missingTr();
    if (!need.length) { toastr.success('번역 안 된 글이 없어요. 그래도 이상한 번역이 보이면 「번역 고치기」로 직접 고칠 수 있어요.', TITLE); return; }
    const calls = engineST() ? '실리 기본 번역 · 토큰 0' : `번역 모델 약 ${Math.ceil(need.length / 60)}회`;
    if (!(await SillyTavern.getContext().Popup.show.confirm(TITLE, `아직 영어로 남은 글 ${need.length}개를 번역해요 (${esc(calls)}).<br><small>이미 번역된 글 · 직접 고친 글은 그대로예요. 다시 누르면 멈춰요.</small>`))) return;
    { const m = getMeta(true); for (const k of need) if (m?.tr && Object.hasOwn(m.tr, k) && !lockOf(k)) { delete m.tr[k]; trVer++; } } // 반쯤 된 옛 번역은 지우고 다시
    running = true; stop = false;
    const old = btn?.innerHTML;
    let done = 0;
    try {
        for (let i = 0; i < need.length && !stop; i += 60) {
            if (btn) btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> ${done}/${need.length}`;
            const src = { list: need.slice(i, i + 60) };
            const out = await trJSON(src);
            if (out !== src && Array.isArray(out?.list) && out.list.length === src.list.length) { addPairs(pairsOf(src, out)); done += src.list.length; }
        }
        addPairs(rulePairs());
    } finally { running = false; if (btn) btn.innerHTML = old; }
    let nStuck = noteStuck(need);
    // 실리 번역기가 못 바꾼 글(별명 · 칭호 같은 것)은 번역 모델로 한 번 더 — 묻고 나서만 (AI 1회 · v2.7.16)
    if (nStuck && engineST() && settings().trLlmFallback !== false) {
        const left0 = need.filter(k => !Object.hasOwn(trDict() ?? {}, k));
        if (await SillyTavern.getContext().Popup.show.confirm(TITLE, `실리 번역기가 ${left0.length}개 글을 영어 그대로 돌려줬어요.<br><small>${left0.slice(0, 5).map(esc).join('<br>')}${left0.length > 5 ? '<br>…' : ''}</small><br><br>번역 모델(메인 연결 · <b>AI 1회</b>)로 번역할까요?`)) {
            forceLLM = true;
            try {
                const src = { list: left0 };
                const out = await trJSON(src);
                if (out !== src && Array.isArray(out?.list) && out.list.length === left0.length) { addPairs(pairsOf(src, out)); for (const k of left0) if (Object.hasOwn(trDict() ?? {}, k)) stuck.delete(k); }
            } catch (e) { toastr.error(`번역 모델이 실패했어요: ${esc(e.message)}`, TITLE); } finally { forceLLM = false; }
            nStuck = left0.filter(k => !Object.hasOwn(trDict() ?? {}, k)).length;
        }
    }
    if (nStuck) done = Math.max(0, done - nStuck);
    missMemo.s = null;
    app.refreshNow?.(); translateView();
    const left = missingTr().length;
    toastr[left ? 'info' : 'success'](`${done}개 번역했어요${stop ? ' (멈춤)' : ''}.${left ? ` 아직 ${left}개 남았어요 — 한 번 더 누르면 이어서 해요.` : ''}`, TITLE);
}
// 이 채팅에서 한국어로 저장된 칸 (화면만 번역 모드에서 AI에게 한국어가 새는 곳)
export function koPanels() {
    const s = app.current?.state; if (!s) return [];
    const meta = getMeta();
    return ['core', ...MOD_IDS.filter(id => modOn(id, meta) && s.data[id])].filter(id => hasHangul(id === 'core' ? s.core : s.data[id]));
}
// 채팅을 열었을 때 한 번: 한국어로 저장된 칸이 있으면 알려 주고, 누르면 바로 바꾼다
let lastKoCheck = '';
export function checkKorean() {
    if (!viewTr() || running) return;
    const id = String(ctx().getCurrentChatId?.() ?? '');
    if (!id || lastKoCheck === id || !app.current?.state) return; // 상태가 계산된 뒤에 한 번
    lastKoCheck = id;
    const ko = koPanels();
    if (!ko.length) return;
    const names = ko.map(x => (x === 'core' ? '세계 핵심' : MOD[x]?.name ?? x)).join(', ');
    toastr.warning(`이 채팅엔 <b>한국어로 저장된 칸</b>이 ${ko.length}개 있어서 AI에게 한국어로 가요: ${esc(names)}<br><b>👉 여기를 누르면 영어 저장으로 바꿔요</b> (보이는 한국어는 그대로)`, TITLE, { timeOut: 15000, extendedTimeOut: 5000, escapeHtml: false, onclick: () => convertToEnglish(null) });
}
// 본편 AI가 새로 쓴 영어 글(새 아이템·메모·퀘스트 등)도 화면에선 번역돼 보이게 — 모르는 글만 모아서 가끔 한 번
let filling = false, fillTimer = null;
const tried = new Set();
export function scheduleFill() {
    if (!viewTr()) return;
    const mode = settings().trAuto === true ? 'st' : settings().trAuto === false ? 'off' : (settings().trAuto || 'st');
    if (mode === 'off' || (mode === 'st' && !engineST())) return; // 토큰이 드는 번역 모델은 「항상」을 골랐을 때만
    clearTimeout(fillTimer);
    fillTimer = setTimeout(() => { fillNew().catch(e => ssWarn(LOG, 'fill', e)); }, 2500);
}
let failedOnce = false, fillRetries = 0;
async function fillNew() {
    if (filling || running || !viewTr()) return;
    if (mainBusy()) return scheduleFill(); // 본편 AI가 답을 쓰는 동안엔 부르지 않는다 (끝난 뒤 다시 · 5분 넘으면 끝난 걸로 봄)
    const s = app.current?.state; if (!s) return;
    const d = trDict() ?? {};
    const meta = getMeta();
    const need = [];
    for (const o of [s.core, ...MOD_IDS.filter(id => modOn(id, meta) && s.data[id]).map(id => s.data[id])]) {
        for (const x of leaves(o)) {
            const k = x.trim();
            if (!k || k.length > 600 || /[가-힣]/.test(k) || tried.has(k) || stuck.has(k)) continue;
            if (Object.hasOwn(d, k)) { if (lockOf(k) !== undefined || !halfDone(k, d[k])) continue; delete d[k]; trVer++; } // 반쯤 된 옛 번역은 저절로 다시 (누를 필요 없이)
            need.push(k); tried.add(k);
            if (need.length >= 60) break;
        }
        if (need.length >= 60) break;
    }
    if (!need.length) return;
    filling = true;
    try {
        const src = { list: need };
        const out = await trJSON(src);
        // 개수가 다르면(모델이 줄을 합치거나 뺐으면) 짝이 어긋나므로 버린다
        if (out !== src && Array.isArray(out?.list) && out.list.length === need.length) { addPairs(pairsOf(src, out)); addPairs(rulePairs()); translateView(); }
        // 번역이 안 돌아온 글은 다음에 다시 (예전엔 한 번 실패하면 이번 접속 내내 영어로 남았음)
        const d2 = trDict() ?? {};
        // 번역기가 답은 했는데 영어 그대로면(짝 개수는 맞음) 실패가 아니라 「못 바꿈」 → 다시 안 보냄 · 한 번 알림
        if (out !== src && Array.isArray(out?.list) && out.list.length === need.length) noteStuck(need);
        else for (const k of need) if (!Object.hasOwn(d2, k)) { tried.delete(k); failedOnce = true; }
    } finally { filling = false; }
    // 60개씩 끊어서 → 남은 게 있으면 이어서 (예전엔 첫 60개만 번역하고 멈췄음) · 실패가 있었으면 잠깐 쉬었다가
    if (failedOnce && ++fillRetries > 3) failedOnce = false; // 번역기가 계속 실패하면 이번 접속에선 3번까지만 다시
    if (need.length >= 60 || failedOnce) { const wait = failedOnce ? 20000 : 1500; failedOnce = false; clearTimeout(fillTimer); fillTimer = setTimeout(() => { fillNew().catch(e => ssWarn(LOG, 'fill', e)); }, wait); }
}
// 「한국어로 저장된 칸을 영어 저장으로 바꾸기」: 예전 방식(번역본 저장)이나 한국어 생성으로 만든 상태창을
// 화면만 번역으로 옮긴다. 원래 있던 한국어는 화면 번역(사전)으로 그대로 남는다.
export async function convertToEnglish(btn) {
    if (running) { stop = true; return; }
    const s = app.current?.state;
    if (!s) { toastr.info('이 채팅에 상태창이 없어요.', TITLE); return; }
    if (!viewTr()) { toastr.info('먼저 「상태창 생성 언어」를 「영어로 저장 · 화면만 번역」으로 바꿔 주세요.', TITLE); return; }
    const meta = getMeta();
    const ids = koPanels();
    if (!ids.length) { toastr.success('한국어로 저장된 칸이 없어요. 이미 영어로 저장돼 있어요.', TITLE); return; }
    const who = settings().trEngine === 'st' ? '실리 기본 번역 (토큰 0)' : `번역 모델 ${ids.length}회`;
    if (!(await SillyTavern.getContext().Popup.show.confirm(TITLE, `한국어로 저장된 ${ids.length}칸을 영어 저장으로 바꿔요 (${esc(who)}).<br><br>• 지금 보이는 한국어는 <b>화면 번역으로 그대로 남아요</b> — 화면은 거의 그대로고, AI에게만 영어로 가요.<br>• 칸마다 「되돌리기」(<code>/ss-undo</code>)로 되돌릴 수 있어요. 걱정되면 먼저 관리 탭 › 세이브나 전체 백업을 해 두세요.<br>• 다시 누르면 멈춰요.`))) return;
    running = true; stop = false;
    const old = btn?.innerHTML;
    let k = 0, fail = 0;
    const failed = [];
    const known = new Map(); // 짧은 이름들: 한국어 → 영어
    try {
        for (const id of ids) {
            if (stop) break;
            if (btn) btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> ${k}/${ids.length} · 누르면 멈춤`;
            const cur = id === 'core' ? app.current.state.core : app.current.state.data[id];
            try {
                const out = await trJSONToEnglish(cur, known);
                if (hasHangul(out) && JSON.stringify(out) === JSON.stringify(cur)) throw new Error('번역 결과가 비었어요');
                const pairs = pairsKo(out, cur);
                for (const [en, ko] of pairs) { const a = String(ko ?? '').trim(), b = String(en ?? '').trim(); if (a && b && a !== b && a.length <= 30 && !known.has(a)) known.set(a, b); }
                addPairs(pairs); // 영어 → 원래 있던 한국어
                await commit(id, out, '');
                k++;
            } catch (e) { fail++; failed.push(id === 'core' ? '세계 핵심' : MOD[id]?.name ?? id); ssWarn(LOG, 'to english', id, e); }
        }
        addPairs(rulePairs());
    } finally { running = false; if (btn) btn.innerHTML = old; }
    app.refreshNow?.(); translateView();
    toastr[fail ? 'warning' : 'success'](`${k}칸을 영어 저장으로 바꿨어요${fail ? ` · <b>${esc(failed.join(', '))}</b>은(는) 실패해서 한국어 그대로예요. 한 번 더 누르면 실패한 칸만 다시 해요` : ''}${stop ? ' (멈춤)' : ''}.`, TITLE, fail ? { timeOut: 12000, escapeHtml: false } : {});
    lastKoCheck = '';
}
export { MOD };
