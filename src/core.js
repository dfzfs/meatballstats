// 미트볼 상태창 (Meatball Stats) — 공통: 상수 · 유틸 · 설정 · 데이터 모양
export const MODULE = 'statussim';
export const LOG = '[미트볼 상태창]';
export const TITLE = '미트볼 상태창';
export const VERSION = '2.5.0';
export const INJECT_KEY = 'statussim_state';
export const INJECT_KEY2 = 'statussim_people';
export const PROMPT_IN_CHAT = 1;
export const ROLE_SYSTEM = 0;

// 마스코트 그림 (확장 폴더의 img/) — idle · happy · think · surprise · sad · sleep · party
export const MASCOTS = ['idle', 'happy', 'think', 'surprise', 'sad', 'sleep', 'party'];
export const mascotUrl = (n) => new URL(`../img/mascot_${MASCOTS.includes(n) ? n : 'idle'}.webp`, import.meta.url).href;
// 모듈끼리 서로 부르는 함수·현재 상태를 담는 곳 (순환 import 방지)
export const app = { current: null };

export const DEFAULTS = Object.freeze({
    enabled: true,
    showHud: true,           // 채팅 위 상태 바
    showSide: true,          // 오른쪽 사이드 패널
    showFloat: false,        // 떠 있는 버튼
    hudPos: 'top',           // top | bottom
    hudOpen: true,           // HUD 게이지 줄 펼침
    sideState: 'mini',       // closed | mini | full
    sideMini: ['bars', 'date', 'loc', 'cash', 'contact', 'quest'],
    sideWidth: 400,
    floatPos: null,
    sync: 'tag',             // tag | tagPlus | analyze | off
    injectDepth: 1,
    injectMode: 'full',      // full | lite
    msgCard: 'compact',      // compact | off
    aiProfile: '',
    aiMaxTokens: 6000,
    recentForGen: 20,
    loreChars: 10000,
    autoRegex: true,
    contactInject: true,
    difficulty: 'normal',    // 새 채팅 기본 난이도
    skipQuiet: true,         // 퀵리플라이 /gen 같은 조용한 생성엔 주입 안 함
    oocDetect: true,         // 유저 메시지가 OOC면 그 턴은 주입 안 함
    oocPattern: '^\\s*(\\(\\(|\\[?\\(?\\s*ooc\\b|//|\\[ooc)',
    autoPing: false,         // 자동 선톡 (확장 AI 호출)
    autoPingEvery: 8,
    rushChance: 15,          // 상대가 웃돈 주고 급행으로 답장할 기본 확률 %
    theme: 'white',
    themeCustom: {},
    fontScale: 1,
    radius: 12,
    defaultMods: null,
    ssGenLang: 'ko',         // 상태창(확장 AI) 생성 언어: ko = 바로 한국어 | en = 영어로 생성 → 번역 모델로 번역
    trProfile: '',           // 번역 모델 (연결 프로필, '' = 확장 AI 모델 → 없으면 메인)
    trLang: '한국어',
    prompts: {},             // 사용자 수정 프롬프트
    stashTags: true,         // <status>를 읽은 뒤 본문에서 떼어 메시지 숨은 칸에 보관 (다른 확장·요약에 안 보임)
    aiFallbackMain: true,    // 연결 프로필 실패·빈 응답 때 메인 연결로 다시 보냄
    profContact: '',         // 기능별 모델 (연결 프로필, '' = 확장 AI 모델)
    profGen: '',
    profFeeds: '',
    profAnalyze: '',
    sheetFull: false,        // 상태창을 전체화면으로 열기
    genBatch: true,          // 상태창 만들기: 관련 칸끼리 묶어서 한 번에 생성 (17번 → 6번)
    genParallel: 4,          // 동시에 보낼 생성 요청 수
    sceneFilter: true,       // 최근 대화에 나온 인물만 자세히 주입, 나머지는 이름만
    sceneTurns: 6,           // 장면 판단에 볼 최근 메시지 수
    pinCap: 8,               // 주입할 고정 메모 최대 개수
    contactReflect: 'auto',  // 연락 → 본편 반영: off | auto | pinned | summary
    usage: [],               // 확장 AI 사용 기록
    // ── v2.5 ──
    toastMode: 'popup',      // 알림: popup (폰 알림처럼 떴다 사라짐) | toastr (실리 기본 알림) | off
    toastPos: 'top',         // top | bottom
    toastSec: 4,             // 팝업이 보이는 시간 (초)
    daySummary: true,        // 하루가 지나면 하루 정리 카드
    musicApp: 'youtube',     // 추천 곡 ▶ 누르면 열 곳: youtube | ytmusic | spotify | melon
    musicTaste: '',          // 좋아하는 음악 장르 (예: K-pop, 영화 OST)
    musicToast: true,        // 추천 곡이 바뀌면 팝업
    deltaMode: false,        // 변화 위주로 보내기 (N턴마다 전체)
    deltaEvery: 4,
    injEvery: {},            // 칸별 보내는 때: { news: 'kw', ... } — always(기본) | kw(관련 말이 나올 때만) | n3 | n5
    retryJSON: true,         // 확장 AI 답이 깨지면 고쳐 보고, 안 되면 1번 더
    peekPerDay: 3,           // 속마음 엿보기 하루 횟수 (0 = 무제한)
    jealousy: true,          // 질투 게이지
    stageLock: false,        // 관계 단계를 넘는 행동을 본편 AI에게 막기 (끄면 단계만 알려 줌)
    offscreen: true,         // NPC 화면 밖 생활 (날이 지나면 가끔)
    favTabs: [],             // 즐겨찾기 탭
    bottomNav: false,        // 폰: 탭 바를 아래로 (한 손 모드)
    cardOffer: true,         // 카드에 붙은 상태창이 있으면 새 채팅에서 불러올지 물어봄
    autoSave: true,          // 자동 세이브 (오래된 기록을 굳히기 전에 · 최근 3개)
    carry: {},               // 2회차 이어받기 (캐릭터별)
    showMascot: true,        // 마스코트 미트볼 보이기
    clickAnim: true,         // 누를 때 살짝 눌리는 효과
    clickSound: false,       // 누를 때 소리 (뿅 · 톡 · 미트볼은 냥)
    clickVol: 40,            // 소리 크기 0~100
});

// 연락: 최근에 주고받은 상대를 맨 앞으로 (본편 주입 순서)
export function touchContact(ct, who) {
    if (!ct || !who) return;
    ct.recent = [who, ...(ct.recent ?? []).filter(x => x !== who)].slice(0, 30);
}

export const MODS = [
    { id: 'profile', name: '프로필', icon: 'fa-id-card', desc: '유저·캐릭터·NPC 프로필 시트' },
    { id: 'stats', name: '수치', icon: 'fa-heart-pulse', desc: '체력 같은 게이지 · 능력치 · 상태 이상' },
    { id: 'dice', name: '주사위', icon: 'fa-dice-d20', desc: '능력치 보정이 붙는 판정' },
    { id: 'wallet', name: '재산', icon: 'fa-coins', desc: '돈 · 소지품' },
    { id: 'shop', name: '상점', icon: 'fa-store', desc: '재산으로 사고팔기', needs: 'wallet' },
    { id: 'home', name: '본거지', icon: 'fa-house-chimney', desc: '방·구역 꾸미기 (가구 배치)' },
    { id: 'rel', name: '관계', icon: 'fa-people-arrows', desc: '호감·신뢰, 인물끼리의 관계' },
    { id: 'map', name: '지도', icon: 'fa-map-location-dot', desc: '장소 · 연결 · 현재 위치' },
    { id: 'calendar', name: '달력', icon: 'fa-calendar-days', desc: '세계 안의 날짜 · 시간 · 일정' },
    { id: 'contact', name: '연락', icon: 'fa-envelope', desc: '메신저 또는 편지 (세계관에 맞게)' },
    { id: 'quest', name: '퀘스트', icon: 'fa-scroll', desc: '의뢰 · 목표 · 보상' },
    { id: 'news', name: '뉴스', icon: 'fa-newspaper', desc: '세상 소식 (신문·방송·관보)' },
    { id: 'gossip', name: '가십지', icon: 'fa-wine-glass', desc: '인물들에 대한 소문 · 스캔들' },
    { id: 'board', name: '게시판', icon: 'fa-clipboard-list', desc: '커뮤니티 · 길드 게시판 (글·댓글)' },
    { id: 'ach', name: '업적', icon: 'fa-trophy', desc: '세계관 맞춤 업적' },
    { id: 'memo', name: '메모', icon: 'fa-note-sticky', desc: '내 메모 · AI 메모' },
    { id: 'fate', name: '운명', icon: 'fa-hat-wizard', desc: '저주·축복 · 이벤트 카드 · 자동 규칙 · 미니게임' },
    { id: 'sns', name: 'SNS', icon: 'fa-hashtag', desc: '인물들의 SNS 피드 (사진 묘사 · 좋아요 · 댓글)' },
    { id: 'music', name: '추천 음악', icon: 'fa-music', desc: '장면에 어울리는 곡 추천 (▶ 누르면 검색)' },
    { id: 'custom', name: '내 탭', icon: 'fa-shapes', desc: '직접 만드는 탭 — 칸 · 수치 · 글 자유롭게' },
];
// v2.5에 새로 생긴 기능 — 옛 채팅에서는 꺼진 채로 시작 (켜면 그때부터)
export const NEW_MODS_V5 = ['sns', 'music', 'custom'];
// 관계 단계 기본값 (세계관마다 AI가 바꿔 줌)
export const DEFAULT_STAGES = [
    { name: '낯선 사이', at: -100, trust: -100, unlock: '' },
    { name: '아는 사이', at: 0, trust: -100, unlock: '이름 부르기' },
    { name: '친구', at: 25, trust: 10, unlock: '말 편하게 하기 · 사적인 연락' },
    { name: '가까운 사이', at: 45, trust: 25, unlock: '고민 털어놓기 · 단둘이 약속' },
    { name: '특별한 사이', at: 65, trust: 40, unlock: '애칭 · 질투 · 스킨십 조금' },
    { name: '연인', at: 85, trust: 55, unlock: '고백 이후 · 연인다운 행동' },
];
export const MOD = Object.fromEntries(MODS.map(m => [m.id, m]));
export const MOD_IDS = MODS.map(m => m.id);

