// Minimal fake SillyTavern for testing Meatball Stats in a plain browser (dev only — never loaded by ST).
// Implements just the parts of SillyTavern.getContext() the extension touches.
(() => {
    const listeners = new Map();
    const eventSource = {
        on(name, fn) { if (!listeners.has(name)) listeners.set(name, []); listeners.get(name).push(fn); },
        removeListener(name, fn) { const l = listeners.get(name); if (l) listeners.set(name, l.filter(x => x !== fn)); },
        async emit(name, ...args) { for (const fn of listeners.get(name) ?? []) { try { await fn(...args); } catch (e) { console.error('[stub] listener error', name, e); window.__errors.push(String(e?.stack || e)); } } },
    };
    const names = ['APP_READY', 'CHAT_CHANGED', 'GENERATION_AFTER_COMMANDS', 'MESSAGE_RECEIVED', 'CHARACTER_MESSAGE_RENDERED', 'MESSAGE_SWIPED', 'MESSAGE_EDITED',
        'USER_MESSAGE_RENDERED', 'MORE_MESSAGES_LOADED', 'GENERATION_STOPPED', 'MESSAGE_UPDATED', 'MESSAGE_DELETED', 'GENERATION_STARTED', 'GENERATION_ENDED', 'SETTINGS_LOADED', 'EXTENSION_SETTINGS_LOADED'];
    const event_types = Object.fromEntries(names.map(n => [n, n.toLowerCase()]));
    window.__errors = [];
    window.__toasts = [];
    window.__prompts = {};
    window.__autoPopup = 'ok'; // 'ok' | 'cancel' | null (manual)
    window.__popups = [];
    window.__ai = (prompt) => '{}'; // tests replace this

    const toast = (kind) => (msg, title) => { window.__toasts.push({ kind, msg: String(msg), title }); };
    window.toastr = { info: toast('info'), success: toast('success'), error: toast('error'), warning: toast('warning'), clear() {} };

    const POPUP_TYPE = { TEXT: 1, CONFIRM: 2, INPUT: 3, DISPLAY: 4 };
    const POPUP_RESULT = { AFFIRMATIVE: 1, NEGATIVE: 0, CANCELLED: null };
    class Popup {
        constructor(content, type, inputValue = '', opts = {}) { this.content = content; this.type = type; this.inputValue = inputValue; this.opts = opts; }
        show() {
            const dlg = document.createElement('dialog');
            dlg.className = 'popup';
            const body = document.createElement('div'); body.className = 'popup-content';
            if (typeof this.content === 'string') body.innerHTML = this.content; else if (this.content) body.appendChild(this.content);
            dlg.appendChild(body);
            let input = null;
            if (this.type === POPUP_TYPE.INPUT) { input = document.createElement('textarea'); input.className = 'popup-input'; input.value = this.inputValue ?? ''; dlg.appendChild(input); }
            const ok = document.createElement('div'); ok.className = 'popup-button-ok menu_button'; ok.textContent = typeof this.opts.okButton === 'string' ? this.opts.okButton : 'OK';
            const cancel = document.createElement('div'); cancel.className = 'popup-button-cancel menu_button'; cancel.textContent = typeof this.opts.cancelButton === 'string' ? this.opts.cancelButton : 'Cancel';
            dlg.append(ok, cancel);
            document.body.appendChild(dlg);
            dlg.show();
            const rec = { type: this.type, text: dlg.textContent.slice(0, 300), dlg };
            window.__popups.push(rec);
            return new Promise((resolve) => {
                const done = (r) => { rec.result = r; dlg.close(); dlg.remove(); resolve(this.type === POPUP_TYPE.INPUT ? (r ? input.value : null) : r); };
                ok.onclick = () => done(POPUP_RESULT.AFFIRMATIVE);
                cancel.onclick = () => done(this.type === POPUP_TYPE.INPUT ? null : POPUP_RESULT.NEGATIVE);
                const auto = window.__autoPopup;
                if (auto && this.type !== POPUP_TYPE.TEXT) setTimeout(() => (auto === 'ok' ? ok : cancel).click(), 30);
            });
        }
    }
    Popup.show = {
        confirm: async (header, text) => (await new Popup(`<h3>${header}</h3>${text ?? ''}`, POPUP_TYPE.CONFIRM).show()) === POPUP_RESULT.AFFIRMATIVE,
        input: async (header, text, def) => new Popup(`<h3>${header}</h3>${text ?? ''}`, POPUP_TYPE.INPUT, def).show(),
        text: async (header, text) => new Popup(`<h3>${header}</h3>${text ?? ''}`, POPUP_TYPE.TEXT).show(),
    };

    const commands = new Map();
    class SlashCommand { static fromProps(p) { return p; } }
    const SlashCommandParser = { addCommandObject(p) { commands.set(p.name, p); for (const a of p.aliases ?? []) commands.set(a, p); }, commands };
    const SlashCommandArgument = { fromProps: (p) => p };
    const SlashCommandNamedArgument = { fromProps: (p) => p };
    const ARGUMENT_TYPE = { STRING: 'string', NUMBER: 'number', BOOLEAN: 'boolean' };
    window.__runSlash = async (name, named = {}, unnamed = '') => { const c = commands.get(name); if (!c) throw new Error(`no command ${name}`); return c.callback(named, unnamed); };

    const state = {
        chatId: 'test-chat',
        chat: [],
        chatMetadata: {},
        extensionSettings: { regex: [] },
    };
    window.__st = state;

    function applyDisplayRegex(text) {
        let t = String(text ?? '');
        for (const sc of state.extensionSettings.regex ?? []) {
            if (sc.disabled || sc.promptOnly || !(sc.placement ?? []).includes(2)) continue;
            const m = /^\/(.*)\/([a-z]*)$/s.exec(sc.findRegex); if (!m) continue;
            try { t = t.replace(new RegExp(m[1], m[2]), sc.replaceString); } catch { /* ignore */ }
        }
        return t;
    }
    function renderMes(i) {
        const chatEl = document.getElementById('chat');
        const m = state.chat[i];
        let el = chatEl.querySelector(`.mes[mesid="${i}"]`);
        if (!el) {
            el = document.createElement('div');
            el.className = 'mes';
            el.setAttribute('mesid', String(i));
            el.innerHTML = '<div class="mes_block"><div class="ch_name"><span class="name_text"></span><div class="mes_buttons"><div class="extraMesButtons"></div><div class="mes_button mes_edit fa-solid fa-pencil"></div></div></div><div class="mes_text"></div></div>';
            chatEl.appendChild(el);
        }
        el.toggleAttribute('is_user', !!m.is_user);
        el.querySelector('.name_text').textContent = m.name;
        el.querySelector('.mes_text').innerHTML = applyDisplayRegex(m.extra?.display_text ?? m.mes).replace(/\n/g, '<br>');
        return el;
    }
    window.__renderAll = () => { document.getElementById('chat').innerHTML = ''; state.chat.forEach((_, i) => renderMes(i)); };

    let t0 = Date.UTC(2026, 10, 14, 0, 0, 0);
    const mk = (name, is_user, mes) => ({ name, is_user, is_system: false, mes, send_date: String(t0 += 60000), swipe_id: 0, swipes: [mes], swipe_info: [{ extra: {} }], extra: {} });
    window.__addUser = async (text) => { state.chat.push(mk('Me', true, text)); renderMes(state.chat.length - 1); await eventSource.emit(event_types.USER_MESSAGE_RENDERED, state.chat.length - 1); };
    // Simulates a full AI turn: before-generate hook → message received → rendered → generation ended
    window.__addAI = async (text, { type = 'normal' } = {}) => {
        await eventSource.emit(event_types.GENERATION_AFTER_COMMANDS, type, {}, false);
        await eventSource.emit(event_types.GENERATION_STARTED, type, {}, false);
        state.chat.push(mk('Leon', false, text));
        const i = state.chat.length - 1;
        await eventSource.emit(event_types.MESSAGE_RECEIVED, i, type);
        renderMes(i);
        await eventSource.emit(event_types.CHARACTER_MESSAGE_RENDERED, i, type);
        await eventSource.emit(event_types.GENERATION_ENDED, i);
        return i;
    };
    window.__changeChat = async (id) => { state.chatId = id; state.chat = []; state.chatMetadata = {}; window.__renderAll(); await eventSource.emit(event_types.CHAT_CHANGED); };

    const ctx = {
        get chat() { return state.chat; },
        get chatMetadata() { return state.chatMetadata; },
        get extensionSettings() { return state.extensionSettings; },
        name1: 'Me', name2: 'Leon',
        characterId: 0,
        characters: [{ name: 'Leon', avatar: 'leon.png', description: 'A knight of the city guard.' }],
        groupId: null, groups: [],
        mainApi: 'openai',
        chatCompletionSettings: { chat_completion_source: 'openai' },
        powerUserSettings: { persona_description: '' },
        getChatCompletionModel: () => 'stub-model',
        eventSource, event_types,
        Popup, POPUP_TYPE, POPUP_RESULT,
        SlashCommandParser, SlashCommand, SlashCommandArgument, SlashCommandNamedArgument, ARGUMENT_TYPE,
        getCurrentChatId: () => state.chatId,
        saveChat: async () => {}, saveChatDebounced: () => {},
        saveMetadata: async () => {}, saveMetadataDebounced: () => {},
        saveSettingsDebounced: () => {},
        reloadCurrentChat: async () => { window.__renderAll(); await eventSource.emit(event_types.CHAT_CHANGED); },
        updateMessageBlock: (i) => { renderMes(i); },
        setExtensionPrompt: (key, value, position, depth, scan, role) => { window.__prompts[key] = { value, position, depth, scan, role }; },
        substituteParams: (t) => String(t ?? '').replace(/\{\{user\}\}/gi, 'Me').replace(/\{\{char\}\}/gi, 'Leon'),
        getTokenCountAsync: async (t) => Math.ceil(String(t ?? '').length / 4),
        generateRaw: async (opts) => window.__ai(typeof opts === 'string' ? opts : String(opts?.prompt ?? ''), String(opts?.systemPrompt ?? '')),
        ConnectionManagerRequestService: { sendRequest: async (id, prompt) => ({ content: window.__ai(JSON.stringify(prompt)) }) },
        loadWorldInfo: async () => null,
        writeExtensionField: async () => {},
        macros: { register() {}, category: { MISC: 'misc' }, valueType: { STRING: 'string' } },
        registerMacro() {},
    };
    window.SillyTavern = { getContext: () => ctx };
})();
