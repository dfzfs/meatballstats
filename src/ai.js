// 확장 AI가 하는 일 (모두 토큰이 드는 호출)
import { app, ctx, settings, getMeta, MOD, NORM, normalize, short, findBy, norm, dateStr, stamp, MODULE, LOG, DIFFS, diffOf, CONTACT_MODES, uid, msgText, fmtNum, playOf, normPlay } from './core.js';
import { P, aiGenerate, parseJSON, aiJSON } from './prompts.js';
import { SCHEMA } from './core.js';
import { compute, buildInjection, tagKeysFor, extractOps, stripStatus, recentChat, chatCharacters } from './engine.js';
import { finJSON, finText, finLines } from './translate.js';

const tasteLine = () => { const t = app.current?.state?.data?.music?.taste || settings().musicTaste; return t ? ` (the user likes: ${t})` : ''; };
// 플레이 방식 안내 (생성 때마다 한 줄)
export function playLine(p = playOf()) {
    const world = p.cardIsWorld ? P('gen.play.world') : '';
    const cast = p.cast.length ? ` — cast: ${p.cast.join(', ')}` : '';
    return P(`gen.play.${p.mode}`, { world, cast, hero: p.hero || 'the main character' });
}
const diffLine = () => `Difficulty: ${DIFFS[diffOf()].name} — ${P(`diff.${diffOf()}`)}`;
const contactModeLine = (mode) => (mode && mode !== 'auto' ? `Use mode "${mode}" (${CONTACT_MODES[mode]?.name}).` : 'Choose mode: phone for modern/sci-fi worlds with phones, instant for magic/radio/telepathy, letter for worlds without phones (letters take days).');

export async function genModule(mod, { sources, core, instruction, profileMode, current, extra, contactMode, feature = 'gen', play, detectPlay }) {
    const L = [];
    if (sources) L.push(`=== SOURCES ===\n${sources}`);
    if (!detectPlay) L.push(`=== PLAY STYLE ===\n${playLine(play ? normPlay(play) : undefined)}`);
    if (core && mod !== 'core') L.push(`=== WORLD CORE (already decided) ===\n${JSON.stringify(core)}`);
    if (extra) L.push(extra);
    if (instruction) L.push(`=== USER'S DIRECTION (highest priority) ===\n${instruction}`);
    L.push(`=== TASK ===\nPanel: ${mod === 'core' ? 'world core' : MOD[mod].name} — ${P(`gen.${mod}`, { difficulty: diffLine(), contactMode: contactModeLine(contactMode), taste: tasteLine() })}${mod === 'profile' ? `\nMODE: ${profileMode ?? 'minimal'}` : ''}`);
    if (current) L.push(`=== CURRENT PANEL DATA ===\n${JSON.stringify(current)}`);
    L.push(`=== OUTPUT JSON SHAPE ===\n${SCHEMA[mod]}${detectPlay ? `\nALSO add a key "play": ${PLAY_SHAPE} — decide how this setup is played (see sources).` : ''}`);
    const obj = await finJSON((await aiJSON(feature, P('gen.system'), L.join('\n\n'))), core);
    if (mod === 'core') { const c = NORM.core(obj); if (detectPlay && obj.play) Object.defineProperty(c, 'play', { value: normPlay(obj.play), enumerable: false }); return c; }
    if (mod === 'profile' && profileMode) obj.mode = profileMode;
    if (mod === 'contact' && contactMode && contactMode !== 'auto') obj.mode = contactMode;
    return mod === 'core' ? NORM.core(obj) : normalize(mod, obj);
}

