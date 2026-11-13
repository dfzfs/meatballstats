// 미트볼 상태창 (Meatball Stats) — SillyTavern UI extension
// 어떤 카드·세계관에도 붙는 상태창. 모든 칸은 AI가 처음 채우고, 직접 편집 · 추가 지시 · 다시 생성이 된다.
import { rev, ctxReset, app, ctx, settings, saveSettings, getMeta, saveMeta, isActive, ready, modOn, MODS, MOD_IDS, MOD, esc, short, splitBar, findBy, TITLE, LOG, VERSION, MODULE, sub, rand, DIFFS, ssErr, ssWarn } from './src/core.js';
import { compute, buildInjection, setInjection, addAdjust, KEYMAP, unreadCount, stashStatus, stashAllSwipes, drawerOps, setDrawer, extractOps, ssValue, undoLast, hasStatus, autoBake } from './src/engine.js';
import { analyzeMessage, instructModule } from './src/ai.js';
import { listProfiles } from './src/prompts.js';
import { diffHTML, confirmPopup, applyTheme, askInput, mascot, popup } from './src/kit.js';
import { ensureUI, rerenderPanels, openSheet, openWizard, openRoll, openPromptWindow, openThemeWindow, panels, renderHud } from './src/shell.js';
import { receivePing } from './src/contact.js';
import { translateSheet, startViewTr, translateView, convertToEnglish, scheduleFill, checkKorean } from './src/translate.js';
import { openHelp } from './src/help.js';
import { notify } from './src/notify.js';
import { offerCard, followBranch, saveSlot, fullBackup, diagnose } from './src/safe.js';
import { starred, toggleStar, PRESETS, applyPreset } from './src/extra.js';
import { FREQ_MODS } from './src/engine.js';
import { setBase } from './src/shell.js';
import { initMascot, MASCOT_SOUNDS, playMascotSound } from './src/mascot.js';
import { startErrorCapture, openReport } from './src/report.js';
import { maybeTip, maybeLaterWarn, hintSetting } from './src/tips.js';

try { startErrorCapture(); } catch { /* 오류 기록은 없어도 동작 */ }

const REGEX_IDS = { show: 'b7c1a0e2-5a1d-4f0e-9a51-55a1a0c05501', strip: 'b7c1a0e2-5a1d-4f0e-9a51-55a1a0c05502' };

