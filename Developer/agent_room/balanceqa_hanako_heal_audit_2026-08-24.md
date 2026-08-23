# 하나코 '힐' 작동 검수 (balanceqa, 2026-08-24)

## 판정: **작동함 (경미 결함 3건 동반)**

근거는 문자열 매칭이 아니라 실제 프레임 구동 테스트다. 신규 파일
`Developer/r3f_prototype/src/components/Weapons/Hanako.runtime.test.jsx` 를 추가해
`HanakoWeapon`을 마운트하고 프레임 콜백을 직접 굴려 스토어 HP 변화를 단언했다.

## 실행한 명령과 출력

```
$ npx vitest run --maxWorkers=1 --no-file-parallelism \
    src/components/Weapons/Hanako.runtime.test.jsx \
    src/components/Weapons/Hanako.test.jsx \
    src/lib/hanako.test.js \
    src/store/useGameStore.test.js

 Test Files  4 passed (4)
      Tests  24 passed (24)
   Duration  2.39s
```

신규 러ntime 테스트 4케이스:
1. 20초 분량 실제 프레임 → HP가 `maxHp * 0.05` 만큼 정확히 증가, `playerHeal` SFX 1회,
   `missionProgress`에 `companion.hanako.healCount` 기록됨.
2. 치비코 비활성 → 1400프레임(약 23초) 돌려도 HP 불변.
3. 만피 상태 → HP 불변, `playerHeal` SFX 0회(낭비 소리 안 남).
4. 일시정지 중 흐른 시간이 힐 주기에 적립됨(아래 결함 1).

## 질문별 답변

**1. 정본 수치와 위치**
`src/lib/weaponCatalog.js:103-108` `WEAPON_CATALOG.hanako.base` 하나뿐.
`{ healIntervalMs: 20000, healPercent: 0.05, followDistance: 1.44 }`.
`src/lib/hanako.js:5-9`가 그 값을 재수출할 뿐 리터럴 중복 없음(파일 상단 주석이 과거 이중 정본을
제거했다고 명시, 실제로 확인됨). 상한은 `useGameStore.js:386`에서 `Math.min(maxHp, hp+amount)`로 클램프.
중첩 규칙: 하나코 인스턴스는 1개, 이누콘과는 독립 타이머(중첩 회복 가능).

**2. 호출 경로 (끊긴 곳 없음)**
- `src/components/Weapons/Hanako.jsx:163` `now - lastHealAtRef.current >= HANAKO_HEAL_INTERVAL_MS`
- `Hanako.jsx:165` `computeHanakoHealAmount(player.maxHp)` → `src/lib/hanako.js:15-18`
- `Hanako.jsx:168` `healPlayer(healAmount)` (`Hanako.jsx:125`에서 스토어 셀렉터로 획득)
- `src/store/useGameStore.js:384-395` `healPlayer` → `player.hp` 갱신 + `healFlashToken` + `playerHeal` SFX
- `Hanako.jsx:170` `recordMissionEvent({type:'companion_heal', companionId:'hanako'})`
  → `src/lib/missionProgress.js:104` → `companion.hanako.healCount`
  → 미션 `hanako_cheer` (`src/lib/missionCatalog.js:39`)

**3. 게임 루프 호출 여부**
`Hanako.jsx:129` `usePlayingFrame(...)`. `src/components/Game.jsx:205`에 `<HanakoWeapon />` 마운트.
`usePlayingFrame`(`src/lib/usePlayingFrame.js:17-24`)이 `phase === 'playing'`일 때만 1/60 고정 스텝으로 실행.
정의만 있고 호출부가 없는 상태가 **아니다** — 테스트 1이 실제로 HP를 올려서 증명.

**4. 획득 경로**
`src/lib/upgrades.js:157`
`acquireHanako: { weapon:'hanako', kind:'acquire', requiresActiveWeapon:'chibiko', skipAccountUnlock:true }`.
게이트는 `upgrades.js:289`. 게다가 `useGameStore.js:71-74`
`FOLLOWUP_GUARANTEED_UPGRADE_BY_PREREQUISITE = { chibiko: 'acquireHanako' }` 라서 치비코를 얻으면
다음 레벨업에 하나코 카드가 **보장 등장**한다. 획득 경로 정상.

**5. 최대 HP에서 발동하면**
`healPlayer`가 클램프해서 HP는 안 오르고 `healFlashToken`/SFX도 안 오른다(테스트 3으로 실측).
다만 `lastHealAtRef`는 무조건 갱신되므로 **틱은 소모된다** — 만피 순간에 틱이 걸리면 다음 회복까지
다시 20초. 이누콘도 동일 구조라 의도된 설계로 판단, 수정 안 함.

**6. 사망 직전/직후 경합**
`phase`가 `gameover`가 되면 `usePlayingFrame`이 콜백을 막으므로 사망 후 힐은 불가능.
사망 판정과 힐이 같은 프레임에서 경합하는 경로는 없음(힐은 프레임 콜백, 데미지는 충돌 콜백이지만
둘 다 `set()` 직렬 처리). 이 항목에 대한 실측 재현은 하지 않았다 — 코드 경로 검토 결과다.

