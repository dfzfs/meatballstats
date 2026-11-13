// 🔍 칩 점검 (v2.7.3): AI 답 밑 변동 칩이 안 보일 때 — 「변화를 못 읽었나(씹힘)」 · 「읽었는데 화면에 안 보이나」를 가려내고 손으로 다시 부른다
// AI를 부르지 않는다 (「AI로 다시 분석」을 누를 때만 1회). 진단은 채팅 데이터 · 화면(DOM)만 본다.
import { app, ctx, settings, saveSettings, getMeta, modOn, MOD, MODULE, esc, short, TITLE, isActive, ready } from './core.js';
import { msgOps, opInfo, isStoryAI, hasStatus, extractOps, drawerOps, setDrawer, stashStatus } from './engine.js';
import { choosePopup } from './kit.js';

// 이 답이 왜 건너뛰어졌는지 (OOC · 일시정지 · 다음 1번 건너뛰기 · 조용한 생성) — onReceived에서 적어 둔 것
export const skipOf = (m) => m?.extra?.[MODULE]?.skip?.[m.swipe_id ?? 0] ?? null;
export function markSkip(m, reason) {
    if (!m || m.is_user) return;
    m.extra ??= {}; m.extra[MODULE] ??= {}; m.extra[MODULE].skip ??= {};
    if (reason) m.extra[MODULE].skip[m.swipe_id ?? 0] = reason; else delete m.extra[MODULE].skip[m.swipe_id ?? 0];
}
const SKIP_NAME = { ooc: 'OOC로 보낸 턴', pause: '⏸ 일시정지 중', skip: '「다음 1번 건너뛰기」', quiet: '조용한 생성 (/gen 등)', cont: '건너뛴 답의 이어쓰기' };

