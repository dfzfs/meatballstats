// 🌐 기본 틀 영어판 (v2.7.1): 「영어로 저장 · 화면만 번역」일 때 기본 틀(수치·주사위·달력·업적·운명 카드 …)도 영어로 저장한다 — AI 0회 · 토큰 0
// 같은 짝을 화면 번역 사전에도 넣어서, 저장은 영어 · 보이는 건 한국어가 된다.
export const SK_EN = {
    // 세계 · 장르
    '나의 이야기': 'My Story', '이 이야기의 주인공': 'the protagonist of this story', '주인공': 'protagonist',
    '현대': 'Modern', '판타지': 'Fantasy', '마법학원': 'Magic Academy', '동양·무협': 'Eastern / Wuxia', '중세': 'Medieval', '근대': 'Early Modern', 'SF': 'Sci-Fi', '아포칼립스': 'Post-Apocalypse', '2차 창작': 'Fan Fiction',
    '현대 한국/도시. 스마트폰 메신저, 원화.': 'A modern city. Smartphone messengers, everyday money.',
    '현대 도시. 스마트폰 메신저, 원화.': 'A modern city. Smartphone messengers, everyday money.',
    '검과 마법의 판타지 왕국. 길드, 몬스터, 금화.': 'A fantasy kingdom of swords and magic. Guilds, monsters, gold coins.',
    '마법 학교/아카데미. 기숙사, 수업, 시험, 교수.': 'A magic school / academy. Dorms, classes, exams, professors.',
    '동양풍(무협/선협/궁중). 문파, 객잔, 은자·전.': 'An East Asian setting (wuxia / xianxia / court). Sects, inns, silver taels and coins.',
    '마법이 거의 없는 중세 유럽풍. 영주, 교회, 장원.': 'Medieval Europe with little magic. Lords, the church, manors.',
    '19세기~20세기 초. 증기, 신문, 전보·편지, 사교계.': '19th to early 20th century. Steam, newspapers, telegrams and letters, high society.',
    '우주/사이버펑크. 통신기, 크레딧.': 'Space / cyberpunk. Comm devices, credits.',
    '멸망 이후 생존. 물자가 귀함, 무전기.': 'Survival after the collapse. Supplies are scarce, radios.',
    '원작 세계관을 그대로 따름.': 'Follows the original work’s world as is.',
    // 수치
    '체력': 'HP', '마나': 'Mana', '피로': 'Fatigue', '기력': 'Stamina', '정신력': 'Sanity', '허기': 'Hunger', '스트레스': 'Stress', '배터리': 'Battery', '에너지': 'Energy', '내공': 'Inner Energy',
    '힘': 'STR', '민첩': 'DEX', '지능': 'INT', '매력': 'CHA', '감각': 'PER', '근력': 'Might', '지성': 'Intellect', '지혜': 'Wisdom', '오성': 'Insight', '신법': 'Agility',
    '0이 되면 쓰러진다': 'Collapse at 0', '100이 되면 굶주려 체력이 깎인다': 'At 100 you starve and lose HP', '바닥나면 버티기 힘들어진다': 'Hard to keep going when it runs out',
    '쌓이면 실수가 늘고 무너질 수 있다': 'Builds up: more mistakes, may break down', '힘을 쓰는 행동·기술에 든다': 'Spent on powers and techniques',
    '판정 보정치 (-2~+5) · 큰 성장 때만 오른다': 'Roll modifier (-2 to +5) · rises only with real growth',
    // 주사위
    '1d20 + 능력치 ≥ 난이도면 성공. 자연 20은 대성공(기대 이상), 자연 1은 대실패(일이 꼬임). 쉬움 8 · 보통 12 · 어려움 15 · 매우 어려움 18 · 극한 22.': '1d20 + attribute ≥ DC succeeds. Natural 20 = critical success (better than expected), natural 1 = critical failure (things go wrong). Easy 8 · Normal 12 · Hard 15 · Very hard 18 · Extreme 22.',
    '설득': 'Persuade', '관찰': 'Notice', '은신': 'Stealth', '완력': 'Force', '지식': 'Knowledge',
    // 달력
    '새벽': 'Dawn', '아침': 'Morning', '낮': 'Day', '저녁': 'Evening', '밤': 'Night', '심야': 'Late Night',
    '월': 'Mon', '화': 'Tue', '수': 'Wed', '목': 'Thu', '금': 'Fri', '토': 'Sat', '일': 'Sun',
    '1월': 'Jan', '2월': 'Feb', '3월': 'Mar', '4월': 'Apr', '5월': 'May', '6월': 'Jun', '7월': 'Jul', '8월': 'Aug', '9월': 'Sep', '10월': 'Oct', '11월': 'Nov', '12월': 'Dec',
    // 업적
    '첫 친구': 'First Friend', '누군가와 「친구」 단계가 되다': 'Reach the 「Friends」 stage with someone',
    '마음을 연 사람': 'Opened Up', '누군가와 「단짝」이 되다 (우정 50)': 'Become 「Best Friends」 with someone (Friendship 50)',
    '사랑의 시작': 'Love Begins', '연인이 생기다': 'Get a lover',
    '탐험가': 'Explorer', '장소 10곳을 발견하다': 'Discover 10 places',
    '단골': 'Regular', '같은 가게를 다섯 번 이용하다': 'Use the same shop five times',
    '해결사': 'Fixer', '의뢰·목표 5개를 해내다': 'Complete 5 requests or goals',
    '구사일생': 'Narrow Escape', '대실패한 판정에서 살아남다': 'Survive a critical failure',
    '부자의 꿈': 'Dream of Riches', '처음 가진 돈의 10배를 모으다': 'Save 10× your starting money',
    '위기 탈출': 'Back on Your Feet', '체력이 바닥난 뒤 다시 일어서다': 'Get back up after HP hits bottom',
    '비밀을 아는 자': 'Keeper of Secrets', '누군가의 숨겨진 비밀을 알게 되다': 'Learn someone’s hidden secret',
    // 운명 카드
    '주운 지갑': 'Found Wallet', '길에서 누군가 떨어뜨린 돈을 주웠다. 돌려줄지는 마음대로.': 'You found money someone dropped on the street. Whether to return it is up to you.',
    '푹 잔 밤': 'A Good Night’s Sleep', '오랜만에 깊이 잤다. 몸이 가볍다.': 'You slept deeply for once. Your body feels light.',
    '뜻밖의 친절': 'Unexpected Kindness', '모르는 사람이 작은 도움을 주었다.': 'A stranger gave you a little help.',
    '소매치기': 'Pickpocket', '정신을 차려 보니 주머니가 가벼워졌다.': 'You come to your senses and your pocket feels lighter.',
    '삐끗한 발목': 'Twisted Ankle', '발을 헛디뎌 다쳤다.': 'You misstepped and got hurt.',
    '궂은 날씨': 'Foul Weather', '갑자기 날씨가 험해져 계획이 틀어졌다.': 'The weather suddenly turned rough and plans fell apart.', 'weather: 폭우': 'weather: heavy rain', '폭우': 'heavy rain',
    '낯선 소문': 'Strange Rumor', '근처에서 이상한 소문이 돌기 시작했다.': 'A strange rumor has started going around nearby.',
    '오랜만의 연락': 'Long-Lost Contact', '한동안 연락 없던 누군가에게서 소식이 왔다.': 'Word came from someone you had not heard from in a while.',
    // 관계
    '애정': 'Romance', '우정': 'Friendship',
    '낯선 사이': 'Strangers', '아는 사이': 'Acquaintances', '친구': 'Friends', '단짝': 'Best Friends', '설렘': 'Butterflies', '연인': 'Lovers',
    '이름 부르기': 'call each other by name', '말 편하게 하기 · 사적인 연락': 'casual speech · personal messages', '고민 털어놓기 · 단둘이 약속 · 비밀 나누기': 'share worries · plans just for two · share secrets',
    '서로 의식하기 · 애칭 · 질투 · 스킨십 조금': 'aware of each other · pet names · jealousy · a little touch', '고백 이후 · 연인다운 행동': 'after a confession · acting like lovers',
    // 연락
    '메신저': 'Messenger', '통신구': 'Comm Orb', '편지': 'Letter',
    '배달부': 'Courier', '갈매기': 'Seagull', '강아지': 'Puppy', '올빼미': 'Owl', '전서구': 'Carrier Pigeon', '파발마': 'Relay Rider', '마법 편지': 'Magic Letter',
    '마을 우편 배달부': 'the village postman', '바닷가라면 갈매기 우편': 'seagull post by the sea', '목에 편지통을 단 강아지': 'a puppy with a letter tube on its collar', '밤에 날아가는 올빼미': 'an owl that flies by night', '비둘기 다리에 묶어': 'tied to a pigeon’s leg', '말 탄 파발꾼': 'a mounted relay rider', '종이학이 되어 날아감': 'flies off as a paper crane',
    // 상점 · 본거지 · 지도 · 소식 (장르별)
    '동네에 하나쯤 있는 가게': 'the kind of shop every neighborhood has',
    '편의점': 'Convenience Store', '잡화점': 'General Store', '교내 매점': 'School Store', '약재상': 'Herbalist', '교역소': 'Trading Post', '정거장 상점': 'Station Shop', '물자 창고': 'Supply Depot',
    '삼각김밥': 'Rice Ball', '샌드위치': 'Sandwich', '커피': 'Coffee', '우산': 'Umbrella', '보조배터리': 'Power Bank', '진통제': 'Painkillers',
    '빵': 'Bread', '횃불': 'Torch', '회복 물약': 'Healing Potion', '밧줄': 'Rope', '여행용 망토': 'Traveling Cloak', '단검': 'Dagger', '양초': 'Candle', '붕대': 'Bandage',
    '마나 사탕': 'Mana Candy', '기초 마도서': 'Basic Spellbook', '교과서': 'Textbook', '잉크와 깃펜': 'Ink and Quill', '교복 리본': 'Uniform Ribbon', '기숙사 간식': 'Dorm Snack',
    '만두': 'Dumplings', '금창약': 'Wound Salve', '약초 꾸러미': 'Bundle of Herbs', '해독단': 'Antidote Pill', '차 한 근': 'A Catty of Tea',
    '양모 망토': 'Wool Cloak', '장갑': 'Gloves', '향수': 'Perfume', '회중시계': 'Pocket Watch', '홍차 한 통': 'Tin of Black Tea', '조간신문': 'Morning Paper',
    '영양 바': 'Nutrition Bar', '합성 커피': 'Synth Coffee', '에너지 셀': 'Energy Cell', '데이터 칩': 'Data Chip', '중고 드론': 'Used Drone', '응급 키트': 'First-Aid Kit',
    '통조림': 'Canned Food', '깨끗한 물 1L': 'Clean Water 1L', '정수 알약': 'Water Purification Tablets', '손전등': 'Flashlight', '탄약 한 줌': 'A Handful of Ammo', '연료 1통': 'A Can of Fuel', '응급 치료': 'First Aid',
    '빵 한 덩이': 'A Loaf of Bread', '한 끼 식사': 'A Meal', '여관 1박': 'A Night at the Inn', '말 한 필': 'A Horse', '맥주 한 잔': 'A Mug of Beer', '커피 한 잔': 'A Cup of Coffee', '영화 한 편': 'A Movie Ticket', '버스·지하철': 'Bus / Subway Fare', '한 달 월세': 'Monthly Rent',
    '학식 한 끼': 'A Cafeteria Meal', '한 학기 등록금': 'One Semester’s Tuition', '국수 한 그릇': 'A Bowl of Noodles', '객잔 1박': 'A Night at the Inn', '술 한 병': 'A Bottle of Liquor', '새 옷 한 벌': 'A New Outfit',
    '기차표': 'Train Ticket', '전보 한 통': 'A Telegram', '하숙비 한 달': 'Monthly Board', '외출 마차': 'Carriage Ride', '식사 한 팩': 'A Meal Pack', '셔틀 요금': 'Shuttle Fare', '숙소 하루': 'A Day of Lodging', '배급권': 'Ration Ticket', '하룻밤 안전한 잠자리': 'A Safe Bed for a Night', '한 달 방세': 'Monthly Room Rent',
    '골드': 'Gold', '은자': 'Silver Taels', '실링': 'Shillings', '크레딧': 'Credits',
    '원룸': 'Studio Apartment', '작은 원룸': 'A small studio apartment', '여관 방': 'Inn Room', '세 든 작은 방': 'A small rented room', '기숙사 방': 'Dorm Room', '2인실 기숙사': 'A two-person dorm room', '객잔 방': 'Inn Room', '작은 셋방': 'A small rented room',
    '세 든 방': 'Rented Room', '하숙방': 'Boarding Room', '하숙집': 'Boarding House', '캡슐 숙소': 'Capsule Lodging', '숙소 모듈': 'Living Module', '은신처': 'Hideout', '버려진 지하실': 'An abandoned basement', '오두막': 'Cottage', '작은 초가': 'A small thatched hut',
    '방': 'Room', '부엌': 'Kitchen', '주방·욕실': 'Kitchen · Bathroom', '침실': 'Bedroom', '내 자리': 'My Spot', '공용 공간': 'Common Area', '잠자리': 'Bed', '마당': 'Yard', '정원': 'Garden', '응접 공간': 'Parlor', '작업대': 'Workbench', '짐 보관함': 'Storage Locker', '수면 칸': 'Sleeping Pod',
    '집': 'Home', '동네 거리': 'Neighborhood Street', '번화가': 'Downtown', '카페': 'Café', '기차역': 'Train Station',
    '여관': 'Inn', '마을 광장': 'Village Square', '모험가 길드': 'Adventurers’ Guild', '시장': 'Market', '마을 어귀': 'Village Entrance',
    '기숙사': 'Dormitory', '광장': 'Plaza', '강의동': 'Lecture Hall', '도서관': 'Library', '학생 식당': 'Student Cafeteria',
    '객잔': 'Inn', '저잣거리': 'Market Street', '산문 앞': 'Before the Sect Gate', '찻집': 'Teahouse', '관도': 'Highway',
    '성당': 'Cathedral', '성문': 'City Gate', '큰길': 'Main Road', '신문사': 'Newspaper Office', '정거장 광장': 'Station Plaza', '시장 구역': 'Market District', '격납고': 'Hangar', '바': 'Bar',
    '폐허 거리': 'Ruined Street', '급수탑': 'Water Tower', '외곽 경계': 'Outer Perimeter',
    '오늘의 뉴스': 'Today’s News', '연예·동네 가십': 'Celebrity & Local Gossip', '동네 커뮤니티': 'Neighborhood Community', '인스타': 'Instagram',
    '왕국 소식지': 'Kingdom Bulletin', '여관 뒷소문': 'Inn Whispers', '길드 의뢰 게시판': 'Guild Request Board', '마법 게시판': 'Magic Board',
    '학원 신문': 'Academy Paper', '복도 소문': 'Hallway Rumors', '학원 게시판': 'Academy Board', '학생회 게시판': 'Student Council Board',
    '강호 소식': 'Jianghu News', '저잣거리 소문': 'Market Rumors', '방문(榜文)': 'Public Notices', '강호 소문판': 'Jianghu Rumor Board',
    '포고문': 'Proclamations', '선술집 소문': 'Tavern Rumors', '광장 게시판': 'Plaza Board',
    '신문': 'Newspaper', '사교계 가십': 'Society Gossip', '신문 광고란': 'Classifieds', '사교계 소식란': 'Society Column',
    '정거장 뉴스피드': 'Station Newsfeed', '바 뒷소문': 'Bar Whispers', '구인 게시판': 'Job Board', '넷 피드': 'Net Feed',
    '무전 방송': 'Radio Broadcast', '교역소 소문': 'Trading Post Rumors', '생존자 게시판': 'Survivor Board', '무전 채널': 'Radio Channel',
    '반응': 'Reactions',
    '급행 (퀵)': 'Express',
    // 날씨 (자동 날씨)
    '☀️ 맑음': '☀️ Clear', '⛅ 구름': '⛅ Cloudy', '🌧 비': '🌧 Rain', '🌫 안개': '🌫 Fog', '🌸 꽃바람': '🌸 Blossom Breeze', '🔥 무더위': '🔥 Heat Wave', '⛈ 소나기': '⛈ Shower', '🌀 폭풍': '🌀 Storm',
    '🍂 쌀쌀함': '🍂 Chilly', '☁️ 흐림': '☁️ Overcast', '❄️ 눈': '❄️ Snow', '🥶 한파': '🥶 Cold Snap', '🌨 눈보라': '🌨 Blizzard',
};
// 기본 틀 밖에서 생기는 영어 글(자동 날씨 · 급행)도 화면에선 한국어로 — 영어 저장 채팅을 만들 때 한 번 넣는다
export const ALWAYS_PAIRS = ['급행 (퀵)', '☀️ 맑음', '⛅ 구름', '🌧 비', '🌫 안개', '🌸 꽃바람', '🔥 무더위', '⛈ 소나기', '🌀 폭풍', '🍂 쌀쌀함', '☁️ 흐림', '❄️ 눈', '🥶 한파', '🌨 눈보라'].map(k => [SK_EN[k], k]);

