// 마스코트 고양이: 누르면 뾱뾱 · 냥냥 (소리는 파일 없이 Web Audio로 합성)
import { settings, mascotUrl, MASCOTS } from './core.js';

// ───── 효과음 목록 (설정 화면 select에서 씀) ─────
export const MASCOT_SOUNDS = [
    ['mix', '🎲 뾱 + 냥 랜덤'],
    ['squeak', '🧸 뾱뾱 (삑삑이 장난감)'],
    ['meow', '🐱 냥냥 (고양이)'],
    ['kitten', '🐾 냐앙~ (아기 고양이)'],
    ['custom', '📂 내 소리 파일'],
    ['pop', '🫧 뽁 (방울 터지는 소리)'],
    ['purr', '💤 그르릉 (골골송)'],
    ['bell', '🔔 딸랑 (방울)'],
    ['off', '🔇 소리 끔'],
];
const LINES = {
    squeak: ['뾱!', '뾱뾱!', '뾰옥~'],
    meow: ['냥!', '냥냥!', '냐옹?'],
    kitten: ['냐앙~', '먀아…', '냥?'],
    custom: ['냥!', '냥냥!', '냐옹?', '냐앙~'],
    pop: ['뽁!', '퐁!'],
    purr: ['그르릉…', '골골골…'],
    bell: ['딸랑~', '띠링!'],
    off: ['…!', '?!', '♡'],
};

// ───── 오디오 ─────
let ac = null;
function audio() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ac ??= new AC();
    if (ac.state === 'suspended') ac.resume().catch(() => {});
    return ac;
}
function vol() { const v = Number(settings().mascotVolume); return Number.isFinite(v) ? Math.max(0, Math.min(100, v)) / 100 : 0.6; }
function outBus(a, level) {
    const g = a.createGain();
    g.gain.value = level * vol();
    g.connect(a.destination);
    return g;
}
const jit = (x, r = 0.08) => x * (1 + (Math.random() * 2 - 1) * r);

// ───── 진짜 고양이 녹음(Kitten Mew, CC0 · OpenGameArt)을 짧게 다듬은 소리 (snd/ 폴더) — level: 다른 효과음과 크기 맞춤 ─────
const CLIPS = {
    short: { file: 'nyang_short.mp3', level: 0.38 },
    arc: { file: 'nyang_arc.mp3', level: 0.13 },
    adult: { file: 'nyang_adult.mp3', level: 0.37 }, // 아기 냥을 조금 낮춘 것
    kitten: { file: 'nyaang_kitten.mp3', level: 0.41 },
};
const CLIP_SET = { meow: ['short', 'arc', 'adult'], kitten: ['kitten', 'kitten', 'arc'] };
const clipRaw = {}, clipBuf = {};
function fetchClips() { for (const [k, c] of Object.entries(CLIPS)) clipRaw[k] ??= fetch(new URL(`../snd/${c.file}`, import.meta.url)).then(r => r.arrayBuffer()).catch(() => null); }
function decodeClip(a, k) {
    if (clipBuf[k]) return Promise.resolve(clipBuf[k]);
    fetchClips();
    return clipBuf[`_${k}`] ??= clipRaw[k].then(ab => (ab ? a.decodeAudioData(ab.slice(0)) : null)).then(b => (clipBuf[k] = b)).catch(() => null);
}
function playClip(a, t0, k, rate = 1) {
    const b = clipBuf[k]; if (!b) return 0;
    const s = a.createBufferSource(); s.buffer = b; s.playbackRate.value = rate;
    s.connect(outBus(a, CLIPS[k].level)); s.start(t0);
    return b.duration / rate;
}
// 고른 소리(meow · kitten)에서 클립 하나 고르고, 아직 안 풀렸으면 풀고 나서 재생
function withClip(a, kind, fn) {
    const k = CLIP_SET[kind][Math.floor(Math.random() * CLIP_SET[kind].length)];
    if (clipBuf[k]) fn(k); else decodeClip(a, k).then(b => b && fn(k));
    for (const x of new Set(CLIP_SET[kind])) decodeClip(a, x); // 나머지도 미리
}

