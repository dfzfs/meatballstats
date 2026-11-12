// 화면 공통 도구: 팝업 · 편집기 · 비교 · 작은 부품 · 테마
import { ctx, settings, esc, short, arr, sub, clamp, fmtNum, mascotUrl } from './core.js';
// 마스코트 그림 한 장 (설정에서 끄면 빈칸) — size: xs · sm · md · lg
export const mascot = (name, size = 'md', cls = '') => (settings().showMascot === false ? '' : `<img class="ss-mascot ${size} m-${name} ${cls}" src="${mascotUrl(name)}" alt="" title="눌러 보세요!" draggable="false">`);

// ───── 팝업 ─────
export async function popup(el, opts = {}) {
    const { Popup, POPUP_TYPE } = ctx();
    const p = new Popup(el, opts.type ?? POPUP_TYPE.TEXT, '', { wide: true, large: !!opts.large, allowVerticalScrolling: true, okButton: opts.okButton ?? '닫기', ...opts });
    p.dlg?.classList.add('ss-dlg', 'ss-scope');
    if (opts.full) p.dlg?.classList.add('ss-full');
    return await p.show();
}
export async function confirmPopup(el, ok = '적용', cancel = '취소') {
    const { Popup, POPUP_TYPE } = ctx();
    const p = new Popup(el, POPUP_TYPE.CONFIRM, '', { wide: true, allowVerticalScrolling: true, okButton: ok, cancelButton: cancel });
    p.dlg?.classList.add('ss-dlg', 'ss-scope');
    const r = await p.show();
    return r === 1 || r === true;
}
export const askConfirm = async (text) => !!(await ctx().Popup.show.confirm('미트볼 상태창', text));
export const askInput = async (title, text, def = '') => { const v = await ctx().Popup.show.input(title, text, def); return v === false || v === null || v === undefined ? null : String(v); };
export function insertInput(text, send = false) {
    const ta = document.getElementById('send_textarea');
    if (!ta) return;
    ta.value = ta.value ? `${text} ${ta.value}` : text;
    ta.dispatchEvent(new Event('input', { bubbles: true }));
    ta.focus();
    if (send) document.getElementById('send_but')?.click();
}
export function busyBtn(btn, on, label = '생성 중…') {
    if (!btn) return;
    if (on) { btn.dataset.old = btn.innerHTML; btn.disabled = true; btn.classList.add('busy'); btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> ${label}`; }
    else { btn.disabled = false; btn.classList.remove('busy'); if (btn.dataset.old) btn.innerHTML = btn.dataset.old; }
}
export function closeIfPopup(el) { el.closest('dialog')?.querySelector('.popup-button-ok')?.click(); }

// ───── 작은 부품 ─────
export const ico = (n, cls = 'fa-solid') => `<i class="${cls} ${n}"></i>`;
export const ai1 = '<span class="ss-ai" title="확장 AI를 1번 부릅니다 (토큰 사용)"><i class="fa-solid fa-wand-magic-sparkles"></i>AI</span>';
export const emptyBox = (t, icon = 'fa-feather') => `<div class="ss-empty-s"><i class="fa-solid ${icon}"></i><span>${t}</span></div>`;
export const sec = (title, inner, right = '') => `<section class="ss-sec"><div class="ss-sec-h"><h4>${title}</h4>${right ? `<div class="ss-sec-r">${right}</div>` : ''}</div>${inner}</section>`;
export const chip = (t, cls = '') => `<span class="ss-chip ${cls}">${t}</span>`;
export function gauge(b, compact = false) {
    const pct = clamp((b.cur / Math.max(1, b.max)) * 100, 0, 100);
    const low = pct <= 25 ? 'low' : '';
    return `<div class="ss-gauge ${low} ${compact ? 'c' : ''}" title="${esc(b.name)} ${fmtNum(b.cur)}/${fmtNum(b.max)}${b.desc ? ` — ${esc(b.desc)}` : ''}">
        <div class="ss-gauge-h"><span>${esc(b.name)}</span><b>${fmtNum(b.cur)}<small>/${fmtNum(b.max)}</small></b></div>
        <div class="ss-gauge-t"><i style="width:${pct}%;${b.color ? `--g:${esc(b.color)}` : ''}"></i></div></div>`;
}
export function meter(name, v, cls) {
    const pct = (v + 100) / 2;
    return `<div class="ss-meter ${cls}"><span>${name}</span><div class="ss-meter-t"><b style="left:${Math.min(50, pct)}%;width:${Math.abs(pct - 50)}%"></b></div><em>${v > 0 ? '+' : ''}${v}</em></div>`;
}
export function avatar(name, size = '') {
    let h = 0; for (const ch of String(name)) h = (h * 31 + ch.codePointAt(0)) % 360;
    return `<span class="ss-ava ${size}" style="--h:${h}">${esc(String(name).slice(0, 1))}</span>`;
}
export const seg = (items, cur, act, extra = '') => `<div class="ss-seg" ${extra}>${items.map(([v, label]) => `<button class="${String(v) === String(cur) ? 'on' : ''}" data-act="${act}" data-arg="${esc(v)}">${label}</button>`).join('')}</div>`;

// ───── 변경 비교 ─────
function flatten(o, p = '', out = {}) {
    if (Array.isArray(o)) {
        o.forEach((x, i) => {
            const key = x && typeof x === 'object' ? (x.name ?? x.title ?? x.k ?? (x.a && x.b ? `${x.a}↔${x.b}` : null) ?? x.text?.slice?.(0, 14) ?? i) : i;
            flatten(x, `${p}[${key}]`, out);
        });
        if (!o.length) out[p] = '(없음)';
    } else if (o && typeof o === 'object') {
        for (const [k, v] of Object.entries(o)) flatten(v, p ? `${p}.${k}` : k, out);
    } else out[p] = String(o ?? '');
    return out;
}
export function diffHTML(a, b) {
    const A = flatten(a ?? {}), B = flatten(b ?? {});
    const rows = [];
    for (const k of new Set([...Object.keys(A), ...Object.keys(B)])) {
        if (A[k] === B[k] || k.endsWith('.id')) continue;
        const cls = !(k in A) ? 'add' : !(k in B) ? 'del' : 'chg';
        rows.push(`<div class="ss-diff-row ${cls}"><code>${esc(k)}</code><div>${k in A ? `<s>${esc(short(A[k], 80))}</s>` : ''} ${k in B ? `<b>${esc(short(B[k], 140))}</b>` : ''}</div></div>`);
    }
    return rows.length ? `<div class="ss-diff">${rows.slice(0, 80).join('')}${rows.length > 80 ? `<div class="ss-dim">…외 ${rows.length - 80}개</div>` : ''}</div>` : '<div class="ss-dim">바뀐 것이 없습니다.</div>';
}

// ───── 범용 편집기 ─────
const getPath = (o, path) => path.reduce((x, k) => x?.[k], o);
const setPath = (o, path, v) => { const p = getPath(o, path.slice(0, -1)); if (p) p[path.at(-1)] = v; };
function blankFor(fields) {
    const o = {};
    for (const f of fields) o[f.k] = f.type === 'num' ? 0 : f.type === 'bool' ? (f.k === 'known' || f.k === 'inject') : f.type === 'tags' || f.type === 'list' ? [] : f.type === 'select' ? f.options[0][0] : '';
    return o;
}
function fieldHTML(f, v, path) {
    const p = esc(JSON.stringify(path));
    const lab = esc(sub(f.label));
    switch (f.type) {
        case 'area': return `<label class="ss-f wide"><span>${lab}</span><textarea class="ss-in" rows="2" data-p='${p}' data-t="text">${esc(v)}</textarea></label>`;
        case 'num': return `<label class="ss-f n"><span>${lab}</span><input type="number" class="ss-in" data-p='${p}' data-t="num" value="${v === null || v === undefined || Number.isNaN(v) ? '' : esc(v)}"></label>`;
        case 'bool': return `<label class="ss-f b"><input type="checkbox" class="ss-switch" data-p='${p}' data-t="bool" ${v ? 'checked' : ''}><span>${lab}</span></label>`;
        case 'color': return `<label class="ss-f n"><span>${lab}</span><input type="color" class="ss-color" data-p='${p}' data-t="text" value="${/^#[0-9a-f]{6}$/i.test(v) ? v : '#e2524a'}"></label>`;
        case 'select': return `<label class="ss-f"><span>${lab}</span><select class="ss-in" data-p='${p}' data-t="text">${f.options.map(([k, n]) => `<option value="${esc(k)}" ${String(v) === k ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select></label>`;
        case 'tags': return `<label class="ss-f wide"><span>${lab}</span><input class="ss-in" data-p='${p}' data-t="tags" value="${esc(arr(v).join(', '))}"></label>`;
        default: return `<label class="ss-f"><span>${lab}</span><input class="ss-in" data-p='${p}' data-t="text" value="${esc(v)}"></label>`;
    }
}
export function editorHTML(obj, spec, path = []) {
    return spec.map(f => {
        const v = obj?.[f.k];
        if (f.type !== 'list') return fieldHTML(f, v, [...path, f.k]);
        const list = arr(v);
        const lp = esc(JSON.stringify([...path, f.k]));
        return `<fieldset class="ss-list"><legend>${esc(sub(f.label))} <small>${list.length}</small></legend>
            ${list.map((it, i) => `<details class="ss-erow" ${list.length <= 2 && path.length === 0 ? 'open' : ''}>
                <summary><span>${esc(short(it?.[f.title] ?? '', 40)) || `#${i + 1}`}</span>
                    <span class="ss-erow-b">
                        <button class="ss-ib" data-ed="up" data-p='${lp}' data-i="${i}" title="위로"><i class="fa-solid fa-arrow-up"></i></button>
                        <button class="ss-ib" data-ed="del" data-p='${lp}' data-i="${i}" title="삭제"><i class="fa-solid fa-trash-can"></i></button>
                    </span></summary>
                <div class="ss-erow-body">${editorHTML(it, f.fields, [...path, f.k, i])}</div>
            </details>`).join('')}
            <button class="ss-btn sm ghost" data-ed="add" data-p='${lp}'><i class="fa-solid fa-plus"></i> 추가</button>
        </fieldset>`;
    }).join('');
}
function specAt(spec, path) {
    let fs = spec;
    for (const k of path) { if (typeof k === 'number') continue; const f = fs.find(x => x.k === k); if (!f) return null; if (f.type === 'list') fs = f.fields; }
    return fs;
}
export function bindEditor(root, work, spec, rerender) {
    root.addEventListener('input', (e) => {
        const t = e.target; if (!t.dataset.p) return;
        const path = JSON.parse(t.dataset.p);
        const v = t.dataset.t === 'num' ? (t.value === '' ? null : Number(t.value)) : t.dataset.t === 'bool' ? t.checked : t.dataset.t === 'tags' ? t.value.split(/\s*[,，]\s*/).filter(Boolean) : t.value;
        setPath(work, path, v);
    });
    root.addEventListener('change', (e) => { if (e.target.dataset?.t === 'bool') e.target.dispatchEvent(new Event('input', { bubbles: true })); });
    root.addEventListener('click', (e) => {
        const b = e.target.closest('[data-ed]'); if (!b) return;
        e.preventDefault(); e.stopPropagation();
        const path = JSON.parse(b.dataset.p);
        let list = getPath(work, path);
        if (!Array.isArray(list)) { list = []; setPath(work, path, list); }
        const i = Number(b.dataset.i);
        if (b.dataset.ed === 'add') {
            const parent = specAt(spec, path.slice(0, -1)) ?? spec;
            list.push(blankFor(parent.find(x => x.k === path.at(-1))?.fields ?? []));
        }
        if (b.dataset.ed === 'del') list.splice(i, 1);
        if (b.dataset.ed === 'up' && i > 0) [list[i - 1], list[i]] = [list[i], list[i - 1]];
        rerender();
        if (b.dataset.ed === 'add') { const rows = root.querySelectorAll('fieldset .ss-erow'); rows[rows.length - 1]?.setAttribute('open', ''); }
    });
}

// ───── 테마 ─────
export const THEME_KEYS = [
    ['bg', '바탕'], ['surface', '카드'], ['surface2', '칸·트랙'], ['ink', '글씨'], ['dim', '흐린 글씨'], ['line', '선'],
    ['acc', '주 버튼'], ['accInk', '주 버튼 글씨'], ['hi', '강조'], ['pos', '좋음(+)'], ['neg', '나쁨(−)'],
];
export const THEMES = {
    white: { name: '화이트', bg: '#ffffff', surface: '#f6f6f4', surface2: '#ebebe7', ink: '#151515', dim: '#6f6f6a', line: '#e3e3de', acc: '#151515', accInk: '#ffffff', hi: '#2f62e9', pos: '#17855a', neg: '#d1433a' },
    cream: { name: '크림', bg: '#fffdf8', surface: '#f7f1e6', surface2: '#ece4d4', ink: '#2a2218', dim: '#7c6f5c', line: '#e6dccb', acc: '#2a2218', accInk: '#fffdf8', hi: '#b4612a', pos: '#3c7d4e', neg: '#b8412f' },
    rose: { name: '로즈', bg: '#fffafb', surface: '#fbf0f2', surface2: '#f2dfe4', ink: '#2b1a20', dim: '#86707a', line: '#efdde2', acc: '#2b1a20', accInk: '#ffffff', hi: '#d4486f', pos: '#2f8a63', neg: '#cc3d45' },
    mint: { name: '민트', bg: '#fbfefd', surface: '#eef6f2', surface2: '#dcebe4', ink: '#13241d', dim: '#64776f', line: '#dbe9e2', acc: '#13241d', accInk: '#ffffff', hi: '#16956a', pos: '#16956a', neg: '#cf4a3c' },
    ink: { name: '다크', bg: '#16171a', surface: '#1f2125', surface2: '#2a2d32', ink: '#ececea', dim: '#9a9b9f', line: '#2f3237', acc: '#f1f1ef', accInk: '#141414', hi: '#86aeff', pos: '#5cc596', neg: '#ff7a6e' },
    st: { name: '실리 테마 따라가기', bg: 'var(--SmartThemeBlurTintColor, #fff)', surface: 'color-mix(in srgb, var(--SmartThemeBodyColor, #111) 6%, transparent)', surface2: 'color-mix(in srgb, var(--SmartThemeBodyColor, #111) 12%, transparent)', ink: 'var(--SmartThemeBodyColor, #151515)', dim: 'color-mix(in srgb, var(--SmartThemeBodyColor, #151515) 60%, transparent)', line: 'var(--SmartThemeBorderColor, #e3e3de)', acc: 'var(--SmartThemeBodyColor, #151515)', accInk: 'var(--SmartThemeBlurTintColor, #fff)', hi: 'var(--SmartThemeQuoteColor, #2f62e9)', pos: '#17855a', neg: '#d1433a' },
};
export function themeVars() {
    const s = settings();
    const base = THEMES[s.theme] ?? THEMES.white;
    const t = { ...base, ...(s.themeCustom ?? {}) };
    return t;
}
export function applyTheme() {
    const s = settings();
    const t = themeVars();
    let st = document.getElementById('ss-theme-vars');
    if (!st) { st = document.createElement('style'); st.id = 'ss-theme-vars'; document.head.appendChild(st); }
    const dark = s.theme === 'ink' || (s.themeCustom?.bg && isDark(s.themeCustom.bg));
    st.textContent = `:root .ss-scope{${THEME_KEYS.map(([k]) => `--ss-${k}:${t[k]};`).join('')}--ss-r:${clamp(Number(s.radius) || 12, 0, 24)}px;--ss-fs:${clamp(Number(s.fontScale) || 1, 0.8, 1.4)};--ss-shadow:${dark ? '0 1px 2px rgba(0,0,0,.4),0 10px 30px rgba(0,0,0,.45)' : '0 1px 2px rgba(20,20,20,.05),0 8px 28px rgba(20,20,20,.10)'};color-scheme:${dark ? 'dark' : 'light'}}`;
}
function isDark(hex) {
    const m = String(hex).match(/^#?([0-9a-f]{6})$/i); if (!m) return false;
    const n = parseInt(m[1], 16); const r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    return (r * 299 + g * 587 + b * 114) / 1000 < 110;
}
