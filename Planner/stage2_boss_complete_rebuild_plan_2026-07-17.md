# Stage 2 보스 완전 삭제 및 전면 재구현 계획 — 2026-07-17

## 문서 상태

- 상태: 구현 전 확정 계획
- 대상: Stage 2 보스 `B02`
- 원칙: 기존 B02 구현 위에 보정 코드를 추가하지 않는다.
- 코드 변경: 이 문서 작성 시점에는 없음
- 구현 시작 조건: 현재 혼합 작업 트리와 분리된 깨끗한 전용 작업공간 확보

## 실행 트리거

사용자가 다음 의미의 지시를 하면 이 계획은 즉시 실행 상태가 된다.

- `스테이지2 다시 다 만들어`
- `스테이지2 보스 다시 만들어`
- `B02 처음부터 다시 만들어`
- `B02 재구현 시작`
- 그 밖에 기존 Stage 2 보스를 폐기하고 전면 재구현하라는 명확한 지시

트리거가 들어오면 다시 착수 여부를 질문하지 않는다. 이 문서를 먼저 읽고 Phase 0 작업공간 격리부터 즉시 시작한다. 로컬에서 확인 가능한 사항은 질문 없이 조사·확정하고, 안전하게 진행 가능한 Phase를 계속 수행한다.

새 2D 콘셉트 선택처럼 결과를 바꾸는 사용자 결정이나 Firebase 원격 데이터의 실제 영구 삭제처럼 별도 확인이 필요한 외부 변경이 발생한 경우에만 해당 지점에서 필요한 선택을 요청한다. 그 전까지는 계획 수립을 반복하거나 기존 B02 보정 작업으로 되돌아가지 않는다.

## 결정

현재 Stage 2 보스 구현은 폐기한다.

기존 B02 모델, 전용 Studio 편집 경로, 구형 저장 키, 프리뷰 크기 보정, source revision 복구 코드, B02 전용 예외 분기를 새 구현의 기반으로 사용하지 않는다.

Git 이력과 실패 기록 문서는 재발 방지 증거로 보존하지만, 과거 구현 코드를 복사하거나 되살리지 않는다. 새 B02는 새 식별자, 새 모델 계층, 새 저장 스키마, 새 테스트 계약으로 처음부터 구현한다.

## 재구현 목표

1. 크기 변경은 한 곳의 명시적인 값만 바꾸면 끝나야 한다.
2. 머리·얼굴·머리카락 등 부모-자식 관계가 실제 시각 구조와 일치해야 한다.
3. 한 파츠의 색상·외곽선·변형이 다른 파츠나 다른 좀비에 번지지 않아야 한다.
4. 게임, 로비, 타이틀, Graphics Studio가 동일한 새 모델을 사용해야 한다.
5. Studio 저장값은 사용자별 Firebase 정본을 사용하고, 구형 B02 저장값을 자동 승격하지 않는다.
6. 테스트는 문자열 존재 여부가 아니라 실제 계층, transform, material, 저장 결과를 검사해야 한다.
7. 새 구현은 B02 전용 예외를 공용 렌더러 곳곳에 흩뿌리지 않고 하나의 깊은 Module 안에 모은다.
8. 단순 크기·위치 조정은 10분 안에 수정·검증할 수 있는 구조여야 한다.

## 비목표

- Stage 1 보스 `B01`과 Stage 3 보스 `B03`을 동시에 재제작하지 않는다.
- Stage 2 일반 웨이브, 맵, 투사체 규칙을 재설계하지 않는다.
- 기존 B02 저장값을 추측으로 새 파츠에 매핑하지 않는다.
- 구형 모델과 새 모델을 동시에 지원하는 호환 레이어를 만들지 않는다.
- 새 범용 보스 프레임워크를 과도하게 설계하지 않는다.
- 삭제와 재구현을 현재의 다른 미완료 작업과 한 커밋에 섞지 않는다.

## 반드시 보존할 제품 계약

기존 구현 코드는 폐기하되 아래 게임 규칙은 별도 사양으로 보존한다.

- Stage 2 보스 슬롯의 적 타입 이름은 게임 외부 계약상 `B02`로 유지한다.
- Stage 2 보스 등장 시각과 Stage 2 진행 흐름은 별도 요청이 없으면 유지한다.
- 체력, 이동 속도, 피해량, 충돌 반경, 보상값은 재구현 시작 전에 현재 승인값을 표로 추출해 동결한다.
- 보스의 정체성은 체육교사/교사 좀비 콘셉트로 유지하되, 기존 3D 구현과 파츠 계층은 재사용하지 않는다.
- `boss_02.webp`를 재사용할지는 새 모델 시각 설계 단계에서 명시적으로 승인한다. 자동 재사용하지 않는다.

