// 틀: 상태창 패널 · HUD · 사이드(미니) · 떠 있는 버튼 (만들기는 wizard.js · 프롬프트/꾸미기 창은 windows.js)
import {
    app, ctx, settings, saveSettings, getMeta, saveMeta, modOn, isActive, ready, MOD, MOD_IDS, EMPTY, DIFFS, diffOf,
    esc, short, clone, clamp, h, dateShort, userName, TITLE, LOG, VERSION, MODULE, relFromProfiles, ssErr, isHidden,
} from './core.js';
import { commit, wipeModule, gatherSources, unreadCount, dueLetters } from './engine.js';
import { genModule, instructModule } from './ai.js';
import { popup, confirmPopup, askConfirm, busyBtn, editorHTML, bindEditor, diffHTML, ai1, gauge, applyTheme, mascot } from './kit.js';
import { applyParts, PARTS_ACTIONS } from './parts.js';
import { VIEW, VIEW_ACTIONS, VIEW_CHANGES, GROUPS, TAB_MOD, TAB_INFO, PSEUDO, manageHTML, freshDot, tileBoard, tileAct, bindTileDrag, fitTiles, BOARD_BG } from './views.js';
import { fullBackup, restoreFile, saveSlot, loadSlot, deleteSlot, attachToCard, detachFromCard, loadFromCard, cardPack, prepareCarry, startCarry, carryFor, diagnose } from './safe.js';
import { applyPreset } from './extra.js';
import { unreadNotes } from './notify.js';
import { DICE_ACTIONS, DICE_CHANGES } from './dice.js';
import { CONTACT_ACTIONS } from './contact.js';
import { FEED_ACTIONS, FEED_CHANGES } from './feeds.js';
import { MONEY_ACTIONS } from './money.js';
import { FATE_ACTIONS } from './fate.js';
import { EDIT, viewTr, letterMode } from './core.js';
import { translateSheet, missingTr } from './translate.js';
import { hintAfterAction } from './tips.js';
import { openPromptWindow, openThemeWindow } from './windows.js';
import { setBase, startBlank, openWizard } from './wizard.js';
export * from './wizard.js'; // 떼어 낸 것 — 다른 파일은 예전처럼 여기서 받아도 된다
export * from './windows.js'; // 떼어 낸 것 — 다른 파일은 예전처럼 여기서 받아도 된다

export const panels = new Set();
app.popup = popup;
app.confirmPopup = confirmPopup;
app.userName = userName;

const INSTRUCT_HINT = {
    core: '예: 세계관을 좀 더 어둡게, 마법이 금지된 설정 추가',
    profile: '예: 새로 나온 NPC 「한서진」 프로필 추가 / 레온 말투를 더 자세히',
    stats: '예: 마나 게이지 추가, 힘을 +3으로', dice: '예: 크툴루식 d100 정신력 판정으로 바꿔줘',
    wallet: '예: 지금까지 이야기에서 받은 물건들 반영해줘', shop: '예: 항구에 암시장이 열렸어. 상점 추가하고 무기점에 신상품',
    home: '예: 2층 다락방 추가, 거실을 아늑하게', rel: '예: 지금까지 채팅 보고 관계 수치 다시 맞춰줘', map: '예: 북쪽 설산 지역 장소 4곳 추가, 항구와 연결',
    calendar: '예: 다음 달에 왕국 축제 일정 추가', contact: '예: 편지 방식으로 바꾸고 올빼미·갈매기 배달 추가', quest: '예: 길드에서 받을 만한 토벌 의뢰 2개 추가',
    news: '예: 왕궁 연회 소식 기사로', gossip: '예: 레온과 내가 같이 있는 걸 본 사람들 소문', board: '예: 익명 게시판 말투로 바꿔줘',
    ach: '예: 지금 스토리에 맞는 업적 5개 더 / 레온 루트 엔딩 추가', memo: '예: 지금까지 나온 단서 정리해서 메모로',
    sns: '예: 레온이 나랑 찍은 사진 올린 게시물 추가', music: '예: 지금 장면에 어울리는 잔잔한 OST로', custom: '예: 「명성」 탭 만들어서 마을·길드 명성 0~100 게이지로',
    fate: '예: 이 세계관에 맞는 이벤트 카드 5장 더',
};

// ───── 탭 ─────
// v2.7.3: 앨범 · 플레이 기록은 확장 설정에서 모든 채팅에 끌 수 있어요
const PSEUDO_ON = { album: 'albumOn', record: 'recordOn' };
function groupTabs(g, meta) {
    return g.tabs.filter(t => (PSEUDO.has(t) ? !PSEUDO_ON[t] || settings()[PSEUDO_ON[t]] !== false : modOn(TAB_MOD(t), meta)));
}
// 즐겨찾기 그룹 (★) — 있으면 맨 앞
function allGroups() {
    const fav = (settings().favTabs ?? []).filter(t => GROUPS.some(g => g.tabs.includes(t)));
    return fav.length ? [{ id: 'fav', name: '즐겨찾기', icon: 'fa-star', tabs: fav }, ...GROUPS] : GROUPS;
}
function groupsOn(meta) { return allGroups().filter(g => groupTabs(g, meta).length); }
function groupOf(tab, pref) { const all = allGroups(); return (pref && all.find(g => g.id === pref && g.tabs.includes(tab))) || GROUPS.find(g => g.tabs.includes(tab)) || all[0]; }
function badgeFor(tab, s, meta) {
    if (tab === 'contact') { const n = unreadCount(s, meta); return n ? `<i class="ss-badge">${n}</i>` : ''; }
    if (tab === 'dice' && s.pendingRoll) return '<i class="ss-badge">!</i>';
    if (tab === 'news') { const n = s.data.news?.items.filter(x => !x.read).length; return n ? '<i class="ss-dot"></i>' : ''; }
    if (freshTab(tab)) return '<i class="ss-fresh" title="방금 AI 답에서 바뀌었어요"></i>';
    return '';
}
// 🔴 방금 AI 답에서 바뀐 탭 (v2.7.3) — 그 탭을 한 번 열면 탭 점은 꺼지고, 칸 안의 줄 점은 다음 답까지 남아요
function freshTab(tab) {
    const f = app.current?.fresh;
    if (!f || settings().freshDot === false) return false;
    const mod = TAB_MOD(tab);
    return !!(f.mods.has(mod) && !f.seen.has(mod));
}
function groupBadge(g, s, meta) {
    const b = groupTabs(g, meta).map(t => badgeFor(t, s, meta)).filter(Boolean);
    if (!b.length) return '';
    return b.some(x => !x.includes('ss-fresh')) ? '<i class="ss-dot"></i>' : '<i class="ss-fresh" title="방금 AI 답에서 바뀌었어요"></i>'; // 🔴 새 변화만 있으면 작은 빨간 점
}