export const DIFFS = {
    easy: { name: '이지', icon: 'fa-feather', dc: -2, pct: 10, desc: '실수해도 크게 잃지 않고, 돈·도움이 넉넉하며 관계가 빨리 가까워져요. 주사위 난이도 −2.' },
    normal: { name: '보통', icon: 'fa-scale-balanced', dc: 0, pct: 0, desc: '선택에 결과가 따르지만 회복할 수 있어요.' },
    hard: { name: '하드', icon: 'fa-skull', dc: 2, pct: -10, desc: '자원이 귀하고 사람들은 경계해요. 실패는 오래 남아요. 주사위 난이도 +2.' },
};

export const GENRES = [
    { id: 'modern', name: '현대', hint: '현대 한국/도시. 스마트폰 메신저, 원화.', contact: 'phone' },
    { id: 'fantasy', name: '판타지', hint: '검과 마법의 판타지 왕국. 길드, 몬스터, 금화.', contact: 'letter' },
    { id: 'academy', name: '마법학원', hint: '마법 학교/아카데미. 기숙사, 수업, 시험, 교수.', contact: 'letter' },
    { id: 'eastern', name: '동양·무협', hint: '동양풍(무협/선협/궁중). 문파, 객잔, 은자·전.', contact: 'letter' },
    { id: 'medieval', name: '중세', hint: '마법이 거의 없는 중세 유럽풍. 영주, 교회, 장원.', contact: 'letter' },
    { id: 'early', name: '근대', hint: '19세기~20세기 초. 증기, 신문, 전보·편지, 사교계.', contact: 'letter' },
    { id: 'sf', name: 'SF', hint: '우주/사이버펑크. 통신기, 크레딧.', contact: 'phone' },
    { id: 'apoc', name: '아포칼립스', hint: '멸망 이후 생존. 물자가 귀함, 무전기.', contact: 'instant' },
    { id: 'fan', name: '2차 창작', hint: '원작 세계관을 그대로 따름.', contact: 'auto' },
];

export const CONTACT_MODES = {
    auto: { name: '세계관에 맞게 (AI가 정함)', icon: 'fa-wand-magic-sparkles' },
    phone: { name: '휴대폰 메신저', icon: 'fa-mobile-screen-button', app: '메신저' },
    instant: { name: '즉시 통신 (마법 통신구·무전·텔레파시)', icon: 'fa-tower-broadcast', app: '통신구' },
    letter: { name: '편지 (도착까지 시간이 걸림)', icon: 'fa-envelope', app: '편지' },
};

export const COURIER_PRESETS = [
    { name: '배달부', icon: '🚲', min: 2, max: 3, fee: 0, note: '마을 우편 배달부' },
    { name: '갈매기', icon: '🐦', min: 1, max: 3, fee: 0, note: '바닷가라면 갈매기 우편' },
    { name: '강아지', icon: '🐕', min: 1, max: 2, fee: 0, note: '목에 편지통을 단 강아지' },
    { name: '올빼미', icon: '🦉', min: 1, max: 2, fee: 0, note: '밤에 날아가는 올빼미' },
    { name: '전서구', icon: '🕊️', min: 1, max: 2, fee: 0, note: '비둘기 다리에 묶어' },
    { name: '파발마', icon: '🐎', min: 1, max: 2, fee: 0, note: '말 탄 파발꾼' },
    { name: '마법 편지', icon: '✨', min: 0, max: 1, fee: 0, note: '종이학이 되어 날아감' },
];

// ───── 유틸 ─────
export const ctx = () => SillyTavern.getContext();
export const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
export const clone = (o) => (o === undefined ? undefined : structuredClone(o));
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const num = (v, d = 0) => { const n = Number(v); return Number.isFinite(n) ? n : d; };
export const str = (v, d = '') => (v === null || v === undefined ? d : String(v));
export const arr = (v) => (Array.isArray(v) ? v : []);
export const norm = (x) => String(x ?? '').replace(/\s+/g, '').toLowerCase();
// 포맷터를 한 번만 만든다 (toLocaleString은 부를 때마다 새로 만들어서 긴 채팅에서 느렸음)
const NUM_FMT = new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 2 });
export const fmtNum = (n) => NUM_FMT.format(Number(n));
export const signed = (n) => (n > 0 ? `+${fmtNum(n)}` : n < 0 ? `−${fmtNum(Math.abs(n))}` : '±0');
export const uid = () => Math.random().toString(36).slice(2, 9);
export const short = (t, n) => { t = String(t ?? '').replace(/\s+/g, ' ').trim(); return t.length > n ? t.slice(0, n - 1) + '…' : t; };
export const splitBar = (val) => String(val ?? '').split('|').map(x => x.trim());
export function h(html) {
    const t = document.createElement('template');
    t.innerHTML = String(html).trim();
    return t.content.firstElementChild;
}
export function rand(n) { // 1..n
    const buf = new Uint32Array(1);
    crypto.getRandomValues(buf);
    return (buf[0] % n) + 1;
}
export const randInt = (a, b) => (b <= a ? a : a + rand(b - a + 1) - 1);
export function findBy(list, name, field = 'name') {
    const n = norm(name);
    if (!n || !Array.isArray(list)) return null;
    return list.find(x => norm(x?.[field]) === n)
        ?? list.find(x => { const m = norm(x?.[field]); return m.length >= 2 && n.length >= 2 && (m.includes(n) || n.includes(m)); })
        ?? null;
}
export function parseNum(raw) {
    const t = String(raw ?? '').trim().replace(/[−–—]/g, '-').replace(/[,\s]/g, '');
    const m = t.match(/^([=+-]?)(\d+(?:\.\d+)?)(억|만|천|k|m)?/i);
    if (!m) return null;
    let v = parseFloat(m[2]);
    const u = (m[3] || '').toLowerCase();
    if (u === '억') v *= 1e8; else if (u === '만') v *= 1e4; else if (u === '천' || u === 'k') v *= 1e3; else if (u === 'm') v *= 1e6;
    return { mode: m[1] === '=' ? 'set' : m[1] ? 'add' : 'bare', v: m[1] === '-' ? -v : v };
}
export const sub = (t) => { try { return ctx().substituteParams(String(t ?? '')); } catch { return String(t ?? ''); } };
// 풀사칭(디렉터)에서는 유저가 이야기 밖에 있으니, 상태창의 「나」 = 주인공
export const userName = () => { try { const p = playOf(); if (p.mode === 'director' && p.hero) return p.hero; return ctx().name1 || 'User'; } catch { return 'User'; } };

// ───── 플레이 방식 ─────
// rp = 롤플 (유저가 주인공, 카드 = 캐릭터) · multi = 다인봇 (유저 1명 + 캐릭터 여럿) · director = 풀사칭 (유저는 지시만, 캐릭터들이 진행)
export const PLAY_MODES = {
    rp: { name: '롤플', icon: 'fa-user-group', desc: '내가 주인공, 카드는 캐릭터 한 명' },
    multi: { name: '다인봇', icon: 'fa-users', desc: '내가 주인공, 캐릭터가 여러 명' },
    director: { name: '풀사칭', icon: 'fa-clapperboard', desc: '나는 디렉터 — 지시만 하고 캐릭터들이 알아서 진행' },
};
export function normPlay(p) {
    p = p && typeof p === 'object' ? p : {};
    return { mode: PLAY_MODES[p.mode] ? p.mode : 'rp', hero: String(p.hero ?? '').trim().slice(0, 40), cardIsWorld: !!p.cardIsWorld, cast: Array.isArray(p.cast) ? p.cast.map(String).map(x => x.trim()).filter(Boolean).slice(0, 20) : [] };
}
export function playOf(meta) { try { return normPlay((meta ?? (app.playTemp ? { play: app.playTemp } : getMeta()))?.play); } catch { return normPlay(null); } }
// 풀사칭이면 우리 글 속 {{user}}를 주인공 이름으로 (주인공이 없으면 '주인공')
export function swapUser(text, meta) {
    const p = playOf(meta);
    if (p.mode !== 'director') return text;
    return String(text ?? '').replace(/\{\{user\}\}/gi, p.hero || 'the protagonist');
}

