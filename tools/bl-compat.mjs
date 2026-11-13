// 🍋 블루레몬에이드 호환 검사 (dev 전용 · 실리태번은 이 파일을 읽지 않아요)
// 블루레몬에이드(BL)는 미트볼 상태창의 이름 · 선택자 · 설정 키 · 함수 이름을 보고 화면을 맞추고 기능 다리를 놓아요.
// 그 약속(계약)이 깨졌는지 BL 저장소의 최신 코드를 직접 읽어서 확인해요.
//
//   node tools/bl-compat.mjs [BL 폴더]          정적 검사 (이름 · 키 · 클래스)
//   node tools/bl-compat.mjs [BL 폴더] --live   + 브라우저에서 BL의 설정 탭 · 정리한 보기를 우리 설정 칸에 실제로 돌려 봄
//
// BL 폴더를 안 주면 ../kgangkgang/blue-lemonade · ../blue-lemonade 를 찾아요. 없으면:
//   git clone --depth 1 https://github.com/kgangkgang/blue-lemonade.git ../blue-lemonade
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(here, '..');
const argBL = process.argv.slice(2).find(a => !a.startsWith('--'));
const BL = [argBL, path.resolve(ROOT, '../kgangkgang/blue-lemonade'), path.resolve(ROOT, '../blue-lemonade')].filter(Boolean).find(p => fs.existsSync(path.join(p, 'src/ext-bridge-core.js')));
if (!BL) { console.error('블루레몬에이드 폴더를 못 찾았어요. node tools/bl-compat.mjs <폴더>'); process.exit(2); }

const read = (p) => fs.readFileSync(p, 'utf8');
const ours = ['index.js', ...fs.readdirSync(path.join(ROOT, 'src')).filter(f => f.endsWith('.js')).map(f => `src/${f}`)];
const SRC = Object.fromEntries(ours.map(f => [f, read(path.join(ROOT, f))]));
const ALL = Object.values(SRC).join('\n');
const CSS = read(path.join(ROOT, 'style.css'));
let fails = 0, warns = 0;
const ok = (c, msg, extra = '') => { if (c) console.log(`  ✔ ${msg}`); else { console.log(`  ✘ ${msg}${extra ? ` — ${extra}` : ''}`); fails++; } };
const warn = (c, msg, extra = '') => { if (c) console.log(`  ✔ ${msg}`); else { console.log(`  ⚠ ${msg}${extra ? ` — ${extra}` : ''}`); warns++; } };

const blManifest = JSON.parse(read(path.join(BL, 'manifest.json')));
const ourManifest = JSON.parse(read(path.join(ROOT, 'manifest.json')));
console.log(`🍋 Blue Lemonade ${blManifest.version}  ↔  😼 Meatball ${ourManifest.version}   (${BL})\n`);

// BL 모듈은 순수 ES 모듈이라 node에서 바로 읽을 수 있어요 (번역 애드온 등 브라우저 전용 import가 있으면 글로 읽기로)
async function blImport(rel) { try { return await import(pathToFileURL(path.join(BL, rel)).href); } catch (e) { return { __err: e }; } }
const textOf = (rel) => read(path.join(BL, rel));

