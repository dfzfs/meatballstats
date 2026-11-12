// 🔮 운명: 저주·축복 · 이벤트 카드 · 자동 규칙 · 미니게임
import { app, modOn, esc, short, clone, findBy, num, fmtNum, splitBar, dayIndex, TITLE } from './core.js';
import { addAdjust, commit, ruleTrue } from './engine.js';
import { sec, emptyBox, chip, seg, askInput, askConfirm } from './kit.js';

const KIND_NAME = { luck: '행운', bad: '불운', event: '사건' };
function daysLeft(s, c) {
    if (!c.days || c.since === null || !s.data.calendar) return null;
    return Math.max(0, c.since + c.days - dayIndex(s.data.calendar));
}

export function fateView(s, d, ui) {
    const now = s.data.calendar ? dayIndex(s.data.calendar) : s.turn;
    const w = s.data.wallet && modOn('wallet') ? s.data.wallet : null;
    const today = d.today && d.today.day === now ? d.today : null;
    return `${sec(`저주 · 축복 <small>${d.curses.length}</small>`, `<div class="ss-stack">${d.curses.map(c => {
        const left = daysLeft(s, c);
        return `<div class="ss-curse ${c.kind}"><div class="ss-curse-h"><i class="fa-solid ${c.kind === 'bless' ? 'fa-sun' : 'fa-skull'}"></i><b>${esc(c.name)}</b>${chip(c.kind === 'bless' ? '축복' : '저주', c.kind === 'bless' ? 'hi' : 'neg')}${left !== null ? chip(`${left}일 남음`) : c.auto === 'debt' ? chip('빚을 갚으면 풀림') : ''}</div>
            ${c.desc ? `<p class="ss-dim ss-pre">${esc(c.desc)}</p>` : ''}
            ${c.effects.length ? `<div class="ss-chips">${c.effects.map(e => chip(esc(e), 'warn')).join('')}</div>` : ''}
            ${c.cure ? `<small class="ss-dim"><i class="fa-solid fa-key"></i> ${esc(c.cure)}</small>` : ''}
            <div class="ss-row-btns"><button class="ss-btn sm ghost" data-act="flift" data-arg="${esc(c.name)}"><i class="fa-solid fa-broom"></i> 풀기</button></div></div>`;
    }).join('') || '<p class="ss-hint">걸린 저주·축복이 없어요.</p>'}</div>
        <button class="ss-btn ghost" data-act="fadd"><i class="fa-solid fa-plus"></i> 저주 · 축복 직접 걸기</button>`)}
        ${sec(`이벤트 카드 <small>${d.deck.length}장 · 하루 ${d.drawChance}%</small>`, `${today ? `<div class="ss-card ss-tcard"><small>오늘의 카드</small><b>🃏 ${esc(today.title)}</b>${today.desc ? `<p class="ss-pre">${esc(today.desc)}</p>` : ''}<small class="ss-dim">다음 답에서 AI가 이야기에 엮어요.</small></div>` : ''}
            <div class="ss-row-btns"><button class="ss-btn" data-act="fdraw" ${d.deck.length ? '' : 'disabled'}><i class="fa-solid fa-layer-group"></i> 한 장 뽑기</button></div>
            ${d.log.length ? `<details class="ss-arc"><summary>지난 카드 ${d.log.length}장</summary><ul>${[...d.log].reverse().map(x => `<li><b>${esc(x.title)}</b> <small>${esc(KIND_NAME[x.kind] ?? '')}${x.date ? ` · ${esc(x.date)}` : ''}</small></li>`).join('')}</ul></details>` : ''}
            ${d.deck.length ? '' : '<p class="ss-hint">카드가 없어요. ✨ AI로 수정에서 "이벤트 카드 15장 만들어 줘"라고 해 보세요.</p>'}`)}
        ${sec(`자동 규칙 <small>${d.rules.length}</small>`, d.rules.length ? `<div class="ss-stack">${d.rules.map(r => `<div class="ss-rule ${ruleTrue(s, r.when) ? 'on' : ''}"><i class="fa-solid fa-gear"></i><div><b>${esc(r.name)}</b><small>만약 <code>${esc(r.when)}</code> → ${esc(short(r.then, 80))}</small></div></div>`).join('')}</div><p class="ss-hint">조건이 처음 참이 될 때 한 번 일어나요. ✏️ 편집에서 고칠 수 있어요.</p>` : '<p class="ss-hint">규칙이 없어요. ✏️ 편집에서 「돈 &lt;= 0 → curse: 빈털터리」처럼 만들 수 있어요.</p>')}
        ${w ? sec('미니게임', `<div class="ss-games">
            <label class="ss-f"><span>판돈 (${esc(w.currency)} · 가진 돈 ${fmtNum(w.cash)})</span><input class="ss-in ss-bet" type="number" min="1" value="${esc(ui.bet ?? Math.max(1, Math.round(w.cash / 10)))}"></label>
            <div class="ss-grid-btns">
                <button class="ss-btn" data-act="fgame" data-arg="odd"><i class="fa-solid fa-coins"></i> 홀 (×2)</button>
                <button class="ss-btn" data-act="fgame" data-arg="even"><i class="fa-solid fa-coins"></i> 짝 (×2)</button>
                <button class="ss-btn" data-act="fgame" data-arg="die"><i class="fa-solid fa-dice"></i> 주사위 숫자 맞히기 (×5)</button>
                <button class="ss-btn" data-act="fgame" data-arg="rps"><i class="fa-solid fa-hand-scissors"></i> 가위바위보 (×2)</button>
                <button class="ss-btn" data-act="fgame" data-arg="lotto"><i class="fa-solid fa-ticket"></i> 복권 (1% ×50 · 10% ×3)</button>
            </div>
            ${ui.game ? `<div class="ss-card ss-gres ${ui.game.win ? 'win' : 'lose'}"><b>${esc(ui.game.text)}</b></div>` : ''}
            <p class="ss-hint">결과는 다음 답에서 AI가 이야기에 반영해요. 토큰은 들지 않아요.</p></div>`) : ''}`;
}

