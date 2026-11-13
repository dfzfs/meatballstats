// 칸별 화면 · 대시보드 · 관리 · 미니 위젯
import {
    app, ctx, settings, getMeta, saveMeta, modOn, MODS, MOD, MOD_IDS, DIFFS, diffOf, esc, short, clamp, norm, findBy, fmtNum, clone, splitBar, parseNum,
    dateStr, dateShort, dayIndex, eventsOn, nextTime, upcoming, userName, TITLE, VERSION, EMPTY, CONTACT_MODES, stamp,
} from './core.js';
import { addAdjust, commit, unreadCount, dueLetters, inTransit, priceMul, peopleAt, hopsBetween, whereNow, seasonOf, SEASON_NAME } from './engine.js';
import { walletView } from './money.js';
import { fateView } from './fate.js';
import { gauge, meter, sec, emptyBox, chip, avatar, ai1, seg, insertInput, closeIfPopup, askInput, askConfirm } from './kit.js';
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
    bars: { name: '게이지', on: (d) => d.stats?.bars.length, html: (s) => `<div class="ss-mini-bars">${s.data.stats.bars.slice(0, 4).map(b => gauge(b, true)).join('')}</div>`, tab: 'stats' },
    date: { name: '날짜 · 시간', on: (d) => d.calendar, html: (s) => { const c = s.data.calendar; const ev = eventsOn(c, c.y, c.m, c.d); return `<div class="ss-mini-line"><i class="fa-solid fa-calendar-day"></i><span>${esc(dateShort(c))} · <b>${esc(c.time)}</b>${c.weather ? ` · ${esc(c.weather)}` : ''}${ev.length ? ` · <em>${esc(ev[0].title)}</em>` : ''}</span></div>`; }, tab: 'calendar' },
    loc: { name: '위치', on: (d) => d.map?.here, html: (s) => `<div class="ss-mini-line"><i class="fa-solid fa-location-dot"></i><span>${esc(s.data.map.here)}</span></div>`, tab: 'map' },
    cash: { name: '돈', on: (d) => d.wallet, html: (s) => `<div class="ss-mini-line"><i class="fa-solid fa-coins"></i><span><b>${fmtNum(s.data.wallet.cash)}</b> ${esc(s.data.wallet.currency)}</span></div>`, tab: 'wallet' },
    contact: { name: '연락', on: (d) => d.contact, html: (s) => { const n = unreadCount(s); const tr = inTransit(s).length; return `<div class="ss-mini-line ${n ? 'alert' : ''}"><i class="fa-solid ${s.data.contact.mode === 'letter' ? 'fa-envelope' : 'fa-comment'}"></i><span>${n ? `<b>새 ${s.data.contact.mode === 'letter' ? '편지' : '메시지'} ${n}</b>` : `${esc(s.data.contact.app)}`}${tr ? ` · 배달 중 ${tr}` : ''}</span></div>`; }, tab: 'contact' },
    quest: { name: '퀘스트', on: (d) => d.quest?.list.some(q => q.status === 'active'), html: (s) => `<div class="ss-mini-quests">${s.data.quest.list.filter(q => q.status === 'active').slice(0, 3).map(q => `<div class="ss-mini-line"><i class="fa-solid fa-scroll"></i><span>${esc(short(q.title, 26))}</span></div>`).join('')}</div>`, tab: 'quest' },
    rel: { name: '관계 TOP 3', on: (d) => d.rel?.user.length, html: (s) => `<div class="ss-mini-rel">${[...s.data.rel.user].sort((a, b) => b.aff - a.aff).slice(0, 3).map(r => `<div>${avatar(r.name, 'xs')}<span>${esc(r.name)}</span><b class="${r.aff < 0 ? 'neg' : 'love'}">♥ ${r.aff}</b></div>`).join('')}</div>`, tab: 'rel' },
    cond: { name: '상태 이상', on: (d) => d.stats?.conds.length, html: (s) => `<div class="ss-chips">${s.data.stats.conds.slice(0, 5).map(c => chip(esc(c.name), 'warn')).join('')}</div>`, tab: 'stats' },
    news: { name: '최신 뉴스', on: (d) => d.news?.items.length, html: (s) => `<div class="ss-mini-line"><i class="fa-solid fa-newspaper"></i><span>${esc(short(s.data.news.items.at(-1).title, 34))}</span></div>`, tab: 'news' },
    fate: { name: '저주 · 빚', on: (d) => d.fate?.curses.length || d.wallet?.loans.some(l => l.status === 'open' || l.status === 'late'), html: (s) => { const cs = s.data.fate?.curses ?? []; const debt = (s.data.wallet?.loans ?? []).filter(l => l.status === 'open' || l.status === 'late'); return `<div class="ss-mini-line ${debt.some(l => l.status === 'late') ? 'alert' : ''}"><i class="fa-solid fa-hat-wizard"></i><span>${cs.map(c => esc(c.name)).join(', ')}${cs.length && debt.length ? ' · ' : ''}${debt.length ? `빚 ${fmtNum(debt.reduce((a, l) => a + l.owed, 0))}${debt.some(l => l.status === 'late') ? ' (연체)' : ''}` : ''}</span></div>`; }, tab: 'fate' },
    diff: { name: '난이도', on: () => true, html: () => { const d = DIFFS[diffOf()]; return `<div class="ss-mini-line"><i class="fa-solid ${d.icon}"></i><span>${d.name}</span></div>`; }, tab: 'manage' },
    music: { name: '지금 BGM', on: (d) => d.music?.now, html: (s) => { const x = s.data.music.now; return `<div class="ss-mini-line"><i class="fa-solid fa-music"></i><span><b>${esc(short(x.title, 22))}</b>${x.artist ? ` · ${esc(short(x.artist, 14))}` : ''}</span><a class="ss-mini-play" href="${esc(songLink(x))}" target="_blank" rel="noopener" title="듣기"><i class="fa-solid fa-play"></i></a></div>`; }, tab: 'music' },
    custom: { name: '내 탭', on: (d) => d.custom?.tabs.some(t => t.fields.length), html: (s) => { const t = s.data.custom.tabs.find(x => x.fields.length); return `<div class="ss-mini-line"><span>${esc(t.icon)}</span><span>${t.fields.slice(0, 3).map(f => `${esc(f.k)} <b>${esc(f.type === 'text' ? short(f.v, 10) : fmtNum(f.v))}</b>`).join(' · ')}</span></div>`; }, tab: 'custom' },
};
export function miniWidgets(s, keys, clickable = true) {
    const meta = getMeta();
    const d = s.data;
    const modFor = { bars: 'stats', date: 'calendar', loc: 'map', cash: 'wallet', contact: 'contact', quest: 'quest', rel: 'rel', cond: 'stats', news: 'news', fate: 'fate', music: 'music', custom: 'custom' };
    return keys.filter(k => MINI[k] && (!modFor[k] || modOn(modFor[k], meta)) && MINI[k].on(d)).map(k => `<div class="ss-mini-w" ${clickable ? `data-act="tab" data-arg="${MINI[k].tab}"` : ''}>${MINI[k].html(s)}</div>`).join('');
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
    if (meta.newV5) alerts.push(`<div class="ss-callout new"><i class="fa-solid fa-gift"></i><div><b>v2.5 새 기능</b><span>SNS · 추천 음악 · 내 탭이 생겼어요. 관리 → 쓸 기능에서 켤 수 있어요.</span></div><button class="ss-btn sm" data-act="tab" data-arg="manage">켜러 가기</button><button class="ss-x" data-act="newv5off" title="닫기">×</button></div>`);
    return `<div class="ss-home">
        <div class="ss-hero"><div class="ss-hero-t"><small>${esc(c.genre || '세계')}${c.canon ? ` · ${esc(c.canon)}` : ''}</small><b>${esc(c.title || '이름 없는 세계')}</b></div>
            ${c.userRole ? `<p><b>${esc(userName())}</b> — ${esc(c.userRole)}</p>` : ''}
            ${c.summary ? `<details class="ss-more" ${ui.worldOpen ? 'open' : ''}><summary>세계관 요약</summary><p class="ss-pre">${esc(c.summary)}</p>${c.rules ? `<p class="ss-pre ss-dim">${esc(c.rules)}</p>` : ''}${c.tone ? `<p class="ss-dim">톤: ${esc(c.tone)}</p>` : ''}</details>` : ''}
        </div>
        ${alerts.join('')}
        <div class="ss-home-grid">${miniWidgets(s, order)}</div>
    </div>`;
}

