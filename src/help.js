// 🐱 미트볼 도우미: 모르는 기능을 물어보는 작은 챗창 (v2.6)
// v2.7.1: 먼저 README를 읽고 AI 없이 바로 답한다 (토큰 0) · 「왜 안 돼요?」는 지금 설정을 직접 확인 · 부족할 때만 「AI에게 더 물어보기」
import { app, settings, saveSettings, getMeta, modOn, MODS, esc, short, TITLE, LOG, VERSION, ssWarn, isActive } from './core.js';
import { parseReadme, search, intentOf, sectionHtml, versionsOf } from './helpkb.js';
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
- If chips do not appear: check 「사용」 is on, the chat has a sheet, sync is not C, the regex is installed (「정규식 설치」), and it is not paused. The 🔍 chip under the last reply (or /ss-pip) tells whether the change was lost (no/broken tag → re-read or re-analyze) or only hidden on screen (→ re-attach, or 「칩을 본문 밖에 붙이기」).
- v2.7.3: 확장 설정 › 「기능 켜고 끄기」 turns off memo · album · peek · play record for all chats; 🔴 red dots mark what the last AI reply changed; quests have a completion roll (🎲) and ended/deleted quests can't be revived by the AI; discarded items are told to the AI as 'no longer owned'; /ss-perf measures load.

PANELS (기능; turn on/off per chat in 관리 탭 › 쓸 기능)
프로필 · 수치(gauges, attributes, conditions) · 주사위 · 재산(money, items, prices, jobs, regular income, loans) · 상점 · 본거지(rooms, furniture, storage, trash, second-hand market) · 관계 · 지도(zoom, areas, residents, routines, travel time/fare) · 달력(date, time slots, weather, seasons, events) · 연락(messenger or letters with couriers, rush delivery, attachments, read receipts, 선톡) · 퀘스트 · 뉴스 · 가십지 · 게시판 · 업적(and endings, 2회차) · 메모 · 운명(curses/blessings, event cards, auto rules, mini-games) · SNS · 추천 음악 · 내 탭(custom tracked values).

DICE (주사위)
- The user rolls from the sheet or /ss-roll; the result is put into the user's message as [판정 · …] BEFORE generation, and the AI must narrate exactly that outcome. The AI can ask for a roll with the "roll" key. Difficulty shifts the target (이지 −2, 하드 +2).

RELATIONSHIPS (관계)
- Each person has two numbers from −100 to 100 and a stage (단계). New chats (v2.7+): 💗 애정 (aff = romantic feelings only) and 🤝 우정 (trust = friendship · closeness). A best friend has high 우정 and low 애정, so friendship alone never becomes romance. Default stages: 낯선 사이 → 아는 사이 → 친구 → 단짝 (우정만 필요) → 설렘 → 연인 (애정 필요). Older chats keep 호감/신뢰 (same keys, old meaning); the names can be changed in 관계 탭 › ✏️ 편집 (aff/trust 수치 이름) or by 🔄 regenerating the 관계 panel. Both numbers must pass a stage's thresholds (-100 = not needed).
- 💔 애정 꺼 두기 (per person): the ♥ button on a person's card in 관계 탭 (or ✏️ 편집 › 「💗 애정 꺼 두기」). That person's 애정 never rises (AI gains are ignored, shown as a 🚫♥ chip), no jealousy, no confession/💍 popup, and the stage stops before the romantic stages. The AI is told they are platonic only. Press again to turn 애정 back on. Each stage unlocks behaviours. Stages are editable per world.
- 질투 (jealousy gauge), 화면 밖 생활 (off-screen life after days pass), 속마음 엿보기 (💗? button, one AI call, daily limit), automatic anniversaries.
- 「관계 단계를 넘는 행동 막기」: tells the AI not to act beyond the stage (a prohibition; can make characters cold).

