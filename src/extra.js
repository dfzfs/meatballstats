// v2.5 화면: SNS · 추천 음악 · 내 탭 · 추억 앨범 · 플레이 기록 · 검색 · 속마음 · 엔딩 · 모델 맞춤 설정
import { app, ctx, settings, saveSettings, isAiPart, aiOff, partTouched, getMeta, saveMeta, modOn, esc, short, clone, clamp, num, fmtNum, signed, uid, findBy, norm, stamp, userName, TITLE, LOG, MOD, dayIndex, msgText, DEFAULT_STAGES } from './core.js';
import { loveIndex, ensureLove, relAxes, romanceStart, ladderIssue, fixLoveLadder } from './core.js';
import { addAdjust, commit, stageIndex, stripStatus, isFresh } from './engine.js';
const FRESH_I = '<i class="ss-fresh" title="방금 AI 답에서 바뀌었어요"></i>';
import { newSns, snsReactions, musicPicks, peekMind, fillWants } from './ai.js';
import { sec, emptyBox, chip, avatar, ai1, seg, gauge, meter, askInput, askConfirm, busyBtn, insertInput, closeIfPopup, mascot, choosePopup } from './kit.js';
import { MUSIC_APPS, songLink } from './notify.js';

const play = (x, label = '') => `<a class="ss-btn sm ss-play" href="${esc(songLink(x))}" target="_blank" rel="noopener" title="${esc((MUSIC_APPS[settings().musicApp] ?? MUSIC_APPS.youtube).name)}에서 찾기"><i class="fa-solid fa-play"></i>${label ? ` ${label}` : ''}</a>`;

// ───── #️⃣ SNS ─────
export function snsView(s, d, ui) {
    const posts = [...d.posts].reverse();
    return `<div class="ss-shop-h"><div><b>${esc(d.name || 'SNS')}</b><small>게시물 ${d.posts.length}개</small></div><button class="ss-btn sm" data-act="snsnew">${ai1} 새 게시물</button></div>
        <details class="ss-card ss-compose-sns" ${ui.snsOpen ? 'open' : ''}><summary><i class="fa-solid fa-pen-to-square"></i> 내 게시물 올리기</summary>
            <textarea class="ss-in ss-sns-text" rows="2" placeholder="오늘 있었던 일…"></textarea>
            <input class="ss-in ss-sns-pic" placeholder="📷 사진 묘사 (선택 · 예: 창가에 앉은 고양이)">
            <div class="ss-row-btns"><button class="ss-btn pri sm" data-act="snspost">올리기</button><small class="ss-hint">올린 뒤 「반응 받기」를 누르면 좋아요·댓글이 달려요 (AI 1회)</small></div></details>
        <div class="ss-feed">${posts.map(p => `<article class="ss-snspost ${p.mine ? 'mine' : ''}">
            <header>${avatar(p.mine ? userName() : p.author, 'sm')}<div><b>${esc(p.mine ? userName() : p.author)}</b><small>${esc(p.date)}</small></div>${p.mine ? `<button class="ss-ib" data-act="snsdel" data-arg="${esc(p.id)}" title="지우기"><i class="fa-solid fa-trash-can"></i></button>` : ''}</header>
            ${p.pic ? `<div class="ss-snspic"><i class="fa-solid fa-camera"></i><span>${esc(p.pic)}</span></div>` : ''}
            ${p.text ? `<p class="ss-pre">${esc(p.text)}</p>` : ''}${p.tags ? `<p class="ss-snstags">${esc(p.tags)}</p>` : ''}
            <div class="ss-snsbar"><button class="ss-ib t ${p.liked ? 'on' : ''}" data-act="snslike" data-arg="${esc(p.id)}"><i class="fa-${p.liked ? 'solid' : 'regular'} fa-heart"></i> ${fmtNum(p.likes + (p.liked ? 1 : 0))}</button><span class="ss-dim"><i class="fa-regular fa-comment"></i> ${p.replies.length}</span>${p.mine ? `<button class="ss-btn sm ghost" data-act="snsreact" data-arg="${esc(p.id)}">${ai1} 반응 받기</button>` : ''}</div>
            ${p.replies.length ? `<div class="ss-replies">${p.replies.map(r => `<div class="ss-reply ${r.mine ? 'mine' : ''}"><b>${esc(r.mine ? userName() : r.author)}</b> ${esc(r.text)}</div>`).join('')}</div>` : ''}
            <div class="ss-inline"><input class="ss-in sm ss-sns-rep" data-id="${esc(p.id)}" placeholder="댓글 달기"><button class="ss-btn sm" data-act="snsreply" data-arg="${esc(p.id)}">달기</button></div>
        </article>`).join('') || emptyBox('아직 게시물이 없어요. 「새 게시물」을 눌러 보세요.', 'fa-hashtag')}</div>`;
}
const snsData = (s) => clone(s.data.sns);
export const SNS_ACTIONS = {
    snsnew: async (el, arg, btn, s) => {
        busyBtn(btn, true, '불러오는 중…');
        try { const o = await newSns(s); const nd = snsData(s); if (o.name && !nd.name) nd.name = o.name; nd.posts.push(...o.posts); await commit('sns', nd, ''); toastr.success(`새 게시물 ${o.posts.length}개`, TITLE); }
        catch (e) { toastr.error(`불러오지 못했어요: ${esc(e.message)}`, TITLE); busyBtn(btn, false); }
    },
    snspost: async (el, arg, btn, s) => {
        const text = el.querySelector('.ss-sns-text')?.value.trim() ?? '', pic = el.querySelector('.ss-sns-pic')?.value.trim() ?? '';
        if (!text && !pic) { toastr.info('글이나 사진 묘사를 적어 주세요.', TITLE); return; }
        const nd = snsData(s);
        nd.posts.push({ id: uid(), author: userName(), text, pic, tags: '', likes: 0, date: stamp(s), mine: true, liked: false, replies: [] });
        el._ss.ui.snsOpen = false;
        await commit('sns', nd, `${s.data.sns.name || 'SNS'}에 게시물을 올렸다: ${short(text || `[사진] ${pic}`, 40)}`);
    },
    snsdel: async (el, arg, btn, s) => { if (!(await askConfirm('이 게시물을 지울까요?'))) return; const nd = snsData(s); nd.posts = nd.posts.filter(p => p.id !== arg); await commit('sns', nd, ''); },
    snslike: async (el, arg, btn, s) => { const nd = snsData(s); const p = nd.posts.find(x => x.id === arg); if (!p) return; p.liked = !p.liked; await commit('sns', nd, ''); },
    snsreply: async (el, arg, btn, s) => {
        const inp = [...el.querySelectorAll('.ss-sns-rep')].find(i => i.dataset.id === arg);
        const t = inp?.value.trim(); if (!t) return;
        const nd = snsData(s); const p = nd.posts.find(x => x.id === arg); if (!p) return;
        p.replies.push({ id: uid(), author: userName(), text: t, mine: true });
        await commit('sns', nd, `${p.mine ? '내' : `${p.author}의`} 게시물에 댓글: ${short(t, 30)}`);
    },
    snsreact: async (el, arg, btn, s) => {
        const p0 = s.data.sns.posts.find(x => x.id === arg); if (!p0) return;
        busyBtn(btn, true, '반응 오는 중…');
        try {
            const r = await snsReactions(s, p0);
            const nd = snsData(s); const p = nd.posts.find(x => x.id === arg); if (!p) return;
            p.likes = Math.max(p.likes, r.likes); p.replies.push(...r.replies);
            await commit('sns', nd, r.replies.length ? `내 게시물에 댓글 ${r.replies.length}개 (${r.replies.map(x => x.author).slice(0, 3).join(', ')})` : '');
        } catch (e) { toastr.error(`반응을 받지 못했어요: ${esc(e.message)}`, TITLE); busyBtn(btn, false); }
    },
};

