// 칸별 화면 · 대시보드 · 관리 · 미니 위젯
import {
    app, ctx, settings, saveSettings, getMeta, saveMeta, modOn, MODS, MOD, MOD_IDS, DIFFS, diffOf, esc, short, clamp, norm, findBy, fmtNum, clone, splitBar, parseNum,
    dateStr, dateShort, dayIndex, mascotUrl, eventsOn, nextTime, upcoming, userName, TITLE, VERSION, EMPTY, CONTACT_MODES, stamp, relAxes, weekday, DEFAULT_STAGES, viewTr, GLOBAL_OFF,
} from './core.js';
import { addAdjust, commit, unreadCount, dueLetters, inTransit, priceMul, peopleAt, hopsBetween, whereNow, seasonOf, SEASON_NAME, stageIndex, purgeTrash, isFresh, undoAt, skillRoll, SOCIAL_RE, JUDGE_NAME } from './engine.js';
// 🔴 방금 AI 답에서 바뀐 곳 (v2.7.3) — 작은 빨간 점 하나
export const FRESH_DOT = '<i class="ss-fresh" title="방금 AI 답에서 바뀌었어요"></i>';
export const freshDot = (mod, k, name) => (isFresh(app.current?.fresh, mod, k, name) ? FRESH_DOT : '');
import { trString } from './translate.js';
import { walletView, fxText } from './money.js';
import { fateView } from './fate.js';
import { gauge, meter, sec, emptyBox, chip, avatar, emojiOf, ai1, seg, insertInput, closeIfPopup, askInput, askConfirm } from './kit.js';
import { diceView } from './dice.js';
import { contactView } from './contact.js';
import { questView, newsView, gossipView, boardView } from './feeds.js';
import { snsView, musicView, customView, relView, achView, albumView, recordView, SNS_ACTIONS, MUSIC_ACTIONS, MUSIC_CHANGES, CUSTOM_ACTIONS, REL_ACTIONS, ACH_ACTIONS, ALBUM_ACTIONS, writeEnding } from './extra.js';
import { songLink } from './notify.js';
import { slotsHTML, cardPack, carryFor } from './safe.js';
import { presetHTML } from './extra.js';
import { detectPlay, instructModule } from './ai.js';
import { PLAY_MODES, normPlay, playOf } from './core.js';
import { busyBtn, confirmPopup, mascot } from './kit.js';

