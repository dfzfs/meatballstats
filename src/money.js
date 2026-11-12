// 💰 재산: 소지금 · 환율 · 소지품(사용 효과) · 물가표 · 일거리 · 정기 수입/지출 · 빚
import { app, ctx, settings, getMeta, modOn, esc, short, clone, findBy, norm, clamp, num, fmtNum, splitBar, nextTime, dateStr, dayIndex, TITLE, EMPTY } from './core.js';
import { addAdjust, commit, priceMul, loanBlocked, LOAN_KIND } from './engine.js';
import { askPrice } from './ai.js';
import { sec, emptyBox, chip, ai1, seg, askInput, askConfirm, busyBtn, insertInput, closeIfPopup } from './kit.js';

export const CURRENCIES = ['원', '달러', '엔', '위안', '유로', '골드', '은화', '동전', '베리', '냥', '전', '크레딧', '젬', '루비'];
const EVERY = { day: '매일', week: '매주', month: '매달' };

// 큰 금액을 읽기 쉽게: 12,500,000 → 1,250만
function bigNum(n) {
    const v = Math.round(n);
    if (Math.abs(v) >= 1e8) return `${fmtNum(Math.round(v / 1e6) / 100)}억`;
    if (Math.abs(v) >= 1e4) return `${fmtNum(Math.round(v / 1e2) / 100)}만`;
    return fmtNum(v);
}
export const fxText = (w, amount) => (w?.fx?.rate && w.fx.unit ? `≈ ${bigNum(amount * w.fx.rate)} ${w.fx.unit}` : '');

function dueText(s, l) {
    const c = s.data.calendar;
    if (l.due === null || !c) return '';
    const left = l.due - dayIndex(c);
    return left >= 0 ? `D-${left}` : `${-left}일 연체`;
}