// ───── ♪ 추천 음악 ─────
export function musicView(s, d, ui) {
    const set = settings();
    const now = d.now;
    return `${now ? `<div class="ss-card ss-nowplay"><div class="ss-np-ico"><i class="fa-solid fa-compact-disc"></i></div><div class="ss-np-b"><small>지금 이 장면 BGM</small><b>${esc(now.title)}</b><span>${esc(now.artist)}${now.mood ? ` · ${esc(now.mood)}` : ''}</span>${now.why ? `<small class="ss-dim">${esc(now.why)}</small>` : ''}</div>${play(now)}</div>` : `<div class="ss-hint">아직 추천 곡이 없어요. 장면 분위기가 바뀌면 본편 AI가 골라 주고, 아래 버튼으로 바로 받을 수도 있어요.</div>`}
        <div class="ss-row-btns"><button class="ss-btn pri sm" data-act="musicpick">${ai1} 지금 장면에 어울리는 곡 3개</button></div>
        ${ui.picks?.length ? `<div class="ss-stack">${ui.picks.map((x, i) => `<div class="ss-item"><div class="ss-item-b"><b>${esc(x.title)}</b><small>${esc(x.artist)}${x.mood ? ` · ${esc(x.mood)}` : ''}${x.why ? ` — ${esc(x.why)}` : ''}</small></div><div class="ss-item-a">${play(x)}<button class="ss-btn sm" data-act="musicuse" data-arg="${i}">이걸로</button></div></div>`).join('')}</div>` : ''}
        ${sec('설정', `<label class="ss-f wide"><span>좋아하는 음악 (이 채팅) — 비우면 확장 설정의 취향</span><input class="ss-in ss-music-taste" value="${esc(d.taste)}" placeholder="${esc(set.musicTaste || '예: K-pop 발라드, 영화 OST, 로파이')}"></label>
            <div class="ss-row-btns"><button class="ss-btn sm" data-act="musictaste">저장</button></div>
            <div class="ss-f wide"><span>▶ 누르면 열 곳</span>${seg(Object.entries(MUSIC_APPS).map(([k, v]) => [k, v.name]), set.musicApp, 'musicapp', 'class="ss-seg wrap"')}</div>
            <label class="ss-tog"><input type="checkbox" class="ss-switch" data-chg="musictoast" ${set.musicToast ? 'checked' : ''}><span>곡이 바뀌면 팝업으로 알려 주기</span></label>
            <p class="ss-hint">AI가 없는 곡을 지어낼 수도 있어서, 바로 재생 대신 <b>검색 결과</b>를 열어요.</p>`)}
        ${d.log.length ? sec(`지난 추천 <small>${d.log.length}</small>`, `<div class="ss-stack">${[...d.log].reverse().map(x => `<div class="ss-item"><div class="ss-item-b"><b>${esc(x.title)}</b><small>${esc(x.artist)}${x.mood ? ` · ${esc(x.mood)}` : ''}${x.date ? ` · ${esc(x.date)}` : ''}</small></div><div class="ss-item-a">${play(x)}</div></div>`).join('')}</div>`) : ''}`;
}
export const MUSIC_ACTIONS = {
    musicpick: async (el, arg, btn, s) => {
        busyBtn(btn, true, '고르는 중…');
        try { el._ss.ui.picks = await musicPicks(s); app.renderPanel(el); if (!el._ss.ui.picks.length) toastr.info('추천을 받지 못했어요.', TITLE); }
        catch (e) { toastr.error(`추천 실패: ${esc(e.message)}`, TITLE); busyBtn(btn, false); }
    },
    musicuse: (el, arg) => { const x = el._ss.ui.picks?.[Number(arg)]; if (!x) return; return addAdjust({ ops: [['bgm', `${x.title} - ${x.artist} | ${x.mood} | ${x.why}`]], silent: true }); },
    musictaste: async (el, arg, btn, s) => { const nd = clone(s.data.music); nd.taste = el.querySelector('.ss-music-taste').value.trim(); await commit('music', nd, ''); toastr.success('저장했어요.', TITLE); },
    musicapp: (el, arg) => { settings().musicApp = arg; saveSettings(); app.renderPanel(el); },
};
export const MUSIC_CHANGES = { musictoast: (el, t) => { settings().musicToast = t.checked; saveSettings(); } };

// ───── 📌 내 탭 ─────
export function customView(s, d) {
    return `<div class="ss-hint">직접 만드는 탭이에요. 위의 <b>편집</b>에서 탭·항목을 만들거나, <b>AI로 수정</b>에 "명성 탭 만들어줘"처럼 말해 보세요. 본편 AI도 <code>custom: 탭 | 항목 ±N</code>으로 바꿔요.</div>
        <div class="ss-row-btns"><button class="ss-btn sm" data-act="ctabnew"><i class="fa-solid fa-plus"></i> 새 탭</button></div>
        ${d.tabs.map((t, i) => sec(`${esc(t.icon)} ${esc(t.name)}${t.inject ? '' : ' <small>AI에게 안 보냄</small>'}`, `${t.note ? `<p class="ss-hint">${esc(t.note)}</p>` : ''}
            <div class="ss-stack">${t.fields.map((f, j) => f.type === 'bar' ? `<div class="ss-card ss-gcard">${gauge({ name: f.k, cur: f.v, max: f.max, desc: f.desc })}<div class="ss-gbtns">${[-10, -1, 1, 10].map(n => `<button class="ss-ib t" data-act="cfield" data-arg="${i}|${j}|${n}">${n > 0 ? '+' : '−'}${Math.abs(n)}</button>`).join('')}</div></div>`
                : f.type === 'num' ? `<div class="ss-item"><div class="ss-item-b"><b>${esc(f.k)}</b>${f.desc ? `<small>${esc(f.desc)}</small>` : ''}</div><div class="ss-item-a"><button class="ss-ib t" data-act="cfield" data-arg="${i}|${j}|-1">−</button><b class="ss-cval">${fmtNum(f.v)}</b><button class="ss-ib t" data-act="cfield" data-arg="${i}|${j}|1">+</button></div></div>`
                    : `<div class="ss-item"><div class="ss-item-b"><b>${esc(f.k)}</b><small class="ss-pre">${esc(f.v || '—')}</small></div><div class="ss-item-a"><button class="ss-ib" data-act="ctext" data-arg="${i}|${j}" title="고치기"><i class="fa-solid fa-pen"></i></button></div></div>`).join('') || emptyBox('항목이 없어요 — 편집에서 추가', 'fa-shapes')}</div>
            <div class="ss-row-btns"><button class="ss-btn sm ghost" data-act="cfadd" data-arg="${i}"><i class="fa-solid fa-plus"></i> 항목</button></div>`, `<button class="ss-ib" data-act="ctabdel" data-arg="${i}" title="탭 지우기"><i class="fa-solid fa-trash-can"></i></button>`)).join('') || emptyBox('아직 탭이 없어요', 'fa-shapes')}`;
}
export const CUSTOM_ACTIONS = {
    cfield: (el, arg, btn, s) => { const [i, j, n] = arg.split('|').map(Number); const t = s.data.custom.tabs[i], f = t?.fields[j]; if (!f) return; return addAdjust({ ops: [['custom', `${t.name} | ${f.k} ${n >= 0 ? '+' : '-'}${Math.abs(n)}`]], label: `${t.icon} ${f.k} ${signed(n)}` }); },
    ctext: async (el, arg, btn, s) => { const [i, j] = arg.split('|').map(Number); const t = s.data.custom.tabs[i], f = t?.fields[j]; if (!f) return; const v = await askInput(TITLE, `${t.name} — ${f.k}`, f.v); if (v === null) return; return addAdjust({ ops: [['custom', `${t.name} | ${f.k} = ${v.replace(/\|/g, '/')}`]], label: `${t.icon} ${f.k}: ${short(v, 20)}` }); },
    ctabnew: async (el, arg, btn, s) => {
        const name = await askInput(TITLE, '새 탭 이름 (예: 명성, 요원 평가, 마력 오염도)', ''); if (!name?.trim()) return;
        const nd = clone(s.data.custom); nd.tabs.push({ name: name.trim(), icon: '📌', note: '', inject: true, fields: [] });
        await commit('custom', nd, '');
    },
    ctabdel: async (el, arg, btn, s) => { const t = s.data.custom.tabs[Number(arg)]; if (!t || !(await askConfirm(`「${esc(t.name)}」 탭을 지울까요?`))) return; const nd = clone(s.data.custom); nd.tabs.splice(Number(arg), 1); await commit('custom', nd, ''); },
    cfadd: async (el, arg, btn, s) => {
        const t = s.data.custom.tabs[Number(arg)]; if (!t) return;
        const k = await askInput(TITLE, `「${t.name}」에 넣을 항목 이름 — 숫자로 시작하면 숫자, "게이지 이름"처럼 앞에 '게이지'를 붙이면 0~100 게이지, 아니면 글`, ''); if (!k?.trim()) return;
        const nd = clone(s.data.custom); const tb = nd.tabs[Number(arg)];
        const bar = /^게이지\s+/.test(k.trim()); const nm = k.trim().replace(/^게이지\s+/, '');
        const v = await askInput(TITLE, `「${nm}」 처음 값`, bar ? '50' : '0'); if (v === null) return;
        const isNum = bar || /^[+\-]?[\d.,]+$/.test(v.trim());
        tb.fields.push({ k: nm, type: bar ? 'bar' : isNum ? 'num' : 'text', v: isNum ? Number(v.replace(/,/g, '')) || 0 : v, max: 100, desc: '' });
        await commit('custom', nd, '');
    },
};

