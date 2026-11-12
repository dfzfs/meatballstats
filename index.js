// 미트볼 상태창 (Meatball Stats) — SillyTavern UI extension
// 어떤 카드·세계관에도 붙는 상태창. 모든 칸은 AI가 처음 채우고, 직접 편집 · 추가 지시 · 다시 생성이 된다.
import { app, ctx, settings, saveSettings, getMeta, saveMeta, isActive, ready, modOn, MODS, MOD_IDS, MOD, esc, short, splitBar, findBy, TITLE, LOG, VERSION, MODULE, sub, rand, DIFFS } from './src/core.js';
import { compute, buildInjection, setInjection, addAdjust, KEYMAP, unreadCount, stashStatus, stashAllSwipes, drawerOps, setDrawer, extractOps, ssValue, undoLast } from './src/engine.js';
import { analyzeMessage, instructModule } from './src/ai.js';
import { listProfiles } from './src/prompts.js';
import { diffHTML, confirmPopup, applyTheme, askInput } from './src/kit.js';
import { ensureUI, rerenderPanels, openSheet, openWizard, openRoll, openPromptWindow, openThemeWindow, panels, renderHud } from './src/shell.js';
import { receivePing } from './src/contact.js';
import { translateSheet } from './src/translate.js';
import { notify } from './src/notify.js';
import { offerCard, followBranch, saveSlot, fullBackup, diagnose } from './src/safe.js';
import { starred, toggleStar, PRESETS, applyPreset } from './src/extra.js';
import { FREQ_MODS } from './src/engine.js';
import { setBase } from './src/shell.js';
import { initFx, play } from './src/fx.js';

const REGEX_IDS = { show: 'b7c1a0e2-5a1d-4f0e-9a51-55a1a0c05501', strip: 'b7c1a0e2-5a1d-4f0e-9a51-55a1a0c05502' };

// ───── 메시지 변동 칩 ─────
function decorateAll() {
    if (!app.current) return;
    const set = settings();
    document.querySelectorAll('#chat .mes').forEach(mesEl => {
        const i = Number(mesEl.getAttribute('mesid'));
        const textEl = mesEl.querySelector('.mes_text');
        if (!textEl || Number.isNaN(i)) return;
        const snap = app.current.snaps.get(i);
        const m = ctx().chat?.[i];
        // ⭐ 추억 앨범 버튼 (메시지 ⋯ 메뉴 옆)
        const btns = mesEl.querySelector('.mes_buttons');
        if (btns && m && !m.is_system) {
            let st = btns.querySelector('.ss-star');
            if (!st) {
                st = document.createElement('div'); st.className = 'mes_button ss-star fa-regular fa-star'; st.title = '추억 앨범에 담기'; st.dataset.ssStar = '1';
                const edit = btns.querySelector(':scope > .mes_edit');
                if (edit) btns.insertBefore(st, edit); else (btns.querySelector('.extraMesButtons') ?? btns).prepend(st);
            }
            const on = !!starred(i);
            st.classList.toggle('fa-solid', on); st.classList.toggle('fa-regular', !on); st.classList.toggle('on', on);
        }
        const hasCard = snap && set.msgCard !== 'off' && (snap.labels.length || snap.roll);
        if (hasCard && !textEl.querySelector('.ss-slot, .custom-ss-slot')) { const sl = document.createElement('div'); sl.className = 'ss-slot'; textEl.appendChild(sl); }
        const editBtn = m && drawerOps(m) && !/<status>/i.test(m.mes ?? '') ? `<button class="ss-mchip edit" data-ss-edit="${i}" title="이 답의 상태 변화 고치기"><i class="fa-solid fa-pen"></i></button>` : '';
        textEl.querySelectorAll('.ss-slot, .custom-ss-slot').forEach((slot, k) => {
            if (k > 0 || !snap || set.msgCard === 'off' || (!snap.labels.length && !snap.roll)) { slot.innerHTML = ''; slot.style.display = 'none'; return; }
            slot.style.display = '';
            const rollBtn = snap.roll && i === app.current.lastAI ? `<button class="ss-mchip roll" data-roll="${esc(snap.roll.label)}|${snap.roll.dc}"><i class="fa-solid fa-dice-d20"></i> ${esc(snap.roll.label)} 굴리기</button>` : '';
            slot.innerHTML = `<div class="ss-msgcard ss-scope">${snap.labels.filter(l => !l.startsWith('🎲')).slice(0, 14).map(l => `<span class="ss-mchip ${/[−-]\d/.test(l) ? 'neg' : /\+\d/.test(l) ? 'pos' : ''}">${esc(l)}</span>`).join('')}${rollBtn}${editBtn}</div>`;
        });
    });
}
document.addEventListener('click', async (e) => {
    const star = e.target.closest('.ss-star[data-ss-star]');
    if (star) {
        e.stopPropagation();
        const i = Number(star.closest('.mes')?.getAttribute('mesid'));
        if (Number.isFinite(i) && app.current) toggleStar(i);
        else if (!app.current) toastr.info('상태창을 만든 채팅에서 쓸 수 있어요.', TITLE);
        return;
    }
    const eb = e.target.closest('.ss-mchip.edit');
    if (eb) {
        const i = Number(eb.dataset.ssEdit);
        const m = ctx().chat?.[i];
        if (!m) return;
        const cur = (drawerOps(m) ?? []).map(([k, v]) => `${k}: ${v}`).join('\n');
        const v = await ctx().Popup.show.input(TITLE, '이 답에서 바뀐 상태 (한 줄에 하나, key: 값). 비우면 변화 없음.', cur, { rows: 8 });
        if (v === null || v === false || v === undefined) return;
        setDrawer(m, extractOps(`<status>\n${v}\n</status>`));
        await ctx().saveChat?.();
        refreshNow();
        return;
    }
    const b = e.target.closest('.ss-mchip.roll');
    if (!b) return;
    const [label, dc] = splitBar(b.dataset.roll);
    openRoll(label, Number(dc) || 0);
});