ROMANCE GUARD (💗 로맨스 보정) — NEW in v2.6, all optional, default OFF. Extension settings › 「💗 로맨스 보정」. Button 「추천 세트 켜기 (①②④)」 turns on the recommended three.
- ① 연인은 고백으로만: the top stage cannot be reached by numbers alone. When the numbers qualify, a "조건 충족 · 고백 전" notice appears. When the AI reports a confession (key "confess"), a dialog asks 「연인으로 확정할까요?」 with 「💍 네, 좋아요」 / 「🌙 음… 아직 지금을 더 즐길래요」. The 「💍 연인 확정」 button always stays on the person's card in the 관계 tab; 「확정 취소」 undoes it.
- ② 한 번에 확 못 오르게: caps how much one person's 호감/신뢰 can rise per AI reply (default +5). A cut shows as a ⚖️ chip.
- ③ 연달아 꼬시면 덜 오르게: if the same person's 호감 rises 3 turns in a row, gains shrink to 60%, then 34%.
- ④ 관계를 사실로 알려 주기: instead of "don't", tells the AI the current stage as a fact, what the character naturally does at this stage, and to deflect in character (not turn cold) when pushed past it.
- ⑤ 인물의 욕구: per-person 끌리는 것 / 싫어하는 것 / 요즘 신경 쓰는 것, editable in 관계 편집 or filled by the 「욕구 AI로 채우기」 button; the AI updates them with "concern" / "taste".
- (removed in v2.7.16) ⑥ 의도 먼저: one line telling the AI to decide each character's own goal before writing, and to treat the user's message as an attempt, not an outcome.
- (removed in v2.7.16) ⑦ 내 추가 주입문: the user's own extra injected text, works with any preset.
- (removed in v2.7.16) ⑧ 먼저 움직이기: on some turns (chance %) tells the AI that a present character takes the initiative on their own.
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

RECENT (v2.7.7–v2.7.12)
- Contact/feed edits store only the changed part; old chats are slimmed once on open. Saves happen within 0.3s and on tab close.
- Swipe delete keeps every remaining swipe's changes. Results that arrive after the user switched chats are dropped (not mixed in).
- If MVU / RPG Companion also run in the chat, the user is told once (double tokens, numbers counted twice); they are not blocked.
- 화면만 번역: text the AI wrote later stays English until translated. The 🌐 header button shows how many are left; 「남은 글 번역하기」 translates only those (60 per AI call; free with 실리 기본 번역). Auto-translate of new text is off by default for the LLM translator to save tokens (setting 「새로 쓴 영어 글 자동 번역」 → 항상).
- 「이것도 아세요?」 tips: once per session, 3h apart, 2 per day; 「팁 그만」 on the notification turns them off (setting actionTips). 「💡 팁 · 주의 알림」 turns off all tips.
- Performance: stats-only adds ~15ms per AI reply on a phone, all panels ~20ms, idle 0. Injection with everything on is ~700 tokens per turn.

- v2.7.13 ✨ 설렘 한 스푼 (romSpark, default off): sometimes a present character makes one stage-appropriate heart-flutter moment on their own (friends: small gift, a too-sincere line, no confession; lovers: affectionate surprise; 애정 꺼 둔 사람: friendship only). (🎬 사건 한 스푼 was removed in v2.7.16.) In extension settings › 「✨ 설렘 · 사건 한 스푼」, chance % per AI reply with a few turns of rest, same result on swipes.

