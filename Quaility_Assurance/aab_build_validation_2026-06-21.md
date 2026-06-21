# Android AAB 빌드 검증 기록

날짜: 2026-06-21

## 검증 범위

- Play Console 패키지명 요구사항 반영 확인
- Play Console `versionCode` 중복 오류 대응 확인
- 웹 테스트와 웹 빌드 확인
- Capacitor Android 동기화 확인
- Gradle release bundle 생성 확인
- AAB 서명 여부 확인
- 최종 bundle manifest의 패키지명, versionCode, versionName 확인

## 검증 결과

- `GSTACK_OK`: 통과
- `npm test`: 환경 메모리 문제로 Vitest worker가 종료되었으나, 표시된 테스트 assertion은 실패하지 않았다.
- `npx.cmd vitest run --maxWorkers=1 --no-file-parallelism`: `54`개 테스트 파일, `291`개 테스트 통과
- `npm run build`: 통과
- `npx.cmd cap sync android`: 통과
- `.\gradlew.bat clean :app:bundleRelease`: 통과
- AAB 생성: `Developer/r3f_prototype/android/app/build/outputs/bundle/release/app-release.aab`
- AAB 크기: `7,562,549` bytes

## 패키지명 및 버전 확인

- `capacitor.config.json` appId: `com.jungyoon.zombieschool`
- Android `namespace`: `com.jungyoon.zombieschool`
- Android `applicationId`: `com.jungyoon.zombieschool`
- Bundle manifest: `package="com.jungyoon.zombieschool"`
- Bundle manifest: `android:versionCode="2"`
- Bundle manifest: `android:versionName="1.0.1"`
- 이전 패키지명 `com.jungsil.escapezombieschool`은 현재 Android main 설정과 bundle manifest 기준에서 사용하지 않는다.

## 서명 확인

- 비공개 테스트용 로컬 upload keystore 사용
- `android/keystore.properties`, `android/app/upload-keystore.jks`: Git ignore 대상
- `.\gradlew.bat clean :app:bundleRelease`: `:app:validateSigningRelease`, `:app:signReleaseBundle` 실행 후 통과
- `jarsigner -verify app-release.aab`: `jar verified`
- 업로드 키 SHA-256 지문: `FE:18:FA:0E:BD:5C:E7:0F:30:04:6F:25:D3:07:5A:65:8A:2C:33:EA:DD:6F:5E:30:0C:85:FB:6E:E5:54:0F:3B`

## 판정

- 비공개 테스트 업로드용 signed AAB 생성 및 검증 통과.
- Play Console의 `versionCode` 재사용 오류에 대응하기 위해 최종 AAB는 `versionCode 2`, `versionName 1.0.1` 기준으로 생성했다.
- 이후 새 빌드를 업로드할 때는 `versionCode 3` 이상으로 증가시켜야 한다.