let notified = new Set();
function notifyLatest() {
    if (!app.current) return;
    const c = ctx();
    const i = app.current.lastAI;
    const m = c.chat?.[i];
    if (!m) return;
    const key = `${c.getCurrentChatId?.()}:${i}:${m.swipe_id ?? 0}:${m.mes?.length}`;
    if (notified.has(key)) return;
    notified.add(key);
    for (const a of app.current.snaps.get(i)?.alerts ?? []) notify(a);
}
app.notifyLatest = notifyLatest;
app.decorate = decorateAll;

// ───── 정규식 ─────
function regexScripts() {
    return [
        { id: REGEX_IDS.show, scriptName: '미트볼 상태창 ① <status> 블록 → 변동 칩', findRegex: '/<status>[\\s\\S]*?(?:<\\/status>|$)/gi', replaceString: '<div class="ss-slot"></div>', trimStrings: [], placement: [2], disabled: false, markdownOnly: true, promptOnly: false, runOnEdit: true, substituteRegex: 0, minDepth: null, maxDepth: null },
        { id: REGEX_IDS.strip, scriptName: '미트볼 상태창 ② 오래된 <status> 프롬프트에서 제거', findRegex: '/\\s*<status>[\\s\\S]*?(?:<\\/status>|$)/gi', replaceString: '', trimStrings: [], placement: [2], disabled: false, markdownOnly: false, promptOnly: true, runOnEdit: false, substituteRegex: 0, minDepth: 3, maxDepth: null },
    ];
}
app.installRegex = (reload) => installRegex(reload);
function installRegex(reload = true) {
    const es = ctx().extensionSettings;
    if (!Array.isArray(es.regex)) es.regex = [];
    let changed = false;
    for (const sc of regexScripts()) {
        const ex = es.regex.find(x => x.id === sc.id);
        if (!ex) { es.regex.push(sc); changed = true; }
        else if (ex.scriptName !== sc.scriptName) { ex.scriptName = sc.scriptName; saveSettings(); } // 이름만 바뀐 경우 (다시 불러오기 없이)
    }
    if (changed) { saveSettings(); if (reload) ctx().reloadCurrentChat?.(); }
    return changed;
}
function removeRegex() {
    const es = ctx().extensionSettings;
    if (!Array.isArray(es.regex)) return;
    es.regex = es.regex.filter(x => !Object.values(REGEX_IDS).includes(x.id));
    saveSettings();
    ctx().reloadCurrentChat?.();
}

// ───── 갱신 ─────
let refreshTimer = null;
function refresh() { clearTimeout(refreshTimer); refreshTimer = setTimeout(refreshNow, 60); }
function refreshNow() {
    clearTimeout(refreshTimer);
    try {
        if (!isActive() || !ready()) { app.current = null; setInjection(null); }
        else {
            app.current = compute();
            try { setInjection(getMeta()?.paused ? null : buildInjection(app.current)); } catch (e) { console.error(LOG, 'inject', e); }
            try { decorateAll(); } catch (e) { console.error(LOG, 'decorate', e); }
        }
    } catch (e) { console.error(LOG, e); }
    // 계산이 어디서 실패해도 상태창 화면은 그린다 (안 그리면 '창이 안 떠요'가 됨)
    try { ensureUI(); rerenderPanels(); } catch (e) { console.error(LOG, 'ui', e); }
}
app.refreshNow = refreshNow;

