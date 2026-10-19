# t_6cec1286 review3 — byte-transport binding

현재 판정: GO_SCOPED / approved:true. 직전 review2와 동일한 source security/integrity 승인 범위이며 live/게시 승인이 아니다. QA-01 해소 상태 유지.
검증 시각: 2026-10-19T13:59:39.507279+00:00.
관측 HEAD: d23e20a3f1029c30243c2e432a6283788665e403. 원격 push 여부는 이번에 재조회하지 않았다.

## 실제 검증
1. reviewed-source.json 실제 SHA256 = 08da4eec2296321a15a5a747c8e7af31948dc58572c1647c238e2b9b6a113db4. git show HEAD:Developer/agent_room/owner_apply_audio_matilda_vending_20261019/reviewed-source.json raw bytes와 완전히 동일하며 CR 없음.
2. ZIP의 직전 manifest raw SHA = 2c9bb0254843846fd31f91e0e41ef05802dd66362b3f48d2dc8acad51d600fe0. 현재 bytes == 직전 bytes의 CRLF를 LF로 치환한 결과. JSON 전체 값(UTC 포함) 완전히 동일. source 파일 항목/게임/guard/config 바인딩 변경0.
3. 현재 1318개 입력/고유1318개 실제 SHA와 크기 대조 mismatch0. 기존 sourceGate의 검증 구조를 변경하지 않고 QA SHA만 재바인딩.
4. 재바인딩 전 qa-approval.json은 old2c9bb SHA로 승인되어 있어 새 manifest raw SHA와 다름을 확인. sourceGate 자체는 실행하지 않았다.
5. prepare-source-freeze.py의 working diff는 write_text에 newline='\n' 한 인자 추가뿐. 생성기와 publisher final evidence scripts는 실행하지 않았다. 기존 LF 정책/가드는 수정하지 않았다.

## 불변 원본 보존
D/immutable-pre-normalization-receipts.zip 실제 SHA256:
d18ae0e97c1fffb1bac2418f9a2eb974bd1913bb22b80592ca74a1cc730d78bb
압축 해제/쓰기 없이 ZIP 멤버 bytes를 읽어 확인했다:
- review2 reviewed-source.json: 2c9bb0254843846fd31f91e0e41ef05802dd66362b3f48d2dc8acad51d600fe0
- review2 qa-approval.json: d8cb2a5caaf730c79b85d150fda7fcfb4644c21b15c1db323f13d1a6e37271cc, approved:true 및 old2c9bb 바인딩 확인
- review2 qa-result.md: 429208a78f78249e9a83c7a97743caf3ae811e91176714902b77ef5dab31a6d8
- review1 manifest/approval/result: 각각 57ea766fe1fda89fda2f343ed3eb86fec72bcbe10dcfd9460456b543800a9446 / baae93bd635d8ac65c3b98226c9487079f1b6f3b468673b6e97f2335aa64d94b / f3c6ee4dd7622bab6da027cb4f12d090981c656b58847951115b62a7e88c1a21. 원래 approved:false 유지.
원본 ZIP과 과거 receipts는 수정하지 않았다. canonical mirrors의 과거 보고 본문도 그대로 보존한다.

## 명령 및 경계
Python pathlib/zipfile/json/hashlib 읽기전용 검사와 git rev-parse HEAD, git show HEAD:<manifest>, git diff -- <prepare-source-freeze.py> 사용. 모든 위 조건 assert PASS. 추가 source/runtime discovery 없음.
필수 gate exit0; matched_domains ui/gameplay/qa/audio 및 각 keyword evidence 확인. receipt dff7356ebc64f7a361d13bdc800ada75eff66ef89c3e0acc8c6d1937f04f18f8. 직전과 같은 정책 문서 해시이며 갱신된 QA 기록만 재확인했다.

Blocker: 없음(이 byte-transport 재바인딩 범위). 이전 실기기/OAuth/청음/live 등 미검증 한계 유지. 이번에 테스트/build/게임/새worker/인증 네트워크/commit/push/preview/live/deploy 미실행. source/manifest/guard/config/policy 수정 없음. direct blocked fence 유지. launchmini 단일 publisher. live 아직 실행하지 않았으며 publisher final evidence scripts는 범위 밖이다.

산출물: lane D/qa-approval.json 및 D/qa-result.md; canonical Developer/agent_room/owner_apply_audio_matilda_vending_20261019/qa-result.md와 Quaility_Assurance/owner_apply_audio_matilda_vending_20261019/qa-result.md에 현재 판정 추가.