// 묶음 생성: 관련 칸 여러 개를 한 번에 (재료를 한 번만 보내서 입력 토큰↓, 칸끼리 일관성↑)
// 빠지거나 깨진 칸은 결과에서 빠지고, 부르는 쪽이 그 칸만 따로 다시 받는다.
export const GEN_GROUPS = [
    ['profile', 'rel', 'contact'],
    ['wallet', 'shop', 'home'],
    ['map', 'calendar', 'quest'],
    ['stats', 'dice', 'custom'],
    ['ach', 'memo', 'fate'],
    ['news', 'gossip', 'board', 'sns'],
];
export async function genGroup(mods, { sources, core, instruction, profileMode, contactMode, feature = 'wizard', play }) {
    if (mods.length === 1) return { [mods[0]]: await genModule(mods[0], { sources, core, instruction, profileMode, contactMode, feature, play }) };
    const L = [];
    if (sources) L.push(`=== SOURCES ===\n${sources}`);
    L.push(`=== PLAY STYLE ===\n${playLine(play ? normPlay(play) : undefined)}`);
    L.push(`=== WORLD CORE (already decided) ===\n${JSON.stringify(core)}`);
    if (instruction) L.push(`=== USER'S DIRECTION (highest priority) ===\n${instruction}`);
    L.push(`=== TASK ===\n${P('gen.batch', { n: mods.length })}`);
    for (const mod of mods) {
        L.push(`--- PANEL "${mod}" (${MOD[mod].name}) ---\n${P(`gen.${mod}`, { difficulty: diffLine(), contactMode: contactModeLine(contactMode) })}${mod === 'profile' ? `\nMODE: ${profileMode ?? 'minimal'}` : ''}\nJSON shape: ${SCHEMA[mod]}`);
    }
    L.push(`=== OUTPUT ===\nONE JSON object with exactly these keys: {${mods.map(m => `"${m}": {…}`).join(', ')}}`);
    const max = Math.min(Math.max(Number(settings().aiMaxTokens) || 6000, 2500 * mods.length), 24000);
    const obj = await finJSON((await aiJSON(feature, P('gen.system'), L.join('\n\n'), max)), core);
    const out = {};
    for (const mod of mods) {
        const d = obj?.[mod];
        if (!d || typeof d !== 'object' || Array.isArray(d)) continue;
        if (mod === 'profile' && profileMode) d.mode = profileMode;
        if (mod === 'contact' && contactMode && contactMode !== 'auto') d.mode = contactMode;
        try { out[mod] = normalize(mod, d); } catch (e) { console.warn(LOG, 'group normalize', mod, e); }
    }
    return out;
}

export async function instructModule(mod, instruction, state) {
    const curData = mod === 'core' ? state.core : state.data[mod];
    const L = [
        `=== WORLD CORE ===\n${JSON.stringify(state.core)}`,
        `=== PLAY STYLE ===\n${playLine()}`,
        `=== RECENT STORY ===\n${recentChat(Math.min(settings().recentForGen, 14)) || '(none)'}`,
        `=== PANEL: ${mod === 'core' ? 'world core' : MOD[mod].name} — CURRENT DATA ===\n${JSON.stringify(curData)}`,
        `=== USER'S EDIT INSTRUCTION ===\n${instruction}`,
        `=== RULES ===\n${P('gen.instruct')}`,
        `=== OUTPUT JSON SHAPE ===\n${SCHEMA[mod]}`,
    ];
    const obj = await finJSON((await aiJSON('instruct', P('gen.system'), L.join('\n\n'))));
    return mod === 'core' ? NORM.core(obj) : normalize(mod, obj);
}

export async function analyzeMessage(idx) {
    const c = ctx();
    const m = c.chat?.[idx];
    if (!m || m.is_user) return;
    const r = compute(idx);
    if (!r) return;
    const prevUser = [...c.chat.slice(0, idx)].reverse().find(x => x.is_user);
    const inj = buildInjection(r, { noOutput: true, full: true });
    const prompt = `${inj.main}\n${inj.people}\n\nKeys: ${tagKeysFor(getMeta()).join(' · ')}\n\n=== {{user}} ===\n${short(prevUser?.mes ?? '', 1500)}\n\n=== REPLY ===\n${short(stripStatus(m.mes), 4000)}`;
    try {
        const out = await aiGenerate('analyze', P('ai.analyze'), prompt, 600);
        const ops = extractOps(/<(?:meatball|status)>/i.test(out) ? out : `<meatball>\n${out}\n</meatball>`);
        m.extra ??= {};
        m.extra[MODULE] ??= { bySwipe: {} };
        m.extra[MODULE].bySwipe ??= {};
        m.extra[MODULE].bySwipe[m.swipe_id ?? 0] = ops;
        await (c.saveChat?.() ?? c.saveChatDebounced?.());
        app.refreshNow?.();
        app.notifyLatest?.();
    } catch (e) { console.warn(LOG, 'analyze failed', e); }
}

