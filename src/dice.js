// 🎲 주사위: 판정 계산 · 화면 · 굴림 애니메이션
import { app, esc, findBy, clamp, num, rand, DIFFS, diffOf, getMeta } from './core.js';
import { addAdjust } from './engine.js';
import { sec, emptyBox, insertInput, closeIfPopup } from './kit.js';

export const DCS = {
    d20: [['쉬움', 8], ['보통', 12], ['어려움', 15], ['매우 어려움', 18], ['극한', 22]],
    d100: [['쉬움', 75], ['보통', 55], ['어려움', 35], ['매우 어려움', 20], ['극한', 8]],
};
const RES = { crit: '대성공', ok: '성공', fail: '실패', fumble: '대실패', info: '' };
const shift = () => DIFFS[diffOf()] ?? DIFFS.normal;

// 실제 목표값 (난이도 보정 포함)
function target(sys, dc, mod) {
    const sh = shift();
    if (sys === 'd100') return clamp(num(dc, 55) + mod * 5 + sh.pct, 1, 99);
    return num(dc, 12) + sh.dc; // d20: roll+mod >= 이 값
}
export function chance(sys, dc, mod) {
    if (sys === 'd100') { const t = target(sys, dc, mod); return t / 100; }
    const t = target(sys, dc, mod);
    let ok = 1; // 20은 늘 성공
    for (let k = 2; k <= 19; k++) if (k + mod >= t) ok++;
    return ok / 20;
}
export function doRoll(s, D) {
    const dc = s.data.dice;
    const a = findBy(s.data.stats?.attrs ?? [], D.attr);
    const mod = (a?.val ?? 0) + num(D.extra, 0);
    const label = D.label || a?.name || '판정';
    const sh = shift();
    let roll, cls, detail;
    if (dc.system === 'd100') {
        const t = target('d100', D.dc, mod);
        roll = rand(100);
        cls = roll <= Math.min(5, t) ? 'crit' : roll >= 96 ? 'fumble' : roll <= t ? 'ok' : 'fail';
        detail = `d100 ${roll} / 목표 ${t}%`;
    } else {
        roll = rand(20);
        const total = roll + mod;
        const t = target('d20', D.dc, mod);
        cls = roll === 20 ? 'crit' : roll === 1 ? 'fumble' : total >= t ? 'ok' : 'fail';
        detail = `d20 ${roll}${mod ? `${mod > 0 ? '+' : ''}${mod}=${total}` : ''} vs ${t}`;
    }
    const res = RES[cls];
    const tag = `[판정 · ${label}${a ? `(${a.name} ${a.val >= 0 ? '+' : ''}${a.val})` : ''} · ${detail}${sh.dc || sh.pct ? ` · ${sh.name}` : ''} · ${res}]`;
    return { sys: dc.system, roll, res, cls, label, detail, tag, mod, attr: a ? `${a.name} ${a.val >= 0 ? '+' : ''}${a.val}` : '', extra: num(D.extra, 0), dc: target(dc.system, D.dc, mod), t: Date.now() };
}
export function freeRoll(expr) {
    const m = String(expr).replace(/\s+/g, '').match(/^(\d*)d(\d+)([+-]\d+)?$/i);
    if (!m) return null;
    const n = clamp(parseInt(m[1] || '1', 10), 1, 20), f = clamp(parseInt(m[2], 10), 2, 1000), k = parseInt(m[3] || '0', 10);
    const rolls = Array.from({ length: n }, () => rand(f));
    const total = rolls.reduce((a, b) => a + b, 0) + k;
    const body = `${rolls.join('+')}${k ? (k > 0 ? `+${k}` : k) : ''}`;
    return { sys: 'free', faces: f, rolls, roll: total, res: `${total}`, cls: 'info', label: `${n}d${f}${k ? (k > 0 ? `+${k}` : k) : ''}`, detail: body, tag: `[주사위 · ${n}d${f}${k ? (k > 0 ? `+${k}` : k) : ''} · ${body} = ${total}]`, t: Date.now() };
}

