// 프롬프트 · 토큰 창 · 꾸미기 창 — shell.js에서 떼어 냄
import { app, settings, saveSettings, getMeta, modOn, MOD_IDS, esc, fmtNum, sub } from './core.js';
import { buildInjection } from './engine.js';
import { PROMPT_DEFS, setPrompt, countTokens, FEATURE_NAMES } from './prompts.js';
import { popup, askConfirm, gauge, seg, applyTheme, THEMES, THEME_KEYS, themeVars, emptyBox, sec } from './kit.js';
import { MINI, MINI_REL_VALS, MINI_REL_SORT, miniRelOpt } from './views.js';

// ───── 프롬프트 · 토큰 창 ─────
export async function openPromptWindow(tab = 'when') {
    const el = document.createElement('div');
    el.className = 'ss-root ss-scope ss-pw';
    let cur = tab;
    const render = async () => {
        const set = settings();
        const meta = getMeta();
        const inj = app.current && !meta?.paused ? buildInjection(app.current) : null;
        const injText = inj ? sub([inj.main, inj.people, inj.romance].filter(Boolean).join('\n\n')).trim() : '';
        let body = '';
        if (cur === 'when') {
            const injTok = injText ? await countTokens(injText) : 0;
            const nMods = MOD_IDS.filter(id => modOn(id, meta)).length;
            const syncTxt = { tag: 'A. 태그 방식', tagPlus: 'A+B', analyze: 'B. 별도 분석', off: 'C. 끔' }[set.sync];
            const row = (icon, what, when, cost, on = true) => `<div class="ss-cost ${on ? '' : 'off'}"><i class="fa-solid ${icon}"></i><div><b>${what}</b><small>${when}</small></div><em>${cost}</em></div>`;
            body = `<div class="ss-callout"><i class="fa-solid fa-circle-info"></i><div><b>토큰은 두 군데서 들어요</b><span>① 본편(메인 AI)을 부를 때마다 붙는 상태 주입문 ② 확장이 따로 AI를 부르는 버튼 (<span class="ss-ai"><i class="fa-solid fa-wand-magic-sparkles"></i>AI</span> 표시)</span></div></div>
            ${sec('① 매 턴 — 본편 생성마다 자동', `
                ${row('fa-arrow-right-to-bracket', `상태 주입문 (입력) ≈ <b>${fmtNum(injTok)}</b> 토큰`, `본 답 · 다시 생성 · 스와이프 · 이어 쓰기마다 요청에 붙어요. 깊이 ${set.injectDepth} · 규칙 ${{ full: '전체', lite: '간결', ultra: '초압축' }[set.injectMode] ?? '전체'}${set.deltaMode ? ` · 변화 위주 (${set.deltaEvery}턴마다 전체)` : ''}${Object.keys(set.injEvery ?? {}).length ? ' · 칸별 보내는 때 설정됨' : ''}`, '매 턴', !!injText)}
                ${inj?.romance ? row('fa-heart', `그중 로맨스 보정 · 내 주입문 ≈ <b>${fmtNum(await countTokens(sub(inj.romance)))}</b> 토큰`, `따로 주입돼요 (깊이 ${set.romDepth}). 확장 설정 › 로맨스 보정에서 켠 것만 들어가요.`, '매 턴') : ''}
                ${row('fa-arrow-right-from-bracket', 'AI가 응답 끝에 쓰는 &lt;meatball&gt; (출력)', '바뀐 것만 적어서 보통 20~80 토큰. 화면에선 숨겨지고, 2턴 지난 것은 프롬프트에서도 지워져요.', '매 턴', set.sync === 'tag' || set.sync === 'tagPlus')}
                <p class="ss-hint">0 토큰이 되는 때: ⏸ 일시정지 · 「다음 1번 건너뛰기」 · OOC 메시지${set.oocDetect ? ' (자동 감지 켬)' : ' (자동 감지 꺼짐)'} · 조용한 생성/퀵리플라이 /gen${set.skipQuiet ? ' (자동 제외 켬)' : ' (꺼짐)'} · 이 채팅에서 끔</p>`)}
            ${sec('② 버튼을 누를 때만 — 확장 AI 1회씩', `
                ${row('fa-wand-magic-sparkles', '상태창 만들기', `세계 핵심 1 + 켠 기능 ${nMods}개 = AI ${nMods + 1}회. 재료(카드·로어북 최대 ${fmtNum(set.loreChars)}자·최근 채팅 ${set.recentForGen}개)가 매번 들어가요.`, `${nMods + 1}회`)}
                ${row('fa-rotate', '칸 AI로 채우기 · 다시 생성', '그 칸 하나만', '1회')}
                ${row('fa-wand-magic-sparkles', 'AI로 수정 (추가 지시)', '현재 칸 + 최근 채팅 14개', '1회')}
                ${row('fa-comment', '메신저 답장', '보낼 때마다 (「답장 받기」 끄면 0) · 다시 받기 1회', '1회')}
                ${row('fa-envelope-open-text', '편지 「뜯어 보기」', '도착한 답장 1통마다. 부치는 것 자체는 0', '1회')}
                ${row('fa-paper-plane', '선톡 · 편지 오게', '누를 때', '1회')}
                ${row('fa-newspaper', '새 소식 발행 · 새 호 발행 · 새 글 불러오기 · 댓글 달리기 · 의뢰 찾기', '누를 때', '각 1회')}
                ${row('fa-hashtag', 'SNS 새 게시물 · 반응 받기 · 추천 곡 3개 · 속마음 엿보기', '누를 때', '각 1회')}
                ${row('fa-screwdriver-wrench', `깨진 답 다시 받기 — ${set.retryJSON ? '켬' : '꺼짐'}`, '확장 AI 답(JSON)이 고쳐도 안 될 때만 한 번 더', set.retryJSON ? '가끔 +1' : '꺼짐', set.retryJSON)}
                ${row('fa-language', `상태창 번역 — ${set.ssGenLang === 'enview' ? '켬 (영어로 저장 · 화면만 번역)' : set.ssGenLang === 'en' ? '켬 (영어로 생성 → 번역본 저장)' : '꺼짐 (한국어로 바로 생성)'}`, `켜면 위의 AI 호출마다 번역 모델(${set.trProfile ? '고른 연결 프로필' : '확장 AI 모델'})이 1회 더. 「상태창 전체 번역」은 칸 1개 = 1회`, set.ssGenLang === 'en' ? '+1회씩' : '꺼짐', set.ssGenLang === 'en')}`)}
            ${sec('③ 설정에 따라 자동', `
                ${row('fa-magnifying-glass', `별도 분석 — 지금: ${syncTxt}`, 'B: 매 AI 응답마다 1회 · A+B: 응답에 &lt;meatball&gt;가 빠졌을 때만', set.sync === 'analyze' ? '매 응답' : set.sync === 'tagPlus' ? '가끔' : '꺼짐', set.sync === 'analyze' || set.sync === 'tagPlus')}
                ${row('fa-bell', `자동 선톡 — ${set.autoPing ? `켬 (${set.autoPingEvery}턴마다 확률)` : '꺼짐'}`, '켜 두면 가끔 누군가 먼저 연락해요', set.autoPing ? '가끔' : '꺼짐', set.autoPing)}`)}
            ${sec('토큰 0', '<p class="ss-hint">주사위 · 구매/판매 · 직접 편집 · 이동 · 달력 · 메모 · 업적 · 퀘스트 수락/완료 · 편지 부치기 · 메시지 수정/삭제 · HUD · 사이드 · 꾸미기</p>')}
            ${set.aiProfile ? `<p class="ss-hint">확장 AI는 연결 프로필 「${esc(set.aiProfile)}」로 보내요 (본편은 메인 연결).</p>` : ''}`;
        } else if (cur === 'inject') {
            const tok = injText ? await countTokens(injText) : 0;
            body = `<div class="ss-hint">${meta?.paused ? '일시정지 중이라 지금은 아무것도 보내지 않아요.' : `≈ ${fmtNum(tok)} 토큰 · 채팅 깊이 ${set.injectDepth}에 system 역할로 들어가요. 문구는 「프롬프트 수정」에서 바꿀 수 있어요.`}</div>
                <pre class="ss-code">${esc(injText || '(보내는 내용 없음)')}</pre>`;
        } else if (cur === 'edit') {
            const grp = (g, title) => sec(title, PROMPT_DEFS.filter(p => p.group === g).map(p => {
                const custom = Object.hasOwn(set.prompts ?? {}, p.key);
                return `<details class="ss-pdef ${custom ? 'custom' : ''}"><summary><b>${esc(p.label)}</b><small>${esc(p.when)}</small>${custom ? '<em>수정됨</em>' : ''}</summary>
                    <textarea class="ss-in ss-pta" rows="5" data-pk="${p.key}" spellcheck="false">${esc(set.prompts?.[p.key] ?? p.text)}</textarea>
                    <div class="ss-row-btns"><button class="ss-btn sm ghost" data-preset="${p.key}"><i class="fa-solid fa-rotate-left"></i> 기본값으로</button><small class="ss-hint">${/\{[a-z]/.test(p.text) ? `바뀌는 칸: ${[...new Set(p.text.match(/\{[a-z][a-zA-Z0-9_]*\}/g))].join(' ')}` : ''} {{user}} {{char}} 같은 실리 매크로도 돼요.</small></div></details>`;
            }).join(''));
            body = `<div class="ss-callout"><i class="fa-solid fa-pen-to-square"></i><div><b>모든 문구를 고칠 수 있어요</b><span>고친 내용은 바로 저장돼요. 칸(JSON) 모양 설명은 고장 방지를 위해 고정이에요.</span></div><button class="ss-btn sm" data-presetall="1">모두 기본값</button></div>
                ${grp('inject', '본편에 매 턴 붙는 글')}${grp('call', '확장 AI를 부를 때 쓰는 글')}`;
        } else {
            const u = [...(set.usage ?? [])].reverse();
            const today = new Date().toDateString();
            const sum = (list) => list.reduce((a, x) => [a[0] + x.inp, a[1] + x.out], [0, 0]);
            const [ti, to] = sum(u.filter(x => new Date(x.t).toDateString() === today));
            const [ai, ao] = sum(u);
            body = `<div class="ss-stats"><div><small>오늘</small><b>${u.filter(x => new Date(x.t).toDateString() === today).length}회</b><span>입력 ≈${fmtNum(ti)} · 출력 ≈${fmtNum(to)}</span></div><div><small>기록 전체 (최근 120)</small><b>${u.length}회</b><span>입력 ≈${fmtNum(ai)} · 출력 ≈${fmtNum(ao)}</span></div></div>
                <p class="ss-hint">확장 AI 호출만 적어요 (본편 생성은 실리태번이 따로 셉니다). 토큰은 글자 수로 어림한 값이에요.</p>
                <div class="ss-usage">${u.map(x => `<div class="${x.ok ? '' : 'fail'}"><small>${new Date(x.t).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</small><b>${esc(FEATURE_NAMES[x.f] ?? x.f)}</b><span>↑${fmtNum(x.inp)} ↓${fmtNum(x.out)}</span></div>`).join('') || emptyBox('아직 기록이 없어요', 'fa-receipt')}</div>
                ${u.length ? '<button class="ss-btn sm ghost" data-uclear="1"><i class="fa-solid fa-broom"></i> 기록 지우기</button>' : ''}`;
        }
        el.innerHTML = `<div class="ss-wz-head"><i class="fa-solid fa-scroll"></i><div><b>프롬프트 · 토큰</b><small>무엇이 언제 AI에게 가는지 보고, 고치기</small></div></div>
            ${seg([['when', '<i class="fa-solid fa-coins"></i> 토큰 안내'], ['inject', '<i class="fa-solid fa-eye"></i> 보내는 글'], ['edit', '<i class="fa-solid fa-pen"></i> 수정'], ['log', '<i class="fa-solid fa-receipt"></i> 기록']], cur, 'pw', 'class="ss-seg wrap"')}
            <div class="ss-pw-body">${body}</div>`;
    };
    el.addEventListener('click', async (e) => {
        const t = e.target.closest('[data-act="pw"]'); if (t) { cur = t.dataset.arg; await render(); return; }
        const r = e.target.closest('[data-preset]'); if (r) { setPrompt(r.dataset.preset, null); await render(); el.querySelector(`[data-pk="${r.dataset.preset}"]`)?.closest('details')?.setAttribute('open', ''); app.refreshNow(); return; }
        if (e.target.closest('[data-presetall]') && await askConfirm('모든 프롬프트를 기본값으로 되돌릴까요?')) { settings().prompts = {}; saveSettings(); await render(); app.refreshNow(); }
        if (e.target.closest('[data-uclear]')) { settings().usage = []; saveSettings(); await render(); }
    });
    let tmr;
    el.addEventListener('input', (e) => {
        const k = e.target.dataset.pk; if (!k) return;
        clearTimeout(tmr);
        tmr = setTimeout(() => { setPrompt(k, e.target.value); e.target.closest('details')?.classList.toggle('custom', Object.hasOwn(settings().prompts, k)); app.refreshNow(); }, 400);
    });
    await render();
    await popup(el, { large: true });
}

// ───── 꾸미기 창 ─────
export async function openThemeWindow() {
    const el = document.createElement('div');
    el.className = 'ss-root ss-scope ss-tw';
    const render = () => {
        const set = settings();
        const t = themeVars();
        el.innerHTML = `<div class="ss-wz-head"><i class="fa-solid fa-palette"></i><div><b>꾸미기</b><small>바뀌는 즉시 이 창과 HUD에 보여요</small></div></div>
            ${sec('테마', `<div class="ss-swatches">${Object.entries(THEMES).map(([k, v]) => `<button class="ss-swatch ${set.theme === k ? 'on' : ''}" data-theme="${k}" style="--a:${k === 'st' ? 'var(--SmartThemeBlurTintColor,#fff)' : v.bg};--b:${k === 'st' ? 'var(--SmartThemeBodyColor,#111)' : v.ink};--c:${k === 'st' ? 'var(--SmartThemeQuoteColor,#2f62e9)' : v.hi}"><span><i></i><i></i><i></i></span>${v.name}</button>`).join('')}</div>`)}
            ${sec('색 직접 고르기', `<div class="ss-colors">${THEME_KEYS.map(([k, n]) => `<label class="ss-colorf"><input type="color" class="ss-color" data-ck="${k}" value="${/^#[0-9a-f]{6}$/i.test(t[k]) ? t[k] : '#888888'}"><span>${n}</span>${Object.hasOwn(set.themeCustom ?? {}, k) ? `<button class="ss-x" data-cr="${k}" title="되돌리기">×</button>` : ''}</label>`).join('')}</div>
                <button class="ss-btn sm ghost" data-creset="1"><i class="fa-solid fa-rotate-left"></i> 직접 고른 색 모두 되돌리기</button>`)}
            ${sec('크기 · 모양', `<label class="ss-f wide"><span>글자 크기 ${Math.round((set.fontScale || 1) * 100)}%</span><input type="range" min="0.85" max="1.3" step="0.05" value="${set.fontScale}" data-num="fontScale"></label>
                <label class="ss-f wide"><span>모서리 둥글기 ${set.radius}px</span><input type="range" min="0" max="20" step="1" value="${set.radius}" data-num="radius"></label>
                <label class="ss-f wide"><span>사이드 패널 너비 ${set.sideWidth}px (PC)</span><input type="range" min="320" max="560" step="10" value="${set.sideWidth}" data-num="sideWidth"></label>`)}
            ${sec('보이는 곳', `<div class="ss-pills">
                <label class="ss-tog"><input type="checkbox" class="ss-switch" data-bool="showHud" ${set.showHud ? 'checked' : ''}><span>채팅 위 HUD</span></label>
                <label class="ss-tog"><input type="checkbox" class="ss-switch" data-bool="showSide" ${set.showSide ? 'checked' : ''}><span>사이드 패널</span></label>
                <label class="ss-tog"><input type="checkbox" class="ss-switch" data-bool="showFloat" ${set.showFloat ? 'checked' : ''}><span>떠 있는 버튼</span></label></div>
                <div class="ss-f wide"><span>HUD 위치</span>${seg([['top', '채팅 위'], ['bottom', '입력창 위']], set.hudPos, 'hudpos')}</div>
                <div class="ss-f wide"><span>사이드 패널 기본 상태</span>${seg([['closed', '닫힘 (손잡이만)'], ['mini', '미니 (안 열어도 보임)'], ['full', '펼침']], set.sideState, 'sidestate', 'class="ss-seg wrap"')}</div>`)}
            ${sec('사이드 미니창에 보일 것', `<div class="ss-pills">${Object.entries(MINI).map(([k, v]) => `<label class="ss-tog"><input type="checkbox" class="ss-switch" data-mini="${k}" ${set.sideMini.includes(k) ? 'checked' : ''}><span>${v.name}</span></label>`).join('')}</div>`)}
            ${sec('속마음 <small class="ss-dim">미니창 · HUD · 인물 카드</small>', `
                <div class="ss-f wide"><span>보는 방식</span>${seg([['off', '끔'], ['thought', '속마음 글'], ['emoji', '이모티콘'], ['kaomoji', '카모지']], set.mindMode ?? 'off', 'mindmode', 'class="ss-seg wrap"')}</div>
                ${(set.mindMode ?? 'off') !== 'off' ? `<div class="ss-f wide"><span>빈도</span>${seg([['always', '항상 (매 턴)'], ['random', `랜덤 (${Number(set.mindPct ?? 35)}% 턴)`]], set.mindFreq ?? 'random', 'mindfreq', 'class="ss-seg wrap"')}</div>
                <label class="ss-f wide"><span>랜덤 확률 ${Number(set.mindPct ?? 35)}%</span><input type="range" min="5" max="100" step="5" value="${Number(set.mindPct ?? 35)}" data-mindpct="1"></label>` : ''}
                <p class="ss-hint">본편 AI가 답에 같이 적어요 (추가 호출 없음 · 켜진 턴엔 요청 한 줄이 붙어요).</p>`)}
            ${(() => {
                const o = miniRelOpt();
                const people = app.current?.state?.data?.rel?.user ?? [];
                return sec('미니창 · 홈 「관계」 칸', `${set.sideMini.includes('rel') ? '' : '<p class="ss-hint">위에서 「관계」를 켜야 사이드 미니창에 보여요 (홈 탭에는 항상 보임).</p>'}
                <div class="ss-f wide"><span>보일 수치 (여러 개 가능)</span><div class="ss-pills">${Object.entries(MINI_REL_VALS).map(([k, n]) => `<label class="ss-tog"><input type="checkbox" class="ss-switch" data-mrel="${k}" ${o.show.includes(k) ? 'checked' : ''}><span>${n}</span></label>`).join('')}</div></div>
                <div class="ss-f wide"><span>순서</span>${seg(Object.entries(MINI_REL_SORT), o.sort, 'mrelsort', 'class="ss-seg wrap"')}</div>
                <label class="ss-f wide"><span>보일 인원 ${o.n}명</span><input type="range" min="1" max="6" step="1" value="${o.n}" data-mreln="1"></label>
                ${people.length ? `<div class="ss-f wide"><span>이 사람들만 보기 <small class="ss-dim">(안 고르면 위 순서대로 자동 · 고르면 인원 수 무시)</small></span><div class="ss-pills">${people.map(r => `<label class="ss-tog sm"><input type="checkbox" class="ss-switch" data-mrelp="${esc(r.name)}" ${o.pick.includes(r.name) ? 'checked' : ''}><span>${esc(r.name)}</span></label>`).join('')}</div></div>` : ''}`);
            })()}
            <div class="ss-tw-preview">${sec('미리보기', `<div class="ss-card">${gauge({ name: '체력', cur: 72, max: 100 })}${gauge({ name: '마나', cur: 18, max: 60, color: '#5b7cfa' })}</div><div class="ss-row-btns"><button class="ss-btn pri">주 버튼</button><button class="ss-btn">버튼</button><span class="ss-chip">칩</span><span class="ss-chip hi">강조</span><span class="pos">+12</span><span class="neg">−8</span></div>`)}</div>`;
    };
    const apply = () => { saveSettings(); applyTheme(); app.ensureUI(); };
    el.addEventListener('input', (e) => {
        const t = e.target, set = settings();
        if (t.dataset.ck) { set.themeCustom = { ...(set.themeCustom ?? {}), [t.dataset.ck]: t.value }; apply(); }
        if (t.dataset.mreln) { t.previousElementSibling.textContent = `보일 인원 ${t.value}명`; return; } // 끌 때는 글자만 · 놓으면 change에서 저장
        if (t.dataset.num) { set[t.dataset.num] = Number(t.value); apply(); t.previousElementSibling.textContent = t.previousElementSibling.textContent.replace(/[\d.]+(%|px)/, t.dataset.num === 'fontScale' ? `${Math.round(t.value * 100)}%` : `${t.value}px`); }
    });
    el.addEventListener('change', (e) => {
        const t = e.target, set = settings();
        if (t.dataset.bool) { set[t.dataset.bool] = t.checked; apply(); }
        if (t.dataset.mini) { set.sideMini = Object.keys(MINI).filter(k => el.querySelector(`[data-mini="${k}"]`).checked); apply(); render(); }
        if (t.dataset.mrel) { set.miniRel = { ...miniRelOpt(), show: Object.keys(MINI_REL_VALS).filter(k => el.querySelector(`[data-mrel="${k}"]`).checked) }; apply(); }
        if (t.dataset.mrelp !== undefined) { const o = miniRelOpt(); const n = t.dataset.mrelp; set.miniRel = { ...o, pick: t.checked ? [...o.pick.filter(x => x !== n), n] : o.pick.filter(x => x !== n) }; apply(); }
        if (t.dataset.mreln) { set.miniRel = { ...miniRelOpt(), n: Number(t.value) }; apply(); }
        if (t.dataset.mindpct) { set.mindPct = Number(t.value); apply(); }
        if (t.dataset.ck) render();
    });
    el.addEventListener('click', (e) => {
        const set = settings();
        const th = e.target.closest('[data-theme]'); if (th) { set.theme = th.dataset.theme; set.themeCustom = {}; apply(); render(); return; }
        const cr = e.target.closest('[data-cr]'); if (cr) { e.preventDefault(); const c = { ...set.themeCustom }; delete c[cr.dataset.cr]; set.themeCustom = c; apply(); render(); return; }
        if (e.target.closest('[data-creset]')) { set.themeCustom = {}; apply(); render(); return; }
        const md = e.target.closest('[data-act="mindmode"],[data-act="mindfreq"]');
        if (md) { if (md.dataset.act === 'mindmode') { set.mindMode = md.dataset.arg; if (set.mindMode !== 'off' && !set.sideMini.includes('mind')) set.sideMini = [...set.sideMini, 'mind']; } else set.mindFreq = md.dataset.arg; apply(); app.refreshNow?.(); render(); return; }
        const ms = e.target.closest('[data-act="mrelsort"]');
        if (ms) { set.miniRel = { ...miniRelOpt(), sort: ms.dataset.arg }; apply(); render(); return; }
        const sg = e.target.closest('[data-act="hudpos"],[data-act="sidestate"]');
        if (sg) { if (sg.dataset.act === 'hudpos') set.hudPos = sg.dataset.arg; else set.sideState = sg.dataset.arg; apply(); render(); }
    });
    render();
    await popup(el, { large: true });
}
