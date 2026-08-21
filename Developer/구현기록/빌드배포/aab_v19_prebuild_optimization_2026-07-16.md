# AAB v19 사전 최적화 및 빌드 점검

- 대상 버전: Android `versionCode 19`, `versionName 1.0.10`
- 대상 소스: `release/aab-v19-build`
- 목적: 스테이지 1 스폰 1.3배 및 스테이지 3 체육관 오브젝트 변경을 포함한 AAB 후보 빌드

## 수행 내용

1. `npm ci`로 잠금 파일 기준 의존성을 재설치했다.
2. 변경 부위 집중 테스트 94개를 통과했다.
3. 전체 회귀 테스트 114개 파일, 851개 테스트를 통과했다.
4. `vite build`로 프로덕션 압축, 트리 셰이킹, 기존 청크 분리를 적용했다.
5. `npx cap sync android`로 최신 `dist`를 Android WebView 자산에 동기화했다.

## 성능 진단

- 이번 변경에는 `usePlayingFrame` 내부의 새로운 React 상태 갱신이나 프레임 단위 객체 생성을 추가하지 않았다.
- 스테이지 1 스폰 수 증가는 의도된 부하 증가이므로 실제 저사양 Android 장치에서 장시간 프레임 검증이 필요하다.
- 기존 `Enemies.jsx`의 배열 필터링과 React 목록 렌더링은 장기 최적화 후보지만, 릴리스 직전의 근거 없는 구조 변경은 하지 않았다.
- 프로덕션 빌드는 성공했다. `vendor-three` 청크는 약 2.80 MB( gzip 약 966 KB)로 500 KB 경고 기준을 넘지만 기존 Three.js 중심 구조에 따른 알려진 경고다.

## Android 실행 게이트

- Windows Android SDK의 `adb`는 확인했다.
- 연결된 실제 기기가 없고 생성된 AVD(에뮬레이터 프로필)도 없어 Android WebView 실행 증거는 이 환경에서 확보할 수 없었다.
- 따라서 생성되는 AAB는 서명·해시 검증된 빌드 후보로 취급하며, Play 업로드 전 실제 Android 실행 확인이 별도로 필요하다.
