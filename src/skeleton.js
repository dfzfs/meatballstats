// 미트볼 상태창 — 기본 틀 (v2.7)
// AI 없이 바로 만드는 범용 상태창 뼈대. 장르마다 화폐·게이지·장소 이름만 살짝 다르고, 나머지는 어떤 세계관에도 맞는 공통 틀이다.
//   tpl    = 전부 기본 틀 (AI 0회 · 토큰 0) → 나중에 칸마다 「AI로 채우기」로 살을 붙인다
//   hybrid = 게임 규칙 칸(수치·주사위·달력·업적·운명·메모·내 탭)은 기본 틀, 세계관 칸(인물·지도·상점·소식…)만 AI
import { ctx, short, clone, DEFAULT_STAGES, DEFAULT_MONTHS, DEFAULT_WEEK, DEFAULT_TIMES, COURIER_PRESETS, CONTACT_MODES, GENRES, dayIndex } from './core.js';

export const GEN_MODES = {
    ai: { name: '전부 AI', icon: 'fa-wand-magic-sparkles', desc: '세계관에 꼭 맞게 · 모든 칸을 AI가 새로' },
    hybrid: { name: '기본 틀 + AI (추천)', icon: 'fa-puzzle-piece', desc: '규칙 칸은 검증된 기본 틀 · 세계관 칸만 AI → 호출이 줄고 모양이 흔들리지 않아요' },
    tpl: { name: '기본 틀만', icon: 'fa-bolt', desc: 'AI 0회 · 토큰 0 · 바로 만들어져요. 나중에 칸마다 「AI로 채우기」' },
};
// 기본 틀 + AI에서 기본 틀로 채우는 칸 (세계관과 상관없는 「게임 규칙」 칸)
export const HYBRID_TPL = ['stats', 'dice', 'calendar', 'ach', 'fate', 'memo', 'custom', 'music'];

