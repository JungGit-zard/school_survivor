# Stage4 독립 시각 QA 최종 기록 — t_69d2baf0

판정: PASS_WITH_LIMITATIONS (Stage4 시각 범위 한정). 전체 런타임 무결함 승인은 하지 않음.

## 확인 결과
- 실제 GameCanvas/HUD/SfxLayer 프리뷰의 모바일 360×800 초기 0.6초 및 경고 12.4초 캡처를 vision으로 판독. 안내와 시간 표시가 읽히며 실제 솥 주위 경고 원 확인.
- QA 도구줄의 모바일 줄바꿈 겹침은 페이지 RAM의 QA DOM 레이아웃만 조정. 제품 소스는 수정하지 않음.
- 실제 B04 이벤트: bossSpawn #50 @150083.333ms → zombieChargeRoar #51 @150833.333ms → flaskHit #52 @152050ms → bossRoar #55 @152316.667ms. HUD II 및 국물 telegraph 3원×8분절 관측. 원본 gameKey3 전체 375개 이벤트/모든 cue ID는 final-qa.json에 보존.
- soup 명칭 cue ID는 없음. 관측된 공유 cue flaskHit와 P2 bossRoar를 기록했으며 노출되지 않은 모델 이름은 주장하지 않음.
- 새 재시작 후 실제 sceneFound=true, soup=null, warning idle/비표시, boss없음, paused/0ms 확인. 데스크톱 최종 스크린샷은 빈 화면이 아니라 정상 PAUSED 오버레이 뒤 실제 맵을 표시.
- 동일 원본 정본의 전체 구조/타입/키/값/리비전/원문 해시 비교: True. 중간 재기준화 없음. before 2026-10-24T06:07:34.597Z / after 2026-10-24T06:15:06.338Z; revision 1952 → 1952.
- 정본 SHA256 before=after: 20483fa0019c26f93e94e1d5a2d157da43ae1c33d51b7959a1ec24191cb1c4b6. 런타임 6 datasets 및 revision도 동일.
- sourcefreeze: True; 632 → 632 소스 해시 전부 일치. 정확한 파일별 해시는 visual-result.json에 있음.
- 기존 정상 npm build 및 final-focused 게이트 통과 영수증 보존. 이번 마무리에는 소스 조사/테스트/빌드 재실행 없음. root 135/13 PASS는 root 제공 결과로 구분.

## 차단사항 / 구현자 인계
- QA-RUNTIME-CLEANUP-01: pageErrors에 `TypeError: mesh.dispose is not a function` 2건, ExpansionZombieInstanceLayer component 오류 기록. Stage4/B04 후 장면 종료·재시작 시퀀스 및 console/pageErrors 확인. 단일 트리거/근본 원인/기존 회귀 여부는 미분리. 현재 재시작 장면은 정상이나 오류 0건으로 승인 불가. 동결 소스는 QA가 수정하지 않음.

## 관측 및 한계
- Storage setItem 시도 1건은 차단됨. 기존 bootstrap/harness 한계로 기록하며 정확한 호출 스택 원인 확정은 하지 않음. 영속 저장 성공 0건과 API 호출 시도 0건은 다름. 호출 0건을 주장하지 않음.
- 실제 DB 쓰기 관측 0 / 허용 쓰기 0. 익명 인증 POST accounts:signUp 시도는 브라우저에서 차단됨. auth/analytics 외부 요청 차단 정책 유지. OAuth/영구 클라우드 저장 미검증.
- Vite WebSocket 비활성화로 HMR 연결/send 오류는 예상 로그. 별도 런타임 mesh.dispose 오류는 예상 네트워크 오류와 구분.
- 임시 메모리 highHP100000 때문에 모바일 우측 HP 숫자가 잘림. 일반 HP/물리 터치/성능 개선은 이번 증거로 보장하지 않음.
- 모바일 경고 원은 보이나 세부 진행 분절은 해당 캡처만으로 개별 판독하지 못함. 이전 런타임 샘플/데스크톱 증거 유지.

## 남겨 둔 실행 상태
URL: http://localhost:5184/stage4-review
소유 브라우저 Chrome PID33072 / hidden helper35160. 현재 localhost ::1:5184 listener PID36892. 이전 server PID 기록과 달라 현재 관측값을 별도 명시. 구 소유 빈 브라우저22752 및 helper23348만 정리. 사용자/다른 작업자 브라우저는 건드리지 않음.
최종 화면: 데스크톱1180×820, 새 재시작 뒤0초 일시정지, 실제 장면 및 시작/재개 버튼 표시. 프리뷰/5184 유지. 프로덕션/배포/Git 조작 없음.

## 정확한 증거 경로
F:\From_SSD_D_20261005\JungSil\2.Minigame_project\school_survivor-integration\Quaility_Assurance\stage4_upgrade_20261024\final-qa.json
F:\From_SSD_D_20261005\JungSil\2.Minigame_project\school_survivor-integration\Quaility_Assurance\stage4_upgrade_20261024\visual-result.json
F:\From_SSD_D_20261005\JungSil\2.Minigame_project\school_survivor-integration\Quaility_Assurance\stage4_upgrade_20261024\runtime-observations.ndjson
F:\From_SSD_D_20261005\JungSil\2.Minigame_project\school_survivor-integration\Quaility_Assurance\stage4_upgrade_20261024\mobile-orientation-360x800.png
F:\From_SSD_D_20261005\JungSil\2.Minigame_project\school_survivor-integration\Quaility_Assurance\stage4_upgrade_20261024\mobile-warning-360x800.png
F:\From_SSD_D_20261005\JungSil\2.Minigame_project\school_survivor-integration\Quaility_Assurance\stage4_upgrade_20261024\desktop-final-paused-zero.png
F:\From_SSD_D_20261005\JungSil\2.Minigame_project\school_survivor-integration\Quaility_Assurance\stage4_upgrade_20261024\desktop-b04-soup-paused.png

실행 명령은 runtime-observations.ndjson의 command.action/expression 및 QA process JSON의 command에 원문 보존. 최종화: python Quaility_Assurance/stage4_upgrade_20261024/qa_finalize_report.py