// ───── 💞 관계: 단계 · 질투 · 화면 밖 · 속마음 ─────
const stagesOf = (d) => (d.stages?.length ? d.stages : DEFAULT_STAGES);
// 관계 화면에 보일 것 (v2.7.18) — 다 끄면 이름 · 애정 · 우정 숫자만
export const MIND_NAMES = { off: '끔', thought: '속마음', emoji: '이모티콘', kaomoji: '카모지' };
export const MIND_FREQ = { always: '항상', random: '랜덤' };
const MIND_ON = () => settings().mindMode && settings().mindMode !== 'off';
export const REL_SHOW = [
    ['relShowMind', '속마음', '인물 카드의 속마음 줄 (아래 「속마음」에서 보는 방식 · 빈도)'],
    ['relStagesOn', '단계', '단계 이름 · 해금 · 다음 단계 · 단계 알림 (끄면 AI에게도 단계를 안 보내요)'],
    ['relShowUnlock', '🔓 해금된 것', '지금 단계에서 생긴 것'],
    ['relShowNext', '다음 단계', '다음 단계까지 남은 수치'],
    ['relShowMemo', '메모', '관계 메모'],
    ['relShowWants', '욕구', '끌리는 것 · 싫어하는 것 · 신경 쓰는 것 (⑤를 켰을 때)'],
    ['relShowBtns', '단추', '속마음 · 연락 · 빠짐 · 애정 끄기 단추'],
    ['relShowLife', '화면 밖 소식', '🌙 화면 밖 소식 목록'],
    ['relShowPairs', '인물끼리', '인물끼리 관계 목록'],
];
const relOn = (k) => settings()[k] !== false;
export function relView(s, d, ui) {
    const st = stagesOf(d);
    const set = settings();
    const left = peekLeft(s);
    const L = loveIndex(st), AX = relAxes(d);
    const STG = relOn('relStagesOn');
    const card = (r) => {
        const k = clamp(r.stage ?? stageIndex(st, r.aff, r.trust), 0, st.length - 1);
        const g = st[k], rs = r.noLove ? romanceStart(d) : -1, nx = rs > 0 && k + 1 >= rs ? null : st[k + 1]; // 애정 꺼 둔 사람은 연애 단계를 다음 목표로 안 보여 줌
        const need = nx ? [r.aff < nx.at ? `${AX.aff} ${nx.at - r.aff}` : '', r.trust < nx.trust ? `${AX.trust} ${nx.trust - r.trust}` : ''].filter(Boolean).join(' · ') : '';
        const btns = relOn('relShowBtns') ? `${set.peekOn !== false ? `<button class="ss-ib" data-act="peek" data-arg="${esc(r.name)}" title="속마음 엿보기 (AI 1회${set.peekPerDay ? ` · 오늘 ${left}번 남음` : ''})" ${set.peekPerDay && left <= 0 ? 'disabled' : ''}><i class="fa-solid fa-heart-circle-question"></i></button>` : ''}
            ${modOn('contact') ? `<button class="ss-ib" data-act="talk" data-arg="${esc(r.name)}" title="연락"><i class="fa-solid fa-envelope"></i></button>` : ''}
            <button class="ss-ib ss-leave ${r.out ? 'on' : ''}" data-act="leave" data-arg="${esc(r.name)}" title="${r.out ? '이야기에 다시 등장시키기' : '이야기에서 빠짐 (사망 · 떠남) — AI가 이 사람을 다시 등장시키지 않게'}"><i class="fa-solid fa-dove"></i></button>
            <button class="ss-ib ss-nolove ${r.noLove ? 'on' : ''}" data-act="${r.noLove ? 'love' : 'nolove'}" data-arg="${esc(r.name)}" title="${r.noLove ? `💗 ${esc(AX.aff)} 다시 켜기` : `💗 ${esc(AX.aff)} 꺼 두기 — 이 사람은 우정만 (연애 없음)`}"><i class="fa-solid ${r.noLove ? 'fa-heart-crack' : 'fa-heart'}"></i></button>` : '';
        const nextLine = !STG || !relOn('relShowNext') ? ''
            : nx ? `<p class="ss-hint">${r.bondReady && k + 1 === L ? `「${esc(nx.name)}」 조건은 채웠어요 — 고백 후 💍 확정해야 넘어가요` : `다음 「${esc(nx.name)}」까지 ${esc(need) || '조금만 더'}`}${nx.unlock && relOn('relShowUnlock') ? ` → <span>${esc(nx.unlock)}</span>` : ''}</p>`
                : r.noLove && k + 1 < st.length ? `<p class="ss-hint">💗 ${esc(AX.aff)} 꺼 둔 사람이라 「${esc(g.name)}」까지예요. 우정은 계속 쌓여요.</p>` : '<p class="ss-hint">가장 높은 단계예요 💞</p>';
        return `<div class="ss-card ss-relc ${r.out ? 'out' : ''}">${r.out ? `<div class="ss-outbar">🕊 ${r.out === 'dead' ? '세상을 떠났어요' : '이야기에서 떠났어요'} — AI에게는 「등장하지 않음」으로 알려요</div>` : ''}<div class="ss-relc-h"><button class="ss-ava-btn" data-act="relemoji" data-arg="${esc(r.name)}" title="얼굴 이모지 바꾸기">${avatar(r.name)}</button><div class="ss-ct-b"><b>${isFresh(app.current?.fresh, 'rel', 'user', r.name) ? FRESH_I : ''}${esc(r.name)}${STG ? ` <span class="ss-stage s${k}">${esc(g.name)}</span>` : ''}${set.romBond && r.bond && (!STG || k < (L < 0 ? Infinity : L)) ? ' <span class="ss-stage love">💞 연인</span>' : ''}</b>${r.label ? `<small>${esc(r.label)}</small>` : ''}</div>
            ${btns}</div>
            ${r.noLove ? `<div class="ss-meter love off"><span>${esc(AX.aff)}</span><div class="ss-meter-t"></div><em>꺼 둠</em></div>` : meter(AX.aff, r.aff, 'love')}${meter(AX.trust, r.trust, 'trust')}${set.jealousy && r.jealous ? `<div class="ss-meter jealous"><span>질투</span><div class="ss-meter-t"><b style="left:0;width:${r.jealous}%"></b></div><em>${r.jealous}</em></div>` : ''}
            ${MIND_ON() && relOn('relShowMind') && r.mind?.text ? `<p class="ss-mind" title="속마음 (${esc(MIND_NAMES[set.mindMode])} · ${r.mind.turn}턴)"><i class="fa-solid fa-comment-dots"></i> ${esc(r.mind.text)}</p>` : ''}
            ${STG && relOn('relShowUnlock') && g.unlock ? `<p class="ss-unlock"><i class="fa-solid fa-lock-open"></i> ${esc(g.unlock)}</p>` : ''}
            ${nextLine}
            ${!set.romBond ? '' : r.bond ? `<div class="ss-bondrow"><span>💍 연인 확정됨</span><button class="ss-btn sm ghost" data-act="unbond" data-arg="${esc(r.name)}" title="확정 취소 (단계가 숫자대로 돌아가요)">확정 취소</button></div>`
                : r.bondAsk || r.bondReady ? `<div class="ss-row-btns"><button class="ss-btn sm pri" data-act="bond" data-arg="${esc(r.name)}" title="고백이 오갔으면 눌러 주세요"><i class="fa-solid fa-ring"></i> 연인 확정${r.bondAsk ? ' · 고백이 감지됐어요' : ' · 조건 충족'}</button></div>` : ''}
            ${set.romDrive && relOn('relShowWants') && (r.likes || r.dislikes || r.concern) ? `<div class="ss-wants">${[r.likes && `<span class="like" title="끌리는 것"><i class="fa-solid fa-heart"></i>${esc(r.likes)}</span>`, r.dislikes && `<span class="hate" title="싫어하는 것"><i class="fa-solid fa-ban"></i>${esc(r.dislikes)}</span>`, r.concern && `<span class="mind" title="요즘 신경 쓰는 것"><i class="fa-solid fa-cloud"></i>${esc(r.concern)}</span>`].filter(Boolean).join('')}</div>` : ''}
            ${relOn('relShowMemo') && r.memo ? `<p class="ss-dim ss-pre">${esc(r.memo)}</p>` : ''}</div>`;
    };
    const life = relOn('relShowLife') ? [...(d.life ?? [])].reverse() : [];
    const romBar = set.romDrive && relOn('relShowWants') && d.user.length ? `<div class="ss-rombar"><span><i class="fa-solid fa-seedling"></i> 인물의 욕구 <small>끌리는 것 · 싫어하는 것 · 요즘 신경 쓰는 것</small></span><button class="ss-btn sm" data-act="fillwants" title="비어 있는 인물의 욕구를 AI가 채워요 (AI 1회)"><i class="fa-solid fa-wand-magic-sparkles"></i> 욕구 AI로 채우기 ${ai1}</button></div>` : '';
    const nOff = REL_SHOW.filter(([k]) => !relOn(k)).length;
    const mindBar = `<div class="ss-mindbar"><span><i class="fa-solid fa-comment-dots"></i> 속마음 <small>본편 AI가 같이 적어요 · 추가 호출 0</small></span>
        <div class="ss-seg">${Object.entries(MIND_NAMES).map(([k, v]) => `<button class="${(set.mindMode ?? 'off') === k ? 'on' : ''}" data-act="mindset" data-arg="mode:${k}">${v}</button>`).join('')}</div>
        ${MIND_ON() ? `<div class="ss-seg">${Object.entries(MIND_FREQ).map(([k, v]) => `<button class="${(set.mindFreq ?? 'random') === k ? 'on' : ''}" data-act="mindset" data-arg="freq:${k}">${v}${k === 'random' ? ` ${num(set.mindPct, 35)}%` : ''}</button>`).join('')}</div>` : ''}</div>`;
    const showBar = `<details class="ss-more ss-relshow" ${ui.relShow ? 'open' : ''}><summary><i class="fa-solid fa-sliders"></i> 보일 것 ${nOff ? `<small>${REL_SHOW.length - nOff}/${REL_SHOW.length} 켬</small>` : ''}</summary>
        <div class="ss-pills">${REL_SHOW.map(([k, t, tip]) => `<button class="ss-pill ${relOn(k) ? 'on' : ''}" data-act="relshow" data-arg="${k}" title="${esc(tip)}${isAiPart('rel', k) ? (relOn(k) || aiOff('rel', k) ? ' · 끄면 AI에게도 안 보내요' : ' · 예전에 꺼 둔 것이라 지금은 화면에서만 숨김 — 다시 눌러 켰다 끄면 AI에게도 안 보내요') : ''}">${relOn(k) ? '<i class="fa-solid fa-check"></i> ' : ''}${isAiPart('rel', k) ? '<i class="fa-solid fa-robot"></i> ' : ''}${esc(t)}</button>`).join('')}</div>
        <div class="ss-row-btns"><button class="ss-btn sm" data-act="relshow" data-arg="__min"><i class="fa-solid fa-hashtag"></i> 숫자만</button><button class="ss-btn sm ghost" data-act="relshow" data-arg="__all"><i class="fa-solid fa-eye"></i> 다 보기</button></div>
        <p class="ss-hint">모든 채팅에 걸려요. 「단계」와 <i class="fa-solid fa-robot"></i> 표시는 끄면 AI에게도 안 보내요. 지운 게 아니라 다시 켜면 그대로예요.</p></details>`;
    const bad = STG ? ladderIssue(d) : [];
    const ladderBar = bad.length ? `<div class="ss-callout warn"><i class="fa-solid fa-triangle-exclamation"></i><div><b>연애 느낌 단계가 우정만으로 열려요</b><span>${bad.map(esc).join(', ')} — 친구 · 가족도 우정만 높으면 이 단계로 올라가요. 고치면 애정도 있어야 열려요 (AI 0회).</span></div><button class="ss-btn sm pri" data-act="relladder">고치기</button></div>` : '';
    return `${ladderBar}${showBar}${mindBar}${romBar}<div class="ss-stack">${d.user.map(card).join('') || emptyBox('관계가 없어요', 'fa-people-arrows')}</div>
        ${life.length ? sec('🌙 화면 밖 소식', `<div class="ss-stack">${life.map(x => `<div class="ss-ev"><b>${esc(x.who)}</b><small>${esc(x.text)}${x.date ? ` · ${esc(x.date)}` : ''}</small></div>`).join('')}</div>`) : ''}
        ${relOn('relShowPairs') && d.pairs.length ? sec('인물끼리', `<div class="ss-pairs">${d.pairs.map(p => `<div><b>${esc(p.a)}</b><i class="fa-solid fa-arrows-left-right"></i><b>${esc(p.b)}</b>${chip(esc(p.label))}${p.memo ? `<small>${esc(p.memo)}</small>` : ''}</div>`).join('')}</div>`) : ''}
        ${!STG ? '' : `<details class="ss-more"><summary>관계 단계 ${st.length}개</summary><ol class="ss-stages">${st.map((x, i) => `<li><b>${i === L ? '💞 ' : ''}${esc(x.name)}</b> <small>${esc([x.at > -100 ? `${AX.aff} ${x.at}+` : '', x.trust > -100 ? `${AX.trust} ${x.trust}+` : ''].filter(Boolean).join(' · ')) || '처음부터'}${x.unlock ? ` — <span>${esc(x.unlock)}</span>` : ''}</small></li>`).join('')}</ol><p class="ss-hint">${L >= 0 ? `💞 표시가 <b>연인 단계</b>예요${set.romBond ? ' — 숫자만으론 안 올라가고, 고백 후 💍 확정해야 올라가요' : ''}.` : '이 세계관의 단계엔 <b>연인 단계가 없어요</b>. 아래 버튼으로 맨 위에 붙일 수 있어요.'} 다른 단계를 연인 단계로 쓰려면 ✏️ 편집 › 관계 단계에서 「💞 연인 단계」를 체크하세요.</p>${L < 0 ? '<div class="ss-row-btns"><button class="ss-btn sm pri" data-act="addlove"><i class="fa-solid fa-heart"></i> 💞 연인 단계 추가</button></div>' : ''}</details>`}`;
}
function peekLeft(s) {
    const per = Number(settings().peekPerDay) || 0;
    if (!per) return Infinity;
    const day = s.data.calendar ? dayIndex(s.data.calendar) : s.turn;
    return Math.max(0, per - (s.peek?.day === day ? s.peek.n : 0));
}
export const REL_ACTIONS = {
    relladder: async (el, arg, btn, s) => {
        const nd = fixLoveLadder(clone(s.data.rel));
        await commit('rel', nd, '💞 관계 단계: 연애 느낌 단계엔 애정도 필요하게');
        toastr.success('연애 느낌 단계에 애정 조건을 붙였어요. 단계 이름 · 조건은 ✏️ 편집에서 바꿀 수 있어요.', TITLE);
    },
    relemoji: async (el, arg, btn, s) => { // 사람마다 얼굴 이모지 (미니창 · HUD · 연락 · 카드 모두)
        const r = s.data.rel.user.find(x => x.name === arg); if (!r) return;
        const box = document.createElement('div');
        box.innerHTML = `<p class="ss-hint">${esc(arg)}의 얼굴로 쓸 이모지를 고르거나 직접 넣어요.</p><div class="ss-emopick">${['🐱', '🐶', '🦊', '🐻', '🐰', '🐼', '🐸', '🐧', '🦁', '🐯', '🐨', '🐹', '🦉', '🐺', '🦝', '🐮', '🐲', '🦈', '🐙', '🦋', '🌸', '🍖', '☕', '⚓', '🔥', '❄️', '⭐', '🌙', '👑', '🗡️', '💉', '🎩'].map(e => `<button data-e="${e}">${e}</button>`).join('')}</div>`;
        let pick = null;
        box.addEventListener('click', (e) => { const b = e.target.closest('[data-e]'); if (!b) return; pick = b.dataset.e; box.querySelectorAll('[data-e]').forEach(x => x.classList.toggle('on', x === b)); const inp = box.closest('dialog, .popup')?.querySelector('.popup-input, textarea, input'); if (inp) inp.value = pick; });
        const v = await ctx().Popup.show.input(TITLE, box, r.emoji ?? '', { rows: 1 });
        if (v === null || v === false || v === undefined) return;
        const e = String(v).trim().slice(0, 8);
        const nd = clone(s.data.rel); const t = nd.user.find(x => x.name === arg); if (!t) return;
        if (e) t.emoji = e; else delete t.emoji;
        await commit('rel', nd, '');
    },
    mindset: (el, arg) => {
        const set = settings(), [k, v] = String(arg).split(':');
        if (k === 'mode' && MIND_NAMES[v]) { set.mindMode = v; if (v !== 'off' && Array.isArray(set.sideMini) && !set.sideMini.includes('mind')) set.sideMini = [...set.sideMini, 'mind']; } // 켜면 사이드 미니창에도
        if (k === 'freq' && MIND_FREQ[v]) set.mindFreq = v;
        saveSettings(); app.refreshNow?.(); app.rerenderPanels?.(true); app.renderPanel(el);
    },
    relshow: (el, arg) => {
        const set = settings();
        const wasAi = REL_SHOW.map(([k]) => k).filter(k => aiOff('rel', k));
        if (arg === '__min') for (const [k] of REL_SHOW) set[k] = false;
        else if (arg === '__all') for (const [k] of REL_SHOW) set[k] = true;
        else if (REL_SHOW.some(([k]) => k === arg)) set[arg] = set[arg] === false;
        for (const [k] of REL_SHOW) if (arg.startsWith('__') || k === arg) partTouched('rel', k);
        if (wasAi.some(k => set[k] !== false)) { const m = getMeta(), s = app.current?.state; if (m && s) { m.fullTurn = s.turn; saveMeta(); } } // 다시 AI에게 가면 다음 턴은 전체
        el._ss.ui.relShow = true;
        saveSettings(); app.refreshNow?.(); app.rerenderPanels?.(true); app.renderPanel(el);
    },
    addlove: async (el, arg, btn, s) => {
        const nd = ensureLove(clone(s.data.rel));
        if (loveIndex(nd.stages) < 0) return;
        await commit('rel', nd, '💞 관계 단계에 연인 단계 추가');
        toastr.success(`맨 위에 「${esc(nd.stages.at(-1).name)}」 단계를 붙였어요. 이름·조건은 ✏️ 편집에서 바꿀 수 있어요.`, TITLE);
    },
    nolove: async (el, arg) => { await addAdjust({ ops: [['_nolove', arg]], label: `💗 ${arg}: 애정 꺼 둠 (우정만)` }); toastr.info(`${esc(arg)}의 애정을 꺼 뒀어요. 이제 애정이 오르지 않고 연애 단계로 가지 않아요. AI에게도 「연애 감정 없음」으로 알려요.`, TITLE); },
    love: async (el, arg) => { await addAdjust({ ops: [['_love', arg]], label: `💗 ${arg}: 애정 다시 켬` }); },
    bond: async (el, arg, btn, s) => { if (s?.data?.rel?.user?.find(x => x.name === arg)?.bond) return; await addAdjust({ ops: [['_bond', arg]], label: `💍 ${arg}와(과) 고백이 오가 연인이 되었다 (확정)` }); },
    fillwants: async (el, arg, btn, s) => {
        busyBtn(btn, true, '채우는 중…');
        try {
            const list = await fillWants(s);
            const nd = clone(s.data.rel); let n = 0;
            for (const x of list) { const r = findBy(nd.user, x.name); if (!r) continue; for (const k of ['likes', 'dislikes', 'concern']) if (!r[k] && x[k]) { r[k] = String(x[k]); n++; } }
            busyBtn(btn, false);
            if (!n) { toastr.info('새로 채울 칸이 없어요. (이미 적힌 칸은 건드리지 않아요)', TITLE); return; }
            await commit('rel', nd, '인물의 욕구를 채웠다');
            toastr.success(`${n}칸을 채웠어요. 마음에 안 들면 ✏️ 편집에서 고치거나 되돌리기를 눌러 주세요.`, TITLE);
        } catch (e) { busyBtn(btn, false); toastr.error(`채우지 못했어요: ${esc(e.message)}`, TITLE); }
    },
    leave: async (el, arg, btn, s) => { // 🕊 이야기에서 빠짐 (v2.7.5) — 데이터는 남기고 AI에게만 「등장하지 않음」
        const r = s?.data?.rel?.user?.find(x => x.name === arg); if (!r) return;
        const box = document.createElement('div');
        box.className = 'ss-root ss-scope ss-leavebox';
        box.innerHTML = `<div class="ss-wz-head"><i class="fa-solid fa-dove"></i><div><b>${esc(arg)} — 이야기에서 빠짐</b><small>상태창 기록은 그대로 두고, AI에게만 「이 사람은 등장하지 않음」으로 알려요 (주입 한 줄)</small></div></div>
            <p class="ss-hint">상태창을 지워도 AI는 지난 대화를 읽고 이 사람이 아직 있다고 여겨요. 그래서 지우는 대신 「빠짐」으로 표시해 두면 다시 등장시키지 않아요. 연락 · 장면 인물 목록에서도 빠져요.</p>
            <div class="ss-row-btns">${r.out ? '<button class="ss-btn pri" data-choice="back"><i class="fa-solid fa-rotate-left"></i> 다시 등장시키기</button>' : '<button class="ss-btn" data-choice="dead">🕊 세상을 떠남</button><button class="ss-btn" data-choice="left">🚪 이야기에서 떠남</button>'}</div>`;
        const pick = await choosePopup(box, '취소');
        if (!pick) return;
        await addAdjust({ ops: [['_leave', `${arg}|${pick}`]], label: pick === 'back' ? `🕊 ${arg}: 다시 이야기에 등장` : `🕊 ${arg}: ${pick === 'dead' ? '세상을 떠났다' : '이야기에서 떠났다'}` });
    },
    unbond: async (el, arg) => { await addAdjust({ ops: [['_unbond', arg]], label: `💔 ${arg}와(과)는 연인이 아니다 (확정 취소)` }); },
    peek: async (el, arg, btn, s) => {
        if (peekLeft(s) <= 0) { toastr.info('오늘은 더 엿볼 수 없어요. 내일 다시!', TITLE); return; }
        busyBtn(btn, true, '');
        try {
            const text = await peekMind(arg, s);
            busyBtn(btn, false);
            await addAdjust({ ops: [['_peekday', '1']], silent: true });
            const box = document.createElement('div');
            box.className = 'ss-root ss-scope ss-peek';
            box.innerHTML = `<div class="ss-wz-head"><i class="fa-solid fa-heart-circle-question"></i><div><b>${esc(arg)}의 속마음</b><small>${esc(stamp(s))} · ${esc(arg)}은(는) 모르는 일이에요</small></div></div><blockquote class="ss-pre">${esc(text)}</blockquote>
                ${settings().albumOn !== false ? '<div class="ss-row-btns"><button class="ss-btn sm" data-save="1"><i class="fa-regular fa-star"></i> 앨범에 저장</button></div>' : ''}`;
            box.addEventListener('click', async (e) => { const b = e.target.closest('[data-save]'); if (!b) return; await addAlbum({ kind: 'peek', who: arg, text, when: stamp(s), here: s.data.map?.here ?? '' }); b.disabled = true; b.innerHTML = '<i class="fa-solid fa-star"></i> 저장했어요'; });
            await app.popup(box);
        } catch (e) { toastr.error(`엿보지 못했어요: ${esc(e.message)}`, TITLE); busyBtn(btn, false); }
    },
};

