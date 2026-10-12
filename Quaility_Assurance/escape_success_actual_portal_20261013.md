# 탈출 성공 선택 실제 게임 검증 — 2026-10-13

- Advisor가 levelmini/uimini 변경을 직접 검토했다. 독립 balanceqa 검토가 지적한 이전 랭킹 요청 응답 역전도 pending 객체 동일성 검사로 수정했다.
- 직접 집중 검사: `node node_modules/vitest/vitest.mjs run src/store/useGameStore.escapeSuccess.test.js src/components/HUD.escapeSuccess.test.jsx src/components/EscapePortal.target.test.jsx src/lib/firebaseRanking.test.js src/store/useGameStore.test.js -t "choice|continues the cleared|existing lobby|cumulative|decision|dying|final stage|역순|늦게 끝난 이전" --maxWorkers=1` → 5 files passed / 11 passed / 56 skipped.
- 실제 게임 검증은 별도 localhost:5181 개발 서버의 게스트 세션으로 수행했다. 정상 UI로 Stage 1 입장 후 런타임 메모리에서 포탈 활성 상태를 만들고, 실제 joystickDir 이동으로 플레이어가 실제 포탈 흡입을 완료했다. 포탈 동작 코드나 모델은 검증용으로 수정하지 않았다.
- 결과: Stage 1 / gameKey 2 그대로 phase=cleared. escapeResult={stageScore:24,totalScore:24,timeMs:21333,totalTimeMs:21333}. 자동 Stage 2 시작 없음. 390x844 이미지와 세 버튼은 screenshot `escape_success_actual_portal_20261013.png`에 기록했다.
- 실제 다음 버튼 클릭 뒤 Stage 2 / gameKey 3 / continuousScoreBase=24 / continuousTimeBase=21333 / escapeResult=null. HUD=84(이전24+기존Stage2기본60).
- Stage 2는 clearStage 액션으로 결과를 만들었다(이 두 번째 검사는 실제 포탈 흡입 검사가 아니다). 해당 판93+이전24=117 표시. 실제 로비에서 쉬기 버튼은 기존 로비로 이동했다.
- 새 시작0·사망누적·마지막스테이지no-next·중복clear/continue·랭킹global/stage분리·역순응답은 위 집중 검사로 확인했다. 마지막 로비 재입장 검사에서는 비동기 시작 완료를 기다리지 않았으므로 실제 새 시작0의 브라우저 증거로 사용하지 않는다.
- 개발 서버 자동 갱신으로 다른 store 모듈 인스턴스를 대상으로 한 첫 probe와, 시간을 강제 이동해 게임오버가 된 첫 이동 probe는 성공 증거에서 제외했다. 실제 페이지가 로드한 모듈 URL을 사용하고 새 런에서 포탈 동작을 재확인한 결과만 위에 기록했다.
- 운영 Firebase 데이터에 테스트 쓰기 없음. 인증·규칙·저장 엔트리 스키마 변경 없음. 브라우저 메모리 검증 후 세션을 닫았다. 기존 port5173 서버는 건드리지 않는다. 실제 Google OAuth/운영 랭킹 쓰기 성공은 이 검사로 주장하지 않는다.