export function walletView(s, d, ui) {
    const fx = fxText(d, d.cash);
    const mul = priceMul(s);
    const open = d.loans.filter(l => l.status === 'open' || l.status === 'late');
    const done = d.loans.filter(l => l.status === 'paid' || l.status === 'lost').slice(-5);
    const cal = s.data.calendar;
    return `<div class="ss-cashbox"><i class="fa-solid fa-coins"></i><div><small>소지금</small><b>${fmtNum(d.cash)} <span>${esc(d.currency)}</span></b>${fx ? `<small class="ss-dim">${esc(fx)}</small>` : ''}</div>
            <div class="ss-row-btns"><button class="ss-btn sm" data-act="cashedit"><i class="fa-solid fa-pen"></i> 수정</button><button class="ss-btn sm ghost" data-act="mcur" title="화폐 · 환율"><i class="fa-solid fa-money-bill-transfer"></i></button></div></div>
        ${mul !== 1 ? `<div class="ss-callout warn"><i class="fa-solid fa-hat-wizard"></i><div><b>물가 ${mul > 1 ? '+' : ''}${Math.round((mul - 1) * 100)}%</b><span>저주·축복 때문에 상점 가격이 달라요</span></div></div>` : ''}
        ${sec(`소지품 <small>${d.items.length}</small>`, `<div class="ss-stack">${d.items.map(i => `<div class="ss-item"><div class="ss-item-b"><b>${esc(i.name)}${i.qty > 1 ? ` <em>×${i.qty}</em>` : ''}</b>${i.desc ? `<small>${esc(i.desc)}</small>` : ''}${i.effect ? `<small class="ss-eff"><i class="fa-solid fa-wand-sparkles"></i> ${esc(i.effect)}</small>` : ''}</div>
            <div class="ss-item-a"><button class="ss-btn sm" data-act="${i.effect ? 'useitem' : 'use'}" data-arg="${esc(i.name)}">사용</button>${app.sellPrice?.(s, i.name) ? `<button class="ss-btn sm ghost" data-act="sell" data-arg="${esc(i.name)}">판매 ${fmtNum(app.sellPrice(s, i.name))}</button>` : ''}<button class="ss-ib" data-act="dec" data-arg="${esc(i.name)}" title="하나 버리기"><i class="fa-solid fa-minus"></i></button></div></div>`).join('') || emptyBox('소지품이 없어요', 'fa-box-open')}</div>`)}
        ${sec('물가', `<div class="ss-ask"><input class="ss-in ss-price-q" placeholder="이 세계에서 ○○ 사려면 얼마?" value="${esc(ui.priceQ ?? '')}"><button class="ss-btn" data-act="mprice">${ai1} 묻기</button></div>
            ${ui.priceA ? `<div class="ss-card ss-answer"><p class="ss-pre">${esc(ui.priceA.text)}</p>${ui.priceA.item && ui.priceA.price ? `<button class="ss-btn sm ghost" data-act="mpriceadd"><i class="fa-solid fa-plus"></i> 물가표에 「${esc(ui.priceA.item)} ${fmtNum(ui.priceA.price)}」 추가</button>` : ''}</div>` : ''}
            ${d.prices.length ? `<div class="ss-prices">${d.prices.map(p => `<div><span>${esc(p.name)}</span><b>${fmtNum(p.price)}</b>${fxText(d, p.price) ? `<small>${esc(fxText(d, p.price))}</small>` : ''}</div>`).join('')}</div>` : '<p class="ss-hint">물가표가 비어 있어요. ✏️ 편집이나 ✨ AI로 수정에서 채울 수 있어요.</p>'}`)}
        ${d.jobs.length ? sec('일거리', `<div class="ss-stack">${d.jobs.map((j, k) => `<div class="ss-item"><div class="ss-item-b"><b>${esc(j.name)}</b><small>일당 ${fmtNum(j.pay)} ${esc(d.currency)}${j.effect ? ` · ${esc(j.effect)}` : ''}</small></div>
            <div class="ss-item-a"><button class="ss-btn sm pri" data-act="mwork" data-arg="${k}"><i class="fa-solid fa-person-digging"></i> 일하기</button></div></div>`).join('')}</div>`) : ''}
        ${d.regular.length ? sec('정기 수입 · 지출', `<div class="ss-stack">${d.regular.map(r => `<div class="ss-reg ${r.amount < 0 ? 'neg' : 'pos'}"><span>${esc(r.name)}</span><small>${EVERY[r.every]}</small><b>${r.amount >= 0 ? '+' : '−'}${fmtNum(Math.abs(r.amount))}</b></div>`).join('')}</div>
            <p class="ss-hint">${cal ? '날짜가 지나면 자동으로 들어오고 나가요.' : '달력 칸을 켜면 날짜에 맞춰 자동으로 들어오고 나가요.'}</p>`) : ''}
        ${sec('빚', `${open.map(l => `<div class="ss-loan ${l.status}"><i class="fa-solid ${LOAN_KIND[l.kind].icon}"></i><div><b>${esc(l.lender)} ${fmtNum(l.owed)} ${esc(d.currency)}</b><small>빌린 돈 ${fmtNum(l.principal)}${l.item ? ` · 맡긴 것: ${esc(l.item)}` : ''}${dueText(s, l) ? ` · ${dueText(s, l)}` : ''}</small></div>
                <button class="ss-btn sm ${d.cash >= l.owed ? 'pri' : ''}" data-act="mrepay" data-arg="${esc(l.id)}" ${d.cash >= l.owed ? '' : 'disabled'}>갚기</button></div>`).join('') || '<p class="ss-hint">빚이 없어요.</p>'}
            ${done.length ? `<details class="ss-arc"><summary>지난 빚 ${done.length}개</summary><ul>${done.map(l => `<li>${esc(l.lender)} ${fmtNum(l.owed)} <small>${l.status === 'paid' ? '갚음' : '맡긴 물건 잃음'}</small></li>`).join('')}</ul></details>` : ''}
            <button class="ss-btn ghost" data-act="mloan"><i class="fa-solid fa-hand-holding-dollar"></i> 급전 구하기</button>`)}`;
}