// ───── 🏆 업적 + 엔딩 ─────
export function achView(s, d) {
    const done = d.list.filter(a => a.done).length;
    const ends = d.endings ?? [];
    return `<div class="ss-achbar"><b>${done}</b> / ${d.list.length}<div class="ss-prob-t"><i style="width:${d.list.length ? (done / d.list.length) * 100 : 0}%"></i></div></div>
        <div class="ss-achs">${d.list.map(a => `<div class="ss-ach ${a.done ? 'done' : ''}" data-act="achtog" data-arg="${esc(a.name)}" title="눌러서 달성/취소">
            <i class="fa-solid ${a.done ? 'fa-trophy' : a.hidden ? 'fa-question' : 'fa-lock'}"></i><div><b>${esc(a.hidden && !a.done ? '???' : a.name)}</b><small>${esc(a.hidden && !a.done ? '숨겨진 업적' : a.desc)}</small>${a.done && a.at ? `<small class="ss-dim">${esc(a.at)}</small>` : ''}</div></div>`).join('') || emptyBox('업적이 없어요', 'fa-trophy')}</div>
        ${sec(`🎬 엔딩 <small>${ends.filter(e => e.done).length}/${ends.length}</small>`, `<div class="ss-stack">${ends.map(e => `<div class="ss-item ss-ending ${e.done ? 'done' : ''}"><div class="ss-item-b"><b>${e.done ? '🎬 ' : '🔒 '}${esc(e.done ? e.name : '???')}</b><small>${esc(e.done ? e.desc : `조건: ${e.when}`)}${e.done && e.at ? ` · ${esc(e.at)}` : ''}</small></div>${e.done ? `<div class="ss-item-a"><button class="ss-btn sm" data-act="endwrite" data-arg="${esc(e.name)}">엔딩 쓰기</button></div>` : ''}</div>`).join('') || '<div class="ss-hint">엔딩이 없어요. 편집이나 「AI로 수정」에서 "엔딩 4개 만들어줘"라고 해 보세요.</div>'}</div>
            <p class="ss-hint">조건을 채우면 팝업으로 알려 줘요. 「엔딩 쓰기」는 입력창에 에필로그 요청을 넣어 줘요. 관리 탭의 <b>2회차 준비</b>로 이어서 다시 시작할 수 있어요.</p>`)}`;
}
export function writeEnding(name) {
    const e = (app.current?.state?.data?.ach?.endings ?? []).find(x => norm(x.name) === norm(name));
    insertInput(`(OOC: 「${name}」 엔딩 조건을 달성했어요.${e?.desc ? ` ${e.desc}.` : ''} 지금까지의 이야기를 이 엔딩으로 마무리하는 에필로그를 써 주세요.)`);
}
app.writeEnding = writeEnding;
export const ACH_ACTIONS = { endwrite: (el, arg) => { writeEnding(arg); closeIfPopup(el); } };