// ───── 칸별 화면 ─────
export const VIEW = {
    home: (s, d, ui) => homeView(s, ui),
    profile: (s, d, ui) => `<div class="ss-hint">프로필 모드: <b>${d.mode === 'detailed' ? '상세' : '최소'}</b> — ${d.mode === 'detailed' ? '이 시트가 AI에게 전달돼요' : '카드·로어북을 쓰고, 새 NPC만 전달돼요'}</div>
        <div class="ss-stack">${d.list.map((p, i) => `<details class="ss-prof" ${ui.open === i || d.list.length === 1 ? 'open' : ''}>
            <summary>${avatar(p.name)}<div class="ss-ct-b"><b>${esc(p.name)} <span class="ss-role ${p.role}">${roleName[p.role]}</span></b><small>${esc(short(p.summary, 60))}</small></div><i class="fa-solid fa-chevron-down ss-chev"></i></summary>
            <div class="ss-prof-b"><p class="ss-pre">${esc(p.summary)}</p>
            ${p.home || p.sched ? `<p class="ss-dim ss-where">${p.home ? `🏠 ${esc(p.home)}` : ''}${p.sched ? ` · 🕐 ${esc(p.sched)}` : ''}${s.data.calendar && whereNow(p, s.data.calendar) ? ` · <b>지금: ${esc(whereNow(p, s.data.calendar))}</b>` : ''}</p>` : ''}
            ${p.fields.length ? `<dl class="ss-dl">${p.fields.map(f => `<dt>${esc(f.k)}</dt><dd class="ss-pre">${esc(f.v)}</dd>`).join('')}</dl>` : ''}
            ${modOn('contact') && p.role !== 'user' ? `<button class="ss-btn sm ghost" data-act="talk" data-arg="${esc(p.name)}"><i class="fa-solid fa-envelope"></i> 연락하기</button>` : ''}</div>
        </details>`).join('') || emptyBox('인물이 없어요', 'fa-id-card')}</div>`,
    stats: (s, d) => `${sec('게이지', `<div class="ss-stack">${d.bars.map(b => `<div class="ss-card ss-gcard">${gauge(b)}
            <div class="ss-gbtns"><button class="ss-ib t" data-act="bar" data-arg="${esc(b.name)}|-10">−10</button><button class="ss-ib t" data-act="bar" data-arg="${esc(b.name)}|-1">−1</button><button class="ss-ib t" data-act="bar" data-arg="${esc(b.name)}|+1">+1</button><button class="ss-ib t" data-act="bar" data-arg="${esc(b.name)}|+10">+10</button>${b.desc ? `<small class="ss-dim">${esc(b.desc)}</small>` : ''}</div></div>`).join('') || emptyBox('게이지가 없어요')}</div>`)}
        ${sec('능력치', `<div class="ss-attrs">${d.attrs.map(a => `<div class="ss-attr" title="${esc(a.desc)}"><span>${esc(a.name)}</span><b>${a.val >= 0 ? '+' : ''}${a.val}</b></div>`).join('') || emptyBox('능력치가 없어요')}</div>`)}
        ${sec('상태 이상 · 버프', `<div class="ss-chips">${d.conds.map(c => `<span class="ss-chip warn" title="${esc(c.desc)}">${esc(c.name)}<button class="ss-x" data-act="uncond" data-arg="${esc(c.name)}">×</button></span>`).join('') || '<span class="ss-hint">없음</span>'}</div>`)}`,
    dice: diceView,
    wallet: walletView,
    fate: fateView,
    shop: (s, d, ui) => {
        const w = s.data.wallet;
        const mul = priceMul(s), pr = (it) => Math.round(it.price * mul);
        const i0 = clamp(ui.shop ?? 0, 0, Math.max(0, d.shops.length - 1));
        const sh = d.shops[i0];
        return `${d.shops.length > 1 ? seg(d.shops.map((x, i) => [i, esc(x.name)]), i0, 'shoptab', 'class="ss-seg wrap"') : ''}
        ${sh ? `<div class="ss-shop-h"><div><b>${esc(sh.name)}</b><small>${esc(sh.desc)}${sh.place ? ` · 📍 ${esc(sh.place)}` : ''}</small></div>${w ? `<span class="ss-chip"><i class="fa-solid fa-coins"></i> ${fmtNum(w.cash)} ${esc(w.currency)}</span>` : ''}</div>
        <div class="ss-goods">${sh.items.map((it, j) => `<div class="ss-good ${it.stock === 0 ? 'out' : ''}"><div class="ss-good-b"><b>${esc(it.name)}</b>${it.kind === 'deco' ? chip('가구') : ''}${it.stock === 0 ? chip('품절', 'neg') : it.stock > 0 ? `<small>재고 ${it.stock}</small>` : ''}<small>${esc(it.desc)}</small></div>
            <div class="ss-good-a"><b class="ss-price ${mul > 1 ? 'up' : mul < 1 ? 'down' : ''}">${fmtNum(pr(it))}</b><button class="ss-btn sm pri" data-act="buy" data-arg="${i0}|${j}" ${it.stock === 0 || (w && w.cash < pr(it)) ? 'disabled' : ''}>구매</button></div></div>`).join('') || emptyBox('상품이 없어요')}</div>` : emptyBox('상점이 없어요. ✨ AI로 수정에서 "○○ 상점 추가"라고 해 보세요.', 'fa-store')}`;
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
            const o = pos.get(p.name); const here = norm(p.name) === norm(d.here); const isSel = sel && sel.name === p.name;
            const n = people ? peopleAt(s, p.name).now.length : 0;
            return `<g class="node ${here ? 'here' : ''} ${isSel ? 'sel' : ''} ${p.known ? '' : 'unk'}" data-act="selplace" data-arg="${esc(p.name)}">
                ${here ? `<circle cx="${o.x}" cy="${o.y}" r="4.6" class="ring"/>` : ''}<circle cx="${o.x}" cy="${o.y}" r="${here ? 2.4 : 1.8}" class="dot"/>
                <text x="${o.x}" y="${o.y - 3.8}">${esc(p.known ? short(p.name, 9) : '???')}</text>${n ? `<text class="ppl" x="${o.x + 2.6}" y="${o.y + 1.2}">👥${n}</text>` : ''}</g>`;
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
        return `<div class="ss-hint"><b>${esc(d.name || '지도')}</b> · 지금 <b>${esc(d.here || '-')}</b></div>
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
            cells.push(`<div class="ss-cal-c ${today ? 'today' : ''} ${ui.day === k ? 'sel' : ''} ${ev.length ? 'ev' : ''}" data-act="calday" data-arg="${k}"><span>${k}</span>${ev.length ? `<i title="${esc(ev.map(e => e.title).join(', '))}">${esc(short(ev[0].title, 5))}</i>` : ''}</div>`);
        }
        const selDay = ui.day ?? null;
        const evs = selDay ? eventsOn(d, y, m, selDay) : [];
        return `<div class="ss-today"><div><small>오늘 · ${SEASON_NAME[seasonOf(d)]}</small><b>${esc(dateStr(d))}</b><span>${esc(d.time)}${d.weather ? ` · ${esc(d.weather)}` : ''} <button class="ss-ib sm" data-act="setweather" title="날씨 바꾸기"><i class="fa-solid fa-cloud-sun"></i></button></span></div>
            <div class="ss-row-btns"><button class="ss-btn sm" data-act="timenext">${esc(nextTime(d))} <i class="fa-solid fa-forward-step"></i></button><button class="ss-btn sm" data-act="dayplus">+1일</button></div></div>
            <div class="ss-cal-head"><button class="ss-ib" data-act="calnav" data-arg="-1"><i class="fa-solid fa-chevron-left"></i></button><b>${y}년 ${esc(month.name)}</b><button class="ss-ib" data-act="calnav" data-arg="1"><i class="fa-solid fa-chevron-right"></i></button></div>
            <div class="ss-cal" style="grid-template-columns:repeat(${w},minmax(0,1fr))">${d.week.map(x => `<div class="ss-cal-w">${esc(x)}</div>`).join('')}${cells.join('')}</div>
            ${selDay ? `<div class="ss-card"><b>${esc(dateStr(d, y, m, selDay))}</b>
                ${evs.map(e => `<div class="ss-ev"><i class="fa-solid fa-circle"></i><b>${esc(e.title)}</b><small>${esc(e.desc)}${e.repeat === 'yearly' ? ' · 매년' : ''}</small></div>`).join('') || '<div class="ss-hint">일정 없음</div>'}
                <div class="ss-inline"><input class="ss-in ss-ev-title" placeholder="일정 제목"><label class="ss-tog"><input type="checkbox" class="ss-switch ss-ev-year"><span>매년</span></label><button class="ss-btn" data-act="addevent">추가</button></div>
                ${!(y === d.y && m === d.m && selDay === d.d) ? `<button class="ss-btn sm ghost" data-act="jumpday"><i class="fa-solid fa-clock-rotate-left"></i> 이 날로 시간 이동</button>` : ''}</div>` : ''}
            ${sec('다가오는 일정', upcoming(d).map(([k, e]) => `<div class="ss-ev"><em>${k === 0 ? '오늘' : `D-${k}`}</em><b>${esc(e.title)}</b><small>${esc(e.desc)}</small></div>`).join('') || emptyBox('30일 안에 일정이 없어요', 'fa-calendar'))}`;
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
        <div class="ss-item-a">${s.data.wallet && modOn('wallet') ? `<button class="ss-btn sm ghost" data-act="sellused" data-arg="${esc(x)}" title="중고장터에 팔기 (헐값)">♻ 팔기</button>` : ''}<button class="ss-ib" data-act="trashit" data-arg="${esc(x)}" title="쓰레기통에 버리기"><i class="fa-solid fa-trash-can"></i></button></div></div>`).join('')}</div>` : emptyBox('상점에서 가구를 사면 여기에 들어와요', 'fa-couch'))}
    ${d.trash?.length ? `<details class="ss-arc"><summary><i class="fa-solid fa-trash-can"></i> 쓰레기통 ${d.trash.length}개</summary><ul>${[...d.trash].reverse().map(t => `<li><b>${esc(t.name)}</b> <small>${esc(t.date)}</small> <button class="ss-btn sm ghost" data-act="restore" data-arg="${esc(t.name)}">되살리기</button></li>`).join('')}</ul></details>` : ''}`;

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
document.addEventListener('wheel', (e) => {
    const svg = e.target.closest?.('svg.ss-map'); if (!svg) return;
    e.preventDefault();
    const r = svg.getBoundingClientRect(), vb = svgBox(svg);
    const cx = vb[0] + ((e.clientX - r.left) / r.width) * vb[2], cy = vb[1] + ((e.clientY - r.top) / r.height) * vb[3];
    keepBox(svg, zoomBox(vb, e.deltaY > 0 ? 1.2 : 1 / 1.2, cx, cy));
}, { passive: false });

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