- v2.7.16: the relationship side only does numbers/stages now (⑥⑦⑧ and 사건 한 스푼 removed; ⑦ text should go to Author's Note). Contacts default to 「간단」 (contactSimple): letters work like instant messages, no couriers/fees/reactions/pins; turn off in settings for the old detailed letters.
- v2.7.21: HUD and side mini window share one tile board (✎ edit: drag a tile to any row/spot, drag the ⤡ corner to resize, − remove, ＋ add; text shrinks to fit instead of being cut); board background patterns (default 「모눈 데이지」), own background picture, emoji/picture stickers, per-tile colors. 💭 속마음 (관계 tab or 꾸미기): thought / emoji / kaomoji, always or random — written by the main AI with the mind key, no extra calls. Face emoji per person (tap the face in 관계). 「보일 것」 items with the robot icon are also removed from what the AI gets.
- v2.7.20: edit history replays in time order (deleted threads no longer come back), regenerated replies keep their own rumors, converting to English keeps threads linked to contacts, short-form injection always carries items · active quest steps · nearby places.
- v2.7.19: every tab (except 관계, which has its own, and 관리) has 「보일 것」 at the top: switch off any part (sections, buttons, hint lines, home widgets) — display only, data and AI text unchanged, applies to all chats; 다 끄기 / 다 보기; extension settings › 「숨긴 것 모두 다시 보이기」 resets. Text made only of abbreviations and numbers (「HP +25」) is no longer counted as untranslated. Opening a news article stores a tiny read mark. Contacts: the other person can really send money/gifts (💸/🎁 bubbles, cash and items actually change; only with the 재산 panel on). Translation: no more confirm popups or warnings; text the ST translator returns unchanged goes to the translation model automatically (trLlmFallback, on by default); long texts (over 600 chars) are translated too. 번역 고치기: renaming a name updates every other sentence with that name live (also name pieces like a surname alone); each row has a 📌 pin toggle; sentences where the name was garbled are re-translated on save. Fixed in 2.7.19: comma lists in item/job effects and in AI lines (stat/attr/aff/trust/cond), short delta turns now carry platonic-only/lovers/stage-lock, 관계 tab offers 「고치기」 when a romantic-looking stage opens by friendship alone, default achievements are checked from numbers, generation no longer turns on 💱 real-money conversion. 번역 고치기 opens on the current tab, with a panel picker and 「번역 없는 것만」, untranslated rows first, long texts included. Empty calendar › 「기본 일정 넣기」.
- v2.7.18: contacts default back to 「자세히」 (detailed, original). 「간단」 (contactSimple, off by default) is for brief casual play: letters arrive instantly, the AI remembers only the last few lines, threads keep 20 messages, and by default nothing goes to the main story (contactSimpleReflect: off | recent); the letter-world rule (no phones) is still sent. Relationship tab › 「보일 것」 toggles stage/unlock/next/memo/wants/buttons/off-screen/pairs (all off = numbers only; relStagesOn off also removes stages from the AI text). 🧹 on each tab wipes that panel completely (content, its edit records and past chips; keeps frame like date/currency/stages). Dice log rows can be deleted. Manage tab › 편집 기록 lists every record (also silent ones) and deletes one. Calendar: default yearly events, dots in cells, full titles in 「이달 일정」, 「되돌리기」 after skipping time. 📋 in the sheet header copies a raw state dump (/ss-copy).

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
        `romance guard: ①bond ${on(s.romBond)} · ②cap ${on(s.romCap)} (+${s.romCapAff}/+${s.romCapTrust}) · ③fatigue ${on(s.romFatigue)} · ④facts ${on(s.romFacts)} · ⑤wants ${on(s.romDrive)} · ⑦own text ${String(s.romInject ?? '').trim() ? 'set' : 'empty'} · depth ${s.romDepth}`,
        `stage lock: ${on(s.stageLock)} · jealousy: ${on(s.jealousy)} · off-screen life: ${on(s.offscreen)}`,
    ];
    if (meta?.mods) L.push(`panels on in this chat: ${MODS.filter(m => modOn(m.id, meta)).map(m => m.name).join(', ') || 'none'}`);
    return L.join('\n');
}

const QUICK = ['이번 업데이트 뭐 바뀌었어요?', '처음인데 뭐부터 하면 돼요?', '토큰을 아끼려면?', '변동 칩이 안 떠요', '칸 가리기는 어떻게 해요?', '로맨스 보정이 뭐예요?', '🐞 오류 보고문 써 줘'];

// ───── README 읽기 (설치된 확장 폴더 안의 파일 · 인터넷 · AI 없음) ─────
let kbP = null;
export function loadKB() {
    kbP ??= fetch(new URL('../README.md', import.meta.url), { cache: 'no-cache' })
        .then(r => (r.ok ? r.text() : Promise.reject(new Error(`README ${r.status}`))))
        .then(parseReadme)
        .catch(e => { kbP = null; ssWarn(LOG, 'help kb', e); return []; });
    return kbP;
}

