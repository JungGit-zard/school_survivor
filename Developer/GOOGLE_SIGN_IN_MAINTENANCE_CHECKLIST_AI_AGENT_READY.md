# Google Sign-In 이슈 방지·유지보수 점검 체크리스트 (AI Agent Ready)

> 문서 목적: 게임에서 Google 계정 로그인(Google Play Games Services / Google Sign-In / Firebase Auth)이 지연되거나 진행되지 않는 이슈를 예방·진단·유지보수하기 위한 순차 점검 리스트.
> 근거 소스: Google 공식 문서(Firebase Troubleshooting FAQ), playgameservices/play-games-plugin-for-unity GitHub Issues (#1834, #2107, #2834 등), Unity Discussions, react-native-firebase / flutterfire GitHub Discussions에서 반복 보고된 실제 사례 패턴.
> 대상 Agent: CI/CD 파이프라인, 빌드 검증, 릴리스 전 QA, 운영 모니터링을 수행하는 AI 개발 에이전트.

---

## AGENT_INSTRUCTIONS (에이전트 실행 규칙)
execution_mode: sequential          # 반드시 PHASE 순서대로 실행
on_check_fail:
  - severity가 CRITICAL이면 즉시 중단하고 REMEDIATION 수행 후 해당 PHASE 재실행
  - severity가 HIGH이면 리포트에 기록하고 REMEDIATION 수행, 계속 진행
  - severity가 MEDIUM/LOW이면 리포트에 기록만 하고 계속 진행
output_format:
  - 각 체크 항목마다 {check_id, status: PASS|FAIL|SKIP|N/A, evidence, remediation_applied} 기록
  - 최종적으로 PHASE별 요약 테이블 생성
skip_rule: 사용하지 않는 스택(예: Firebase 미사용)의 항목은 SKIP 처리하고 사유 기록

---

## PHASE 0 — 사전 정보 수집 (Context Gathering)

| Check ID | 항목 | 확인 방법 |
|---|---|---|
| P0-01 | 사용 스택 식별 | Play Games Services v1/v2, Google Sign-In SDK(GoogleSignInClient — deprecated), Credential Manager, Firebase Auth 중 무엇을 쓰는지 코드/의존성에서 확인 |
| P0-02 | 플러그인/SDK 버전 수집 | build.gradle, `Packages/manifest.json`(Unity), `pubspec.yaml`(Flutter), `package.json`(RN)에서 버전 추출 |
| P0-03 | 서명 체계 확인 | Play App Signing 사용 여부 확인 (사용 시 SHA 관리 방식이 완전히 달라짐 — 가장 흔한 사고 원인) |
| P0-04 | 배포 트랙 확인 | 로컬 빌드 / Internal Testing / Closed Beta / Production 중 어디서 문제가 발생하는지 매트릭스화 |

---

## PHASE 1 — 인증 자격 증명·서명 정합성 (CRITICAL)

배경: 커뮤니티 보고 사례의 최다 원인. "로컬 빌드는 되는데 스토어 다운로드 빌드는 로그인 팝업이 뜨다가 조용히 실패"하는 패턴은 거의 전부 SHA-1 불일치.

- [ ] P1-01 (CRITICAL) 실제 유저에게 배포되는 아티팩트의 SHA-1/SHA-256 추출
  - 방법: Play Console → 최신 릴리스 → App Bundle 탐색기 → APK 다운로드 → apksigner verify --print-certs <apk> 실행. 업로드 키가 아니라 **Play App Signing이 재서명한 키**가 실제 배포 서명임.
- [ ] P1-02 (CRITICAL) 다음 3곳(또는 4곳)의 SHA-1 일치 검증
  1. Play Console → 설정 → 앱 서명 → 앱 서명 키 인증서 SHA-1
  2. Google Cloud Console → 사용자 인증 정보(OAuth 2.0 클라이언트 ID)의 SHA-1
  3. Firebase 사용 시: Firebase Console → 프로젝트 설정 → 내 앱 → SHA 인증서 지문 (앱 서명 키 + 업로드 키 + 디버그 키 모두 등록)
  4. Play Games Services 사용 시: Play Console → Play Games Services 구성의 OAuth 클라이언트
- [ ] P1-03 (CRITICAL) 디버그/업로드/앱서명 3종 키의 SHA가 각각 등록되어 있는지 확인 (하나만 등록하면 특정 배포 경로에서만 실패)
- [ ] P1-04 (HIGH) 패키지명(applicationId)이 OAuth 클라이언트·Firebase 앱·Play Console과 완전 일치하는지 확인 (`.debug` suffix 빌드 변형 포함)
- [ ] P1-05 (HIGH) OAuth 클라이언트 중복 충돌 확인: 동일 패키지명+SHA-1 조합이 다른 Google Cloud/Firebase 프로젝트에 존재하면 클라이언트 생성이 실패함. 중복 시 미사용 프로젝트에서 삭제하거나, Firebase Auth의 "외부 프로젝트 클라이언트 ID 허용 목록"에 추가.
- [ ] P1-06 (HIGH) Web Client ID(서버 인증용) 확인: requestIdToken() / requestServerAuthCode()`에 **Android 클라이언트 ID가 아닌 Web 애플리케이션 타입 클라이언트 ID**를 넣었는지 검증 (넣지 않으면 `DEVELOPER_ERROR(10) 또는 무한 대기)
- [ ] P1-07 (MEDIUM) google-services.json / GoogleService-Info.plist가 최신인지 확인 (SHA 추가 후 재다운로드 필수)

