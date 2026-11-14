# tools — 개발용 (실리태번은 이 폴더를 읽지 않아요)

- `compat-check.mjs` — 함께 쓰는 테마 확장과의 호환 검사. 그 확장 저장소를 받아 둔 폴더를 주면 두 확장 사이의 약속(호출 스택 함수 이름 · 설정 키 · 주입 칸 · 설정 칸 선택자 · 정리한 보기 열쇠 · 맞춤 시트 클래스)이 깨졌는지 봐요.
  - `node tools/compat-check.mjs <폴더>` (정적) · `--live` (브라우저에서 그 확장의 설정 탭을 우리 설정 칸에 실제로 돌려 봄)
  - AI 부르는 함수 이름(`src/ai.js` · `src/help.js` · `src/translate.js`) · `aiProfile` · `prof*` · `trProfile` 설정 키 · `#ss-settings` · `b.ss-set-h` · `data-s` · `--ss-*` · `statussim_*` 를 바꾸면 이 검사를 꼭 돌려요.
- `harness/` — 가짜 실리태번(`st-stub.js`)에 이 확장을 그대로 올려 Playwright로 눌러 보는 시험대.
  - `node tools/harness/run-all.mjs` — 모든 시나리오 (퀘스트 · 칩 점검 · 빨간 점 · 기능 끄기 · 버린 물건 · 번역 · 탭 전부 열기 · 스와이프)
  - `N=600 node tools/harness/t-perf.mjs` — 긴 채팅 부하 (`TR=1`이면 화면 번역 사전 2500개) · `EXT_DIR=<옛 판 폴더>`로 옛 판과 비교
  - `node tools/harness/bench-solo.mjs` — 「수치만 켠 미트볼」 vs 「수치만 있는 가상의 단독 확장(`mini-stats.js`)」 vs 「확장 없음」 (CPU 4배 느리게 · `RATE=`로 조절 · `bench.html`)
  - `node tools/harness/t-fuzz.mjs` — 모든 탭 · 보기/편집의 버튼을 하나씩 눌러 보기 (약 3분 · run-all엔 안 들어감 · `JUNK=1`이면 AI가 이상한 답을 줄 때)
