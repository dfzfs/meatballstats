// 📜 퀘스트 · 📰 뉴스 · 🍷 가십지 · 📋 게시판
import { app, esc, short, clone, uid, fmtNum, stamp, userName, TITLE, modOn } from './core.js';
import { commit, addAdjust } from './engine.js';
import { newNews, newGossip, newPosts, newQuests, boardReplies } from './ai.js';
import { ai1, emptyBox, seg, busyBtn, askConfirm, chip } from './kit.js';

const Q_ST = { active: ['진행 중', 'fa-person-running'], open: ['받을 수 있음', 'fa-scroll'], done: ['완료', 'fa-circle-check'], failed: ['실패', 'fa-circle-xmark'] };

// 보관함: 자동 정리로 옮겨진 옛 항목 (제목만)
const arcBox = (d, label = '보관함') => (d.archive?.length ? `<details class="ss-arc"><summary><i class="fa-solid fa-box-archive"></i> ${label} ${d.archive.length}개</summary><ul>${[...d.archive].reverse().map(x => `<li><b>${esc(x.title)}</b>${x.status ? ` <small>${x.status === 'done' ? '완료' : x.status === 'failed' ? '실패' : esc(x.status)}</small>` : ''}${x.date ? ` <small>${esc(x.date)}</small>` : ''}</li>`).join('')}</ul></details>` : '');