// ───── 설정 / 메타 ─────
export function settings() {
    const { extensionSettings } = ctx();
    if (!extensionSettings[MODULE]) extensionSettings[MODULE] = structuredClone(DEFAULTS);
    const s = extensionSettings[MODULE];
    if (s.uiMode && s.showHud === undefined) { // v1 → v2
        s.showFloat = s.uiMode !== 'side'; s.showSide = s.uiMode !== 'float'; delete s.uiMode;
    }
    if (s.theme && !['white', 'cream', 'ink', 'rose', 'mint', 'st', 'custom'].includes(s.theme)) s.theme = 'white';
    const fresh = !Object.hasOwn(s, 'contactReflect');
    for (const k of Object.keys(DEFAULTS)) if (!Object.hasOwn(s, k)) s[k] = clone(DEFAULTS[k]);
    if (fresh && s.contactInject === false) s.contactReflect = 'off'; // v2.2 이전 '연락 알려 주기' 끔 → 반영 끔
    return s;
}
export const saveSettings = () => ctx().saveSettingsDebounced();

export function getMeta(create = false) {
    const md = ctx().chatMetadata;
    if (!md) return null;
    if (!md[MODULE] && create) {
        const def = settings().defaultMods;
        md[MODULE] = { v: DATA_V, base: null, startAt: 0, startKey: null, adjust: [], mods: Object.fromEntries(MOD_IDS.map(id => [id, def ? def[id] !== false : true])), off: false, difficulty: settings().difficulty, paused: false, skipOnce: false };
    }
    const m = md[MODULE];
    if (m) {
        m.difficulty ??= 'normal'; m.mods ??= {};
        if (!Array.isArray(m.notes)) m.notes = []; if (!Array.isArray(m.album)) m.album = []; if (!Array.isArray(m.saves)) m.saves = [];
        if (!Array.isArray(m.adjust)) m.adjust = [];
        if ((m.v ?? 1) < DATA_V) migrate(m); // 옛 버전 채팅 데이터를 지금 모양으로 (새 칸·새 항목 채우기)
    }
    return m ?? null;
}
// v1 → v2: 칸 데이터를 새 모양으로 (메시지 id 등) 한 번만 다듬어 둔다
// 저장 데이터 모양 버전 — 칸에 새 항목이 생기면 올린다 (v3: 재산 물가·빚·정기·일거리, 연락 요약·반영, 운명)
export const DATA_V = 5; // v5: 관계 단계·질투·화면 밖 소식, 엔딩, SNS · 추천 음악 · 내 탭, 알림함 · 앨범 · 세이브
function migrate(m) {
    const from = m.v ?? 1;
    try {
        // v5: 새 기능은 옛 채팅에서 꺼진 채로 (토큰이 갑자기 늘지 않게) — 관리 탭에서 켤 수 있다
        if (from < 5) { m.mods ??= {}; for (const id of NEW_MODS_V5) if (m.mods[id] === undefined) m.mods[id] = false; m.newV5 = true; }
        m.notes = arr(m.notes); m.album = arr(m.album); m.saves = arr(m.saves);
        if (m.base?.data) for (const id of Object.keys(m.base.data)) if (m.base.data[id] && NORM[id]) m.base.data[id] = normalize(id, m.base.data[id]);
        if (m.base?.core) m.base.core = NORM.core(m.base.core);
        for (const a of m.adjust ?? []) if (a.set?.data && NORM[a.set.mod]) a.set.data = a.set.mod === 'core' ? NORM.core(a.set.data) : normalize(a.set.mod, a.set.data);
    } catch (e) { console.warn(LOG, 'migrate', e); }
    m.v = DATA_V;
}
export async function saveMeta(now = false) {
    const c = ctx();
    if (now || !c.saveMetadataDebounced) await c.saveMetadata();
    else c.saveMetadataDebounced();
}
export function modOn(id, meta = getMeta()) {
    if (!meta) return false;
    if (meta.mods?.[id] === false) return false;
    const need = MOD[id]?.needs;
    if (need && meta.mods?.[need] === false) return false;
    return true;
}
export function isActive() {
    if (!settings().enabled) return false;
    if (!ctx().getCurrentChatId?.()) return false;
    return !getMeta()?.off;
}
export const ready = () => !!getMeta()?.base;
export const diffOf = (meta = getMeta()) => DIFFS[meta?.difficulty] ? meta.difficulty : 'normal';

// ───── 데이터 모양 ─────
export const DEFAULT_MONTHS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31].map((d, i) => ({ name: `${i + 1}월`, days: d }));
export const DEFAULT_WEEK = ['월', '화', '수', '목', '금', '토', '일'];
export const DEFAULT_TIMES = ['새벽', '아침', '낮', '저녁', '밤', '심야'];

export const EMPTY = {
    core: () => ({ title: '', genre: '', summary: '', tone: '', userRole: '', rules: '', canon: '' }),
    profile: () => ({ mode: 'minimal', list: [] }),
    stats: () => ({ bars: [], attrs: [], conds: [] }),
    dice: () => ({ system: 'd20', rules: '', quick: [], log: [] }),
    wallet: () => ({ currency: '골드', cash: 0, items: [], prices: [], fx: { unit: '', rate: 0 }, loans: [], regular: [], jobs: [] }),
    shop: () => ({ shops: [] }),
    home: () => ({ name: '', desc: '', rooms: [], storage: [], trash: [] }),
    rel: () => ({ user: [], pairs: [], stages: clone(DEFAULT_STAGES), life: [] }),
    map: () => ({ name: '', here: '', places: [] }),
    calendar: () => ({ y: 1, m: 1, d: 1, time: '아침', era: '', months: clone(DEFAULT_MONTHS), week: [...DEFAULT_WEEK], times: [...DEFAULT_TIMES], events: [], weather: '', autoWeather: true }),
    contact: () => ({ mode: 'phone', app: '메신저', contacts: [], threads: {}, unread: {}, recent: [], couriers: clone(COURIER_PRESETS.slice(0, 1)), express: { name: '급행 (퀵)', fee: 100 } }),
    quest: () => ({ list: [] }),
    news: () => ({ name: '', items: [] }),
    gossip: () => ({ name: '', issues: [] }),
    board: () => ({ name: '', posts: [] }),
    ach: () => ({ list: [], endings: [] }),
    memo: () => ({ list: [] }),
    fate: () => ({ curses: [], deck: [], drawChance: 20, rules: [], log: [], today: null }),
    sns: () => ({ name: '', posts: [] }),
    music: () => ({ taste: '', now: null, log: [] }),
    custom: () => ({ tabs: [] }),
};

const msgN = (x) => ({
    id: str(x.id) || uid(), from: x.from === 'me' ? 'me' : 'them', text: str(x.text), date: str(x.date),
    at: Number.isFinite(Number(x.at)) ? Number(x.at) : null, arrive: Number.isFinite(Number(x.arrive)) ? Number(x.arrive) : null,
    courier: str(x.courier), express: !!x.express, rush: !!x.rush, pending: !!x.pending, fee: num(x.fee, 0), edited: !!x.edited, ping: !!x.ping,
    kind: MSG_KINDS.includes(x.kind) ? x.kind : 'text', pin: !!x.pin, read: !!x.read, react: str(x.react), orig: str(x.orig), amount: num(x.amount, 0),
});
// 연락 메시지 종류: 글 · 사진/음성/파일/위치 묘사 · 선물 · 송금 · 삭제됨
export const MSG_KINDS = ['text', 'photo', 'voice', 'file', 'place', 'gift', 'money', 'deleted'];
const KIND_TAG = { photo: '사진', voice: '음성 메시지', file: '파일', place: '위치', gift: '선물' };
// AI에게 보여 줄 메시지 한 줄 (첨부·반응·삭제 표시 포함)
export function msgText(m, max = 0) {
    const t = max ? short(m.text, max) : m.text;
    let out;
    if (m.kind === 'deleted') out = `[보냈다가 지운 메시지${m.read && m.orig ? ` — 이미 읽음: ${max ? short(m.orig, max) : m.orig}` : ''}]`;
    else if (m.kind === 'money') out = `[송금 ${fmtNum(m.amount)}]${t ? ` ${t}` : ''}`;
    else if (KIND_TAG[m.kind]) out = `[${KIND_TAG[m.kind]}: ${t}]`;
    else out = t;
    return m.react ? `${out} (반응 ${m.react})` : out;
}
const courierN = (c) => ({ name: str(c.name), icon: str(c.icon, '✉️') || '✉️', min: clamp(Math.round(num(c.min, 1)), 0, 60), max: clamp(Math.round(num(c.max, num(c.min, 1))), 0, 60), fee: Math.max(0, num(c.fee, 0)), note: str(c.note) });