## 삭제 범위

### 1. 모델 구현

- 기존 B02 전용 JSX 모델과 helper
- 기존 얼굴 텍스처 전용 경로
- 기존 머리카락·머리·몸통 파츠 계층
- 기존 B02 전용 material·outline 처리
- 기존 B02 전용 focus·texture-fit 처리
- 기존 모델의 legacy alias와 fallback

### 2. Graphics Studio

- `zombie-b02`
- `zombie-b02-rebuilt`
- `zombie-b02-teacher`
- 기존 B02 root/part/group tuning
- 기존 B02 source revision 승격·복구 코드
- 기존 B02 전용 파츠 선택 예외
- 기존 B02 전용 테스트 fixture

### 3. 로비·타이틀·프리뷰 보정

- `BOSS_PREVIEW_ZOOM_FACTOR.B02`
- `BOSS_PREVIEW_MODEL_SCALE_FACTOR.B02`
- B02만을 위한 임시 카메라·프레이밍 보정
- 타이틀에서 오염된 root scale을 가리기 위한 임시 축소값
- 구형 모델의 머리 높이를 기준으로 만든 crown 보정

### 4. 저장 데이터

- 브라우저 `localStorage`의 구형 B02 tuning
- Firebase의 구형 B02 tuning node
- 구형 B02 revision metadata
- 구형 B02 part ID가 포함된 decal·prop·preview 연동값

실제 Firebase 데이터 삭제 전에는 사용자별 백업 수량과 대상 경로를 읽기 전용으로 보고한다. 삭제 후에는 새 구현으로 가져오지 않는다.

### 5. 테스트

다음 유형의 구형 테스트는 새 Interface 테스트로 대체한 뒤 삭제한다.

- 소스 문자열에 B02 코드가 있는지만 검사하는 테스트
- 특정 JSX 내부 구조를 그대로 고정하는 테스트
- 실제 렌더와 다른 수학 모델로 프리뷰 크기를 추정하는 테스트
- legacy ID 승격을 전제로 하는 테스트
- 구형 B02 특수 경로의 존재를 요구하는 테스트

## 삭제 완료 게이트

새 구현을 시작하기 전에 다음 검색 결과가 런타임 소스에서 0건이어야 한다.

```text
zombie-b02-teacher
zombie-b02-rebuilt
Boss02FaceTexture
B02BossZombieMesh
B02_BOSS_
studioTextureFit
graphicsStudioB02Source
BOSS_PREVIEW_MODEL_SCALE_FACTOR.B02
```

`B02`라는 게임 타입과 실패 기록 문서의 문자열은 남을 수 있다. 그러나 구형 모델 구현, 구형 저장 식별자, 구형 보정 로직은 남아 있으면 안 된다.

삭제 커밋에서는 B02가 의도적으로 렌더되지 않는 상태를 허용한다. 삭제와 새 구현을 한 커밋에 합쳐 잔존 코드를 숨기지 않는다.

## 새 설계

### Module

새 Module 이름은 `Stage2BossVisual`로 한다.

이 Module이 내부에 숨겨야 할 구현:

- 모델 계층
- 얼굴과 머리카락 결합
- 파츠별 material 소유권
- hit flash
- outline
- 애니메이션 pivot
- Studio 편집용 semantic part metadata
- tuning을 rest pose에 합성하는 순서

### 외부 Interface

호출자가 알아야 할 Interface는 다음 수준으로 제한한다.

```jsx
<Stage2BossVisual
  visualState={resolvedVisualState}
  frozen={false}
  hitFlash={false}
/>
```

호출자는 내부 파츠 이름, material clone, 얼굴 텍스처, outline helper, source revision을 알지 못해야 한다.

게임, 로비, 타이틀, Studio는 모두 같은 Module을 호출한다. 각 화면의 위치와 카메라만 바깥 adapter가 소유한다.

### Seam

Seam은 `Stage2BossVisual`의 위 Interface에 둔다.

- 게임 adapter: Enemy/Boss 런타임에서 호출
- 로비 adapter: StageBossPreview에서 동일 Module 호출
- 타이틀 adapter: TitleScene3D에서 동일 Module 호출
- Studio adapter: GraphicsStudioPreview에서 동일 Module 호출