export function questView(s, d, ui) {
    ui.qf ??= d.list.some(q => q.status === 'active') ? 'active' : 'open';
    const count = (st) => d.list.filter(q => (st === 'end' ? q.status === 'done' || q.status === 'failed' : q.status === st)).length;
    const list = d.list.filter(q => (ui.qf === 'end' ? q.status === 'done' || q.status === 'failed' : q.status === ui.qf));
    const cur = s.data.wallet?.currency ?? '';
    return `<div class="ss-quests">
        ${seg([['active', `진행 중 <small>${count('active')}</small>`], ['open', `받을 수 있음 <small>${count('open')}</small>`], ['end', `끝남 <small>${count('end')}</small>`]], ui.qf, 'qf')}
        <div class="ss-stack">${list.map(q => `<article class="ss-quest ${q.status}">
            <div class="ss-quest-h"><i class="fa-solid ${Q_ST[q.status][1]}"></i><b>${esc(q.title)}</b>${chip(Q_ST[q.status][0], q.status)}</div>
            <div class="ss-meta">${q.giver ? `<span><i class="fa-solid fa-user"></i> ${esc(q.giver)}</span>` : ''}${q.place ? `<span><i class="fa-solid fa-location-dot"></i> ${esc(q.place)}</span>` : ''}${q.deadline ? `<span><i class="fa-regular fa-clock"></i> ${esc(q.deadline)}</span>` : ''}</div>
            ${q.desc ? `<p class="ss-pre">${esc(q.desc)}</p>` : ''}
            ${q.steps.length ? `<ul class="ss-steps">${q.steps.map((st, i) => `<li class="${st.done ? 'done' : ''}" data-act="qstep" data-arg="${esc(q.id)}|${i}"><i class="fa-${st.done ? 'solid fa-square-check' : 'regular fa-square'}"></i>${esc(st.text)}</li>`).join('')}</ul>` : ''}
            ${q.reward || q.cash || q.items.length ? `<div class="ss-reward"><i class="fa-solid fa-gift"></i>${q.cash ? `<b>${fmtNum(q.cash)} ${esc(cur)}</b>` : ''}${q.items.map(x => chip(esc(x))).join('')}${q.reward ? `<span>${esc(q.reward)}</span>` : ''}${q.paid ? chip('받음', 'done') : ''}</div>` : ''}
            <div class="ss-row-btns">${q.status === 'open' ? `<button class="ss-btn pri sm" data-act="qset" data-arg="${esc(q.id)}|active"><i class="fa-solid fa-check"></i> 수락</button><button class="ss-btn sm ghost" data-act="qdel" data-arg="${esc(q.id)}">거절</button>`
                : q.status === 'active' ? `<button class="ss-btn pri sm" data-act="qdone" data-arg="${esc(q.id)}"><i class="fa-solid fa-flag-checkered"></i> 완료 · 보상 받기</button><button class="ss-btn sm ghost" data-act="qset" data-arg="${esc(q.id)}|failed">포기</button>`
                : `<button class="ss-btn sm ghost" data-act="qdel" data-arg="${esc(q.id)}"><i class="fa-solid fa-trash-can"></i> 지우기</button>`}</div>
        </article>`).join('') || emptyBox(ui.qf === 'active' ? '진행 중인 퀘스트가 없어요' : ui.qf === 'open' ? '받을 수 있는 의뢰가 없어요' : '끝난 퀘스트가 없어요', 'fa-scroll')}</div>
        ${ui.qf === 'end' ? arcBox(d, '오래된 퀘스트') : ''}
        <div class="ss-row-btns"><button class="ss-btn" data-act="qfind">${ai1} 의뢰 찾기</button><button class="ss-btn ghost" data-act="qnew"><i class="fa-solid fa-plus"></i> 직접 추가</button></div>
        ${ui.qnew ? `<div class="ss-card ss-form"><input class="ss-in ss-q-t" placeholder="이름 (예: 잃어버린 고양이 찾기)"><textarea class="ss-in ss-q-d" rows="2" placeholder="내용"></textarea><div class="ss-inline"><input class="ss-in ss-q-g" placeholder="의뢰인"><input class="ss-in n ss-q-c" type="number" placeholder="보상금"></div><button class="ss-btn pri" data-act="qadd">추가 (바로 진행)</button></div>` : ''}
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
    try { await fn(); } catch (e) { console.error(e); toastr.error(`실패: ${esc(e.message)}`, TITLE); busyBtn(btn, false); }
}
export const FEED_ACTIONS = {
    qf: (el, arg) => { el._ss.ui.qf = arg; app.renderPanel(el); },
    qset: async (el, arg, btn, s) => {
        const [id, to] = arg.split('|');
        const nd = clone(s.data.quest); const q = nd.list.find(x => x.id === id); if (!q) return;
        q.status = to;
        el._ss.ui.qf = to === 'active' ? 'active' : 'end';
        await commit('quest', nd, to === 'active' ? `퀘스트 수락: ${q.title}` : to === 'failed' ? `퀘스트 포기: ${q.title}` : '');
    },
    qdone: async (el, arg, btn, s) => {
        const q = s.data.quest.list.find(x => x.id === arg); if (!q) return;
        if (!(await askConfirm(`「${esc(q.title)}」을(를) 완료로 처리하고 보상을 받을까요?`))) return;
        el._ss.ui.qf = 'end';
        await addAdjust({ ops: [['_questpay', q.id]], label: `퀘스트 완료: ${q.title}` });
    },
    qdel: async (el, arg, btn, s) => { const nd = clone(s.data.quest); nd.list = nd.list.filter(x => x.id !== arg); await commit('quest', nd, ''); },
    qstep: async (el, arg, btn, s) => {
        const [id, i] = arg.split('|'); const nd = clone(s.data.quest); const q = nd.list.find(x => x.id === id); if (!q?.steps[i]) return;
        q.steps[i].done = !q.steps[i].done;
        await commit('quest', nd, q.steps[i].done ? `퀘스트 진행: ${q.title} — ${q.steps[i].text}` : '');
    },
    qnew: (el) => { el._ss.ui.qnew = !el._ss.ui.qnew; app.renderPanel(el); },
    qadd: async (el, arg, btn, s) => {
        const t = el.querySelector('.ss-q-t').value.trim(); if (!t) return;
        const nd = clone(s.data.quest ?? { list: [] });
        nd.list.push({ id: uid(), title: t, desc: el.querySelector('.ss-q-d').value.trim(), giver: el.querySelector('.ss-q-g').value.trim(), place: '', deadline: '', reward: '', cash: Number(el.querySelector('.ss-q-c').value) || 0, items: [], status: 'active', steps: [], paid: false });
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
        if (x && !x.read) { const nd = clone(s.data.news); nd.items.find(i => i.id === arg).read = true; await commit('news', nd, ''); } else app.renderPanel(el);
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
export { modOn };
