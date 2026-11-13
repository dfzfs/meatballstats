// 틀: 상태창 패널 · HUD · 사이드(미니) · 떠 있는 버튼 · 만들기 · 프롬프트/토큰 창 · 꾸미기 창
import {
    DATA_V, app, ctx, settings, saveSettings, getMeta, saveMeta, modOn, isActive, ready, MODS, MOD, MOD_IDS, EMPTY, NORM, normalize, DIFFS, diffOf, GENRES, CONTACT_MODES,
    esc, short, clone, clamp, fmtNum, h, dateShort, userName, TITLE, LOG, VERSION, MODULE, sub, PLAY_MODES, normPlay, playOf, mascotUrl, relFromProfiles, ssErr, ssWarn, isHidden } from './core.js';
import { compute, buildInjection, setInjection, commit, addAdjust, gatherSources, loreNames, chatCharacters, unreadCount, dueLetters, inTransit } from './engine.js';
import { genModule, instructModule, genGroup, GEN_GROUPS } from './ai.js';
import { PROMPT_DEFS, P, setPrompt, countTokens, estTokens, FEATURE_NAMES } from './prompts.js';
import { popup, confirmPopup, askConfirm, busyBtn, editorHTML, bindEditor, diffHTML, ai1, gauge, seg, applyTheme, THEMES, THEME_KEYS, themeVars, avatar, emptyBox, sec, mascot } from './kit.js';
import { VIEW, VIEW_ACTIONS, VIEW_CHANGES, GROUPS, TAB_MOD, TAB_INFO, PSEUDO, manageHTML, miniWidgets, MINI, MINI_REL_VALS, MINI_REL_SORT, miniRelOpt } from './views.js';
import { fullBackup, restoreFile, saveSlot, loadSlot, deleteSlot, attachToCard, detachFromCard, loadFromCard, cardPack, prepareCarry, startCarry, carryFor, diagnose } from './safe.js';
import { applyPreset } from './extra.js';
import { unreadNotes } from './notify.js';
import { DICE_ACTIONS, DICE_CHANGES } from './dice.js';
import { CONTACT_ACTIONS } from './contact.js';
import { FEED_ACTIONS } from './feeds.js';
import { MONEY_ACTIONS } from './money.js';
import { FATE_ACTIONS } from './fate.js';
import { EDIT } from './core.js';
import { translateSheet } from './translate.js';
import { GEN_MODES, HYBRID_TPL, skeleton, skeletonCore, skeletonHint } from './skeleton.js';
import { REC_MODS, defaultModOn } from './core.js';
import { hintAfterAction } from './tips.js';

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
function groupTabs(g, meta) {
    return g.tabs.filter(t => PSEUDO.has(t) || modOn(TAB_MOD(t), meta));
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
    return '';
}
function groupBadge(g, s, meta) { return groupTabs(g, meta).some(t => badgeFor(t, s, meta)) ? '<i class="ss-dot"></i>' : ''; }

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
    const pseudo = PSEUDO.has(tab) && tab !== 'home';
    const data = pseudo ? {} : mod === 'core' ? s.core : s.data[mod];
    const editable = !pseudo;
    let body;
    if (tab === 'manage') body = manageHTML(s);
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
            <button class="ss-tool" data-act="regen" title="이 칸만 다시 생성 (AI 1회)"><i class="fa-solid fa-rotate"></i></button></div>` : (favBtn || hideBtn) && (pseudo || !data) ? `<div class="ss-tools">${favBtn}${hideBtn}</div>` : '';
    const instruct = st.ui.instructOpen && editable && data ? `<div class="ss-instruct"><textarea class="ss-in" rows="2" placeholder="${esc(INSTRUCT_HINT[mod] ?? '예: 스토리에 맞게 ○○를 추가하고 △△는 바꿔줘')}">${esc(st.ui.instructText ?? '')}</textarea>
        <div class="ss-row-btns"><button class="ss-btn pri sm" data-act="instruct">${ai1} 보내기</button><small class="ss-hint">바뀌는 내용을 먼저 보여 드려요.</small></div></div>` : '';
    const c = s.core, cal = s.data.calendar, here = s.data.map?.here;
    const sub2 = [cal && modOn('calendar', meta) ? `${dateShort(cal)} ${cal.time}` : '', here && modOn('map', meta) ? `📍 ${here}` : ''].filter(Boolean).join(' · ');
    const d0 = DIFFS[diffOf(meta)];
    const nNew = unreadNotes(meta);
    el.innerHTML = `<div class="ss-root ss-scope ${inSide ? 'in-side' : ''} ${meta.paused ? 'paused' : ''} ${settings().bottomNav ? 'navbottom' : ''}">
        <header class="ss-head">
            ${settings().mascotBuddy !== false ? mascot(meta.paused ? 'sleep' : nNew ? 'surprise' : 'idle', 'head', 'bob') : ''}
            <div class="ss-head-t"><b>${esc(c.title || TITLE)}</b>${sub2 ? `<small>${esc(sub2)}</small>` : ''}</div>
            <div class="ss-head-a">
                <button class="ss-chip btn diff-${diffOf(meta)}" data-act="tab" data-arg="manage" title="난이도"><i class="fa-solid ${d0.icon}"></i> ${d0.name}</button>
                <button class="ss-ib" data-act="inbox" title="알림함"><i class="fa-${nNew ? 'solid' : 'regular'} fa-bell"></i>${nNew ? `<i class="ss-badge">${nNew > 99 ? '99+' : nNew}</i>` : ''}</button>
                <button class="ss-ib" data-act="search" title="검색"><i class="fa-solid fa-magnifying-glass"></i></button>
                <button class="ss-ib ${meta.paused ? 'on' : ''}" data-act="pause" title="${meta.paused ? '재개' : '일시정지 (AI에게 상태를 보내지 않음)'}"><i class="fa-solid ${meta.paused ? 'fa-play' : 'fa-pause'}"></i></button>
                <button class="ss-ib" data-act="prompts" title="프롬프트 · 토큰"><i class="fa-solid fa-scroll"></i></button>
                <button class="ss-ib" data-act="help" title="미트볼 도우미 — 모르는 기능 물어보기 (AI)"><i class="fa-solid fa-circle-question"></i></button>
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

