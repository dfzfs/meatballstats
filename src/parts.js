// 👁 보일 것 (v2.7.19) — 관계 탭에만 있던 「보일 것」을 모든 탭에
// 숨기기: 화면에서. 🤖 표시 항목은 AI에게 보내는 글에서도 빠져요 (v2.7.21 · core.js AI_PARTS). 데이터는 그대로라 다시 켜면 돌아와요.
// 저장: settings().partsOff = { 탭: [키, …] } — 모든 채팅 공통 (관계 탭의 relShow… 와 같은 방식)
import { app, settings, saveSettings, esc, isAiPart, aiOff, partTouched, getMeta, saveMeta, MOD, isHidden } from './core.js';
import { MINI } from './views.js';

// [키, 이름, 설명, 선택자] — 선택자는 그 탭 화면(.ss-body) 안에서 찾음. 「칸」(sec 제목)은 따로 안 적어도 자동으로 잡혀요.
const S = ':scope > ';
export const PARTS = {
    home: () => [
        ['hero', '세계 요약', '맨 위 제목 · 세계관 요약', '.ss-hero'],
        ['alerts', '알림 카드', '편지 · 판정 요청 · 도우미 안내 같은 카드', '.ss-home > .ss-callout'],
        ...Object.entries(MINI).map(([k, w]) => [`w:${k}`, w.name, `홈의 「${w.name}」 칸`, `.ss-home-grid [data-w="${k}"]`]),
    ],
    music: [
        ['now', '지금 곡', '지금 이 장면 BGM 카드', '.ss-nowplay'],
        ['pick', '추천 단추', '「어울리는 곡 3개」 단추', `${S}.ss-row-btns`],
    ],
    album: [
        ['hint', '안내', '맨 위 안내 글', `${S}.ss-hint`],
        ['filter', '분류', '분류 단추', `${S}.ss-seg`],
    ],
    record: [['tiles', '요약 타일', '숫자 타일', '.ss-rgrid']],
    profile: [
        ['hint', '프로필 모드 안내', '맨 위 「프로필 모드」 줄', `${S}.ss-hint`],
        ['summary', '소개 글', '펼쳤을 때의 소개 글', '.ss-prof-b > p.ss-pre'],
        ['where', '사는 곳 · 일정', '🏠 · 🕐 · 지금 있는 곳', '.ss-where'],
        ['fields', '세부 항목', '나이 · 외모 같은 항목', '.ss-dl'],
        ['talk', '연락하기 단추', '', '.ss-prof-b > [data-act="talk"]'],
    ],
    stats: [
        ['gbtn', '게이지 ± 단추', '−10 · −1 · +1 · +10', '.ss-gbtns > button'],
        ['gdesc', '게이지 설명', '게이지 아래 회색 설명', '.ss-gbtns > small'],
    ],
    dice: [
        ['stage', '주사위 그림', '굴리는 주사위 · 결과', '.ss-dice-stage'],
        ['form', '판정 입력', '판정 입력칸 · 굴리기 단추', '.ss-dice-form, .ss-rollbtn'],
    ],
    wallet: [['cashbtn', '돈 단추', '돈 상자 아래 단추', '.ss-cashbox .ss-row-btns']],
    ach: [
        ['bar', '달성 막대', '몇 개 달성했는지', '.ss-achbar'],
        ['list', '업적 목록', '', '.ss-achs'],
    ],
    memo: [
        ['write', '메모 쓰기', '맨 위 입력칸', '.ss-inline.top'],
        ['btns', '메모 단추', 'AI 반영 · 고정 · 삭제', '.ss-memo-f'],
    ],
    custom: [
        ['hint', '안내', '', `${S}.ss-hint`],
        ['btns', '탭 단추', '새 탭 만들기 단추', `${S}.ss-row-btns`],
    ],
    map: [
        ['where', '지금 위치 줄', '', `${S}div.ss-hint`],
        ['areas', '구역', '구역 고르기 단추', '.ss-areas'],
        ['map', '지도 그림', '', '.ss-mapwrap'],
        ['ctl', '확대 단추', '＋ · － · 현재 위치 · 전체', '.ss-mapctl'],
        ['tip', '조작 안내', '「끌어서 옮기고…」', `${S}p.ss-hint`],
        ['place', '장소 카드', '고른 장소 설명 카드', '.ss-place'],
        ['ppl', '그곳 사람', '지금 여기 · 사는 사람', '.ss-ppl'],
        ['go', '이동 단추', '이동 · 입력창에 쓰기 · 위치만 바꾸기', '.ss-place .ss-row-btns'],
    ],
    calendar: [
        ['today', '오늘 카드', '날짜 · 시간 · 날씨', '.ss-today2'],
        ['time', '시간 넘기기', '다음 시간대 · +1일 · 되돌리기', '.ss-timebar'],
        ['grid', '달력', '달력 · 날짜 칸', '.ss-cal-head, .ss-cal, .ss-calday, .ss-calx > p.ss-hint'],
    ],
    shop: [
        ['head', '상점 머리', '상점 이름 · 소지금', `${S}.ss-shop-h`],
        ['tabs', '상점 고르기', '', `${S}.ss-seg`],
        ['desc', '설명 · 재고', '상품 아래 작은 글', '.ss-good-b small'],
        ['haggle', '🎲 흥정', '', '[data-act="haggle"]'],
    ],
    base: [
        ['hero', '본거지 소개', '', '.ss-hero'],
        ['rooms', '방 · 구역', '', '.ss-rooms'],
        ['trash', '쓰레기통', '', `${S}.ss-arc`],
    ],
    contact: [
        ['mode', '연락 방식', '맨 위 앱 이름 · 방식 단추', '.ss-ct-top'],
        ['due', '도착 알림', '도착한 편지 카드', '.ss-ct > .ss-callout'],
        ['transit', '배달 중', '배달 중 막대', '.ss-transit'],
        ['add', '새 연락처', '이름 입력칸', '.ss-ct > .ss-inline'],
        ['ping', '먼저 연락 단추', '누군가에게서 연락 오게 · 배달 수단', '.ss-ct > .ss-row-btns'],
        ['hint', '안내 글', '목록 아래 회색 안내', '.ss-ct > .ss-hint'],
        ['sum', '대화 요약', '대화 맨 위 요약 줄', '.ss-csum'],
        ['bubacts', '말풍선 단추', '반응 · 고정 · 수정 · 지우기 · 다시 받기', '.ss-bub[data-id] > .ss-bub-acts, .ss-letter > .ss-bub-acts'],
        ['att', '첨부 단추', '사진 · 음성 · 위치 · 선물 · 송금', '.ss-phone-att, .ss-enclose'],
        ['opt', '답장 스위치', '답장 받기 · 급행료', '.ss-phone-opt, .ss-compose-opt'],
        ['courier', '보내는 방법', '편지 배달 수단 고르기', '.ss-letters .ss-f.wide'],
    ],
    quest: [
        ['filter', '분류', '진행 중 · 받을 수 있음 · 끝남', '.ss-quests > .ss-seg'],
        ['meta', '의뢰인 · 장소 · 기한', '', '.ss-quest .ss-meta'],
        ['desc', '내용', '', '.ss-quest > p.ss-pre'],
        ['steps', '단계', '', '.ss-steps'],
        ['reward', '보상', '', '.ss-reward'],
        ['check', '완료 판정', '🎲 능력치 판정 줄', '.ss-qcheck'],
        ['qbtns', '퀘스트 단추', '수락 · 완료 · 포기 · 지우기', '.ss-quest > .ss-row-btns'],
        ['find', '찾기 · 추가 단추', '', '.ss-quests > .ss-row-btns'],
        ['arc', '보관함', '', '.ss-arc'],
    ],
    news: [
        ['mast', '신문 머리', '', '.ss-mast'],
        ['foot', '날짜 · 지우기', '', '.ss-art-f'],
        ['arc', '지난 기사', '', '.ss-arc'],
        ['new', '발행 단추', '', '[data-act="nnew"]'],
    ],
    gossip: [
        ['mast', '머리', '', '.ss-tab-mast'],
        ['heat', '🔥 화제도', '', '.ss-heat'],
        ['foot', '인물 · 날짜', '', '.ss-art-f'],
        ['arc', '지난 호', '', '.ss-arc'],
        ['new', '발행 단추', '', '[data-act="gnew"]'],
    ],
    board: [
        ['mast', '머리', '', '.ss-tab-mast'],
        ['arc', '지난 글', '', '.ss-arc'],
        ['btns', '단추', '새 글 불러오기 · 글쓰기', '.ss-board > .ss-row-btns'],
    ],
    sns: [
        ['head', '머리', 'SNS 이름 · 새 게시물 단추', `${S}.ss-shop-h`],
        ['compose', '내 글 올리기', '', '.ss-compose-sns'],
        ['pic', '사진 묘사', '', '.ss-snspic'],
        ['tags', '태그', '', '.ss-snstags'],
        ['bar', '좋아요 줄', '', '.ss-snsbar'],
        ['replies', '댓글', '', '.ss-snspost .ss-replies'],
        ['reply', '댓글 달기', '', '.ss-snspost > .ss-inline'],
    ],
};
// 관계(자기 「보일 것」이 있음) · 관리(설정 화면)는 빼요
export const NO_PARTS = new Set(['rel', 'manage']);