// ───── 패널 ─────
export function renderPanel(el) {
    const st = el._ss ??= { tab: 'home', mode: 'view', work: null, ui: {} };
    const inSide = el.classList.contains('ss-panel-side');
    if (!isActive()) { el.innerHTML = `<div class="ss-root ss-scope"><div class="ss-empty"><i class="fa-solid fa-power-off"></i><b>이 채팅에서는 상태창이 꺼져 있어요</b><p>확장 설정에서 「이 채팅에서 켜기」를 누르세요.</p></div></div>`; bindPanel(el); return; }
    if (!ready() || !app.current) {
        const pack = cardPack(), cr = carryFor();
        el.innerHTML = `<div class="ss-root ss-scope"><div class="ss-empty">
            ${mascot('idle', 'lg', 'bob') || '<i class="fa-solid fa-wand-magic-sparkles"></i>'}<b>아직 이 채팅의 상태창이 없어요</b>
            ${pack ? `<button class="ss-btn pri big" data-act="cardload"><i class="fa-solid fa-id-card-clip"></i> 카드에 든 상태창 불러오기</button><small class="ss-hint">${esc(pack.title || '상태창')} · AI 호출 없이 바로 시작</small>` : ''}
            ${cr ? `<button class="ss-btn pri big" data-act="carrystart"><i class="fa-solid fa-clapperboard"></i> ${cr.round}회차로 시작</button><small class="ss-hint">${esc(cr.title || '')} — 지난 회차에서 이어받기</small>` : ''}
            <p>장르만 고르면 돼요. 수치·달력 같은 기본 칸은 바로 채우고, 인물·지도 같은 세계관 칸은 AI가 카드·로어북을 읽고 채워요. AI 없이 「기본 틀만」으로 바로 시작할 수도 있어요. 어떤 카드든, 카드가 없어도 돼요.</p>
            <button class="ss-btn ${pack || cr ? '' : 'pri big'}" data-act="wizard"><i class="fa-solid fa-wand-magic-sparkles"></i> 상태창 만들기</button>
            <button class="ss-btn ghost" data-act="blank"><i class="fa-regular fa-file"></i> 빈 상태창으로 시작</button>
            <button class="ss-btn ghost" data-act="filerestore"><i class="fa-solid fa-box-open"></i> 백업 · 파일에서 불러오기</button>
        </div></div>`;
        bindPanel(el);
        return;
    }
    const s = app.current.state;
    const meta = getMeta();
    const gs = groupsOn(meta);
    let g = groupOf(st.tab, st.group);
    if (!gs.some(x => x.id === g.id) || !groupTabs(g, meta).includes(st.tab)) { g = gs[0]; st.tab = groupTabs(g, meta)[0]; }
    g = gs.find(x => x.id === g.id) ?? g;
    st.group = g.id;
    const tab = st.tab;
    const mod = TAB_MOD(tab);
    const fresh0 = app.current?.fresh;
    if (fresh0 && fresh0.mods.has(mod) && !fresh0.seen.has(mod)) { // 🔴 이 탭을 열었으니 탭 점은 끔 (칸 안의 줄 점은 다음 답까지)
        fresh0.seen.add(mod);
        const m0 = getMeta(); if (m0) { m0.freshSeen = { key: fresh0.key, mods: [...fresh0.seen] }; try { ctx().saveMetadataDebounced?.(); } catch { /* 저장 못 해도 이번 접속엔 기억 */ } } // 새로고침해도 본 탭은 꺼진 채로 (v2.7.5 · 상태 계산엔 영향 없어서 rev는 안 올림)
    }
    const pseudo = PSEUDO.has(tab) && tab !== 'home';
    const data = pseudo ? {} : mod === 'core' ? s.core : s.data[mod];
    const editable = !pseudo;
    let body;
    if (tab === 'manage') body = manageHTML(s, st.ui);
    else if (pseudo) body = VIEW[tab](s, null, st.ui);
    else if (st.mode === 'edit') body = `<div class="ss-editor">${editorHTML(st.work, EDIT[mod])}</div>
        <div class="ss-editbar"><button class="ss-btn pri" data-act="save"><i class="fa-solid fa-floppy-disk"></i> 저장</button><button class="ss-btn" data-act="cancel">취소</button></div>`;
    else if (st.mode === 'json') body = `<textarea class="ss-in ss-json" rows="18" spellcheck="false">${esc(JSON.stringify(data ?? {}, null, 2))}</textarea>
        <div class="ss-editbar"><button class="ss-btn pri" data-act="savejson"><i class="fa-solid fa-floppy-disk"></i> 저장</button><button class="ss-btn" data-act="cancel">취소</button></div>`;
    else if (!data) body = `<div class="ss-empty"><i class="fa-solid ${TAB_INFO(tab).icon}"></i><b>「${esc(TAB_INFO(tab).name)}」 칸이 비어 있어요</b>
        <button class="ss-btn pri" data-act="gen">${ai1} AI로 채우기</button><button class="ss-btn ghost" data-act="genblank"><i class="fa-regular fa-file"></i> 빈 칸으로 시작</button></div>`;
    else body = VIEW[tab](s, data, st.ui);

    const info = TAB_INFO(tab);
    const isFav = (settings().favTabs ?? []).includes(tab);
    const favBtn = tab !== 'home' ? `<button class="ss-tool ${isFav ? 'on' : ''}" data-act="favtog" title="${isFav ? '즐겨찾기에서 빼기' : '즐겨찾기 (★ 그룹에 모아 보기)'}"><i class="fa-${isFav ? 'solid' : 'regular'} fa-star"></i></button>` : '';
    // 🙈 가리기: 이 칸을 AI에게 안 보냄 (이 채팅 · 직접 다시 켤 때까지)
    const hmod = tab === 'home' ? 'core' : MOD[mod] ? mod : null;
    const hidden = !!(hmod && isHidden(hmod, meta));
    const hideBtn = hmod && st.mode !== 'edit' && st.mode !== 'json' ? `<button class="ss-tool ${hidden ? 'on' : ''}" data-act="hidetog" title="${hidden ? 'AI에게 다시 보내기' : '가리기 — AI에게 이 칸을 안 보내요 (다시 켤 때까지)'}"><i class="fa-solid ${hidden ? 'fa-eye-slash' : 'fa-eye'}"></i></button>` : '';
    const tools = editable && data && st.mode !== 'edit' && st.mode !== 'json' ? `<div class="ss-tools">${favBtn}${hideBtn}
            <button class="ss-tool ${st.ui.instructOpen ? 'on' : ''}" data-act="instructtog" title="AI에게 이 칸을 고치라고 지시 (AI 1회)"><i class="fa-solid fa-wand-magic-sparkles"></i><span>AI로 수정</span></button>
            <button class="ss-tool" data-act="edit" title="직접 편집"><i class="fa-solid fa-pen"></i><span>편집</span></button>
            <button class="ss-tool" data-act="json" title="JSON 편집"><i class="fa-solid fa-code"></i></button>
            <button class="ss-tool" data-act="regen" title="이 칸만 다시 생성 (AI 1회)"><i class="fa-solid fa-rotate"></i></button>
            ${mod !== 'core' ? `<button class="ss-tool danger" data-act="wipemod" title="이 칸 전체 삭제 — 내용과 기록을 찌꺼기 없이 (되돌릴 수 없음)"><i class="fa-solid fa-broom"></i></button>` : ''}</div>` : (favBtn || hideBtn) && (pseudo || !data) ? `<div class="ss-tools">${favBtn}${hideBtn}</div>` : '';
    const instruct = st.ui.instructOpen && editable && data ? `<div class="ss-instruct"><textarea class="ss-in" rows="2" placeholder="${esc(INSTRUCT_HINT[mod] ?? '예: 스토리에 맞게 ○○를 추가하고 △△는 바꿔줘')}">${esc(st.ui.instructText ?? '')}</textarea>
        <div class="ss-row-btns"><button class="ss-btn pri sm" data-act="instruct">${ai1} 보내기</button><small class="ss-hint">바뀌는 내용을 먼저 보여 드려요.</small></div></div>` : '';
    const c = s.core, cal = s.data.calendar, here = s.data.map?.here;
    const sub2 = [cal && modOn('calendar', meta) ? `${dateShort(cal)} ${cal.time}` : '', here && modOn('map', meta) ? `📍 ${here}` : ''].filter(Boolean).join(' · ');
    const d0 = DIFFS[diffOf(meta)];
    const nNew = unreadNotes(meta);
    el.innerHTML = `<div class="ss-root ss-scope ${inSide ? 'in-side' : ''} ${meta.paused ? 'paused' : ''} ${settings().bottomNav ? 'navbottom' : ''}">
        <header class="ss-head">
            ${settings().mascotBuddy !== false ? `<span class="ss-head-cat" data-act="help" title="궁금한 게 있으면 저를 눌러요 🐾 (미트볼 도우미)">${mascot(meta.paused ? 'sleep' : nNew ? 'surprise' : 'idle', 'head', 'bob')}</span>` : ''}
            <div class="ss-head-t"><b>${esc(c.title || TITLE)}</b>${sub2 ? `<small>${esc(sub2)}</small>` : ''}</div>
            <div class="ss-head-a">
                <button class="ss-chip btn diff-${diffOf(meta)}" data-act="tab" data-arg="manage" title="난이도"><i class="fa-solid ${d0.icon}"></i> ${d0.name}</button>
                <button class="ss-ib" data-act="inbox" title="알림함"><i class="fa-${nNew ? 'solid' : 'regular'} fa-bell"></i>${nNew ? `<i class="ss-badge">${nNew > 99 ? '99+' : nNew}</i>` : ''}</button>
                <button class="ss-ib" data-act="search" title="검색"><i class="fa-solid fa-magnifying-glass"></i></button>
                <button class="ss-ib" data-act="copydump" title="📋 지금 상태 복사 — 최근 메시지 원문 · 상태 전체 · 편집 기록 · 주입문을 한 번에 (고쳐 달라고 붙여 넣는 용 · AI 0회)"><i class="fa-solid fa-clipboard"></i></button>
                <button class="ss-ib ${meta.paused ? 'on' : ''}" data-act="pause" title="${meta.paused ? '재개' : '일시정지 (AI에게 상태를 보내지 않음)'}"><i class="fa-solid ${meta.paused ? 'fa-play' : 'fa-pause'}"></i></button>
                <button class="ss-ib" data-act="prompts" title="프롬프트 · 토큰"><i class="fa-solid fa-scroll"></i></button>
                ${viewTr() ? (() => { const nTr = missingTr().length; return `<button class="ss-ib" data-act="trfix" title="🌐 번역 — ${nTr ? `아직 영어로 남은 글 ${nTr}개 번역하기 · ` : ''}이상하게 번역된 이름·낱말 고치기"><i class="fa-solid fa-language"></i>${nTr ? `<i class="ss-badge">${nTr > 99 ? '99+' : nTr}</i>` : ''}</button>`; })() : ''}
                <button class="ss-helpchip" data-act="help" title="미트볼 도우미 — 모르는 기능을 물어보면 바로 답해요 (AI 0회)"><i class="fa-solid fa-circle-question"></i><span>도우미</span></button>
                <button class="ss-ib" data-act="fullscreen" title="${!inSide && settings().sheetFull ? '전체화면 끄기' : '전체화면'}"><i class="fa-solid ${!inSide && settings().sheetFull ? 'fa-compress' : 'fa-expand'}"></i></button>
                ${inSide ? `<button class="ss-ib" data-act="sidemini" title="작게"><i class="fa-solid fa-down-left-and-up-right-to-center"></i></button>` : ''}
            </div>
        </header>
        ${meta.paused ? `<div class="ss-pausebar">${mascot('sleep', 'xs') || '<i class="fa-solid fa-pause"></i>'} 일시정지 중 — AI에게 상태를 보내지 않아요<button class="ss-btn sm" data-act="pause">재개</button></div>` : ''}
        <nav class="ss-groups">${gs.map(x => `<button class="${x === g ? 'on' : ''}" data-act="group" data-arg="${x.id}"><i class="fa-solid ${x.icon}"></i><span>${x.name}</span>${x === g ? '' : groupBadge(x, s, meta)}</button>`).join('')}</nav>
        ${groupTabs(g, meta).length > 1 ? `<nav class="ss-tabs">${groupTabs(g, meta).map(t => `<button class="${t === tab ? 'on' : ''}" data-act="tab" data-arg="${t}"><i class="fa-solid ${TAB_INFO(t).icon}"></i>${esc(TAB_INFO(t).name)}${isHidden(t === 'home' ? 'core' : TAB_MOD(t), meta) ? '<i class="fa-solid fa-eye-slash ss-hid" title="가림 — AI에게 안 보냄"></i>' : ''}${badgeFor(t, s, meta)}</button>`).join('')}</nav>` : ''}
        ${hidden ? `<div class="ss-hidebar"><i class="fa-solid fa-eye-slash"></i><span>가린 칸 — AI에게 이 칸을 안 보내는 중이에요. 화면·직접 편집·변화 기록은 그대로예요.</span><button class="ss-btn sm" data-act="hidetog">다시 보내기</button></div>` : ''}
        ${tools || instruct ? `<div class="ss-toolrow"><div class="ss-toolrow-t"><i class="fa-solid ${info.icon}"></i>${esc(info.name)}</div>${tools}</div>${instruct}` : ''}
        <main class="ss-body" data-tab="${tab}">${body}</main>
    </div>`;
    if (st.mode !== 'edit' && st.mode !== 'json' && tab !== 'manage' && (pseudo || data)) applyParts(el, tab); // 👁 보일 것 (v2.7.19)
    if (st.mode === 'edit') bindEditor(el.querySelector('.ss-editor'), st.work, EDIT[mod], () => {
        const box = el.querySelector('.ss-editor'); const all0 = [...box.querySelectorAll('details')]; const open = all0.filter(d => d.open).map(d => all0.indexOf(d));
        box.innerHTML = editorHTML(st.work, EDIT[mod]);
        const all = [...box.querySelectorAll('details')]; open.forEach(i => all[i]?.setAttribute('open', ''));
    });
    el.querySelector('.ss-instruct textarea')?.addEventListener('input', (e) => { st.ui.instructText = e.target.value; });
    el.querySelector('.ss-cin')?.addEventListener('input', (e) => { st.ui.draft = e.target.value; });
    const th = el.querySelector('.ss-thread, .ss-letter-list'); if (th) th.scrollTop = th.scrollHeight;
    bindPanel(el);
}
app.renderPanel = renderPanel;

