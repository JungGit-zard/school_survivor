# Google Play 내부테스트 Android 빌드 검증 기록

## 검증 목표

- Google Play 내부테스트에 업로드할 수 있는 Android App Bundle이 생성되는지 확인한다.
- 웹 게임 테스트와 Android release bundle 빌드가 통과하는지 확인한다.
- 서명 키와 비밀번호 파일이 Git에 포함되지 않는지 확인한다.

## 검증 결과

- `npm.cmd run build`: 통과.
- `npx.cmd cap add android`: Android 프로젝트 생성 및 웹 자산 복사 성공.
- `.\gradlew.bat :app:bundleRelease`: 통과.
- `jarsigner -verify`: `jar verified` 확인.
- `npm.cmd test -- --run`: 통과, 28개 파일 / 170개 테스트.
- `git check-ignore`: `keystore.properties`, `local.properties`, `upload-keystore.jks`, `app-release.aab`가 ignore 처리됨을 확인.

## 산출물

- `Developer/r3f_prototype/android/app/build/outputs/bundle/release/app-release.aab`
- 파일 크기: 약 6.47 MB.

## 남은 주의점

- Play Console에 최초 업로드하면 패키지명은 고정된다.
- 업로드 키와 `keystore.properties`는 업데이트 빌드에 필요하므로 별도 백업이 필요하다.
- 현재 Android 아이콘/스플래시는 Capacitor 기본 리소스다.