// 그 인물에 대해 알고 있는 것
function aboutPerson(who, state) {
    const d = state.data;
    const prof = d.profile ? findBy(d.profile.list, who) : null;
    const card = chatCharacters().find(ch => norm(ch.name) === norm(who));
    const rel = d.rel ? findBy(d.rel.user, who) : null;
    return [
        `World: ${state.core.title} — ${short(state.core.summary, 500)}`,
        d.calendar ? `Now: ${dateStr(d.calendar)} ${d.calendar.time}` : '',
        prof ? `About ${who}: ${prof.summary} ${prof.fields.map(f => `${f.k}: ${f.v}`).join(' / ')}` : card ? `About ${who}: ${short(card.description, 1500)}` : '',
        rel ? `Relationship with {{user}}: ${rel.label || '-'} · 호감 ${rel.aff} · 신뢰 ${rel.trust} · ${rel.memo}` : '',
        `Difficulty: ${DIFFS[diffOf()].name}`,
        `Recent story (for context):\n${recentChat(8)}`,
    ].filter(Boolean);
}
const threadText = (ct, who, n = 14) => (ct.threads[who] ?? []).filter(m => !m.pending).slice(-n).map(m => `${m.from === 'me' ? '{{user}}' : who}: ${msgText(m)}`).join('\n');

// 연락 대화 한 줄 요약 (반영 모드 = 요약)
export async function summarizeThread(who, state) {
    const ct = state.data.contact;
    const out = await aiGenerate('csum', P('ai.csum', { who }), `Conversation (oldest first):\n${threadText(ct, who, 40)}`, 200);
    return finText(stripStatus(out).split(/\r?\n/).map(x => x.trim()).filter(Boolean)[0] ?? '');
}
// 물가 질문: "이 세계에서 ○○ 사려면 얼마?"
export async function askPrice(question, state) {
    const w = state.data.wallet;
    const L = [
        `World: ${state.core.title} (${state.core.genre}) — ${short(state.core.summary, 400)}`,
        `Currency: ${w.currency}${w.fx?.rate ? ` (1 ${w.currency} ≈ ${fmtNum(w.fx.rate)} ${w.fx.unit})` : ''}`,
        w.prices.length ? `Known prices: ${w.prices.map(p => `${p.name} ${fmtNum(p.price)}`).join(', ')}` : '',
        state.data.shop?.shops.length ? `Shop items: ${state.data.shop.shops.flatMap(sh => sh.items.slice(0, 6).map(i => `${i.name} ${fmtNum(i.price)}`)).slice(0, 20).join(', ')}` : '',
        `Question: ${question}`,
    ].filter(Boolean);
    const out = stripStatus(await aiGenerate('price', P('ai.price', { currency: w.currency }), L.join('\n'), 300));
    const m = out.match(/PRICE\s*[:：]\s*(.+?)\s*=\s*([\d.,]+)/i);
    return { text: await finText(out.replace(/PRICE\s*[:：].*$/im, '').trim()), item: m?.[1]?.trim() ?? '', price: m ? Number(m[2].replace(/,/g, '')) : 0 };
}
const nameRe = (who) => new RegExp(`^\\s*(?:[-*•]\\s*)?(?:${who.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*[:：]\\s*)?`);

// 메신저/즉시 통신 답장 → 말풍선 줄들
export async function phoneReply(who, state) {
    const ct = state.data.contact;
    const sys = P('ai.phone', { who, app: ct.app });
    const out = await aiGenerate('phone', sys, [...aboutPerson(who, state), `Conversation so far:\n${threadText(ct, who)}`].join('\n\n'), 400);
    return finLines(stripStatus(out).split(/\r?\n/).map(x => x.replace(nameRe(who), '').replace(/^["“](.*)["”]$/, '$1').trim()).filter(Boolean).slice(0, 4));
}
// 편지 답장 → 본문 하나
export async function letterReply(who, state, { courier, rush }) {
    const ct = state.data.contact;
    const sys = P('ai.letter', { who, app: ct.app, courier: courier || ct.app, rush: rush ? `${who} paid extra for an express courier so it arrives fast — it may show a little in the letter (eagerness).` : '' });
    const out = await aiGenerate('letter', sys, [...aboutPerson(who, state), `Letters so far (oldest first):\n${threadText(ct, who, 8)}`].join('\n\n'), 700);
    return finText(stripStatus(out).replace(/^```\w*\s*|```\s*$/g, '').trim());
}
// 선톡
export async function pingMessage(who, state, auto = false) {
    const ct = state.data.contact;
    const letter = ct.mode === 'letter';
    const sys = P('ai.ping', { who, app: ct.app, format: letter ? 'a short letter: greeting, a paragraph or two, sign-off' : '1-3 short chat bubbles, one per line' });
    const out = await aiGenerate(auto ? 'autoping' : 'ping', sys, [...aboutPerson(who, state), `Earlier messages:\n${threadText(ct, who, 8) || '(none)'}`].join('\n\n'), letter ? 600 : 300);
    const t = stripStatus(out).trim();
    return letter ? [await finText(t)] : finLines(t.split(/\r?\n/).map(x => x.replace(nameRe(who), '').replace(/^["“](.*)["”]$/, '$1').trim()).filter(Boolean).slice(0, 4));
}

