# Implementation Code Review - 2026-05-16

## 1. 범위

대상:
- `Developer/r3f_prototype/src`

목적:
- 원격 최신 상태를 pull한 뒤 현재 구현 코드 전체를 검수한다.
- 버그, 회귀 위험, 누락 테스트를 우선 기록한다.

## 2. 기준 상태

- 브랜치: `feature/codex-gameplay-iteration`
- pull 결과: `Already up to date.`
- 작업트리: 검수 시작 전 clean

## 3. 실행한 검증

```powershell
git pull --ff-only
npm test
npm run build
```

결과:
- `npm test`: 통과, 1개 테스트 파일 / 19개 테스트 통과
- `npm run build`: 통과
- 빌드 경고: minified chunk 500 kB 초과

추가 재현:

```powershell
node --input-type=module
```

`resetGame()` 후 `gainXp(40)` 실행 결과:

```json
{"level":2,"xp":36,"xpToNext":7,"phase":"levelup"}
```

즉 XP가 다음 필요량보다 큰 상태로 남고, 즉시 다음 레벨업으로 이어지지 않는다.

## 4. Findings

### High 1. `gainXp`가 연속 레벨업을 처리하지 못한다

위치:
- `Developer/r3f_prototype/src/store/useGameStore.js:67`

현재 흐름:
- XP를 더한 뒤 `if (xp >= xpToNext)` 한 번만 처리한다.
- 큰 XP를 한 번에 얻으면 남은 XP가 다음 필요량을 넘어도 한 번만 레벨업한다.

영향:
- XP 바가 100%를 넘은 상태로 남을 수 있다.
- 5분 생존 목표 레벨과 실제 성장 카드 횟수가 어긋날 수 있다.
- E06/B01 같은 큰 보상에서 성장 손실처럼 체감될 수 있다.

권장:
- `while (xp >= xpToNext)` 기반으로 계산한다.
- 레벨업 카드 선택은 pending queue 또는 pending count로 순차 처리한다.
- store 단위 테스트를 추가한다.

### High 2. B01 보너스 교과서가 XP 0일 수 있다

위치:
- `Developer/r3f_prototype/src/components/Enemy.jsx:30`
- `Developer/r3f_prototype/src/components/Enemies.jsx:177`

현재 흐름:
- B01 스탯의 `xp`는 0이다.
- 엘리트/보스 보너스 교과서는 `dropData.xp` 값을 그대로 사용한다.
- 따라서 B01 보너스 교과서 3개는 value 0이 될 수 있다.

영향:
- 보스 처치 보상이 골드만 체감되고 XP 보상은 사라진다.
- 보스 보상과 성장 루프가 충돌한다.

권장:
- `ELITE_BONUS.B01`에 textbook XP 값을 명시한다.
- 또는 B01 교과서가 의도적으로 0 XP라면 골드 전용 보상으로 표현을 바꾼다.
- B01 보상 테스트를 추가한다.

### High 3. 모바일 조이스틱 컴포넌트가 앱에 연결되지 않았다

위치:
- `Developer/r3f_prototype/src/App.jsx:1`
- `Developer/r3f_prototype/src/components/VirtualJoystick.jsx:8`

현재 흐름:
- `VirtualJoystick.jsx`는 존재한다.
- `App.jsx`에서 import/render하지 않는다.
- `Player.jsx`는 `joystickDir`를 읽지만, 실제 화면에서 값을 바꿀 UI가 없다.

영향:
- 모바일 환경에서 이동할 방법이 없다.
- 게임이 모바일 세로 프레임을 쓰지만 모바일 게임으로 완성되지 않는다.

권장:
- `App.jsx`의 `phoneFrame` 안에 `VirtualJoystick`를 렌더한다.
- 하단 HP/XP, 자 쿨다운 UI와 겹치지 않게 배치한다.
- gstack `snapshot -i`와 모바일 viewport 캡처로 재검증한다.

### High 4. 모바일 pause/resume 조작이 없다

위치:
- `Developer/r3f_prototype/src/components/HUD.jsx:320`

현재 흐름:
- pause는 키보드 `KeyP`로만 가능하다.
- `paused` 모달에는 `PAUSED` 텍스트만 있고 재개 버튼이 없다.
- 모바일 터치 사용자는 일시정지 진입/해제를 할 수 없다.

영향:
- 모바일 조작 접근성이 깨진다.
- pause 상태에 들어가도 터치로 빠져나오기 어렵다.

권장:
- 화면 내 pause 버튼을 추가한다.
- pause 모달에 resume 버튼을 추가한다.
- `togglePause`를 버튼에서 호출한다.

### Medium 1. 기획/문서의 9종 무기와 실제 구현의 7종 무기가 어긋난다

위치:
- `Developer/r3f_prototype/src/store/useGameStore.js:26`
- `Developer/r3f_prototype/src/components/Weapons/index.js:3`
- `Developer/r3f_prototype/src/components/HUD.jsx:80`

현재 흐름:
- store 초기 무기는 7종이다.
- `components/Weapons/` 실제 barrel export도 7종이다.
- HUD에는 missile/starlink 아이콘 스타일이 남아 있지만, 실제 무기/업그레이드에는 없다.
- 프로젝트 문서 일부는 9종 무기 기준으로 설명한다.

