// 상태 엔진: <meatball> 변화량 → 상태 재계산 · 직접 편집 기록 · 프롬프트 주입
import {
    letterMode, instantLetter, contactSimple, app, ctx, settings, getMeta, saveMeta, modOn, MOD_IDS, MOD, EMPTY, DIFFS, GLOBAL_OFF, NORM, normalize, clone, clamp, num, norm, findBy, parseNum, splitBar,
    signed, fmtNum, short, dayIndex, addDays, dateStr, eventsOn, parseDate, nowTick, tickUnit, stamp, esc, TITLE, INJECT_KEY, INJECT_KEY2, INJECT_KEY3, trLook, trBack, viewTr, weekday,
    PROMPT_IN_CHAT, ROLE_SYSTEM, MODULE, AI_PARTS, aiOff, uid, diffOf, LOG, loveIndex, CONTACT_MODES, touchContact, tidy, THREAD_MAX, msgText, nextTime, dateShort, DEFAULT_STAGES, arr, playOf, swapUser, ssWarn, relAxes, romanceStart, INJ, isHidden, modOnRaw } from './core.js';
import { P } from './prompts.js';
import { enStr } from './skeleton_en.js';

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
    aff: 'aff', '호감': 'aff', '호감도': 'aff', '애정': 'aff', '애정도': 'aff', trust: 'trust', '신뢰': 'trust', '신뢰도': 'trust', '우정': 'trust', '우정도': 'trust',
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
    mind: 'mind', '속마음': 'mind', thought: 'mind', feel: 'mind',
    confess: 'confess', '고백': 'confess', concern: 'concern', '신경': 'concern', '고민': 'concern', taste: 'taste', '취향': 'taste',
    alert: '_alert', '알림': '_alert',
};
export const KEY_MOD = {
    stat: 'stats', attr: 'stats', cond: 'stats', cash: 'wallet', item: 'wallet', stock: 'shop', decor: 'home', room: 'home', loc: 'map', place: 'map',
    aff: 'rel', trust: 'rel', rel: 'rel', pair: 'rel', date: 'calendar', time: 'calendar', event: 'calendar', ach: 'ach', memo: 'memo', msg: 'contact',
    npc: 'profile', roll: 'dice', quest: 'quest', news: 'news', rumor: 'gossip', post: 'board', curse: 'fate', weather: 'calendar',
    bgm: 'music', sns: 'sns', custom: 'custom', life: 'rel', mind: 'rel', jealous: 'rel', confess: 'rel', concern: 'rel', taste: 'rel',
};

// 미트볼 블록 = <meatball> (v2.5.1~) · 예전 <status>.
// 다른 프리셋도 <status>를 쓸 수 있어서(<summary>/<details>, 「| Physical:」 표 모양) 그런 블록은 읽지도 지우지도 않는다.
const FOREIGN_RE = /<summary\b|<details\b|\|\s*Physical\s*:|Relationship \(mutual/i;
// 옛 <status>도 미트볼 것으로 읽을지 (v2.5 이전 채팅 호환 · 다른 프리셋이 <status>를 쓰면 끄기)
const legacyOn = () => { try { return settings().legacyStatus !== false; } catch { return true; } };
// 블록 찾기 — 닫는 태그가 있으면 거기까지.
// <meatball>을 안 닫았으면: 「키: 값」 모양의 줄이 이어지는 데까지만 (사이의 빈 줄은 허용). 태그로 시작하는 줄(</prose>, <tracker>)이나 이야기 문장에서 멈춘다.
//   → 예전엔 글 끝까지 다 지웠음. 읽히는 변화(키: 값)는 예전과 같아서 옛 채팅의 숫자는 그대로.
// 옛 <status>는 예전 규칙 그대로 (안 닫혔으면 글 끝·다음 블록까지) — 옛 채팅 호환. 다른 프리셋 모양(<details>·표)이면 건드리지 않는다.
const KV_RUN = /^(?:\s*(?:[-*•]\s*|\d+[.)]\s*)?[^<:：\n]{1,24}[:：][^\n]*)*/;
function scanBlocks(text) {
    const t = String(text ?? '');
    const out = [];
    const open = /<(meatball|status)>/gi;
    let m;
    while ((m = open.exec(t))) {
        const tag = m[1].toLowerCase(), from = m.index + m[0].length;
        const close = t.toLowerCase().indexOf(`</${tag}>`, from);
        open.lastIndex = from;
        const nx = (() => { const r = /<(?:meatball|status)>/gi; r.lastIndex = from; const k = r.exec(t); return k ? k.index : -1; })();
        let end, body, closed = close >= 0 && (nx < 0 || close < nx);
        if (closed) { body = t.slice(from, close); end = close + tag.length + 3; }
        else if (tag === 'meatball') {
            const rest = nx < 0 ? t.slice(from) : t.slice(from, nx);
            body = rest.match(KV_RUN)?.[0] ?? ''; end = from + body.length;
        } else { body = nx < 0 ? t.slice(from) : t.slice(from, nx); end = from + body.length; } // 옛 <status>: 예전 그대로
        let start = m.index; while (start > 0 && /\s/.test(t[start - 1])) start--;
        const ours = tag === 'meatball' || (legacyOn() && !FOREIGN_RE.test(body));
        out.push({ start, end, tag, body, ours, all: t.slice(start, end) });
        open.lastIndex = end;
    }
    return out;
}
const cut = (text, spans) => { let t = String(text ?? ''); for (const b of [...spans].reverse()) t = t.slice(0, b.start) + t.slice(b.end); return t; };
export const ourBlocks = (text) => scanBlocks(text).filter(b => b.ours).map(b => Object.assign([b.all, b.tag, b.body], { index: b.start }));
export const hasStatus = (text) => ourBlocks(text).length > 0;
export const removeStatus = (text) => cut(text, scanBlocks(text).filter(b => b.ours));
export function extractOps(text) {
    const ops = [];
    const seen = new Set(); // 이어 쓰기 등으로 블록이 두 개면, 앞 블록에 똑같이 있던 줄은 다시 세지 않는다
    for (const m of ourBlocks(text)) {
        const mine = [];
        for (const line of m[2].split(/\r?\n/)) {
            // 가벼운 모델이 붙이는 꾸밈(**굵게**, `코드`, 번호)을 벗겨 낸다
            const clean = line.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, '').replace(/\*\*|__|`/g, '');
            const lm = clean.match(/^\s*([^:：\n]{1,24}?)\s*[:：]\s*(.+?)\s*$/);
            if (lm && !/^```/.test(lm[1])) { const k = `${norm(lm[1])}\u0000${norm(lm[2])}`; if (!seen.has(k)) { ops.push([lm[1].trim(), lm[2]]); mine.push(k); } }
        }
        for (const k of mine) seen.add(k);
    }
    return ops;
}
// 읽기용(요약·앨범·AI에게 보내는 최근 대화): 미트볼 블록과 다른 프리셋의 상태 블록을 모두 뺀 이야기 본문
export const stripStatus = (t) => cut(t, scanBlocks(t).filter(b => b.ours || (b.tag === 'status' && b.end > b.start))).trim();

