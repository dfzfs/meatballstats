// 📱/✉️ 연락: 메신저 · 즉시 통신 · 편지 (배달 수단 · 도착 시간 · 급행)
import { app, settings, getMeta, modOn, esc, short, clone, findBy, norm, uid, randInt, rand, clamp, num, fmtNum, nowTick, tickUnit, stamp, CONTACT_MODES, TITLE, COURIER_PRESETS, touchContact, msgText } from './core.js';
import { commit, addAdjust, dueLetters, inTransit, affMul } from './engine.js';
import { phoneReply, letterReply, pingMessage, summarizeThread } from './ai.js';
import { avatar, ai1, emptyBox, askInput, askConfirm, busyBtn } from './kit.js';

const isLetter = (d) => d.mode === 'letter';
const names = (d) => [...new Set([...d.contacts.map(c => c.name), ...Object.keys(d.threads)])];
const courierOf = (d, who) => findBy(d.couriers, findBy(d.contacts, who)?.courier) ?? d.couriers[0] ?? COURIER_PRESETS[0];
const visible = (m, now) => !m.pending && !(m.from === 'them' && (m.arrive ?? -Infinity) > now);

function lastLine(d, who, now) {
    const th = (d.threads[who] ?? []).filter(m => visible(m, now));
    return th.at(-1);
}

// ───── 목록 ─────
function listView(s, d, ui) {
    const now = nowTick(s), unit = tickUnit(s);
    const due = dueLetters(s);
    const transit = inTransit(s);
    const ns = names(d);
    const modeInfo = CONTACT_MODES[d.mode];
    return `<div class="ss-ct">
        <div class="ss-ct-top"><div class="ss-ct-app"><i class="fa-solid ${modeInfo.icon}"></i><b>${esc(d.app)}</b><small>${esc(modeInfo.name)}</small></div>
            <button class="ss-btn sm ghost" data-act="cmode" title="연락 방식 바꾸기"><i class="fa-solid fa-right-left"></i> 방식</button></div>
        ${due.length ? `<div class="ss-callout mail"><i class="fa-solid fa-envelope-open-text"></i><div><b>도착한 편지 ${due.length}통</b><span>${due.map(x => esc(x.who)).join(', ')}${due.some(x => x.m.rush) ? ' · 💨 급행 포함' : ''}</span></div><button class="ss-btn sm pri" data-act="copen" data-arg="${esc(due[0].who)}">열기</button></div>` : ''}
        ${transit.length ? `<div class="ss-card ss-transit"><div class="ss-sec-h"><h4><i class="fa-solid fa-truck-fast"></i> 배달 중</h4></div>${transit.map(x => {
            const total = Math.max(1, (x.m.arrive ?? 0) - (x.m.at ?? 0));
            const pct = clamp(100 - (x.left / total) * 100, 4, 100);
            return `<div class="ss-tr"><span>${x.m.from === 'me' ? `→ ${esc(x.who)}` : `${esc(x.who)} →`}</span><div class="ss-tr-t" style="--x:${pct}%"><i style="width:${pct}%"></i><em>${esc(courierIcon(d, x.m.courier))}</em></div><small>${x.left}${unit} 뒤</small></div>`;
        }).join('')}</div>` : ''}
        <div class="ss-ct-list">${ns.map(n => {
            const c = findBy(d.contacts, n) ?? { name: n };
            const last = lastLine(d, n, now);
            const un = (d.unread[n] ?? 0) + due.filter(x => x.who === n).length;
            return `<div class="ss-ct-row" data-act="copen" data-arg="${esc(n)}">${avatar(n)}
                <div class="ss-ct-b"><b>${esc(n)}${c.blocked ? ' <i class="fa-solid fa-ban ss-dim" title="차단됨"></i>' : ''}${c.reflect === 'never' ? ' <i class="fa-solid fa-eye-slash ss-dim" title="본편에 반영 안 함"></i>' : ''}</b><small>${esc(last ? short(msgText(last), 46) : c.status || c.handle || '대화 없음')}</small></div>
                ${un ? `<i class="ss-badge">${un}</i>` : ''}
                <button class="ss-ib" data-act="cmenu" data-arg="${esc(n)}" title="더 보기"><i class="fa-solid fa-ellipsis"></i></button></div>`;
        }).join('') || emptyBox('연락처가 없어요', 'fa-address-book')}</div>
        <div class="ss-inline"><input class="ss-in ss-cnew" placeholder="새 연락처 이름"><button class="ss-btn" data-act="cadd"><i class="fa-solid fa-user-plus"></i> 추가</button></div>
        <div class="ss-row-btns"><button class="ss-btn ghost" data-act="cping" data-arg="">${ai1} 누군가에게서 ${isLetter(d) ? '편지 오게' : '먼저 연락 오게'}</button>${isLetter(d) ? `<button class="ss-btn ghost" data-act="ccour"><i class="fa-solid fa-dove"></i> 배달 수단</button>` : ''}</div>
        <p class="ss-hint">${isLetter(d) ? `편지는 ${unit === '일' ? '날짜가 지나야' : 'AI 응답이 쌓여야'} 도착해요 (지금 ${unit === '일' && s.data.calendar ? esc(stamp(s)) : `${now}턴`}). 답장은 도착한 뒤 「열기」를 눌러야 AI가 씁니다.` : '메시지를 보내면 그 인물이 AI로 답장해요 (1번 = AI 1회). 「답장 받기」를 끄면 토큰이 들지 않아요.'}</p>
    </div>`;
}
const courierIcon = (d, name) => findBy(d.couriers, name)?.icon ?? '✉️';

