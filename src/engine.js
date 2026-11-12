// 상태 엔진: <status> 변화량 → 상태 재계산 · 직접 편집 기록 · 프롬프트 주입
import {
    app, ctx, settings, getMeta, saveMeta, modOn, MOD_IDS, MOD, EMPTY, NORM, normalize, clone, clamp, num, norm, findBy, parseNum, splitBar,
    signed, fmtNum, short, dayIndex, addDays, dateStr, eventsOn, parseDate, nowTick, tickUnit, stamp, esc, TITLE, INJECT_KEY, INJECT_KEY2,
    PROMPT_IN_CHAT, ROLE_SYSTEM, MODULE, uid, diffOf, LOG, CONTACT_MODES, touchContact, tidy, msgText, nextTime, dateShort, DEFAULT_STAGES, arr, playOf, swapUser,
} from './core.js';
import { P } from './prompts.js';

export const KEYMAP = {
    stat: 'stat', '수치': 'stat', '게이지': 'stat', gauge: 'stat', hp: 'stat',
    attr: 'attr', '능력치': 'attr', '능력': 'attr',
    cond: 'cond', '상태': 'cond', '상태이상': 'cond', buff: 'cond', '버프': 'cond', condition: 'cond',
    cash: 'cash', money: 'cash', '돈': 'cash', '재산': 'cash', '소지금': 'cash', gold: 'cash',
    item: 'item', items: 'item', '아이템': 'item', '소지품': 'item',
    stock: 'stock', '상품': 'stock', '입고': 'stock',
    decor: 'decor', '가구': 'decor', '장식': 'decor',
    room: 'room', '방': 'room',
    loc: 'loc', '위치': 'loc', '장소': 'loc', location: 'loc',
    place: 'place', '발견장소': 'place', '새장소': 'place',
    aff: 'aff', '호감': 'aff', '호감도': 'aff', trust: 'trust', '신뢰': 'trust', '신뢰도': 'trust',
    rel: 'rel', '관계': 'rel', pair: 'pair', '인물관계': 'pair',
    date: 'date', '날짜': 'date', day: 'date', '일': 'date', time: 'time', '시간': 'time', '시간대': 'time',
    days: 'date', '날짜이동': 'date', period: 'time', slot: 'time',
    event: 'event', '일정': 'event',
    ach: 'ach', '업적': 'ach', achievement: 'ach',
    memo: 'memo', '메모': 'memo', note: 'memo',
    msg: 'msg', '연락': 'msg', '문자': 'msg', message: 'msg', '메시지': 'msg', letter: 'msg', '편지': 'msg',
    npc: 'npc', '인물': 'npc', '새인물': 'npc',
    roll: 'roll', '판정': 'roll', '판정요청': 'roll',
    quest: 'quest', '퀘스트': 'quest', '의뢰': 'quest',
    news: 'news', '뉴스': 'news', '소식': 'news',
    rumor: 'rumor', gossip: 'rumor', '소문': 'rumor', '가십': 'rumor',
    post: 'post', '게시글': 'post', '게시판': 'post',
    curse: 'curse', '저주': 'curse', blessing: 'curse', '축복': 'curse',
    weather: 'weather', '날씨': 'weather',
    bgm: 'bgm', music: 'bgm', song: 'bgm', '음악': 'bgm', '노래': 'bgm', '추천곡': 'bgm', 'ost': 'bgm',
    sns: 'sns', feed: 'sns', '피드': 'sns', '인스타': 'sns', 'sns글': 'sns',
    custom: 'custom', tab: 'custom', '내탭': 'custom', '탭': 'custom',
    life: 'life', offscreen: 'life', '근황': 'life', '화면밖': 'life',
    jealous: 'jealous', jealousy: 'jealous', '질투': 'jealous',
    alert: '_alert', '알림': '_alert',
};
export const KEY_MOD = {
    stat: 'stats', attr: 'stats', cond: 'stats', cash: 'wallet', item: 'wallet', stock: 'shop', decor: 'home', room: 'home', loc: 'map', place: 'map',
    aff: 'rel', trust: 'rel', rel: 'rel', pair: 'rel', date: 'calendar', time: 'calendar', event: 'calendar', ach: 'ach', memo: 'memo', msg: 'contact',
    npc: 'profile', roll: 'dice', quest: 'quest', news: 'news', rumor: 'gossip', post: 'board', curse: 'fate', weather: 'calendar',
    bgm: 'music', sns: 'sns', custom: 'custom', life: 'rel', jealous: 'rel',
};

const BLOCK_RE = /<status>([\s\S]*?)(?:<\/status>|$)/gi;
export function extractOps(text) {
    const ops = [];
    if (!text || !/<status>/i.test(text)) return ops;
    for (const m of String(text).matchAll(BLOCK_RE)) {
        for (const line of m[1].split(/\r?\n/)) {
            // 가벼운 모델이 붙이는 꾸밈(**굵게**, `코드`, 번호)을 벗겨 낸다
            const clean = line.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, '').replace(/\*\*|__|`/g, '');
            const lm = clean.match(/^\s*([^:：\n]{1,24}?)\s*[:：]\s*(.+?)\s*$/);
            if (lm && !/^```/.test(lm[1])) ops.push([lm[1].trim(), lm[2]]);
        }
    }
    return ops;
}
export const stripStatus = (t) => String(t ?? '').replace(/<status>[\s\S]*?(?:<\/status>|$)/gi, '').trim();

// ───── 서랍: <status>를 읽은 뒤 본문에서 떼어 메시지 숨은 칸(extra)에 보관 ─────
// 본문엔 이야기만 남아서 다른 확장(요약·번역·로그 복사)이 변화량 줄을 보지 않는다.
export function drawerOps(m) {
    const d = m?.extra?.[MODULE]?.bySwipe?.[m?.swipe_id ?? 0];
    return Array.isArray(d) ? d : null;
}
function syncSwipe(m) {
    const sid = m.swipe_id;
    if (typeof sid !== 'number' || !Array.isArray(m.swipes) || typeof m.swipes[sid] !== 'string') return;
    m.swipes[sid] = m.mes;
    if (Array.isArray(m.swipe_info) && m.swipe_info[sid] && typeof m.swipe_info[sid] === 'object') m.swipe_info[sid].extra = structuredClone(m.extra);
}
export function setDrawer(m, ops) {
    m.extra ??= {};
    m.extra[MODULE] ??= {};
    m.extra[MODULE].bySwipe ??= {};
    m.extra[MODULE].bySwipe[m.swipe_id ?? 0] = ops;
    syncSwipe(m);
}
// replace = true: 서랍을 새 내용으로 바꿈 / false: 이어 쓰기(continue)처럼 뒤에 덧붙임
export function stashStatus(m, { replace = false } = {}) {
    if (!m || m.is_user || typeof m.mes !== 'string' || !/<status>/i.test(m.mes)) return false;
    const ops = extractOps(m.mes);
    const old = replace ? [] : (drawerOps(m) ?? []);
    m.mes = m.mes.replace(/\s*<status>[\s\S]*?(?:<\/status>|$)/gi, '').replace(/\s+$/, '');
    setDrawer(m, [...old, ...ops]);
    return true;
}
// 한 메시지의 모든 스와이프에서 태그를 보관 (옛 채팅 정리용) → 옮긴 개수
export function stashAllSwipes(m) {
    if (!m || m.is_user) return 0;
    let n = 0;
    if (Array.isArray(m.swipes)) m.swipes.forEach((t, sid) => {
        if (sid === (m.swipe_id ?? 0) || typeof t !== 'string' || !/<status>/i.test(t)) return;
        const info = m.swipe_info?.[sid];
        if (!info || typeof info !== 'object') return; // 보관할 칸이 없으면 그대로 둔다
        info.extra ??= {}; info.extra[MODULE] ??= {}; info.extra[MODULE].bySwipe ??= {};
        info.extra[MODULE].bySwipe[sid] = extractOps(t);
        m.swipes[sid] = t.replace(/\s*<status>[\s\S]*?(?:<\/status>|$)/gi, '').replace(/\s+$/, '');
        n++;
    });
    if (stashStatus(m, { replace: true })) n++;
    return n;
}
// 상태 계산에 넣을 AI 메시지인가: 숨김(/hide·요약 확장)으로 is_system이 된 답도 포함, 진짜 시스템 메시지(extra.type)는 제외
export const isStoryAI = (m) => !!m && !m.is_user && (!m.is_system || !m.extra?.type);

function ensure(s, mod) {
    if (!s.data[mod]) s.data[mod] = EMPTY[mod]();
    return s.data[mod];
}
const QSTATUS = { open: 'open', new: 'open', '새': 'open', '등록': 'open', '공고': 'open', active: 'active', '수락': 'active', '진행': 'active', '진행중': 'active', '시작': 'active', done: 'done', '완료': 'done', '성공': 'done', '달성': 'done', failed: 'failed', fail: 'failed', '실패': 'failed', '포기': 'failed' };
const QNAME = { open: '새 의뢰', active: '진행', done: '완료', failed: '실패' };

