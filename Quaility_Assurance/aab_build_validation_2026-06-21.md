# Android AAB 빌드 검증 기록

날짜: 2026-06-21

## 검증 범위

- 원격 브랜치 최신 상태 확인
- 상어미사일 최신 조정 반영 확인
- 웹 테스트 및 웹 빌드 확인
- Capacitor Android 동기화 확인
- Gradle release bundle 생성 확인
- AAB 서명 여부 확인

## 검증 결과

- `GSTACK_OK`: 통과
- `git pull --ff-only`: 이미 최신 상태
- 상어미사일 관련 테스트: `2`개 파일, `23`개 테스트 통과
- `npm test`: `54`개 파일, `291`개 테스트 통과
- `npm run build`: 통과
- `npx.cmd cap sync android`: 통과
- `.\gradlew.bat :app:bundleRelease`: 통과
- AAB 생성: `Developer/r3f_prototype/android/app/build/outputs/bundle/release/app-release.aab`
- AAB 크기: `7,533,232` bytes

## 서명 확인

- `jarsigner -verify -verbose -certs app-release.aab`: `jar is unsigned`
- 원인: `android/keystore.properties`, `android/app/upload-keystore.jks`가 현재 워크스페이스에 없음

## 판정

- 빌드 산출물 생성은 통과.
- Play Console 업로드용 signed AAB 생성은 서명 키 부재로 추가 작업 필요.
