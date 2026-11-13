# tools — 개발용 (실리태번은 이 폴더를 읽지 않아요)

- `harness/` — 가짜 실리태번(`st-stub.js`)에 이 확장을 그대로 올려 Playwright로 눌러 보는 시험대.
  - `node tools/harness/run-all.mjs` — 모든 시나리오 (퀘스트 · 칩 점검 · 빨간 점 · 기능 끄기 · 버린 물건 · 번역 · 탭 전부 열기 · 스와이프)
  - `N=600 node tools/harness/t-perf.mjs` — 긴 채팅 부하 (`TR=1`이면 화면 번역 사전 2500개) · `EXT_DIR=<옛 판 폴더>`로 옛 판과 비교