// ───── 운명 · 돈: 효과 계산 ─────
// 문자열 시드 → 0~1 난수 (같은 채팅·같은 날이면 늘 같은 결과 — 다시 계산해도 바뀌지 않게)
export function seeded(str) {
    let h = 1779033703 ^ str.length;
    for (let i = 0; i < str.length; i++) { h = Math.imul(h ^ str.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
    return () => {
        h = Math.imul(h ^ (h >>> 16), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909);
        const t = (h ^= h >>> 16) >>> 0;
        return t / 4294967296;
    };
}
const effSum = (s, re) => {
    let n = 0;
    for (const c of s?.data?.fate?.curses ?? []) for (const e of c.effects) { const m = e.match(re); if (m) n += parseFloat(m[1].replace('−', '-')); }
    return n;
};
export const priceMul = (s) => Math.max(0.1, 1 + effSum(s, /(?:가격|물가|prices?)\s*([+\-−]?\d+(?:\.\d+)?)\s*%/i) / 100);
export const affMul = (s) => Math.max(0, 1 + effSum(s, /(?:호감|aff(?:ection)?)\s*(?:상승|획득|gains?)?\s*([+\-−]?\d+(?:\.\d+)?)\s*%/i) / 100);
export const loanBlocked = (s) => (s?.data?.fate?.curses ?? []).some(c => c.effects.some(e => /대출\s*불가|no\s+loans?/i.test(e)));
export const LOAN_KIND = {
    bank: { name: '은행', rate: 10, days: 30, icon: 'fa-building-columns' },
    shark: { name: '사채', rate: 30, days: 7, icon: 'fa-skull-crossbones' },
    pawn: { name: '전당포', rate: 10, days: 14, icon: 'fa-ring' },
};
export const CREDIT_CURSE = { name: '신용불량', kind: 'curse', desc: '빚을 제때 갚지 못했다', effects: ['가격 +30%', '대출 불가'], days: null, cure: '연체된 빚을 모두 갚기', auto: 'debt' };
const today = (s) => (s.data.calendar ? dayIndex(s.data.calendar) : null);
const PERIOD = (s, every) => (every === 'day' ? 1 : every === 'week' ? Math.max(1, s.data.calendar?.week?.length || 7) : 30);
// "체력 -5" · "돈 +10" · "cash: +200" · 여러 개는 ; 또는 줄바꿈
export function applyLines(s, text, info) {
    for (const raw of String(text ?? '').split(/\s*[;\n]\s*/)) {
        const line = raw.trim();
        if (!line) continue;
        const kv = line.match(/^([^:：]{1,24})\s*[:：]\s*(.+)$/);
        if (kv) { applyOp(s, kv[1].trim(), kv[2], info); continue; }
        const nv = line.match(/^(.+?)\s+([=+\-−]?\d[\d.,]*)$/);
        if (!nv) continue;
        const nm = nv[1].trim();
        // 게이지·능력치 이름이 먼저 (예: 'HP'는 키 별칭이기도 해서)
        if (findBy(s.data.stats?.bars ?? [], nm)) applyOp(s, 'stat', `${nm} ${nv[2]}`, info);
        else if (findBy(s.data.stats?.attrs ?? [], nm)) applyOp(s, 'attr', `${nm} ${nv[2]}`, info);
        else applyOp(s, nm, nv[2], info);
    }
}
function addCurse(s, c, info) {
    const f = ensure(s, 'fate');
    const ex = findBy(f.curses, c.name);
    if (ex) { ex.since = today(s); return; }
    f.curses.push({ name: c.name, kind: c.kind ?? 'curse', desc: c.desc ?? '', effects: [...(c.effects ?? [])], days: c.days ?? null, since: today(s), cure: c.cure ?? '', auto: c.auto ?? '' });
    if (s.tally && c.kind !== 'bless') s.tally.curses++;
    info.labels.push(`${c.kind === 'bless' ? '✨' : '☠'} ${c.name}`);
    info.alerts.push(`${c.kind === 'bless' ? '축복' : '저주'} — ${c.name}${c.effects?.length ? ` (${c.effects.join(', ')})` : ''}`);
}
function liftDebtCurse(s, info) {
    const w = s.data.wallet, f = s.data.fate;
    if (!f || w?.loans.some(l => l.status === 'late')) return;
    const k = f.curses.findIndex(c => c.auto === 'debt');
    if (k >= 0) { info.labels.push(`해제: ${f.curses[k].name}`); f.curses.splice(k, 1); }
}
function drawCard(s, card, info) {
    if (!card) return;
    const f = ensure(s, 'fate');
    const day = today(s);
    f.today = { title: card.title, desc: card.desc, day: day ?? s.turn };
    f.log.push({ title: card.title, kind: card.kind, date: stamp(s) });
    if (f.log.length > 30) f.log.shift();
    info.labels.push(`🃏 ${card.title}`);
    info.alerts.push(`이벤트 카드 — ${card.title}${card.desc ? `: ${short(card.desc, 50)}` : ''}`);
    applyLines(s, card.effect, info);
}
// 하루가 지날 때마다: 정기 수입·지출 · 빚 연체 · 저주의 매일 효과와 기간 · 이벤트 카드
function dayTick(s, info, from, to) {
    const end = Math.min(to, from + 60);
    closeDay(s, info, from);
    s.newDay = true;
    for (const r of s.data.rel?.user ?? []) if (r.jealous) r.jealous = Math.max(0, r.jealous - 8 * Math.min(end - from, 12));
    for (let day = from + 1; day <= end; day++) {
        const w = s.data.wallet, f = s.data.fate;
        const cal = s.data.calendar;
        if (cal?.autoWeather && day === end) cal.weather = pickWeather(cal, `${info.seed}:w${day}`);
        if (w && info.mods?.wallet !== false) {
            for (const r of w.regular) {
                const per = PERIOD(s, r.every);
                if (r.next === null) r.next = from + per;
                let guard = 0;
                while (r.next <= day && guard++ < 400) {
                    applyOp(s, 'cash', `${r.amount >= 0 ? '+' : '-'}${Math.abs(r.amount)}`, info);
                    r.next += per;
                }
            }
            for (const l of w.loans) {
                if (l.status !== 'open' || l.due === null || day <= l.due) continue;
                if (l.kind === 'pawn') { l.status = 'lost'; info.alerts.push(`전당포 기한이 지나 ${l.item || '맡긴 물건'}을(를) 잃었다`); continue; }
                l.status = 'late';
                info.alerts.push(`${LOAN_KIND[l.kind].name} 빚 ${fmtNum(l.owed)} ${w.currency} 연체!`);
                if (info.mods?.fate !== false) addCurse(s, CREDIT_CURSE, info);
            }
        }
        if (f && info.mods?.fate !== false) {
            for (const c of [...f.curses]) {
                for (const e of c.effects) { const m = e.match(/^(?:매일|daily|every\s*day)\s*[:：]?\s*(.+)$/i); if (m) applyLines(s, m[1], info); }
                if (c.days && c.since !== null && day >= c.since + c.days) {
                    f.curses.splice(f.curses.indexOf(c), 1);
                    info.labels.push(`해제: ${c.name}`); info.alerts.push(`${c.name}이(가) 풀렸다`);
                }
            }
            if (f.deck.length && f.drawChance > 0) {
                const r = seeded(`${info.seed}:day${day}`);
                if (r() * 100 < f.drawChance) drawCard(s, f.deck[Math.floor(r() * f.deck.length)], info);
            }
        }
    }
}
// 자동 규칙: 조건이 '거짓 → 참'으로 바뀔 때 한 번 실행
function metric(s, lhs) {
    const t = lhs.trim();
    const w = s.data.wallet;
    if (w && (['돈', '소지금', 'cash', 'money'].includes(t) || norm(t) === norm(w.currency))) return w.cash;
    const rm = t.match(/^(호감|신뢰|aff|trust)\s*[:：]\s*(.+)$/i);
    if (rm) { const r = findBy(s.data.rel?.user ?? [], rm[2]); return r ? r[/호감|aff/i.test(rm[1]) ? 'aff' : 'trust'] : null; }
    if (t === '빚' || t === 'debt') return (w?.loans ?? []).filter(l => l.status === 'open' || l.status === 'late').reduce((a, l) => a + l.owed, 0);
    const bar = findBy(s.data.stats?.bars ?? [], t); if (bar) return bar.cur;
    const at = findBy(s.data.stats?.attrs ?? [], t); if (at) return at.val;
    if (/^(날짜수|지난날|days?)$/i.test(t)) return s.data.calendar ? dayIndex(s.data.calendar) - (s.day0 ?? dayIndex(s.data.calendar)) : s.turn;
    if (/^(턴|turns?)$/i.test(t)) return s.turn;
    const km = t.match(/^(아이템|item|질투|jealous|단계|stage)\s*[:：]\s*(.+)$/i);
    if (km) {
        if (/아이템|item/i.test(km[1])) return findBy(w?.items ?? [], km[2])?.qty ?? 0;
        const r = findBy(s.data.rel?.user ?? [], km[2]); if (!r) return null;
        return /질투|jealous/i.test(km[1]) ? r.jealous : Math.max(0, r.stage ?? 0);
    }
    // 내 탭: "탭:항목" 또는 항목 이름
    const tabs = s.data.custom?.tabs ?? [];
    const cm = t.match(/^(.+?)\s*[:：]\s*(.+)$/);
    const fld = cm ? findBy(findBy(tabs, cm[1])?.fields ?? [], cm[2], 'k') : tabs.map(tb => findBy(tb.fields, t, 'k')).find(Boolean);
    if (fld && fld.type !== 'text') return fld.v;
    return null;
}
export function ruleTrue(s, when) {
    const m = String(when ?? '').match(/^(.+?)\s*(<=|>=|==|=|<|>)\s*(-?[\d.,]+)\s*$/);
    if (!m) return false;
    const v = metric(s, m[1]); if (v === null || v === undefined) return false;
    const n = parseFloat(m[3].replace(/,/g, ''));
    return { '<': v < n, '<=': v <= n, '>': v > n, '>=': v >= n, '=': v === n, '==': v === n }[m[2]];
}
function checkEndings(s, info) {
    const ac = s.data.ach;
    if (!ac?.endings?.length || info.mods?.ach === false) return;
    for (const e of ac.endings) {
        const now = !!ruleTrue(s, e.when);
        if (now && !e.on) { e.on = true; if (!e.done) { e.done = true; e.at = stamp(s); info.labels.push(`🎬 ${e.name}`); info.alerts.push({ kind: 'ending', name: e.name, text: e.desc }); } }
        else if (!now && e.on) e.on = false;
    }
}
function checkRules(s, info) {
    checkEndings(s, info);
    const f = s.data.fate;
    if (!f?.rules.length || info.mods?.fate === false || info.inRule) return;
    info.inRule = true;
    try {
        for (const r of f.rules) {
            const now = !!ruleTrue(s, r.when);
            if (now && !r.on) { r.on = true; info.labels.push(`⚙ ${r.name}`); applyLines(s, r.then, info); }
            else if (!now && r.on) r.on = false;
        }
    } finally { info.inRule = false; }
}

// ───── 날씨 · 계절 ─────
const WEATHER = {
    spring: [['☀️ 맑음', 5], ['⛅ 구름', 3], ['🌧 비', 2], ['🌫 안개', 1], ['🌸 꽃바람', 1]],
    summer: [['☀️ 맑음', 4], ['🔥 무더위', 3], ['🌧 비', 3], ['⛈ 소나기', 2], ['🌀 폭풍', 1]],
    autumn: [['☀️ 맑음', 5], ['⛅ 구름', 3], ['🍂 쌀쌀함', 2], ['🌧 비', 2], ['🌫 안개', 1]],
    winter: [['☀️ 맑음', 3], ['☁️ 흐림', 3], ['❄️ 눈', 3], ['🥶 한파', 2], ['🌨 눈보라', 1]],
};
export function seasonOf(cal) {
    const k = Math.floor(((cal.m - 1) / Math.max(1, cal.months.length)) * 12); // 0~11, 달 이름이 달라도 1년을 12로 나눠 본다
    return k >= 2 && k <= 4 ? 'spring' : k >= 5 && k <= 7 ? 'summer' : k >= 8 && k <= 10 ? 'autumn' : 'winter';
}
export const SEASON_NAME = { spring: '봄', summer: '여름', autumn: '가을', winter: '겨울' };
function pickWeather(cal, seed) {
    const table = WEATHER[seasonOf(cal)];
    const total = table.reduce((a, [, w]) => a + w, 0);
    let x = seeded(seed)() * total;
    for (const [n, w] of table) { if ((x -= w) < 0) return n; }
    return table[0][0];
}
// ───── 사람 위치: 사는 곳 · 일과 ─────
// 일과 "아침:시장, 낮:항구, 밤:집" → 지금 시간대에 있는 곳 ('집'은 사는 곳)
export function whereNow(p, cal) {
    const parts = String(p.sched ?? '').split(/\s*[,，;；、|\n]\s*/).map(x => x.split(/\s*[:：]\s*/)).filter(x => x.length === 2 && x[1]);
    const t = cal?.time ?? '';
    const hit = parts.find(([k]) => norm(k) === norm(t)) ?? parts.find(([k]) => /^(항상|늘|always|\*)$/i.test(k));
    const place = hit?.[1] ?? '';
    if (!place) return p.home || '';
    return /^(집|home)$/i.test(place) ? (p.home || place) : place;
}
export function peopleAt(s, place) {
    const list = s.data.profile?.list ?? [];
    const cal = s.data.calendar;
    const live = [], now = [];
    for (const p of list) {
        if (p.role === 'user') continue;
        if (p.home && norm(p.home) === norm(place)) live.push(p.name);
        const w = whereNow(p, cal);
        if (w && norm(w) === norm(place)) now.push(p.name);
    }
    return { live, now };
}
// 지도에서 몇 칸 떨어졌나 (이어진 곳 따라 BFS)
export function hopsBetween(map, from, to) {
    if (!map || norm(from) === norm(to)) return 0;
    const key = (n) => norm(n);
    const adj = new Map();
    for (const p of map.places) for (const l of p.links) {
        (adj.get(key(p.name)) ?? adj.set(key(p.name), new Set()).get(key(p.name))).add(key(l));
        (adj.get(key(l)) ?? adj.set(key(l), new Set()).get(key(l))).add(key(p.name));
    }
    const seen = new Set([key(from)]); let q = [key(from)], d = 0;
    while (q.length && d < 30) {
        d++; const nq = [];
        for (const x of q) for (const y of adj.get(x) ?? []) { if (y === key(to)) return d; if (!seen.has(y)) { seen.add(y); nq.push(y); } }
        q = nq;
    }
    return 1; // 길이 없으면 한 칸으로 친다
}
// /ss-get · 매크로용: 키 하나의 값
export function ssValue(s, key0) {
    if (!s) return '';
    const key = String(key0 ?? '').trim();
    const d = s.data;
    const [k, arg] = key.split(/\s*[:：]\s*/);
    const K = k.toLowerCase();
    if (['cash', 'money', '돈', '소지금'].includes(K)) return String(d.wallet?.cash ?? '');
    if (['currency', '화폐'].includes(K)) return d.wallet?.currency ?? '';
    if (['loc', 'here', '위치', '장소'].includes(K)) return d.map?.here ?? '';
    if (['date', '날짜'].includes(K)) return d.calendar ? dateStr(d.calendar) : '';
    if (['time', 'period', '시간대'].includes(K)) return d.calendar?.time ?? '';
    if (['weather', '날씨'].includes(K)) return d.calendar?.weather ?? '';
    if (['season', '계절'].includes(K)) return d.calendar ? SEASON_NAME[seasonOf(d.calendar)] : '';
    if (['curse', 'curses', '저주'].includes(K)) return (d.fate?.curses ?? []).map(c => c.name).join(', ');
    if (['quest', 'quests', '퀘스트'].includes(K)) return (d.quest?.list ?? []).filter(q => q.status === 'active').map(q => q.title).join(', ');
    if (['here_now', '여기있는사람'].includes(K)) return d.map ? peopleAt(s, d.map.here).now.join(', ') : '';
    if (['bgm', 'music', '음악', '노래'].includes(K)) return d.music?.now ? `${d.music.now.title}${d.music.now.artist ? ` - ${d.music.now.artist}` : ''}` : '';
    if ((K === 'stage' || K === '단계') && arg) { const r = findBy(d.rel?.user ?? [], arg); const st = d.rel?.stages?.length ? d.rel.stages : DEFAULT_STAGES; return r ? st[clamp(r.stage ?? 0, 0, st.length - 1)]?.name ?? '' : ''; }
    if ((K === 'jealous' || K === '질투') && arg) { const r = findBy(d.rel?.user ?? [], arg); return r ? String(r.jealous ?? 0) : ''; }
    if ((K === 'aff' || K === '호감' || K === 'trust' || K === '신뢰') && arg) { const r = findBy(d.rel?.user ?? [], arg); return r ? String(r[/^(aff|호감)$/.test(K) ? 'aff' : 'trust']) : ''; }
    if ((K === 'stat' || K === '수치') && arg) { const b = findBy(d.stats?.bars ?? [], arg); return b ? String(b.cur) : ''; }
    if ((K === 'item' || K === '아이템') && arg) { const it = findBy(d.wallet?.items ?? [], arg); return it ? String(it.qty) : '0'; }
    const v = metric(s, key);
    return v === null || v === undefined ? '' : String(v);
}

// ───── 관계 단계: 호감·신뢰가 문턱을 넘으면 해금 (내려갈 땐 10 여유) ─────
export function stageIndex(stages, aff, trust) {
    let k = 0;
    stages.forEach((st, i) => { if (aff >= st.at && trust >= st.trust) k = i; });
    return k;
}
function updateStage(s, r, info, silent = false) {
    const rl = s.data.rel; if (!rl) return;
    const st = rl.stages?.length ? rl.stages : DEFAULT_STAGES;
    const want = stageIndex(st, r.aff, r.trust);
    if (r.stage < 0 || r.stage >= st.length) { r.stage = want; return; }
    if (want > r.stage) {
        r.stage = want;
        if (silent) return;
        const g = st[want];
        info.labels.push(`💞 ${r.name}: ${g.name}`);
        info.alerts.push({ kind: 'stage', who: r.name, name: g.name, text: g.unlock });
        anniversary(s, r, want, st);
    } else if (want < r.stage) {
        const cur = st[r.stage];
        if (r.aff < cur.at - 10 || r.trust < cur.trust - 10) {
            r.stage = want;
            if (!silent) { info.labels.push(`💔 ${r.name}: ${st[want].name}`); info.alerts.push(`💔 ${r.name}와(과)의 사이가 「${st[want].name}」(으)로 멀어졌다`); }
        }
    }
}
// 기념일 자동: 친구가 되면 「처음 만난 날」, 맨 위 단계가 되면 그날 + 100일
function anniversary(s, r, k, st) {
    const cal = s.data.calendar; if (!cal || info0(s)) return;
    const add = (e) => { if (!cal.events.some(x => norm(x.title) === norm(e.title))) cal.events.push(e); };
    if (k >= 2 && r.met) { const dt = parseDate(cal, r.met); if (dt) add({ y: null, m: dt.m, d: dt.d, title: `${r.name}와 처음 만난 날`, desc: '자동 기념일', repeat: 'yearly' }); }
    if (k === st.length - 1) {
        add({ y: null, m: cal.m, d: cal.d, title: `${r.name}와 ${st[k].name}이 된 날`, desc: '자동 기념일', repeat: 'yearly' });
        const t = { ...cal }; addDays(t, 99);
        add({ y: t.y, m: t.m, d: t.d, title: `${r.name}와 100일`, desc: '자동 기념일', repeat: 'once' });
    }
}
const info0 = (s) => s.data.calendar?.noAuto === true;
// 질투: 누군가와 가까워지면, 호감이 높은 다른 사람의 질투가 오른다 (날이 지나면 식음)
function jealousyFrom(s, gainer, amount, info) {
    if (!settings().jealousy || amount <= 0) return;
    const g = findBy(s.data.rel?.user ?? [], gainer);
    if (!g || g.aff < 20) return; // 꽤 가까워진 사람에게만
    for (const y of s.data.rel?.user ?? []) {
        if (norm(y.name) === norm(gainer) || y.aff < 50) continue;
        const b = y.jealous;
        y.jealous = clamp(b + Math.ceil(amount), 0, 100);
        if (b < 50 && y.jealous >= 50) info.alerts.push(`💢 ${y.name}의 질투가 쌓이고 있다`);
    }
}
// 하루 정리: 날짜가 넘어갈 때 그날 있었던 일을 한 장으로
function closeDay(s, info, dayIdx) {
    const b = s.dayBuf; if (!b) return;
    const cal = s.data.calendar;
    const cashNow = s.data.wallet?.cash ?? null;
    const aff = [];
    for (const r of s.data.rel?.user ?? []) { const was = b.aff[norm(r.name)]; if (was !== undefined && was !== r.aff) aff.push([r.name, r.aff - was]); }
    const labels = [...b.labels, ...info.labels.slice(info.cut ?? 0)].filter(l => !/^📅|^🕐/.test(l));
    info.cut = info.labels.length;
    if (labels.length || aff.length || (cashNow !== null && b.cash !== null && cashNow !== b.cash)) {
        const dd = cal ? dateFromIndex(cal, dayIdx) : null;
        const day = { date: dd ? dateStr(cal, dd.y, dd.m, dd.d) : `${s.turn}턴`, cash: cashNow !== null && b.cash !== null ? cashNow - b.cash : 0, cur: s.data.wallet?.currency ?? '', aff: aff.sort((a, c) => Math.abs(c[1]) - Math.abs(a[1])).slice(0, 5), labels: labels.slice(-30), n: labels.length };
        (s.days ??= []).push(day);
        if (s.days.length > 30) s.days.shift();
        if (settings().daySummary) info.alerts.push({ kind: 'day', day });
    }
    s.dayBuf = startDay(s);
}
function startDay(s) {
    return { cash: s.data.wallet?.cash ?? null, aff: Object.fromEntries((s.data.rel?.user ?? []).map(r => [norm(r.name), r.aff])), labels: [] };
}

export function applyOp(s, rawKey, rawVal, info) {
    let key = KEYMAP[String(rawKey).trim().toLowerCase()] ?? (String(rawKey).startsWith('_') ? String(rawKey) : null);
    let val = String(rawVal ?? '').trim();
    if (!key) {
        const nm = String(rawKey).trim();
        if (s.data.stats && findBy(s.data.stats.bars, nm)) { key = 'stat'; val = `${nm} ${val}`; }
        else if (s.data.stats && findBy(s.data.stats.attrs, nm)) { key = 'attr'; val = `${nm} ${val}`; }
        else if (s.data.wallet && norm(nm) === norm(s.data.wallet.currency)) key = 'cash';
        else return;
    }
    const mod = KEY_MOD[key];
    if (mod && info.mods && info.mods[mod] === false) return;
    if (!val && !key.startsWith('_')) return;
    const L = (t) => info.labels.push(t);
    const T = (s.tally ??= { earn: 0, spend: 0, places: [], rolls: 0, good: 0, crit: 0, fumble: 0, sent: 0, got: 0, quests: 0, curses: 0 });
    switch (key) {
        case '_alert': if (val) info.alerts.push(val); return;
        case 'bgm': {
            const mu = ensure(s, 'music');
            const [head, mood, why] = splitBar(val);
            const hm = head.match(/^(.+?)\s+(?:-|–|—|by|\/)\s+(.+)$/i);
            const title = (hm ? hm[1] : head).replace(/^["“'「『]|["”'」』]$/g, '').trim();
            const artist = hm ? hm[2].replace(/^["“'「『]|["”'」』]$/g, '').trim() : '';
            if (!title || norm(title) === norm(mu.now?.title) || /^(없음|none|-)$/i.test(title)) return;
            // 가벼운 모델이 매 턴 곡을 바꾸지 않게: 본편 답에서는 3턴에 한 번까지 (버튼으로 고른 건 바로)
            const fromAI = !String(info.seed).includes(':adj:');
            if (fromAI && mu.turn !== undefined && s.turn - mu.turn < 3) return;
            if (fromAI) mu.turn = s.turn;
            mu.now = { title, artist, mood: mood ?? '', why: why ?? '', date: stamp(s) };
            mu.log.push(mu.now);
            if (mu.log.length > 30) mu.log.shift();
            L(`♪ ${short(title, 16)}`);
            info.alerts.push({ kind: 'music', title, artist, text: mood ?? '' });
            return;
        }
        case 'sns': {
            const sn = ensure(s, 'sns');
            const [author, text, pic, tags] = splitBar(val);
            if (!author || !(text || pic)) return;
            if (!String(info.seed).includes(':adj:')) { if (sn.turn !== undefined && s.turn - sn.turn < 2) return; sn.turn = s.turn; } // 본편 답에서는 2턴에 한 번까지
            sn.posts.push({ id: `${info.seed}:s${sn.posts.length}`, author, text: text ?? '', pic: pic ?? '', tags: tags ?? '', likes: Math.floor(seeded(`${info.seed}:sl${sn.posts.length}`)() * 60) + 3, date: stamp(s), mine: false, liked: false, replies: [] });
            L(`#️⃣ ${author}`);
            if (findBy(s.data.rel?.user ?? [], author)) info.alerts.push({ kind: 'sns', who: author, text: text || pic });
            return;
        }
        case 'custom': {
            const cu = ensure(s, 'custom');
            let [tn, rest] = splitBar(val);
            if (rest === undefined) { rest = tn; tn = ''; }
            const m = rest.match(/^\s*\+?\s*(.+?)\s*(?:=\s*(.+)|([+\-−]\s*[\d.,]+))\s*$/);
            if (!m) return;
            const fname = m[1].trim();
            let tab = tn ? findBy(cu.tabs, tn) : cu.tabs.find(t => findBy(t.fields, fname, 'k'));
            if (!tab) { if (!tn) return; tab = { name: tn.trim(), icon: '📌', note: '', inject: true, fields: [] }; cu.tabs.push(tab); }
            let f = findBy(tab.fields, fname, 'k');
            const isNum = m[3] !== undefined || /^[+\-−]?[\d.,]+$/.test(String(m[2] ?? '').trim());
            if (!f) { f = { k: fname, type: isNum ? 'num' : 'text', v: isNum ? 0 : '', max: 100, desc: '' }; tab.fields.push(f); }
            if (f.type === 'text') { const v = String(m[2] ?? m[3] ?? '').trim(); if (v !== f.v) { f.v = v; L(`${tab.icon} ${f.k}: ${short(v, 14)}`); } return; }
            const p = parseNum(m[3] !== undefined ? m[3].replace(/\s+/g, '') : `=${m[2]}`);
            if (!p) return;
            const b = f.v;
            f.v = p.mode === 'add' ? b + p.v : p.v;
            if (f.type === 'bar') f.v = clamp(f.v, 0, f.max);
            if (f.v !== b) L(`${tab.icon} ${f.k} ${signed(f.v - b)}`);
            return;
        }
        case 'life': {
            if (!settings().offscreen) return;
            const rl = ensure(s, 'rel');
            const [who, text] = splitBar(val);
            if (!who || !text) return;
            rl.life.push({ who, text, date: stamp(s) });
            if (rl.life.length > 20) rl.life.shift();
            L(`🌙 ${who}`);
            info.alerts.push({ kind: 'life', who, text });
            return;
        }
        case 'jealous': {
            const rl = ensure(s, 'rel');
            const m = val.match(/^(.+?)\s*([=+\-−]\s*[\d.]+)\s*$/); if (!m) return;
            const r = findBy(rl.user, m[1]); if (!r) return;
            const p = parseNum(m[2].replace(/\s+/g, '')); if (!p) return;
            const b = r.jealous; r.jealous = clamp(Math.round(p.mode === 'add' ? b + p.v : p.v), 0, 100);
            if (r.jealous !== b) L(`💢 ${r.name} ${signed(r.jealous - b)}`);
            return;
        }
        case '_peekday': { s.peek = { day: today(s) ?? s.turn, n: ((s.peek?.day === (today(s) ?? s.turn)) ? s.peek.n : 0) + 1 }; return; }
        case 'curse': {
            const [n0, eff, days, cure, kind] = splitBar(val);
            const nm = n0.replace(/^[+\-−]\s*/, '').trim();
            if (!nm) return;
            const f = ensure(s, 'fate');
            if (/^[-−]/.test(n0) || /^(해제|없음|풀림)$/.test(eff ?? '')) {
                const ex = findBy(f.curses, nm);
                if (ex) { f.curses.splice(f.curses.indexOf(ex), 1); L(`해제: ${ex.name}`); }
                return;
            }
            addCurse(s, { name: nm, kind: /축복|bless/i.test(`${kind ?? ''}${rawKey}`) ? 'bless' : 'curse', effects: String(eff ?? '').split(/\s*[,，]\s*/).filter(Boolean), days: parseInt(days, 10) > 0 ? parseInt(days, 10) : null, cure: cure ?? '' }, info);
            return;
        }
        case '_effect': applyLines(s, val, info); return;
        case 'weather': { const cal = ensure(s, 'calendar'); if (val !== cal.weather) { cal.weather = val; L(`날씨: ${val}`); } return; }
        case '_travel': {
            // 지도에서 이동: 위치 + 칸 수만큼 시간대가 흐름(하루를 넘기면 날짜도) + 요금
            const mp = s.data.map; if (!mp) return;
            const p = findBy(mp.places, val); if (!p) return;
            if (norm(p.name) === norm(mp.here)) return; // 이미 여기
            const hops = hopsBetween(mp, mp.here, p.name);
            applyOp(s, 'loc', p.name, info);
            const cal = s.data.calendar;
            if (cal && hops > 0 && info.mods?.calendar !== false) {
                let i = Math.max(0, cal.times.indexOf(cal.time)), days = 0;
                for (let k = 0; k < hops; k++) { i++; if (i >= cal.times.length) { i = 0; days++; } }
                if (days) applyOp(s, 'date', `+${days}`, info);
                applyOp(s, 'time', cal.times[i], info);
            }
            if (p.fare && s.data.wallet) applyOp(s, 'cash', `-${p.fare}`, info);
            return;
        }
        case '_trash': case '_sellused': {
            const hm = s.data.home; if (!hm) return;
            const [nm, price] = splitBar(val);
            const k = hm.storage.findIndex(x => norm(x) === norm(nm)); if (k < 0) return;
            const item = hm.storage.splice(k, 1)[0];
            if (key === '_trash') { hm.trash.push({ name: item, date: stamp(s) }); if (hm.trash.length > 20) hm.trash.shift(); L(`🗑 ${item}`); }
            else { const p = Math.max(0, Math.round(num(price, 0))); if (p) applyOp(s, 'cash', `+${p}`, info); L(`♻ ${item} 중고 판매`); }
            return;
        }
        case '_restore': {
            const hm = s.data.home; if (!hm) return;
            const k = hm.trash.findIndex(x => norm(x.name) === norm(val)); if (k < 0) return;
            hm.storage.push(hm.trash.splice(k, 1)[0].name); L(`↩ ${val}`);
            return;
        }
        case '_draw': {
            // 뽑은 카드 자체를 기록에 담는다 (나중에 덱을 고쳐도 지난 결과가 바뀌지 않게). 옛 기록(번호)도 읽는다.
            let card = null;
            try { card = val.startsWith('{') ? JSON.parse(val) : s.data.fate?.deck[Number(val)]; } catch { /* broken */ }
            if (card?.title) drawCard(s, card, info);
            return;
        }
        case '_loan': {
            const w = ensure(s, 'wallet');
            const [kind0, amt0, item] = splitBar(val);
            const kind = LOAN_KIND[kind0] ? kind0 : 'bank';
            const amount = Math.max(0, Math.round(num(amt0, 0)));
            if (!amount) return;
            const K = LOAN_KIND[kind];
            const t = today(s);
            if (kind === 'pawn' && item) { const ex = findBy(w.items, item); if (!ex) return; ex.qty -= 1; if (ex.qty <= 0) w.items.splice(w.items.indexOf(ex), 1); }
            w.loans.push({ id: `${info.seed}:loan${w.loans.length}`, kind, lender: K.name, principal: amount, owed: Math.round(amount * (1 + K.rate / 100)), due: t === null ? null : t + K.days, item: item ?? '', status: 'open' });
            w.cash += amount;
            L(`💰 ${K.name} +${fmtNum(amount)}`);
            return;
        }
        case '_repay': {
            const w = s.data.wallet; if (!w) return;
            const l = w.loans.find(x => x.id === val && (x.status === 'open' || x.status === 'late'));
            if (!l || w.cash < l.owed) return;
            w.cash -= l.owed; l.status = 'paid';
            if (l.kind === 'pawn' && l.item) { const ex = findBy(w.items, l.item); if (ex) ex.qty++; else w.items.push({ name: l.item, qty: 1, desc: '', effect: '' }); }
            L(`💸 ${l.lender} 빚 청산 −${fmtNum(l.owed)}`);
            liftDebtCurse(s, info);
            return;
        }
        case 'stat': {
            const st = ensure(s, 'stats');
            const m = val.match(/^(.+?)\s*(max|최대)?\s*([=+\-−][\d.,]+|\d[\d.,]*)\s*$/i);
            if (!m) return;
            let bar = findBy(st.bars, m[1]);
            if (!bar) { bar = { name: m[1].trim(), cur: 100, max: 100, color: '', desc: '' }; st.bars.push(bar); }
            const p = parseNum(m[3]);
            if (!p) return;
            if (m[2]) { const b = bar.max; bar.max = Math.max(1, p.mode === 'add' ? bar.max + p.v : p.v); bar.cur = Math.min(bar.cur, bar.max); L(`${bar.name} 최대 ${signed(bar.max - b)}`); return; }
            const before = bar.cur;
            bar.cur = clamp(p.mode === 'add' ? bar.cur + p.v : p.v, 0, bar.max);
            if (bar.cur !== before) L(`${bar.name} ${signed(bar.cur - before)}`);
            if (before > 0 && bar.cur <= 0) info.alerts.push(`${bar.name}이(가) 0이 되었다`);
            return;
        }
        case 'attr': {
            const st = ensure(s, 'stats');
            const m = val.match(/^(.+?)\s*([=+\-−][\d.]+|\d[\d.]*)\s*$/);
            if (!m) return;
            let a = findBy(st.attrs, m[1]);
            if (!a) { a = { name: m[1].trim(), val: 0, desc: '' }; st.attrs.push(a); }
            const p = parseNum(m[2]); if (!p) return;
            const b = a.val; a.val = Math.round(p.mode === 'add' ? a.val + p.v : p.v);
            if (a.val !== b) L(`${a.name} ${signed(a.val - b)}`);
            return;
        }
        case 'cond': {
            const st = ensure(s, 'stats');
            const [n0, desc] = splitBar(val);
            const rm = /^[-−]/.test(n0);
            const name = n0.replace(/^[+\-−]\s*/, '');
            if (!name) return;
            const ex = findBy(st.conds, name);
            if (rm || /^(해제|없음)$/.test(desc ?? '')) { if (ex) { st.conds.splice(st.conds.indexOf(ex), 1); L(`해제: ${ex.name}`); } return; }
            if (ex) { if (desc) ex.desc = desc; return; }
            st.conds.push({ name, desc: desc ?? '' }); L(`상태: ${name}`);
            return;
        }
        case 'cash': {
            const w = ensure(s, 'wallet');
            const p = parseNum(val); if (!p) return;
            const b = w.cash; w.cash = Math.max(0, p.mode === 'add' ? w.cash + p.v : p.v);
            if (w.cash > b) T.earn += w.cash - b; else T.spend += b - w.cash;
            if (w.cash !== b) L(`${w.currency} ${signed(w.cash - b)}`);
            return;
        }
        case 'item': {
            const w = ensure(s, 'wallet');
            const parts = val.includes('|') ? [val] : val.split(/\s*[,，/]\s*/);
            for (const part of parts) {
                const [head, desc] = splitBar(part);
                const m = head.match(/^([+\-−]?)\s*(.+?)(?:\s*[x×*]?\s*(\d+)\s*(?:개|장|병|권|통)?)?$/);
                if (!m) continue;
                const rm = m[1] === '-' || m[1] === '−';
                const name = m[2].trim(); const q = Math.max(1, parseInt(m[3] || '1', 10));
                if (!name) continue;
                const ex = findBy(w.items, name);
                if (rm) {
                    if (!ex) continue;
                    ex.qty -= q; if (ex.qty <= 0) w.items.splice(w.items.indexOf(ex), 1);
                    L(`−${ex.name}${q > 1 ? `×${q}` : ''}`);
                } else {
                    if (ex) { ex.qty += q; if (desc) ex.desc = desc; } else w.items.push({ name, qty: q, desc: desc ?? '' });
                    L(`+${name}${q > 1 ? `×${q}` : ''}`);
                }
            }
            return;
        }
        case 'stock': {
            const sh = ensure(s, 'shop');
            const [sn, iname, price, desc] = splitBar(val);
            if (!sn || !iname) return;
            let shop = findBy(sh.shops, sn);
            if (!shop) { shop = { name: sn, desc: '', place: '', items: [] }; sh.shops.push(shop); }
            const rm = /^[-−]/.test(iname); const nm = iname.replace(/^[+\-−]\s*/, '');
            const ex = findBy(shop.items, nm);
            if (rm) { if (ex) { shop.items.splice(shop.items.indexOf(ex), 1); L(`🏪 ${shop.name} −${ex.name}`); } return; }
            const pr = parseNum(price)?.v;
            if (ex) { if (pr !== undefined) ex.price = Math.abs(pr); if (desc) ex.desc = desc; }
            else shop.items.push({ name: nm, price: Math.abs(pr ?? 0), desc: desc ?? '', kind: /가구|장식|deco/i.test(desc ?? '') ? 'deco' : 'item', stock: -1 });
            L(`🏪 ${shop.name}: ${nm}`);
            return;
        }
        case 'decor': {
            const hm = ensure(s, 'home');
            const [n0, roomName] = splitBar(val);
            const rm = /^[-−]/.test(n0); const nm = n0.replace(/^[+\-−]\s*/, '');
            if (!nm) return;
            if (rm) {
                for (const r of hm.rooms) { const k = r.decor.findIndex(x => norm(x) === norm(nm)); if (k >= 0) { r.decor.splice(k, 1); break; } }
                const k = hm.storage.findIndex(x => norm(x) === norm(nm)); if (k >= 0) hm.storage.splice(k, 1);
                L(`🏠 −${nm}`); return;
            }
            const room = roomName ? findBy(hm.rooms, roomName) : null;
            const si = hm.storage.findIndex(x => norm(x) === norm(nm));
            if (room) {
                if (si >= 0) hm.storage.splice(si, 1);
                else for (const r of hm.rooms) { const k = r.decor.findIndex(x => norm(x) === norm(nm)); if (k >= 0) { r.decor.splice(k, 1); break; } }
                room.decor.push(nm); L(`🏠 ${room.name}에 ${nm}`);
            } else { hm.storage.push(nm); L(`🏠 창고 +${nm}`); }
            return;
        }
        case '_unplace': {
            const hm = ensure(s, 'home');
            for (const r of hm.rooms) { const k = r.decor.findIndex(x => norm(x) === norm(val)); if (k >= 0) { r.decor.splice(k, 1); hm.storage.push(val); return; } }
            return;
        }
        case 'room': {
            const hm = ensure(s, 'home');
            const [n0, desc] = splitBar(val);
            const nm = n0.replace(/^[+]\s*/, '');
            const ex = findBy(hm.rooms, nm);
            if (ex) { if (desc) ex.desc = desc; } else { hm.rooms.push({ name: nm, desc: desc ?? '', decor: [] }); L(`🏠 새 공간: ${nm}`); }
            return;
        }
        case 'loc': {
            const mp = ensure(s, 'map');
            const [nm, desc] = splitBar(val);
            if (!nm) return;
            let p = findBy(mp.places, nm);
            if (!p) {
                const from = findBy(mp.places, mp.here);
                p = { name: nm, desc: desc ?? '', kind: '', x: NaN, y: NaN, links: from ? [from.name] : [], known: true };
                if (from && !from.links.some(l => norm(l) === norm(nm))) from.links.push(nm);
                mp.places.push(p);
            }
            p.known = true;
            if (!T.places.some(x => norm(x) === norm(p.name))) T.places.push(p.name);
            if (norm(mp.here) !== norm(p.name)) { mp.here = p.name; L(`📍 ${p.name}`); }
            return;
        }
        case 'place': {
            const mp = ensure(s, 'map');
            const [nm, desc, links] = splitBar(val);
            if (!nm) return;
            let p = findBy(mp.places, nm);
            const lk = String(links ?? '').split(/\s*[,，]\s*/).filter(Boolean);
            if (!p) { p = { name: nm, desc: desc ?? '', kind: '', x: NaN, y: NaN, links: lk, known: true }; mp.places.push(p); L(`🗺️ 새 장소: ${nm}`); }
            else { if (desc) p.desc = desc; if (!p.known) L(`🗺️ 발견: ${p.name}`); p.known = true; for (const l of lk) if (!p.links.some(x => norm(x) === norm(l))) p.links.push(l); }
            for (const l of lk) { const q = findBy(mp.places, l); if (q && !q.links.some(x => norm(x) === norm(p.name))) q.links.push(p.name); }
            return;
        }
        case 'aff': case 'trust': {
            const rl = ensure(s, 'rel');
            const m = val.match(/^(.+?)\s*([=+\-−]\s*[\d.]+|\d[\d.]*)\s*(?:\|\s*(.*))?$/);
            if (!m) return;
            const nm = m[1].trim();
            let r = findBy(rl.user, nm);
            if (!r) { r = { name: nm, label: '', aff: 0, trust: 0, memo: '', stage: -1, jealous: 0, met: s.data.calendar ? dateShort(s.data.calendar) : '' }; rl.user.push(r); }
            const p = parseNum(m[2].replace(/\s+/g, '')); if (!p) return;
            if (key === 'aff' && p.mode === 'add' && p.v > 0) p.v = p.v * affMul(s); // 저주·축복의 호감 % 효과
            const b = r[key]; r[key] = clamp(Math.round(p.mode === 'add' ? b + p.v : p.v), -100, 100);
            if (m[3]) r.memo = m[3];
            if (r[key] !== b) L(`${key === 'aff' ? '♥' : '🤝'} ${r.name} ${signed(r[key] - b)}`);
            if (key === 'aff' && r[key] > b) jealousyFrom(s, r.name, r[key] - b, info);
            updateStage(s, r, info);
            return;
        }
        case 'rel': {
            const rl = ensure(s, 'rel');
            let nm, label, memo;
            if (val.includes('=')) { [nm, label] = val.split('=').map(x => x.trim()); [label, memo] = splitBar(label); }
            else [nm, label, memo] = splitBar(val);
            if (!nm) return;
            let r = findBy(rl.user, nm);
            if (!r) { r = { name: nm, label: '', aff: 0, trust: 0, memo: '', stage: -1, jealous: 0, met: s.data.calendar ? dateShort(s.data.calendar) : '' }; rl.user.push(r); updateStage(s, r, info, true); }
            if (label && label !== r.label) { r.label = label; L(`💞 ${r.name} = ${label}`); }
            if (memo) r.memo = memo;
            return;
        }
        case 'pair': {
            const rl = ensure(s, 'rel');
            const m = val.match(/^(.+?)\s*(?:&|와|과|,|↔|-)\s*(.+?)\s*[=|]\s*(.+)$/);
            if (!m) return;
            const [label, memo] = splitBar(m[3]);
            const ex = rl.pairs.find(p => (norm(p.a) === norm(m[1]) && norm(p.b) === norm(m[2])) || (norm(p.a) === norm(m[2]) && norm(p.b) === norm(m[1])));
            if (ex) { ex.label = label; if (memo) ex.memo = memo; } else rl.pairs.push({ a: m[1].trim(), b: m[2].trim(), label, memo: memo ?? '' });
            L(`💞 ${m[1].trim()}↔${m[2].trim()}: ${label}`);
            return;
        }
        case 'date': {
            const cal = ensure(s, 'calendar');
            const p = /^[+\-−]\s*\d/.test(val) ? parseNum(val.replace(/일.*$/, '')) : null;
            const before = dayIndex(cal);
            if (p) addDays(cal, p.v);
            else {
                const dt = parseDate(cal, val); if (!dt) return;
                cal.y = dt.y ?? cal.y;
                if (dt.y === null && (dt.m < cal.m || (dt.m === cal.m && dt.d < cal.d))) cal.y++;
                cal.m = clamp(dt.m, 1, cal.months.length); cal.d = clamp(dt.d, 1, cal.months[cal.m - 1].days);
            }
            const diff = dayIndex(cal) - before;
            if (diff > 0) dayTick(s, info, before, dayIndex(cal));
            if (diff) {
                L(`📅 ${diff > 0 ? `+${diff}일` : `${diff}일`}`);
                const ev = eventsOn(cal, cal.y, cal.m, cal.d);
                if (ev.length) info.alerts.push(`오늘의 일정: ${ev.map(e => e.title).join(', ')}`);
            }
            return;
        }
        case 'time': {
            const cal = ensure(s, 'calendar');
            if (val !== cal.time) { cal.time = val; L(`🕐 ${val}`); }
            return;
        }
        case 'event': {
            const cal = ensure(s, 'calendar');
            const [when, title, desc] = splitBar(val);
            const dt = parseDate(cal, when);
            if (!dt || !title) return;
            const rm = /^[-−]/.test(title); const tt = title.replace(/^[+\-−]\s*/, '');
            const k = cal.events.findIndex(e => norm(e.title) === norm(tt));
            if (rm) { if (k >= 0) cal.events.splice(k, 1); return; }
            const e = { y: dt.y ?? (dt.m < cal.m || (dt.m === cal.m && dt.d < cal.d) ? cal.y + 1 : cal.y), m: dt.m, d: dt.d, title: tt, desc: desc ?? '', repeat: 'once' };
            if (k >= 0) cal.events[k] = { ...cal.events[k], ...e }; else cal.events.push(e);
            L(`📅 일정: ${tt}`);
            return;
        }
        case 'ach': {
            const ac = ensure(s, 'ach');
            const [nm, desc] = splitBar(val);
            const rm = /^[-−]/.test(nm); const n = nm.replace(/^[+\-−]\s*/, '');
            let a = findBy(ac.list, n);
            if (rm) { if (a) a.done = false; return; }
            if (!a) { a = { name: n, desc: desc ?? '', done: false, hidden: false, at: '' }; ac.list.push(a); }
            if (!a.done) {
                a.done = true; a.at = stamp(s);
                L(`🏆 ${a.name}`); info.alerts.push(`업적 달성 — ${a.name}`);
            }
            return;
        }
        case 'memo': {
            const mm = ensure(s, 'memo');
            mm.list.push({ id: `${info.seed}:${mm.list.length}`, text: val, by: 'ai', inject: true, pin: false });
            if (mm.list.length > 40) { const k = mm.list.findIndex(x => x.by === 'ai' && !x.pin); if (k >= 0) mm.list.splice(k, 1); }
            L('📝 메모');
            return;
        }
        case 'msg': {
            const ct = ensure(s, 'contact');
            const [nm, ...rest] = splitBar(val);
            const text = rest.join(' | ');
            if (!nm || !text) return;
            const who = findBy(ct.contacts, nm)?.name ?? nm.trim();
            if (!findBy(ct.contacts, who)) ct.contacts.push({ name: who, handle: '', status: '', courier: '' });
            const t = nowTick(s, info.meta);
            const letter = ct.mode === 'letter';
            const cour = letter ? (findBy(ct.couriers, findBy(ct.contacts, who)?.courier)?.name ?? ct.couriers[0]?.name ?? '') : '';
            (ct.threads[who] ??= []).push({ id: `${info.seed}:m${ct.threads[who].length}`, from: 'them', text, date: stamp(s), at: t, arrive: t, courier: cour, express: false, rush: false, pending: false, fee: 0, edited: false, ping: true });
            if (ct.threads[who].length > 80) ct.threads[who] = ct.threads[who].slice(-80);
            ct.unread[who] = (ct.unread[who] ?? 0) + 1;
            touchContact(ct, who);
            T.got++;
            L(`${letter ? '✉️ 편지' : '💬'} ${who}`);
            info.alerts.push({ kind: 'msg', who, text, letter });
            return;
        }
        case '_read': {
            const ct = s.data.contact; if (ct) delete ct.unread[val];
            return;
        }
        case 'npc': {
            const pf = ensure(s, 'profile');
            const [nm, summary] = splitBar(val);
            if (!nm) return;
            const ex = findBy(pf.list, nm);
            if (ex) { if (summary && !ex.summary) ex.summary = summary; return; }
            pf.list.push({ name: nm.trim(), role: 'npc', summary: summary ?? '', fields: [] });
            L(`👤 ${nm.trim()}`);
            return;
        }
        case 'roll': {
            const [label, dc] = splitBar(val);
            info.roll = { label: label.trim(), dc: num(parseNum(dc)?.v, 0) };
            L(`🎲 판정 요청: ${label.trim()}`);
            return;
        }
        case '_roll': {
            const dc = ensure(s, 'dice');
            try { const r = JSON.parse(val); dc.log.push(r); T.rolls++; if (r.cls === 'ok' || r.cls === 'crit') T.good++; if (r.cls === 'crit') T.crit++; if (r.cls === 'fumble') T.fumble++; } catch { /* ignore */ }
            if (dc.log.length > 30) dc.log = dc.log.slice(-30);
            return;
        }
        case 'quest': {
            const qs = ensure(s, 'quest');
            const [title, st0, desc] = splitBar(val);
            if (!title) return;
            const st = QSTATUS[norm(st0)] ?? (st0 ? null : 'open');
            let q = findBy(qs.list, title, 'title');
            if (!q) {
                q = { id: `${info.seed}:q${qs.list.length}`, title: title.trim(), giver: '', desc: desc ?? (st ? '' : st0 ?? ''), place: '', deadline: '', reward: '', cash: 0, items: [], status: st ?? 'open', steps: [], paid: false };
                qs.list.push(q);
                L(`📜 ${QNAME[q.status]}: ${q.title}`);
                if (q.status === 'open' || q.status === 'active') info.alerts.push(`퀘스트 — ${q.title}`);
            } else if (st && st !== q.status) {
                q.status = st; L(`📜 ${q.title}: ${QNAME[st]}`);
            } else if (!st && st0) {
                q.steps.push({ text: st0, done: false }); L(`📜 ${q.title}: ${short(st0, 20)}`);
            }
            if (desc && st) q.desc ||= desc;
            if (q.status === 'done' && !q.paid) payQuest(s, q, info);
            return;
        }
        case '_questpay': {
            const q = s.data.quest?.list.find(x => x.id === val);
            if (q) { q.status = 'done'; if (!q.paid) payQuest(s, q, info); }
            return;
        }
        case 'news': {
            const nw = ensure(s, 'news');
            const [title, body, tag] = splitBar(val);
            if (!title) return;
            nw.items.push({ id: `${info.seed}:n${nw.items.length}`, title, body: body ?? '', tag: tag ?? '', date: stamp(s), read: false });
            L(`📰 ${short(title, 18)}`);
            return;
        }
        case 'rumor': {
            const gs = ensure(s, 'gossip');
            const [title, body, about] = splitBar(val);
            if (!title) return;
            gs.issues.push({ id: `${info.seed}:g${gs.issues.length}`, title, body: body ?? '', about: String(about ?? '').split(/\s*[,，]\s*/).filter(Boolean), heat: 2, date: stamp(s), read: false });
            L(`🍷 소문: ${short(title, 16)}`);
            return;
        }
        case 'post': {
            const bd = ensure(s, 'board');
            const [author, title, body] = splitBar(val);
            if (!title) return;
            bd.posts.push({ id: `${info.seed}:p${bd.posts.length}`, author: author || '익명', title, body: body ?? '', date: stamp(s), mine: false, tag: '', replies: [] });
            L(`📋 ${short(title, 18)}`);
            return;
        }
        case '_memo': {
            const mm = ensure(s, 'memo');
            const [op, a, b] = splitBar(val);
            if (op === 'add') mm.list.push({ id: `${info.seed}`, text: a, by: 'user', inject: true, pin: false });
            const it = mm.list.find(x => x.id === a);
            if (op === 'del' && it) mm.list.splice(mm.list.indexOf(it), 1);
            if (op === 'tog' && it && (b === 'inject' || b === 'pin')) it[b] = !it[b];
            return;
        }
        case '_achtog': {
            const ac = ensure(s, 'ach');
            const a = findBy(ac.list, val);
            if (a) { a.done = !a.done; a.at = a.done ? stamp(s) : ''; }
            return;
        }
        default: return;
    }
}
function payQuest(s, q, info) {
    q.paid = true;
    if (s.tally) s.tally.quests++;
    if (q.cash && s.data.wallet) applyOp(s, 'cash', `+${q.cash}`, info);
    for (const it of q.items) if (s.data.wallet) applyOp(s, 'item', `+${it}`, info);
    info.alerts.push(`퀘스트 완료 — ${q.title}${q.reward ? ` (${q.reward})` : ''}`);
}

export function freshState(base) {
    const data = {};
    for (const id of MOD_IDS) data[id] = base?.data?.[id] ? clone(base.data[id]) : null;
    const s = { core: clone(base?.core ?? EMPTY.core()), data, pendingRoll: null, recent: [], turn: 0, tally: clone(base?.tally) ?? null, days: clone(base?.days) ?? [], day0: base?.day0 ?? null };
    if (s.day0 === null && data.calendar) s.day0 = dayIndex(data.calendar);
    // 관계: 처음 단계 맞추기 (알림 없이)
    if (data.rel) { data.rel.stages ??= clone(DEFAULT_STAGES); data.rel.life ??= []; for (const r of data.rel.user ?? []) { r.jealous ??= 0; if (r.stage === undefined || r.stage === null || r.stage < 0) r.stage = stageIndex(data.rel.stages, r.aff, r.trust); } }
    if (data.ach) data.ach.endings ??= [];
    s.dayBuf = startDay(s);
    return s;
}
// 생일: 프로필 항목 「생일」을 달력에 (매년)
function birthdays(s) {
    const cal = s.data.calendar, pf = s.data.profile;
    if (!cal || !pf) return;
    for (const p of pf.list) {
        const f = p.fields.find(x => /생일|탄생일|birthday/i.test(x.k)); if (!f) continue;
        const dt = parseDate(cal, f.v); if (!dt) continue;
        const title = `🎂 ${p.name} 생일`;
        if (!cal.events.some(e => norm(e.title) === norm(title))) cal.events.push({ y: null, m: clamp(dt.m, 1, cal.months.length), d: dt.d, title, desc: '프로필에서 자동', repeat: 'yearly', auto: 'bday' });
    }
}
function resolveStart(meta, chat) {
    let st = Math.min(meta.startAt ?? 0, chat.length);
    if (meta.startKey && chat[st - 1]?.send_date !== meta.startKey) {
        const j = chat.findIndex(m => m.send_date === meta.startKey);
        if (j >= 0) st = j + 1;
    }
    return st;
}
function msgOps(m) {
    const ops = extractOps(m.mes);
    const extra = m.extra?.[MODULE]?.bySwipe?.[m.swipe_id ?? 0];
    if (Array.isArray(extra) && !ops.length) ops.push(...extra);
    return ops;
}

const adjEvents = new Map();
export function compute(limit, opts = {}) {
    const c = ctx();
    const meta = getMeta();
    if (!meta?.base) return null;
    const chat = c.chat ?? [];
    const s = freshState(meta.base);
    s.turn = meta.baseTurn ?? 0;
    const snaps = new Map();
    const n = Math.min(limit ?? chat.length, chat.length);
    const start = resolveStart(meta, chat);
    const adj = (meta.adjust ?? []).slice().sort((a, b) => a.at - b.at || a.t - b.t);
    const seed = String(c.getCurrentChatId?.() ?? MODULE);
    let lastAI = -1;
    for (let i = n - 1; i >= start; i--) if (isStoryAI(chat[i])) { lastAI = i; break; }
    let ai = 0;
    const runAdjust = (a) => {
        const info = { seed: `${seed}:adj:${a.t}`, labels: [], alerts: [], mods: meta.mods, meta, cut: 0 };
        if (a.set) {
            if (a.set.mod === 'core') s.core = clone(a.set.data);
            else if (MOD_IDS.includes(a.set.mod)) {
                s.data[a.set.mod] = clone(a.set.data);
                if (a.set.mod === 'rel') for (const r of s.data.rel.user) updateStage(s, r, info, true);
                if (a.set.mod === 'calendar' && s.day0 === null) s.day0 = dayIndex(s.data.calendar);
            }
        }
        for (const [k, v] of a.ops ?? []) applyOp(s, k, v, info);
        checkRules(s, info);
        if (a.label && !a.silent) s.dayBuf?.labels.push(a.label);
        adjEvents.set(a.t, info.alerts);
        if (a.at > lastAI && a.label && !a.silent) s.recent.push(a.label);
    };
    for (let i = start; i < n; i++) {
        while (ai < adj.length && adj[ai].at <= i) runAdjust(adj[ai++]);
        const m = chat[i];
        if (!isStoryAI(m)) continue;
        s.turn++;
        const ops = msgOps(m);
        if (!ops.length) continue;
        const info = { seed: `${seed}:${i}`, labels: [], alerts: [], mods: meta.mods, roll: null, meta, cut: 0 };
        for (const [k, v] of ops) applyOp(s, k, v, info);
        checkRules(s, info);
        s.dayBuf?.labels.push(...info.labels.slice(info.cut));
        snaps.set(i, { labels: info.labels, alerts: info.alerts, roll: info.roll, turn: s.turn });
        if (i === lastAI && info.roll) s.pendingRoll = info.roll;
    }
    const adjLimit = opts.bake ? n : Infinity;
    while (ai < adj.length && adj[ai].at <= adjLimit) runAdjust(adj[ai++]);
    for (const m of ['news', 'gossip', 'board', 'quest', 'sns']) if (s.data[m]) tidy(m, s.data[m]);
    try { birthdays(s); } catch (e) { console.warn(LOG, 'bday', e); }
    const cal = s.data.calendar;
    if (cal?.autoWeather && !cal.weather && modOn('calendar', meta)) cal.weather = pickWeather(cal, `${seed}:w${dayIndex(cal)}`);
    return { state: s, snaps, lastAI, rest: adj.slice(ai) };
}

// 직접 편집·구매·추가 지시 기록
export async function addAdjust(entry) {
    const meta = getMeta(true);
    meta.adjust ??= [];
    // 순서 보장: 같은 밀리초에 두 번 눌러도 누른 순서대로 다시 계산되게 (전에는 난수라 순서가 뒤바뀔 수 있었음)
    let t = Date.now();
    for (const e of meta.adjust) if (e.t >= t) t = e.t + 0.001;
    const a = { at: ctx().chat?.length ?? 0, t, ...entry };
    // 같은 칸을 통째로 덮는 기록이 이야기 진행 없이 또 오면, 앞 기록의 칸 데이터는 쓸모가 없다 (라벨만 남김) → 채팅 파일 비대 방지
    // (새 것 + 바로 앞 2개는 남겨서 '되돌리기'를 두 번까지 정확히 할 수 있게)
    if (a.set?.mod) { const same = meta.adjust.filter(e => e.at === a.at && e.set?.mod === a.set.mod); for (const e of same.slice(0, -2)) delete e.set; }
    meta.adjust.push(a);
    if (meta.adjust.length > 80) squash(meta);
    await saveMeta();
    app.refreshNow?.();
    for (const t of adjEvents.get(a.t) ?? []) app.notify ? app.notify(t) : toastr.info(esc(typeof t === 'string' ? t : t.text ?? ''), TITLE);
}
// 마지막 편집 되돌리기 (상태창에서 한 것만 · AI 답은 그대로)
export async function undoLast() {
    const meta = getMeta();
    const a = meta?.adjust?.at(-1);
    if (!a) return null;
    meta.adjust.pop();
    await saveMeta();
    app.refreshNow?.();
    return a;
}
export function commit(mod, data, label, extra = {}) {
    return addAdjust({ set: { mod, data: mod === 'core' ? NORM.core(data) : normalize(mod, data) }, label, ...extra });
}
const SQUASH_KEEP = 10; // 최근 이만큼의 메시지는 굳히지 않는다 (스와이프·다시 생성이 제대로 되게)
export function squash(meta) {
    const chat = ctx().chat ?? [];
    const start = resolveStart(meta, chat);
    let cut = Math.max(start, chat.length - SQUASH_KEEP);
    let r = compute(cut, { bake: true });
    if (!r) return;
    if (r.rest.length > 150) { cut = chat.length; r = compute(cut, { bake: true }); } // 최근 기록이 너무 많으면 전부 굳힘
    if (settings().autoSave && meta.base) {
        // 굳히기 전에 지금 기준점을 자동 세이브로 (분기·실수 대비, 최근 3개)
        meta.saves = arr(meta.saves).filter(x => !x.auto).concat(arr(meta.saves).filter(x => x.auto).slice(-1), [{ id: uid(), auto: true, name: '자동 세이브', t: Date.now(), at: meta.startAt ?? 0, key: meta.startKey ?? null, base: clone(meta.base), baseTurn: meta.baseTurn ?? 0, adjust: clone(meta.adjust ?? []), mods: { ...meta.mods }, difficulty: meta.difficulty }]);
    }
    meta.base = { core: r.state.core, data: r.state.data, tally: r.state.tally, days: r.state.days, day0: r.state.day0 };
    meta.baseTurn = r.state.turn;
    meta.startAt = cut;
    meta.startKey = chat[cut - 1]?.send_date ?? null;
    meta.adjust = r.rest;
}

// ───── 편지 계산 ─────
export function dueLetters(s, meta = getMeta()) {
    const ct = s?.data?.contact;
    if (!ct) return [];
    const now = nowTick(s, meta);
    const out = [];
    for (const [who, th] of Object.entries(ct.threads)) for (const m of th) if (m.pending && (m.arrive ?? 0) <= now) out.push({ who, m });
    return out;
}
export function inTransit(s, meta = getMeta()) {
    const ct = s?.data?.contact;
    if (!ct || ct.mode !== 'letter') return [];
    const now = nowTick(s, meta);
    const out = [];
    for (const [who, th] of Object.entries(ct.threads)) for (const m of th) if ((m.arrive ?? -Infinity) > now) out.push({ who, m, left: m.arrive - now });
    return out;
}
export function unreadCount(s, meta = getMeta()) {
    const ct = s?.data?.contact;
    if (!ct || !modOn('contact', meta)) return 0;
    return Object.values(ct.unread ?? {}).reduce((a, b) => a + b, 0) + dueLetters(s, meta).length;
}

// ───── 프롬프트 주입 ─────
export function tagKeysFor(meta) {
    const K = [];
    const on = (id) => modOn(id, meta);
    if (on('stats')) K.push('stat (게이지이름 ±N, e.g. 체력 -12 · 체력 max +10) · attr (능력치 ±1, only after real growth) · cond (+이름 | 효과 / -이름)');
    if (on('wallet')) K.push('cash (±N) · item (+이름 2 | 설명 / -이름 1)');
    if (on('shop')) K.push('stock (상점 | 상품 | 가격 | 설명 — when the story adds goods; 상점 | -상품 removes)');
    if (on('home')) K.push('decor (+가구 | 방 — when {{user}} gets/places furniture) · room (+새 공간 | 설명)');
    if (on('map')) K.push('loc (장소 — whenever {{user}} moves) · place (이름 | 설명 | 이어진곳 — newly discovered place)');
    if (on('rel')) K.push('aff (이름 ±N — affection) · trust (이름 ±N) · rel (이름 = 관계 이름, when it truly changes) · pair (A & B = 관계)');
    if (on('calendar')) K.push('days (+1 when days pass / 3월 14일 to jump) · period (one of the time slots) · weather (only when the story changes it) · event (날짜 | 제목 | 설명 — a new appointment)');
    if (on('quest')) K.push('quest (제목 | 새/수락/완료/실패 | 설명 — a new request appears, {{user}} accepts, or it ends; 제목 | 진행 내용 = progress)');
    if (on('news')) K.push('news (헤드라인 | 내용 — only for big public events)');
    if (on('gossip')) K.push('rumor (제목 | 내용 | 관련 인물 — when people start whispering about something)');
    if (on('board')) K.push('post (작성자 | 제목 | 내용 — rarely, a public notice/post appears)');
    if (on('ach')) K.push('ach (업적 이름 — only when its condition is truly met)');
    if (on('memo')) K.push('memo (a short note worth keeping: promise, clue, goal — rarely)');
    if (on('contact')) K.push('msg (이름 | 내용 — someone sends {{user}} a message/letter from afar; occasionally, not every turn)');
    if (on('profile')) K.push('npc (이름 | 한 줄 소개 — a new named character who will matter)');
    if (on('dice')) K.push('roll (판정 이름 | 난이도 — ask {{user}} to roll instead of deciding a risky outcome yourself)');
    if (on('fate')) K.push('curse (이름 | 효과1, 효과2 | 일수 | 풀리는 조건 — only when the story truly curses or blesses {{user}}; -이름 lifts it)');
    if (on('rel') && settings().jealousy) K.push('jealous (이름 ±N — someone gets jealous of {{user}} with another, or is reassured)');
    if (on('rel') && settings().offscreen) K.push('life (이름 | 화면 밖에서 한 일 — only right after days pass, 1-2 people not in the scene, small believable things)');
    if (on('sns')) K.push('sns (작성자 | 글 | 사진 묘사 | #태그 — a character posts on social media; rarely, when it fits)');
    if (on('music')) K.push(`bgm (곡 제목 - 가수 | 분위기 — ONLY when the scene's mood clearly shifts; a REAL existing song that fits${musicTaste() ? `, taste: ${musicTaste()}` : ''}; never quote lyrics)`);
    if (on('custom')) K.push('custom (탭 | 항목 ±N  or  탭 | 항목 = 글 — the user\'s own tracked values below)');
    return K;
}

const musicTaste = () => { try { return app.current?.state?.data?.music?.taste || settings().musicTaste || ''; } catch { return settings().musicTaste || ''; } };

// ───── 칸별 보내는 때: always · kw(관련 말이 나올 때만) · n3 · n5 ─────
const KW = {
    shop: (d) => ['상점', '가게', '구매', '사러', '살까', '팔', '시장', '쇼핑', 'shop', ...(d.shop?.shops ?? []).flatMap(x => [x.name, x.place])],
    home: (d) => ['집', '방', '본거지', '숙소', '기숙사', '가구', d.home?.name, ...(d.home?.rooms ?? []).map(r => r.name)],
    news: () => ['뉴스', '소식', '신문', '방송', '기사', '보도', '관보'],
    gossip: () => ['소문', '가십', '스캔들', '루머', '수군'],
    board: () => ['게시판', '게시글', '커뮤', '글 올', '댓글'],
    ach: () => ['업적'],
    sns: (d) => ['sns', 'SNS', '인스타', '피드', '게시물', '올렸', '좋아요', '팔로', d.sns?.name],
    quest: (d) => ['의뢰', '퀘스트', '임무', '부탁', '목표', ...(d.quest?.list ?? []).filter(q => q.status !== 'done' && q.status !== 'failed').map(q => q.title)],
    custom: (d) => (d.custom?.tabs ?? []).flatMap(t => [t.name, ...t.fields.map(f => f.k)]),
    profile: (d) => (d.profile?.list ?? []).map(p => p.name),
    memo: (d) => (d.memo?.list ?? []).filter(m => m.inject).flatMap(m => String(m.text).split(/[\s,.!?·]+/).filter(w => w.length >= 2).slice(0, 4)),
};
export const FREQ_MODS = ['shop', 'home', 'news', 'gossip', 'board', 'ach', 'quest', 'sns', 'custom', 'memo'];
export function dueTester(set, s) {
    const plan = set.injEvery ?? {};
    if (!Object.keys(plan).length) return () => true;
    const n = clamp(parseInt(set.sceneTurns, 10) || 6, 1, 40);
    const text = (ctx().chat ?? []).slice(-n).map(m => stripStatus(m?.mes)).join('\n').toLowerCase();
    return (id) => {
        const v = plan[id] ?? 'always';
        if (v === 'always') return true;
        if (v === 'n3' || v === 'n5') return (s.turn % (v === 'n3' ? 3 : 5)) === 0;
        if (v === 'kw') return (KW[id]?.(s.data) ?? []).some(w => w && String(w).length >= 1 && text.includes(String(w).toLowerCase()));
        return true;
    };
}

// ───── 변화 위주로 보내기: N턴마다 전체, 그 사이엔 핵심 + 바뀐 것만 ─────
export function deltaPlan(r, set = settings()) {
    if (!set.deltaMode || !r) return null;
    const N = clamp(parseInt(set.deltaEvery, 10) || 4, 2, 20);
    const t = r.state.turn;
    const k = t % N;
    if (k === 0) return null; // 이번 턴은 전체
    const last = r.snaps.get(r.lastAI);
    if (last?.labels.some(l => /^📍|^💞|^💔/.test(l))) return null; // 장소·관계 단계가 바뀐 직후엔 전체
    const changes = [];
    for (const sn of r.snaps.values()) if (sn.turn > t - k) changes.push(...sn.labels.filter(l => !l.startsWith('🎲')));
    return { changes, left: N - k };
}

// ───── 장면 필터: 최근 대화에 나온 인물만 자세히 ─────
export function sceneTester(set = settings(), s = null) {
    if (!set.sceneFilter) return () => true;
    const n = clamp(parseInt(set.sceneTurns, 10) || 6, 1, 40);
    const chat = ctx().chat ?? [];
    const text = chat.slice(-n).map(m => `${m?.name ?? ''}\n${stripStatus(m?.mes)}`).join('\n');
    const always = new Set(chatCharacters().map(ch => norm(ch.name)));
    // 일과상 지금 {{user}}와 같은 곳에 있는 사람도 장면에 넣는다
    if (s?.data.map?.here) for (const nm of peopleAt(s, s.data.map.here).now) always.add(norm(nm));
    return (name) => {
        const nm = String(name ?? '').trim();
        if (!nm) return false;
        if (always.has(norm(nm)) || text.includes(nm)) return true;
        return nm.split(/[\s·.]+/).some(part => part.length >= 2 && text.includes(part));
    };
}
const MOD_SHORT = { easy: '이지', normal: '보통', hard: '하드' };

// 연락 → 본편 반영: 반영 모드(끔·자동·고른 것만·요약)와 연락처별 예외를 따라 고른다
export function contactPicks(s, meta, set, inScene) {
    const mode = set.contactReflect ?? (set.contactInject === false ? 'off' : 'auto');
    const ct = s.data.contact;
    if (!ct) return [];
    const now = nowTick(s, meta);
    const rank = (who) => { const k = (ct.recent ?? []).indexOf(who); return k < 0 ? 999 : k; };
    const out = [];
    for (const [who, th0] of Object.entries(ct.threads)) {
        const c = findBy(ct.contacts, who);
        const refl = c?.reflect || '';
        if (refl === 'never' || (mode === 'off' && refl !== 'always' && refl !== 'pinned')) continue;
        const th = th0.filter(m => !m.pending && (m.arrive ?? -Infinity) <= now);
        if (!th.length) continue;
        const how = refl === 'pinned' ? 'pinned' : refl === 'always' ? (mode === 'summary' ? 'summary' : 'auto') : mode;
        let msgs = [], summary = '';
        if (how === 'pinned') msgs = th.filter(m => m.pin).slice(-3);
        else if (how === 'summary') {
            const sm = ct.summaries?.[who];
            if (sm) { summary = sm.text; msgs = th.slice(sm.n).slice(-2); } else msgs = th.slice(-3);
            msgs = [...th.slice(0, sm?.n ?? 0).filter(m => m.pin).slice(-2), ...msgs];
        } else {
            const last = th.slice(-3);
            msgs = [...th.slice(0, -3).filter(m => m.pin).slice(-2), ...last];
        }
        if (!msgs.length && !summary) continue;
        out.push({ who, msgs, summary, always: refl === 'always', scene: inScene(who), r: rank(who) });
    }
    out.sort((a, b) => (b.always - a.always) || (b.scene - a.scene) || (a.r - b.r));
    return out.filter((x, i) => x.always || i < 3);
}
function stageOf(rl, r) { const st = rl.stages?.length ? rl.stages : DEFAULT_STAGES; return st[clamp(r.stage ?? 0, 0, st.length - 1)]; }
function customLines(s, ultra) {
    const tabs = (s.data.custom?.tabs ?? []).filter(t => t.inject && t.fields.length);
    return tabs.map(t => ultra
        ? `${t.icon}${t.name}:${t.fields.map(f => `${f.k}${f.type === 'text' ? `=${short(f.v, 30)}` : f.type === 'bar' ? `${fmtNum(f.v)}/${fmtNum(f.max)}` : fmtNum(f.v)}`).join(',')}`
        : `${t.icon} ${t.name}${t.note ? ` (${short(t.note, 80)})` : ''}: ${t.fields.map(f => `${f.k} ${f.type === 'text' ? short(f.v, 60) : f.type === 'bar' ? `${fmtNum(f.v)}/${fmtNum(f.max)}` : fmtNum(f.v)}`).join(' · ')}`);
}
function debtText(s, ultra) {
    const w = s.data.wallet;
    const open = (w?.loans ?? []).filter(l => l.status === 'open' || l.status === 'late');
    if (!open.length) return '';
    const cal = s.data.calendar;
    const due = (l) => (l.due === null || !cal ? '' : (() => { const c = { ...cal, ...dateFromIndex(cal, l.due) }; return ultra ? `~${c.m}/${c.d}` : ` due ${dateStr(cal, c.y, c.m, c.d)}`; })());
    return ultra
        ? `빚:${open.map(l => `${l.lender}${fmtNum(l.owed)}${due(l)}${l.status === 'late' ? '!' : ''}`).join(',')}`
        : `Debts of {{user}}: ${open.map(l => `${l.lender} ${fmtNum(l.owed)} ${w.currency}${due(l)}${l.status === 'late' ? ' — OVERDUE' : ''}`).join(' · ')}`;
}
function dateFromIndex(cal, idx) {
    const yd = cal.months.reduce((a, m) => a + m.days, 0) || 365;
    let y = Math.floor(idx / yd) + 1, r = idx - (y - 1) * yd, m = 1;
    for (const mo of cal.months) { if (r < mo.days) break; r -= mo.days; m++; }
    return { y, m: Math.min(m, cal.months.length), d: r + 1 };
}
function fateText(s, ultra) {
    const f = s.data.fate; if (!f) return [];
    const L = [];
    if (f.curses.length) L.push(ultra
        ? f.curses.map(c => `${c.kind === 'bless' ? '✨' : '☠'}${c.name}${c.effects.length ? `(${c.effects.join(',')})` : ''}`).join(' ')
        : `Curses/blessings on {{user}} (real, the story must respect them): ${f.curses.map(c => `${c.name}${c.effects.length ? ` (${c.effects.join(', ')})` : ''}${c.cure ? ` — lifted by: ${c.cure}` : ''}`).join(' · ')}`);
    const now = s.data.calendar ? dayIndex(s.data.calendar) : s.turn;
    if (f.today && f.today.day === now) L.push(ultra ? `🃏${f.today.title}:${short(f.today.desc, 60)}` : `Event card today (it happens — weave it into the story): ${f.today.title}${f.today.desc ? ` — ${f.today.desc}` : ''}`);
    return L;
}

// 초압축 모드: 기호·키워드만, 범례 1줄, 출력 규칙은 맨 끝 한 줄
function buildUltra(r, opt = {}) {
    const s = r.state, d = s.data, meta = getMeta(), set = settings();
    const due = dueTester(set, s);
    const on = (id) => modOn(id, meta) && d[id] && (!FREQ_MODS.includes(id) || due(id));
    const inScene = sceneTester(set, s);
    const L = [P('inj.ultra')];
    const head = [MOD_SHORT[diffOf(meta)] ?? diffOf(meta)];
    if (s.core.title) head.push(`${s.core.title}${s.core.genre ? `(${s.core.genre})` : ''}`);
    L.push(head.join('|'));
    if (s.core.userRole) L.push(`{{user}}=${short(s.core.userRole, 70)}`);
    if (s.core.rules) L.push(`규칙:${short(s.core.rules, 140)}`);
    if (on('calendar')) {
        const c = d.calendar;
        const ev = eventsOn(c, c.y, c.m, c.d).map(e => e.title);
        const soon = []; const tmp = { ...c };
        for (let k = 1; k <= 7; k++) { addDays(tmp, 1); for (const e of eventsOn(c, tmp.y, tmp.m, tmp.d)) soon.push(`${e.title}D-${k}`); }
        L.push(`📅${dateStr(c)} ${c.time}${c.weather ? ` ${c.weather}` : ''}${ev.length ? `|오늘:${ev.join(',')}` : ''}${soon.length ? `|${soon.slice(0, 3).join(',')}` : ''}`);
    }
    if (on('map') && d.map.here) {
        const p = findBy(d.map.places, d.map.here);
        const ppl = modOn('profile', meta) ? peopleAt(s, d.map.here).now : [];
        L.push(`@${d.map.here}${p?.links?.length ? `>${p.links.slice(0, 5).join(',')}` : ''}${ppl.length ? `|👥${ppl.join(',')}` : ''}`);
    }
    if (on('stats')) {
        const st = d.stats, parts = [];
        if (st.bars.length) parts.push(st.bars.map(b => `${b.name}${fmtNum(b.cur)}/${fmtNum(b.max)}`).join(' '));
        if (st.attrs.length) parts.push(st.attrs.map(a => `${a.name}${a.val >= 0 ? '+' : ''}${a.val}`).join(' '));
        if (st.conds.length) parts.push(`⚠${st.conds.map(c => c.name).join(',')}`);
        if (parts.length) L.push(parts.join('|'));
    }
    if (on('wallet')) {
        const w = d.wallet;
        L.push(`$${fmtNum(w.cash)}${w.currency}${w.items.length ? `|${w.items.slice(0, 12).map(i => `${i.name}${i.qty > 1 ? `×${i.qty}` : ''}`).join(',')}` : ''}`);
        const dt = debtText(s, true); if (dt) L.push(dt);
    }
    if (on('fate')) L.push(...fateText(s, true));
    if (on('quest')) {
        const act = d.quest.list.filter(q => q.status === 'active');
        if (act.length) L.push(`Q:${act.slice(0, 5).map(q => `${q.title}${q.giver || q.deadline ? `(${[q.giver, q.deadline && `~${q.deadline}`].filter(Boolean).join('·')})` : ''}`).join(' / ')}`);
    }
    if (on('rel')) {
        const here = [], away = [];
        for (const x of d.rel.user) (inScene(x.name) ? here : away).push(x);
        if (here.length) L.push(`♥${here.slice(0, 10).map(x => `${x.name}${x.aff}/${x.trust}${x.label ? `[${x.label}]` : ''}<${stageOf(d.rel, x).name}>${x.jealous >= 30 ? `💢${x.jealous}` : ''}`).join(' ')}`);
        if (away.length) L.push(`(장면 밖:${away.slice(0, 12).map(x => `${x.name}${x.aff}/${x.trust}`).join(' ')})`);
    }
    if (on('profile')) {
        const list = d.profile.list.filter(p => p.role !== 'user' && inScene(p.name)).slice(0, 6);
        if (list.length) L.push(list.map(p => `👤${p.name}:${short(p.summary, 60)}`).join(' / '));
    }
    if (on('contact')) {
        const ct = d.contact;
        if (ct.mode === 'letter') L.push('✉편지 세계: 도착 전엔 상대가 내용을 모름');
        const tr = inTransit(s, meta).filter(x => x.m.from === 'me');
        if (tr.length) L.push(`✉배송중:${tr.map(x => `${x.who}(${x.left}${tickUnit(s, meta)})`).join(',')}`);
        for (const x of contactPicks(s, meta, set, inScene).slice(0, 2)) {
            L.push(`✉${x.who}:${x.summary ? `(${short(x.summary, 50)})` : ''}${x.msgs.slice(-2).map(m => `${m.from === 'me' ? '나›' : ''}${msgText(m, 40)}`).join('/')}`);
        }
    }
    if (on('memo')) {
        const ms = d.memo.list.filter(m => m.inject);
        const pins = ms.filter(m => m.pin).slice(-clamp(parseInt(set.pinCap, 10) || 8, 0, 30));
        const pick = [...pins, ...ms.filter(m => !m.pin).slice(-3)];
        if (pick.length) L.push(`※${pick.map(m => short(m.text, 60)).join(' / ')}`);
    }
    if (on('custom')) L.push(...customLines(s, true));
    if (on('sns') && d.sns.posts.length && due('sns')) L.push(`#${d.sns.posts.slice(-2).map(p => `${p.author}:${short(p.text || p.pic, 30)}`).join(' / ')}`);
    if (on('rel') && s.newDay && set.offscreen && lastDayChanged(r)) L.push('🌙날이 지남: 장면 밖 1~2명의 근황을 life 키로 (선택)');
    if (on('dice')) L.push('🎲[판정·…]=시스템 결과 그대로 서술 · 위험한 행동은 roll 키로 판정 요청');
    if (s.recent.length) L.push(`UI행동:${s.recent.slice(-5).join(' / ')}`);
    if (!opt.noOutput && (set.sync === 'tag' || set.sync === 'tagPlus')) {
        const keys = tagKeysFor(meta).map(k => k.match(/(^|· )([a-z]+) \(/g)?.map(x => x.replace(/[·( ]/g, '')).join(' ')).join(' ');
        L.push(P('inj.ultra.output', { keys }));
    }
    return { main: L.filter(Boolean).join('\n'), people: '' };
}

// 마지막 AI 답(또는 그 뒤 편집)에서 날짜가 넘어갔나
function lastDayChanged(r) {
    const sn = r.snaps.get(r.lastAI);
    return !!sn?.labels.some(l => /^📅 \+/.test(l)) || r.state.recent.some(l => /하루|날짜|일 지났|📅/.test(l));
}
// 변화 위주: 핵심 + 지난 전체 이후 바뀐 것
function buildDelta(r, plan, opt = {}) {
    const s = r.state, d = s.data, meta = getMeta(), set = settings();
    const on = (id) => modOn(id, meta) && d[id];
    const inScene = sceneTester(set, s);
    const L = [P('inj.delta', { left: plan.left })];
    if (on('calendar')) { const c = d.calendar; L.push(`📅${dateStr(c)} ${c.time}${c.weather ? ` ${c.weather}` : ''}`); }
    if (on('map') && d.map.here) L.push(`@${d.map.here}`);
    if (on('stats') && d.stats.bars.length) L.push(d.stats.bars.map(b => `${b.name}${fmtNum(b.cur)}/${fmtNum(b.max)}`).join(' ') + (d.stats.conds.length ? ` ⚠${d.stats.conds.map(c => c.name).join(',')}` : ''));
    if (on('wallet')) L.push(`$${fmtNum(d.wallet.cash)}${d.wallet.currency}`);
    if (on('rel')) { const here = d.rel.user.filter(x => inScene(x.name)); if (here.length) L.push(`♥${here.slice(0, 8).map(x => `${x.name}${x.aff}/${x.trust}<${stageOf(d.rel, x).name}>${x.jealous >= 30 ? `💢${x.jealous}` : ''}`).join(' ')}`); }
    if (on('fate')) L.push(...fateText(s, true));
    if (plan.changes.length) L.push(`변화:${plan.changes.slice(-14).join(' / ')}`);
    if (s.recent.length) L.push(`UI행동:${s.recent.slice(-5).join(' / ')}`);
    if (!opt.noOutput && (set.sync === 'tag' || set.sync === 'tagPlus')) {
        const keys = tagKeysFor(meta).map(k => k.match(/(^|· )([a-z]+) \(/g)?.map(x => x.replace(/[·( ]/g, '')).join(' ')).join(' ');
        L.push(P('inj.ultra.output', { keys }));
    }
    return { main: L.filter(Boolean).join('\n'), people: '' };
}

// 플레이 방식: 다인봇·풀사칭이면 머리에 한 줄, 풀사칭이면 {{user}} → 주인공
export function buildInjection(r, opt = {}) {
    const inj = buildInjection0(r, opt);
    if (!inj.main && !inj.people) return inj;
    const p = playOf();
    if (p.mode === 'rp' && !p.cardIsWorld) return inj;
    const world = p.cardIsWorld ? ' "{{char}}" is the name of this world/bot, not a person.' : '';
    const line = p.mode === 'director' ? P('inj.play.director', { hero: p.hero || 'the main character' }) + world : p.mode === 'multi' ? P('inj.play.multi', { world }) : world.trim();
    const lines = swapUser(inj.main).split('\n');
    lines.splice(1, 0, line);
    return { main: lines.join('\n'), people: swapUser(inj.people) };
}
function buildInjection0(r, opt = {}) {
    if (!r) return { main: '', people: '' };
    const plan = opt.full ? null : deltaPlan(r);
    if (plan) return buildDelta(r, plan, opt);
    if (settings().injectMode === 'ultra') return buildUltra(r, opt);
    const s = r.state, d = s.data, meta = getMeta(), set = settings(), lite = set.injectMode === 'lite';
    const inScene = sceneTester(set, s);
    const due = dueTester(set, s);
    const on = (id) => modOn(id, meta) && d[id] && (!FREQ_MODS.includes(id) || due(id));
    const L = [];
    const PP = [];
    L.push(P('inj.header'));
    L.push(P(`diff.${diffOf(meta)}`));
    if (s.core.title || s.core.summary) {
        L.push(`World: ${s.core.title}${s.core.genre ? ` (${s.core.genre})` : ''}${s.core.canon ? ` · canon: ${s.core.canon}` : ''}${s.core.tone ? ` · tone: ${s.core.tone}` : ''}`);
        if (s.core.summary && !lite) L.push(`Setting: ${short(s.core.summary, 600)}`);
        if (s.core.userRole) L.push(`{{user}}: ${s.core.userRole}`);
        if (s.core.rules) L.push(`World rules: ${short(s.core.rules, lite ? 200 : 500)}`);
    }
    if (on('calendar')) {
        const c = d.calendar;
        const ev = eventsOn(c, c.y, c.m, c.d);
        const soon = [];
        const tmp = { ...c };
        for (let k = 1; k <= 7; k++) { addDays(tmp, 1); for (const e of eventsOn(c, tmp.y, tmp.m, tmp.d)) soon.push(`${e.title}(${k}일 후)`); }
        L.push(`Date: ${dateStr(c)} · ${c.time}${c.weather ? ` · weather: ${c.weather} (${SEASON_NAME[seasonOf(c)]})` : ''}${ev.length ? ` · TODAY: ${ev.map(e => e.title + (e.desc ? ` — ${e.desc}` : '')).join('; ')}` : ''}${soon.length ? ` · coming: ${soon.slice(0, 4).join(', ')}` : ''}`);
    }
    if (on('map')) {
        const m = d.map, p = findBy(m.places, m.here);
        const ppl = modOn('profile', meta) ? peopleAt(s, m.here).now : [];
        if (m.here) L.push(`Location: ${m.here}${p?.desc ? ` — ${short(p.desc, 120)}` : ''}${p?.links?.length ? ` · nearby: ${p.links.join(', ')}` : ''}${ppl.length ? ` · usually here now: ${ppl.join(', ')}` : ''}`);
    }
    if (on('stats')) {
        const st = d.stats;
        if (st.bars.length) L.push(`{{user}} gauges: ${st.bars.map(b => `${b.name} ${fmtNum(b.cur)}/${fmtNum(b.max)}`).join(' · ')}`);
        if (st.attrs.length) L.push(`{{user}} attributes: ${st.attrs.map(a => `${a.name} ${a.val >= 0 ? '+' : ''}${a.val}`).join(' · ')}`);
        if (st.conds.length) L.push(`Conditions: ${st.conds.map(c => c.name + (c.desc && !lite ? ` (${short(c.desc, 50)})` : '')).join(', ')}`);
    }
    if (on('wallet')) {
        const w = d.wallet;
        L.push(`Money: ${fmtNum(w.cash)} ${w.currency}${w.items.length ? ` · Items: ${w.items.slice(0, 20).map(i => `${i.name}${i.qty > 1 ? `×${i.qty}` : ''}`).join(', ')}` : ''}`);
        const dt = debtText(s, false); if (dt) L.push(dt);
        if (w.prices.length && !lite) L.push(`Typical prices: ${w.prices.slice(0, 8).map(p => `${p.name} ${fmtNum(p.price)}`).join(', ')} (${w.currency})`);
    }
    if (on('fate')) L.push(...fateText(s, false));
    if (on('home') && !lite) {
        const hm = d.home;
        if (hm.name) L.push(`Home: ${hm.name} — ${hm.rooms.map(r => `${r.name}${r.decor.length ? `[${r.decor.slice(0, 6).join(', ')}]` : ''}`).join(' / ')}`);
    }
    if (on('shop') && !lite) {
        const m = d.map;
        const here = d.shop.shops.filter(sh => !sh.place || !m || norm(sh.place) === norm(m.here) || norm(m.here).includes(norm(sh.place)));
        if (here.length) L.push(`Shops here: ${here.map(sh => `${sh.name}(${sh.items.slice(0, 6).map(i => `${i.name} ${fmtNum(i.price)}`).join(', ')})`).join(' · ')}`);
    }
    if (on('quest')) {
        const act = d.quest.list.filter(q => q.status === 'active');
        const open = d.quest.list.filter(q => q.status === 'open');
        if (act.length) L.push(`Active quests: ${act.slice(0, 5).map(q => `${q.title}${q.giver ? ` (from ${q.giver})` : ''}${q.deadline ? ` · due ${q.deadline}` : ''}${!lite && q.steps.length ? ` · next: ${q.steps.find(x => !x.done)?.text ?? 'report back'}` : ''}`).join(' / ')}`);
        if (open.length && !lite) L.push(`Requests available (not accepted yet): ${open.slice(0, 4).map(q => q.title).join(', ')}`);
    }
    if (on('news') && d.news.items.length && !lite) L.push(`Recent news (${d.news.name || 'news'}): ${d.news.items.slice(-3).map(x => x.title).join(' / ')}`);
    if (on('gossip') && d.gossip.issues.length && !lite) L.push(`Rumors going around: ${d.gossip.issues.slice(-2).map(x => `${x.title}${x.about.length ? ` (about ${x.about.join(', ')})` : ''}`).join(' / ')}`);
    if (on('rel')) {
        const rl = d.rel;
        const here = rl.user.filter(x => inScene(x.name)), away = rl.user.filter(x => !inScene(x.name));
        for (const x of here.slice(0, 12)) { const g = stageOf(rl, x); PP.push(`${x.name}${x.label ? ` [${x.label}]` : ''} → {{user}}: 호감 ${x.aff} · 신뢰 ${x.trust} · 단계 「${g.name}」${g.unlock && !lite ? ` (unlocked: ${short(g.unlock, 60)}${set.stageLock ? " — don't act beyond this stage yet" : ''})` : set.stageLock ? ' (stay within this stage)' : ''}${x.jealous >= 30 ? ` · 질투 ${x.jealous}/100 (show it subtly when they meet)` : ''}${x.memo && !lite ? ` — ${short(x.memo, 90)}` : ''}`); }
        if (away.length) PP.push(`Not in this scene (호감/신뢰): ${away.slice(0, 15).map(x => `${x.name} ${x.aff}/${x.trust}`).join(', ')}`);
        const pairs = rl.pairs.filter(p => inScene(p.a) || inScene(p.b));
        if (pairs.length && !lite) PP.push(`Between others: ${pairs.slice(0, 10).map(p => `${p.a}↔${p.b} ${p.label}`).join(' · ')}`);
        const life = rl.life.filter(x => inScene(x.who)).slice(-2);
        if (life.length && !lite) PP.push(`Off-screen lately: ${life.map(x => `${x.who} — ${short(x.text, 70)}`).join(' / ')}`);
        if (s.newDay && set.offscreen && lastDayChanged(r)) L.push(P('inj.life'));
    }
    if (on('custom')) L.push(...customLines(s, false));
    if (on('sns') && d.sns.posts.length && !lite) L.push(`Recent posts on ${d.sns.name || 'SNS'}: ${d.sns.posts.slice(-3).map(p => `${p.author}: ${short(p.text || `[사진] ${p.pic}`, 50)}`).join(' / ')}`);
    if (on('music') && d.music.now && !lite) L.push(`Current BGM: ${d.music.now.title}${d.music.now.artist ? ` - ${d.music.now.artist}` : ''} (change it with bgm only when the mood shifts)`);
    if (on('profile')) {
        const pf = d.profile;
        const list = (pf.mode === 'detailed' ? pf.list : pf.list.filter(p => p.role === 'npc')).filter(p => p.role === 'user' || inScene(p.name));
        for (const p of list.slice(0, pf.mode === 'detailed' ? 12 : 8)) {
            const f = pf.mode === 'detailed' && !lite ? ` | ${p.fields.slice(0, 10).map(x => `${x.k}: ${short(x.v, 80)}`).join(' / ')}` : '';
            PP.push(`Profile ${p.name}${p.role === 'user' ? ' ({{user}})' : ''}: ${short(p.summary, 160)}${f}`);
        }
    }
    if (on('ach')) {
        const a = d.ach.list, done = a.filter(x => x.done);
        if (a.length) L.push(`Achievements ${done.length}/${a.length}${done.length ? ` · recent: ${done.slice(-3).map(x => x.name).join(', ')}` : ''}`);
    }
    if (on('memo')) {
        const ms = d.memo.list.filter(m => m.inject);
        const pick = [...ms.filter(m => m.pin).slice(-clamp(parseInt(set.pinCap, 10) || 8, 0, 30)), ...ms.filter(m => !m.pin).slice(-6)];
        if (pick.length) L.push(`Notes: ${pick.map(m => `${m.by === 'user' ? '(user) ' : ''}${short(m.text, 120)}`).join(' / ')}`);
    }
    if (on('contact')) {
        const ct = d.contact;
        if (ct.mode === 'letter') L.push(P('inj.letter', { app: ct.app }));
        const tr = inTransit(s, meta).filter(x => x.m.from === 'me');
        if (tr.length) L.push(`Letters on the way (NOT yet received — the recipients don't know their contents yet): ${tr.map(x => `to ${x.who} (${x.left}${tickUnit(s, meta)} left)`).join(', ')}`);
        for (const x of contactPicks(s, meta, set, inScene)) {
            PP.push(`${ct.app} with ${x.who}${x.summary ? ` — so far: ${x.summary}` : ''}${x.msgs.length ? ` (latest): ${x.msgs.map(m => `${m.from === 'me' ? '{{user}}' : x.who}: ${msgText(m, 70)}`).join(' / ')}` : ''}`);
        }
    }
    if (on('dice')) {
        const dc = d.dice;
        if (dc.rules && !lite) L.push(`Dice rules: ${short(dc.rules, 300)}`);
        L.push(P('inj.dice'));
    }
    if (s.recent.length) L.push(`Since the last reply {{user}} did (via the status UI): ${s.recent.slice(-8).join(' / ')}`);
    if (!opt.noOutput && (set.sync === 'tag' || set.sync === 'tagPlus')) {
        L.push(P('inj.output'));
        L.push(lite ? `Keys (key: value, ±N for numbers, +/-name for lists, name | detail): ${tagKeysFor(meta).map(k => k.match(/(^|· )([a-z]+) \(/g)?.map(x => x.replace(/[·( ]/g, '')).join(' ')).join(' ')}` : `Keys: ${tagKeysFor(meta).join(' · ')}`);
        if (!lite) L.push(P('inj.example'));
    }
    return { main: L.filter(Boolean).join('\n'), people: PP.length ? `[STATUS SIM — PEOPLE (part of the state above)]\n${PP.join('\n')}` : '' };
}

export function setInjection(inj) {
    const c = ctx();
    const depth = clamp(parseInt(settings().injectDepth, 10) || 0, 0, 20);
    c.setExtensionPrompt(INJECT_KEY, inj?.main ?? '', PROMPT_IN_CHAT, depth, true, ROLE_SYSTEM);
    c.setExtensionPrompt(INJECT_KEY2, inj?.people ?? '', PROMPT_IN_CHAT, depth, false, ROLE_SYSTEM);
}

// ───── 생성 재료 ─────
export function chatCharacters() {
    const c = ctx();
    if (c.groupId) {
        const g = c.groups?.find(x => x.id == c.groupId);
        return (g?.members ?? []).map(av => c.characters?.find(ch => ch.avatar === av)).filter(Boolean);
    }
    const ch = c.characters?.[c.characterId];
    return ch ? [ch] : [];
}
export async function loreNames() {
    const c = ctx();
    const names = new Set();
    for (const ch of chatCharacters()) { const w = ch?.data?.extensions?.world; if (w) names.add(w); }
    const cw = c.chatMetadata?.world_info; if (cw) names.add(cw);
    try {
        const wi = await import('/scripts/world-info.js');
        for (const n of wi.selected_world_info ?? []) names.add(n);
        for (const ch of chatCharacters()) {
            const fname = String(ch.avatar ?? '').replace(/\.[^.]+$/, '');
            for (const n of (wi.world_info?.charLore ?? []).find(x => x.name === fname)?.extraBooks ?? []) names.add(n);
        }
    } catch { /* optional */ }
    return [...names];
}
export async function loreText(limit) {
    const c = ctx();
    if (!c.loadWorldInfo || limit <= 0) return '';
    let out = '';
    for (const name of await loreNames()) {
        try {
            const book = await c.loadWorldInfo(name);
            const entries = Object.values(book?.entries ?? {}).filter(e => !e.disable).sort((a, b) => (b.constant ? 1 : 0) - (a.constant ? 1 : 0) || (a.order ?? 0) - (b.order ?? 0));
            for (const e of entries) {
                const head = e.comment || (Array.isArray(e.key) ? e.key.slice(0, 3).join(', ') : '');
                const piece = `• ${head}: ${String(e.content ?? '').replace(/\s+/g, ' ').trim()}\n`;
                if (out.length + piece.length > limit) return out + '…(생략)';
                out += piece;
            }
        } catch (e) { console.warn(LOG, 'lore', name, e); }
    }
    return out;
}
export function recentChat(n) {
    return (ctx().chat ?? []).filter(m => !m.is_system).slice(-n).map(m => `${m.name}: ${short(stripStatus(m.mes), 700)}`).join('\n');
}
export async function gatherSources(opt = {}) {
    const c = ctx(), set = settings();
    const parts = [];
    const persona = c.powerUserSettings?.persona_description ?? '';
    parts.push(`[USER] {{user}} = ${c.name1}${opt.persona !== false && persona ? `\n${short(persona, 2500)}` : ''}`);
    if (opt.card !== false) {
        for (const ch of chatCharacters()) {
            const f = [ch.description, ch.personality && `Personality: ${ch.personality}`, ch.scenario && `Scenario: ${ch.scenario}`].filter(Boolean).join('\n');
            if (f) parts.push(`[CHARACTER CARD: ${ch.name}]\n${short(f, 5000)}`);
        }
    }
    if (opt.lore !== false) { const lt = await loreText(set.loreChars); if (lt) parts.push(`[LOREBOOK]\n${lt}`); }
    if (opt.chat !== false) { const rc = recentChat(set.recentForGen); if (rc) parts.push(`[RECENT CHAT]\n${rc}`); }
    return parts.join('\n\n');
}
export { CONTACT_MODES };