const KEYS = Object.keys(SK_EN).filter(k => k.length >= 2).sort((a, b) => b.length - a.length);
const KO = /[가-힣]/;
// 문자열 하나: 통째로 맞으면 그 영어, 아니면 안에 든 낱말(두 글자 이상)을 갈아 끼움 — 「stat: 체력 +10」 → 「stat: HP +10」
export function enStr(v) {
    if (typeof v !== 'string' || !KO.test(v)) return v;
    if (Object.hasOwn(SK_EN, v)) return SK_EN[v];
    let out = v;
    for (const k of KEYS) if (out.includes(k)) out = out.split(k).join(SK_EN[k]);
    return out;
}
// 칸 데이터 통째로 (사람 이름 같은 사전에 없는 글은 그대로 둔다)
export function toEnglish(x) {
    if (typeof x === 'string') return enStr(x);
    if (Array.isArray(x)) return x.map(toEnglish);
    if (x && typeof x === 'object') { const o = {}; for (const [k, v] of Object.entries(x)) o[k] = toEnglish(v); return o; }
    return x;
}
// 화면 번역 사전용 짝 [영어, 한국어] — 이 칸에 실제로 쓰인 것만
export function usedPairs(data) {
    const seen = new Set(), out = [];
    const walk = (v) => {
        if (typeof v === 'string') { for (const [ko, en] of Object.entries(SK_EN)) if (!seen.has(en) && v.includes(en) && /[A-Za-z]/.test(en)) { seen.add(en); out.push([en, ko]); } return; }
        if (Array.isArray(v)) return v.forEach(walk);
        if (v && typeof v === 'object') Object.values(v).forEach(walk);
    };
    walk(data);
    return out;
}
