// 미니 위젯 · 타일 판 (HUD · 사이드 미니창 공통) — views.js에서 떼어 냄
import { app, settings, saveSettings, getMeta, modOn, DIFFS, diffOf, esc, short, clamp, norm, fmtNum, dateShort, mascotUrl, eventsOn, TITLE, relAxes, DEFAULT_STAGES, viewTr } from './core.js';
import { unreadCount, inTransit, stageIndex, isFresh } from './engine.js';
import { trString } from './translate.js';
import { gauge, chip, avatar, emojiOf } from './kit.js';
import { songLink } from './notify.js';
import { confirmPopup } from './kit.js';

// 🔴 방금 AI 답에서 바뀐 곳 (v2.7.3) — 작은 빨간 점 하나
export const FRESH_DOT = '<i class="ss-fresh" title="방금 AI 답에서 바뀌었어요"></i>';
export const freshDot = (mod, k, name) => (isFresh(app.current?.fresh, mod, k, name) ? FRESH_DOT : '');
// ───── 미니 위젯 (대시보드 · 사이드 미니 · HUD 공용) ─────
export const MINI = {
    bars: { name: '게이지', on: (d) => d.stats?.bars.length, html: (s) => `<div class="ss-mini-bars">${s.data.stats.bars.slice(0, 4).map(b => gauge(b, true, freshDot('stats', 'bars', b.name))).join('')}</div>`, tab: 'stats' },
    date: { name: '날짜 · 시간', on: (d) => d.calendar, html: (s) => { const c = s.data.calendar; const ev = eventsOn(c, c.y, c.m, c.d); return `<div class="ss-mini-line"><i class="fa-solid fa-calendar-day"></i><span>${esc(dateShort(c))} · <b>${esc(c.time)}</b>${c.weather ? ` · ${esc(c.weather)}` : ''}${ev.length ? ` · <em>${esc(ev[0].title)}</em>` : ''}</span></div>`; }, tab: 'calendar' },
    loc: { name: '위치', on: (d) => d.map?.here, html: (s) => `<div class="ss-mini-line"><i class="fa-solid fa-location-dot"></i><span>${esc(s.data.map.here)}</span></div>`, tab: 'map' },
    cash: { name: '돈', on: (d) => d.wallet, html: (s) => `<div class="ss-mini-line"><i class="fa-solid fa-coins"></i><span><b>${fmtNum(s.data.wallet.cash)}</b> ${esc(s.data.wallet.currency)}</span></div>`, tab: 'wallet' },
    contact: { name: '연락', on: (d) => d.contact, html: (s) => { const n = unreadCount(s); const tr = inTransit(s).length; return `<div class="ss-mini-line ${n ? 'alert' : ''}"><i class="fa-solid ${s.data.contact.mode === 'letter' ? 'fa-envelope' : 'fa-comment'}"></i><span>${n ? `<b>새 ${s.data.contact.mode === 'letter' ? '편지' : '메시지'} ${n}</b>` : `${esc(s.data.contact.app)}`}${tr ? ` · 배달 중 ${tr}` : ''}</span></div>`; }, tab: 'contact' },
    quest: { name: '퀘스트', on: (d) => d.quest?.list.some(q => q.status === 'active'), html: (s) => `<div class="ss-mini-quests">${s.data.quest.list.filter(q => q.status === 'active').slice(0, 3).map(q => `<div class="ss-mini-line"><i class="fa-solid fa-scroll"></i><span>${esc(short(q.title, 26))}</span></div>`).join('')}</div>`, tab: 'quest' },
    rel: { name: '관계', on: (d) => d.rel?.user.length, html: (s) => miniRelHTML(s), tab: 'rel' },
    // 💭 속마음 (v2.7.21): 얼굴(첫 글자) + 말풍선 — 이름 대신 · 최근 3턴 것만 · 있을 때만 칸이 보임 (보는 방식 · 빈도는 꾸미기 › 미니창)
    mind: { name: '속마음', on: (d) => (settings().mindMode ?? 'off') !== 'off' && !!app.current && mindList(app.current.state).length > 0, html: (s) => `<div class="ss-mind-row">${mindList(s).map(mindBub).join('')}</div>`, tab: 'rel' },
    cond: { name: '상태 이상', on: (d) => d.stats?.conds.length, html: (s) => `<div class="ss-chips">${s.data.stats.conds.slice(0, 5).map(c => chip(esc(c.name), 'warn')).join('')}</div>`, tab: 'stats' },
    news: { name: '최신 뉴스', on: (d) => d.news?.items.length, html: (s) => `<div class="ss-mini-line"><i class="fa-solid fa-newspaper"></i><span>${esc(short(s.data.news.items.at(-1).title, 34))}</span></div>`, tab: 'news' },
    fate: { name: '저주 · 빚', on: (d) => d.fate?.curses.length || d.wallet?.loans.some(l => l.status === 'open' || l.status === 'late'), html: (s) => { const cs = s.data.fate?.curses ?? []; const debt = (s.data.wallet?.loans ?? []).filter(l => l.status === 'open' || l.status === 'late'); return `<div class="ss-mini-line ${debt.some(l => l.status === 'late') ? 'alert' : ''}"><i class="fa-solid fa-hat-wizard"></i><span>${cs.map(c => esc(c.name)).join(', ')}${cs.length && debt.length ? ' · ' : ''}${debt.length ? `빚 ${fmtNum(debt.reduce((a, l) => a + l.owed, 0))}${debt.some(l => l.status === 'late') ? ' (연체)' : ''}` : ''}</span></div>`; }, tab: 'fate' },
    diff: { name: '난이도', on: () => true, html: () => { const d = DIFFS[diffOf()]; return `<div class="ss-mini-line"><i class="fa-solid ${d.icon}"></i><span>${d.name}</span></div>`; }, tab: 'manage' },
    music: { name: '지금 BGM', on: (d) => d.music?.now, html: (s) => { const x = s.data.music.now; return `<div class="ss-mini-line"><i class="fa-solid fa-music"></i><span><b>${esc(short(x.title, 22))}</b>${x.artist ? ` · ${esc(short(x.artist, 14))}` : ''}</span><a class="ss-mini-play" href="${esc(songLink(x))}" target="_blank" rel="noopener" title="듣기"><i class="fa-solid fa-play"></i></a></div>`; }, tab: 'music' },
    custom: { name: '내 탭', on: (d) => d.custom?.tabs.some(t => t.fields.length), html: (s) => { const t = s.data.custom.tabs.find(x => x.fields.length); return `<div class="ss-mini-line"><span>${esc(t.icon)}</span><span>${t.fields.slice(0, 3).map(f => `${esc(f.k)} <b>${esc(f.type === 'text' ? short(f.v, 10) : fmtNum(f.v))}</b>`).join(' · ')}</span></div>`; }, tab: 'custom' },
};
// 타일 공통: 큰 수는 만 · 억으로 · 방금 바뀐 칸 표시 기준
const man = (v) => { const a = Math.abs(v); return a >= 1e8 ? `${+(v / 1e8).toFixed(1)}억` : a >= 1e4 ? `${+(v / 1e4).toFixed(1)}만` : fmtNum(v); };
const FR_OF = { bars: ['stats', 'bars'], cond: ['stats', 'conds'], date: ['calendar'], loc: ['map', 'here'], cash: ['wallet', 'cash'], quest: ['quest'], rel: ['rel', 'user'], news: ['news'], fate: ['fate'], music: ['music'], custom: ['custom'], contact: ['contact'] };
// ───── 타일 판 (v2.7.21) — HUD · 사이드 미니창 공통 · 아이폰 홈 화면처럼 ─────
// 칸 = 격자 한 칸(작게) 또는 두 배(크게) · 글은 자르지 않고 칸에 맞게 글자 크기를 줄임(fitTiles)
// 꾸미기: 스티커(미트볼 기본 그림 · 내가 올린 그림)를 판 안 아무 데나 · 판과 칸마다 배경 · 테두리 · 글자 색
// 테마 확장이 꾸미는 부품(button · .ss-ava · .ss-gauge)을 안 써서 어느 테마에서도 같은 크기
// 저장: sideMini(순서) · tileSize{칸:'L'} · tileStyle{칸:{bg,bd,ink}} · boardStyle{bg,bd} · tileDeco{hud:[스티커], side:[스티커]}
const face = (name) => `<span class="ss-tf" title="${esc(name)}">${esc(emojiOf(name) || String(name).slice(0, 1))}</span>`;
const fi = (c) => `<i class="fa-solid ${c}"></i>`;
export const TILES = {
    date: { name: '날짜 · 시간', w: 2, on: (d) => d.calendar, f: (s, L) => { const c = s.data.calendar; return { h: `<b class="hi">${esc(c.time)}</b><small>${esc(L ? dateShort(c) : `${c.m}/${c.d}`)}</small>${L && c.weather ? `<small>${esc(c.weather)}</small>` : ''}`, t: `${dateShort(c)} ${c.time}${c.weather ? ` · ${c.weather}` : ''}` }; } },
    loc: { name: '위치', on: (d) => d.map?.here, f: (s) => ({ h: `${fi('fa-location-dot')}<span>${esc(s.data.map.here)}</span>`, t: s.data.map.here }) },
    bars: { name: '게이지', w: 4, on: (d) => d.stats?.bars.length, f: (s, L) => ({ h: s.data.stats.bars.slice(0, 4).map(b => { const p = b.max > 0 ? Math.max(0, Math.min(100, b.cur / b.max * 100)) : 0; return `<span class="g"><em>${esc(barLabel(b.name, L))}</em><b>${fmtNum(b.cur)}</b><i><u style="width:${p}%;background:${esc(b.color || 'var(--ss-acc)')}"></u></i></span>`; }).join(''), t: s.data.stats.bars.map(b => `${b.name} ${b.cur}/${b.max}`).join(' · ') }) },
    cash: { name: '돈', on: (d) => d.wallet, f: (s, L) => ({ h: `${fi('fa-coins')}<span>${L ? `${fmtNum(s.data.wallet.cash)} ${esc(s.data.wallet.currency)}` : man(s.data.wallet.cash)}</span>`, t: `${fmtNum(s.data.wallet.cash)} ${s.data.wallet.currency}` }) },
    contact: { name: '연락', on: (d) => d.contact, f: (s) => { const n = unreadCount(s), tr = inTransit(s).length; return { h: `${fi(s.data.contact.mode === 'letter' ? 'fa-envelope' : 'fa-comment')}${n ? `<b class="al">${n}</b>` : ''}${tr ? `<small>${tr}</small>` : ''}`, t: `${s.data.contact.app}${n ? ` · 새 ${n}` : ''}${tr ? ` · 배달 중 ${tr}` : ''}` }; } },
    quest: { name: '퀘스트', on: (d) => d.quest?.list.some(q => q.status === 'active'), f: (s, L) => { const a = s.data.quest.list.filter(q => q.status === 'active'); return { h: `${fi('fa-scroll')}<span>${L ? esc(a[0].title) : a.length}</span>`, t: a.map(q => q.title).join(' · ') }; } },
    rel: { name: '관계', w: 2, on: (d) => d.rel?.user.length, f: (s, L) => { const o = miniRelOpt(), rl = s.data.rel, key = { aff: (r) => r.aff, trust: (r) => r.trust, sum: (r) => r.aff + r.trust }[o.sort]; const p = o.pick.map(n => rl.user.find(r => r.name === n)).filter(Boolean); const list = (p.length ? p : [...rl.user].filter(r => !r.out).sort((a, b) => key(b) - key(a))).slice(0, o.n);
        return { h: list.map(r => `<span class="p">${face(r.name)}${L ? `<small>${esc(r.name)}</small>` : ''}${r.noLove ? '' : `<b class="lv">${r.aff}</b>`}${L || r.noLove ? `<b class="tr">${r.trust}</b>` : ''}</span>`).join(''), t: list.map(r => `${r.name} ♥${r.aff} 🤝${r.trust}`).join(' · ') }; } },
    mind: { name: '속마음', w: 2, on: (d) => (settings().mindMode ?? 'off') !== 'off' && !!app.current && mindList(app.current.state).length > 0, f: (s, L) => ({ h: mindList(s, L ? 4 : 2).map(x => `<span class="p">${face(x.name)}<span class="m">${esc(x.mind.text)}</span></span>`).join(''), t: mindList(s, 4).map(x => `${x.name}: ${x.mind.text}`).join(' · ') }) },
    cond: { name: '상태 이상', on: (d) => d.stats?.conds.length, f: (s, L) => ({ h: `${fi('fa-triangle-exclamation')}<span>${L ? esc(s.data.stats.conds.map(c => c.name).join(', ')) : s.data.stats.conds.length}</span>`, t: s.data.stats.conds.map(c => c.name).join(', '), alert: true }) },
    news: { name: '최신 뉴스', on: (d) => d.news?.items.length, f: (s, L) => ({ h: `${fi('fa-newspaper')}${L ? `<span>${esc(short(s.data.news.items.at(-1).title, 40))}</span>` : ''}`, t: s.data.news.items.at(-1).title }) },
    fate: { name: '저주 · 빚', on: (d) => d.fate?.curses.length || d.wallet?.loans.some(l => l.status === 'open' || l.status === 'late'), f: (s) => ({ h: `${fi('fa-hat-wizard')}<span>${(s.data.fate?.curses ?? []).length + (s.data.wallet?.loans ?? []).filter(l => l.status === 'open' || l.status === 'late').length}</span>`, t: '저주 · 빚', alert: (s.data.wallet?.loans ?? []).some(l => l.status === 'late') }) },
    diff: { name: '난이도', on: () => true, f: (s, L) => { const d = DIFFS[diffOf()]; return { h: `${fi(d.icon)}<span>${esc(d.name)}</span>`, t: `난이도 ${d.name}` }; } },
    music: { name: '지금 BGM', on: (d) => d.music?.now, f: (s) => ({ h: `${fi('fa-music')}<span>${esc(s.data.music.now.title)}</span>`, t: s.data.music.now.title }) },
    custom: { name: '내 탭', on: (d) => d.custom?.tabs.some(t => t.fields.length), f: (s, L) => { const t = s.data.custom.tabs.find(x => x.fields.length), f = t.fields[0]; return { h: `<span>${esc(t.icon)}</span><span>${L ? `${esc(f.k)} ` : ''}${esc(String(f.type === 'text' ? f.v : fmtNum(f.v)))}</span>`, t: t.fields.map(x => `${x.k} ${x.v}`).join(' · ') }; } },
};
function barLabel(name, long) {
    const n = viewTr() ? trString(name) : String(name ?? '');
    return n; // 줄이지 않고 다 보여 줌 — 칸이 좁으면 글자가 칸에 맞게 작아지고(fitTiles), 칸을 넓히면 다시 커짐
}
const TMOD = { bars: 'stats', date: 'calendar', loc: 'map', cash: 'wallet', contact: 'contact', quest: 'quest', rel: 'rel', mind: 'rel', cond: 'stats', news: 'news', fate: 'fate', music: 'music', custom: 'custom' };
// 판 배경 기본 무늬 (v2.7.21 · 직접 그린 SVG · 그림 파일 없음) — 고르지 않으면 「모눈 데이지」
const svg = (w, h, body) => `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}' viewBox='0 0 ${w} ${h}'>${body}</svg>`)}")`;
const daisy = (x, y, r = 5) => `<g transform='translate(${x} ${y})'>${[0, 60, 120, 180, 240, 300].map(a => `<ellipse cx='0' cy='${-r}' rx='${r * 0.55}' ry='${r * 0.9}' fill='#fff' stroke='#f1e6b8' stroke-width='.4' transform='rotate(${a})'/>`).join('')}<circle r='${r * 0.55}' fill='#f6cf3c'/></g>`;
const heart = (x, y, c, s = 1) => `<path transform='translate(${x} ${y}) scale(${s})' d='M0 3 C-4 -1 -7 3 0 8 C7 3 4 -1 0 3Z' fill='none' stroke='${c}' stroke-width='1.1' stroke-linejoin='round'/>`;
export const BOARD_BG = {
    daisy: { name: '모눈 데이지', bg: '#fff9de', bd: '#ecd77a', img: `${svg(120, 120, daisy(22, 26) + daisy(82, 86, 4.5))}, linear-gradient(#f2dc7a 1px, transparent 1px), linear-gradient(90deg, #f2dc7a 1px, transparent 1px)`, size: '120px 120px, 15px 15px, 15px 15px' },
    sky: { name: '하늘 체크 하트', bg: '#eaf5fc', bd: '#bcdcf0', img: `${svg(96, 96, heart(24, 20, '#f2a9b9') + heart(72, 68, '#8fc3e3', 0.9))}, conic-gradient(#dcedf9 25%, transparent 0 50%, #dcedf9 0 75%, transparent 0), linear-gradient(rgba(255,255,255,.7) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.7) 1px, transparent 1px)`, size: '96px 96px, 48px 48px, 8px 8px, 8px 8px' },
    peach: { name: '복숭아 땡땡이', bg: '#fff1ee', bd: '#f3c9c1', img: `radial-gradient(#f8c6bd 2.2px, transparent 2.6px), radial-gradient(#fbd9d2 2.2px, transparent 2.6px)`, size: '22px 22px, 22px 22px', pos: '0 0, 11px 11px' },
    mint: { name: '민트 줄무늬', bg: '#effaf4', bd: '#bfe3cf', img: `repeating-linear-gradient(135deg, rgba(178,224,200,.45) 0 6px, transparent 6px 14px)`, size: 'auto' },
    none: { name: '무늬 없음 (테마 색)' },
};
export const STICKERS = ['idle', 'happy', 'think', 'surprise', 'sad', 'sleep', 'party'];
export const STICKER_EMOJI = ['🌸', '⭐', '✨', '💖', '🍀', '🌙', '☁️', '🔥', '🍖', '☕', '🎀', '🐾', '🌊', '⚓', '🍓', '💤'];
const stkSrc = (x) => (x.m ? mascotUrl(x.m) : x.src || '');
const colorVal = (v, def) => (/^#[0-9a-f]{6}$/i.test(v ?? '') ? v : def);
const cssCol = (st) => [st?.bg ? `--t-bg:${st.bg};--t-bg2:${st.bg}` : '', st?.bd ? `--t-bd:${st.bd}` : '', st?.ink ? `--t-ink:${st.ink}` : ''].filter(Boolean).join(';');
// 격자 (v2.7.21): 칸마다 자리(c 열 · r 줄)와 크기(w × h 칸)를 저장 — 다른 줄에 놓으면 그 줄로 · 빈칸(간격)도 그대로 · 큰 칸 옆은 여러 줄
// HUD 24열 · 미니창(그리고 좁은 화면의 HUD) 8열 · 한 줄 높이 24px · 판마다 따로 저장 (tileLayout.hud / .side)
export const gridOf = (attr) => (attr === 'hud' && !(typeof window !== 'undefined' && window.innerWidth <= 700) ? { key: 'hud12', cols: 12 } : { key: attr === 'hud' ? 'hudm4' : 'side4', cols: 4 });
// 기본 배치 (아무것도 안 옮겼을 때): 판마다 보기 좋은 차례 · 너비로 빈틈없이 채움
const DEF = {
    12: { order: ['date', 'bars', 'rel', 'cash', 'diff', 'loc', 'mind', 'contact', 'quest', 'cond', 'news', 'fate', 'music', 'custom'], w: { date: 2, bars: 4, rel: 3, cash: 2, diff: 1, loc: 2, mind: 4, contact: 1, quest: 2, cond: 2, news: 3, fate: 1, music: 3, custom: 2 } },
    4: { order: ['date', 'loc', 'bars', 'rel', 'cash', 'diff', 'contact', 'quest', 'mind', 'cond', 'news', 'fate', 'music', 'custom'], w: { date: 2, loc: 2, bars: 4, rel: 4, cash: 1, diff: 1, contact: 1, quest: 1, mind: 4, cond: 2, news: 4, fate: 1, music: 4, custom: 2 } },
};
const defW = (k, cols) => Math.min(cols, DEF[cols]?.w[k] ?? TILES[k]?.w ?? 1);
const hit = (a, b) => a.c < b.c + b.w && b.c < a.c + a.w && a.r < b.r + b.h && b.r < a.r + a.h;
// 저장된 자리 + 아직 자리가 없는 칸은 빈 곳에 차례로 · 겹치면 아래로 밀기 (고정 = 방금 옮긴 칸)
export function layoutOf(attr, keys, fixed = null) {
    const g = gridOf(attr), saved = settings().tileLayout?.[g.key] ?? {}, out = {}, placed = [];
    const norm1 = (k, x) => { const w = clamp(Math.round(+x?.w || defW(k, g.cols)), 1, g.cols), h = clamp(Math.round(+x?.h || 1), 1, 4); return { c: clamp(Math.round(+x?.c || 0), 0, g.cols - w), r: Math.max(0, Math.round(+x?.r || 0)), w, h }; };
    const di = (k) => { const o = DEF[g.cols]?.order ?? []; const i = o.indexOf(k); return i < 0 ? 99 + keys.indexOf(k) : i; };
    const order = [...keys].sort((a, b) => (a === fixed ? -1 : b === fixed ? 1 : 0) || ((saved[a] ? 0 : 1) - (saved[b] ? 0 : 1)) || ((saved[a]?.r ?? 0) - (saved[b]?.r ?? 0)) || ((saved[a]?.c ?? 0) - (saved[b]?.c ?? 0)) || di(a) - di(b));
    for (const k of order) {
        let p;
        if (saved[k]) { p = norm1(k, saved[k]); while (placed.some(q => hit(p, q))) p.r++; }
        else { const w = defW(k, g.cols); p = null; for (let r = 0; !p && r < 200; r++) for (let c = 0; c + w <= g.cols; c++) { const t = { c, r, w, h: 1 }; if (!placed.some(q => hit(t, q))) { p = t; break; } } }
        out[k] = p; placed.push(p);
    }
    return out;
}
const saveLayout = (attr, lay) => { const set = settings(), g = gridOf(attr); set.tileLayout = { ...(set.tileLayout ?? {}), [g.key]: lay }; saveSettings(); };
export function tileBoard(s, attr, extra = '', lead = '') {
    const set = settings(), meta = getMeta(), d = s.data, fr = app.current?.fresh, edit = !!app.tileEdit, open = attr === 'hud' ? app.hudExp : app.sideExp;
    const g = gridOf(attr);
    const keys = (set.sideMini ?? []).filter(k => TILES[k]);
    const live = keys.filter(k => (!TMOD[k] || modOn(TMOD[k], meta)) && TILES[k].on(d));
    const lay = layoutOf(attr, live);
    const A = (v) => `data-${attr}="${v}"`, sel = edit ? app.tileSel : null;
    const rows = Math.max(1, ...live.map(k => lay[k].r + lay[k].h));
    const tiles = live.map(k => {
        const p = lay[k], L = p.w * p.h > defW(k, g.cols);
        let x; try { x = TILES[k].f(s, L); } catch { return ''; }
        const f = FR_OF[k] && isFresh(fr, ...FR_OF[k]);
        return `<span class="ss-t t-${k}${L ? ' L' : ''}${p.h > 1 ? ' tall' : ''}${x.alert ? ' alert' : ''}${open === k ? ' on' : ''}${edit ? ' edit' : ''}${sel === k ? ' sel' : ''}" role="button" tabindex="0" data-k="${k}" ${edit ? '' : A(`exp:${k}`)} title="${esc(x.t ?? TILES[k].name)}" style="grid-column:${p.c + 1} / span ${p.w};grid-row:${p.r + 1} / span ${p.h};${cssCol(set.tileStyle?.[k])}"><span class="c"><span class="ci">${x.h}</span></span>${f && !edit ? '<i class="ss-t-dot"></i>' : ''}${edit ? `<i class="ss-t-x" ${A(`del:${k}`)} title="빼기">−</i><i class="ss-t-rs" title="끌어서 크기">⤡</i>` : ''}</span>`;
    }).join('');
    // 편집 중엔 빈 칸을 옅게 보여 줌 (어디에 놓을 수 있는지)
    let ghost = '';
    if (edit) { const occ = new Set(); for (const k of live) { const p = lay[k]; for (let r = p.r; r < p.r + p.h; r++) for (let c = p.c; c < p.c + p.w; c++) occ.add(`${r}:${c}`); } for (let r = 0; r < rows; r++) for (let c = 0; c < g.cols; c++) if (!occ.has(`${r}:${c}`)) ghost += `<span class="ss-cell" style="grid-column:${c + 1};grid-row:${r + 1}"></span>`; }
    const deco = (set.tileDeco?.[attr] ?? []).filter(x => x.e || stkSrc(x));
    const stk = deco.map(x => { const st = `left:${clamp(+x.x || 0, 0, 100)}%;top:${clamp(+x.y || 0, 0, 100)}%;transform:translate(-50%,-50%) rotate(${+x.r || 0}deg)`; const cls = `ss-stk${edit ? ' edit' : ''}${app.stkSel === x.id ? ' sel' : ''}`;
        return x.e ? `<span class="${cls} emo" data-stk="${esc(x.id)}" style="${st};font-size:${clamp(+x.w || 24, 10, 120)}px">${esc(x.e)}</span>` : `<img class="${cls}" data-stk="${esc(x.id)}" src="${esc(stkSrc(x))}" alt="" draggable="false" style="${st};width:${clamp(+x.w || 32, 12, 160)}px">`; }).join('');
    let tools = '';
    if (edit) {
        const hidden = Object.keys(TILES).filter(k => !keys.includes(k));
        const bs = set.boardStyle ?? {}, ts = sel ? set.tileStyle?.[sel] ?? {} : null;
        const col = (key, val, def, label) => `<label class="ss-tcol"><input type="color" data-col="${key}" value="${colorVal(val, def)}"><span>${label}</span></label>`;
        tools = `<div class="ss-t-tools">
            <span class="ss-t${app.tileAdd ? ' on' : ''}" role="button" ${A('addmenu')} title="칸 더하기"><i class="fa-solid fa-plus"></i></span><span class="ss-t${app.stkMenu ? ' on' : ''}" role="button" ${A('stkmenu')} title="스티커"><i class="fa-regular fa-face-smile"></i></span><span class="ss-t${app.colMenu ? ' on' : ''}" role="button" ${A('colmenu')} title="색 · 배경"><i class="fa-solid fa-palette"></i></span><span class="ss-t" role="button" ${A('relayout')} title="처음 배치로"><i class="fa-solid fa-table-cells-large"></i></span><span class="ss-t-tip" title="칸을 끌어 아무 줄 · 자리에 · 모서리 ⤡를 끌어 크기 · − 빼기 · 칸을 누르면 그 칸 색"><i class="fa-regular fa-circle-question"></i></span><span class="ss-t done" role="button" ${A('edit')}>완료</span>
            ${app.tileAdd ? `<div class="ss-t-menu">${hidden.length ? hidden.map(k => `<span class="ss-t" role="button" ${A(`addk:${k}`)}>${esc(TILES[k].name)}</span>`).join('') : '<small>더할 칸이 없어요</small>'}</div>` : ''}
            ${app.stkMenu ? `<div class="ss-t-menu stk">${STICKERS.map(m => `<img role="button" ${A(`stkadd:${m}`)} src="${mascotUrl(m)}" alt="${m}">`).join('')}${STICKER_EMOJI.map(e => `<span class="em" role="button" ${A(`stkemo:${e}`)}>${e}</span>`).join('')}<span class="ss-t" role="button" ${A('stkemo:?')} title="다른 이모지 직접 넣기">✎ 이모지</span><label class="ss-t up" title="내 그림 올리기 (작게 줄여서 저장)"><input type="file" accept="image/*" data-stkup="${attr}" hidden>그림 올리기</label>
                ${app.stkSel ? `<span class="ss-t" role="button" ${A('stk:-')}>작게</span><span class="ss-t" role="button" ${A('stk:+')}>크게</span><span class="ss-t" role="button" ${A('stk:r')}>돌리기</span><span class="ss-t" role="button" ${A('stk:dup')}>복사</span><span class="ss-t" role="button" ${A('stk:del')}>지우기</span>` : '<small>끌어서 옮기고, 눌러서 고르면 크기 · 돌리기 · 지우기</small>'}</div>` : ''}
            ${app.colMenu ? `<div class="ss-t-menu col">${Object.entries(BOARD_BG).map(([k, x]) => `<span class="ss-bgp${(set.boardPreset ?? 'daisy') === k ? ' on' : ''}" role="button" ${A(`bgp:${k}`)} title="${esc(x.name)}" style="background-color:${x.bg ?? 'var(--ss-bg)'};${x.img ? `background-image:${x.img.replace(/"/g, '&quot;')};background-size:${x.size}` : ''}"></span>`).join('')}${col('board:bg', bs.bg, '#f6f1e7', '판 배경')}${col('board:bd', bs.bd, '#e3d9c6', '판 테두리')}<label class="ss-t up" title="판 배경 그림 (작게 줄여서 저장)"><input type="file" accept="image/*" data-bgup="${attr}" hidden>${set.tileDeco?.[`${attr}Bg`] ? '배경 그림 바꾸기' : '배경 그림'}</label>${set.tileDeco?.[`${attr}Bg`] ? `<span class="ss-t" role="button" ${A('bgdel')}>배경 그림 빼기</span>` : ''}${sel ? `<b>${esc(TILES[sel]?.name ?? sel)}</b>${col(`tile:${sel}:bg`, ts.bg, '#efe7d8', '칸 배경')}${col(`tile:${sel}:bd`, ts.bd, '#e3d9c6', '칸 테두리')}${col(`tile:${sel}:ink`, ts.ink, '#2a2218', '글자')}<span class="ss-t" role="button" ${A(`colreset:${sel}`)}>이 칸 처음대로</span>` : '<small>칸을 누르면 그 칸의 색도 바꿔요</small>'}<span class="ss-t" role="button" ${A('colreset:board')}>판 처음대로</span></div>` : ''}
            </div>`;
    }
    const det = !edit && open && live.includes(open) && MINI[open] ? `<div class="ss-t-det">${MINI[open].html(s)}<span role="button" class="go" ${A(`go:${MINI[open].tab}`)}>자세히 ›</span></div>` : '';
    const bgImg = set.tileDeco?.[`${attr}Bg`];
    return `<div class="ss-tb ${attr}${edit ? ' editing' : ''}" data-tb="${attr}"><div class="ss-tb-row"><div class="ss-tg" style="--cols:${g.cols}">${ghost}${tiles}${stk}</div>${extra || lead ? `<div class="ss-tb-acts">${lead}${extra}</div>` : ''}</div>${tools}${det}</div>`;
}
// 칸에 맞게 줄이기 (자르지 않음) — 글자 크기 대신 내용 묶음(.ci)의 zoom: 테마가 글자 크기를 !important로 덮어도 맞춰짐
// 읽기를 한 번에 · 쓰기를 한 번에 (칸마다 측정 한 번)
export const ROW_H = 30;
export function fitTiles(root) {
    const cs = [...(root?.querySelectorAll?.('.ss-tb .ss-t > .c') ?? [])];
    const ins = cs.map(c => c.firstElementChild);
    for (const ci of ins) if (ci) { ci.style.zoom = ''; ci.style.width = ''; ci.classList.remove('wrap'); }
    const r = cs.map((c, i) => { const ci = ins[i]; if (!ci) return 1; const w = ci.scrollWidth, h = ci.scrollHeight; return Math.min(1, w ? (c.clientWidth - 2) / w : 1, h ? c.clientHeight / h : 1); });
    ins.forEach((ci, i) => { if (ci && r[i] < 0.995) ci.style.zoom = String(Math.max(0.4, Math.floor(r[i] * 100) / 100)); });
    // 너무 길어 0.6배로도 안 들어가면: 칸 안에서 두 줄로 감고 다시 맞춤 (자르지 않음)
    const long = cs.map((c, i) => (r[i] < 0.6 && ins[i] ? i : -1)).filter(i => i >= 0);
    if (!long.length) return;
    for (const i of long) { const ci = ins[i]; ci.style.zoom = ''; ci.classList.add('wrap'); ci.style.width = `${Math.round(cs[i].clientWidth / 0.62)}px`; }
    const r2 = long.map(i => { const c = cs[i], ci = ins[i]; return Math.min(1, (c.clientWidth - 2) / Math.max(1, ci.scrollWidth), c.clientHeight / Math.max(1, ci.scrollHeight)); });
    long.forEach((i, n) => { ins[i].style.zoom = String(Math.max(0.3, Math.floor(r2[n] * 100) / 100)); });
}
// 그림 올리기: 긴 변 max px로 줄여 webp — 설정 파일이 커지지 않게
async function shrinkImage(file, max = 128, q = 0.85) {
    const bmp = await createImageBitmap(file);
    const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const cv = document.createElement('canvas'); cv.width = Math.round(bmp.width * k); cv.height = Math.round(bmp.height * k);
    cv.getContext('2d').drawImage(bmp, 0, 0, cv.width, cv.height);
    const out = cv.toDataURL('image/webp', q);
    if (out.startsWith('data:image/webp')) return out;
    // 사파리(아이폰 · 아이패드)는 webp로 못 만들어 큰 PNG가 됨 → 투명한 그림만 PNG, 나머지는 JPEG로 (v2.7.21)
    let clear = false;
    try { const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data; for (let i = 3; i < d.length; i += 4 * 7) if (d[i] < 250) { clear = true; break; } } catch { /* */ }
    return clear ? out : cv.toDataURL('image/jpeg', q);
}
// 배경 그림 자르기 (v2.7.21): 판 모양 틀 안에서 끌어 옮기고 · 막대 · 휠 · 두 손가락으로 크기 → 잘라서 저장
// 틀 비율 = 지금 그 판(HUD · 사이드 미니창)의 비율 → 판에 그대로 맞음 · 결과는 긴 변 640px
function boardAspect(attr) {
    const host = attr === 'hud' ? document.getElementById('ss-hud') : document.querySelector('#ss-side .ss-side-mini');
    const r = host?.getBoundingClientRect();
    return r && r.width > 20 && r.height > 20 ? clamp(r.width / r.height, 0.3, 8) : (attr === 'hud' ? 5 : 0.8);
}
async function cropImage(file, aspect) {
    const bmp = await createImageBitmap(file);
    const el = document.createElement('div');
    el.className = 'ss-root ss-scope ss-crop';
    el.innerHTML = `<div class="ss-wz-head"><i class="fa-solid fa-crop-simple"></i><div><b>배경 그림 자르기</b><small>그림을 끌어 옮기고, 아래 막대(휠 · 두 손가락)로 크기를 정해요. 틀 안이 판 배경이 돼요.</small></div></div>
        <div class="ss-crop-box" style="aspect-ratio:${aspect}"><canvas></canvas></div>
        <div class="ss-crop-ctl"><i class="fa-solid fa-image" style="font-size:.8em"></i><input type="range" min="100" max="500" step="1" value="100" aria-label="크기"><i class="fa-solid fa-image"></i><button type="button" class="ss-btn sm" data-crop-reset>처음대로</button></div>`;
    const box = el.querySelector('.ss-crop-box'), cv = el.querySelector('canvas'), g = cv.getContext('2d'), range = el.querySelector('input[type=range]');
    const st = { z: 1, cx: bmp.width / 2, cy: bmp.height / 2 }; // 틀 가운데에 오는 그림의 점 · 확대
    let W = 0, H = 0;
    const base = () => Math.max(W / bmp.width, H / bmp.height); // z = 1 → 틀을 꽉 채우는 크기
    const fix = () => { const s = base() * st.z, hw = W / 2 / s, hh = H / 2 / s; st.cx = clamp(st.cx, hw, bmp.width - hw); st.cy = clamp(st.cy, hh, bmp.height - hh); };
    const draw = () => {
        const w = Math.round(box.clientWidth), h = Math.round(w / aspect); if (!w) return;
        const dpr = window.devicePixelRatio || 1;
        if (w !== W || h !== H) { W = w; H = h; cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); cv.style.width = `${w}px`; cv.style.height = `${h}px`; }
        fix();
        const s = base() * st.z;
        g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
        g.imageSmoothingQuality = 'high';
        g.drawImage(bmp, W / 2 - st.cx * s, H / 2 - st.cy * s, bmp.width * s, bmp.height * s);
    };
    const zoomTo = (z, px = W / 2, py = H / 2) => { // 손가락 · 마우스 아래 점은 그대로 두고 확대
        const s0 = base() * st.z; const ix = st.cx + (px - W / 2) / s0, iy = st.cy + (py - H / 2) / s0;
        st.z = clamp(z, 1, 5); const s1 = base() * st.z; st.cx = ix - (px - W / 2) / s1; st.cy = iy - (py - H / 2) / s1;
        range.value = String(Math.round(st.z * 100)); draw();
    };
    range.addEventListener('input', () => zoomTo(Number(range.value) / 100));
    el.querySelector('[data-crop-reset]').addEventListener('click', () => { st.z = 1; st.cx = bmp.width / 2; st.cy = bmp.height / 2; range.value = '100'; draw(); });
    const pts = new Map(); let pinch = null;
    const local = (e) => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    cv.addEventListener('pointerdown', (e) => { e.preventDefault(); cv.setPointerCapture?.(e.pointerId); pts.set(e.pointerId, local(e)); pinch = null; });
    cv.addEventListener('pointermove', (e) => {
        if (!pts.has(e.pointerId)) return;
        const p = local(e), old = pts.get(e.pointerId); pts.set(e.pointerId, p);
        if (pts.size >= 2) { // 두 손가락
            const [a, b] = [...pts.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]), mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
            if (pinch) { const s = base() * st.z; st.cx -= (mx - pinch.mx) / s; st.cy -= (my - pinch.my) / s; zoomTo(pinch.z * d / pinch.d, mx, my); } else pinch = { d: d || 1, z: st.z, mx, my };
            if (pinch) { pinch.mx = mx; pinch.my = my; }
            return;
        }
        const s = base() * st.z; st.cx -= (p[0] - old[0]) / s; st.cy -= (p[1] - old[1]) / s; draw();
    });
    const up = (e) => { pts.delete(e.pointerId); if (pts.size < 2) pinch = null; };
    cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
    cv.addEventListener('wheel', (e) => { e.preventDefault(); const [x, y] = local(e); zoomTo(st.z * (e.deltaY < 0 ? 1.1 : 1 / 1.1), x, y); }, { passive: false });
    let ro = null;
    setTimeout(() => { draw(); if (typeof ResizeObserver !== 'undefined') { ro = new ResizeObserver(() => draw()); ro.observe(box); } }, 30);
    let ok = false;
    try { ok = await confirmPopup(el, '이대로 쓰기', '취소'); } finally { ro?.disconnect(); }
    if (!ok || !W) { bmp.close?.(); return null; }
    // 틀 안 그대로 잘라 긴 변 640px로
    const s = base() * st.z, sw = W / s, sh = H / s, sx = st.cx - sw / 2, sy = st.cy - sh / 2;
    const outW = aspect >= 1 ? 640 : Math.round(640 * aspect), outH = Math.round(outW / aspect);
    const out = document.createElement('canvas'); out.width = outW; out.height = outH;
    const og = out.getContext('2d'); og.imageSmoothingQuality = 'high'; og.drawImage(bmp, sx, sy, sw, sh, 0, 0, outW, outH);
    bmp.close?.();
    for (const q of [0.82, 0.7, 0.55, 0.4]) { // 설정 파일이 커지지 않게 160KB 안으로
        let u = out.toDataURL('image/webp', q); if (!u.startsWith('data:image/webp')) u = out.toDataURL('image/jpeg', q);
        if (u.length <= 160000) return u;
    }
    return 'big';
}
const saveDeco = (attr, list) => { const set = settings(); set.tileDeco = { ...(set.tileDeco ?? {}), [attr]: list }; saveSettings(); };
// 편집: 칸을 끌어 아무 줄 · 자리에 · ⤡ 끌어 크기 · 스티커 옮기기 · 칸 누르면 고르기 · 색 · 그림 올리기 (마우스 · 손가락 공통)
export function bindTileDrag(root, after) {
    if (!root || root._ssDrag) return; root._ssDrag = true;
    let src = null, stk = null, rs = null, sx = 0, sy = 0, moved = false, grab = null;
    const cell = (grid, attr) => { const r = grid.getBoundingClientRect(), g = gridOf(attr), cs = getComputedStyle(grid), gap = parseFloat(cs.columnGap) || 3, rowH = parseFloat(cs.gridAutoRows) || ROW_H, rgap = parseFloat(cs.rowGap) || 3; return { r, cw: (r.width - gap * (g.cols - 1)) / g.cols + gap, rh: rowH + rgap, rowH, cols: g.cols }; };
    root.addEventListener('pointerdown', (e) => {
        if (!e.target.closest('.ss-tb.editing')) return;
        const st = e.target.closest('.ss-stk.edit');
        if (st) { stk = st; sx = e.clientX; sy = e.clientY; moved = false; st.setPointerCapture?.(e.pointerId); e.preventDefault(); return; }
        const h = e.target.closest('.ss-t-rs');
        const t = e.target.closest('.ss-tg > .ss-t[data-k]'); if (!t || e.target.closest('.ss-t-x')) return;
        if (h) rs = t; else src = t;
        sx = e.clientX; sy = e.clientY; moved = false; t.setPointerCapture?.(e.pointerId); e.preventDefault();
        const tr = t.getBoundingClientRect(); grab = { dx: e.clientX - tr.left, dy: e.clientY - tr.top };
    });
    root.addEventListener('pointermove', (e) => {
        const el = src ?? stk ?? rs; if (!el) return;
        const dx = e.clientX - sx, dy = e.clientY - sy; if (!moved && Math.hypot(dx, dy) < 5) return; moved = true;
        if (stk) { const g = stk.closest('.ss-tg').getBoundingClientRect(); stk.style.left = `${clamp((e.clientX - g.left) / g.width * 100, 0, 100)}%`; stk.style.top = `${clamp((e.clientY - g.top) / g.height * 100, 0, 100)}%`; return; }
        if (rs) { const r = rs.getBoundingClientRect(); rs.style.outline = '2px dashed var(--ss-acc)'; rs.dataset.rw = String(Math.max(20, e.clientX - r.left)); rs.dataset.rh = String(Math.max(20, e.clientY - r.top)); return; }
        src.classList.add('drag'); src.style.transform = `translate(${dx}px, ${dy}px)`;
    });
    const end = (e) => {
        const tb = root.querySelector('.ss-tb'), attr = tb?.dataset.tb ?? 'side', grid = root.querySelector('.ss-tg');
        if (stk) {
            const el = stk; stk = null; const id = el.dataset.stk;
            if (!moved) { app.stkSel = id; app.stkMenu = true; app.tileAdd = app.colMenu = false; after?.(); return; }
            const list = [...(settings().tileDeco?.[attr] ?? [])], x = list.find(y => y.id === id);
            if (x) { x.x = parseFloat(el.style.left); x.y = parseFloat(el.style.top); saveDeco(attr, list); }
            after?.(); return;
        }
        const keys = [...root.querySelectorAll('.ss-tg > .ss-t[data-k]')].map(t => t.dataset.k);
        if (rs) {
            const t = rs; rs = null; t.style.outline = ''; if (!moved || !grid) return;
            const m = cell(grid, attr), lay = layoutOf(attr, keys), p = { ...lay[t.dataset.k] };
            p.w = clamp(Math.round(Number(t.dataset.rw) / m.cw), 1, m.cols - p.c); p.h = clamp(1 + Math.round((Number(t.dataset.rh) - m.rowH) / m.rh), 1, 4); // 아래로 반 줄 넘게 끌면 한 줄 더
            settings().tileLayout = { ...(settings().tileLayout ?? {}), [gridOf(attr).key]: { ...lay, [t.dataset.k]: p } };
            saveLayout(attr, layoutOf(attr, keys, t.dataset.k)); // 커진 칸은 그대로 · 겹친 칸은 아래로
            after?.(); return;
        }
        if (!src) return; const t = src; src = null; t.style.transform = ''; t.classList.remove('drag');
        if (!moved) { app.tileSel = app.tileSel === t.dataset.k ? null : t.dataset.k; app.colMenu = true; app.tileAdd = app.stkMenu = false; after?.(); return; }
        if (!grid) return;
        const m = cell(grid, attr), lay = layoutOf(attr, keys), k = t.dataset.k, p = { ...lay[k] };
        p.c = clamp(Math.round((e.clientX - grab.dx - m.r.left) / m.cw), 0, m.cols - p.w);
        p.r = Math.max(0, Math.round((e.clientY - grab.dy - m.r.top) / m.rh));
        settings().tileLayout = { ...(settings().tileLayout ?? {}), [gridOf(attr).key]: { ...lay, [k]: p } };
        saveLayout(attr, layoutOf(attr, keys, k)); // 놓은 칸은 그 자리 · 겹친 칸은 아래로
        after?.();
    };
    root.addEventListener('pointerup', end); root.addEventListener('pointercancel', end);
    root.addEventListener('input', (e) => {
        const c = e.target.closest('[data-col]'); if (!c) return;
        const [kind, a, b] = c.dataset.col.split(':'), set = settings();
        if (kind === 'board') set.boardStyle = { ...(set.boardStyle ?? {}), [a]: c.value };
        else set.tileStyle = { ...(set.tileStyle ?? {}), [a]: { ...(set.tileStyle?.[a] ?? {}), [b]: c.value } };
        saveSettings();
        const tb = root.querySelector('.ss-tb');
        if (kind === 'board') (root.closest('.ss-tbhost') ?? tb)?.style.setProperty(`--h-${a}`, c.value); else root.querySelectorAll(`.ss-t[data-k="${a}"]`).forEach(t => t.style.setProperty(`--t-${b}`, c.value));
    });
    root.addEventListener('change', async (e) => {
        const f = e.target.closest('[data-stkup], [data-bgup]'); if (!f || !f.files?.[0]) return;
        try {
            if (f.dataset.bgup) { // 판 배경 그림: 판 모양으로 자르기 창 → 긴 변 640px
                const file = f.files[0]; f.value = ''; // 같은 그림을 다시 골라도 창이 뜨게
                const src2 = await cropImage(file, boardAspect(f.dataset.bgup));
                if (!src2) return;
                if (src2 === 'big') { toastr.warning('배경 그림이 너무 커요. 더 단순한 그림이나 작은 그림을 골라 주세요.', TITLE); return; }
                const set = settings(); set.tileDeco = { ...(set.tileDeco ?? {}), [`${f.dataset.bgup}Bg`]: src2 }; saveSettings(); after?.(); return;
            }
            const src2 = await shrinkImage(f.files[0]);
            if (src2.length > 90000) { toastr.warning('그림이 너무 커요. 더 작은 그림을 골라 주세요.', TITLE); return; }
            const attr = f.dataset.stkup, list = [...(settings().tileDeco?.[attr] ?? [])];
            if (list.filter(x => x.src).length >= 12) { toastr.info('올린 그림은 판마다 12개까지예요 (이모지 · 기본 그림은 제한 없음).', TITLE); return; }
            const id = `u${Date.now().toString(36)}`; list.push({ id, src: src2, x: 50, y: 50, w: 36, r: 0 }); app.stkSel = id;
            saveDeco(attr, list); after?.();
        } catch (err) { toastr.error('그림을 읽지 못했어요.', TITLE); }
    });
}
// 타일 판 단추 (HUD · 사이드 공통) → 처리했으면 true
export function tileAct(a, rerender, attr = 'side') {
    const set = settings();
    if (a === 'edit') { app.tileEdit = !app.tileEdit; app.tileAdd = app.stkMenu = app.colMenu = false; app.tileSel = app.stkSel = null; app.hudExp = app.sideExp = null; rerender(); return true; }
    if (a === 'addmenu') { app.tileAdd = !app.tileAdd; app.stkMenu = app.colMenu = false; rerender(); return true; }
    if (a === 'stkmenu') { app.stkMenu = !app.stkMenu; app.tileAdd = app.colMenu = false; rerender(); return true; }
    if (a === 'colmenu') { app.colMenu = !app.colMenu; app.tileAdd = app.stkMenu = false; rerender(); return true; }
    if (a === 'relayout') { const t = { ...(set.tileLayout ?? {}) }; delete t[gridOf(attr).key]; set.tileLayout = t; saveSettings(); rerender(); return true; }
    if (a.startsWith('bgp:')) { const k = a.slice(4); if (BOARD_BG[k]) { set.boardPreset = k; set.boardStyle = {}; } saveSettings(); rerender(); return true; }
    if (a === 'bgdel') { const t = { ...(set.tileDeco ?? {}) }; delete t[`${attr}Bg`]; set.tileDeco = t; saveSettings(); rerender(); return true; }
    if (a.startsWith('del:')) { set.sideMini = (set.sideMini ?? []).filter(k => k !== a.slice(4)); saveSettings(); rerender(); return true; }
    if (a.startsWith('addk:')) { const k = a.slice(5); if (!(set.sideMini ?? []).includes(k)) set.sideMini = [...(set.sideMini ?? []), k]; app.tileAdd = false; saveSettings(); rerender(); return true; }
    if (a.startsWith('stkadd:') || a.startsWith('stkemo:')) {
        let e = a.startsWith('stkemo:') ? a.slice(7) : null;
        if (e === '?') { e = (window.prompt?.('넣을 이모지 (여러 개 가능)') ?? '').trim().slice(0, 8); if (!e) return true; }
        const list = [...(set.tileDeco?.[attr] ?? [])]; const id = `s${Date.now().toString(36)}${list.length}`;
        list.push(e ? { id, e, x: 15 + (list.length * 13) % 70, y: 50, w: 22, r: 0 } : { id, m: a.slice(7), x: 15 + (list.length * 13) % 70, y: 50, w: 32, r: 0 });
        app.stkSel = id; saveDeco(attr, list); rerender(); return true;
    }
    if (a.startsWith('stk:')) {
        const list = [...(set.tileDeco?.[attr] ?? [])], x = list.find(y => y.id === app.stkSel); if (!x) return true;
        const op = a.slice(4), big = x.e ? 120 : 160;
        if (op === 'del') { list.splice(list.indexOf(x), 1); app.stkSel = null; } else if (op === '+') x.w = Math.min(big, (+x.w || 32) + 6); else if (op === '-') x.w = Math.max(10, (+x.w || 32) - 6); else if (op === 'r') x.r = ((+x.r || 0) + 15) % 360;
        else if (op === 'dup') { const id = `s${Date.now().toString(36)}`; list.push({ ...x, id, x: Math.min(100, (+x.x || 0) + 8) }); app.stkSel = id; }
        saveDeco(attr, list); rerender(); return true;
    }
    if (a.startsWith('colreset:')) { const k = a.slice(9); if (k === 'board') set.boardStyle = {}; else { const t = { ...(set.tileStyle ?? {}) }; delete t[k]; set.tileStyle = t; } saveSettings(); rerender(); return true; }
    return false;
}
// 💭 속마음 공통 (미니창 · HUD): 최근 3턴 안의 것 · 장면에서 빠진 사람 빼고
export function mindList(s, max = 4) {
    return (s.data.rel?.user ?? []).filter(x => x.mind?.text && !x.out && x.mind.turn >= (s.turn ?? 0) - 2).sort((a, b) => b.mind.turn - a.mind.turn).slice(0, max);
}
export const mindBub = (x) => `<span class="ss-mind-bub" title="${esc(x.name)}">${avatar(x.name, 'xs')}<em>${esc(x.mind.text)}</em></span>`;
// 미니 관계 칸: 무엇을 보일지 · 누구 순으로 · 몇 명 — 꾸미기에서 고름 (settings.miniRel)
export const MINI_REL_VALS = { aff: '💗 애정', trust: '🤝 우정', stage: '단계', jealous: '질투' };
export const MINI_REL_SORT = { aff: '애정 높은 순', trust: '우정 높은 순', sum: '둘 다 합쳐서' };
export function miniRelOpt() {
    const o = settings().miniRel ?? {};
    const show = (Array.isArray(o.show) ? o.show : ['aff']).filter(k => MINI_REL_VALS[k]);
    return { show, sort: MINI_REL_SORT[o.sort] ? o.sort : 'aff', n: clamp(Math.round(Number(o.n) || 3), 1, 6), pick: Array.isArray(o.pick) ? o.pick : [] };
}
function miniRelHTML(s) {
    const rel = s.data.rel, o = miniRelOpt(), AX = relAxes(rel);
    const st = rel.stages?.length ? rel.stages : DEFAULT_STAGES;
    const key = { aff: (r) => r.aff, trust: (r) => r.trust, sum: (r) => r.aff + r.trust }[o.sort];
    // 고른 사람이 있으면 그 사람들만(고른 순서대로), 없으면 정렬 기준 상위 n명
    const picked = o.pick.map(n => rel.user.find(r => r.name === n)).filter(Boolean);
    const list = picked.length ? picked : [...rel.user].sort((a, b) => key(b) - key(a)).slice(0, o.n);
    const val = (r, k) => {
        if (k === 'aff') return r.noLove ? '' : `<b class="${r.aff < 0 ? 'neg' : 'love'}" title="${esc(AX.aff)}">♥ ${r.aff}</b>`;
        if (k === 'trust') return `<b class="${r.trust < 0 ? 'neg' : 'trust'}" title="${esc(AX.trust)}">🤝 ${r.trust}</b>`;
        if (k === 'jealous') return r.jealous ? `<b class="neg" title="질투">💢 ${r.jealous}</b>` : '';
        if (k === 'stage') { if (settings().relStagesOn === false) return ''; const i = clamp(r.stage >= 0 ? r.stage : stageIndex(st, r.aff, r.trust), 0, st.length - 1); return `<em class="ss-stage s${i}">${esc(st[i]?.name ?? '')}</em>`; }
        return '';
    };
    // v2.7.21: 단계 이름은 숫자 옆에 두면 좁은 미니창에서 이름 · 단계가 다 잘려서 → 이름 아래 한 줄로
    return `<div class="ss-mini-rel">${list.map(r => { const stg = o.show.includes('stage') ? val(r, 'stage') : ''; return `<div>${avatar(r.name, 'xs')}<span>${esc(r.name)}</span><i class="ss-mini-rel-v">${o.show.filter(k => k !== 'stage').map(k => val(r, k)).join('')}</i>${stg ? `<i class="ss-mini-rel-s">${stg}</i>` : ''}</div>`; }).join('')}</div>`;
}
// ♻ 중고 시세 (AI 0회 · 입력 없음): 새것 값을 짐작 → 난이도 비율 × 상태(낡은·부서진 …) × 그날 시세(±25%)
// 새것 값: ① 상점에 같은 이름 ② 이름이 겹치는 상품(「양털 러그」 ↔ 「낡은 양털 러그」) ③ 물가표에서 겹치는 것 ④ 상점 가구·물건 값의 중간값 ⑤ 물가표 중간값
export function usedPrice(s, name) {
    const n = norm(name);
    const goods = (s.data.shop?.shops ?? []).flatMap(sh => sh.items ?? []).filter(i => i.price > 0);
    const prices = (s.data.wallet?.prices ?? []).filter(p => p.price > 0);
    const words = n.split(/\s+/).filter(w => w.length >= 2);
    const overlap = (x) => { const m = norm(x); return m.includes(n) || n.includes(m) || words.filter(w => m.includes(w)).length >= Math.min(2, words.length); };
    const median = (a) => { const v = a.map(x => x.price).sort((x, y) => x - y); return v.length ? v[Math.floor(v.length / 2)] : 0; };
    let base = 0, how = '';
    const exact = goods.find(i => norm(i.name) === n);
    if (exact) { base = exact.price; how = '상점 가격 기준'; }
    else {
        const like = goods.filter(i => overlap(i.name));
        if (like.length) { base = median(like); how = `비슷한 상품 「${like[0].name}」 기준`; }
        else {
            const lp = prices.filter(p => overlap(p.name));
            if (lp.length) { base = median(lp); how = '물가표 기준'; }
            else {
                const deco = goods.filter(i => i.kind === 'deco');
                base = median(deco.length ? deco : goods) || median(prices);
                how = base ? '이 세계 가구·물건 평균값으로 짐작' : '값을 알 수 없어 기본값';
                if (!base) base = 50;
            }
        }
    }
    const rate = { easy: 0.3, normal: 0.2, hard: 0.1 }[diffOf()] ?? 0.2;
    const worn = /낡|헌|부서|깨진|금 간|녹슨|찢어|빈 |빛바랜|오래된|broken|old|worn|rusty/i.test(name) ? 0.5 : 1;
    const day = 0.75 + Math.random() * 0.5; // 그날 시세
    return { base, price: Math.max(1, Math.round(base * rate * worn * day)), how: worn < 1 ? `${how} · 상태가 안 좋아 반값` : how };
}
// 🗺 장소 이모지 (v2.7.2): AI가 준 icon → 없으면 이름·종류로 짐작 (토큰 0 · 옛 지도에도) — 이름이 잘려도 무슨 곳인지 보이게
const PLACE_ICONS = [
    [/집|home|house|자택|숙소|기숙사|dorm|하숙|오두막|cottage|cabin/i, '🏠'], [/방|침실|bedroom|room/i, '🛏️'], [/베란다|발코니|veranda|balcony|테라스|terrace/i, '🪴'],
    [/시장|market|bazaar|장터|저잣거리/i, '🏪'], [/상점|가게|shop|store|잡화|편의점|매점/i, '🛒'], [/항구|선착장|부두|port|harbor|harbour|dock|pier/i, '⚓'], [/배|선박|ship|boat/i, '⛵'],
    [/바다|해변|해안|beach|sea|ocean|coast|섬|island/i, '🏖️'], [/병원|의원|진료|clinic|hospital|infirmary/i, '🏥'], [/학교|학원|아카데미|강의|school|academy|class/i, '🏫'], [/도서관|서고|library/i, '📚'],
    [/성|궁|왕궁|castle|palace|fort/i, '🏰'], [/교회|성당|신전|사원|절|church|temple|shrine|cathedral/i, '⛪'], [/숲|forest|woods|정글|jungle/i, '🌲'], [/산|mountain|봉우리|peak|절벽|cliff/i, '⛰️'],
    [/강|호수|river|lake|폭포|waterfall/i, '🌊'], [/동굴|던전|cave|dungeon|지하|ruin|폐허/i, '🕳️'], [/술집|선술집|주점|여관|객잔|tavern|inn|bar|pub/i, '🍺'], [/카페|찻집|cafe|café|coffee|tea/i, '☕'],
    [/식당|레스토랑|부엌|주방|restaurant|kitchen|diner/i, '🍽️'], [/광장|square|plaza/i, '⛲'], [/길드|guild/i, '⚔️'], [/마을|village|town|어귀/i, '🏘️'], [/도시|city|번화가|downtown/i, '🏙️'],
    [/역|정거장|station|터미널|terminal/i, '🚉'], [/공원|정원|garden|park/i, '🌳'], [/농장|밭|farm|ranch/i, '🌾'], [/감옥|prison|jail/i, '⛓️'], [/대장간|smithy|forge|공방|workshop/i, '⚒️'],
    [/등대|lighthouse/i, '🗼'], [/다리|bridge/i, '🌉'], [/탑|tower/i, '🗼'], [/연구소|실험실|lab/i, '🔬'], [/경찰|police|위병|guard/i, '🚓'], [/회사|사무실|office|본부|headquarters|hq/i, '🏢'],
    [/격납고|hangar|우주|space|기지|base/i, '🛰️'], [/거리|길|street|road|골목|alley/i, '🛣️'],
];
export function placeIcon(p) {
    if (p?.icon) return p.icon;
    const t = `${p?.name ?? ''} ${p?.kind ?? ''}`;
    return PLACE_ICONS.find(([re]) => re.test(t))?.[1] ?? '📍';
}
export function miniWidgets(s, keys, clickable = true) {
    const meta = getMeta();
    const d = s.data;
    const modFor = { bars: 'stats', date: 'calendar', loc: 'map', cash: 'wallet', contact: 'contact', quest: 'quest', rel: 'rel', mind: 'rel', cond: 'stats', news: 'news', fate: 'fate', music: 'music', custom: 'custom' };
    const fr = app.current?.fresh;
    const freshMini = { cond: ['stats', 'conds'], date: ['calendar'], loc: ['map', 'here'], cash: ['wallet', 'cash'], quest: ['quest'], rel: ['rel', 'user'], news: ['news'], fate: ['fate'], music: ['music'], custom: ['custom'], contact: ['contact'] };
    const dot = (k) => (freshMini[k] && isFresh(fr, ...freshMini[k]) ? FRESH_DOT : '');
    return keys.filter(k => MINI[k] && (!modFor[k] || modOn(modFor[k], meta)) && MINI[k].on(d)).map(k => `<div class="ss-mini-w${dot(k) ? ' fresh' : ''}" data-w="${k}" ${clickable ? `data-act="tab" data-arg="${MINI[k].tab}"` : ''}>${dot(k)}${MINI[k].html(s, !clickable)}</div>`).join('');
}