REMEDIATION: 불일치 발견 시 → 배포 아티팩트에서 추출한 실제 SHA를 기준으로 모든 콘솔에 등록 → 설정 파일 재다운로드 → 재빌드 → 전파 지연 고려하여 30분~수 시간 후 재검증.

---

## PHASE 2 — 콘솔·프로젝트 구성 (CRITICAL~HIGH)

- [ ] P2-01 (CRITICAL) OAuth 동의 화면(Consent Screen) 상태 확인: 게시 상태가 "테스트 중"이면 테스트 사용자 목록에 없는 계정은 로그인 불가/무한 루프. 프로덕션 전 반드시 "프로덕션" 게시.
- [ ] P2-02 (CRITICAL) OAuth 동의 화면에 지원 이메일 등록 여부 (누락 시 sign-in 실패의 공식 문서화된 원인)
- [ ] P2-03 (HIGH) Play Games Services 구성 상태: 게임 서비스 프로젝트가 "게시됨" 상태인지, 아니면 초안이라 테스터 계정만 되는지 확인
- [ ] P2-04 (HIGH) 테스터 계정 등록: Play Console PGS 테스터 목록 + OAuth 테스트 사용자 목록 양쪽 모두 확인 (한쪽만 등록해서 실패하는 사례 다수)
- [ ] P2-05 (HIGH) 필요한 API 활성화 확인: Google Play Games Services API, Google People API(프로필 요청 시) 등이 Cloud 프로젝트에서 Enabled인지
- [ ] P2-06 (MEDIUM) Firebase Auth Sign-in Provider에서 Google(및 Play Games) 제공업체가 활성화되어 있는지
- [ ] P2-07 (MEDIUM) 요청 스코프 최소화: 불필요한 민감 스코프 요청 시 추가 동의 화면·검증 절차로 로그인 흐름이 길어지고 이탈 발생

---

## PHASE 3 — 클라이언트 코드·SDK 구현 (HIGH)