// ───── 메신저 대화 ─────
function phoneView(s, d, ui) {
    const who = ui.who, th = d.threads[who] ?? [];
    const c = findBy(d.contacts, who) ?? { name: who };
    return `<div class="ss-phone">
        <div class="ss-phone-top"><button class="ss-ib" data-act="cback"><i class="fa-solid fa-chevron-left"></i></button>${avatar(who)}<div class="ss-ct-b"><b>${esc(who)}</b><small>${esc(c.status || d.app)}</small></div>
            <button class="ss-ib" data-act="cmenu" data-arg="${esc(who)}"><i class="fa-solid fa-ellipsis-vertical"></i></button></div>
        ${d.summaries?.[who] ? `<div class="ss-csum"><i class="fa-solid fa-note-sticky"></i> ${esc(d.summaries[who].text)}</div>` : ''}
        <div class="ss-thread">${th.map(m => bubble(m, ui)).join('') || '<div class="ss-hint center">아직 대화가 없어요. 먼저 말을 걸어 보세요.</div>'}</div>
        ${c.blocked ? '<div class="ss-callout"><i class="fa-solid fa-ban"></i><div><b>차단한 상대예요</b><span>⋮ 메뉴에서 차단을 풀 수 있어요</span></div></div>' : `<div class="ss-attach">
            <button class="ss-ib" data-act="catt" data-arg="photo" title="사진"><i class="fa-solid fa-image"></i></button>
            <button class="ss-ib" data-act="catt" data-arg="voice" title="음성 메시지"><i class="fa-solid fa-microphone"></i></button>
            <button class="ss-ib" data-act="catt" data-arg="file" title="파일"><i class="fa-solid fa-paperclip"></i></button>
            <button class="ss-ib" data-act="catt" data-arg="place" title="위치"><i class="fa-solid fa-location-dot"></i></button>
            ${s.data.wallet && modOn('wallet') ? `<button class="ss-ib" data-act="catt" data-arg="gift" title="선물 (소지품)"><i class="fa-solid fa-gift"></i></button><button class="ss-ib" data-act="catt" data-arg="money" title="송금"><i class="fa-solid fa-money-bill-wave"></i></button>` : ''}
        </div>
        <div class="ss-phone-in"><textarea class="ss-in ss-cin" rows="1" placeholder="메시지 보내기">${esc(ui.draft ?? '')}</textarea><button class="ss-btn pri ss-send" data-act="csend" title="보내기"><i class="fa-solid fa-paper-plane"></i></button></div>
        <div class="ss-phone-opt"><label class="ss-tog"><input type="checkbox" class="ss-switch ss-creply" ${ui.noReply ? '' : 'checked'}><span>답장 받기 ${ai1}</span></label>
            <button class="ss-btn sm ghost" data-act="creply">${ai1} 지금 답장 받기</button><button class="ss-btn sm ghost" data-act="cping" data-arg="${esc(who)}">${ai1} 선톡 오게</button></div>`}
    </div>`;
}
const ATT = { photo: ['fa-image', '사진'], voice: ['fa-microphone', '음성 메시지'], file: ['fa-paperclip', '파일'], place: ['fa-location-dot', '위치'], gift: ['fa-gift', '선물'], money: ['fa-money-bill-wave', '송금'] };
const REACTS = ['❤️', '👍', '😂', '😮', '😢'];
function bubbleBody(m) {
    if (m.kind === 'deleted') return '<span class="ss-bub-del"><i class="fa-solid fa-ban"></i> 삭제된 메시지입니다</span>';
    if (m.kind === 'money') return `<div class="ss-att money"><i class="fa-solid ${ATT.money[0]}"></i><div><b>${fmtNum(m.amount)} ${esc(app.current?.state?.data?.wallet?.currency ?? '')}</b><small>${esc(m.text || '송금')}</small></div></div>`;
    if (ATT[m.kind]) return `<div class="ss-att ${m.kind}"><i class="fa-solid ${ATT[m.kind][0]}"></i><div><small>${ATT[m.kind][1]}</small><span>${esc(m.text)}</span></div></div>`;
    return `<span>${esc(m.text)}</span>`;
}
function bubble(m, ui) {
    if (ui.editId === m.id) return `<div class="ss-bub ${m.from === 'me' ? 'me' : ''} editing"><textarea class="ss-in ss-bub-ed" rows="2">${esc(m.text)}</textarea><div class="ss-bub-acts"><button class="ss-btn sm pri" data-act="cmsgsave" data-arg="${esc(m.id)}">저장</button><button class="ss-btn sm" data-act="cmsgcancel">취소</button></div></div>`;
    const mine = m.from === 'me';
    return `<div class="ss-bub ${mine ? 'me' : ''} ${m.ping ? 'ping' : ''} ${m.pin ? 'pinned' : ''} k-${m.kind}" data-id="${esc(m.id)}">${bubbleBody(m)}
        ${m.react ? `<em class="ss-react">${esc(m.react)}</em>` : ''}
        <div class="ss-bub-meta">${mine && !m.read && m.kind !== 'deleted' ? '<b class="ss-unread">1</b> ' : ''}${m.pin ? '📌 ' : ''}${m.edited ? '수정됨 · ' : ''}${esc(m.date || '')}</div>
        <div class="ss-bub-acts ${ui.reactFor === m.id ? 'on' : ''}">${!mine && m.kind !== 'deleted' ? (ui.reactFor === m.id ? REACTS.map(r => `<button class="ss-ib r ${m.react === r ? 'on' : ''}" data-act="creact" data-arg="${esc(m.id)}|${r}">${r}</button>`).join('') : `<button class="ss-ib" data-act="creactpick" data-arg="${esc(m.id)}" title="반응 달기"><i class="fa-regular fa-face-smile"></i></button>`) : ''}
            <button class="ss-ib" data-act="cpin" data-arg="${esc(m.id)}" title="${m.pin ? '고정 해제' : '본편에 꼭 반영 (📌)'}"><i class="fa-solid fa-thumbtack"></i></button>
            ${m.kind === 'text' ? `<button class="ss-ib" data-act="cmsgedit" data-arg="${esc(m.id)}" title="수정"><i class="fa-solid fa-pen"></i></button>` : ''}
            ${mine && !['deleted', 'gift', 'money'].includes(m.kind) ? `<button class="ss-ib" data-act="cunsend" data-arg="${esc(m.id)}" title="전송 취소"><i class="fa-solid fa-rotate-left"></i></button>` : ''}
            <button class="ss-ib" data-act="cmsgdel" data-arg="${esc(m.id)}" title="기록에서 지우기"><i class="fa-solid fa-trash-can"></i></button>${!mine ? `<button class="ss-ib" data-act="cmsgre" data-arg="${esc(m.id)}" title="다시 받기 (AI 1회)"><i class="fa-solid fa-rotate"></i></button>` : ''}</div></div>`;
}

