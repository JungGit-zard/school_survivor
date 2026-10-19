# t_6cec1286 review2 — QA-01 수리 한정 재검토

현재 판정: PASS / approved:true. 소스 security/integrity 검토의 새 SHA 재바인딩이며 게시 승인이나 build/preview/live 통과 선언이 아니다. launchmini만 publisher이다.
검증 시각: 2026-10-19T13:53:16.513008+00:00.

## 대상과 실제 결과
- lane: F:/From_SSD_D_20261005/JungSil/2.Minigame_project/releases/owner-all-complete-20261018
- D: Developer/agent_room/owner_apply_audio_matilda_vending_20261019
- 새 reviewed-source.json SHA256: 2c9bb0254843846fd31f91e0e41ef05802dd66362b3f48d2dc8acad51d600fe0.
- baseCommit: 66c9198b9f97d146a16bb0ef611359b468072b1a. 이번에 원격을 다시 조회하지 않았다.
- Python pathlib/json/hashlib 읽기전용 대조: 1318개/고유1318개 실제 SHA·크기 mismatch 0. src/public/scripts membership 모두 exact.
- review1과 files 항목 대조: 추가 Developer/r3f_prototype/index.html 하나, 제거0, 기존1317 항목 변경0. files 외 차이는 utc뿐이다. 따라서 기존 runtime/security scripts/config 및 기존 검토 입력은 동일하다.
- git show HEAD:Developer/r3f_prototype/index.html의 원본 bytes, 실제 HTML 및 새 manifest 해시 모두 5fff6ffc5ab7edb9cd8062f2d530e44966d7bf5262c80bb67e88fd219060f95d로 일치한다.

## QA-01 해소 근거
prepare-source-freeze.py:13의 명시 목록에 index.html이 포함됐다. 이 생성기는 실행하지 않았다. 기존 release-common.cjs:12는 열거된 모든 입력 해시를 검사하므로 HTML도 이제 sourceGate 검사 대상이다. HTML 내용이나 기존 게이트를 바꾸지 않고 누락 바인딩만 수리했다.
html-binding-negative.cjs:1-8을 직접 읽었다. 실제 sourceGate를 VM으로 로드하고 fs read overlay에서만 HTML bytes와 fixture QA 응답을 대체하며 정확한 HTML drift 오류를 요구한다. 해당 오류는 remote ls-remote/API 인증 이전 루프에서 발생한다. publisher의 PASS 보고는 이 코드와 부합한다. 사용자 테스트 금지에 따라 리뷰어는 fixture를 포함해 테스트를 재실행하지 않았다. 실제 파일/승인 receipt 변경 또는 auth/network 실행의 새 증거로 표현하지 않는다.

Blocker: 없음(이번 QA-01 수리 및 기존 검토 재바인딩 범위).

## review1 불변 보존 검증
다음 lane D 파일들의 실제 SHA를 이전 리뷰 결과와 대조해 모두 일치함을 확인했다. 파일은 수정하지 않았다.
- reviewed-source-review1.json: 57ea766fe1fda89fda2f343ed3eb86fec72bcbe10dcfd9460456b543800a9446
- qa-approval-review1.json: baae93bd635d8ac65c3b98226c9487079f1b6f3b468673b6e97f2335aa64d94b (approved:false, 옛 manifest에 바인딩)
- qa-result-review1.md: f3c6ee4dd7622bab6da027cb4f12d090981c656b58847951115b62a7e88c1a21
옛 HOLD는 역사적 판정으로 그대로 남는다. canonical 보고서도 기존 HOLD 본문 앞에 새 판정을 추가하고 옛 본문은 보존한다.

## 명령·한계
실행: Python 읽기전용 manifest 전항목 해시/크기·목록 delta·root membership·보존 receipt SHA 검사, git show HEAD:Developer/r3f_prototype/index.html. 실제 결과 PASS; 새 manifest SHA는 위 값과 일치.
게이트: 같은 audio/gameplay/ui/qa summary, matched_domains ui/gameplay/qa/audio 및 각 keyword evidence 확인. combined receipt d99c5c9f7bafb91cd838c10588efbf9366df986fff84ebe16322533016082495로 이전과 달라 필수 문서를 재읽었다(SESSION_MEMORY는 최신 엔트리만). 작업 영역을 확장한 것은 아니다.
이번 continuation에서 테스트·build·게임·브라우저·benchmark·preview/live·인증 네트워크·commit/push/deploy 없음. 소스/manifest/config 및 보존 receipt 수정 없음. 기존 direct blocked fence 유지. review1의 실제 실기기/OAuth/청음/새 live 미검증 등 한계는 그대로이며 신규 검증으로 승격하지 않는다.

산출물: 이 폴더 qa-approval.json 및 qa-result.md.
canonical 상세 mirror: F:/From_SSD_D_20261005/JungSil/2.Minigame_project/school_survivor-integration/Developer/agent_room/owner_apply_audio_matilda_vending_20261019/qa-result.md
QA mirror: F:/From_SSD_D_20261005/JungSil/2.Minigame_project/school_survivor-integration/Quaility_Assurance/owner_apply_audio_matilda_vending_20261019/qa-result.md
