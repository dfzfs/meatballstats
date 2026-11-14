// 😼 누를 때 효과 · 소리 — 소리 파일 없이 브라우저가 바로 만들어요 (가벼움)
import { settings } from './core.js';

let ac = null;
function audio() {
    if (ac) return ac;
    try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch { ac = null; }
    return ac;
}
const vol = () => Math.max(0, Math.min(1, (Number(settings().clickVol) || 40) / 100));

// 짧은 톤 하나: from → to Hz, ms 동안
function tone(from, to, ms, type = 'sine', gain = 0.08, delay = 0) {
    const a = audio(); if (!a) return;
    if (a.state === 'suspended') a.resume().catch(() => {});
    const t0 = a.currentTime + delay;
    const o = a.createOscillator(), g = a.createGain();
    o.type = type;
    o.frequency.setValueAtTime(from, t0);
    o.frequency.exponentialRampToValueAtTime(Math.max(40, to), t0 + ms / 1000);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain * vol() + 0.0001, t0 + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + ms / 1000);
    o.connect(g).connect(a.destination);
    o.start(t0); o.stop(t0 + ms / 1000 + 0.02);
}
export const SOUNDS = {
    tap: () => tone(620, 880, 55),                                  // 뿅
    tab: () => tone(440, 560, 45, 'triangle', 0.06),                // 톡
    ok: () => { tone(660, 660, 70, 'sine', 0.07); tone(990, 990, 110, 'sine', 0.07, 0.07); }, // 띠링
    meow: () => { tone(700, 1150, 110, 'triangle', 0.07); tone(1150, 620, 190, 'triangle', 0.07, 0.1); }, // 냥
};
export function play(kind = 'tap') {
    if (!settings().clickSound) return;
    try { (SOUNDS[kind] ?? SOUNDS.tap)(); } catch { /* 소리를 못 내는 환경 */ }
}

// 누르는 버튼마다 살짝 눌리는 효과 + (켜 두면) 소리
const TAP = '.ss-scope :is(.ss-btn, .ss-ib, .ss-tool, .ss-chip.btn, .ss-seg > button, .ss-pill, .ss-preset, .ss-t-btn, .ss-t-play, .ss-mini-w, .ss-hud-t, .ss-side-handle, .ss-float)';
const TABS = '.ss-scope :is(.ss-groups > button, .ss-tabs > button)';
export function initFx() {
    if (initFx.done) return;
    initFx.done = true;
    document.addEventListener('pointerdown', (e) => {
        const set = settings();
        if (!set.enabled) return;
        // 미트볼을 누르면 폴짝 + 냥
        const cat = e.target.closest('.ss-scope .ss-mascot.pet');
        if (cat) {
            if (set.clickAnim !== false) { cat.classList.remove('ss-hop'); void cat.offsetWidth; cat.classList.add('ss-hop'); }
            play('meow');
            return;
        }
        const tab = e.target.closest(TABS);
        const b = tab ?? e.target.closest(TAP);
        if (!b || b.disabled) return;
        if (set.clickAnim !== false) { b.classList.remove('ss-tap'); void b.offsetWidth; b.classList.add('ss-tap'); setTimeout(() => b.classList.remove('ss-tap'), 320); }
        play(tab ? 'tab' : 'tap');
    }, { passive: true, capture: true });
}