// 장르별로 다른 부분만 (없는 장르 = 현대)
const G = {
    modern: { cur: '원', k: 1000, bars: ['체력', '기력', '스트레스'], mana: null, attrs: ['힘', '민첩', '지능', '매력', '감각'],
        places: ['집', '동네 거리', '카페', '편의점', '번화가'], home: ['원룸', '작은 원룸'], rooms: ['방', '주방·욕실'],
        shop: ['편의점', [['삼각김밥', 1.5], ['커피', 2], ['진통제', 4], ['우산', 8], ['보조배터리', 20]]],
        prices: [['한 끼 식사', 9], ['커피 한 잔', 4.5], ['버스·지하철', 1.5], ['영화 한 편', 15], ['한 달 월세', 600]],
        news: '오늘의 뉴스', gossip: '연예·동네 가십', board: '동네 커뮤니티', sns: '인스타',
    },
    fantasy: { cur: '골드', k: 1, bars: ['체력', '마나', '피로'], attrs: ['힘', '민첩', '지능', '매력', '감각'],
        places: ['여관', '마을 광장', '모험가 길드', '시장', '마을 어귀'], home: ['여관 방', '세 든 작은 방'], rooms: ['침실', '짐 보관함'],
        shop: ['잡화점', [['빵', 2], ['횃불', 3], ['회복 물약', 25], ['밧줄', 5], ['여행용 망토', 40]]],
        prices: [['빵 한 덩이', 2], ['여관 1박', 15], ['한 끼 식사', 6], ['말 한 필', 300], ['회복 물약', 25]],
        news: '왕국 소식지', gossip: '여관 뒷소문', board: '길드 의뢰 게시판', sns: '마법 게시판',
    },
    academy: { cur: '골드', k: 1, bars: ['체력', '마나', '피로'], attrs: ['힘', '민첩', '지능', '매력', '감각'],
        places: ['기숙사', '강의동', '도서관', '학생 식당', '정원'], home: ['기숙사 방', '2인실 기숙사'], rooms: ['내 자리', '공용 공간'],
        shop: ['교내 매점', [['샌드위치', 3], ['잉크와 깃펜', 5], ['마나 사탕', 8], ['기초 마도서', 60], ['교복 리본', 10]]],
        prices: [['학식 한 끼', 4], ['교과서', 50], ['외출 마차', 10], ['기숙사 간식', 3], ['한 학기 등록금', 2000]],
        news: '학원 신문', gossip: '복도 소문', board: '학생회 게시판', sns: '학원 게시판',
    },
    eastern: { shopAt: 1, cur: '은자', k: 1, bars: ['체력', '내공', '피로'], attrs: ['근력', '신법', '오성', '매력', '감각'],
        places: ['객잔', '저잣거리', '관도', '찻집', '산문 앞'], home: ['객잔 방', '작은 초가'], rooms: ['방', '마당'],
        shop: ['약재상', [['만두', 1], ['금창약', 20], ['해독단', 50], ['차 한 근', 8], ['새 옷 한 벌', 15]]],
        prices: [['국수 한 그릇', 1], ['객잔 1박', 5], ['술 한 병', 3], ['말 한 필', 120], ['금창약', 20]],
        news: '강호 소식', gossip: '저잣거리 소문', board: '방문(榜文)', sns: '강호 소문판',
    },
    medieval: { cur: '실링', k: 1, bars: ['체력', '기력', '피로'], attrs: ['힘', '민첩', '지혜', '매력', '감각'],
        places: ['여관', '광장', '성당', '시장', '성문'], home: ['세 든 방', '오두막'], rooms: ['방', '부엌'],
        shop: ['잡화점', [['빵', 1], ['양초', 2], ['약초 꾸러미', 6], ['양모 망토', 20], ['단검', 30]]],
        prices: [['빵 한 덩이', 1], ['여관 1박', 6], ['맥주 한 잔', 1], ['말 한 필', 200], ['한 달 방세', 40]],
        news: '포고문', gossip: '선술집 소문', board: '광장 게시판', sns: '광장 게시판',
    },
    early: { shopAt: 1, cur: '실링', k: 1, bars: ['체력', '기력', '스트레스'], attrs: ['힘', '민첩', '지성', '매력', '감각'],
        places: ['하숙집', '큰길', '찻집', '신문사', '기차역'], home: ['하숙방', '작은 셋방'], rooms: ['방', '응접 공간'],
        shop: ['잡화점', [['홍차 한 통', 3], ['신문', 1], ['향수', 25], ['장갑', 12], ['회중시계', 120]]],
        prices: [['한 끼 식사', 2], ['기차표', 8], ['전보 한 통', 3], ['하숙비 한 달', 60], ['신문', 1]],
        news: '조간신문', gossip: '사교계 가십', board: '신문 광고란', sns: '사교계 소식란',
    },
    sf: { cur: '크레딧', k: 1, bars: ['체력', '에너지', '스트레스'], attrs: ['힘', '반응', '지능', '매력', '감각'],
        places: ['숙소 모듈', '정거장 광장', '바', '시장 구역', '격납고'], home: ['숙소 모듈', '캡슐 숙소'], rooms: ['수면 칸', '작업대'],
        shop: ['정거장 상점', [['영양 바', 5], ['에너지 셀', 20], ['응급 키트', 60], ['데이터 칩', 40], ['합성 커피', 8]]],
        prices: [['식사 한 팩', 12], ['셔틀 요금', 30], ['숙소 하루', 80], ['응급 치료', 200], ['중고 드론', 900]],
        news: '정거장 뉴스피드', gossip: '바 뒷소문', board: '구인 게시판', sns: '넷 피드',
    },
    apoc: { shopAt: 2, cur: '배급권', k: 1, bars: ['체력', '허기', '정신력'], attrs: ['힘', '민첩', '지능', '매력', '감각'],
        places: ['은신처', '폐허 거리', '교역소', '급수탑', '외곽 경계'], home: ['은신처', '버려진 지하실'], rooms: ['잠자리', '물자 창고'],
        shop: ['교역소', [['통조림', 3], ['정수 알약', 5], ['붕대', 4], ['배터리', 6], ['손전등', 15]]],
        prices: [['통조림', 3], ['깨끗한 물 1L', 2], ['탄약 한 줌', 10], ['하룻밤 안전한 잠자리', 8], ['연료 1통', 25]],
        news: '무전 방송', gossip: '교역소 소문', board: '생존자 게시판', sns: '무전 채널',
    },
};
G.fan = G.modern; // 2차 창작: 원작을 모르니 현대 틀 (AI로 채우면 원작대로 바뀜)
export const genreOf = (id) => G[id] ? id : 'modern';
const PLACE_HOME = (g) => g.places[0];

// 게이지 설명 · 색 (이름은 장르마다)
const BAR_INFO = {
    0: { color: '#e2524a', desc: '0이 되면 쓰러진다' },
    1: { color: '#4a8fe2', desc: '힘을 쓰는 행동·기술에 든다' },
    2: { color: '#9a6ad6', desc: '쌓이면 실수가 늘고 무너질 수 있다' },
};
const RISING = /스트레스|피로|허기/; // 0에서 시작해 오르는 게이지

