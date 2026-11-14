// Shared helpers for harness scenarios (Playwright + fake ST)
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import { serve } from './server.mjs';

export async function open({ ext2 = false, width = 1300, height = 900 } = {}) {
    const srv = await serve(0);
    const port = srv.address().port;
    const browser = await chromium.launch({ executablePath: process.env.PW_CHROME || undefined });
    const page = await browser.newPage({ viewport: { width, height } });
    const logs = [];
    page.on('console', m => { if (['error', 'warning'].includes(m.type())) logs.push(`${m.type()}: ${m.text()}`); });
    page.on('pageerror', e => logs.push(`pageerror: ${e.stack || e}`));
    await page.goto(`http://127.0.0.1:${port}/${ext2 ? '?ext2=1' : ''}`);
    await page.waitForFunction(() => window.__ready === true, null, { timeout: 15000 });
    const close = async () => { await browser.close(); srv.close(); };
    return { page, logs, close, port };
}

// Build a template-only status window (no AI) with the given modules on
export async function makeStatus(page, mods = ['profile', 'stats', 'wallet', 'rel', 'map', 'calendar', 'quest', 'home', 'memo']) {
    await page.evaluate(async (mods) => {
        const { skeleton, skeletonCore } = await import('/ext/src/skeleton.js');
        const { setBase } = await import('/ext/src/shell.js');
        const { MOD_IDS } = await import('/ext/src/core.js');
        const data = {};
        for (const id of mods) data[id] = skeleton(id, 'fantasy');
        await setBase({ core: skeletonCore('fantasy'), data }, Object.fromEntries(MOD_IDS.map(id => [id, mods.includes(id)])), 'normal');
    }, mods);
}

export const sleep = (ms) => new Promise(r => setTimeout(r, ms));
export function check(cond, label, extra = '') {
    if (cond) console.log(`  ✔ ${label}`);
    else { console.log(`  ✘ ${label} ${extra}`); process.exitCode = 1; }
}