// 답 i의 칩 상태 — code: shown · hidden · detached · cardoff · nochange · unknown · notag · malformed · running · failed · skipped · baked · syncoff · none
export function pipDiag(i) {
    const c = ctx(), chat = c.chat ?? [], m = chat[i];
    const set = settings();
    if (!m || !isStoryAI(m)) return { code: 'none', title: 'AI 답이 아니에요' };
    if (!isActive() || !ready() || !app.current) return { code: 'none', title: '이 채팅엔 상태창이 없어요' };
    const meta = getMeta();
    const sid = m.swipe_id ?? 0;
    if (i < (meta?.startAt ?? 0)) return { code: 'baked', title: '오래된 답 — 굳힌 기록 안이에요', text: '긴 채팅 정리로 이 답까지의 변화는 이미 숫자에 합쳐져 있어요. 칩은 안 보여도 반영은 끝났어요.' };
    const sk = skipOf(m);
    if (sk) return { code: 'skipped', title: `건너뛴 답 — ${SKIP_NAME[sk] ?? sk}`, text: '이 답은 상태창 없이 보냈고, 변화도 계산하지 않아요 (일부러 그런 거예요). 이 답의 변화를 넣고 싶으면 「직접 적기」나 「AI로 다시 분석」을 눌러요.', acts: ['analyze', 'edit'] };
    const ops = msgOps(m);
    const snap = app.current.snaps.get(i);
    const run = app.pipState?.get(`${i}:${sid}`);
    if (!ops.length) {
        if (run === 'running') return { code: 'running', title: '따로 분석하는 중…', text: 'AI 답에 <meatball>이 없어서 별도 분석(AI 1회)을 돌리고 있어요. 잠시 뒤 칩이 붙어요.' };
        if (run?.startsWith('failed')) return { code: 'failed', title: '별도 분석이 실패했어요 — 씹혔어요', text: `분석 모델 오류: ${run.slice(7) || '알 수 없음'}. 다시 눌러 보거나 직접 적어요.`, acts: ['analyze', 'edit'] };
        const raw = [m.mes, m.swipes?.[sid], m.extra?.display_text].filter(x => typeof x === 'string').join('\n');
        if (/meatball/i.test(raw)) return { code: 'malformed', title: '태그는 있는데 못 읽었어요 — 씹혔어요', text: `<meatball> 비슷한 글은 보이는데 「키: 값」 줄을 못 찾았어요 (태그가 안 닫혔거나 모양이 달라요). 「태그 다시 읽기」를 눌러 보고, 안 되면 직접 적어요.\n\n${short(raw.slice(Math.max(0, raw.search(/meatball/i) - 20)), 220)}`, acts: ['reread', 'analyze', 'edit'] };
        if (run === 'empty') return { code: 'nochange', title: '분석했는데 바뀐 게 없대요', text: '별도 분석 AI가 이 답에서는 상태 변화가 없다고 했어요.', acts: ['analyze', 'edit'] };
        if (set.sync === 'off') return { code: 'syncoff', title: '자동 반영이 꺼져 있어요', text: '확장 설정 › 「스토리 → 상태창 자동 반영」이 C(끔)이라 AI 답을 읽지 않아요.', acts: ['analyze', 'edit'] };
        return { code: 'notag', title: 'AI가 이번 답에 <meatball>을 안 썼어요 — 씹혔어요', text: set.sync === 'tag' ? '자동 반영이 「A. 태그」만이라 태그를 빼먹은 답은 그냥 넘어가요. 「A+B」로 바꾸면 빠진 답만 따로 분석해요. 지금은 「AI로 다시 분석」(AI 1회) 이나 직접 적기.' : '이 답엔 변화 줄이 없어요. 「AI로 다시 분석」(AI 1회)이나 직접 적기.', acts: ['analyze', 'edit'] };
    }
    const labels = snap?.labels ?? [];
    if (!labels.length && !snap?.roll) {
        const s = app.current.state;
        const unk = [], off = [];
        for (const [k] of ops) { const o = opInfo(s, k); if (!o.key) unk.push(k); else if (o.mod && !modOn(o.mod, meta)) off.push(`${k} (${MOD[o.mod]?.name ?? o.mod})`); }
        const list = ops.slice(0, 8).map(([k, v]) => `${k}: ${v}`).join('\n');
        if (unk.length) return { code: 'unknown', title: '읽었지만 모르는 키예요', text: `미트볼이 모르는 키라 아무것도 안 바뀌었어요: ${unk.join(', ')}\n\n${list}`, acts: ['edit'] };
        if (off.length) return { code: 'unknown', title: '꺼 둔 칸의 변화예요', text: `쓸 기능에서 꺼 둔 칸이라 반영하지 않았어요: ${off.join(', ')}`, acts: ['edit'] };
        return { code: 'nochange', title: '읽었지만 바뀐 게 없어요', text: `변화 줄 ${ops.length}개를 읽었는데, 지금 값과 같아서 칩이 없어요.\n\n${list}`, acts: ['edit'] };
    }
    if (set.msgCard === 'off') return { code: 'cardoff', title: '칩 표시가 꺼져 있어요', text: `변화 ${labels.length}개는 제대로 반영됐어요. 확장 설정 › 「메시지 변동 칩」이 「숨기기」예요.`, acts: [] };
    const mesEl = document.querySelector(`#chat .mes[mesid="${i}"]`);
    const card = mesEl?.querySelector('.ss-slot .ss-msgcard:not(.pip)');
    if (!mesEl) return { code: 'shown', title: '이 답은 지금 화면에 없어요', text: `변화 ${labels.length}개는 반영됐어요.` };
    if (!card) return { code: 'detached', title: '읽었는데 칩 자리가 사라졌어요 — 안 보이는 것', text: `변화 ${labels.length}개는 숫자에 반영됐어요 (${labels.slice(0, 4).join(' · ')}). 다른 확장(번역 등)이 본문을 다시 그리며 칩 자리를 지운 것 같아요. 「칩 다시 붙이기」를 눌러요.`, acts: ['redraw', 'outside'] };
    const r = card.getBoundingClientRect(), cs = getComputedStyle(card);
    let hiddenBy = '';
    for (let p = card; p && p !== mesEl; p = p.parentElement) { const st = getComputedStyle(p); if (st.display === 'none' || st.visibility === 'hidden' || Number(st.opacity) === 0) { hiddenBy = p.className || p.tagName; break; } }
    if (hiddenBy || !r.width || !r.height || cs.display === 'none') return { code: 'hidden', title: '읽었는데 화면에 안 보여요 — 안 보이는 것', text: `변화 ${labels.length}개는 숫자에 반영됐어요 (${labels.slice(0, 4).join(' · ')}). 칩은 있는데 가려져 있어요${hiddenBy ? ` (가린 곳: ${String(hiddenBy).slice(0, 60)})` : ''}. 번역 확장이 원문을 숨기는 경우가 많아요 → 「칩을 본문 밖에 붙이기」.`, acts: ['outside', 'redraw'] };
    return { code: 'shown', title: '칩이 잘 보이고 있어요', text: `변화 ${labels.length}개: ${labels.slice(0, 6).join(' · ')}` };
}

