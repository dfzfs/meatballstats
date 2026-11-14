// 💡 기능 추천 (v2.7): 처음엔 꼭 필요한 칸만 켜 두고, 이야기에 맞는 순간에 「이런 기능도 있어요」를 한 번씩 알려 준다.
// AI 호출 없음. 한 채팅에서 기능마다 한 번만 · 몇 턴에 한 번만 · 설정에서 끌 수 있음 · 「다시 안 볼래요」는 모든 채팅에 적용.
import { app, ctx, settings, saveSettings, getMeta, saveMeta, modOn, MOD, GENRES, normalize, TITLE, LOG, ssWarn, GLOBAL_OFF } from './core.js';
import { commit, stripStatus } from './engine.js';
import { skeleton } from './skeleton.js';

// kw: 최근 대화에 이런 말이 나오면 · after: 이 턴이 지나면 말이 안 나와도
export const TIPS = [
    { mod: 'contact', kw: /문자|카톡|메시지|연락처|전화|편지|답장/, after: 30, pitch: '멀리 있는 사람과 메신저·편지를 주고받을 수 있어요. 읽씹·사진·선물도 돼요.' },
    { mod: 'shop', kw: /가게|상점|사러|살까|사야|구매|시장|편의점|쇼핑/, after: 50, pitch: '세계관에 맞는 가게에서 돈으로 물건을 사고팔 수 있어요.' },
    { mod: 'quest', kw: /의뢰|부탁|임무|퀘스트|과제|목표/, after: 60, pitch: '받은 부탁·목표를 적어 두고, 해내면 보상이 자동으로 들어와요.' },
    { mod: 'dice', kw: /싸우|싸움|전투|몰래|훔치|설득|도박|위험|판정|도망/, after: 80, pitch: '위험한 행동을 주사위로 판정해요. 결과는 AI가 그대로 이야기에 써요.' },
    { mod: 'memo', kw: /약속|단서|잊지 마|기억해|메모/, after: 40, pitch: '약속·단서를 적어 두면 AI가 계속 기억해요.' },
    { mod: 'home', kw: /우리 집|내 방|숙소|기숙사|가구|이사|인테리어/, after: 100, pitch: '내 방·본거지를 가구로 꾸밀 수 있어요.' },
    { mod: 'ach', kw: null, after: 70, pitch: '이 세계에 맞는 업적과 엔딩을 모아 보세요.' },
    { mod: 'news', kw: /뉴스|신문|방송|기사|소식지/, after: 120, pitch: '세상 소식이 신문·방송처럼 올라와요.' },
    { mod: 'gossip', kw: /소문|스캔들|가십|수군/, after: 140, pitch: '인물들에 대한 소문·스캔들을 가십지로 볼 수 있어요.' },
    { mod: 'sns', kw: /인스타|sns|피드|게시물|팔로|좋아요/i, after: 160, pitch: '인물들이 SNS에 사진·글을 올리고, 댓글도 달 수 있어요.' },
    { mod: 'music', kw: /노래|음악|bgm|플레이리스트|멜로디/i, after: 110, pitch: '장면 분위기에 맞는 실제 노래를 추천해 줘요 (▶ 누르면 검색).' },
    { mod: 'board', kw: /게시판|커뮤니티|익명|글 올/, after: 180, pitch: '길드·학교·익명 게시판에 글을 쓰고 댓글을 받아요.' },
    { mod: 'fate', kw: /저주|축복|행운|불운|운수/, after: 150, pitch: '저주·축복과 하루 이벤트 카드로 이야기에 변수가 생겨요.' },
    { mod: 'custom', kw: null, after: 200, pitch: '호감도 말고도 내가 원하는 수치(예: 인기도, 죄책감)를 직접 만들어 추적해요.' },
];
const TAB_OF = (mod) => (mod === 'home' ? 'base' : mod);

