# Graphics Studio MVP Workflow / Backend Boundary - 2026-07-15

## 결론

Stage 1 모바일 루프가 안정화될 때까지 Graphics Studio 설정은 **로컬 개발/운영 도구 전용 localStorage 상태**로 유지한다. Google 계정, Firebase Realtime Database, 공개 랭킹, 일반 플레이어 진행도와 연결하지 않는다.

현재 코드 기준 Graphics Studio는 "드래그/입력 즉시 로컬 저장 + 연결된 게임 창에 라이브 동기화" 방식이다. `Apply`는 별도 승인/서버 저장 버튼이 아니라, 연결 게임 창을 열고 현재 저장된 전체 스튜디오 상태를 다시 보내는 명시적 동기화/확인 버튼으로 정의한다.

## 현재 구현 확인

관련 파일:

- `Developer/r3f_prototype/src/components/GraphicsStudio.jsx`
- `Developer/r3f_prototype/src/lib/graphicsStudioConfig.js`
- `Developer/r3f_prototype/src/components/StudioTunedGroup.jsx`
- `Developer/r3f_prototype/src/App.jsx`
- `Developer/r3f_prototype/src/lib/studioGameBridge.js`

현재 저장 키:

- `escape-zombie-school.graphicsStudioTunings.v1`
- `escape-zombie-school.graphicsStudioResetBaseline.2026-07-05T17`
- `escape-zombie-school.stageBossPreview.v1`
- `escape-zombie-school.textureDecals.v1`
- SFX/Props는 별도 localStorage 키 사용

현재 런타임 흐름:

1. Graphics Studio 슬라이더/숫자 입력/색상/모션 변경
2. `saveStudioTunings()`가 localStorage에 즉시 저장
3. 같은 origin 게임 런타임은 `GRAPHICS_STUDIO_TUNING_EVENT`/storage 이벤트로 반영
4. 연결된 별도 게임 창이 있으면 `postMessage(STUDIO_GAME_SYNC_MESSAGE)`로 상태 전송
5. 게임 창은 `handleStudioGameSyncMessage()`에서 origin allowlist를 확인한 뒤 localStorage에 저장
6. `StudioTunedGroup`이 저장된 튜닝/파트 튜닝/데칼을 실제 3D 런타임에 적용

현재 테스트도 이 동작을 기준으로 되어 있다.

- `GraphicsStudio.test.jsx`: `applies transform slider changes to the game immediately`, `connects to a typed game URL and mirrors live tuning changes into that game window`, `opens the game and synchronizes the full saved studio state when Apply is pressed`
- `StudioTunedGroup.test.jsx`: 저장 이벤트 발생 시 게임 그룹이 즉시 갱신됨
- `App.virtualJoystick.test.jsx`: 스튜디오 sync message를 게임 origin storage에 반영

## MVP 정책

### 1. 저장 범위

MVP에서는 다음을 유지한다.

- 저장 위치: 브라우저 localStorage
- 접근 대상: 개발자/운영자 로컬 브라우저
- 배포 성격: dev tool / tuning scratchpad
- Firebase 저장: 하지 않음
- Google 계정별 저장: 하지 않음
- 일반 유저 클라우드 진행도에 포함: 하지 않음
- 공개 랭킹/보상/유료 재화 판정에 사용: 하지 않음

이유:

- Graphics Studio 설정은 게임 밸런스/비주얼 튜닝 권한에 해당하므로 일반 계정 데이터로 취급하면 안 된다.
- localStorage는 사용자가 언제든 조작 가능하므로 신뢰 가능한 서버 상태가 아니다.
- Stage 1 우선순위는 모바일 플레이 루프 안정화이며, 계정/멀티/서버 운영은 현재 defer 대상이다.
- Firebase에 올릴 경우 운영자 권한 모델, 승인/배포 흐름, 감사 로그, 충돌 정책이 먼저 필요하다.

### 2. Apply vs Live Preview

MVP 공식 의미:

- Slider/Input 변경: 즉시 preview + 즉시 localStorage 저장 + 연결 게임 창에 best-effort live sync
- Apply: 현재 저장 상태를 게임 창에 full sync하고 "Game applied" 상태를 보여주는 확인 동작
- Reset: local baseline으로 되돌리고 즉시 localStorage/live sync
- Copy JSON: 현재 local snapshot을 수동 이관용으로 복사

주의:

- 과거 문서 `graphics_studio_apply_required_draft_flow_2026-07-05.md`의 "Apply 전까지 draft-only" 설명은 현재 코드/테스트 기준과 다르다.
- 현 시점의 정본은 live-local workflow다.
- Apply를 서버 승인/영구 배포 버튼처럼 보이게 만들지 않는다.

### 3. Firebase/계정 연동 금지선