// ───── 내 소리 파일 (설정에 data URL로 저장 → 한 번 풀어서 재사용) ─────
let fileBuf = null, fileKey = '', fileLoading = null;
export const hasCustomSound = () => !!settings().mascotSoundFile;
function loadFile(a) {
    const src = settings().mascotSoundFile;
    if (!src) { fileBuf = null; fileKey = ''; return Promise.resolve(null); }
    const key = `${src.length}:${src.slice(-64)}`;
    if (key === fileKey && (fileBuf || fileLoading)) return fileBuf ? Promise.resolve(fileBuf) : fileLoading;
    fileKey = key; fileBuf = null;
    const toBytes = () => { const bin = atob(src.slice(src.indexOf(',') + 1)), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u.buffer; }; // fetch(data:) 대신 직접 풀기 (보안 설정에 막히지 않게)
    fileLoading = Promise.resolve().then(toBytes).then(ab => a.decodeAudioData(ab)).then(b => (fileBuf = b))
        .catch(err => { console.warn('[미트볼 상태창] 소리 파일을 읽지 못했어요', err); fileKey = ''; return null; })
        .finally(() => { fileLoading = null; });
    return fileLoading;
}
// rate: 1 = 원래 높이, 낮을수록 낮고 느리게 (우는 소리)
function playFile(a, t0, rate = 1, level = 1) {
    if (!fileBuf) return 0;
    const s = a.createBufferSource(); s.buffer = fileBuf; s.playbackRate.value = rate;
    s.connect(outBus(a, level)); s.start(t0);
    return fileBuf.duration / rate;
}
export const clearSoundCache = () => { fileBuf = null; fileKey = ''; };