const list = (tab) => { const p = PARTS[tab]; return typeof p === 'function' ? p() : p ?? []; };
export const offSet = (tab) => new Set(settings().partsOff?.[tab] ?? []);
// 칸 제목 → 키 (숫자 · 괄호 속 개수는 떼어서, 개수가 바뀌어도 같은 칸으로)
function secName(sec) {
    const h = sec.querySelector(':scope > .ss-sec-h > h4');
    if (!h) return '';
    const c = h.cloneNode(true);
    c.querySelectorAll('small, i').forEach(x => x.remove());
    return c.textContent.replace(/\d[\d/.,%]*\S*/g, '').replace(/\s+/g, ' ').trim();
}

// 이 칸을 통째로 AI에게 가리기 (v2.7.21 · 상단 도구줄의 👁 가리기와 같은 것) — 「보일 것」은 칸 안의 내용만이라,
// 칸의 규칙 줄(주사위 · 편지 · 출력 키 …)까지 빼려면 이걸 써야 토큰이 준다 · 이 채팅만
function hideBtn(tab) {
    const hm = tab === 'home' ? 'core' : tab === 'base' ? 'home' : MOD[tab] ? tab : null;
    if (!hm) return '';
    const h = isHidden(hm, getMeta());
    return `<button class="ss-btn sm ${h ? 'pri' : 'ghost'}" data-act="hidetog" title="${h ? '이 칸을 다시 AI에게 보내요' : '이 칸을 통째로 AI에게 안 보내요 — 내용 · 규칙 줄 · 출력 키 모두 (이 채팅만 · 화면과 기록은 그대로)'}"><i class="fa-solid fa-robot"></i> ${h ? 'AI에게 다시 보내기' : 'AI에게 통째로 가리기'}</button>`;
}
// 화면을 그린 뒤 부름: 숨길 것에 class를 붙이고, 맨 위에 「보일 것」 막대를 넣어요
export function applyParts(el, tab) {
    if (NO_PARTS.has(tab)) return;
    const body = el.querySelector('.ss-body'); if (!body) return;
    const off = offSet(tab);
    const items = []; // [키, 이름, 설명, 찾은 개수]
    for (const [k, name, tip, sel] of list(tab)) {
        let nodes = [];
        try { nodes = [...body.querySelectorAll(sel)]; } catch { /* 잘못된 선택자는 건너뜀 */ }
        if (off.has(k)) nodes.forEach(n => n.classList.add('ss-part-off'));
        items.push([k, name, tip, nodes.length]);
    }
    const seen = new Set();
    for (const sec of body.querySelectorAll('.ss-sec')) {
        if (sec.closest('.ss-part-off')) continue;
        const name = secName(sec); if (!name) continue;
        const k = `s:${name}`;
        if (off.has(k)) sec.classList.add('ss-part-off');
        if (seen.has(k)) continue; seen.add(k);
        items.push([k, name, `「${name}」 칸`, 1]);
    }
    // 정해 둔 것은 지금 화면에 없어도 다 보여 줘요 (미리 꺼 둘 수 있게) — 칸 제목에서 잡은 건 지금 있는 것만
    const shown = items;
    if (!shown.length) return;
    const nOff = shown.filter(([k]) => off.has(k)).length;
    const ui = el._ss?.ui ?? {};
    body.insertAdjacentHTML('afterbegin', `<details class="ss-more ss-relshow ss-partbar" ${ui.partOpen === tab ? 'open' : ''}><summary><i class="fa-solid fa-sliders"></i> 보일 것 ${nOff ? `<small>${shown.length - nOff}/${shown.length} 켬</small>` : ''}</summary>
        <div class="ss-pills">${shown.map(([k, name, tip, n]) => `<button class="ss-pill ${off.has(k) ? '' : 'on'} ${n ? '' : 'none'}" data-act="partshow" data-arg="${esc(k)}" title="${esc(tip || name)}${isAiPart(tab, k) ? (aiOff(tab, k) || !off.has(k) ? ' · 끄면 AI에게도 안 보내요' : ' · 예전에 꺼 둔 것이라 지금은 화면에서만 숨김 — 다시 눌러 켰다 끄면 AI에게도 안 보내요') : ''}${n ? '' : ' (지금 화면엔 없어요 — 생기면 이대로 적용)'}">${isAiPart(tab, k) ? '<i class="fa-solid fa-robot"></i> ' : ''}${off.has(k) ? '' : '<i class="fa-solid fa-check"></i> '}${esc(name)}</button>`).join('')}</div>
        <div class="ss-row-btns"><button class="ss-btn sm" data-act="partshow" data-arg="__none"><i class="fa-solid fa-eye-slash"></i> 다 끄기</button><button class="ss-btn sm ghost" data-act="partshow" data-arg="__all"><i class="fa-solid fa-eye"></i> 다 보기</button>${hideBtn(tab)}</div>
        <p class="ss-hint"><i class="fa-solid fa-robot"></i> 표시는 끄면 AI에게 보내는 글에서도 빠져요. 나머지는 화면에서만 숨겨요. 토큰을 크게 줄이려면 「AI에게 통째로 가리기」 — 이 칸의 규칙 줄까지 빠져요 (이 채팅만). 내용은 지워지지 않아서 다시 켜면 그대로예요. 모든 채팅에 같이 적용돼요.</p></details>`);
    body.querySelector('.ss-partbar')?.addEventListener('toggle', (e) => { if (el._ss) el._ss.ui.partOpen = e.target.open ? tab : null; });
}

