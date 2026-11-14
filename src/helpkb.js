// 🐱 도우미 지식 (v2.7.1): README.md를 읽어 질문에 AI 없이 답한다 — 토큰 0
// README의 ## / ### 제목마다 한 칸. 제목 밑 <!-- 키워드: … --> 는 GitHub에선 안 보이고, 찾을 때 비슷한 말로 쓴다.
// 화면(DOM)·설정을 모르는 순수 함수만 — 그래서 따로 시험해 볼 수 있다.

const nz = (s) => String(s ?? '').toLowerCase().replace(/<!--[\s\S]*?-->/g, ' ').replace(/[^\p{L}\p{N}\s.+]/gu, ' ').replace(/\s+/g, ' ').trim();
const tight = (s) => nz(s).replace(/\s+/g, '');

// ───── README → 칸 ─────
export function parseReadme(md) {
    const lines = String(md ?? '').replace(/\r/g, '').split('\n');
    const out = [];
    let cur = null, parent = '', fence = false;
    const push = () => { if (cur) { cur.body = cur.body.join('\n').trim(); out.push(cur); } };
    for (const line of lines) {
        if (/^```/.test(line)) fence = !fence;
        const h = !fence && line.match(/^(#{2,3})\s+(.+?)\s*$/);
        if (h) {
            push();
            const level = h[1].length, title = h[2].replace(/`/g, '');
            if (level === 2) parent = title;
            const ver = title.match(/\bv(\d+\.\d+(?:\.\d+)?)/i)?.[1] ?? null;
            cur = { id: `s${out.length}`, level, title, parent: level === 2 ? '' : parent, ver, keys: [], body: [] };
            continue;
        }
        if (!cur) continue;
        const k = line.match(/<!--\s*키워드:\s*([\s\S]*?)-->/);
        if (k) { cur.keys.push(...k[1].split(/[,·]/).map(x => x.trim()).filter(Boolean)); continue; }
        cur.body.push(line);
    }
    push();
    for (const s of out) {
        s._t = tight(s.title);
        s._k = s.keys.map(tight).filter(Boolean);
        s._b = tight(s.body);
        s.isVersion = !!s.ver && /버전|바뀐|무엇이/.test(s.parent);
        s.thin = s.body.replace(/<!--[\s\S]*?-->/g, '').trim().length < 60; // 묶음 제목뿐인 칸 (기능 안내 · 버전별)
    }
    return out;
}

// ───── 질문 → 낱말 ─────
// 끝말(조사 · 어미)을 떼서 「지우려면」→「지우」, 「삭제하고」→「삭제」처럼 줄기만 남긴다
const ENDS = ['하려면요', '하려면', '되나요', '할래요', '할래', '하는법', '하는게', '했는데', '하는데', '되는데', '해줘요', '해주세요', '해줘', '하나요', '할까요', '인가요', '이에요', '예요', '에서는', '에서', '으로는', '으로', '이랑', '하고', '까지', '부터', '이나', '려면', '는데', '은데', '나요', '해요', '했어', '돼요', '되요', '어요', '아요', '세요', '이요', '은요', '는요', '에는', '하면', '하기', '하는', '해서', '되는', '되게', '라고', '이라', '로는', '한테', '에게', '께서', '처럼', '같은', '같이', '됐어', '됐는데', '돼', '됨', '기', '은', '는', '이', '가', '을', '를', '에', '의', '도', '만', '요', '로', '와', '과', '야', '죠', '지', '게', '고', '면'];
const STOP = new Set(['어떻게', '어떡해', '뭐', '뭔가', '뭐야', '뭐예요', '왜', '어디', '어디서', '어디에', '있어', '있어요', '있나', '좀', '이거', '그거', '저거', '그', '이', '저', '미트볼', '상태창', '확장', '해', '돼', '되', '하', '하면', '나', '내', '제', '저는', '나는', '거', '것', '수', '때', '더', '혹시', '그리고', '근데', '아', '음', '진짜', '너무', '그냥', '걍', '좀더', '알려줘', '알려', '궁금', '궁금해', '방법', '어떤', '무슨', '언제', '되나', '하나', '있는', '없는', '할', '한', '함', '됨', '임', '요', '거야', '건가', '건지', '싶어', '싶어요', '싶은데', '싶다', '싶음', '하고싶어', '처리', '하는지', '되는지', 'ㅠㅠ', 'ㅠ', 'ㅋㅋ', 'ㅋ']);
function stem(w) {
    for (let i = 0; i < 2; i++) { // 두 겹까지 (「지우려면요」 → 「지우」)
        const e = ENDS.find(x => w.endsWith(x) && w.length - x.length >= 2); // 줄기는 두 글자 이상 남긴다 (「편지」가 「편」이 되지 않게)
        if (!e) break;
        w = w.slice(0, -e.length);
    }
    return w;
}
export function tokens(q) {
    const raw = nz(q).split(' ').filter(Boolean);
    const out = [];
    for (const w of raw) {
        if (STOP.has(w)) continue;
        const s = stem(w);
        if (!s || STOP.has(s)) continue;
        out.push(s);
    }
    return [...new Set(out)];
}