export const NORM = {
    core: (d) => ({ title: str(d.title), genre: str(d.genre), summary: str(d.summary), tone: str(d.tone), userRole: str(d.userRole), rules: str(d.rules), canon: str(d.canon) }),
    profile: (d) => ({
        mode: d.mode === 'detailed' ? 'detailed' : 'minimal',
        list: arr(d.list).filter(p => p?.name).map(p => ({
            name: str(p.name), role: ['user', 'main', 'npc'].includes(p.role) ? p.role : 'npc', summary: str(p.summary),
            fields: arr(p.fields).filter(f => f && (f.k || f.v)).map(f => ({ k: str(f.k), v: str(f.v) })),
            home: str(p.home), sched: str(p.sched),
        })),
    }),
    stats: (d) => ({
        bars: arr(d.bars).filter(b => b?.name).map(b => { const max = Math.max(1, num(b.max, 100)); return { name: str(b.name), cur: clamp(num(b.cur, max), 0, max), max, color: str(b.color), desc: str(b.desc) }; }),
        attrs: arr(d.attrs).filter(a => a?.name).map(a => ({ name: str(a.name), val: Math.round(num(a.val, 0)), desc: str(a.desc) })),
        conds: arr(d.conds).filter(c => c?.name).map(c => ({ name: str(c.name), desc: str(c.desc) })),
    }),
    dice: (d) => ({
        system: ['d20', 'd100'].includes(d.system) ? d.system : 'd20', rules: str(d.rules),
        quick: arr(d.quick).filter(q => q?.name).map(q => ({ name: str(q.name), attr: str(q.attr), dc: num(q.dc, 0) })),
        log: arr(d.log).slice(-30),
    }),
    wallet: (d) => ({
        currency: str(d.currency, '골드') || '골드', cash: num(d.cash, 0),
        items: arr(d.items).filter(i => i?.name).map(i => ({ name: str(i.name), qty: Math.max(0, Math.round(num(i.qty, 1))), desc: str(i.desc), effect: str(i.effect) })),
        prices: arr(d.prices).filter(p => p?.name).map(p => ({ name: str(p.name), price: Math.max(0, num(p.price, 0)) })).slice(0, 40),
        fx: { unit: str(d.fx?.unit), rate: Math.max(0, num(d.fx?.rate, 0)) },
        loans: arr(d.loans).filter(l => l && num(l.owed, 0) > 0).map(l => ({
            id: str(l.id) || uid(), kind: ['bank', 'shark', 'pawn'].includes(l.kind) ? l.kind : 'bank', lender: str(l.lender),
            principal: Math.max(0, num(l.principal, 0)), owed: Math.max(0, num(l.owed, 0)), due: Number.isFinite(Number(l.due)) && l.due !== null && l.due !== '' ? Number(l.due) : null,
            item: str(l.item), status: ['open', 'paid', 'late', 'lost'].includes(l.status) ? l.status : 'open',
        })).slice(-30),
        regular: arr(d.regular).filter(r => r?.name).map(r => ({ name: str(r.name), amount: num(r.amount, 0), every: ['day', 'week', 'month'].includes(r.every) ? r.every : 'month', next: Number.isFinite(Number(r.next)) && r.next !== null && r.next !== '' ? Number(r.next) : null })),
        jobs: arr(d.jobs).filter(j => j?.name).map(j => ({ name: str(j.name), pay: Math.max(0, num(j.pay, 0)), effect: str(j.effect) })),
    }),
    shop: (d) => ({
        shops: arr(d.shops).filter(s => s?.name).map(s => ({
            name: str(s.name), desc: str(s.desc), place: str(s.place),
            items: arr(s.items).filter(i => i?.name).map(i => ({ name: str(i.name), price: Math.max(0, num(i.price, 0)), desc: str(i.desc), kind: i.kind === 'deco' ? 'deco' : 'item', stock: Math.round(num(i.stock, -1)) })),
        })),
    }),
    home: (d) => ({
        name: str(d.name), desc: str(d.desc),
        rooms: arr(d.rooms).filter(r => r?.name).map(r => ({ name: str(r.name), desc: str(r.desc), decor: arr(r.decor).map(String).filter(Boolean) })),
        storage: arr(d.storage).map(String).filter(Boolean),
        trash: arr(d.trash).filter(t => t?.name).map(t => ({ name: str(t.name), date: str(t.date) })).slice(-20),
    }),
    rel: (d) => {
        const stages = arr(d.stages).filter(x => x?.name).map(x => ({ name: str(x.name), at: clamp(Math.round(num(x.at, 0)), -100, 100), trust: clamp(Math.round(num(x.trust, -100)), -100, 100), unlock: str(x.unlock) })).sort((a, b) => a.at - b.at);
        return {
            user: arr(d.user).filter(r => r?.name).map(r => ({ name: str(r.name), label: str(r.label), aff: clamp(Math.round(num(r.aff, 0)), -100, 100), trust: clamp(Math.round(num(r.trust, 0)), -100, 100), memo: str(r.memo), stage: Number.isFinite(Number(r.stage)) && r.stage !== null && r.stage !== '' ? Math.round(Number(r.stage)) : -1, jealous: clamp(Math.round(num(r.jealous, 0)), 0, 100), met: str(r.met) })),
            pairs: arr(d.pairs).filter(p => p?.a && p?.b).map(p => ({ a: str(p.a), b: str(p.b), label: str(p.label), memo: str(p.memo) })),
            stages: stages.length ? stages : clone(DEFAULT_STAGES),
            life: arr(d.life).filter(x => x?.text).map(x => ({ who: str(x.who), text: str(x.text), date: str(x.date) })).slice(-20),
        };
    },
    map: (d) => ({
        name: str(d.name), here: str(d.here),
        places: arr(d.places).filter(p => p?.name).map(p => ({ name: str(p.name), desc: str(p.desc), kind: str(p.kind), x: clamp(num(p.x, NaN), 0, 100), y: clamp(num(p.y, NaN), 0, 100), links: arr(p.links).map(String).filter(Boolean), known: p.known !== false, area: str(p.area), fare: Math.max(0, num(p.fare, 0)) })),
    }),
    calendar: (d) => {
        const months = arr(d.months).filter(m => m?.name).map(m => ({ name: str(m.name), days: clamp(Math.round(num(m.days, 30)), 1, 99) }));
        const ms = months.length ? months : clone(DEFAULT_MONTHS);
        const m = clamp(Math.round(num(d.m, 1)), 1, ms.length);
        return {
            y: Math.round(num(d.y, 1)), m, d: clamp(Math.round(num(d.d, 1)), 1, ms[m - 1].days), time: str(d.time, '아침'), era: str(d.era),
            months: ms, week: arr(d.week).length ? arr(d.week).map(String) : [...DEFAULT_WEEK], times: arr(d.times).length ? arr(d.times).map(String) : [...DEFAULT_TIMES],
            events: arr(d.events).filter(e => e?.title).map(e => ({ y: e.y === undefined || e.y === null || e.y === '' ? null : Math.round(num(e.y, 0)), m: clamp(Math.round(num(e.m, 1)), 1, ms.length), d: clamp(Math.round(num(e.d, 1)), 1, 99), title: str(e.title), desc: str(e.desc), repeat: e.repeat === 'yearly' ? 'yearly' : 'once' })),
            weather: str(d.weather), autoWeather: d.autoWeather !== false,
        };
    },
    contact: (d) => {
        const threads = {};
        for (const [k, v] of Object.entries(d.threads && typeof d.threads === 'object' ? d.threads : {})) {
            threads[k] = arr(v).filter(x => x && (x.text || x.pending || (x.kind && x.kind !== 'text'))).map(msgN).slice(-80); // 송금·삭제됨은 글이 없어도 남긴다
        }
        const mode = ['phone', 'instant', 'letter'].includes(d.mode) ? d.mode : 'phone';
        const couriers = arr(d.couriers).filter(c => c?.name).map(courierN);
        return {
            mode, app: str(d.app, CONTACT_MODES[mode].app) || CONTACT_MODES[mode].app,
            contacts: arr(d.contacts).filter(c => c?.name).map(c => ({ name: str(c.name), handle: str(c.handle), status: str(c.status), courier: str(c.courier), reflect: ['always', 'pinned', 'never'].includes(c.reflect) ? c.reflect : '', blocked: !!c.blocked })),
            summaries: Object.fromEntries(Object.entries(d.summaries && typeof d.summaries === 'object' ? d.summaries : {}).filter(([, v]) => v?.text).map(([k, v]) => [k, { text: str(v.text), n: Math.max(0, Math.round(num(v.n, 0))) }])),
            threads, unread: d.unread && typeof d.unread === 'object' ? { ...d.unread } : {},
            recent: arr(d.recent).map(String).filter(Boolean).slice(0, 30),
            couriers: couriers.length ? couriers : clone(COURIER_PRESETS.slice(0, 1)),
            express: { name: str(d.express?.name, '급행 (퀵)') || '급행 (퀵)', fee: Math.max(0, num(d.express?.fee, 100)) },
        };
    },
    quest: (d) => ({
        list: arr(d.list).filter(q => q?.title).map(q => ({
            id: str(q.id) || uid(), title: str(q.title), giver: str(q.giver), desc: str(q.desc), place: str(q.place), deadline: str(q.deadline),
            reward: str(q.reward), cash: Math.max(0, num(q.cash, 0)), items: arr(q.items).map(String).filter(Boolean),
            status: ['open', 'active', 'done', 'failed'].includes(q.status) ? q.status : 'open',
            steps: arr(q.steps).map(s => (typeof s === 'string' ? { text: s, done: false } : { text: str(s?.text), done: !!s?.done })).filter(s => s.text),
            paid: !!q.paid,
        })),
        archive: arr(d.archive),
    }),
    news: (d) => ({ name: str(d.name), items: arr(d.items).filter(x => x?.title).map(x => ({ id: str(x.id) || uid(), title: str(x.title), body: str(x.body), tag: str(x.tag), date: str(x.date), read: !!x.read })), archive: arr(d.archive) }),
    gossip: (d) => ({ name: str(d.name), issues: arr(d.issues).filter(x => x?.title).map(x => ({ id: str(x.id) || uid(), title: str(x.title), body: str(x.body), about: arr(x.about).map(String).filter(Boolean), heat: clamp(Math.round(num(x.heat, 2)), 1, 3), date: str(x.date), read: !!x.read })), archive: arr(d.archive) }),
    board: (d) => ({
        name: str(d.name),
        posts: arr(d.posts).filter(p => p?.title).map(p => ({
            id: str(p.id) || uid(), author: str(p.author, '익명') || '익명', title: str(p.title), body: str(p.body), date: str(p.date), mine: !!p.mine, tag: str(p.tag),
            replies: arr(p.replies).filter(r => r?.text).map(r => ({ id: str(r.id) || uid(), author: str(r.author, '익명') || '익명', text: str(r.text), mine: !!r.mine })),
        })),
        archive: arr(d.archive),
    }),
    ach: (d) => ({
        list: arr(d.list).filter(a => a?.name).map(a => ({ name: str(a.name), desc: str(a.desc), done: !!a.done, hidden: !!a.hidden, at: str(a.at) })),
        endings: arr(d.endings).filter(e => e?.name).map(e => ({ name: str(e.name), when: str(e.when), desc: str(e.desc), done: !!e.done, at: str(e.at), on: !!e.on })),
    }),
    memo: (d) => ({ list: arr(d.list).filter(m => m?.text).map(m => ({ id: str(m.id) || uid(), text: str(m.text), by: m.by === 'ai' ? 'ai' : 'user', inject: m.inject !== false, pin: !!m.pin })) }),
    fate: (d) => ({
        curses: arr(d.curses).filter(c => c?.name).map(c => ({
            name: str(c.name), desc: str(c.desc), effects: (Array.isArray(c.effects) ? c.effects : String(c.effects ?? '').split(/\s*[,;\n]\s*/)).map(String).map(x => x.trim()).filter(Boolean),
            days: Number.isFinite(Number(c.days)) && Number(c.days) > 0 ? Math.round(Number(c.days)) : null, since: Number.isFinite(Number(c.since)) && c.since !== null && c.since !== '' ? Number(c.since) : null,
            cure: str(c.cure), kind: c.kind === 'bless' ? 'bless' : 'curse', auto: str(c.auto),
        })),
        deck: arr(d.deck).filter(x => x?.title).map(x => ({ title: str(x.title), desc: str(x.desc), kind: ['luck', 'bad', 'event'].includes(x.kind) ? x.kind : 'event', effect: str(x.effect) })).slice(0, 60),
        drawChance: clamp(Math.round(num(d.drawChance, 20)), 0, 100),
        rules: arr(d.rules).filter(r => r?.when && r?.then).map(r => ({ name: str(r.name) || str(r.when), when: str(r.when), then: str(r.then), on: !!r.on })),
        log: arr(d.log).filter(x => x?.title).map(x => ({ title: str(x.title), kind: str(x.kind), date: str(x.date) })).slice(-30),
        today: d.today?.title ? { title: str(d.today.title), desc: str(d.today.desc), day: num(d.today.day, 0) } : null,
    }),
    sns: (d) => ({
        name: str(d.name),
        posts: arr(d.posts).filter(p => p?.text || p?.pic).map(p => ({
            id: str(p.id) || uid(), author: str(p.author, '익명') || '익명', text: str(p.text), pic: str(p.pic), tags: str(p.tags), likes: Math.max(0, Math.round(num(p.likes, 0))), date: str(p.date), mine: !!p.mine, liked: !!p.liked,
            replies: arr(p.replies).filter(r => r?.text).map(r => ({ id: str(r.id) || uid(), author: str(r.author, '익명') || '익명', text: str(r.text), mine: !!r.mine })).slice(-30),
        })),
        archive: arr(d.archive),
    }),
    music: (d) => {
        const song = (x) => (x?.title ? { title: str(x.title), artist: str(x.artist), mood: str(x.mood), why: str(x.why), date: str(x.date) } : null);
        return { taste: str(d.taste), now: song(d.now), log: arr(d.log).map(song).filter(Boolean).slice(-30) };
    },
    custom: (d) => ({
        tabs: arr(d.tabs).filter(t => t?.name).map(t => ({
            name: str(t.name), icon: str(t.icon, '📌') || '📌', note: str(t.note), inject: t.inject !== false,
            fields: arr(t.fields).filter(f => f?.k).map(f => {
                const type = ['num', 'bar', 'text'].includes(f.type) ? f.type : (Number.isFinite(Number(f.v)) && f.v !== '' && f.v !== null ? 'num' : 'text');
                const max = Math.max(1, num(f.max, 100));
                return { k: str(f.k), type, v: type === 'text' ? str(f.v) : type === 'bar' ? clamp(num(f.v, 0), 0, max) : num(f.v, 0), max, desc: str(f.desc) };
            }),
        })),
    }),
};
export function normalize(mod, d) {
    try { return tidy(mod, NORM[mod](d && typeof d === 'object' ? d : {})); } catch (e) { console.warn(LOG, 'normalize', mod, e); return EMPTY[mod](); }
}
// ───── 자동 정리: 오래된 소식·끝난 퀘스트는 보관함(제목만)으로 ─────
export const ARC_KEEP = { news: 40, gossip: 30, board: 40, quest: 15, sns: 40 };
const arcItem = (x) => ({ title: str(x?.title ?? (x?.text ? `${x.author ?? ''}: ${short(x.text, 40)}` : '')), date: str(x?.date), status: str(x?.status) });
export function tidy(mod, d) {
    if (!d || typeof d !== 'object') return d;
    const keep = ARC_KEEP[mod];
    if (!keep) return d;
    const key = { news: 'items', gossip: 'issues', board: 'posts', quest: 'list', sns: 'posts' }[mod];
    const list = arr(d[key]);
    let moved = [];
    if (mod === 'quest') {
        const ends = list.filter(q => q.status === 'done' || q.status === 'failed');
        if (ends.length > keep) {
            const drop = new Set(ends.slice(0, ends.length - keep));
            moved = [...drop];
            d[key] = list.filter(q => !drop.has(q));
        }
    } else if (list.length > keep) {
        moved = list.slice(0, list.length - keep);
        d[key] = list.slice(-keep);
    }
    d.archive = [...arr(d.archive).map(arcItem), ...moved.map(arcItem)].filter(x => x.title).slice(-200);
    return d;
}

