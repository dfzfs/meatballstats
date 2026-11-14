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
    if (n.kind === 'update' || n.kind === 'tip') return 'happy';
    if (n.kind === 'hint') return n.icon === '⚠️' ? 'think' : 'happy';
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
        case 'hint': return { kind: 'hint', icon: a.icon ?? '💡', title: a.title, text: a.text ?? '', tab: '', hint: a.hint };
        case 'tip': return { kind: 'tip', icon: '💡', title: a.title, text: a.text ?? '', tab: 'manage', mod: a.mod };
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
    meta.notes = [...(meta.notes ?? []), { id: n.id, t: n.t, kind: n.kind, icon: n.icon, title: n.title, text: n.text, tab: n.tab, song: n.song, ending: n.ending, hint: n.hint, when: n.when, read: false }].slice(-60);
    saveMeta();
}
export const unreadNotes = (meta = getMeta()) => (meta?.notes ?? []).filter(n => !n.read).length;

export function notify(a, { save = true } = {}) {
    const n = toNote(a);
    if (!n || !n.title) return;
    const set = settings();
    if (n.kind === 'music' && !set.musicToast) { if (save) remember({ ...n, id: uid(), t: Date.now() }); return; }
    if (n.kind === 'day' && !set.daySummary) return;
    // 같은 알림이 5초 안에 또 오면 한 번만 (어디서 두 번 불려도)
    const sig = `${n.kind}|${n.title}|${n.text}`;
    if (notify._last?.sig === sig && Date.now() - notify._last.t < 5000) return;
    notify._last = { sig, t: Date.now() };
    n.id = uid(); n.t = Date.now();
    try { n.when = app.current ? stamp(app.current.state) : ''; } catch { n.when = ''; }
    if (save) remember(n);
    if (set.toastMode === 'off') return app.renderHud?.();
    if (set.toastMode === 'toastr' || typeof document === 'undefined') {
        toastr.info(`${esc(n.icon)} ${esc(n.title)}${n.text ? `<br><small>${esc(n.text)}</small>` : ''}${n.kind === 'tip' ? '<br><small><b>눌러서 켜기</b></small>' : n.kind === 'hint' ? '<br><small>눌러서 「알아요」 (다시 안 보기)</small>' : ''}`, TITLE, { escapeHtml: false, ...(n.kind === 'tip' && n.mod ? { timeOut: 12000, onclick: () => app.enableTip?.(n.mod) } : n.kind === 'hint' && n.hint ? { timeOut: 10000, onclick: () => app.knowHint?.(n.hint) } : {}) });
        return app.renderHud?.();
    }
    showToast(n);
    app.renderHud?.();
}
app.notify = notify;

