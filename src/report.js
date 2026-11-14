// 🐞 오류 보고문 (v2.7): 공개 게시판에 그대로 올려도 되는 수준으로, 오류를 고치는 데 필요한 것만 모은다.
// AI를 부르지 않는다 (토큰 0 · 내용이 밖으로 새지 않음). 사람 이름은 [유저]·[인물1]로 바꾸고,
// 채팅 본문 · 로어북 · 페르소나 · 카드 설명 · API 키 · 주소 · 연결 프로필 이름은 아예 넣지 않는다.
import { app, ctx, settings, getMeta, modOn, MOD_IDS, MODULE, VERSION, DATA_V, TITLE, LOG, errLog, esc, playOf, ssWarn } from './core.js';
import { buildInjection, chatCharacters, hasStatus, drawerOps } from './engine.js';
import { popup, mascot } from './kit.js';

// ───── 미트볼 파일에서 난 오류도 잡기 (다른 확장의 오류는 건드리지 않음) ─────
const BASE = (() => { try { return new URL('..', import.meta.url).pathname; } catch { return '/meatball'; } })();
const ours = (s) => String(s ?? '').includes(BASE);
let capturing = false;
export function startErrorCapture() {
    if (capturing) return; capturing = true;
    window.addEventListener('error', (e) => {
        try { if (ours(e.filename) || ours(e.error?.stack)) push('uncaught', `${e.message}${e.error?.stack ? `\n${e.error.stack}` : ` @ ${e.filename}:${e.lineno}`}`); } catch { /* 무시 */ }
    });
    window.addEventListener('unhandledrejection', (e) => {
        try { const r = e.reason; const st = r?.stack ?? ''; if (ours(st)) push('promise', `${r?.name ?? 'Error'}: ${r?.message ?? r}\n${st}`); } catch { /* 무시 */ }
    });
}
function push(level, text) { errLog.push({ t: Date.now(), level, text: String(text).slice(0, 1500) }); if (errLog.length > 30) errLog.shift(); }

// ───── 가리기 ─────
// 이 채팅에 나오는 사람 이름 → [유저] · [인물1] … (같은 사람은 늘 같은 번호라 보고문 안에서 구분은 됨)
function nameMap() {
    const c = ctx(), s = app.current?.state, out = new Map();
    const add = (n, tag) => { n = String(n ?? '').trim(); if (n.length >= 2 && !out.has(n)) out.set(n, tag); };
    add(c.name1, '[유저]');
    if (s?.data?.profile?.list) for (const p of s.data.profile.list) if (p.role === 'user') add(p.name, '[유저]');
    const people = [...chatCharacters().map(ch => ch.name), ...(s?.data?.profile?.list ?? []).map(p => p.name), ...(s?.data?.rel?.user ?? []).map(r => r.name), ...(s?.data?.contact?.contacts ?? []).map(x => x.name), playOf().hero];
    let k = 0;
    for (const n of people) { const t = String(n ?? '').trim(); if (t.length >= 2 && !out.has(t)) out.set(t, `[인물${++k}]`); }
    // 성·이름으로 나눠 불러도 가려지게 (「레온 하트」 → 「레온」도)
    for (const [n, tag] of [...out]) for (const part of n.split(/[\s·.]+/)) if (part.length >= 2 && !out.has(part)) out.set(part, tag);
    return [...out].sort((a, b) => b[0].length - a[0].length); // 긴 이름부터
}
export function scrub(text, names = nameMap()) {
    let t = String(text ?? '');
    // 스택의 미트볼 파일 주소 → 파일 이름:줄만
    t = t.replace(/(?:https?:\/\/[^\s)]*?|\/)[^\s()]*?\/(src\/[\w.-]+\.js|index\.js)(?:\?[^\s):]*)?(:\d+(?::\d+)?)?/g, (_, f, l) => `${f.replace(/^src\//, '')}${l ?? ''}`);
    t = t.replace(/(?:https?|file|blob|chrome-extension|moz-extension):\/\/[^\s)'"<>]+/gi, '[링크]');
    t = t.replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, '[이메일]');
    t = t.replace(/\b(?:sk-|sk_|AIza|xai-|gsk_|hf_)[\w-]{8,}/g, '[키]').replace(/\b[A-Za-z0-9_-]{32,}\b/g, '[키]');
    t = t.replace(/[A-Za-z]:\\(?:Users|Documents and Settings)\\[^\\\s]+/gi, '[경로]').replace(/\/(?:home|Users)\/[^/\s]+/g, '[경로]');
    t = t.replace(/\b\d{1,3}(?:\.\d{1,3}){3}(?::\d+)?\b/g, '[IP]');
    t = t.replace(/\b01[016789][-\s]?\d{3,4}[-\s]?\d{4}\b/g, '[번호]');
    for (const [n, tag] of names) t = t.split(n).join(tag);
    return t;
}