// AI에게 알려 주는 각 칸의 JSON 모양
export const SCHEMA = {
    core: `{"title":"세계관/이야기 이름","genre":"장르","summary":"세계관 요약 3~6문장 (배경·시대·분위기·핵심 갈등)","tone":"서술 톤","userRole":"{{user}}의 위치·역할 한 줄","rules":"이 세계의 중요한 규칙·상식 몇 줄","canon":"원작 이름 (2차 창작일 때만)"}`,
    profile: `{"mode":"minimal|detailed","list":[{"name":"이름","role":"user|main|npc","summary":"한두 줄 소개","fields":[{"k":"항목(나이/외모/성격/말투/능력/좋아하는 것/비밀 등)","v":"내용"}],"home":"사는 곳 (지도 장소 이름)","sched":"일과 — 시간대:장소, 쉼표로 (예: 아침:시장, 낮:항구, 밤:집)"}]}`,
    stats: `{"bars":[{"name":"체력","cur":100,"max":100,"color":"#e2524a","desc":"0이 되면…"}],"attrs":[{"name":"힘","val":2,"desc":"판정 보정치, 보통 -2~+5"}],"conds":[{"name":"상태 이상/버프 이름","desc":"효과"}]}`,
    dice: `{"system":"d20|d100","rules":"이 세계의 판정 규칙 몇 줄 (대성공/대실패의 의미 등)","quick":[{"name":"자주 쓰는 판정 이름(예: 은신)","attr":"보정에 쓸 능력치 이름","dc":12}]}`,
    wallet: `{"currency":"화폐 단위","cash":1000,"items":[{"name":"소지품","qty":1,"desc":"설명","effect":"(쓰면 바뀌는 것, 예: 체력 +20 / 없으면 빈칸)"}],"prices":[{"name":"흔한 물건·서비스 (빵 한 개, 한 끼 식사, 여관 1박, 말 한 필, 한 달 월세 등)","price":10}],"jobs":[{"name":"{{user}}가 할 수 있는 일거리","pay":50,"effect":"일하면 바뀌는 것 (예: 기력 -20)"}],"regular":[{"name":"정기 수입·지출 (월급, 월세 등)","amount":-300,"every":"day|week|month"}],"fx":{"unit":"현실 화폐 (예: 원)","rate":0}}  (fx.rate = 이 화폐 1의 현실 가치, 모르면 0)`,
    shop: `{"shops":[{"name":"상점 이름","desc":"설명","place":"있는 장소","items":[{"name":"상품","price":100,"desc":"설명","kind":"item|deco (deco = 본거지에 놓는 가구·장식)","stock":-1}]}]}`,
    home: `{"name":"본거지 이름","desc":"설명","rooms":[{"name":"방/구역","desc":"지금 모습","decor":["놓여 있는 가구·장식 이름"]}],"storage":["창고에 있는 미배치 가구"]}`,
    rel: `{"user":[{"name":"캐릭터","label":"{{user}}와의 관계 이름","aff":0,"trust":0,"memo":"관계 메모","met":"처음 만난 날 (예: 3월 2일 · 모르면 빈칸)"}],"pairs":[{"a":"캐릭터A","b":"캐릭터B","label":"관계","memo":"메모"}],"stages":[{"name":"관계 단계 이름","at":0,"trust":-100,"unlock":"이 단계에서 새로 생기는 것 (호칭·말투·행동)"}]}  (aff 호감, trust 신뢰: -100~100 · stages: 낮은 단계부터 4~7개, at = 필요한 호감, trust = 필요한 신뢰)`,
    map: `{"name":"지도 이름","here":"현재 위치(장소 이름)","places":[{"name":"장소","desc":"설명","kind":"마을/건물/던전/자연 등","x":50,"y":50,"links":["이어진 장소 이름"],"known":true,"area":"속한 구역 (선택)","fare":0}]}  (x,y는 0~100 좌표, 겹치지 않게 퍼뜨림 · fare = 그곳까지 가는 요금, 보통 0)`,
    calendar: `{"era":"연호/기원(선택)","y":1,"m":1,"d":1,"time":"아침","months":[{"name":"1월","days":31}],"week":["월","화","수","목","금","토","일"],"times":["새벽","아침","낮","저녁","밤","심야"],"weather":"오늘 날씨 (맑음/비/눈 등)","events":[{"y":null,"m":3,"d":14,"title":"일정/기념일/축제","desc":"설명","repeat":"yearly|once"}]}`,
    contact: `{"mode":"phone|instant|letter","app":"연락 수단 이름(스마트폰 메신저 / 마법 통신구 / 편지 등)","contacts":[{"name":"연락 가능한 인물","handle":"아이디/주소(선택)","status":"상태 메시지 또는 사는 곳","courier":"(letter일 때) 이 인물이 주로 쓰는 배달 수단 이름"}],"couriers":[{"name":"배달 수단(배달부/갈매기/올빼미/강아지/전서구/마법 등 세계관에 맞게)","icon":"이모지 1개","min":1,"max":3,"fee":0,"note":"설명"}],"express":{"name":"급행 수단 이름(퀵·특급 파발 등)","fee":100}}  (min/max = 도착까지 걸리는 날 수, fee = 화폐 단위 요금)`,
    quest: `{"list":[{"title":"의뢰/목표 이름","giver":"의뢰인","desc":"내용","place":"장소","deadline":"기한(선택)","reward":"보상 설명","cash":0,"items":["보상 아이템"],"status":"open|active","steps":[{"text":"단계","done":false}]}]}`,
    news: `{"name":"매체 이름(신문·방송·관보·포털 등 세계관에 맞게)","items":[{"title":"헤드라인","body":"기사 2~4문장","tag":"정치/사회/사건/경제/문화/연예 등"}]}`,
    gossip: `{"name":"가십지 이름","issues":[{"title":"자극적인 제목","body":"소문 내용 2~4문장 (가십지 말투)","about":["관련 인물"],"heat":1}]}  (heat 1~3 = 화제성)`,
    board: `{"name":"게시판 이름(길드 게시판·익명 커뮤니티·학교 게시판 등)","posts":[{"author":"닉네임","title":"글 제목","body":"본문","tag":"말머리","replies":[{"author":"닉네임","text":"댓글"}]}]}`,
    ach: `{"list":[{"name":"업적 이름","desc":"달성 조건","done":false,"hidden":false}],"endings":[{"name":"엔딩 이름","when":"조건 (예: 호감:레온 >= 90 · 돈 >= 100000 · 형식: 돈|게이지이름|호감:이름|신뢰:이름|날짜수 + 비교 + 숫자)","desc":"어떤 엔딩인지 한 줄"}]}`,
    memo: `{"list":[{"text":"메모 내용","by":"user|ai","inject":true,"pin":false}]}`,
    sns: `{"name":"SNS 이름 (인스타·트위터 같은 것 · 세계관에 맞게: 마법 거울 피드, 길드 소식판 등)","posts":[{"author":"작성자 (캐릭터·NPC·지역 주민)","text":"글 (짧게, 그 인물 말투로)","pic":"사진 묘사 (없으면 빈칸)","tags":"#해시태그","likes":12,"replies":[{"author":"닉네임","text":"댓글"}]}]}`,
    music: `{"taste":"","now":{"title":"실제로 있는 곡 제목","artist":"가수","mood":"분위기 한 단어","why":"왜 어울리는지 한 줄"}}`,
    custom: `{"tabs":[{"name":"탭 이름","icon":"이모지 1개","note":"이 탭이 뭔지 한 줄 (AI에게도 전달)","inject":true,"fields":[{"k":"항목 이름","type":"num|bar|text","v":0,"max":100,"desc":"설명"}]}]}  (num = 숫자, bar = 0~max 게이지, text = 글)`,
    fate: `{"curses":[{"name":"저주·축복 이름","kind":"curse|bless","desc":"설명","effects":["가격 +30%","호감 -50%","매일 체력 -5","대출 불가","(그 밖의 효과는 글로)"],"days":7,"cure":"해제 조건"}],"deck":[{"title":"이벤트 카드 이름","kind":"luck|bad|event","desc":"무슨 일이 일어나는지 1~2문장","effect":"바뀌는 상태 (예: cash: +200 / stat: 체력 -10 / item: +행운의 부적 — 여러 개면 ; 로)"}],"drawChance":20,"rules":[{"name":"규칙 이름","when":"돈 <= 0 (형식: 돈|게이지이름|호감:이름|신뢰:이름 + < <= > >= = + 숫자)","then":"그때 일어나는 상태 변화 (예: curse: 빈털터리 | 가격 +10% | 3일 | 돈을 모으면 풀림)"}]}  (drawChance = 하루가 지날 때 카드가 나올 확률 %)`,
};