const curState = () => app.current?.state;
export const MONEY_ACTIONS = {
    useitem: (el, arg, btn, s) => {
        const it = findBy(s.data.wallet.items, arg); if (!it) return;
        return addAdjust({ ops: [['_effect', it.effect], ['item', `-${it.name} 1`]], label: `${it.name} 사용 (${it.effect})` });
    },
    mcur: async (el, arg, btn, s) => {
        const w = s.data.wallet;
        const box = document.createElement('div');
        box.className = 'ss-root ss-scope ss-menu';
        box.innerHTML = `<h3><i class="fa-solid fa-money-bill-transfer"></i> 화폐 · 환율</h3>
            <p class="ss-hint">화폐 이름만 바뀌고 금액은 그대로예요.</p>
            <div class="ss-chips">${CURRENCIES.map(c => `<button class="ss-chip btn ${c === w.currency ? 'hi' : ''}" data-c="${esc(c)}">${esc(c)}</button>`).join('')}</div>
            <label class="ss-f"><span>직접 입력</span><input class="ss-in ss-cur" value="${esc(w.currency)}"></label>
            <label class="ss-f"><span>환율 — 이 화폐 1이 현실에서 얼마? (0이면 표시 안 함)</span><div class="ss-inline"><input class="ss-in ss-rate" type="number" min="0" step="any" value="${w.fx.rate || ''}" placeholder="예: 1000"><input class="ss-in ss-unit" value="${esc(w.fx.unit || '원')}" placeholder="원"></div></label>`;
        box.addEventListener('click', (e) => { const b = e.target.closest('[data-c]'); if (b) { box.querySelector('.ss-cur').value = b.dataset.c; box.querySelectorAll('[data-c]').forEach(x => x.classList.toggle('hi', x === b)); } });
        const ok = await app.popup(box, { okButton: '저장', cancelButton: '취소' });
        if (!ok) return;
        const nd = clone(curState().data.wallet);
        nd.currency = box.querySelector('.ss-cur').value.trim() || nd.currency;
        nd.fx = { unit: box.querySelector('.ss-unit').value.trim(), rate: Math.max(0, num(box.querySelector('.ss-rate').value, 0)) };
        await commit('wallet', nd, nd.currency !== w.currency ? `화폐 → ${nd.currency}` : '');
    },
    mprice: async (el, arg, btn, s) => {
        const q = el.querySelector('.ss-price-q')?.value.trim(); if (!q) return;
        const ui = el._ss.ui; ui.priceQ = q;
        busyBtn(btn, true, '물어보는 중…');
        try { ui.priceA = await askPrice(q, s); } catch (e) { toastr.error(`실패: ${esc(e.message)}`, TITLE); }
        busyBtn(btn, false);
        app.renderPanel(el);
    },
    mpriceadd: async (el, arg, btn, s) => {
        const a = el._ss.ui.priceA; if (!a?.item) return;
        const nd = clone(s.data.wallet);
        const ex = findBy(nd.prices, a.item);
        if (ex) ex.price = a.price; else nd.prices.push({ name: a.item, price: a.price });
        el._ss.ui.priceA = null;
        await commit('wallet', nd, '');
    },
    mwork: (el, arg, btn, s) => {
        const j = s.data.wallet.jobs[Number(arg)]; if (!j) return;
        const ops = [['cash', `+${j.pay}`]];
        if (j.effect) ops.push(['_effect', j.effect]);
        if (s.data.calendar && modOn('calendar')) ops.push(['time', nextTime(s.data.calendar)]);
        return addAdjust({ ops, label: `${j.name}(으)로 일했다 +${fmtNum(j.pay)} ${s.data.wallet.currency}` });
    },
    mrepay: async (el, arg, btn, s) => {
        const l = s.data.wallet.loans.find(x => x.id === arg); if (!l) return;
        if (!(await askConfirm(`${esc(l.lender)} 빚 ${fmtNum(l.owed)} ${esc(s.data.wallet.currency)}을(를) 갚을까요?`))) return;
        return addAdjust({ ops: [['_repay', l.id]], label: `${l.lender} 빚을 갚았다 −${fmtNum(l.owed)} ${s.data.wallet.currency}` });
    },
    mloan: async (el, arg, btn, s) => {
        const w = s.data.wallet;
        const blocked = loanBlocked(s);
        const box = document.createElement('div');
        box.className = 'ss-root ss-scope ss-menu';
        const opt = (k) => { const K = LOAN_KIND[k]; const off = k === 'bank' && blocked; return `<button class="ss-btn wide ${off ? '' : ''}" data-k="${k}" ${off ? 'disabled' : ''}><i class="fa-solid ${K.icon}"></i> ${K.name} — 이자 ${K.rate}% · ${K.days}일 안에${off ? ' (신용불량이라 거절)' : ''}</button>`; };
        box.innerHTML = `<h3><i class="fa-solid fa-hand-holding-dollar"></i> 급전 구하기</h3>
            <p class="ss-hint">기한을 넘기면 은행·사채는 <b>신용불량</b> 저주가 걸리고, 전당포는 맡긴 물건을 잃어요.</p>
            <label class="ss-f"><span>얼마나? (${esc(w.currency)})</span><input class="ss-in ss-amt" type="number" min="1" value="${Math.max(10, Math.round(w.prices[0]?.price * 10 || 1000))}"></label>
            ${w.items.length ? `<label class="ss-f"><span>전당포에 맡길 물건</span><select class="ss-in ss-pawn">${w.items.map(i => `<option>${esc(i.name)}</option>`).join('')}</select></label>` : ''}
            ${['bank', 'shark', ...(w.items.length ? ['pawn'] : [])].map(opt).join('')}`;
        let pick = null;
        box.addEventListener('click', (e) => { const b = e.target.closest('[data-k]'); if (b && !b.disabled) { pick = b.dataset.k; box.closest('dialog')?.querySelector('.popup-button-ok')?.click(); } });
        await app.popup(box);
        if (!pick) return;
        const amount = Math.round(num(box.querySelector('.ss-amt').value, 0));
        if (!(amount > 0)) return;
        const item = pick === 'pawn' ? box.querySelector('.ss-pawn')?.value ?? '' : '';
        const K = LOAN_KIND[pick];
        return addAdjust({ ops: [['_loan', `${pick}|${amount}|${item}`]], label: `${K.name}에서 ${fmtNum(amount)} ${w.currency}을(를) 빌렸다 (${K.days}일 안에 ${fmtNum(Math.round(amount * (1 + K.rate / 100)))} 갚기${item ? ` · ${item} 맡김` : ''})` });
    },
};