export const PARTS_ACTIONS = {
    partshow: (el, arg) => {
        const tab = el._ss?.tab; if (!tab || NO_PARTS.has(tab)) return;
        const set = settings();
        const all = { ...(set.partsOff ?? {}) };
        const off = new Set(all[tab] ?? []);
        const keys = [...el.querySelectorAll('.ss-partbar [data-act="partshow"]')].map(b => b.dataset.arg).filter(k => !k.startsWith('__'));
        const wasAi = keys.filter(k => aiOff(tab, k));
        if (arg === '__none') keys.forEach(k => off.add(k));
        else if (arg === '__all') off.clear();
        else if (off.has(arg)) off.delete(arg); else off.add(arg);
        for (const k of arg.startsWith('__') ? keys : [arg]) partTouched(tab, k);
        // AI에게 다시 가게 된 항목이 있으면 다음 턴은 전체를 한 번 (변화 위주여도)
        if (wasAi.some(k => !off.has(k))) { const m = getMeta(), s = app.current?.state; if (m && s) { m.fullTurn = s.turn; saveMeta(); } }
        if (off.size) all[tab] = [...off]; else delete all[tab];
        set.partsOff = all;
        el._ss.ui.partOpen = tab;
        saveSettings();
        app.renderPanel(el);
    },
};
// 확장 설정의 「숨긴 것 모두 다시 보이기」
export function resetParts() { settings().partsOff = {}; saveSettings(); app.rerenderPanels?.(true); }
export const partsCount = () => Object.values(settings().partsOff ?? {}).reduce((a, v) => a + (v?.length ?? 0), 0);