// ───── ⭐ 추억 앨범 (메시지 별표 · 속마음 · 추천 곡) ─────
export async function addAlbum(item) {
    const meta = getMeta(true);
    meta.album = [...(meta.album ?? []), { id: uid(), t: Date.now(), note: '', ...item }].slice(-200);
    await saveMeta();
    app.rerenderPanels?.();
}
export function starred(i) {
    const m = ctx().chat?.[i]; const meta = getMeta();
    if (!m || !meta) return null;
    return (meta.album ?? []).find(x => x.kind === 'mes' && x.key === `${m.send_date}|${m.name}`) ?? null;
}
export async function toggleStar(i) {
    const m = ctx().chat?.[i]; const meta = getMeta(true);
    if (!m) return;
    const ex = starred(i);
    if (ex) { meta.album = meta.album.filter(x => x.id !== ex.id); await saveMeta(); toastr.info('앨범에서 뺐어요.', TITLE); }
    else {
        const s = app.current?.state;
        await addAlbum({ kind: 'mes', key: `${m.send_date}|${m.name}`, mesid: i, who: m.name, user: !!m.is_user, text: short(stripStatus(m.mes).replace(/<[^>]+>/g, ''), 600), when: s ? stamp(s) : '', here: s?.data.map?.here ?? '', song: s?.data.music?.now ? { title: s.data.music.now.title, artist: s.data.music.now.artist } : null });
        toastr.success('⭐ 추억 앨범에 담았어요.', TITLE);
    }
    app.decorate?.();
}
app.toggleStar = toggleStar;
export function albumView(s, d, ui) {
    const meta = getMeta();
    const list = [...(meta?.album ?? [])].reverse();
    const f = ui.albumF ?? '';
    const shown = f ? list.filter(x => x.kind === f) : list;
    return `<div class="ss-hint">메시지의 <i class="fa-regular fa-star"></i>를 누르면 그 장면이 여기 담겨요. 속마음도 저장할 수 있어요.</div>
        ${seg([['', `전체 ${list.length}`], ['mes', '장면'], ['peek', '속마음']], f, 'albumf', 'class="ss-seg wrap"')}
        <div class="ss-album">${shown.map(x => `<figure class="ss-memory k-${x.kind}">
            <figcaption><b>${x.kind === 'peek' ? `💭 ${esc(x.who)}의 속마음` : `${esc(x.user ? userName() : x.who)}`}</b><small>${esc(x.when || '')}${x.here ? ` · 📍${esc(x.here)}` : ''}</small></figcaption>
            <blockquote class="ss-pre">${esc(x.text)}</blockquote>
            ${x.note ? `<p class="ss-memo-note">✍ ${esc(x.note)}</p>` : ''}
            <div class="ss-row-btns">${x.song ? play(x.song, esc(short(x.song.title, 18))) : ''}${x.kind === 'mes' && Number.isFinite(x.mesid) ? `<button class="ss-btn sm ghost" data-act="albumgo" data-arg="${x.mesid}">그 장면으로</button>` : ''}<button class="ss-ib" data-act="albumnote" data-arg="${esc(x.id)}" title="한 줄 적기"><i class="fa-solid fa-pen"></i></button><button class="ss-ib" data-act="albumdel" data-arg="${esc(x.id)}" title="빼기"><i class="fa-solid fa-trash-can"></i></button></div>
        </figure>`).join('') || `<div class="ss-mempty">${mascot('sleep', 'md')}${emptyBox('아직 담긴 추억이 없어요 — 메시지의 앨범 단추(🖼️)를 눌러 보세요', 'fa-images')}</div>`}</div>`;
}
export const ALBUM_ACTIONS = {
    albumf: (el, arg) => { el._ss.ui.albumF = arg; app.renderPanel(el); },
    albumdel: async (el, arg) => { const meta = getMeta(); if (!(await askConfirm('앨범에서 뺄까요?'))) return; meta.album = meta.album.filter(x => x.id !== arg); await saveMeta(); app.rerenderPanels(); app.decorate?.(); },
    albumnote: async (el, arg) => { const meta = getMeta(); const x = meta.album.find(a => a.id === arg); if (!x) return; const v = await askInput(TITLE, '이 추억에 한 줄', x.note ?? ''); if (v === null) return; x.note = v; await saveMeta(); app.rerenderPanels(); },
    albumgo: (el, arg) => {
        closeIfPopup(el);
        const mes = document.querySelector(`#chat .mes[mesid="${Number(arg)}"]`);
        if (mes) { mes.scrollIntoView({ behavior: 'smooth', block: 'center' }); mes.classList.add('ss-flash'); setTimeout(() => mes.classList.remove('ss-flash'), 1600); }
        else toastr.info('그 메시지가 화면에 없어요. 위로 올려서 더 불러온 뒤 다시 눌러 주세요.', TITLE);
    },
};

