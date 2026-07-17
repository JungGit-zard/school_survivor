# 타이틀 UI 보존 기준과 복구 체크리스트

작성일: 2026-07-17
담당: UI_Mini / Mobile Optimization Resident
대상: Escape! zombie school 타이틀 화면
기준 비교: `dd471b4` (`Fix title scene and add CDP inspector`) vs parent `676a28d9c7095f4c24e0a307aa541dc09c43cd00`
작업 가드: 런타임 코드는 수정하지 않고, 검은 사각형 두 개 제거 시 보존해야 할 UI/시각 기준만 정의한다.

## 1. 결론

검은 사각형 두 개의 직접 원인은 `TitleScene3D.jsx`의 다음 두 배치였다.

```jsx
<ToonBox position={[-1.45, 2.72, -4.25]} scale={[0.18, 0.18, 0.12]} color={0xfff3ba} emissive={0.2} />
<ToonBox position={[1.45, 2.72, -4.25]} scale={[0.18, 0.18, 0.12]} color={0xfff3ba} emissive={0.2} />
```

따라서 복구/수정의 최소 목표는 다음이다.

1. 위 두 개 `ToonBox` 배치만 화면에서 사라진다.
2. 그 외 타이틀 화면의 레이아웃, 읽기 가능성, 캐릭터/배경 구성, 버튼, 로그인/닉네임 흐름은 바뀌지 않는다.
3. `dd471b4`에 포함된 광범위 변경은 “검은 사각형 두 개 제거”의 정상 범위로 취급하지 않는다.

## 2. 비교로 확인한 `dd471b4`의 비목표 변경

`git diff dd471b4^ dd471b4 -- Developer/r3f_prototype/src/components/TitleScene3D.jsx Developer/r3f_prototype/src/components/TitleScene3D.test.jsx` 기준으로, `dd471b4`는 사각형 두 개 제거 외에도 아래 변경을 포함했다. 이 항목들은 검은 사각형 두 개 제거의 필수 조건이 아니므로 복구 기준에서는 회귀 위험으로 다룬다.

| 영역 | parent 기준 존재/상태 | `dd471b4` 변경 | 보존/복구 판단 |
| --- | --- | --- | --- |
| 클릭된 검은 사각형 2개 | `ToonBox` 2개가 출구 근처에 배치됨 | 두 배치와 `ToonBox` 컴포넌트 제거 | 제거 대상 맞음 |
| 클럽 조명 빔 | cyan/magenta 빔 2개 | 빔은 유지 | 반드시 보존 |
| 클럽 조명 하우징/렌즈 | 하우징 박스와 렌즈 원 존재 | 하우징/렌즈 제거 | “클릭된 두 사각형”과 별개이므로 임의 제거 금지 |
| 좌우 어두운 벽 | `wallMat` 벽 2개 존재 | 벽 2개 제거 | 임의 제거 금지 |
| 원거리 배경 스토리 | `TitleFarBackgroundStory`, `StarlinkSatelliteModel`, `ZomlonbiskModel` 존재 | 전체 제거 | 임의 제거 금지 |
| B02 타이틀 보스 | `position={[-1.35, 0.26, -3.7]} scale={0.98}` | `position={[-1.35, 0.18, -3.7]} scale={0.62}` | 사각형 제거와 무관. 별도 승인 없이 변경 금지 |
| CDP/레이캐스트 검사기 | 없음 | `inspectTitleSceneObject`, `screenElementInspector.js`, `index.html` 로드 추가 | 진단 도구로는 유용하지만 제품 UI 변경과 분리 검토 필요 |
| 테스트 기대값 | 원거리 배경/벽/조명 존재를 기대 | 제거 상태를 기대하도록 테스트 변경 | 테스트가 붕괴 상태를 정답으로 고정하지 않도록 주의 |

## 3. 현재 작업 트리에서 추가로 보이는 UI 위험

직접 파일 검사 기준 현재 작업 트리는 `dd471b4` HEAD와 완전히 같지 않다. `TitleScene3D.jsx`에는 원거리 배경 스토리가 다시 들어와 있고, `TitleScreen.jsx`에는 다음처럼 제목 텍스트가 숨겨진 상태가 보인다.

```jsx
serviceName: { display: 'none', ... }
title: { display: 'none', ... }
```

이 문서는 런타임 코드를 수정하지 않지만, 타이틀 UI 보존 기준에서는 아래를 명확히 둔다.