// ───── 「왜 안 돼요?」 — 지금 설정을 직접 확인 (AI 0회) ─────
const OK = '✅', NO = '❌', HM = '💡';
function diagHtml(what) {
    const s = settings(), meta = getMeta(), row = (ok, t) => `<div class="ss-hk-li"><span>${ok === true ? OK : ok === false ? NO : HM}</span><div>${t}</div></div>`;
    const L = [];
    if (what === 'chips' || what === 'sheet') {
        L.push(row(!!s.enabled, `확장 설정 › <b>사용</b> ${s.enabled ? '켜짐' : '꺼짐 — 켜 주세요'}`));
        L.push(row(isActive(), isActive() ? '이 채팅에서 켜져 있어요' : '이 채팅에서 꺼져 있어요 — 확장 설정 「이 채팅에서 켜기」'));
        L.push(row(!!meta?.base, meta?.base ? '이 채팅에 상태창이 있어요' : '이 채팅엔 아직 상태창이 없어요 — 「상태창 만들기」'));
        if (meta?.base) L.push(row(!meta.paused, meta.paused ? '⏸ <b>일시정지 중</b>이에요 — ▶로 재개' : '일시정지 아님'));
    }
    if (what === 'chips') {
        L.push(row(s.sync !== 'off', `자동 반영: <b>${{ tag: 'A 태그', tagPlus: 'A+B', analyze: 'B 별도 분석', off: 'C 끔' }[s.sync] ?? s.sync}</b>${s.sync === 'off' ? ' — 꺼져 있어서 칩이 안 생겨요' : s.sync === 'tag' ? ' · 가벼운 모델이면 A+B 추천 (태그 빼먹은 답만 따로 분석)' : ''}`));
        L.push(row(s.msgCard !== 'off', s.msgCard === 'off' ? '메시지 변동 칩이 <b>숨기기</b>예요 — 확장 설정 위쪽에서 「보이기」' : '메시지 변동 칩 보이기'));
        L.push(row(null, '본문에 <code>&lt;meatball&gt;</code> 글이 그대로 보이면 확장 설정 › 다른 확장과 같이 쓰기 › 「정규식 설치」'));
        // 🔍 마지막 AI 답을 직접 점검 (v2.7.3): 씹혔나 · 안 보이나
        try {
            const i = app.current?.lastAI;
            if (Number.isFinite(i) && i >= 0 && app.pipDiag) {
                const d = app.pipDiag(i);
                const good = ['shown', 'baked', 'none', 'cardoff', 'nochange', 'skipped'].includes(d.code);
                L.push(row(good ? true : false, `마지막 AI 답(${i}번): <b>${esc(d.title)}</b>${d.text ? `<br><small>${esc(short(d.text, 160))}</small>` : ''}`));
                if (!good) L.push(row(null, '답 밑의 🔍 칩을 누르거나 <code>/ss-pip</code> — 「다시 읽기 · AI로 다시 분석 · 칩 다시 붙이기」를 바로 할 수 있어요'));
            }
        } catch { /* 점검 실패는 무시 */ }
    }
    if (what === 'sheet') {
        L.push(row(!!(s.showHud || s.showSide || s.showFloat), `보이는 곳: HUD ${s.showHud ? '켬' : '끔'} · 사이드 ${s.showSide ? '켬' : '끔'} · 떠 있는 버튼 ${s.showFloat ? '켬' : '끔'} (꾸미기 › 보이는 곳)`));
        L.push(row(null, '업데이트 뒤라면 새로고침(F5) · 그래도면 Ctrl+Shift+R'));
    }
    if (what === 'notice') {
        L.push(row(s.toastMode !== 'off', `알림 방식: <b>${{ popup: '팝업', toastr: '실리 기본 알림', off: '끔 (알림함에만)' }[s.toastMode] ?? s.toastMode}</b>`));
        L.push(row(null, `팝업이 떠 있는 시간: ${Number(s.toastSec) || 4}초 (확장 설정 › 알림) · 본문을 누르면 펼쳐져서 안 닫혀요`));
        L.push(row(s.updateNotice !== false, `업데이트 알림 ${s.updateNotice !== false ? '켜짐 — 큰 업데이트 때만 떠요' : '꺼짐'}`));
        L.push(row(s.featureTips !== false, `💡 팁 · 주의 알림 ${s.featureTips !== false ? '켜짐' : '꺼짐'}`));
    }
    if (what === 'tokens') {
        const hidden = Object.keys(meta?.hide ?? {}).length;
        L.push(row(s.injectMode !== 'full', `규칙 주입: <b>${{ full: '전체', lite: '간결', ultra: '초압축' }[s.injectMode] ?? s.injectMode}</b>${s.injectMode === 'full' ? ' — 매 턴 토큰이 많아요. 「간결」 추천' : ''}`));
        L.push(row(!!s.deltaMode, `변화 위주로 보내기 ${s.deltaMode ? `켜짐 (${s.deltaEvery}턴마다 전체)` : '꺼짐 — 켜면 줄어요'}`));
        L.push(row(!!s.sceneFilter, `장면 필터 ${s.sceneFilter ? '켜짐' : '꺼짐 — 켜면 줄어요'}`));
        L.push(row(!s.injWorld, `세계관 요약 · 규칙 매 턴 보내기 ${s.injWorld ? '켜짐 — 카드 · 로어북에 있으면 끄세요' : '꺼짐'}`));
        L.push(row(s.sync !== 'analyze', `자동 반영 ${s.sync === 'analyze' ? '<b>B 별도 분석</b> — 매 답마다 AI 1회 더. A+B 추천' : '괜찮아요'}`));
        if (meta?.mods) { const n = MODS.filter(m => modOn(m.id, meta)).length; L.push(row(n < 15, `켜진 칸 ${n}개${hidden ? ` · 🙈 가린 칸 ${hidden}개` : ''}${n >= 15 ? ' — 안 쓰는 칸은 끄거나 가려 보세요' : ''}`)); }
        L.push(row(null, '📜 프롬프트 · 토큰 창에서 지금 보내는 글과 토큰 수를 볼 수 있어요'));
    }
    return L.length ? `<div class="ss-hk ss-hk-diag"><b class="ss-hk-t">지금 내 설정을 확인해 봤어요</b>${L.join('')}</div>` : '';
}
const DIAG_SEC = { chips: /변동 칩이 안 떠요/, notice: /알림 · 알림함/, sheet: /상태창 여는 곳/, tokens: /토큰 아끼기/ };