// ───── 찾기 ─────
function scoreOf(sec, toks, pairs) {
    if (sec.thin) return 0;
    let sc = 0;
    for (const t of toks) {
        if (t.length >= 2) {
            if (sec._k.includes(t)) sc += 6;
            else if (sec._k.some(k => k.includes(t) || (k.length >= 2 && t.includes(k)))) sc += 4;
            if (sec._t.includes(t)) sc += 4;
            let n = 0, i = -1;
            while (n < 4 && (i = sec._b.indexOf(t, i + 1)) >= 0) n++;
            sc += n * 0.7;
        } else if (sec._k.includes(t) || sec.keys.some(k => nz(k).split(' ').includes(t))) sc += 3; // 「칩」「돈」「방」 같은 한 글자는 키워드와 똑같을 때만
    }
    for (const p of pairs) if (sec._k.includes(p)) sc += 3; // 「완전 삭제」처럼 두 낱말이 붙은 키워드
    return sc;
}
export function search(kb, q, { versions = false } = {}) {
    const toks = tokens(q);
    if (!toks.length) return [];
    const pairs = toks.slice(1).map((t, i) => toks[i] + t);
    return kb.map(sec => {
        let sc = scoreOf(sec, toks, pairs);
        if (sec.isVersion && !versions) sc *= 0.55; // 기능 질문엔 안내 칸이 먼저 (버전 기록은 같은 말이 많아서)
        return { sec, sc };
    }).filter(x => x.sc > 0).sort((a, b) => b.sc - a.sc);
}

// ───── 질문 종류 ─────
const RE_UPDATE = /(업데이트|업뎃|패치|버전|바뀐\s*(것|거|점)|바꼈|바뀜|바뀌었|달라진|새로\s*(생긴|나온|추가)|새\s*기능|신기능|추가된|changelog|새로운\s*거)/;
const RE_UPDATE_NOT = /(안\s*(돼|되|바뀌|보|떠|뜨)|새로고침|그대로|안바뀌|적용\s*안)/;
export function intentOf(q) {
    const s = String(q ?? '');
    if (/^\s*(안녕|하이|ㅎㅇ|hi|hello|헬로)/i.test(s)) return { kind: 'hello' };
    if (/(고마워|고맙|감사|ㄱㅅ|땡큐|thx|thank)/i.test(s) && s.length < 25) return { kind: 'thanks' };
    if (RE_UPDATE.test(s) && !RE_UPDATE_NOT.test(s)) {
        const v = s.match(/(\d+\.\d+(?:\.\d+)?)/)?.[1];
        if (v) return { kind: 'version', v };
        if (/(지난|이전|예전|옛날|옛|전체|모든|목록|히스토리|기록|다\s*보여)/.test(s)) return { kind: 'versions' };
        return { kind: 'latest' };
    }
    const no = /(안\s*(떠|뜨|떴|보|나와|나오|나|와|돼|되)|없어|없네|사라|안보|안뜨|안떠|않|안\s*됨|모르겠)/.test(s);
    if (no && /(칩|핍|변동|반영|숫자)/.test(s)) return { kind: 'diag', what: 'chips' };
    if (no && /(알림|팝업|토스트)/.test(s)) return { kind: 'diag', what: 'notice' };
    if (no && /(상태창|hud|허드|사이드|미니|창이|버튼)/i.test(s)) return { kind: 'diag', what: 'sheet' };
    if (/(토큰|비용|절약|아끼|아낄)/.test(s)) return { kind: 'diag', what: 'tokens' };
    return { kind: 'search' };
}

// ───── 화면에 그리기 (아주 작은 마크다운) ─────
const inline = (t, esc) => esc(t).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
export function mdToHtml(md, esc) {
    const lines = String(md ?? '').replace(/<!--[\s\S]*?-->/g, '').split('\n');
    const out = [];
    let i = 0;
    while (i < lines.length) {
        const l = lines[i];
        if (/^```/.test(l)) { const buf = []; i++; while (i < lines.length && !/^```/.test(lines[i])) buf.push(lines[i++]); i++; out.push(`<pre class="ss-hk-pre">${esc(buf.join('\n'))}</pre>`); continue; }
        if (/^\s*\|/.test(l)) {
            const rows = [];
            while (i < lines.length && /^\s*\|/.test(lines[i])) { if (!/^\s*\|[\s:|-]+\|\s*$/.test(lines[i])) rows.push(lines[i].trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim())); i++; }
            out.push(`<table class="ss-hk-tb">${rows.map((r, k) => `<tr>${r.map(c => (k ? `<td>${inline(c, esc)}</td>` : `<th>${inline(c, esc)}</th>`)).join('')}</tr>`).join('')}</table>`);
            continue;
        }
        const li = l.match(/^(\s*)(?:[-*]|(\d+)\.)\s+(.*)$/);
        if (li) { const depth = Math.min(3, Math.floor(li[1].length / 2)); out.push(`<div class="ss-hk-li d${depth}"><span>${li[2] ? `${li[2]}.` : '•'}</span><div>${inline(li[3], esc)}</div></div>`); i++; continue; }
        if (/^\s*>/.test(l)) { out.push(`<div class="ss-hk-q">${inline(l.replace(/^\s*>\s?/, ''), esc)}</div>`); i++; continue; }
        if (!l.trim()) { i++; continue; }
        out.push(`<p>${inline(l, esc)}</p>`);
        i++;
    }
    return out.join('');
}
// 한 칸 → 답 카드
export function sectionHtml(sec, esc) {
    return `<div class="ss-hk"><b class="ss-hk-t">${esc(sec.title)}</b>${sec.parent && !/기능 안내/.test(sec.parent) ? `<small class="ss-hk-p">${esc(sec.parent)}</small>` : ''}${mdToHtml(sec.body, esc)}</div>`;
}
export const versionsOf = (kb) => kb.filter(s => s.isVersion);
