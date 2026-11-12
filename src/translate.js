// 🌐 상태창 번역: 확장 AI가 상태창을 영어로 만들면 → 번역 모델(따로 고른 싼 모델)이 한국어로 옮긴다
// 「상태창 전체 번역」 버튼은 이미 있는 칸들을 통째로 번역한다.
import { app, ctx, settings, esc, TITLE, LOG, MOD_IDS, MOD, modOn, getMeta, saveMeta, viewTr, trDict } from './core.js';
import { P, aiGenerate, parseJSON } from './prompts.js';
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
const llmRules = () => (rulesText() ? `\n\nExtra rules from the user (follow them exactly):\n${rulesText()}` : '');
// 「원문 = 번역」 · 「원문 -> 번역」 · 「원문 → 번역」 줄 → 이름·용어 고정
export function rulePairs() {
    return rulesText().split(/\r?\n/).map(l => l.match(/^\s*(.+?)\s*(?:=|->|→)\s*(.+?)\s*$/)).filter(Boolean).map(m => [m[1], m[2]]).filter(([a]) => /[A-Za-z]/.test(a)).sort((a, b) => b[0].length - a[0].length);
}
const preSub = (text) => { let t = String(text); for (const [a, b] of rulePairs()) t = t.split(a).join(b); return t; };