// ───── AI 없이 답 만들기 → { html, text, secs, ok } ─────
export async function answerLocal(q) {
    const kb = await loadKB();
    const it = intentOf(q);
    if (it.kind === 'hello') return { ok: true, html: '안녕하세요! 궁금한 기능을 물어보세요. 아래 버튼을 눌러도 돼요 🐾', text: '인사', secs: [] };
    if (it.kind === 'thanks') return { ok: true, html: '천만에요! 또 궁금한 거 있으면 불러 주세요 🐾', text: '감사', secs: [] };
    if (!kb.length) return { ok: false, html: 'README를 읽지 못했어요 (확장 폴더에 README.md가 없거나 막혀 있어요).', text: '', secs: [] };
    const vers = versionsOf(kb);
    if (it.kind === 'latest' || it.kind === 'version') {
        const v = it.kind === 'version' ? vers.find(s => s.ver === it.v || s.ver?.startsWith(`${it.v}.`) || it.v.startsWith(`${s.ver}.`)) : vers[0];
        if (v) return { ok: true, html: sectionHtml(v, esc), text: v.title, secs: [v], related: vers.filter(x => x !== v).slice(0, 4) };
    }
    if (it.kind === 'versions') {
        return { ok: true, html: `<div class="ss-hk"><b class="ss-hk-t">버전별 바뀐 점</b><p>보고 싶은 버전을 눌러요.</p></div>`, text: '버전 목록', secs: [], related: vers };
    }
    const hits = search(kb, q);
    let top = hits[0]?.sec;
    if (it.kind === 'diag') {
        const pref = DIAG_SEC[it.what] && !(it.what === 'sheet' && /업데이트|업뎃/.test(q)) ? kb.find(s => DIAG_SEC[it.what].test(s.title)) : null;
        if (pref) top = pref;
        return { ok: true, html: diagHtml(it.what) + (top ? sectionHtml(top, esc) : ''), text: `설정 확인 + ${top?.title ?? ''}`, secs: top ? [top] : [], related: hits.map(h => h.sec).filter(s => s !== top).slice(0, 3) };
    }
    const best = hits[0]?.sc ?? 0;
    if (!top || best < 3) return { ok: false, html: '안내서에서 딱 맞는 걸 못 찾았어요 😿 다른 말로 물어보거나, AI에게 물어봐 주세요.', text: '못 찾음', secs: [], related: hits.slice(0, 4).map(h => h.sec) };
    const related = hits.slice(1).filter(h => h.sc >= best * 0.45).slice(0, 3).map(h => h.sec);
    return { ok: true, html: sectionHtml(top, esc), text: top.title, secs: [top], related };
}
export async function sectionById(id) { return (await loadKB()).find(s => s.id === id) ?? null; }
const history = []; // 창을 닫아도 이번 접속 동안은 이어짐
const fmt = (t) => esc(t).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\n/g, '<br>');

