// 🐱 미트볼 도우미: 모르는 기능을 물어보는 작은 챗창 (v2.6)
// 내장 안내서 + 지금 설정을 같이 보내서, 「어디서 켜요?」 「왜 안 돼요?」에 답한다. 모델은 따로 고를 수 있다.
import { app, settings, saveSettings, getMeta, modOn, MODS, esc, TITLE, LOG, VERSION, ssWarn } from './core.js';
import { P, aiGenerate, listProfiles } from './prompts.js';
import { popup, mascot } from './kit.js';
import { openReport } from './report.js';

// 모델이 읽는 안내서 (영어) — 화면에 보이는 한국어 이름은 「」 안에 그대로 적는다
const GUIDE = `MEATBALL STATS (미트볼 상태창) v${VERSION} — FEATURE GUIDE
A SillyTavern extension: a status sheet that attaches to any character card. All panels are first filled by AI, then can be edited by hand (✏️ 편집), changed by instruction (✨ AI로 수정), or regenerated (🔄 다시 생성).

WHERE THINGS ARE
- Extension settings: SillyTavern top bar › Extensions (블록 아이콘) › 「😼 미트볼 상태창」 drawer. Most toggles live here.
- Status sheet (상태창): opened from the HUD above the chat, the side panel, or /ss. Tabs are grouped: 홈 · 나 · 세계 · 사람 · 소식 · 관리.
- Sheet header buttons: 난이도 chip · 🔔 알림함 · 🔎 검색 · ⏸ 일시정지 · 📜 프롬프트·토큰 · ⛶ 전체화면 · ❓ 도우미.
- 「프롬프트 · 토큰」 window: shows when tokens are spent, the exact text being injected now, lets the user edit every prompt, and keeps a usage log.

GETTING STARTED
1) Open any chat. 2) 「상태창 만들기」 (wizard): pick world source, genre, difficulty, profile mode, which panels to use, contact style, extra instruction. 3) Each tab has tools: ✨ AI로 수정 · ✏️ 편집 · </> JSON · 🔄 다시 생성.

HOW THE STORY UPDATES THE SHEET (setting 「스토리 → 상태창 자동 반영」)
- A. 태그 (recommended): the main AI ends each reply with a <meatball> block of "key: value" changes (e.g. "aff: 레온 +3"). No extra call.
- A+B: tag, plus a separate analysis call only when the tag is missing. B: a separate analysis call after every reply (accurate, costs more). C: off.
- The block is hidden by an auto-installed regex and shown as small change chips under the message. ✏️ on a chip edits that reply's changes.
- If chips do not appear: check 「사용」 is on, the chat has a sheet, sync is not C, the regex is installed (「정규식 설치」), and it is not paused.

PANELS (기능; turn on/off per chat in 관리 탭 › 쓸 기능)
프로필 · 수치(gauges, attributes, conditions) · 주사위 · 재산(money, items, prices, jobs, regular income, loans) · 상점 · 본거지(rooms, furniture, storage, trash, second-hand market) · 관계 · 지도(zoom, areas, residents, routines, travel time/fare) · 달력(date, time slots, weather, seasons, events) · 연락(messenger or letters with couriers, rush delivery, attachments, read receipts, 선톡) · 퀘스트 · 뉴스 · 가십지 · 게시판 · 업적(and endings, 2회차) · 메모 · 운명(curses/blessings, event cards, auto rules, mini-games) · SNS · 추천 음악 · 내 탭(custom tracked values).

DICE (주사위)
- The user rolls from the sheet or /ss-roll; the result is put into the user's message as [판정 · …] BEFORE generation, and the AI must narrate exactly that outcome. The AI can ask for a roll with the "roll" key. Difficulty shifts the target (이지 −2, 하드 +2).

RELATIONSHIPS (관계)
- Each person has 호감(aff) and 신뢰(trust) from −100 to 100, and a stage (단계). Default stages: 낯선 사이 → 아는 사이 → 친구 → 가까운 사이 → 특별한 사이 → 연인. Both numbers must pass a stage's thresholds. Each stage unlocks behaviours. Stages are editable per world.
- 질투 (jealousy gauge), 화면 밖 생활 (off-screen life after days pass), 속마음 엿보기 (💗? button, one AI call, daily limit), automatic anniversaries.
- 「관계 단계를 넘는 행동 막기」: tells the AI not to act beyond the stage (a prohibition; can make characters cold).

ROMANCE GUARD (💗 로맨스 보정) — NEW in v2.6, all optional, default OFF. Extension settings › 「💗 로맨스 보정」. Button 「추천 세트 켜기 (①②④)」 turns on the recommended three.
- ① 연인은 고백으로만: the top stage cannot be reached by numbers alone. When the numbers qualify, a "조건 충족 · 고백 전" notice appears. When the AI reports a confession (key "confess"), a dialog asks 「연인으로 확정할까요?」 with 「💍 네, 좋아요」 / 「🌙 음… 아직 지금을 더 즐길래요」. The 「💍 연인 확정」 button always stays on the person's card in the 관계 tab; 「확정 취소」 undoes it.
- ② 한 번에 확 못 오르게: caps how much one person's 호감/신뢰 can rise per AI reply (default +5). A cut shows as a ⚖️ chip.
- ③ 연달아 꼬시면 덜 오르게: if the same person's 호감 rises 3 turns in a row, gains shrink to 60%, then 34%.
- ④ 관계를 사실로 알려 주기: instead of "don't", tells the AI the current stage as a fact, what the character naturally does at this stage, and to deflect in character (not turn cold) when pushed past it.
- ⑤ 인물의 욕구: per-person 끌리는 것 / 싫어하는 것 / 요즘 신경 쓰는 것, editable in 관계 편집 or filled by the 「욕구 AI로 채우기」 button; the AI updates them with "concern" / "taste".
- ⑥ 의도 먼저: one line telling the AI to decide each character's own goal before writing, and to treat the user's message as an attempt, not an outcome.
- ⑦ 내 추가 주입문: the user's own extra injected text, works with any preset.
- ⑧ 먼저 움직이기: on some turns (chance %) tells the AI that a present character takes the initiative on their own.
- ①②③ only apply to replies that come AFTER they are turned on in that chat; old numbers never change. They do not apply to a swipe of a reply that existed before turning them on.
- The romance text is injected separately with its own depth (「로맨스 보정 주입 깊이」, 0 = very end; use 0–1 if the model ignores it).

TRANSLATION (🌐 상태창 언어 · 번역) — affects only the sheet, never the roleplay text
- 「상태창 생성 언어」: 한국어로 바로 생성 / 영어로 저장 · 화면만 번역 (recommended: stored and injected in English, shown translated) / 영어로 생성 → 번역본을 저장 (old way: the translation itself is stored and sent to the AI).
- 「번역 담당」: 번역 모델 (LLM, understands instructions, costs tokens) or 실리 기본 번역 (SillyTavern's Chat Translation extension: Google, DeepL… free, fast; choose the provider in Extensions › Chat Translation).
- 「번역 지침」: for the LLM the whole text is passed as rules; for 실리 기본 번역 only lines shaped "원문 = 번역" are used (fixes names and terms).
- 「상태창 전체 번역」: (in 화면만 번역 mode) builds the display dictionary for panels that are already English.
- 「한국어로 저장된 칸을 영어 저장으로 바꾸기」: converts panels that were stored in Korean; the existing Korean stays as the on-screen translation.
- In 화면만 번역 mode the ✏️ 편집 window shows the stored English on purpose.

TOKENS AND SAVING THEM
- Every main generation: the state injection (input) plus the <meatball> block (20–80 output tokens).
- 「모델 맞춤 · 토큰 절약」 preset buttons set several options at once. 「변화 위주로 보내기」 sends the full state every N turns and only changes in between. 「규칙 주입」: 전체 / 간결 / 초압축. 「장면 필터」 details only people in the recent scene. 「칸별 보내는 때」 sets per-panel frequency.
- Zero tokens: saves, backups, dice, purchases, edits, travel, calendar, memos, achievements, loans, item use, curses, mini-games, notifications.
- Zero injection: ⏸ 일시정지, 「다음 1번 건너뛰기」, OOC messages (auto-detect), quiet generations.
- Buttons that call the AI are marked with an "AI" badge. 「기능별 모델 따로 고르기」 lets contacts, generation, feeds and analysis use different connection profiles.

DATA SAFETY (관리 탭)
세이브 슬롯 (5, /ss-save) · 자동 세이브 · 전체 백업 (/ss-backup) · 카드에 상태창 붙이기 (ship the sheet inside a card) · 분기 따라가기 · 자가 진단 (/ss-diag) · 되돌리기 (/ss-undo, undoes the last sheet edit). Data is stored per chat in chat metadata, so removing the extension does not delete it.

PLAY STYLES
롤플 (user is the protagonist, one character) · 다인봇 (several characters) · 풀사칭 (user is the director; the sheet's "me" is the protagonist). Change in 관리 탭 › 플레이 방식.

SLASH COMMANDS
/ss [탭] · /ss-make · /ss-prompts · /ss-roll [판정] · /ss-set key=… 값 · /ss-instruct tab=… 지시 · /ss-get [key=…] · /ss-undo · /ss-save · /ss-backup · /ss-inbox · /ss-search · /ss-diag · /ss-pause · /ss-resume · /ss-skip · /ss-help [질문]. Macro: {{ss::key}} e.g. {{ss::cash}}, {{ss::aff:레온}}.

COMMON PROBLEMS
- New settings not visible after an update: hard refresh (Ctrl+Shift+R); check the installed branch in Manage extensions.
- Numbers look wrong / sheet missing: 자가 진단.
- AI forgets <meatball> on light models: set sync to A+B; avoid 초압축.
- A person is not described in the prompt: 장면 필터 only details people named in the recent messages.
- Update notice: shown once per version; reopen with 「업데이트 내역」 (settings › 데이터 · 화면).
- Something is broken or the user is unhappy: tell them to press 「🐞 오류 보고문」 at the top of this helper window (or /ss-report). It builds a report with no AI call that is safe to post publicly (names become [유저]/[인물N]; no chat text, lorebook, persona, API keys or addresses). They describe what they did and what happened, then copy the report and send it to the developer.

NEW IN v2.7
- 「만드는 방식」 in the wizard: 전부 AI · 기본 틀 + AI (recommended: rule panels like 수치/주사위/달력/업적/운명 use a fixed generic template, only world panels use AI) · 기본 틀만 (0 AI calls, instant; fill panels later with AI).
- Default settings are now 「기본 (추천)」 for light models (간결 injection). 「전체」 injection is not recommended (many tokens every turn).
- Long chats are auto-compacted (최근 120 messages stay editable). Option to stop the injection from triggering lorebook entries.
- Mascot sound: only 냥냥 or off.
- New chats start with only 6 essential panels on (프로필 수치 재산 관계 지도 달력). Other panels are suggested later by a 💡 「이런 기능도 있어요」 notification when the story fits (e.g. texting → 연락, shopping → 상점); 「써 볼래요」 turns it on and fills it with the basic template (0 AI calls), 「괜찮아요」 never suggests that one again. Toggle: settings › 「💡 안 쓰는 기능 추천」. Any panel can also be turned on in 관리 탭 › 쓸 기능.
- If the AI forgets the sign (「cash: 120」), a number close to the current value is read as the new total, otherwise as +N.`;