const ACT = {
    redraw: '<i class="fa-solid fa-rotate"></i> 칩 다시 붙이기',
    outside: '<i class="fa-solid fa-arrow-down"></i> 칩을 본문 밖에 붙이기',
    reread: '<i class="fa-solid fa-magnifying-glass"></i> 태그 다시 읽기 (토큰 0)',
    analyze: '<i class="fa-solid fa-robot"></i> AI로 다시 분석 (AI 1회)',
    edit: '<i class="fa-solid fa-pen"></i> 직접 적기',
};
const OK_CODES = new Set(['shown', 'baked', 'none', 'cardoff']);

// 창: 진단 결과 + 손으로 다시 부르기
export async function openPip(i) {
    const chat = ctx().chat ?? [];
    if (!Number.isFinite(i)) i = app.current?.lastAI ?? chat.length - 1;
    const d = pipDiag(i);
    const box = document.createElement('div');
    box.className = 'ss-root ss-scope ss-pipbox';
    const kind = OK_CODES.has(d.code) ? 'ok' : ['detached', 'hidden'].includes(d.code) ? 'hide' : ['skipped', 'running', 'nochange', 'syncoff', 'unknown'].includes(d.code) ? 'info' : 'lost';
    box.innerHTML = `<div class="ss-wz-head"><i class="fa-solid fa-magnifying-glass"></i><div><b>🔍 칩 점검 — ${i}번 답</b><small>${kind === 'lost' ? '변화를 못 읽음 (씹힘)' : kind === 'hide' ? '읽었지만 화면에 안 보임' : kind === 'ok' ? '문제 없음' : '알림'}</small></div></div>
        <div class="ss-pip-res ${kind}"><b>${esc(d.title)}</b>${d.text ? `<p class="ss-pre">${esc(d.text)}</p>` : ''}</div>
        ${(d.acts ?? []).length ? `<div class="ss-row-btns">${d.acts.map(a => `<button class="ss-btn ${a === d.acts[0] ? 'pri' : ''}" data-choice="${a}">${ACT[a]}</button>`).join('')}</div>` : ''}
        <p class="ss-hint">퀵리플라이 · 슬래시: <code>/ss-pip</code> (마지막 답) · <code>/ss-pip ${i}</code> · <code>/ss-pip ${i} fix</code> (자동으로 고치기)</p>`;
    const pick = await choosePopup(box, '닫기');
    if (pick) return pipFix(i, pick);
    return d;
}