// ───── 모으기 ─────
function browser() {
    const ua = navigator.userAgent || '';
    const b = /Edg\/(\d+)/.exec(ua) ? `Edge ${RegExp.$1}` : /SamsungBrowser\/(\d+)/.exec(ua) ? `Samsung ${RegExp.$1}` : /Firefox\/(\d+)/.exec(ua) ? `Firefox ${RegExp.$1}` : /Chrome\/(\d+)/.exec(ua) ? `Chrome ${RegExp.$1}` : /Version\/(\d+).*Safari/.exec(ua) ? `Safari ${RegExp.$1}` : '기타 브라우저';
    const os = /Android/.test(ua) ? 'Android' : /iPhone|iPad|iPod/.test(ua) ? 'iOS' : /Mac OS X/.test(ua) ? 'macOS' : /Windows/.test(ua) ? 'Windows' : /Linux/.test(ua) ? 'Linux' : '기타';
    return `${b} · ${os}${/Mobi|Android|iPhone/.test(ua) ? ' · 모바일' : ''}`;
}
async function stVersion() {
    try {
        const ctl = new AbortController(); const tm = setTimeout(() => ctl.abort(), 2500);
        const r = await fetch('/version', { signal: ctl.signal }); clearTimeout(tm);
        const v = await r.json();
        return `${v.pkgVersion ?? '?'}${v.gitBranch ? ` (${v.gitBranch})` : ''}`;
    } catch { return '알 수 없음'; }
}
const ON = (b) => (b ? '켬' : '끔');
const SET_KEYS = ['enabled', 'sync', 'injectMode', 'injectDepth', 'deltaMode', 'deltaEvery', 'sceneFilter', 'sceneTurns', 'pinCap', 'msgCard', 'injScan', 'injWorld', 'autoBake', 'bakeAfter',
    'stashTags', 'legacyStatus', 'autoRegex', 'skipQuiet', 'oocDetect', 'ssGenLang', 'trEngine', 'trAuto', 'contactReflect', 'autoPing', 'genMode', 'genBatch', 'genParallel',
    'aiMaxTokens', 'recentForGen', 'loreChars', 'retryJSON', 'aiFallbackMain', 'toastMode', 'stageLock', 'jealousy', 'offscreen',
    'romBond', 'romCap', 'romFatigue', 'romFacts', 'romDrive', 'romDepth', 'showHud', 'showSide', 'showFloat', 'bottomNav', 'theme'];