// 지금 설정 한 줄 요약 → 「왜 안 돼요?」에 답할 수 있게
function snapshot() {
    const s = settings(), meta = getMeta();
    const on = (b) => (b ? 'on' : 'off');
    const L = [
        `enabled: ${on(s.enabled)} · this chat has a sheet: ${on(!!meta?.base)} · chat off: ${on(!!meta?.off)} · paused: ${on(!!meta?.paused)}`,
        `sync: ${s.sync} · inject mode: ${s.injectMode} · inject depth: ${s.injectDepth} · delta mode: ${on(s.deltaMode)} · scene filter: ${on(s.sceneFilter)}`,
        `sheet language: ${s.ssGenLang} · translator: ${s.trEngine} · translation rules: ${String(s.trRules ?? '').trim() ? 'set' : 'empty'}`,
        `romance guard: ①bond ${on(s.romBond)} · ②cap ${on(s.romCap)} (+${s.romCapAff}/+${s.romCapTrust}) · ③fatigue ${on(s.romFatigue)} · ④facts ${on(s.romFacts)} · ⑤wants ${on(s.romDrive)} · ⑥intent ${on(s.romIntent)} · ⑦own text ${String(s.romInject ?? '').trim() ? 'set' : 'empty'} · ⑧initiative ${on(s.romInit)} (${s.romInitPct}%) · depth ${s.romDepth}`,
        `stage lock: ${on(s.stageLock)} · jealousy: ${on(s.jealousy)} · off-screen life: ${on(s.offscreen)}`,
    ];
    if (meta?.mods) L.push(`panels on in this chat: ${MODS.filter(m => modOn(m.id, meta)).map(m => m.name).join(', ') || 'none'}`);
    return L.join('\n');
}