- 별도 승인 없이 `h1[aria-label="탈출! 좀비학교"]` 또는 서비스명 텍스트를 숨기면 안 된다.
- 제목 텍스트를 3D 씬 내부 오브젝트로 완전히 대체하는 별도 작업이 아니라면, HTML 타이틀은 데스크톱/모바일 모두에서 읽을 수 있어야 한다.
- 테스트는 글자 존재만이 아니라 실제 표시 상태(`display`, opacity, 화면 내 위치)를 검증해야 한다.

## 4. 반드시 보존할 타이틀 화면 구성

### 4-1. HTML/React 오버레이 UI

- 루트는 `position: relative`, `width: 100%`, `height: 100%`, `overflow: hidden`을 유지한다.
- 3D 캔버스는 전체 배경으로 깔리되, 오버레이 UI 클릭을 막지 않는다.
- `GoogleAccountPanel`은 계속 표시되어야 하며, 시작 버튼 흐름과 충돌하면 안 된다.
- 제목 영역:
  - `h1[aria-label="탈출! 좀비학교"]`는 접근성 이름을 유지한다.
  - “탈출! 좀비학교” 글자 순서와 `TITLE_EMOJI_CLUSTER = '🧟‍♀️🏫❤️'`는 유지한다.
  - 제목은 배경 3D와 겹쳐도 읽을 수 있어야 한다. 그림자/대비/상단 여백을 잃지 않는다.
- 부제:
  - “감염된 학교에서 4분만 버티면, 교문이 열린다”는 모바일에서도 한눈에 읽혀야 한다.
  - 배경 밝기와 겹쳐 사라지지 않도록 텍스트 그림자/대비를 유지한다.
- 기본 액션:
  - “게임 시작” 버튼은 타이틀 화면의 유일한 메인 CTA로 유지한다.
  - 버튼은 하단 safe-area를 피하고, 모바일에서 엄지로 누르기 쉬운 위치를 유지한다.
- 로그인/닉네임 흐름:
  - 미로그인: 게임 시작 → Google 로그인 → 닉네임 모달.
  - 기존 닉네임 있음: 게임 시작 → 로비 진입.
  - 닉네임 모달의 닫기, 입력, 저장 버튼은 키보드/터치 모두 가능해야 한다.
- 치트 메뉴:
  - 기본 노출은 `devCheatsVisible && adminOperations.cheatMenuButtonVisible` 조건을 유지한다.
  - 치트 버튼이 보일 때도 safe-area와 제목/계정 패널을 침범하면 안 된다.

### 4-2. 3D 타이틀 씬

- `TitleCameraRig`의 시선 중심은 타이틀 장면의 구도 기준이므로 임의 변경하지 않는다.
- 출구/문/글로우:
  - `TITLE_BOARD_BACK_LIMIT_Z = -4.62` 유지.
  - 문 표면, 출구 글로우, 바닥 글로우는 사라지면 안 된다.
- 캐릭터/몬스터:
  - `TitlePlayer`, `TitleCompanions`, `TitleMatildaPursuer`, `TitleBossZombie` 3개, `TitleZombie` 5개, `DancingDoge` 2개 구성을 유지한다.
  - 캐릭터 외곽선 보정(`TitleCharacterOutlineGroup`, stencil ref 2)은 유지한다.
  - B02 크기/위치 변경은 Graphics Studio B02 정책과 별도 검토 없이는 진행하지 않는다.
- 교실 소품:
  - `ClassroomDesk`, `ClassroomChair`, `UnconsciousStudent`는 실제 리소스 기반 전경 분위기 요소이므로 사각형 제거와 함께 삭제하지 않는다.
- 빛/효과:
  - cyan/magenta 클럽 빔 2개와 `pointLight` wash는 유지한다.
  - reduced-effects 모드에서는 빔이 정지하고 과한 애니메이션이 멈춰야 한다.
  - 사각형 두 개 제거 때문에 speed streak, warning light, exit glow를 없애면 안 된다.
- 원거리 배경:
  - `TitleFarBackgroundStory`, `StarlinkSatelliteModel`, `ZomlonbiskModel`은 클릭된 두 사각형과 다른 요소다. 별도 승인 없이는 삭제하지 않는다.

## 5. 데스크톱 체크리스트

기준 뷰포트: 1280x720, 1366x768, 1440x900.