- [ ] P3-01 (HIGH) Deprecated API 사용 여부 스캔: `GoogleSignInClient`/`GoogleApiClient`는 지원 종료 경로. Android는 Credential Manager + Sign in with Google, 게임은 Play Games Services v2 (GamesSignInClient) 로 마이그레이션 계획 수립
- [ ] P3-02 (HIGH) 플러그인 버전 회귀 이슈 확인: 특정 플러그인 버전이 특정 OS 버전에서 무한 로딩을 유발한 전례 있음(예: Unity 플러그인 0.10.x가 Android 9/10에서 실패, 0.9.64로 롤백 시 정상 — GitHub #2834). 사용 버전의 GitHub Issues에서 open된 sign-in 관련 이슈 검색을 정기 작업으로 등록
- [ ] P3-03 (HIGH) 타임아웃·재시도 로직 존재 여부: 로그인 호출에 타임아웃(권장 10~30초)을 걸고, 실패/타임아웃 시 (a) 지수 백오프 재시도 1~2회, (b) 그래도 실패 시 게스트 진행 또는 수동 재시도 UI 제공. "무한 스피너"는 커뮤니티 최다 불만 패턴 — 절대 UI를 블로킹 상태로 방치하지 말 것
- [ ] P3-04 (HIGH) Silent Sign-In 우선 전략: 앱 시작 시 자동/무음 로그인 시도 → 실패 시에만 인터랙티브 로그인. 매 실행마다 인터랙티브 팝업을 띄우는 구현은 지연·루프 체감의 주원인
- [ ] P3-05 (HIGH) 에러 코드 로깅: `ApiException.statusCode`(예: 10=DEVELOPER_ERROR, 12500=SIGN_IN_FAILED, 12501=CANCELED, 12502=IN_PROGRESS, 7=NETWORK_ERROR)를 원문 그대로 분석 도구로 전송하는지 확인. 코드 없는 "로그인 실패" 로그는 진단 불가
- [ ] P3-06 (MEDIUM) 중복 호출 방지: 로그인 진행 중 재호출 차단(12502 IN_PROGRESS 방지), 버튼 연타 가드
- [ ] P3-07 (MEDIUM) Activity 생명주기 처리: `onActivityResult`/콜백 누락, 화면 회전·프로세스 킬 후 결과 유실 여부 점검
- [ ] P3-08 (MEDIUM) ProGuard/R8 규칙: 릴리스 빌드에서만 실패한다면 난독화가 GMS/Firebase 클래스를 제거했는지 확인 (`-keep` 규칙 검증)
- [ ] P3-09 (MEDIUM) 메인 스레드 블로킹 금지: 토큰 교환·네트워크 호출이 UI 스레드에서 동기 실행되지 않는지 확인
- [ ] P3-10 (LOW) 토큰 만료 처리: ID 토큰(약 1시간) 만료 시 자동 갱신 경로 존재 여부

---

## PHASE 4 — 디바이스·환경 요인 (MEDIUM)

배경: 개발자 설정이 완벽해도 유저 디바이스 환경 때문에 실패하는 사례군. 지원 응대·인앱 안내로 대응.

- [ ] P4-01 Google Play Services / Play Games 앱 버전 체크: GoogleApiAvailability.isGooglePlayServicesAvailable() 호출 후 구버전이면 업데이트 유도 다이얼로그 표시 로직 존재 확인
- [ ] P4-02 특정 OS 버전 편중 확인: 크래시/실패 로그를 OS 버전별로 집계하는 대시보드 존재 여부 (Android 특정 버전에만 몰리면 플러그인/GMS 측 버그 가능성 — 벤더 이슈 트래커 확인)
- [ ] P4-03 다중 계정 이슈: 기기에 여러 Google 계정이 있을 때 특정 계정만 루프에 빠지는 사례 존재. 계정 선택기 강제 표시 옵션 및 "계정 데이터 초기화" 안내 문구 준비
- [ ] P4-04 유저 셀프 해결 가이드 문서화: Play 서비스/Play Games 캐시·데이터 삭제, 기기 재부팅, 계정 재추가, 날짜/시간 자동 설정 — 지원 페이지에 게시
- [ ] P4-05 네트워크 제약 환경: 방화벽/일부 국가·기업망에서 accounts.google.com, www.googleapis.com 차단 시의 에러 메시지 분기 존재 여부
- [ ] P4-06 에뮬레이터/커스텀 ROM: GMS 미탑재 기기(일부 중국 제조사 등) 감지 시 대체 로그인(게스트/이메일) 제공 여부

---

## PHASE 5 — 빌드·배포 파이프라인 (HIGH)

- [ ] P5-01 (HIGH) 배포 경로별 로그인 테스트 매트릭스 실행: {로컬 debug, 로컬 release, Internal Testing, Closed/Open Testing, Production} × {신규 계정, 기존 계정, 다중 계정 기기} — 릴리스마다 최소 1회
- [ ] P5-02 (HIGH) CI에서 SHA 자동 검증: 빌드 산출물의 서명 SHA를 추출해 등록된 SHA 목록과 자동 대조하는 스텝 추가 (사람 손으로 하다 놓치는 것이 사고의 근원)
- [ ] P5-03 (MEDIUM) google-services.json이 빌드 변형(flavor)별로 올바른 파일이 포함되는지 CI에서 검증
- [ ] P5-04 (MEDIUM) 키스토어 변경/이관 절차 문서화: 키 로테이션 시 모든 콘솔 SHA 갱신 체크리스트 연동
- [ ] P5-05 (LOW) 스토어 반영 지연 인지: Play Console 설정 변경 후 전파에 수 분~수 시간 걸릴 수 있음을 테스트 절차에 명시

---

## PHASE 6 — 운영 모니터링·유지보수 (지속 실행)

- [ ] P6-01 로그인 퍼널 지표 수집: 시도→성공 전환율, 단계별 소요 시간(p50/p95), 에러 코드 분포를 대시보드화. 성공률 95% 미만 또는 p95 지연 10초 초과 시 알림 임계값 설정
- [ ] P6-02 릴리스 후 24~72시간 집중 모니터링: 신규 버전 배포 직후 로그인 실패율 급증 여부 감시 (플러그인 업데이트 회귀 조기 탐지)
- [ ] P6-03 외부 장애 감시: Google Cloud Status Dashboard, Firebase Status를 알림 연동 (서버 측 장애 시 유저 공지 자동화)
- [ ] P6-04 벤더 이슈 트래커 정기 스캔(주 1회 권장): playgameservices/play-games-plugin-for-unity Issues, firebase/flutterfire Issues, invertase/react-native-firebase Discussions, Google Issue Tracker에서 "sign-in", "stuck", "loop", "DEVELOPER_ERROR" 키워드 검색
- [ ] P6-05 스토어 리뷰 키워드 모니터링: "로그인 안됨", "무한 로딩", "sign in" 등 리뷰 자동 분류 → 급증 시 알림
- [ ] P6-06 SDK/플러그인 업데이트 정책: deprecated 공지·지원 종료 일정 추적, 업데이트는 스테이징에서 로그인 매트릭스(P5-01) 통과 후에만 반영
- [ ] P6-07 계정 연동 복구 경로: 로그인 실패 유저가 진행 데이터를 잃지 않도록 게스트→Google 계정 연동/병합 플로우 및 CS 복구 절차 유지

---

## APPENDIX A — 증상별 빠른 진단 트리 (Agent 분기용)

증상: 로그인 팝업이 뜨다가 조용히 닫힘 / statusCode 10 (DEVELOPER_ERROR)
 → PHASE 1 전체 실행 (SHA/패키지명/Web Client ID 불일치 확률 최상)

증상: 로컬 빌드 OK, 스토어 다운로드 빌드만 실패
 → P1-01, P1-02 (Play App Signing 재서명 SHA 미등록)

증상: 특정 계정만 무한 루프
 → P4-03 (다중 계정), P2-04 (테스터 미등록), 유저에게 P4-04 가이드 제공

증상: 특정 OS 버전에서만 무한 스피너
 → P3-02 (플러그인 회귀), P6-04 (벤더 이슈 확인), 필요 시 검증된 구버전 롤백

증상: 개발자 본인은 OK, 일반 유저만 실패
 → P2-01 (동의 화면 테스트 모드), P2-03 (PGS 미게시)

증상: 전 유저 동시 다발 실패
 → P6-03 (Google 측 장애), 토큰/인증서 만료 확인

증상: 로그인은 되지만 5~30초 지연
 → P3-04 (silent sign-in 미사용), P3-09 (메인 스레드 블로킹), P2-07 (과다 스코프), 네트워크 p95 측정

## APPENDIX B — 주요 참고 소스

- Firebase Android Troubleshooting FAQ (SHA/지원 이메일/중복 OAuth 클라이언트 공식 해설): firebase.google.com/docs/android/troubleshooting-faq
- 중복 OAuth2 클라이언트 해결 가이드: support.google.com/firebase/answer/6401008
- Unity 플러그인 이슈 저장소(대표 사례 #1834 SHA 불일치, #2107 무한 루프, #2834 OS 버전 회귀): github.com/playgameservices/play-games-plugin-for-unity/issues
- 배포 아티팩트 실제 SHA 추출법(`apksigner verify --print-certs`): github.com/invertase/react-native-firebase/discussions/7293
- Unity Discussions: discussions.unity.com (google play games sign-in 태그)