// 주사위 모양 (SVG)
export function dieSVG(sys, face = '?') {
    if (sys === 'd100') return `<svg class="ss-die-svg" viewBox="0 0 100 100"><rect x="8" y="8" width="84" height="84" rx="20" class="body"/><rect x="16" y="16" width="68" height="68" rx="14" class="edge"/><text x="50" y="52" class="num">${esc(face)}</text><text x="50" y="78" class="sub">%</text></svg>`;
    if (sys === 'free') return `<svg class="ss-die-svg" viewBox="0 0 100 100"><rect x="10" y="10" width="80" height="80" rx="16" class="body"/><text x="50" y="52" class="num">${esc(face)}</text></svg>`;
    return `<svg class="ss-die-svg" viewBox="0 0 100 100">
        <polygon class="body" points="50,3 93,27 93,73 50,97 7,73 7,27"/>
        <polygon class="edge" points="50,20 80,70 20,70"/>
        <path class="edge" d="M50 3 L50 20 M93 27 L80 70 M7 27 L20 70 M93 73 L80 70 M7 73 L20 70 M50 97 L80 70 M50 97 L20 70 M50 20 L93 27 M50 20 L7 27"/>
        <text x="50" y="55" class="num">${esc(face)}</text></svg>`;
}

function resultHTML(r) {
    if (!r) return `<div class="ss-dice-res idle"><span>굴려 보세요</span></div>`;
    if (r.sys === 'free') return `<div class="ss-dice-res info"><b>${esc(r.res)}</b><small>${esc(r.label)} · ${esc(r.detail)}</small></div>`;
    return `<div class="ss-dice-res ${r.cls}"><b>${esc(r.res)}</b><small>${esc(r.label)} · ${esc(r.detail)}</small></div>`;
}
function breakdown(r) {
    if (!r || r.sys === 'free') return r?.rolls?.length > 1 ? `<div class="ss-dice-mini">${r.rolls.map(x => `<span>${x}</span>`).join('')}</div>` : '';
    if (r.sys === 'd100') return `<div class="ss-dice-eq"><span class="d">${r.roll}</span><i>≤</i><span class="t">${r.dc}%</span></div>`;
    return `<div class="ss-dice-eq"><span class="d">${r.roll}</span>${r.mod ? `<i>${r.mod > 0 ? '+' : '−'}</i><span class="m">${Math.abs(r.mod)}</span><i>=</i><span class="tot">${r.roll + r.mod}</span>` : ''}<i>vs</i><span class="t">${r.dc}</span></div>`;
}