// 범용 업적 — 어떤 세계관에도 있는 일들
const ACH = [
    ['첫 친구', '누군가와 「친구」 단계가 되다'],
    ['마음을 연 사람', '누군가의 신뢰가 50을 넘다'],
    ['사랑의 시작', '연인이 생기다'],
    ['탐험가', '장소 10곳을 발견하다'],
    ['단골', '같은 가게를 다섯 번 이용하다'],
    ['해결사', '의뢰·목표 5개를 해내다'],
    ['구사일생', '대실패한 판정에서 살아남다'],
    ['부자의 꿈', '처음 가진 돈의 10배를 모으다'],
    ['위기 탈출', '체력이 바닥난 뒤 다시 일어서다'],
    ['비밀을 아는 자', '누군가의 숨겨진 비밀을 알게 되다', true],
];
// 범용 이벤트 카드 — 효과는 기본 틀의 게이지·돈 이름을 쓴다
function deck(g) {
    const m = (n) => Math.round(n * g.k);
    return [
        { title: '주운 지갑', kind: 'luck', desc: '길에서 누군가 떨어뜨린 돈을 주웠다. 돌려줄지는 마음대로.', effect: `cash: +${m(20)}` },
        { title: '푹 잔 밤', kind: 'luck', desc: '오랜만에 깊이 잤다. 몸이 가볍다.', effect: `stat: ${g.bars[0]} +10` },
        { title: '뜻밖의 친절', kind: 'luck', desc: '모르는 사람이 작은 도움을 주었다.', effect: '' },
        { title: '소매치기', kind: 'bad', desc: '정신을 차려 보니 주머니가 가벼워졌다.', effect: `cash: -${m(15)}` },
        { title: '삐끗한 발목', kind: 'bad', desc: '발을 헛디뎌 다쳤다.', effect: `stat: ${g.bars[0]} -8` },
        { title: '궂은 날씨', kind: 'event', desc: '갑자기 날씨가 험해져 계획이 틀어졌다.', effect: 'weather: 폭우' },
        { title: '낯선 소문', kind: 'event', desc: '근처에서 이상한 소문이 돌기 시작했다.', effect: '' },
        { title: '오랜만의 연락', kind: 'event', desc: '한동안 연락 없던 누군가에게서 소식이 왔다.', effect: '' },
    ];
}

// 이 채팅의 인물 (카드·그룹 멤버)
function castOf() {
    const c = ctx();
    const ids = c.groupId ? (c.groups?.find(x => x.id == c.groupId)?.members ?? []) : [];
    const list = c.groupId ? ids.map(av => c.characters?.find(ch => ch.avatar === av)).filter(Boolean) : (c.characters?.[c.characterId] ? [c.characters[c.characterId]] : []);
    return list.map(ch => ({ name: String(ch.name ?? '').trim(), desc: short(String(ch.description ?? ch.data?.description ?? '').replace(/\{\{(char|user)\}\}/gi, (_, w) => (w.toLowerCase() === 'char' ? ch.name : c.name1)), 110) })).filter(x => x.name);
}

// 실제 오늘 날짜로 (현대) — 요일까지 맞게 요일 목록을 돌려 둔다
function todayCal() {
    const t = new Date();
    const cal = { y: t.getFullYear(), m: t.getMonth() + 1, d: t.getDate(), months: clone(DEFAULT_MONTHS) };
    const idx = ((dayIndex(cal) % 7) + 7) % 7, real = (t.getDay() + 6) % 7; // 월=0
    const week = DEFAULT_WEEK.map((_, k) => DEFAULT_WEEK[(((real - idx + k) % 7) + 7) % 7]);
    const h = t.getHours();
    return { ...cal, week, time: h < 6 ? '새벽' : h < 10 ? '아침' : h < 17 ? '낮' : h < 20 ? '저녁' : h < 23 ? '밤' : '심야' };
}

// 세계 핵심 (기본 틀만일 때)
export function skeletonCore(genre, opt = {}) {
    const gr = GENRES.find(x => x.id === genre);
    const cast = castOf();
    const c = ctx();
    return {
        title: opt.title || (cast.length === 1 ? cast[0].name : cast.length ? cast.map(x => x.name).slice(0, 3).join(' · ') : '나의 이야기'),
        genre: gr?.name ?? '현대',
        summary: [gr?.hint ?? '현대 도시. 스마트폰 메신저, 원화.', opt.canon ? `원작: ${opt.canon}` : '', opt.instruction ? short(opt.instruction, 300) : ''].filter(Boolean).join(' '),
        tone: '', userRole: '이 이야기의 주인공', rules: '', canon: opt.canon ?? '',
    };
}

