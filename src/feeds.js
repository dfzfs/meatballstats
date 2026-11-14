// 📜 퀘스트 · 📰 뉴스 · 🍷 가십지 · 📋 게시판
import { app, esc, short, clone, uid, fmtNum, stamp, userName, TITLE, modOn, ssErr, settings, norm, DIFFS, diffOf, dayIndex } from './core.js';
import { commit, addAdjust, isFresh, questRoll, JUDGE_NAME, JUDGE_MUL, questDue } from './engine.js';
import { newNews, newGossip, newPosts, newQuests, boardReplies } from './ai.js';
import { ai1, emptyBox, seg, busyBtn, askConfirm, chip, choosePopup, insertInput, mascot } from './kit.js';

// ⌛ 기한 칩: D-3 · 오늘까지 · 기한 지남 (달력이 있고 기한을 읽을 수 있을 때)
function dueChip(s, q) {
    if (q.expired) return ' ' + chip('기한 지남', 'neg');
    if (q.status !== 'active' && q.status !== 'open') return '';
    const cal = s.data.calendar; if (!cal) return '';
    const due = questDue(s, q); if (due === null) return '';
    const left = due - dayIndex(cal);
    return ' ' + chip(left <= 0 ? '오늘까지' : `D-${left}`, left <= 1 ? 'warn' : '');
}
// 🎲 퀘스트 판정 목표 (d20 · 난이도 보정 전)
const Q_DC = [[8, '쉬움'], [12, '보통'], [15, '어려움'], [18, '매우 어려움']];
const JUDGE_ICON = { crit: '🌟', ok: '✅', fail: '😅', fumble: '💥' };
// 성공 확률 (d20: 20은 늘 성공 · 1은 늘 대실패)
function questChance(s, q) {
    const a = q.check?.attr ? (s.data.stats?.attrs ?? []).find(x => norm(x.name) === norm(q.check.attr)) : null;
    const mod = a?.val ?? 0, dc = (q.check?.dc ?? 12) + (DIFFS[diffOf()]?.dc ?? 0);
    let ok = 1; for (let k = 2; k <= 19; k++) if (k + mod >= dc) ok++;
    return Math.round((ok / 20) * 100);
}

const Q_ST = { active: ['진행 중', 'fa-person-running'], open: ['받을 수 있음', 'fa-scroll'], done: ['완료', 'fa-circle-check'], failed: ['실패', 'fa-circle-xmark'] };

// 보관함: 자동 정리로 옮겨진 옛 항목 (제목만)
const arcBox = (d, label = '보관함') => (d.archive?.length ? `<details class="ss-arc"><summary><i class="fa-solid fa-box-archive"></i> ${label} ${d.archive.length}개</summary><ul>${[...d.archive].reverse().map(x => `<li><b>${esc(x.title)}</b>${x.status ? ` <small>${x.status === 'done' ? '완료' : x.status === 'failed' ? '실패' : esc(x.status)}</small>` : ''}${x.date ? ` <small>${esc(x.date)}</small>` : ''}</li>`).join('')}</ul></details>` : '');