const ACTIONS = { ...PARTS_ACTIONS, ...VIEW_ACTIONS, ...DICE_ACTIONS, ...CONTACT_ACTIONS, ...FEED_ACTIONS, ...MONEY_ACTIONS, ...FATE_ACTIONS };
const CHANGES = { ...VIEW_CHANGES, ...DICE_CHANGES, ...FEED_CHANGES };

async function onPanelAction(el, act, arg, btn) {
    const st = el._ss;
    const s = app.current?.state;
    const tab = st.tab;
    const mod = TAB_MOD(tab);
    const mname = TAB_INFO(tab)?.name;
    const rr = () => renderPanel(el);
    switch (act) {
        case 'wizard': return openWizard();
        case 'blank': return startBlank();
        case 'group': { const g = allGroups().find(x => x.id === arg); if (!g) return; st.group = g.id; st.tab = groupTabs(g, getMeta())[0]; st.mode = 'view'; st.ui = {}; return rr(); }
        case 'favtog': { const set = settings(); const f = new Set(set.favTabs ?? []); if (f.has(tab)) f.delete(tab); else f.add(tab); set.favTabs = [...f]; saveSettings(); if (!f.has(tab) && st.group === 'fav') st.group = null; return rerenderPanels(true); }
        case 'hidetog': {
            const hm = tab === 'home' ? 'core' : TAB_MOD(tab);
            const m = getMeta(true), h = { ...(m.hide ?? {}) };
            const now = !h[hm];
            if (now) h[hm] = true; else { delete h[hm]; if (s) m.fullTurn = s.turn; } // 다시 켠 턴엔 변화 위주라도 전체를 한 번
            m.hide = h;
            await saveMeta();
            app.refreshNow?.();
            toastr.info(now ? `「${mname}」을(를) 가렸어요. 다시 켤 때까지 AI에게 안 보내요 (화면·기록은 그대로).` : `「${mname}」을(를) 다시 AI에게 보내요.`, TITLE);
            return rerenderPanels(true);
        }
        case 'trfix': return app.openTrFix?.(null, mod); // 지금 연 탭의 글부터 (v2.7.19)
        case 'copydump': return app.copyDump?.();
        case 'inbox': return app.openInbox?.();
        case 'search': return app.openSearch?.();
        case 'help': return app.openHelp?.();
        case 'cardload': return loadFromCard(setBase, false);
        case 'carrystart': return startCarry(setBase);
        case 'filerestore': return restoreFile(setBase);
        case 'tab': st.tab = arg; st.mode = 'view'; st.ui = {}; if (el.classList.contains('ss-panel-side') && settings().sideState !== 'full') { settings().sideState = 'full'; saveSettings(); ensureUI(); } return rr();
        case 'instructtog': st.ui.instructOpen = !st.ui.instructOpen; return rr();
        case 'edit': st.work = clone((mod === 'core' ? s.core : s.data[mod]) ?? EMPTY[mod]()); st.mode = 'edit'; return rr();
        case 'json': st.mode = 'json'; return rr();
        case 'wipemod': {
            if (mod === 'core' || !s?.data?.[mod]) return;
            if (!(await askConfirm(`<b>「${esc(mname)}」 칸을 전체 삭제할까요?</b><br><small>내용 · 이 칸의 편집 기록 · 지금까지 AI 답에 적힌 이 칸의 변화(칩)까지 모두 없앤 것으로 해요. 하루 정리 · 플레이 기록 숫자에서도 빠져요.<br>날짜 · 화폐 · 관계 단계표 · 연락 방식 같은 <b>틀</b>은 남겨요. 채팅 글과 세이브 슬롯은 그대로예요.<br><b>되돌릴 수 없어요</b> — 걱정되면 먼저 관리 탭 › 세이브.</small>`))) return;
            await wipeModule(mod); st.ui = {};
            toastr.success(`「${esc(mname)}」 칸을 비웠어요.`, TITLE);
            return rr();
        }
        case 'cancel': st.mode = 'view'; return rr();
        case 'save': st.mode = 'view'; await commit(mod, st.work, `✏️ ${mname} 직접 편집`, { keep: true }); return;
        case 'savejson': {
            try { const obj = JSON.parse(el.querySelector('.ss-json').value); st.mode = 'view'; await commit(mod, obj, `✏️ ${mname} 직접 편집`, { keep: true }); }
            catch (e) { toastr.error(`JSON 형식이 올바르지 않아요: ${esc(e.message)}`, TITLE); }
            return;
        }
        case 'genblank': return commit(mod, EMPTY[mod](), '', { keep: true });
        case 'gen': case 'regen': {
            if (act === 'regen' && !(await askConfirm(`「${mname}」 칸을 처음부터 다시 만들까요? (AI 1회 · 지금 내용은 바뀝니다. 부분 수정은 「AI로 수정」)`))) return;
            busyBtn(btn, true);
            try {
                const sources = await gatherSources({});
                const data = await genModule(mod, { sources, core: s.core, profileMode: s.data.profile?.mode, instruction: st.ui.instructText, contactMode: s.data.contact?.mode });
                if (mod === 'rel' && s.data.profile) relFromProfiles(data, s.data.profile); // 다시 생성해도 프로필의 사람은 빠지지 않게
                await commit(mod, data, `🔄 ${mname} 생성`, { keep: true });
                toastr.success('채웠어요.', TITLE);
            } catch (e) { ssErr(LOG, e); toastr.error(`생성 실패: ${esc(e.message)}`, TITLE); busyBtn(btn, false); }
            return;
        }
        case 'instruct': {
            const text = (st.ui.instructText ?? '').trim();
            if (!text) { toastr.info('지시를 적어 주세요.', TITLE); return; }
            busyBtn(btn, true, 'AI가 고치는 중…');
            try {
                const before = mod === 'core' ? s.core : s.data[mod];
                const after = await instructModule(mod, text, s);
                busyBtn(btn, false);
                const box = h(`<div class="ss-root ss-scope ss-preview"><h3>바뀌는 내용 — ${esc(mname)}</h3><p class="ss-hint">지시: ${esc(text)}</p>${diffHTML(before, after)}</div>`);
                if (await confirmPopup(box)) { st.ui.instructText = ''; st.ui.instructOpen = false; await commit(mod, after, `💬 ${mname} 수정: ${short(text, 40)}`, { keep: true }); toastr.success('적용했어요.', TITLE); }
            } catch (e) { ssErr(LOG, e); toastr.error(`수정 실패: ${esc(e.message)}`, TITLE); busyBtn(btn, false); }
            return;
        }
        case 'pause': return togglePause();
        case 'skiponce': { const m = getMeta(true); m.skipOnce = true; await saveMeta(); app.refreshNow(); toastr.info('다음 생성 1번은 상태창 없이 보내요.', TITLE); return; }
        case 'prompts': return openPromptWindow();
        case 'themewin': return openThemeWindow();
        case 'trsheet': return translateSheet(btn);
        case 'sidemini': settings().sideState = 'mini'; saveSettings(); return ensureUI();
        case 'fullscreen': {
            const dlg = el.closest('dialog');
            if (!dlg) return openSheet(el._ss?.tab, { full: true }); // 사이드에서 누르면 전체화면 창으로
            const on = !dlg.classList.contains('ss-full');
            dlg.classList.toggle('ss-full', on);
            settings().sheetFull = on; saveSettings();
            return renderPanel(el);
        }
        default: { const fn = ACTIONS[act] ?? MANAGE_ACTIONS[act]; if (fn) return fn(el, arg, btn, s); }
    }
}
function bindPanel(el) {
    if (el._ssBound) return;
    el._ssBound = true;
    el.addEventListener('click', (e) => {
        const pr = e.target.closest('[data-preset-ss]');
        if (pr && el.contains(pr)) { e.preventDefault(); applyPreset(pr.dataset.presetSs); return; }
        if (e.target.closest('a[href]')) return; // 추천 곡 ▶ 링크는 그대로 열리게
        const b = e.target.closest('[data-act]');
        if (!b || !el.contains(b)) return;
        if (b.tagName === 'SELECT' || (b.tagName === 'INPUT' && b.type !== 'button')) return;
        if (b.closest('.ss-ct-row') && e.target.closest('[data-act="cmenu"]') && b.dataset.act !== 'cmenu') return;
        e.preventDefault(); e.stopPropagation();
        const act = b.dataset.act;
        onPanelAction(el, act, b.dataset.arg, b).then(() => { if (!['tab', 'group', 'cancel', 'help', 'inbox', 'search', 'fullscreen', 'sidemini', 'copydump'].includes(act)) hintAfterAction(el._ss?.tab); }).catch(err => { ssErr(LOG, err); toastr.error(esc(err.message), TITLE); });
    });
    el.addEventListener('change', (e) => { const t = e.target; if (t.dataset.chg) CHANGES[t.dataset.chg]?.(el, t, app.current?.state); });
    el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey && e.target.classList.contains('ss-cin') && !letterMode(app.current?.state.data.contact) && !e.isComposing) { e.preventDefault(); el.querySelector('[data-act="csend"]')?.click(); }
    });
}
export function rerenderPanels(force = false) {
    for (const el of [...panels]) {
        if (!el.isConnected) { panels.delete(el); continue; }
        // 접혀 있는 사이드 펼침 패널은 안 보이니 그리지 않고, 펼칠 때 그린다 (갱신마다 숨은 화면을 그리던 것)
        if (el.classList.contains('ss-panel-side') && settings().sideState !== 'full') { el._ssStale = true; continue; }
        if (force && el._ss?.mode === 'view') { renderPanel(el); continue; }
        if (el._ss?.hold) continue;
        if (el._ss?.mode && el._ss.mode !== 'view') continue;
        if (el.contains(document.activeElement) && /TEXTAREA|INPUT/.test(document.activeElement.tagName) && document.activeElement.type !== 'checkbox') continue;
        renderPanel(el);
    }
}
export async function openSheet(tab, opt = {}) {
    const el = document.createElement('div');
    el.className = 'ss-panel ss-panel-pop';
    el._ss = { tab: tab ?? 'home', mode: 'view', work: null, ui: {} };
    const full = opt.full ?? settings().sheetFull;
    if (opt.full) settings().sheetFull = true;
    panels.add(el);
    renderPanel(el);
    await popup(el, { large: true, full });
    panels.delete(el);
}
app.openSheet = (tab) => {
    const el = [...panels].find(p => p.isConnected && p.classList.contains('ss-panel-pop') && p.closest('dialog[open]') && p._ss?.mode === 'view' && !p._ss.rollOnly);
    if (!el) return openSheet(tab);
    if (tab && el._ss.tab !== tab) { Object.assign(el._ss, { tab, group: null, mode: 'view', ui: {} }); renderPanel(el); }
};
app.rerenderPanels = rerenderPanels;
app.newSheet = openSheet; // 열린 시트를 다시 쓰지 않고 그대로 열기 (wizard.js)