// ───── 📊 플레이 기록 · 지난 하루들 ─────
const parseDateMs = (v) => { if (typeof v === 'number') return v; const t = Date.parse(String(v ?? '').replace(/(\d)(am|pm)/i, '$1 $2')); return Number.isFinite(t) ? t : null; };
function playTime(chat) {
    let total = 0, prev = null;
    for (const m of chat) { const t = parseDateMs(m?.send_date); if (t === null) continue; if (prev !== null && t > prev) total += Math.min(t - prev, 20 * 60000); prev = t; } // 20분 넘게 쉰 건 빼고
    return total;
}
export function recordView(s, d, ui) {
    const chat = ctx().chat ?? [];
    const T = s.tally ?? {};
    const userN = chat.filter(m => m.is_user).length, aiN = chat.filter(m => !m.is_user && !m.is_system).length;
    const ms = playTime(chat), hrs = Math.floor(ms / 3600000), mins = Math.round((ms % 3600000) / 60000);
    const cal = s.data.calendar, daysPassed = cal && s.day0 !== null && s.day0 !== undefined ? dayIndex(cal) - s.day0 : null;
    const rel = s.data.rel?.user ?? [];
    const best = [...rel].sort((a, b) => b.aff - a.aff)[0];
    const st = s.data.rel ? stagesOf(s.data.rel) : DEFAULT_STAGES;
    const sent = Object.values(s.data.contact?.threads ?? {}).flat().filter(m => m.from === 'me').length;
    const ach = s.data.ach, places = s.data.map?.places ?? [];
    const tile = (icon, label, val, sub = '') => `<div class="ss-rtile"><i class="fa-solid ${icon}"></i><small>${label}</small><b>${val}</b>${sub ? `<span>${sub}</span>` : ''}</div>`;
    const days = [...(s.days ?? [])].reverse();
    return `<div class="ss-rgrid">
            ${tile('fa-clock', '플레이 시간', hrs ? `${hrs}시간 ${mins}분` : `${mins}분`, '20분 넘게 쉰 건 빼고')}
            ${tile('fa-comments', '주고받은 메시지', fmtNum(userN + aiN), `내 ${fmtNum(userN)} · AI ${fmtNum(aiN)}`)}
            ${daysPassed !== null ? tile('fa-calendar-days', '세계에서 지난 날', `${fmtNum(daysPassed)}일`) : ''}
            ${s.data.wallet ? tile('fa-coins', '번 돈 · 쓴 돈', `+${fmtNum(T.earn ?? 0)}`, `−${fmtNum(T.spend ?? 0)} ${esc(s.data.wallet.currency)}`) : ''}
            ${T.rolls ? tile('fa-dice-d20', '주사위', `${Math.round(((T.good ?? 0) / T.rolls) * 100)}%`, `${T.rolls}번 · 대성공 ${T.crit ?? 0} · 대실패 ${T.fumble ?? 0}`) : ''}
            ${places.length ? tile('fa-map-location-dot', '가 본 곳', `${(T.places ?? []).length}`, `/ 지도 ${places.length}곳`) : ''}
            ${best ? tile('fa-heart', '가장 가까운 사람', esc(best.name), `♥ ${best.aff} · ${esc(st[clamp(best.stage ?? 0, 0, st.length - 1)]?.name ?? '')}`) : ''}
            ${s.data.quest ? tile('fa-scroll', '끝낸 퀘스트', fmtNum(T.quests ?? 0)) : ''}
            ${ach ? tile('fa-trophy', '업적', `${ach.list.filter(a => a.done).length}/${ach.list.length}`, ach.endings?.length ? `엔딩 ${ach.endings.filter(e => e.done).length}/${ach.endings.length}` : '') : ''}
            ${s.data.contact ? tile('fa-envelope', '연락', `${fmtNum(sent)} 보냄`, `${fmtNum(T.got ?? 0)} 받음 (본편)`) : ''}
            ${T.curses ? tile('fa-skull', '받은 저주', fmtNum(T.curses)) : ''}
            ${getMeta()?.round > 1 ? tile('fa-clapperboard', '회차', `${getMeta().round}회차`) : ''}
        </div>
        ${rel.length ? sec('관계 한눈에', `<div class="ss-stack">${[...rel].sort((a, b) => b.aff - a.aff).map(r => `<div class="ss-rrow">${avatar(r.name, 'xs')}<b>${esc(r.name)}</b><span class="ss-stage s${clamp(r.stage ?? 0, 0, st.length - 1)}">${esc(st[clamp(r.stage ?? 0, 0, st.length - 1)]?.name ?? '')}</span><em class="love">♥${r.aff}</em><em class="trust">🤝${r.trust}</em></div>`).join('')}</div>`) : ''}
        ${sec(`📅 지난 하루들 <small>${days.length}</small>`, days.map(x => `<details class="ss-dayc"><summary><b>${esc(x.date)}</b><span>${x.cash ? `<em class="${x.cash > 0 ? 'pos' : 'neg'}">${signed(x.cash)}</em>` : ''}${x.aff.slice(0, 3).map(([n, v]) => `<em class="${v > 0 ? 'love' : 'neg'}">♥${esc(n)} ${signed(v)}</em>`).join('')}<small>${x.n}개</small></span></summary><ul>${x.labels.map(l => `<li>${esc(l)}</li>`).join('')}</ul></details>`).join('') || '<div class="ss-hint">날짜가 넘어가면 그날 있었던 일이 여기 정리돼요 (달력 기능).</div>')}`;
}