const QUICK = ['처음인데 뭐부터 하면 돼요?', '기본 틀이 뭐예요?', '로맨스 보정이 뭐예요? 뭘 켜면 좋아요?', '토큰을 아끼려면 어떻게 해요?', '상태창이 영어로 저장되게 하려면요?', '변동 칩이 안 떠요', '🐞 오류 보고문 써 줘'];
const history = []; // 창을 닫아도 이번 접속 동안은 이어짐
const fmt = (t) => esc(t).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\n/g, '<br>');

export async function askHelp(question) {
    const q = String(question ?? '').trim();
    if (!q) return '';
    const past = history.slice(-6).map(m => `${m.role === 'user' ? 'User' : 'Meatball'}: ${m.text}`).join('\n');
    const prompt = [`=== GUIDE ===\n${GUIDE}`, `=== THIS USER'S CURRENT SETTINGS ===\n${snapshot()}`, past ? `=== CONVERSATION SO FAR ===\n${past}` : '', `=== QUESTION ===\n${q}`].filter(Boolean).join('\n\n');
    const out = await aiGenerate('help', P('ai.help'), prompt, 900, { profile: settings().profHelp || '' });
    const text = String(out ?? '').replace(/<think(?:ing)?>[\s\S]*?<\/think(?:ing)?>/gi, '').trim() || '답을 받지 못했어요. 모델을 바꿔서 다시 물어봐 주세요.';
    history.push({ role: 'user', text: q }, { role: 'bot', text });
    if (history.length > 40) history.splice(0, history.length - 40);
    return text;
}