const R = (n) => Math.floor(Math.random() * n);
export const FATE_ACTIONS = {
    flift: async (el, arg) => {
        if (!(await askConfirm(`「${esc(arg)}」을(를) 풀까요?`))) return;
        return addAdjust({ ops: [['curse', `-${arg}`]], label: `${arg}이(가) 풀렸다` });
    },
    fadd: async (el) => {
        const v = await askInput(TITLE, '이름 | 효과(쉼표로 여러 개) | 일수 | 풀리는 조건<br><small>예: 흑묘의 저주 | 가격 +20%, 매일 기력 -5 | 7 | 검은 고양이에게 사과하기<br>효과: 가격 ±N% · 호감 ±N% · 매일 체력 -5 · 대출 불가 · 그 밖엔 글로</small>', '');
        if (!v?.trim()) return;
        const [nm] = splitBar(v);
        return addAdjust({ ops: [['curse', v.trim()]], label: `저주·축복: ${nm}` });
    },
    fdraw: (el, arg, btn, s) => {
        const d = s.data.fate; if (!d?.deck.length) return;
        const i = R(d.deck.length);
        const c = d.deck[i];
        return addAdjust({ ops: [['_draw', JSON.stringify({ title: c.title, desc: c.desc, kind: c.kind, effect: c.effect })]], label: `이벤트 카드를 뽑았다: ${c.title}` });
    },
    fgame: async (el, arg, btn, s) => {
        const w = s.data.wallet; if (!w) return;
        const ui = el._ss.ui;
        const bet = Math.round(num(el.querySelector('.ss-bet')?.value, 0));
        ui.bet = bet;
        if (!(bet > 0)) { toastr.info('판돈을 적어 주세요.', TITLE); return; }
        if (bet > w.cash) { toastr.warning('돈이 모자라요.', TITLE); return; }
        let win = 0, text = '';
        if (arg === 'odd' || arg === 'even') {
            const n = R(6) + 1 + R(6) + 1; const odd = n % 2 === 1;
            win = (arg === 'odd') === odd ? bet : -bet;
            text = `홀짝 — ${n} (${odd ? '홀' : '짝'})! ${win > 0 ? '맞혔다' : '틀렸다'}`;
        } else if (arg === 'die') {
            const g = Number(await askInput(TITLE, '1~6 중 하나', String(R(6) + 1)));
            if (!(g >= 1 && g <= 6)) return;
            const n = R(6) + 1;
            win = n === g ? bet * 4 : -bet;
            text = `주사위 — ${n}! (고른 숫자 ${g}) ${n === g ? '적중' : '빗나감'}`;
        } else if (arg === 'rps') {
            const H = ['가위', '바위', '보'];
            const me = Number(await askInput(TITLE, '1 가위 · 2 바위 · 3 보', String(R(3) + 1))) - 1;
            if (!(me >= 0 && me <= 2)) return;
            const op = R(3);
            const r = (me - op + 3) % 3; // 1 = 이김, 2 = 짐
            win = r === 1 ? bet : r === 2 ? -bet : 0;
            text = `가위바위보 — 나 ${H[me]} vs 상대 ${H[op]}: ${r === 1 ? '이김' : r === 2 ? '짐' : '비김'}`;
        } else if (arg === 'lotto') {
            const x = R(100);
            win = x === 0 ? bet * 49 : x < 11 ? bet * 2 : -bet;
            text = `복권 — ${x === 0 ? '🎉 1등 당첨!' : x < 11 ? '소소하게 당첨' : '꽝'}`;
        }
        ui.game = { text: `${text} (${win >= 0 ? '+' : '−'}${fmtNum(Math.abs(win))} ${w.currency})`, win: win > 0 };
        if (!win) { app.renderPanel(el); return; }
        await addAdjust({ ops: [['cash', `${win > 0 ? '+' : '-'}${Math.abs(win)}`]], label: `🎲 ${text} ${win > 0 ? '+' : '−'}${fmtNum(Math.abs(win))} ${w.currency}` });
    },
};