// 삑삑이 장난감: 빠르게 올라갔다 내려오는 높은 음 두 번
function squeak(a, t0) {
    const bus = outBus(a, 0.22);
    const n = Math.random() < 0.6 ? 2 : 1;
    for (let k = 0; k < n; k++) {
        const t = t0 + k * 0.15, base = jit(1050);
        const o = a.createOscillator(), g = a.createGain(), lfo = a.createOscillator(), lg = a.createGain();
        o.type = 'square';
        o.frequency.setValueAtTime(base * 0.8, t);
        o.frequency.exponentialRampToValueAtTime(base * 1.7, t + 0.04);
        o.frequency.exponentialRampToValueAtTime(base * 1.15, t + 0.11);
        lfo.frequency.value = 38; lg.gain.value = 60; lfo.connect(lg).connect(o.frequency);
        const lp = a.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3800;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(1, t + 0.012);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
        o.connect(lp).connect(g).connect(bus);
        o.start(t); lfo.start(t); o.stop(t + 0.14); lfo.stop(t + 0.14);
    }
    return 0.15 * n;
}
function pop(a, t0) {
    const bus = outBus(a, 0.5);
    const o = a.createOscillator(), g = a.createGain(); o.type = 'sine';
    o.frequency.setValueAtTime(jit(900), t0); o.frequency.exponentialRampToValueAtTime(180, t0 + 0.09);
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(1, t0 + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.1);
    o.connect(g).connect(bus); o.start(t0); o.stop(t0 + 0.12);
    return 0.12;
}
function purr(a, t0) {
    const bus = outBus(a, 0.55), dur = 0.9;
    const len = Math.floor(a.sampleRate * dur), buf = a.createBuffer(1, len, a.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = a.createBufferSource(); src.buffer = buf;
    const lp = a.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 320;
    const am = a.createGain(); am.gain.value = 0.5;
    const lfo = a.createOscillator(), lg = a.createGain(); lfo.frequency.value = 26; lg.gain.value = 0.5; lfo.connect(lg).connect(am.gain);
    const env = a.createGain();
    env.gain.setValueAtTime(0.0001, t0); env.gain.exponentialRampToValueAtTime(1, t0 + 0.12);
    env.gain.setValueAtTime(1, t0 + dur - 0.25); env.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(lp).connect(am).connect(env).connect(bus);
    src.start(t0); lfo.start(t0); src.stop(t0 + dur); lfo.stop(t0 + dur);
    return dur;
}
function bell(a, t0) {
    const bus = outBus(a, 0.25), f = jit(1760, 0.05);
    for (const [m, l] of [[1, 1], [2.76, 0.5], [5.4, 0.25]]) {
        const o = a.createOscillator(), g = a.createGain(); o.type = 'sine'; o.frequency.value = f * m;
        g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(l, t0 + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.7 / m + 0.2);
        o.connect(g).connect(bus); o.start(t0); o.stop(t0 + 1);
    }
    return 0.7;
}
// 우는 소리: 훌쩍 두 번 + 길게 우는 냐아앙 (삑삑이는 바람 빠지는 뾰오오…)
function sniff(a, t0) {
    const bus = outBus(a, 0.3), dur = 0.12;
    const len = Math.floor(a.sampleRate * dur), buf = a.createBuffer(1, len, a.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = a.createBufferSource(); src.buffer = buf;
    const bp = a.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 2;
    bp.frequency.setValueAtTime(1500, t0); bp.frequency.linearRampToValueAtTime(3200, t0 + dur);
    const g = a.createGain(); g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(1, t0 + 0.03); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(bp).connect(g).connect(bus); src.start(t0); src.stop(t0 + dur);
    return dur;
}
function sadSqueak(a, t0) {
    const bus = outBus(a, 0.2), dur = 0.9, o = a.createOscillator(), g = a.createGain(), lfo = a.createOscillator(), lg = a.createGain();
    o.type = 'square';
    o.frequency.setValueAtTime(1500, t0); o.frequency.exponentialRampToValueAtTime(420, t0 + dur);
    lfo.frequency.value = 9; lg.gain.value = 70; lfo.connect(lg).connect(o.frequency);
    const lp = a.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2600;
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(1, t0 + 0.03); g.gain.setValueAtTime(1, t0 + dur * 0.6); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(lp).connect(g).connect(bus); o.start(t0); lfo.start(t0); o.stop(t0 + dur); lfo.stop(t0 + dur);
    return dur;
}
// 고른 소리 이름 정리: 내 소리 파일이 없으면 냥냥으로
function pickKind(kind = settings().mascotSound ?? 'mix') {
    if (kind === 'custom' && !hasCustomSound()) kind = 'meow';
    if (kind === 'mix') kind = Math.random() < 0.5 ? 'squeak' : 'meow';
    return kind;
}
function cry(a, t0, kind) {
    let t = t0;
    t += sniff(a, t) + 0.08; t += sniff(a, t) + 0.1;
    if (kind === 'custom' && fileBuf) t += playFile(a, t, 0.72); // 냥 소리는 낮고 느리게 → 우는 소리
    else if (CLIP_SET[kind]) { const k = CLIP_SET[kind][0]; t += clipBuf[k] ? playClip(a, t, k, 0.7) : sadSqueak(a, t); }
    else t += sadSqueak(a, t);
    return t - t0;
}
export function playCry() {
    const kind = pickKind();
    if (kind === 'off' || vol() <= 0) return;
    try {
        const a = audio(); if (!a) return;
        if (kind === 'custom' && !fileBuf) { loadFile(a).then(() => cry(a, a.currentTime + 0.01, kind)); return; }
        if (CLIP_SET[kind] && !clipBuf[CLIP_SET[kind][0]]) { decodeClip(a, CLIP_SET[kind][0]).then(() => cry(a, a.currentTime + 0.01, kind)); return; }
        cry(a, a.currentTime + 0.01, kind);
    } catch (err) { console.warn('[미트볼 상태창] mascot cry', err); }
}

const SYNTH = { squeak, pop, purr, bell };

// 소리 하나 재생 — 실제로 난 소리 이름을 돌려줌 (말풍선 글에 씀)
export function playMascotSound(kind, times = 1) {
    kind = pickKind(kind);
    if (kind === 'off' || vol() <= 0) return kind in LINES ? kind : 'off';
    try {
        const a = audio(); if (!a) return kind;
        if (kind === 'custom') {
            const go = () => { let t = a.currentTime + 0.01; for (let i = 0; i < times; i++) t += playFile(a, t, jit(1, 0.05) * (1 + i * 0.08)) * 0.55; }; // 연타면 겹치며 점점 높게
            if (fileBuf && fileKey) go(); else loadFile(a).then(b => b && go());
            return kind;
        }
        if (CLIP_SET[kind]) {
            withClip(a, kind, (k) => { let t = a.currentTime + 0.01; for (let i = 0; i < times; i++) t += playClip(a, t, k, jit(1, 0.04) * (1 + i * 0.08)) * 0.6; });
            return kind;
        }
        if (!SYNTH[kind]) return 'off';
        let t = a.currentTime + 0.01;
        for (let i = 0; i < times; i++) t += SYNTH[kind](a, t) + 0.04;
    } catch (err) { console.warn('[미트볼 상태창] mascot sound', err); }
    return kind;
}

// ───── 말풍선 ─────
function bubble(img, text, ms = 1000) {
    const r = img.getBoundingClientRect();
    if (!r.width) return;
    const b = document.createElement('div');
    b.className = 'ss-mbubble';
    b.textContent = text;
    if (ms > 1000) { b.classList.add('long'); b.style.animationDuration = `${ms}ms`; }
    // 팝업(<dialog>) 안의 고양이면 팝업 안에 붙여야 위에 보임 (dialog는 맨 위 층이라 body에 붙이면 뒤로 숨음)
    (img.closest('dialog') ?? document.body).appendChild(b);
    const w = b.offsetWidth, x = Math.max(6, Math.min(window.innerWidth - w - 6, r.left + r.width / 2 - w / 2)), y = Math.max(6, r.top - b.offsetHeight - 6);
    b.style.left = `${x}px`; b.style.top = `${y}px`;
    // 부모에 transform이 있으면 fixed 기준이 달라짐 → 실제 위치를 재서 보정
    const got = b.getBoundingClientRect();
    if (Math.abs(got.left - x) > 1 || Math.abs(got.top - y) > 1) { b.style.left = `${2 * x - got.left}px`; b.style.top = `${2 * y - got.top}px`; }
    setTimeout(() => b.remove(), ms);
}

// ───── 누르기 ─────
const REACT = ['happy', 'surprise', 'party', 'happy'];
const CRY_LINES = ['그만 눌러…', '으앙ㅠㅠ 아파!', '냐아앙ㅠ 너무해…'];
const SULK_LINES = ['훌쩍…', '흥, 안 놀아ㅠ', '…삐졌어'];
const CRY_AT = 12, SULK_MS = 4000;
let combo = 0, comboT = 0, annoy = 0, annoyT = 0, sulkUntil = 0;
function setFace(img, name, ms) {
    img.dataset.m0 ??= (MASCOTS.find(n => img.classList.contains(`m-${n}`)) ?? 'idle');
    img.src = mascotUrl(name);
    clearTimeout(img._ssBack);
    img._ssBack = setTimeout(() => { img.src = mascotUrl(img.dataset.m0); img.classList.remove('cry'); }, ms);
}
function anim(img, cls) { img.classList.remove('poke', 'poke-big', 'cry', 'sniff'); void img.offsetWidth; img.classList.add(cls); }
const pick = (a) => a[Math.floor(Math.random() * a.length)];
function poke(img) {
    const now = Date.now();
    // 짜증 게이지: 누를 때마다 +1, 가만히 두면 0.6초마다 1씩 풀림
    annoy = Math.max(0, annoy - Math.floor((now - annoyT) / 600)) + 1; annoyT = now;
    if (now < sulkUntil) { // 우는 중엔 달래지지 않고 훌쩍이기만
        sulkUntil = now + SULK_MS;
        setFace(img, 'sad', SULK_MS); anim(img, 'sniff');
        if (settings().mascotSound !== 'off') try { const a = audio(); if (a && vol() > 0) sniff(a, a.currentTime + 0.01); } catch { /* 소리 실패는 무시 */ }
        bubble(img, pick(SULK_LINES));
        return;
    }
    if (annoy >= CRY_AT) { // 너무 많이 눌렀다 → 울음
        annoy = 0; combo = 0; sulkUntil = now + SULK_MS;
        setFace(img, 'sad', SULK_MS); anim(img, 'cry');
        playCry();
        bubble(img, pick(CRY_LINES), 1800);
        return;
    }
    combo = now - comboT < 700 ? combo + 1 : 1; comboT = now;
    const big = combo >= 5;
    if (big) combo = 0;
    // 표정 바꾸기 (잠깐 뒤 원래대로) + 뾱 애니메이션 (다시 누르면 처음부터)
    setFace(img, big ? 'party' : pick(REACT), big ? 1600 : 900);
    anim(img, big ? 'poke-big' : 'poke');
    const kind = playMascotSound(undefined, big ? 3 : 1);
    const lines = LINES[kind] ?? LINES.off;
    bubble(img, big ? (kind === 'squeak' ? '뾱뾱뾱!!' : kind === 'custom' || kind === 'meow' || kind === 'kitten' ? '냥냥냥!!' : '♡♡♡') : lines[Math.floor(Math.random() * lines.length)]);
}

let bound = false;
export function initMascot() {
    if (bound) return; bound = true;
    fetchClips(); // 냥 소리 파일 미리 받아 두기 (작아요, 4개 합쳐 17KB)
    // 이미지 미리 받아 두기 (처음 뜰 때 빈칸 방지)
    for (const n of MASCOTS) { const i = new Image(); i.src = mascotUrl(n); }
    document.addEventListener('click', (e) => {
        const img = e.target.closest?.('.ss-mascot');
        if (!img) return;
        e.preventDefault(); e.stopPropagation(); // 마스코트가 버튼 안에 있어도 버튼은 안 눌리게
        poke(img);
    }, true);
}
