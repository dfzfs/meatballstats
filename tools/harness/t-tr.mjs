// 🌐 번역: 소문자 이름 번역 · 코드 값 보존 · 줄바꿈 보존 · 번역 모델이 칸을 망쳐도 원본 모양 유지 · 지침 이름 고정
import { open, makeStatus, sleep, check } from './lib.mjs';
const { page, logs, close } = await open();
try {
    await makeStatus(page);
    // 가짜 「실리 기본 번역」: 줄마다 [ko] 를 붙이고, 줄바꿈은 그대로 (구글처럼 「 / 」는 그대로 둠)
    await page.evaluate(() => {
        window.__trCalls = [];
        globalThis.translate = async (text, lang) => { window.__trCalls.push(text); return text.split('\n').map(l => `[${lang}]${l}`).join('\n'); };
        const s = window.__st.extensionSettings.statussim; s.ssGenLang = 'enview'; s.trEngine = 'st'; s.trRules = 'Leon Hart = 레온 하트';
    });
    const out = await page.evaluate(async () => {
        const tr = await import('/ext/src/translate.js');
        const obj = { list: [{ name: 'bread', qty: 2, kind: 'item', status: 'active', desc: 'A warm loaf.\nSmells good.', id: 'q_12', handle: '@leon_h', who: 'Leon Hart' }], system: 'd20' };
        const r = await tr.trJSON(obj);
        return { r, calls: window.__trCalls };
    });
    const it = out.r.list[0];
    check(it.name === '[ko]bread', `lowercase item name translated (${it.name})`);
    check(it.kind === 'item' && it.status === 'active' && it.id === 'q_12' && out.r.system === 'd20' && it.handle === '@leon_h', 'codes / ids / handles kept');
    check(it.desc.includes('\n'), `newline kept (${JSON.stringify(it.desc)})`);
    check(it.who === '레온 하트', `rule pair fixed name (${it.who})`);
    // 번역 모델(LLM)이 칸을 빼먹고 숫자 · 코드를 바꿔도 원본 모양 유지
    const out2 = await page.evaluate(async () => {
        const s = window.__st.extensionSettings.statussim; s.trEngine = 'llm';
        window.__ai = () => JSON.stringify({ list: [{ name: '빵', qty: 99, kind: '아이템' }] });
        const tr = await import('/ext/src/translate.js');
        return tr.trJSON({ list: [{ name: 'Bread', qty: 2, kind: 'item', desc: 'Warm.' }, { name: 'Rope', qty: 1, kind: 'item' }] });
    });
    check(out2.list.length === 2 && out2.list[0].qty === 2 && out2.list[0].kind === 'item' && out2.list[0].name === '빵' && out2.list[0].desc === 'Warm.' && out2.list[1].name === 'Rope', `LLM result overlaid on original (${JSON.stringify(out2)})`);
    // 화면 번역: 긴 문장 속 이름 바꾸기 · 사전이 바뀌면 바로 반영
    const out3 = await page.evaluate(async () => {
        const { getMeta } = await import('/ext/src/core.js');
        const tr = await import('/ext/src/translate.js');
        getMeta().tr = { 'Old Lantern': '낡은 등불', 'Leon Hart': '레온 하트' };
        const a = tr.trString('Leon Hart bought an Old Lantern');
        window.__SS_TEST__.api.app.addTrPairs([['Market', '시장']]);
        const b = tr.trString('Go to Market');
        return [a, b];
    });
    check(out3[0] === '레온 하트 bought an 낡은 등불' && out3[1] === 'Go to 시장', `screen translation (${out3})`);
} finally { console.log(logs.join('\n')); await close(); }