export function manageHTML(s) {
    const meta = getMeta();
    const st = settings();
    return `${sec('난이도', `${seg(Object.entries(DIFFS).map(([k, v]) => [k, `<i class="fa-solid ${v.icon}"></i> ${v.name}`]), diffOf(), 'diff')}<p class="ss-hint">${esc(DIFFS[diffOf()].desc)}</p>`)}
        ${sec('일시정지', `<div class="ss-row-btns"><button class="ss-btn ${meta.paused ? 'pri' : ''}" data-act="pause"><i class="fa-solid ${meta.paused ? 'fa-play' : 'fa-pause'}"></i> ${meta.paused ? '재개하기' : '일시정지'}</button><button class="ss-btn ghost" data-act="skiponce" ${meta.skipOnce ? 'disabled' : ''}><i class="fa-solid fa-forward"></i> ${meta.skipOnce ? '다음 1번 건너뜀 예약됨' : '다음 1번만 건너뛰기'}</button></div>
            <p class="ss-hint">퀵리플라이·OOC·잡담할 때 눌러 두면 AI에게 상태창을 보내지 않고 &lt;meatball&gt;도 요구하지 않아요. ${st.oocDetect ? 'OOC 자동 감지 켜짐 · ' : ''}${st.skipQuiet ? '조용한 생성(/gen 등) 자동 제외 켜짐' : ''}</p>`)}
        ${sec('쓸 기능 <small>끈 기능은 데이터는 남고 AI에게만 안 보내요</small>', GROUPS.filter(g => !['home', 'manage'].includes(g.id)).map(g => `<div class="ss-modgrp"><small>${g.name}</small><div class="ss-mods">${g.tabs.map(t => MOD[TAB_MOD(t)]).map(m => `<label class="ss-mod ${meta.mods?.[m.id] === false ? '' : 'on'}"><input type="checkbox" class="ss-switch" data-chg="mod" data-arg="${m.id}" ${meta.mods?.[m.id] === false ? '' : 'checked'}>
            <i class="fa-solid ${m.icon}"></i><span><b>${m.name}</b><small>${m.desc}</small></span>${s.data[m.id] ? '' : '<em>비어 있음</em>'}</label>`).join('')}</div></div>`).join(''))}
        ${(() => { const p = playOf(meta); return sec('<i class="fa-solid fa-masks-theater"></i> 플레이 방식', `${seg(Object.entries(PLAY_MODES).map(([k, v]) => [k, `<i class="fa-solid ${v.icon}"></i> ${v.name}`]), p.mode, 'playmode', 'class="ss-seg wrap"')}
            <p class="ss-hint">${esc(PLAY_MODES[p.mode].desc)}</p>
            ${p.mode === 'director' ? `<label class="ss-f wide"><span>주인공 (상태창의 「나」 — 돈·수치·관계를 이 사람 기준으로)</span><input class="ss-in" data-chg="playhero" value="${esc(p.hero)}" placeholder="예: 서이현"></label>` : ''}
            <label class="ss-tog"><input type="checkbox" class="ss-switch" data-chg="playworld" ${p.cardIsWorld ? 'checked' : ''}><span>카드 이름이 캐릭터가 아니라 세계관·봇 이름이에요</span></label>
            ${p.cast.length ? `<p class="ss-hint">등장인물: ${p.cast.map(esc).join(', ')}</p>` : ''}
            <div class="ss-row-btns"><button class="ss-btn sm" data-act="playauto">${ai1} 자동으로 알아보고 맞추기</button></div>`); })()}
        ${modOn('profile') ? sec('프로필 모드', seg([['minimal', '최소 — 카드·로어북 그대로'], ['detailed', '상세 — 이 시트로만']], s.data.profile?.mode ?? 'minimal', 'pmode', 'class="ss-seg wrap"')) : ''}
        ${sec('되돌리기', `<div class="ss-row-btns"><button class="ss-btn" data-act="undo" ${meta.adjust?.length ? '' : 'disabled'}><i class="fa-solid fa-rotate-left"></i> 마지막 편집 되돌리기</button></div><p class="ss-hint">${meta.adjust?.length ? `마지막: ${esc(meta.adjust.at(-1).label || '(이름 없는 편집)')}` : '되돌릴 편집이 없어요.'} · 상태창에서 직접 한 편집·구매·연락만 되돌려요 (AI 답의 변화는 ✏️ 칩으로).</p>`)}
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
        ${sec('<i class="fa-solid fa-stethoscope"></i> 문제 해결', `<div class="ss-row-btns"><button class="ss-btn" data-act="diagnose"><i class="fa-solid fa-stethoscope"></i> 자가 진단 · 고치기</button></div><p class="ss-hint">창이 안 뜨거나 숫자가 이상할 때 눌러 주세요. 망가진 기록을 찾아 고쳐요 (AI 호출 없음).</p>`)}
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
    buy: async (el, arg, btn, s) => {
        const [i, j] = arg.split('|').map(Number);
        const sh = s.data.shop.shops[i], it = sh?.items[j]; if (!it) return;
        const w = s.data.wallet;
        const price = Math.round(it.price * priceMul(s));
        if (w && w.cash < price) { toastr.warning('돈이 모자라요.', TITLE); return; }
        const ops = [['cash', `-${price}`]];
        if (it.kind === 'deco' && modOn('home')) ops.push(['decor', `+${it.name}`]); else ops.push(['item', `+${it.name} 1|${it.desc ? ` ${it.desc}` : ''}`]);
        if (it.stock > 0) { const nd = clone(s.data.shop); nd.shops[i].items[j].stock--; await addAdjust({ set: { mod: 'shop', data: nd }, silent: true }); }
        await addAdjust({ ops, label: `${sh.name}에서 ${it.name} 구매 (−${fmtNum(price)} ${w?.currency ?? ''})` });
        toastr.success(`${esc(it.name)} 구매!`, TITLE);
    },
    unplace: (el, arg) => addAdjust({ ops: [['_unplace', arg]], label: `${arg}을(를) 창고로` }),
    trashit: async (el, arg) => { if (!(await askConfirm(`「${esc(arg)}」을(를) 쓰레기통에 버릴까요? (되살릴 수 있어요)`))) return; return addAdjust({ ops: [['_trash', arg]], label: `${arg}을(를) 버렸다` }); },
    restore: (el, arg) => addAdjust({ ops: [['_restore', arg]], label: `${arg}을(를) 쓰레기통에서 꺼냈다` }),
    sellused: async (el, arg, btn, s) => {
        // 중고 시세: 상점 가격의 이지 30% · 보통 20% · 하드 10% (모르면 직접 입력)
        let base = 0;
        for (const sh of s.data.shop?.shops ?? []) { const it = findBy(sh.items, arg); if (it && norm(it.name) === norm(arg)) { base = it.price; break; } }
        const rate = { easy: 0.3, normal: 0.2, hard: 0.1 }[diffOf()] ?? 0.2;
        let price = Math.max(1, Math.floor(base * rate));
        const cur = s.data.wallet?.currency ?? '';
        if (!base) { const v = await askInput(TITLE, `「${esc(arg)}」 중고 값 (${esc(cur)}) — 원래 값을 몰라서 직접 정해 주세요`, '10'); price = Math.max(0, Math.round(Number(v) || 0)); if (!price) return; }
        else if (!(await askConfirm(`「${esc(arg)}」을(를) 중고장터에 ${fmtNum(price)} ${esc(cur)}에 팔까요?<br><small>원래 ${fmtNum(base)} — 헐값이에요 😭</small>`))) return;
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
        ui.cal.m += Number(arg); if (ui.cal.m < 1) { ui.cal.m = c.months.length; ui.cal.y--; } if (ui.cal.m > c.months.length) { ui.cal.m = 1; ui.cal.y++; }
        ui.day = null; app.renderPanel(el);
    },
    calday: (el, arg) => { el._ss.ui.day = Number(arg); app.renderPanel(el); },
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
    achtog: async (el, arg, btn, s) => {
        const a = findBy(s.data.ach.list, arg);
        if (!a || !(await askConfirm(a.done ? `「${esc(a.name)}」 달성을 취소할까요?` : `「${esc(a.name)}」을(를) 달성 처리할까요?`))) return;
        return addAdjust({ ops: [['_achtog', a.name]], label: a.done ? '' : `🏆 업적 달성: ${a.name}` });
    },
    memoadd: (el) => { const t = el.querySelector('.ss-memo-in').value.trim(); if (t) return addAdjust({ ops: [['_memo', `add|${t.replace(/\|/g, '/')}`]], silent: true }); },
    memodel: (el, arg) => addAdjust({ ops: [['_memo', `del|${arg}`]], silent: true }),
    memotog: (el, arg) => addAdjust({ ops: [['_memo', `tog|${arg}`]], silent: true }),
    undo: async () => app.undoLast?.(),
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
