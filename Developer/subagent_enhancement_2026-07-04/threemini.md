# threemini 30분 고도화 결과 — 2026-07-04 18:25 KST

## 범위
- 대상 프로필: `threemini` / durable agent `Three_Mini`
- 작업 유형: 금일 나머지 서브에이전트 30분 self-improvement / capability-hardening 1회차
- 코드 변경/커밋/배포/외부 메시지: 수행하지 않음

## 읽은 핵심 자료
- `project_develop_policy.md`
- `Bang_Rules.md`
- `Graphic_designer/Bang_survivor_Graphic_concept.md`
- `Developer/GOOGLE_SIGN_IN_MAINTENANCE_CHECKLIST_AI_AGENT_READY.md`
- `Developer/r3f_prototype/src/lib/firebaseAuth.js`
- `Developer/r3f_prototype/src/store/useAuthStore.js`
- `Developer/r3f_prototype/src/components/GoogleAccountPanel.jsx`
- `Developer/r3f_prototype/src/components/GoogleAccountPanel.test.jsx`
- `Developer/r3f_prototype/src/lib/toon.js`

## 도메인 전수 요약: Google Sign-In 체크리스트를 그래픽/3D 운영 관점에 통합
쓰리미니는 인증 자체 구현 담당이 아니지만, 로그인 실패/지연은 게임 첫 화면과 3D 렌더링 루프 체감 품질에 직접 영향을 준다. 따라서 Google 로그인 점검 시 다음을 그래픽 작업의 운영 준비도 기준에 추가한다.

1. **무한 스피너 금지**
   - 체크리스트 P3-03과 연결: 로그인 호출이 10~30초 이상 지속되면 UI가 무한 대기처럼 보이면 안 된다.
   - 그래픽/UX 관점에서는 3D Canvas, HUD, 로딩 오버레이가 계속 반응하고, 사용자가 게스트 진행/재시도/닫기를 이해할 수 있어야 한다.

2. **중복 호출/버튼 연타 가드**
   - 체크리스트 P3-06과 연결: `signingIn` 상태에서 버튼 disabled 처리는 현재 UI에 존재한다.
   - 향후 3D 메뉴/카툰 버튼으로 교체해도 이 가드를 제거하면 안 된다.

3. **초기 자동 확인과 인터랙티브 로그인 분리**
   - 체크리스트 P3-04와 연결: 앱 시작 시 저장된 로그인 확인(`checking`)과 사용자가 누르는 로그인 액션을 시각적으로 구분한다.
   - `checking` 중에는 무거운 후처리/전체화면 blocking 연출보다 작고 명확한 패널 상태를 유지하는 편이 모바일 안정성에 유리하다.

4. **오류 메시지와 상태의 시각적 가독성**
   - 체크리스트 P3-05/P2/P1과 연결: SHA/OAuth/Web Client ID 문제는 그래픽 에이전트가 해결하지 않더라도, `error` 텍스트가 작거나 잘려 진단 불가능해지면 QA 비용이 증가한다.
   - 현재 `GoogleAccountPanel`은 좁은 패널에서 detail을 ellipsis 처리한다. 출시 전 QA에서는 긴 Firebase/Auth 오류가 사용자에게 어떻게 보이는지 별도 확인이 필요하다.

5. **3D 카툰 렌더링 불변 조건과 Auth UI의 공존**
   - 인증 패널/오버레이를 고도화하더라도 플레이어/몬스터는 `MeshToonMaterial` 또는 동등 toon shader + 외곽선 + 실제 좌표 일치를 유지해야 한다.
   - 로그인 실패 대응 UI를 캐릭터/몬스터 2D 스프라이트 대체나 디버그 프록시 도형으로 우회하지 않는다.

## 현재 코드 기준 빠른 점검
- `firebaseAuth.js`: Firebase Web SDK `GoogleAuthProvider` + `signInWithPopup` 경로 사용. Android 네이티브 PGS/Credential Manager 경로가 아니라 웹/Firebase 중심이다.
- `useAuthStore.js`: `signingIn` 상태와 catch 후 error 상태는 있음. 다만 별도 timeout wrapper는 보이지 않는다.
- `GoogleAccountPanel.jsx`: `status === checking`, `unconfigured`, `error`, `signingIn` 표시와 버튼 disabled가 있음.
- `GoogleAccountPanel.test.jsx`: 미설정/로그인 가능/로그인 완료 표시 테스트는 있음. `signingIn` disabled, `error` 표시, 긴 오류 문구 가독성 테스트는 보강 여지가 있다.
- `toon.js`: 현재 3D 카툰 렌더링은 `MeshToonMaterial` + stepped gradient + stencil inverted-hull outline + 리소스 캐시/HMR dispose 경로가 있어 프로젝트 그래픽 정책과 정렬되어 있다.

## 발견 리스크
- **HIGH**: 로그인 호출 timeout/재시도/게스트 진행 안내가 코드상 명시적으로 보이지 않는다. 체크리스트 P3-03 기준 출시 전 백엔드/UI 담당과 공동 보강 필요.
- **MEDIUM**: `GoogleAccountPanel` detail은 한 줄 ellipsis라 긴 Auth 오류를 QA/운영자가 그대로 보기 어렵다. 개발/QA 모드 또는 확장 영역에서 원문 오류 확인 경로가 필요하다.
- **MEDIUM**: 향후 Google 로그인 패널을 3D/카툰 UI로 바꿀 때 `signingIn` disabled, `checking` 비차단 상태, error 표시를 시각 스타일 변경 중 잃을 위험이 있다.
- **LOW**: Google 계정 사진(`photoURL`)은 외부 이미지 로딩 실패/느림 가능성이 있으므로 레이아웃 흔들림 없이 fallback `G`가 유지되는지 브라우저 스크린샷으로 확인하면 좋다.

## 쓰리미니 운영 체크리스트 추가안
- Auth/계정 화면을 만질 때는 `Developer/GOOGLE_SIGN_IN_MAINTENANCE_CHECKLIST_AI_AGENT_READY.md`의 P3-03, P3-05, P3-06을 먼저 확인한다.
- 3D/HUD 시각 작업 검증 시 `GoogleAccountPanel`의 `checking`, `signingIn`, `error`, `signedIn`, `unconfigured` 상태 스냅샷을 포함한다.
- 로그인 지연/실패 상태에서도 Canvas DPR cap, toon/outline stack, 게임 HUD 반응성, 버튼 disabled 상태가 유지되는지 확인한다.

## 다음 권장 작업
1. UI/Backend 담당과 함께 `signInWithGoogle`에 10~30초 timeout, 사용자 재시도/게스트 진행 안내, 원문 error code 로깅 정책을 추가한다.
2. `GoogleAccountPanel.test.jsx`에 `signingIn` disabled와 `error` 표시 테스트를 추가한다.
3. 브라우저 스크린샷 QA에 Google 계정 패널 5상태(`unconfigured/checking/signingIn/error/signedIn`)를 포함한다.