// ───── 실리 기본 번역 (Chat Translation 확장의 translate()) ─────
const engineST = () => settings().trEngine === 'st';
let stMod = null;
async function stTranslate(text) {
    // 실리가 이미 올려 둔 translate()를 먼저 쓰고 (새 버전), 없으면 모듈을 직접 불러온다
    let fn = typeof globalThis.translate === 'function' ? globalThis.translate : null;
    if (!fn) { stMod ??= await import('/scripts/extensions/translate/index.js'); fn = stMod?.translate; }
    if (typeof fn !== 'function') throw new Error('실리 번역 확장을 찾지 못했어요');
    const es = ctx().extensionSettings?.translate ?? {};
    const out = await fn(preSub(text), String(settings().trCode || 'ko').trim(), es.provider || 'google');
    if (typeof out !== 'string') throw new Error('실리 번역이 실패했어요 (확장 메뉴 › Chat Translation에서 번역기를 확인해 주세요)');
    return out;
}
// 여러 줄을 묶어서 한 번에 (요청 수 줄이기). 줄 수가 안 맞으면 그 묶음만 하나씩.
async function stMany(list) {
    const out = new Map();
    const flat = (x) => x.replace(/\s*\r?\n\s*/g, ' / ');
    const batches = [];
    let cur = [], len = 0;
    for (const s of list) { const f = flat(s); if (cur.length && (len + f.length > 1500 || cur.length >= 40)) { batches.push(cur); cur = []; len = 0; } cur.push(s); len += f.length + 1; }
    if (cur.length) batches.push(cur);
    for (const b of batches) {
        let lines = null;
        try { lines = (await stTranslate(b.map(flat).join('\n'))).split(/\r?\n/).map(x => x.trim()).filter(Boolean); } catch (e) { console.warn(LOG, 'st batch', e); }
        if (lines && lines.length === b.length) b.forEach((s, i) => out.set(s, lines[i]));
        else for (const s of b) { try { out.set(s, (await stTranslate(s)).trim()); } catch (e) { console.warn(LOG, 'st one', e); } }
    }
    return out;
}
// 코드 값(상태·종류·id 같은 것)은 번역하면 안 된다
const CODE_KEYS = new Set(['id', 'kind', 'role', 'status', 'mode', 'type', 'cls', 'repeat', 'by', 'from', 'icon', 'color', 'unit', 'every', 'key', 'app', 'courier', 'currencyCode', 'genre', 'contact', 'play']);
const isCode = (k, v) => CODE_KEYS.has(k) || /^[a-z0-9_\-]{1,14}$/.test(v) || !/[A-Za-z]/.test(v);
function leaves(o, acc = new Set(), k = '') {
    if (typeof o === 'string') { if (o.trim() && !isCode(k, o)) acc.add(o); return acc; }
    if (Array.isArray(o)) { for (const v of o) leaves(v, acc, k); return acc; }
    if (o && typeof o === 'object') for (const [kk, v] of Object.entries(o)) leaves(v, acc, kk);
    return acc;
}
function rebuild(o, map, k = '') {
    if (typeof o === 'string') return !isCode(k, o) && map.has(o) ? map.get(o) : o;
    if (Array.isArray(o)) return o.map(v => rebuild(v, map, k));
    if (o && typeof o === 'object') return Object.fromEntries(Object.entries(o).map(([kk, v]) => [kk, rebuild(v, map, kk)]));
    return o;
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
            console.warn(LOG, 'st translate json', e);
            toastr.warning(`번역하지 못해 원문으로 둬요: ${esc(e.message)}`, TITLE);
            return obj;
        }
    }
    const src = JSON.stringify(obj);
    try {
        const out = await aiGenerate('translate', P('ai.translate', { lang: set.trLang || '한국어', glossary: glossary(extra) }) + llmRules(), src, Math.min(16000, Math.max(1000, Math.ceil(src.length * 1.3))), trOpts());
        return parseJSON(out);
    } catch (e) {
        console.warn(LOG, 'translate json', e);
        toastr.warning(`번역하지 못해 원문으로 둬요: ${esc(e.message)}`, TITLE);
        return obj;
    }
}
export async function trText(text) {
    const set = settings();
    if (!String(text ?? '').trim()) return text;
    if (engineST()) {
        try { return (await stTranslate(String(text))).trim() || text; } catch (e) { console.warn(LOG, 'st translate text', e); toastr.warning(`번역하지 못해 원문으로 둬요: ${esc(e.message)}`, TITLE); return text; }
    }
    try {
        const out = await aiGenerate('translate', P('ai.translateText', { lang: set.trLang || '한국어', glossary: glossary() }) + llmRules(), String(text), Math.min(4000, Math.max(400, Math.ceil(String(text).length * 1.5))), trOpts());
        return String(out ?? '').replace(/^```[a-z]*\s*|```\s*$/g, '').trim() || text;
    } catch (e) { console.warn(LOG, 'translate text', e); return text; }
}
// ───── 화면만 번역 (enview): 번역본은 저장하지 않고 사전(meta.tr)에만 남긴다 ─────
const TR_MAX = 4000;
let trVer = 0; // 사전이 바뀔 때마다 +1 (화면 번역기 캐시 갱신)
const hasLatin = (x) => /[A-Za-z]/.test(x);
export function addPairs(pairs) {
    const meta = getMeta(true);
    if (!meta) return 0;
    const d = (meta.tr ??= {});
    let n = 0;
    for (const [en0, ko0] of pairs) {
        const en = String(en0 ?? '').trim(), ko = String(ko0 ?? '').trim();
        if (!en || !ko || en === ko || !hasLatin(en)) continue;
        if (Object.hasOwn(d, en) && d[en] === ko) continue;
        delete d[en]; d[en] = ko; n++;
    }
    const keys = Object.keys(d);
    for (const k of keys.slice(0, Math.max(0, keys.length - TR_MAX))) delete d[k];
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
const SCOPE = '.ss-scope, .ss-root, [class^="ss-"], [class*=" ss-"], [id^="ss-"]';
const SKIP = 'input, textarea, select, option, script, style, code, pre, .ss-pw, .mes_text, [contenteditable="true"], .ss-notr';
let sorted = { d: null, n: -1, ver: -1, list: [] };
function entries(d) {
    const n = Object.keys(d).length;
    if (sorted.d !== d || sorted.n !== n || sorted.ver !== trVer) sorted = { d, n, ver: trVer, list: Object.entries(d).filter(([e]) => e.length >= 3).sort((a, b) => b[0].length - a[0].length).map(([e, k]) => [e, k, new RegExp(`(?<![A-Za-z])${e.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![A-Za-z])`, 'g')]) };
    return sorted.list;
}
export function trString(v, d = trDict()) {
    if (!d || !v || !hasLatin(v)) return v;
    const k = v.trim();
    if (Object.hasOwn(d, k)) return v.replace(k, () => d[k]);
    let out = v;
    for (const [en, ko, re] of entries(d)) if (out.includes(en)) out = out.replace(re, () => ko);
    return out;
}
// 본편 메시지 글(.mes_text)은 절대 안 건드리되, 그 안에 붙는 미트볼 변동 칩(.ss-slot)만은 번역한다
function eligible(p) {
    const sk = p.closest(SKIP);
    if (sk) { if (!sk.matches('.mes_text')) return false; const slot = p.closest('.ss-slot, .ss-msgcard'); return !!slot && sk.contains(slot); }
    return !!p.closest(SCOPE);
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
export function translateView(root = document.body) {
    const d = trDict();
    if (d) walk(root, d);
}
let observer = null;
export function startViewTr() {
    if (observer || typeof MutationObserver === 'undefined') return;
    observer = new MutationObserver((muts) => {
        const d = trDict();
        if (!d) return;
        for (const m of muts) for (const n of m.addedNodes) walk(n, d);
    });
    observer.observe(document.body, { childList: true, subtree: true });
}

// 「상태창 전체 번역」: 세계 핵심 + 켜진 칸 하나씩
let running = false, stop = false;
export async function translateSheet(btn) {
    if (running) { stop = true; return; }
    const s = app.current?.state;
    if (!s) return;
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
export { MOD };