adapter는 모델을 복제하거나 B02 내부 파츠에 접근하지 않는다.

### 크기 계약

기존처럼 여러 scale이 숨어서 곱해지지 않도록 역할을 분리한다.

- 모델 내부 단위 크기: 항상 `1`
- gameplay collision scale: 게임 규칙 전용, Studio 편집 금지
- presentation scale: 화면 배치 전용, 각 adapter에 명시
- part scale: Studio 파츠 편집 전용
- Studio root scale: 제공하지 않음

전체 B02 시각 크기를 바꿀 때는 `presentation scale` 한 값만 바꾼다. 로비·타이틀·게임에서 서로 다른 크기가 필요하면 각 값의 이름과 목적을 같은 설정 파일에 나란히 둔다. 카메라 zoom으로 모델 크기 오염을 숨기지 않는다.

### 파츠 계약

- 모든 편집 파츠는 사람이 읽을 수 있는 semantic ID를 가진다.
- ID는 모델 계층의 숫자 경로나 배열 순서에서 만들지 않는다.
- 얼굴은 머리 transform을 상속한다.
- 얼굴 art는 기본적으로 선택 불가다. 얼굴 art 자체를 편집하는 기능이 필요할 때만 별도 요구사항으로 추가한다.
- animation pivot에는 편집 ID를 붙이지 않는다.
- render outline, focus outline, decal helper, shadow helper는 선택과 raycast에서 제외한다.
- 파츠 하나의 material 변경은 copy-on-write로 해당 파츠에만 적용한다.
- 파츠별 fill과 outline material의 소유권과 dispose 책임을 Module 내부에서 관리한다.

### tuning 합성 계약

합성 순서는 고정한다.

```text
rest pose
→ canonical part tuning
→ canonical group tuning
→ runtime animation
→ temporary hit effect
```

- 저장 객체 삽입 순서에 의존하지 않는다.
- Reset은 키를 실제로 제거한다.
- group과 part가 같은 축을 변경하면 우선순위를 테스트로 고정한다.
- tuning을 반복 적용해도 위치·회전·크기가 누적되지 않아야 한다.
- tuning 해제 시 정확한 rest pose로 돌아와야 한다.

## 새 저장 계약

### 새 식별자

새 정본 ID는 구형 ID와 겹치지 않는 `stage2-boss-v2`를 사용한다.

구형 ID에서 자동 승격하지 않는다. 새 구현의 첫 상태는 새 모델의 기본 정본으로 시작한다.

### Firebase 정본

- 사용자별 Firebase 경로를 정본으로 사용한다.
- `localStorage`는 인증 완료 후 받은 동일 revision의 캐시로만 사용한다.
- 원격 hydrate 전에는 구형 캐시를 B02에 적용하지 않는다.
- 저장 snapshot에는 schema version, revision, updatedAt, author UID, content hash를 포함한다.
- 저장 성공 ACK 전에는 UI에 `saved`를 표시하지 않는다.
- 계정 전환 시 이전 계정의 pending write와 hydrate 응답을 폐기한다.
- 미래 schema는 구버전 클라이언트가 덮어쓰지 않는다.

### 구형 데이터 처리

- 구형 B02 저장값은 백업 후 삭제한다.
- 새 파츠로 추측 매핑하지 않는다.
- 새 구현에서 필요하면 사용자가 새 Studio 화면에서 다시 조정한다.
- Git 과거 커밋에서 구형 tuning을 복사하지 않는다.

## 단계별 실행 계획

### Phase 0 — 작업공간 격리

- 현재 67개 혼합 변경이 있는 작업 트리에서는 시작하지 않는다.
- 기준 커밋을 사용자에게 보고하고 B02 전용 깨끗한 작업공간을 만든다.
- 기존 변경을 삭제·reset하지 않는다.
- 전체 테스트 기준값과 현재 B02 관련 실패를 기록한다.

완료 조건:

- 작업공간 clean
- 기준 SHA 기록
- B02 관련 파일 목록과 구형 저장 경로 목록 확정

### Phase 1 — 현재 제품 계약 동결

- Stage 2 boss stats, 등장 시점, 보상, 충돌, 공격 계약 추출
- B01/B03과 공유하는 공용 계약과 B02 전용 구현 분리
- 새 모델의 목표 크기, 실루엣, 파츠 목록, 모바일 가독성 승인
- `boss_02.webp` 재사용 여부 승인