export function questView(s, d, ui) {
    ui.qf ??= d.list.some(q => q.status === 'active') ? 'active' : 'open';
    const count = (st) => d.list.filter(q => (st === 'end' ? q.status === 'done' || q.status === 'failed' : q.status === st)).length;
    const list = d.list.filter(q => (ui.qf === 'end' ? q.status === 'done' || q.status === 'failed' : q.status === ui.qf));
    const cur = s.data.wallet?.currency ?? '';
    const judgeOn = (settings().questJudge ?? 'ask') !== 'off';
    const attrs = modOn('stats') ? s.data.stats?.attrs ?? [] : [];
    const fr = app.current?.fresh;
    return `<div class="ss-quests">
        ${seg([['active', `진행 중 <small>${count('active')}</small>`], ['open', `받을 수 있음 <small>${count('open')}</small>`], ['end', `끝남 <small>${count('end')}</small>`]], ui.qf, 'qf')}
        <div class="ss-stack">${list.map(q => `<article class="ss-quest ${q.status}">
            <div class="ss-quest-h"><i class="fa-solid ${(Q_ST[q.status] ?? Q_ST.open)[1]}"></i><b>${isFresh(fr, 'quest', 'list', q.title) ? '<i class="ss-fresh" title="방금 AI 답에서 바뀌었어요"></i>' : ''}${esc(q.title)}</b>${chip((Q_ST[q.status] ?? Q_ST.open)[0], q.status)}</div>
            <div class="ss-meta">${q.giver ? `<span><i class="fa-solid fa-user"></i> ${esc(q.giver)}</span>` : ''}${q.place ? `<span><i class="fa-solid fa-location-dot"></i> ${esc(q.place)}</span>` : ''}${q.deadline ? `<span><i class="fa-regular fa-clock"></i> ${esc(q.deadline)}${dueChip(s, q)}</span>` : ''}</div>
            ${q.desc ? `<p class="ss-pre">${esc(q.desc)}</p>` : ''}
            ${q.steps.length ? `<ul class="ss-steps">${q.steps.map((st, i) => `<li class="${st.done ? 'done' : ''}" data-act="qstep" data-arg="${esc(q.id)}|${i}"><i class="fa-${st.done ? 'solid fa-square-check' : 'regular fa-square'}"></i>${esc(st.text)}</li>`).join('')}</ul>` : ''}
            ${q.reward || q.cash || q.items.length ? `<div class="ss-reward"><i class="fa-solid fa-gift"></i>${q.cash ? `<b>${fmtNum(q.cash)} ${esc(cur)}</b>` : ''}${q.items.map(x => chip(esc(x))).join('')}${q.reward ? `<span>${esc(q.reward)}</span>` : ''}${q.paid ? chip('받음', 'done') : ''}</div>` : ''}
            ${q.status === 'active' && judgeOn ? `<div class="ss-qcheck"><span><i class="fa-solid fa-dice-d20"></i> 완료 판정</span><select class="ss-in sm" data-chg="qcheck" data-arg="${esc(q.id)}|attr" title="판정에 더할 능력치"><option value="">능력치 없이</option>${attrs.map(a => `<option value="${esc(a.name)}" ${norm(a.name) === norm(q.check?.attr ?? '') ? 'selected' : ''}>${esc(a.name)} ${a.val >= 0 ? '+' : ''}${a.val}</option>`).join('')}</select><select class="ss-in sm" data-chg="qcheck" data-arg="${esc(q.id)}|dc" title="목표 (d20)">${Q_DC.map(([v, t]) => `<option value="${v}" ${(q.check?.dc ?? 12) === v ? 'selected' : ''}>${t} ${v}</option>`).join('')}</select><small class="ss-dim">성공 ${questChance(s, q)}%</small></div>` : ''}
            ${q.judge ? `<div class="ss-hint">🎲 완료 판정: <b>${JUDGE_ICON[q.judge] ?? ''} ${esc(JUDGE_NAME[q.judge] ?? q.judge)}</b>${q.judge !== 'ok' ? ` · 보상 ×${JUDGE_MUL[q.judge]}` : ''}</div>` : ''}
            <div class="ss-row-btns">${q.status === 'open' ? `<button class="ss-btn pri sm" data-act="qset" data-arg="${esc(q.id)}|active"><i class="fa-solid fa-check"></i> 수락</button><button class="ss-btn sm ghost" data-act="qdel" data-arg="${esc(q.id)}">거절</button>`
                : q.status === 'active' ? `<button class="ss-btn pri sm" data-act="qdone" data-arg="${esc(q.id)}"><i class="fa-solid fa-flag-checkered"></i> 완료 · 보상 받기</button><button class="ss-btn sm ghost" data-act="qset" data-arg="${esc(q.id)}|failed">포기</button><button class="ss-btn sm ghost" data-act="qdel" data-arg="${esc(q.id)}" title="목록에서 지우기 (AI가 다시 적어도 살아나지 않아요)"><i class="fa-solid fa-trash-can"></i></button>`
                : `<button class="ss-btn sm ghost" data-act="qset" data-arg="${esc(q.id)}|active" title="다시 진행 중으로"><i class="fa-solid fa-rotate-left"></i> 다시 진행</button><button class="ss-btn sm ghost" data-act="qdel" data-arg="${esc(q.id)}"><i class="fa-solid fa-trash-can"></i> 지우기</button>`}</div>
        </article>`).join('') || emptyBox(ui.qf === 'active' ? '진행 중인 퀘스트가 없어요' : ui.qf === 'open' ? '받을 수 있는 의뢰가 없어요' : '끝난 퀘스트가 없어요', 'fa-scroll')}</div>
        ${ui.qf === 'end' ? arcBox(d, '오래된 퀘스트') : ''}
        <div class="ss-row-btns"><button class="ss-btn" data-act="qfind">${ai1} 의뢰 찾기</button><button class="ss-btn ghost" data-act="qnew"><i class="fa-solid fa-plus"></i> 직접 추가</button></div>
        ${ui.qnew ? `<div class="ss-card ss-form"><input class="ss-in ss-q-t" placeholder="이름 (예: 잃어버린 고양이 찾기)"><textarea class="ss-in ss-q-d" rows="2" placeholder="내용"></textarea><div class="ss-inline"><input class="ss-in ss-q-g" placeholder="의뢰인"><input class="ss-in n ss-q-c" type="number" placeholder="보상금"></div><input class="ss-in ss-q-dl" placeholder="기한 (선택 · 예: 3일 안에 · 3월 14일)"><button class="ss-btn pri" data-act="qadd">추가 (바로 진행)</button></div>` : ''}
    </div>`;
}