function settingsLines() {
    const s = settings();
    const v = (x) => (typeof x === 'boolean' ? ON(x) : x === '' || x === undefined || x === null ? '-' : String(x).slice(0, 20));
    const L = [SET_KEYS.map(k => `${k}=${v(s[k])}`).join(' · ')];
    const filled = (k) => (String(s[k] ?? '').trim() ? '있음' : '없음');
    L.push(`글로 적는 설정(내용은 안 넣음): 번역 지침 ${filled('trRules')} · 내 주입문 ${filled('romInject')} · 칸별 보내는 때 ${Object.keys(s.injEvery ?? {}).length}칸 · 고친 프롬프트 ${Object.keys(s.prompts ?? {}).length}개`);
    const profs = ['aiProfile', 'profContact', 'profGen', 'profFeeds', 'profAnalyze', 'profHelp', 'trProfile'].filter(k => s[k]);
    L.push(`연결 프로필(이름은 안 넣음): ${profs.length ? profs.join(', ') + ' 따로 고름' : '전부 메인 연결'}`);
    return L;
}
function chatLines() {
    const c = ctx(), meta = getMeta(), chat = c.chat ?? [];
    if (!c.getCurrentChatId?.()) return ['열린 채팅 없음'];
    const L = [];
    const ai = chat.filter(m => !m.is_user && !m.is_system);
    L.push(`메시지 ${chat.length}개 (AI 답 ${ai.length}) · ${c.groupId ? `그룹챗 (멤버 ${chatCharacters().length}명)` : '1:1 채팅'}`);
    if (!meta) { L.push('이 채팅엔 상태창 데이터 없음'); return L; }
    L.push(`상태창 ${meta.base ? '있음' : '아직 안 만듦'} · 이 채팅에서 ${meta.off ? '꺼짐' : '켜짐'} · 일시정지 ${ON(meta.paused)} · 데이터 v${meta.v ?? '?'} (지금 v${DATA_V}) · 난이도 ${meta.difficulty ?? '-'} · 플레이 ${playOf(meta).mode}${playOf(meta).cardIsWorld ? ' (카드=세계관)' : ''}`);
    L.push(`굳힌 위치 ${meta.startAt ?? 0} · 편집 기록 ${meta.adjust?.length ?? 0}개 · 세이브 ${meta.saves?.length ?? 0}개 · 알림 ${meta.notes?.length ?? 0}개 · 데이터 크기 약 ${Math.round(JSON.stringify(c.chatMetadata?.[MODULE] ?? {}).length / 1024)}KB`);
    L.push(`켜진 칸: ${MOD_IDS.filter(id => modOn(id, meta)).join(', ') || '없음'}`);
    const tail = ai.slice(-20);
    const tagged = tail.filter(m => hasStatus(m.mes)).length, drawer = tail.filter(m => drawerOps(m)).length;
    L.push(`최근 AI 답 ${tail.length}개 중: 본문에 태그 남음 ${tagged} · 보관된 변화 기록 ${drawer} · 둘 다 없음 ${tail.length - tagged - drawer}`);
    const st = app.current?.state;
    if (st) {
        const d = st.data, n = (x) => (Array.isArray(x) ? x.length : 0);
        L.push(`상태 크기: 인물(관계) ${n(d.rel?.user)} · 프로필 ${n(d.profile?.list)} · 장소 ${n(d.map?.places)} · 소지품 ${n(d.wallet?.items)} · 퀘스트 ${n(d.quest?.list)} · 연락처 ${n(d.contact?.contacts)} · 메모 ${n(d.memo?.list)} · 게이지 ${n(d.stats?.bars)} · 턴 ${st.turn}`);
        try { const inj = buildInjection(app.current); L.push(`지금 주입문 길이(글자): 상태 ${inj.main.length} · 인물 ${inj.people.length} · 로맨스 ${inj.romance?.length ?? 0}`); } catch (e) { L.push(`주입문 만들기 실패: ${e?.message ?? e}`); }
    } else if (meta.base) L.push('상태 계산 결과 없음 (계산 실패 가능성)');
    return L;
}
function regexLine() {
    const rx = ctx().extensionSettings?.regex ?? [];
    const ids = ['b7c1a0e2-5a1d-4f0e-9a51-55a1a0c05501', 'b7c1a0e2-5a1d-4f0e-9a51-55a1a0c05502'];
    const st = ids.map((id, i) => { const x = rx.find(r => r.id === id); return `${i + 1}번 ${x ? (x.disabled ? '꺼짐' : '켜짐') : '없음'}`; });
    const others = rx.filter(r => !ids.includes(r.id) && !r.disabled && /meatball|status/i.test(String(r.findRegex ?? ''))).length;
    return `미트볼 정규식: ${st.join(' · ')} · 다른 정규식 중 meatball/status를 건드리는 것 ${others}개`;
}
function apiLine() {
    const c = ctx();
    let model = ''; try { model = c.getChatCompletionModel?.() ?? ''; } catch { /* 무시 */ }
    const src = c.chatCompletionSettings?.chat_completion_source ?? '';
    return `메인 API: ${c.mainApi ?? '?'}${src ? ` · ${src}` : ''}${model ? ` · ${String(model).slice(0, 60)}` : ''}`;
}
function usageLines() {
    const u = (settings().usage ?? []).slice(-8);
    if (!u.length) return ['기록 없음'];
    return u.map(e => `${new Date(e.t).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })} ${e.f} · ${e.ok ? '성공' : '실패'} · 입력≈${e.inp} 출력≈${e.out}${e.model ? ` · ${String(e.model).slice(0, 40)}` : ''}`);
}
function errorLines(names) {
    const list = errLog.slice(-15);
    if (!list.length) return ['이번 접속 동안 미트볼에서 난 오류 없음'];
    return list.map(e => {
        const lines = scrub(e.text, names).split('\n').map(x => x.trim()).filter(Boolean);
        const head = lines[0], stack = lines.slice(1).filter(x => /^at |@/.test(x)).slice(0, 4);
        return `[${new Date(e.t).toLocaleTimeString('ko-KR')} ${e.level}] ${head.slice(0, 300)}${stack.length ? `\n    ${stack.join('\n    ')}` : ''}`;
    });
}