async function togglePause() {
    const m = getMeta(true);
    m.paused = !m.paused;
    await saveMeta();
    app.refreshNow();
    toastr.info(m.paused ? '일시정지 — AI에게 상태창을 보내지 않아요. (OOC·퀵리플라이용)' : '다시 켰어요.', TITLE);
}
app.togglePause = togglePause;

// ───── 관리 동작 ─────
const MANAGE_ACTIONS = {
    fullbackup: () => fullBackup(),
    slotsave: () => saveSlot(),
    slotload: (el, arg) => loadSlot(arg),
    slotdel: (el, arg) => deleteSlot(arg),
    cardattach: () => attachToCard(),
    carddetach: () => detachFromCard(),
    carryprep: () => prepareCarry(),
    diagnose: () => diagnose(),
    pipcheck: async () => { const { openPip } = await import('./pip.js'); return openPip(); },
    perf: () => app.measureLoad?.(),
    export: () => {
        const meta = getMeta();
        const blob = new Blob([JSON.stringify({ statussim: VERSION, base: { core: app.current.state.core, data: app.current.state.data }, mods: meta.mods, difficulty: meta.difficulty }, null, 2)], { type: 'application/json' });
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `statussim_${(app.current.state.core.title || 'world').replace(/[\\/:*?"<>|]/g, '_')}.json`; a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    },
    import: () => restoreFile(setBase),
    chatoff: async () => { const meta = getMeta(true); meta.off = true; await saveMeta(); app.refreshNow(); toastr.info('이 채팅에서 상태창을 껐어요. 확장 설정의 「이 채팅에서 켜기」로 다시 켜요.', TITLE); },
    reset: async () => { if (!(await askConfirm('이 채팅의 상태창 데이터를 모두 지울까요? 되돌릴 수 없어요.'))) return; delete ctx().chatMetadata[MODULE]; await saveMeta(true); app.refreshNow(); },
    fillempty: async (el, arg, btn, s) => {
        const meta = getMeta();
        const todo = MOD_IDS.filter(id => modOn(id, meta) && !s.data[id]);
        if (!todo.length) { toastr.info('비어 있는 칸이 없어요.', TITLE); return; }
        if (!(await askConfirm(`비어 있는 ${todo.length}칸을 채워요 (AI ${todo.length}회).`))) return;
        busyBtn(btn, true, `0/${todo.length}`);
        const sources = await gatherSources({});
        let k = 0;
        for (const id of todo) {
            try { await commit(id, await genModule(id, { sources, core: app.current.state.core, profileMode: app.current.state.data.profile?.mode ?? 'minimal' }), '', { keep: true }); }
            catch (e) { toastr.error(`${MOD[id].name} 실패: ${esc(e.message)}`, TITLE); }
            busyBtn(btn, false); busyBtn(btn, true, `${++k}/${todo.length}`);
        }
        busyBtn(btn, false);
    },
};