// 한 칸의 기본 틀 (normalize 전 모양 · SCHEMA와 같음)
export function skeleton(id, genre, opt = {}) {
    const g = G[genreOf(genre)];
    const m = (n) => Math.round(n * g.k);
    const cast = castOf();
    const c = ctx();
    switch (id) {
        case 'stats': return {
            bars: g.bars.map((name, k) => ({ name, cur: RISING.test(name) ? 0 : 100, max: 100, ...BAR_INFO[k], ...(RISING.test(name) ? { desc: name === '허기' ? '100이 되면 굶주려 체력이 깎인다' : BAR_INFO[2].desc } : k === 2 ? { desc: '바닥나면 버티기 힘들어진다' } : {}) })),
            attrs: g.attrs.map(name => ({ name, val: 0, desc: '판정 보정치 (-2~+5) · 큰 성장 때만 오른다' })),
            conds: [],
        };
        case 'dice': return {
            system: 'd20',
            rules: '1d20 + 능력치 ≥ 난이도면 성공. 자연 20은 대성공(기대 이상), 자연 1은 대실패(일이 꼬임). 쉬움 8 · 보통 12 · 어려움 15 · 매우 어려움 18 · 극한 22.',
            quick: [['설득', 3], ['관찰', 4], ['은신', 1], ['완력', 0], ['지식', 2]].map(([name, a]) => ({ name, attr: g.attrs[a], dc: 12 })),
        };
        case 'calendar': {
            const base = genre === 'modern' ? todayCal() : { y: 1, m: 3, d: 1, months: clone(DEFAULT_MONTHS), week: [...DEFAULT_WEEK], time: '아침' };
            return { era: '', ...base, times: [...DEFAULT_TIMES], weather: '', autoWeather: true, events: [] };
        }
        case 'ach': return { list: ACH.map(([name, desc, hidden]) => ({ name, desc, done: false, hidden: !!hidden })), endings: [] };
        case 'fate': return { curses: [], deck: deck(g), drawChance: 15, rules: [] };
        case 'memo': return { list: [] };
        case 'custom': return { tabs: [] };
        case 'music': return { taste: '', now: null, log: [] };
        case 'wallet': return {
            currency: g.cur, cash: m(genreOf(genre) === 'modern' ? 300 : 100), items: [],
            prices: g.prices.map(([name, p]) => ({ name, price: m(p) })), fx: { unit: '', rate: 0 }, loans: [], regular: [], jobs: [],
        };
        case 'shop': return { shops: [{ name: g.shop[0], desc: '동네에 하나쯤 있는 가게', place: g.places[g.shopAt ?? 3], items: g.shop[1].map(([name, p]) => ({ name, price: m(p), desc: '', kind: 'item', stock: -1 })) }] };
        case 'home': return { name: g.home[0], desc: g.home[1], rooms: g.rooms.map(name => ({ name, desc: '', decor: [] })), storage: [] };
        case 'map': {
            const ps = g.places;
            return { name: '', here: PLACE_HOME(g), places: ps.map((name, k) => ({ name, desc: '', kind: '', x: [16, 44, 44, 70, 44][k] ?? 44, y: [50, 50, 18, 50, 82][k] ?? 50, links: k === 1 ? ps.filter((_, j) => j !== 1) : [ps[1]], known: true })) };
        }
        case 'profile': return {
            mode: opt.pmode === 'detailed' ? 'detailed' : 'minimal',
            list: [{ name: c.name1 || 'User', role: 'user', summary: short(String(c.powerUserSettings?.persona_description ?? ''), 110) || '주인공', fields: [] }, ...cast.map(x => ({ name: x.name, role: 'main', summary: x.desc, fields: [] }))],
        };
        case 'rel': return { user: cast.map(x => ({ name: x.name, label: '', aff: 0, trust: 0, memo: '' })), pairs: [], stages: clone(DEFAULT_STAGES) };
        case 'contact': {
            const mode = ['phone', 'instant', 'letter'].includes(opt.cmode) ? opt.cmode : (GENRES.find(x => x.id === genre)?.contact ?? 'phone');
            const md = ['phone', 'instant', 'letter'].includes(mode) ? mode : 'phone';
            return { mode: md, app: CONTACT_MODES[md].app, contacts: cast.map(x => ({ name: x.name, status: '' })), threads: {}, couriers: clone(COURIER_PRESETS.slice(0, 1)) };
        }
        case 'quest': return { list: [] };
        case 'news': return { name: g.news, items: [] };
        case 'gossip': return { name: g.gossip, issues: [] };
        case 'board': return { name: g.board, posts: [] };
        case 'sns': return { name: g.sns, posts: [] };
        default: return null;
    }
}

// 기본 틀 + AI: AI가 기본 틀의 이름(게이지·능력치)을 그대로 쓰게 알려 준다
export function skeletonHint(genre, ids) {
    const g = G[genreOf(genre)];
    const L = [];
    if (ids.includes('stats')) L.push(`게이지는 ${g.bars.join(' · ')}, 능력치는 ${g.attrs.join(' · ')}로 이미 정해져 있다 — 아이템 효과·판정 등에서 이 이름을 그대로 쓸 것.`);
    if (ids.includes('calendar')) L.push('달력은 기본 달력(1~12월)을 쓴다.');
    return L.join(' ');
}