// ── 1. 기능 다리 (src/ext-bridge-core.js) ──
console.log('① 기능 다리 — 호출 스택 함수 이름 · 설정 키 · 주입 칸');
{
    const t = textOf('src/ext-bridge-core.js');
    const fnBlock = t.slice(t.indexOf('export const FN_SLOT'), t.indexOf('});', t.indexOf('export const FN_SLOT')));
    const fns = [...fnBlock.matchAll(/(\w+):\s*'(\w+)'/g)].map(m => m[1]);
    for (const fn of fns) ok(new RegExp(`(?:async\\s+)?function\\s+${fn}\\s*\\(`).test(ALL), `함수 ${fn}() 있음`, 'BL이 스택에서 이 이름으로 기능을 알아봐요 — 이름을 바꾸면 BL의 FN_SLOT도 같이 바꿔야 해요');
    const slots = [...t.slice(t.indexOf('export const SLOTS'), t.indexOf(']);', t.indexOf('export const SLOTS'))).matchAll(/\['(\w+)',\s*'[^']*',\s*'[^']*',\s*'(\w+)'\]/g)].map(m => m[2]);
    const core = SRC['src/core.js'];
    for (const k of slots) { ok(new RegExp(`\\n\\s+${k}:`).test(core), `설정 키 ${k} (DEFAULTS)`); ok(SRC['index.js'].includes(`data-s="${k}"`), `설정 칸 data-s="${k}"`); }
    const target = t.match(/export const TARGET = Object\.freeze\(\{([\s\S]*?)\}\);/)?.[1] ?? '';
    const val = (k) => target.match(new RegExp(`${k}:\\s*'([^']*)'`))?.[1];
    ok(core.includes(`export const MODULE = '${val('module')}'`), `확장 설정 이름 ${val('module')}`);
    ok(core.includes(`'${val('stateKey')}'`), `주입 칸 ${val('stateKey')}`);
    for (const k of ['statussim_people', 'statussim_romance']) if (target.includes(k)) ok(core.includes(`'${k}'`), `주입 칸 ${k}`);
    ok(ALL.includes(val('tag')), `태그 ${val('tag')}`);
    ok(SRC['index.js'].includes(`id = '${val('root').replace('#', '')}'`), `설정 칸 ${val('root')}`);
    ok(SRC['index.js'].includes(`class="${val('head').split('.').pop()}"`), `묶음 머리 ${val('head')}`);
    ok(/display_name"\s*:\s*"[^"]*(미트볼|Meatball)/i.test(read(path.join(ROOT, 'manifest.json'))), 'manifest 이름에 「미트볼/Meatball」 (BL이 설치 정보로 알아봐요)');
}

// ── 2. 화면 맞춤 (src/ext-compat.js SETS) ──
console.log('\n② 화면 맞춤 — 설정 칸 · 판 번호 · 탭 줄');
const compat = await blImport('src/ext-compat.js');
{
    const set = compat.SETS?.find(s => s.root === '#ss-settings');
    ok(!!set, 'BL SETS에 미트볼 칸 있음');
    if (set) {
        ok(SRC['index.js'].includes('inline-drawer-header') && SRC['index.js'].includes('<small>v${VERSION}</small>'), `판 번호 자리 ${set.version}`);
        const v = ourManifest.version;
        warn(set.verified.includes(v), `BL이 확인한 판에 ${v} 있음`, `BL 확인 판: ${set.verified.join(' · ')} → BL 설정 칸 맨 아래 「지금 판은 ${v} — 일부가 어긋나 보일 수 있어요」 안내가 떠요. BL 쪽에 새 판을 알려 주세요 (맞춤 자체는 그대로 걸려요)`);
        for (const sel of set.strips ?? []) ok(sel.split(/\s+/).every(c => ALL.includes(c.replace(/^\./, ''))), `탭 줄 ${sel}`);
    }
}

// ── 3. 정리한 보기 (src/ext-organize.js PLANS) ──
console.log('\n③ 정리한 보기 — 설정 칸 열쇠(data-s · data-s-act)');
const org = await blImport('src/ext-organize.js');
{
    const plan = org.PLANS?.['#ss-settings'];
    ok(!!plan, 'BL PLANS에 미트볼 칸 있음');
    if (plan) {
        const keys = new Set([...plan.intro.map(x => x[0]), ...plan.folds.flatMap(f => f[1].map(k => String(k).split(':')[0])), ...Object.keys(plan.cost ?? {}), ...(plan.start?.[1] ?? []).map(x => x[1])]);
        const has = (k) => new RegExp(`data-s(?:-act)?="${k}"`).test(SRC['index.js']);
        for (const k of keys) ok(has(k), `열쇠 ${k}`, '이 열쇠가 없으면 BL이 그 줄을 조용히 원래 모습으로 둬요 (깨지진 않지만 정리가 빠져요)');
    }
}

// ── 4. 맞춤 시트가 꾸미는 클래스 (src/ext-status.css) ──
console.log('\n④ 맞춤 시트 — BL이 꾸미는 미트볼 클래스가 아직 있나');
{
    const css = textOf('src/ext-status.css');
    const cls = [...new Set([...css.matchAll(/\.(ss-[a-z0-9-]+)/g)].map(m => m[1]))];
    const used = (c) => ALL.includes(c) || CSS.includes(`.${c}`);
    const gone = cls.filter(c => !used(c));
    warn(!gone.length, `BL 시트의 ss- 클래스 ${cls.length}개 중 ${cls.length - gone.length}개가 미트볼에 있음`, gone.length ? `없는 것 ${gone.length}개: ${gone.slice(0, 30).join(' ')}${gone.length > 30 ? ' …' : ''} (예전 판 클래스면 괜찮아요)` : '');
    const icons = (ALL.match(/fa-gauge-high/g) ?? []).length;
    warn(icons >= 4, `계기판 아이콘(fa-gauge-high) ${icons}곳 — BL이 고양이로 바꿔 그려요`);
    // 우리가 이번에 새로 만든 클래스 — BL 시트가 아직 모르는 것 (테마 색을 못 받을 수 있음)
    const mine = [...new Set([...CSS.matchAll(/\.(ss-[a-z0-9-]+)/g)].map(m => m[1]))].filter(c => !css.includes(c));
    console.log(`  ℹ BL 시트가 아직 안 꾸미는 미트볼 클래스 ${mine.length}개 (미트볼 기본 모양으로 보여요): ${mine.filter(c => /fresh|pip|qcheck|qjudge|qj-|feat/.test(c)).join(' ') || '-'}`);
    ok(/--ss-[a-z]/.test(CSS), '색 변수(--ss-*) 그대로 — BL이 팔레트를 여기에 이어요');
}

// ── 5. 실제로 돌려 보기 (브라우저) ──
if (process.argv.includes('--live')) {
    console.log('\n⑤ 브라우저에서 BL 설정 탭 · 정리한 보기를 우리 설정 칸에 돌려 보기');
    process.env.BL_DIR = BL;
    const { open } = await import('./harness/lib.mjs');
    const { page, logs, close } = await open({ bl: true });
    try {
        await page.evaluate(() => document.body.classList.add('show-settings'));
        const r = await page.evaluate(async () => {
            const m = await import('/bl/src/ext-compat.js');
            const o = await import('/bl/src/ext-organize.js');
            m.buildAll(document);
            const root = document.getElementById('ss-settings');
            const tabs = [...root.querySelectorAll('.bl-ext-tab')].map(t => t.textContent.trim());
            const rows = [...root.querySelectorAll('[data-s]')];
            const lost = []; // 어느 탭에도 안 보이는 줄
            const seen = new Set();
            for (let i = 0; i < tabs.length; i++) {
                m.showGroup(root, i);
                for (const b of root.querySelectorAll('.bl-ext-fold[aria-expanded="false"]')) o.toggleFold(root, b); // 접힌 갈래 펼치기 (BL 화면에선 갈래 단추를 누르면 펼쳐져요)
                for (const d of root.querySelectorAll('details')) d.open = true;
                for (const el of rows) { const r0 = el.getBoundingClientRect(); if (r0.width && r0.height) seen.add(el.dataset.s); }
            }
            for (const el of rows) if (!seen.has(el.dataset.s)) lost.push(el.dataset.s);
            return { tabs, lost, n: rows.length, org: root.dataset.blOrg !== undefined };
        });
        ok(r.tabs.length >= 10, `분류 탭 ${r.tabs.length}개: ${r.tabs.join(' | ')}`);
        ok(r.tabs.includes('기능 켜고 끄기'), '새 묶음 「기능 켜고 끄기」가 탭으로 보임');
        ok(!r.lost.length, `설정 ${r.n}칸이 모두 어느 탭에선가 보임`, `안 보이는 칸: ${r.lost.join(', ')}`);
        await page.screenshot({ path: '/tmp/bl-settings.png', fullPage: false });
    } finally { if (logs.length) console.log(logs.slice(0, 8).join('\n')); await close(); }
}

console.log(`\n${fails ? `✘ 깨진 약속 ${fails}개` : '✔ 깨진 약속 없음'}${warns ? ` · ⚠ 확인할 것 ${warns}개` : ''}`);
process.exit(fails ? 1 : 0);