// ───── 편지 ─────
function letterView(s, d, ui) {
    const who = ui.who, th = d.threads[who] ?? [];
    const now = nowTick(s), unit = tickUnit(s);
    const mine = courierOf(d, who);
    ui.courier ??= d.couriers[0]?.name ?? '';
    const cur = s.data.wallet?.currency ?? '';
    const cash = s.data.wallet?.cash;
    return `<div class="ss-letters">
        <div class="ss-phone-top"><button class="ss-ib" data-act="cback"><i class="fa-solid fa-chevron-left"></i></button>${avatar(who)}<div class="ss-ct-b"><b>${esc(who)}</b><small>${esc(findBy(d.contacts, who)?.status || `주로 ${mine.icon} ${mine.name}`)}</small></div>
            <button class="ss-ib" data-act="cmenu" data-arg="${esc(who)}"><i class="fa-solid fa-ellipsis-vertical"></i></button></div>
        <div class="ss-letter-list">${th.map(m => letterCard(m, d, ui, now, unit)).join('') || '<div class="ss-hint center">주고받은 편지가 없어요.</div>'}</div>
        <div class="ss-compose">
            <div class="ss-paper"><textarea class="ss-in ss-cin" rows="5" placeholder="${esc(who)}에게…">${esc(ui.draft ?? '')}</textarea><div class="ss-paper-sign">— ${esc(app.userName?.() ?? '')}</div></div>
            <div class="ss-f wide"><span>보내는 방법</span><div class="ss-couriers">${d.couriers.map(c => `<button class="ss-cour ${ui.courier === c.name && !ui.express ? 'on' : ''}" data-act="cpick" data-arg="${esc(c.name)}"><em>${esc(c.icon)}</em><b>${esc(c.name)}</b><small>${c.min === c.max ? c.min : `${c.min}~${c.max}`}${unit}${c.fee ? ` · ${fmtNum(c.fee)}${esc(cur)}` : ''}</small></button>`).join('')}
                <button class="ss-cour express ${ui.express ? 'on' : ''}" data-act="cpick" data-arg="__express"><em>💨</em><b>${esc(d.express.name)}</b><small>오늘 도착 · ${fmtNum(d.express.fee)}${esc(cur)}</small></button></div></div>
            ${s.data.wallet && modOn('wallet') ? `<div class="ss-enclose"><span>동봉</span>${(ui.enc ?? []).map((x, i) => `<span class="ss-chip">${esc(x.label)}<button class="ss-x" data-act="cencdel" data-arg="${i}">×</button></span>`).join('')}
                <button class="ss-btn sm ghost" data-act="cenc" data-arg="photo"><i class="fa-solid fa-image"></i> 사진·그림</button><button class="ss-btn sm ghost" data-act="cenc" data-arg="gift"><i class="fa-solid fa-gift"></i> 선물</button><button class="ss-btn sm ghost" data-act="cenc" data-arg="money"><i class="fa-solid fa-coins"></i> 돈</button></div>` : ''}
            <div class="ss-compose-opt">
                <label class="ss-tog"><input type="checkbox" class="ss-switch ss-lreply" ${ui.noReply ? '' : 'checked'}><span>답장 오게 하기</span></label>
                <label class="ss-tog"><input type="checkbox" class="ss-switch ss-lrush" ${ui.rushPaid ? 'checked' : ''}><span>답장 급행료 동봉 (+${fmtNum(d.express.fee)}${esc(cur)})</span></label>
            </div>
            <div class="ss-row-btns"><button class="ss-btn pri" data-act="csend"><i class="fa-solid fa-envelope"></i> 부치기</button>${cash !== undefined ? `<small class="ss-dim">소지금 ${fmtNum(cash)}${esc(cur)}</small>` : ''}
                <button class="ss-btn ghost" data-act="cping" data-arg="${esc(who)}">${ai1} 이 사람에게서 편지 오게</button></div>
        </div>
    </div>`;
}
function letterCard(m, d, ui, now, unit) {
    const ic = m.rush || m.express ? '💨' : courierIcon(d, m.courier);
    if (m.pending) {
        if ((m.arrive ?? 0) <= now) return `<div class="ss-env due ${m.rush ? 'rush' : ''}">${m.rush ? '<div class="ss-ribbon">💨 웃돈 주고 급행!</div>' : ''}<div class="ss-env-flap"></div><div class="ss-env-b"><b>📬 답장이 도착했어요</b><small>${esc(ic)} ${esc(m.courier || '편지')}</small><button class="ss-btn pri sm" data-act="lopen" data-arg="${esc(m.id)}">${ai1} 뜯어 보기</button></div></div>`;
        return `<div class="ss-env wait"><div class="ss-env-flap"></div><div class="ss-env-b"><b>답장을 기다리는 중</b><small>${esc(ic)} 약 ${(m.arrive ?? 0) - now}${unit} 뒤 도착 예정</small></div></div>`;
    }
    if (m.from === 'them' && (m.arrive ?? -Infinity) > now) return '';
    const left = (m.arrive ?? -Infinity) - now;
    if (ui.editId === m.id) return `<div class="ss-letter ${m.from}"><textarea class="ss-in ss-bub-ed" rows="5">${esc(m.text)}</textarea><div class="ss-bub-acts on"><button class="ss-btn sm pri" data-act="cmsgsave" data-arg="${esc(m.id)}">저장</button><button class="ss-btn sm" data-act="cmsgcancel">취소</button></div></div>`;
    return `<div class="ss-letter ${m.from === 'me' ? 'me' : 'them'}">${m.rush ? '<div class="ss-ribbon">💨 웃돈 주고 급행!</div>' : m.express ? '<div class="ss-ribbon">💨 급행</div>' : ''}
        <div class="ss-letter-meta"><span>${m.from === 'me' ? '보낸 편지' : '받은 편지'}</span><span>${esc(ic)} ${esc(m.courier || '')}${m.fee ? ` · ${fmtNum(m.fee)}` : ''}</span><span>${m.from === 'me' && left > 0 ? `<b class="ss-hl">배달 중 · ${left}${unit} 남음</b>` : esc(m.date)}</span></div>
        <div class="ss-letter-body">${esc(m.text)}</div>
        <div class="ss-bub-acts"><button class="ss-ib" data-act="cmsgedit" data-arg="${esc(m.id)}" title="수정"><i class="fa-solid fa-pen"></i></button><button class="ss-ib" data-act="cmsgdel" data-arg="${esc(m.id)}" title="삭제"><i class="fa-solid fa-trash-can"></i></button></div></div>`;
}