// ───── 팝업 ─────
const queue = [];
// 실리태번 팝업은 화면 맨 위 층(모달)에 떠서, body에 붙인 알림은 그 뒤에 깔린다 → 열려 있는 맨 위 창 안으로 옮긴다
function toastHost() {
    const open = [...document.querySelectorAll('dialog[open]')].filter(d => { try { return d.matches(':modal'); } catch { return true; } });
    return open.at(-1) ?? document.body;
}
function box() {
    let b = document.getElementById('ss-toasts');
    const host = toastHost();
    if (!b) { b = document.createElement('div'); b.id = 'ss-toasts'; b.className = 'ss-toasts ss-scope'; queue.length = 0; }
    if (b.parentElement !== host) host.appendChild(b);
    // 폰에서 상태창을 열어 둔 동안엔 위쪽 탭을 가리지 않게 아래로
    const sheetOpen = window.innerWidth <= 700 && !!document.querySelector('dialog.ss-dlg[open]');
    b.classList.toggle('bottom', settings().toastPos === 'bottom' || sheetOpen);
    return b;
}
function toastHTML(n) {
    const extra = n.kind === 'music' && n.song ? `<a class="ss-t-play" href="${esc(songLink(n.song))}" target="_blank" rel="noopener" data-stop="1" title="검색해서 듣기"><i class="fa-solid fa-play"></i></a>`
        : n.kind === 'ending' ? `<button class="ss-t-btn" data-ending="${esc(n.ending)}">엔딩 쓰기</button>`
            : n.kind === 'day' ? '<button class="ss-t-btn" data-open="record">자세히</button>'
                : n.kind === 'update' ? '<button class="ss-t-btn" data-whatsnew="1">자세히</button>'
                    : n.kind === 'hint' && n.hint ? `<span class="ss-t-tip"><button class="ss-t-btn" data-hintok="${esc(n.hint)}" title="이 문구는 다시 안 보여요">알아요</button>${n.icon !== '⚠️' ? '<button class="ss-t-btn ghost" data-hintstop="1" title="「이것도 아세요?」 팁을 더는 안 띄워요">팁 그만</button>' : ''}</span>`
                    : n.kind === 'tip' && n.mod ? `<span class="ss-t-tip"><button class="ss-t-btn" data-tipon="${esc(n.mod)}">써 볼래요</button><button class="ss-t-btn ghost" data-tipno="${esc(n.mod)}" title="이 기능은 다시 권하지 않아요">괜찮아요</button></span>` : '';
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
    const life = Math.max(2, Number(settings().toastSec) || 4) * 1000 * (n.kind === 'update' || n.kind === 'tip' ? 3 : n.kind === 'hint' ? 2.5 : n.kind === 'day' || n.kind === 'ending' ? 1.6 : 1);
    let timer = setTimeout(() => close(), life);
    const close = () => {
        clearTimeout(timer);
        if (el._closing) return; el._closing = true;
        el.classList.remove('in'); el.classList.add('out');
        setTimeout(() => { el.remove(); const nx = queue.shift(); if (nx) showToast(nx); }, 260);
    };
    // 고정(펼침) 중엔 저절로 안 닫힘 — ×·버튼·밀기로만 닫힘
    const resume = (ms) => { clearTimeout(timer); if (!el._pinned && !el._closing) timer = setTimeout(close, ms); };
    // 글이 잘려 있으면 본문을 눌렀을 때 먼저 펼쳐서 다 보여 준다 (바로 닫히거나 다른 탭으로 넘어가지 않게)
    const clipped = () => { const s = el.querySelector('.ss-t-b small'), b = el.querySelector('.ss-t-b b'); return !!((s && s.scrollHeight > s.clientHeight + 1) || (b && b.scrollWidth > b.clientWidth + 1)); };
    const pin = () => { el._pinned = true; clearTimeout(timer); el.classList.add('open'); };
    el.addEventListener('mouseenter', () => clearTimeout(timer));
    el.addEventListener('mouseleave', () => resume(2500));
    // 폰: 손가락이 닿아 있는 동안은 멈춤 · 위로 밀면 닫힘
    let sy = null;
    el.addEventListener('pointerdown', (e) => { sy = e.clientY; clearTimeout(timer); });
    el.addEventListener('pointerup', (e) => {
        if (sy !== null && Math.abs(e.clientY - sy) > 30) { el._swiped = true; close(); e.preventDefault(); }
        else if (e.pointerType !== 'mouse') resume(3000);
        sy = null;
    });
    el.addEventListener('pointercancel', () => { sy = null; resume(3000); });
    el.addEventListener('click', (e) => {
        if (el._swiped || el._closing) return; // 밀어서 닫은 직후의 click은 무시 (탭이 열리지 않게)
        if (e.target.closest('[data-stop]')) { setTimeout(close, 300); return; }
        e.preventDefault();
        if (e.target.closest('[data-x]')) return close();
        const onBtn = e.target.closest('button, a');
        if (!onBtn && !el._pinned && (n.kind === 'hint' || n.kind === 'tip' || clipped())) { pin(); return; } // 본문 첫 탭 = 펼치기
        if (!onBtn && n.kind === 'hint') return; // 펼친 팁 본문을 또 눌러도 닫지 않음 — 「알아요」나 ×로
        if (n.kind === 'update') { close(); app.showWhatsNew?.(); return; } // 업데이트 알림: 누르면 바뀐 점 자세히
        const on = e.target.closest('[data-tipon]')?.dataset.tipon, no = e.target.closest('[data-tipno]')?.dataset.tipno;
        if (on) { close(); app.enableTip?.(on); return; }
        const ok = e.target.closest('[data-hintok]')?.dataset.hintok;
        if (ok) { close(); app.knowHint?.(ok); return; }
        if (e.target.closest('[data-hintstop]')) { close(); app.knowHint?.(n.hint); app.stopActionTips?.(); return; }
        if (no) { close(); app.neverTip?.(no); return; }
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
            <div class="ss-notes">${list.map(n => `<div class="ss-note ${n.read ? '' : 'new'}" data-tab="${esc(n.tab ?? '')}"><span class="ss-t-ico">${esc(n.icon)}</span><div class="ss-t-b"><b>${esc(n.title)}</b>${n.text ? `<small>${esc(n.text)}</small>` : ''}<em>${esc(n.when || '')}${n.when ? ' · ' : ''}${new Date(n.t).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</em></div>${n.song ? `<a class="ss-t-play" href="${esc(songLink(n.song))}" target="_blank" rel="noopener" title="검색해서 듣기"><i class="fa-solid fa-play"></i></a>` : ''}${n.kind === 'hint' && n.hint && settings().hintSeen?.[n.hint] !== true ? `<button class="ss-t-btn" data-hintok="${esc(n.hint)}" title="이 문구는 다시 안 보여요">알아요</button>` : ''}</div>`).join('') || '<div class="ss-empty-s"><i class="fa-regular fa-bell"></i><span>아직 알림이 없어요</span></div>'}</div>`;
    };
    render();
    el.addEventListener('click', async (e) => {
        if (e.target.closest('a')) return;
        const ok = e.target.closest('[data-hintok]')?.dataset.hintok;
        if (ok) { app.knowHint?.(ok); render(); return; }
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
