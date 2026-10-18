# 랭킹 재시도 오류 수정

backendmini 카드 t_a33559b6 / t_0467d8a4. UID와 최초 버킷 전체 경로별 메모리 대기 요청으로 원래 점수·시간·기간을 보존한다. 계정 전환, 삭제, 닉네임 변경과 늦은 화면 응답을 분리했다. 서버 transaction 뒤 readback까지 확인한 버킷만 저장 완료로 표시한다. 조회 실패를 빈 랭킹으로 표시하지 않으며 부분 저장과 재시도를 안내한다.

Advisor 독립9파일112검사, 수정한 실제 소스와 Firebase SDK의 격리 emulator 검사, 정상 빌드 및 Studio45/자산62검사가 통과했다. 마지막 삭제 회귀는 이전 기간의 미확인 요청 경로도 본인 계정 삭제 대상에 포함하는1줄 수정이다.

상세 증거는 Quaility_Assurance/20261018_ranking_retry_hardening/README.md와 source-hashes.json에 있다. Preview version9134dbafbe671337은 기준86e81c7d와 이번 수정으로 만들었으며 이후 원격 홈페이지 변경은 포함하지 않는다. 이 worker의 운영 Hosting/Rules 배포는 없고 자동 승격 작업도 없다. 실제 Google 새 OAuth는 미검증이므로 combined client 운영 승격은 보류한다. 운영0a681 승격은 별도 integrated owner의 기록과 구분한다.
