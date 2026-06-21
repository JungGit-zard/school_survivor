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
- AAB 크기: `7,562,480` bytes

## 서명 확인

- 비공개 테스트용 로컬 업로드 키 생성: 통과
- `android/keystore.properties`, `android/app/upload-keystore.jks`: Git ignore 확인
- 최초 서명 빌드 실패 원인: `keystore.properties` UTF-8 BOM 때문에 Gradle `Properties`가 `storeFile` 키를 읽지 못함
- 조치: `keystore.properties`를 BOM 없는 ASCII로 재저장
- `.\gradlew.bat :app:bundleRelease`: `:app:validateSigningRelease`, `:app:signReleaseBundle` 실행 후 통과
- `jarsigner -verify app-release.aab`: `jar verified`
- 업로드 키 SHA-256 지문: `FE:18:FA:0E:BD:5C:E7:0F:30:04:6F:25:D3:07:5A:65:8A:2C:33:EA:DD:6F:5E:30:0C:85:FB:6E:E5:54:0F:3B`

## 판정

- 비공개 테스트 업로드용 signed AAB 생성 통과.
- 단, Play Console에 이미 같은 패키지명으로 다른 업로드 키가 등록되어 있다면 기존 키로 재서명해야 한다.