export async function askHelp(question, secs = []) {
    const q = String(question ?? '').trim();
    if (!q) return '';
    const past = history.slice(-6).map(m => `${m.role === 'user' ? 'User' : 'Meatball'}: ${m.text}`).join('\n');
    // 안내서에서 찾은 칸(한국어)을 같이 보내서 AI 답이 정확해지게 (최대 3000자)
    const man = secs.length ? secs.map(s => `## ${s.title}\n${s.body}`).join('\n\n').replace(/<!--[\s\S]*?-->/g, '').slice(0, 3000) : '';
    const prompt = [`=== GUIDE ===\n${GUIDE}`, man ? `=== RELEVANT SECTIONS FROM THE KOREAN MANUAL (newest, trust these) ===\n${man}` : '', `=== THIS USER'S CURRENT SETTINGS ===\n${snapshot()}`, past ? `=== CONVERSATION SO FAR ===\n${past}` : '', `=== QUESTION ===\n${q}`].filter(Boolean).join('\n\n');
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
    const aiFirst = () => settings().helpMode === 'ai';
    el.innerHTML = `<div class="ss-wz-head">${mascot('happy', 'md')}<div><b>미트볼 도우미 <small class="ss-dim">v${esc(VERSION)}</small></b><small data-help-sub>${aiFirst() ? '질문 1번 = AI 1회' : '안내서를 보고 AI 없이 바로 답해요 · 토큰 0'}</small></div></div>
        <div class="ss-row-btns ss-help-tools"><button class="ss-btn sm" data-help-report><i class="fa-solid fa-bug"></i> 🐞 오류 보고문 만들기</button><small class="ss-hint">오류 · 불만이 있으면 눌러요 · AI 0회 · 공개 게시판에 올려도 되는 내용만</small></div>
        <label class="ss-help-model"><span><i class="fa-solid fa-book-open"></i> 답 방식</span><select class="text_pole" data-help-mode><option value="local" ${aiFirst() ? '' : 'selected'}>안내서 먼저 (토큰 0 · 부족하면 AI 버튼)</option><option value="ai" ${aiFirst() ? 'selected' : ''}>바로 AI에게 (질문마다 AI 1회)</option></select></label>
        <label class="ss-help-model"><span><i class="fa-solid fa-microchip"></i> AI 답 모델</span><select class="text_pole" data-help-model>${profs()}</select></label>
        <div class="ss-help-log" data-help-log></div>
        <div class="ss-help-quick" data-help-quick>${QUICK.map(q => `<button class="ss-chip btn" data-help-q="${esc(q)}">${esc(q)}</button>`).join('')}</div>
        <div class="ss-help-in"><textarea class="text_pole" rows="2" data-help-input placeholder="예: 연인 확정 버튼은 어디 있어요?"></textarea><button class="ss-btn pri" data-help-send><i class="fa-solid fa-paper-plane"></i></button></div>
        <p class="ss-hint">설치된 README(안내서)와 지금 내 설정을 보고 답해요. AI에게 물을 때도 채팅 내용은 보내지 않아요. <a data-help-clear>대화 지우기</a></p>`;
    const log = el.querySelector('[data-help-log]'), input = el.querySelector('[data-help-input]'), send = el.querySelector('[data-help-send]');
    const bubble = (role, html, cls = '') => {
        const b = document.createElement('div');
        b.className = `ss-help-msg ${role} ${cls}`;
        b.innerHTML = role === 'bot' ? `${mascot(cls === 'wait' ? 'think' : 'idle', 'sm')}<div class="ss-help-b">${html}</div>` : `<div class="ss-help-b">${html}</div>`;
        log.appendChild(b); log.scrollTop = log.scrollHeight;
        return b;
    };
    const paint = () => { log.innerHTML = ''; if (!history.length) bubble('bot', '안녕하세요! 미트볼 상태창에서 궁금한 걸 물어보세요. 아래 질문을 눌러도 돼요 🐾'); for (const m of history) bubble(m.role, m.html ?? fmt(m.text)); };
    // 답 카드 밑: 관련 항목 칩 (AI 0회) + 「AI에게 더 물어보기」
    const foot = (q, a) => `${a.related?.length ? `<div class="ss-hk-rel"><small>이것도 볼래요?</small>${a.related.map(s => `<button class="ss-chip btn" data-help-sec="${esc(s.id)}">${esc(s.title.replace(/^[^\p{L}\p{N}]+/u, '').slice(0, 26))}</button>`).join('')}</div>` : ''}<div class="ss-hk-ai"><button class="ss-btn sm ghost" data-help-ai="${esc(q)}" data-help-secs="${esc((a.secs ?? []).map(s => s.id).join(','))}"><i class="fa-solid fa-robot"></i> AI에게 더 물어보기 <small>(AI 1회)</small></button></div>`;
    const answerBubble = (html) => { const b = bubble('bot', html); log.scrollTop = Math.max(0, b.offsetTop - log.offsetTop - 8); return b; }; // 긴 답은 맨 위부터 보이게
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
        input.value = '';
        bubble('user', fmt(q));
        if (!aiFirst()) {
            // 안내서 먼저 — AI 0회
            try {
                const a = await answerLocal(q);
                const html = a.html + foot(q, a);
                history.push({ role: 'user', text: q }, { role: 'bot', text: `[안내서] ${a.text}`, html });
                if (history.length > 40) history.splice(0, history.length - 40);
                answerBubble(html);
                return;
            } catch (e) { ssWarn(LOG, 'help local', e); }
        }
        return goAI(q, [], false);
    };
    const goAI = async (q, secs, echo = true) => {
        if (busy) return;
        busy = true; send.disabled = true;
        if (echo) bubble('user', fmt(`🤖 ${q}`));
        const wait = bubble('bot', '생각하는 중…', 'wait');
        try { const a = await askHelp(q, secs); wait.remove(); answerBubble(fmt(a)); }
        catch (e) { ssWarn(LOG, 'help', e); wait.remove(); bubble('bot', `답하지 못했어요: ${esc(e?.message ?? e)}`, 'err'); }
        finally { busy = false; send.disabled = false; input.focus(); }
    };
    el.addEventListener('click', (e) => {
        const q = e.target.closest('[data-help-q]')?.dataset.helpQ;
        if (q) return go(q);
        if (e.target.closest('[data-help-send]')) return go(input.value);
        const sec = e.target.closest('[data-help-sec]')?.dataset.helpSec;
        if (sec) return (async () => { const s = await sectionById(sec); if (!s) return; const html = sectionHtml(s, esc) + foot(s.title, { secs: [s] }); bubble('user', fmt(s.title)); history.push({ role: 'user', text: s.title }, { role: 'bot', text: `[안내서] ${s.title}`, html }); answerBubble(html); })();
        const ai = e.target.closest('[data-help-ai]');
        if (ai) return (async () => { const ids = (ai.dataset.helpSecs || '').split(',').filter(Boolean); const secs = (await Promise.all(ids.map(sectionById))).filter(Boolean); ai.disabled = true; goAI(ai.dataset.helpAi, secs); })();
        if (e.target.closest('[data-help-clear]')) { history.length = 0; paint(); }
        if (e.target.closest('[data-help-report]')) {
            // 도우미에게 적었던 내 말(최근 4개)을 증상 칸에 미리 넣어 둔다 — 보고문 창에서 고칠 수 있어요
            const mine = history.filter(m => m.role === 'user').slice(-4).map(m => m.text).join('\n');
            return openReport([mine, input.value.trim()].filter(Boolean).join('\n'));
        }
    });
    el.addEventListener('change', (e) => {
        if (e.target.matches('[data-help-model]')) { settings().profHelp = e.target.value; saveSettings(); }
        if (e.target.matches('[data-help-mode]')) { settings().helpMode = e.target.value; saveSettings(); el.querySelector('[data-help-sub]').textContent = aiFirst() ? '질문 1번 = AI 1회' : '안내서를 보고 AI 없이 바로 답해요 · 토큰 0'; }
    });
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); e.stopPropagation(); go(input.value); } });
    paint();
    loadKB(); // 미리 읽어 두기
    if (first) setTimeout(() => go(first), 50);
    await popup(el, { okButton: '닫기' });
}
app.openHelp = openHelp;
export { TITLE };