다음 경로에는 Graphics Studio 값을 넣지 않는다.

- `users/{uid}/progress/titleSettings`
- `users/{uid}/progress/records`
- `rankingService/...`
- 공개 랭킹 submit payload
- 일반 플레이어 profile/progress payload

Firebase Realtime Database rules 현재 구조는 유저별 `users/$uid` 개인 진행도와 공개 랭킹 read-only 경계가 중심이다. Graphics Studio 값을 `users/$uid`에 추가하면 계정 소유자가 조작 가능한 클라이언트 상태가 클라우드에 남으므로 MVP에서는 금지한다.

## 리스크 감사

### localStorage 리스크

- 사용자/브라우저가 값 조작 가능
- 같은 origin이면 dev console에서 임의 변경 가능
- 브라우저/기기별 상태가 다르고 충돌 해결 없음
- base64 데칼은 저장 용량을 크게 차지할 수 있음
- reset baseline key가 날짜 버전 고정이라 오래된 브라우저에 과거 baseline이 남을 수 있음

MVP 대응:

- dev tool로 명확히 취급
- 일반 게임 보상/랭킹/서버 판정에 사용하지 않음
- Copy JSON으로 수동 리뷰/이관
- 큰 데칼은 아트 파이프라인에 반영할 때 별도 에셋으로 승격

### postMessage 리스크

현재 allowlist:

- `http://localhost`
- `http://127.0.0.1`
- `http://0.0.0.0`
- `http://192.168.x.x`

MVP 대응:

- 로컬/LAN 개발용으로만 허용
- HTTPS/외부 도메인 메시지는 거부
- 메시지는 저장 가능한 dev tuning 상태로만 제한
- public web build에서 `/graphics-studio` 노출 여부는 릴리즈 전에 별도 Launch/Frontend 검토 필요

### Firebase 리스크

- Firebase Auth는 사용자 식별이지 운영자 권한 검증이 아니다.
- 일반 Google 로그인 유저에게 Graphics Studio 설정 저장 권한을 주면 사실상 클라이언트 치트 설정 클라우드 저장이 된다.
- 공개 랭킹/보상과 연결하면 localStorage 조작이 경쟁 데이터로 전파될 수 있다.

MVP 대응:

- Firebase 연동 없음
- 계정별 studio sync 없음
- 서버 저장이 필요해지는 시점까지 API surface를 만들지 않음

## 향후 서버화할 때 필요한 최소 인터페이스

Stage 1 이후 운영자 전용 Graphics Studio 저장소가 필요해지면, 바로 `users/{uid}`에 붙이지 말고 별도 admin-only 경로/서비스로 분리한다.

제안 경계:

```text
adminStudioConfigs/{configId}
  schemaVersion
  status: draft | approved | live | archived
  createdByAdminUid
  updatedByAdminUid
  updatedAt
  targetBuild
  tunings
  sfxTunings
  stageBossPreview
  textureDecalsManifest
  propPlacements
```

필수 조건:

- 운영자 allowlist 또는 custom claims 기반 권한
- 쓰기 감사 로그
- draft/approved/live 분리
- 큰 이미지/base64는 DB 직접 저장 금지, Storage asset manifest로 분리
- 클라이언트는 live config를 읽기만 하고, 일반 유저는 쓰기 금지
- 랭킹/보상/진행도와 독립된 validation

Realtime Database rules 방향:

```json
{
  "rules": {
    "adminStudioConfigs": {
      "$configId": {
        ".read": "auth != null && auth.token.admin === true",
        ".write": "auth != null && auth.token.admin === true"
      }
    },
    "liveStudioConfig": {
      ".read": true,
      ".write": "auth != null && auth.token.admin === true"
    }
  }
}
```

위 예시는 방향만 나타낸다. 실제 적용 전에는 schema validation, App Check, release channel, rollback 정책을 별도 설계해야 한다.

## 실행 검증

이번 결정 문서 작성 후 다음 focused test로 현재 live-local behavior가 유지되는지 확인한다.

```bash
npm test -- src/components/GraphicsStudio.test.jsx src/components/StudioTunedGroup.test.jsx src/App.virtualJoystick.test.jsx src/lib/graphicsStudioConfig.test.js
```

## 결정

MVP 정본 결정:

1. Graphics Studio는 localStorage 기반 dev/admin tool로 유지한다.
2. Google 계정/Firebase 개인 진행도/랭킹에는 연결하지 않는다.
3. Apply는 서버 저장이 아니라 게임 창 full sync/확인 버튼으로 정의한다.
4. live preview + local save 동작을 현재 MVP UX로 유지한다.
5. 서버화는 Stage 1 모바일 루프 안정화 이후 admin-only config service로 별도 설계한다.
