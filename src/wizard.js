// 처음 만들기 (마법사 · 기준 상태 세우기) — shell.js에서 떼어 냄
import { DATA_V, app, ctx, settings, saveSettings, getMeta, saveMeta, MOD, MOD_IDS, EMPTY, NORM, normalize, DIFFS, GENRES, CONTACT_MODES, esc, clone, clamp, h, TITLE, LOG, PLAY_MODES, normPlay, playOf, mascotUrl, relFromProfiles, ssErr, ssWarn } from './core.js';
import { gatherSources, loreNames, chatCharacters } from './engine.js';
import { genModule, genGroup, GEN_GROUPS } from './ai.js';
import { popup, askConfirm, busyBtn, seg, sec, mascot } from './kit.js';
import { GROUPS, TAB_MOD } from './views.js';
import { GEN_MODES, HYBRID_TPL, skeleton, skeletonCore, skeletonHint } from './skeleton.js';
import { REC_MODS, defaultModOn } from './core.js';

// ───── 처음 만들기 ─────
export async function setBase(base, mods, difficulty, play) {
    const meta = getMeta(true);
    const chat = ctx().chat ?? [];
    const data = {};
    for (const id of MOD_IDS) data[id] = base?.data?.[id] ? normalize(id, base.data[id]) : null;
    meta.base = { core: NORM.core(base?.core ?? {}), data };
    meta.baseTurn = 0;
    meta.startAt = chat.length;
    meta.startKey = chat.at(-1)?.send_date ?? null;
    meta.adjust = [];
    delete meta.wipe; // 🧹 칸 전체 삭제 표시도 새로 만들면 비움
    meta.off = false;
    meta.v = DATA_V;
    meta.origin = clone(meta.base); // 처음 만든 상태 (카드에 붙이기 · 2회차용)
    meta.chatId = ctx().getCurrentChatId?.() ?? null;
    delete meta.newV5;
    if (mods) meta.mods = { ...meta.mods, ...mods };
    if (difficulty && DIFFS[difficulty]) meta.difficulty = difficulty;
    if (play) meta.play = normPlay(play);
    app.playTemp = null;
    await saveMeta(true);
    app.refreshNow();
}
export async function startBlank() { await setBase({ core: EMPTY.core(), data: {} }); toastr.info('빈 상태창을 만들었어요. 각 칸에서 AI로 채우거나 직접 채우세요.', TITLE); }