// 손으로 다시 부르기 — act: redraw · outside · reread · analyze · edit · auto(진단에 맞춰 알아서)
export async function pipFix(i, act = 'auto') {
    const c = ctx(), m = c.chat?.[i];
    if (!m) return null;
    if (act === 'auto') { const d = pipDiag(i); act = d.acts?.[0] ?? (d.code === 'shown' ? null : 'redraw'); if (!act) { toastr.info(d.title, TITLE); return d; } }
    if (act === 'redraw') { app.redecorate?.(); app.decorate?.(); const d = pipDiag(i); toastr[OK_CODES.has(d.code) ? 'success' : 'warning'](OK_CODES.has(d.code) ? '칩을 다시 붙였어요.' : `아직 ${esc(d.title)}`, TITLE); return d; }
    if (act === 'outside') { settings().chipOutside = true; saveSettings(); app.redecorate?.(); app.decorate?.(); toastr.success('칩을 본문 아래(본문 밖)에 붙여요. 확장 설정 › 메시지 변동 칩에서 되돌릴 수 있어요.', TITLE); return pipDiag(i); }
    if (act === 'reread') {
        const sid = m.swipe_id ?? 0;
        const src = [m.mes, m.swipes?.[sid]].find(t => typeof t === 'string' && hasStatus(t));
        let ops = src ? extractOps(src) : [];
        if (!ops.length) { // 닫는 태그가 없거나 모양이 조금 다른 것: 「meatball」 뒤의 「키: 값」 줄을 느슨하게 읽는다
            const raw = [m.mes, m.swipes?.[sid]].find(x => typeof x === 'string' && /meatball/i.test(x)) ?? '';
            const k = raw.search(/meatball/i);
            if (k >= 0) ops = extractOps(`<meatball>\n${raw.slice(k).replace(/^[^\n]*\n?/, '').replace(/<\/?meatball>?/gi, '')}\n</meatball>`);
        }
        const seen = new Set(); ops = ops.filter(([k, v]) => { const key = `${k}\u0000${v}`; if (seen.has(key)) return false; seen.add(key); return true; });
        if (!ops.length) { toastr.warning('다시 읽어도 「키: 값」 줄을 못 찾았어요. 「AI로 다시 분석」이나 「직접 적기」를 써요.', TITLE); return pipDiag(i); }
        if (src && settings().stashTags) stashStatus(m, { replace: true });
        else {
            setDrawer(m, ops);
            // 깨진 태그 조각(「<meatball」 + 키: 값 줄)은 본문에서 떼어 낸다 — 이야기 글은 건드리지 않게 태그 자리부터 키: 값 줄까지만
            if (!src && settings().stashTags) {
                const t = String(m.mes), k = t.search(/<\/?\s*meatball/i);
                if (k >= 0) { const rest = t.slice(k).replace(/^<\/?\s*meatball\s*>?[^\n]*\n?/i, ''); const run = rest.match(/^(?:\s*(?:[-*•]\s*|\d+[.)]\s*)?[^<:：\n]{1,24}[:：][^\n]*\n?)*/)?.[0] ?? ''; m.mes = (t.slice(0, k) + rest.slice(run.length).replace(/^\s*<\/meatball>/i, '')).replace(/\s+$/, ''); if (Array.isArray(m.swipes) && typeof m.swipes[sid] === 'string') m.swipes[sid] = m.mes; }
            }
        }
        try { c.updateMessageBlock?.(i, m); } catch { /* 다시 그리기 실패는 무시 */ }
        await c.saveChat?.();
        app.redecorate?.(); app.refreshNow?.();
        toastr.success(`변화 ${ops.length}줄을 다시 읽었어요.`, TITLE);
        return pipDiag(i);
    }
    if (act === 'analyze') {
        const { analyzeMessage } = await import('./ai.js');
        toastr.info('AI로 이 답을 다시 분석해요 (AI 1회)…', TITLE);
        const n = await analyzeMessage(i);
        if (n > 0) toastr.success(`변화 ${n}줄을 찾았어요.`, TITLE);
        else if (n === 0) toastr.info('분석했는데 바뀐 게 없대요.', TITLE);
        else toastr.error('분석이 실패했어요. 잠시 뒤 다시 하거나 직접 적어요.', TITLE);
        return pipDiag(i);
    }
    if (act === 'edit') {
        const cur = (drawerOps(m) ?? msgOps(m)).map(([k, v]) => `${k}: ${v}`).join('\n');
        const v = await c.Popup.show.input(TITLE, '이 답에서 바뀐 상태 (한 줄에 하나, key: 값). 비우면 변화 없음.', cur, { rows: 8 });
        if (v === null || v === false || v === undefined) return null;
        setDrawer(m, extractOps(`<meatball>\n${v}\n</meatball>`));
        await c.saveChat?.();
        app.redecorate?.(); app.refreshNow?.();
        return pipDiag(i);
    }
    return null;
}
app.pipDiag = (i) => pipDiag(i); // 도우미가 「칩이 안 떠요」에 지금 상태를 바로 확인할 때
// 칩 자리에 붙는 작은 🔍 (마지막 AI 답에 칩이 없을 때만)
export function pipWanted(i, m) {
    if (settings().pipCheck === false || !app.current || i !== app.current.lastAI) return false;
    const d = pipDiag(i);
    return ['notag', 'malformed', 'failed', 'unknown', 'running'].includes(d.code) ? d : false; // 씹힌 것 · 분석 중만 (OOC로 건너뛴 답 · 바뀐 게 없는 답엔 안 붙임)
}
