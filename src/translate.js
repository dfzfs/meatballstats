// 🌐 상태창 번역: 확장 AI가 상태창을 영어로 만들면 → 번역 모델(따로 고른 싼 모델)이 한국어로 옮긴다
// 「상태창 전체 번역」 버튼은 이미 있는 칸들을 통째로 번역한다.
import { app, settings, esc, TITLE, LOG, MOD_IDS, MOD, modOn, getMeta } from './core.js';
import { P, aiGenerate, parseJSON } from './prompts.js';
import { commit } from './engine.js';

export const needTr = () => settings().ssGenLang === 'en';
const trOpts = () => ({ profile: settings().trProfile || '' });

// 이미 정해진 이름들 → 번역할 때 그대로 쓰게
function glossary(extra) {
    const s = app.current?.state;
    const names = new Set();
    const add = (x) => { if (x && typeof x === 'string' && x.length <= 30) names.add(x); };
    if (s) {
        add(s.core?.title);
        for (const p of s.data.profile?.list ?? []) add(p.name);
        for (const r of s.data.rel?.user ?? []) add(r.name);
        for (const p of s.data.map?.places ?? []) add(p.name);
        add(s.data.wallet?.currency);
    }
    if (extra?.title) add(extra.title);
    const list = [...names].filter(Boolean).slice(0, 50);
    return list.length ? `Known names (use exactly when the same person/place appears): ${list.join(', ')}` : '';
}

export async function trJSON(obj, extra) {
    const set = settings();
    const src = JSON.stringify(obj);
    try {
        const out = await aiGenerate('translate', P('ai.translate', { lang: set.trLang || '한국어', glossary: glossary(extra) }), src, Math.min(16000, Math.max(1000, Math.ceil(src.length * 1.3))), trOpts());
        return parseJSON(out);
    } catch (e) {
        console.warn(LOG, 'translate json', e);
        toastr.warning(`번역하지 못해 원문으로 둬요: ${esc(e.message)}`, TITLE);
        return obj;
    }
}
export async function trText(text) {
    const set = settings();
    if (!String(text ?? '').trim()) return text;
    try {
        const out = await aiGenerate('translate', P('ai.translateText', { lang: set.trLang || '한국어', glossary: glossary() }), String(text), Math.min(4000, Math.max(400, Math.ceil(String(text).length * 1.5))), trOpts());
        return String(out ?? '').replace(/^```[a-z]*\s*|```\s*$/g, '').trim() || text;
    } catch (e) { console.warn(LOG, 'translate text', e); return text; }
}
// 생성 결과 마무리: 영어 모드면 번역
export const finJSON = async (obj, extra) => (needTr() ? trJSON(obj, extra) : obj);
export const finText = async (t) => (needTr() ? trText(t) : t);
export const finLines = async (lines) => (needTr() && lines.length ? (await trText(lines.join('\n'))).split(/\r?\n/).map(x => x.trim()).filter(Boolean) : lines);

// 「상태창 전체 번역」: 세계 핵심 + 켜진 칸 하나씩
let running = false, stop = false;
export async function translateSheet(btn) {
    if (running) { stop = true; return; }
    const s = app.current?.state;
    if (!s) return;
    const meta = getMeta();
    const ids = ['core', ...MOD_IDS.filter(id => modOn(id, meta) && s.data[id])];
    if (!(await SillyTavern.getContext().Popup.show.confirm(TITLE, `상태창 ${ids.length}칸을 「${esc(settings().trLang || '한국어')}」로 번역해요 (번역 모델 ${ids.length}회). 숫자·구조는 그대로 둬요. 다시 누르면 멈춰요.`))) return;
    running = true; stop = false;
    const old = btn?.innerHTML;
    let k = 0;
    try {
        for (const id of ids) {
            if (stop) break;
            if (btn) btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> ${k}/${ids.length} · 누르면 멈춤`;
            const cur = id === 'core' ? app.current.state.core : app.current.state.data[id];
            const out = await trJSON(cur);
            if (out !== cur) await commit(id, out, '');
            k++;
        }
    } finally { running = false; if (btn) btn.innerHTML = old; }
    toastr.success(`${k}칸 번역했어요${stop ? ' (멈춤)' : ''}.`, TITLE);
}
export { MOD };