export async function buildReport(symptom = '', opt = {}) {
    const names = nameMap();
    const out = [];
    const sec = (title, lines) => out.push(`--- ${title} ---`, ...lines, '');
    out.push('=== 미트볼 상태창 오류 보고 (MEATBALL-REPORT v1) ===');
    out.push(`확장 v${VERSION} · SillyTavern ${await stVersion()} · ${browser()}`);
    out.push(`만든 때: ${new Date().toLocaleString('ko-KR')}`, '');
    sec('증상 (사용자가 적은 것)', [scrub(String(symptom).trim() || '(적지 않음)', names).slice(0, 2500)]);
    let L = []; try { L = chatLines(); } catch (e) { L = [`채팅 정보 모으기 실패: ${e?.message ?? e}`]; }
    sec('지금 채팅', L.map(x => scrub(x, names)));
    sec('설정', settingsLines());
    sec('연결 · 정규식', [apiLine(), regexLine()]);
    if (opt.usage !== false) sec('확장 AI 최근 호출 (내용 없이)', usageLines());
    sec('최근 오류 (미트볼에서 난 것만)', errorLines(names));
    out.push('--- 안내 ---', '사람 이름은 [유저]·[인물N]으로 가렸고, 채팅 본문·로어북·페르소나·카드 설명·API 키·주소·연결 프로필 이름은 넣지 않았어요.');
    return out.join('\n');
}

// ───── 창 ─────
export async function openReport(prefill = '') {
    const el = document.createElement('div');
    el.className = 'ss-root ss-scope ss-report ss-notr';
    el.innerHTML = `<div class="ss-wz-head">${mascot('think', 'md')}<div><b>🐞 오류 보고문 만들기</b><small>AI 0회 · 내 컴퓨터에서만 만들어져요</small></div></div>
        <div class="ss-callout"><i class="fa-solid fa-shield-halved"></i><div><b>개인정보는 넣지 않아요</b><span>채팅 본문 · 로어북 · 페르소나 · 카드 설명 · API 키 · 주소는 아예 안 들어가고, 사람 이름은 [유저] · [인물1]로 바뀌어요. 아래 증상 칸에도 <b>이야기 내용이나 실명은 적지 말고</b> 무엇을 눌렀더니 어떻게 됐는지만 적어 주세요.</span></div></div>
        <label class="ss-f wide"><span>무슨 일이 있었나요? (언제 · 무엇을 했더니 · 어떻게 됐는지 · 기대한 것)</span>
            <textarea class="ss-in ss-rp-sym" rows="5" placeholder="예: 스와이프하면 체력이 두 번 깎여요. 다시 생성은 괜찮아요. 폰에서만 그래요.">${esc(prefill)}</textarea></label>
        <label class="ss-tog"><input type="checkbox" class="ss-switch ss-rp-usage" checked><span>확장 AI 최근 호출 기록 넣기 (기능 이름 · 토큰 수 · 모델 이름만)</span></label>
        <div class="ss-row-btns"><button class="ss-btn pri ss-rp-go"><i class="fa-solid fa-file-lines"></i> 보고문 만들기</button></div>
        <div class="ss-rp-out ss-hide">
            <p class="ss-hint">한 번 읽어 보고, 괜찮으면 복사해서 그대로 붙여 넣으세요. 여기서 직접 고쳐도 돼요.</p>
            <textarea class="ss-in ss-rp-text" rows="14" spellcheck="false"></textarea>
            <div class="ss-row-btns"><button class="ss-btn pri ss-rp-copy"><i class="fa-solid fa-copy"></i> 복사</button></div>
        </div>`;
    const txt = el.querySelector('.ss-rp-text');
    el.addEventListener('click', async (e) => {
        if (e.target.closest('.ss-rp-go')) {
            try {
                txt.value = await buildReport(el.querySelector('.ss-rp-sym').value, { usage: el.querySelector('.ss-rp-usage').checked });
                el.querySelector('.ss-rp-out').classList.remove('ss-hide');
                txt.scrollIntoView?.({ block: 'nearest' });
            } catch (err) { ssWarn(LOG, 'report', err); toastr.error(`보고문을 만들지 못했어요: ${esc(err?.message ?? err)}`, TITLE); }
        }
        if (e.target.closest('.ss-rp-copy')) {
            try { await navigator.clipboard.writeText(txt.value); }
            catch { txt.select(); document.execCommand?.('copy'); }
            toastr.success('복사했어요. 그대로 붙여 넣으면 돼요.', TITLE);
        }
    });
    await popup(el, { okButton: '닫기' });
}
app.openReport = openReport;