// ───── 확장 설정 서랍 ─────
function profileOptions(sel) {
    return `<option value="">메인 연결 그대로</option>${listProfiles().map(p => `<option value="${esc(p.id)}" ${p.id === sel ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}`;
}
function featOptions(sel) {
    return profileOptions(sel).replace('메인 연결 그대로', '확장 AI 모델 그대로');
}
function renderSettings() {
    if (document.getElementById('ss-settings')) return;
    const s = settings();
    const o = (k, v, label) => `<option value="${v}" ${String(s[k]) === String(v) ? 'selected' : ''}>${label}</option>`;
    const el = document.createElement('div');
    el.id = 'ss-settings';
    el.className = 'ss-settings';
    el.innerHTML = `<div class="inline-drawer">
        <div class="inline-drawer-toggle inline-drawer-header"><b>😼 미트볼 상태창 <small>v${VERSION}</small></b><div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div></div>
        <div class="inline-drawer-content">
            <label class="checkbox_label"><input type="checkbox" data-s="enabled" ${s.enabled ? 'checked' : ''}> 사용</label>
            <div class="ss-set-btns">
                <button class="menu_button" data-s-act="open"><i class="fa-solid fa-gauge-high"></i> 상태창 열기</button>
                <button class="menu_button" data-s-act="wizard"><i class="fa-solid fa-wand-magic-sparkles"></i> 만들기</button>
                <button class="menu_button" data-s-act="prompts"><i class="fa-solid fa-scroll"></i> 프롬프트 · 토큰</button>
                <button class="menu_button" data-s-act="theme"><i class="fa-solid fa-palette"></i> 꾸미기</button>
                <button class="menu_button" data-s-act="chaton">이 채팅에서 켜기</button>
            </div>
            <label>새 채팅 기본 난이도<select class="text_pole" data-s="difficulty">${Object.entries(DIFFS).map(([k, v]) => o('difficulty', k, v.name)).join('')}</select></label>
            <label>스토리 → 상태창 자동 반영<select class="text_pole" data-s="sync">
                ${o('sync', 'tag', 'A. 태그 — 메인 AI가 응답 끝에 &lt;status&gt; (추천 · 추가 호출 없음)')}
                ${o('sync', 'tagPlus', 'A+B. 태그 + 빠졌을 때만 별도 분석')}
                ${o('sync', 'analyze', 'B. 별도 분석 — 매 응답 뒤 AI 1회 더 (정확 · 비용↑)')}
                ${o('sync', 'off', 'C. 끔 — 직접 편집·추가 지시로만')}</select></label>
            <label>규칙 주입<select class="text_pole" data-s="injectMode">${o('injectMode', 'full', '전체 (세계 요약·예시 포함)')}${o('injectMode', 'lite', '간결 (토큰 절약)')}${o('injectMode', 'ultra', '초압축 (기호·키워드 · 토큰 최소)')}</select>
                <small>초압축은 가벼운 모델이 &lt;status&gt;를 빼먹을 수 있어서, 자동 반영을 A+B로 두는 걸 추천해요.</small></label>
            <label class="checkbox_label"><input type="checkbox" data-s="sceneFilter" ${s.sceneFilter ? 'checked' : ''}> 장면 필터 — 최근 대화에 나온 인물만 자세히, 나머지는 이름·수치만</label>
            <label>장면 판단에 볼 최근 메시지 수<input type="number" min="1" max="40" class="text_pole" data-s="sceneTurns" value="${s.sceneTurns}"></label>
            <label>주입할 고정 메모 최대 개수<input type="number" min="0" max="30" class="text_pole" data-s="pinCap" value="${s.pinCap}"></label>
            <label>메시지 변동 칩<select class="text_pole" data-s="msgCard">${o('msgCard', 'compact', '보이기')}${o('msgCard', 'off', '숨기기')}</select></label>
            <b class="ss-set-h">상태창 언어 · 번역</b>
            <small>상태창 칸(프로필·상점·편지·뉴스…)을 만드는 <b>확장 AI 모델</b>과, 그걸 번역하는 <b>번역 모델</b>을 따로 고를 수 있어요. 롤플 본문과는 상관없어요.</small>
            <label>상태창 생성 언어<select class="text_pole" data-s="ssGenLang">${o('ssGenLang', 'ko', '한국어로 바로 생성 (번역 없음)')}${o('ssGenLang', 'en', '영어로 생성 → 번역 모델로 번역 (생성마다 번역 1회 추가)')}</select></label>
            <label>번역 모델 (연결 프로필)<div class="ss-set-inline"><select class="text_pole" data-s="trProfile">${profileOptions(s.trProfile).replace('메인 연결 그대로', '확장 AI 모델 그대로 (없으면 메인)')}</select></div></label>
            <label>번역할 언어<input class="text_pole" data-s="trLang" value="${esc(s.trLang)}"></label>
            <div class="ss-set-btns"><button class="menu_button" data-s-act="trsheet"><i class="fa-solid fa-language"></i> 상태창 전체 번역</button></div>
            <b class="ss-set-h">일시정지 · OOC</b>
            <label class="checkbox_label"><input type="checkbox" data-s="oocDetect" ${s.oocDetect ? 'checked' : ''}> 내 메시지가 OOC로 시작하면 그 턴은 상태창 안 보냄 <small>((, (OOC, [OOC, //</small></label>
            <label class="checkbox_label"><input type="checkbox" data-s="skipQuiet" ${s.skipQuiet ? 'checked' : ''}> 조용한 생성·퀵리플라이(/gen 등)엔 안 보냄</label>
            <small>퀵리플라이에서는 <code>/ss-pause</code> · <code>/ss-resume</code> · <code>/ss-skip</code> (다음 1번만)</small>
            <b class="ss-set-h">연락</b>
            <label>연락 내용을 본편 AI에게<select class="text_pole" data-s="contactReflect">${o('contactReflect', 'auto', '자동 — 장면에 있는 사람·최근 연락 순으로 최근 3줄')}${o('contactReflect', 'pinned', '📌 고른 것만 — 말풍선에서 고정한 메시지만')}${o('contactReflect', 'summary', '요약 — 대화가 쌓이면 한 줄 요약 (가끔 AI 1회)')}${o('contactReflect', 'off', '끔 — 알려 주지 않음')}</select><small>연락처마다 ⋮ 메뉴에서 「항상 · 고른 것만 · 숨기기」를 따로 정할 수 있어요.</small></label>
            <label class="checkbox_label"><input type="checkbox" data-s="autoPing" ${s.autoPing ? 'checked' : ''}> 자동 선톡 (가끔 누군가 먼저 연락 · 확장 AI 1회)</label>
            <label>자동 선톡 간격 (AI 응답 수)<input type="number" min="2" max="100" class="text_pole" data-s="autoPingEvery" value="${s.autoPingEvery}"></label>
            <label>상대가 웃돈 주고 급행으로 답장할 확률 % (호감이 높을수록 ↑)<input type="number" min="0" max="100" class="text_pole" data-s="rushChance" value="${s.rushChance}"></label>
            <b class="ss-set-h">확장 AI</b>
            <label>확장 AI에 쓸 모델 (연결 프로필)
                <div class="ss-set-inline"><select class="text_pole" data-s="aiProfile">${profileOptions(s.aiProfile)}</select><button class="menu_button" data-s-act="profiles" title="새로고침"><i class="fa-solid fa-rotate"></i></button></div>
                <small>만들기·추가 지시·연락 답장·뉴스 등에만 쓰여요. 롤플 본문은 메인 연결.</small></label>
            <details class="ss-set-more"><summary>기능별 모델 따로 고르기</summary>
                <small>비워 두면 위의 확장 AI 모델을 써요.</small>
                <label>연락 (메신저·편지 답장 · 선톡)<select class="text_pole" data-s="profContact">${featOptions(s.profContact)}</select></label>
                <label>만들기 · 추가 지시 · 다시 생성<select class="text_pole" data-s="profGen">${featOptions(s.profGen)}</select></label>
                <label>소식 (뉴스 · 가십 · 게시판 · 의뢰)<select class="text_pole" data-s="profFeeds">${featOptions(s.profFeeds)}</select></label>
                <label>별도 분석 (자동 반영 B · A+B)<select class="text_pole" data-s="profAnalyze">${featOptions(s.profAnalyze)}</select></label>
            </details>
            <label class="checkbox_label"><input type="checkbox" data-s="aiFallbackMain" ${s.aiFallbackMain ? 'checked' : ''}> 연결 프로필이 실패하면 메인 연결로 다시 보내기 <small>(끄면 실패로 끝나요 · 비싼 메인 모델로 새는 것 방지)</small></label>
            <label class="checkbox_label"><input type="checkbox" data-s="genBatch" ${s.genBatch ? 'checked' : ''}> 상태창 만들기: 관련 칸끼리 묶어서 생성 <small>(호출 17번 → 6번 · 빠진 칸만 따로 다시)</small></label>
            <label>동시에 보낼 생성 요청 수 <small>(너무 높으면 API가 거절할 수 있어요)</small><input type="number" min="1" max="8" class="text_pole" data-s="genParallel" value="${s.genParallel}"></label>
            <label>확장 AI 최대 출력 토큰<input type="number" min="500" max="32000" class="text_pole" data-s="aiMaxTokens" value="${s.aiMaxTokens}"></label>
            <label>생성 때 읽을 최근 채팅 수<input type="number" min="0" max="100" class="text_pole" data-s="recentForGen" value="${s.recentForGen}"></label>
            <label>생성 때 읽을 로어북 최대 글자 수<input type="number" min="0" max="100000" step="1000" class="text_pole" data-s="loreChars" value="${s.loreChars}"></label>
            <label>상태 주입 깊이 (0 = 맨 끝)<input type="number" min="0" max="20" class="text_pole" data-s="injectDepth" value="${s.injectDepth}"></label>
            <label class="checkbox_label"><input type="checkbox" data-s="autoRegex" ${s.autoRegex ? 'checked' : ''}> &lt;status&gt; 숨김 정규식 자동 설치</label>
            <b class="ss-set-h">모델 맞춤 · 토큰 절약</b>
            <small>버튼 하나로 아래 설정들을 한 번에 맞춰요. 대부분 플래시·아르곤이면 첫 번째를 추천해요.</small>
            <div class="ss-set-btns">${Object.entries(PRESETS).map(([k, p]) => `<button class="menu_button" data-s-preset="${k}" title="${esc(p.desc)}"><i class="fa-solid ${p.icon}"></i> ${esc(p.name)}</button>`).join('')}</div>
            <label class="checkbox_label"><input type="checkbox" data-s="deltaMode" ${s.deltaMode ? 'checked' : ''}> 변화 위주로 보내기 — 몇 턴마다 전체, 그 사이엔 핵심 + 바뀐 것만</label>
            <label>전체를 보내는 간격 (턴)<input type="number" min="2" max="20" class="text_pole" data-s="deltaEvery" value="${s.deltaEvery}"></label>
            <details class="ss-set-more"><summary>칸별 보내는 때</summary>
                <small>「관련 말이 나올 때만」은 최근 대화에 그 칸의 이름(상점 이름, 방 이름, '뉴스' 같은 말)이 나올 때만 보내요.</small>
                ${FREQ_MODS.map(id => `<label>${esc(MOD[id]?.name ?? id)}<select class="text_pole" data-s-every="${id}">${[['always', '매 턴'], ['kw', '관련 말이 나올 때만'], ['n3', '3턴마다'], ['n5', '5턴마다']].map(([v, t]) => `<option value="${v}" ${(s.injEvery?.[id] ?? 'always') === v ? 'selected' : ''}>${t}</option>`).join('')}</select></label>`).join('')}
            </details>
            <label class="checkbox_label"><input type="checkbox" data-s="retryJSON" ${s.retryJSON ? 'checked' : ''}> 확장 AI 답이 깨지면 고쳐 보고, 안 되면 1번 더 받기 <small>(가벼운 모델 추천)</small></label>
            <b class="ss-set-h">알림</b>
            <label>알림 방식<select class="text_pole" data-s="toastMode">${o('toastMode', 'popup', '팝업 — 폰 알림처럼 떴다 사라짐 (누르면 그 탭)')}${o('toastMode', 'toastr', '실리태번 기본 알림')}${o('toastMode', 'off', '끔 — 알림함에만 모아 두기')}</select></label>
            <label>팝업 위치<select class="text_pole" data-s="toastPos">${o('toastPos', 'top', '위')}${o('toastPos', 'bottom', '아래')}</select></label>
            <label>팝업이 보이는 시간 (초)<input type="number" min="2" max="20" class="text_pole" data-s="toastSec" value="${s.toastSec}"></label>
            <label class="checkbox_label"><input type="checkbox" data-s="daySummary" ${s.daySummary ? 'checked' : ''}> 하루가 지나면 「하루 정리」 카드</label>
            <b class="ss-set-h">추천 음악</b>
            <label>좋아하는 음악 (모든 채팅 기본)<input class="text_pole" data-s="musicTaste" value="${esc(s.musicTaste)}" placeholder="예: K-pop 발라드, 영화 OST, 로파이"></label>
            <label>▶ 누르면 열 곳<select class="text_pole" data-s="musicApp">${o('musicApp', 'youtube', '유튜브')}${o('musicApp', 'ytmusic', '유튜브 뮤직')}${o('musicApp', 'spotify', '스포티파이')}${o('musicApp', 'melon', '멜론')}</select></label>
            <label class="checkbox_label"><input type="checkbox" data-s="musicToast" ${s.musicToast ? 'checked' : ''}> 곡이 바뀌면 팝업</label>
            <b class="ss-set-h">관계</b>
            <label class="checkbox_label"><input type="checkbox" data-s="stageLock" ${s.stageLock ? 'checked' : ''}> 관계 단계를 넘는 행동 막기 — 「아직 이 단계 이상은 하지 마」라고 본편 AI에게 알려 줘요 (천천히 가까워지는 연애용 · 끄면 단계만 알려 줌)</label>
            <label class="checkbox_label"><input type="checkbox" data-s="jealousy" ${s.jealousy ? 'checked' : ''}> 질투 — 다른 사람과 가까워지면 호감 높은 사람의 질투가 올라요 (날이 지나면 식음)</label>
            <label class="checkbox_label"><input type="checkbox" data-s="offscreen" ${s.offscreen ? 'checked' : ''}> 화면 밖 생활 — 날이 지나면 본편 AI가 가끔 다른 사람 근황을 적어요</label>
            <label>속마음 엿보기 하루 횟수 (0 = 무제한)<input type="number" min="0" max="20" class="text_pole" data-s="peekPerDay" value="${s.peekPerDay}"></label>
            <b class="ss-set-h">데이터 · 화면</b>
            <label class="checkbox_label"><input type="checkbox" data-s="cardOffer" ${s.cardOffer ? 'checked' : ''}> 카드에 상태창이 들어 있으면 새 채팅에서 불러올지 물어보기</label>
            <label class="checkbox_label"><input type="checkbox" data-s="autoSave" ${s.autoSave ? 'checked' : ''}> 자동 세이브 (오래된 기록을 정리하기 전에 · 분기 대비)</label>
            <label class="checkbox_label"><input type="checkbox" data-s="bottomNav" ${s.bottomNav ? 'checked' : ''}> 폰 한 손 모드 — 탭 바를 아래로</label>
            <label class="checkbox_label"><input type="checkbox" data-s="showMascot" ${s.showMascot !== false ? 'checked' : ''}> 😼 마스코트 미트볼 보이기 (빈 화면 · 만들기 · 알림 · 일시정지 · 누르면 폴짝)</label>
            <label class="checkbox_label"><input type="checkbox" data-s="clickAnim" ${s.clickAnim !== false ? 'checked' : ''}> 버튼을 누를 때 살짝 눌리는 효과</label>
            <label class="checkbox_label"><input type="checkbox" data-s="clickSound" ${s.clickSound ? 'checked' : ''}> 누를 때 소리 (뿅 · 톡 · 미트볼은 냥)</label>
            <label>소리 크기 <input type="range" min="5" max="100" step="5" data-s="clickVol" value="${s.clickVol ?? 40}"></label>
            <div class="ss-set-btns"><button class="menu_button" data-s-act="diag"><i class="fa-solid fa-stethoscope"></i> 자가 진단 · 고치기</button><button class="menu_button" data-s-act="backup"><i class="fa-solid fa-box-archive"></i> 이 채팅 전체 백업</button></div>
            <b class="ss-set-h">다른 확장과 같이 쓰기</b>
            <label class="checkbox_label"><input type="checkbox" data-s="stashTags" ${s.stashTags ? 'checked' : ''}> &lt;status&gt;를 읽은 뒤 본문에서 떼어 보관 <small>(추천 · 요약·번역·로그 복사 확장에 변화량 줄이 안 보여요. 고칠 땐 변동 칩의 ✏️)</small></label>
            <div class="ss-set-btns"><button class="menu_button" data-s-act="stashall"><i class="fa-solid fa-box-archive"></i> 이 채팅의 옛 태그도 모두 보관</button></div>
            <div class="ss-set-btns">
                <button class="menu_button" data-s-act="defmods">지금 기능 구성을 새 채팅 기본값으로</button>
                <button class="menu_button" data-s-act="regex">정규식 설치</button>
                <button class="menu_button" data-s-act="unregex">정규식 제거</button>
            </div>
        </div></div>`;
    el.addEventListener('change', (e) => {
        const ev = e.target.dataset.sEvery;
        if (ev) { const set = settings(); set.injEvery = { ...(set.injEvery ?? {}), [ev]: e.target.value }; if (e.target.value === 'always') delete set.injEvery[ev]; saveSettings(); refreshNow(); return; }
        const k = e.target.dataset.s;
        if (!k) return;
        settings()[k] = e.target.type === 'checkbox' ? e.target.checked : e.target.type === 'number' ? Number(e.target.value) : e.target.value;
        saveSettings();
        if (k === 'autoRegex' && e.target.checked) installRegex();
        if (k === 'clickSound' || k === 'clickVol') play('tap');
        refreshNow();
    });
    el.addEventListener('click', async (e) => {
        const pk = e.target.closest('[data-s-preset]')?.dataset.sPreset;
        if (pk) {
            applyPreset(pk);
            const set = settings();
            el.querySelectorAll('[data-s]').forEach(i => { const v = set[i.dataset.s]; if (v === undefined) return; if (i.type === 'checkbox') i.checked = !!v; else i.value = v; });
            el.querySelectorAll('[data-s-every]').forEach(i => { i.value = set.injEvery?.[i.dataset.sEvery] ?? 'always'; });
            return;
        }
        const a = e.target.closest('[data-s-act]')?.dataset.sAct;
        if (!a) return;
        if (a === 'diag') return diagnose();
        if (a === 'backup') return fullBackup();
        if (a === 'open') openSheet();
        if (a === 'wizard') openWizard();
        if (a === 'prompts') openPromptWindow();
        if (a === 'theme') openThemeWindow();
        if (a === 'chaton') { const m = getMeta(true); m.off = false; await saveMeta(); refreshNow(); toastr.success('이 채팅에서 켰어요.', TITLE); }
        if (a === 'profiles') { el.querySelector('[data-s="trProfile"]').innerHTML = profileOptions(settings().trProfile).replace('메인 연결 그대로', '확장 AI 모델 그대로 (없으면 메인)'); el.querySelector('[data-s="aiProfile"]').innerHTML = profileOptions(settings().aiProfile); for (const k of ['profContact', 'profGen', 'profFeeds', 'profAnalyze']) el.querySelector(`[data-s="${k}"]`).innerHTML = featOptions(settings()[k]); toastr.info(`연결 프로필 ${listProfiles().length}개`, TITLE); }
        if (a === 'defmods') { const m = getMeta(); if (!m) return; settings().defaultMods = { ...m.mods }; saveSettings(); toastr.success('저장했어요.', TITLE); }
        if (a === 'regex') installRegex() ? toastr.success('설치했어요.', TITLE) : toastr.info('이미 설치되어 있어요.', TITLE);
        if (a === 'unregex') { removeRegex(); toastr.info('제거했어요.', TITLE); }
        if (a === 'trsheet') translateSheet(e.target.closest('button'));
        if (a === 'stashall') {
            const chat = ctx().chat ?? [];
            let n = 0;
            for (const m of chat) n += stashAllSwipes(m);
            if (!n) { toastr.info('옮길 태그가 없어요.', TITLE); return; }
            await ctx().saveChat?.();
            await ctx().reloadCurrentChat?.();
            toastr.success(`답 ${n}개의 태그를 보관했어요.`, TITLE);
        }
    });
    document.getElementById('extensions_settings2')?.appendChild(el);
}

// ───── 슬래시 커맨드 ─────
function registerCommands() {
    const { SlashCommandParser, SlashCommand, SlashCommandArgument, SlashCommandNamedArgument, ARGUMENT_TYPE } = ctx();
    if (!SlashCommandParser?.addCommandObject) return;
    const tabs = ['home', ...MOD_IDS, 'manage'];
    const add = (p) => SlashCommandParser.addCommandObject(SlashCommand.fromProps(p));
    add({
        name: 'ss',
        callback: (_n, tab) => {
            const t = String(tab ?? '').trim();
            let id = ['home', '홈'].includes(t) ? 'home' : ['manage', '관리'].includes(t) ? 'manage' : ['base', '본거지'].includes(t) ? 'base' : MOD_IDS.includes(t) ? t : MODS.find(m => m.name === t)?.id;
            if (id === 'home' && !['home', '홈'].includes(t)) id = 'base';
            openSheet(id); return '';
        },
        unnamedArgumentList: [SlashCommandArgument.fromProps({ description: '탭 (지도, 상점, 연락, 퀘스트 …)', typeList: ARGUMENT_TYPE.STRING, isRequired: false })],
        helpString: '상태창을 연다. 예: /ss 지도',
    });
    add({ name: 'ss-make', callback: () => { openWizard(); return ''; }, helpString: '상태창 만들기 창을 연다.' });
    add({ name: 'ss-prompts', callback: () => { openPromptWindow(); return ''; }, helpString: '프롬프트 · 토큰 창을 연다.' });
    add({ name: 'ss-pause', callback: async () => { const m = getMeta(true); m.paused = true; await saveMeta(); refreshNow(); return ''; }, helpString: '상태창 일시정지 (AI에게 상태를 보내지 않음).' });
    add({ name: 'ss-resume', callback: async () => { const m = getMeta(true); m.paused = false; await saveMeta(); refreshNow(); return ''; }, helpString: '상태창 다시 켜기.' });
    add({ name: 'ss-skip', callback: async () => { const m = getMeta(true); m.skipOnce = true; await saveMeta(); return ''; }, helpString: '다음 생성 1번만 상태창 없이 보낸다 (퀵리플라이 앞에).' });
    add({
        name: 'ss-roll',
        callback: (_n, label) => { openRoll(String(label ?? '').trim(), 0); return ''; },
        unnamedArgumentList: [SlashCommandArgument.fromProps({ description: '판정 이름', typeList: ARGUMENT_TYPE.STRING, isRequired: false })],
        helpString: '주사위 판정 창을 연다. 예: /ss-roll 은신',
    });
    add({
        name: 'ss-set',
        callback: async (named, text) => {
            if (!ready()) return '';
            const key = String(named.key ?? '').trim();
            if (!KEYMAP[key.toLowerCase()]) { toastr.warning('key가 올바르지 않아요. 예: /ss-set key=cash +500', TITLE); return ''; }
            await addAdjust({ ops: [[key, String(text ?? '')]], label: `${key} ${text}` });
            return '';
        },
        namedArgumentList: [SlashCommandNamedArgument.fromProps({ name: 'key', description: 'stat, cash, item, loc, aff, date, quest, news, msg …', typeList: ARGUMENT_TYPE.STRING, isRequired: true })],
        unnamedArgumentList: [SlashCommandArgument.fromProps({ description: '값 (<status> 한 줄과 같은 형식)', typeList: ARGUMENT_TYPE.STRING, isRequired: true })],
        helpString: '상태를 직접 바꾼다. 예: /ss-set key=stat 체력 -10',
    });
    add({
        name: 'ss-instruct',
        callback: async (named, text) => {
            if (!ready()) return '';
            const t = String(named.tab ?? '').trim();
            const id = t === 'world' || t === '세계' ? 'core' : MOD_IDS.includes(t) ? t : MODS.find(m => m.name === t)?.id;
            if (!id) { toastr.warning('tab이 올바르지 않아요. 예: /ss-instruct tab=지도 북쪽에 설산 추가', TITLE); return ''; }
            try {
                const after = await instructModule(id, String(text ?? ''), app.current.state);
                const box = document.createElement('div'); box.className = 'ss-root ss-scope ss-preview';
                box.innerHTML = `<h3>바뀌는 내용 — ${esc(id === 'core' ? '세계' : MOD[id].name)}</h3>${diffHTML(id === 'core' ? app.current.state.core : app.current.state.data[id], after)}`;
                if (await confirmPopup(box)) await addAdjust({ set: { mod: id, data: after }, label: `💬 ${id === 'core' ? '세계' : MOD[id].name} 수정: ${short(text, 40)}` });
            } catch (e) { toastr.error(esc(e.message), TITLE); }
            return '';
        },
        namedArgumentList: [SlashCommandNamedArgument.fromProps({ name: 'tab', description: '칸 (세계, 지도, 상점 …)', typeList: ARGUMENT_TYPE.STRING, isRequired: true })],
        unnamedArgumentList: [SlashCommandArgument.fromProps({ description: '추가 지시', typeList: ARGUMENT_TYPE.STRING, isRequired: true })],
        helpString: '한 칸에 추가 지시. 예: /ss-instruct tab=상점 암시장 추가',
    });
    add({
        name: 'ss-get',
        callback: (named) => {
            if (!app.current) return '';
            const k = String(named?.key ?? '').trim();
            if (k) return ssValue(app.current.state, k);
            const inj = buildInjection(app.current);
            return sub(`${inj.main}\n${inj.people}`);
        },
        namedArgumentList: [SlashCommandNamedArgument.fromProps({ name: 'key', description: 'cash, loc, date, time, weather, season, curse, quest, here_now, aff:이름, trust:이름, stat:체력, item:이름, 게이지 이름…', typeList: ARGUMENT_TYPE.STRING, isRequired: false })],
        helpString: '상태를 텍스트로 돌려준다. key를 주면 그 값 하나만. 예: /ss-get key=cash · /ss-get key=aff:레온',
    });
    add({ name: 'ss-undo', callback: async () => { await app.undoLast?.(); return ''; }, helpString: '상태창에서 한 마지막 편집을 되돌린다.' });
    add({ name: 'ss-save', callback: async () => { if (ready()) await saveSlot(); return ''; }, helpString: '지금 상태를 세이브 슬롯에 저장한다.' });
    add({ name: 'ss-backup', callback: () => { fullBackup(); return ''; }, helpString: '이 채팅의 상태창 전체를 파일로 백업한다.' });
    add({ name: 'ss-inbox', callback: () => { app.openInbox?.(); return ''; }, helpString: '알림함을 연다.' });
    add({ name: 'ss-search', callback: () => { app.openSearch?.(); return ''; }, helpString: '상태창 검색 창을 연다.' });
    add({ name: 'ss-diag', callback: async () => { await diagnose(); return ''; }, helpString: '자가 진단 — 망가진 기록을 찾아 고친다.' });
}

// ───── 이벤트 ─────
function lastUserText() {
    const chat = ctx().chat ?? [];
    for (let i = chat.length - 1; i >= 0; i--) if (chat[i]?.is_user) return String(chat[i].mes ?? '');
    return '';
}
async function onBeforeGenerate(type, _opts, dryRun) {
    if (dryRun || !isActive() || !ready()) return;
    const set = settings(), meta = getMeta();
    let skip = !!meta.paused;
    if (!skip && set.skipQuiet && type === 'quiet') skip = true;
    // 조용한 생성(다른 확장의 요약 등)은 '다음 1번 건너뛰기'를 쓰지 않는다
    if (!skip && meta.skipOnce && type !== 'quiet') { skip = true; meta.skipOnce = false; saveMeta(); renderHud(); }
    if (!skip && set.oocDetect && type !== 'quiet' && type !== 'continue') {
        try { if (new RegExp(set.oocPattern, 'i').test(lastUserText())) skip = true; } catch { /* bad pattern */ }
    }
    if (skip) { setInjection(null); return; }
    const chat = ctx().chat ?? [];
    let limit = chat.length;
    const last = chat[chat.length - 1];
    if ((type === 'swipe' || type === 'regenerate') && last && !last.is_user) limit = chat.length - 1;
    try { setInjection(buildInjection(compute(limit))); } catch (e) { console.error(LOG, e); }
}
function onGenEnded() { refresh(); }
// 서랍: AI 답이 끝나면 <status>를 본문에서 떼어 보관
let stashSave = null;
function stashAt(id, { replace = false, rerender = true, save = false } = {}) {
    if (!settings().stashTags || !isActive() || !ready()) return; // 상태창을 안 만든 채팅의 <status>(다른 프리셋 것일 수도)는 건드리지 않는다
    const chat = ctx().chat ?? [];
    const i = Number(id ?? chat.length - 1);
    const m = chat[i];
    if (!stashStatus(m, { replace })) return;
    if (rerender) { try { ctx().updateMessageBlock?.(i, m); } catch (e) { console.warn(LOG, 'rerender', e); } }
    if (save) { clearTimeout(stashSave); stashSave = setTimeout(() => ctx().saveChat?.(), 400); }
}
function onReceived(id, type) {
    if (type === 'impersonate') return;
    stashAt(id, { replace: type !== 'continue' });
}
function onSwiped(id) { stashAt(id, { replace: true, save: true }); refresh(); }
function onEdited(id) { stashAt(id, { replace: true, rerender: false, save: true }); refresh(); }
const analyzed = new Set();
let pingCounter = 0;
function onCharRendered(id, type) {
    refreshNow();
    notifyLatest();
    if (!isActive() || !ready() || type === 'quiet' || getMeta()?.paused) return;
    const chat = ctx().chat ?? [];
    const i = Number(id ?? chat.length - 1);
    const m = chat[i];
    if (!m || m.is_user || i !== chat.length - 1) return;
    const set = settings();
    // 자동 선톡
    if (set.autoPing && modOn('contact') && app.current?.state.data.contact?.contacts.length) {
        pingCounter++;
        if (pingCounter >= Math.max(2, set.autoPingEvery) && rand(100) <= 50) {
            pingCounter = 0;
            const cs = app.current.state.data.contact.contacts.filter(c => !c.blocked);
            if (cs.length) receivePing(cs[rand(cs.length) - 1].name, true).catch(e => console.warn(LOG, 'autoping', e));
        }
    }
    if (set.sync !== 'analyze' && set.sync !== 'tagPlus') return;
    if (set.sync === 'tagPlus' && /<status>/i.test(m.mes)) return;
    if (m.extra?.[MODULE]?.bySwipe?.[m.swipe_id ?? 0]) return;
    const key = `${ctx().getCurrentChatId?.()}:${i}:${m.swipe_id ?? 0}:${m.mes.length}`;
    if (analyzed.has(key)) return;
    analyzed.add(key);
    analyzeMessage(i);
}
async function onChatChanged() {
    notified = new Set();
    pingCounter = 0;
    for (const el of panels) if (el._ss) { el._ss.mode = 'view'; el._ss.ui = {}; el._ss.tab = 'home'; el._ss.group = null; }
    try { await followBranch(); } catch (e) { console.warn(LOG, 'branch', e); }
    refreshNow();
    // 카드에 상태창이 들어 있으면 (이 채팅에 아직 없을 때) 한 번 물어본다
    setTimeout(() => { offerCard(setBase).catch(e => console.warn(LOG, 'card', e)); }, 400);
}

// 마지막 편집 되돌리기 (관리 탭 버튼 · /ss-undo)
app.undoLast = async () => {
    const meta = getMeta();
    const a = meta?.adjust?.at(-1);
    if (!a) { toastr.info('되돌릴 편집이 없어요.', TITLE); return; }
    if (!(await ctx().Popup.show.confirm(TITLE, `「${esc(a.label || '이름 없는 편집')}」을(를) 되돌릴까요?`))) return;
    await undoLast();
    toastr.success('되돌렸어요.', TITLE);
};
// 매크로: {{ss::cash}} · {{ss::aff:레온}} — 카드·로어북·퀵리플라이 어디서든 상태값을 꺼낸다
function registerMacros() {
    const c = ctx();
    const get = (k) => { try { return app.current ? ssValue(app.current.state, k) : ''; } catch { return ''; } };
    try {
        if (c.macros?.register) {
            c.macros.register('ss', {
                category: c.macros.category?.MISC ?? c.macros.category?.UTILITY ?? 'utility',
                unnamedArgs: [{ name: 'key', type: c.macros.valueType?.STRING ?? 'string', description: 'cash, loc, date, time, weather, aff:이름 …' }],
                description: '미트볼 상태창의 값 하나 (예: {{ss::cash}}, {{ss::aff:레온}})',
                returns: '그 값',
                exampleUsage: ['{{ss::cash}}', '{{ss::aff:레온}}', '{{ss::weather}}'],
                handler: ({ unnamedArgs: [key] }) => get(key),
            });
            return;
        }
    } catch (e) { console.warn(LOG, 'macro', e); }
    // 옛 실리: 인자 없는 매크로로 자주 쓰는 것만
    try { for (const k of ['cash', 'loc', 'date', 'time', 'weather', 'curse']) c.registerMacro?.(`ss_${k}`, () => get(k)); } catch (e) { console.warn(LOG, 'macro', e); }
}

function init() {
    const { eventSource, event_types: E } = ctx();
    settings();
    applyTheme();
    initFx();
    renderSettings();
    registerCommands();
    registerMacros();
    if (settings().autoRegex) installRegex(false);
    const on = (name, fn) => { if (E[name]) eventSource.on(E[name], fn); };
    on('CHAT_CHANGED', onChatChanged);
    on('GENERATION_AFTER_COMMANDS', onBeforeGenerate);
    on('MESSAGE_RECEIVED', onReceived);
    on('CHARACTER_MESSAGE_RENDERED', onCharRendered);
    on('MESSAGE_SWIPED', onSwiped);
    on('MESSAGE_EDITED', onEdited);
    for (const ev of ['USER_MESSAGE_RENDERED', 'MESSAGE_UPDATED', 'MESSAGE_DELETED', 'MORE_MESSAGES_LOADED', 'GENERATION_STOPPED']) on(ev, refresh);
    on('GENERATION_ENDED', onGenEnded);
    refreshNow();
    console.log(LOG, 'loaded', VERSION);
}

{
    const { eventSource: _es, event_types: _et } = SillyTavern.getContext();
    _es.on(_et.APP_READY, init);
}

if (globalThis.__SS_TEST__) globalThis.__SS_TEST__.api = { refreshNow, decorateAll, onBeforeGenerate, init, onChatChanged, app };
