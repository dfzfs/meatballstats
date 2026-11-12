// 🔔 알림: 폰 알림처럼 떴다 사라지는 팝업 · 알림함 · 하루 정리 카드 · 추천 곡 카드
import { app, settings, getMeta, saveMeta, esc, short, fmtNum, signed, uid, TITLE, stamp, mascotUrl } from './core.js';

// 추천 곡 ▶ 누르면 열 곳
export const MUSIC_APPS = {
    youtube: { name: '유튜브', url: (q) => `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}` },
    ytmusic: { name: '유튜브 뮤직', url: (q) => `https://music.youtube.com/search?q=${encodeURIComponent(q)}` },
    spotify: { name: '스포티파이', url: (q) => `https://open.spotify.com/search/${encodeURIComponent(q)}` },
    melon: { name: '멜론', url: (q) => `https://www.melon.com/search/total/index.htm?q=${encodeURIComponent(q)}` },
};
export const songLink = (x) => (MUSIC_APPS[settings().musicApp] ?? MUSIC_APPS.youtube).url(`${x.title} ${x.artist ?? ''}`.trim());

// 글로 된 알림 → 아이콘 · 탭 짐작
const GUESS = [
    [/^업적/, '🏆', 'ach'], [/^퀘스트/, '📜', 'quest'], [/^(저주|축복)|풀렸다|^해제/, '🔮', 'fate'], [/^이벤트 카드/, '🃏', 'fate'],
    [/빚|연체|전당포/, '💸', 'wallet'], [/^오늘의 일정/, '📅', 'calendar'], [/0이 되었다/, '⚠️', 'stats'], [/^💢|질투/, '💢', 'rel'], [/^💔/, '💔', 'rel'],
    [/^📬|편지/, '📬', 'contact'], [/^💬/, '💬', 'contact'],
];
// 어떤 알림에 어떤 고양이 표정을 쓸지
function moodOf(n) {
    if (n.kind === 'ending' || n.kind === 'stage') return 'party';
    if (n.kind === 'day') return 'idle';
    if (n.kind !== 'text') return '';
    if (n.icon === '🏆' || /^퀘스트 완료/.test(n.title)) return 'happy';
    if (n.icon === '🃏' || /^(저주|축복)/.test(n.title)) return 'surprise';
    if (n.icon === '💸' || n.icon === '⚠️' || n.icon === '💔') return 'sad';
    return '';
}
export function toNote(a) {
    if (!a) return null;
    if (typeof a === 'string') {
        const g = GUESS.find(([re]) => re.test(a));
        return { kind: 'text', icon: g?.[1] ?? '🔔', title: a.replace(/^[📬💬💢💔]\s*/u, ''), text: '', tab: g?.[2] ?? '' };
    }
    switch (a.kind) {
        case 'msg': return { kind: 'msg', icon: a.letter ? '📬' : '💬', title: a.letter ? `${a.who}의 편지가 도착했어요` : a.who, text: short(a.text, 70), tab: 'contact', who: a.who };
        case 'music': return { kind: 'music', icon: '♪', title: a.title, text: [a.artist, a.text].filter(Boolean).join(' · '), tab: 'music', song: { title: a.title, artist: a.artist } };
        case 'stage': return { kind: 'stage', icon: '💞', title: `${a.who} — 「${a.name}」 단계`, text: a.text ? `해금: ${a.text}` : '', tab: 'rel' };
        case 'ending': return { kind: 'ending', icon: '🎬', title: `엔딩 조건 달성 — ${a.name}`, text: a.text ?? '', tab: 'ach', ending: a.name };
        case 'sns': return { kind: 'sns', icon: '#️⃣', title: `${a.who}님의 새 게시물`, text: short(a.text, 60), tab: 'sns' };
        case 'life': return { kind: 'life', icon: '🌙', title: `화면 밖 — ${a.who}`, text: short(a.text, 70), tab: 'rel' };
        case 'day': {
            const d = a.day;
            const bits = [];
            if (d.cash) bits.push(`${d.cur} ${signed(d.cash)}`);
            for (const [n, v] of d.aff.slice(0, 3)) bits.push(`♥${n} ${signed(v)}`);
            bits.push(`일어난 일 ${d.n}개`);
            return { kind: 'day', icon: '📅', title: `하루 정리 — ${d.date}`, text: bits.join(' · '), tab: 'record', day: d };
        }
        default: return { kind: a.kind ?? 'text', icon: a.icon ?? '🔔', title: a.title ?? a.text ?? '', text: a.title ? (a.text ?? '') : '', tab: a.tab ?? '' };
    }
}

