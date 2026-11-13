// 모든 시나리오를 차례로 (node tools/harness/run-all.mjs)
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
let bad = 0;
for (const t of ['t-smoke', 't-quest', 't-pip', 't-misc', 't-tr', 't-v275']) {
    const r = spawnSync(process.execPath, [path.join(here, `${t}.mjs`)], { encoding: 'utf8', timeout: 240000 });
    const out = `${r.stdout}${r.stderr}`;
    const fails = out.split('\n').filter(l => l.includes('✘') || /Error/.test(l));
    console.log(`${fails.length || r.status ? '✘' : '✔'} ${t}${fails.length ? `\n  ${fails.join('\n  ')}` : ''}`);
    if (fails.length || r.status) bad++;
}
process.exit(bad ? 1 : 0);
