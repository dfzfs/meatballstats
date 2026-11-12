// 🛟 데이터 지키기: 전체 백업 · 세이브 슬롯 · 카드에 상태창 붙이기 · 자가 진단 · 분기 따라가기 · 2회차
import { app, ctx, settings, saveSettings, getMeta, saveMeta, MODULE, DATA_V, VERSION, MOD_IDS, MOD, NORM, normalize, clone, esc, short, fmtNum, uid, TITLE, LOG, stamp, findBy, norm, arr, DIFFS } from './core.js';
import { compute, chatCharacters } from './engine.js';
import { askConfirm, askInput, mascot } from './kit.js';

const CARD_KEY = 'statussim';
const download = (obj, name) => {
    const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
};
const safeName = (t) => String(t || 'world').replace(/[\\/:*?"<>|]/g, '_').slice(0, 40);
const chatLen = () => (ctx().chat ?? []).length;
const lastKey = () => (ctx().chat ?? []).at(-1)?.send_date ?? null;
const curBase = () => { const s = app.current?.state; return s ? { core: clone(s.core), data: clone(s.data), tally: clone(s.tally), days: clone(s.days), day0: s.day0 } : null; };

// ───── 전체 백업 (기록·알림·앨범·세이브까지 이 채팅의 상태창 전부) ─────
export function fullBackup() {
    const meta = getMeta();
    if (!meta?.base) { toastr.info('백업할 상태창이 없어요.', TITLE); return; }
    download({ statussim: VERSION, kind: 'full', v: DATA_V, chat: ctx().getCurrentChatId?.() ?? '', t: Date.now(), meta: clone(meta) }, `statussim_backup_${safeName(meta.base.core?.title)}_${new Date().toISOString().slice(0, 10)}.json`);
    meta.lastBackup = Date.now(); saveMeta();
    toastr.success('이 채팅의 상태창을 파일로 백업했어요.', TITLE);
}
// 파일 불러오기: 전체 백업이면 통째로, 템플릿(내보내기)이면 처음 상태로
export function restoreFile(setBase) {
    const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.json,application/json';
    inp.onchange = async () => {
        try {
            const obj = JSON.parse(await inp.files[0].text());
            if (obj.kind === 'full' && obj.meta?.base) {
                if (!(await askConfirm(`백업 파일로 이 채팅의 상태창을 통째로 바꿀까요?<br><small>${esc(obj.meta.base.core?.title ?? '')} · ${new Date(obj.t).toLocaleString('ko-KR')}</small>`))) return;
                const m = clone(obj.meta);
                if ((m.startAt ?? 0) > chatLen()) { m.startAt = chatLen(); m.startKey = lastKey(); } // 다른 채팅에 넣을 때: 지금부터 이어서
                m.adjust = arr(m.adjust).filter(a => (a.at ?? 0) <= chatLen());
                m.chatId = ctx().getCurrentChatId?.() ?? null;
                ctx().chatMetadata[MODULE] = m;
                getMeta(); // 옛 버전 백업이면 여기서 변환
                await saveMeta(true); app.refreshNow();
                toastr.success('백업에서 되살렸어요.', TITLE);
                return;
            }
            if (!obj.base) throw new Error('상태창 파일이 아니에요');
            await setBase(obj.base, obj.mods, obj.difficulty);
            toastr.success('가져왔어요.', TITLE);
        } catch (e) { toastr.error(esc(e.message), TITLE); }
    };
    inp.click();
}

// ───── 세이브 슬롯 ─────
const SLOT_MAX = 5;
export async function saveSlot() {
    const meta = getMeta(); const s = app.current?.state;
    if (!meta?.base || !s) return;
    const manual = arr(meta.saves).filter(x => !x.auto);
    const name = await askInput(TITLE, `세이브 이름 (예: 고백 직전) — 최대 ${SLOT_MAX}개${manual.length >= SLOT_MAX ? ' · 가장 오래된 것이 지워져요' : ''}`, `${stamp(s) || `${s.turn}턴`}`);
    if (name === null) return;
    const slot = { id: uid(), name: short(name || '세이브', 30), t: Date.now(), when: stamp(s), at: chatLen(), key: lastKey(), turn: s.turn, base: curBase(), baseTurn: s.turn, mods: { ...meta.mods }, difficulty: meta.difficulty, cash: s.data.wallet?.cash ?? null, cur: s.data.wallet?.currency ?? '', here: s.data.map?.here ?? '' };
    meta.saves = [...arr(meta.saves).filter(x => x.auto), ...manual.slice(-(SLOT_MAX - 1)), slot];
    await saveMeta(true);
    app.rerenderPanels?.();
    toastr.success(`「${esc(slot.name)}」 저장했어요.`, TITLE);
}
export async function loadSlot(id) {
    const meta = getMeta();
    const slot = arr(meta?.saves).find(x => x.id === id);
    if (!slot) return;
    if (!(await askConfirm(`「${esc(slot.name)}」 상태로 돌아갈까요?<br><small>채팅 글은 그대로 두고, 상태창만 그때로 바꿔서 지금부터 이어 가요. (지금 상태는 자동 세이브로 남겨 둘게요)</small>`))) return;
    autoSaveNow(meta, '불러오기 전');
    if (slot.auto) { // 자동 세이브 = 그때의 기록 전체
        Object.assign(meta, { base: clone(slot.base), baseTurn: slot.baseTurn ?? 0, startAt: Math.min(slot.at ?? 0, chatLen()), startKey: slot.key ?? null, adjust: clone(slot.adjust ?? []).filter(a => a.at <= chatLen()) });
    } else {
        Object.assign(meta, { base: clone(slot.base), baseTurn: slot.baseTurn ?? 0, startAt: chatLen(), startKey: lastKey(), adjust: [] });
    }
    if (slot.mods) meta.mods = { ...meta.mods, ...slot.mods };
    if (slot.difficulty) meta.difficulty = slot.difficulty;
    await saveMeta(true); app.refreshNow();
    toastr.success('돌아왔어요.', TITLE);
}
export async function deleteSlot(id) {
    const meta = getMeta();
    const slot = arr(meta?.saves).find(x => x.id === id);
    if (!slot || !(await askConfirm(`「${esc(slot.name)}」 세이브를 지울까요?`))) return;
    meta.saves = meta.saves.filter(x => x.id !== id);
    await saveMeta(true); app.rerenderPanels?.();
}
function autoSaveNow(meta, name = '자동 세이브') {
    if (!meta?.base) return;
    meta.saves = [...arr(meta.saves).filter(x => !x.auto), ...arr(meta.saves).filter(x => x.auto).slice(-1), { id: uid(), auto: true, name, t: Date.now(), at: meta.startAt ?? 0, key: meta.startKey ?? null, base: clone(meta.base), baseTurn: meta.baseTurn ?? 0, adjust: clone(meta.adjust ?? []), mods: { ...meta.mods }, difficulty: meta.difficulty }];
}
export function slotsHTML(meta) {
    const list = [...arr(meta.saves)].reverse();
    return `<div class="ss-row-btns"><button class="ss-btn pri sm" data-act="slotsave"><i class="fa-solid fa-floppy-disk"></i> 지금 세이브</button></div>
        <div class="ss-stack ss-slots">${list.map(x => `<div class="ss-item ss-slot-row ${x.auto ? 'auto' : ''}"><div class="ss-item-b"><b>${x.auto ? '<i class="fa-solid fa-clock-rotate-left"></i> ' : ''}${esc(x.name)}</b><small>${esc(x.when || '')}${x.here ? ` · 📍${esc(x.here)}` : ''}${x.cash !== null && x.cash !== undefined ? ` · ${fmtNum(x.cash)} ${esc(x.cur)}` : ''} · ${new Date(x.t).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</small></div>
            <div class="ss-item-a"><button class="ss-btn sm" data-act="slotload" data-arg="${esc(x.id)}">불러오기</button><button class="ss-ib" data-act="slotdel" data-arg="${esc(x.id)}" title="지우기"><i class="fa-solid fa-trash-can"></i></button></div></div>`).join('') || '<div class="ss-hint">세이브가 없어요. 중요한 장면 앞에서 눌러 두세요.</div>'}</div>
        <p class="ss-hint">수동 세이브 최대 ${SLOT_MAX}개 · <i class="fa-solid fa-clock-rotate-left"></i> 자동 세이브는 오래된 기록을 정리할 때 · 분기 · 불러오기 전에 저절로 생겨요 (최근 2개).</p>`;
}

// ───── 카드에 상태창 붙이기 (제작자용 · 새 채팅에서 바로 불러오기) ─────
export const cardPack = () => { const ch = chatCharacters(); return ch.length === 1 ? ch[0]?.data?.extensions?.[CARD_KEY] ?? null : null; };
export async function attachToCard() {
    const c = ctx(); const meta = getMeta();
    if (c.groupId) { toastr.warning('그룹 채팅에서는 카드에 붙일 수 없어요. 1:1 채팅에서 해 주세요.', TITLE); return; }
    if (!meta?.base || c.characterId === undefined || c.characterId === null) return;
    if (!c.writeExtensionField) { toastr.error('이 실리태번 버전은 카드에 저장할 수 없어요. 「내보내기」 파일을 같이 배포해 주세요.', TITLE); return; }
    const hasOrigin = !!meta.origin;
    const el = document.createElement('div');
    el.className = 'ss-root ss-scope';
    el.innerHTML = `<div class="ss-wz-head"><i class="fa-solid fa-id-card-clip"></i><div><b>카드에 상태창 붙이기</b><small>이 카드로 새 채팅을 열면 「불러올까요?」라고 물어봐요 (AI 호출 없음)</small></div></div>
        <p class="ss-hint">카드를 내보내서 배포하면 받은 사람도 같은 상태창으로 바로 시작해요. 시뮬봇 제작자에게 추천!</p>
        <div class="ss-seg wrap stack">${hasOrigin ? '<button class="on" data-v="origin">처음 만든 상태<small>진행 전 깨끗한 상태 (배포용 추천)</small></button>' : ''}<button class="${hasOrigin ? '' : 'on'}" data-v="now">지금 상태<small>지금까지 진행한 내용 포함</small></button></div>`;
    el.addEventListener('click', (e) => { const b = e.target.closest('[data-v]'); if (!b) return; el.querySelectorAll('[data-v]').forEach(x => x.classList.toggle('on', x === b)); });
    if (!(await app.confirmPopup(el, '붙이기', '취소'))) return;
    const pick = el.querySelector('[data-v].on')?.dataset.v ?? 'now';
    const base = pick === 'now' || !hasOrigin ? { core: clone(app.current.state.core), data: clone(app.current.state.data) } : clone(meta.origin);
    const pack = { v: DATA_V, version: VERSION, t: Date.now(), title: base.core?.title ?? '', base, mods: { ...meta.mods }, difficulty: meta.difficulty, play: meta.play ?? null };
    if (meta.tr && Object.keys(meta.tr).length) pack.tr = meta.tr; // 화면 번역 사전도 같이 (영어 저장 카드를 받은 사람이 번역 비용 없이 바로 보게)
    await c.writeExtensionField(c.characterId, CARD_KEY, pack);
    toastr.success('카드에 붙였어요. 카드를 내보내면 상태창도 같이 들어가요.', TITLE);
    app.rerenderPanels?.();
}
export async function detachFromCard() {
    const c = ctx();
    if (!cardPack() || !(await askConfirm('카드에 붙인 상태창을 뗄까요? (지금 채팅의 상태창은 그대로예요)'))) return;
    await c.writeExtensionField(c.characterId, CARD_KEY, null);
    toastr.info('뗐어요.', TITLE); app.rerenderPanels?.();
}
export async function loadFromCard(setBase, ask = true) {
    const pack = cardPack();
    if (!pack?.base) return false;
    if (ask && !(await askConfirm(`이 캐릭터 카드에 상태창이 들어 있어요.<br><b>${esc(pack.title || '상태창')}</b> · 기능 ${Object.values(pack.mods ?? {}).filter(v => v !== false).length || MOD_IDS.length}개${pack.difficulty && DIFFS[pack.difficulty] ? ` · ${DIFFS[pack.difficulty].name}` : ''}<br>이 채팅에 불러올까요? <small>(AI 호출 없음)</small>`))) {
        const m = getMeta(true); m.cardAsked = true; await saveMeta(); return false;
    }
    await setBase(pack.base, pack.mods, pack.difficulty, pack.play);
    if (pack.tr && typeof pack.tr === 'object') { const m = getMeta(true); m.tr = { ...pack.tr, ...(m.tr ?? {}) }; await saveMeta(); }
    toastr.success('카드의 상태창을 불러왔어요!', TITLE);
    return true;
}
// 새 채팅을 열었을 때 한 번만 물어본다
export async function offerCard(setBase) {
    if (!settings().enabled) return;
    const meta = getMeta();
    if (meta?.base || meta?.cardAsked || meta?.off) return;
    // 2회차를 준비해 뒀으면 그게 먼저
    const cr = carryFor();
    if (cr) {
        if (await askConfirm(`「${esc(cr.title || '지난 회차')}」에서 이어서 <b>${cr.round}회차</b>로 시작할까요?<br><small>아니요를 누르면 나중에 상태창 화면에서 고를 수 있어요.</small>`)) { await startCarry(setBase); return; }
        const m = getMeta(true); m.cardAsked = true; await saveMeta(); return;
    }
    if (!settings().cardOffer || !cardPack()) return;
    await loadFromCard(setBase, true);
}

// ───── 분기 따라가기: 실리 「분기」로 만든 채팅이면 분기 지점 뒤의 상태창 기록을 정리 ─────
export async function followBranch() {
    const c = ctx(); const meta = getMeta();
    const id = c.getCurrentChatId?.();
    if (!meta?.base || !id) return false;
    if (!meta.chatId) { meta.chatId = id; saveMeta(); return false; }
    if (meta.chatId === id) return false;
    const n = chatLen();
    let fixed = false;
    if ((meta.startAt ?? 0) > n) {
        // 기준점이 분기 지점보다 뒤 → 그 전의 자동 세이브로
        const sv = arr(meta.saves).filter(x => x.auto && (x.at ?? 0) <= n).sort((a, b) => (b.at ?? 0) - (a.at ?? 0))[0];
        if (sv) { Object.assign(meta, { base: clone(sv.base), baseTurn: sv.baseTurn ?? 0, startAt: sv.at ?? 0, startKey: sv.key ?? null, adjust: clone(sv.adjust ?? []) }); fixed = true; }
        else { meta.startAt = n; meta.startKey = c.chat?.at(-1)?.send_date ?? null; }
    }
    const before = arr(meta.adjust).length;
    meta.adjust = arr(meta.adjust).filter(a => (a.at ?? 0) <= n);
    if (meta.adjust.length !== before) fixed = true;
    meta.notes = arr(meta.notes).slice(); // 알림함은 그대로
    meta.chatId = id;
    await saveMeta(true);
    if (fixed) toastr.info('분기한 채팅이라 상태창을 분기 지점에 맞췄어요.', TITLE);
    return fixed;
}

// ───── 자가 진단 ─────
export async function diagnose() {
    const c = ctx(); const meta = getMeta(); const out = []; const fix = [];
    if (!meta) { out.push('이 채팅에는 상태창 데이터가 없어요.'); return show(out, fix); }
    if (meta.off) { meta.off = false; fix.push('이 채팅에서 꺼져 있던 상태창을 켰어요.'); }
    if (!meta.base) out.push('상태창이 아직 만들어지지 않았어요 → 「만들기」를 눌러 주세요.');
    else {
        if (!meta.base.core || typeof meta.base.core !== 'object') { meta.base.core = NORM.core({}); fix.push('세계 정보가 비어 있어서 새로 채웠어요.'); }
        meta.base.data ??= {};
        for (const id of MOD_IDS) {
            const d = meta.base.data[id];
            if (d === undefined) { meta.base.data[id] = null; continue; }
            if (d === null) continue;
            if (typeof d !== 'object' || Array.isArray(d)) { meta.base.data[id] = null; fix.push(`「${MOD[id].name}」 칸이 망가져서 비웠어요 (다시 채울 수 있어요).`); continue; }
            try { meta.base.data[id] = normalize(id, d); } catch { meta.base.data[id] = null; fix.push(`「${MOD[id].name}」 칸이 망가져서 비웠어요 (다시 채울 수 있어요).`); }
        }
    }
    const adj = arr(meta.adjust);
    const good = adj.filter(a => a && typeof a === 'object' && Number.isFinite(Number(a.at)) && Number.isFinite(Number(a.t)) && (!a.ops || Array.isArray(a.ops)));
    if (good.length !== adj.length) { meta.adjust = good; fix.push(`망가진 편집 기록 ${adj.length - good.length}개를 지웠어요.`); }
    const n = chatLen();
    if ((meta.startAt ?? 0) > n) { meta.startAt = n; meta.startKey = c.chat?.at(-1)?.send_date ?? null; fix.push('기준 메시지가 채팅보다 뒤에 있어서 맞췄어요.'); }
    if (!meta.mods || typeof meta.mods !== 'object') { meta.mods = {}; fix.push('기능 켜기/끄기 설정을 되살렸어요.'); }
    // 메시지 서랍
    let drawers = 0;
    for (const m of c.chat ?? []) {
        const b = m?.extra?.[MODULE]?.bySwipe;
        if (b && typeof b === 'object') for (const k of Object.keys(b)) if (!Array.isArray(b[k])) { delete b[k]; drawers++; }
    }
    if (drawers) { fix.push(`답에 붙은 망가진 변화 기록 ${drawers}개를 지웠어요.`); await c.saveChat?.(); }
    // 계산해 보기 — 실패하면 최근 편집부터 하나씩 빼 본다
    if (meta.base) {
        let ok = false, dropped = 0;
        for (let k = 0; k < 30 && !ok; k++) {
            try { compute(); ok = true; } catch (e) {
                console.warn(LOG, 'diagnose compute', e);
                if (!meta.adjust.length) break;
                meta.adjust.pop(); dropped++;
            }
        }
        if (dropped && ok) fix.push(`계산을 막던 최근 편집 ${dropped}개를 지웠어요.`);
        if (!ok) out.push('계산이 계속 실패해요. 「전체 백업」 파일을 만들어 제작자에게 보내 주세요.');
        else out.push('상태 계산 ✔');
    }
    const set = settings();
    for (const [k, lo, hi] of [['sceneTurns', 1, 40], ['injectDepth', 0, 20], ['toastSec', 2, 20], ['deltaEvery', 2, 20], ['genParallel', 1, 8]]) {
        const v = Number(set[k]);
        if (!Number.isFinite(v) || v < lo || v > hi) { set[k] = Math.min(hi, Math.max(lo, Number.isFinite(v) ? v : lo)); fix.push(`설정 「${k}」 값을 고쳤어요.`); }
    }
    saveSettings();
    if (set.autoRegex && !(c.extensionSettings.regex ?? []).some(x => x.id === 'b7c1a0e2-5a1d-4f0e-9a51-55a1a0c05501')) { app.installRegex?.(false); fix.push('<meatball> 숨김 정규식을 다시 설치했어요.'); }
    meta.v = DATA_V;
    await saveMeta(true);
    app.refreshNow();
    if (!document.getElementById('ss-hud') && set.showHud) out.push('채팅 위 HUD가 안 보이면 페이지를 새로고침(F5) 해 주세요.');
    return show(out, fix);
}
async function show(out, fix) {
    const bad = out.some(x => /실패|제작자/.test(x));
    const html = `<div class="ss-root ss-scope"><div class="ss-wz-head">${mascot(bad ? 'sad' : fix.length ? 'happy' : 'idle', 'sm') || '<i class="fa-solid fa-stethoscope"></i>'}<div><b>자가 진단</b><small>v${VERSION}</small></div></div>
        ${fix.length ? `<section class="ss-sec"><div class="ss-sec-h"><h4>고친 것 ${fix.length}</h4></div><ul class="ss-diag">${fix.map(x => `<li>🔧 ${esc(x)}</li>`).join('')}</ul></section>` : '<p class="ss-hint">고칠 게 없었어요.</p>'}
        <ul class="ss-diag">${out.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>`;
    await ctx().Popup.show.text(TITLE, html);
    return { out, fix };
}

// ───── 2회차: 지금 회차에서 이어받을 것 고르기 → 같은 캐릭터 새 채팅에서 시작 ─────
const avatarKey = () => { const ch = chatCharacters(); return ch.length === 1 ? String(ch[0].avatar ?? ch[0].name ?? '') : ''; };
export const carryFor = () => { const k = avatarKey(); return k ? settings().carry?.[k] ?? null : null; };
export async function prepareCarry() {
    const meta = getMeta(); const s = app.current?.state;
    const key = avatarKey();
    if (!meta?.base || !s || !key) { toastr.warning('1:1 채팅에서만 2회차를 준비할 수 있어요.', TITLE); return; }
    const el = document.createElement('div');
    el.className = 'ss-root ss-scope';
    const w = s.data.wallet;
    el.innerHTML = `<div class="ss-wz-head"><i class="fa-solid fa-clapperboard"></i><div><b>2회차 준비</b><small>이어받을 것을 고르고, 같은 캐릭터로 새 채팅을 열면 시작할 수 있어요</small></div></div>
        <div class="ss-pills">
            <label class="ss-tog"><input type="checkbox" class="ss-switch" data-c="ach" checked><span>업적 · 본 엔딩</span></label>
            ${w ? `<label class="ss-tog"><input type="checkbox" class="ss-switch" data-c="items"><span>소지품 ${w.items.length}개</span></label>
            <label class="ss-tog"><input type="checkbox" class="ss-switch" data-c="cash"><span>돈 10% (${fmtNum(Math.floor(w.cash * 0.1))} ${esc(w.currency)})</span></label>` : ''}
            ${s.data.rel ? '<label class="ss-tog"><input type="checkbox" class="ss-switch" data-c="rel"><span>관계 수치 절반 (어렴풋한 기억)</span></label>' : ''}
            <label class="ss-tog"><input type="checkbox" class="ss-switch" data-c="memo" checked><span>「지난 회차」 메모 남기기</span></label>
        </div>
        <p class="ss-hint">세계·지도·상점은 <b>처음 만든 상태</b>${meta.origin ? '' : ' (없으면 지금 상태)'}로 다시 시작해요.</p>`;
    if (!(await app.confirmPopup(el, '준비하기', '취소'))) return;
    const pick = Object.fromEntries([...el.querySelectorAll('[data-c]')].map(i => [i.dataset.c, i.checked]));
    const tmpl = meta.origin ? clone(meta.origin) : { core: clone(s.core), data: clone(s.data) };
    settings().carry = { ...(settings().carry ?? {}), [key]: {
        t: Date.now(), title: s.core.title, template: tmpl, mods: { ...meta.mods }, difficulty: meta.difficulty, play: meta.play ?? null, round: (meta.round ?? 1) + 1,
        ach: pick.ach ? (s.data.ach?.list ?? []).filter(a => a.done).map(a => a.name) : [], endings: pick.ach ? (s.data.ach?.endings ?? []).filter(e => e.done).map(e => e.name) : [],
        items: pick.items && w ? clone(w.items) : [], cash: pick.cash && w ? Math.floor(w.cash * 0.1) : 0,
        rel: pick.rel && s.data.rel ? s.data.rel.user.map(r => ({ name: r.name, aff: Math.round(r.aff / 2), trust: Math.round(r.trust / 2) })) : [],
        memo: !!pick.memo, ended: (s.data.ach?.endings ?? []).filter(e => e.done).map(e => e.name).join(', '),
    } };
    saveSettings();
    toastr.success('2회차를 준비했어요. 같은 캐릭터로 새 채팅을 열고 「2회차로 시작」을 누르세요.', TITLE);
}
export async function startCarry(setBase) {
    const k = avatarKey(); const cr = carryFor();
    if (!cr) return;
    const base = clone(cr.template);
    const d = base.data ?? {};
    if (d.ach) {
        for (const a of d.ach.list ?? []) if (cr.ach.some(n => norm(n) === norm(a.name))) { a.done = true; a.at = '지난 회차'; }
        for (const e of d.ach.endings ?? []) if (cr.endings.some(n => norm(n) === norm(e.name))) { e.done = true; e.at = '지난 회차'; }
    }
    if (d.wallet) {
        for (const it of cr.items) { const ex = findBy(d.wallet.items, it.name); if (ex) ex.qty += it.qty; else d.wallet.items.push(it); }
        d.wallet.cash = (Number(d.wallet.cash) || 0) + cr.cash;
    }
    if (d.rel) for (const r of cr.rel) { const ex = findBy(d.rel.user, r.name); if (ex) { ex.aff = Math.max(ex.aff, r.aff); ex.trust = Math.max(ex.trust, r.trust); } }
    if (cr.memo) { d.memo ??= { list: [] }; d.memo.list.push({ id: uid(), text: `${cr.round}회차 — 지난 회차의 어렴풋한 기억이 남아 있다${cr.ended ? ` (지난 엔딩: ${cr.ended})` : ''}.`, by: 'user', inject: true, pin: true }); }
    await setBase(base, cr.mods, cr.difficulty, cr.play);
    const meta = getMeta(true); meta.round = cr.round; await saveMeta();
    const c = { ...(settings().carry ?? {}) }; delete c[k]; settings().carry = c; saveSettings();
    toastr.success(`${cr.round}회차를 시작했어요!`, TITLE);
}