export function contactView(s, d, ui) {
    if (!ui.who) return listView(s, d, ui);
    return isLetter(d) ? letterView(s, d, ui) : phoneView(s, d, ui);
}

// ───── 동작 ─────
const curState = () => app.current?.state;
function findMsg(nd, id) {
    for (const [who, th] of Object.entries(nd.threads)) { const k = th.findIndex(m => m.id === id); if (k >= 0) return { who, th, k, m: th[k] }; }
    return null;
}
async function markRead(who) { if (curState()?.data.contact?.unread?.[who]) await addAdjust({ ops: [['_read', who]], silent: true }); }

async function sendPhone(el, s, who, text, extra = {}) {
    const ui = el._ss.ui;
    const nd = clone(s.data.contact);
    const m = { id: uid(), from: 'me', text, date: stamp(s), at: nowTick(s), arrive: nowTick(s), kind: 'text', read: false, ...extra };
    (nd.threads[who] ??= []).push(m);
    touchContact(nd, who);
    if (!findBy(nd.contacts, who)) nd.contacts.push({ name: who, handle: '', status: '', courier: '' });
    await commit('contact', nd, `${nd.app}로 ${who}에게: ${short(msgText(m), 30)}`);
    if (!ui.noReply) await getPhoneReply(el, who);
}
// 내 메시지를 모두 '읽음'으로
function readAll(th) { for (const m of th) if (m.from === 'me') m.read = true; }
// 요약 모드: 요약 뒤로 메시지가 쌓이면 한 줄 요약을 새로 만든다
async function maybeSummarize(who, force = false) {
    const st = settings();
    const s = curState(); const ct = s?.data.contact; if (!ct) return;
    const c = findBy(ct.contacts, who);
    const want = force || st.contactReflect === 'summary' || (c?.reflect === 'always' && st.contactReflect === 'summary');
    if (!want) return;
    const n = (ct.threads[who] ?? []).filter(m => !m.pending).length;
    if (!force && n - (ct.summaries?.[who]?.n ?? 0) < 8) return;
    try {
        const text = await summarizeThread(who, s);
        if (!text) return;
        const nd = clone(curState().data.contact);
        nd.summaries = { ...(nd.summaries ?? {}), [who]: { text, n } };
        await commit('contact', nd, '');
        if (force) toastr.success('대화를 요약했어요.', TITLE);
    } catch (e) { console.warn(e); if (force) toastr.error(`요약 실패: ${esc(e.message)}`, TITLE); }
}
async function getPhoneReply(el, who, replaceId = null) {
    const thread = el.querySelector('.ss-thread');
    thread?.insertAdjacentHTML('beforeend', '<div class="ss-bub typing"><span><i></i><i></i><i></i></span></div>');
    if (thread) thread.scrollTop = thread.scrollHeight;
    try {
        const s = curState();
        const lines = await phoneReply(who, s);
        const nd = clone(curState().data.contact);
        if (lines.length === 1 && /읽지 않음/.test(lines[0])) { toastr.info(`${esc(who)}이(가) 아직 읽지 않았어요.`, TITLE); app.renderPanel(el); return; }
        if (lines.length === 1 && /^\(?\s*읽음\s*\)?$/.test(lines[0].trim())) {
            readAll(nd.threads[who] ??= []);
            await commit('contact', nd, `${who}이(가) 메시지를 읽고 답하지 않았다 (읽씹)`);
            toastr.info(`${esc(who)}이(가) 읽고 답을 안 했어요… (읽씹)`, TITLE);
            return;
        }
        const th = nd.threads[who] ??= [];
        readAll(th);
        const msgs = lines.map(l => ({ id: uid(), from: 'them', text: l, date: stamp(s), at: nowTick(s), arrive: nowTick(s) }));
        if (replaceId) { const k = th.findIndex(m => m.id === replaceId); if (k >= 0) th.splice(k, 1, ...msgs); else th.push(...msgs); } else th.push(...msgs);
        touchContact(nd, who);
        await commit('contact', nd, `${who}의 답장: ${short(lines.join(' '), 40)}`);
        maybeSummarize(who);
    } catch (e) { console.error(e); toastr.error(`답장을 받지 못했어요: ${esc(e.message)}`, TITLE); app.renderPanel(el); }
}
async function sendLetter(el, s, who, text) {
    const ui = el._ss.ui;
    const nd = clone(s.data.contact);
    const now = nowTick(s);
    const express = !!ui.express;
    const c = express ? { name: nd.express.name, icon: '💨', min: 0, max: 0, fee: nd.express.fee } : (findBy(nd.couriers, ui.courier) ?? nd.couriers[0]);
    const wantReply = !ui.noReply;
    const rushPaid = wantReply && !!ui.rushPaid;
    const fee = (c.fee || 0) + (rushPaid ? nd.express.fee : 0);
    const w = s.data.wallet;
    const enc = ui.enc ?? [];
    const encCash = enc.filter(x => x.kind === 'money').reduce((a, x) => a + x.amount, 0);
    if ((fee || encCash) && w && modOn('wallet') && w.cash < fee + encCash) { toastr.warning(`돈이 모자라요 (${fmtNum(fee + encCash)} ${esc(w.currency)} 필요).`, TITLE); return; }
    if (enc.length) text = `${text}\n\n${enc.map(x => x.kind === 'photo' ? `[동봉한 사진·그림: ${x.text}]` : x.kind === 'gift' ? `[동봉한 선물: ${x.text}]` : `[동봉한 돈: ${fmtNum(x.amount)} ${w?.currency ?? ''}]`).join('\n')}`;
    const arrive = now + (express ? 0 : randInt(c.min, c.max));
    (nd.threads[who] ??= []).push({ id: uid(), from: 'me', text, date: stamp(s), at: now, arrive, courier: c.name, express, fee, rush: false });
    touchContact(nd, who);
    if (!findBy(nd.contacts, who)) nd.contacts.push({ name: who, handle: '', status: '', courier: '' });
    let rushNote = '';
    if (wantReply) {
        const rel = s.data.rel ? findBy(s.data.rel.user, who) : null;
        const chance = clamp(num(settings().rushChance, 15) + Math.max(0, rel?.aff ?? 0) / 3, 0, 70);
        const rush = rushPaid || rand(100) <= chance;
        const theirs = courierOf(nd, who);
        const due = arrive + randInt(0, 1) + (rush ? 0 : randInt(theirs.min, theirs.max));
        nd.threads[who].push({ id: uid(), from: 'them', text: '', pending: true, at: arrive, arrive: due, courier: rush ? nd.express.name : theirs.name, rush, express: rush });
        if (rush && !rushPaid) rushNote = 'rush';
    }
    ui.draft = ''; ui.express = false; ui.rushPaid = false; ui.enc = [];
    await commit('contact', nd, `${c.icon} ${c.name}(으)로 ${who}에게 편지를 부쳤다${express ? ' — 오늘 도착' : ` — ${arrive - now}${tickUnit(s)} 뒤 도착`}${enc.length ? ` (동봉: ${enc.map(x => x.label).join(', ')})` : ''}`);
    if (fee && w && modOn('wallet')) await addAdjust({ ops: [['cash', `-${fee}`]], label: `편지 요금 −${fmtNum(fee)} ${w.currency}` });
    const encOps = [];
    for (const x of enc) { if (x.kind === 'gift') encOps.push(['item', `-${x.text} 1`]); if (x.kind === 'money') encOps.push(['cash', `-${x.amount}`]); }
    if (encOps.length) await addAdjust({ ops: encOps, silent: true });
    toastr.success(`${esc(c.icon)} 편지를 부쳤어요${express ? ' (오늘 도착)' : ` (${arrive - now}${tickUnit(s)} 뒤 도착)`}`, TITLE);
    if (rushNote) setTimeout(() => toastr.info('…어쩐지 답장이 빨리 올 것 같은 예감이 들어요.', TITLE), 600);
}

