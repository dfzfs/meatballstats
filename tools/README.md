# tools — 개발용 (실리태번은 이 폴더를 읽지 않아요)

- `bl-compat.mjs` — 🍋 블루레몬에이드 호환 검사. BL 저장소의 최신 코드를 읽어 두 확장 사이의 약속(호출 스택 함수 이름 · 설정 키 · 주입 칸 · 설정 칸 선택자 · 「정리한 보기」 열쇠 · 맞춤 시트 클래스)이 깨졌는지 봐요.
  - `git clone --depth 1 https://github.com/kgangkgang/blue-lemonade.git ../blue-lemonade`
  - `node tools/bl-compat.mjs ../blue-lemonade` (정적) · `--live` (브라우저에서 BL의 설정 탭 · 정리한 보기를 우리 설정 칸에 실제로 돌려 봄)
  - 미트볼에서 아래를 바꾸면 BL 쪽에도 알려야 해요: `src/ai.js` · `src/help.js` · `src/translate.js`의 AI 부르는 함수 이름(BL `FN_SLOT`), `aiProfile` · `prof*` · `trProfile` 설정 키, `#ss-settings` · `b.ss-set-h` · `data-s="…"`, `--ss-*` 색 변수, `statussim_*` 주입 칸.
- `harness/` — 가짜 실리태번(`st-stub.js`)에 이 확장을 그대로 올려 Playwright로 눌러 보는 시험대.
  - `node tools/harness/run-all.mjs` — 모든 시나리오 (퀘스트 · 칩 점검 · 빨간 점 · 기능 끄기 · 버린 물건 · 번역 · 탭 전부 열기 · 스와이프)
  - `N=600 node tools/harness/t-perf.mjs` — 긴 채팅 부하 (`TR=1`이면 화면 번역 사전 2500개) · `EXT_DIR=<옛 판 폴더>`로 옛 판과 비교