// ───── HUD (채팅 위 상태 바) ─────
function hudHTML() {
    const meta = getMeta();
    if (!app.current) return `<div class="ss-hud-row"><button class="ss-hud-t" data-hud="make"><b><i class="fa-solid fa-gauge-high"></i> ${TITLE}</b><small>이 채팅에 상태창 만들기</small></button></div>`;
    const s = app.current.state, d = s.data;
    const cal = modOn('calendar', meta) && d.calendar, here = modOn('map', meta) && d.map?.here;
    const un = unreadCount(s, meta);
    const bars = modOn('stats', meta) && d.stats?.bars.length ? d.stats.bars.slice(0, 4) : [];
    const alerts = [];
    const due = dueLetters(s, meta);
    if (due.length) alerts.push(`<button data-hud="tab:contact">📬 편지 도착 — ${due.map(x => esc(x.who)).join(', ')}</button>`);
    if (s.pendingRoll && modOn('dice', meta)) alerts.push(`<button data-hud="roll">🎲 판정 요청 — ${esc(s.pendingRoll.label)}</button>`);
    const d0 = DIFFS[diffOf(meta)];
    // v2.7.21: 한 줄 — 여는 아이콘 · 타일 판 · 단추들 (제목은 아이콘에 마우스를 올리면)
    const acts = `${modOn('dice', meta) && d.dice ? `<span class="ss-t ic" role="button" data-hud="roll" title="주사위"><i class="fa-solid fa-dice-d20"></i></span>` : ''}${(() => { const n = unreadNotes(meta); return `<span class="ss-t ic" role="button" data-hud="inbox" title="알림함"><i class="fa-${n ? 'solid' : 'regular'} fa-bell"></i>${n ? `<b class="al">${n > 99 ? '99+' : n}</b>` : ''}</span>`; })()}<span class="ss-t ic${meta.paused ? ' on' : ''}" role="button" data-hud="pause" title="${meta.paused ? '재개' : '일시정지'}"><i class="fa-solid ${meta.paused ? 'fa-play' : 'fa-pause'}"></i></span><span class="ss-t ic${app.tileEdit ? ' on' : ''}" role="button" data-hud="edit" title="칸 편집 (순서 · 크기 · 넣고 빼기)"><i class="fa-solid fa-pen"></i></span>`;
    if (settings().hudTiles !== false) return `${tileBoard(s, 'hud', acts, `<span class="ss-t ic open" role="button" data-hud="open" title="${esc(s.core.title || TITLE)} — 상태창 열기"><i class="fa-solid fa-gauge-high"></i></span>`)}
        ${meta.paused ? `<div class="ss-hud-pause"><i class="fa-solid fa-pause"></i> 일시정지 중 · AI에게 상태를 보내지 않아요</div>` : ''}
        ${alerts.length ? `<div class="ss-hud-alert">${alerts.join('')}</div>` : ''}`;
    return `<div class="ss-hud-row">
        <button class="ss-hud-t" data-hud="open"><b>${esc(s.core.title || TITLE)}</b><small hidden>${[cal ? `${esc(dateShort(cal))} ${esc(cal.time)}${freshDot('calendar')}` : '', here ? `📍 ${esc(here)}${freshDot('map', 'here')}` : ''].filter(Boolean).join(' · ') || '상태창 열기'}</small></button>
        <div class="ss-hud-a">
            ${modOn('dice', meta) && d.dice ? `<button class="ss-ib" data-hud="roll" title="주사위"><i class="fa-solid fa-dice-d20"></i></button>` : ''}
            ${modOn('contact', meta) && d.contact ? `<button class="ss-ib" data-hud="tab:contact" title="연락"><i class="fa-solid ${d.contact.mode === 'letter' ? 'fa-envelope' : 'fa-comment'}"></i>${un ? `<i class="ss-badge">${un}</i>` : ''}</button>` : ''}
            ${(() => { const n = unreadNotes(meta); return `<button class="ss-ib" data-hud="inbox" title="알림함"><i class="fa-${n ? 'solid' : 'regular'} fa-bell"></i>${n ? `<i class="ss-badge">${n > 99 ? '99+' : n}</i>` : ''}</button>`; })()}
            <button class="ss-ib ${meta.paused ? 'on' : ''}" data-hud="pause" title="${meta.paused ? '재개' : '일시정지 — OOC·퀵리플라이 때'}"><i class="fa-solid ${meta.paused ? 'fa-play' : 'fa-pause'}"></i></button>
            ${bars.length ? `<button class="ss-ib" data-hud="fold" title="게이지 접기/펼치기"><i class="fa-solid fa-chevron-${settings().hudOpen ? 'up' : 'down'}"></i></button>` : ''}
        </div></div>
        ${meta.paused ? `<div class="ss-hud-pause"><i class="fa-solid fa-pause"></i> 일시정지 중 · AI에게 상태를 보내지 않아요</div>` : ''}
        ${tileBoard(s, 'hud')}
        ${alerts.length ? `<div class="ss-hud-alert">${alerts.join('')}</div>` : ''}`;
}
function onHud(e) {
    const b = e.target.closest('[data-hud]'); if (!b) return;
    const a = b.dataset.hud;
    if (a === 'make') return openWizard();
    if (a === 'open') return openSheet();
    if (a === 'roll') return openRoll(app.current?.state.pendingRoll?.label ?? '', app.current?.state.pendingRoll?.dc ?? 0);
    if (a === 'pause') return togglePause();
    if (a === 'inbox') return app.openInbox?.();
    if (a === 'fold') { settings().hudOpen = !settings().hudOpen; saveSettings(); return renderHud(); }
    if (a.startsWith('tab:')) return openSheet(a.slice(4));
    if (a.startsWith('go:')) { app.hudExp = null; renderHud(); return openSheet(a.slice(3)); }
    if (a.startsWith('exp:')) { const k = a.slice(4); app.hudExp = app.hudExp === k ? null : k; return renderHud(); }
    if (tileAct(a, rerenderTiles, 'hud')) return;
}
app.renderHud = () => renderHud();
export function renderHud() {
    const set = settings();
    let hud = document.getElementById('ss-hud');
    const show = set.enabled && set.showHud && isActive();
    document.body.classList.toggle('ss-nohud', !show);
    if (!show) { hud?.remove(); return; }
    const sheld = document.getElementById('sheld');
    const anchor = set.hudPos === 'bottom' ? document.getElementById('form_sheld') : document.getElementById('chat');
    if (!sheld || !anchor) return;
    if (!hud) { hud = document.createElement('div'); hud.id = 'ss-hud'; hud.className = 'ss-hud ss-scope'; hud.addEventListener('click', onHud); }
    if (hud.nextElementSibling !== anchor) anchor.parentElement.insertBefore(hud, anchor);
    hud.classList.toggle('paused', !!getMeta()?.paused);
    hud.classList.toggle('bottom', set.hudPos === 'bottom');
    if (setHTML(hud, hudHTML())) fitSoon(hud);
    paintHost(hud, 'hud');
    bindTileDrag(hud, rerenderTiles); watchFit(hud);
}
// 글자 맞추기는 다음 화면 그리기 때 (그린 직후 바로 재면 긴 채팅 전체를 한 번 더 배치하게 됨)
const fitQ = new Set(); let fitRaf = 0;
function fitSoon(el) { if (!el) return; fitQ.add(el); if (fitRaf) return; fitRaf = requestAnimationFrame(() => { fitRaf = 0; const l = [...fitQ]; fitQ.clear(); for (const x of l) if (x.isConnected) fitTiles(x); }); }
// 판의 배경 · 테두리를 바깥 틀(HUD · 사이드 미니창)에 칠함 — 흰 틀이 남지 않게 (v2.7.21)
// 배경 · 테두리를 안 골랐으면 테마 색 그대로 · 테두리는 아주 얇게
function paintHost(el, attr) {
    if (!el) return;
    const set = settings(), bs = set.boardStyle ?? {}, img = set.tileDeco?.[`${attr}Bg`];
    const pre = img ? null : BOARD_BG[set.boardPreset ?? 'daisy']; // 올린 그림이 없으면 기본 무늬 (v2.7.21)
    el.classList.add('ss-tbhost');
    const v = { '--h-bg': bs.bg || pre?.bg || '', '--h-bd': bs.bd || pre?.bd || '', '--h-img': img ? `url("${img}")` : pre?.img || '', '--h-size': img ? 'cover' : pre?.size || '', '--h-pos': img ? 'center' : pre?.pos || '', '--h-rep': img ? 'no-repeat' : '' };
    for (const [k, x] of Object.entries(v)) { if (x) { if (el.style.getPropertyValue(k) !== x) el.style.setProperty(k, x); } else if (el.style.getPropertyValue(k)) el.style.removeProperty(k); }
    el.classList.toggle('has-img', !!img || !!pre?.img);
}
// 판 폭이 바뀌면(창 크기 · 사이드 열고 닫기) 글자 크기를 다시 맞춤
function watchFit(el) { if (!el || el._ssFit || typeof ResizeObserver === 'undefined') return; let w = 0; el._ssFit = new ResizeObserver(([e]) => { const nw = Math.round(e.contentRect.width); if (nw && nw !== w) { w = nw; fitTiles(el); } }); el._ssFit.observe(el); }
// 타일 판이 바뀌면 HUD · 사이드 둘 다
function rerenderTiles() { renderHud(); const body = document.querySelector('#ss-side .ss-mini-body'); if (body && setHTML(body, sideMiniHTML())) fitSoon(body); paintHost(document.querySelector('#ss-side .ss-side-mini'), 'side'); }
// 같은 내용이면 다시 그리지 않기 (갱신마다 HUD·사이드를 새로 그리면 그 아래 채팅까지 다시 배치됨)
function setHTML(el, html) { if (!el || el._ssHtml === html) return false; el.innerHTML = html; el._ssHtml = html; return true; }