완료 조건:

- 코드가 아닌 표 형태의 제품 계약 승인
- 새 semantic part ID 목록 승인

### Phase 2 — 구형 B02 완전 삭제

- 삭제 범위의 코드·테스트·보정·legacy adapter 제거
- 구형 B02가 게임, 로비, 타이틀, Studio 어디에도 렌더되지 않음을 확인
- legacy 식별자 검색 0건 확인
- 삭제만 별도 커밋

완료 조건:

- 삭제 게이트 통과
- B01/B03 테스트와 빌드 통과
- B02를 fallback 일반 좀비로 표시하지 않음

### Phase 3 — 정적 새 모델

- 애니메이션과 Studio 없이 새 모델만 제작
- 모델 내부 단위 크기 `1`
- 얼굴-머리-머리카락 계층 확정
- 파츠별 독립 material과 outline 구현
- semantic part ID 부여

완료 조건:

- 정적 모델 스냅샷 승인
- 머리 이동 시 얼굴·머리카락 동반
- 파츠 색상 변경이 이웃 파츠에 전파되지 않음
- 모든 part ID 중복 0건

### Phase 4 — 게임 런타임 연결

- B02 타입을 새 Module에 연결
- 이동·공격·hit flash·죽음 애니메이션 연결
- gameplay collision scale과 presentation scale 분리
- Stage 2 보스 등장·보상 계약 연결

완료 조건:

- Stage 2 실제 플레이에서 새 B02만 등장
- 체력·충돌·공격·보상 계약 통과
- 10회 연속 보스전에서 console error와 material 누수 없음

### Phase 5 — 로비와 타이틀 연결

- 로비와 타이틀이 동일 `Stage2BossVisual`을 사용
- 임시 B02 zoom/model-scale factor 없이 프레이밍
- 모바일과 데스크톱에서 머리·발·외곽선 잘림 확인

완료 조건:

- B01/B02/B03 카드 체감 크기 승인
- 타이틀 B02 위치·크기 승인
- 카메라 보정으로 런타임 크기 오류를 숨기는 코드 0건

### Phase 6 — Graphics Studio 연결

- semantic part만 선택 가능
- focus helper와 render helper는 raycast 불가
- rest pose 기준으로 tuning 적용
- root scale 편집 제거
- group/part 합성 순서 고정
- Reset 시 키 실제 삭제

완료 조건:

- 모든 편집 파츠 순차 선택 가능
- 같은 클릭을 반복해도 focus가 가로막히지 않음
- Apply 100회 후 transform drift 0
- 좌우 파츠에 서로 다른 색 적용 가능
- 머리 이동·회전·확대 시 얼굴과 머리카락 결합 유지

### Phase 7 — Firebase 정본 연결

- 새 `stage2-boss-v2` snapshot 저장·hydrate
- 사용자별 격리
- 저장 직렬화
- 계정 전환 세대 검사
- ACK와 저장 상태 UI
- 미래 schema 보호
- 구형 B02 저장값 백업·삭제

완료 조건:

- 새 브라우저에서 로그인 후 동일 모델 복구
- 계정 A/B 데이터 혼선 0
- 느린 이전 응답이 최신 화면을 덮지 않음
- 오프라인 실패가 `saved`로 표시되지 않음
- Firebase 규칙 테스트와 실제 권한 검증 통과

### Phase 8 — 전체 검증과 출하

- B02 Interface 중심 테스트
- Stage 2 실제 플레이
- 로비·타이틀·Studio 시각 QA
- 전체 테스트
- 프로덕션 빌드
- Android sync와 AAB 검증
- 관련 파일만 격리 커밋

완료 조건:

- 전체 테스트 100% 통과
- 프로덕션 빌드 통과
- 데스크톱·390×844 모바일 시각 승인
- Git 작업공간 clean
- 로컬/원격 SHA 일치
- AAB hash와 서명 기록

## 테스트 계획

### Interface 테스트

테스트는 `Stage2BossVisual` Interface를 통해 관찰 가능한 결과를 검사한다.

- 기본 visualState로 항상 같은 rest pose 생성
- 동일 tuning을 반복 적용해도 결과 동일
- tuning 제거 시 rest pose 복귀
- hit flash 종료 후 canonical material 복귀
- unmount 시 소유 material을 정확히 한 번 dispose