// ───── 서랍: <status>를 읽은 뒤 본문에서 떼어 메시지 숨은 칸(extra)에 보관 ─────
// 본문엔 이야기만 남아서 다른 확장(요약·번역·로그 복사)이 변화량 줄을 보지 않는다.
export function drawerOps(m) {
    const d = m?.extra?.[MODULE]?.bySwipe?.[m?.swipe_id ?? 0];
    return Array.isArray(d) ? d : null;
}
// 실리는 왼쪽으로 스와이프할 때 지금 답(mes · extra)을 스와이프 칸에 저장하지 않아요 → 고친 것을 직접 같이 적어 둔다
export function syncSwipe(m) {
    const sid = m.swipe_id;
    if (typeof sid !== 'number' || !Array.isArray(m.swipes) || typeof m.swipes[sid] !== 'string') return;
    m.swipes[sid] = m.mes;
    if (Array.isArray(m.swipe_info) && m.swipe_info[sid] && typeof m.swipe_info[sid] === 'object') m.swipe_info[sid].extra = structuredClone(m.extra);
}
// 스와이프를 지우면 실리가 뒤쪽 스와이프 번호를 하나씩 당긴다 → 답마다 「스와이프 번호 → 변화」로 적어 둔 것도 같이 당긴다 (v2.7.10)
// (안 당기면 앞 스와이프를 지운 뒤 지금 스와이프의 변화를 못 찾아 숫자가 조용히 바뀌었음)
export function shiftSwipeKeys(m, removed) {
    if (!m || !Number.isInteger(removed)) return false;
    const seen = new Set();
    let changed = false;
    const fix = (ex) => {
        const b = ex?.[MODULE];
        if (!b || typeof b !== 'object' || seen.has(b)) return;
        seen.add(b);
        for (const key of ['bySwipe', 'skip']) {
            const o = b[key];
            if (!o || typeof o !== 'object') continue;
            const n = {};
            for (const [k, v] of Object.entries(o)) {
                const i = Number(k);
                if (!Number.isInteger(i)) { n[k] = v; continue; }
                if (i === removed) { changed = true; continue; }
                if (i > removed) changed = true;
                n[i > removed ? i - 1 : i] = v;
            }
            b[key] = n;
        }
    };
    fix(m.extra);
    for (const si of Array.isArray(m.swipe_info) ? m.swipe_info : []) fix(si?.extra);
    return changed;
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
    if (!m || m.is_user || typeof m.mes !== 'string' || !hasStatus(m.mes)) return false;
    const ops = extractOps(m.mes);
    const old = replace ? [] : (drawerOps(m) ?? []);
    m.mes = removeStatus(m.mes).replace(/\s+$/, ''); // 다른 프리셋의 <status>는 본문에 그대로
    // 이어 쓰기: 모델이 앞에서 쓴 변화를 다시 적으면 두 번 세지 않게 (새로 생긴 줄만 덧붙임)
    const had = new Set(old.map(([k, v]) => `${norm(k)}\u0000${norm(v)}`));
    setDrawer(m, [...old, ...ops.filter(([k, v]) => !had.has(`${norm(k)}\u0000${norm(v)}`))]);
    return true;
}
// 한 메시지의 모든 스와이프에서 태그를 보관 (옛 채팅 정리용) → 옮긴 개수
export function stashAllSwipes(m) {
    if (!m || m.is_user) return 0;
    let n = 0;
    if (Array.isArray(m.swipes)) m.swipes.forEach((t, sid) => {
        if (sid === (m.swipe_id ?? 0) || typeof t !== 'string' || !hasStatus(t)) return;
        const info = m.swipe_info?.[sid];
        if (!info || typeof info !== 'object') return; // 보관할 칸이 없으면 그대로 둔다
        info.extra ??= {}; info.extra[MODULE] ??= {}; info.extra[MODULE].bySwipe ??= {};
        info.extra[MODULE].bySwipe[sid] = extractOps(t);
        m.swipes[sid] = removeStatus(t).replace(/\s+$/, '');
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
export const affMul = (s) => Math.max(0, 1 + effSum(s, /(?:호감|애정|aff(?:ection)?)\s*(?:상승|획득|gains?)?\s*([+\-−]?\d+(?:\.\d+)?)\s*%/i) / 100);
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
// 쉼표 뒤에 숫자가 아닌 글이 오면 다른 항목 (「1,000」은 안 나눔)
const MULTI_RE = /\s*,\s*(?=[^\d\s,])/;
export function applyLines(s, text, info) {
    for (const raw0 of String(text ?? '').split(/\s*[;\n]\s*/)) {
        const line0 = raw0.trim();
        if (!line0) continue;
        const kv = line0.match(/^([^:：]{1,24})\s*[:：]\s*(.+)$/);
        if (kv) { applyOp(s, kv[1].trim(), kv[2], info); continue; }
        // 키 없이 「Stamina +30, Stress -5」 → 하나씩 (v2.7.19 · 아이템 · 일거리 효과)
        for (const line of line0.split(MULTI_RE)) applyBare(s, line.trim(), info);
    }
}
function applyBare(s, line, info) {
    const nv = line.match(/^(.+?)\s+([=+\-−]?\d[\d.,]*)$/);
    if (!nv) return;
    const nm = nv[1].trim();
    // 게이지·능력치 이름이 먼저 (예: 'HP'는 키 별칭이기도 해서)
    if (findBy(s.data.stats?.bars ?? [], nm)) applyOp(s, 'stat', `${nm} ${nv[2]}`, info);
    else if (findBy(s.data.stats?.attrs ?? [], nm)) applyOp(s, 'attr', `${nm} ${nv[2]}`, info);
    else applyOp(s, nm, nv[2], info);
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
                if (c.days && c.since === null) c.since = from; // 처음부터 있던(만들 때 생긴) 저주도 기간이 흐르게
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
    const rm = t.match(/^(호감|신뢰|애정|우정|aff|trust)\s*[:：]\s*(.+)$/i);
    if (rm) { const r = findBy(s.data.rel?.user ?? [], rm[2]); return r ? r[/호감|애정|aff/i.test(rm[1]) ? 'aff' : 'trust'] : null; }
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
// 🏆 기본 업적은 숫자로 직접 확인 (v2.7.19 · AI 0회) — 예전엔 AI가 알아서 「ach:」를 적어야만 됐고,
//    설명이 그 채팅에 없는 단계 이름(「친구」 단계)을 가리켜서 사실상 안 깨졌음
const ACH_AUTO = [
    [/^(첫 친구|First Friend)$/i, (s) => (s.data.rel?.user ?? []).some(r => r.trust >= 25)],
    [/^(마음을 연 사람|Opened Up)$/i, (s) => (s.data.rel?.user ?? []).some(r => r.trust >= 50)],
    [/^(사랑의 시작|Love Begins)$/i, (s) => { const rl = s.data.rel; const L = loveIndex(rl?.stages ?? []); return (rl?.user ?? []).some(r => r.bond || (L >= 0 && (r.stage ?? -1) >= L)); }],
    [/^(탐험가|Explorer)$/i, (s) => (s.data.map?.places ?? []).filter(p => p.known !== false).length >= 10],
    [/^(해결사|Fixer)$/i, (s) => [...(s.data.quest?.list ?? []), ...(s.data.quest?.archive ?? [])].filter(q => q.status === 'done').length >= 5],
];
function autoAch(s, info) {
    const ac = s.data.ach; if (!ac?.list?.length || info.mods?.ach === false) return;
    for (const a of ac.list) {
        if (a.done) continue;
        const hit = ACH_AUTO.find(([re]) => re.test(String(a.name).trim()));
        if (hit && hit[1](s)) applyOp(s, 'ach', a.name, info);
    }
}
function checkRules(s, info) {
    checkEndings(s, info);
    autoAch(s, info);
    questClock(s, info);
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
    for (const [n, w] of table) { if ((x -= w) < 0) return viewTr() ? enStr(n) : n; } // 영어 저장이면 영어 날씨 (화면은 한국어로)
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
    if (['aff', '호감', '애정', 'trust', '신뢰', '우정'].includes(K) && arg) { const r = findBy(d.rel?.user ?? [], arg); return r ? String(r[/^(aff|호감|애정)$/.test(K) ? 'aff' : 'trust']) : ''; }
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
// ───── 로맨스 보정 (v2.6) — 설정에서 켠 뒤의 메시지에만 적용 (meta.romFrom) ─────
const romLive = (s) => s.romActive === true;
// 맨 위 단계(보통 「연인」)는 숫자만으론 못 감 — 「연인 확정」(r.bond)이 있어야. 확정이면 숫자와 상관없이 맨 위.
// 💞 연인 단계(loveIndex)만 막는다. 연인 단계가 없는 세계관(우정·신뢰 단계뿐)이면 단계는 숫자대로 — 연인 확정은 따로 표시만.
function bondCap(s, st, want, r) {
    if (!settings().romBond || !romLive(s)) return want;
    const L = loveIndex(st);
    if (L < 1) return want;
    if (r.bond) return Math.max(want, L);
    if (want < L || (r.stage ?? -1) >= L) return want; // 켜기 전에 이미 연인 단계였던 사람은 그대로
    return L - 1;
}
// AI 답 1번에 오를 수 있는 호감·신뢰 상한 + 연달아 오르면 점점 덜 오르게
function romGain(s, info, name, key, gain) {
    const set = settings();
    if (!set.romCap && !set.romFatigue) return gain;
    const k = `${key}:${norm(name)}`;
    let g = gain;
    if (set.romFatigue) { const run = s.romRun?.[k] ?? 0; if (run >= 2) g = Math.max(1, Math.round(g * (run >= 3 ? 0.34 : 0.6))); }
    const used = (info.romUsed ??= {})[k] ?? 0;
    const cap = set.romCap ? Math.max(1, Math.round(num(key === 'aff' ? set.romCapAff : set.romCapTrust, 5))) : Infinity;
    g = Math.max(0, Math.min(g, cap - used));
    info.romUsed[k] = used + g;
    if (g < gain) info.labels.push(`⚖️ ${name} ${relAxes(s.data.rel)[key === 'aff' ? 'aff' : 'trust']} +${gain}→+${g}`);
    return g;
}
// 이 채팅에서 로맨스 보정을 처음 켠 지점 기록 (그 전 메시지는 예전 규칙 그대로 → 옛 채팅 숫자가 안 바뀜)
function markRomFrom(meta, chat) {
    const set = settings();
    if (!meta || Number.isFinite(meta.romFrom)) return;
    if (!(set.romBond || set.romCap || set.romFatigue)) return;
    meta.romFrom = chat.length;
    Promise.resolve().then(() => saveMeta()).catch(() => { /* ignore */ });
}
// 💗 애정 꺼 둔 사람의 단계: 애정/우정 방식이면 애정 없이(=-100) 닿는 우정 단계까지, 옛 방식이면 연애 단계 바로 앞까지
function noLoveStage(rl, st, r, raw) {
    const rs = romanceStart(rl);
    const k = relAxes(rl).love ? stageIndex(st, -100, r.trust) : raw;
    return rs > 0 ? Math.min(k, rs - 1) : k;
}
function updateStage(s, r, info, silent = false) {
    const rl = s.data.rel; if (!rl) return;
    if (!stagesOn()) silent = true; // 단계 기능을 껐으면 단계 칩 · 알림 · 기념일 없이 숫자만
    const st = rl.stages?.length ? rl.stages : DEFAULT_STAGES;
    let raw = stageIndex(st, r.aff, r.trust);
    if (r.noLove) raw = noLoveStage(rl, st, r, raw); // 💗 애정 꺼 둠: 연애 단계 앞까지만
    const want = bondCap(s, st, raw, r);
    if (want < raw) {
        if (!r.bondReady) {
            r.bondReady = true;
            if (!silent) { info.labels.push(`💌 ${r.name}: 「${st[raw].name}」 조건 충족 · 고백 전`); info.alerts.push(`💌 ${r.name} — 「${st[raw].name}」 단계 조건은 채웠어요. 고백이 오가면 관계 탭에서 「연인 확정」을 눌러 주세요.`); }
        }
    } else r.bondReady = false;
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
    if (k >= 2 && r.met) { const dt = parseDate(cal, r.met); if (dt) add({ y: null, m: dt.m, d: dt.d, title: viewTr() ? `The day {{user}} first met ${r.name}` : `${r.name}와 처음 만난 날`, desc: viewTr() ? 'automatic anniversary' : '자동 기념일', repeat: 'yearly' }); }
    if (k === st.length - 1) {
        add({ y: null, m: cal.m, d: cal.d, title: viewTr() ? `The day {{user}} and ${r.name} became ${st[k].name}` : `${r.name}와 ${st[k].name}이 된 날`, desc: viewTr() ? 'automatic anniversary' : '자동 기념일', repeat: 'yearly' });
        const t = { ...cal }; addDays(t, 99);
        add({ y: t.y, m: t.m, d: t.d, title: viewTr() ? `100 days with ${r.name}` : `${r.name}와 100일`, desc: viewTr() ? 'automatic anniversary' : '자동 기념일', repeat: 'once' });
    }
}
const info0 = (s) => s.data.calendar?.noAuto === true;
// 질투: 누군가와 가까워지면, 호감이 높은 다른 사람의 질투가 오른다 (날이 지나면 식음)
function jealousyFrom(s, gainer, amount, info) {
    if (!settings().jealousy || amount <= 0) return;
    const g = findBy(s.data.rel?.user ?? [], gainer);
    if (!g || g.aff < 20) return; // 꽤 가까워진 사람에게만
    for (const y of s.data.rel?.user ?? []) {
        if (norm(y.name) === norm(gainer) || y.aff < 50 || y.noLove) continue; // 애정 꺼 둔 사람은 질투도 안 함
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

// AI가 이름 자리에 이상한 걸 쓰면(「+3」, 「체력 max」, 태그, 유저 자신) 유령 인물이 생기지 않게 (v2.7)
function personName(s, raw) {
    const nm = String(raw ?? '').replace(/<[^>]*>|\*\*|__|`/g, '').replace(/^[\s+\-−=]+|[\s:：]+$/g, '').trim();
    if (!nm || nm.length > 30 || !/\p{L}/u.test(nm) || /[|,%=<>{}]|^\d/.test(nm) || /^(nan|null|undefined|none|없음)$/i.test(nm)) return '';
    const n = norm(nm);
    if (/^(max|최대|user|유저|나|me|you|\{\{user\}\}|\{\{char\}\})$/i.test(nm)) return '';
    try { if (n === norm(ctx().name1)) return ''; } catch { /* 이름 모름 */ }
    for (const g of [...(s.data.stats?.bars ?? []), ...(s.data.stats?.attrs ?? [])]) { const k = norm(g.name); if (k && (n === k || n.startsWith(k))) return ''; }
    return nm;
}
// AI가 부호를 빼먹은 숫자 (「cash: 120」 「aff: 레온 35」): 예전엔 그 값으로 「바꿈」 → 돈·호감이 통째로 날아갈 수 있었음 (v2.7)
// 지금 값과 가까우면 「새 합계」로 보고 바꾸고, 아니면 빼먹은 「+」로 보고 더한다. 직접 편집·버튼(=)은 그대로.
function bareFix(p, cur, info) {
    if (!p || p.mode !== 'bare' || !info?.ai) return p;
    const c = Number(cur) || 0;
    return c !== 0 && Math.abs(p.v - c) <= Math.abs(p.v) * 0.3 ? { mode: 'set', v: p.v } : { mode: 'add', v: p.v };
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
    if (mod && GLOBAL_OFF[mod] && settings()[GLOBAL_OFF[mod]] === false) return; // 모든 채팅에서 끈 칸 (v2.7.3)
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
        case 'mind': { // 💭 속마음 · 이모티콘 · 카모지 (이름 | 내용) — 마지막 것만 둠
            const rl = s.data.rel; if (!rl) return;
            const [nm, ...rest] = splitBar(val); const text = rest.join(' | ').trim();
            const r = findBy(rl.user, nm); if (!r || !text) return;
            r.mind = { text: cleanMind(text), turn: s.turn };
            if (!r.mind.text) delete r.mind;
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
        case 'confess': { // 로맨스 보정: AI는 「고백이 오갔다」고 알리기만, 확정은 유저가
            if (!settings().romBond) return;
            const rl = ensure(s, 'rel');
            const [nm] = splitBar(val);
            const r = findBy(rl.user, nm.replace(/^[+]\s*/, ''));
            if (!r || r.bond || r.noLove) return;
            if (r.bondAsk && s.turn - (r.bondAskAt ?? 0) < 10) return; // 「아직」을 고른 뒤 10턴 안엔 다시 안 물어봄
            r.bondAsk = true; r.bondAskAt = s.turn;
            L(`💌 ${r.name}: 고백?`);
            info.alerts.push({ kind: 'confess', who: r.name }); // index.js가 「연인으로 확정할까요?」 창을 띄운다
            return;
        }
        case '_nolove': case '_love': { // 💗 애정 꺼 두기 / 다시 켜기 (관계 탭 버튼)
            const rl = ensure(s, 'rel');
            const r = findBy(rl.user, val); if (!r) return;
            if (key === '_nolove') r.noLove = true; else delete r.noLove;
            (s.nolove ??= {})[norm(r.name)] = !!r.noLove; // 관계 칸을 통째로 저장해도 유지
            r.stage = -1; updateStage(s, r, info, true);
            return;
        }
        case '_bond': case '_unbond': {
            const rl = ensure(s, 'rel');
            const r = findBy(rl.user, val); if (!r) return;
            r.bond = key === '_bond'; r.bondAsk = false;
            (s.bonds ??= {})[norm(r.name)] = r.bond; // 연인 확정은 따로 기억 → 나중에 관계 칸을 통째로 저장해도 안 풀림
            if (r.bond) updateStage(s, r, info);
            else { r.stage = -1; updateStage(s, r, info, true); }
            return;
        }
        case 'concern': case 'taste': {
            if (!settings().romDrive) return;
            const rl = ensure(s, 'rel');
            const [nm, a, b] = splitBar(val);
            const r = findBy(rl.user, nm); if (!r) return;
            if (key === 'concern') { const v = String(a ?? '').trim(); if (v === r.concern) return; r.concern = /^(없음|none|-)$/i.test(v) ? '' : v; L(`💭 ${r.name}`); }
            else { if (a) r.likes = a; if (b) r.dislikes = b; }
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
        case '_purge': { // 🗑 완전 삭제: 「버렸다」 기록을 바꿔 쓴 것 — 창고에서 조용히 빼기만 (쓰레기통·기록·라벨 없음)
            const hm = s.data.home; if (!hm) return;
            const k = hm.storage.findIndex(x => norm(x) === norm(val));
            if (k >= 0) hm.storage.splice(k, 1);
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
            // v2.7.19: 「Stamina +30, Stress -5」처럼 쉼표로 여러 개 — 예전엔 통째로 「Stamina +30, Stress」 게이지 -5로 읽어서 Stamina가 깎였음
            if (MULTI_RE.test(val)) { for (const part of val.split(MULTI_RE)) if (part.trim()) applyOp(s, 'stat', part.trim(), info); return; }
            const st = ensure(s, 'stats');
            const m = val.match(/^(.+?)\s*(max|최대)?\s*([=+\-−][\d.,]+|\d[\d.,]*)\s*$/i);
            if (!m) return;
            let bar = findBy(st.bars, m[1]);
            if (!bar) { bar = { name: m[1].trim(), cur: 100, max: 100, color: '', desc: '' }; st.bars.push(bar); }
            let p = parseNum(m[3]);
            if (!p) return;
            if (!m[2]) p = bareFix(p, bar.cur, info);
            if (m[2]) { const b = bar.max; bar.max = Math.max(1, p.mode === 'add' ? bar.max + p.v : p.v); bar.cur = Math.min(bar.cur, bar.max); L(`${bar.name} 최대 ${signed(bar.max - b)}`); return; }
            const before = bar.cur;
            bar.cur = clamp(p.mode === 'add' ? bar.cur + p.v : p.v, 0, bar.max);
            if (bar.cur !== before) L(`${bar.name} ${signed(bar.cur - before)}`);
            if (before > 0 && bar.cur <= 0) info.alerts.push(`${bar.name}이(가) 0이 되었다`);
            return;
        }
        case 'attr': {
            if (MULTI_RE.test(val)) { for (const part of val.split(MULTI_RE)) if (part.trim()) applyOp(s, 'attr', part.trim(), info); return; }
            const st = ensure(s, 'stats');
            const m = val.match(/^(.+?)\s*([=+\-−][\d.]+|\d[\d.]*)\s*$/);
            if (!m) return;
            let a = findBy(st.attrs, m[1]);
            if (!a) { a = { name: m[1].trim(), val: 0, desc: '' }; st.attrs.push(a); }
            const p = bareFix(parseNum(m[2]), a.val, info); if (!p) return;
            const b = a.val; a.val = Math.round(p.mode === 'add' ? a.val + p.v : p.v);
            if (a.val !== b) L(`${a.name} ${signed(a.val - b)}`);
            return;
        }
        case 'cond': {
            // 「+Poisoned, +Tired」 → 하나씩 (v2.7.19 · 예전엔 「Poisoned, +Tired」 상태 하나가 생겼음)
            if (!val.includes('|') && /,\s*[+\-−]/.test(val)) { for (const part of val.split(/\s*,\s*(?=[+\-−])/)) if (part.trim()) applyOp(s, 'cond', part.trim(), info); return; }
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
            const p = bareFix(parseNum(val), w.cash, info); if (!p) return;
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
                // 수량은 띄어 쓰거나 x를 붙인 1~3자리 숫자만 (「AK-47」 「S24」처럼 이름 끝 숫자를 수량으로 읽지 않게)
                const m = head.match(/^([+\-−]?)\s*(.+?)(?:(?:\s+[x×*]?|\s*[x×*])\s*(\d{1,3})\s*(?:개|장|병|권|통)?)?$/);
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
        case '_tostore': { // 🎒 소지품 → 📦 창고 (1개)
            if (!s.data.wallet || !s.data.home) return;
            const it = s.data.wallet.items.find(x => norm(x.name) === norm(val)); if (!it) return;
            applyOp(s, 'item', `-${it.name} 1|`, info);
            s.data.home.storage.push(it.name);
            return;
        }
        case '_tobag': { // 📦 창고 → 🎒 소지품 (1개)
            if (!s.data.wallet || !s.data.home) return;
            const hm = s.data.home, k = hm.storage.findIndex(x => norm(x) === norm(val)); if (k < 0) return;
            const nm = hm.storage.splice(k, 1)[0];
            applyOp(s, 'item', `+${nm} 1|`, info);
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
            // 「Leon +2, Mira +3」 → 한 명씩 (v2.7.19 · 예전엔 둘 다 안 올랐음) — 「| 메모」 뒤의 쉼표는 안 나눔
            { const head = val.split('|')[0]; if (MULTI_RE.test(head) && /\d/.test(head.split(MULTI_RE)[0])) { const parts = head.split(MULTI_RE); const tail = val.slice(head.length); parts.forEach((p0, i) => p0.trim() && applyOp(s, key, p0.trim() + (i === parts.length - 1 ? tail : ''), info)); return; } }
            const rl = ensure(s, 'rel');
            const m = val.match(/^(.+?)\s*([=+\-−]\s*[\d.]+|\d[\d.]*)\s*(?:\|\s*(.*))?$/);
            if (!m) return;
            const nm = personName(s, m[1]);
            if (!nm) return;
            let r = findBy(rl.user, nm);
            if (!r) { r = { name: nm, label: '', aff: 0, trust: 0, memo: '', stage: -1, jealous: 0, met: s.data.calendar ? dateShort(s.data.calendar) : '' }; rl.user.push(r); }
            const p = bareFix(parseNum(m[2].replace(/\s+/g, '')), r[key], info); if (!p) return;
            if (key === 'aff' && p.mode === 'add' && p.v > 0) p.v = p.v * affMul(s); // 저주·축복의 호감 % 효과
            const b = r[key];
            let nv = clamp(Math.round(p.mode === 'add' ? b + p.v : p.v), -100, 100);
            if (nv > b && info.ai && romLive(s)) nv = b + romGain(s, info, r.name, key, nv - b); // 로맨스 보정: 상한
            if (key === 'aff' && r.noLove && nv > b) { if (info.ai) L(`🚫♥ ${r.name} (애정 꺼 둠)`); nv = b; } // 💗 애정 꺼 둔 사람: 안 오름 (내려가는 건 그대로)
            r[key] = nv;
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
            nm = personName(s, nm);
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
            // 「days: 2」처럼 부호 없이 와도 「며칠 지남」으로 (예전엔 그달 2일로 날아갔음)
            const daysKey = /^(days|날짜이동)$/i.test(String(rawKey).trim());
            const p = /^[+\-−]\s*\d/.test(val) ? parseNum(val.replace(/일.*$/, '')) : daysKey && /^\d{1,3}\s*(일|days?)?$/i.test(val) ? parseNum(`+${parseInt(val, 10)}`) : null;
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
            const [nm, ...rest] = splitBar(val);
            const text = rest.join(' | ');
            if (!nm || !text) return;
            // v2.7.21: 속마음(이모티콘 · 카모지)을 msg 키로 적은 답 — 글자 없이 그림 · 기호뿐이고 관계에 있는 사람이면 속마음으로 (연락 대화방에 「(￣ヘ￣)」가 쌓이지 않게)
            const mm = settings().mindMode;
            if ((mm === 'emoji' || mm === 'kaomoji') && !/[A-Za-z0-9가-힣]/.test(text) && findBy(s.data.rel?.user ?? [], nm)) { applyOp(s, 'mind', val, info); return; }
            const ct = ensure(s, 'contact');
            const who = findBy(ct.contacts, nm)?.name ?? nm.trim();
            if (!findBy(ct.contacts, who)) ct.contacts.push({ name: who, handle: '', status: '', courier: '' });
            const t = nowTick(s, info.meta);
            const letter = letterMode(ct);
            const cour = letter ? (findBy(ct.couriers, findBy(ct.contacts, who)?.courier)?.name ?? ct.couriers[0]?.name ?? '') : '';
            (ct.threads[who] ??= []).push({ id: `${info.seed}:m${ct.threads[who].length}`, from: 'them', text, date: stamp(s), at: t, arrive: t, courier: cour, express: false, rush: false, pending: false, fee: 0, edited: false, ping: true });
            if (ct.threads[who].length > THREAD_MAX) ct.threads[who] = ct.threads[who].slice(-THREAD_MAX);
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
        case '_nread': { // 📰 기사 읽음 (v2.7.19): 예전엔 기사 하나 열 때마다 뉴스 목록 전체(1KB+)를 편집 기록에 복사했음
            const it = s.data.news?.items?.find(x => x.id === val); if (it) it.read = true;
            return;
        }
        case 'npc': {
            const pf = ensure(s, 'profile');
            const [nm0, summary] = splitBar(val);
            const nm = personName(s, nm0);
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
            // v2.7.3: 내가 지운 퀘스트 · 끝난(완료·실패·포기) 퀘스트 · 보관함으로 간 퀘스트는 AI가 다시 살리지 못해요
            //   (예전: 포기한 퀘스트를 AI가 「진행」이라고 다시 적으면 진행 중으로 돌아오고, 지운 퀘스트는 「받을 수 있음」으로 되살아났어요)
            if (info.ai) {
                const key = norm(title);
                if ((qs.gone ?? []).some(g => norm(g) === key)) return;
                if (q && (q.status === 'done' || q.status === 'failed')) return;
                if (!q && (qs.archive ?? []).some(a => norm(a.title) === key)) return;
            }
            if (!q) {
                if (info.ai && !st) { // 처음 보는 퀘스트의 「진행 내용」만 온 것 → 진행 중인 퀘스트로 (예전엔 진행 글이 설명이 된 「받을 수 있음」이 생겼어요)
                    q = { id: `${info.seed}:q${qs.list.length}`, title: title.trim(), giver: '', desc: '', place: '', deadline: '', reward: '', cash: 0, items: [], status: 'active', steps: [{ text: st0, done: true }], paid: false, since: today(s) ?? undefined };
                    qs.list.push(q); L(`📜 ${QNAME.active}: ${q.title}`);
                    return;
                }
                q = { id: `${info.seed}:q${qs.list.length}`, title: title.trim(), giver: '', desc: desc ?? (st ? '' : st0 ?? ''), place: '', deadline: '', reward: '', cash: 0, items: [], status: st ?? 'open', steps: [], paid: false };
                if (today(s) !== null) q.since = today(s);
                qs.list.push(q);
                L(`📜 ${QNAME[q.status]}: ${q.title}`);
                if (q.status === 'open' || q.status === 'active') info.alerts.push(`퀘스트 — ${q.title}`);
            } else if (st && st !== q.status) {
                q.status = st; L(`📜 ${q.title}: ${QNAME[st]}`);
            } else if (!st && st0) {
                if (q.steps.some(x => norm(x.text) === norm(st0) && x.done)) return; // 같은 진행을 매 턴 다시 적어도 한 번만
                // v2.7.5: AI가 적는 「진행 내용」은 이미 한 일 → 해 둔 단계로. 할 일 목록에 같은(비슷한) 단계가 있으면 그걸 체크해요
                const k = norm(st0);
                const todo = q.steps.find(x => !x.done && (norm(x.text) === k || (k.length >= 4 && (norm(x.text).includes(k) || k.includes(norm(x.text))))));
                if (todo) { todo.done = true; L(`📜 ${q.title}: ✔ ${short(todo.text, 20)}`); }
                else { q.steps.push({ text: st0, done: true }); L(`📜 ${q.title}: ${short(st0, 20)}`); }
                if (q.status === 'open') q.status = 'active'; // 받지도 않은 의뢰를 진행했다면 수락한 것
            }
            if (desc && st) q.desc ||= desc;
            if (q.status === 'done' && !q.paid) {
                // 본편 AI가 끝낸 퀘스트도 보상 판정 (설정 · 같은 답은 늘 같은 결과가 나오게 답마다 정해진 주사위)
                if (info.ai && settings().questJudgeAI) { const r = questRoll(s, q, `${info.seed}:${q.title}`); q.judge = r.cls; L(`🎲 ${q.title}: ${JUDGE_NAME[r.cls]}`); if (r.cls === 'fumble') { q.status = 'failed'; return; } payQuest(s, q, info, JUDGE_MUL[r.cls]); }
                else payQuest(s, q, info);
            }
            return;
        }
        case '_leave': { // 🕊 이야기에서 빠진 사람 (관계 카드 단추 · v2.7.5): 이름|dead · left · back
            const rl = s.data.rel; if (!rl) return;
            const [nm, how] = splitBar(val);
            const r = findBy(rl.user, nm); if (!r) return;
            if (how === 'back') delete r.out; else r.out = how === 'dead' ? 'dead' : 'left';
            return;
        }
        case '_questpay': { // id · id|판정(crit·ok·fail·fumble)
            const [id, cls] = splitBar(val);
            const q = s.data.quest?.list.find(x => x.id === id);
            if (!q) return;
            if (cls && JUDGE_MUL[cls] !== undefined) {
                q.judge = cls;
                if (cls === 'fumble') { q.status = 'failed'; return; } // 대실패: 보상 없이 실패
                q.status = 'done'; if (!q.paid) payQuest(s, q, info, JUDGE_MUL[cls]);
            } else { q.status = 'done'; if (!q.paid) payQuest(s, q, info); }
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
// ⌛ 퀘스트 기한 (v2.7.5): 「3월 14일까지」 · 「3일 안에」 같은 기한을 달력 날짜로 바꿔 두고, 지나면 실패 · 마지막 날엔 알림
// 기한 글을 못 읽으면(「이번 축제 전」 같은 것) 그냥 글로만 둬요. 달력이 꺼져 있으면 아무것도 안 해요.
export function questDue(s, q) {
    if (Number.isFinite(q.due) && q.dueFor === q.deadline) return q.due;
    const cal = s.data.calendar; const t = String(q.deadline ?? '').trim();
    if (!cal || !t) return null;
    const rel = t.match(/(\d+)\s*(?:일|days?)\s*(?:안|내|이내|뒤|후|까지|within|later|left)?/i) || t.match(/^D\s*-\s*(\d+)$/i) || t.match(/within\s+(\d+)\s+days?/i);
    if (rel && !/월/.test(t)) return Number.isFinite(q.since) ? q.since + Number(rel[1]) : null;
    const pd = parseDate(cal, t);
    if (!pd || !pd.m || !pd.d) return null;
    try { const y = pd.y ?? cal.y; let idx = dayIndex(cal, y, pd.m, pd.d); if (pd.y === null && Number.isFinite(q.since) && idx < q.since) idx = dayIndex(cal, y + 1, pd.m, pd.d); return idx; } catch { return null; }
}
function questClock(s, info) {
    const qs = s.data.quest, now = today(s);
    if (!qs?.list?.length || now === null || settings().questExpire === false || info.mods?.quest === false) return;
    for (const q of qs.list) {
        if (q.status !== 'active' && q.status !== 'open') continue;
        const due = questDue(s, q);
        if (due === null) continue;
        q.due = due; q.dueFor = q.deadline;
        if (now > due) {
            q.status = 'failed'; q.expired = true;
            info.labels.push(`⌛ ${q.title}: 기한 지남`);
            info.alerts.push(`⌛ 퀘스트 기한이 지났어요 — ${q.title}`);
        } else if (now === due && q.warned !== due && q.status === 'active') {
            q.warned = due;
            info.alerts.push(`⏳ 오늘까지예요 — ${q.title}`);
        }
    }
}
// 🎲 퀘스트 완료 판정 (v2.7.3): 대성공 1.5배 · 성공 그대로 · 실패 돈 절반(아이템 없음) · 대실패 보상 없이 실패
export const JUDGE_MUL = { crit: 1.5, ok: 1, fail: 0.5, fumble: 0 };
export const JUDGE_NAME = { crit: '대성공', ok: '성공', fail: '아쉬운 완료', fumble: '대실패' };
const seedNum = (str) => { let h = 2166136261; for (const ch of String(str)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return (h >>> 0) / 4294967296; };
// 🎲 판정 공통 (v2.7.6): d20 + 능력치 보정 vs 목표(난이도 보정 포함) — 20 대성공 · 1 대실패
export const SOCIAL_RE = /매력|화술|말솜씨|설득|사교|교섭|협상|카리스마|charisma|charm|persuasion|speech|social|negotiat/i;
export function skillRoll(s, attrPick, dc = 12) {
    const attrs = s.data.stats?.attrs ?? [];
    const a = attrPick instanceof RegExp ? attrs.find(x => attrPick.test(x.name)) : attrPick ? findBy(attrs, attrPick) : null;
    const goal = num(dc, 12) + (DIFFS[diffOf()]?.dc ?? 0);
    const roll = Math.floor(Math.random() * 20) + 1, mod = a?.val ?? 0;
    const cls = roll === 20 ? 'crit' : roll === 1 ? 'fumble' : roll + mod >= goal ? 'ok' : 'fail';
    return { roll, mod, dc: goal, cls, attr: a ? a.name : '', detail: `d20 ${roll}${mod ? `${mod > 0 ? '+' : ''}${mod}=${roll + mod}` : ''} vs ${goal}` };
}
export function questRoll(s, q, seed) {
    const attrs = s.data.stats?.attrs ?? [];
    const a = q.check?.attr ? findBy(attrs, q.check.attr) : null;
    const dc = num(q.check?.dc, 12) + (DIFFS[diffOf()]?.dc ?? 0);
    const roll = seed === undefined ? Math.floor(Math.random() * 20) + 1 : Math.floor(seedNum(seed) * 20) + 1;
    const mod = a?.val ?? 0;
    const cls = roll === 20 ? 'crit' : roll === 1 ? 'fumble' : roll + mod >= dc ? 'ok' : 'fail';
    return { roll, mod, dc, cls, attr: a ? a.name : '', detail: `d20 ${roll}${mod ? `${mod > 0 ? '+' : ''}${mod}=${roll + mod}` : ''} vs ${dc}` };
}
function payQuest(s, q, info, mul = 1) {
    q.paid = true;
    if (s.tally) s.tally.quests++;
    const cash = Math.round((q.cash || 0) * mul);
    if (cash && s.data.wallet) applyOp(s, 'cash', `+${cash}`, info);
    if (mul >= 1) for (const it of q.items) if (s.data.wallet) applyOp(s, 'item', `+${it}`, info);
    info.alerts.push(`퀘스트 완료 — ${q.title}${q.judge ? ` · 🎲 ${JUDGE_NAME[q.judge] ?? ''}` : ''}${q.reward ? ` (${q.reward})` : ''}`);
}

export function freshState(base) {
    const data = {};
    for (const id of MOD_IDS) data[id] = base?.data?.[id] ? clone(base.data[id]) : null;
    const s = { core: clone(base?.core ?? EMPTY.core()), data, pendingRoll: null, recent: [], turn: 0, tally: clone(base?.tally) ?? null, days: clone(base?.days) ?? [], day0: base?.day0 ?? null, gone: clone(base?.gone) ?? [] };
    if (s.day0 === null && data.calendar) s.day0 = dayIndex(data.calendar);
    // 관계: 처음 단계 맞추기 (알림 없이)
    if (data.rel) { data.rel.stages ??= clone(DEFAULT_STAGES); data.rel.life ??= []; for (const r of data.rel.user ?? []) { r.jealous ??= 0; if (r.stage === undefined || r.stage === null || r.stage < 0) { r.stage = stageIndex(data.rel.stages, r.aff, r.trust); if (r.noLove) r.stage = noLoveStage(data.rel, data.rel.stages, r, r.stage); } } }
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
        const title = viewTr() ? `🎂 ${p.name}'s birthday` : `🎂 ${p.name} 생일`;
        const m = clamp(dt.m, 1, cal.months.length);
        // 같은 날 같은 사람 생일이 이미 있으면 (번역된 제목이라도) 또 넣지 않는다
        if (!cal.events.some(e => norm(e.title) === norm(title) || (e.m === m && e.d === dt.d && /🎂/.test(e.title) && norm(e.title).includes(norm(p.name)))))
            cal.events.push({ y: null, m, d: dt.d, title, desc: viewTr() ? 'from profile' : '프로필에서 자동', repeat: 'yearly', auto: 'bday' });
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
// 🔍 칩 점검 (v2.7.3): 이 키를 미트볼이 알아보나 · 어느 칸의 키인가
export function opInfo(s, rawKey) {
    let key = KEYMAP[String(rawKey).trim().toLowerCase()] ?? (String(rawKey).startsWith('_') ? String(rawKey) : null);
    const nm = String(rawKey).trim();
    if (!key && s?.data?.stats && (findBy(s.data.stats.bars, nm) || findBy(s.data.stats.attrs, nm))) key = 'stat';
    if (!key && s?.data?.wallet && norm(nm) === norm(s.data.wallet.currency)) key = 'cash';
    return { key, mod: key ? KEY_MOD[key] ?? null : null };
}
// 답 글이 그대로면 다시 읽지 않는다 (v2.7.9 · 매 계산마다 모든 답의 글을 정규식으로 다시 훑던 것이 계산 시간의 1/3)
const opsCache = new WeakMap();
export function msgOps(m) {
    const lg = legacyOn();
    let hit = opsCache.get(m);
    if (!hit || hit.mes !== m.mes || hit.lg !== lg) { hit = { mes: m.mes, lg, ops: extractOps(m.mes) }; opsCache.set(m, hit); }
    const ops = hit.ops.map(o => [...o]);
    const extra = m.extra?.[MODULE]?.bySwipe?.[m.swipe_id ?? 0];
    if (Array.isArray(extra) && !ops.length) ops.push(...extra);
    return ops;
}

// 편집 기록 차례 (v2.7.20): 예전엔 「그때 메시지 수(at)」 → 시간 순으로 다시 계산해서,
// 메시지를 지우고(at이 작아짐) 한 편집이 그 전에 한 편집(at이 큼)보다 먼저 계산됐다 → 지운 대화방 · 연락처가 되살아남.
// 이제 시간 순서를 지키되, 나중 편집의 at보다 앞 편집의 at이 크면 그 at으로 당긴다 (앞 편집이 뒤 편집보다 늦게 계산되지 않게).
export function orderAdjust(list) {
    const byT = (list ?? []).slice().sort((a, b) => a.t - b.t);
    let min = Infinity;
    for (let i = byT.length - 1; i >= 0; i--) { if (byT[i]._off) continue; if (!byT[i].an && byT[i].at > min) byT[i].at = min; min = Math.min(min, byT[i].at); }
    return byT.sort((a, b) => a.at - b.at || a.t - b.t);
}
// 메시지를 지웠을 때: 그 뒤에 묶였던 편집을 지금 끝으로 당긴다 (편집은 남기고, 분기 채팅과 구별되게) → 당긴 개수
// 묶음 열쇠: 메시지의 첫 스와이프 시각(다시 생성하면 새 메시지라 다름) + 지금 스와이프
// 메시지 열쇠: 실리의 send_date는 분 단위라 1분 안에 다시 생성하면 옛 답과 같아짐 → 첫 스와이프의 밀리초 생성 시각(gen_started)을 먼저
// 시각은 숫자(밀리초)로 통일 — 실리는 방금 만든 답엔 Date 객체, 저장 뒤 다시 읽으면 ISO 글자를 줘서 그대로 쓰면 다시 열 때 열쇠가 달라짐 (v2.7.21)
// ISO 꼴만 숫자로 (그 밖의 날짜 글자는 브라우저마다 읽는 법이 달라 PC ↔ 모바일에서 어긋나므로 글자 그대로)
const timeKey = (t) => {
    if (t === null || t === undefined || t === '') return '';
    if (t instanceof Date) { const n = t.getTime(); return Number.isFinite(n) ? String(n) : ''; }
    if (typeof t === 'number') return String(t);
    const x = String(t);
    if (/^\d{4}-\d\d-\d\dT\d\d:\d\d/.test(x)) { const n = Date.parse(x); if (Number.isFinite(n)) return String(n); }
    return x;
};
const msgHead = (m) => `${m?.is_user ? 'u' : 'a'}:${m?.name ?? ''}:`;
// 내 메시지엔 생성 시각이 없고 send_date는 분 단위 → 행동을 묶을 때 메시지에 밀리초 표(extra.ss_at)를 붙여 둠 (내 메시지는 스와이프가 없어 extra가 안 바뀜)
const msgTime = (m) => { if (m?.is_user && m?.extra?.ss_at) return m.extra.ss_at; const first = m?.swipe_info?.[0]; return first?.gen_started ?? (first ? null : m?.gen_started) ?? first?.send_date ?? m?.send_date ?? ''; };
function stampUser(meta, m) {
    if (!m?.is_user || m.extra?.ss_at) return;
    const old = msgKey(m);
    if (!m.extra || typeof m.extra !== 'object') m.extra = {};
    m.extra.ss_at = Math.floor(Date.now() * 1000 + Math.random() * 1000);
    const now = msgKey(m);
    for (const a of meta.adjust ?? []) if (a.an && a.an.slice(0, a.an.lastIndexOf('|')) === old) a.an = `${now}${a.an.slice(a.an.lastIndexOf('|'))}`; // 표 붙이기 전에 묶인 것도 따라옴
}
export function msgKey(m) { return msgHead(m) + timeKey(msgTime(m)); }
// 이어쓰기: 실리가 그 답의 생성 시각을 새로 써서 열쇠가 바뀜 → 시작할 때 옛 열쇠를 적어 두고, 바뀌면 묶인 편집을 새 열쇠로 옮김
let contNote = null;
export function noteGeneration(type) {
    const chat = ctx().chat ?? [], last = chat.at(-1);
    contNote = type === 'continue' && last && !last.is_user ? { i: chat.length - 1, old: msgKey(last), sid: last.swipe_id ?? 0, m: last } : null;
}
export const dropContinueNote = () => { contNote = null; };
function moveContinued(meta, chat) {
    const n = contNote; if (!n) return;
    const m = chat[n.i];
    if (m !== n.m || (m.swipe_id ?? 0) !== n.sid) { contNote = null; return; } // 다른 메시지가 됐으면 버림
    const now = msgKey(m); if (now === n.old) return;
    for (const a of meta.adjust ?? []) if (a.an && a.an.slice(0, a.an.lastIndexOf('|')) === n.old) a.an = `${now}${a.an.slice(a.an.lastIndexOf('|'))}`;
    n.old = now;
}
// 2.7.21 시험판이 남긴 옛 꼴 열쇠(시각을 글자 그대로)를 지금 메시지와 맞춰 새 꼴로 — 못 찾을 때만 한 번
function legacyKeys(chat) {
    const map = new Map();
    chat.forEach((m, i) => { const t = msgTime(m), h = msgHead(m); const d = t instanceof Date ? t : (typeof t === 'string' && /^\d{4}-\d\d-\d\dT/.test(t) ? new Date(t) : null);
        if (typeof t === 'string') map.set(h + t, i);
        if (d && Number.isFinite(d.getTime())) { map.set(h + String(d), i); map.set(h + d.toISOString(), i); } });
    return map;
}
export const anchorOf = (m) => `${msgKey(m)}|${m?.swipe_id ?? 0}`;
// 이야기와 상관없는 정리 · 설정 편집은 묶지 않음 (메시지를 지워도 남음): 번역 · 영어 저장(라벨 없는 칸 저장) · 완전 삭제 · 읽음 · 메모 · 업적 표시 · 애정 끄기 · 연인 확정
const META_OPS = new Set(['_purge', '_read', '_nread', '_memo', '_achtog', '_nolove', '_love', '_bond', '_unbond', '_alert']);
export const isMetaEdit = (a) => (a?.ops?.length ? a.ops.every(([k]) => META_OPS.has(k)) : !!a?.set && !a.label && !a.silent) || a?.keep === true; // 조용한 저장(구매 때 상점 재고 −1 등)은 행동이라 묶음
export function clampAdjust(meta, len) {
    let n = 0;
    for (const e of meta?.adjust ?? []) if (!e.an && e.at > len) { e.at = len; n++; } // 묶인 편집은 당기지 않음 (묶인 메시지가 없으면 계산에서 빠짐)
    return n;
}
// 다시 생성 · 스와이프한 답이 편집보다 새것이면, 그 편집에 남은 「그 답이 만든 소식」 사본은 옛 답의 것 → 지금 답의 것을 살린다 (v2.7.20)
const FEED_LISTS = { news: 'items', gossip: 'issues', board: 'posts', sns: 'posts' };
const genTime = (m) => { const t = Date.parse(m?.swipe_info?.[m?.swipe_id ?? 0]?.gen_finished ?? m?.gen_finished ?? m?.send_date ?? ''); return Number.isFinite(t) ? t : NaN; };
function keepFreshFeed(list, before, after, a, seed, chat) {
    if (!Array.isArray(before) || !Array.isArray(after)) return after;
    const pre = `${seed}:`;
    const idx = (it) => { const id = String(it?.id ?? ''); if (!id.startsWith(pre)) return -1; const m = /^(\d+):/.exec(id.slice(pre.length)); return m ? +m[1] : -1; };
    const newer = new Set();
    for (const it of [...before, ...after]) { const i = idx(it); if (i >= 0 && !newer.has(i) && genTime(chat[i]) > a.t) newer.add(i); }
    if (!newer.size) return after;
    return after.filter(it => !newer.has(idx(it))).concat(before.filter(it => newer.has(idx(it))));
}

const adjEvents = new Map();
export function compute(limit, opts = {}) {
    const c = ctx();
    const meta = getMeta();
    if (!meta?.base) return null;
    const chat = c.chat ?? [];
    adjEvents.clear(); // 편집 기록 알림은 이번 계산 것만 (예전엔 세션 내내 쌓였음)
    const slimmed = [];
    const s = freshState(meta.base);
    s.turn = meta.baseTurn ?? 0;
    const snaps = new Map();
    const n = Math.min(limit ?? chat.length, chat.length);
    const start = resolveStart(meta, chat);
    // 분기한 채팅의 뒷부분 편집은 채팅을 열 때 followBranch(safe.js)가 지운다 — 여기서 걸러 두기만 하면 채팅이 그 길이를 다시 넘을 때 되살아나서 거르지 않는다
    // 지운 메시지 뒤의 편집은 지울 때 당겨 둔다(clampAdjust) · 2.7.20 앞 채팅은 처음 한 번 당긴다
    if (!meta.atFix) { clampAdjust(meta, chat.length); meta.atFix = true; }
    // 묶인 편집: 묶인 메시지가 지금 채팅에 그 스와이프로 있을 때만 · 자리는 그 메시지 바로 뒤
    moveContinued(meta, chat);
    const byKey = new Map(); chat.forEach((m, i) => byKey.set(msgKey(m), i));
    let legacy = null;
    const live = (a) => {
        if (!a.an) return true;
        const k = a.an.lastIndexOf('|'); let i = byKey.get(a.an.slice(0, k));
        if (i === undefined && !/:\d*$/.test(a.an.slice(0, k))) { i = (legacy ??= legacyKeys(chat)).get(a.an.slice(0, k)); if (i !== undefined) a.an = `${msgKey(chat[i])}${a.an.slice(k)}`; }
        if (i === undefined || String(chat[i].swipe_id ?? 0) !== a.an.slice(a.an.lastIndexOf('|') + 1)) return false;
        a.at = i + 1; return true;
    };
    for (const a of meta.adjust ?? []) a._off = !live(a);
    const adj = orderAdjust(meta.adjust);
    const seed = String(c.getCurrentChatId?.() ?? MODULE);
    let lastAI = -1;
    for (let i = n - 1; i >= start; i--) if (isStoryAI(chat[i])) { lastAI = i; break; }
    let ai = 0, fresh = null;
    markRomFrom(meta, chat);
    const romFrom = Number.isFinite(meta.romFrom) ? meta.romFrom : Infinity;
    const romRun = settings().romFatigue;
    const wipe = meta.wipe && Object.keys(meta.wipe).length ? meta.wipe : null;
    const runAdjust = (a) => {
        if (a._off) return; // 지운 · 바꾼 메시지 뒤의 행동 (그 스와이프로 돌아오면 다시)
        s.romActive = a.at >= romFrom;
        const info = { seed: `${seed}:adj:${a.t}`, labels: [], alerts: [], mods: meta.mods, meta, cut: 0 };
        if (a.set?.patch) { // v2.7.7: 연락 · 피드는 바뀐 부분만 (칸 통째 복사본이 쌓여 채팅 파일이 MB로 불던 것)
            if (DELTA_MODS.has(a.set.mod) && s.data[a.set.mod]) {
                try {
                    const lk = FEED_LISTS[a.set.mod], md = s.data[a.set.mod];
                    const before = lk && Array.isArray(md[lk]) ? md[lk].slice() : null;
                    applyDelta(md, a.set.patch);
                    if (before) md[lk] = keepFreshFeed(lk, before, md[lk], a, seed, chat);
                } catch (e) { ssWarn(LOG, 'delta', e); }
            }
        } else if (a.set) {
            // 옛 채팅 줄이기 (v2.7.10): 예전에 칸 통째로 적힌 연락 · 피드 기록을 「그때 상태와 달라진 부분」으로 바꿔 둔다 (이번 계산 결과는 그대로)
            if (opts.slim && a.set.data && DELTA_MODS.has(a.set.mod) && isPlain(s.data[a.set.mod])) {
                try { const p = deltaOf(normalize(a.set.mod, clone(s.data[a.set.mod])), a.set.data); slimmed.push([a, p]); } catch (e) { ssWarn(LOG, 'slim', e); }
            }
            if (a.set.mod === 'core') s.core = clone(a.set.data);
            else if (MOD_IDS.includes(a.set.mod)) {
                s.data[a.set.mod] = clone(a.set.data);
                if (a.set.mod === 'rel') for (const r of s.data.rel.user) { if (s.bonds && Object.hasOwn(s.bonds, norm(r.name))) r.bond = s.bonds[norm(r.name)]; if (s.nolove && Object.hasOwn(s.nolove, norm(r.name))) { if (s.nolove[norm(r.name)]) r.noLove = true; else delete r.noLove; } updateStage(s, r, info, true); }
                if (a.set.mod === 'calendar' && s.day0 === null) s.day0 = dayIndex(s.data.calendar);
            }
        }
        const had = a.ops?.length || (a.set && a.label) ? owned(s) : null; // 번역 · 영어 저장으로 바꾼 칸(이름 없는 기록)은 「버림」으로 안 셈
        for (const [k, v] of a.ops ?? []) applyOp(s, k, v, info);
        checkRules(s, info);
        if (had) trackGone(s, had, a.ops?.some(([k]) => k === '_sellused' || k === 'cash') ? 'sold' : 'discarded');
        if (a.label && !a.silent) s.dayBuf?.labels.push(a.label);
        adjEvents.set(a.t, info.alerts);
        if (a.at > lastAI && a.label && !a.silent) s.recent.push(a.label);
    };
    for (let i = start; i < n; i++) {
        while (ai < adj.length && adj[ai].at <= i) runAdjust(adj[ai++]);
        const m = chat[i];
        if (!isStoryAI(m)) continue;
        s.turn++;
        let ops = msgOps(m);
        if (!ops.length) continue;
        if (wipe) ops = ops.filter(([k]) => { const md = opMod(s, k); return !(md && (wipe[md] ?? -1) > i); }); // 🧹 전체 삭제한 칸의 옛 변화는 빼기
        if (!ops.length) continue;
        s.romActive = i >= romFrom;
        const info = { seed: `${seed}:${i}`, labels: [], alerts: [], mods: meta.mods, roll: null, meta, cut: 0, ai: true };
        const before = i === lastAI && !opts.bake && settings().freshDot !== false ? freshSnap(s) : null; // 🔴 방금 AI 답에서 바뀐 곳 (v2.7.3)
        for (const [k, v] of ops) applyOp(s, k, v, info);
        if (romRun && s.romActive) { const used = info.romUsed ?? {}; const run = (s.romRun ??= {}); for (const k of new Set([...Object.keys(run), ...Object.keys(used)])) run[k] = used[k] > 0 ? (run[k] ?? 0) + 1 : 0; }
        checkRules(s, info);
        if (before) fresh = freshDiff(before, s, `${seed}:${i}:${m.swipe_id ?? 0}`);
        if (s.gone.length) trackGone(s, null); // AI가 다시 얻은 물건은 「없음」 목록에서 빼기
        s.dayBuf?.labels.push(...info.labels.slice(info.cut));
        snaps.set(i, { labels: info.labels, alerts: info.alerts, roll: info.roll, turn: s.turn });
        if (i === lastAI && info.roll) s.pendingRoll = info.roll;
    }
    const adjLimit = opts.bake ? n : Infinity;
    while (ai < adj.length && adj[ai].at <= adjLimit) runAdjust(adj[ai++]);
    for (const m of ['news', 'gossip', 'board', 'quest', 'sns']) if (s.data[m]) tidy(m, s.data[m]);
    try { birthdays(s); } catch (e) { ssWarn(LOG, 'bday', e); }
    const cal = s.data.calendar;
    if (cal?.autoWeather && !cal.weather && modOn('calendar', meta)) cal.weather = pickWeather(cal, `${seed}:w${dayIndex(cal)}`);
    for (const [a, p] of slimmed) a.set = { mod: a.set.mod, patch: p };
    return { state: s, snaps, lastAI, rest: adj.slice(ai), fresh, slimmed: slimmed.length };
}
// 옛 채팅(v2.7.6 이하)에 쌓인 연락 · 피드 통째 기록을 한 번 줄인다 → 줄인 개수
export function slimLegacy(meta = getMeta()) {
    if (!meta?.base || meta.slim277) return 0;
    const fat = (meta.adjust ?? []).filter(a => a.set?.data && DELTA_MODS.has(a.set.mod)).length;
    if (fat < 2) { meta.slim277 = true; return 0; }
    const r = compute(undefined, { slim: true });
    meta.slim277 = true;
    return r?.slimmed ?? 0;
}
// ───── 🗑 버리거나 판 물건 (v2.7.3) ─────
// 창고에서 버린 가구 · 판 물건은 상태창에선 사라져도, AI는 지난 이야기를 보고 「아직 있다」고 여겨 다시 쓰거나 decor로 되살렸다.
// 내가 직접 없앤 것(편집 기록)만 모아서, 「이제 없음」으로 한 줄 알려 준다 (최근 30턴 · 12개까지 · 다시 얻으면 빠짐)
function owned(s) {
    const m = new Map();
    const add = (n) => { const k = norm(n); if (k) m.set(k, String(n)); };
    for (const it of s.data.wallet?.items ?? []) add(it.name);
    for (const x of s.data.home?.storage ?? []) add(x);
    for (const r of s.data.home?.rooms ?? []) for (const x of r.decor ?? []) add(x);
    return m;
}
function trackGone(s, had, how = 'discarded') {
    const now = owned(s);
    if (had) for (const [k, n] of had) if (!now.has(k) && !s.gone.some(g => norm(g.name) === k)) s.gone.push({ name: n, how, turn: s.turn });
    if (s.gone.length) s.gone = s.gone.filter(g => !now.has(norm(g.name)) && s.turn - g.turn <= 30).slice(-12);
}
// 🕊 이야기에서 빠진 사람: 상태창 데이터는 남기고(되돌릴 수 있게) AI에게 가는 글에서만 빼고 한 줄로 알려 줘요
export const outLine = (s) => { const out = (s?.data?.rel?.user ?? []).filter(r => r.out); return out.length ? `Out of the story (${out.map(r => `${r.name} — ${r.out === 'dead' ? 'died' : 'left'}`).join(', ')}): they cannot appear, talk, send messages or act in scenes unless the story explicitly brings them back.` : ''; };
function withoutOut(r) {
    const rl = r?.state?.data?.rel;
    if (!rl?.user?.some(x => x.out)) return r;
    const out = new Set(rl.user.filter(x => x.out).map(x => norm(x.name)));
    const data = { ...r.state.data, rel: { ...rl, user: rl.user.filter(x => !x.out), pairs: (rl.pairs ?? []).filter(p => !out.has(norm(p.a)) && !out.has(norm(p.b))) } };
    if (data.contact?.contacts) data.contact = { ...data.contact, contacts: data.contact.contacts.filter(c => !out.has(norm(c.name))) };
    if (data.profile?.list) data.profile = { ...data.profile, list: data.profile.list.filter(p => !out.has(norm(p.name))) };
    return { ...r, state: { ...r.state, data } };
}
export const goneLine = (s) => (settings().goneInject === false || !s?.gone?.length ? '' : `No longer owned by {{user}} (used up, thrown away or sold — do not use, wear, place or mention them as still owned, and do not re-add them unless the story gets them back): ${s.gone.map(g => g.name).join(', ')}`);
// ───── 🔴 방금 AI 답에서 바뀐 곳 (v2.7.3) ─────
// 마지막 AI 답의 변화를 적용하기 전 · 후를 칸마다 비교해서, 바뀐 칸(mod) · 줄(이름 있는 항목) · 값(key)을 모은다. 마지막 답 하나만 · 계산 1번에 1번.
const freshName = (x) => (x && typeof x === 'object' ? x.name ?? x.title ?? x.text ?? x.who ?? null : null);
function freshSnap(s) {
    const o = { core: JSON.stringify(s.core) };
    for (const [k, v] of Object.entries(s.data)) if (v) o[k] = JSON.stringify(v);
    return o;
}
const freshKeep = new Map(); // 같은 답을 다시 계산해도 「이미 본 탭」은 그대로 (갱신마다 점이 되살아나지 않게)
export function freshDiff(before, s, key) {
    const mods = new Set(), items = new Set();
    const after = freshSnap(s);
    for (const mod of new Set([...Object.keys(before), ...Object.keys(after)])) {
        if (before[mod] === after[mod]) continue;
        mods.add(mod);
        let a, b; try { a = before[mod] ? JSON.parse(before[mod]) : {}; b = mod === 'core' ? s.core : s.data[mod] ?? {}; } catch { continue; }
        for (const k of Object.keys({ ...a, ...b })) {
            const x = a?.[k], y = b?.[k];
            if (JSON.stringify(x) === JSON.stringify(y)) continue;
            items.add(`${mod}.${k}`);
            if (Array.isArray(y)) {
                const old = new Map((Array.isArray(x) ? x : []).map(e => [freshName(e) ?? JSON.stringify(e), JSON.stringify(e)]));
                for (const e of y) { const n = freshName(e) ?? JSON.stringify(e); if (old.get(n) !== JSON.stringify(e)) items.add(`${mod}.${k}:${norm(n)}`); }
            }
        }
    }
    if (!mods.size) return null;
    let seen = freshKeep.get(key);
    if (!seen) { const sv = getMeta()?.freshSeen; seen = new Set(sv?.key === key ? sv.mods : []); freshKeep.set(key, seen); if (freshKeep.size > 6) freshKeep.delete(freshKeep.keys().next().value); }
    return { key, mods, items, seen };
}
// 화면에서: 이 칸 · 이 값 · 이 이름의 줄이 방금 바뀌었나
export function isFresh(fr, mod, k, name) {
    if (!fr || settings().freshDot === false || !fr.mods.has(mod)) return false;
    if (!k) return true;
    return name === undefined ? fr.items.has(`${mod}.${k}`) : fr.items.has(`${mod}.${k}:${norm(name)}`);
}

// 직접 편집·구매·추가 지시 기록
export async function addAdjust(entry) {
    const meta = getMeta(true);
    meta.adjust ??= [];
    // 순서 보장: 같은 밀리초에 두 번 눌러도 누른 순서대로 다시 계산되게 (전에는 난수라 순서가 뒤바뀔 수 있었음)
    let t = Date.now();
    for (const e of meta.adjust) if (e.t >= t) t = e.t + 0.001;
    const a = { at: ctx().chat?.length ?? 0, t, ...entry };
    // v2.7.21: 이야기 속 행동(구매 · 이동 · 판정 · 연락 …)은 바로 앞 메시지의 그 스와이프에 묶는다
    // → 그 메시지를 지우거나 · 몇 개 전으로 지우거나 · 다시 생성 · 다른 스와이프로 넘기면 같이 사라지고, 그 스와이프로 돌아오면 살아남
    if (!isMetaEdit(a)) { const last = ctx().chat?.at(-1); if (last) { stampUser(meta, last); a.an = anchorOf(last); } }
    for (const e of meta.adjust) if (e.at > a.at) e.at = a.at; // 메시지를 지운 뒤의 편집: 앞 편집이 이 편집보다 늦게 계산되지 않게 (v2.7.20)
    // 같은 칸을 통째로 덮는 기록이 이야기 진행 없이 또 오면, 앞 기록의 칸 데이터는 쓸모가 없다 (라벨만 남김) → 채팅 파일 비대 방지
    // (새 것 + 바로 앞 2개는 남겨서 '되돌리기'를 두 번까지 정확히 할 수 있게)
    // (바뀐 부분만 적은 기록(patch)은 서로 쌓여야 맞으니 지우지 않는다 — 작아서 괜찮음)
    if (a.set?.data) { const same = meta.adjust.filter(e => e.at === a.at && e.set?.mod === a.set.mod && e.set.data); for (const e of same.slice(0, -2)) delete e.set; }
    meta.adjust.push(a);
    if (meta.adjust.length > 80) squash(meta);
    await saveMeta();
    app.refreshNow?.();
    for (const t of adjEvents.get(a.t) ?? []) app.notify ? app.notify(t) : toastr.info(esc(typeof t === 'string' ? t : t.text ?? ''), TITLE);
}
// 🗑 쓰레기통 완전 삭제 — 찌꺼기 없이: 「버렸다」 편집 기록을 조용한 삭제로 바꿔 쓰고, 굳힌 기준점·하루 기록·칸 스냅샷에서도 지운다.
// 채팅 메시지는 건드리지 않고, AI에게 가는 「UI 행동」 줄에도 안 남는다. 세이브 슬롯(일부러 저장한 과거 시점)은 그대로.
export async function purgeTrash(names) {
    const meta = getMeta();
    if (!meta?.base || !names?.length) return 0;
    const said = (nm) => (l) => typeof l === 'string' && (l === `${nm}을(를) 버렸다` || l === `🗑 ${nm}`);
    let n = 0;
    for (const nm of names) {
        const key = norm(nm);
        // ① 아직 굳히지 않은 편집 기록: 가장 최근에 이 이름을 버린 기록 하나를 찾아 바꿔 쓴다
        const adj = (meta.adjust ?? []).slice().sort((a, b) => b.at - a.at || b.t - a.t);
        const hit = adj.find(a => (a.ops ?? []).some(([k, v]) => k === '_trash' && norm(splitBar(v)[0]) === key));
        if (hit) {
            hit.ops = hit.ops.map(([k, v]) => (k === '_trash' && norm(splitBar(v)[0]) === key ? ['_purge', splitBar(v)[0]] : [k, v]));
            if (hit.ops.every(([k]) => k === '_purge')) { delete hit.label; hit.silent = true; }
            n++;
        } else {
            // ② 이미 굳힌 기준점 안의 쓰레기통에서 하나 지우기
            const tr = meta.base.data?.home?.trash;
            const k = tr ? tr.map(t => norm(t.name)).lastIndexOf(key) : -1;
            if (k >= 0) { tr.splice(k, 1); n++; }
        }
        // ③ 칸을 통째로 저장한 기록(직접 편집·AI로 수정)에 남은 쓰레기통 사본에서도 빼기
        for (const a of meta.adjust ?? []) if (a.set?.mod === 'home' && Array.isArray(a.set.data?.trash)) a.set.data.trash = a.set.data.trash.filter(t => norm(t.name) !== key);
        // ④ 하루 정리 기록에 남은 「버렸다」 줄 지우기 (굳힌 것)
        for (const d of meta.base.days ?? []) if (Array.isArray(d.labels)) { const before = d.labels.length; d.labels = d.labels.filter(l => !said(nm)(l)); d.n = Math.max(0, (d.n ?? before) - (before - d.labels.length)); }
    }
    if (n) { await saveMeta(); app.refreshNow?.(); }
    return n;
}
// ───── 🧹 기록 · 칸 지우기 (v2.7.18) — 찌꺼기 없이 ─────
// 미트볼 전용 기록 키(_roll 같은 것)가 어느 칸 것인지
export const PRIV_MOD = {
    _achtog: 'ach', _bond: 'rel', _love: 'rel', _nolove: 'rel', _leave: 'rel', _unbond: 'rel', _peekday: 'rel',
    _draw: 'fate', _effect: 'fate', _loan: 'wallet', _repay: 'wallet', _sellused: 'wallet', _tobag: 'wallet', _memo: 'memo', _questpay: 'quest',
    _read: 'contact', _nread: 'news', _roll: 'dice', _trash: 'home', _purge: 'home', _restore: 'home', _tostore: 'home', _unplace: 'home', _travel: 'map',
};
export const opMod = (s, k) => opInfo(s, k).mod ?? PRIV_MOD[k] ?? null;
// 편집 기록에서 조건에 맞는 변화만 빼기 (빈 기록은 통째로) → 뺀 개수
function stripAdjust(meta, s, drop) {
    let n = 0;
    meta.adjust = (meta.adjust ?? []).filter(a => {
        if (drop.entry?.(a)) { n++; return false; }
        if (Array.isArray(a.ops) && a.ops.length) {
            const keep = a.ops.filter(([k, v]) => !drop.op?.(k, v, a));
            if (keep.length !== a.ops.length) { n += a.ops.length - keep.length; a.ops = keep; }
        }
        if (!a.ops?.length && !a.set) return false; // 남은 게 없으면 기록 자체를 (라벨 · 알림 · AI에게 가는 「UI 행동」 줄까지) 지움
        return true;
    });
    return n;
}
// 칸 전체 삭제할 때 남겨 두는 「틀」 (날짜 · 화폐 · 단계표 · 연락 방식처럼 내용이 아니라 설정인 것)
const WIPE_KEEP = {
    calendar: ['y', 'm', 'd', 'time', 'era', 'months', 'week', 'times', 'autoWeather', 'noAuto'], wallet: ['currency', 'fx', 'prices'],
    contact: ['mode', 'app', 'couriers', 'express'], rel: ['stages', 'affName', 'trustName'], dice: ['system', 'rules', 'quick'],
    music: ['taste'], fate: ['deck', 'drawChance', 'rules'], news: ['name'], gossip: ['name'], board: ['name'], sns: ['name'], profile: ['mode'], home: ['name', 'desc'], map: ['name'],
};
export function wipedData(mod, cur) {
    const out = EMPTY[mod]();
    for (const k of WIPE_KEEP[mod] ?? []) if (cur && Object.hasOwn(cur, k)) out[k] = clone(cur[k]);
    return normalize(mod, out);
}
// 🧹 칸 하나 전체 삭제: 내용 · 이 칸의 편집 기록 · 지금까지 AI 답에 적힌 이 칸의 변화를 모두 없앤 것으로 (채팅 글은 그대로)
// 굳힌 기준점 · 하루 정리 · 플레이 기록 숫자에서도 뺀다. 세이브 슬롯(일부러 저장한 과거 시점)만 그대로.
export async function wipeModule(mod) {
    const meta = getMeta(); const s = app.current?.state;
    if (!meta?.base || !s || !MOD_IDS.includes(mod)) return false;
    const chat = ctx().chat ?? [];
    stripAdjust(meta, s, { entry: (a) => a.set?.mod === mod, op: (k) => opMod(s, k) === mod });
    meta.base.data[mod] = wipedData(mod, s.data[mod]);
    meta.wipe = { ...(meta.wipe ?? {}), [mod]: chat.length }; // 이 앞의 AI 답에 적힌 이 칸 변화는 계산에서 뺀다
    const T = meta.base.tally;
    if (T) {
        if (mod === 'dice') { T.rolls = 0; T.good = 0; T.crit = 0; T.fumble = 0; }
        if (mod === 'contact') T.got = 0;
        if (mod === 'quest') T.quests = 0;
        if (mod === 'fate') T.curses = 0;
        if (mod === 'wallet') { T.earn = 0; T.spend = 0; }
        if (mod === 'map') T.places = [];
    }
    if (mod === 'rel') for (const d of meta.base.days ?? []) d.aff = [];
    if (mod === 'wallet') { for (const d of meta.base.days ?? []) d.cash = 0; meta.base.gone = []; }
    if (mod === 'home') meta.base.gone = [];
    await saveMeta();
    app.refreshNow?.();
    return true;
}
// 🎲 주사위 기록 지우기: 하나(그 굴림) 또는 전부 (v2.7.18 · 예전엔 재미로 한 번 굴려도 지울 수 없었음)
const sameRoll = (a, b) => !!a && !!b && (a.t && b.t ? a.t === b.t : a.res === b.res && a.label === b.label && a.detail === b.detail);
export async function purgeRolls(one = null) {
    const meta = getMeta(); const s = app.current?.state;
    if (!meta) return 0;
    let n = 0, gone = false;
    const hit = (v) => { if (!one) return true; if (gone) return false; try { const r = JSON.parse(v); if (sameRoll(r, one)) { gone = true; return true; } } catch { /* */ } return false; };
    // 가장 최근 것부터 찾아야 같은 결과가 여럿일 때 최근 것이 지워진다
    meta.adjust = (meta.adjust ?? []).slice().reverse();
    n += stripAdjust(meta, s, { op: (k, v) => k === '_roll' && hit(v) });
    meta.adjust.reverse();
    const lg = meta.base?.data?.dice?.log;
    if (Array.isArray(lg) && (!one || !gone)) {
        if (!one) { n += lg.length; meta.base.data.dice.log = []; } else { const k = lg.map((r, i) => [r, i]).reverse().find(([r]) => sameRoll(r, one))?.[1]; if (k !== undefined) { lg.splice(k, 1); n++; } }
    }
    if (!one && meta.base?.tally) Object.assign(meta.base.tally, { rolls: 0, good: 0, crit: 0, fumble: 0 });
    await saveMeta();
    app.refreshNow?.();
    return n;
}
// 마지막 편집 되돌리기 (상태창에서 한 것만 · AI 답은 그대로)
export async function undoLast() {
    const meta = getMeta();
    // 완전 삭제로 바꿔 쓴 기록은 건너뛴다 (되돌리기로 지운 물건이 창고에 되살아나지 않게)
    const isPurge = (e) => e?.silent && (e.ops ?? []).length && e.ops.every(([k]) => k === '_purge');
    const idx = (meta?.adjust ?? []).findLastIndex(e => !isPurge(e) && !e._off); // 지금 안 보이는(다른 스와이프의) 편집은 건너뜀
    if (idx < 0) return null;
    const a = meta.adjust.splice(idx, 1)[0];
    await saveMeta();
    app.refreshNow?.();
    return a;
}
// 편집 기록 하나만 골라 되돌리기 (v2.7.6 · 관리 탭 › 되돌리기 › 편집 기록) — 그 뒤의 기록은 그대로 다시 계산돼요
export async function undoAt(t) {
    const meta = getMeta();
    const i = (meta?.adjust ?? []).findIndex(e => e.t === t);
    if (i < 0) return null;
    const a = meta.adjust.splice(i, 1)[0];
    await saveMeta();
    app.refreshNow?.();
    return a;
}
// ───── 바뀐 부분만 기록 (v2.7.7) ─────
// 연락 · 뉴스 · 소문 · 게시판 · SNS는 버튼 한 번마다 칸 전체(모든 대화방)를 편집 기록에 통째로 복사했다 → 오래 쓰면 채팅 파일이 MB 단위.
// 이제 지금 상태와 비교해 바뀐 칸(대화방은 그 사람 것만)만 적는다. 계산할 땐 그 시점 상태 위에 덮어쓴다.
export const DELTA_MODS = new Set(['contact', 'news', 'gossip', 'board', 'sns']);
const isPlain = (x) => !!x && typeof x === 'object' && !Array.isArray(x);
const same = (x, y) => x === y || JSON.stringify(x) === JSON.stringify(y);
// 목록은 「앞에서 d개 빼고 · 뒤에 몇 개 붙임」으로 적을 수 있으면 그렇게 (대화방에 한 줄 보내면 그 한 줄만)
function listDelta(a, b) {
    if (!Array.isArray(a) || !Array.isArray(b)) return null;
    const A = a.map(x => JSON.stringify(x)), B = b.map(x => JSON.stringify(x));
    for (let d = 0; d <= A.length; d++) {
        const n = A.length - d;
        if (n > B.length) continue;
        let ok = true;
        for (let i = 0; i < n; i++) if (A[d + i] !== B[i]) { ok = false; break; }
        if (ok) return n || !A.length ? { $d: d, $p: b.slice(n) } : null;
    }
    return null;
}
const isList = (x) => isPlain(x) && Object.hasOwn(x, '$p') && Object.hasOwn(x, '$d');
function valDelta(a, b) { const l = listDelta(a, b); return l && JSON.stringify(l).length < JSON.stringify(b).length ? l : b; }
export function deltaOf(a, b) {
    const p = { top: {}, del: [], sub: {} };
    for (const k of Object.keys(b)) {
        if (same(a[k], b[k])) continue;
        if (isPlain(a[k]) && isPlain(b[k])) {
            const set = {}, del = [];
            for (const sk of Object.keys(b[k])) if (!same(a[k][sk], b[k][sk])) set[sk] = valDelta(a[k][sk], b[k][sk]);
            for (const sk of Object.keys(a[k])) if (!Object.hasOwn(b[k], sk)) del.push(sk);
            p.sub[k] = del.length ? { set, del } : { set };
        } else p.top[k] = valDelta(a[k], b[k]);
    }
    for (const k of Object.keys(a)) if (!Object.hasOwn(b, k)) p.del.push(k);
    return p;
}
const putVal = (cur, v) => (isList(v) ? (Array.isArray(cur) ? cur.slice(v.$d) : []).concat(clone(v.$p)) : clone(v));
export function applyDelta(d, p) {
    for (const [k, v] of Object.entries(p.top ?? {})) d[k] = putVal(d[k], v);
    for (const k of p.del ?? []) delete d[k];
    for (const [k, { set = {}, del = [] }] of Object.entries(p.sub ?? {})) {
        const o = isPlain(d[k]) ? d[k] : (d[k] = {});
        for (const [sk, sv] of Object.entries(set)) o[sk] = putVal(o[sk], sv);
        for (const sk of del) delete o[sk];
    }
    return d;
}
export function commit(mod, data, label, extra = {}) {
    const nd = mod === 'core' ? NORM.core(data) : normalize(mod, data);
    const cur = DELTA_MODS.has(mod) ? app.current?.state?.data?.[mod] : null;
    if (isPlain(cur)) {
        try {
            const patch = deltaOf(normalize(mod, clone(cur)), nd);
            // 바뀐 게 없으면 기록하지 않는다 (v2.7.20 · 빈 기록이 쌓여 채팅 파일만 커지던 것)
            if (!Object.keys(patch.top).length && !patch.del.length && !Object.keys(patch.sub).length && !label && !Object.keys(extra).length) return;
            return addAdjust({ set: { mod, patch }, label, ...extra });
        } catch (e) { ssWarn(LOG, 'delta', e); }
    }
    return addAdjust({ set: { mod, data: nd }, label, ...extra });
}
// 최근 이만큼의 메시지는 굳히지 않는다 (지우기 · 다시 생성 · 스와이프로 되감기는 이 안에서) — 설정 rewindKeep (10~120 · 기본 40)
const squashKeep = () => clamp(parseInt(settings().rewindKeep, 10) || 40, 10, 120);
export function squash(meta, keep = squashKeep()) {
    const chat = ctx().chat ?? [];
    const start = resolveStart(meta, chat);
    let cut = Math.max(start, chat.length - keep);
    let r = compute(cut, { bake: true });
    if (!r) return;
    if (r.rest.length > 150) { cut = chat.length; r = compute(cut, { bake: true }); } // 최근 기록이 너무 많으면 전부 굳힘
    if (settings().autoSave && meta.base) {
        // 굳히기 전에 지금 기준점을 자동 세이브로 (분기·실수 대비, 최근 3개)
        meta.saves = arr(meta.saves).filter(x => !x.auto).concat(arr(meta.saves).filter(x => x.auto).slice(-1), [{ id: uid(), auto: true, name: '자동 세이브', t: Date.now(), at: meta.startAt ?? 0, key: meta.startKey ?? null, base: clone(meta.base), baseTurn: meta.baseTurn ?? 0, adjust: clone(meta.adjust ?? []), mods: { ...meta.mods }, difficulty: meta.difficulty }]);
    }
    meta.base = { core: r.state.core, data: r.state.data, tally: r.state.tally, days: r.state.days, day0: r.state.day0, gone: r.state.gone };
    meta.baseTurn = r.state.turn;
    meta.startAt = cut;
    meta.startKey = chat[cut - 1]?.send_date ?? null;
    meta.adjust = r.rest;
}
// 긴 채팅: 굳히지 않은 메시지가 너무 많으면 오래된 쪽을 굳혀서 매 턴 다시 계산하는 양을 줄인다 (v2.7)
// 최근 BAKE_KEEP개는 그대로 → 그 안의 스와이프·편집·삭제는 예전처럼 바로 반영된다
export const BAKE_KEEP = 120;
export function autoBake(meta = getMeta()) {
    const set = settings();
    if (!meta?.base || set.autoBake === false) return false;
    const chat = ctx().chat ?? [];
    const limit = clamp(parseInt(set.bakeAfter, 10) || 250, 200, 5000);
    if (chat.length - resolveStart(meta, chat) <= limit) return false;
    squash(meta, BAKE_KEEP);
    return true;
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
    if (!ct || !letterMode(ct)) return [];
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
// aff · trust 키 설명 — 애정/우정 방식이면 뜻을 분명히 (친구에게 애정을 올리지 않게)
function relKeyHint() {
    const rl = app.current?.state?.data?.rel, A = relAxes(rl, viewTr());
    return A.love
        ? `aff (이름 ±N — ${A.aff}: romantic interest toward {{user}} — attraction, butterflies, flustered or tender moments, flirting, jealousy, physical closeness; record +1~+3 whenever such a moment happens, even small, and − when {{user}} hurts or disappoints them${noLoveNote(rl)}) · trust (이름 ±N — ${A.trust}: friendship, closeness, trust — record it too; one moment can raise both)`
        : `aff (이름 ±N — ${A.aff}: affection${noLoveNote(rl)}) · trust (이름 ±N — ${A.trust})`;
}
const noLoveNote = (rl) => { const n = (rl?.user ?? []).filter(x => x.noLove).map(x => x.name); return n.length ? ` · platonic only, never raise aff: ${n.slice(0, 8).join(', ')}` : ''; };
const relKeyShort = (rl) => { const A = relAxes(rl, viewTr()); return (A.love ? ` (aff = ${A.aff}: romantic interest, raise it on any romantic/flustered moment · trust = ${A.trust}${noLoveNote(rl)})` : noLoveNote(rl) ? ` (${noLoveNote(rl).slice(3)})` : ''); };
export function tagKeysFor(meta) {
    const K = [];
    const on = (id) => modOnRaw(id, meta); // 가린 칸도 변화 기록은 계속 (AI가 값은 못 보지만 ±N으로 적으면 반영)
    if (on('stats')) K.push('stat (게이지이름 ±N, e.g. 체력 -12 · 체력 max +10) · attr (능력치 ±1, only after real growth) · cond (+이름 | 효과 / -이름)');
    if (on('wallet')) K.push('cash (±N) · item (+이름 2 | 설명 / -이름 1)');
    if (on('shop')) K.push('stock (상점 | 상품 | 가격 | 설명 — when the story adds goods; 상점 | -상품 removes)');
    if (on('home')) K.push('decor (+가구 | 방 — when {{user}} gets/places furniture) · room (+새 공간 | 설명)');
    if (on('map')) K.push('loc (장소 — whenever {{user}} moves) · place (이름 | 설명 | 이어진곳 — newly discovered place)');
    if (on('rel')) K.push(`${relKeyHint()} · rel (이름 = 관계 이름, when it truly changes) · pair (A & B = 관계)`);
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
    if (on('rel') && (settings().mindMode ?? 'off') !== 'off' && mindActive(app.current?.state?.turn ?? 0)) K.push('mind (이름 | 속마음 — hidden inner feeling, only this turn; NOT msg: msg is a real message sent to {{user}})');
    if (on('rel') && settings().jealousy) K.push('jealous (이름 ±N — someone gets jealous of {{user}} with another, or is reassured)');
    if (on('rel') && settings().romBond) K.push('confess (이름 — ONLY right after a real confession was made AND accepted in this reply; the user confirms it. Never for closeness or time spent together)');
    if (on('rel') && settings().romDrive) K.push('concern (이름 | 요즘 신경 쓰는 것 — when what they are preoccupied with changes or gets resolved; 이름 | 없음 clears) · taste (이름 | 끌리는 것 | 싫어하는 것 — fill once if blank)');
    if (on('rel') && settings().offscreen) K.push('life (이름 | 화면 밖에서 한 일 — only right after days pass, 1-2 people not in the scene, small believable things)');
    if (on('sns')) K.push('sns (작성자 | 글 | 사진 묘사 | #태그 — a character posts on social media; rarely, when it fits)');
    if (on('music')) K.push(`bgm (곡 제목 - 가수 | 분위기 — ONLY when the scene's mood clearly shifts; a REAL existing song that fits${musicTaste() ? `, taste: ${musicTaste()}` : ''}; never quote lyrics)`);
    if (on('custom')) K.push('custom (탭 | 항목 ±N  or  탭 | 항목 = 글 — the user\'s own tracked values below)');
    return keysI(K); // 화면만 번역이면 자리표시도 영어로 (v2.7.14: 예전엔 한 경로에서만 바꿔서 본편 주입 · 분석 호출에 한국어가 섞여 감)
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

// 짧은 인물 줄 (초압축 · 변화 위주 턴) — v2.7.19: 예전엔 💍 연인 확정 · 단계 넘지 않기가 빠지고 🚫♥ 뜻도 안 알려서,
// 4턴 중 3턴은 「우정만」 · 「연인」 · 「단계 잠금」이 AI에게 사실상 안 갔음 → 표시를 붙이고, 쓴 표시만 뜻을 한 줄로
function relShort(d, here, withLabel) {
    const set = settings(), AX = relAxes(d.rel, viewTr());
    const lock = set.stageLock && !set.romFacts && stagesOn();
    const used = new Set();
    const one = (x) => {
        const f = [];
        if (x.noLove) { f.push('🚫♥'); used.add('nl'); }
        if (set.romBond && x.bond) { f.push('💞'); used.add('bond'); }
        if (x.jealous >= 30) { f.push(`💢${x.jealous}`); used.add('j'); }
        return `${x.name} ${x.aff}/${x.trust}${withLabel && x.label ? `[${x.label}]` : ''}${stagesOn() ? `<${stageOf(d.rel, x).name}>` : ''}${f.join('')}`;
    };
    // v2.7.20: 「이름25/80」이 HP100/100 바로 아래라 「80 중 25」로 읽혔다 → 머리에 어느 숫자가 무엇인지, 사람은 · 로 나눔
    const line = `♥(name ${AX.aff}/${AX.trust}, each -100~100) ${here.map(one).join(' · ')}`;
    const key = [used.has('nl') && '🚫♥ = platonic only, never raise aff', used.has('bond') && '💞 = confirmed lovers', used.has('j') && '💢 = jealousy, show it subtly', lock && '<stage> = do not act beyond it yet'].filter(Boolean);
    return key.length ? `${line}\n(${key.join(' · ')})` : line;
}
// ───── 변화 위주로 보내기: N턴마다 전체, 그 사이엔 핵심 + 바뀐 것만 ─────
export function deltaPlan(r, set = settings()) {
    if (!set.deltaMode || !r) return null;
    const N = clamp(parseInt(set.deltaEvery, 10) || 4, 2, 20);
    const t = r.state.turn;
    const k = t % N;
    if (k === 0 || t <= 1) return null; // 이번 턴은 전체 · 첫 턴은 전체 (v2.7.20: 1턴째부터 「전에 보냈다」는 짧은 꼴이 나갔음 · 짧은 꼴도 이제 이름 맞출 것은 다 실음)
    if (getMeta()?.fullTurn === t) return null; // 가린 칸을 다시 켠 턴 → 한 번은 전체
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
        const ko = trLook(nm); // 화면만 번역: 한국어 본편엔 번역된 이름으로 나옴 (「엘리자베스 그레이」 → 「엘리」만 불러도)
        if (ko && text.includes(ko)) return true;
        const parts = [...nm.split(/[\s·.]+/), ...(ko ? ko.split(/[\s·.]+/) : [])];
        return parts.some(part => part.length >= 2 && text.includes(part));
    };
}
const MOD_SHORT = { easy: '이지', normal: '보통', hard: '하드' };

// 연락 → 본편 반영: 반영 모드(끔·자동·고른 것만·요약)와 연락처별 예외를 따라 고른다
export function contactPicks(s, meta, set, inScene) {
    const ct = s.data.contact;
    if (!ct) return [];
    // 간단 모드 (v2.7.18): 기본은 본편에 안 보냄 · 「최근만」을 고르면 가장 최근 연락 한 사람의 마지막 두 줄만 짧게
    if (contactSimple()) {
        if (set.contactSimpleReflect !== 'recent') return [];
        const now0 = nowTick(s, meta);
        for (const who of ct.recent ?? Object.keys(ct.threads)) {
            if (findBy(ct.contacts, who)?.reflect === 'never') continue;
            const th = (ct.threads[who] ?? []).filter(m => !m.pending && (m.arrive ?? -Infinity) <= now0);
            if (th.length) return [{ who, msgs: th.slice(-2).map(m => ({ ...m, text: short(m.text, 60) })), summary: '', always: false, scene: inScene(who), r: 0 }];
        }
        return [];
    }
    const mode = set.contactReflect ?? (set.contactInject === false ? 'off' : 'auto');
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
const stagesOn = () => settings().relStagesOn !== false; // 관계 단계 기능 (v2.7.18 · 끄면 숫자만 — 단계 이름 · 해금 · 알림이 화면과 AI 글에서 모두 빠져요)
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
// ───── 화면만 번역 (enview): 프롬프트에 들어가는 고정 낱말도 영어로 ─────
const SEASON_EN = { spring: 'spring', summer: 'summer', autumn: 'autumn', winter: 'winter' };
function dateI(c) {
    if (!viewTr()) return dateStr(c);
    const mn = c.months[c.m - 1]?.name ?? '';
    const named = mn && !/^\d+\s*월$/.test(mn) && !/[가-힣]/.test(mn);
    return `${c.era ? `${c.era}, ` : ''}year ${c.y}, ${named ? `${mn} (month ${c.m})` : `month ${c.m}`}, day ${c.d}${weekday(c, c.y, c.m, c.d) ? ` (${weekday(c, c.y, c.m, c.d)})` : ''}`;
}
const seasonI = (c) => (viewTr() ? SEASON_EN : SEASON_NAME)[seasonOf(c)];
// 상태창에서 한 일 기록: 같은 줄 연속은 하나로, 화면만 번역이면 자주 나오는 것은 영어로
const MOD_EN = { profile: 'profile', stats: 'stats', dice: 'dice', wallet: 'wallet', shop: 'shop', home: 'home', rel: 'relationships', map: 'map', calendar: 'calendar', contact: 'contacts', quest: 'quests', news: 'news', gossip: 'gossip', board: 'board', ach: 'achievements', memo: 'notes', fate: 'fate', sns: 'SNS', music: 'music', custom: 'custom tab', core: 'world' };
function recentLabelEn(l) {
    const modEn = (name) => { const id = name === '세계' ? 'core' : Object.keys(MOD_EN).find(k => MOD[k]?.name === name); return id ? MOD_EN[id] : name; };
    let m = l.match(/^🔄\s*(.+?)\s*생성$/);
    if (m) return `🔄 regenerated the ${modEn(m[1])} panel`;
    m = l.match(/^💬\s*(.+?)\s*수정:/);
    if (m) return `💬 edited the ${modEn(m[1])} panel by instruction`;
    m = l.match(/^(.+?)의 답장:\s*([\s\S]*)$/);
    if (m) return `💬 reply from ${m[1]}: ${m[2]}`;
    m = l.match(/^✏️\s*(.+?)\s*직접 편집$/);
    if (m) { const id = Object.keys(MOD_EN).find(k => MOD[k]?.name === m[1]); return `✏️ edited the ${id ? MOD_EN[id] : m[1]} panel by hand`; }
    m = l.match(/^💍\s*(.+?)와\(과\) 고백이 오가 연인이 되었다/);
    if (m) return `💍 {{user}} and ${trBackName(m[1])} confessed and became lovers (confirmed by the user)`;
    m = l.match(/^💔\s*(.+?)와\(과\)는 연인이 아니다/);
    if (m) return `💔 {{user}} and ${trBackName(m[1])} are NOT lovers (the user cancelled it)`;
    return l;
}
const trBackName = (n) => trBack(n) ?? n; // 기록 당시 한국어 이름이었어도, 지금 영어로 저장된 이름으로
function recentI(s, n) {
    const out = [];
    for (const l of s.recent.slice(-n * 3)) { const x = viewTr() ? recentLabelEn(l) : l; if (out[out.length - 1] !== x) out.push(x); }
    return out.slice(-n).join(' / ');
}
// 출력 규칙: 화면만 번역이면 「값은 영어로」 (예전 문구 「Values in Korean」을 바꾸거나 덧붙임)
// v2.7.1: 한국어 상태창인데 롤플이 영어면 AI가 「place: Old Lighthouse」처럼 영어로 적어 지도·소지품 이름이 영어가 되던 것 →
// 이야기가 다른 언어여도 값은 상태창 언어로, 이미 있는 이름은 위에 적힌 그대로 (초압축·변화 위주 규칙엔 언어 줄이 아예 없었음)
const LANG_RULE = (lang) => `Values in ${lang} even if the story itself is written in another language: new place, item, person and quest names in ${lang}; existing names exactly as written above.`;
function outRule(text) {
    const lang = viewTr() ? 'English' : 'Korean';
    if (/Values in (Korean|English)\.?/i.test(text)) return text.replace(/Values in (Korean|English)\.?/i, LANG_RULE(lang));
    return `${text} ${LANG_RULE(lang)}`;
}
// 키 설명의 한국어 자리표시를 영어로 (화면만 번역일 때만 · 키 이름과 문법은 그대로)
const KEY_WORDS = [['3월 14일', '3/14'], ['이름 2', 'name 2'], ['이름 1', 'name 1'], ['곡 제목 - 가수', 'song title - artist'], ['탭 | 항목 = 글', 'tab | field = text'], ['진행 내용', 'progress'], ['게이지이름', 'gauge'], ['관계 이름', 'relation name'], ['새 공간', 'new space'], ['이어진곳', 'linked places'], ['업적 이름', 'achievement'], ['판정 이름', 'check'], ['풀리는 조건', 'cure'], ['요즘 신경 쓰는 것', 'current concern'], ['끌리는 것', 'likes'], ['싫어하는 것', 'dislikes'], ['화면 밖에서 한 일', 'what they did off-screen'], ['사진 묘사', 'photo description'], ['곡 제목', 'song title'], ['한 줄 소개', 'one-line intro'], ['새/수락/완료/실패', 'new/active/done/failed'], ['관련 인물', 'people involved'], ['헤드라인', 'headline'], ['#태그', '#tags'], ['3월 14일', '3/14'], ['관계', 'relation'], ['효과1', 'effect1'], ['효과2', 'effect2'], ['체력', 'HP'], ['능력치', 'attribute'], ['이름', 'name'], ['효과', 'effect'], ['설명', 'description'], ['상점', 'shop'], ['상품', 'goods'], ['가격', 'price'], ['가구', 'furniture'], ['방', 'room'], ['장소', 'place'], ['날짜', 'date'], ['제목', 'title'], ['내용', 'text'], ['난이도', 'DC'], ['일수', 'days'], ['작성자', 'author'], ['가수', 'artist'], ['분위기', 'mood'], ['탭', 'tab'], ['항목', 'field'], ['글', 'text'], ['없음', 'none']];
const keysI = (list) => (viewTr() ? list.map(k => KEY_WORDS.reduce((x, [ko, en]) => x.split(ko).join(en), k)) : list);
function buildUltra(r, opt = {}) {
    const s = r.state, d = s.data, meta = getMeta(), set = settings();
    const due = dueTester(set, s);
    const on = (id) => modOn(id, meta) && d[id] && (!FREQ_MODS.includes(id) || due(id));
    const inScene = sceneTester(set, s);
    const L = [P('inj.ultra')];
    const head = [MOD_SHORT[diffOf(meta)] ?? diffOf(meta)];
    const coreOn = !isHidden('core', meta);
    if (s.core.title && coreOn) head.push(`${s.core.title}${s.core.genre ? `(${s.core.genre})` : ''}`);
    L.push(head.join('|'));
    if (s.core.userRole && coreOn) L.push(`{{user}}=${short(s.core.userRole, 70)}`);
    if (s.core.rules && coreOn && set.injWorld) L.push(`규칙:${short(s.core.rules, 140)}`);
    if (on('calendar')) {
        const c = d.calendar;
        const ev = eventsOn(c, c.y, c.m, c.d).map(e => e.title);
        const soon = []; const tmp = { ...c };
        for (let k = 1; k <= 7; k++) { addDays(tmp, 1); for (const e of eventsOn(c, tmp.y, tmp.m, tmp.d)) soon.push(`${e.title}D-${k}`); }
        L.push(`📅${dateI(c)} ${c.time}${c.weather ? ` ${c.weather}` : ''}${ev.length ? `|${viewTr() ? 'today' : '오늘'}:${ev.join(',')}` : ''}${soon.length ? `|${soon.slice(0, 3).join(',')}` : ''}`);
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
        if (here.length) L.push(relShort(d, here.slice(0, 10), true));
        if (away.length) L.push(`(장면 밖:${away.slice(0, 12).map(x => `${x.name}${x.aff}/${x.trust}`).join(' ')})`);
    }
    if (on('profile')) {
        const list = d.profile.list.filter(p => p.role !== 'user' && inScene(p.name)).slice(0, 6);
        if (list.length) L.push(list.map(p => `👤${p.name}:${short(p.summary, 60)}`).join(' / '));
    }
    if (on('contact')) {
        const ct = d.contact;
        if (letterMode(ct)) L.push('✉편지 세계(전화 없음): 도착 전엔 상대가 내용을 모름');
        else if (instantLetter(ct)) L.push('✉편지 세계(전화 없음 · 멀리 있는 사람은 편지로만)');
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
    if (s.recent.length) L.push(`${viewTr() ? 'UI:' : 'UI행동:'}${recentI(s, 5)}`);
    if (!opt.noOutput && (set.sync === 'tag' || set.sync === 'tagPlus')) {
        const keys = tagKeysFor(meta).map(k => k.match(/(^|· )([a-z]+) \(/g)?.map(x => x.replace(/[·( ]/g, '')).join(' ')).join(' ') + (modOnRaw('rel', meta) && d.rel ? relKeyShort(d.rel) : '');
        L.push(outRule(P('inj.ultra.output', { keys })));
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
    if (on('calendar')) { const c = d.calendar; L.push(`📅${dateI(c)} ${c.time}${c.weather ? ` ${c.weather}` : ''}`); }
    // v2.7.20: 주입문은 턴마다 새로 만들어져서 「몇 턴 전 전체」는 AI에게 남아 있지 않다 → 이름을 맞춰 써야 하는 것(장소 · 소지품 · 진행 퀘스트)은 짧게라도 늘 넣는다
    if (on('map') && d.map.here) { const p = findBy(d.map.places, d.map.here); L.push(`@${d.map.here}${p?.links?.length ? `>${p.links.slice(0, 6).join(',')}` : ''}`); }
    if (on('stats') && d.stats.bars.length) L.push(d.stats.bars.map(b => `${b.name}${fmtNum(b.cur)}/${fmtNum(b.max)}`).join(' ') + (d.stats.conds.length ? ` ⚠${d.stats.conds.map(c => c.name).join(',')}` : ''));
    if (on('wallet')) { const w = d.wallet; L.push(`$${fmtNum(w.cash)}${w.currency}${w.items.length ? `|${w.items.slice(0, 12).map(i => `${i.name}${i.qty > 1 ? `×${i.qty}` : ''}`).join(',')}` : ''}`); }
    if (on('quest')) { const act = d.quest.list.filter(q => q.status === 'active'); if (act.length) L.push(`Q:${act.slice(0, 4).map(q => { const nx = (q.steps ?? []).find(x => !x.done); return `${q.title}${nx ? ` → ${nx.text}` : ''}`; }).join(' / ')}`); }
    if (on('rel')) { const here = d.rel.user.filter(x => inScene(x.name)); if (here.length) L.push(relShort(d, here.slice(0, 8), false)); }
    if (on('fate')) L.push(...fateText(s, true));
    // 화면용 라벨(한국어 · 말줄임)은 영어 저장이면 AI에게 쓸모가 없어서 뺀다 — 바뀐 값은 위 줄에 이미 있다
    if (plan.changes.length && !viewTr()) L.push(`변화:${plan.changes.slice(-14).join(' / ')}`);
    if (s.recent.length) L.push(`${viewTr() ? 'UI:' : 'UI행동:'}${recentI(s, 5)}`);
    if (!opt.noOutput && (set.sync === 'tag' || set.sync === 'tagPlus')) {
        const keys = tagKeysFor(meta).map(k => k.match(/(^|· )([a-z]+) \(/g)?.map(x => x.replace(/[·( ]/g, '')).join(' ')).join(' ') + (modOnRaw('rel', meta) && d.rel ? relKeyShort(d.rel) : '');
        L.push(outRule(P('inj.ultra.output', { keys })));
    }
    return { main: L.filter(Boolean).join('\n'), people: '' };
}

// 플레이 방식: 다인봇·풀사칭이면 머리에 한 줄, 풀사칭이면 {{user}} → 주인공
export function buildInjection(r, opt = {}) {
    const was = INJ.on; INJ.on = true; // 🙈 가린 칸은 이 안에서만 꺼진 것처럼
    try {
        const r2 = withoutParts(withoutOut(r));
        const inj = withGone(buildInjection1(r2, opt), r);
        if (r && !opt.noOutput) { try { inj.romance = swapUser(romanceBlock(r2)); } catch (e) { ssWarn(LOG, 'romance', e); } }
        if (r && !opt.noOutput) { try { const ml = mindLine(r2); if (ml && inj.main) inj.main += `\n${ml}`; } catch (e) { ssWarn(LOG, 'mind', e); } }
        return inj;
    } finally { INJ.on = was; }
}
// 설렘 한 스푼: 단계마다 할 수 있는 「설레는 한 순간」과 넘으면 안 되는 선 (친구인데 연인처럼 굴지 않게)
const sparkMemo = new Map(); // 「채팅:종류:확률:쉬는 턴」 → { upto, last, hits }
// 속마음 글 다듬기: 수치 괄호((20/85 💕/🤝) 같은 것) · 따옴표 · 이름 머리를 떼고, 첫 문장만 · 짧게 (한글 22자 · 그 밖 48자)
export function cleanMind(t) {
    let x = String(t ?? '').replace(/\([^()]*\d+\s*\/\s*\d+[^()]*\)/g, '').replace(/[-+]?\d+\s*\/\s*\d+/g, '').replace(/^\s*["'“”‘’「『]+|["'“”‘’」』]+\s*$/g, '').replace(/\s+/g, ' ').trim();
    const max = /[가-힣]/.test(x) ? 22 : 48;
    if (x.length > max) { const m = x.match(/^.+?[.!?。…~]+(?=\s|$)/); if (m && m[0].length >= 4) x = m[0]; } // 길 때만 첫 문장
    return x.length > max ? `${x.slice(0, max - 1).trim()}…` : x;
}
// 💭 속마음 (v2.7.21): 이번 턴에 장면 속 인물의 속마음을 <meatball>에 같이 적게 — 본편 AI가 쓰므로 추가 호출 0
const MIND_FMT = {
    thought: 'their unspoken inner voice in FIRST person, like a thought bubble — 3 to 8 words, no narration, no name, no numbers (e.g. "…또 사고 쳤겠지" / "Idiot. Still glad he\'s okay.")',
    emoji: '1-3 emoji that show their true feeling right now (emoji only, no words)',
    kaomoji: 'one kaomoji that shows their true feeling right now, e.g. (｡•́︿•̀｡) (≧▽≦) (￣ヘ￣) (⁄ ⁄•⁄ω⁄•⁄ ⁄) — kaomoji only, no words',
};
export function mindActive(turn, set = settings()) {
    if (!MIND_FMT[set.mindMode]) return false;
    if (set.mindFreq === 'always') return true;
    return sparkHit(`${ctx().getCurrentChatId?.() ?? MODULE}:mind`, clamp(num(set.mindPct, 35), 0, 100), 0, turn ?? 0);
}
function mindLine(r) {
    const set = settings(), s = r?.state, meta = getMeta();
    if (!s?.data?.rel || !modOn('rel', meta) || !(set.sync === 'tag' || set.sync === 'tagPlus') || !mindActive(s.turn, set)) return '';
    const inScene = sceneTester(set, s);
    const who = s.data.rel.user.filter(x => !x.out && inScene(x.name)).slice(0, 4).map(x => x.name);
    if (!who.length) return '';
    return `This turn, inside <meatball>, add one line per character in the scene (${who.join(', ')}) with the key mind (not msg — msg is a real message): mind: Name | ${MIND_FMT[set.mindMode]}. It is hidden from {{user}} — do not reveal it in the story.`;
}
function sparkHit(key, p, cool, turn) {
    const mk = `${key}:${p}:${cool}`;
    let m = sparkMemo.get(mk);
    if (!m) { if (sparkMemo.size > 40) sparkMemo.clear(); m = { upto: -1, last: -Infinity, hits: new Set() }; sparkMemo.set(mk, m); }
    for (let t = m.upto + 1; t <= turn; t++) if (t - m.last > cool && seeded(`${key}:${t}`)() * 100 < p) { m.last = t; m.hits.add(t); }
    if (turn > m.upto) m.upto = turn;
    return m.hits.has(turn);
}
function sparkFor(x, k, Lv, lovers) {
    if (x.noLove || Lv < 0) return { moment: 'a loyal-friend gesture — remembering something small {{user}} said, a treat or small gift "because I saw it and thought of you", having {{user}}\'s back in front of others', limit: 'This is friendship only: no romantic or flirty undertone.' };
    if (lovers) return { moment: 'a spontaneous affectionate gesture, a small surprise plan or meaningful gift, or honestly saying what they love about {{user}}', limit: 'They are lovers, so warmth is welcome — still in their own voice and personality.' };
    const gap = Lv >= 0 ? Lv - k : 3; // 연인 단계까지 몇 단계 남았나
    if (k <= 0) return { moment: 'an unexpected small kindness, noticing something about {{user}} others missed, or quietly helping without being asked', limit: 'They barely know each other: no flirting, no claims of closeness.' };
    if (gap >= 4) return { moment: 'remembering a small detail {{user}} mentioned, a casual treat or small gift, stepping in to help, or a warm teasing line', limit: 'They are not close yet: keep it light and friendly, nothing romantic.' };
    if (gap === 3) return { moment: 'a small gift "I just happened to see it", remembering exactly what {{user}} likes, or a line that slips out a bit too sincerely ("I did it because it\'s you, obviously") that they don\'t explain', limit: 'They are friends: it can leave a moment of awkward silence, but there is no confession, no flirting on purpose and no couple behaviour.' };
    if (gap === 2) return { moment: 'a slightly too-honest line ("…because it\'s you, that\'s why"), worrying about {{user}} out loud, a small gift that shows they paid attention, or staying close a little longer than needed', limit: 'It may sound like more than friendship, but they do NOT confess, kiss or act as a couple — they can deflect, joke it off or get flustered.' };
    return { moment: 'an almost-confession that they stop halfway, a protective moment, a gift that clearly means something, or a brief touch they don\'t explain', limit: 'They are NOT lovers yet: no confession is made or accepted, no kiss, no possessive or controlling behaviour.' };
}
// ───── 로맨스 보정 주입 (v2.6 · 따로 주입 · 깊이 따로) ─────
function romanceBlock(r) {
    const set = settings(), s = r.state, d = s.data, meta = getMeta();
    const L = [];
    let tester = null;
    const inScene = (n) => (tester ??= sceneTester(set, s))(n); // 필요할 때 한 번만 만든다
    if (modOn('rel', meta) && d.rel && (set.romFacts || set.romDrive)) {
        const rl = d.rel, st = rl.stages?.length ? rl.stages : DEFAULT_STAGES, top = st.length - 1;
        for (const x of rl.user.filter(y => inScene(y.name)).slice(0, 8)) {
            const k = clamp(x.stage ?? 0, 0, top), g = st[k], nx = st[k + 1];
            // v2.7.21: 「보일 것」으로 끈 것은 빈칸을 채우는 문장(「…infer from the character」 같은)도 안 보낸다 — 예전엔 내용만 빠지고 더 긴 문장이 들어가 토큰이 그대로였음
            if (set.romFacts && stagesOn()) {
                const noUnlock = aiOff('rel', 'relShowUnlock');
                const allowed = g.unlock || ''; // 지금 단계의 모습만 (세계관마다 단계 설명이 「그 단계 전체 모습」이라, 앞 단계의 「차갑고 적대적」이 섞이면 안 됨)
                L.push(P('inj.rom.facts', {
                    who: x.name, stage: g.name,
                    reached: (() => {
                        const L = loveIndex(st);
                        if (set.romBond && x.bond) return 'They ARE lovers: a confession was made and accepted (confirmed by the user).';
                        if (L >= 0 && k >= L) return `They have reached 「${st[L].name}」.`;
                        if (set.romBond) return `They are NOT lovers${L >= 0 ? ` (「${st[L].name}」 not reached)` : ''} — no confession has been made and accepted.`;
                        return '';
                    })(),
                    allowed: noUnlock ? '' : allowed || 'only what people at this distance would do',
                    next: nx ? `「${nx.name}」${nx.unlock && !noUnlock ? ` (${nx.unlock})` : ''}` : 'nothing — they are at the top',
                }).replace(noUnlock ? /\s*What this stage looks like for [^:]*:\s*\./ : /$^/, ''));
            }
            if (set.romDrive && !aiOff('rel', 'relShowWants')) {
                const det = [x.likes && `drawn to: ${short(x.likes, 80)}`, x.dislikes && `put off by: ${short(x.dislikes, 80)}`, x.concern && `currently preoccupied with: ${short(x.concern, 100)}`].filter(Boolean).join('; ');
                L.push(P('inj.rom.drive', { who: x.name, details: det || 'not recorded yet — infer from the character and keep it consistent' }));
            }
        }
    }
    const nFacts = L.length; // 위까지가 관계 사실 · 욕구 (머리말은 이게 있을 때만)
    // v2.7.16: 미트볼은 상태창 — 수치 · 단계와 상관없는 연출 주입(의도 먼저 · 먼저 움직이기 · 내 주입문 · 사건 한 스푼)은 뺐어요
    if (set.romSpark) {
        const ck = `${ctx().getCurrentChatId?.() ?? MODULE}`, turn = s.turn ?? 0;
        // 턴마다 정말 p% 주사위 · 걸리면 그 뒤 cool턴은 쉼 (앞 40턴을 처음부터 다시 굴려 봐서 정함 → 스와이프 · 다시 계산해도 같음)
        // (v2.7.14: 예전엔 6~8턴 묶음에 한 번이라 100%여도 실제로는 12~17%였음)
        // v2.7.18: 예전엔 다시 굴려 보는 시작점이 50턴마다 바뀌어서, 49~50턴 근처에서 「쉬는 턴」이 깨지고 연달아 걸릴 수 있었음
        //          → 늘 0턴부터 굴린 결과를 채팅별로 기억해 두고 이어서 굴린다 (같은 턴은 언제 계산해도 같은 답)
        const hit = (tag, pct, cool) => sparkHit(`${ck}:${tag}`, clamp(num(pct, 12), 0, 100), cool, turn);
        if (set.romSpark && modOn('rel', meta) && d.rel && hit('spark', set.romSparkPct, 3)) {
            const rl = d.rel, st = rl.stages?.length ? rl.stages : DEFAULT_STAGES, top = st.length - 1, Lv = loveIndex(st);
            const cand = rl.user.filter(y => inScene(y.name) && !y.out && ((y.aff ?? 0) >= 5 || (y.trust ?? 0) >= 20));
            if (cand.length) {
                const rng = seeded(`${ck}:sparkwho:${turn}`);
                const w = cand.map(y => Math.max(1, (y.aff ?? 0) + 10)), tot = w.reduce((a, b) => a + b, 0);
                let pick = rng() * tot, x = cand[0];
                for (let i = 0; i < cand.length; i++) { pick -= w[i]; if (pick <= 0) { x = cand[i]; break; } }
                const k = clamp(x.stage ?? 0, 0, top), lovers = (set.romBond ? !!x.bond : true) && Lv >= 0 && k >= Lv;
                const { moment, limit } = sparkFor(x, k, Lv, lovers);
                L.push(P('inj.rom.spark', { who: x.name, stage: st[k]?.name ?? '', moment, limit }));
            }
        }
    }
    const hasFacts = nFacts > 0;
    const out = L.length ? [...(hasFacts ? [P('inj.rom.header')] : []), ...L] : []; // 장면에 사람이 없으면 「아래가 사실」 머리말은 빼기
    return out.join('\n');
}
function buildInjection1(r, opt = {}) {
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
// 모든 주입 방식(전체 · 간결 · 초압축 · 변화 위주)에 「이제 없는 물건」 한 줄 (v2.7.3)
// 👁 끈 항목을 뺀 사본 (v2.7.21) — 주입 세 꼴 · 인물 · 로맨스가 모두 이 사본을 읽어서 한 곳에서 빠진다. 원래 상태는 그대로.
function withoutParts(r) {
    const d0 = r?.state?.data; if (!d0) return r;
    const off = (tab, key) => aiOff(tab, key);
    const any = Object.entries(AI_PARTS).some(([tab, keys]) => keys.some(k => off(tab, k)));
    if (!any) return r;
    const data = { ...d0 }, cp = (id) => (data[id] && data[id] === d0[id] ? (data[id] = clone(d0[id])) : data[id]);
    let core = r.state.core;
    if (off('home', 'hero') && core?.summary) core = { ...core, summary: '' };
    if (d0.profile && (off('profile', 'summary') || off('profile', 'where') || off('profile', 'fields'))) {
        for (const p of cp('profile').list) { if (off('profile', 'summary')) p.summary = ''; if (off('profile', 'where')) { p.home = ''; p.sched = ''; } if (off('profile', 'fields')) p.fields = []; }
    }
    if (d0.quest && ['meta', 'desc', 'steps', 'reward'].some(k => off('quest', k))) {
        for (const q of cp('quest').list) { if (off('quest', 'meta')) { q.giver = ''; q.deadline = ''; q.place = ''; delete q.due; } if (off('quest', 'desc')) q.desc = ''; if (off('quest', 'steps')) q.steps = []; if (off('quest', 'reward')) { q.reward = ''; q.items = []; q.cash = 0; } }
    }
    if (d0.map && off('map', 'place')) for (const p of cp('map').places) p.desc = '';
    if (d0.profile && off('map', 'ppl')) for (const p of cp('profile').list) p.sched = ''; // 「지금 여기 있는 사람」은 일과에서 나옴
    if (d0.contact && off('contact', 'sum')) cp('contact').summaries = {};
    if (d0.gossip && off('gossip', 'foot')) for (const x of cp('gossip').issues) x.about = [];
    if (d0.sns && ['pic', 'tags', 'replies'].some(k => off('sns', k))) for (const p of cp('sns').posts) { if (off('sns', 'pic')) p.pic = ''; if (off('sns', 'tags')) p.tags = ''; if (off('sns', 'replies')) p.replies = []; }
    if (d0.rel && AI_PARTS.rel.some(k => off('rel', k))) {
        const rl = cp('rel');
        if (off('rel', 'relShowUnlock')) rl.stages = (rl.stages ?? []).map(x => ({ ...x, unlock: '' }));
        if (off('rel', 'relShowMemo')) for (const x of rl.user) x.memo = '';
        if (off('rel', 'relShowWants')) for (const x of rl.user) { x.likes = ''; x.dislikes = ''; x.concern = ''; }
        if (off('rel', 'relShowLife')) rl.life = [];
        if (off('rel', 'relShowPairs')) rl.pairs = [];
    }
    return { ...r, state: { ...r.state, core, data } };
}
function withGone(inj, r) {
    const g = [goneLine(r?.state), outLine(r?.state)].filter(Boolean).join('\n');
    if (!g || !inj.main) return inj;
    const lines = inj.main.split('\n');
    lines.splice(Math.min(2, lines.length), 0, swapUser(g));
    return { ...inj, main: lines.join('\n') };
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
    if ((s.core.title || s.core.summary) && !isHidden('core', meta)) {
        L.push(`World: ${s.core.title}${s.core.genre ? ` (${s.core.genre})` : ''}${s.core.canon ? ` · canon: ${s.core.canon}` : ''}${s.core.tone ? ` · tone: ${s.core.tone}` : ''}`);
        if (s.core.summary && !lite && set.injWorld) L.push(`Setting: ${short(s.core.summary, 600)}`); // 기본 끔 — 카드·로어북과 중복
        if (s.core.userRole) L.push(`{{user}}: ${s.core.userRole}`);
        if (s.core.rules && set.injWorld) L.push(`World rules: ${short(s.core.rules, lite ? 200 : 500)}`);
    }
    if (on('calendar')) {
        const c = d.calendar;
        const ev = eventsOn(c, c.y, c.m, c.d);
        const soon = [];
        const tmp = { ...c };
        for (let k = 1; k <= 7; k++) { addDays(tmp, 1); for (const e of eventsOn(c, tmp.y, tmp.m, tmp.d)) soon.push(viewTr() ? `${e.title} (in ${k}d)` : `${e.title}(${k}일 후)`); }
        L.push(`Date: ${dateI(c)} · ${c.time}${c.weather ? ` · weather: ${c.weather} (${seasonI(c)})` : ''}${ev.length ? ` · TODAY: ${ev.map(e => e.title + (e.desc ? ` — ${e.desc}` : '')).join('; ')}` : ''}${soon.length ? ` · coming: ${soon.slice(0, 4).join(', ')}` : ''}`);
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
        if (act.length) L.push(`Active quests: ${act.slice(0, 5).map(q => `${q.title}${q.giver ? ` (from ${q.giver})` : ''}${q.deadline ? ` · due ${q.deadline}${Number.isFinite(q.due) && today(s) !== null ? ` (${q.due - today(s) <= 0 ? 'TODAY is the last day' : `${q.due - today(s)} day(s) left`})` : ''}` : ''}${!lite && q.steps.length ? ` · next: ${q.steps.find(x => !x.done)?.text ?? 'report back'}` : ''}`).join(' / ')}`);
        if (open.length && !lite) L.push(`Requests available (not accepted yet): ${open.slice(0, 4).map(q => q.title).join(', ')}`);
    }
    if (on('news') && d.news.items.length && !lite) L.push(`Recent news (${d.news.name || 'news'}): ${d.news.items.slice(-3).map(x => x.title).join(' / ')}`);
    if (on('gossip') && d.gossip.issues.length && !lite) L.push(`Rumors going around: ${d.gossip.issues.slice(-2).map(x => `${x.title}${x.about.length ? ` (about ${x.about.join(', ')})` : ''}`).join(' / ')}`);
    if (on('rel')) {
        const rl = d.rel;
        const here = rl.user.filter(x => inScene(x.name)), away = rl.user.filter(x => !inScene(x.name));
        const AX = relAxes(rl, viewTr()), W = viewTr() ? { aff: AX.aff, trust: AX.trust, stage: 'stage', jealous: 'jealousy' } : { aff: AX.aff, trust: AX.trust, stage: '단계', jealous: '질투' }; // 화면만 번역: 고정 낱말도 영어로
        for (const x of here.slice(0, 12)) { const g = stageOf(rl, x); PP.push(`${x.name}${x.label ? ` [${x.label}]` : ''} → {{user}}: ${W.aff} ${x.aff} · ${W.trust} ${x.trust} ${stagesOn() ? ` · ${W.stage} 「${g.name}」` : ''}${set.romBond && x.bond ? ' · 💞 lovers (confirmed)' : ''}${x.noLove ? ' · PLATONIC ONLY — no romantic feelings toward {{user}}; never raise aff' : ''}${!stagesOn() ? '' : g.unlock && !lite ? ` (unlocked: ${short(g.unlock, 60)}${set.stageLock && !set.romFacts ? " — don't act beyond this stage yet" : ''})` : set.stageLock && !set.romFacts ? ' (stay within this stage)' : ''}${x.jealous >= 30 ? ` · ${W.jealous} ${x.jealous}/100 (show it subtly when they meet)` : ''}${x.memo && !lite ? ` — ${short(x.memo, 90)}` : ''}`); }
        if (away.length) PP.push(`Not in this scene (${W.aff}/${W.trust}): ${away.slice(0, 15).map(x => `${x.name} ${x.aff}/${x.trust}`).join(', ')}`);
        const pairs = rl.pairs.filter(p => inScene(p.a) || inScene(p.b));
        if (pairs.length && !lite) PP.push(`Between others: ${pairs.slice(0, 10).map(p => `${p.a}↔${p.b} ${p.label}`).join(' · ')}`);
        const life = rl.life.filter(x => inScene(x.who)).slice(-2);
        if (life.length && !lite) PP.push(`Off-screen lately: ${life.map(x => `${x.who} — ${short(x.text, 70)}`).join(' / ')}`);
        // <meatball>에 쓰라는 줄이라 태그 방식일 때만 (사칭·별도 분석·끔에선 빼기)
        if (s.newDay && set.offscreen && !opt.noOutput && (set.sync === 'tag' || set.sync === 'tagPlus') && lastDayChanged(r)) L.push(P('inj.life'));
    }
    if (on('custom')) L.push(...customLines(s, false));
    if (on('sns') && d.sns.posts.length && !lite) L.push(`Recent posts on ${d.sns.name || 'SNS'}: ${d.sns.posts.slice(-3).map(p => `${p.author}: ${short(p.text || `${viewTr() ? '[photo]' : '[사진]'} ${p.pic}`, 50)}`).join(' / ')}`);
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
        if (letterMode(ct)) L.push(P('inj.letter', { app: ct.app }));
        else if (instantLetter(ct)) L.push(P('inj.letter.simple', { app: ct.app })); // v2.7.18: 간단 모드여도 세계 규칙은 남김 (예전엔 같이 빠져서 멀리 있는 인물이 즉시 대답했음)
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
    if (s.recent.length) L.push(`Since the last reply {{user}} did (via the status UI): ${recentI(s, 8)}`);
    if (!opt.noOutput && (set.sync === 'tag' || set.sync === 'tagPlus')) {
        L.push(outRule(P('inj.output')));
        L.push(lite ? `Keys (key: value, ±N for numbers, +/-name for lists, name | detail): ${keysI(tagKeysFor(meta)).map(k => k.match(/(^|· )([a-z]+) \(/g)?.map(x => x.replace(/[·( ]/g, '')).join(' ')).join(' ')}${modOnRaw('rel', meta) && s.data.rel ? relKeyShort(s.data.rel) : ''}` : `Keys: ${keysI(tagKeysFor(meta)).join(' · ')}`);
        if (!lite) L.push(viewTr() ? P('inj.example.en') : P('inj.example'));
    }
    return { main: L.filter(Boolean).join('\n'), people: PP.length ? `[STATUS SIM — PEOPLE (part of the state above)]\n${PP.join('\n')}\n${P('inj.people.absent')}` : '' };
}

export function setInjection(inj) {
    const c = ctx();
    const depth = clamp(parseInt(settings().injectDepth, 10) || 0, 0, 20);
    // 월드인포 스캔: 켜면 주입문 속 장소·인물 이름으로 로어북 항목이 켜진다 (편하지만 장면 밖 항목까지 켜져 토큰이 늘 수 있음)
    c.setExtensionPrompt(INJECT_KEY, inj?.main ?? '', PROMPT_IN_CHAT, depth, settings().injScan !== false, ROLE_SYSTEM);
    c.setExtensionPrompt(INJECT_KEY2, inj?.people ?? '', PROMPT_IN_CHAT, depth, false, ROLE_SYSTEM);
    const rd = clamp(parseInt(settings().romDepth, 10) || 0, 0, 20);
    c.setExtensionPrompt(INJECT_KEY3, inj?.romance ?? '', PROMPT_IN_CHAT, rd, false, ROLE_SYSTEM);
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
    const items = [];
    for (const name of await loreNames()) {
        try {
            const book = await c.loadWorldInfo(name);
            const entries = Object.values(book?.entries ?? {}).filter(e => !e.disable).sort((a, b) => (b.constant ? 1 : 0) - (a.constant ? 1 : 0) || (a.order ?? 0) - (b.order ?? 0));
            for (const e of entries) {
                const head = String(e.comment || (Array.isArray(e.key) ? e.key.slice(0, 3).join(', ') : '')).trim();
                const body = String(e.content ?? '').replace(/\s+/g, ' ').trim();
                if (head || body) items.push({ head, body });
            }
        } catch (e) { ssWarn(LOG, 'lore', name, e); }
    }
    if (!items.length) return '';
    // 넘치면 뒤 항목을 통째로 버리지 않고, 모든 항목을 조금씩 줄인다 (뒤쪽 캐릭터가 사라지던 문제)
    const total = items.reduce((n, x) => n + x.head.length + x.body.length + 4, 0);
    let budget = Infinity;
    if (total > limit) {
        const sorted = items.map(x => x.body.length).sort((a, b) => a - b);
        let lo = 0, hi = sorted.at(-1) ?? 0; // 항목당 상한을 이분 탐색으로 맞춘다
        const fits = (cap) => items.reduce((n, x) => n + x.head.length + Math.min(x.body.length, cap) + 5, 0) <= limit;
        while (lo < hi) { const mid = Math.ceil((lo + hi) / 2); if (fits(mid)) lo = mid; else hi = mid - 1; }
        budget = Math.max(120, lo);
    }
    let out = '';
    for (const x of items) {
        const piece = `• ${x.head}: ${x.body.length > budget ? `${x.body.slice(0, budget)}…` : x.body}\n`;
        if (out.length + piece.length > limit * 1.15) break;
        out += piece;
    }
    // 항목 이름 목록은 늘 전부 (내용이 잘려도 「이런 인물·장소가 있다」는 알게)
    const index = [...new Set(items.map(x => x.head).filter(Boolean))];
    const shown = out.split('\n').length - 1;
    return `${out}${shown < items.length ? `…(${items.length - shown}개 항목은 내용 생략)\n` : ''}[LOREBOOK INDEX — every entry title, ${index.length}] ${short(index.join(' · '), 4000)}`;
}
export function recentChat(n) {
    return (ctx().chat ?? []).filter(m => !m.is_system).slice(-n).map(m => `${m.name}: ${short(stripStatus(m.mes), 700)}`).join('\n');
}
export async function gatherSources(opt = {}) {
    const c = ctx(), set = settings();
    const parts = [];
    const persona = c.powerUserSettings?.persona_description ?? '';
    parts.push(`[THE REAL USER — plays the protagonist in roleplay, or only directs the story (see PLAY STYLE)] name: ${c.name1}${opt.persona !== false && persona ? `\npersona: ${short(persona, 2500)}` : ''}`);
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