// 새 AI 답이 올 때마다 (index.js) — 보여 줄 게 있으면 알림 한 장
export function maybeTip() {
    try {
        const set = settings();
        if (set.featureTips === false || !app.current) return;
        const meta = getMeta(); if (!meta?.base || meta.paused) return;
        const turn = app.current.state.turn ?? 0;
        const T = (meta.tips ??= { seen: {}, last: 0, start: turn });
        if (turn - (T.start ?? 0) < 6) return; // 막 만든 채팅엔 바로 권하지 않기
        if (!set.mig2714) { if (Number(set.tipGap) === 20) set.tipGap = 40; set.mig2714 = true; saveSettings(); } // 예전 기본값 그대로 쓰던 분도 새 간격으로 (v2.7.14)
        const gap = Math.max(5, parseInt(set.tipGap, 10) || 40), since = turn - (T.last ?? 0);
        if (since < gap) return; // 몇 턴에 한 번만
        const never = set.tipNever ?? {};
        const text = (ctx().chat ?? []).slice(-4).map(m => stripStatus(m?.mes)).join('\n');
        const age = turn - (T.start ?? 0);
        const open = TIPS.filter(t => !modOn(t.mod, meta) && !T.seen[t.mod] && !never[t.mod] && !(GLOBAL_OFF[t.mod] && settings()[GLOBAL_OFF[t.mod]] === false)); // 모든 채팅에서 끈 칸은 권하지 않음
        // 이야기에 관련 말이 나오면 우선 · 말이 안 나와도 권하는 건 간격을 두 배로 (광고처럼 자주 뜨지 않게)
        const tip = open.find(t => t.kw && t.kw.test(text)) ?? (since >= gap * 2 ? open.find(t => age >= t.after) : null);
        if (!tip) return;
        T.seen[tip.mod] = true; T.last = turn;
        saveMeta();
        app.notify?.({ kind: 'tip', icon: '💡', title: `이런 기능도 있어요 — ${MOD[tip.mod].name}`, text: tip.pitch, tab: 'manage', mod: tip.mod });
    } catch (e) { ssWarn(LOG, 'tip', e); }
}

// 「써 볼래요」: 이 채팅에서 켜고, 비어 있으면 기본 틀로 바로 채운다 (AI 0회) → 그 탭을 연다
export async function enableTip(mod) {
    const meta = getMeta(true);
    const need = MOD[mod]?.needs;
    meta.mods[mod] = true;
    if (need) meta.mods[need] = true;
    await saveMeta();
    const s = app.current?.state;
    const genre = GENRES.find(g => g.name === s?.core?.genre)?.id ?? '';
    for (const id of [need, mod].filter(Boolean)) {
        if (s && !s.data[id]) { const d = skeleton(id, genre, { pmode: 'minimal' }); if (d) await commit(id, normalize(id, d), ''); }
    }
    app.refreshNow?.();
    toastr.success(`「${MOD[mod].name}」을(를) 켰어요. 그 탭의 ✨ AI로 수정·다시 생성으로 세계관에 맞게 채울 수 있어요.`, TITLE, { timeOut: 7000 });
    setTimeout(() => app.openSheet?.(TAB_OF(mod)), 300);
}
// 「다시 안 볼래요」: 이 기능은 모든 채팅에서 다시 권하지 않음
export function neverTip(mod) {
    const set = settings();
    set.tipNever = { ...(set.tipNever ?? {}), [mod]: true };
    saveSettings();
}
app.enableTip = enableTip;
app.neverTip = neverTip;