// ───── 알림함 (채팅마다, 최근 60개) ─────
function remember(n) {
    const meta = getMeta();
    if (!meta) return;
    meta.notes = [...(meta.notes ?? []), { id: n.id, t: n.t, kind: n.kind, icon: n.icon, title: n.title, text: n.text, tab: n.tab, song: n.song, ending: n.ending, when: n.when, read: false }].slice(-60);
    saveMeta();
}
export const unreadNotes = (meta = getMeta()) => (meta?.notes ?? []).filter(n => !n.read).length;

export function notify(a, { save = true } = {}) {
    const n = toNote(a);
    if (!n || !n.title) return;
    const set = settings();
    if (n.kind === 'music' && !set.musicToast) { if (save) remember({ ...n, id: uid(), t: Date.now() }); return; }
    if (n.kind === 'day' && !set.daySummary) return;
    n.id = uid(); n.t = Date.now();
    try { n.when = app.current ? stamp(app.current.state) : ''; } catch { n.when = ''; }
    if (save) remember(n);
    if (set.toastMode === 'off') return app.renderHud?.();
    if (set.toastMode === 'toastr' || typeof document === 'undefined') {
        toastr.info(`${esc(n.icon)} ${esc(n.title)}${n.text ? `<br><small>${esc(n.text)}</small>` : ''}`, TITLE, { escapeHtml: false });
        return app.renderHud?.();
    }
    showToast(n);
    app.renderHud?.();
}
app.notify = notify;

// ───── 팝업 ─────
const queue = [];
function box() {
    let b = document.getElementById('ss-toasts');
    if (!b) { b = document.createElement('div'); b.id = 'ss-toasts'; b.className = 'ss-toasts ss-scope'; document.body.appendChild(b); }
    // 폰에서 상태창을 열어 둔 동안엔 위쪽 탭을 가리지 않게 아래로
    const sheetOpen = window.innerWidth <= 700 && !!document.querySelector('dialog.ss-dlg[open]');
    b.classList.toggle('bottom', settings().toastPos === 'bottom' || sheetOpen);
    return b;
}
function toastHTML(n) {
    const extra = n.kind === 'music' && n.song ? `<a class="ss-t-play" href="${esc(songLink(n.song))}" target="_blank" rel="noopener" data-stop="1" title="검색해서 듣기"><i class="fa-solid fa-play"></i></a>`
        : n.kind === 'ending' ? `<button class="ss-t-btn" data-ending="${esc(n.ending)}">엔딩 쓰기</button>`
            : n.kind === 'day' ? '<button class="ss-t-btn" data-open="record">자세히</button>' : '';
    const mood = settings().showMascot === false ? '' : moodOf(n);
    return `<div class="ss-t-ico ${mood ? 'cat' : ''}">${mood ? `<img src="${mascotUrl(mood)}" alt="">` : esc(n.icon)}</div><div class="ss-t-b"><b>${esc(n.title)}</b>${n.text ? `<small>${esc(n.text)}</small>` : ''}</div>${extra}<button class="ss-t-x" data-x="1" title="닫기">×</button>`;
}
export function showToast(n) {
    const b = box();
    const max = window.innerWidth <= 700 ? 2 : 3; // 폰에서는 화면을 덜 가리게
    if (b.children.length >= max) { queue.push(n); return; }
    const el = document.createElement('div');
    el.className = `ss-toast k-${n.kind}`;
    el.innerHTML = toastHTML(n);
    b.appendChild(el);
    requestAnimationFrame(() => el.classList.add('in'));
    const life = Math.max(2, Number(settings().toastSec) || 4) * 1000 * (n.kind === 'day' || n.kind === 'ending' ? 1.6 : 1);
    let timer = setTimeout(() => close(), life);
    const close = () => {
        clearTimeout(timer);
        if (el._closing) return; el._closing = true;
        el.classList.remove('in'); el.classList.add('out');
        setTimeout(() => { el.remove(); const nx = queue.shift(); if (nx) showToast(nx); }, 260);
    };
    el.addEventListener('mouseenter', () => clearTimeout(timer));
    el.addEventListener('mouseleave', () => { timer = setTimeout(close, 1500); });
    // 위로 밀면 닫힘 (폰)
    let sy = null;
    el.addEventListener('pointerdown', (e) => { sy = e.clientY; });
    el.addEventListener('pointerup', (e) => { if (sy !== null && Math.abs(e.clientY - sy) > 30) { close(); e.preventDefault(); } sy = null; });
    el.addEventListener('click', (e) => {
        if (e.target.closest('[data-stop]')) { setTimeout(close, 300); return; }
        e.preventDefault();
        if (e.target.closest('[data-x]')) return close();
        const en = e.target.closest('[data-ending]');
        if (en) { app.writeEnding?.(en.dataset.ending); return close(); }
        const tab = e.target.closest('[data-open]')?.dataset.open ?? n.tab;
        close();
        if (tab) app.openSheet?.(tab);
    });
    return el;
}

