# LaunchMini AAB v51 / 35ef77c3 Release-Readiness Report

작성일: 2026-08-31
담당: launchmini
범위: Google Play 업로드 후보 AAB 생성 및 정적 검증. Play Console 제출/업로드는 수행하지 않음.

## 결론

- 판정: 내부 테스트 업로드 후보로 조건부 GREEN.
- 프로덕션/global rollout 판정: No-Go. Terry의 명시 지시 없이 프로덕션 제출 또는 global rollout을 진행하면 안 됨.
- 미검증 범위: Play Console 실제 업로드 화면, 내부 테스트 배포 후 실기기 설치/로그인, Android WebView 시각/오디오 런타임 검증은 아직 직접 확인하지 못했으므로 별도 GREEN 필요.

## 업로드 후보 AAB

고유 업로드 파일명:

`D:/JungSil/2.Minigame_project/school_survivor-integration/Developer/r3f_prototype/android/app/build/outputs/bundle/release/app-release-v51-20260831_0023-35ef77c38748.aab`

원본 빌드 산출물:

`D:/JungSil/2.Minigame_project/aabv50_35ef77c3_clean/Developer/r3f_prototype/android/app/build/outputs/bundle/release/app-release.aab`

파일 동일성:

- SHA-256: `cb28f09aed939d64f6dfb2de1445f08ce6271efb6f85f7c7bd6963c9db63b2af`
- 크기: `15,615,490 bytes`
- 고유 후보 생성시각: `2026-08-31 00:23:50 +0900`
- PRE/POST 분리: 새 POST 후보를 `app-release-v51-20260831_0023-35ef77c38748.aab`로 복사해 기존 `app-release.aab`와 혼동하지 않도록 분리함.

## 버전/매니페스트

정적 검증 결과:

- package: `com.jungyoon.zombieschool`
- versionCode: `51`
- versionName: `1.0.26`
- minSdk: `24`
- targetSdk: `36`

## 검증 PASS 목록

`Developer/agent_room/aab_v51_35ef77c3_evidence_2026-08-31/16_marker_summary.json` 기준 전 항목 PASS:

- bundletool validate exit 0
- AndroidManifest package/version/minSdk/targetSdk 확인
- resources 내 `default_web_client_id`, `google_app_id`, `project_id` 존재 확인
- jarsigner verify PASS
- zip integrity test PASS
- Firebase project/auth domain/Realtime DB marker 확인
- API key 존재 확인은 redacted 방식으로만 수행
- GoogleAuthProvider / signInWithGoogle / signInWithCredential marker 확인
- native FirebaseAuthentication plugin marker 확인
- `skipNativeAuth: true` marker 확인
- google provider marker 확인
- title BGM exact marker 확인

## Google 로그인 / Firebase 관찰값

정적 번들 내부 marker 기준:

- Firebase JS entry: `base/assets/public/assets/firebaseAuth-BwXnVWBo.js`
- index JS entry: `base/assets/public/assets/index-BT4ef6KM.js`
- native bridge asset: `assets/native-bridge.js`
- Capacitor config/plugin asset 포함 확인
- 업로드 인증서 라인 확인:
  - SHA1: `6F:06:BA:57:9D:08:BA:A0:98:AF:26:A5:3C:49:9B:54:0A:05:76:51`
  - SHA256: `FE:18:FA:0E:BD:5C:E7:0F:30:04:6F:25:D3:07:5A:65:8A:2C:33:EA:DD:6F:5E:30:0C:85:FB:6E:E5:54:0F:3B`

주의: 위 항목은 AAB 정적 검증이며, 실제 Google 계정 로그인 성공은 내부 테스트 설치 후 Android 실기기에서 별도 확인해야 함.

## 오디오 자산 관찰값

- title BGM entry: `base/assets/public/assets/title_bgm-BMjuXxkY.m4a`
- size: `998,122 bytes`
- SHA-256: `991bf9871fe70b55852920390b3b1434892cfc50da79d3e8fd900062b191cffe`

