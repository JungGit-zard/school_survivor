# Cloudflare · 가비아 · DNS · R2 음악 CDN 연결 완료 기록

작성 및 공개 엔드포인트 재검증 시각(KST): 2026-10-05T02:59:20.224440+09:00

## 1. 결론과 범위
등록기관 가비아에서 관리하는 `escapezombie.com`의 공개 NS는 Cloudflare로 응답한다. R2 버킷 `zombie-music`의 커스텀 도메인 `music.escapezombie.com`을 통해 음악 6개가 HTTPS로 제공된다. 이번 변경은 인프라 연결과 문서화이며 게임 코드의 음악 URL 적용은 아직 수행하지 않았다. 이번 문서화에서는 DNS/버킷 설정을 다시 변경하지 않았고 오르카 조사는 수행하지 않았다.

## 2. 구성과 역할
- 가비아: 도메인 등록기관 및 상위 네임서버 위임 설정 관리.
- Cloudflare DNS: escapezombie.com 권한 DNS 및 R2 커스텀 도메인 연결.
- 네임서버: `etta.ns.cloudflare.com`, `lennon.ns.cloudflare.com` (이번 공개 NS 조회 결과).
- Cloudflare R2: 음악 파일 저장 버킷 `zombie-music`.
- 커스텀 호스트: `music.escapezombie.com`.
- 공개 기본 주소: `https://music.escapezombie.com/`.
- 흐름: 클라이언트 → 공개 DNS → Cloudflare 커스텀 도메인/CDN → R2 객체.
- 기존 홈페이지: `https://escapezombie.com`는 별도 유지.

## 3. 작업 과정과 근거 수준
1. Cloudflare 무료 플랜을 선택하고 기존 웹사이트 A/TXT 보존을 점검했다. 이는 이전 작업 기록이며 전체 DNS 레코드 이관 감사가 완료됐다는 의미는 아니다.
2. 가비아 네임서버 변경 흐름에서 Cloudflare 네임서버를 입력하고 소유자 휴대폰 인증 단계까지 진행한 체크포인트가 있었다. OTP나 계정 인증 정보는 기록하지 않는다.
3. 이후 공개 NS가 위 두 Cloudflare 서버로 응답하는 것을 확인했다. 현재 공개 위임 상태는 이번에 다시 검증했으나 가비아 관리자 화면의 저장 영수증/인증 완료 시각은 이번에 재수집하지 않았다.
4. R2 `zombie-music` 버킷의 음악 6개를 확인하고 Settings → Custom Domains → Add 흐름에서 `music.escapezombie.com`을 연결했다. R2 연결 흐름의 DNS 미리보기를 사용했으며 S3 API 엔드포인트를 임의 CNAME 대상으로 넣지 않았다.
5. 이전 완료 기록에서 도메인 Status `Active`, 공개 Access `Enabled`를 확인했다. 이는 이전 화면 확인 기록이다. 이번 문서화의 새 검증은 공개 DNS/HTTPS에 한정된다.
6. 음악 6개의 200 응답, audio/mpeg, 한 파일의 바이트 구간 요청 206 및 기존 홈페이지 200을 확인했고 이번에 재검증했다.

## 4. 음악 URL 전체 목록
- `candy_boy.mp3`: https://music.escapezombie.com/candy_boy.mp3
- `candy_girl.mp3`: https://music.escapezombie.com/candy_girl.mp3
- `zaombie_soft2.mp3`: https://music.escapezombie.com/zaombie_soft2.mp3
- `zombie_2nd.mp3`: https://music.escapezombie.com/zombie_2nd.mp3
- `zombie_3rd.mp3`: https://music.escapezombie.com/zombie_3rd.mp3
- `zombie_soft1.mp3`: https://music.escapezombie.com/zombie_soft1.mp3

주의: `zaombie_soft2.mp3`는 버킷의 현재 철자 그대로 유지했다. 임의로 `zombie_soft2.mp3`로 바꾸면 안 된다. URL 목록의 JSON 표현은 `music_urls.json`을 참고한다.

