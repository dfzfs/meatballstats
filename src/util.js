// 미트볼 상태창 — 순수 도구: 숫자 · 글자 · 달력 계산 (core.js에서 떼어 냄)
// 여기 있는 건 설정 · 채팅 · 화면을 전혀 건드리지 않는다 (아무것도 import하지 않음) → 어디서든 불러도 순환이 안 생김

export const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
export const clone = (o) => (o === undefined ? undefined : structuredClone(o));
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const num = (v, d = 0) => { const n = Number(v); return Number.isFinite(n) ? n : d; };
export const str = (v, d = '') => (v === null || v === undefined ? d : String(v));
export const arr = (v) => (Array.isArray(v) ? v : []);
export const norm = (x) => String(x ?? '').replace(/\s+/g, '').toLowerCase();
// 포맷터를 한 번만 만든다 (toLocaleString은 부를 때마다 새로 만들어서 긴 채팅에서 느렸음)
export const NUM_FMT = new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 2 });
export const fmtNum = (n) => NUM_FMT.format(Number(n));
export const signed = (n) => (n > 0 ? `+${fmtNum(n)}` : n < 0 ? `−${fmtNum(Math.abs(n))}` : '±0');
export const uid = () => Math.random().toString(36).slice(2, 9);
export const short = (t, n) => { t = String(t ?? '').replace(/\s+/g, ' ').trim(); return t.length > n ? t.slice(0, n - 1) + '…' : t; };
export const splitBar = (val) => String(val ?? '').split('|').map(x => x.trim());
export function rand(n) { // 1..n
    const buf = new Uint32Array(1);
    crypto.getRandomValues(buf);
    return (buf[0] % n) + 1;
}
export const randInt = (a, b) => (b <= a ? a : a + rand(b - a + 1) - 1);
export function parseNum(raw) {
    const t = String(raw ?? '').trim().replace(/[−–—]/g, '-').replace(/[,\s]/g, '');
    const m = t.match(/^([=+-]?)(\d+(?:\.\d+)?)(억|만|천|k|m)?/i);
    if (!m) return null;
    let v = parseFloat(m[2]);
    const u = (m[3] || '').toLowerCase();
    if (u === '억') v *= 1e8; else if (u === '만') v *= 1e4; else if (u === '천' || u === 'k') v *= 1e3; else if (u === 'm') v *= 1e6;
    return { mode: m[1] === '=' ? 'set' : m[1] ? 'add' : 'bare', v: m[1] === '-' ? -v : v };
}
export const DEFAULT_MONTHS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31].map((d, i) => ({ name: `${i + 1}월`, days: d }));
export const DEFAULT_WEEK = ['월', '화', '수', '목', '금', '토', '일'];
export const DEFAULT_TIMES = ['새벽', '아침', '낮', '저녁', '밤', '심야'];
export function yearDays(cal) { return cal.months.reduce((a, m) => a + m.days, 0); }
export function dayIndex(cal, y = cal.y, m = cal.m, d = cal.d) {
    let n = (y - 1) * yearDays(cal);
    for (let i = 0; i < m - 1; i++) n += cal.months[i].days;
    return n + d - 1;
}
export function addDays(cal, k) {
    let { y, m, d } = cal;
    k = Math.round(k);
    while (k > 0) {
        const md = cal.months[m - 1].days;
        if (d + k <= md) { d += k; k = 0; } else { k -= md - d + 1; d = 1; m++; if (m > cal.months.length) { m = 1; y++; } }
    }
    while (k < 0) {
        if (d + k >= 1) { d += k; k = 0; } else { k += d; m--; if (m < 1) { m = cal.months.length; y--; } d = cal.months[m - 1].days; }
    }
    Object.assign(cal, { y, m, d });
}
export function weekday(cal, y, m, d) { const w = cal.week.length || 7; return cal.week[((dayIndex(cal, y, m, d) % w) + w) % w] ?? ''; }
export function dateStr(cal, y = cal.y, m = cal.m, d = cal.d) {
    const mn = cal.months[m - 1]?.name ?? `${m}월`;
    const EN_M = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    const isNumMonth = /^\d+월$/.test(mn) || (cal.months.length === 12 && String(mn).trim().toLowerCase().startsWith(EN_M[m - 1] ?? '\u0000')); // 「Mar」「March」도 → 「3월」 한 번만
    return `${cal.era ? cal.era + ' ' : ''}${y}년 ${isNumMonth ? mn : `${mn}(${m}월)`} ${d}일 (${weekday(cal, y, m, d)})`;
}
export function dateShort(cal) { return `${cal.m}/${cal.d}(${weekday(cal, cal.y, cal.m, cal.d)})`; }
export function eventsOn(cal, y, m, d) { return cal.events.filter(e => e.m === m && e.d === d && (e.repeat === 'yearly' || e.y === null || e.y === y)); }
export function parseDate(cal, v) {
    const t = String(v ?? '');
    let mm = t.match(/(\d+)\s*년\s*(\d+)\s*월\s*(\d+)\s*일?/) || t.match(/^(\d+)[-./](\d+)[-./](\d+)/);
    if (mm) return { y: +mm[1], m: +mm[2], d: +mm[3] };
    mm = t.match(/(\d+)\s*월\s*(\d+)\s*일?/) || t.match(/^(\d+)\s*[/.-]\s*(\d+)/);
    if (mm) return { y: null, m: +mm[1], d: +mm[2] };
    const name = cal.months.findIndex(x => t.includes(x.name));
    const dn = t.match(/(\d+)\s*일/) || (name >= 0 ? t.replace(cal.months[name].name, ' ').match(/\b(\d{1,2})\b/) : null); // 「April 14」 같은 영어 날짜도
    if (name >= 0 && dn) return { y: null, m: name + 1, d: +dn[1] };
    return null;
}
export function nextTime(c) { const i = c.times.indexOf(c.time); return c.times[(i + 1) % c.times.length] ?? c.times[0]; }
export function upcoming(c, days = 30) {
    const out = [];
    const t = { ...c };
    for (let k = 0; k <= days; k++) { if (k) addDays(t, 1); for (const e of eventsOn(c, t.y, t.m, t.d)) out.push([k, e]); }
    return out.slice(0, 8);
}
export function stamp(s) { return s?.data?.calendar ? dateStr(s.data.calendar) : ''; }