영향:
- 기획, QA, 코드 기준이 달라진다.
- 다음 구현자가 9종이 구현 완료됐다고 착각할 수 있다.

권장:
- 현재 버전을 7종으로 공식화하거나, missile/starlink를 다시 구현한다.
- 문서와 `current_game_rules.md`, `current_code_architecture.md`를 실제 구현 기준으로 맞춘다.

### Medium 2. 레벨업/결과 모달이 모바일 폭을 초과할 수 있다

위치:
- `Developer/r3f_prototype/src/components/HUD.jsx:431`
- `Developer/r3f_prototype/src/components/HUD.jsx:440`

현재 흐름:
- modal `minWidth`는 440이다.
- 카드 3개는 `142 * 3 + gap 16 * 2 = 458px` 이상이다.
- 앱 기준 모바일 프레임은 390px이다.

영향:
- 레벨업, 게임오버, 클리어 모달이 390px 화면에서 잘릴 수 있다.

권장:
- 모바일에서는 카드 세로 배치 또는 1열/스크롤 구조를 사용한다.
- `minWidth` 대신 `width: calc(100% - npx)`, `maxWidth`를 사용한다.

### Medium 3. `resetGame`이 refs 전역 상태를 초기화하지 않는다

위치:
- `Developer/r3f_prototype/src/store/useGameStore.js:127`
- `Developer/r3f_prototype/src/lib/refs.js:4`

현재 흐름:
- `resetGame`은 Zustand store와 `gameKey`만 초기화한다.
- `playerPos`, `playerFacing`, `bagSwingState`, `enemyBodies`, `joystickDir`는 별도 전역 값이다.

영향:
- 재시작 직후 이전 판 위치/입력/쿨다운 상태가 한 프레임 이상 남을 수 있다.
- 반복 플레이 안정성에 영향을 줄 수 있다.

권장:
- `resetRuntimeRefs()` helper를 `refs.js`에 추가한다.
- `resetGame`에서 해당 helper를 호출한다.

### Low 1. E04 원거리/투사체 코드가 Stage 1 회귀 위험으로 남아 있다

위치:
- `Developer/r3f_prototype/src/components/Enemy.jsx:23`
- `Developer/r3f_prototype/src/components/Enemy.jsx:193`

현재 흐름:
- Stage 1 스폰 테이블에는 E04가 없다.
- 하지만 E04 원거리 행동과 투사체 코드는 실행 가능한 상태로 남아 있다.

영향:
- 추후 스폰 테이블에 E04가 실수로 들어오면 Stage 1 투사체 금지 방향이 깨진다.

권장:
- Stage 1 스폰 config 테스트로 E04 미등장을 보장한다.
- E04 코드는 Stage 2 전용으로 분리하거나 명시 가드를 둔다.

## 5. 누락 테스트

- `gainXp` 연속 레벨업 처리
- B01 보너스 교과서 XP 값
- 모바일 조이스틱 렌더 여부
- pause/resume 버튼 렌더와 클릭 동작
- 레벨업 카드 모바일 폭/후보 개수
- `resetGame` refs 초기화
- Stage 1 E04 미등장
- 골드 코인 5분 최소/평균 분포

## 6. 결론

현재 코드는 테스트와 빌드를 통과한다. 다만 핵심 플레이 완성도 기준에서는 XP 성장, B01 보상, 모바일 조작, 모바일 pause가 먼저 막힌다.

다음 수정 우선순위:

1. `gainXp` 연속 레벨업 처리
2. B01 보너스 교과서 XP 0 수정
3. 모바일 조이스틱 연결
4. 모바일 pause/resume 버튼 추가
5. 모바일 모달 폭 수정
6. refs 리셋 helper 추가

## 7. 수정 반영 - 2026-05-16

위 발견 사항에 따라 다음 수정을 반영했다.

- `gainXp`를 `while` 기반 연속 레벨업 처리로 변경하고 `pendingLevelUps` 큐를 추가했다.
- 레벨업 선택 후 pending 레벨업을 하나씩 소비하도록 `applyUpgrade`와 `resumeFromLevelup` 흐름을 수정했다.
- B01 보너스 교과서 XP를 `textbookXp: 40`으로 명시했다.
- `VirtualJoystick`를 `App.jsx`에 실제 연결했다.
- 모바일 pause 버튼과 paused 모달의 `계속하기` 버튼을 추가했다.
- 레벨업/결과 모달을 390px 화면 안에 들어오도록 `minWidth` 제거, `maxWidth`/반응형 폭으로 수정했다.
- `resetRuntimeRefs()`를 추가해 `resetGame` 시 `playerPos`, `playerFacing`, `bagSwingState`, `enemyBodies`, `joystickDir`를 초기화한다.
- 현재 실제 구현 기준을 7종 무기로 정리했다.

추가 검증:
- `npm test`: 3개 테스트 파일 / 24개 테스트 통과
- `npm run build`: 통과
- gstack 390x844 모바일 확인:
  - pause 버튼이 `snapshot -i`에서 버튼으로 잡힘
  - pause 버튼 클릭 시 `PAUSED`와 `계속하기` 버튼 표시
  - 조이스틱이 화면에 표시됨

남은 추적:
- 시간 기반 골드 코인 최악 분포
- Stage 1 E04 회귀 방지 테스트
- 실제 터치 드래그 이동감
- WebGL/번들 크기 성능 경고