// 첨부 고르기: 사진·음성·파일·위치는 묘사, 선물은 소지품, 송금은 금액
async function pickAttach(kind, s) {
    const w = s.data.wallet;
    if (kind === 'gift') {
        if (!w?.items.length) { toastr.info('줄 수 있는 소지품이 없어요.', TITLE); return null; }
        const v = (await askInput(TITLE, `선물할 소지품 이름<br><small>${w.items.map(i => esc(i.name)).join(', ')}</small>`, w.items[0].name))?.trim();
        const it = v && findBy(w.items, v);
        if (!it) { if (v) toastr.warning('그런 소지품이 없어요.', TITLE); return null; }
        return { kind, text: it.name, label: `🎁 ${it.name}` };
    }
    if (kind === 'money') {
        const v = Math.round(num(await askInput(TITLE, `얼마를? (${esc(w?.currency ?? '')} · 가진 돈 ${fmtNum(w?.cash ?? 0)})`, ''), 0));
        if (!(v > 0)) return null;
        if (w && v > w.cash) { toastr.warning('돈이 모자라요.', TITLE); return null; }
        return { kind, amount: v, text: '', label: `💸 ${fmtNum(v)}` };
    }
    const q = { photo: '어떤 사진인가요? (예: 노을 지는 바다에서 찍은 셀카)', voice: '음성 메시지 내용·말투 (예: 졸린 목소리로 "자?")', file: '어떤 파일인가요? (예: 과제 PDF)', place: '어디를 보내나요? (예: 학교 앞 카페)' }[kind];
    const v = (await askInput(TITLE, q, ''))?.trim();
    return v ? { kind, text: v, label: v } : null;
}