## 5. 재검증 결과
- 6개 파일: HTTPS HEAD 200 및 Content-Type audio/mpeg 모두 통과.
- `zombie_soft1.mp3`: Range bytes=0-15 요청에 206 및 올바른 Content-Range 확인.
- 기존 홈페이지: HTTPS HEAD 200.
- 공개 NS: Cloudflare의 위 두 네임서버 확인.
- 공개 DS: DNS 응답에 DS Answer 없음. 현재 조회 결과이며 DNSSEC 이전 조치/이력 전체를 입증하지 않는다.
- music A/AAAA/CNAME 및 루트 A/AAAA/MX/TXT/CAA 공개 응답은 `verification.json`에 보존했다. 프록시 호스트의 공개 CNAME 조회는 내부 연결 대상을 드러내지 않을 수 있다.
- HTTP Date와 로컬 KST 시각은 같은 순간의 서로 다른 시간대다.

## 6. 검증 재현
```sh
curl -I --max-time 20 https://music.escapezombie.com/candy_boy.mp3
curl -D - -o /dev/null --range 0-15 https://music.escapezombie.com/zombie_soft1.mp3
curl -I --max-time 20 https://escapezombie.com
```
나머지 파일에도 동일 HEAD 검증을 적용한다. 실행 환경에 맞는 null 출력 장치를 사용한다.

## 7. 운영 및 후속 통합
- 버킷 객체 목록에서 각 키를 확인할 수 있고 공개 URL은 위 기본 주소와 객체 키로 구성한다. 버킷 목록 표시와 URL 목록은 별개일 수 있으므로 매핑 JSON을 정본으로 참고한다.
- r2.dev 공개 개발 URL이나 S3 관리 API URL은 이 공개 음악 주소로 쓰지 않는다.
- 객체 교체 시 동일 URL의 CDN/브라우저 캐시가 남을 수 있으므로 버전 키 또는 승인된 캐시 갱신 절차를 검토한다. 이번 작업에서 커스텀 Cache Rules/TTL 정책을 설정했다는 근거는 없다.
- 추후 게임 적용에서는 실제 재생 경로, BGM 전환, 반복, 음량 설정, 모바일 자동재생 제한, 네트워크 장애 fallback을 검증해야 한다.
- fetch/Web Audio를 쓴다면 현재 CORS와 정확한 앱 origin을 확인한 뒤 필요한 최소 범위만 설정한다. 공개 HEAD 성공은 CORS나 게임 재생 통합 완료를 입증하지 않는다. 이번에 CORS 변경은 수행하지 않았다.
- 도메인/네임서버 되돌리기는 홈페이지/메일에 영향을 줄 수 있는 별도 변경이다. 이전 네임서버/전체 레코드의 확정 스냅샷이 없으므로 이 문서로 무조건 원복하지 않는다.

## 8. 미수행 및 한계
게임 코드 연결, 배포, DNS 레코드 전수 이관 감사, 실제 메일 송수신, 모든 지역 전파, 가비아 UI 재확인, DNSSEC 변경 이력 감사, 모든 음악의 끝까지 재생은 수행하지 않았다. 앞선 작업의 확정 기록과 이번 공개 재검증을 구분해 기록했다. 계정 식별자, Cloudflare 계정 전용 URL, API 토큰, 쿠키, OTP, 비밀번호는 포함하지 않았다.

## 9. 파일 구성과 변경 범위
- `README.md`: 전체 작업 문서.
- `music_urls.json`: 음악 6개의 공개 URL 매핑.
- `verification.json`: 이번 DNS/HTTP 원문 응답과 검증 시각.
이 세 문서 파일만 별도 커밋 대상으로 사용하며 기존 코드/모델/가드/기타 미커밋 작업은 포함하지 않는다. 문서는 앱에서 import하지 않으므로 앱 빌드/Android 빌드는 수행하지 않는다.