// ───── 알림함 창 ─────
export async function openInbox() {
    const meta = getMeta();
    if (!meta) return;
    const el = document.createElement('div');
    el.className = 'ss-root ss-scope ss-inbox';
    const render = () => {
        const list = [...(meta.notes ?? [])].reverse();
        el.innerHTML = `<div class="ss-wz-head"><i class="fa-solid fa-bell"></i><div><b>알림함</b><small>이 채팅에서 온 알림 (최근 60개)</small></div></div>
            <div class="ss-row-btns">${list.length ? '<button class="ss-btn sm ghost" data-clear="1"><i class="fa-solid fa-broom"></i> 모두 지우기</button>' : ''}</div>
            <div class="ss-notes">${list.map(n => `<div class="ss-note ${n.read ? '' : 'new'}" data-tab="${esc(n.tab ?? '')}"><span class="ss-t-ico">${esc(n.icon)}</span><div class="ss-t-b"><b>${esc(n.title)}</b>${n.text ? `<small>${esc(n.text)}</small>` : ''}<em>${esc(n.when || '')}${n.when ? ' · ' : ''}${new Date(n.t).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</em></div>${n.song ? `<a class="ss-t-play" href="${esc(songLink(n.song))}" target="_blank" rel="noopener" title="검색해서 듣기"><i class="fa-solid fa-play"></i></a>` : ''}</div>`).join('') || '<div class="ss-empty-s"><i class="fa-regular fa-bell"></i><span>아직 알림이 없어요</span></div>'}</div>`;
    };
    render();
    el.addEventListener('click', async (e) => {
        if (e.target.closest('a')) return;
        if (e.target.closest('[data-clear]')) { meta.notes = []; await saveMeta(); render(); app.renderHud?.(); app.rerenderPanels?.(); return; }
        const n = e.target.closest('.ss-note');
        if (n?.dataset.tab) { el.closest('dialog')?.querySelector('.popup-button-ok')?.click(); setTimeout(() => app.openSheet?.(n.dataset.tab), 200); }
    });
    for (const n of meta.notes ?? []) n.read = true;
    saveMeta();
    app.renderHud?.(); app.rerenderPanels?.();
    await app.popup(el, { large: true });
}
app.openInbox = openInbox;
export { fmtNum };