**7. 기존 테스트가 실제로 검증하는 것 / 문자열로 때우는 것**
- `src/components/Weapons/Hanako.test.jsx` — **4케이스 전부 `readFileSync` + `toContain`**.
  실행 검증 0. 힐이 HP를 올리는지, 주기가 맞는지, 스토어까지 도달하는지 아무것도 실행하지 않는다.
  즉 이 파일이 초록이어도 "작동함"의 근거가 될 수 없었다.
- `src/lib/hanako.test.js` — `computeHanakoHealAmount` / `shouldRenderHanakoCompanion` 순수함수는
  **실제 실행**해서 검증. 다만 스토어·프레임 경로는 다루지 않음.
- 공백을 신규 `Hanako.runtime.test.jsx`가 메웠다.

## 결함 (심각도 순)

### 1. [중-하] 일시정지 시간이 힐 주기에 그대로 적립된다 — 미수정(밸런스 영향, 보고만)
`Hanako.jsx:132` `const now = clock.elapsedTime * 1000`.
Canvas에 `frameloop` 지정이 없어 R3F clock은 일시정지/레벨업 중에도 계속 흐르는데,
`usePlayingFrame`은 콜백만 막을 뿐 `lastHealAtRef`를 멈추지 않는다.

재현: 하나코 보유 상태로 1초 플레이 → 일시정지(또는 레벨업 카드 화면) 24초 → 재개.
재개 첫 프레임에서 즉시 회복이 터진다. 실측 테스트 케이스 4가 이 동작을 재현한다.

영향: 레벨업 화면이 잦은 후반부에서 실효 회복 주기가 20초보다 짧아진다. 수동 일시정지로 반복
악용 가능. 이누콘(`Inucon.jsx:218`)도 완전히 같은 패턴이라 **동반자 2종 공통 문제**다.
수정하면 두 동반자의 실효 회복률이 함께 내려가므로 밸런스 정본 변경에 해당 — 임의 수정 금지 원칙에
따라 보고만 한다. 고칠 경우 `elapsedTime` 대신 프레임 콜백에 들어오는 고정 delta 누적치를 쓰면 된다.

### 2. [하] 하나코는 레벨업 카드가 하나도 없다 — 미수정(설계 확인 필요)
`upgrades.js`에 `hanako` 관련 항목은 `acquireHanako` 하나뿐. 이누콘에는 `inuconHeal`(+2%) 성장
카드가 있는데 하나코에는 회복 성장 카드가 없어, 런 내내 5%/20초로 고정된다.
`upgrades.js:74` 주석은 "데미지 카드가 없다"고만 적혀 있어 회복 성장 카드 부재가 의도인지 불명확.
밸런스 정본이라 수정하지 않음.

### 3. [하] 죽은 참조 `startedAtRef` — 미수정(사소)
`Hanako.jsx:123,133-136,178`. 초기화·리셋만 하고 읽는 곳이 없다. 동작에는 영향 없음.
(참고: `Hanako.test.jsx:34`가 `expect(source).toContain('startedAtRef.current = now')`로
이 죽은 코드를 계약으로 못 박고 있어 제거하려면 테스트도 같이 손봐야 한다.)

## 확인했으나 결함 아님

- 치비코 전체무기 보정(`upgrades.js:13-19`)의 대상 스탯 목록에 `healPercent`/`healIntervalMs`가
  없다 → 하나코가 런타임 무기 상태 대신 모듈 상수를 쓰지만 죽은 버프는 발생하지 않는다.
- `recordMissionEvent`에 `amount`를 안 넘기지만 `missionProgress.js:120` `readPositive(value, 1)`이
  기본 1을 준다 → 미션 카운터 정상(테스트 1에서 실측).
- HUD 문구(`HUD.jsx:171`) "20초마다 최대 체력의 5%"는 카탈로그 정본과 일치. en/ja 로케일
  (`en.js:576`, `ja.js:576`)도 동일. ko는 인라인 fallback 사용이라 키 부재가 정상.
- R3F `<group>`에 무효 prop(예: `aria-label`) 넘기는 곳 없음.

## 변경 사항

추가한 파일 1개뿐이며 기존 소스는 건드리지 않았다.

```
$ git diff --numstat -- Developer/r3f_prototype/src
23	3	Developer/r3f_prototype/src/components/HUD.jsx
64	0	Developer/r3f_prototype/src/components/HUD.test.jsx
1	0	Developer/r3f_prototype/src/lib/locales/en.js
1	0	Developer/r3f_prototype/src/lib/locales/ja.js
1	0	Developer/r3f_prototype/src/lib/locales/ko.js

$ git diff --numstat --ignore-cr-at-eol -- Developer/r3f_prototype/src
(동일 — 줄끝 오염 없음)

$ git status --porcelain -- Developer/r3f_prototype/src/components/Weapons/
?? Developer/r3f_prototype/src/components/Weapons/Hanako.runtime.test.jsx
```

위 HUD/locales 수정분은 이 검수의 산출물이 아니라 동시 작업 중인 다른 작업분이다.
커밋하지 않았다.