### 계층 테스트

- head transform이 face와 hair를 함께 이동
- face helper는 focus 대상이 아님
- animation pivot은 semantic part로 노출되지 않음
- semantic part ID 중복 0

### 재질 테스트

- body 색 변경 후 arm/leg material 불변
- left/right arm에 서로 다른 색 유지
- outline 변경이 다른 적에게 전파되지 않음
- 공유 texture는 불필요하게 dispose하지 않음

### transform 테스트

- part와 group 우선순위가 저장 순서와 무관
- Apply 100회 후 drift 0
- Reset 후 key와 화면 결과 모두 기본값
- rotation/scale 변경 시 face 결합 유지

### 화면 테스트

- 게임, 로비, 타이틀, Studio가 같은 모델 ID 사용
- B02 크기 변경 시 지정된 presentation scale 한 값만 변경
- 로비에서 머리 잘림 없음
- 타이틀에서 다른 캐릭터와 비정상 겹침 없음
- 실제 Stage 2에서 충돌체와 시각 크기 불일치 없음

### 저장 테스트

- 새 계정 최초 snapshot 생성
- 재로그인 후 동일 hash 복구
- 계정 전환 중 늦은 hydrate 무시
- 저장 순서 역전 방지
- 미래 schema 보존
- 구형 B02 ID 자동 승격 금지
- 구형 localStorage 단독 상태를 정본으로 사용하지 않음

## 실패 시 중단 조건

다음 중 하나가 발생하면 그 Phase를 승인하지 않고 원인을 수정한다.

- B02 전용 예외가 `Stage2BossVisual` 밖의 공용 파일 세 곳 이상에 생김
- 크기 조정에 두 개 이상의 scale 값을 동시에 변경해야 함
- 테스트는 통과하지만 실제 화면이 다름
- 한 파츠 편집이 다른 파츠에 전파됨
- 구형 ID 또는 구형 tuning이 새 모델에 적용됨
- 전체 테스트가 실패한 상태에서 다음 Phase로 진행
- 다른 작업 파일이 B02 커밋에 섞임
- Firebase 배포 전 권한·계정 격리 검증이 없음

## 커밋 계획

1. `chore(stage2-boss): remove legacy B02 implementation`
2. `feat(stage2-boss): add clean static visual module`
3. `feat(stage2-boss): connect gameplay runtime`
4. `feat(stage2-boss): connect lobby and title adapters`
5. `feat(stage2-boss): add semantic studio editing`
6. `feat(stage2-boss): persist v2 studio state to Firebase`
7. `test(stage2-boss): complete runtime and release gates`

각 커밋은 독립적으로 diff를 검토할 수 있어야 한다. 삭제와 재구현, Firebase와 시각 튜닝, B02와 다른 스테이지 작업을 한 커밋에 합치지 않는다.

## 완료 정의

다음 조건을 모두 만족해야 “Stage 2 보스 전면 재구현 완료”로 판정한다.

- 구형 B02 런타임 구현과 legacy 저장 경로 0건
- 새 `stage2-boss-v2`만 사용
- 게임·로비·타이틀·Studio 동일 Module 사용
- 머리/얼굴 분리, material 번짐, transform drift, focus 가로채기 재현 불가
- root scale 오염 경로 제거
- 크기 조정이 한 값 수정으로 끝남
- Firebase 사용자별 정본과 ACK 동작
- 관련 테스트와 전체 테스트 100% 통과
- 실제 Stage 2 보스전, 로비, 타이틀, Studio 시각 승인
- 프로덕션 빌드와 서명 AAB 검증
- 관련 변경만 커밋되고 작업공간 clean

## 재발 방지 최종 규칙

- 과거 B02 구현 코드를 복사해 새 구현을 시작하지 않는다.
- 구형 저장값을 새 파츠에 추측 매핑하지 않는다.
- B02 화면 문제를 카메라 zoom으로 먼저 보정하지 않는다.
- 실제 3D 결과를 확인하지 않는 문자열 테스트를 완료 증거로 사용하지 않는다.
- 한 번의 크기 조정이 10분을 넘으면 접근을 중단하고 scale 경로를 전수 추적한다.
- 모델 내부 구현 지식이 게임·로비·타이틀·Studio 호출부로 새면 Module Interface를 다시 줄인다.
- 새 B02 관련 해결책은 이 계획과 실패 기록을 함께 읽은 뒤 진행한다.