export function newsView(s, d, ui) {
    const list = [...d.items].reverse();
    return `<div class="ss-news">
        <div class="ss-mast"><small>${esc(stamp(s) || '')}</small><b>${esc(d.name || '뉴스')}</b><span></span></div>
        <div class="ss-stack">${list.map((x, i) => `<article class="ss-article ${i === 0 ? 'lead' : ''} ${ui.open === x.id ? 'open' : ''}">
            <div class="ss-art-h" data-act="nopen" data-arg="${esc(x.id)}">${x.tag ? `<em>${esc(x.tag)}</em>` : ''}<b>${esc(x.title)}</b>${!x.read ? '<i class="ss-dot"></i>' : ''}</div>
            <p class="ss-art-b">${esc(x.body)}</p>
            <div class="ss-art-f"><small>${esc(x.date)}</small><button class="ss-ib" data-act="ndel" data-arg="${esc(x.id)}" title="지우기"><i class="fa-solid fa-trash-can"></i></button></div>
        </article>`).join('') || emptyBox('아직 기사가 없어요', 'fa-newspaper')}</div>
        ${arcBox(d, '지난 기사')}
        <button class="ss-btn" data-act="nnew">${ai1} 새 소식 발행</button>
    </div>`;
}

export function gossipView(s, d) {
    const list = [...d.issues].reverse();
    return `<div class="ss-gossip">
        <div class="ss-tab-mast"><b>${esc(d.name || '가십지')}</b><small>${esc(stamp(s))} · 믿거나 말거나</small></div>
        <div class="ss-stack">${list.map(x => `<article class="ss-goss h${x.heat}">
            <div class="ss-goss-h"><span class="ss-heat">${'🔥'.repeat(x.heat)}</span><b>${esc(x.title)}</b></div>
            <p>${esc(x.body)}</p>
            <div class="ss-art-f">${x.about.map(n => chip(esc(n))).join('')}<small>${esc(x.date)}</small><button class="ss-ib" data-act="gdel" data-arg="${esc(x.id)}"><i class="fa-solid fa-trash-can"></i></button></div>
        </article>`).join('') || emptyBox('조용한 날이네요. 아직 소문이 없어요', 'fa-wine-glass')}</div>
        ${arcBox(d, '지난 호')}
        <button class="ss-btn" data-act="gnew">${ai1} 새 호 발행</button>
    </div>`;
}