export const CONTACT_ACTIONS = {
    catt: async (el, arg, btn, s) => {
        const who = el._ss.ui.who; if (!who) return;
        const a = await pickAttach(arg, s); if (!a) return;
        el._ss.ui.noReply = !(el.querySelector('.ss-creply')?.checked ?? true);
        if (a.kind === 'gift') {
            const r = s.data.rel ? findBy(s.data.rel.user, who) : null;
            await addAdjust({ ops: [['item', `-${a.text} 1`], ...(r || s.data.rel ? [['aff', `${who} +${Math.max(1, Math.round(2 * affMul(s)))}`]] : [])], silent: true });
        }
        if (a.kind === 'money') await addAdjust({ ops: [['cash', `-${a.amount}`]], silent: true });
        await sendPhone(el, curState(), who, a.text, { kind: a.kind, amount: a.amount ?? 0 });
    },
    cenc: async (el, arg, btn, s) => {
        const ui = el._ss.ui; ui.draft = el.querySelector('.ss-cin')?.value ?? ui.draft;
        const a = await pickAttach(arg, s); if (!a) return;
        (ui.enc ??= []).push(a); app.renderPanel(el);
    },
    cencdel: (el, arg) => { const ui = el._ss.ui; ui.draft = el.querySelector('.ss-cin')?.value ?? ui.draft; ui.enc?.splice(Number(arg), 1); app.renderPanel(el); },
    creactpick: (el, arg) => { const ui = el._ss.ui; ui.reactFor = ui.reactFor === arg ? null : arg; app.renderPanel(el); },
    creact: async (el, arg, btn, s) => {
        const [id, r] = arg.split('|');
        el._ss.ui.reactFor = null;
        const nd = clone(s.data.contact); const f = findMsg(nd, id); if (!f) return;
        f.m.react = f.m.react === r ? '' : r;
        await commit('contact', nd, '');
    },
    cpin: async (el, arg, btn, s) => {
        const nd = clone(s.data.contact); const f = findMsg(nd, arg); if (!f) return;
        f.m.pin = !f.m.pin;
        await commit('contact', nd, '');
        toastr.info(f.m.pin ? '📌 고정했어요 — 본편 AI에게 꼭 알려 줘요.' : '고정을 풀었어요.', TITLE);
    },
    cunsend: async (el, arg, btn, s) => {
        const nd = clone(s.data.contact); const f = findMsg(nd, arg); if (!f) return;
        if (!f.m.read) { f.th.splice(f.k, 1); await commit('contact', nd, ''); toastr.info('상대가 읽기 전에 취소했어요.', TITLE); return; }
        Object.assign(f.m, { kind: 'deleted', orig: f.m.text, text: '' });
        await commit('contact', nd, `${f.who}에게 보낸 메시지를 지웠다 (이미 읽음)`);
        toastr.info('지웠지만… 상대는 이미 읽었어요.', TITLE);
    },
    copen: (el, arg) => { el._ss.tab = 'contact'; el._ss.ui = { who: arg }; app.renderPanel(el); markRead(arg); },
    talk: (el, arg) => CONTACT_ACTIONS.copen(el, arg),
    cback: (el) => { el._ss.ui = {}; app.renderPanel(el); },
    cadd: async (el, arg, btn, s) => {
        const n = el.querySelector('.ss-cnew').value.trim(); if (!n) return;
        const nd = clone(s.data.contact); if (!findBy(nd.contacts, n)) nd.contacts.push({ name: n, handle: '', status: '', courier: '' });
        await commit('contact', nd, '');
    },
    csend: async (el, arg, btn, s) => {
        const ui = el._ss.ui, who = ui.who;
        const text = el.querySelector('.ss-cin')?.value.trim(); if (!text) return;
        ui.noReply = !(el.querySelector('.ss-creply, .ss-lreply')?.checked ?? true);
        ui.rushPaid = !!el.querySelector('.ss-lrush')?.checked;
        ui.draft = '';
        busyBtn(btn, true, '');
        try { if (isLetter(s.data.contact)) await sendLetter(el, s, who, text); else await sendPhone(el, s, who, text); }
        finally { busyBtn(btn, false); }
    },
    creply: (el) => getPhoneReply(el, el._ss.ui.who),
    cpick: (el, arg) => { const ui = el._ss.ui; ui.draft = el.querySelector('.ss-cin')?.value ?? ui.draft; if (arg === '__express') ui.express = !ui.express; else { ui.courier = arg; ui.express = false; } app.renderPanel(el); },
    lopen: async (el, arg, btn, s) => {
        const nd0 = s.data.contact; const f = findMsg(nd0, arg); if (!f) return;
        busyBtn(btn, true, '뜯는 중…');
        try {
            const text = await letterReply(f.who, s, { courier: f.m.courier, rush: f.m.rush });
            const nd = clone(curState().data.contact); const g = findMsg(nd, arg); if (!g) return;
            Object.assign(g.m, { text, pending: false, date: stamp(curState()), edited: false });
            touchContact(nd, f.who);
            await commit('contact', nd, `${f.who}의 편지를 읽었다${f.m.rush ? ' (웃돈 주고 급행으로 온 편지)' : ''}: ${short(text, 40)}`);
        } catch (e) { console.error(e); toastr.error(`편지를 열지 못했어요: ${esc(e.message)}`, TITLE); busyBtn(btn, false); }
    },
    cping: async (el, arg, btn, s) => {
        const d = s.data.contact;
        let who = arg;
        if (!who) {
            const pool = names(d);
            if (!pool.length) { toastr.info('연락처가 없어요.', TITLE); return; }
            const rel = s.data.rel?.user ?? [];
            pool.sort((a, b) => (findBy(rel, b)?.aff ?? 0) - (findBy(rel, a)?.aff ?? 0));
            const ok = pool.filter(n => !findBy(d.contacts, n)?.blocked);
            if (!ok.length) { toastr.info('연락 올 사람이 없어요 (모두 차단).', TITLE); return; }
            who = ok[rand(Math.min(3, ok.length)) - 1];
        }
        if (findBy(d.contacts, who)?.blocked) { toastr.info(`${esc(who)}은(는) 차단했어요.`, TITLE); return; }
        busyBtn(btn, true, '기다리는 중…');
        try { await receivePing(who, false); el._ss.ui = { who }; el._ss.tab = 'contact'; app.renderPanel(el); }
        catch (e) { console.error(e); toastr.error(`실패: ${esc(e.message)}`, TITLE); busyBtn(btn, false); }
    },
    cmsgedit: (el, arg) => { el._ss.ui.editId = arg; el._ss.mode = 'typing'; app.renderPanel(el); el.querySelector('.ss-bub-ed')?.focus(); },
    cmsgcancel: (el) => { el._ss.ui.editId = null; el._ss.mode = 'view'; app.renderPanel(el); },
    cmsgsave: async (el, arg, btn, s) => {
        const text = el.querySelector('.ss-bub-ed')?.value.trim() ?? '';
        const nd = clone(s.data.contact); const f = findMsg(nd, arg); if (!f) return;
        el._ss.ui.editId = null; el._ss.mode = 'view';
        if (!text) f.th.splice(f.k, 1); else Object.assign(f.m, { text, edited: true });
        await commit('contact', nd, '');
    },
    cmsgdel: async (el, arg, btn, s) => {
        const nd = clone(s.data.contact); const f = findMsg(nd, arg); if (!f) return;
        f.th.splice(f.k, 1);
        await commit('contact', nd, '');
    },
    cmsgre: async (el, arg, btn, s) => {
        const f = findMsg(s.data.contact, arg); if (!f) return;
        // 이 말풍선과 그 뒤에 이어진 상대 말풍선들을 지우고 다시 받는다
        const nd = clone(s.data.contact); const g = findMsg(nd, arg);
        let end = g.k; while (end + 1 < g.th.length && g.th[end + 1].from === 'them') end++;
        g.th.splice(g.k + 1, end - g.k);
        await commit('contact', nd, '');
        await getPhoneReply(el, f.who, arg);
    },
    cmenu: async (el, arg, btn, s) => {
        const who = arg;
        const box = document.createElement('div');
        box.className = 'ss-root ss-scope ss-menu';
        box.innerHTML = `<h3>${avatar(who)} ${esc(who)}</h3>
            <button class="ss-btn wide" data-m="rename"><i class="fa-solid fa-signature"></i> 이름 바꾸기</button>
            <button class="ss-btn wide" data-m="status"><i class="fa-solid fa-comment-dots"></i> 상태 메시지 · 사는 곳</button>
            ${isLetter(s.data.contact) ? '<button class="ss-btn wide" data-m="courier"><i class="fa-solid fa-dove"></i> 이 사람이 쓰는 배달 수단</button>' : ''}
            <button class="ss-btn wide" data-m="ping">${ai1} ${isLetter(s.data.contact) ? '편지 오게' : '선톡 오게'}</button>
            <button class="ss-btn wide" data-m="summary">${ai1} 대화 한 줄 요약 만들기</button>
            <div class="ss-f"><span>본편 AI에게 이 대화를</span><div class="ss-seg wrap">${[['', '기본 설정'], ['always', '항상 반영'], ['pinned', '📌 고른 것만'], ['never', '숨기기 (비밀)']].map(([v, t]) => `<button class="${(findBy(s.data.contact.contacts, who)?.reflect ?? '') === v ? 'on' : ''}" data-m="refl:${v}">${t}</button>`).join('')}</div></div>
            <button class="ss-btn wide" data-m="block"><i class="fa-solid fa-ban"></i> ${findBy(s.data.contact.contacts, who)?.blocked ? '차단 풀기' : '차단하기'}</button>
            <button class="ss-btn wide" data-m="clear"><i class="fa-solid fa-broom"></i> 대화 비우기</button>
            <button class="ss-btn wide danger" data-m="remove"><i class="fa-solid fa-user-xmark"></i> 연락처 삭제</button>`;
        let pick = null;
        box.addEventListener('click', (e) => { const b = e.target.closest('[data-m]'); if (b) { pick = b.dataset.m; box.closest('dialog')?.querySelector('.popup-button-ok')?.click(); } });
        await app.popup(box);
        if (!pick) return;
        const nd = clone(curState().data.contact);
        const c = findBy(nd.contacts, who) ?? (nd.contacts.push({ name: who, handle: '', status: '', courier: '' }), nd.contacts.at(-1));
        if (pick === 'rename') {
            const v = (await askInput(TITLE, '새 이름', who))?.trim(); if (!v || v === who) return;
            c.name = v; if (nd.threads[who]) { nd.threads[v] = nd.threads[who]; delete nd.threads[who]; } if (nd.unread[who]) { nd.unread[v] = nd.unread[who]; delete nd.unread[who]; }
            if (el._ss.ui.who === who) el._ss.ui.who = v;
        }
        if (pick === 'status') { const v = await askInput(TITLE, '상태 메시지 · 사는 곳', c.status); if (v === null) return; c.status = v; }
        if (pick === 'courier') {
            const v = await askInput(TITLE, `배달 수단 이름 (${nd.couriers.map(x => x.name).join(', ')})`, c.courier || nd.couriers[0]?.name); if (v === null) return; c.courier = v.trim();
        }
        if (pick === 'ping') return CONTACT_ACTIONS.cping(el, who, null, curState());
        if (pick === 'summary') return maybeSummarize(who, true);
        if (pick.startsWith('refl:')) { c.reflect = pick.slice(5); }
        if (pick === 'block') { c.blocked = !c.blocked; toastr.info(c.blocked ? `${esc(who)}을(를) 차단했어요.` : '차단을 풀었어요.', TITLE); }
        if (pick === 'clear') { if (!(await askConfirm(`${esc(who)}와의 대화를 모두 지울까요?`))) return; nd.threads[who] = []; delete nd.unread[who]; }
        if (pick === 'remove') {
            if (!(await askConfirm(`${esc(who)}를 연락처에서 지울까요? (대화도 지워져요)`))) return;
            nd.contacts = nd.contacts.filter(x => norm(x.name) !== norm(who)); delete nd.threads[who]; delete nd.unread[who];
            if (el._ss.ui.who === who) el._ss.ui = {};
        }
        await commit('contact', nd, '');
    },
    cmode: async (el, arg, btn, s) => {
        const box = document.createElement('div');
        box.className = 'ss-root ss-scope ss-menu';
        box.innerHTML = `<h3>연락 방식</h3>${['phone', 'instant', 'letter'].map(k => `<button class="ss-btn wide ${s.data.contact.mode === k ? 'pri' : ''}" data-m="${k}"><i class="fa-solid ${CONTACT_MODES[k].icon}"></i> ${CONTACT_MODES[k].name}</button>`).join('')}<p class="ss-hint">이름은 「${esc(s.data.contact.app)}」 그대로예요. 바꾸려면 ✏️ 편집에서 고치세요.</p>`;
        let pick = null;
        box.addEventListener('click', (e) => { const b = e.target.closest('[data-m]'); if (b) { pick = b.dataset.m; box.closest('dialog')?.querySelector('.popup-button-ok')?.click(); } });
        await app.popup(box);
        if (!pick || pick === s.data.contact.mode) return;
        const nd = clone(s.data.contact); nd.mode = pick;
        if (pick === 'letter' && !nd.couriers.length) nd.couriers = clone(COURIER_PRESETS.slice(0, 3));
        await commit('contact', nd, `연락 방식 → ${CONTACT_MODES[pick].name}`);
    },
    ccour: async (el, arg, btn, s) => {
        const nd = clone(s.data.contact);
        const box = document.createElement('div');
        box.className = 'ss-root ss-scope ss-menu';
        const have = new Set(nd.couriers.map(c => c.name));
        box.innerHTML = `<h3><i class="fa-solid fa-dove"></i> 배달 수단</h3><p class="ss-hint">누르면 넣고 빼요. 일수·요금은 ✏️ 편집에서 바꿀 수 있어요.</p>
            <div class="ss-couriers">${[...COURIER_PRESETS, ...nd.couriers.filter(c => !COURIER_PRESETS.some(p => p.name === c.name))].map(c => `<button class="ss-cour ${have.has(c.name) ? 'on' : ''}" data-c="${esc(c.name)}"><em>${esc(c.icon)}</em><b>${esc(c.name)}</b><small>${c.min}~${c.max}일 · ${esc(c.note)}</small></button>`).join('')}</div>
            <div class="ss-inline"><input class="ss-in" placeholder="직접 추가: 이름 (예: 까마귀)"><input class="ss-in n" type="number" placeholder="일수" value="2"><button class="ss-btn" data-add="1">추가</button></div>`;
        box.addEventListener('click', (e) => {
            const b = e.target.closest('[data-c]');
            if (b) { const n = b.dataset.c; const k = nd.couriers.findIndex(c => c.name === n); if (k >= 0) { if (nd.couriers.length > 1) nd.couriers.splice(k, 1); } else nd.couriers.push(clone(COURIER_PRESETS.find(p => p.name === n))); b.classList.toggle('on', nd.couriers.some(c => c.name === n)); }
            if (e.target.closest('[data-add]')) {
                const [i1, i2] = box.querySelectorAll('input'); const n = i1.value.trim(); if (!n) return;
                const dd = Math.max(0, Number(i2.value) || 1); nd.couriers.push({ name: n, icon: '✉️', min: dd, max: dd, fee: 0, note: '' }); i1.value = '';
                toastr.success(`${esc(n)} 추가`, TITLE);
            }
        });
        await app.popup(box, { okButton: '저장' });
        await commit('contact', nd, '');
    },
};
export const CONTACT_CHANGES = {};

