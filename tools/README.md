# tools — 개발용 (실리태번은 이 폴더를 읽지 않아요)

- `compat-check.mjs` — 함께 쓰는 테마 확장과의 호환 검사. 그 확장 저장소를 받아 둔 폴더를 주면 두 확장 사이의 약속(호출 스택 함수 이름 · 설정 키 · 주입 칸 · 설정 칸 선택자 · 정리한 보기 열쇠 · 맞춤 시트 클래스)이 깨졌는지 봐요.
  - `node tools/compat-check.mjs <폴더>` (정적) · `--live` (브라우저에서 그 확장의 설정 탭을 우리 설정 칸에 실제로 돌려 봄)
  - AI 부르는 함수 이름(`src/ai.js` · `src/help.js` · `src/translate.js`) · `aiProfile` · `prof*` · `trProfile` 설정 키 · `#ss-settings` · `b.ss-set-h` · `data-s` · `--ss-*` · `statussim_*` 를 바꾸면 이 검사를 꼭 돌려요.
- `harness/` — 가짜 실리태번(`st-stub.js`)에 이 확장을 그대로 올려 Playwright로 눌러 보는 시험대.
  - `node tools/harness/run-all.mjs` — 모든 시나리오 (퀘스트 · 칩 점검 · 빨간 점 · 기능 끄기 · 버린 물건 · 번역 · 탭 전부 열기 · 스와이프)
  - `N=600 node tools/harness/t-perf.mjs` — 긴 채팅 부하 (`TR=1`이면 화면 번역 사전 2500개) · `EXT_DIR=<옛 판 폴더>`로 옛 판과 비교
  - `node tools/harness/bench-solo.mjs` — 「수치만 켠 미트볼」 vs 「수치만 있는 가상의 단독 확장(`mini-stats.js`)」 vs 「확장 없음」 (CPU 4배 느리게 · `RATE=`로 조절 · `bench.html`)
  - `node tools/harness/t-fuzz.mjs` — 모든 탭 · 보기/편집의 버튼을 하나씩 눌러 보기 (약 3분 · run-all엔 안 들어감 · `JUNK=1`이면 AI가 이상한 답을 줄 때 · v2.7.18부터 단추를 이름으로 찾아서 AI 부르는 단추도 실제로 눌러요 — 「AI 호출 20회 넘게」를 확인)

## 파일 지도 (아래에서 위로 쌓여요 — 위 파일만 아래 파일을 불러요)

| 층 | 파일 | 하는 일 |
|---|---|---|
| 바닥 | `src/util.js` | 숫자 · 글자 · 달력 계산. 아무것도 불러오지 않음 |
| 바닥 | `src/core.js` | 상수 · 설정 · 채팅 메타 · 데이터 모양. `util.js`를 다시 내보냄 |
| 계산 | `src/engine.js` | `<meatball>` 읽기 → 상태 다시 계산(`compute`) → 프롬프트 주입 |
| AI | `src/prompts.js` · `src/ai.js` · `src/translate.js` | AI 호출 · 번역 |
| 기능 | `contact` · `dice` · `extra` · `fate` · `feeds` · `money` · `notify` · `safe` · `pip` · `tips` · `help` · `report` · `mascot` | 칸 하나씩 |
| 화면 | `src/tiles.js` | 미니 위젯 · 타일 판 |
| 화면 | `src/views.js` | 칸별 화면 · 관리 · 칸 공통 동작. `tiles.js`를 다시 내보냄 |
| 틀 | `src/shell.js` | 패널 · HUD · 사이드. `wizard.js` · `windows.js`를 다시 내보냄 |
| 틀 | `src/wizard.js` · `src/windows.js` | 처음 만들기 · 프롬프트/꾸미기 창 |
| 맨 위 | `src/settings_ui.js` · `src/commands.js` | 확장 설정 서랍 · 슬래시 커맨드 |
| 맨 위 | `index.js` | 이벤트 연결 · 칩 · 갱신 · 업데이트 알림 |

- **새 변화량 종류**: `engine.js`의 `KEYMAP` · `KEY_MOD`에 키 → `op이름` 함수 → `OPS` 표.
- **옛 채팅 한 번 손보기**: `engine.js`의 `fixOldMeta`에 한 줄.
- **위 파일의 함수를 아래 파일에서 불러야 할 때**: import하지 말고 `app.이름`에 걸어요. 건 것은 `core.js` 맨 위 목록에 적어요.