const roleName = { user: '유저', main: '주요', npc: 'NPC' };

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
    bars: { name: '게이지', w: 4, on: (d) => d.stats?.bars.length, f: (s, L) => ({ h: s.data.stats.bars.slice(0, 4).map(b => { const p = b.max > 0 ? Math.max(0, Math.min(100, b.cur / b.max * 100)) : 0; return `<span class="g"><em>${esc(L ? b.name : /[가-힣]/.test(b.name) ? b.name.slice(0, 2) : b.name.slice(0, 3))}</em><b>${fmtNum(b.cur)}</b><i><u style="width:${p}%;background:${esc(b.color || 'var(--ss-acc)')}"></u></i></span>`; }).join(''), t: s.data.stats.bars.map(b => `${b.name} ${b.cur}/${b.max}`).join(' · ') }) },
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
function usedPrice(s, name) {
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

// ───── 홈(대시보드) ─────
function homeView(s, ui) {
    const c = s.core, d = s.data, meta = getMeta();
    const alerts = [];
    const due = dueLetters(s);
    if (due.length) alerts.push(`<div class="ss-callout mail" data-act="tab" data-arg="contact"><i class="fa-solid fa-envelope-open-text"></i><div><b>도착한 편지 ${due.length}통</b><span>${due.map(x => esc(x.who)).join(', ')}</span></div></div>`);
    const un = Object.entries(d.contact?.unread ?? {}).filter(([, n]) => n);
    if (un.length && modOn('contact')) alerts.push(`<div class="ss-callout" data-act="tab" data-arg="contact"><i class="fa-solid fa-comment-dots"></i><div><b>새 연락</b><span>${un.map(([w, n]) => `${esc(w)} ${n}`).join(', ')}</span></div></div>`);
    if (s.pendingRoll && modOn('dice')) alerts.push(`<div class="ss-callout warn" data-act="tab" data-arg="dice"><i class="fa-solid fa-dice-d20"></i><div><b>판정 요청</b><span>${esc(s.pendingRoll.label)}</span></div></div>`);
    if (meta.paused) alerts.push(`<div class="ss-callout pause">${mascot('sleep', 'sm') || '<i class="fa-solid fa-pause"></i>'}<div><b>일시정지 중</b><span>AI에게 상태를 보내지 않아요</span></div><button class="ss-btn sm pri" data-act="pause">재개</button></div>`);
    const order = ['bars', 'date', 'loc', 'cash', 'music', 'fate', 'cond', 'custom', 'quest', 'rel', 'news'];
    if (!settings().helpCardOff) alerts.push(`<div class="ss-callout help"><i class="fa-solid fa-circle-question"></i><div><b>모르는 건 미트볼 도우미에게</b><span>「토큰 아끼려면?」 「칩이 안 떠요」처럼 물어보면 바로 답해요 · AI 0회</span></div><button class="ss-btn sm" data-act="help">물어보기</button><button class="ss-x" data-act="helpcardoff" title="닫기 (머리의 「도우미」 버튼은 그대로 있어요)">×</button></div>`);
    if (meta.newV5) alerts.push(`<div class="ss-callout new"><i class="fa-solid fa-gift"></i><div><b>v2.5 새 기능</b><span>SNS · 추천 음악 · 내 탭이 생겼어요. 관리 → 쓸 기능에서 켤 수 있어요.</span></div><button class="ss-btn sm" data-act="tab" data-arg="manage">켜러 가기</button><button class="ss-x" data-act="newv5off" title="닫기">×</button></div>`);
    return `<div class="ss-home">
        <div class="ss-hero"><div class="ss-hero-t"><small>${esc(c.genre || '세계')}${c.canon ? ` · ${esc(c.canon)}` : ''}</small><b>${esc(c.title || '이름 없는 세계')}</b></div>
            ${c.userRole ? `<p><b>${esc(userName())}</b> — ${esc(c.userRole)}</p>` : ''}
            ${c.summary ? `<details class="ss-more" ${ui.worldOpen ? 'open' : ''}><summary>세계관 요약 <small class="ss-dim">${settings().injWorld ? '· 매 턴 AI에게 보냄' : '· 칸 만들 때만 참고 (매 턴 안 보냄)'}</small></summary><p class="ss-pre">${esc(c.summary)}</p>${c.rules ? `<p class="ss-pre ss-dim">${esc(c.rules)}</p>` : ''}${c.tone ? `<p class="ss-dim">톤: ${esc(c.tone)}</p>` : ''}</details>` : ''}
        </div>
        ${alerts.join('')}
        <div class="ss-home-grid">${miniWidgets(s, order)}</div>
    </div>`;
}

// 🎲 흥정 결과 (오늘 · 이 상점 · 이 물건) — 1 = 흥정 안 함
function haggleMul(s, i, j) { const day = s.data.calendar ? dayIndex(s.data.calendar) : s.turn; return getMeta()?.haggle?.[`${day}|${i}|${j}`] ?? 1; }
// ───── 칸별 화면 ─────
export const VIEW = {
    home: (s, d, ui) => homeView(s, ui),
    profile: (s, d, ui) => `<div class="ss-hint">프로필 모드: <b>${d.mode === 'detailed' ? '상세' : '최소'}</b> — ${d.mode === 'detailed' ? '이 시트가 AI에게 전달돼요' : '카드·로어북을 쓰고, 새 NPC만 전달돼요'}</div>
        <div class="ss-stack">${d.list.map((p, i) => `<details class="ss-prof" ${ui.open === i || d.list.length === 1 ? 'open' : ''}>
            <summary>${avatar(p.name)}<div class="ss-ct-b"><b>${freshDot('profile', 'list', p.name)}${esc(p.name)} <span class="ss-role ${p.role}">${roleName[p.role]}</span></b><small>${esc(short(p.summary, 60))}</small></div><i class="fa-solid fa-chevron-down ss-chev"></i></summary>
            <div class="ss-prof-b"><p class="ss-pre">${esc(p.summary)}</p>
            ${p.home || p.sched ? `<p class="ss-dim ss-where">${p.home ? `🏠 ${esc(p.home)}` : ''}${p.sched ? ` · 🕐 ${esc(p.sched)}` : ''}${s.data.calendar && whereNow(p, s.data.calendar) ? ` · <b>지금: ${esc(whereNow(p, s.data.calendar))}</b>` : ''}</p>` : ''}
            ${p.fields.length ? `<dl class="ss-dl">${p.fields.map(f => `<dt>${esc(f.k)}</dt><dd class="ss-pre">${esc(f.v)}</dd>`).join('')}</dl>` : ''}
            ${modOn('contact') && p.role !== 'user' ? `<button class="ss-btn sm ghost" data-act="talk" data-arg="${esc(p.name)}"><i class="fa-solid fa-envelope"></i> 연락하기</button>` : ''}</div>
        </details>`).join('') || emptyBox('인물이 없어요', 'fa-id-card')}</div>`,
    stats: (s, d) => `${sec('게이지', `<div class="ss-stack">${d.bars.map(b => `<div class="ss-card ss-gcard">${gauge(b, false, freshDot('stats', 'bars', b.name))}
            <div class="ss-gbtns"><button class="ss-ib t" data-act="bar" data-arg="${esc(b.name)}|-10">−10</button><button class="ss-ib t" data-act="bar" data-arg="${esc(b.name)}|-1">−1</button><button class="ss-ib t" data-act="bar" data-arg="${esc(b.name)}|+1">+1</button><button class="ss-ib t" data-act="bar" data-arg="${esc(b.name)}|+10">+10</button>${b.desc ? `<small class="ss-dim">${esc(b.desc)}</small>` : ''}</div></div>`).join('') || emptyBox('게이지가 없어요')}</div>`)}
        ${sec('능력치', `<div class="ss-attrs">${d.attrs.map(a => `<div class="ss-attr" title="${esc(a.desc)}"><span>${esc(a.name)}${freshDot('stats', 'attrs', a.name)}</span><b>${a.val >= 0 ? '+' : ''}${a.val}</b></div>`).join('') || emptyBox('능력치가 없어요')}</div>`)}
        ${sec('상태 이상 · 버프', `<div class="ss-chips">${d.conds.map(c => `<span class="ss-chip warn" title="${esc(c.desc)}">${freshDot('stats', 'conds', c.name)}${esc(c.name)}<button class="ss-x" data-act="uncond" data-arg="${esc(c.name)}">×</button></span>`).join('') || '<span class="ss-hint">없음</span>'}</div>`)}`,
    dice: diceView,
    wallet: walletView,
    fate: fateView,
    shop: (s, d, ui) => {
        const w = s.data.wallet;
        const i0 = clamp(ui.shop ?? 0, 0, Math.max(0, d.shops.length - 1));
        const mul = priceMul(s), pr = (it, j) => Math.round(it.price * mul * (j === undefined ? 1 : haggleMul(s, i0, j)));
        const sh = d.shops[i0];
        return `${d.shops.length > 1 ? seg(d.shops.map((x, i) => [i, esc(x.name)]), i0, 'shoptab', 'class="ss-seg wrap"') : ''}
        ${sh ? `<div class="ss-shop-h"><div><b>${esc(sh.name)}</b><small>${esc(sh.desc)}${sh.place ? ` · 📍 ${esc(sh.place)}` : ''}</small></div>${w ? `<span class="ss-chip"><i class="fa-solid fa-coins"></i> ${fmtNum(w.cash)} ${esc(w.currency)}${fxText(w, w.cash) ? ` <small class="ss-dim">${esc(fxText(w, w.cash))}</small>` : ''}</span>` : ''}</div>
        <div class="ss-goods">${sh.items.map((it, j) => `<div class="ss-good ${it.stock === 0 ? 'out' : ''}"><div class="ss-good-b"><b>${esc(it.name)}</b>${it.kind === 'deco' ? chip('가구') : ''}${it.stock === 0 ? chip('품절', 'neg') : it.stock > 0 ? `<small>재고 ${it.stock}</small>` : ''}<small>${esc(it.desc)}</small></div>
            <div class="ss-good-a">${(() => { const hm = haggleMul(s, i0, j), p = pr(it, j); return `<b class="ss-price ${mul * hm > 1 ? 'up' : mul * hm < 1 ? 'down' : ''}">${hm !== 1 ? `<s class="ss-dim">${fmtNum(pr(it))}</s> ` : ''}${fmtNum(p)}${fxText(w, p) ? `<small class="ss-fx">${esc(fxText(w, p))}</small>` : ''}</b>${settings().extraJudge !== false && it.stock !== 0 ? `<button class="ss-btn sm ghost" data-act="haggle" data-arg="${i0}|${j}" title="🎲 흥정 — 매력 · 화술 같은 능력치로 d20 (하루에 물건마다 한 번 · AI 0회)" ${hm !== 1 || getMeta()?.haggle?.[`${s.data.calendar ? dayIndex(s.data.calendar) : s.turn}|${i0}|${j}`] ? 'disabled' : ''}>🎲</button>` : ''}<button class="ss-btn sm pri" data-act="buy" data-arg="${i0}|${j}" ${it.stock === 0 || (w && w.cash < p) ? 'disabled' : ''}>구매</button>`; })()}</div></div>`).join('') || emptyBox('상품이 없어요')}</div>` : emptyBox('상점이 없어요. ✨ AI로 수정에서 "○○ 상점 추가"라고 해 보세요.', 'fa-store')}`;
    },
    rel: relView,
    map: (s, d, ui) => {
        const areas = [...new Set(d.places.map(p => p.area).filter(Boolean))];
        const shown = ui.mapArea ? d.places.filter(p => p.area === ui.mapArea) : d.places;
        const pos = layoutPlaces(d.places);
        const sel = findBy(d.places, ui.place ?? d.here);
        const shownSet = new Set(shown.map(p => p.name));
        const edges = []; const seen = new Set();
        for (const p of shown) for (const l of p.links) {
            const q = findBy(d.places, l); if (!q || !shownSet.has(q.name)) continue;
            const key = [p.name, q.name].sort().join('|'); if (seen.has(key)) continue; seen.add(key);
            const a = pos.get(p.name), b = pos.get(q.name);
            edges.push(`<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" class="${p.known && q.known ? '' : 'unk'}"/>`);
        }
        const people = modOn('profile') && s.data.profile;
        const nodes = shown.map(p => {
            const ic = p.known ? placeIcon(p) : '❔';
            const o = pos.get(p.name); const here = norm(p.name) === norm(d.here); const isSel = sel && sel.name === p.name;
            const n = people ? peopleAt(s, p.name).now.length : 0;
            return `<g class="node ${here ? 'here' : ''} ${isSel ? 'sel' : ''} ${p.known ? '' : 'unk'}" data-act="selplace" data-arg="${esc(p.name)}">
                ${here ? `<circle cx="${o.x}" cy="${o.y}" r="4.6" class="ring"/>` : ''}<circle cx="${o.x}" cy="${o.y}" r="${here ? 3.2 : 2.8}" class="dot"/><text class="ico" x="${o.x}" y="${o.y + 1.15}">${esc(ic)}</text>
                <text x="${o.x}" y="${o.y - 4.4}">${esc(p.known ? short(viewTr() ? trString(p.name) : p.name, 8) : '???')}</text>${n ? `<text class="ppl" x="${o.x + 2.6}" y="${o.y + 1.2}">👥${n}</text>` : ''}</g>`;
        }).join('');
        const vb = ui.mapVB ?? fitBox(shown.map(p => pos.get(p.name)));
        let card = '';
        if (sel) {
            const here = norm(sel.name) === norm(d.here);
            const pa = people ? peopleAt(s, sel.name) : { live: [], now: [] };
            const hops = here ? 0 : hopsBetween(d, d.here, sel.name);
            const cal = s.data.calendar && modOn('calendar');
            const cur = s.data.wallet?.currency ?? '';
            card = `<div class="ss-card ss-place"><div class="ss-place-h"><b>${esc(sel.known ? sel.name : '알 수 없는 곳')}</b>${sel.kind ? chip(esc(sel.kind)) : ''}${sel.area ? chip(esc(sel.area)) : ''}${here ? chip('현재 위치', 'hi') : ''}</div>
                <p class="ss-pre ss-dim">${esc(sel.known ? sel.desc : '아직 가 보지 않았다.')}</p>
                ${pa.now.length || pa.live.length ? `<div class="ss-ppl">${pa.now.length ? `<div><small>지금 여기${cal ? ` (${esc(s.data.calendar.time)})` : ''}</small>${pa.now.map(n => `<button class="ss-chip btn" data-act="talk" data-arg="${esc(n)}">${esc(n)}</button>`).join('')}</div>` : ''}${pa.live.length ? `<div><small>사는 사람</small>${pa.live.map(n => chip(esc(n))).join('')}</div>` : ''}</div>` : ''}
                ${sel.links.length ? `<div class="ss-chips">${sel.links.map(l => `<button class="ss-chip btn" data-act="selplace" data-arg="${esc(l)}">${esc(l)}</button>`).join('')}</div>` : ''}
                ${!here ? `<p class="ss-hint">${hops}칸 거리${cal && hops ? ` · 시간대 ${hops}개가 흘러요` : ''}${sel.fare ? ` · 요금 ${fmtNum(sel.fare)} ${esc(cur)}` : ''}</p>
                <div class="ss-row-btns"><button class="ss-btn pri sm" data-act="travel" data-arg="${esc(sel.name)}"><i class="fa-solid fa-person-walking"></i> 이동</button><button class="ss-btn sm ghost" data-act="goto" data-arg="${esc(sel.name)}">입력창에 쓰기</button><button class="ss-btn sm ghost" data-act="setloc" data-arg="${esc(sel.name)}">위치만 바꾸기</button></div>` : ''}</div>`;
        }
        return `<div class="ss-hint"><b>${esc(d.name || '지도')}</b> · 지금 <b>${esc(d.here || '-')}</b>${freshDot('map', 'here')}</div>
            ${areas.length ? `<div class="ss-seg wrap ss-areas">${[['', '전체'], ...areas.map(a => [a, a])].map(([v, t]) => `<button class="${(ui.mapArea ?? '') === v ? 'on' : ''}" data-act="maparea" data-arg="${esc(v)}">${esc(t)}</button>`).join('')}</div>` : ''}
            <div class="ss-mapwrap"><svg class="ss-map" viewBox="${vb.join(' ')}" preserveAspectRatio="xMidYMid meet"><g class="edges">${edges.join('')}</g>${nodes}</svg>
                <div class="ss-mapctl"><button class="ss-ib" data-act="mapzoom" data-arg="in" title="확대">＋</button><button class="ss-ib" data-act="mapzoom" data-arg="out" title="축소">－</button><button class="ss-ib" data-act="mapzoom" data-arg="here" title="현재 위치로"><i class="fa-solid fa-location-crosshairs"></i></button><button class="ss-ib" data-act="mapzoom" data-arg="fit" title="전체 보기"><i class="fa-solid fa-expand"></i></button></div></div>
            <p class="ss-hint">끌어서 옮기고, 두 손가락·휠·버튼으로 확대해요.</p>
            ${card}`;
    },
    calendar: (s, d, ui) => {
        ui.cal ??= { y: d.y, m: d.m };
        const { y, m } = ui.cal;
        const month = d.months[m - 1] ?? d.months[0];
        const w = d.week.length || 7;
        const first = ((dayIndex(d, y, m, 1) % w) + w) % w;
        const cells = [];
        for (let i = 0; i < first; i++) cells.push('<div class="ss-cal-c x"></div>');
        for (let k = 1; k <= month.days; k++) {
            const ev = eventsOn(d, y, m, k);
            const today = y === d.y && m === d.m && k === d.d;
            // v2.7.18: 칸 안엔 점만 (예전엔 제목을 5글자로 잘라 넣어서 글자가 다 잘렸음) — 제목은 아래 「이달 일정」과 날짜를 누르면 전부
            cells.push(`<button class="ss-cal-c ${today ? 'today' : ''} ${ui.day === k ? 'sel' : ''} ${ev.length ? 'ev' : ''}" data-act="calday" data-arg="${k}" title="${esc(ev.map(e => e.title).join(' · '))}"><span>${k}</span>${ev.length ? `<i class="ss-cal-dots">${'<b></b>'.repeat(Math.min(3, ev.length))}</i>` : ''}</button>`);
        }
        const selDay = ui.day ?? null;
        const evs = selDay ? eventsOn(d, y, m, selDay) : [];
        const monthEv = [];
        for (let k = 1; k <= month.days; k++) for (const e of eventsOn(d, y, m, k)) monthEv.push([k, e]);
        const meta = getMeta();
        const lastA = (meta?.adjust ?? []).at(-1);
        const canUndo = !!lastA && Array.isArray(lastA.ops) && lastA.ops.length && lastA.ops.every(([k]) => ['date', 'time', 'weather'].includes(k)) && !lastA.set;
        const wd = weekday(d, d.y, d.m, d.d);
        return `<div class="ss-calx">
            <div class="ss-today2">
                <div class="ss-today2-d"><small>${esc(d.months[d.m - 1]?.name ?? '')}</small><b>${d.d}</b><small>${esc(wd)}</small></div>
                <div class="ss-today2-b"><small>오늘 · ${SEASON_NAME[seasonOf(d)]}${d.era ? ` · ${esc(d.era)}` : ''}</small><b>${esc(dateStr(d))}${freshDot('calendar')}</b>
                    <span class="ss-today2-t"><i class="fa-solid fa-clock"></i> ${esc(d.time)}${d.weather ? ` <i class="fa-solid fa-cloud-sun"></i> ${esc(d.weather)}` : ''} <button class="ss-ib sm" data-act="setweather" title="날씨 바꾸기"><i class="fa-solid fa-pen"></i></button></span></div>
            </div>
            <div class="ss-timebar">
                <button class="ss-btn sm" data-act="timenext" title="다음 시간대로"><i class="fa-solid fa-forward-step"></i> ${esc(nextTime(d))}</button>
                <button class="ss-btn sm" data-act="dayplus" title="하루 넘기기"><i class="fa-solid fa-sun"></i> +1일</button>
                <button class="ss-btn sm ghost" data-act="timeundo" ${canUndo ? '' : 'disabled'} title="${canUndo ? `방금 넘긴 시간을 되돌려요: ${esc(lastA.label || '')}` : '되돌릴 시간 넘기기가 없어요 (가장 최근 편집이 시간 넘기기일 때만)'}"><i class="fa-solid fa-rotate-left"></i> 되돌리기</button>
            </div>
            <div class="ss-cal-head"><button class="ss-ib" data-act="calnav" data-arg="-1" title="이전 달"><i class="fa-solid fa-chevron-left"></i></button><b>${y}년 ${esc(month.name)}</b><button class="ss-ib" data-act="calnav" data-arg="1" title="다음 달"><i class="fa-solid fa-chevron-right"></i></button>${y !== d.y || m !== d.m ? '<button class="ss-btn sm ghost" data-act="calnav" data-arg="0">오늘로</button>' : ''}</div>
            <div class="ss-cal" style="grid-template-columns:repeat(${w},minmax(0,1fr))">${d.week.map(x => `<div class="ss-cal-w">${esc(x)}</div>`).join('')}${cells.join('')}</div>
            ${selDay ? `<div class="ss-card ss-calday"><div class="ss-sec-h"><h4>${esc(dateStr(d, y, m, selDay))}</h4><button class="ss-ib" data-act="calday" data-arg="" title="닫기"><i class="fa-solid fa-xmark"></i></button></div>
                ${evs.map(e => `<div class="ss-ev2"><i class="fa-solid fa-circle"></i><div><b>${esc(e.title)}</b>${e.desc || e.repeat === 'yearly' ? `<small>${esc(e.desc)}${e.repeat === 'yearly' ? `${e.desc ? ' · ' : ''}매년` : ''}</small>` : ''}</div>${e.auto ? '' : `<button class="ss-ib sm" data-act="delevent" data-arg="${esc(`${m}|${selDay}|${e.title}`)}" title="일정 지우기"><i class="fa-solid fa-trash-can"></i></button>`}</div>`).join('') || '<div class="ss-hint">일정 없음</div>'}
                <div class="ss-inline"><input class="ss-in ss-ev-title" placeholder="일정 제목 (예: 레온과 약속)"><label class="ss-tog"><input type="checkbox" class="ss-switch ss-ev-year"><span>매년</span></label><button class="ss-btn" data-act="addevent"><i class="fa-solid fa-plus"></i> 추가</button></div>
                ${!(y === d.y && m === d.m && selDay === d.d) ? `<button class="ss-btn sm ghost" data-act="jumpday"><i class="fa-solid fa-clock-rotate-left"></i> 이 날로 시간 이동</button>` : ''}</div>` : '<p class="ss-hint center">날짜를 누르면 그날 일정을 보고 추가할 수 있어요.</p>'}
            ${sec(`이달 일정 <small>${monthEv.length}</small>`, monthEv.map(([k, e]) => `<button class="ss-ev2 row" data-act="calday" data-arg="${k}"><em>${k}일</em><div><b>${esc(e.title)}</b>${e.desc ? `<small>${esc(e.desc)}</small>` : ''}</div></button>`).join('') || `${emptyBox('이 달엔 일정이 없어요', 'fa-calendar')}${d.events.length ? '' : '<button class="ss-btn sm ghost" data-act="calfill"><i class="fa-solid fa-calendar-plus"></i> 기본 일정 넣기 (매년 · AI 0회)</button>'}`)}
            ${sec('다가오는 일정 <small>30일</small>', upcoming(d).map(([k, e]) => `<div class="ss-ev2"><em class="${k === 0 ? 'now' : ''}">${k === 0 ? '오늘' : `D-${k}`}</em><div><b>${esc(e.title)}</b>${e.desc ? `<small>${esc(e.desc)}</small>` : ''}</div></div>`).join('') || emptyBox('30일 안에 일정이 없어요', 'fa-calendar'))}
        </div>`;
    },
    contact: contactView,
    sns: snsView,
    music: musicView,
    custom: customView,
    album: albumView,
    record: recordView,
    quest: questView,
    news: newsView,
    gossip: gossipView,
    board: boardView,
    ach: achView,
    memo: (s, d) => {
        const list = [...d.list.filter(m => m.pin), ...d.list.filter(m => !m.pin).reverse()];
        return `<div class="ss-inline top"><textarea class="ss-in ss-memo-in" rows="2" placeholder="메모 쓰기"></textarea><button class="ss-btn pri" data-act="memoadd">추가</button></div>
        <div class="ss-stack">${list.map(m => `<div class="ss-memo ${m.by} ${m.inject ? '' : 'off'}"><div class="ss-pre">${m.pin ? '<i class="fa-solid fa-thumbtack"></i> ' : ''}${esc(m.text)}</div>
            <div class="ss-memo-f"><small>${m.by === 'ai' ? 'AI' : '나'}</small>
            <label class="ss-tog sm"><input type="checkbox" class="ss-switch" data-chg="memotog" data-arg="${esc(m.id)}|inject" ${m.inject ? 'checked' : ''}><span>AI 반영</span></label>
            <button class="ss-ib" data-act="memotog" data-arg="${esc(m.id)}|pin" title="고정"><i class="fa-solid fa-thumbtack"></i></button>
            <button class="ss-ib" data-act="memodel" data-arg="${esc(m.id)}" title="삭제"><i class="fa-solid fa-trash-can"></i></button></div></div>`).join('') || emptyBox('메모가 없어요', 'fa-note-sticky')}</div>`;
    },
};
// 본거지 (탭 id 'home'은 대시보드와 겹치지 않게 'base'로 보여 준다)
VIEW.base = (s, d) => `<div class="ss-hero sm"><div class="ss-hero-t"><small>본거지</small><b>${esc(d.name || '본거지')}</b></div>${d.desc ? `<p class="ss-pre ss-dim">${esc(d.desc)}</p>` : ''}</div>
    <div class="ss-rooms">${d.rooms.map(r => `<div class="ss-room"><b>${esc(r.name)}</b><small class="ss-pre">${esc(r.desc)}</small>
        <div class="ss-chips">${r.decor.map(x => `<span class="ss-chip">${esc(x)}<button class="ss-x" data-act="unplace" data-arg="${esc(x)}" title="창고로">↓</button></span>`).join('') || '<small class="ss-hint">비어 있음</small>'}</div></div>`).join('') || emptyBox('방·구역이 없어요', 'fa-house')}</div>
    ${sec(`창고 <small>${d.storage.length}</small>`, d.storage.length ? `<div class="ss-stack">${d.storage.map((x, i) => `<div class="ss-item"><div class="ss-item-b"><b>${esc(x)}</b></div><select class="ss-in sm" data-chg="place" data-arg="${i}"><option value="">배치할 곳…</option>${d.rooms.map(r => `<option>${esc(r.name)}</option>`).join('')}</select>
        <div class="ss-item-a">${s.data.wallet && modOn('wallet') ? `<button class="ss-ib" data-act="tobag" data-arg="${esc(x)}" title="소지품으로 옮기기">🎒</button>` : ''}${s.data.wallet && modOn('wallet') ? `<button class="ss-btn sm ghost" data-act="sellused" data-arg="${esc(x)}" title="중고장터에 팔기 (헐값)">♻ 팔기</button>` : ''}<button class="ss-ib" data-act="trashit" data-arg="${esc(x)}" title="쓰레기통에 버리기"><i class="fa-solid fa-trash-can"></i></button></div></div>`).join('')}</div>` : emptyBox('상점에서 가구를 사면 여기에 들어와요', 'fa-couch'))}
    ${d.trash?.length ? `<details class="ss-arc"><summary><i class="fa-solid fa-trash-can"></i> 쓰레기통 ${d.trash.length}개</summary><ul>${[...d.trash].reverse().map(t => `<li><b>${esc(t.name)}</b> <small>${esc(t.date)}</small> <button class="ss-btn sm ghost" data-act="restore" data-arg="${esc(t.name)}">되살리기</button> <button class="ss-btn sm ghost danger" data-act="purge" data-arg="${esc(t.name)}" title="완전 삭제 — 되살릴 수 없어요"><i class="fa-solid fa-xmark"></i> 완전 삭제</button></li>`).join('')}</ul><div class="ss-row-btns"><button class="ss-btn sm ghost danger" data-act="purgeall"><i class="fa-solid fa-broom"></i> 쓰레기통 비우기 (완전 삭제)</button></div></details>` : ''}`;

export function layoutPlaces(places) {
    const pos = new Map();
    const n = places.length;
    const free = (x, y) => [...pos.values()].every(q => Math.hypot(q.x - x, q.y - y) > 9);
    for (const p of places) if (Number.isFinite(p.x) && Number.isFinite(p.y)) pos.set(p.name, { x: p.x, y: p.y });
    places.forEach((p, i) => {
        if (pos.has(p.name)) return;
        const anchor = p.links.map(l => findBy(places, l)).find(q => q && pos.has(q.name)) ?? places.find(q => q.links.some(l => norm(l) === norm(p.name)) && pos.has(q.name));
        if (anchor) {
            const a0 = pos.get(anchor.name);
            for (let k = 0; k < 16; k++) {
                const ang = (k * 2.4) + i, r = 14 + (k >> 2) * 5;
                const x = clamp(a0.x + Math.cos(ang) * r, 2, 98), y = clamp(a0.y + Math.sin(ang) * r, 4, 98);
                if (free(x, y) || k === 15) { pos.set(p.name, { x, y }); return; }
            }
        }
        const a = (i / Math.max(1, n)) * Math.PI * 2;
        pos.set(p.name, { x: 50 + Math.cos(a) * 38, y: 50 + Math.sin(a) * 38 });
    });
    return pos;
}
app.sellPrice = (s, name) => sellPrice(s, name);
// 지도 화면 범위 (viewBox): 보이는 장소들을 감싸는 상자
function fitBox(pts) {
    const P = pts.filter(Boolean);
    if (!P.length) return [-6, -8, 112, 114];
    const xs = P.map(p => p.x), ys = P.map(p => p.y);
    const x0 = Math.min(...xs) - 10, x1 = Math.max(...xs) + 10, y0 = Math.min(...ys) - 12, y1 = Math.max(...ys) + 10;
    const w = Math.max(40, x1 - x0), h = Math.max(40, y1 - y0), side = Math.max(w, h);
    return [x0 - (side - w) / 2, y0 - (side - h) / 2, side, side].map(v => Math.round(v * 10) / 10);
}
function zoomBox(vb, f, cx = vb[0] + vb[2] / 2, cy = vb[1] + vb[3] / 2) {
    const w = clamp(vb[2] * f, 12, 240), h = clamp(vb[3] * f, 12, 240);
    return [cx - (cx - vb[0]) * (w / vb[2]), cy - (cy - vb[1]) * (h / vb[3]), w, h].map(v => Math.round(v * 10) / 10);
}
const svgBox = (svg) => svg.getAttribute('viewBox').split(/\s+/).map(Number);
const keepBox = (svg, vb) => { svg.setAttribute('viewBox', vb.join(' ')); const el = svg.closest('.ss-panel'); if (el?._ss) el._ss.ui.mapVB = vb; };
// 끌기 · 두 손가락 확대 · 휠: 다시 그리지 않고 viewBox만 바꾼다
let drag = null;
const R10 = (v) => Math.round(v * 10) / 10;
const pinchInfo = (d) => { const [a, b] = [...d.pts.values()]; return { dist: Math.hypot(a.x - b.x, a.y - b.y) || 1, cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2 }; };
document.addEventListener('pointerdown', (e) => {
    const svg = e.target.closest?.('svg.ss-map'); if (!svg) return;
    if (drag && drag.svg !== svg) drag = null;
    drag ??= { svg, pts: new Map(), moved: false };
    drag.pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    // 손가락 수가 바뀔 때마다 기준을 새로 잡는다
    drag.vb = svgBox(svg); drag.start = new Map([...drag.pts].map(([k, v]) => [k, { ...v }]));
    if (drag.pts.size === 2) drag.pinch = pinchInfo(drag);
});
document.addEventListener('pointermove', (e) => {
    if (!drag || !drag.pts.has(e.pointerId)) return;
    drag.pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const r = drag.svg.getBoundingClientRect(); if (!r.width || !r.height) return;
    const vb = drag.vb;
    if (drag.pts.size >= 2 && drag.pinch) {
        const now = pinchInfo(drag), f = drag.pinch.dist / now.dist;
        const cx = vb[0] + ((drag.pinch.cx - r.left) / r.width) * vb[2], cy = vb[1] + ((drag.pinch.cy - r.top) / r.height) * vb[3];
        const z = zoomBox(vb, f, cx, cy);
        const dx = (now.cx - drag.pinch.cx) * (z[2] / r.width), dy = (now.cy - drag.pinch.cy) * (z[3] / r.height);
        drag.moved = true;
        keepBox(drag.svg, [z[0] - dx, z[1] - dy, z[2], z[3]].map(R10));
        return;
    }
    const st = drag.start.get(e.pointerId); if (!st) return;
    if (!drag.moved && Math.hypot(e.clientX - st.x, e.clientY - st.y) < 4) return;
    drag.moved = true;
    const dx = (e.clientX - st.x) * (vb[2] / r.width), dy = (e.clientY - st.y) * (vb[3] / r.height);
    keepBox(drag.svg, [vb[0] - dx, vb[1] - dy, vb[2], vb[3]].map(R10));
});
const endPtr = (e) => {
    if (!drag) return;
    drag.pts.delete(e.pointerId);
    if (drag.pts.size) { drag.vb = svgBox(drag.svg); drag.start = new Map([...drag.pts].map(([k, v]) => [k, { ...v }])); drag.pinch = null; return; }
    if (drag.moved) { const svg = drag.svg; svg._dragged = true; setTimeout(() => { svg._dragged = false; }, 50); }
    drag = null;
};
document.addEventListener('pointerup', endPtr);
document.addEventListener('pointercancel', endPtr);
document.addEventListener('click', (e) => { const svg = e.target.closest?.('svg.ss-map'); if (svg?._dragged) { e.stopPropagation(); e.preventDefault(); } }, true);
// 휠 확대: 문서 전체에 막는(passive:false) 휠 리스너를 걸면 브라우저가 채팅 스크롤마다 JS를 기다려 스크롤이 버벅인다 (v2.7.7)
// → 지도 위에 마우스가 처음 올라올 때 그 지도에만 건다
document.addEventListener('pointerover', (e) => {
    const svg = e.target.closest?.('svg.ss-map'); if (!svg || svg._ssWheel) return;
    svg._ssWheel = true;
    svg.addEventListener('wheel', mapWheel, { passive: false });
}, { passive: true });
function mapWheel(e) {
    const svg = e.currentTarget;
    e.preventDefault();
    const r = svg.getBoundingClientRect(), vb = svgBox(svg);
    const cx = vb[0] + ((e.clientX - r.left) / r.width) * vb[2], cy = vb[1] + ((e.clientY - r.top) / r.height) * vb[3];
    keepBox(svg, zoomBox(vb, e.deltaY > 0 ? 1.2 : 1 / 1.2, cx, cy));
}

export function sellPrice(s, name) {
    if (!modOn('shop') || !s.data.shop) return 0;
    for (const sh of s.data.shop.shops) { const it = findBy(sh.items, name); if (it && norm(it.name) === norm(name)) return Math.floor(it.price / 2); }
    return 0;
}

// ───── 관리 ─────
export const GROUPS = [
    { id: 'home', name: '홈', icon: 'fa-house', tabs: ['home', 'music', 'album', 'record'] },
    { id: 'me', name: '나', icon: 'fa-user', tabs: ['profile', 'stats', 'dice', 'wallet', 'fate', 'ach', 'memo', 'custom'] },
    { id: 'world', name: '세계', icon: 'fa-earth-asia', tabs: ['map', 'calendar', 'shop', 'base'] },
    { id: 'people', name: '사람', icon: 'fa-user-group', tabs: ['rel', 'contact'] },
    { id: 'feed', name: '소식', icon: 'fa-bullhorn', tabs: ['quest', 'news', 'gossip', 'board', 'sns'] },
    { id: 'manage', name: '관리', icon: 'fa-sliders', tabs: ['manage'] },
];
// 칸(데이터)이 아닌 탭 — 늘 켜져 있고 편집 도구가 없다
export const PSEUDO = new Set(['home', 'manage', 'album', 'record']);
const PSEUDO_INFO = { home: { name: '홈', icon: 'fa-house' }, manage: { name: '관리', icon: 'fa-sliders' }, album: { name: '추억 앨범', icon: 'fa-star' }, record: { name: '플레이 기록', icon: 'fa-chart-simple' } };
export const TAB_MOD = (tab) => (tab === 'base' ? 'home' : tab === 'home' ? 'core' : tab);
export const TAB_INFO = (tab) => (PSEUDO_INFO[tab] ?? (tab === 'base' ? MOD.home : MOD[tab]) ?? { name: tab, icon: 'fa-circle' });

export function manageHTML(s, ui = {}) {
    const meta = getMeta();
    const st = settings();
    return `${sec('난이도', `${seg(Object.entries(DIFFS).map(([k, v]) => [k, `<i class="fa-solid ${v.icon}"></i> ${v.name}`]), diffOf(), 'diff')}<p class="ss-hint">${esc(DIFFS[diffOf()].desc)}</p>`)}
        ${sec('일시정지', `<div class="ss-row-btns"><button class="ss-btn ${meta.paused ? 'pri' : ''}" data-act="pause"><i class="fa-solid ${meta.paused ? 'fa-play' : 'fa-pause'}"></i> ${meta.paused ? '재개하기' : '일시정지'}</button><button class="ss-btn ghost" data-act="skiponce" ${meta.skipOnce ? 'disabled' : ''}><i class="fa-solid fa-forward"></i> ${meta.skipOnce ? '다음 1번 건너뜀 예약됨' : '다음 1번만 건너뛰기'}</button></div>
            <p class="ss-hint">퀵리플라이·OOC·잡담할 때 눌러 두면 AI에게 상태창을 보내지 않고 &lt;meatball&gt;도 요구하지 않아요. ${st.oocDetect ? 'OOC 자동 감지 켜짐 · ' : ''}${st.skipQuiet ? '조용한 생성(/gen 등) 자동 제외 켜짐' : ''}</p>`)}
        ${sec('쓸 기능 <small>끈 기능은 데이터는 남고 AI에게만 안 보내요</small>', GROUPS.filter(g => g.id !== 'manage').map(g => ({ ...g, tabs: g.tabs.filter(t => !PSEUDO.has(t) && MOD[TAB_MOD(t)]) })).filter(g => g.tabs.length).map(g => `<div class="ss-modgrp"><small>${g.name}</small><div class="ss-mods">${g.tabs.map(t => MOD[TAB_MOD(t)]).map(m => { const gOff = GLOBAL_OFF[m.id] && st[GLOBAL_OFF[m.id]] === false; return `<label class="ss-mod ${meta.mods?.[m.id] === false || gOff ? '' : 'on'}" ${gOff ? 'title="확장 설정 › 기능 켜고 끄기에서 모든 채팅에 꺼 둔 칸이에요"' : ''}><input type="checkbox" class="ss-switch" data-chg="mod" data-arg="${m.id}" ${meta.mods?.[m.id] === false || gOff ? '' : 'checked'} ${gOff ? 'disabled' : ''}>
            <i class="fa-solid ${m.icon}"></i><span><b>${m.name}</b><small>${gOff ? '모든 채팅에서 꺼 둠 — 확장 설정 › 기능 켜고 끄기' : m.desc}</small></span>${gOff ? '' : s.data[m.id] ? '' : '<em>비어 있음</em>'}</label>`; }).join('')}</div></div>`).join(''))}
        ${(() => { const p = playOf(meta); return sec('<i class="fa-solid fa-masks-theater"></i> 플레이 방식', `${seg(Object.entries(PLAY_MODES).map(([k, v]) => [k, `<i class="fa-solid ${v.icon}"></i> ${v.name}`]), p.mode, 'playmode', 'class="ss-seg wrap"')}
            <p class="ss-hint">${esc(PLAY_MODES[p.mode].desc)}</p>
            ${p.mode === 'director' ? `<label class="ss-f wide"><span>주인공 (상태창의 「나」 — 돈·수치·관계를 이 사람 기준으로)</span><input class="ss-in" data-chg="playhero" value="${esc(p.hero)}" placeholder="예: 서이현"></label>` : ''}
            <label class="ss-tog"><input type="checkbox" class="ss-switch" data-chg="playworld" ${p.cardIsWorld ? 'checked' : ''}><span>카드 이름이 캐릭터가 아니라 세계관·봇 이름이에요</span></label>
            ${p.cast.length ? `<p class="ss-hint">등장인물: ${p.cast.map(esc).join(', ')}</p>` : ''}
            <div class="ss-row-btns"><button class="ss-btn sm" data-act="playauto">${ai1} 자동으로 알아보고 맞추기</button></div>`); })()}
        ${modOn('profile') ? sec('프로필 모드', seg([['minimal', '최소 — 카드·로어북 그대로'], ['detailed', '상세 — 이 시트로만']], s.data.profile?.mode ?? 'minimal', 'pmode', 'class="ss-seg wrap"')) : ''}
        ${sec('되돌리기', `<div class="ss-row-btns"><button class="ss-btn" data-act="undo" ${meta.adjust?.length ? '' : 'disabled'}><i class="fa-solid fa-rotate-left"></i> 마지막 편집 되돌리기</button></div><p class="ss-hint">${meta.adjust?.length ? `마지막: ${esc(meta.adjust.at(-1).label || '(이름 없는 편집)')}` : '되돌릴 편집이 없어요.'} · 상태창에서 직접 한 편집·구매·연락만 되돌려요 (AI 답의 변화는 ✏️ 칩으로).</p><details class="ss-more ss-undolist" ${ui?.undoOpen ? 'open' : ''}><summary>편집 기록 — 골라서 지우기 <small>(최근 ${Math.min(40, (meta.adjust ?? []).length)}개 · 버튼 하나 누른 것까지 모두)</small></summary>${(meta.adjust ?? []).slice(-40).reverse().map(a => `<div class="ss-undo-row"><span>${esc(short(adjName(a), 60))}${a.silent || !a.label ? ' <small class="ss-dim">(조용한 기록)</small>' : ''}</span><small class="ss-dim">${a.at}번 뒤</small><button class="ss-btn sm ghost" data-act="undoat" data-arg="${a.t}" title="이 기록 하나만 지우기 — 그 편집이 없던 일이 돼요"><i class="fa-solid fa-trash-can"></i></button></div>`).join('') || '<p class="ss-hint">지울 기록이 없어요.</p>'}<p class="ss-hint">지우면 그 편집이 <b>없던 일</b>이 돼요 (상태 · 알림 · AI에게 가는 「방금 한 일」 줄까지 · 찌꺼기 없이). 그 뒤의 기록은 그대로 다시 계산돼요. AI 답에서 바뀐 건 여기 없어요 — 그 답 밑 칩의 ✏️로 고쳐요. 칸 하나를 통째로 비우려면 그 탭 위의 🧹.</p></details>`)}
        ${sec('<i class="fa-solid fa-floppy-disk"></i> 세이브', slotsHTML(meta))}
        ${sec('<i class="fa-solid fa-shield-heart"></i> 백업 · 카드', `<div class="ss-grid-btns">
            <button class="ss-btn" data-act="fullbackup"><i class="fa-solid fa-box-archive"></i> 전체 백업 (파일)</button>
            <button class="ss-btn" data-act="filerestore"><i class="fa-solid fa-box-open"></i> 백업 · 파일 불러오기</button>
            <button class="ss-btn" data-act="cardattach"><i class="fa-solid fa-id-card-clip"></i> ${cardPack() ? '카드에 다시 붙이기' : '카드에 상태창 붙이기'}</button>
            ${cardPack() ? '<button class="ss-btn ghost" data-act="carddetach"><i class="fa-solid fa-link-slash"></i> 카드에서 떼기</button>' : ''}
            <button class="ss-btn" data-act="export"><i class="fa-solid fa-file-export"></i> 템플릿 내보내기</button>
        </div><p class="ss-hint">전체 백업 = 기록·세이브·앨범까지 이 채팅의 상태창 전부${meta.lastBackup ? ` (마지막 백업 ${new Date(meta.lastBackup).toLocaleDateString('ko-KR')})` : ''} · 템플릿 = 지금 상태만 (다른 채팅·다른 사람용) · 카드에 붙이면 그 카드로 새 채팅을 열 때 바로 불러올 수 있어요${cardPack() ? ' — <b>지금 이 카드에 붙어 있어요 ✔</b>' : ''}.</p>`)}
        ${sec('<i class="fa-solid fa-clapperboard"></i> 2회차', `<div class="ss-row-btns"><button class="ss-btn" data-act="carryprep"><i class="fa-solid fa-forward"></i> 2회차 준비</button>${carryFor() ? '<span class="ss-chip hi">준비됨 — 새 채팅에서 시작</span>' : ''}</div><p class="ss-hint">업적·엔딩·소지품 일부를 이어받아 같은 캐릭터 새 채팅에서 다시 시작해요.${meta.round > 1 ? ` 지금 ${meta.round}회차.` : ''}</p>`)}
        ${sec('<i class="fa-solid fa-robot"></i> 모델 맞춤 설정 <small>한 번에 바꾸기</small>', `${presetHTML()}<p class="ss-hint">세부 설정은 확장 설정 서랍에서 바꿀 수 있어요.</p>`)}
        ${sec('<i class="fa-solid fa-stethoscope"></i> 문제 해결', `<div class="ss-row-btns"><button class="ss-btn" data-act="diagnose"><i class="fa-solid fa-stethoscope"></i> 자가 진단 · 고치기</button><button class="ss-btn" data-act="pipcheck"><i class="fa-solid fa-magnifying-glass"></i> 마지막 답 칩 점검</button><button class="ss-btn" data-act="copydump"><i class="fa-solid fa-clipboard"></i> 지금 상태 복사</button><button class="ss-btn" data-act="perf"><i class="fa-solid fa-gauge-simple-high"></i> 부하 재기</button></div><p class="ss-hint">창이 안 뜨거나 숫자가 이상할 때 눌러 주세요. 망가진 기록을 찾아 고쳐요 (AI 호출 없음).</p>`)}
        ${sec('전체', `<div class="ss-grid-btns">
            <button class="ss-btn" data-act="wizard"><i class="fa-solid fa-wand-magic-sparkles"></i> 처음부터 다시 만들기</button>
            <button class="ss-btn" data-act="fillempty">${ai1} 비어 있는 칸 채우기</button>
            <button class="ss-btn" data-act="prompts"><i class="fa-solid fa-scroll"></i> 프롬프트 · 토큰</button>
            <button class="ss-btn" data-act="themewin"><i class="fa-solid fa-palette"></i> 꾸미기</button>
            <button class="ss-btn" data-act="trsheet"><i class="fa-solid fa-language"></i> 상태창 전체 번역</button>
            <button class="ss-btn" data-act="chatoff"><i class="fa-solid fa-power-off"></i> 이 채팅에서 끄기</button>
            <button class="ss-btn danger" data-act="reset"><i class="fa-solid fa-trash-can"></i> 이 채팅 상태창 삭제</button>
        </div>`)}
        <div class="ss-hint">기록 ${meta.adjust?.length ?? 0}개 · 기준 메시지 #${meta.startAt} · 세이브 ${meta.saves?.length ?? 0} · 앨범 ${meta.album?.length ?? 0} · v${VERSION}</div>`;
}

// 편집 기록 이름: 라벨이 없는 조용한 기록(주사위 · 좋아요 · 읽음 같은 것)도 무엇인지 알 수 있게 (v2.7.18)
const OP_NAME = { _roll: '🎲 주사위 굴림', _read: '💬 읽음 표시', _nread: '📰 기사 읽음', _peekday: '💗 속마음 엿보기', _memo: '📝 메모', _achtog: '🏆 업적', _travel: '🗺 이동', _trash: '🗑 버림', _purge: '🗑 완전 삭제', _restore: '↩ 되살림', _tostore: '📦 보관', _tobag: '🎒 꺼냄', _unplace: '🪑 치움', _sellused: '💸 중고 판매', _loan: '🏦 대출', _repay: '🏦 상환', _questpay: '📜 보상', _draw: '🃏 카드', _effect: '✨ 효과', _bond: '💍 연인 확정', _unbond: '💔 확정 취소', _nolove: '💗 애정 끔', _love: '💗 애정 켬', _leave: '🕊 빠짐' };
function adjName(a) {
    if (a.label) return a.label;
    if (a.set) return `${MOD[a.set.mod]?.name ?? a.set.mod} 칸 바뀜`;
    const ks = [...new Set((a.ops ?? []).map(([k]) => OP_NAME[k] ?? k))];
    if (a.ops?.[0]?.[0] === '_roll') { try { const r = JSON.parse(a.ops[0][1]); return `🎲 ${r.label} — ${r.res}`; } catch { /* */ } }
    return ks.join(' · ') || '(이름 없는 편집)';
}

// ───── 동작 (칸 공통) ─────
export const VIEW_ACTIONS = {
    bar: (el, arg) => { const [n, v] = splitBar(arg); return addAdjust({ ops: [['stat', `${n} ${v}`]], label: `${n} ${v}` }); },
    uncond: (el, arg) => addAdjust({ ops: [['cond', `-${arg}`]], label: `상태 해제: ${arg}` }),
    cashedit: async (el, arg, btn, s) => {
        const v = await askInput(TITLE, `소지금 (${esc(s.data.wallet.currency)}) — "+500", "-200" 또는 숫자`, String(s.data.wallet.cash));
        if (v === null) return; const p = parseNum(v); if (!p) return;
        return addAdjust({ ops: [['cash', p.mode === 'add' ? String(v) : `=${p.v}`]], label: `소지금 ${p.mode === 'add' ? v : `→ ${p.v}`}` });
    },
    use: (el, arg) => { insertInput(`(${arg}을(를) 사용한다)`); closeIfPopup(el); },
    dec: (el, arg) => addAdjust({ ops: [['item', `-${arg} 1|`]], label: `${arg} 1개 버림` }),
    sell: (el, arg, btn, s) => { const p = sellPrice(s, arg); return addAdjust({ ops: [['item', `-${arg} 1|`], ['cash', `+${p}`]], label: `${arg} 판매 +${p} ${s.data.wallet.currency}` }); },
    shoptab: (el, arg) => { el._ss.ui.shop = Number(arg); app.renderPanel(el); },
    undoat: async (el, arg) => {
        const t = Number(arg); const a = getMeta()?.adjust?.find(e => e.t === t); if (!a) return;
        if (!(await askConfirm(`「${esc(adjName(a))}」 기록을 지울까요? 이 편집이 없던 일이 돼요. 그 뒤의 편집은 그대로예요.`))) return;
        el._ss.ui.undoOpen = true;
        await undoAt(t); toastr.success('지웠어요.', TITLE);
    },
    haggle: async (el, arg, btn, s) => { // 🎲 흥정 (v2.7.6): 매력 · 화술 같은 능력치로 d20 — 하루에 물건마다 한 번
        const [i, j] = arg.split('|').map(Number);
        const sh = s.data.shop.shops[i], it = sh?.items[j]; if (!it) return;
        const meta = getMeta(true), day = s.data.calendar ? dayIndex(s.data.calendar) : s.turn, key = `${day}|${i}|${j}`;
        if (meta.haggle?.[key]) { toastr.info('오늘은 이 물건을 이미 흥정했어요.', TITLE); return; }
        const r = skillRoll(s, SOCIAL_RE, 12);
        const mul = { crit: 0.7, ok: 0.85, fail: 1, fumble: 1.1 }[r.cls];
        meta.haggle = Object.fromEntries(Object.entries(meta.haggle ?? {}).filter(([k]) => k.startsWith(`${day}|`)));
        meta.haggle[key] = mul;
        await saveMeta(); app.refreshNow?.(); app.renderPanel(el);
        const msg = { crit: '🌟 대성공 — 30% 깎았어요!', ok: '✅ 성공 — 15% 깎았어요.', fail: '😅 실패 — 값은 그대로예요.', fumble: '💥 대실패 — 기분이 상해서 10% 올랐어요…' }[r.cls];
        toastr[r.cls === 'fumble' ? 'warning' : 'info'](`${esc(it.name)}: ${msg}<br><small>${esc(r.attr ? `${r.attr} · ` : '')}${esc(r.detail)}</small>`, TITLE, { escapeHtml: false });
    },
    buy: async (el, arg, btn, s) => {
        const [i, j] = arg.split('|').map(Number);
        const sh = s.data.shop.shops[i], it = sh?.items[j]; if (!it) return;
        const w = s.data.wallet;
        const price = Math.round(it.price * priceMul(s) * haggleMul(s, i, j));
        if (w && w.cash < price) { toastr.warning('돈이 모자라요.', TITLE); return; }
        const ops = [['cash', `-${price}`]];
        if (it.kind === 'deco' && modOn('home')) ops.push(['decor', `+${it.name}`]); else ops.push(['item', `+${it.name} 1|${it.desc ? ` ${it.desc}` : ''}`]);
        if (it.stock > 0) { const nd = clone(s.data.shop); nd.shops[i].items[j].stock--; await addAdjust({ set: { mod: 'shop', data: nd }, silent: true }); }
        await addAdjust({ ops, label: `${sh.name}에서 ${it.name} 구매 (−${fmtNum(price)} ${w?.currency ?? ''})` });
        toastr.success(`${esc(it.name)} 구매!`, TITLE);
    },
    unplace: (el, arg) => addAdjust({ ops: [['_unplace', arg]], label: `${arg}을(를) 창고로` }),
    trashit: async (el, arg) => { if (!(await askConfirm(`「${esc(arg)}」을(를) 쓰레기통에 버릴까요? (되살릴 수 있어요)`))) return; return addAdjust({ ops: [['_trash', arg]], label: `${arg}을(를) 버렸다` }); },
    purge: async (el, arg) => {
        if (!(await askConfirm(`「${esc(arg)}」을(를) 완전히 지울까요? 되살릴 수 없어요.<br><small>쓰레기통·하루 기록에서도 사라지고, AI에게도 알리지 않아요.</small>`))) return;
        if (await purgeTrash([arg])) toastr.info(`「${esc(arg)}」을(를) 완전히 지웠어요.`, TITLE);
    },
    purgeall: async () => {
        const tr = app.current?.state?.data?.home?.trash ?? [];
        if (!tr.length || !(await askConfirm(`쓰레기통 ${tr.length}개를 모두 완전히 지울까요? 되살릴 수 없어요.`))) return;
        const n = await purgeTrash(tr.map(t => t.name));
        toastr.info(`${n}개를 완전히 지웠어요.`, TITLE);
    },
    tobag: (el, arg) => addAdjust({ ops: [['_tobag', arg]], label: `${arg}을(를) 창고에서 꺼내 챙겼다` }),
    restore: (el, arg) => addAdjust({ ops: [['_restore', arg]], label: `${arg}을(를) 쓰레기통에서 꺼냈다` }),
    sellused: async (el, arg, btn, s) => {
        const cur = s.data.wallet?.currency ?? '';
        const { base, price, how } = usedPrice(s, arg);
        if (!(await askConfirm(`「${esc(arg)}」을(를) 중고장터에 <b>${fmtNum(price)} ${esc(cur)}</b>에 팔까요?<br><small>${esc(how)}${base ? ` · 새것 ${fmtNum(base)}` : ''} — 헐값이에요 😭</small>`))) return;
        return addAdjust({ ops: [['_sellused', `${arg}|${price}`]], label: `${arg}을(를) 중고로 팔았다 +${fmtNum(price)} ${cur}` });
    },
    setweather: async (el, arg, btn, s) => {
        const v = await askInput(TITLE, '오늘 날씨 (예: 🌧 비, ❄️ 눈, ☀️ 맑음)', s.data.calendar?.weather ?? '');
        if (v === null) return;
        return addAdjust({ ops: [['weather', v.trim() || '☀️ 맑음']], label: `날씨 → ${v.trim()}` });
    },
    selplace: (el, arg) => { el._ss.ui.place = arg; app.renderPanel(el); },
    maparea: (el, arg) => { el._ss.ui.mapArea = arg || null; el._ss.ui.mapVB = null; app.renderPanel(el); },
    mapzoom: (el, arg, btn, s) => {
        const ui = el._ss.ui, svg = el.querySelector('svg.ss-map'); if (!svg) return;
        const vb = svgBox(svg);
        if (arg === 'fit') ui.mapVB = null;
        else if (arg === 'here') { const p = layoutPlaces(s.data.map.places).get(findBy(s.data.map.places, s.data.map.here)?.name); ui.mapVB = p ? [p.x - 25, p.y - 25, 50, 50] : null; ui.place = s.data.map.here; }
        else ui.mapVB = zoomBox(vb, arg === 'in' ? 1 / 1.4 : 1.4);
        app.renderPanel(el);
    },
    travel: (el, arg, btn, s) => {
        const p = findBy(s.data.map.places, arg); if (!p) return;
        const w = s.data.wallet;
        if (p.fare && w && w.cash < p.fare) { toastr.warning('요금이 모자라요.', TITLE); return; }
        el._ss.ui.place = p.name;
        return addAdjust({ ops: [['_travel', p.name]], label: `${p.name}(으)로 이동했다${p.fare ? ` (−${fmtNum(p.fare)} ${w?.currency ?? ''})` : ''}` });
    },
    goto: (el, arg) => { insertInput(`(${arg}(으)로 이동한다)`); closeIfPopup(el); },
    setloc: (el, arg) => addAdjust({ ops: [['loc', arg]], label: `위치 → ${arg}` }),
    calnav: (el, arg, btn, s) => {
        const c = s.data.calendar, ui = el._ss.ui; ui.cal ??= { y: c.y, m: c.m };
        if (Number(arg) === 0) { ui.cal = { y: c.y, m: c.m }; ui.day = null; app.renderPanel(el); return; }
        ui.cal.m += Number(arg); if (ui.cal.m < 1) { ui.cal.m = c.months.length; ui.cal.y--; } if (ui.cal.m > c.months.length) { ui.cal.m = 1; ui.cal.y++; }
        ui.day = null; app.renderPanel(el);
    },
    calday: (el, arg) => { el._ss.ui.day = arg ? Number(arg) : null; app.renderPanel(el); },
    // ↶ 방금 넘긴 시간 · 날짜 되돌리기 (v2.7.18) — 가장 최근 편집이 시간 넘기기일 때만
    timeundo: async () => {
        const a = (getMeta()?.adjust ?? []).at(-1);
        if (!a || a.set || !a.ops?.length || !a.ops.every(([k]) => ['date', 'time', 'weather'].includes(k))) { toastr.info('되돌릴 시간 넘기기가 없어요.', TITLE); return; }
        await undoAt(a.t); toastr.success(`되돌렸어요: ${esc(a.label || '시간')}`, TITLE);
    },
    delevent: async (el, arg, btn, s) => {
        const [m, d, ...t] = String(arg).split('|'); const title = t.join('|');
        const nd = clone(s.data.calendar); const k = nd.events.findIndex(e => e.m === Number(m) && e.d === Number(d) && e.title === title); if (k < 0) return;
        nd.events.splice(k, 1);
        await commit('calendar', nd, '');
    },
    dayplus: () => addAdjust({ ops: [['date', '+1']], label: '하루가 지났다' }),
    timenext: (el, arg, btn, s) => { const t = nextTime(s.data.calendar); return addAdjust({ ops: [['time', t]], label: `시간 → ${t}` }); },
    jumpday: (el) => { const ui = el._ss.ui; return addAdjust({ ops: [['date', `${ui.cal.y}년 ${ui.cal.m}월 ${ui.day}일`]], label: `날짜 → ${ui.cal.m}/${ui.day}` }); },
    addevent: async (el, arg, btn, s) => {
        const ui = el._ss.ui; const title = el.querySelector('.ss-ev-title').value.trim(); if (!title) return;
        const yearly = el.querySelector('.ss-ev-year').checked;
        const nd = clone(s.data.calendar);
        nd.events.push({ y: yearly ? null : ui.cal.y, m: ui.cal.m, d: ui.day, title, desc: '', repeat: yearly ? 'yearly' : 'once' });
        await commit('calendar', nd, `일정 추가: ${title}`);
    },
    // 빈 달력에 장르 기본 일정 넣기 (v2.7.19 · AI 0회) — 이미 있는 일정은 그대로, 같은 날 같은 제목은 안 겹치게
    calfill: async (el, arg, btn, s) => {
        const nd = clone(s.data.calendar);
        const { skeleton } = await import('./skeleton.js');
        const ev = (skeleton('calendar', s.core?.genre ?? '')?.events ?? []).filter(e => nd.months?.[e.m - 1] && e.d <= nd.months[e.m - 1].days && !nd.events.some(x => x.m === e.m && x.d === e.d && x.title === e.title));
        if (!ev.length) return toastr.info('넣을 기본 일정이 없어요.', TITLE);
        nd.events.push(...ev);
        await commit('calendar', nd, `📅 기본 일정 ${ev.length}개 넣기`);
        toastr.success(`매년 돌아오는 기본 일정 ${ev.length}개를 넣었어요. 날짜를 눌러 지울 수 있어요.`, TITLE);
    },
    achtog: async (el, arg, btn, s) => {
        const a = findBy(s.data.ach.list, arg);
        if (!a || !(await askConfirm(a.done ? `「${esc(a.name)}」 달성을 취소할까요?` : `「${esc(a.name)}」을(를) 달성 처리할까요?`))) return;
        return addAdjust({ ops: [['_achtog', a.name]], label: a.done ? '' : `🏆 업적 달성: ${a.name}` });
    },
    memoadd: (el) => { const t = el.querySelector('.ss-memo-in').value.trim(); if (t) return addAdjust({ ops: [['_memo', `add|${t.replace(/\|/g, '/')}`]], silent: true }); },
    memodel: (el, arg) => addAdjust({ ops: [['_memo', `del|${arg}`]], silent: true }),
    memotog: (el, arg) => addAdjust({ ops: [['_memo', `tog|${arg}`]], silent: true }),
    undo: async () => app.undoLast?.(),
    copydump: () => app.copyDump?.(),
    diff: async (el, arg) => { const meta = getMeta(true); meta.difficulty = arg; await saveMeta(); app.refreshNow(); toastr.info(`난이도: ${DIFFS[arg].name}`, TITLE); },
    pmode: async (el, arg, btn, s) => { const nd = clone(s.data.profile ?? EMPTY.profile()); nd.mode = arg; await commit('profile', nd, ''); },
    playmode: async (el, arg) => { const meta = getMeta(true); meta.play = normPlay({ ...playOf(meta), mode: arg }); await saveMeta(); app.refreshNow(); },
    playauto: async (el, arg, btn, s) => {
        busyBtn(btn, true, '알아보는 중…');
        let r;
        try { r = await detectPlay(); } catch (e) { busyBtn(btn, false); toastr.error(`알아보지 못했어요: ${esc(e.message)}`, TITLE); return; }
        busyBtn(btn, false);
        const box = document.createElement('div');
        box.className = 'ss-root ss-scope';
        box.innerHTML = `<div class="ss-wz-head"><i class="fa-solid fa-masks-theater"></i><div><b>이렇게 노는 것 같아요</b><small>${esc(r.why)}</small></div></div>
            <div class="ss-card"><b>${esc(PLAY_MODES[r.mode].name)}</b> — ${esc(PLAY_MODES[r.mode].desc)}${r.mode === 'director' && r.hero ? `<br>주인공: <b>${esc(r.hero)}</b>` : ''}${r.cardIsWorld ? '<br>카드 이름 = 세계관·봇 이름' : ''}${r.cast.length ? `<br><small class="ss-dim">등장인물: ${r.cast.map(esc).join(', ')}</small>` : ''}</div>
            <label class="ss-tog"><input type="checkbox" class="ss-switch ss-refit" ${s && (s.data.rel || s.data.profile) ? 'checked' : ''}><span>관계 · 프로필도 이 방식에 맞게 고치기 (AI ${['rel', 'profile'].filter(m => s?.data[m]).length}회 · 바뀌는 내용은 바로 적용)</span></label>`;
        if (!(await confirmPopup(box, '적용', '취소'))) return;
        const meta = getMeta(true);
        meta.play = normPlay(r);
        await saveMeta(); app.refreshNow();
        toastr.success(`플레이 방식: ${PLAY_MODES[r.mode].name}`, TITLE);
        if (!box.querySelector('.ss-refit')?.checked) return;
        const ins = r.mode === 'director' ? `플레이 방식이 풀사칭(유저는 디렉터)이에요. 유저는 이 세계에 없어요. 주인공은 ${r.hero || '주요 인물'}이에요. 프로필에서 role "user"는 주인공으로, 관계의 "user" 목록은 주인공과 다른 인물의 관계로 바꾸고, 디렉터(유저) 자신은 빼 주세요.${r.cardIsWorld ? ' 카드 이름은 세계관 이름이라 인물이 아니에요 — 그 이름의 인물이 있으면 빼 주세요.' : ''}`
            : r.mode === 'multi' ? `다인봇이에요. 등장인물(${r.cast.join(', ') || '카드·로어북에 나오는 사람들'})마다 따로 프로필·관계를 만들어 주세요.${r.cardIsWorld ? ' 카드 이름은 세계관 이름이라 인물이 아니에요 — 그 이름의 인물이 있으면 빼 주세요.' : ''}`
                : `1:1 롤플이에요.${r.cardIsWorld ? ' 카드 이름은 세계관 이름이라 인물이 아니에요 — 그 이름의 인물이 있으면 빼 주세요.' : ''}`;
        for (const m of ['rel', 'profile']) {
            if (!app.current?.state.data[m]) continue;
            try { const after = await instructModule(m, ins, app.current.state); await commit(m, after, `🎭 ${MOD[m].name}: 플레이 방식에 맞춤`); }
            catch (e) { toastr.error(`${MOD[m].name} 맞추기 실패: ${esc(e.message)}`, TITLE); }
        }
        toastr.success('관계 · 프로필도 맞췄어요. 마음에 안 들면 관리 › 되돌리기.', TITLE);
    },
    helpcardoff: () => { settings().helpCardOff = true; saveSettings(); app.rerenderPanels?.(true); },
    newv5off: async () => { const meta = getMeta(); if (meta) { delete meta.newV5; await saveMeta(); app.refreshNow(); } },
    ...SNS_ACTIONS, ...MUSIC_ACTIONS, ...CUSTOM_ACTIONS, ...REL_ACTIONS, ...ACH_ACTIONS, ...ALBUM_ACTIONS,
};
export const VIEW_CHANGES = {
    place: (el, t, s) => { if (!t.value) return; const nm = s.data.home.storage[Number(t.dataset.arg)]; return addAdjust({ ops: [['decor', `+${nm} | ${t.value}`]], label: `${t.value}에 ${nm} 배치` }); },
    mod: async (el, t) => { const meta = getMeta(true); meta.mods[t.dataset.arg] = t.checked; await saveMeta(); app.refreshNow(); },
    memotog: (el, t) => addAdjust({ ops: [['_memo', `tog|${t.dataset.arg}`]], silent: true }),
    ...MUSIC_CHANGES,
    playhero: async (el, t) => { const meta = getMeta(true); meta.play = normPlay({ ...playOf(meta), hero: t.value }); await saveMeta(); app.refreshNow(); },
    playworld: async (el, t) => { const meta = getMeta(true); meta.play = normPlay({ ...playOf(meta), cardIsWorld: t.checked }); await saveMeta(); app.refreshNow(); },
};
export { MODS, MOD_IDS, ctx, stamp, CONTACT_MODES };