// 선톡(편지 오게): 지금 바로 도착
export async function receivePing(who, auto) {
    const s = curState();
    const lines = await pingMessage(who, s, auto);
    if (!lines.length) return;
    const nd = clone(curState().data.contact);
    const now = nowTick(s);
    const letter = isLetter(nd);
    const c = courierOf(nd, who);
    const th = nd.threads[who] ??= [];
    for (const l of lines) th.push({ id: uid(), from: 'them', text: l, date: stamp(s), at: now, arrive: now, courier: letter ? c.name : '', ping: true });
    readAll(th); // 먼저 연락해 왔다면 내 메시지도 읽은 것
    touchContact(nd, who);
    if (!findBy(nd.contacts, who)) nd.contacts.push({ name: who, handle: '', status: '', courier: '' });
    nd.unread[who] = (nd.unread[who] ?? 0) + 1;
    await commit('contact', nd, `${who}에게서 ${letter ? `${c.icon} 편지가 왔다` : '먼저 연락이 왔다'}: ${short(lines.join(' '), 40)}`);
    if (app.notify) app.notify({ kind: 'msg', who, text: lines[0], letter });
    else toastr.info(`${letter ? `📬 ${esc(who)}에게서 편지가 왔어요` : `💬 ${esc(who)}: ${esc(short(lines[0], 40))}`}`, TITLE);
}
export { getMeta };