export async function openHelp(first = '') {
    const el = document.createElement('div');
    el.className = 'ss-root ss-scope ss-help ss-notr';
    const profs = () => `<option value="">확장 AI 모델 그대로</option>${listProfiles().map(p => `<option value="${esc(p.id)}" ${p.id === settings().profHelp ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}`;
    el.innerHTML = `<div class="ss-wz-head">${mascot('happy', 'md')}<div><b>미트볼 도우미</b><small>모르는 기능을 물어보세요 · 질문 1번 = AI 1회</small></div></div>
        <div class="ss-row-btns ss-help-tools"><button class="ss-btn sm" data-help-report><i class="fa-solid fa-bug"></i> 🐞 오류 보고문 만들기</button><small class="ss-hint">오류 · 불만이 있으면 눌러요 · AI 0회 · 공개 게시판에 올려도 되는 내용만</small></div>
        <label class="ss-help-model"><span><i class="fa-solid fa-microchip"></i> 답할 모델</span><select class="text_pole" data-help-model>${profs()}</select></label>
        <div class="ss-help-log" data-help-log></div>
        <div class="ss-help-quick" data-help-quick>${QUICK.map(q => `<button class="ss-chip btn" data-help-q="${esc(q)}">${esc(q)}</button>`).join('')}</div>
        <div class="ss-help-in"><textarea class="text_pole" rows="2" data-help-input placeholder="예: 연인 확정 버튼은 어디 있어요?"></textarea><button class="ss-btn pri" data-help-send><i class="fa-solid fa-paper-plane"></i></button></div>
        <p class="ss-hint">내장된 안내서와 지금 내 설정을 같이 보고 답해요. 채팅 내용은 보내지 않아요. <a data-help-clear>대화 지우기</a></p>`;
    const log = el.querySelector('[data-help-log]'), input = el.querySelector('[data-help-input]'), send = el.querySelector('[data-help-send]');
    const bubble = (role, html, cls = '') => {
        const b = document.createElement('div');
        b.className = `ss-help-msg ${role} ${cls}`;
        b.innerHTML = role === 'bot' ? `${mascot(cls === 'wait' ? 'think' : 'idle', 'sm')}<div class="ss-help-b">${html}</div>` : `<div class="ss-help-b">${html}</div>`;
        log.appendChild(b); log.scrollTop = log.scrollHeight;
        return b;
    };
    const paint = () => { log.innerHTML = ''; if (!history.length) bubble('bot', '안녕하세요! 미트볼 상태창에서 궁금한 걸 물어보세요. 아래 질문을 눌러도 돼요 🐾'); for (const m of history) bubble(m.role, fmt(m.text)); };
    let busy = false;
    const go = async (q) => {
        q = String(q ?? '').trim();
        if (!q || busy) return;
        // 「보고문 써 줘」 · 「제보할래」 → AI 대신 보고문 창 (토큰 0 · 지금까지 한 말을 증상으로)
        if (/보고문|제보|버그\s*리포트|오류\s*보고|report/i.test(q)) {
            input.value = '';
            bubble('user', fmt(q));
            bubble('bot', '오류 보고문 창을 열게요! 지금까지 말해 준 내용을 증상 칸에 넣어 뒀어요. 이름은 자동으로 가려지니까, 확인하고 복사해서 보내 주세요 🐾');
            const mine = history.filter(m => m.role === 'user').slice(-4).map(m => m.text).join('\n');
            history.push({ role: 'user', text: q });
            return openReport(mine);
        }
        busy = true; send.disabled = true; input.value = '';
        bubble('user', fmt(q));
        const wait = bubble('bot', '생각하는 중…', 'wait');
        try { const a = await askHelp(q); wait.remove(); bubble('bot', fmt(a)); }
        catch (e) { ssWarn(LOG, 'help', e); wait.remove(); bubble('bot', `답하지 못했어요: ${esc(e?.message ?? e)}`, 'err'); }
        finally { busy = false; send.disabled = false; input.focus(); }
    };
    el.addEventListener('click', (e) => {
        const q = e.target.closest('[data-help-q]')?.dataset.helpQ;
        if (q) return go(q);
        if (e.target.closest('[data-help-send]')) return go(input.value);
        if (e.target.closest('[data-help-clear]')) { history.length = 0; paint(); }
        if (e.target.closest('[data-help-report]')) {
            // 도우미에게 적었던 내 말(최근 4개)을 증상 칸에 미리 넣어 둔다 — 보고문 창에서 고칠 수 있어요
            const mine = history.filter(m => m.role === 'user').slice(-4).map(m => m.text).join('\n');
            return openReport([mine, input.value.trim()].filter(Boolean).join('\n'));
        }
    });
    el.addEventListener('change', (e) => { if (e.target.matches('[data-help-model]')) { settings().profHelp = e.target.value; saveSettings(); } });
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); e.stopPropagation(); go(input.value); } });
    paint();
    if (first) setTimeout(() => go(first), 50);
    await popup(el, { okButton: '닫기' });
}
app.openHelp = openHelp;
export { TITLE };