// ───── 메시지 변동 칩 ─────
// 칩이 없는 옛 답(굳힌 기록)은 한 번 손본 뒤엔 건너뛴다 — 긴 채팅에서 갱신마다 수천 개를 훑던 것 줄이기 (v2.7)
let doneEl = new WeakMap();
app.redecorate = () => { doneEl = new WeakMap(); };
function decorateAll() {
    if (!app.current) return;
    const set = settings();
    const baked = getMeta()?.startAt ?? 0; // 굳힌 기록 안의 답은 고쳐도 반영되지 않으니 ✏️를 숨긴다
    const chat = ctx().chat ?? [];
    const album = new Set((getMeta()?.album ?? []).filter(x => x.kind === 'mes').map(x => x.key)); // 앨범 확인을 답마다 다시 찾지 않게
    document.querySelectorAll('#chat .mes').forEach(mesEl => {
        const i = Number(mesEl.getAttribute('mesid'));
        if (Number.isNaN(i)) return;
        const snap = app.current.snaps.get(i);
        const m = chat[i];
        const on0 = !!m && album.has(`${m.send_date}|${m.name}`);
        const sig = snap ? null : `n|${on0}|${set.msgCard}`;
        if (sig && doneEl.get(mesEl) === sig && mesEl._ssStar?.isConnected !== false) return;
        const textEl = mesEl.querySelector('.mes_text');
        if (!textEl) return;
        if (sig) doneEl.set(mesEl, sig);
        // 🖼️ 추억 앨범 버튼 (메시지 ⋯ 메뉴 옆)
        const btns = mesEl.querySelector('.mes_buttons');
        if (btns && m && !m.is_system) {
            let st = btns.querySelector('.ss-star');
            if (!st) {
                st = document.createElement('div'); st.className = 'mes_button ss-star fa-regular fa-images'; st.title = '추억 앨범에 담기'; st.dataset.ssStar = '1';
                const edit = btns.querySelector(':scope > .mes_edit');
                if (edit) btns.insertBefore(st, edit); else (btns.querySelector('.extraMesButtons') ?? btns).prepend(st);
            }
            const on = on0; mesEl._ssStar = st;
            if (st.classList.contains('on') !== on) { st.classList.toggle('fa-solid', on); st.classList.toggle('fa-regular', !on); st.classList.toggle('on', on); } // 바뀔 때만 (긴 채팅에서 매번 건드리면 화면 다시 계산)
        }
        const hasCard = snap && set.msgCard !== 'off' && (snap.labels.length || snap.roll);
        if (hasCard && !textEl.querySelector('.ss-slot, .custom-ss-slot')) { const sl = document.createElement('div'); sl.className = 'ss-slot'; textEl.appendChild(sl); }
        const editBtn = m && i >= baked && drawerOps(m) && !hasStatus(m.mes) ? `<button class="ss-mchip edit" data-ss-edit="${i}" title="이 답의 상태 변화 고치기"><i class="fa-solid fa-pen"></i></button>` : '';
        textEl.querySelectorAll('.ss-slot, .custom-ss-slot').forEach((slot, k) => {
            if (k > 0 || !snap || set.msgCard === 'off' || (!snap.labels.length && !snap.roll)) { if (slot.dataset.ssk !== '') { slot.innerHTML = ''; slot.style.display = 'none'; slot.dataset.ssk = ''; } return; }
            const rollBtn = snap.roll && i === app.current.lastAI ? `<button class="ss-mchip roll" data-roll="${esc(snap.roll.label)}|${snap.roll.dc}"><i class="fa-solid fa-dice-d20"></i> ${esc(snap.roll.label)} 굴리기</button>` : '';
            // 칩 내용이 그대로면 다시 그리지 않는다 (긴 채팅에서 갱신마다 모든 답의 칩을 새로 그리던 것이 렉의 큰 원인)
            const key = `${snap.labels.join('\u0001')}|${rollBtn ? 1 : 0}|${editBtn ? 1 : 0}`;
            if (slot.dataset.ssk === key && slot.firstChild) return;
            slot.dataset.ssk = key;
            slot.style.display = '';
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
        setDrawer(m, extractOps(`<meatball>\n${v}\n</meatball>`));
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
    for (const a of app.current.snaps.get(i)?.alerts ?? []) {
        if (a?.kind === 'confess') { askBond(a.who); continue; }
        notify(a);
    }
}
// 💌 고백이 오간 것 같을 때: 연인으로 확정할지 물어본다 (로맨스 보정 ① · 「아직」을 골라도 관계 탭에 버튼은 남는다)
let bondAsking = false;
async function askBond(who) {
    if (!settings().romBond || bondAsking) return;
    const r0 = app.current?.state?.data?.rel?.user?.find(x => x.name === who);
    if (r0?.bond) return; // 이미 연인 (스와이프·다시 생성으로 같은 알림이 또 와도 다시 안 물어봄)
    notify({ kind: 'text', icon: '💌', title: `${who}와(과) 고백이 오갔어요`, text: '관계 탭에서 언제든 「연인 확정」', tab: 'rel' }); // 알림함에도 남김
    bondAsking = true;
    try {
        const el = document.createElement('div');
        el.className = 'ss-root ss-scope ss-bondask';
        el.innerHTML = `${mascot('party', 'lg')}<h3>💌 ${esc(who)}와(과) 고백이 오간 것 같아요</h3>
            <p>두 사람, 이제 연인으로 확정할까요?</p>
            <p class="ss-hint">「아직」을 골라도 괜찮아요. 관계 탭의 <b>💍 연인 확정</b> 버튼은 그대로 있어서, 마음이 정해지면 언제든 누를 수 있어요.</p>`;
        const yes = await confirmPopup(el, '💍 네, 좋아요', '🌙 음… 아직 지금을 더 즐길래요');
        if (yes) {
            await addAdjust({ ops: [['_bond', who]], label: `💍 ${who}와(과) 고백이 오가 연인이 되었다 (확정)` });
            toastr.success(`${esc(who)}와(과) 연인이 되었어요 💞`, TITLE);
        } else toastr.info('좋아요, 지금 이 설렘을 조금 더 즐겨요 🌙', TITLE);
    } catch (e) { ssErr(LOG, 'askBond', e); } finally { bondAsking = false; }
}
app.askBond = askBond;
app.showWhatsNew = (all = true) => showWhatsNew(all);

// ───── 📣 업데이트 알림: 버전이 바뀌면 「바뀐 점」을 한 번 보여 준다 ─────
const CHANGELOG = [
    { v: '2.7.1', title: '가리기 · 토큰 줄이기 · 알림 편하게', items: [
        ['🙈 칸마다 가리기', '각 탭 도구줄의 👁 버튼을 누르면 그 칸을 AI에게 안 보내요. 턴이 지나도 그대로고, 다시 눌러야 다시 들어가요 (채팅마다). 화면·직접 편집·변화 기록은 그대로예요. 홈 탭에서 누르면 세계관 줄을 가려요.'],
        ['✂️ 세계관 요약은 매 턴 안 보내요', '세계관 요약·규칙은 보통 카드·로어북에 이미 있어서 중복이라 기본으로 뺐어요 (매 턴 최대 1천 자 절약). 칸을 AI로 만들 때는 계속 참고해요. 다시 보내려면 확장 설정 › 「세계관 요약·규칙도 매 턴 보내기」.'],
        ['💞 미니창 관계 칸 고르기', '꾸미기 › 「미니창 · 홈 관계 칸」에서 보일 수치(애정·우정·단계·질투), 순서, 인원, 고정할 사람을 골라요.'],
        ['🔔 알림 눌러서 펼치기', '알림 본문을 누르면 닫히지 않고 펼쳐져서 전체 글이 보여요 (펼친 동안 안 닫힘). 폰에선 손가락을 대고 있으면 멈춰요. 「이것도 아세요?」 팁도 알림함에 남아요.'],
        ['🧱 긴 이름 줄바꿈', '가구·소지품 이름이 길면 카드 밖으로 잘리던 문제를 고쳤어요.'],
    ] },
    { v: '2.7.0', title: '기본 틀 · 긴 채팅 가볍게 · 안정화', items: [
        ['🐞 오류 보고문', '미트볼 도우미 창 맨 위 「오류 보고문 만들기」(또는 도우미에게 「보고문 써 줘」, /ss-report). AI 없이 만들어지고, 이름은 [유저]·[인물1]로 가려지고 채팅 내용·키·주소는 안 들어가서 공개 게시판에 그대로 올려도 돼요.'],
        ['⚙️ 기본 설정 = 가벼운 모델 맞춤', '처음 설치하면 「기본 (추천)」 설정으로 시작해요. 「전체」 주입은 토큰이 많이 들어 비추천이에요. 업데이트한 분께는 옛 <status> 읽기 끄기 · 기본 설정으로 바꾸기를 한 번 물어봐요.'],
        ['🐱 소리는 냥냥만', '마스코트 소리는 냥냥 하나(또는 끔)만 남겼어요. 설정 파일을 무겁게 하던 「내 소리 파일」은 지워져요.'],
        ['🧩 만드는 방식: 기본 틀', '상태창 만들기 맨 위에서 고를 수 있어요. 「기본 틀만」은 AI 0회 · 토큰 0으로 바로 만들어지고, 「기본 틀 + AI」는 수치·주사위·달력·업적·운명 카드처럼 어디에나 맞는 칸은 검증된 모양으로 고정하고 세계관 칸만 AI가 채워요 (호출 7번 → 5번). 장르를 고르면 화폐·게이지·장소 이름이 장르에 맞춰져요.'],
        ['🏎️ 렉 줄이기', '한 턴에 3~4번씩 하던 같은 계산을 한 번으로 줄이고, 바뀐 게 없으면 상태창을 다시 그리지 않아요. 가장 자주 불리던 설정 읽기와 실리 정보 읽기도 가볍게 바꿨어요.'],
        ['⚡ 긴 채팅이 가벼워졌어요', '굳히지 않은 메시지가 400개를 넘으면 오래된 쪽을 자동으로 굳혀서, 매 턴 처음부터 다시 계산하지 않아요. 최근 120개 메시지의 스와이프·편집은 예전처럼 바로 반영돼요. 확장 설정에서 끌 수 있어요.'],
        ['💡 이것도 아세요? · ⚠️ 알아 두세요', '칸에서 뭔가 하면 그 칸의 팁을 가끔 하나씩, 토큰이 많이 드는 설정을 켜면 그 자리에서 주의를 한 번 알려 줘요. 「알아요」를 누르면 그 문구는 다시 안 나와요.'],
        ['🛡️ 숫자가 날아가지 않게', 'AI가 부호를 빼먹고 「cash: 120」처럼 쓰면 예전엔 돈이 120으로 바뀌었어요. 이제 지금 값과 가까우면 새 합계로, 아니면 빼먹은 +로 읽어요. 「days: 2」도 이틀 지남으로 읽고, 이어 쓰기에서 같은 변화를 다시 적어도 두 번 세지 않아요.'],
        ['✨ 처음부터 쉽게', '새 채팅은 꼭 필요한 6개(프로필·수치·재산·관계·지도·달력)만 켜진 채로 시작해요. 만들기 방식 기본값은 「기본 틀 + AI」, 기능 고르기에 「추천만」 버튼이 생겼어요.'],
        ['💗 관계 수치 = 애정 · 우정', '새 채팅의 관계는 호감·신뢰 대신 💗 애정(연애 감정만)과 🤝 우정(친함·믿음)으로 세요. 친구·단짝 단계는 우정만 있으면 오르고, 설렘·연인 단계만 애정이 필요해서 친한 친구가 숫자 때문에 연인 쪽으로 가지 않아요. 기본 단계: 낯선 사이 → 아는 사이 → 친구 → 단짝 → 설렘 → 연인. 쓰던 채팅은 호감·신뢰 그대로예요 (관계 탭 ✏️ 편집에서 수치 이름을 바꾸거나, 관계 칸 🔄 다시 생성하면 새 방식).'],
        ['💔 애정 꺼 두기', '관계 탭에서 사람마다 ♥ 버튼으로 애정을 꺼 둘 수 있어요 (✏️ 편집에도 있음). 꺼 둔 사람은 애정이 오르지 않고, 질투 · 고백 확정 창도 없고, 단계는 우정 단계까지만 올라가요. AI에게도 「연애 감정 없음 · 우정만」으로 알려요. 가족 · 동료 · 친구로만 두고 싶은 캐릭터에게 쓰세요.'],
        ['💡 기능 추천', '이야기에 문자·가게·의뢰 같은 말이 나오면 「이런 기능도 있어요 — 연락」처럼 한 번씩 알려 줘요. 「써 볼래요」를 누르면 그 채팅에서 켜지고 기본 틀로 바로 채워져요 (AI 0회). 기능마다 한 번만, 몇 턴에 한 번만 뜨고, 확장 설정에서 끌 수 있어요.'],
        ['🔍 기능 전체 점검', '「AK-47」처럼 이름 끝 숫자를 수량으로 읽던 것 · 이름에 쉼표·빗금이 있는 소지품을 쓰거나 팔면 둘로 나뉘던 것 · AI가 이름 자리에 「+3」 같은 걸 써서 유령 인물이 생기던 것 · 같은 퀘스트 진행이 매 턴 쌓이던 것 · 처음부터 있던 저주의 기간이 안 흐르던 것 · 주사위 기록 저장이 실패하면 화면이 멈추던 것 · 남의 백업 파일이 깨져 있으면 계산이 멈추던 것을 고쳤어요.'],
        ['🎭 사칭(impersonate)에 태그가 붙던 문제', '내 메시지를 AI가 대신 쓸 때 <meatball> 출력 규칙을 빼고 보내요.'],
        ['🔀 별도 분석 중 스와이프', '분석하는 동안 스와이프·편집하면 다른 답에 변화가 붙던 것을 막았어요.'],
        ['📚 로어북 켜기 선택', '상태 주입문 속 장소·인물 이름으로 로어북이 켜질지 고를 수 있어요 (끄면 장면 밖 항목이 덜 켜져 토큰 절약).'],
        ['🗨️ OOC 답은 계산 안 함', '(( )) 같은 OOC로 물어본 답은 별도 분석을 하지 않아요. 그 답을 이어쓰기해도 마찬가지예요. OOC 답 속 숫자 때문에 돈·호감이 바뀌던 것을 막았어요.'],
        ['📜 메시지가 많아도 가볍게', '변동 칩을 갱신마다 모든 답에 다시 그리던 것, 내용이 같은데 HUD·사이드 미니를 다시 그리던 것, 접혀 있어 안 보이는 사이드 패널까지 그리던 것을 고쳤어요. 폰에서 600개 메시지 채팅도 한 턴 처리가 약 0.03초예요.'],
        ['📱 폰 화면 다듬기', '좁은 화면에서 상태창 제목이 한 글자로 잘리던 것 · 어두운 테마에서 작은 글씨가 안 보이던 것 · 화면 밖 패널 때문에 페이지가 옆으로 밀리던 것 · 사이드 미니의 흐림 효과 때문에 글이 올라올 때 버벅이던 것을 고쳤어요.'],
        ['🔧 자잘한 것', '기본 틀 지도의 장소가 가장자리에 붙어 이름이 잘리던 것 · 주사위가 굴러가는 중 탭을 바꾸면 오류가 나던 것 · 기본 틀 프로필에 내 이름이 두 번 들어가던 것을 고쳤어요.'],
        ['🧰 가볍게 · 안전하게', '갱신마다 화면 전체 스타일을 다시 계산하던 것을 줄였어요. 새로 설치하면 옛 <status> 읽기는 꺼진 채로 시작해요 (다른 프리셋의 <status>를 건드리지 않게).'],
    ] },
    { v: '2.6.1', title: '고친 것 모음', items: [
        ['🔧 화면만 번역: AI에게 한국어가 새던 곳 막음', '본편 AI가 쓰는 값도 영어로 받고(출력 규칙), 날짜·계절·기념일·UI 기록도 영어로 보내요. 새로 생긴 영어 글은 화면에서 자동 번역돼요.'],
        ['🔔 한국어로 저장된 칸 알림', '「화면만 번역」인데 한국어로 저장된 칸이 남아 있으면 채팅을 열 때 알려 줘요. 알림을 누르거나 「상태창 전체 번역」을 누르면 바로 영어 저장으로 바뀌어요.'],
        ['💗 관계 사실: 앞 단계 행동이 섞이던 문제', '④가 이전 단계(예: 「차갑고 적대적」)의 행동까지 이어 붙여 보내던 것을 고쳤어요. 이제 지금 단계의 모습만 보내요.'],
        ['💍 연인 확정이 풀리던 문제', '편집 창을 확정 전에 열어 두고 저장하면 확정이 풀리던 것을 고쳤어요. 확정은 관계 탭 버튼으로만 해요. 풀린 채팅은 「💍 연인 확정」을 한 번 다시 눌러 주세요.'],
        ['💞 연인 표시가 분명해졌어요', '연인 단계는 💞로 표시돼요. 우정·신뢰 단계뿐인 세계관에선 고백 후 💍 확정하면 단계 옆에 「💞 연인」이 따로 붙고, AI에게도 연인이라고 알려 줘요. 편집 › 관계 단계에서 「💞 연인 단계」를 직접 고를 수도 있어요.'],
        ['💞 연인 단계는 기본으로', '세계관에 맞게 단계를 지어도 연인 단계 하나는 꼭 넣어요. 이미 만든 채팅에 없으면 관계 탭 › 관계 단계 › 「💞 연인 단계 추가」 버튼 한 번이면 돼요.'],
        ['🏷️ 태그 지우기를 더 안전하게', '<meatball>을 안 닫아도 이제 본문 끝까지 지우지 않아요 (빈 줄이나 다음 태그 전까지만). 옛 <status>를 미트볼 것으로 볼지 설정에서 고를 수 있어요.'],
        ['💍 연인 확정 버튼은 필요할 때만', '고백이 감지됐거나 연인 단계 조건을 채운 사람에게만 떠요.'],
        ['📣 업데이트 알림', '화면을 막는 창 대신 팝업 알림 한 장으로 떠요. 누르면 자세히 볼 수 있어요.'],
        ['👥 로어북 인물이 관계에서 빠지던 문제', '로어북이 길면 뒤쪽 항목을 통째로 버리던 것을 고쳤어요 (모든 항목을 조금씩 줄이고, 항목 이름 목록은 늘 전부 보내요). 로어북·카드의 모든 인물을 관계에 넣으라고 알려 주고, 프로필에 있는데 관계에 없는 사람은 자동으로 채워요.'],
        ['🧭 영어 저장 + 한국어 롤플', '이름이 영어로 저장돼 있어도 본편에서 한국어로 부르면(「로우」) 그 사람이 장면에 있다고 알아봐요. 관계 사실·연인 정보가 빠지지 않아요.'],
        ['🧰 호환성 · 속도', '구형 아이폰(사파리)에서 화면 번역이 오류 나던 것 · 알림에 태그 글자가 보이던 것 · AI가 답을 쓰는 중엔 자동 번역을 미루기 · 화면 번역 속도 · 번역 사전이 채팅 파일을 키우지 않게 상한 · 카드에 붙일 때 화면 번역 사전도 같이.'],
    ] },
    { v: '2.6.0', title: '로맨스 보정 · 화면만 번역 · 업데이트 알림', items: [
        ['💗 로맨스 보정 (전부 선택 · 기본 꺼짐)', '확장 설정 › 로맨스 보정. 연인은 고백으로만(확정 창이 떠요) · 한 번에 확 못 오르게 · 연달아 꼬시면 덜 오르게 · 관계를 사실로 알려 주기 · 인물의 욕구 · 의도 먼저 · 내 추가 주입문. 「추천 세트 켜기」 버튼 하나로 시작할 수 있어요.'],
        ['🌐 영어로 저장 · 화면만 번역', '상태창 생성 언어의 새 선택지. 상태창은 영어로 저장되어 AI에게도 영어로 가고, 화면에서만 번역돼 보여요.'],
        ['🆓 실리 기본 번역', '번역 담당을 「실리 기본 번역」(Chat Translation의 Google·DeepL 등)으로 바꾸면 토큰 없이 번역해요.'],
        ['📝 번역 지침', '「Leon Hart = 레온 하트」처럼 적으면 이름·용어가 늘 그렇게 번역돼요. 번역 모델(LLM)에는 문장 지침도 그대로 전달돼요.'],
        ['🔧 화면만 번역 보완', '본편 AI가 쓰는 값도 영어로(출력 규칙) · 날짜·계절·UI 기록도 영어로 · 새로 생긴 영어 글은 화면에서 자동 번역 · 한국어로 저장된 칸이 있으면 채팅을 열 때 알려 주고 누르면 바로 바꿔요.'],
        ['🔁 옛 채팅도 영어 저장으로', '「한국어로 저장된 칸을 영어 저장으로 바꾸기」 버튼 — 지금 보이는 한국어는 화면 번역으로 그대로 남아요.'],
        ['🐱 미트볼 도우미', '상태창 머리의 ❓ 버튼이나 /ss-help 로 모르는 기능을 물어보세요. 답할 모델을 따로 고를 수 있어요.'],
        ['🌱 인물의 욕구 · 먼저 움직이기', '관계 탭 「욕구 AI로 채우기」, 가끔 인물이 스스로 일을 벌이는 「먼저 움직이기」(로맨스 보정 ⑧).'],
        ['📣 업데이트 알림', '지금 보시는 이 창이에요. 확장 설정 › 데이터 · 화면에서 끌 수 있어요.'],
    ] },
];
const verNum = (v) => String(v ?? '').split('.').map(x => parseInt(x, 10) || 0);
const verGt = (a, b) => { const x = verNum(a), y = verNum(b); for (let i = 0; i < 3; i++) { if ((x[i] ?? 0) !== (y[i] ?? 0)) return (x[i] ?? 0) > (y[i] ?? 0); } return false; };
async function showWhatsNew(all = false, latestOnly = false) {
    const seen = settings().lastSeenVersion || '';
    const list = latestOnly ? CHANGELOG.slice(0, 1) : CHANGELOG.filter(c => all || !seen || verGt(c.v, seen));
    if (!list.length) { if (all) toastr.info('기록된 업데이트 내역이 없어요.', TITLE); return; }
    const el = document.createElement('div');
    el.className = 'ss-root ss-scope ss-whatsnew';
    el.innerHTML = `<div class="ss-wz-head">${mascot('happy', 'md')}<div><b>😼 미트볼 상태창이 업데이트됐어요</b><small>v${esc(VERSION)}</small></div></div>
        ${list.map(c => `<h4>v${esc(c.v)} — ${esc(c.title)}</h4><ul class="ss-newlist">${c.items.map(([h, d]) => `<li><b>${esc(h)}</b><br><small>${esc(d)}</small></li>`).join('')}</ul>`).join('')}
        <p class="ss-hint">새 기능은 모두 선택 사항이라, 켜지 않으면 예전과 똑같이 동작해요. 다시 보려면 확장 설정 › 데이터 · 화면 › 「업데이트 내역」.</p>`;
    await popup(el, { okButton: '확인' });
}
// 내역 지문: 같은 버전이라도 내역이 바뀌면 다시 알린다
const noteKey = () => { const s = JSON.stringify(CHANGELOG[0] ?? ''); let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return `${VERSION}#${(h >>> 0).toString(36)}`; };
function whatsNewOnLoad(fresh) {
    const s = settings();
    const key = noteKey();
    if (s.lastSeenNote === key) return;
    const done = () => { s.lastSeenVersion = VERSION; s.lastSeenNote = key; saveSettings(); };
    if (fresh || s.updateNotice === false) { done(); return; } // 처음 설치 · 알림 끔
    const sameVer = s.lastSeenVersion === VERSION; // 버전은 같은데 내역만 바뀜 → 맨 위 내역만
    const list = sameVer ? CHANGELOG.slice(0, 1) : CHANGELOG.filter(c => !s.lastSeenVersion || verGt(c.v, s.lastSeenVersion));
    const heads = list.flatMap(c => c.items.map(([h]) => h.replace(/^\S+\s/u, ''))).slice(0, 4).join(' · ');
    setTimeout(() => {
        try {
            // 팝업 알림 한 장 (누르면 「바뀐 점」 자세히) — 화면을 막는 창은 띄우지 않는다
            if (settings().toastMode === 'popup') notify({ kind: 'update', icon: '📣', title: `미트볼 상태창 v${VERSION} 업데이트`, text: `${heads} — 눌러서 자세히` }, { save: false });
            else toastr.info(`📣 v${esc(VERSION)} 업데이트: ${esc(heads)}<br><small>눌러서 자세히</small>`, TITLE, { timeOut: 12000, escapeHtml: false, onclick: () => showWhatsNew(false, sameVer) });
            done();
        } catch (e) { ssErr(LOG, 'whatsnew', e); }
    }, 2000);
}
app.notifyLatest = notifyLatest;
app.decorate = decorateAll;

// ───── v2.7 한 번만 묻기: 옛 <status> 읽기 끄기 · 기본(가벼운 모델) 설정으로 ─────
async function askV27() {
    const s = settings();
    if (s.v27asked) return;
    const legacy = s.legacyStatus !== false;
    const heavy = s.injectMode === 'full';
    if (!legacy && !heavy) { s.v27asked = true; saveSettings(); return; }
    const el = document.createElement('div');
    el.className = 'ss-root ss-scope ss-v27';
    el.innerHTML = `<div class="ss-wz-head">${mascot('think', 'md')}<div><b>v2.7 — 두 가지만 골라 주세요</b><small>한 번만 물어봐요 · 나중에 확장 설정에서 언제든 바꿀 수 있어요</small></div></div>
        ${legacy ? `<label class="ss-tog"><input type="checkbox" class="ss-switch" data-v27="legacy" checked><span><b>옛 &lt;status&gt; 태그 읽기 끄기 (추천)</b><br><small>지금은 미트볼이 모든 채팅에서 &lt;status&gt; 태그를 숨기고 프롬프트에서 지워요. 다른 봇·프리셋이 &lt;status&gt;를 쓰면 그것까지 사라져요. 끄면 미트볼은 &lt;meatball&gt;만 건드려요. 지금 열린 채팅에 남은 옛 태그는 끄기 전에 자동으로 보관해 둬요.</small></span></label>` : ''}
        ${heavy ? `<label class="ss-tog"><input type="checkbox" class="ss-switch" data-v27="light" checked><span><b>「기본 (추천)」 설정으로 바꾸기</b><br><small>지금은 「전체」 주입이라 매 턴 토큰이 많이 들어요(비추천). 플래시·아르곤 같은 가벼운 모델에 맞춘 간결 주입 · 4턴마다 전체 · 태그 빠지면 따로 분석으로 바꿔요.</small></span></label>` : ''}`;
    const ok = await confirmPopup(el, '적용', '그대로 둘래요');
    const pick = (k) => !!el.querySelector(`[data-v27="${k}"]`)?.checked;
    s.v27asked = true;
    if (ok) {
        if (legacy && pick('legacy')) {
            if (isActive() && ready()) { let n = 0; for (const m of ctx().chat ?? []) n += stashAllSwipes(m); if (n) await ctx().saveChat?.(); } // 옛 태그를 먼저 보관 (끄면 더는 못 읽음)
            s.legacyStatus = false;
            installRegex(); // 정규식도 <meatball>만 (채팅 다시 그림)
        }
        if (heavy && pick('light')) Object.assign(s, structuredClone(PRESETS.light.set));
        toastr.success('적용했어요.', TITLE);
    }
    saveSettings();
    document.getElementById('ss-settings')?.remove(); renderSettings(); // 설정 화면도 새 값으로
    refreshNow();
}

// ───── 정규식 ─────
function regexScripts() {
    // 닫힌 <meatball> · 안 닫혔으면 「키: 값」 줄이 이어지는 데까지만 (본문·다른 태그를 끝까지 지우지 않게) · 옛 <status>는 예전 규칙 그대로 (설정이 켜져 있을 때)
    const MB = '<meatball>(?:(?!<\\/?meatball>)[\\s\\S])*?<\\/meatball>|<meatball>(?:\\s*(?:[-*•]\\s*|\\d+[.)]\\s*)?[^<:：\\n]{1,24}[:：][^\\n]*)*';
    const ST = '<status>(?:(?!<\\/status>|<summary|<details|\\|\\s*Physical\\s*:|Relationship \\(mutual)[\\s\\S])*?(?:<\\/status>|$)';
    const any = settings().legacyStatus !== false ? `${MB}|${ST}` : MB;
    return [
        { id: REGEX_IDS.show, scriptName: '미트볼 상태창 ① <meatball> 블록 → 변동 칩', findRegex: `/${any}/gi`, replaceString: '<div class="ss-slot"></div>', trimStrings: [], placement: [2], disabled: false, markdownOnly: true, promptOnly: false, runOnEdit: true, substituteRegex: 0, minDepth: null, maxDepth: null },
        { id: REGEX_IDS.strip, scriptName: '미트볼 상태창 ② 오래된 <meatball> 프롬프트에서 제거', findRegex: `/\\s*(?:${any})/gi`, replaceString: '', trimStrings: [], placement: [2], disabled: false, markdownOnly: false, promptOnly: true, runOnEdit: false, substituteRegex: 0, minDepth: 3, maxDepth: null },
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
        else if (ex.scriptName !== sc.scriptName || ex.findRegex !== sc.findRegex) { ex.scriptName = sc.scriptName; ex.findRegex = sc.findRegex; changed = true; } // 이름·찾는 글이 바뀐 경우 (업데이트)
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
// soft = 이벤트로 온 갱신: 채팅·기록·설정이 그대로면 다시 계산하지 않고 화면도 다시 그리지 않는다 (한 턴에 3~4번 오던 중복 계산 줄이기)
let refreshForce = false, lastFp = '';
function refresh(force = false) { refreshForce ||= force; if (force) app.redecorate(); clearTimeout(refreshTimer); refreshTimer = setTimeout(() => { const f = refreshForce; refreshForce = false; refreshNow({ soft: !f }); }, 60); }
function fingerprint() {
    const c = ctx(), chat = c.chat ?? [], last = chat.at(-1), meta = getMeta();
    return [c.getCurrentChatId?.(), chat.length, last?.swipe_id, last?.mes?.length, drawerOps(last ?? {})?.length, meta?.adjust?.length, meta?.adjust?.at(-1)?.t, meta?.startAt, rev.n].join('|');
}
function refreshNow({ soft = false } = {}) {
    clearTimeout(refreshTimer);
    let same = false;
    try {
        if (!isActive() || !ready()) { app.current = null; setInjection(null); lastFp = ''; }
        else {
            const fp = fingerprint();
            same = soft && fp === lastFp && !!app.current;
            if (!same) app.current = compute();
            lastFp = fp;
            try { setInjection(getMeta()?.paused ? null : buildInjection(app.current)); } catch (e) { ssErr(LOG, 'inject', e); }
            try { decorateAll(); } catch (e) { ssErr(LOG, 'decorate', e); }
            try { scheduleFill(); checkKorean(); } catch (e) { ssWarn(LOG, 'viewtr', e); }
        }
    } catch (e) { ssErr(LOG, e); }
    // 계산이 어디서 실패해도 상태창 화면은 그린다 (안 그리면 '창이 안 떠요'가 됨)
    try { ensureUI(); if (!same) rerenderPanels(); } catch (e) { ssErr(LOG, 'ui', e); }
}
app.refreshNow = () => refreshNow();

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
                <button class="menu_button" data-s-act="help"><i class="fa-solid fa-circle-question"></i> 도우미에게 물어보기</button>
                <button class="menu_button" data-s-act="chaton">이 채팅에서 켜기</button>
            </div>
            <label>새 채팅 기본 난이도<select class="text_pole" data-s="difficulty">${Object.entries(DIFFS).map(([k, v]) => o('difficulty', k, v.name)).join('')}</select></label>
            <label>스토리 → 상태창 자동 반영<select class="text_pole" data-s="sync">
                ${o('sync', 'tag', 'A. 태그 — 메인 AI가 응답 끝에 &lt;meatball&gt; (추천 · 추가 호출 없음)')}
                ${o('sync', 'tagPlus', 'A+B. 태그 + 빠졌을 때만 별도 분석')}
                ${o('sync', 'analyze', 'B. 별도 분석 — 매 응답 뒤 AI 1회 더 (정확 · 비용↑)')}
                ${o('sync', 'off', 'C. 끔 — 직접 편집·추가 지시로만')}</select></label>
            <label>규칙 주입<select class="text_pole" data-s="injectMode">${o('injectMode', 'lite', '간결 — 기본 · 추천')}${o('injectMode', 'ultra', '초압축 — 기호·키워드 · 토큰 최소')}${o('injectMode', 'full', '전체 — 비추천 · 토큰 많음 (매 턴 약 1천 토큰 이상)')}</select>
                <small>초압축은 가벼운 모델이 &lt;meatball&gt;을 빼먹을 수 있어서, 자동 반영을 A+B로 두는 걸 추천해요.</small></label>
            <label class="checkbox_label"><input type="checkbox" data-s="sceneFilter" ${s.sceneFilter ? 'checked' : ''}> 장면 필터 — 최근 대화에 나온 인물만 자세히, 나머지는 이름·수치만</label>
            <label>장면 판단에 볼 최근 메시지 수<input type="number" min="1" max="40" class="text_pole" data-s="sceneTurns" value="${s.sceneTurns}"></label>
            <label>주입할 고정 메모 최대 개수<input type="number" min="0" max="30" class="text_pole" data-s="pinCap" value="${s.pinCap}"></label>
            <label>메시지 변동 칩<select class="text_pole" data-s="msgCard">${o('msgCard', 'compact', '보이기')}${o('msgCard', 'off', '숨기기')}</select></label>
            <b class="ss-set-h">상태창 언어 · 번역</b>
            <small>상태창 칸(프로필·상점·편지·뉴스…)을 만드는 <b>확장 AI 모델</b>과, 그걸 번역하는 <b>번역 모델</b>을 따로 고를 수 있어요. 롤플 본문과는 상관없어요.</small>
            <label>상태창 생성 언어<select class="text_pole" data-s="ssGenLang">${o('ssGenLang', 'ko', '한국어로 바로 생성 (번역 없음)')}${o('ssGenLang', 'enview', '영어로 저장 · 화면만 번역 — AI에겐 영어, 나한텐 번역본 (추천 · 생성마다 번역 1회)')}${o('ssGenLang', 'en', '영어로 생성 → 번역본을 저장 (AI에게도 번역본이 감 · 예전 방식)')}</select></label>
            <label>번역 모델 (연결 프로필)<div class="ss-set-inline"><select class="text_pole" data-s="trProfile">${profileOptions(s.trProfile).replace('메인 연결 그대로', '확장 AI 모델 그대로 (없으면 메인)')}</select></div></label>
            <label>번역할 언어<input class="text_pole" data-s="trLang" value="${esc(s.trLang)}"></label>
            <label>번역 담당<select class="text_pole" data-s="trEngine">${o('trEngine', 'llm', '번역 모델 (LLM) — 말투·지침을 이해함 · 토큰 듦')}${o('trEngine', 'st', '실리 기본 번역 — Google·DeepL 등 · 무료 · 빠름')}</select>
                <small>실리 기본 번역은 확장 메뉴 › <b>Chat Translation</b>에서 고른 번역기를 써요.</small></label>
            <label>실리 기본 번역 언어 코드<input class="text_pole" data-s="trCode" value="${esc(s.trCode)}" placeholder="ko"></label>
            <label>번역 지침<textarea class="text_pole" rows="4" data-s="trRules" placeholder="Leon Hart = 레온 하트&#10;Kingdom of Ardel = 아르델 왕국&#10;편지는 반말로 옮길 것">${esc(s.trRules ?? '')}</textarea></label>
            <label>화면만 번역: 본편 AI가 새로 쓴 영어 글 자동 번역<select class="text_pole" data-s="trAuto">${o('trAuto', 'st', '실리 기본 번역일 때만 (무료 · 추천)')}${o('trAuto', 'always', '항상 — 번역 모델이면 새 글이 생길 때 AI 1회씩')}${o('trAuto', 'off', '끔 — 「상태창 전체 번역」을 누를 때만')}</select></label>
            <small><b>번역 모델</b>: 적은 글이 그대로 지침으로 가요. <b>실리 기본 번역</b>: 지침을 읽지 못해서 <code>원문 = 번역</code> 모양의 줄만 써요 (이름·용어 고정). 다른 줄은 무시돼요.</small>
            <div class="ss-set-btns"><button class="menu_button" data-s-act="trsheet"><i class="fa-solid fa-language"></i> 상태창 전체 번역</button><button class="menu_button" data-s-act="toenglish" title="예전에 한국어로 저장된 칸을 영어 저장으로 바꿔요. 지금 보이는 한국어는 화면 번역으로 남아요."><i class="fa-solid fa-right-left"></i> 한국어로 저장된 칸을 영어 저장으로 바꾸기</button></div>
            <small>「화면만 번역」으로 바꿔도 <b>이미 한국어로 저장된 칸</b>은 그대로 한국어로 AI에게 가요. 위 오른쪽 버튼을 한 번 누르면 이 채팅의 칸들이 영어 저장으로 바뀌고, 지금 보이는 한국어는 화면 번역으로 그대로 남아요. (채팅마다 한 번)</small>
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
                <label>미트볼 도우미 (기능 물어보기)<select class="text_pole" data-s="profHelp">${featOptions(s.profHelp)}</select></label>
            </details>
            <label class="checkbox_label"><input type="checkbox" data-s="aiFallbackMain" ${s.aiFallbackMain ? 'checked' : ''}> 연결 프로필이 실패하면 메인 연결로 다시 보내기 <small>(끄면 실패로 끝나요 · 비싼 메인 모델로 새는 것 방지)</small></label>
            <label class="checkbox_label"><input type="checkbox" data-s="genBatch" ${s.genBatch ? 'checked' : ''}> 상태창 만들기: 관련 칸끼리 묶어서 생성 <small>(호출 17번 → 6번 · 빠진 칸만 따로 다시)</small></label>
            <label>동시에 보낼 생성 요청 수 <small>(너무 높으면 API가 거절할 수 있어요)</small><input type="number" min="1" max="8" class="text_pole" data-s="genParallel" value="${s.genParallel}"></label>
            <label>확장 AI 최대 출력 토큰<input type="number" min="500" max="32000" class="text_pole" data-s="aiMaxTokens" value="${s.aiMaxTokens}"></label>
            <label>생성 때 읽을 최근 채팅 수<input type="number" min="0" max="100" class="text_pole" data-s="recentForGen" value="${s.recentForGen}"></label>
            <label>생성 때 읽을 로어북 최대 글자 수<input type="number" min="0" max="100000" step="1000" class="text_pole" data-s="loreChars" value="${s.loreChars}"></label>
            <label>상태 주입 깊이 (0 = 맨 끝)<input type="number" min="0" max="20" class="text_pole" data-s="injectDepth" value="${s.injectDepth}"></label>
            <label class="checkbox_label"><input type="checkbox" data-s="injWorld" ${s.injWorld ? 'checked' : ''}> 세계관 요약·규칙도 매 턴 보내기 <small>(기본 끔 — 보통 카드·로어북에 이미 있어서 중복이에요. 카드·로어북에 세계관이 없을 때만 켜세요. 끄더라도 칸을 AI로 만들 때는 참고해요)</small></label>
            <label class="checkbox_label"><input type="checkbox" data-s="injScan" ${s.injScan !== false ? 'checked' : ''}> 상태 주입문으로 로어북(월드인포) 켜기 <small>(끄면 근처 장소·의뢰인 이름 때문에 장면 밖 로어북이 켜지지 않아 토큰 절약 · 장소 로어북을 키워드로 켜고 있었다면 그대로 두세요)</small></label>
            <label class="checkbox_label"><input type="checkbox" data-s="autoBake" ${s.autoBake !== false ? 'checked' : ''}> 긴 채팅 자동 정리 — 오래된 기록을 굳혀서 가볍게 <small>(최근 120개 메시지는 그대로 · 그보다 오래된 답의 스와이프·편집은 상태에 다시 반영되지 않아요)</small></label>
            <label class="checkbox_label"><input type="checkbox" data-s="autoRegex" ${s.autoRegex ? 'checked' : ''}> &lt;meatball&gt; 숨김 정규식 자동 설치</label>
            <b class="ss-set-h">모델 맞춤 · 토큰 절약</b>
            <small>버튼 하나로 아래 설정들을 한 번에 맞춰요. 처음 설치하면 「기본」이 켜져 있어요.</small>
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
            <label class="checkbox_label"><input type="checkbox" data-s="featureTips" ${s.featureTips !== false ? 'checked' : ''}> 💡 팁 · 주의 알림 — 안 쓰는 기능 추천 · 「이것도 아세요?」 · 설정 주의를 가끔 한 번씩 <small>(「알아요」 누르면 다시 안 나옴 · AI 0회)</small></label>
            <div class="ss-set-btns"><button class="menu_button" data-s-act="tipreset"><i class="fa-solid fa-rotate-left"></i> 넘긴 추천 · 팁 다시 보기</button></div>
            <b class="ss-set-h">추천 음악</b>
            <label>좋아하는 음악 (모든 채팅 기본)<input class="text_pole" data-s="musicTaste" value="${esc(s.musicTaste)}" placeholder="예: K-pop 발라드, 영화 OST, 로파이"></label>
            <label>▶ 누르면 열 곳<select class="text_pole" data-s="musicApp">${o('musicApp', 'youtube', '유튜브')}${o('musicApp', 'ytmusic', '유튜브 뮤직')}${o('musicApp', 'spotify', '스포티파이')}${o('musicApp', 'melon', '멜론')}</select></label>
            <label class="checkbox_label"><input type="checkbox" data-s="musicToast" ${s.musicToast ? 'checked' : ''}> 곡이 바뀌면 팝업</label>
            <b class="ss-set-h">관계</b>
            <label class="checkbox_label"><input type="checkbox" data-s="stageLock" ${s.stageLock ? 'checked' : ''}> 관계 단계를 넘는 행동 막기 — 「아직 이 단계 이상은 하지 마」라고 본편 AI에게 알려 줘요 (천천히 가까워지는 연애용 · 끄면 단계만 알려 줌)</label>
            <label class="checkbox_label"><input type="checkbox" data-s="jealousy" ${s.jealousy ? 'checked' : ''}> 질투 — 다른 사람과 가까워지면 애정이 높은 사람의 질투가 올라요 (날이 지나면 식음)</label>
            <label class="checkbox_label"><input type="checkbox" data-s="offscreen" ${s.offscreen ? 'checked' : ''}> 화면 밖 생활 — 날이 지나면 본편 AI가 가끔 다른 사람 근황을 적어요</label>
            <label>속마음 엿보기 하루 횟수 (0 = 무제한)<input type="number" min="0" max="20" class="text_pole" data-s="peekPerDay" value="${s.peekPerDay}"></label>
            <b class="ss-set-h">💗 로맨스 보정 <small>(전부 선택 · 기본 꺼짐)</small></b>
            <small>AI가 유저 말에 다 맞춰 주거나, 친구인데 연인처럼 굴거나, 많이 놀았다고 연인 취급하는 걸 줄여요. 숫자를 바꾸는 기능(①②③)은 <b>켠 뒤에 오는 답부터</b> 적용돼서 옛 채팅의 숫자는 그대로예요.</small>
            <label class="checkbox_label"><input type="checkbox" data-s="romBond" ${s.romBond ? 'checked' : ''}> ① 연인은 고백으로만 — 맨 위 단계는 숫자만 차선 안 올라가요. 고백이 오가면 관계 탭에서 「💍 연인 확정」 <small>(토큰 거의 0)</small></label>
            <label class="checkbox_label"><input type="checkbox" data-s="romCap" ${s.romCap ? 'checked' : ''}> ② 한 번에 확 못 오르게 — AI 답 1번에 한 사람의 애정·우정이 오를 수 있는 최대치 <small>(토큰 0)</small></label>
            <div class="ss-set-inline"><label>애정(호감) 최대 +<input type="number" min="1" max="50" class="text_pole" data-s="romCapAff" value="${s.romCapAff}"></label><label>우정(신뢰) 최대 +<input type="number" min="1" max="50" class="text_pole" data-s="romCapTrust" value="${s.romCapTrust}"></label></div>
            <label class="checkbox_label"><input type="checkbox" data-s="romFatigue" ${s.romFatigue ? 'checked' : ''}> ③ 연달아 꼬시면 덜 오르게 — 같은 사람 애정(호감)이 3턴 연속 오르면 60%, 4턴부터 34%만 <small>(토큰 0)</small></label>
            <label class="checkbox_label"><input type="checkbox" data-s="romFacts" ${s.romFacts ? 'checked' : ''}> ④ 관계를 사실로 알려 주기 — 「하지 마」 대신 「지금은 친구고, 이 단계에선 이렇게 군다 · 선을 넘으려 하면 차가워지지 말고 자기 식으로 피한다」 <small>(장면 인물마다 주입 조금 · 켜면 위 「단계 넘는 행동 막기」 문구는 대신 빠져요)</small></label>
            <details class="ss-set-more"><summary>더 보기 — ⑤ 인물의 욕구 · ⑥ 의도 먼저 · ⑦ 내 주입문 · ⑧ 먼저 움직이기 · 주입 깊이</summary>
            <label class="checkbox_label"><input type="checkbox" data-s="romDrive" ${s.romDrive ? 'checked' : ''}> ⑤ 인물의 욕구 — 끌리는 것 · 싫어하는 것 · 요즘 신경 쓰는 것을 알려 주고, AI가 바뀌면 고쳐 적어요 <small>(관계 편집에서 직접 적을 수도 · 주입 조금)</small></label>
            <label class="checkbox_label"><input type="checkbox" data-s="romIntent" ${s.romIntent ? 'checked' : ''}> ⑥ 의도 먼저 — 「쓰기 전에 캐릭터가 원하는 것 · 걸리는 것 · 할 행동부터 정하라」 한 줄 <small>(주입 조금)</small></label>
            <label>⑦ 내 추가 주입문 <small>(아무 프롬프트·프리셋이든 같이 들어가요 · 비우면 안 보냄 · 영어 추천)</small><textarea class="text_pole" rows="3" data-s="romInject" placeholder="예: {{char}} has a life outside {{user}} and does not always agree.">${esc(s.romInject ?? '')}</textarea></label>
            <label class="checkbox_label"><input type="checkbox" data-s="romInit" ${s.romInit ? 'checked' : ''}> ⑧ 먼저 움직이기 — 가끔 그 장면의 인물이 유저를 기다리지 않고 스스로 일을 벌여요 (주도권 주사위) <small>(걸린 턴에만 주입 한 줄)</small></label>
            <label>먼저 움직일 확률 % (AI 답 1번마다)<input type="number" min="0" max="100" class="text_pole" data-s="romInitPct" value="${s.romInitPct}"></label>
            <label>로맨스 보정 주입 깊이 (0 = 맨 끝 · 모델이 잘 안 지키면 0~1로)<input type="number" min="0" max="20" class="text_pole" data-s="romDepth" value="${s.romDepth}"></label>
            <small>④⑤⑥⑧ 문구는 「프롬프트 · 토큰」 창에서 고칠 수 있어요. ⑤는 관계 탭의 「욕구 AI로 채우기」로 한 번에 채울 수 있어요.</small>
            </details>
            <div class="ss-set-btns"><button class="menu_button" data-s-act="romrec" title="① 연인은 고백으로만 · ② 한 번에 확 못 오르게 · ④ 관계를 사실로"><i class="fa-solid fa-heart"></i> 추천 세트 켜기 (①②④)</button><button class="menu_button" data-s-act="romoff"><i class="fa-solid fa-power-off"></i> 로맨스 보정 모두 끄기</button></div>
            <b class="ss-set-h">데이터 · 화면</b>
            <label class="checkbox_label"><input type="checkbox" data-s="updateNotice" ${s.updateNotice !== false ? 'checked' : ''}> 📣 업데이트하면 「바뀐 점」을 한 번 알려 주기</label>
            <div class="ss-set-btns"><button class="menu_button" data-s-act="whatsnew"><i class="fa-solid fa-bullhorn"></i> 업데이트 내역</button></div>
            <label class="checkbox_label"><input type="checkbox" data-s="cardOffer" ${s.cardOffer ? 'checked' : ''}> 카드에 상태창이 들어 있으면 새 채팅에서 불러올지 물어보기</label>
            <label class="checkbox_label"><input type="checkbox" data-s="autoSave" ${s.autoSave ? 'checked' : ''}> 자동 세이브 (오래된 기록을 정리하기 전에 · 분기 대비)</label>
            <label class="checkbox_label"><input type="checkbox" data-s="bottomNav" ${s.bottomNav ? 'checked' : ''}> 폰 한 손 모드 — 탭 바를 아래로</label>
            <label class="checkbox_label"><input type="checkbox" data-s="showMascot" ${s.showMascot !== false ? 'checked' : ''}> 🐱 마스코트 고양이 보이기 (빈 화면 · 만들기 · 알림 · 일시정지)</label>
            <label class="checkbox_label"><input type="checkbox" data-s="mascotBuddy" ${s.mascotBuddy !== false ? 'checked' : ''}> 상태창 제목 옆에 마스코트 항상 두기 <small>(누르면 뾱! · 여러 번 빠르게 누르면 신나요)</small></label>
            <label>마스코트 누르면 나는 소리<select class="text_pole" data-s="mascotSound">${MASCOT_SOUNDS.map(([v, t]) => o('mascotSound', v, t)).join('')}</select></label>
            <label>효과음 크기 <small class="ss-mvol">${s.mascotVolume}</small><input type="range" min="0" max="100" step="5" data-s="mascotVolume" value="${s.mascotVolume}"></label>
            <div class="ss-set-btns"><button class="menu_button" data-s-act="mascotsound"><i class="fa-solid fa-volume-high"></i> 소리 미리 듣기</button></div>
            <div class="ss-set-btns"><button class="menu_button" data-s-act="diag"><i class="fa-solid fa-stethoscope"></i> 자가 진단 · 고치기</button><button class="menu_button" data-s-act="report"><i class="fa-solid fa-bug"></i> 오류 보고문</button><button class="menu_button" data-s-act="backup"><i class="fa-solid fa-box-archive"></i> 이 채팅 전체 백업</button></div>
            <b class="ss-set-h">다른 확장과 같이 쓰기</b>
            <label class="checkbox_label"><input type="checkbox" data-s="stashTags" ${s.stashTags ? 'checked' : ''}> &lt;meatball&gt;을 읽은 뒤 본문에서 떼어 보관 <small>(추천 · 요약·번역·로그 복사 확장에 변화량 줄이 안 보여요. 고칠 땐 변동 칩의 ✏️)</small></label>
            <label class="checkbox_label"><input type="checkbox" data-s="legacyStatus" ${s.legacyStatus !== false ? 'checked' : ''}> 옛 &lt;status&gt; 태그도 미트볼 것으로 읽고 숨기기 <small>(v2.5 이전 채팅용 · <b>다른 프리셋이 &lt;status&gt;를 쓰면 끄세요</b> — 끄면 &lt;meatball&gt;만 건드려요)</small></label>
            <div class="ss-set-btns"><button class="menu_button" data-s-act="stashall"><i class="fa-solid fa-box-archive"></i> 이 채팅의 옛 태그도 모두 보관</button></div>
            <div class="ss-set-btns">
                <button class="menu_button" data-s-act="defmods">지금 기능 구성을 새 채팅 기본값으로</button>
                <button class="menu_button" data-s-act="regex">정규식 설치</button>
                <button class="menu_button" data-s-act="unregex">정규식 제거</button>
            </div>
        </div></div>`;
    el.addEventListener('input', (e) => { if (e.target.dataset.s === 'mascotVolume') { const lb = el.querySelector('.ss-mvol'); if (lb) lb.textContent = e.target.value; } });
    el.addEventListener('change', (e) => {
        const ev = e.target.dataset.sEvery;
        if (ev) { const set = settings(); set.injEvery = { ...(set.injEvery ?? {}), [ev]: e.target.value }; if (e.target.value === 'always') delete set.injEvery[ev]; saveSettings(); refreshNow(); return; }
        const k = e.target.dataset.s;
        if (!k) return;
        settings()[k] = e.target.type === 'checkbox' ? e.target.checked : e.target.type === 'number' || e.target.type === 'range' ? Number(e.target.value) : e.target.value;
        saveSettings();
        hintSetting(k, settings()[k]); // 방금 바꾼 설정에 주의할 게 있으면 한 번
        if (k === 'autoRegex' && e.target.checked) installRegex();
        if (k === 'legacyStatus') installRegex(); // 정규식도 같이 바꾼다
        if (k === 'ssGenLang' && e.target.value === 'enview') toastr.info('이제부터 만드는 상태창은 영어로 저장되고 화면에만 번역돼요. 이미 한국어로 저장된 칸은 그대로예요.', TITLE);
        if (k === 'mascotSound' || k === 'mascotVolume') playMascotSound(); // 고르면 바로 들려주기
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
        if (a === 'report') return openReport();
        if (a === 'tipreset') { settings().tipNever = {}; settings().hintSeen = {}; saveSettings(); toastr.info('다시 추천해 드릴게요.', TITLE); return; }
        if (a === 'whatsnew') return showWhatsNew(true);
        if (a === 'help') return openHelp();
        if (a === 'toenglish') return convertToEnglish(e.target.closest('button'));
        if (a === 'romrec' || a === 'romoff') {
            const set = settings(), on = a === 'romrec';
            if (on) { set.romBond = true; set.romCap = true; set.romFacts = true; }
            else for (const k of ['romBond', 'romCap', 'romFatigue', 'romFacts', 'romDrive', 'romIntent', 'romInit']) set[k] = false;
            saveSettings();
            el.querySelectorAll('[data-s^="rom"]').forEach(i => { if (i.type === 'checkbox') i.checked = !!set[i.dataset.s]; });
            refreshNow();
            toastr.success(on ? '추천 세트(①②④)를 켰어요. 지금부터 오는 답에 적용돼요.' : '로맨스 보정을 모두 껐어요. (내 추가 주입문은 그대로예요)', TITLE);
            return;
        }
        if (a === 'mascotsound') { playMascotSound(); return; }
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
        unnamedArgumentList: [SlashCommandArgument.fromProps({ description: '값 (<meatball> 한 줄과 같은 형식)', typeList: ARGUMENT_TYPE.STRING, isRequired: true })],
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
            return sub([inj.main, inj.people, inj.romance].filter(Boolean).join('\n'));
        },
        namedArgumentList: [SlashCommandNamedArgument.fromProps({ name: 'key', description: 'cash, loc, date, time, weather, season, curse, quest, here_now, aff:이름, trust:이름, stat:체력, item:이름, 게이지 이름…', typeList: ARGUMENT_TYPE.STRING, isRequired: false })],
        helpString: '상태를 텍스트로 돌려준다. key를 주면 그 값 하나만. 예: /ss-get key=cash · /ss-get key=aff:레온',
    });
    add({ name: 'ss-undo', callback: async () => { await app.undoLast?.(); return ''; }, helpString: '상태창에서 한 마지막 편집을 되돌린다.' });
    add({ name: 'ss-save', callback: async () => { if (ready()) await saveSlot(); return ''; }, helpString: '지금 상태를 세이브 슬롯에 저장한다.' });
    add({ name: 'ss-backup', callback: () => { fullBackup(); return ''; }, helpString: '이 채팅의 상태창 전체를 파일로 백업한다.' });
    add({ name: 'ss-inbox', callback: () => { app.openInbox?.(); return ''; }, helpString: '알림함을 연다.' });
    add({ name: 'ss-search', callback: () => { app.openSearch?.(); return ''; }, helpString: '상태창 검색 창을 연다.' });
    add({
        name: 'ss-help',
        callback: (_n, text) => { openHelp(String(text ?? '').trim()); return ''; },
        unnamedArgumentList: [SlashCommandArgument.fromProps({ description: '물어볼 것 (비우면 창만 열어요)', typeList: ARGUMENT_TYPE.STRING, isRequired: false })],
        helpString: '미트볼 도우미에게 기능을 물어본다. 예: /ss-help 연인 확정은 어디서 해요?',
    });
    add({ name: 'ss-report', callback: () => { openReport(); return ''; }, helpString: '🐞 오류 보고문을 만든다 (AI 0회 · 이름은 가리고 채팅 내용은 넣지 않음 · 공개 게시판에 올려도 되는 수준).' });
    add({ name: 'ss-diag', callback: async () => { await diagnose(); return ''; }, helpString: '자가 진단 — 망가진 기록을 찾아 고친다.' });
}

// ───── 이벤트 ─────
function lastUserText() {
    const chat = ctx().chat ?? [];
    for (let i = chat.length - 1; i >= 0; i--) if (chat[i]?.is_user) return String(chat[i].mes ?? '');
    return '';
}
async function onBeforeGenerate(type, _opts, dryRun) {
    ctxReset();
    if (dryRun || !isActive() || !ready()) return;
    const set = settings(), meta = getMeta();
    let skip = !!meta.paused;
    if (!skip && set.skipQuiet && type === 'quiet') skip = true;
    // 조용한 생성(다른 확장의 요약 등)은 '다음 1번 건너뛰기'를 쓰지 않는다
    if (!skip && meta.skipOnce && type !== 'quiet') { skip = true; meta.skipOnce = false; saveMeta(); renderHud(); }
    // 건너뛴 답(OOC 등)을 이어쓰기하면 그 이어쓰기도 건너뛴다 (OOC 답이 이어쓰기로 분석되던 것)
    if (!skip && type === 'continue' && app.lastGenSkipped) skip = true;
    if (!skip && set.oocDetect && type !== 'quiet' && type !== 'continue') {
        try { if (new RegExp(set.oocPattern, 'i').test(lastUserText())) skip = true; } catch { /* bad pattern */ }
    }
    // 이번 생성은 상태창 없이 (OOC · 일시정지 · 건너뛰기) → 그 답은 따로 분석하지도 않는다 (OOC 답에서 숫자가 바뀌지 않게)
    if (type !== 'quiet') app.lastGenSkipped = skip;
    if (skip) { setInjection(null); return; }
    const chat = ctx().chat ?? [];
    let limit = chat.length;
    const last = chat[chat.length - 1];
    if ((type === 'swipe' || type === 'regenerate') && last && !last.is_user) limit = chat.length - 1;
    // 사칭(impersonate)은 유저 글이라 <meatball> 출력 규칙을 빼고 보낸다 (안 빼면 내 메시지에 태그가 붙어 나옴)
    try { setInjection(buildInjection(compute(limit), { noOutput: type === 'impersonate' })); } catch (e) { ssErr(LOG, e); }
}
function onGenEnded() { refresh(); } // 바로 앞 렌더에서 이미 계산했으면 건너뜀
// 서랍: AI 답이 끝나면 <meatball>을 본문에서 떼어 보관
let stashSave = null;
function stashAt(id, { replace = false, rerender = true, save = false } = {}) {
    if (!settings().stashTags || !isActive() || !ready()) return; // 상태창을 안 만든 채팅의 <status>(다른 프리셋 것일 수도)는 건드리지 않는다
    const chat = ctx().chat ?? [];
    const i = Number(id ?? chat.length - 1);
    const m = chat[i];
    if (!stashStatus(m, { replace })) return;
    if (rerender) { try { ctx().updateMessageBlock?.(i, m); } catch (e) { ssWarn(LOG, 'rerender', e); } }
    if (save) { clearTimeout(stashSave); stashSave = setTimeout(() => ctx().saveChat?.(), 400); }
}
function onReceived(id, type) {
    if (type === 'impersonate') return;
    stashAt(id, { replace: type !== 'continue' });
}
function onSwiped(id) { stashAt(id, { replace: true, save: true }); refresh(true); }
function onEdited(id) { stashAt(id, { replace: true, rerender: false, save: true }); refresh(true); }
const analyzed = new Set();
let pingCounter = 0;
function onCharRendered(id, type) {
    refreshNow({ soft: true });
    notifyLatest();
    if (!isActive() || !ready() || type === 'quiet' || getMeta()?.paused) return;
    const chat = ctx().chat ?? [];
    const i = Number(id ?? chat.length - 1);
    const m = chat[i];
    if (!m || m.is_user || i !== chat.length - 1) return;
    const set = settings();
    // 긴 채팅: 오래된 기록을 굳혀 매 턴 계산을 가볍게 (최근 120개는 그대로)
    try { const meta = getMeta(); if (autoBake(meta)) { saveMeta(); refreshNow(); } } catch (e) { ssWarn(LOG, 'bake', e); }
    // 💡 이야기에 맞는 순간 안 쓰는 기능 한 번 추천
    maybeTip();
    maybeLaterWarn(); // 오래 쓰다 생기는 문제는 나중에 한 번
    // 자동 선톡
    if (set.autoPing && modOn('contact') && app.current?.state.data.contact?.contacts.length) {
        pingCounter++;
        if (pingCounter >= Math.max(2, set.autoPingEvery) && rand(100) <= 50) {
            pingCounter = 0;
            const cs = app.current.state.data.contact.contacts.filter(c => !c.blocked);
            if (cs.length) receivePing(cs[rand(cs.length) - 1].name, true).catch(e => ssWarn(LOG, 'autoping', e));
        }
    }
    if (set.sync !== 'analyze' && set.sync !== 'tagPlus') return;
    if (app.lastGenSkipped) return; // OOC·건너뛴 턴의 답은 분석하지 않음
    if (set.sync === 'tagPlus' && hasStatus(m.mes)) return;
    if (m.extra?.[MODULE]?.bySwipe?.[m.swipe_id ?? 0]) return;
    const key = `${ctx().getCurrentChatId?.()}:${i}:${m.swipe_id ?? 0}:${m.mes.length}`;
    if (analyzed.has(key)) return;
    analyzed.add(key);
    analyzeMessage(i);
}
async function onChatChanged() {
    ctxReset(); lastFp = ''; app.lastGenSkipped = false;
    notified = new Set();
    pingCounter = 0;
    for (const el of panels) if (el._ss) { el._ss.mode = 'view'; el._ss.ui = {}; el._ss.tab = 'home'; el._ss.group = null; }
    try { await followBranch(); } catch (e) { ssWarn(LOG, 'branch', e); }
    refreshNow();
    // 카드에 상태창이 들어 있으면 (이 채팅에 아직 없을 때) 한 번 물어본다
    setTimeout(() => { offerCard(setBase).catch(e => ssWarn(LOG, 'card', e)); }, 400);
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
    } catch (e) { ssWarn(LOG, 'macro', e); }
    // 옛 실리: 인자 없는 매크로로 자주 쓰는 것만
    try { for (const k of ['cash', 'loc', 'date', 'time', 'weather', 'curse']) c.registerMacro?.(`ss_${k}`, () => get(k)); } catch (e) { ssWarn(LOG, 'macro', e); }
}

function init() {
    const { eventSource, event_types: E } = ctx();
    const fresh = !ctx().extensionSettings?.[MODULE]; // 처음 설치한 사람에겐 「바뀐 점」을 안 띄운다
    settings();
    // v2.7: 처음 설치하면 「기본 (추천)」 = 가벼운 모델 맞춤으로 시작
    if (fresh) { Object.assign(settings(), structuredClone(PRESETS.light.set)); settings().v27asked = true; saveSettings(); }
    applyTheme();
    initMascot();
    renderSettings();
    registerCommands();
    registerMacros();
    if (settings().autoRegex) installRegex(false);
    try { startViewTr(); } catch (e) { ssWarn(LOG, 'viewtr', e); }
    const on = (name, fn) => { if (E[name]) eventSource.on(E[name], fn); };
    on('CHAT_CHANGED', onChatChanged);
    on('GENERATION_AFTER_COMMANDS', onBeforeGenerate);
    on('MESSAGE_RECEIVED', onReceived);
    on('CHARACTER_MESSAGE_RENDERED', onCharRendered);
    on('MESSAGE_SWIPED', onSwiped);
    on('MESSAGE_EDITED', onEdited);
    for (const ev of ['USER_MESSAGE_RENDERED', 'MORE_MESSAGES_LOADED', 'GENERATION_STOPPED']) on(ev, () => refresh());
    for (const ev of ['MESSAGE_UPDATED', 'MESSAGE_DELETED']) on(ev, () => refresh(true)); // 옛 메시지가 바뀌면 다시 계산
    on('GENERATION_STARTED', (type, opts, dry) => { if (!dry) app.generatingAt = Date.now(); });
    on('GENERATION_ENDED', () => { app.generatingAt = 0; });
    on('GENERATION_STOPPED', () => { app.generatingAt = 0; });
    on('GENERATION_ENDED', onGenEnded);
    refreshNow();
    try { whatsNewOnLoad(fresh); } catch (e) { ssWarn(LOG, 'whatsnew', e); }
    setTimeout(() => { askV27().catch(e => ssWarn(LOG, 'v27', e)); }, 3500);
    console.log(LOG, 'loaded', VERSION);
}

{
    const { eventSource: _es, event_types: _et } = SillyTavern.getContext();
    _es.on(_et.APP_READY, init);
}

if (globalThis.__SS_TEST__) globalThis.__SS_TEST__.api = { refreshNow, decorateAll, onBeforeGenerate, init, onChatChanged, app };