// ───── 📋 지금 상태 복사 (v2.7.18) — 고칠 사람(개발자 · AI)에게 그대로 붙여 넣는 용 ─────
// 오류 보고문과 달리 가리지 않아요: 최근 메시지 원문 · 지금 상태 전체 · 최근 편집 기록 원본 · AI에게 가는 주입문을 그대로. (API 키 모양만 지움)
// AI를 부르지 않아요 (토큰 0). 내 컴퓨터 클립보드로만 가요.
const noKey = (t) => String(t ?? '').replace(/\b(?:sk-|sk_|AIza|xai-|gsk_|hf_)[\w-]{8,}/g, '[키]');
const cut = (t, n) => { const x = String(t ?? ''); return x.length > n ? `${x.slice(0, n)}… (${x.length - n}자 더)` : x; };
export async function buildDump({ msgs = 8 } = {}) {
    const c = ctx(), meta = getMeta(), chat = c.chat ?? [], s = settings(), st = app.current?.state;
    const L = [];
    const H = (t) => L.push('', `===== ${t} =====`);
    L.push(`[미트볼 상태 복사] v${VERSION} · ${new Date().toLocaleString('ko-KR')} · ${browser()} · 실리태번 ${await stVersion()}`);
    H('채팅'); L.push(...chatLines(), regexLine());
    try { L.push(apiLine()); } catch { /* */ }
    H('설정 (기본값과 다른 것만)');
    const { DEFAULTS } = await import('./core.js');
    const skip = new Set(['usage', 'carry', 'tipNever', 'hintSeen', 'lastSeenNote', 'themeCustom', 'floatPos']);
    const diff = Object.keys(s).filter(k => !skip.has(k) && JSON.stringify(s[k]) !== JSON.stringify(DEFAULTS[k]));
    L.push(diff.map(k => `${k}=${k === 'prompts' ? `(고친 프롬프트 ${Object.keys(s.prompts ?? {}).length}개: ${Object.keys(s.prompts ?? {}).join(', ')})` : cut(JSON.stringify(s[k]), 200)}`).join('\n') || '(모두 기본값)');
    H(`최근 메시지 원문 (최근 ${msgs}개 · 날것 그대로)`);
    for (let i = Math.max(0, chat.length - msgs); i < chat.length; i++) {
        const m = chat[i]; if (!m) continue;
        const ops = drawerOps(m);
        const snap = app.current?.snaps?.get(i);
        L.push(`--- #${i} ${m.is_user ? '👤 유저' : m.is_system ? '⚙ 시스템' : '🤖 AI'} (${m.name ?? ''}) · 스와이프 ${m.swipe_id ?? 0}/${m.swipes?.length ?? 1}${m.send_date ? ` · ${m.send_date}` : ''}`);
        L.push(noKey(cut(m.mes, 6000)));
        if (ops?.length) L.push(`[보관된 변화 기록] ${ops.map(([k, v]) => `${k}: ${v}`).join(' | ')}`);
        if (snap?.labels?.length) L.push(`[칩] ${snap.labels.join(' · ')}`);
    }
    H('최근 편집 기록 원본 (최근 25개 · 버튼으로 한 것)');
    for (const a of (meta?.adjust ?? []).slice(-25)) {
        const x = { ...a }; if (x.set) x.set = { mod: x.set.mod, ...(x.set.patch ? { patch: cut(JSON.stringify(x.set.patch), 300) } : { data: cut(JSON.stringify(x.set.data), 300) }) };
        L.push(JSON.stringify(x));
    }
    if (meta?.wipe) L.push(`🧹 전체 삭제한 칸: ${JSON.stringify(meta.wipe)}`);
    H('지금 AI에게 보내는 글 (주입문)');
    try { const inj = buildInjection(app.current); L.push(`[상태]\n${noKey(inj.main)}`, `[인물]\n${noKey(inj.people)}`, `[로맨스]\n${noKey(inj.romance || '(없음)')}`); } catch (e) { L.push(`(만들기 실패: ${e?.message ?? e})`); }
    H('번역');
    L.push(`생성 언어 ${s.ssGenLang} · 담당 ${s.trEngine} · 자동 ${s.trAuto} · 사전 ${Object.keys(meta?.tr ?? {}).length}개 · 📌 고정 ${Object.keys(meta?.trLock ?? {}).length}개`);
    try { const { missingTr } = await import('./translate.js'); const miss = missingTr(); L.push(`영어로 남은 글 ${miss.length}개${miss.length ? `: ${miss.slice(0, 15).map(x => cut(x, 60)).join(' / ')}` : ''}`); } catch { /* */ }
    H('지금 상태 전체 (JSON)');
    if (st) {
        const on = Object.fromEntries(MOD_IDS.filter(id => modOn(id, meta) && st.data[id]).map(id => [id, st.data[id]]));
        L.push(cut(JSON.stringify({ core: st.core, data: on, turn: st.turn, recent: st.recent, pendingRoll: st.pendingRoll, gone: st.gone, tally: st.tally }, null, 1), 80000));
    } else L.push('(상태 없음)');
    H('오류 기록');
    L.push(errLog.length ? errLog.slice(-15).map(e => `[${new Date(e.t).toLocaleTimeString('ko-KR')}] ${e.level}: ${e.text}`).join('\n') : '(없음)');
    return L.join('\n');
}
export async function copyDump() {
    let text = '';
    try { text = await buildDump(); } catch (e) { ssWarn(LOG, 'dump', e); toastr.error(`상태를 모으지 못했어요: ${esc(e?.message ?? e)}`, TITLE); return; }
    let ok = false;
    try { await navigator.clipboard.writeText(text); ok = true; } catch { /* 아래 방법으로 */ }
    if (!ok) {
        const ta = document.createElement('textarea'); ta.value = text; ta.style.cssText = 'position:fixed;left:-9999px;top:0';
        document.body.appendChild(ta); ta.select();
        try { ok = document.execCommand('copy'); } catch { ok = false; }
        ta.remove();
    }
    if (ok) toastr.success(`지금 상태를 복사했어요 (${Math.round(text.length / 1000)}천 자). 대화창에 그대로 붙여 넣으면 돼요.<br><small>가리지 않은 원문이에요 — 공개 게시판엔 「오류 보고문」을 쓰세요.</small>`, TITLE, { escapeHtml: false, timeOut: 8000 });
    else {
        const box = document.createElement('div'); box.className = 'ss-root ss-scope';
        box.innerHTML = '<p class="ss-hint">자동 복사가 막혔어요. 아래 글을 길게 눌러 모두 선택 → 복사해 주세요.</p><textarea class="ss-in" rows="14" readonly></textarea>';
        box.querySelector('textarea').value = text;
        await popup(box, { large: true });
    }
}
app.copyDump = copyDump;