// ───── 🔎 검색 ─────
export function searchAll(s, q) {
    const n = norm(q); if (!n) return [];
    const out = []; const d = s.data;
    const hit = (t) => norm(t).includes(n);
    const add = (icon, title, text, tab) => { if (out.length < 60) out.push({ icon, title, text: short(text, 90), tab }); };
    for (const p of d.profile?.list ?? []) { const f = p.fields.find(x => hit(x.k) || hit(x.v)); if (hit(p.name) || hit(p.summary) || f) add('👤', p.name, f ? `${f.k}: ${f.v}` : p.summary, 'profile'); }
    for (const m of d.memo?.list ?? []) if (hit(m.text)) add('📝', '메모', m.text, 'memo');
    for (const [who, th] of Object.entries(d.contact?.threads ?? {})) for (const m of th) if (hit(m.text)) add('💬', `${who}${m.from === 'me' ? ' ← 나' : ''}`, msgText(m), 'contact');
    for (const q2 of d.quest?.list ?? []) if (hit(q2.title) || hit(q2.desc)) add('📜', q2.title, q2.desc, 'quest');
    for (const x of d.news?.items ?? []) if (hit(x.title) || hit(x.body)) add('📰', x.title, x.body, 'news');
    for (const x of d.gossip?.issues ?? []) if (hit(x.title) || hit(x.body)) add('🍷', x.title, x.body, 'gossip');
    for (const x of d.board?.posts ?? []) if (hit(x.title) || hit(x.body)) add('📋', x.title, x.body, 'board');
    for (const x of d.sns?.posts ?? []) if (hit(x.text) || hit(x.pic) || hit(x.author)) add('#️⃣', x.author, x.text || x.pic, 'sns');
    for (const p of d.map?.places ?? []) if (hit(p.name) || hit(p.desc)) add('📍', p.name, p.desc, 'map');
    for (const i of d.wallet?.items ?? []) if (hit(i.name) || hit(i.desc)) add('🎒', i.name, i.desc, 'wallet');
    for (const sh of d.shop?.shops ?? []) for (const i of sh.items) if (hit(i.name)) add('🏪', `${sh.name} · ${i.name}`, `${fmtNum(i.price)} — ${i.desc}`, 'shop');
    for (const e of d.calendar?.events ?? []) if (hit(e.title)) add('📅', e.title, `${e.m}/${e.d} ${e.desc}`, 'calendar');
    for (const t of d.custom?.tabs ?? []) for (const f of t.fields) if (hit(f.k) || hit(f.v)) add(t.icon, `${t.name} · ${f.k}`, String(f.v), 'custom');
    if (settings().albumOn !== false) for (const a of getMeta()?.album ?? []) if (hit(a.text) || hit(a.note)) add('⭐', a.who, a.text, 'album');
    return out;
}
export async function openSearch() {
    const s = app.current?.state; if (!s) return;
    const el = document.createElement('div');
    el.className = 'ss-root ss-scope ss-search';
    el.innerHTML = `<div class="ss-wz-head"><i class="fa-solid fa-magnifying-glass"></i><div><b>상태창 검색</b><small>프로필 · 메모 · 연락 · 퀘스트 · 소식 · SNS · 지도 · 소지품 · 앨범</small></div></div>
        <input class="ss-in ss-q" placeholder="찾을 말 (예: 열쇠, 레온, 약속)"><div class="ss-results"></div>`;
    const res = el.querySelector('.ss-results');
    el.querySelector('.ss-q').addEventListener('input', (e) => {
        const list = searchAll(s, e.target.value);
        res.innerHTML = e.target.value.trim() ? list.map(x => `<div class="ss-note" data-tab="${esc(x.tab)}"><span class="ss-t-ico">${esc(x.icon)}</span><div class="ss-t-b"><b>${esc(x.title)}</b><small>${esc(x.text)}</small></div></div>`).join('') || '<div class="ss-hint">찾지 못했어요</div>' : '';
    });
    res.addEventListener('click', (e) => { const n = e.target.closest('[data-tab]'); if (!n) return; el.closest('dialog')?.querySelector('.popup-button-ok')?.click(); setTimeout(() => app.openSheet?.(n.dataset.tab), 200); });
    setTimeout(() => el.querySelector('.ss-q')?.focus(), 100);
    await app.popup(el, { large: true });
}
app.openSearch = openSearch;