// ───── 💡 「이것도 아세요?」 팁 · ⚠️ 주의 (v2.7) ─────
// 그 칸에서 뭔가 하면 그 칸의 팁 하나를 가끔 · 설정을 바꾸면 그 설정의 주의를 바로 · 오래 쓰다 생기는 문제는 나중에 한 번.
// 「알아요」를 누르면 그 문구는 모든 채팅에서 다시 안 나와요. 그냥 닫으면 나중에 한 번 더 나올 수 있어요 (최대 2번).
const H = (id, text, kind = 'tip') => ({ id, text, kind });
export const TAB_HINTS = {
    home: [H('home.fav', '자주 보는 탭은 ★로 즐겨찾기 하면 맨 앞에 모여요.'), H('home.album', 'AI 답 옆 🖼 버튼으로 마음에 드는 장면을 추억 앨범에 담을 수 있어요.'), H('home.day', '날짜가 넘어가면 그날 있었던 일이 「하루 정리」 카드로 와요.')],
    stats: [H('stats.bar', '게이지를 눌러 바로 올리고 내릴 수 있어요.'), H('stats.attr', '능력치는 주사위 판정에 보정치로 더해져요.'), H('stats.cond', '상태 이상(부상·버프)은 ✕로 바로 풀 수 있어요.'), H('stats.max', '이야기에서 성장하면 AI가 게이지 최대치도 올려요 (예: 체력 max +10).')],
    wallet: [H('wallet.price', '「이 세계에서 ○○ 사려면 얼마?」를 물가 칸에 물어볼 수 있어요 (AI 1회).'), H('wallet.loan', '돈이 모자라면 「급전 구하기」 — 은행·사채·전당포. 기한을 넘기면 신용불량 저주가 걸려요.'), H('wallet.fx', '화폐 버튼에서 환율을 넣으면 현실 돈으로 얼마인지 같이 보여 줘요.'), H('wallet.job', '일거리가 있으면 「일하기」로 돈을 벌 수 있어요. 시간도 한 칸 흘러요.'), H('wallet.use', '효과가 적힌 소지품은 「사용」을 누르면 효과가 바로 적용돼요 (예: 체력 +20).'), H('wallet.regular', '월세·용돈 같은 정기 수입·지출은 달력 날짜가 지나면 저절로 들어오고 나가요.')],
    shop: [H('shop.deco', '가구·장식은 사면 본거지 창고로 가요. 거기서 방에 놓을 수 있어요.'), H('shop.curse', '저주·축복 때문에 물가가 오르내리면 가격이 저절로 바뀌어요.'), H('shop.stock', '이야기에서 새 물건이 들어오면 AI가 상점 목록에 추가해요.')],
    base: [H('home.trash', '창고 가구는 쓰레기통에 버리거나 중고장터에 팔 수 있어요. 쓰레기통에선 다시 꺼낼 수도 있어요.'), H('home.place', '창고에 있는 가구는 방 이름을 골라 바로 배치할 수 있어요.')],
    rel: [H('rel.peek', '💗? 버튼으로 속마음을 엿볼 수 있어요 (하루 3번 · AI 1회).'), H('rel.romance', '확장 설정 › 💗 로맨스 보정을 켜면 연인은 고백으로만, 호감은 천천히 올라요 (토큰 거의 0).'), H('rel.stage', '관계 단계 이름과 조건은 ✏️ 편집에서 세계관에 맞게 고칠 수 있어요.'), H('rel.jealous', '누군가와 가까워지면 호감 높은 다른 사람의 질투가 올라요. 날이 지나면 식어요.'), H('rel.anniv', '친구가 되면 「처음 만난 날」, 연인이 되면 그날과 100일이 달력에 저절로 들어가요.'), H('rel.pair', '인물끼리의 관계(라이벌·남매 등)도 적어 둘 수 있어요. 장면에 같이 있으면 AI에게 알려 줘요.')],
    map: [H('map.travel', '장소를 눌러 「이동」하면 거리만큼 시간이 흐르고 요금이 빠져요.'), H('map.who', '프로필에 사는 곳·일과를 적으면, 지금 그 장소에 누가 있는지 지도에 나와요.'), H('map.zoom', '지도는 확대·축소하고 구역별로 나눠 볼 수 있어요.'), H('map.new', '이야기에서 새 장소에 가면 AI가 지도에 저절로 추가해요.')],
    calendar: [H('cal.event', '날짜를 눌러 일정을 넣을 수 있어요 (매년 반복도).'), H('cal.bday', '프로필에 「생일」 항목을 적으면 달력에 저절로 들어가요.'), H('cal.weather', '날씨는 계절에 맞게 저절로 바뀌고, 직접 정할 수도 있어요.'), H('cal.skip', '「하루 지나기」 · 「다음 시간대」 버튼으로 시간을 직접 넘길 수 있어요.')],
    contact: [H('ct.pin', '말풍선을 📌 고정하면 그 메시지만 본편 AI에게 알려 주게 할 수 있어요 (연락처 ⋮ 메뉴).'), H('ct.attach', '사진·음성 묘사, 선물, 송금도 보낼 수 있어요.'), H('ct.unsend', '보낸 메시지를 지울 수 있어요. 상대가 이미 읽었다면 내용을 기억해요.'), H('ct.ping', '「선톡」을 누르면 상대가 먼저 연락해 와요 (AI 1회).'), H('ct.reflect', '연락처 ⋮에서 이 사람과의 대화를 본편 AI에게 「항상 · 고른 것만 · 숨기기」로 정할 수 있어요.'), H('ct.read', '상대가 읽고 답을 안 할 수도 있어요 (읽씹). 호감이 낮으면 더 그래요.')],
    quest: [H('q.pay', '퀘스트를 완료하면 보상 돈·아이템이 저절로 들어와요.'), H('q.judge', '진행 중 퀘스트 카드에서 완료 판정에 쓸 능력치 · 목표를 고를 수 있어요. 대성공이면 보상 1.5배!'), H('q.find', '「의뢰 찾기」로 이 세계에 맞는 의뢰를 받아 볼 수 있어요 (AI 1회).'), H('q.step', '진행 단계를 체크해 두면 AI가 다음 할 일을 알고 이야기에 써요.')],
    dice: [H('dice.send', '굴린 결과를 「보내기」로 메시지에 넣으면, AI가 그 결과대로 이야기를 써요.'), H('dice.free', '2d6+1 같은 자유 주사위도 굴릴 수 있어요.'), H('dice.diff', '난이도 이지는 −2, 하드는 +2로 판정 목표가 바뀌어요.'), H('dice.ask', 'AI가 위험한 순간엔 「판정 요청」을 보내요. 답 밑의 🎲 버튼을 누르면 바로 굴려요.')],
    memo: [H('memo.pin', '📌 고정한 메모는 매 턴 AI에게 가요 (최대 8개). AI에게 안 보낼 메모는 끄기.'), H('memo.ai', 'AI도 중요한 약속·단서를 메모에 적어 둬요.')],
    news: [H('feed.kw', '소식이 많으면 확장 설정 › 칸별 보내는 때를 「관련 말이 나올 때만」으로 두면 토큰이 줄어요.'), H('feed.arc', '오래된 소식은 저절로 보관함으로 옮겨져서 쌓여도 무겁지 않아요.')],
    gossip: [H('feed.kw', '소식이 많으면 확장 설정 › 칸별 보내는 때를 「관련 말이 나올 때만」으로 두면 토큰이 줄어요.'), H('gossip.heat', '🔥 화제성이 높은 소문일수록 사람들 입에 자주 오르내려요.')],
    board: [H('feed.kw', '소식이 많으면 확장 설정 › 칸별 보내는 때를 「관련 말이 나올 때만」으로 두면 토큰이 줄어요.'), H('board.reply', '글에서 「댓글 달리기」를 누르면 다른 사람들이 댓글을 달아요 (AI 1회).')],
    sns: [H('feed.kw', '소식이 많으면 확장 설정 › 칸별 보내는 때를 「관련 말이 나올 때만」으로 두면 토큰이 줄어요.'), H('sns.mine', '내 게시물도 올릴 수 있어요. 「반응 받기」를 누르면 좋아요·댓글이 달려요 (AI 1회).')],
    fate: [H('fate.rule', '자동 규칙: 「돈 <= 0 이면 cond: +파산」처럼 조건이 되면 저절로 실행돼요.'), H('fate.game', '미니게임(홀짝·복권 등)으로 돈을 걸 수 있어요. 토큰 0.'), H('fate.daily', '저주 효과에 「매일 체력 -5」처럼 쓰면 날짜가 지날 때마다 적용돼요.'), H('fate.draw', '이벤트 카드는 날마다 확률로 뽑히고, 직접 뽑을 수도 있어요.')],
    ach: [H('ach.end', '엔딩 조건을 채우면 「엔딩 쓰기」 버튼이 떠요.'), H('ach.hidden', '숨은 업적은 달성하기 전까지 이름이 가려져 있어요.')],
    profile: [H('pf.mode', '프로필 「상세」는 외모·말투까지 AI에게 보내서 토큰이 늘어요. 카드에 이미 있으면 「최소」로 충분해요.'), H('pf.npc', '이야기에 새 인물이 나오면 AI가 프로필에 저절로 추가해요.')],
    music: [H('music.app', '▶를 누르면 유튜브·멜론 등에서 검색해요. 어디서 열지는 확장 설정에서 골라요.'), H('music.taste', '좋아하는 장르를 적어 두면 추천이 그쪽으로 기울어요.')],
    custom: [H('custom.ai', '내 탭 수치는 AI도 이야기에 맞춰 바꿔요.'), H('custom.type', '칸은 숫자 · 게이지 · 글 세 종류예요. AI에게 안 보낼 탭은 끌 수 있어요.')],
    manage: [H('m.save', '세이브 슬롯(5개)에 지금 상태를 저장해 두면 언제든 그때로 돌아갈 수 있어요 (토큰 0).'), H('m.card', '「카드에 붙이기」를 하면 그 카드로 새 채팅을 열 때 상태창이 바로 불러와져요. 시뮬봇 배포용!'), H('m.carry', '엔딩 뒤엔 2회차로 관계·돈 일부를 이어받아 새로 시작할 수 있어요.'), H('m.fill', '켜 두고 아직 비어 있는 칸은 「비어 있는 칸 채우기」로 한 번에 채울 수 있어요 (칸마다 AI 1회).')],
};
// 어느 칸이든 가끔 (그 칸 팁을 다 봤을 때)
const GENERAL = [
    H('g.pause', 'OOC로 말할 땐 ⏸ 일시정지나 「다음 1번 건너뛰기」를 쓰면 상태창이 안 섞여요. 「((」로 시작하는 메시지는 저절로 빠져요.'),
    H('g.undo', '상태창에서 잘못 누른 건 관리 탭 「되돌리기」나 /ss-undo로 되돌려요.'),
    H('g.chip', 'AI 답 밑의 변동 칩 ✏️를 누르면 그 답에서 바뀐 걸 직접 고칠 수 있어요.'),
    H('g.macro', '카드·로어북·퀵리플라이에 {{ss::cash}} · {{ss::aff:이름}}처럼 쓰면 상태값이 들어가요.'),
    H('g.prompt', '📜 프롬프트 · 토큰 창에서 AI에게 실제로 보내는 글과 토큰 수를 볼 수 있어요.'),
    H('g.help', '모르는 건 ❓ 미트볼 도우미에게 물어보세요. 문제가 있으면 「보고문 써 줘」.'),
    H('g.theme', '꾸미기에서 테마·글자 크기·모서리를 바꿀 수 있어요. 폰이면 「한 손 모드」로 탭 바를 아래로.'),
    H('g.backup', '관리 탭 「전체 백업」은 이 채팅의 상태창을 파일 하나로 저장해요 (토큰 0).'),
    H('g.model', '확장 설정에서 연락·소식·만들기에 쓸 모델을 따로 고르면, 싼 모델로 토큰을 아낄 수 있어요.'),
];
// 설정을 바꾼 바로 그때 (값이 이 조건일 때만)
const SET_HINTS = {
    sync: (v) => (v === 'analyze' ? H('w.analyze', '「별도 분석」은 매 답마다 AI를 한 번 더 불러서 토큰이 꽤 늘어요. 보통은 A+B면 충분해요.', 'warn') : v === 'off' ? H('w.syncoff', '이제 이야기가 상태창을 바꾸지 않아요. 직접 편집·버튼으로만 바뀌어요.', 'warn') : null),
    injectMode: (v) => (v === 'full' ? H('w.full', '「전체」는 매 턴 1천 토큰 이상 들어요. 가벼운 모델이면 「간결」을 추천해요.', 'warn') : null),
    autoPing: (v) => (v ? H('w.ping', '자동 선톡은 한 번 올 때마다 AI를 1회 불러요.', 'warn') : null),
    trAuto: (v) => (v === 'always' ? H('w.trauto', '번역 모델이면 새 영어 글이 생길 때마다 AI를 1회 불러요. 무료로 하려면 번역 담당을 「실리 기본 번역」으로.', 'warn') : null),
    legacyStatus: (v) => (v ? H('w.legacy', '이걸 켜면 모든 채팅에서 다른 봇·프리셋의 <status>까지 숨기고 지워요.', 'warn') : null),
    injScan: (v) => (!v ? H('w.scan', '장소·인물 이름으로 켜지던 로어북 항목이 이제 덜 켜져요. 장소 로어북을 쓰고 있었다면 다시 켜 주세요.', 'warn') : null),
    autoBake: (v) => (!v ? H('w.bake', '자동 정리를 끄면 아주 긴 채팅에서 점점 느려질 수 있어요.', 'warn') : null),
    stashTags: (v) => (!v ? H('w.stash', '끄면 번역·요약 같은 다른 확장에 변화 줄(<meatball>)이 그대로 보여요.', 'warn') : null),
    autoRegex: (v) => (!v ? H('w.regex', '숨김 정규식이 없으면 <meatball> 태그가 본문에 그대로 보일 수 있어요.', 'warn') : null),
    stageLock: (v) => (v ? H('w.stagelock', '「하지 마」 식이라 캐릭터가 차갑게 굴 수 있어요. 💗 로맨스 보정 ④ 「관계를 사실로」가 더 자연스러워요.', 'warn') : null),
    deltaMode: (v) => (!v ? H('w.delta', '끄면 매 턴 전체 상태를 보내서 토큰이 늘어요.', 'warn') : null),
    sceneFilter: (v) => (!v ? H('w.scene', '끄면 장면에 없는 사람까지 자세히 보내서 토큰이 늘어요.', 'warn') : null),
    genParallel: (v) => (Number(v) > 4 ? H('w.par', '동시에 많이 보내면 API가 「요청이 너무 많다(429)」로 거절할 수 있어요.', 'warn') : null),
};
const session = { n: 0, at: 0 }; // 이번 접속에서 보여 준 수 · 마지막 시각 (너무 자주 안 뜨게)
// v2.7.1: 너무 자주 뜬다는 의견 → 접속당 2번 · 30분 · 하루 4번 · 25%
// v2.7.12: 그래도 자주 뜬다는 의견 → 접속당 1번 · 마지막 팁에서 3시간 · 하루 2번 · 15% · 같은 팁은 한 번만 · 알림에 「팁 그만」
const HINT_GAP = 3 * 60 * 60 * 1000, HINT_PER_SESSION = 1, HINT_PER_DAY = 2, HINT_CHANCE = 0.15;
const today = () => new Date().toDateString();
let pendingHint = false;
// 팁은 그냥 닫으면 한 번 더 (최대 2번) · 주의는 한 번이면 끝 (「추후 한 번」)
function seen(id, kind = 'tip') { const v = settings().hintSeen?.[id]; return v === true || v >= 1; }
function bump(id) { const s = settings(); s.hintSeen = { ...(s.hintSeen ?? {}) }; if (s.hintSeen[id] !== true) s.hintSeen[id] = (s.hintSeen[id] ?? 0) + 1; saveSettings(); }
export function knowHint(id) { const s = settings(); s.hintSeen = { ...(s.hintSeen ?? {}), [id]: true }; saveSettings(); }
// 팁도 알림함에 남긴다 — 팝업을 놓쳐도 🔔 알림함에서 다시 읽을 수 있게
function show(h, { save = true } = {}) {
    bump(h.id);
    if (h.kind !== 'warn') { // 주의는 팁 횟수 제한과 따로
        session.n++; session.at = Date.now();
        const s = settings(); s.hintAt = session.at; s.hintDay = s.hintDay?.d === today() ? { d: s.hintDay.d, n: s.hintDay.n + 1 } : { d: today(), n: 1 }; saveSettings();
    }
    app.notify?.({ kind: 'hint', icon: h.kind === 'warn' ? '⚠️' : '💡', title: h.kind === 'warn' ? '알아 두세요' : '이것도 아세요?', text: h.text, hint: h.id }, { save });
}
// 상태창에서 뭔가 했을 때 (shell.js) — 그 칸의 안 본 팁 중 하나를, 가끔만
export function hintAfterAction(tab) {
    try {
        if (settings().featureTips === false || settings().actionTips === false || !getMeta()?.base) return;
        const set = settings(), last = Math.max(session.at, Number(set.hintAt) || 0);
        if (session.n >= HINT_PER_SESSION || Date.now() - last < HINT_GAP) return;
        if (set.hintDay?.d === today() && set.hintDay.n >= HINT_PER_DAY) return;
        const offHint = { 'home.album': 'albumOn', 'rel.peek': 'peekOn' }; // 꺼 둔 기능의 팁은 안 보여요 (v2.7.3)
        let list = (TAB_HINTS[tab] ?? []).filter(h => !seen(h.id, h.kind) && !(offHint[h.id] && set[offHint[h.id]] === false));
        if (!list.length) list = GENERAL.filter(h => !seen(h.id, h.kind)); // 그 칸 팁을 다 봤으면 공통 팁
        if (!list.length || Math.random() > HINT_CHANCE) return; // 매번 말고 가끔
        const h = list[Math.floor(Math.random() * list.length)];
        if (pendingHint) return; // 1.5초 기다리는 사이 또 불려도 한 번만 (두 번씩 뜨던 것)
        pendingHint = true; session.at = Date.now(); // 시간 제한도 지금 바로 잡아 둔다
        setTimeout(() => { pendingHint = false; show(h); }, 1500); // 방금 한 일의 알림이 먼저 보이게
    } catch (e) { ssWarn(LOG, 'hint', e); }
}
// 확장 설정을 바꾼 바로 그때 — 주의할 게 있으면 한 번 (이건 3분 제한 없이)
export function hintSetting(key, value) {
    try {
        if (settings().featureTips === false) return;
        const h = SET_HINTS[key]?.(value);
        if (h && !seen(h.id, h.kind)) show(h, { save: true });
    } catch (e) { ssWarn(LOG, 'hint', e); }
}
// 오래 쓰다 보면 생기는 문제 — 새 답이 올 때 확인해서, 해당하면 나중에 한 번 (maybeTip 옆에서)
export function maybeLaterWarn() {
    try {
        const set = settings();
        if (set.featureTips === false || !app.current) return;
        const meta = getMeta(); if (!meta?.base || meta.paused) return;
        const T = (meta.tips ??= { seen: {}, last: 0, start: app.current.state.turn ?? 0 });
        const turn = app.current.state.turn ?? 0, age = turn - (T.start ?? 0);
        if (age < 15 || turn - (T.warnAt ?? 0) < 30 || turn - (T.last ?? 0) < 3) return; // 바로 말고 · 30턴에 한 번 · 추천 알림 직후엔 쉬기
        const chat = ctx().chat ?? [];
        const ais = chat.filter(m => m && !m.is_user && !m.is_system).slice(-10);
        const blank = ais.filter(m => !(m.extra?.statussim?.bySwipe?.[m.swipe_id ?? 0]?.length) && !/<meatball>/i.test(m.mes ?? '')).length;
        const checks = [
            [set.sync === 'tag' && ais.length >= 10 && blank >= 5, H('l.missing', 'AI가 답 끝의 변화 기록을 자주 빼먹고 있어요. 확장 설정 › 자동 반영을 「A+B」로 바꾸면 빠진 답만 따로 분석해요.', 'warn')],
            [set.injectMode === 'full', H('l.full', '아직 「전체」 주입이에요. 매 턴 토큰이 많이 들어요 — 확장 설정 › 모델 맞춤에서 「기본 (추천)」 한 번이면 돼요.', 'warn')],
            [set.legacyStatus !== false, H('l.legacy', '옛 <status> 읽기가 켜져 있어요. 다른 봇·프리셋이 <status>를 쓰면 그것까지 숨겨요 (확장 설정 › 다른 확장과 같이 쓰기).', 'warn')],
            [turn >= 150 && !meta.lastBackup, H('l.backup', '오래 진행한 채팅이에요. 관리 탭 › 「전체 백업」을 한 번 해 두면 안심이에요 (토큰 0).', 'warn')],
            [Object.values(meta.mods ?? {}).filter(Boolean).length >= 15, H('l.mods', '켜진 기능이 많아요. 안 쓰는 칸은 관리 탭에서 꺼 두면 매 턴 토큰이 줄어요.', 'warn')],
            [(app.current.state.data.profile?.mode === 'detailed') && (app.current.state.data.profile?.list?.length ?? 0) > 8, H('l.profile', '상세 프로필 인물이 많아서 토큰이 꽤 들어요. 카드·로어북에 설정이 있으면 「최소」로 바꿔도 돼요.', 'warn')],
        ];
        const hit = checks.find(([c, h]) => c && !seen(h.id, h.kind));
        if (!hit) return;
        T.warnAt = turn; saveMeta();
        show(hit[1], { save: true });
    } catch (e) { ssWarn(LOG, 'warn', e); }
}
app.knowHint = knowHint;
// 알림의 「팁 그만」: 칸에서 뭔가 할 때 뜨는 💡 팁만 끈다 (⚠️ 주의 · 기능 추천은 그대로 — 확장 설정에서 다시 켤 수 있음)
app.stopActionTips = () => { settings().actionTips = false; saveSettings(); toastr.info('이제 「이것도 아세요?」 팁은 안 떠요. 확장 설정 › 💡 팁에서 다시 켤 수 있어요.', TITLE); };