export async function openWizard() {
    const c = ctx();
    const chars = chatCharacters();
    const lore = await loreNames();
    const persona = c.powerUserSettings?.persona_description ?? '';
    const chatN = (c.chat ?? []).filter(m => !m.is_system).length;
    const hasSrc = chars.some(ch => (ch.description || '').trim().length > 30) || lore.length > 0;
    const meta = getMeta();
    const curMods = meta?.mods ?? Object.fromEntries(MOD_IDS.map(id => [id, defaultModOn(id)]));
    const W = { base: hasSrc ? 'auto' : 'new', pmode: hasSrc ? 'minimal' : 'detailed', diff: meta?.difficulty ?? settings().difficulty, genre: '', cmode: 'auto', play: meta?.play ? playOf(meta).mode : 'auto', gm: GEN_MODES[settings().genMode] ? settings().genMode : 'hybrid' };
    // v2.7.1 상태창 언어: 채팅이 거의 영어면 「영어로 저장 · 화면은 한국어」를 먼저 권한다
    const recentTxt = (ctx().chat ?? []).slice(-12).map(m => String(m?.mes ?? '')).join(' ').replace(/<[^>]+>/g, ' ');
    const latin = (recentTxt.match(/[A-Za-z]/g) ?? []).length, hangul = (recentTxt.match(/[가-힣]/g) ?? []).length;
    const chatEn = latin > 200 && latin > hangul * 3;
    W.tr = settings().trEngine === 'llm' ? 'llm' : 'st';
    W.lang = settings().ssGenLang === 'enview' || (settings().ssGenLang !== 'ko' && chatEn) ? 'enview' : settings().ssGenLang === 'ko' && !chatEn ? 'ko' : chatEn ? 'enview' : 'ko';
    const el = h(`<div class="ss-root ss-scope ss-wizard">
        <div class="ss-wz-head"><i class="fa-solid fa-wand-magic-sparkles"></i><div><b>상태창 만들기</b><small>어떤 카드든, 카드가 없어도 돼요. AI가 관련 칸끼리 묶어서 채워요.</small></div></div>
        <div class="ss-card ss-found">
            <div><span>캐릭터</span><b>${chars.length ? chars.map(ch => esc(ch.name)).join(', ') : '없음'}</b></div>
            <div><span>유저</span><b>${esc(c.name1)}${persona ? ' · 페르소나 있음' : ''}</b></div>
            <div><span>로어북</span><b>${lore.length ? lore.map(esc).join(', ') : '없음'}</b></div>
            <div><span>채팅</span><b>${chatN}개</b></div>
        </div>
        <section class="ss-sec"><div class="ss-sec-h"><h4>만드는 방식</h4></div>
            <div class="ss-seg wrap stack" data-w="gm">${Object.entries(GEN_MODES).map(([k, v]) => `<button data-v="${k}" class="${W.gm === k ? 'on' : ''}"><i class="fa-solid ${v.icon}"></i> ${v.name}<small>${v.desc}</small></button>`).join('')}</div>
            <p class="ss-hint ss-gmhint ${W.gm === 'ai' ? 'ss-hide' : ''}">기본 틀은 아래 「장르」에 맞춰져요 (안 고르면 현대). 수치 · 주사위 · 달력 · 업적 · 운명 카드처럼 어떤 세계관에도 맞는 칸은 검증된 모양으로 고정되고, 나머지는 「기본 틀만」이면 빈 뼈대로 · 「기본 틀 + AI」면 AI가 세계관에 맞게 채워요.</p>
        </section>
        <section class="ss-sec"><div class="ss-sec-h"><h4>상태창 언어</h4></div>
            <div class="ss-seg wrap stack" data-w="lang"><button data-v="enview" class="${W.lang === 'enview' ? 'on' : ''}">🇺🇸 영어로 저장 · 화면은 한국어로<small>AI에게 영어로 가고(영어 롤플에 잘 맞음) · 상태창에선 한국어로 번역해 보여 줘요 · 기본 틀도 영어로</small></button><button data-v="ko" class="${W.lang === 'ko' ? 'on' : ''}">🇰🇷 한국어로 저장<small>저장도 화면도 한국어 · 번역 없음</small></button></div>
            <div class="ss-w-trbox ${W.lang === 'enview' ? '' : 'ss-hide'}"><small class="ss-hint">화면 한국어 번역은</small>
                <div class="ss-seg wrap" data-w="tr"><button data-v="st" class="${W.tr === 'st' ? 'on' : ''}">무료 기본 번역 (추천)</button><button data-v="llm" class="${W.tr === 'llm' ? 'on' : ''}">AI 번역 모델 (토큰 듦)</button></div></div>
            <p class="ss-hint">${chatEn ? '이 채팅은 영어로 보여서 「영어로 저장」을 골라 뒀어요. ' : ''}카드 · 로어북 · 지시가 어떤 언어든 고른 언어로 만들어요. 무료 기본 번역은 실리태번의 Chat Translation(기본 Google)을 써요. 이 선택은 다른 채팅에도 적용돼요.</p>
        </section>
        <section class="ss-sec"><div class="ss-sec-h"><h4>세계관</h4></div>
            <div class="ss-seg wrap stack" data-w="base"><button data-v="auto" class="${W.base === 'auto' ? 'on' : ''}">기존 설정 그대로<small>카드·로어북·채팅을 읽어요</small></button><button data-v="new" class="${W.base === 'new' ? 'on' : ''}">새 세계관 만들기<small>아래 지시대로 새로</small></button></div>
            <div class="ss-f wide"><span>장르 (고르면 지시에 들어가요 · 선택)</span><div class="ss-pills" data-w="genre">${GENRES.map(g => `<button class="ss-pill" data-v="${g.id}">${g.name}</button>`).join('')}</div></div>
            <label class="ss-f wide ss-canon ss-hide"><span>원작 이름 (2차 창작)</span><input class="ss-in ss-w-canon" placeholder="예: 소설·게임·드라마 제목…"></label>
        </section>
        <section class="ss-sec"><div class="ss-sec-h"><h4>플레이 방식</h4></div>
            <div class="ss-seg wrap stack" data-w="play"><button data-v="auto" class="${W.play === 'auto' ? 'on' : ''}">자동 (추천)<small>카드·채팅을 보고 AI가 알아서 (추가 호출 없음)</small></button>${Object.entries(PLAY_MODES).map(([k, v]) => `<button data-v="${k}" class="${W.play === k ? 'on' : ''}">${v.name}<small>${v.desc}</small></button>`).join('')}</div>
            <label class="ss-f wide ss-hero ${W.play === 'director' ? '' : 'ss-hide'}"><span>주인공 이름 (풀사칭 · 비우면 AI가 정함)</span><input class="ss-in ss-w-hero" value="${esc(meta?.play?.hero ?? '')}" placeholder="예: 서이현"></label>
            <label class="ss-tog ss-cardworld ${W.play === 'auto' ? 'ss-hide' : ''}"><input type="checkbox" class="ss-switch ss-w-world" ${meta?.play?.cardIsWorld ? 'checked' : ''}><span>카드 이름이 캐릭터가 아니라 세계관·봇 이름이에요</span></label>
        </section>
        <section class="ss-sec"><div class="ss-sec-h"><h4>참고할 자료</h4></div><div class="ss-pills">
            <label class="ss-tog"><input type="checkbox" class="ss-switch" data-src="card" checked><span>캐릭터 카드</span></label>
            <label class="ss-tog"><input type="checkbox" class="ss-switch" data-src="persona" checked><span>페르소나</span></label>
            <label class="ss-tog"><input type="checkbox" class="ss-switch" data-src="lore" checked><span>로어북</span></label>
            <label class="ss-tog"><input type="checkbox" class="ss-switch" data-src="chat" ${chatN > 1 ? 'checked' : ''}><span>최근 채팅 ${settings().recentForGen}개</span></label></div></section>
        <section class="ss-sec"><div class="ss-sec-h"><h4>난이도</h4></div>
            <div class="ss-seg" data-w="diff">${Object.entries(DIFFS).map(([k, v]) => `<button data-v="${k}" class="${W.diff === k ? 'on' : ''}"><i class="fa-solid ${v.icon}"></i> ${v.name}</button>`).join('')}</div>
            <p class="ss-hint ss-diffdesc">${esc(DIFFS[W.diff].desc)}</p></section>
        <section class="ss-sec"><div class="ss-sec-h"><h4>프로필</h4></div>
            <div class="ss-seg wrap stack" data-w="pmode"><button data-v="minimal" class="${W.pmode === 'minimal' ? 'on' : ''}">최소<small>카드·로어북 그대로, 요약만 (토큰 절약)</small></button><button data-v="detailed" class="${W.pmode === 'detailed' ? 'on' : ''}">상세<small>이 시트만으로 (외모·말투·배경까지)</small></button></div></section>
        <section class="ss-sec"><div class="ss-sec-h"><h4>쓸 기능</h4><div class="ss-sec-r"><button class="ss-btn sm ghost" data-all="rec">추천만</button><button class="ss-btn sm ghost" data-all="1">전부</button><button class="ss-btn sm ghost" data-all="0">전부 끄기</button></div></div>
            ${GROUPS.filter(g => !['home', 'manage'].includes(g.id)).map(g => `<div class="ss-modgrp"><small>${g.name}</small><div class="ss-mods">${g.tabs.map(t => MOD[TAB_MOD(t)]).map(m => `<label class="ss-mod ${curMods[m.id] === false ? '' : 'on'}"><input type="checkbox" class="ss-switch" data-mod="${m.id}" ${curMods[m.id] === false ? '' : 'checked'}><i class="fa-solid ${m.icon}"></i><span><b>${m.name}</b><small>${m.desc}</small></span></label>`).join('')}</div></div>`).join('')}
            <div class="ss-f wide ss-cmode"><span>연락 방식</span><div class="ss-seg wrap" data-w="cmode">${Object.entries(CONTACT_MODES).map(([k, v]) => `<button data-v="${k}" class="${W.cmode === k ? 'on' : ''}"><i class="fa-solid ${v.icon}"></i> ${v.name}</button>`).join('')}</div><small class="ss-hint">휴대폰이 없는 세계관은 「편지」 — 배달부·갈매기·올빼미·강아지·마법 등으로 며칠 걸려 도착하고, 돈을 내면 급행(퀵)으로 바로 와요.</small></div>
        </section>
        <section class="ss-sec"><div class="ss-sec-h"><h4>추가 지시 <small>선택 · 무엇이든</small></h4></div>
            <textarea class="ss-in ss-w-ins" rows="3" placeholder="예: 현대 도시 판타지, 유저는 신입 헌터. 화폐는 원. 본거지는 원룸. 남캐 5명과는 처음엔 서먹하게."></textarea></section>
        <div class="ss-row-btns"><button class="ss-btn pri big ss-w-go"><i class="fa-solid fa-play"></i> 생성 시작</button><small class="ss-hint ss-w-cost"></small></div>
        <div class="ss-w-prog"></div>
    </div>`);
    const cost = () => {
        const on0 = [...el.querySelectorAll('[data-mod]:checked')].map(i => i.dataset.mod).filter(id => id !== 'music');
        el.querySelector('.ss-gmhint')?.classList.toggle('ss-hide', W.gm === 'ai');
        if (W.gm === 'tpl') { el.querySelector('.ss-w-cost').textContent = `AI 0회 · 토큰 0 · 기능 ${on0.length}개를 기본 틀로 바로 만들어요`; el.querySelector('.ss-cmode').classList.toggle('ss-hide', !el.querySelector('[data-mod="contact"]').checked); return; }
        const on = W.gm === 'hybrid' ? on0.filter(id => !HYBRID_TPL.includes(id)) : on0, n = on.length;
        const g = settings().genBatch ? GEN_GROUPS.filter(gr => gr.some(id => on.includes(id))).length : n;
        el.querySelector('.ss-w-cost').textContent = settings().genBatch ? `AI ${g + 1}회 (세계 핵심 1 + 묶음 ${g} · 기능 ${n}개) · 보통 1~2분` : `AI ${n + 1}회 (세계 핵심 1 + 기능 ${n}) · 보통 1~3분`; el.querySelector('.ss-cmode').classList.toggle('ss-hide', !el.querySelector('[data-mod="contact"]').checked); };
    cost();
    el.addEventListener('change', (e) => { const l = e.target.closest('.ss-mod'); if (l) l.classList.toggle('on', e.target.checked); cost(); });
    el.addEventListener('click', (e) => {
        const all = e.target.closest('[data-all]');
        if (all) { el.querySelectorAll('[data-mod]').forEach(i => { i.checked = all.dataset.all === 'rec' ? REC_MODS.includes(i.dataset.mod) : all.dataset.all === '1'; i.closest('.ss-mod').classList.toggle('on', i.checked); }); cost(); return; }
        const b = e.target.closest('[data-w] > button'); if (!b) return;
        const k = b.parentElement.dataset.w;
        if (k === 'genre') {
            const on = !b.classList.contains('on');
            b.parentElement.querySelectorAll('button').forEach(x => x.classList.remove('on'));
            b.classList.toggle('on', on); W.genre = on ? b.dataset.v : '';
            el.querySelector('.ss-canon').classList.toggle('ss-hide', W.genre !== 'fan');
            const g = GENRES.find(x => x.id === W.genre);
            if (g && g.contact !== 'auto' && W.cmode === 'auto') { /* 세계관에 맞게 그대로 두되 힌트로만 */ }
            return;
        }
        b.parentElement.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
        W[k] = b.dataset.v;
        if (k === 'lang') el.querySelector('.ss-w-trbox')?.classList.toggle('ss-hide', W.lang !== 'enview');
        if (k === 'play') { el.querySelector('.ss-hero').classList.toggle('ss-hide', W.play !== 'director'); el.querySelector('.ss-cardworld').classList.toggle('ss-hide', W.play === 'auto'); }
        if (k === 'diff') el.querySelector('.ss-diffdesc').textContent = DIFFS[W.diff].desc;
        if (k === 'gm') { settings().genMode = W.gm; saveSettings(); cost(); }
    });
    const results = { core: null, data: {} };
    let mods = {};
    const prog = el.querySelector('.ss-w-prog');
    const row = (id, name) => { let r = prog.querySelector(`[data-row="${id}"]`); if (!r) { r = h(`<div class="ss-prog-row" data-row="${id}"><span class="ico"></span><b>${name}</b><small></small></div>`); prog.appendChild(r); } return r; };
    const setRow = (id, name, stt, msg = '') => {
        const r = row(id, name); r.dataset.st = stt;
        r.querySelector('.ico').innerHTML = stt === 'run' ? '<i class="fa-solid fa-spinner fa-spin"></i>' : stt === 'ok' ? '<i class="fa-solid fa-check"></i>' : stt === 'fail' ? '<i class="fa-solid fa-xmark"></i>' : '<i class="fa-regular fa-clock"></i>';
        r.querySelector('small').innerHTML = msg;
    };
    let opts = null;
    const runOne = async (id) => {
        const name = id === 'core' ? '세계 핵심' : MOD[id].name;
        setRow(id, name, 'run');
        try {
            // 자동이거나, 풀사칭인데 주인공 이름을 비워 뒀으면 세계 핵심을 만들면서 같이 알아본다 (추가 호출 없음)
            const fillHero = id === 'core' && opts.play?.mode === 'director' && !opts.play.hero;
            const auto = id === 'core' && (!opts.play || fillHero);
            const data = await genModule(id, { sources: opts.sources, core: results.core, instruction: opts.instruction, profileMode: opts.pmode, contactMode: opts.cmode, feature: 'wizard', play: opts.play, detectPlay: auto });
            if (id === 'core') { results.core = data; queueMicrotask(() => { app.playTemp = opts.play; }); if (fillHero) opts.play = normPlay({ ...opts.play, hero: data.play?.hero ?? '', cast: data.play?.cast ?? [] }); else if (auto) opts.play = data.play ?? normPlay({ mode: 'rp' }); results.play = opts.play; }
            else results.data[id] = data;
            setRow(id, name, 'ok', id === 'core' ? `${esc(data.title)} · ${PLAY_MODES[opts.play.mode].name}${opts.play.mode === 'director' && opts.play.hero ? ` (주인공 ${esc(opts.play.hero)})` : ''}${opts.play.cardIsWorld ? ' · 카드=세계관' : ''}${auto ? ' — 자동' : ''}` : '');
            return true;
        } catch (e) { ssErr(LOG, id, e); setRow(id, name, 'fail', `${esc(e.message)} <button class="ss-btn sm" data-retry="${id}">다시</button>`); return false; }
    };
    // 묶음 하나: 한 번에 받고, 빠진 칸만 따로 다시 받는다
    const runGroup = async (grp) => {
        for (const id of grp) setRow(id, MOD[id].name, 'run', grp.length > 1 ? '묶음 생성 중' : '');
        let got = {};
        try { got = await genGroup(grp, { sources: opts.sources, core: results.core, instruction: opts.instruction, profileMode: opts.pmode, contactMode: opts.cmode, feature: 'wizard', play: opts.play }); }
        catch (e) { ssWarn(LOG, 'group', grp, e); }
        const miss = [];
        for (const id of grp) {
            if (got[id]) { results.data[id] = got[id]; setRow(id, MOD[id].name, 'ok'); } else miss.push(id);
        }
        for (const id of miss) await runOne(id);
    };
    prog.addEventListener('click', async (e) => {
        const id = e.target.closest('[data-retry]')?.dataset.retry;
        if (!id || !opts) return;
        if (id !== 'core' && !results.core) { toastr.warning('세계 핵심을 먼저 만들어야 해요.', TITLE); return; }
        await runOne(id); showApply();
    });
    const showApply = () => {
        const mb = prog.querySelector('.ss-mbanner');
        if (mb) { mb.querySelector('img')?.setAttribute('src', mascotUrl(results.core ? 'happy' : 'sad')); mb.querySelector('span').textContent = results.core ? '다 됐어요! 확인하고 적용해 주세요' : '세계 핵심을 만들지 못했어요. 다시 눌러 주세요'; }
        prog.querySelector('.ss-w-apply')?.remove();
        if (!results.core) return;
        // v2.7.19: AI가 만든 달력에 일정이 하나도 없으면 장르 기본 일정을 넣어 둠 (그 세계 달 · 날짜 안에 드는 것만) — 빈 달력으로 시작하지 않게
        const cal = results.data.calendar;
        if (cal && !(cal.events ?? []).length) {
            try { const ev = (skeleton('calendar', W.genre)?.events ?? []).filter(e => cal.months?.[e.m - 1] && e.d <= cal.months[e.m - 1].days); if (ev.length) cal.events = ev; } catch (e3) { ssWarn(LOG, 'cal events', e3); }
        }
        const b = h(`<div class="ss-w-apply"><button class="ss-btn pri big"><i class="fa-solid fa-check"></i> 적용하기 (${Object.keys(results.data).length}칸)</button><small class="ss-hint">실패한 칸은 비워 두고, 나중에 그 칸에서 다시 채울 수 있어요.</small></div>`);
        b.querySelector('button').addEventListener('click', async () => {
            if (getMeta()?.base && !(await askConfirm('지금 이 채팅의 상태창을 새로 만든 것으로 바꿀까요?'))) return;
            if (results.data.rel && results.data.profile) relFromProfiles(results.data.rel, results.data.profile); // 프로필에 있는 사람은 관계에도 꼭
            await setBase({ core: results.core, data: results.data }, mods, W.diff, results.play);
            applied = true;
            toastr.success('상태창을 만들었어요!', TITLE);
            el.closest('dialog')?.querySelector('.popup-button-ok')?.click();
            if (!document.querySelector('.ss-panel-pop')) setTimeout(() => app.newSheet(), 300);
        });
        prog.appendChild(b);
    };
    let running = false, applied = false; // 만드는 중에 창을 닫아도 계속 (v2.7.2)
    const goRun = async (e) => {
        const btn = e.currentTarget;
        const src = Object.fromEntries([...el.querySelectorAll('[data-src]')].map(i => [i.dataset.src, i.checked]));
        mods = Object.fromEntries([...el.querySelectorAll('[data-mod]')].map(i => [i.dataset.mod, i.checked]));
        if (W.lang && settings().ssGenLang !== W.lang) { settings().ssGenLang = W.lang; saveSettings(); } // 생성 전에 — 모든 AI 호출 · 기본 틀이 이 언어로
        if (W.lang === 'enview' && W.tr && settings().trEngine !== W.tr) { settings().trEngine = W.tr; saveSettings(); }
        const g = GENRES.find(x => x.id === W.genre);
        const canon = el.querySelector('.ss-w-canon').value.trim();
        let instruction = el.querySelector('.ss-w-ins').value.trim();
        if (g) instruction = `장르: ${g.name} — ${g.hint}${W.genre === 'fan' && canon ? ` 원작: ${canon} (원작 설정·인물·지명을 그대로 따를 것)` : ''}\n${instruction}`;
        if (W.gm !== 'tpl' && W.base === 'new' && !instruction && !(await askConfirm('추가 지시가 비어 있어요. AI가 아무 세계관이나 새로 만들어도 될까요?'))) return;
        busyBtn(btn, true, '생성 중…');
        prog.innerHTML = settings().showMascot === false ? '' : `<div class="ss-mbanner">${mascot('think', 'md')}<span>열심히 만드는 중… 보통 1~2분 걸려요</span></div>`;
        results.core = null; results.data = {};
        const sources = W.gm === 'tpl' ? '' : W.base === 'new' ? await gatherSources({ card: false, lore: false, chat: false, persona: src.persona }) : await gatherSources(src);
        const cmode = W.cmode === 'auto' && g && g.contact !== 'auto' ? g.contact : W.cmode;
        opts = { sources, instruction: W.base === 'new' ? `${instruction}\n(Create a NEW world. Ignore any existing card/lorebook.)` : instruction, pmode: W.pmode, cmode, play: W.play === 'auto' ? null : normPlay({ mode: W.play, hero: el.querySelector('.ss-w-hero').value, cardIsWorld: el.querySelector('.ss-w-world').checked }) };
        results.play = opts.play;
        app.playTemp = opts.play;
        // 추천 음악은 장면이 생기면 본편 AI가 고르므로 처음엔 빈 칸으로 (AI 호출 아끼기)
        if (mods.music) results.data.music = EMPTY.music();
        const ids0 = MOD_IDS.filter(id => id !== 'music' && mods[id] && (!MOD[id].needs || mods[MOD[id].needs]));
        // 기본 틀: AI 없이 바로 채우는 칸
        const tplIds = W.gm === 'tpl' ? ids0 : W.gm === 'hybrid' ? ids0.filter(id => HYBRID_TPL.includes(id)) : [];
        const ids = ids0.filter(id => !tplIds.includes(id));
        for (const id of tplIds) { try { const d = skeleton(id, W.genre, { pmode: W.pmode, cmode }); if (d) { results.data[id] = normalize(id, d); setRow(id, MOD[id].name, 'ok', '기본 틀'); } } catch (e2) { ssWarn(LOG, 'skeleton', id, e2); } }
        if (tplIds.length && W.gm === 'hybrid') { const hint = skeletonHint(W.genre, tplIds); if (hint) opts.instruction = `${opts.instruction}\n${hint}`.trim(); }
        if (W.gm === 'tpl') {
            results.core = skeletonCore(W.genre, { canon, instruction: el.querySelector('.ss-w-ins').value.trim() });
            const chars = chatCharacters();
            results.play = opts.play ?? normPlay({ mode: chars.length > 1 ? 'multi' : 'rp' });
            setRow('core', '세계 핵심', 'ok', `${esc(results.core.title)} · 기본 틀 (AI 0회)`);
            busyBtn(btn, false);
            btn.innerHTML = '<i class="fa-solid fa-rotate"></i> 다시 만들기';
            return showApply();
        }
        setRow('core', '세계 핵심', 'wait');
        for (const id of ids) setRow(id, MOD[id].name, 'wait');
        if (await runOne('core')) {
            const par = clamp(parseInt(settings().genParallel, 10) || 4, 1, 8);
            if (settings().genBatch) {
                const groups = GEN_GROUPS.map(g => g.filter(id => ids.includes(id))).filter(g => g.length);
                const left = ids.filter(id => !GEN_GROUPS.flat().includes(id));
                if (left.length) groups.push(left);
                const q = [...groups];
                const worker = async () => { while (q.length) await runGroup(q.shift()); };
                await Promise.all(Array.from({ length: Math.min(par, q.length) }, worker));
            } else {
                const q = [...ids];
                const worker = async () => { while (q.length) await runOne(q.shift()); };
                await Promise.all(Array.from({ length: Math.min(par, q.length) }, worker));
            }
        }
        busyBtn(btn, false);
        btn.innerHTML = '<i class="fa-solid fa-rotate"></i> 다시 생성';
        showApply();
    };
    el.querySelector('.ss-w-go').addEventListener('click', async (e) => {
        if (running) return;
        running = true;
        try { await goRun(e); } finally { running = false; }
    });
    // 창을 닫았을 때: 만드는 중이면 뒤에서 계속 → 다 되면 창을 다시 열어 「적용하기」 · 다 만들고 적용 안 했으면 다시 열 수 있게
    const reopen = () => popup(el, { large: true }).then(after);
    const after = () => {
        if (applied) { app.playTemp = null; return; }
        if (running) {
            toastr.info('창을 닫아도 계속 만들고 있어요. 다 되면 다시 열어 드릴게요.', TITLE);
            const t = setInterval(() => {
                if (running) return;
                clearInterval(t);
                if (applied) return;
                if (results.core) { toastr.success('상태창을 다 만들었어요! 확인하고 「적용하기」를 눌러 주세요.', TITLE); reopen(); }
                else toastr.warning('상태창을 만들지 못했어요. 「상태창 만들기」에서 다시 해 주세요.', TITLE);
            }, 500);
            return;
        }
        if (results.core) { toastr.info('만든 상태창을 아직 적용하지 않았어요. 여기를 누르면 다시 열려요.', TITLE, { timeOut: 20000, onclick: () => reopen() }); return; }
        app.playTemp = null;
    };
    await popup(el, { large: true });
    after();
}
