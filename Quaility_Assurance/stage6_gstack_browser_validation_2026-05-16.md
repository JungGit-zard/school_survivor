# Stage 6 gstack Browser Validation - 2026-05-16

## 1. 목적

이 문서는 Escape! zombie school 현재 구현을 실제 브라우저에서 열어 확인한 Stage 6 검증 기록이다.

gstack은 headless browser 기반 검증 도구이며, 여기서는 로컬 Vite 개발 서버를 띄운 뒤 화면 표시, 콘솔 오류, 반응형 화면, 일시정지 동작을 확인했다.

## 2. 실행 환경

- 대상: `Developer/r3f_prototype`
- URL: `http://127.0.0.1:5173/`
- 개발 서버 명령: `npm run dev -- --host 127.0.0.1 --port 5173`
- 브라우저 도구: `C:\Users\admin\.claude\skills\gstack\browse\dist\browse.exe`
- 추가 설치: gstack이 요구한 Playwright Chromium revision `1208`

## 3. 실행한 검증

- `Invoke-WebRequest http://127.0.0.1:5173`
- `browse status`
- `browse goto http://127.0.0.1:5173`
- `browse text`
- `browse console --errors`
- `browse screenshot --viewport`
- `browse viewport 390x844`
- `browse snapshot -i`
- `browse press p`
- `browse responsive`
- `browse network`
- `browse perf`

## 4. 확인 결과

### 4-1. 서버와 초기 로딩

- 로컬 Vite 서버는 `200` 응답을 반환했다.
- 첫 화면 텍스트는 `00:00`, `Lv.1`, `HP100/100`, `연필`, `자OK`, `0`으로 읽혔다.
- 화면에는 플레이어 3D 모델, 바닥 격자, 상단 타이머/레벨, 우상단 골드, 하단 HP/XP UI가 표시됐다.

판정:
- Pass.

### 4-2. 콘솔과 네트워크

- 치명적인 JavaScript 오류는 확인되지 않았다.
- 콘솔에는 WebGL `ReadPixels` GPU stall 성능 경고가 있었다.
- 네트워크 요청은 로컬 개발 서버 기준으로 모두 `200` 또는 캐시성 `304` 응답이었다.

판정:
- 기능 실패는 아님.
- 성능 경고는 Low 리스크로 추적한다.

### 4-3. 모바일 390 x 844 화면

- 게임 화면은 모바일 세로 viewport에 맞춰 표시됐다.
- 상단 타이머, 레벨, 골드 칩은 보였다.
- 하단 HP/XP 바와 `자 OK` 표시는 보였지만 화면 하단에 매우 가깝다.
- `snapshot -i` 결과 접근 가능한 인터랙티브 요소가 없었다.

판정:
- 화면 표시 자체는 Pass.
- 모바일 조작 UI는 Fail risk.

### 4-4. 일시정지

- 키보드 `p` 입력으로 `PAUSED` 모달이 표시됐다.
- 일시정지 상태에서도 접근 가능한 버튼은 없었다.
- 모바일 화면에서 터치로 일시정지하거나 재개할 수 있는 UI는 확인되지 않았다.

판정:
- 키보드 일시정지: Pass.
- 모바일 일시정지 접근성: Fail risk.

### 4-5. 반응형 캡처

- mobile `375x812`: 게임 영역은 꽉 차지만 하단 HUD가 안전 영역에 매우 가깝다.
- tablet `768x1024`: 중앙 390px 게임 프레임 좌우에 검은 여백이 생긴다.
- desktop `1280x720`: 중앙 390px 게임 프레임 좌우에 넓은 검은 여백이 생긴다.

판정:
- 모바일 우선 화면 구조로는 동작한다.
- 태블릿/데스크톱 여백 처리는 의도인지 기획 확인이 필요하다.

## 5. 주요 리스크

### High 1. 모바일 조작 UI 부재

`VirtualJoystick.jsx`가 실제 화면에 연결되지 않았고, gstack `snapshot -i`에서도 조이스틱이나 터치 버튼이 잡히지 않았다. 모바일에서는 이동과 일시정지를 터치로 수행할 방법이 없다.

### High 2. 모바일 일시정지 버튼 부재

키보드 `p`는 동작하지만, 모바일 화면에는 일시정지 버튼과 재개 버튼이 없다. 모바일 사용자는 `PAUSED` 상태 진입 또는 해제를 수행하기 어렵다.

### Medium 1. 하단 HUD 안전 영역 위험

HP/XP 바와 `자 OK` 표시가 화면 하단에 가까워 노치/제스처 바 기기에서 충돌할 수 있다.

### Medium 2. 데스크톱/태블릿 좌우 검은 여백

중앙 390px 고정형 게임 프레임은 모바일 게임 의도에는 맞지만, 큰 화면에서는 좌우 여백이 매우 넓다. 의도된 모바일 전용 프레임인지 확인이 필요하다.

### Low 1. WebGL ReadPixels 성능 경고

스크린샷 또는 WebGL 읽기 과정에서 `GPU stall due to ReadPixels` 경고가 발생했다. 현재 플레이 실패는 아니지만, 성능 QA에서 추적할 수 있다.

## 6. 통과/실패 요약

- 로컬 서버 응답: Pass
- 초기 렌더링: Pass
- 콘솔 치명 오류: Pass
- 네트워크 로딩: Pass
- 키보드 일시정지: Pass
- 모바일 조작 UI: Fail risk
- 모바일 일시정지 접근성: Fail risk
- 하단 안전 영역: Medium risk

## 7. 다음 조치 권장

1. `VirtualJoystick`를 실제 앱 화면에 연결한다.
2. 모바일용 일시정지/재개 버튼을 HUD에 추가한다.
3. 하단 HP/XP, 무기 쿨다운, 조이스틱이 겹치지 않도록 모바일 HUD 배치를 다시 잡는다.
4. 레벨업 모달과 게임오버/클리어 모달 폭을 `390px` 이하 화면에서 잘리지 않게 수정한다.
5. 수정 후 gstack으로 `375x812`, `390x844`, `768x1024`, `1280x720`을 다시 캡처한다.