// ───── 사이드 패널 (닫힘 · 미니 · 펼침) ─────
function sideMiniHTML() {
    if (!app.current) return `<div class="ss-mini-empty"><button class="ss-btn pri sm" data-side="make"><i class="fa-solid fa-wand-magic-sparkles"></i> 만들기</button></div>`;
    const s = app.current.state;
    const keys = settings().sideMini ?? [];
    const w = tileBoard(s, 'side'); // v2.7.21: HUD와 같은 타일 판
    return `<div class="ss-mini-head"><b>${esc(short(s.core.title || TITLE, 16))}</b>${getMeta()?.paused ? '<i class="fa-solid fa-pause ss-hl"></i>' : ''}<span class="ss-t ic${app.tileEdit ? ' on' : ''}" role="button" data-side="edit" title="칸 편집"><i class="fa-solid fa-pen"></i></span></div>${w || '<small class="ss-hint">표시할 항목을 꾸미기에서 고르세요</small>'}`;
}
function onSide(e) {
    const b = e.target.closest('[data-side]'); if (!b) return;
    const a = b.dataset.side, set = settings();
    if (a === 'make') return openWizard();
    if (a.startsWith('go:')) { app.sideExp = null; return openSheet(a.slice(3)); }
    if (a.startsWith('exp:')) { const k = a.slice(4); app.sideExp = app.sideExp === k ? null : k; const body = document.querySelector('#ss-side .ss-mini-body'); if (body && setHTML(body, sideMiniHTML())) fitSoon(body); return; }
    if (tileAct(a, rerenderTiles, 'side')) return;
    const mobile = window.innerWidth <= 700 && !document.body.classList.contains('ss-nohud');
    if (a === 'cycle') set.sideState = mobile ? (set.sideState === 'full' ? 'mini' : 'full') : set.sideState === 'closed' ? 'mini' : set.sideState === 'mini' ? 'full' : 'closed';
    if (a === 'full') set.sideState = 'full';
    if (a === 'close') set.sideState = 'closed';
    if (a === 'mini') set.sideState = 'mini';
    if (a === 'mindfreq' && ['always', 'random'].includes(b.dataset.v)) set.mindFreq = b.dataset.v; // 💭 속마음 빈도 (v2.7.21)
    if (a === 'mindmode' && ['off', 'thought', 'emoji', 'kaomoji'].includes(b.dataset.v)) set.mindMode = b.dataset.v;
    if (a === 'mindfreq' || a === 'mindmode') { saveSettings(); app.refreshNow?.(); app.rerenderPanels?.(true); const body = document.querySelector('#ss-side .ss-mini-body'); if (body) setHTML(body, sideMiniHTML()); return; }
    saveSettings(); ensureUI();
}
export function ensureUI() {
    const set = settings();
    applyTheme();
    renderHud();
    // 떠 있는 버튼
    let fb = document.getElementById('ss-float');
    const showFloat = set.enabled && set.showFloat;
    if (showFloat && !fb) {
        fb = h('<button id="ss-float" class="ss-float ss-scope" title="상태창"><i class="fa-solid fa-gauge-high"></i><i class="ss-badge ss-hide"></i></button>');
        document.body.appendChild(fb);
        makeDraggable(fb);
        fb.addEventListener('click', () => { if (!fb._dragged) openSheet(); });
    }
    if (!showFloat && fb) { fb.remove(); fb = null; }
    if (fb) {
        if (set.floatPos) { fb.style.right = `${set.floatPos.x}px`; fb.style.top = `calc(100dvh - ${set.floatPos.y + 48}px)`; }
        const n = app.current ? unreadCount(app.current.state) + (app.current.state.pendingRoll ? 1 : 0) : 0;
        const b = fb.querySelector('.ss-badge'); b.textContent = n || ''; b.classList.toggle('ss-hide', !n);
        fb.classList.toggle('ss-hide', !isActive());
    }
    // 사이드
    let side = document.getElementById('ss-side');
    const showSide = set.enabled && set.showSide && isActive();
    if (showSide && !side) {
        side = h(`<aside id="ss-side" class="ss-side ss-scope">
            <button class="ss-side-handle" data-side="cycle" title="상태창 (누를 때마다: 닫힘 → 미니 → 펼침)"><i class="fa-solid fa-gauge-high"></i><i class="ss-badge ss-hide"></i></button>
            <div class="ss-side-mini"><div class="ss-mini-body"></div><div class="ss-mini-foot"><button class="ss-ib" data-side="full" title="펼치기"><i class="fa-solid fa-up-right-and-down-left-from-center"></i></button><button class="ss-ib" data-side="close" title="숨기기"><i class="fa-solid fa-xmark"></i></button></div></div>
            <div class="ss-side-full"><div class="ss-panel ss-panel-side"></div><button class="ss-side-x" data-side="close" title="닫기"><i class="fa-solid fa-xmark"></i></button></div>
        </aside>`);
        document.body.appendChild(side);
        side.addEventListener('click', onSide);
        bindTileDrag(side.querySelector('.ss-mini-body'), () => rerenderTiles()); watchFit(side.querySelector('.ss-mini-body'));
        side.querySelector('.ss-mini-body').addEventListener('click', (e) => { // 미니 위젯을 누르면 펼침
            if (!e.target.closest('.ss-mini-w')) return;
            settings().sideState = 'full'; saveSettings(); ensureUI();
        });
        const pnl = side.querySelector('.ss-panel');
        pnl._ss = { tab: 'home', mode: 'view', work: null, ui: {} };
        panels.add(pnl);
    }
    if (!showSide && side) { panels.delete(side.querySelector('.ss-panel')); side.remove(); side = null; }
    // body 클래스는 바뀔 때만 건드린다 (지웠다 다시 붙이면 매 갱신마다 페이지 전체 스타일을 다시 계산 → 긴 채팅 렉의 주범)
    const want = side && set.sideState !== 'closed' ? `ss-body-${set.sideState}` : '';
    for (const c of ['ss-body-full', 'ss-body-mini']) document.body.classList.toggle(c, c === want);
    if (side) {
        if (side.dataset.state !== set.sideState) side.dataset.state = set.sideState;
        const w = `${clamp(Number(set.sideWidth) || 400, 300, 640)}px`;
        if (side.style.getPropertyValue('--ss-side-w') !== w) side.style.setProperty('--ss-side-w', w);
        if (setHTML(side.querySelector('.ss-mini-body'), sideMiniHTML())) fitSoon(side.querySelector('.ss-mini-body'));
        paintHost(side.querySelector('.ss-side-mini'), 'side');
        const n = app.current ? unreadCount(app.current.state) : 0;
        const b = side.querySelector('.ss-side-handle .ss-badge'); b.textContent = n || ''; b.classList.toggle('ss-hide', !n);
        if (set.sideState === 'full') { const pnl = side.querySelector('.ss-panel'); if (!pnl.innerHTML || !pnl._ssShown || pnl._ssStale) { pnl._ssShown = true; pnl._ssStale = false; renderPanel(pnl); } }
    }
}
app.ensureUI = ensureUI;
function makeDraggable(btn) {
    let sx, sy, ox, oy, moving = false;
    btn.addEventListener('pointerdown', (e) => { sx = e.clientX; sy = e.clientY; moving = false; btn._dragged = false; const r = btn.getBoundingClientRect(); ox = window.innerWidth - r.right; oy = window.innerHeight - r.bottom; btn.setPointerCapture(e.pointerId); });
    btn.addEventListener('pointermove', (e) => {
        if (sx === undefined || !btn.hasPointerCapture(e.pointerId)) return;
        const dx = e.clientX - sx, dy = e.clientY - sy;
        if (!moving && Math.hypot(dx, dy) < 6) return;
        moving = true; btn._dragged = true;
        btn.style.right = `${clamp(ox - dx, 0, window.innerWidth - 50)}px`; btn._y = clamp(oy - dy, 0, window.innerHeight - 50); btn.style.top = `calc(100dvh - ${btn._y + 48}px)`;
    });
    btn.addEventListener('pointerup', (e) => {
        if (btn.hasPointerCapture(e.pointerId)) btn.releasePointerCapture(e.pointerId);
        sx = undefined;
        if (moving) { settings().floatPos = { x: parseInt(btn.style.right, 10), y: btn._y ?? 120 }; saveSettings(); setTimeout(() => { btn._dragged = false; }, 50); }
    });
}

export async function openRoll(label, dc) {
    if (!ready() || !app.current) return;
    if (!modOn('dice') || !app.current.state.data.dice) { toastr.warning('주사위 기능이 꺼져 있거나 비어 있어요.', TITLE); return; }
    const el = document.createElement('div');
    el.className = 'ss-panel ss-panel-pop';
    el._ss = { tab: 'dice', mode: 'view', work: null, ui: {}, rollOnly: true };
    if (label) {
        const attrs = app.current.state.data.stats?.attrs ?? [];
        const q = app.current.state.data.dice.quick.find(x => x.name === label);
        const guess = q ? attrs.find(a => a.name === q.attr) : attrs.find(a => label.includes(a.name) || a.name.includes(label));
        el._ss.ui.dice = { label, attr: guess?.name ?? '', dc: dc || (app.current.state.data.dice.system === 'd100' ? 55 : 12), extra: 0 };
    }
    panels.add(el);
    renderPanel(el);
    await popup(el);
    panels.delete(el);
}