// 뉴스 · 가십 · 게시판 · 퀘스트: 새 항목만 받아 온다
async function freshItems(mod, feature, state, extra = '') {
    const cur = state.data[mod];
    const L = [
        `=== WORLD CORE ===\n${JSON.stringify(state.core)}`,
        state.data.calendar ? `=== NOW ===\n${dateStr(state.data.calendar)} ${state.data.calendar.time}` : '',
        state.data.rel ? `=== RELATIONSHIPS ===\n${state.data.rel.user.map(r => `${r.name}: ${r.label} 호감${r.aff}`).join(' / ')}` : '',
        `=== RECENT STORY ===\n${recentChat(Math.min(settings().recentForGen, 16)) || '(none)'}`,
        `=== PLAY STYLE ===\n${playLine()}`,
        `=== EXISTING (don't repeat) ===\n${JSON.stringify(cur ?? {}).slice(0, 3000)}`,
        extra,
        `=== TASK ===\n${P(`gen.${mod}`, { difficulty: diffLine() })}\nReturn ONLY new entries.`,
        `=== OUTPUT JSON SHAPE ===\n${SCHEMA[mod]}`,
    ].filter(Boolean);
    return finJSON((await aiJSON(feature, P('gen.system'), L.join('\n\n'))));
}
// 플레이 방식 알아보기 (카드 · 페르소나 · 첫 메시지 · 최근 채팅을 보고)
// 로맨스 보정 ⑤: 관계 인물들의 끌리는 것 · 싫어하는 것 · 요즘 신경 쓰는 것을 한 번에 채운다
export async function fillWants(state) {
    const d = state.data;
    const people = (d.rel?.user ?? []).slice(0, 16);
    if (!people.length) return [];
    const L = [
        `World: ${state.core.title} — ${short(state.core.summary, 500)}`,
        ...people.map(r => { const prof = d.profile ? findBy(d.profile.list, r.name) : null; const card = chatCharacters().find(ch => norm(ch.name) === norm(r.name));
            return `- ${r.name}${r.label ? ` [${r.label}]` : ''}: ${prof ? short(`${prof.summary} ${prof.fields.map(f => `${f.k}: ${f.v}`).join(' / ')}`, 500) : card ? short(card.description, 700) : short(r.memo, 200) || '(no profile)'}${r.likes || r.dislikes || r.concern ? ` | existing — likes: ${r.likes || '-'}; dislikes: ${r.dislikes || '-'}; concern: ${r.concern || '-'}` : ''}`; }),
        `Recent story (for context):\n${recentChat(8)}`,
    ];
    const o = await finJSON(await aiJSON('wants', P('ai.wants'), L.join('\n\n'), 1500));
    return Array.isArray(o?.list) ? o.list.filter(x => x?.name) : [];
}
export const PLAY_SHAPE = '{"mode":"rp|multi|director","cardIsWorld":false,"hero":"","cast":["이름"]}';
export async function detectPlay() {
    const c = ctx();
    const chars = chatCharacters();
    const L = [
        ...chars.map(ch => `[CARD NAME] ${ch.name}\n[CARD] ${short([ch.description, ch.personality, ch.scenario].filter(Boolean).join('\n'), 2500)}\n[FIRST MESSAGE] ${short(ch.first_mes, 800)}`),
        `[USER NAME] ${c.name1}\n[PERSONA] ${short(c.powerUserSettings?.persona_description ?? '', 600) || '(none)'}`,
        `[RECENT CHAT]\n${recentChat(10) || '(none)'}`,
    ];
    const o = await aiJSON('play', P('ai.play'), L.join('\n\n'), 400);
    return { ...normPlay(o), why: String(o.why ?? '') };
}
export async function newSns(state) {
    const o = normalize('sns', await freshItems('sns', 'sns', state));
    const date = stamp(state);
    return { name: o.name, posts: o.posts.map(x => ({ ...x, id: uid(), date, mine: false, liked: false })) };
}
export async function snsReactions(state, post) {
    const L = [
        `=== WORLD CORE ===\n${JSON.stringify(state.core)}`,
        state.data.rel ? `=== PEOPLE ===\n${state.data.rel.user.map(r => `${r.name}: ${r.label} 호감${r.aff}`).join(' / ')}` : '',
        `=== RECENT STORY ===\n${recentChat(6) || '(none)'}`,
        `=== POST by ${post.mine ? '{{user}}' : post.author} on ${state.data.sns?.name || 'SNS'} ===\n${post.text}${post.pic ? `\n[사진: ${post.pic}]` : ''}${post.tags ? `\n${post.tags}` : ''}`,
    ].filter(Boolean);
    const o = await finJSON(await aiJSON('snsReply', P('ai.snsReply'), L.join('\n\n'), 700));
    return { likes: Math.max(0, Math.round(Number(o.likes) || 0)), replies: (Array.isArray(o.replies) ? o.replies : []).filter(r => r?.text).map(r => ({ id: uid(), author: String(r.author || '익명'), text: String(r.text), mine: false })).slice(0, 6) };
}
export async function musicPicks(state) {
    const L = [
        `World: ${state.core.title} (${state.core.genre}) — tone: ${state.core.tone}`,
        state.data.calendar ? `Now: ${dateStr(state.data.calendar)} ${state.data.calendar.time} ${state.data.calendar.weather ?? ''}` : '',
        state.data.map?.here ? `Place: ${state.data.map.here}` : '',
        state.data.music?.log?.length ? `Already recommended (don't repeat): ${state.data.music.log.slice(-10).map(x => x.title).join(', ')}` : '',
        `Recent scene:\n${recentChat(6) || '(none)'}`,
    ].filter(Boolean);
    const o = await aiJSON('music', P('ai.music', { taste: tasteLine() }), L.join('\n\n'), 500);
    return (Array.isArray(o.songs) ? o.songs : []).filter(x => x?.title).slice(0, 3).map(x => ({ title: String(x.title), artist: String(x.artist ?? ''), mood: String(x.mood ?? ''), why: String(x.why ?? '') }));
}
export async function peekMind(who, state) {
    const rl = state.data.rel; const r = rl ? findBy(rl.user, who) : null;
    const st = r && rl.stages?.length ? rl.stages[Math.max(0, Math.min(rl.stages.length - 1, r.stage ?? 0))] : null;
    const out = await aiGenerate('peek', P('ai.peek', { who }), [...aboutPerson(who, state), st ? `Relationship stage: ${st.name}${r.jealous >= 30 ? ` · jealous ${r.jealous}/100` : ''}` : ''].filter(Boolean).join('\n\n'), 300);
    return finText(stripStatus(out).replace(/^["“]|["”]$/g, '').trim());
}
export async function newNews(state) {
    const o = normalize('news', await freshItems('news', 'news', state));
    const date = stamp(state);
    return { name: o.name, items: o.items.map(x => ({ ...x, id: uid(), date, read: false })) };
}
export async function newGossip(state) {
    const o = normalize('gossip', await freshItems('gossip', 'gossip', state));
    const date = stamp(state);
    return { name: o.name, issues: o.issues.map(x => ({ ...x, id: uid(), date, read: false })) };
}
export async function newPosts(state) {
    const o = normalize('board', await freshItems('board', 'board', state));
    const date = stamp(state);
    return { name: o.name, posts: o.posts.map(x => ({ ...x, id: uid(), date, mine: false })) };
}
export async function newQuests(state) {
    const o = normalize('quest', await freshItems('quest', 'quest', state));
    return o.list.map(q => ({ ...q, id: uid(), status: 'open', paid: false }));
}
export async function boardReplies(state, post) {
    const L = [
        `=== WORLD CORE ===\n${JSON.stringify(state.core)}`,
        `=== RECENT STORY ===\n${recentChat(8) || '(none)'}`,
        `=== BOARD: ${state.data.board?.name || ''} ===`,
        `=== POST by ${post.mine ? '{{user}}' : post.author} ===\n${post.title}\n${post.body}`,
        post.replies.length ? `=== EXISTING REPLIES ===\n${post.replies.map(r => `${r.mine ? '{{user}}' : r.author}: ${r.text}`).join('\n')}` : '',
    ].filter(Boolean);
    const o = await finJSON((await aiJSON('boardReply', P('ai.boardReply'), L.join('\n\n'), 700)));
    return (Array.isArray(o.replies) ? o.replies : []).filter(r => r?.text).map(r => ({ id: uid(), author: String(r.author || '익명'), text: String(r.text), mine: false })).slice(0, 5);
}
