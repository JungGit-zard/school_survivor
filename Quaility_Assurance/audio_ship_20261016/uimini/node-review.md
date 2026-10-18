# t_ccf55f42 · UI_Mini Node 전용 검토 완료

## 판정 및 소유권

- Node/jsdom 검토 및 테스트 완료. 전체 음원 출하 READY 판정 아님.
- 최신 Advisor 코멘트(1792109584)와 OWNER 지시 준수: 브라우저 실행·탐색·추가 예약을 하지 않았다. 다른 방 긴급 hotfix가 남은 슬롯 우선권을 가진다.
- soundmini 소유 실제 assets/manifest 및 공유 런타임 파일을 수정하지 않았다. commit/stage/push/deploy 없음.
- 카드의 기존 blocked 상태를 변경하지 않았다. Advisor의 수동 소유권 및 후속 검증을 유지한다.
- 실제 매니페스트는 soundmini 생성 중이라는 OWNER 전달 상태를 따르며 이 검증에서는 읽거나 생성하거나 대체하지 않았다.

## 최소 수정 및 검토

- 기존 청음 페이지와 기존 Node 테스트를 보존하고 disposal 경로만 보강했다.
- 정리된 Audio의 늦은 error 이벤트가 dispose → load → error → dispose로 반복되는 경로를 회귀 테스트로 재현했다.
- 수정 전: 새 단일 테스트 exit 1. load 호출 실제 4, 기대 1. 테스트 더블은 무한 재귀 방지를 위해 오류 연쇄를 4회로 제한했다.
- 수정: dispose는 매 호출마다 pause/muted를 수행하되, request.disposed를 src 제거/load 전에 설정하여 자원 재설정은 최초 1회만 수행한다.
- 늦은 play Promise resolve와 playing/error 이벤트에도 이전 오디오는 정지·음소거되며 현재 후보의 UI를 덮어쓰지 않는 것을 확인했다.
- 기존 원본/A/B/C 재생 경로, 메모리 선호 선택, JSON 전달 계약, 검색, 볼륨과 정지 제어를 유지했다. 게임/Studio 저장이나 Apply를 추가하지 않았다.

## 실제 실행 결과

실행 환경: Node v24.15.0, jsdom, 브라우저 미사용.

명령:

    node --test --test-name-pattern='stale error/load disposal' Developer/agent_room/audio_ship_20261016/uimini-audition.test.cjs
    node --test Developer/agent_room/audio_ship_20261016/uimini-audition.test.cjs

최종 결과: exit 0, tests 9 / pass 9 / fail 0 / cancelled 0 / skipped 0. duration_ms 8718.4828.

검증 범위:

1. 매니페스트 누락 시 준비 대기, 가짜 실제 건수 없음.
2. 합성 계약 fixture 93건과 원본+A/B/C 버튼 372개, 검색·분류, 자동재생 없음.
3. 후보 전환·재청음 시 하나의 활성 요청 유지, 모두 정지.
4. 지연 resolve/reject 후 기존 요청 부활 및 상태 덮어쓰기 차단.
5. 재생 권한 거절 및 미디어 오류 표시, 볼륨, 상황별 정지.
6. 메모리 전용 선호 선택, JSON 다운로드, 새 DOM에서는 선택 초기화.
7. visibilitychange/pagehide/Escape 시 pending 요청 취소.
8. stale error/load 정리 재진입 방지, 늦은 재생 정지·음소거.
9. 페이지의 외부 의존·브라우저 저장·Firebase 접근 없음 및 manifest script 계약 검사.

## 명확한 미검증 범위

- 93건/372개는 합성 테스트 fixture 규모이며 실제 파일 수·실제 음원 성공률이 아니다.
- Audio는 테스트 더블이다. 실제 브라우저 오디오 출력, 코덱 디코딩, 네트워크 오류, 모바일 제스처/기기 볼륨, 반응형 실제 렌더링, 키보드 실사용 검수는 미수행이다.
- 실제 manifest 및 음원 연결·전수 청음·라이선스 검증은 pending. 매니페스트나 실제 음원이 준비되었다고 주장하지 않는다.
- 브라우저 슬롯 해제 후 Advisor가 브라우저 및 audio-real 검증을 담당한다. 이 보고서는 해당 검증을 대신하지 않는다.

## 파일 및 SHA-256

페이지:
F:/From_SSD_D_20261005/JungSil/2.Minigame_project/school_survivor-integration/Developer/r3f_prototype/public/sfx-audition-20261016.html
SHA-256: d1ad0563c29025a486e9876a48a7247680db26f2c0c897074ac52d829aa5a892

기존 테스트 + 회귀 테스트:
F:/From_SSD_D_20261005/JungSil/2.Minigame_project/school_survivor-integration/Developer/agent_room/audio_ship_20261016/uimini-audition.test.cjs
SHA-256: 45ab3ed7547792eb130644c972cca9137e91221a53cab40377ef06a70200cad4

수정 전 실패 증거:
F:/From_SSD_D_20261005/JungSil/2.Minigame_project/school_survivor-integration/Developer/agent_room/audio_ship_20261016/uimini/disposal-red.txt
SHA-256: cfbc4544dca4a79e7080bd944ca0cb1a657d50f77bf5d825cf0645038548e929

최종 전체 테스트 출력:
F:/From_SSD_D_20261005/JungSil/2.Minigame_project/school_survivor-integration/Developer/agent_room/audio_ship_20261016/uimini/node-tests.txt
SHA-256: 3e132cf0ee93fa8ac8943208c9e05904ab69142df6efe23517ee98d8f8d0b643

## Gate 증거

checker exit 0. matched_domains: ui, qa, audio. match_evidence: ui←ui, qa←review, audio←audio. 공통 domain 포함.
combined_receipt_sha256: 937e934a5af7f57f3f228ace515327f2508abf91382f543d10cd9e0c7a192e64.

공유 작업트리의 다른 작업은 검토·수정·정리 대상에서 제외했다. 보고서 생성 전 scoped git status는 페이지·테스트·본 작업 증거 폴더를 untracked로 표시했다. 기존 green/red 로그는 덮어쓰지 않았다.