export function diceView(s, d, ui) {
    const attrs = s.data.stats?.attrs ?? [];
    const sys = d.system;
    const list = DCS[sys];
    if (!ui.dice) {
        const pl = s.pendingRoll?.label ?? '';
        const q = pl ? findBy(d.quick, pl) : null;
        const a = q ? findBy(attrs, q.attr) : attrs.find(x => pl && (pl.includes(x.name) || x.name.includes(pl)));
        ui.dice = { label: pl, attr: a?.name ?? '', dc: s.pendingRoll?.dc || q?.dc || list[1][1], extra: 0 };
    }
    const D = ui.dice;
    const a = findBy(attrs, D.attr);
    const mod = (a?.val ?? 0) + num(D.extra, 0);
    const pct = Math.round(chance(sys, D.dc, mod) * 100);
    const sh = shift();
    const r = D.last;
    return `<div class="ss-dice">
        ${s.pendingRoll ? `<div class="ss-callout warn"><i class="fa-solid fa-bell"></i><div><b>AI가 판정을 요청했어요</b><span>${esc(s.pendingRoll.label)}${s.pendingRoll.dc ? ` · 난이도 ${s.pendingRoll.dc}` : ''}</span></div></div>` : ''}
        <div class="ss-dice-stage ${r ? `res-${r.cls}` : ''}">
            <div class="ss-die" data-sys="${r?.sys ?? sys}">${dieSVG(r?.sys ?? sys, r ? (r.sys === 'free' ? r.roll : r.roll) : sys === 'd100' ? '%' : '20')}</div>
            <div class="ss-dice-side">${resultHTML(r)}${breakdown(r)}</div>
        </div>
        ${r ? `<div class="ss-row-btns"><button class="ss-btn" data-act="rollin"><i class="fa-solid fa-arrow-turn-down"></i> 입력창에 넣기</button><button class="ss-btn pri" data-act="rollsend"><i class="fa-solid fa-paper-plane"></i> 바로 보내기</button></div>` : ''}
        <div class="ss-card ss-dice-form">
            <label class="ss-f wide"><span>무엇을 판정하나요</span><input class="ss-in" data-chg="dice" data-k="label" value="${esc(D.label)}" placeholder="예: 은신, 설득, 자물쇠 따기"></label>
            <div class="ss-f wide"><span>능력치 보정</span><div class="ss-pills">
                <button class="ss-pill ${!D.attr ? 'on' : ''}" data-act="dattr" data-arg="">없음</button>
                ${attrs.map(x => `<button class="ss-pill ${D.attr === x.name ? 'on' : ''}" data-act="dattr" data-arg="${esc(x.name)}">${esc(x.name)} <b>${x.val >= 0 ? '+' : ''}${x.val}</b></button>`).join('')}
            </div></div>
            <div class="ss-f wide"><span>난이도 ${sys === 'd20' ? '(DC)' : '(기본 성공률)'}${sh.dc || sh.pct ? ` <em class="ss-diffnote">${sh.name} ${sys === 'd20' ? (sh.dc > 0 ? `+${sh.dc}` : sh.dc) : (sh.pct > 0 ? `+${sh.pct}%` : `${sh.pct}%`)}</em>` : ''}</span>
                <div class="ss-seg wrap stack">${list.map(([n, v]) => `<button class="${Number(D.dc) === v ? 'on' : ''}" data-act="ddc" data-arg="${v}">${n}<small>${v}${sys === 'd100' ? '%' : ''}</small></button>`).join('')}</div></div>
            <div class="ss-f"><span>추가 보정</span><div class="ss-step"><button data-act="dextra" data-arg="-1">−</button><b>${D.extra > 0 ? '+' : ''}${D.extra}</b><button data-act="dextra" data-arg="1">+</button></div></div>
            <div class="ss-f grow"><span>성공 확률</span><div class="ss-prob"><div class="ss-prob-t"><i style="width:${pct}%"></i></div><b>${pct}%</b></div></div>
        </div>
        <button class="ss-btn pri big ss-rollbtn" data-act="roll"><i class="fa-solid fa-dice-d20"></i> ${sys} 굴리기</button>
        ${d.quick.length ? sec('빠른 판정', `<div class="ss-pills">${d.quick.map((q, i) => `<button class="ss-pill" data-act="quick" data-arg="${i}"><i class="fa-solid fa-bolt"></i> ${esc(q.name)}${q.attr ? ` <small>${esc(q.attr)}</small>` : ''}</button>`).join('')}</div>`) : ''}
        ${sec('자유 굴림', `<div class="ss-pills">${['d4', 'd6', '2d6', 'd8', 'd10', 'd12', 'd20', 'd100'].map(x => `<button class="ss-pill" data-act="freeq" data-arg="${x}">${x}</button>`).join('')}</div>
            <div class="ss-inline"><input class="ss-in ss-free" placeholder="예: 3d6+2" value="${esc(ui.free ?? '')}"><button class="ss-btn" data-act="free">굴리기</button></div>`)}
        ${d.rules ? sec('판정 규칙', `<p class="ss-pre ss-dim">${esc(d.rules)}</p>`) : ''}
        ${sec('기록', d.log.length ? `<div class="ss-log">${d.log.slice(-10).reverse().map(l => `<div class="ss-log-row ${esc(l.cls)}"><i></i><b>${esc(l.res)}</b><span>${esc(l.label)}</span><small>${esc(l.detail)}</small></div>`).join('')}</div>` : emptyBox('아직 굴린 적이 없어요', 'fa-dice'))}
    </div>`;
}

