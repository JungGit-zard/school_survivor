# 랭킹 수정 운영 배포 완료

사용자가 Google OAuth 미검증 고지 후 배포를 명시 지시하여 Hosting 배포를 수행했다. 기존 launchmini/backendmini 카드와 단일 publisher lease를 사용했다. source47f4a4e1(랭킹13399c91 + 홈페이지f84/e21), release경로는 Temp/stage-progress-p0-release-20261018이다.

검증한 새 preview를 운영 versiond41e90ef5ec76803으로 승격했다. 직전65d2의627파일 중625비provider경로 모두 보존, 기존 해시 변경은 index만이다. 새665파일, Rules67c9와 config 전후 동일. 정상build/Studio45/자산62 통과, 앞선 독립112검사 소스9해시도 유지했다. Advisor12:02:17.955Z 운영 독립 조회와 HTTP/빌드 일치 확인을 보존했다.

상세 결과·원본·해시·고유 롤백 채널은 Quaility_Assurance/20261018_ranking_hosting_release/README.md에 있다. 운영 Rules/Auth/사용자 데이터 쓰기0, 새 브라우저0. 실제 Google OAuth·렌더·실플레이·사용자 랭킹 쓰기는 NOT_VERIFIED다. 임시파일 정리와 publisher lease 해제를 완료했고 자동 승격 작업은 없다.