export function boardView(s, d, ui) {
    if (ui.post) {
        const p = d.posts.find(x => x.id === ui.post);
        if (p) return `<div class="ss-board">
            <div class="ss-phone-top"><button class="ss-ib" data-act="bback"><i class="fa-solid fa-chevron-left"></i></button><div class="ss-ct-b"><b>${esc(d.name || '게시판')}</b></div></div>
            <article class="ss-post-full">${p.tag ? `<em class="ss-tagc">${esc(p.tag)}</em>` : ''}<h3>${esc(p.title)}</h3>
                <div class="ss-meta"><span><i class="fa-solid fa-user"></i> ${esc(p.mine ? userName() : p.author)}</span><span>${esc(p.date)}</span></div>
                ${ui.editPost ? `<textarea class="ss-in ss-p-ed" rows="5">${esc(p.body)}</textarea><div class="ss-row-btns"><button class="ss-btn pri sm" data-act="bsave" data-arg="${esc(p.id)}">저장</button><button class="ss-btn sm" data-act="bedit">취소</button></div>` : `<p class="ss-pre">${esc(p.body)}</p>`}
                <div class="ss-row-btns"><button class="ss-btn sm ghost" data-act="bedit"><i class="fa-solid fa-pen"></i> 수정</button><button class="ss-btn sm ghost" data-act="bdel" data-arg="${esc(p.id)}"><i class="fa-solid fa-trash-can"></i> 삭제</button></div></article>
            <div class="ss-replies"><div class="ss-sec-h"><h4>댓글 ${p.replies.length}</h4></div>${p.replies.map(r => `<div class="ss-reply ${r.mine ? 'me' : ''}"><b>${esc(r.mine ? userName() : r.author)}</b><span>${esc(r.text)}</span><button class="ss-ib" data-act="brdel" data-arg="${esc(p.id)}|${esc(r.id)}"><i class="fa-solid fa-xmark"></i></button></div>`).join('') || '<div class="ss-hint">아직 댓글이 없어요</div>'}
                <div class="ss-inline"><input class="ss-in ss-r-in" placeholder="댓글 쓰기"><button class="ss-btn" data-act="breply" data-arg="${esc(p.id)}">등록</button></div>
                <button class="ss-btn ghost" data-act="bai" data-arg="${esc(p.id)}">${ai1} 댓글 달리기</button></div>
        </div>`;
    }
    const list = [...d.posts].reverse();
    return `<div class="ss-board">
        <div class="ss-tab-mast board"><b>${esc(d.name || '게시판')}</b><small>글 ${d.posts.length}개</small></div>
        <div class="ss-posts">${list.map(p => `<div class="ss-post" data-act="bopen" data-arg="${esc(p.id)}">${p.tag ? `<em class="ss-tagc">${esc(p.tag)}</em>` : ''}<b>${esc(p.title)}</b>${p.replies.length ? `<span class="ss-rc">[${p.replies.length}]</span>` : ''}<small>${esc(p.mine ? userName() : p.author)}${p.mine ? ' · 내 글' : ''}</small></div>`).join('') || emptyBox('글이 없어요', 'fa-clipboard-list')}</div>
        ${arcBox(d, '지난 글')}
        <div class="ss-row-btns"><button class="ss-btn" data-act="bnew">${ai1} 새 글 불러오기</button><button class="ss-btn ghost" data-act="bwrite"><i class="fa-solid fa-pen-to-square"></i> 글쓰기</button></div>
        ${ui.write ? `<div class="ss-card ss-form"><input class="ss-in ss-p-t" placeholder="제목"><textarea class="ss-in ss-p-b" rows="4" placeholder="내용"></textarea><label class="ss-tog"><input type="checkbox" class="ss-switch ss-p-anon"><span>익명으로</span></label><button class="ss-btn pri" data-act="bpost">올리기</button></div>` : ''}
    </div>`;
}