주의: Android WebView에서의 실제 재생/음량/반복/첫 터치 정책은 미검증.

## 산출물/증거 위치

메인 워크스페이스에 복사한 증거 폴더:

`D:/JungSil/2.Minigame_project/school_survivor-integration/Developer/agent_room/aab_v51_35ef77c3_evidence_2026-08-31/`

주요 증거 파일:

- `00_pre_existing_aab_info.txt`
- `01_build_gradle_before.txt`
- `02_git_status_before.txt`
- `03_gate_recheck_after_domain_change.txt`
- `04_build_log.txt`
- `05_post_aab_info.txt`
- `06_bundletool_validate.txt`
- `07_manifest_dump.txt`
- `08_resources_dump.txt`
- `09_bundle_dump.txt`
- `10_jarsigner_verify.txt`
- `11_zip_test.txt`
- `12_sha256_size_final.txt`
- `13_bundle_assets_list.txt`
- `14_unzipped_marker_checks.txt`
- `15_post_build_gradle_and_git.txt`
- `16_marker_summary.json`
- `17_unique_candidate_info.txt`
- `18_final_preupload_revalidation.txt`
- required-documents read receipts `read_*`

## Play Console 업로드 전 체크리스트

1. Play Console의 내부 테스트 트랙에서만 시작한다.
2. 업로드 파일은 반드시 아래 고유 파일 하나만 선택한다.
   - `app-release-v51-20260831_0023-35ef77c38748.aab`
3. 업로드 직전 SHA-256과 크기를 다시 확인한다.
   - SHA-256: `cb28f09aed939d64f6dfb2de1445f08ce6271efb6f85f7c7bd6963c9db63b2af`
   - 크기: `15,615,490 bytes`
4. Play Console이 표시하는 versionCode가 `51`, versionName이 `1.0.26`인지 확인한다.
5. 내부 테스트 릴리스 노트에는 Google 로그인/Firebase/타이틀 BGM 검증 목적을 명시한다.
6. 릴리스 생성 후 내부 테스트 계정으로 실제 Android 기기에 설치한다.
7. 실기기 GREEN 기준:
   - 앱 설치/실행 성공
   - 타이틀 화면 표시
   - Google 로그인 버튼 동작
   - Google 계정 선택 및 Firebase credential 완료
   - 로그인 후 게임 진입/세션 유지
   - 타이틀 BGM 재생 또는 사용자 제스처 후 재생 정책 확인
   - 주요 화면 WebView 레이아웃/텍스트/버튼 터치 확인
8. 실기기 GREEN 전에는 비공개 테스트 확대, 공개 테스트, 프로덕션/global rollout 금지.

## 리스크 게이트

- Play Console 업로드 미검증: 아직 실제 콘솔 업로드 결과를 보지 않았으므로 업로드 성공으로 보고하면 안 됨.
- Android 실기기 Google 로그인 미검증: 정적 marker가 있어도 OAuth/Firebase 콘솔 설정 또는 Play App Signing 인증서 설정 문제는 런타임에서만 드러날 수 있음.
- Android WebView 시각/오디오 미검증: 번들 포함만으로 UI/BGM 해결 선언 금지.
- 프로덕션/global 신중 원칙: Terry의 명시 지시 없이는 제출하지 말고 내부 테스트 검증을 먼저 완료해야 함.

## 권장 다음 단계

1. Terry 승인 후 Play Console 내부 테스트 트랙에 고유 AAB 업로드.
2. Play Console 업로드 결과 화면과 versionCode/versionName 스크린샷/메모 확보.
3. 내부 테스트 링크로 Android 실기기 설치.
4. Google 로그인/Firebase/타이틀 BGM/핵심 UI를 RED-GREEN 체크리스트로 검증.
5. 결과를 `CEO/` 또는 `Planner/Admin_Page_Planning/`의 릴리스 운영 문서에 반영.