// 직접 편집 화면 정의 — type: text | area | num | bool | select | tags | list | color
export const EDIT = {
    core: [
        { k: 'title', label: '이름', type: 'text' }, { k: 'genre', label: '장르', type: 'text' }, { k: 'tone', label: '톤', type: 'text' }, { k: 'canon', label: '원작 (2차 창작)', type: 'text' },
        { k: 'userRole', label: '{{user}}의 위치', type: 'text' }, { k: 'summary', label: '세계관 요약', type: 'area' }, { k: 'rules', label: '규칙·상식', type: 'area' },
    ],
    profile: [
        { k: 'mode', label: '프로필 모드', type: 'select', options: [['minimal', '최소 (기존 카드·로어북 참조)'], ['detailed', '상세 (이 시트로만)']] },
        { k: 'list', label: '인물', type: 'list', title: 'name', fields: [
            { k: 'name', label: '이름', type: 'text' }, { k: 'role', label: '구분', type: 'select', options: [['user', '유저'], ['main', '주요'], ['npc', 'NPC']] },
            { k: 'summary', label: '소개', type: 'area' },
            { k: 'home', label: '사는 곳 (지도 장소)', type: 'text' }, { k: 'sched', label: '일과 (예: 아침:시장, 낮:항구, 밤:집)', type: 'text' },
            { k: 'fields', label: '항목', type: 'list', title: 'k', fields: [{ k: 'k', label: '항목', type: 'text' }, { k: 'v', label: '내용', type: 'area' }] },
        ] },
    ],
    stats: [
        { k: 'bars', label: '게이지', type: 'list', title: 'name', fields: [{ k: 'name', label: '이름', type: 'text' }, { k: 'cur', label: '현재', type: 'num' }, { k: 'max', label: '최대', type: 'num' }, { k: 'color', label: '색', type: 'color' }, { k: 'desc', label: '설명', type: 'text' }] },
        { k: 'attrs', label: '능력치 (판정 보정)', type: 'list', title: 'name', fields: [{ k: 'name', label: '이름', type: 'text' }, { k: 'val', label: '보정', type: 'num' }, { k: 'desc', label: '설명', type: 'text' }] },
        { k: 'conds', label: '상태 이상 · 버프', type: 'list', title: 'name', fields: [{ k: 'name', label: '이름', type: 'text' }, { k: 'desc', label: '효과', type: 'text' }] },
    ],
    dice: [
        { k: 'system', label: '방식', type: 'select', options: [['d20', 'd20 + 보정 vs 난이도(DC)'], ['d100', 'd100 이하 성공 (보정 ×5)']] },
        { k: 'rules', label: '판정 규칙 (AI에게 전달)', type: 'area' },
        { k: 'quick', label: '빠른 판정', type: 'list', title: 'name', fields: [{ k: 'name', label: '이름', type: 'text' }, { k: 'attr', label: '능력치', type: 'text' }, { k: 'dc', label: '난이도', type: 'num' }] },
    ],
    wallet: [
        { k: 'currency', label: '화폐 단위', type: 'text' }, { k: 'cash', label: '소지금', type: 'num' },
        { k: 'items', label: '소지품', type: 'list', title: 'name', fields: [{ k: 'name', label: '이름', type: 'text' }, { k: 'qty', label: '수량', type: 'num' }, { k: 'desc', label: '설명', type: 'text' }, { k: 'effect', label: '사용 효과 (예: 체력 +20)', type: 'text' }] },
        { k: 'prices', label: '물가표', type: 'list', title: 'name', fields: [{ k: 'name', label: '물건 · 서비스', type: 'text' }, { k: 'price', label: '가격', type: 'num' }] },
        { k: 'jobs', label: '일거리', type: 'list', title: 'name', fields: [{ k: 'name', label: '이름', type: 'text' }, { k: 'pay', label: '일당', type: 'num' }, { k: 'effect', label: '일하면 (예: 기력 -20)', type: 'text' }] },
        { k: 'regular', label: '정기 수입 · 지출', type: 'list', title: 'name', fields: [{ k: 'name', label: '이름', type: 'text' }, { k: 'amount', label: '금액 (지출은 -)', type: 'num' }, { k: 'every', label: '주기', type: 'select', options: [['day', '매일'], ['week', '매주'], ['month', '매달']] }] },
    ],
    shop: [
        { k: 'shops', label: '상점', type: 'list', title: 'name', fields: [
            { k: 'name', label: '이름', type: 'text' }, { k: 'place', label: '장소', type: 'text' }, { k: 'desc', label: '설명', type: 'text' },
            { k: 'items', label: '상품', type: 'list', title: 'name', fields: [
                { k: 'name', label: '이름', type: 'text' }, { k: 'price', label: '가격', type: 'num' },
                { k: 'kind', label: '종류', type: 'select', options: [['item', '아이템'], ['deco', '가구·장식']] },
                { k: 'stock', label: '재고 (-1 무한)', type: 'num' }, { k: 'desc', label: '설명', type: 'text' },
            ] },
        ] },
    ],
    home: [
        { k: 'name', label: '이름', type: 'text' }, { k: 'desc', label: '설명', type: 'area' },
        { k: 'rooms', label: '방 · 구역', type: 'list', title: 'name', fields: [{ k: 'name', label: '이름', type: 'text' }, { k: 'desc', label: '모습', type: 'area' }, { k: 'decor', label: '배치된 가구 (쉼표)', type: 'tags' }] },
        { k: 'storage', label: '창고 (미배치, 쉼표)', type: 'tags' },
        { k: 'trash', label: '쓰레기통', type: 'list', title: 'name', fields: [{ k: 'name', label: '이름', type: 'text' }, { k: 'date', label: '버린 날', type: 'text' }] },
    ],
    rel: [
        { k: 'user', label: '{{user}}와의 관계', type: 'list', title: 'name', fields: [{ k: 'name', label: '이름', type: 'text' }, { k: 'label', label: '관계', type: 'text' }, { k: 'aff', label: '호감', type: 'num' }, { k: 'trust', label: '신뢰', type: 'num' }, { k: 'jealous', label: '질투 (0~100)', type: 'num' }, { k: 'met', label: '처음 만난 날', type: 'text' }, { k: 'memo', label: '메모', type: 'area' }] },
        { k: 'pairs', label: '인물끼리의 관계', type: 'list', title: 'a', fields: [{ k: 'a', label: 'A', type: 'text' }, { k: 'b', label: 'B', type: 'text' }, { k: 'label', label: '관계', type: 'text' }, { k: 'memo', label: '메모', type: 'text' }] },
        { k: 'stages', label: '관계 단계 (호감·신뢰가 넘으면 해금)', type: 'list', title: 'name', fields: [{ k: 'name', label: '단계 이름', type: 'text' }, { k: 'at', label: '필요한 호감', type: 'num' }, { k: 'trust', label: '필요한 신뢰', type: 'num' }, { k: 'unlock', label: '해금되는 것 (호칭·말투·행동)', type: 'text' }] },
        { k: 'life', label: '화면 밖 소식', type: 'list', title: 'who', fields: [{ k: 'who', label: '누가', type: 'text' }, { k: 'text', label: '한 일', type: 'text' }, { k: 'date', label: '날짜', type: 'text' }] },
    ],
    map: [
        { k: 'name', label: '지도 이름', type: 'text' }, { k: 'here', label: '현재 위치', type: 'text' },
        { k: 'places', label: '장소', type: 'list', title: 'name', fields: [{ k: 'name', label: '이름', type: 'text' }, { k: 'kind', label: '종류', type: 'text' }, { k: 'x', label: 'x (0~100)', type: 'num' }, { k: 'y', label: 'y (0~100)', type: 'num' }, { k: 'links', label: '이어진 곳 (쉼표)', type: 'tags' }, { k: 'area', label: '구역', type: 'text' }, { k: 'fare', label: '가는 요금', type: 'num' }, { k: 'known', label: '알려짐', type: 'bool' }, { k: 'desc', label: '설명', type: 'area' }] },
    ],
    calendar: [
        { k: 'weather', label: '오늘 날씨', type: 'text' }, { k: 'autoWeather', label: '날씨 자동으로 바뀜 (계절따라)', type: 'bool' },
        { k: 'era', label: '연호', type: 'text' }, { k: 'y', label: '년', type: 'num' }, { k: 'm', label: '월', type: 'num' }, { k: 'd', label: '일', type: 'num' }, { k: 'time', label: '시간대', type: 'text' },
        { k: 'times', label: '시간대 목록 (쉼표)', type: 'tags' }, { k: 'week', label: '요일 (쉼표)', type: 'tags' },
        { k: 'months', label: '달', type: 'list', title: 'name', fields: [{ k: 'name', label: '이름', type: 'text' }, { k: 'days', label: '일수', type: 'num' }] },
        { k: 'events', label: '일정', type: 'list', title: 'title', fields: [{ k: 'title', label: '제목', type: 'text' }, { k: 'y', label: '년 (비우면 매년)', type: 'num' }, { k: 'm', label: '월', type: 'num' }, { k: 'd', label: '일', type: 'num' }, { k: 'repeat', label: '반복', type: 'select', options: [['once', '한 번'], ['yearly', '매년']] }, { k: 'desc', label: '설명', type: 'text' }] },
    ],
    contact: [
        { k: 'mode', label: '연락 방식', type: 'select', options: [['phone', '휴대폰 메신저 (즉시)'], ['instant', '즉시 통신 (마법·무전 등)'], ['letter', '편지 (시간이 걸림)']] },
        { k: 'app', label: '연락 수단 이름', type: 'text' },
        { k: 'contacts', label: '연락처', type: 'list', title: 'name', fields: [{ k: 'name', label: '이름', type: 'text' }, { k: 'handle', label: '아이디 · 주소', type: 'text' }, { k: 'status', label: '상태 메시지', type: 'text' }, { k: 'reflect', label: '본편 반영', type: 'select', options: [['', '기본 설정 따름'], ['always', '항상 반영'], ['pinned', '📌 고른 것만'], ['never', '반영 안 함 (비밀)']] }, { k: 'blocked', label: '차단', type: 'bool' }, { k: 'courier', label: '이 사람이 쓰는 배달 수단 (편지)', type: 'text' }] },
        { k: 'couriers', label: '배달 수단 (편지)', type: 'list', title: 'name', fields: [{ k: 'name', label: '이름', type: 'text' }, { k: 'icon', label: '이모지', type: 'text' }, { k: 'min', label: '최소 일수', type: 'num' }, { k: 'max', label: '최대 일수', type: 'num' }, { k: 'fee', label: '요금', type: 'num' }, { k: 'note', label: '설명', type: 'text' }] },
    ],
    quest: [
        { k: 'list', label: '퀘스트', type: 'list', title: 'title', fields: [
            { k: 'title', label: '이름', type: 'text' }, { k: 'giver', label: '의뢰인', type: 'text' }, { k: 'place', label: '장소', type: 'text' }, { k: 'deadline', label: '기한', type: 'text' },
            { k: 'status', label: '상태', type: 'select', options: [['open', '받을 수 있음'], ['active', '진행 중'], ['done', '완료'], ['failed', '실패']] },
            { k: 'desc', label: '내용', type: 'area' }, { k: 'reward', label: '보상 설명', type: 'text' }, { k: 'cash', label: '보상금', type: 'num' }, { k: 'items', label: '보상 아이템 (쉼표)', type: 'tags' },
            { k: 'steps', label: '단계', type: 'list', title: 'text', fields: [{ k: 'text', label: '내용', type: 'text' }, { k: 'done', label: '완료', type: 'bool' }] },
        ] },
    ],
    news: [
        { k: 'name', label: '매체 이름', type: 'text' },
        { k: 'items', label: '기사', type: 'list', title: 'title', fields: [{ k: 'title', label: '제목', type: 'text' }, { k: 'tag', label: '분류', type: 'text' }, { k: 'date', label: '날짜', type: 'text' }, { k: 'body', label: '본문', type: 'area' }] },
    ],
    gossip: [
        { k: 'name', label: '가십지 이름', type: 'text' },
        { k: 'issues', label: '기사', type: 'list', title: 'title', fields: [{ k: 'title', label: '제목', type: 'text' }, { k: 'about', label: '관련 인물 (쉼표)', type: 'tags' }, { k: 'heat', label: '화제성 1~3', type: 'num' }, { k: 'date', label: '날짜', type: 'text' }, { k: 'body', label: '내용', type: 'area' }] },
    ],
    board: [
        { k: 'name', label: '게시판 이름', type: 'text' },
        { k: 'posts', label: '글', type: 'list', title: 'title', fields: [
            { k: 'title', label: '제목', type: 'text' }, { k: 'author', label: '작성자', type: 'text' }, { k: 'tag', label: '말머리', type: 'text' }, { k: 'mine', label: '내 글', type: 'bool' }, { k: 'body', label: '본문', type: 'area' },
            { k: 'replies', label: '댓글', type: 'list', title: 'author', fields: [{ k: 'author', label: '작성자', type: 'text' }, { k: 'text', label: '내용', type: 'area' }, { k: 'mine', label: '내 댓글', type: 'bool' }] },
        ] },
    ],
    ach: [
        { k: 'list', label: '업적', type: 'list', title: 'name', fields: [{ k: 'name', label: '이름', type: 'text' }, { k: 'desc', label: '조건', type: 'text' }, { k: 'done', label: '달성', type: 'bool' }, { k: 'hidden', label: '숨김', type: 'bool' }, { k: 'at', label: '달성 시점', type: 'text' }] },
        { k: 'endings', label: '엔딩', type: 'list', title: 'name', fields: [{ k: 'name', label: '엔딩 이름', type: 'text' }, { k: 'when', label: '조건 (예: 호감:레온 >= 90)', type: 'text' }, { k: 'desc', label: '설명', type: 'text' }, { k: 'done', label: '봤음', type: 'bool' }] },
    ],
    memo: [
        { k: 'list', label: '메모', type: 'list', title: 'text', fields: [{ k: 'text', label: '내용', type: 'area' }, { k: 'by', label: '작성', type: 'select', options: [['user', '나'], ['ai', 'AI']] }, { k: 'inject', label: 'AI 반영', type: 'bool' }, { k: 'pin', label: '고정', type: 'bool' }] },
    ],
    sns: [
        { k: 'name', label: 'SNS 이름', type: 'text' },
        { k: 'posts', label: '게시물', type: 'list', title: 'author', fields: [
            { k: 'author', label: '작성자', type: 'text' }, { k: 'text', label: '글', type: 'area' }, { k: 'pic', label: '사진 묘사', type: 'text' }, { k: 'tags', label: '해시태그', type: 'text' }, { k: 'likes', label: '좋아요', type: 'num' }, { k: 'mine', label: '내 글', type: 'bool' },
            { k: 'replies', label: '댓글', type: 'list', title: 'author', fields: [{ k: 'author', label: '작성자', type: 'text' }, { k: 'text', label: '내용', type: 'area' }, { k: 'mine', label: '내 댓글', type: 'bool' }] },
        ] },
    ],
    music: [
        { k: 'taste', label: '이 채팅에서 좋아하는 음악 (비우면 확장 설정 따름)', type: 'text' },
    ],
    custom: [
        { k: 'tabs', label: '탭', type: 'list', title: 'name', fields: [
            { k: 'name', label: '탭 이름', type: 'text' }, { k: 'icon', label: '이모지', type: 'text' }, { k: 'note', label: '설명 (AI에게도 전달)', type: 'text' }, { k: 'inject', label: 'AI에게 보내기', type: 'bool' },
            { k: 'fields', label: '항목', type: 'list', title: 'k', fields: [{ k: 'k', label: '항목 이름', type: 'text' }, { k: 'type', label: '종류', type: 'select', options: [['num', '숫자'], ['bar', '게이지 (0~최대)'], ['text', '글']] }, { k: 'v', label: '값', type: 'text' }, { k: 'max', label: '최대 (게이지)', type: 'num' }, { k: 'desc', label: '설명', type: 'text' }] },
        ] },
    ],
    fate: [
        { k: 'curses', label: '저주 · 축복', type: 'list', title: 'name', fields: [
            { k: 'name', label: '이름', type: 'text' }, { k: 'kind', label: '종류', type: 'select', options: [['curse', '저주'], ['bless', '축복']] }, { k: 'desc', label: '설명', type: 'text' },
            { k: 'effects', label: '효과 (쉼표 · 예: 가격 +30%, 호감 -50%, 매일 체력 -5, 대출 불가)', type: 'tags' }, { k: 'days', label: '남은 기간 (일, 비우면 계속)', type: 'num' }, { k: 'cure', label: '해제 조건', type: 'text' },
        ] },
        { k: 'drawChance', label: '하루가 지날 때 카드가 나올 확률 %', type: 'num' },
        { k: 'deck', label: '이벤트 카드', type: 'list', title: 'title', fields: [
            { k: 'title', label: '이름', type: 'text' }, { k: 'kind', label: '종류', type: 'select', options: [['luck', '행운'], ['bad', '불운'], ['event', '사건']] },
            { k: 'desc', label: '내용', type: 'area' }, { k: 'effect', label: '바뀌는 상태 (예: cash: +200 ; stat: 체력 -10)', type: 'text' },
        ] },
        { k: 'rules', label: '자동 규칙', type: 'list', title: 'name', fields: [
            { k: 'name', label: '이름', type: 'text' }, { k: 'when', label: '조건 (예: 돈 <= 0 / 체력 < 20 / 호감:레온 >= 80)', type: 'text' }, { k: 'then', label: '그러면 (상태 줄 · 여러 개면 ;)', type: 'area' },
        ] },
    ],
};

// ───── 달력 계산 ─────
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
    const isNumMonth = /^\d+월$/.test(mn);
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
    const dn = t.match(/(\d+)\s*일/);
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

// ───── 시간 (편지 배달용) ─────
// 달력이 켜져 있으면 "일", 아니면 AI 응답 수("턴")로 잰다
export function useDays(s, meta = getMeta()) { return !!(s?.data?.calendar && modOn('calendar', meta)); }
export function nowTick(s, meta = getMeta()) { return useDays(s, meta) ? dayIndex(s.data.calendar) : (s?.turn ?? 0); }
export function tickUnit(s, meta = getMeta()) { return useDays(s, meta) ? '일' : '턴'; }
export function stamp(s) { return s?.data?.calendar ? dateStr(s.data.calendar) : ''; }