// ───── 동작 ─────
const st = () => app.current?.state;
async function aiAdd(btn, label, fn) {
    busyBtn(btn, true, label);
    try { await fn(); } catch (e) { ssErr(e); toastr.error(`실패: ${esc(e.message)}`, TITLE); busyBtn(btn, false); }
}
export const FEED_ACTIONS = {
    qf: (el, arg) => { el._ss.ui.qf = arg; app.renderPanel(el); },
    qset: async (el, arg, btn, s) => {
        const k = arg.lastIndexOf('|'); const id = arg.slice(0, k), to = arg.slice(k + 1); // id에 「|」가 들어 있어도 (채팅 이름)
        const nd = clone(s.data.quest); const q = nd.list.find(x => x.id === id); if (!q) return;
        const was = q.status;
        if (to === 'failed' && !(await askConfirm(`「${esc(q.title)}」을(를) 포기할까요? 보상은 받지 못해요. (끝남 칸에서 「다시 진행」으로 되돌릴 수 있어요)`))) return;
        q.status = to;
        el._ss.ui.qf = to === 'active' ? 'active' : 'end';
        await commit('quest', nd, to === 'active' ? (was === 'open' ? `퀘스트 수락: ${q.title}` : `퀘스트 다시 진행: ${q.title}`) : to === 'failed' ? `퀘스트 포기: ${q.title}` : '');
        toastr.info(to === 'failed' ? `「${esc(q.title)}」을(를) 포기했어요. 끝남 칸으로 옮겼어요.` : `「${esc(q.title)}」 진행 중`, TITLE);
    },
    qdone: async (el, arg, btn, s) => {
        const q = s.data.quest.list.find(x => x.id === arg); if (!q) return;
        const mode = settings().questJudge ?? 'ask';
        const cur = s.data.wallet?.currency ?? '';
        const reward = [q.cash ? `${fmtNum(q.cash)} ${cur}` : '', ...q.items, q.reward].filter(Boolean).join(' · ') || '보상 없음';
        let r = null;
        if (mode === 'off') {
            if (!(await askConfirm(`「${esc(q.title)}」을(를) 완료로 처리하고 보상을 받을까요?<br><small>${esc(reward)}</small>`))) return;
        } else {
            const box = document.createElement('div');
            box.className = 'ss-root ss-scope ss-qjudge';
            const a = q.check?.attr || '';
            box.innerHTML = `<div class="ss-wz-head">${mascot('think', 'sm')}<div><b>📜 ${esc(q.title)} — 완료 판정</b><small>${a ? `${esc(a)} 보정 · ` : ''}목표 ${(q.check?.dc ?? 12)}${DIFFS[diffOf()]?.dc ? ` (${DIFFS[diffOf()].name} ${DIFFS[diffOf()].dc > 0 ? '+' : ''}${DIFFS[diffOf()].dc})` : ''} · 성공 ${questChance(s, q)}%</small></div></div>
                <p>보상: <b>${esc(reward)}</b></p>
                <div class="ss-qj-table"><span>🌟 대성공 (20)</span><b>보상 1.5배</b><span>✅ 성공</span><b>보상 그대로</b><span>😅 실패</span><b>돈 절반 · 아이템 없음</b><span>💥 대실패 (1)</span><b>보상 없이 실패</b></div>
                <div class="ss-row-btns"><button class="ss-btn pri" data-choice="roll"><i class="fa-solid fa-dice-d20"></i> 판정하고 완료</button>${mode === 'ask' ? '<button class="ss-btn ghost" data-choice="plain">판정 없이 완료</button>' : ''}</div>
                <p class="ss-hint">판정 방식은 확장 설정 › 기능 켜고 끄기 › 「퀘스트 완료 판정」에서 바꿔요. 능력치 · 목표는 퀘스트 카드에서 고를 수 있어요.</p>`;
            const pick = await choosePopup(box, '취소');
            if (!pick) return;
            if (pick === 'roll') r = questRoll(s, q);
        }
        el._ss.ui.qf = 'end';
        const label = r ? `🎲 퀘스트 완료 판정: ${q.title} — ${JUDGE_NAME[r.cls]} (${r.detail})` : `퀘스트 완료: ${q.title}`;
        await addAdjust({ ops: [['_questpay', r ? `${q.id}|${r.cls}` : q.id]], label });
        if (r) {
            const tag = `[퀘스트 판정 · ${q.title}${r.attr ? ` (${r.attr})` : ''} · ${r.detail} · ${JUDGE_NAME[r.cls]}]`;
            const box = document.createElement('div');
            box.className = 'ss-root ss-scope ss-qjudge';
            box.innerHTML = `<div class="ss-dice-res ${r.cls === 'fail' ? 'fail' : r.cls}"><b>${JUDGE_ICON[r.cls]} ${esc(JUDGE_NAME[r.cls])}</b><small>${esc(r.detail)}</small></div>
                <p>${r.cls === 'fumble' ? '보상 없이 실패로 끝났어요.' : r.cls === 'fail' ? '완료는 했지만 보상이 절반이에요 (아이템 없음).' : r.cls === 'crit' ? '보상을 1.5배로 받았어요!' : '보상을 받았어요.'}</p>
                <div class="ss-row-btns"><button class="ss-btn" data-choice="input"><i class="fa-solid fa-keyboard"></i> 결과를 입력창에 넣기</button></div>`;
            if (await choosePopup(box, '닫기') === 'input') insertInput(tag);
        }
    },
    qdel: async (el, arg, btn, s) => {
        const q = s.data.quest.list.find(x => x.id === arg); if (!q) return;
        if (q.status !== 'open' && !(await askConfirm(`「${esc(q.title)}」을(를) 목록에서 지울까요? AI가 다시 적어도 살아나지 않아요.`))) return;
        const nd = clone(s.data.quest); nd.list = nd.list.filter(x => x.id !== arg);
        nd.gone = [...(nd.gone ?? []).filter(g => norm(g) !== norm(q.title)), q.title].slice(-60); // AI가 같은 이름을 다시 적어도 무시
        await commit('quest', nd, '');
        toastr.info(`「${esc(q.title)}」을(를) 지웠어요.`, TITLE);
    },
    qstep: async (el, arg, btn, s) => {
        const [id, i] = arg.split('|'); const nd = clone(s.data.quest); const q = nd.list.find(x => x.id === id); if (!q?.steps[i]) return;
        q.steps[i].done = !q.steps[i].done;
        await commit('quest', nd, q.steps[i].done ? `퀘스트 진행: ${q.title} — ${q.steps[i].text}` : '');
    },
    qnew: (el) => { el._ss.ui.qnew = !el._ss.ui.qnew; app.renderPanel(el); },
    qadd: async (el, arg, btn, s) => {
        const t = el.querySelector('.ss-q-t').value.trim(); if (!t) return;
        const nd = clone(s.data.quest ?? { list: [] });
        nd.gone = (nd.gone ?? []).filter(g => norm(g) !== norm(t)); // 지웠던 이름을 직접 다시 추가하면 되살림
        nd.list.push({ id: uid(), title: t, desc: el.querySelector('.ss-q-d').value.trim(), giver: el.querySelector('.ss-q-g').value.trim(), place: '', reward: '', cash: Number(el.querySelector('.ss-q-c').value) || 0, items: [], status: 'active', steps: [], paid: false, deadline: el.querySelector('.ss-q-dl')?.value.trim() ?? '', ...(s.data.calendar ? { since: dayIndex(s.data.calendar) } : {}) });
        el._ss.ui.qnew = false; el._ss.ui.qf = 'active';
        await commit('quest', nd, `새 목표: ${t}`);
    },
    qfind: (el, arg, btn, s) => aiAdd(btn, '찾는 중…', async () => {
        const add = await newQuests(s);
        const nd = clone(st().data.quest ?? { list: [] }); nd.list.push(...add);
        el._ss.ui.qf = 'open';
        await commit('quest', nd, '');
        toastr.success(`의뢰 ${add.length}개`, TITLE);
    }),
    nopen: async (el, arg, btn, s) => {
        el._ss.ui.open = el._ss.ui.open === arg ? null : arg;
        const x = s.data.news.items.find(i => i.id === arg);
        if (x && !x.read) await addAdjust({ ops: [['_nread', arg]], silent: true }); else app.renderPanel(el);
    },
    ndel: async (el, arg, btn, s) => { const nd = clone(s.data.news); nd.items = nd.items.filter(x => x.id !== arg); await commit('news', nd, ''); },
    nnew: (el, arg, btn, s) => aiAdd(btn, '취재 중…', async () => {
        const o = await newNews(s);
        const nd = clone(st().data.news ?? { name: '', items: [] }); nd.name ||= o.name; nd.items.push(...o.items); nd.items = nd.items.slice(-40);
        el._ss.ui.open = o.items[0]?.id;
        await commit('news', nd, '');
    }),
    gdel: async (el, arg, btn, s) => { const nd = clone(s.data.gossip); nd.issues = nd.issues.filter(x => x.id !== arg); await commit('gossip', nd, ''); },
    gnew: (el, arg, btn, s) => aiAdd(btn, '수군수군…', async () => {
        const o = await newGossip(s);
        const nd = clone(st().data.gossip ?? { name: '', issues: [] }); nd.name ||= o.name; nd.issues.push(...o.issues); nd.issues = nd.issues.slice(-30);
        await commit('gossip', nd, '');
    }),
    bopen: (el, arg) => { el._ss.ui = { post: arg }; app.renderPanel(el); },
    bback: (el) => { el._ss.ui = {}; app.renderPanel(el); },
    bwrite: (el) => { el._ss.ui.write = !el._ss.ui.write; app.renderPanel(el); },
    bedit: (el) => { el._ss.ui.editPost = !el._ss.ui.editPost; el._ss.mode = el._ss.ui.editPost ? 'typing' : 'view'; app.renderPanel(el); },
    bsave: async (el, arg, btn, s) => {
        const nd = clone(s.data.board); const p = nd.posts.find(x => x.id === arg); if (!p) return;
        p.body = el.querySelector('.ss-p-ed').value; el._ss.ui.editPost = false; el._ss.mode = 'view';
        await commit('board', nd, '');
    },
    bpost: async (el, arg, btn, s) => {
        const t = el.querySelector('.ss-p-t').value.trim(); if (!t) return;
        const anon = el.querySelector('.ss-p-anon').checked;
        const nd = clone(s.data.board ?? { name: '', posts: [] });
        const p = { id: uid(), author: anon ? '익명' : userName(), title: t, body: el.querySelector('.ss-p-b').value.trim(), date: stamp(s), mine: !anon, tag: '', replies: [] };
        nd.posts.push(p);
        el._ss.ui = { post: p.id };
        await commit('board', nd, `${nd.name || '게시판'}에 글을 올렸다: ${short(t, 30)}`);
    },
    bdel: async (el, arg, btn, s) => {
        if (!(await askConfirm('이 글을 지울까요?'))) return;
        const nd = clone(s.data.board); nd.posts = nd.posts.filter(x => x.id !== arg); el._ss.ui = {}; await commit('board', nd, '');
    },
    breply: async (el, arg, btn, s) => {
        const t = el.querySelector('.ss-r-in').value.trim(); if (!t) return;
        const nd = clone(s.data.board); const p = nd.posts.find(x => x.id === arg); if (!p) return;
        p.replies.push({ id: uid(), author: userName(), text: t, mine: true });
        await commit('board', nd, '');
    },
    brdel: async (el, arg, btn, s) => {
        const [pid, rid] = arg.split('|'); const nd = clone(s.data.board); const p = nd.posts.find(x => x.id === pid); if (!p) return;
        p.replies = p.replies.filter(r => r.id !== rid); await commit('board', nd, '');
    },
    bai: (el, arg, btn, s) => aiAdd(btn, '댓글 기다리는 중…', async () => {
        const p = s.data.board.posts.find(x => x.id === arg); if (!p) return;
        const add = await boardReplies(s, p);
        const nd = clone(st().data.board); nd.posts.find(x => x.id === arg)?.replies.push(...add);
        await commit('board', nd, '');
    }),
    bnew: (el, arg, btn, s) => aiAdd(btn, '불러오는 중…', async () => {
        const o = await newPosts(s);
        const nd = clone(st().data.board ?? { name: '', posts: [] }); nd.name ||= o.name; nd.posts.push(...o.posts); nd.posts = nd.posts.slice(-40);
        await commit('board', nd, '');
    }),
};
// 퀘스트 카드의 판정 능력치 · 목표 고르기
export const FEED_CHANGES = {
    qcheck: async (el, t, s) => {
        const k = t.dataset.arg.lastIndexOf('|'); const id = t.dataset.arg.slice(0, k), what = t.dataset.arg.slice(k + 1);
        const nd = clone(s.data.quest); const q = nd.list.find(x => x.id === id); if (!q) return;
        q.check = { attr: q.check?.attr ?? '', dc: q.check?.dc ?? 12, [what]: what === 'dc' ? Number(t.value) || 12 : t.value };
        await commit('quest', nd, '');
    },
};
export { modOn };