- [ ] 화면 상단 제목 “탈출! 좀비학교”가 보인다. `display:none`, `opacity:0`, 화면 밖 이동 상태가 아니다.
- [ ] 제목과 부제가 배경 3D 위에서 읽힌다. 밝은 출구 글로우나 캐릭터 외곽선과 겹쳐도 글자 경계가 유지된다.
- [ ] 3D 씬이 타이틀 뒤쪽 배경으로 작동하고, 제목/버튼 위에 클릭 차단 레이어를 만들지 않는다.
- [ ] “게임 시작” 버튼이 하단 중앙에 있고, 최소 높이 58px 기준을 유지한다.
- [ ] 버튼 패널이 화면 밖으로 잘리거나 하단 브라우저 영역에 붙지 않는다.
- [ ] Google 계정 패널이 제목/치트 버튼/시작 버튼과 겹치지 않는다.
- [ ] 닉네임 모달이 중앙에 뜨며 닫기 버튼, 입력칸, “저장하고 시작” 버튼이 모두 보인다.
- [ ] 치트 버튼이 노출되는 내부 QA 상태에서도 우상단 safe-area 위치를 유지하고 제목을 가리지 않는다.
- [ ] 클릭된 검은 사각형 두 개는 보이지 않는다.
- [ ] 출구 글로우, 바닥, 문, 캐릭터, 교실 소품, 원거리 배경, 클럽 빔은 남아 있다.

## 6. 모바일 체크리스트

기준 뷰포트: 320x568(iPhone SE), 360x640(좁은 Android), 390x844, 412x839(Pixel 7급).

- [ ] 가로 스크롤이 생기지 않는다.
- [ ] 제목은 320px 폭에서도 화면 밖으로 밀려나지 않는다.
- [ ] 부제는 2줄 이내 또는 읽기 가능한 줄바꿈으로 표시된다.
- [ ] 제목/부제 영역은 상단 safe-area와 Google 계정 패널을 침범하지 않는다.
- [ ] “게임 시작” 버튼은 최소 44x44 CSS px 이상이며, 현재 기준 minHeight 58px을 유지한다.
- [ ] 하단 버튼 패널은 safe-area bottom을 피한다.
- [ ] 닉네임 입력 모달은 모바일 키보드가 올라와도 핵심 입력/저장 흐름이 막히지 않는다.
- [ ] 치트 버튼이 노출될 때도 44px 높이와 우상단 safe-area를 유지한다.
- [ ] 3D 타이틀 캐릭터가 제목/시작 버튼을 완전히 가리지 않는다.
- [ ] `prefers-reduced-motion` 또는 프로젝트 reduced-effects 복구 흐름을 깨지 않는다. 타이틀 진입 시 효과를 켜더라도 화면 이탈 시 저장된 reduced-effects 설정을 되돌린다.

## 7. 정확한 회귀 위험 목록

1. 두 사각형 제거 범위를 넘어 배경 모델까지 삭제하는 위험
   - 예: `TitleFarBackgroundStory`, `StarlinkSatelliteModel`, `ZomlonbiskModel` 삭제.
   - 영향: 타이틀 배경 서사와 깊이감 붕괴.

2. 좌우 벽/조명 하우징/렌즈까지 함께 삭제하는 위험
   - 예: `wallMat` 벽, `CLUB_LIGHT_HOUSING_GEO`, lens mesh 제거.
   - 영향: 사용자가 요청하지 않은 시각 구성 축소.

3. 보스 B02 크기/위치를 사각형 제거에 섞어 변경하는 위험
   - 예: `scale={0.98}` → `scale={0.62}` 같은 변경.
   - 영향: Graphics Studio B02 크기 정책과 타이틀/로비 패리티 위험.

4. 테스트가 잘못된 새 상태를 정답으로 고정하는 위험
   - 예: “원거리 배경 모델이 없어야 한다”를 사각형 제거 테스트로 둠.
   - 영향: 복구해야 할 붕괴 상태가 CI에서 통과 상태가 됨.

5. 제목 텍스트를 숨기는 위험
   - 예: `styles.title.display = 'none'`.
   - 영향: 데스크톱/모바일 모두에서 타이틀 읽기 가능성과 접근성 저하.

6. 3D 캔버스/검사기가 일반 UI 이벤트를 막는 위험
   - 예: `onPointerDown`에서 검사기가 없을 때도 이벤트를 과하게 소비.
   - 영향: 시작 버튼/모달 클릭 흐름 회귀 가능.

7. 모바일 safe-area 회귀
   - 예: 버튼 bottom 여백, 치트 버튼 top/right 여백 제거.
   - 영향: 홈 인디케이터/노치/상태바와 충돌.