// ───── 🤖 모델 맞춤 설정 (한 번에) ─────
const KWALL = { news: 'kw', gossip: 'kw', board: 'kw', shop: 'kw', home: 'kw', ach: 'n5', sns: 'kw' };
export const PRESETS = {
    light: { name: '기본 (추천)', icon: 'fa-bolt', desc: '처음 설치하면 이거예요 · 플래시·아르곤 같은 가벼운 모델에 맞춤 — 간결 주입 + 태그 빠지면 따로 분석 + 4턴마다 전체 + 소식·상점은 관련 말이 나올 때만 + 깨진 답 고쳐 받기', set: { injectMode: 'lite', sync: 'tagPlus', sceneFilter: true, sceneTurns: 5, deltaMode: true, deltaEvery: 4, injEvery: { ...KWALL }, retryJSON: true, genBatch: true, genParallel: 3, pinCap: 6 } },
    saver: { name: '최대 절약', icon: 'fa-piggy-bank', desc: '긴 채팅·싼 모델 — 초압축 + 5턴마다 전체 + 거의 모든 칸을 관련 말이 나올 때만', set: { injectMode: 'ultra', sync: 'tagPlus', sceneFilter: true, sceneTurns: 4, deltaMode: true, deltaEvery: 5, injEvery: { ...KWALL, ach: 'kw', quest: 'kw', custom: 'kw', memo: 'n3' }, retryJSON: true, genBatch: true, genParallel: 3, pinCap: 4 } },
    rich: { name: '고급 모델 (비추천 · 토큰 많음)', icon: 'fa-gem', desc: '토큰이 넉넉할 때만 — 전체 주입 · 매 턴 전체 · 모든 칸 항상 (가장 정확)', set: { injectMode: 'full', sync: 'tag', sceneFilter: true, sceneTurns: 8, deltaMode: false, injEvery: {}, retryJSON: true, genBatch: true, genParallel: 4, pinCap: 8 } },
};
export function applyPreset(k) {
    const p = PRESETS[k]; if (!p) return;
    Object.assign(settings(), clone(p.set));
    saveSettings();
    app.refreshNow?.();
    toastr.success(`「${esc(p.name)}」 설정을 적용했어요.`, TITLE);
}
export function presetHTML() {
    return `<div class="ss-stack ss-presets">${Object.entries(PRESETS).map(([k, p]) => `<button class="ss-preset" data-preset-ss="${k}"><i class="fa-solid ${p.icon}"></i><span><b>${esc(p.name)}</b><small>${esc(p.desc)}</small></span></button>`).join('')}</div>`;
}
export { LOG, MOD };