const ACTIONS = { ...VIEW_ACTIONS, ...DICE_ACTIONS, ...CONTACT_ACTIONS, ...FEED_ACTIONS, ...MONEY_ACTIONS, ...FATE_ACTIONS };
const CHANGES = { ...VIEW_CHANGES, ...DICE_CHANGES };

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
        case 'cancel': st.mode = 'view'; return rr();
        case 'save': st.mode = 'view'; await commit(mod, st.work, `✏️ ${mname} 직접 편집`); return;
        case 'savejson': {
            try { const obj = JSON.parse(el.querySelector('.ss-json').value); st.mode = 'view'; await commit(mod, obj, `✏️ ${mname} 직접 편집`); }
            catch (e) { toastr.error(`JSON 형식이 올바르지 않아요: ${esc(e.message)}`, TITLE); }
            return;
        }
        case 'genblank': return commit(mod, EMPTY[mod](), '');
        case 'gen': case 'regen': {
            if (act === 'regen' && !(await askConfirm(`「${mname}」 칸을 처음부터 다시 만들까요? (AI 1회 · 지금 내용은 바뀝니다. 부분 수정은 「AI로 수정」)`))) return;
            busyBtn(btn, true);
            try {
                const sources = await gatherSources({});
                const data = await genModule(mod, { sources, core: s.core, profileMode: s.data.profile?.mode, instruction: st.ui.instructText, contactMode: s.data.contact?.mode });
                if (mod === 'rel' && s.data.profile) relFromProfiles(data, s.data.profile); // 다시 생성해도 프로필의 사람은 빠지지 않게
                await commit(mod, data, `🔄 ${mname} 생성`);
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
                if (await confirmPopup(box)) { st.ui.instructText = ''; st.ui.instructOpen = false; await commit(mod, after, `💬 ${mname} 수정: ${short(text, 40)}`); toastr.success('적용했어요.', TITLE); }
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
        onPanelAction(el, act, b.dataset.arg, b).then(() => { if (!['tab', 'group', 'cancel', 'help', 'inbox', 'search', 'fullscreen', 'sidemini'].includes(act)) hintAfterAction(el._ss?.tab); }).catch(err => { ssErr(LOG, err); toastr.error(esc(err.message), TITLE); });
    });
    el.addEventListener('change', (e) => { const t = e.target; if (t.dataset.chg) CHANGES[t.dataset.chg]?.(el, t, app.current?.state); });
    el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey && e.target.classList.contains('ss-cin') && !app.current?.state.data.contact?.mode?.includes('letter') && !e.isComposing) { e.preventDefault(); el.querySelector('[data-act="csend"]')?.click(); }
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
            try { await commit(id, await genModule(id, { sources, core: app.current.state.core, profileMode: app.current.state.data.profile?.mode ?? 'minimal' }), ''); }
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
    return `<div class="ss-hud-row">
        <button class="ss-hud-t" data-hud="open"><b>${esc(s.core.title || TITLE)}</b><small>${[cal ? `${dateShort(cal)} ${esc(cal.time)}` : '', here ? `📍 ${esc(here)}` : ''].filter(Boolean).join(' · ') || '상태창 열기'}</small></button>
        <div class="ss-hud-chips">${modOn('wallet', meta) && d.wallet ? `<span class="ss-chip"><i class="fa-solid fa-coins"></i> ${fmtNum(d.wallet.cash)}</span>` : ''}<span class="ss-chip diff-${diffOf(meta)}" title="난이도"><i class="fa-solid ${d0.icon}"></i><span class="lbl"> ${d0.name}</span></span></div>
        <div class="ss-hud-a">
            ${modOn('dice', meta) && d.dice ? `<button class="ss-ib" data-hud="roll" title="주사위"><i class="fa-solid fa-dice-d20"></i></button>` : ''}
            ${modOn('contact', meta) && d.contact ? `<button class="ss-ib" data-hud="tab:contact" title="연락"><i class="fa-solid ${d.contact.mode === 'letter' ? 'fa-envelope' : 'fa-comment'}"></i>${un ? `<i class="ss-badge">${un}</i>` : ''}</button>` : ''}
            ${(() => { const n = unreadNotes(meta); return `<button class="ss-ib" data-hud="inbox" title="알림함"><i class="fa-${n ? 'solid' : 'regular'} fa-bell"></i>${n ? `<i class="ss-badge">${n > 99 ? '99+' : n}</i>` : ''}</button>`; })()}
            <button class="ss-ib ${meta.paused ? 'on' : ''}" data-hud="pause" title="${meta.paused ? '재개' : '일시정지 — OOC·퀵리플라이 때'}"><i class="fa-solid ${meta.paused ? 'fa-play' : 'fa-pause'}"></i></button>
            ${bars.length ? `<button class="ss-ib" data-hud="fold" title="게이지 접기/펼치기"><i class="fa-solid fa-chevron-${settings().hudOpen ? 'up' : 'down'}"></i></button>` : ''}
        </div></div>
        ${meta.paused ? `<div class="ss-hud-pause"><i class="fa-solid fa-pause"></i> 일시정지 중 · AI에게 상태를 보내지 않아요</div>` : ''}
        ${bars.length && settings().hudOpen ? `<div class="ss-hud-bars">${bars.map(b => gauge(b, true)).join('')}</div>` : ''}
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
    setHTML(hud, hudHTML());
}
// 같은 내용이면 다시 그리지 않기 (갱신마다 HUD·사이드를 새로 그리면 그 아래 채팅까지 다시 배치됨)
function setHTML(el, html) { if (!el || el._ssHtml === html) return; el.innerHTML = html; el._ssHtml = html; }

// ───── 사이드 패널 (닫힘 · 미니 · 펼침) ─────
function sideMiniHTML() {
    if (!app.current) return `<div class="ss-mini-empty"><button class="ss-btn pri sm" data-side="make"><i class="fa-solid fa-wand-magic-sparkles"></i> 만들기</button></div>`;
    const s = app.current.state;
    const w = miniWidgets(s, settings().sideMini, false);
    return `<div class="ss-mini-head"><b>${esc(short(s.core.title || TITLE, 16))}</b>${getMeta()?.paused ? '<i class="fa-solid fa-pause ss-hl"></i>' : ''}</div>${w || '<small class="ss-hint">표시할 항목을 꾸미기에서 고르세요</small>'}`;
}
function onSide(e) {
    const b = e.target.closest('[data-side]'); if (!b) return;
    const a = b.dataset.side, set = settings();
    if (a === 'make') return openWizard();
    const mobile = window.innerWidth <= 700 && !document.body.classList.contains('ss-nohud');
    if (a === 'cycle') set.sideState = mobile ? (set.sideState === 'full' ? 'mini' : 'full') : set.sideState === 'closed' ? 'mini' : set.sideState === 'mini' ? 'full' : 'closed';
    if (a === 'full') set.sideState = 'full';
    if (a === 'close') set.sideState = 'closed';
    if (a === 'mini') set.sideState = 'mini';
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
        setHTML(side.querySelector('.ss-mini-body'), sideMiniHTML());
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

// ───── 처음 만들기 ─────
export async function setBase(base, mods, difficulty, play) {
    const meta = getMeta(true);
    const chat = ctx().chat ?? [];
    const data = {};
    for (const id of MOD_IDS) data[id] = base?.data?.[id] ? normalize(id, base.data[id]) : null;
    meta.base = { core: NORM.core(base?.core ?? {}), data };
    meta.baseTurn = 0;
    meta.startAt = chat.length;
    meta.startKey = chat.at(-1)?.send_date ?? null;
    meta.adjust = [];
    meta.off = false;
    meta.v = DATA_V;
    meta.origin = clone(meta.base); // 처음 만든 상태 (카드에 붙이기 · 2회차용)
    meta.chatId = ctx().getCurrentChatId?.() ?? null;
    delete meta.newV5;
    if (mods) meta.mods = { ...meta.mods, ...mods };
    if (difficulty && DIFFS[difficulty]) meta.difficulty = difficulty;
    if (play) meta.play = normPlay(play);
    app.playTemp = null;
    await saveMeta(true);
    app.refreshNow();
}
async function startBlank() { await setBase({ core: EMPTY.core(), data: {} }); toastr.info('빈 상태창을 만들었어요. 각 칸에서 AI로 채우거나 직접 채우세요.', TITLE); }

export async function openWizard() {
    const c = ctx();
    const chars = chatCharacters();
    const lore = await loreNames();
    const persona = c.powerUserSettings?.persona_description ?? '';
    const chatN = (c.chat ?? []).filter(m => !m.is_system).length;
    const hasSrc = chars.some(ch => (ch.description || '').trim().length > 30) || lore.length > 0;
    const meta = getMeta();
    const curMods = meta?.mods ?? Object.fromEntries(MOD_IDS.map(id => [id, defaultModOn(id)]));
    const W = { base: hasSrc ? 'auto' : 'new', pmode: hasSrc ? 'minimal' : 'detailed', diff: meta?.difficulty ?? settings().difficulty, genre: '', cmode: 'auto', play: meta?.play ? playOf(meta).mode : 'auto', gm: GEN_MODES[settings().genMode] ? settings().genMode : 'hybrid' };
    const el = h(`<div class="ss-root ss-scope ss-wizard">
        <div class="ss-wz-head"><i class="fa-solid fa-wand-magic-sparkles"></i><div><b>상태창 만들기</b><small>어떤 카드든, 카드가 없어도 돼요. AI가 관련 칸끼리 묶어서 채워요.</small></div></div>
        <div class="ss-card ss-found">
            <div><span>캐릭터</span><b>${chars.length ? chars.map(ch => esc(ch.name)).join(', ') : '없음'}</b></div>
            <div><span>유저</span><b>${esc(c.name1)}${persona ? ' · 페르소나 있음' : ''}</b></div>
            <div><span>로어북</span><b>${lore.length ? lore.map(esc).join(', ') : '없음'}</b></div>
            <div><span>채팅</span><b>${chatN}개</b></div>
        </div>
        <section class="ss-sec"><div class="ss-sec-h"><h4>만드는 방식</h4></div>
            <div class="ss-seg wrap stack" data-w="gm">${Object.entries(GEN_MODES).map(([k, v]) => `<button data-v="${k}" class="${W.gm === k ? 'on' : ''}"><i class="fa-solid ${v.icon}"></i> ${v.name}<small>${v.desc}</small></button>`).join('')}</div>
            <p class="ss-hint ss-gmhint ${W.gm === 'ai' ? 'ss-hide' : ''}">기본 틀은 아래 「장르」에 맞춰져요 (안 고르면 현대). 수치 · 주사위 · 달력 · 업적 · 운명 카드처럼 어떤 세계관에도 맞는 칸은 검증된 모양으로 고정되고, 나머지는 「기본 틀만」이면 빈 뼈대로 · 「기본 틀 + AI」면 AI가 세계관에 맞게 채워요.</p>
        </section>
        <section class="ss-sec"><div class="ss-sec-h"><h4>세계관</h4></div>
            <div class="ss-seg wrap stack" data-w="base"><button data-v="auto" class="${W.base === 'auto' ? 'on' : ''}">기존 설정 그대로<small>카드·로어북·채팅을 읽어요</small></button><button data-v="new" class="${W.base === 'new' ? 'on' : ''}">새 세계관 만들기<small>아래 지시대로 새로</small></button></div>
            <div class="ss-f wide"><span>장르 (고르면 지시에 들어가요 · 선택)</span><div class="ss-pills" data-w="genre">${GENRES.map(g => `<button class="ss-pill" data-v="${g.id}">${g.name}</button>`).join('')}</div></div>
            <label class="ss-f wide ss-canon ss-hide"><span>원작 이름 (2차 창작)</span><input class="ss-in ss-w-canon" placeholder="예: 해리 포터, 원피스, 귀멸의 칼날…"></label>
        </section>
        <section class="ss-sec"><div class="ss-sec-h"><h4>플레이 방식</h4></div>
            <div class="ss-seg wrap stack" data-w="play"><button data-v="auto" class="${W.play === 'auto' ? 'on' : ''}">자동 (추천)<small>카드·채팅을 보고 AI가 알아서 (추가 호출 없음)</small></button>${Object.entries(PLAY_MODES).map(([k, v]) => `<button data-v="${k}" class="${W.play === k ? 'on' : ''}">${v.name}<small>${v.desc}</small></button>`).join('')}</div>
            <label class="ss-f wide ss-hero ${W.play === 'director' ? '' : 'ss-hide'}"><span>주인공 이름 (풀사칭 · 비우면 AI가 정함)</span><input class="ss-in ss-w-hero" value="${esc(meta?.play?.hero ?? '')}" placeholder="예: 서이현"></label>
            <label class="ss-tog ss-cardworld ${W.play === 'auto' ? 'ss-hide' : ''}"><input type="checkbox" class="ss-switch ss-w-world" ${meta?.play?.cardIsWorld ? 'checked' : ''}><span>카드 이름이 캐릭터가 아니라 세계관·봇 이름이에요</span></label>
        </section>
        <section class="ss-sec"><div class="ss-sec-h"><h4>참고할 자료</h4></div><div class="ss-pills">
            <label class="ss-tog"><input type="checkbox" class="ss-switch" data-src="card" checked><span>캐릭터 카드</span></label>
            <label class="ss-tog"><input type="checkbox" class="ss-switch" data-src="persona" checked><span>페르소나</span></label>
            <label class="ss-tog"><input type="checkbox" class="ss-switch" data-src="lore" checked><span>로어북</span></label>
            <label class="ss-tog"><input type="checkbox" class="ss-switch" data-src="chat" ${chatN > 1 ? 'checked' : ''}><span>최근 채팅 ${settings().recentForGen}개</span></label></div></section>
        <section class="ss-sec"><div class="ss-sec-h"><h4>난이도</h4></div>
            <div class="ss-seg" data-w="diff">${Object.entries(DIFFS).map(([k, v]) => `<button data-v="${k}" class="${W.diff === k ? 'on' : ''}"><i class="fa-solid ${v.icon}"></i> ${v.name}</button>`).join('')}</div>
            <p class="ss-hint ss-diffdesc">${esc(DIFFS[W.diff].desc)}</p></section>
        <section class="ss-sec"><div class="ss-sec-h"><h4>프로필</h4></div>
            <div class="ss-seg wrap stack" data-w="pmode"><button data-v="minimal" class="${W.pmode === 'minimal' ? 'on' : ''}">최소<small>카드·로어북 그대로, 요약만 (토큰 절약)</small></button><button data-v="detailed" class="${W.pmode === 'detailed' ? 'on' : ''}">상세<small>이 시트만으로 (외모·말투·배경까지)</small></button></div></section>
        <section class="ss-sec"><div class="ss-sec-h"><h4>쓸 기능</h4><div class="ss-sec-r"><button class="ss-btn sm ghost" data-all="rec">추천만</button><button class="ss-btn sm ghost" data-all="1">전부</button><button class="ss-btn sm ghost" data-all="0">전부 끄기</button></div></div>
            ${GROUPS.filter(g => !['home', 'manage'].includes(g.id)).map(g => `<div class="ss-modgrp"><small>${g.name}</small><div class="ss-mods">${g.tabs.map(t => MOD[TAB_MOD(t)]).map(m => `<label class="ss-mod ${curMods[m.id] === false ? '' : 'on'}"><input type="checkbox" class="ss-switch" data-mod="${m.id}" ${curMods[m.id] === false ? '' : 'checked'}><i class="fa-solid ${m.icon}"></i><span><b>${m.name}</b><small>${m.desc}</small></span></label>`).join('')}</div></div>`).join('')}
            <div class="ss-f wide ss-cmode"><span>연락 방식</span><div class="ss-seg wrap" data-w="cmode">${Object.entries(CONTACT_MODES).map(([k, v]) => `<button data-v="${k}" class="${W.cmode === k ? 'on' : ''}"><i class="fa-solid ${v.icon}"></i> ${v.name}</button>`).join('')}</div><small class="ss-hint">휴대폰이 없는 세계관은 「편지」 — 배달부·갈매기·올빼미·강아지·마법 등으로 며칠 걸려 도착하고, 돈을 내면 급행(퀵)으로 바로 와요.</small></div>
        </section>
        <section class="ss-sec"><div class="ss-sec-h"><h4>추가 지시 <small>선택 · 무엇이든</small></h4></div>
            <textarea class="ss-in ss-w-ins" rows="3" placeholder="예: 현대 도시 판타지, 유저는 신입 헌터. 화폐는 원. 본거지는 원룸. 남캐 5명과는 처음엔 서먹하게."></textarea></section>
        <div class="ss-row-btns"><button class="ss-btn pri big ss-w-go"><i class="fa-solid fa-play"></i> 생성 시작</button><small class="ss-hint ss-w-cost"></small></div>
        <div class="ss-w-prog"></div>
    </div>`);
    const cost = () => {
        const on0 = [...el.querySelectorAll('[data-mod]:checked')].map(i => i.dataset.mod).filter(id => id !== 'music');
        el.querySelector('.ss-gmhint')?.classList.toggle('ss-hide', W.gm === 'ai');
        if (W.gm === 'tpl') { el.querySelector('.ss-w-cost').textContent = `AI 0회 · 토큰 0 · 기능 ${on0.length}개를 기본 틀로 바로 만들어요`; el.querySelector('.ss-cmode').classList.toggle('ss-hide', !el.querySelector('[data-mod="contact"]').checked); return; }
        const on = W.gm === 'hybrid' ? on0.filter(id => !HYBRID_TPL.includes(id)) : on0, n = on.length;
        const g = settings().genBatch ? GEN_GROUPS.filter(gr => gr.some(id => on.includes(id))).length : n;
        el.querySelector('.ss-w-cost').textContent = settings().genBatch ? `AI ${g + 1}회 (세계 핵심 1 + 묶음 ${g} · 기능 ${n}개) · 보통 1~2분` : `AI ${n + 1}회 (세계 핵심 1 + 기능 ${n}) · 보통 1~3분`; el.querySelector('.ss-cmode').classList.toggle('ss-hide', !el.querySelector('[data-mod="contact"]').checked); };
    cost();
    el.addEventListener('change', (e) => { const l = e.target.closest('.ss-mod'); if (l) l.classList.toggle('on', e.target.checked); cost(); });
    el.addEventListener('click', (e) => {
        const all = e.target.closest('[data-all]');
        if (all) { el.querySelectorAll('[data-mod]').forEach(i => { i.checked = all.dataset.all === 'rec' ? REC_MODS.includes(i.dataset.mod) : all.dataset.all === '1'; i.closest('.ss-mod').classList.toggle('on', i.checked); }); cost(); return; }
        const b = e.target.closest('[data-w] > button'); if (!b) return;
        const k = b.parentElement.dataset.w;
        if (k === 'genre') {
            const on = !b.classList.contains('on');
            b.parentElement.querySelectorAll('button').forEach(x => x.classList.remove('on'));
            b.classList.toggle('on', on); W.genre = on ? b.dataset.v : '';
            el.querySelector('.ss-canon').classList.toggle('ss-hide', W.genre !== 'fan');
            const g = GENRES.find(x => x.id === W.genre);
            if (g && g.contact !== 'auto' && W.cmode === 'auto') { /* 세계관에 맞게 그대로 두되 힌트로만 */ }
            return;
        }
        b.parentElement.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
        W[k] = b.dataset.v;
        if (k === 'play') { el.querySelector('.ss-hero').classList.toggle('ss-hide', W.play !== 'director'); el.querySelector('.ss-cardworld').classList.toggle('ss-hide', W.play === 'auto'); }
        if (k === 'diff') el.querySelector('.ss-diffdesc').textContent = DIFFS[W.diff].desc;
        if (k === 'gm') { settings().genMode = W.gm; saveSettings(); cost(); }
    });
    const results = { core: null, data: {} };
    let mods = {};
    const prog = el.querySelector('.ss-w-prog');
    const row = (id, name) => { let r = prog.querySelector(`[data-row="${id}"]`); if (!r) { r = h(`<div class="ss-prog-row" data-row="${id}"><span class="ico"></span><b>${name}</b><small></small></div>`); prog.appendChild(r); } return r; };
    const setRow = (id, name, stt, msg = '') => {
        const r = row(id, name); r.dataset.st = stt;
        r.querySelector('.ico').innerHTML = stt === 'run' ? '<i class="fa-solid fa-spinner fa-spin"></i>' : stt === 'ok' ? '<i class="fa-solid fa-check"></i>' : stt === 'fail' ? '<i class="fa-solid fa-xmark"></i>' : '<i class="fa-regular fa-clock"></i>';
        r.querySelector('small').innerHTML = msg;
    };
    let opts = null;
    const runOne = async (id) => {
        const name = id === 'core' ? '세계 핵심' : MOD[id].name;
        setRow(id, name, 'run');
        try {
            // 자동이거나, 풀사칭인데 주인공 이름을 비워 뒀으면 세계 핵심을 만들면서 같이 알아본다 (추가 호출 없음)
            const fillHero = id === 'core' && opts.play?.mode === 'director' && !opts.play.hero;
            const auto = id === 'core' && (!opts.play || fillHero);
            const data = await genModule(id, { sources: opts.sources, core: results.core, instruction: opts.instruction, profileMode: opts.pmode, contactMode: opts.cmode, feature: 'wizard', play: opts.play, detectPlay: auto });
            if (id === 'core') { results.core = data; queueMicrotask(() => { app.playTemp = opts.play; }); if (fillHero) opts.play = normPlay({ ...opts.play, hero: data.play?.hero ?? '', cast: data.play?.cast ?? [] }); else if (auto) opts.play = data.play ?? normPlay({ mode: 'rp' }); results.play = opts.play; }
            else results.data[id] = data;
            setRow(id, name, 'ok', id === 'core' ? `${esc(data.title)} · ${PLAY_MODES[opts.play.mode].name}${opts.play.mode === 'director' && opts.play.hero ? ` (주인공 ${esc(opts.play.hero)})` : ''}${opts.play.cardIsWorld ? ' · 카드=세계관' : ''}${auto ? ' — 자동' : ''}` : '');
            return true;
        } catch (e) { ssErr(LOG, id, e); setRow(id, name, 'fail', `${esc(e.message)} <button class="ss-btn sm" data-retry="${id}">다시</button>`); return false; }
    };
    // 묶음 하나: 한 번에 받고, 빠진 칸만 따로 다시 받는다
    const runGroup = async (grp) => {
        for (const id of grp) setRow(id, MOD[id].name, 'run', grp.length > 1 ? '묶음 생성 중' : '');
        let got = {};
        try { got = await genGroup(grp, { sources: opts.sources, core: results.core, instruction: opts.instruction, profileMode: opts.pmode, contactMode: opts.cmode, feature: 'wizard', play: opts.play }); }
        catch (e) { ssWarn(LOG, 'group', grp, e); }
        const miss = [];
        for (const id of grp) {
            if (got[id]) { results.data[id] = got[id]; setRow(id, MOD[id].name, 'ok'); } else miss.push(id);
        }
        for (const id of miss) await runOne(id);
    };
    prog.addEventListener('click', async (e) => {
        const id = e.target.closest('[data-retry]')?.dataset.retry;
        if (!id || !opts) return;
        if (id !== 'core' && !results.core) { toastr.warning('세계 핵심을 먼저 만들어야 해요.', TITLE); return; }
        await runOne(id); showApply();
    });
    const showApply = () => {
        const mb = prog.querySelector('.ss-mbanner');
        if (mb) { mb.querySelector('img')?.setAttribute('src', mascotUrl(results.core ? 'happy' : 'sad')); mb.querySelector('span').textContent = results.core ? '다 됐어요! 확인하고 적용해 주세요' : '세계 핵심을 만들지 못했어요. 다시 눌러 주세요'; }
        prog.querySelector('.ss-w-apply')?.remove();
        if (!results.core) return;
        const b = h(`<div class="ss-w-apply"><button class="ss-btn pri big"><i class="fa-solid fa-check"></i> 적용하기 (${Object.keys(results.data).length}칸)</button><small class="ss-hint">실패한 칸은 비워 두고, 나중에 그 칸에서 다시 채울 수 있어요.</small></div>`);
        b.querySelector('button').addEventListener('click', async () => {
            if (getMeta()?.base && !(await askConfirm('지금 이 채팅의 상태창을 새로 만든 것으로 바꿀까요?'))) return;
            if (results.data.rel && results.data.profile) relFromProfiles(results.data.rel, results.data.profile); // 프로필에 있는 사람은 관계에도 꼭
            await setBase({ core: results.core, data: results.data }, mods, W.diff, results.play);
            toastr.success('상태창을 만들었어요!', TITLE);
            el.closest('dialog')?.querySelector('.popup-button-ok')?.click();
            if (!document.querySelector('.ss-panel-pop')) setTimeout(() => openSheet(), 300);
        });
        prog.appendChild(b);
    };
    el.querySelector('.ss-w-go').addEventListener('click', async (e) => {
        const btn = e.currentTarget;
        const src = Object.fromEntries([...el.querySelectorAll('[data-src]')].map(i => [i.dataset.src, i.checked]));
        mods = Object.fromEntries([...el.querySelectorAll('[data-mod]')].map(i => [i.dataset.mod, i.checked]));
        const g = GENRES.find(x => x.id === W.genre);
        const canon = el.querySelector('.ss-w-canon').value.trim();
        let instruction = el.querySelector('.ss-w-ins').value.trim();
        if (g) instruction = `장르: ${g.name} — ${g.hint}${W.genre === 'fan' && canon ? ` 원작: ${canon} (원작 설정·인물·지명을 그대로 따를 것)` : ''}\n${instruction}`;
        if (W.gm !== 'tpl' && W.base === 'new' && !instruction && !(await askConfirm('추가 지시가 비어 있어요. AI가 아무 세계관이나 새로 만들어도 될까요?'))) return;
        busyBtn(btn, true, '생성 중…');
        prog.innerHTML = settings().showMascot === false ? '' : `<div class="ss-mbanner">${mascot('think', 'md')}<span>열심히 만드는 중… 보통 1~2분 걸려요</span></div>`;
        results.core = null; results.data = {};
        const sources = W.gm === 'tpl' ? '' : W.base === 'new' ? await gatherSources({ card: false, lore: false, chat: false, persona: src.persona }) : await gatherSources(src);
        const cmode = W.cmode === 'auto' && g && g.contact !== 'auto' ? g.contact : W.cmode;
        opts = { sources, instruction: W.base === 'new' ? `${instruction}\n(Create a NEW world. Ignore any existing card/lorebook.)` : instruction, pmode: W.pmode, cmode, play: W.play === 'auto' ? null : normPlay({ mode: W.play, hero: el.querySelector('.ss-w-hero').value, cardIsWorld: el.querySelector('.ss-w-world').checked }) };
        results.play = opts.play;
        app.playTemp = opts.play;
        // 추천 음악은 장면이 생기면 본편 AI가 고르므로 처음엔 빈 칸으로 (AI 호출 아끼기)
        if (mods.music) results.data.music = EMPTY.music();
        const ids0 = MOD_IDS.filter(id => id !== 'music' && mods[id] && (!MOD[id].needs || mods[MOD[id].needs]));
        // 기본 틀: AI 없이 바로 채우는 칸
        const tplIds = W.gm === 'tpl' ? ids0 : W.gm === 'hybrid' ? ids0.filter(id => HYBRID_TPL.includes(id)) : [];
        const ids = ids0.filter(id => !tplIds.includes(id));
        for (const id of tplIds) { try { const d = skeleton(id, W.genre, { pmode: W.pmode, cmode }); if (d) { results.data[id] = normalize(id, d); setRow(id, MOD[id].name, 'ok', '기본 틀'); } } catch (e2) { ssWarn(LOG, 'skeleton', id, e2); } }
        if (tplIds.length && W.gm === 'hybrid') { const hint = skeletonHint(W.genre, tplIds); if (hint) opts.instruction = `${opts.instruction}\n${hint}`.trim(); }
        if (W.gm === 'tpl') {
            results.core = skeletonCore(W.genre, { canon, instruction: el.querySelector('.ss-w-ins').value.trim() });
            const chars = chatCharacters();
            results.play = opts.play ?? normPlay({ mode: chars.length > 1 ? 'multi' : 'rp' });
            setRow('core', '세계 핵심', 'ok', `${esc(results.core.title)} · 기본 틀 (AI 0회)`);
            busyBtn(btn, false);
            btn.innerHTML = '<i class="fa-solid fa-rotate"></i> 다시 만들기';
            return showApply();
        }
        setRow('core', '세계 핵심', 'wait');
        for (const id of ids) setRow(id, MOD[id].name, 'wait');
        if (await runOne('core')) {
            const par = clamp(parseInt(settings().genParallel, 10) || 4, 1, 8);
            if (settings().genBatch) {
                const groups = GEN_GROUPS.map(g => g.filter(id => ids.includes(id))).filter(g => g.length);
                const left = ids.filter(id => !GEN_GROUPS.flat().includes(id));
                if (left.length) groups.push(left);
                const q = [...groups];
                const worker = async () => { while (q.length) await runGroup(q.shift()); };
                await Promise.all(Array.from({ length: Math.min(par, q.length) }, worker));
            } else {
                const q = [...ids];
                const worker = async () => { while (q.length) await runOne(q.shift()); };
                await Promise.all(Array.from({ length: Math.min(par, q.length) }, worker));
            }
        }
        busyBtn(btn, false);
        btn.innerHTML = '<i class="fa-solid fa-rotate"></i> 다시 생성';
        showApply();
    });
    await popup(el, { large: true });
    app.playTemp = null;
}

// ───── 프롬프트 · 토큰 창 ─────
export async function openPromptWindow(tab = 'when') {
    const el = document.createElement('div');
    el.className = 'ss-root ss-scope ss-pw';
    let cur = tab;
    const render = async () => {
        const set = settings();
        const meta = getMeta();
        const inj = app.current && !meta?.paused ? buildInjection(app.current) : null;
        const injText = inj ? sub([inj.main, inj.people, inj.romance].filter(Boolean).join('\n\n')).trim() : '';
        let body = '';
        if (cur === 'when') {
            const injTok = injText ? await countTokens(injText) : 0;
            const nMods = MOD_IDS.filter(id => modOn(id, meta)).length;
            const syncTxt = { tag: 'A. 태그 방식', tagPlus: 'A+B', analyze: 'B. 별도 분석', off: 'C. 끔' }[set.sync];
            const row = (icon, what, when, cost, on = true) => `<div class="ss-cost ${on ? '' : 'off'}"><i class="fa-solid ${icon}"></i><div><b>${what}</b><small>${when}</small></div><em>${cost}</em></div>`;
            body = `<div class="ss-callout"><i class="fa-solid fa-circle-info"></i><div><b>토큰은 두 군데서 들어요</b><span>① 본편(메인 AI)을 부를 때마다 붙는 상태 주입문 ② 확장이 따로 AI를 부르는 버튼 (<span class="ss-ai"><i class="fa-solid fa-wand-magic-sparkles"></i>AI</span> 표시)</span></div></div>
            ${sec('① 매 턴 — 본편 생성마다 자동', `
                ${row('fa-arrow-right-to-bracket', `상태 주입문 (입력) ≈ <b>${fmtNum(injTok)}</b> 토큰`, `본 답 · 다시 생성 · 스와이프 · 이어 쓰기마다 요청에 붙어요. 깊이 ${set.injectDepth} · 규칙 ${{ full: '전체', lite: '간결', ultra: '초압축' }[set.injectMode] ?? '전체'}${set.deltaMode ? ` · 변화 위주 (${set.deltaEvery}턴마다 전체)` : ''}${Object.keys(set.injEvery ?? {}).length ? ' · 칸별 보내는 때 설정됨' : ''}`, '매 턴', !!injText)}
                ${inj?.romance ? row('fa-heart', `그중 로맨스 보정 · 내 주입문 ≈ <b>${fmtNum(await countTokens(sub(inj.romance)))}</b> 토큰`, `따로 주입돼요 (깊이 ${set.romDepth}). 확장 설정 › 로맨스 보정에서 켠 것만 들어가요.`, '매 턴') : ''}
                ${row('fa-arrow-right-from-bracket', 'AI가 응답 끝에 쓰는 &lt;meatball&gt; (출력)', '바뀐 것만 적어서 보통 20~80 토큰. 화면에선 숨겨지고, 2턴 지난 것은 프롬프트에서도 지워져요.', '매 턴', set.sync === 'tag' || set.sync === 'tagPlus')}
                <p class="ss-hint">0 토큰이 되는 때: ⏸ 일시정지 · 「다음 1번 건너뛰기」 · OOC 메시지${set.oocDetect ? ' (자동 감지 켬)' : ' (자동 감지 꺼짐)'} · 조용한 생성/퀵리플라이 /gen${set.skipQuiet ? ' (자동 제외 켬)' : ' (꺼짐)'} · 이 채팅에서 끔</p>`)}
            ${sec('② 버튼을 누를 때만 — 확장 AI 1회씩', `
                ${row('fa-wand-magic-sparkles', '상태창 만들기', `세계 핵심 1 + 켠 기능 ${nMods}개 = AI ${nMods + 1}회. 재료(카드·로어북 최대 ${fmtNum(set.loreChars)}자·최근 채팅 ${set.recentForGen}개)가 매번 들어가요.`, `${nMods + 1}회`)}
                ${row('fa-rotate', '칸 AI로 채우기 · 다시 생성', '그 칸 하나만', '1회')}
                ${row('fa-wand-magic-sparkles', 'AI로 수정 (추가 지시)', '현재 칸 + 최근 채팅 14개', '1회')}
                ${row('fa-comment', '메신저 답장', '보낼 때마다 (「답장 받기」 끄면 0) · 다시 받기 1회', '1회')}
                ${row('fa-envelope-open-text', '편지 「뜯어 보기」', '도착한 답장 1통마다. 부치는 것 자체는 0', '1회')}
                ${row('fa-paper-plane', '선톡 · 편지 오게', '누를 때', '1회')}
                ${row('fa-newspaper', '새 소식 발행 · 새 호 발행 · 새 글 불러오기 · 댓글 달리기 · 의뢰 찾기', '누를 때', '각 1회')}
                ${row('fa-hashtag', 'SNS 새 게시물 · 반응 받기 · 추천 곡 3개 · 속마음 엿보기', '누를 때', '각 1회')}
                ${row('fa-screwdriver-wrench', `깨진 답 다시 받기 — ${set.retryJSON ? '켬' : '꺼짐'}`, '확장 AI 답(JSON)이 고쳐도 안 될 때만 한 번 더', set.retryJSON ? '가끔 +1' : '꺼짐', set.retryJSON)}
                ${row('fa-language', `상태창 번역 — ${set.ssGenLang === 'enview' ? '켬 (영어로 저장 · 화면만 번역)' : set.ssGenLang === 'en' ? '켬 (영어로 생성 → 번역본 저장)' : '꺼짐 (한국어로 바로 생성)'}`, `켜면 위의 AI 호출마다 번역 모델(${set.trProfile ? '고른 연결 프로필' : '확장 AI 모델'})이 1회 더. 「상태창 전체 번역」은 칸 1개 = 1회`, set.ssGenLang === 'en' ? '+1회씩' : '꺼짐', set.ssGenLang === 'en')}`)}
            ${sec('③ 설정에 따라 자동', `
                ${row('fa-magnifying-glass', `별도 분석 — 지금: ${syncTxt}`, 'B: 매 AI 응답마다 1회 · A+B: 응답에 &lt;meatball&gt;가 빠졌을 때만', set.sync === 'analyze' ? '매 응답' : set.sync === 'tagPlus' ? '가끔' : '꺼짐', set.sync === 'analyze' || set.sync === 'tagPlus')}
                ${row('fa-bell', `자동 선톡 — ${set.autoPing ? `켬 (${set.autoPingEvery}턴마다 확률)` : '꺼짐'}`, '켜 두면 가끔 누군가 먼저 연락해요', set.autoPing ? '가끔' : '꺼짐', set.autoPing)}`)}
            ${sec('토큰 0', '<p class="ss-hint">주사위 · 구매/판매 · 직접 편집 · 이동 · 달력 · 메모 · 업적 · 퀘스트 수락/완료 · 편지 부치기 · 메시지 수정/삭제 · HUD · 사이드 · 꾸미기</p>')}
            ${set.aiProfile ? `<p class="ss-hint">확장 AI는 연결 프로필 「${esc(set.aiProfile)}」로 보내요 (본편은 메인 연결).</p>` : ''}`;
        } else if (cur === 'inject') {
            const tok = injText ? await countTokens(injText) : 0;
            body = `<div class="ss-hint">${meta?.paused ? '일시정지 중이라 지금은 아무것도 보내지 않아요.' : `≈ ${fmtNum(tok)} 토큰 · 채팅 깊이 ${set.injectDepth}에 system 역할로 들어가요. 문구는 「프롬프트 수정」에서 바꿀 수 있어요.`}</div>
                <pre class="ss-code">${esc(injText || '(보내는 내용 없음)')}</pre>`;
        } else if (cur === 'edit') {
            const grp = (g, title) => sec(title, PROMPT_DEFS.filter(p => p.group === g).map(p => {
                const custom = Object.hasOwn(set.prompts ?? {}, p.key);
                return `<details class="ss-pdef ${custom ? 'custom' : ''}"><summary><b>${esc(p.label)}</b><small>${esc(p.when)}</small>${custom ? '<em>수정됨</em>' : ''}</summary>
                    <textarea class="ss-in ss-pta" rows="5" data-pk="${p.key}" spellcheck="false">${esc(set.prompts?.[p.key] ?? p.text)}</textarea>
                    <div class="ss-row-btns"><button class="ss-btn sm ghost" data-preset="${p.key}"><i class="fa-solid fa-rotate-left"></i> 기본값으로</button><small class="ss-hint">${/\{[a-z]/.test(p.text) ? `바뀌는 칸: ${[...new Set(p.text.match(/\{[a-z][a-zA-Z0-9_]*\}/g))].join(' ')}` : ''} {{user}} {{char}} 같은 실리 매크로도 돼요.</small></div></details>`;
            }).join(''));
            body = `<div class="ss-callout"><i class="fa-solid fa-pen-to-square"></i><div><b>모든 문구를 고칠 수 있어요</b><span>고친 내용은 바로 저장돼요. 칸(JSON) 모양 설명은 고장 방지를 위해 고정이에요.</span></div><button class="ss-btn sm" data-presetall="1">모두 기본값</button></div>
                ${grp('inject', '본편에 매 턴 붙는 글')}${grp('call', '확장 AI를 부를 때 쓰는 글')}`;
        } else {
            const u = [...(set.usage ?? [])].reverse();
            const today = new Date().toDateString();
            const sum = (list) => list.reduce((a, x) => [a[0] + x.inp, a[1] + x.out], [0, 0]);
            const [ti, to] = sum(u.filter(x => new Date(x.t).toDateString() === today));
            const [ai, ao] = sum(u);
            body = `<div class="ss-stats"><div><small>오늘</small><b>${u.filter(x => new Date(x.t).toDateString() === today).length}회</b><span>입력 ≈${fmtNum(ti)} · 출력 ≈${fmtNum(to)}</span></div><div><small>기록 전체 (최근 120)</small><b>${u.length}회</b><span>입력 ≈${fmtNum(ai)} · 출력 ≈${fmtNum(ao)}</span></div></div>
                <p class="ss-hint">확장 AI 호출만 적어요 (본편 생성은 실리태번이 따로 셉니다). 토큰은 글자 수로 어림한 값이에요.</p>
                <div class="ss-usage">${u.map(x => `<div class="${x.ok ? '' : 'fail'}"><small>${new Date(x.t).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</small><b>${esc(FEATURE_NAMES[x.f] ?? x.f)}</b><span>↑${fmtNum(x.inp)} ↓${fmtNum(x.out)}</span></div>`).join('') || emptyBox('아직 기록이 없어요', 'fa-receipt')}</div>
                ${u.length ? '<button class="ss-btn sm ghost" data-uclear="1"><i class="fa-solid fa-broom"></i> 기록 지우기</button>' : ''}`;
        }
        el.innerHTML = `<div class="ss-wz-head"><i class="fa-solid fa-scroll"></i><div><b>프롬프트 · 토큰</b><small>무엇이 언제 AI에게 가는지 보고, 고치기</small></div></div>
            ${seg([['when', '<i class="fa-solid fa-coins"></i> 토큰 안내'], ['inject', '<i class="fa-solid fa-eye"></i> 보내는 글'], ['edit', '<i class="fa-solid fa-pen"></i> 수정'], ['log', '<i class="fa-solid fa-receipt"></i> 기록']], cur, 'pw', 'class="ss-seg wrap"')}
            <div class="ss-pw-body">${body}</div>`;
    };
    el.addEventListener('click', async (e) => {
        const t = e.target.closest('[data-act="pw"]'); if (t) { cur = t.dataset.arg; await render(); return; }
        const r = e.target.closest('[data-preset]'); if (r) { setPrompt(r.dataset.preset, null); await render(); el.querySelector(`[data-pk="${r.dataset.preset}"]`)?.closest('details')?.setAttribute('open', ''); app.refreshNow(); return; }
        if (e.target.closest('[data-presetall]') && await askConfirm('모든 프롬프트를 기본값으로 되돌릴까요?')) { settings().prompts = {}; saveSettings(); await render(); app.refreshNow(); }
        if (e.target.closest('[data-uclear]')) { settings().usage = []; saveSettings(); await render(); }
    });
    let tmr;
    el.addEventListener('input', (e) => {
        const k = e.target.dataset.pk; if (!k) return;
        clearTimeout(tmr);
        tmr = setTimeout(() => { setPrompt(k, e.target.value); e.target.closest('details')?.classList.toggle('custom', Object.hasOwn(settings().prompts, k)); app.refreshNow(); }, 400);
    });
    await render();
    await popup(el, { large: true });
}

// ───── 꾸미기 창 ─────
export async function openThemeWindow() {
    const el = document.createElement('div');
    el.className = 'ss-root ss-scope ss-tw';
    const render = () => {
        const set = settings();
        const t = themeVars();
        el.innerHTML = `<div class="ss-wz-head"><i class="fa-solid fa-palette"></i><div><b>꾸미기</b><small>바뀌는 즉시 이 창과 HUD에 보여요</small></div></div>
            ${sec('테마', `<div class="ss-swatches">${Object.entries(THEMES).map(([k, v]) => `<button class="ss-swatch ${set.theme === k ? 'on' : ''}" data-theme="${k}" style="--a:${k === 'st' ? 'var(--SmartThemeBlurTintColor,#fff)' : v.bg};--b:${k === 'st' ? 'var(--SmartThemeBodyColor,#111)' : v.ink};--c:${k === 'st' ? 'var(--SmartThemeQuoteColor,#2f62e9)' : v.hi}"><span><i></i><i></i><i></i></span>${v.name}</button>`).join('')}</div>`)}
            ${sec('색 직접 고르기', `<div class="ss-colors">${THEME_KEYS.map(([k, n]) => `<label class="ss-colorf"><input type="color" class="ss-color" data-ck="${k}" value="${/^#[0-9a-f]{6}$/i.test(t[k]) ? t[k] : '#888888'}"><span>${n}</span>${Object.hasOwn(set.themeCustom ?? {}, k) ? `<button class="ss-x" data-cr="${k}" title="되돌리기">×</button>` : ''}</label>`).join('')}</div>
                <button class="ss-btn sm ghost" data-creset="1"><i class="fa-solid fa-rotate-left"></i> 직접 고른 색 모두 되돌리기</button>`)}
            ${sec('크기 · 모양', `<label class="ss-f wide"><span>글자 크기 ${Math.round((set.fontScale || 1) * 100)}%</span><input type="range" min="0.85" max="1.3" step="0.05" value="${set.fontScale}" data-num="fontScale"></label>
                <label class="ss-f wide"><span>모서리 둥글기 ${set.radius}px</span><input type="range" min="0" max="20" step="1" value="${set.radius}" data-num="radius"></label>
                <label class="ss-f wide"><span>사이드 패널 너비 ${set.sideWidth}px (PC)</span><input type="range" min="320" max="560" step="10" value="${set.sideWidth}" data-num="sideWidth"></label>`)}
            ${sec('보이는 곳', `<div class="ss-pills">
                <label class="ss-tog"><input type="checkbox" class="ss-switch" data-bool="showHud" ${set.showHud ? 'checked' : ''}><span>채팅 위 HUD</span></label>
                <label class="ss-tog"><input type="checkbox" class="ss-switch" data-bool="showSide" ${set.showSide ? 'checked' : ''}><span>사이드 패널</span></label>
                <label class="ss-tog"><input type="checkbox" class="ss-switch" data-bool="showFloat" ${set.showFloat ? 'checked' : ''}><span>떠 있는 버튼</span></label></div>
                <div class="ss-f wide"><span>HUD 위치</span>${seg([['top', '채팅 위'], ['bottom', '입력창 위']], set.hudPos, 'hudpos')}</div>
                <div class="ss-f wide"><span>사이드 패널 기본 상태</span>${seg([['closed', '닫힘 (손잡이만)'], ['mini', '미니 (안 열어도 보임)'], ['full', '펼침']], set.sideState, 'sidestate', 'class="ss-seg wrap"')}</div>`)}
            ${sec('사이드 미니창에 보일 것', `<div class="ss-pills">${Object.entries(MINI).map(([k, v]) => `<label class="ss-tog"><input type="checkbox" class="ss-switch" data-mini="${k}" ${set.sideMini.includes(k) ? 'checked' : ''}><span>${v.name}</span></label>`).join('')}</div>`)}
            ${(() => {
                const o = miniRelOpt();
                const people = app.current?.state?.data?.rel?.user ?? [];
                return sec('미니창 · 홈 「관계」 칸', `${set.sideMini.includes('rel') ? '' : '<p class="ss-hint">위에서 「관계」를 켜야 사이드 미니창에 보여요 (홈 탭에는 항상 보임).</p>'}
                <div class="ss-f wide"><span>보일 수치 (여러 개 가능)</span><div class="ss-pills">${Object.entries(MINI_REL_VALS).map(([k, n]) => `<label class="ss-tog"><input type="checkbox" class="ss-switch" data-mrel="${k}" ${o.show.includes(k) ? 'checked' : ''}><span>${n}</span></label>`).join('')}</div></div>
                <div class="ss-f wide"><span>순서</span>${seg(Object.entries(MINI_REL_SORT), o.sort, 'mrelsort', 'class="ss-seg wrap"')}</div>
                <label class="ss-f wide"><span>보일 인원 ${o.n}명</span><input type="range" min="1" max="6" step="1" value="${o.n}" data-mreln="1"></label>
                ${people.length ? `<div class="ss-f wide"><span>이 사람들만 보기 <small class="ss-dim">(안 고르면 위 순서대로 자동 · 고르면 인원 수 무시)</small></span><div class="ss-pills">${people.map(r => `<label class="ss-tog sm"><input type="checkbox" class="ss-switch" data-mrelp="${esc(r.name)}" ${o.pick.includes(r.name) ? 'checked' : ''}><span>${esc(r.name)}</span></label>`).join('')}</div></div>` : ''}`);
            })()}
            <div class="ss-tw-preview">${sec('미리보기', `<div class="ss-card">${gauge({ name: '체력', cur: 72, max: 100 })}${gauge({ name: '마나', cur: 18, max: 60, color: '#5b7cfa' })}</div><div class="ss-row-btns"><button class="ss-btn pri">주 버튼</button><button class="ss-btn">버튼</button><span class="ss-chip">칩</span><span class="ss-chip hi">강조</span><span class="pos">+12</span><span class="neg">−8</span></div>`)}</div>`;
    };
    const apply = () => { saveSettings(); applyTheme(); ensureUI(); };
    el.addEventListener('input', (e) => {
        const t = e.target, set = settings();
        if (t.dataset.ck) { set.themeCustom = { ...(set.themeCustom ?? {}), [t.dataset.ck]: t.value }; apply(); }
        if (t.dataset.mreln) { t.previousElementSibling.textContent = `보일 인원 ${t.value}명`; return; } // 끌 때는 글자만 · 놓으면 change에서 저장
        if (t.dataset.num) { set[t.dataset.num] = Number(t.value); apply(); t.previousElementSibling.textContent = t.previousElementSibling.textContent.replace(/[\d.]+(%|px)/, t.dataset.num === 'fontScale' ? `${Math.round(t.value * 100)}%` : `${t.value}px`); }
    });
    el.addEventListener('change', (e) => {
        const t = e.target, set = settings();
        if (t.dataset.bool) { set[t.dataset.bool] = t.checked; apply(); }
        if (t.dataset.mini) { set.sideMini = Object.keys(MINI).filter(k => el.querySelector(`[data-mini="${k}"]`).checked); apply(); render(); }
        if (t.dataset.mrel) { set.miniRel = { ...miniRelOpt(), show: Object.keys(MINI_REL_VALS).filter(k => el.querySelector(`[data-mrel="${k}"]`).checked) }; apply(); }
        if (t.dataset.mrelp !== undefined) { const o = miniRelOpt(); const n = t.dataset.mrelp; set.miniRel = { ...o, pick: t.checked ? [...o.pick.filter(x => x !== n), n] : o.pick.filter(x => x !== n) }; apply(); }
        if (t.dataset.mreln) { set.miniRel = { ...miniRelOpt(), n: Number(t.value) }; apply(); }
        if (t.dataset.ck) render();
    });
    el.addEventListener('click', (e) => {
        const set = settings();
        const th = e.target.closest('[data-theme]'); if (th) { set.theme = th.dataset.theme; set.themeCustom = {}; apply(); render(); return; }
        const cr = e.target.closest('[data-cr]'); if (cr) { e.preventDefault(); const c = { ...set.themeCustom }; delete c[cr.dataset.cr]; set.themeCustom = c; apply(); render(); return; }
        if (e.target.closest('[data-creset]')) { set.themeCustom = {}; apply(); render(); return; }
        const ms = e.target.closest('[data-act="mrelsort"]');
        if (ms) { set.miniRel = { ...miniRelOpt(), sort: ms.dataset.arg }; apply(); render(); return; }
        const sg = e.target.closest('[data-act="hudpos"],[data-act="sidestate"]');
        if (sg) { if (sg.dataset.act === 'hudpos') set.hudPos = sg.dataset.arg; else set.sideState = sg.dataset.arg; apply(); render(); }
    });
    render();
    await popup(el, { large: true });
}