// 굴림 연출: 숫자가 마구 바뀌다가 멈춘다
async function animate(el, r) {
    const stage = el.querySelector('.ss-dice-stage');
    const die = el.querySelector('.ss-die');
    if (!stage || !die) return;
    stage.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    stage.className = 'ss-dice-stage rolling';
    die.dataset.sys = r.sys;
    el.querySelector('.ss-dice-side').innerHTML = '<div class="ss-dice-res idle"><span>굴리는 중…</span></div>';
    const faces = r.sys === 'd100' ? 100 : r.sys === 'free' ? Math.max(2, r.faces ?? 6) * (r.rolls?.length ?? 1) : 20;
    const dur = reduce ? 0 : 900;
    const t0 = performance.now();
    await new Promise(res => {
        const tick = () => {
            const k = performance.now() - t0;
            if (k >= dur) return res();
            die.innerHTML = dieSVG(r.sys, rand(faces));
            setTimeout(tick, 40 + k / 12);
        };
        tick();
    });
    die.innerHTML = dieSVG(r.sys, r.roll);
    stage.className = `ss-dice-stage landed res-${r.cls}`;
}

export const DICE_ACTIONS = {
    dattr: (el, arg) => { el._ss.ui.dice.attr = arg; app.renderPanel(el); },
    ddc: (el, arg) => { el._ss.ui.dice.dc = Number(arg); app.renderPanel(el); },
    dextra: (el, arg) => { const D = el._ss.ui.dice; D.extra = clamp(num(D.extra) + Number(arg), -20, 20); app.renderPanel(el); },
    roll: async (el, arg, btn, s) => {
        const D = el._ss.ui.dice;
        const r = doRoll(s, D);
        await animate(el, r);
        D.last = r;
        el._ss.hold = true; // 기록 저장 중 깜빡임 방지 (저장이 실패해도 화면이 멈추지 않게 finally)
        try { await addAdjust({ ops: [['_roll', JSON.stringify({ res: r.res, cls: r.cls, label: r.label, detail: r.detail })]], silent: true }); } finally { el._ss.hold = false; }
        app.renderPanel(el);
    },
    quick: (el, arg, btn, s) => {
        const q = s.data.dice.quick[Number(arg)]; if (!q) return;
        Object.assign(el._ss.ui.dice, { label: q.name, attr: findBy(s.data.stats?.attrs ?? [], q.attr)?.name ?? '', dc: q.dc || el._ss.ui.dice.dc });
        app.renderPanel(el);
        return DICE_ACTIONS.roll(el, null, null, s);
    },
    freeq: (el, arg) => { el._ss.ui.free = arg; return DICE_ACTIONS.free(el, arg); },
    free: async (el, arg) => {
        const expr = arg && typeof arg === 'string' && /d/.test(arg) ? arg : el.querySelector('.ss-free')?.value.trim();
        el._ss.ui.free = expr;
        const r = freeRoll(expr);
        if (!r) { toastr.warning('형식: 2d6+1, d100 …', '미트볼 상태창'); return; }
        await animate(el, r);
        (el._ss.ui.dice ??= {}).last = r; // 굴리는 동안 다른 탭으로 가도 오류 없이
        el._ss.hold = true;
        try { await addAdjust({ ops: [['_roll', JSON.stringify({ res: r.res, cls: r.cls, label: r.label, detail: r.detail })]], silent: true }); } finally { el._ss.hold = false; }
        app.renderPanel(el);
    },
    rollin: (el) => { const r = el._ss.ui.dice?.last; if (r) { insertInput(r.tag); closeIfPopup(el); } },
    rollsend: (el) => { const r = el._ss.ui.dice?.last; if (r) { insertInput(r.tag, true); el._ss.ui.dice.last = null; closeIfPopup(el); } },
};
export const DICE_CHANGES = {
    dice: (el, t) => { const D = el._ss.ui.dice; D[t.dataset.k] = t.value; },
};
export { getMeta };