8. reduced-effects 복구 회귀
   - 예: 타이틀 진입 효과 강제 후 언마운트 때 저장 설정 복구 누락.
   - 영향: 접근성/멀미 완화 설정 무시.

## 8. 최소 수정 허용 기준

검은 사각형 두 개 제거 작업은 아래 범위 안에서만 통과한다.

허용:

- `TitleScene3D.jsx`에서 클릭된 두 `ToonBox` 배치 제거.
- 해당 두 배치만 사용하던 `ToonBox` 컴포넌트와 그 전용 import(`inflateScale`, `outlineMat`, 필요 시 `getCachedBoxGeo/getCachedToonMat`) 정리.
- 두 좌표 `[-1.45, 2.72, -4.25]`, `[1.45, 2.72, -4.25]`가 재등장하지 않도록 focused test 추가.
- 레이캐스트/검사 도구는 진단용으로 분리하고, 제품 시각 회귀와 섞지 않음.

불허:

- `TitleFarBackgroundStory`, `StarlinkSatelliteModel`, `ZomlonbiskModel` 삭제.
- 좌우 벽, 문, 출구 글로우, 바닥 글로우, speed streak, warning light 삭제.
- B02/B01/B03, 일반 좀비, Matilda, Doge, Player, Chibiko, CompassBlade 배치 변경.
- `TitleScreen.jsx`의 제목/부제/시작 버튼 표시 상태 변경.
- Google 로그인/닉네임 게이트 흐름 변경.
- 모바일 safe-area 값 또는 버튼 터치 크기 축소.

## 9. 최소 acceptance criteria

코드 리뷰 또는 QA가 통과로 판단하려면 다음을 모두 만족해야 한다.

1. 소스 검색
   - `TitleScene3D.jsx`에 `ToonBox`가 없다.
   - `TitleScene3D.jsx`에 `[-1.45, 2.72, -4.25]`와 `[1.45, 2.72, -4.25]`가 없다.
   - `TitleScene3D.jsx`에 `TitleFarBackgroundStory`, `StarlinkSatelliteModel`, `ZomlonbiskModel`은 남아 있거나, 별도 승인 문서가 있다.
   - `TitleScreen.jsx`의 `h1[aria-label="탈출! 좀비학교"]`는 실제 표시 상태다.

2. 테스트
   - `TitleScene3D.test.jsx`는 “두 clicked box만 없음”을 검증하고, 원거리 배경/캐릭터/버튼/제목 보존을 함께 검증한다.
   - `TitleScreen.settings.test.jsx` 또는 동등 테스트가 제목 표시 상태와 시작 버튼 터치 크기를 검증한다.

3. 화면 확인
   - 데스크톱 1280x720 이상에서 제목, 부제, 게임 시작 버튼, 3D 배경이 모두 보인다.
   - 모바일 320x568과 412x839에서 가로 overflow 없이 제목/부제/게임 시작 버튼이 보인다.
   - 두 검은 사각형만 사라졌고, 다른 배경/캐릭터 요소는 남아 있다.

4. 변경 범위
   - 커밋/패치 설명에 “두 `ToonBox` 배치 제거” 외 변경이 있으면 각 변경의 별도 이유와 승인 근거를 적는다.
   - 사용자가 요청하지 않은 복구/축소/스케일 조정은 포함하지 않는다.

## 10. 권장 검증 명령

프로젝트 루트에서 실행한다.

```bash
git diff -- Developer/r3f_prototype/src/components/TitleScene3D.jsx Developer/r3f_prototype/src/components/TitleScreen.jsx
npm --prefix Developer/r3f_prototype test -- TitleScene3D.test.jsx TitleScreen.settings.test.jsx
npm --prefix Developer/r3f_prototype run build
```

화면 검증은 가능하면 브라우저에서 아래 뷰포트로 직접 확인한다.

- Desktop: 1280x720, 1440x900
- Mobile: 320x568, 360x640, 412x839

## 11. 작업자가 남겨야 하는 기록

- 읽은 기준: `project_develop_policy.md`, `AGENTS.md`, 이 체크리스트.
- 비교 기준: parent SHA, 대상 SHA, 변경 파일 목록.
- 실제 제거한 오브젝트: 좌표, 컴포넌트명, 재질/색상 근거.
- 보존 확인: 제목/부제/시작 버튼/로그인 패널/닉네임 모달/모바일 safe-area/3D 배경 요소.
- 실행 결과: 테스트/빌드/브라우저 확인 결과.
- 남은 위험: 별도 승인 필요한 시각 변경, 테스트 미비, 모바일 미검증 여부.
