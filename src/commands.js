// 슬래시 커맨드 — index.js에서 떼어 냄
import { app, ctx, getMeta, saveMeta, ready, MODS, MOD_IDS, MOD, esc, short, TITLE, sub } from './core.js';
import { buildInjection, addAdjust, KEYMAP, ssValue } from './engine.js';
import { instructModule } from './ai.js';
import { diffHTML, confirmPopup } from './kit.js';
import { openSheet, openWizard, openRoll, openPromptWindow } from './shell.js';
import { openHelp } from './help.js';
import { saveSlot, fullBackup, diagnose } from './safe.js';
import { openReport } from './report.js';
import { openPip, pipFix, pipDiag } from './pip.js';

// ───── 슬래시 커맨드 ─────
export function registerCommands() {
    const { SlashCommandParser, SlashCommand, SlashCommandArgument, SlashCommandNamedArgument, ARGUMENT_TYPE } = ctx();
    if (!SlashCommandParser?.addCommandObject) return;
    const tabs = ['home', ...MOD_IDS, 'manage'];
    const add = (p) => SlashCommandParser.addCommandObject(SlashCommand.fromProps(p));
    add({
        name: 'ss',
        callback: (_n, tab) => {
            const t = String(tab ?? '').trim();
            let id = ['home', '홈'].includes(t) ? 'home' : ['manage', '관리'].includes(t) ? 'manage' : ['base', '본거지'].includes(t) ? 'base' : MOD_IDS.includes(t) ? t : MODS.find(m => m.name === t)?.id;
            if (id === 'home' && !['home', '홈'].includes(t)) id = 'base';
            openSheet(id); return '';
        },
        unnamedArgumentList: [SlashCommandArgument.fromProps({ description: '탭 (지도, 상점, 연락, 퀘스트 …)', typeList: ARGUMENT_TYPE.STRING, isRequired: false })],
        helpString: '상태창을 연다. 예: /ss 지도',
    });
    add({ name: 'ss-make', callback: () => { openWizard(); return ''; }, helpString: '상태창 만들기 창을 연다.' });
    add({ name: 'ss-perf', callback: () => { app.measureLoad(); return ''; }, helpString: '미트볼이 한 턴에 쓰는 시간을 재서 보여 준다 (AI 0회).' });
    // 🔍 칩 점검 (v2.7.3): /ss-pip · /ss-pip 12 · /ss-pip 12 fix (redraw · reread · analyze · edit · outside)
    add({
        name: 'ss-pip', aliases: ['ss-chip'],
        callback: async (_n, arg) => {
            const [a, b] = String(arg ?? '').trim().split(/\s+/);
            const n = Number.isFinite(Number(a)) && a !== '' ? Number(a) : (app.current?.lastAI ?? (ctx().chat?.length ?? 1) - 1);
            const act = Number.isFinite(Number(a)) ? b : a;
            if (act) { const d = await pipFix(n, act === 'fix' ? 'auto' : act); return d?.title ?? ''; }
            openPip(n);
            return pipDiag(n).title;
        },
        unnamedArgumentList: [SlashCommandArgument.fromProps({ description: '답 번호 (비우면 마지막 AI 답) · 뒤에 fix / redraw / reread / analyze / edit / outside', typeList: ARGUMENT_TYPE.STRING, isRequired: false })],
        helpString: '변동 칩이 안 보일 때 — 변화를 못 읽었는지(씹힘) · 화면에 안 보이는지 확인하고 다시 부른다. 예: /ss-pip · /ss-pip 12 fix',
    });
    add({ name: 'ss-prompts', callback: () => { openPromptWindow(); return ''; }, helpString: '프롬프트 · 토큰 창을 연다.' });
    add({ name: 'ss-pause', callback: async () => { const m = getMeta(true); m.paused = true; await saveMeta(); app.refreshNow(); return ''; }, helpString: '상태창 일시정지 (AI에게 상태를 보내지 않음).' });
    add({ name: 'ss-resume', callback: async () => { const m = getMeta(true); m.paused = false; await saveMeta(); app.refreshNow(); return ''; }, helpString: '상태창 다시 켜기.' });
    add({ name: 'ss-skip', callback: async () => { const m = getMeta(true); m.skipOnce = true; await saveMeta(); return ''; }, helpString: '다음 생성 1번만 상태창 없이 보낸다 (퀵리플라이 앞에).' });
    add({
        name: 'ss-roll',
        callback: (_n, label) => { openRoll(String(label ?? '').trim(), 0); return ''; },
        unnamedArgumentList: [SlashCommandArgument.fromProps({ description: '판정 이름', typeList: ARGUMENT_TYPE.STRING, isRequired: false })],
        helpString: '주사위 판정 창을 연다. 예: /ss-roll 은신',
    });
    add({
        name: 'ss-set',
        callback: async (named, text) => {
            if (!ready()) return '';
            const key = String(named.key ?? '').trim();
            if (!KEYMAP[key.toLowerCase()]) { toastr.warning('key가 올바르지 않아요. 예: /ss-set key=cash +500', TITLE); return ''; }
            await addAdjust({ ops: [[key, String(text ?? '')]], label: `${key} ${text}` });
            return '';
        },
        namedArgumentList: [SlashCommandNamedArgument.fromProps({ name: 'key', description: 'stat, cash, item, loc, aff, date, quest, news, msg …', typeList: ARGUMENT_TYPE.STRING, isRequired: true })],
        unnamedArgumentList: [SlashCommandArgument.fromProps({ description: '값 (<meatball> 한 줄과 같은 형식)', typeList: ARGUMENT_TYPE.STRING, isRequired: true })],
        helpString: '상태를 직접 바꾼다. 예: /ss-set key=stat 체력 -10',
    });
    add({
        name: 'ss-instruct',
        callback: async (named, text) => {
            if (!ready()) return '';
            const t = String(named.tab ?? '').trim();
            const id = t === 'world' || t === '세계' ? 'core' : MOD_IDS.includes(t) ? t : MODS.find(m => m.name === t)?.id;
            if (!id) { toastr.warning('tab이 올바르지 않아요. 예: /ss-instruct tab=지도 북쪽에 설산 추가', TITLE); return ''; }
            try {
                const after = await instructModule(id, String(text ?? ''), app.current.state);
                const box = document.createElement('div'); box.className = 'ss-root ss-scope ss-preview';
                box.innerHTML = `<h3>바뀌는 내용 — ${esc(id === 'core' ? '세계' : MOD[id].name)}</h3>${diffHTML(id === 'core' ? app.current.state.core : app.current.state.data[id], after)}`;
                if (await confirmPopup(box)) await addAdjust({ set: { mod: id, data: after }, label: `💬 ${id === 'core' ? '세계' : MOD[id].name} 수정: ${short(text, 40)}`, keep: true });
            } catch (e) { toastr.error(esc(e.message), TITLE); }
            return '';
        },
        namedArgumentList: [SlashCommandNamedArgument.fromProps({ name: 'tab', description: '칸 (세계, 지도, 상점 …)', typeList: ARGUMENT_TYPE.STRING, isRequired: true })],
        unnamedArgumentList: [SlashCommandArgument.fromProps({ description: '추가 지시', typeList: ARGUMENT_TYPE.STRING, isRequired: true })],
        helpString: '한 칸에 추가 지시. 예: /ss-instruct tab=상점 암시장 추가',
    });
    add({
        name: 'ss-get',
        callback: (named) => {
            if (!app.current) return '';
            const k = String(named?.key ?? '').trim();
            if (k) return ssValue(app.current.state, k);
            const inj = buildInjection(app.current);
            return sub([inj.main, inj.people, inj.romance].filter(Boolean).join('\n'));
        },
        namedArgumentList: [SlashCommandNamedArgument.fromProps({ name: 'key', description: 'cash, loc, date, time, weather, season, curse, quest, here_now, aff:이름, trust:이름, stat:체력, item:이름, 게이지 이름…', typeList: ARGUMENT_TYPE.STRING, isRequired: false })],
        helpString: '상태를 텍스트로 돌려준다. key를 주면 그 값 하나만. 예: /ss-get key=cash · /ss-get key=aff:레온',
    });
    add({ name: 'ss-undo', callback: async () => { await app.undoLast?.(); return ''; }, helpString: '상태창에서 한 마지막 편집을 되돌린다.' });
    add({ name: 'ss-save', callback: async () => { if (ready()) await saveSlot(); return ''; }, helpString: '지금 상태를 세이브 슬롯에 저장한다.' });
    add({ name: 'ss-backup', callback: () => { fullBackup(); return ''; }, helpString: '이 채팅의 상태창 전체를 파일로 백업한다.' });
    add({ name: 'ss-copy', callback: async () => { await app.copyDump?.(); return ''; }, helpString: '지금 상태(최근 메시지 원문 · 상태 · 편집 기록 · 주입문)를 클립보드로 복사한다.' });
    add({ name: 'ss-inbox', callback: () => { app.openInbox?.(); return ''; }, helpString: '알림함을 연다.' });
    add({ name: 'ss-search', callback: () => { app.openSearch?.(); return ''; }, helpString: '상태창 검색 창을 연다.' });
    add({
        name: 'ss-help',
        callback: (_n, text) => { openHelp(String(text ?? '').trim()); return ''; },
        unnamedArgumentList: [SlashCommandArgument.fromProps({ description: '물어볼 것 (비우면 창만 열어요)', typeList: ARGUMENT_TYPE.STRING, isRequired: false })],
        helpString: '미트볼 도우미에게 기능을 물어본다. 예: /ss-help 연인 확정은 어디서 해요?',
    });
    add({ name: 'ss-report', callback: () => { openReport(); return ''; }, helpString: '🐞 오류 보고문을 만든다 (AI 0회 · 이름은 가리고 채팅 내용은 넣지 않음 · 공개 게시판에 올려도 되는 수준).' });
    add({ name: 'ss-diag', callback: async () => { await diagnose(); return ''; }, helpString: '자가 진단 — 망가진 기록을 찾아 고친다.' });
}
