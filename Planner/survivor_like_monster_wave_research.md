# Survivor-like Monster Wave Research

작성일: 2026-04-25

## 조사 목적

`탕탕특공대`, `뱀파이어 서바이버`, 그리고 공개 클론 프로젝트에서 몬스터 등장 시나리오와 밸런스 문서가 공개되어 있는지 확인한다.

## 핵심 결론

- `뱀파이어 서바이버`는 공개 위키에 스테이지별 웨이브 표가 있어 가장 직접적인 참고 자료로 쓸 수 있다.
- `탕탕특공대`는 공략, 장비/스킬 계산기, 티어표 자료는 많지만 챕터별 몬스터 웨이브나 내부 밸런스 문서 수준의 공개 자료는 찾기 어렵다.
- 클론 프로젝트는 별도 기획 문서보다 코드/에셋 설정 파일에 밸런스가 들어 있는 경우가 많다.
- BangBang Survivor에는 “문서형 밸런스표 + 코드에서 읽는 설정 데이터” 방식이 가장 적합해 보인다.

## 확인한 공개 자료

### Vampire Survivors Wiki

출처:
- https://vampire-survivors.fandom.com/wiki/Enemies
- https://vampire-survivors.fandom.com/wiki/Mad_Forest
- https://vampire.survivors.wiki/w/Stages

확인 내용:
- 적은 보통 1분 단위 웨이브로 등장한다.
- 각 웨이브는 최소 적 수, 스폰 간격, 적 종류, 보스, 보상 상자, 맵 이벤트를 가진다.
- 적 수가 일정 이상 많으면 일반 주기 스폰은 멈추고 보스/맵 이벤트 중심으로 제한된다.
- Mad Forest 문서에는 0:00부터 분 단위로 적 종류, 최소 수, 스폰 간격, 보스, Bat Swarm 같은 이벤트가 표로 정리되어 있다.

BangBang Survivor에 참고할 점:
- 초반 0~2분은 약한 적으로 경험치 공급.
- 3~5분부터 빠른 적, 튼튼한 적, 군집 이벤트를 섞는다.
- 보스와 보상 상자는 특정 시간에 묶어 플레이 리듬을 만든다.

### Monster Survivors Template Documentation

출처:
- https://october-studio.gitbook.io/monster-survivors-documentation/stages/stage-creator
- https://october-studio.gitbook.io/monster-survivors-documentation/stages/tracks-and-clips
- https://october-studio.gitbook.io/monster-survivors-documentation/enemies/simple-enemies

확인 내용:
- Unity Timeline 방식으로 스테이지를 만든다.
- Wave Track, Boss Track, Camera Track으로 이벤트를 분리한다.
- Wave Track에는 Burst, Continuous, Maintain 방식이 있다.
  - Burst: 한 번에 일정 수 등장.
  - Continuous: 지속 시간 동안 초당 일정 수 등장.
  - Maintain: 화면에 일정 수가 유지되도록 보충.
- Wave Override로 특정 웨이브에서 적 체력, 이동 속도, 데미지 등을 조정한다.

BangBang Survivor에 참고할 점:
- 초보자 프로젝트에는 Unity Timeline 그대로보다 표 기반 데이터가 더 쉽다.
- 하지만 Burst/Continuous/Maintain 세 가지 스폰 타입은 그대로 차용할 가치가 있다.

### matthiasbroske/VampireSurvivorsClone

출처:
- https://github.com/matthiasbroske/VampireSurvivorsClone

확인 내용:
- README에 적 스폰 확률/스폰 속도 키프레임 시스템이 있다고 명시되어 있다.
- 로컬 확인 결과 `Assets/Blueprints/Levels/Level 1.asset`에 `monsterSpawnTable`이 있고, 다음 값이 들어 있다.
  - `spawnRateKeyframes`
  - `spawnChanceKeyframes`
  - `hpMultiplierKeyframes`
- 즉 별도 문서 대신 ScriptableObject 에셋이 밸런스표 역할을 한다.

BangBang Survivor에 참고할 점:
- 시간 진행률 `t`를 0~1로 두고 스폰 속도, 몬스터 확률, 체력 보정을 보간하는 방식은 이해하기 쉽고 확장도 쉽다.

### newtron-vania/Undead_Survivor-Vampire_Survivor-copy-practice

출처:
- https://github.com/newtron-vania/Undead_Survivor-Vampire_Survivor-copy-practice

확인 내용:
- README에 SpawningPool, 중간 보스, 보스, 몬스터 종류가 설명되어 있다.
- 게임 시간이 1분 지날 때마다 중간 보스가 등장하고, 5분에 보스가 등장하며, 보스를 처치하면 승리한다.
- `MonsterData.json`에는 몬스터별 체력, 데미지, 방어력, 이동 속도, 경험치 배율이 있다.
- `Spawner.cs`는 최대 몬스터 수 50, 기본 스폰 시간 0.5초, 후반 0.1초, 시간 단계별 몬스터 추첨을 사용한다.

BangBang Survivor에 참고할 점:
- 5분짜리 프로토타입 구조에는 매우 알맞다.
- 단, 분 단위 웨이브표가 없어서 “언제 어떤 몬스터가 얼마나 나오는지”를 문서로 보강해야 한다.

### sephirxth/SurvivorDemo

출처:
- https://github.com/sephirxth/SurvivorDemo
- https://survivor-demo.vercel.app

확인 내용:
- 브라우저에서 바로 플레이 가능한 Vampire Survivors-style WebGL 프로젝트다.
- README 기준 핵심은 자동 공격, 점점 어려워지는 적 웨이브, 파워업 시스템이다.
- 공개 저장소에는 빌드 결과가 중심이라 세부 밸런스 문서로 쓰기에는 한계가 있다.

### Quillraven/slime-survivor

출처:
- https://github.com/Quillraven/slime-survivor

확인 내용:
- LibGDX 튜토리얼용 단순 Vampire Survivors 클론이다.
- 핵심 조작, 이동, 충돌, 기본 공격 구조 학습에는 좋지만 몬스터 웨이브 밸런스 문서로 쓰기에는 제한적이다.

## 탕탕특공대 자료 상태

확인한 자료 유형:
- 챕터 공략
- 장비/스킬 티어표
- 데미지/치명타 계산기
- 이벤트/업데이트 소개
- 일부 매크로 또는 분석성 게시글

판단:
- 공개 웹에서 “챕터별 몬스터 등장 시나리오”나 “내부 밸런스표”는 확인하기 어렵다.
- 탕탕특공대는 모바일 라이브 서비스 게임이라 정확한 내부 밸런스 데이터는 비공개일 가능성이 높다.
- 참고할 때는 정확한 수치보다 UX 흐름을 보는 것이 좋다.
  - 초반 약한 몬스터로 성장 기회 제공.
  - 중반 포위 압박과 원거리/돌진형 섞기.
  - 보스 전에는 잡몹 밀도와 드롭으로 긴장 완화/강화.

## BangBang Survivor 초안에 반영할 추천 구조

이 아래 표는 외부 사례를 바탕으로 만든 일반 예시다. 현재 프로젝트에 실제 적용할 1차안은 `Planner/monster_spawn_scenario_5min_boss_4min.md`를 우선 기준으로 삼는다.

현재 적용안의 핵심 차이:
- 1판은 5분이다.
- 보스는 5:00이 아니라 4:00에 등장한다.
- 4:00~5:00은 보스전 구간이다.
- 보스 등장 직후에는 일반 몬스터 수를 줄여 보스 패턴을 학습할 시간을 준다.

### 몬스터 등장 시나리오 표

필드:
- 시간
- 웨이브 이름
- 스폰 타입
- 몬스터 구성
- 화면 목표 수
- 초당 스폰 수
- 체력 배율
- 이동 속도 배율
- 데미지 배율
- 이벤트
- 의도

예시:

| 시간 | 스폰 타입 | 몬스터 구성 | 목표 수 | 초당 스폰 | 보정 | 의도 |
| --- | --- | --- | ---: | ---: | --- | --- |
| 0:00~0:59 | Maintain | 기본 좀비 100% | 20 | 1.0 | HP x1.0 | 조작 적응 |
| 1:00~1:59 | Continuous | 기본 80%, 빠른 20% | 35 | 1.5 | HP x1.0 | 첫 압박 |
| 2:00~2:59 | Burst+Maintain | 기본 60%, 빠른 30%, 탱커 10% | 50 | 2.0 | HP x1.1 | 포위 경험 |
| 3:00~3:59 | Continuous | 빠른 40%, 탱커 30%, 원거리 30% | 65 | 2.5 | HP x1.2 | 이동 강제 |
| 4:00~4:59 | Burst | 무리 이벤트 + 중간보스 | 80 | 3.0 | HP x1.35 | 보스 전 고조 |
| 5:00 | Boss | 보스 1 + 잡몹 유지 | 40 | 1.0 | Boss HP x1.0 | 승리 목표 |

주의:
- 위 예시는 외부 사례를 요약한 형식 샘플이다.
- BangBang Survivor의 현재 적용안에서는 `4:00`에 보스가 등장하므로 위 예시의 `4:00~5:00`, `5:00` 항목을 그대로 사용하지 않는다.

### 밸런스 문서 추천

먼저 문서로 작성:
- `Planner/monster_spawn_scenario_5min_boss_4min.md`

이후 구현용 데이터로 변환:
- JSON 또는 TypeScript 상수
- 예: `Developer/data/monsterWaves.ts`

초보자 기준으로는 문서와 데이터를 1:1로 맞추는 방식이 좋다. 문서의 한 줄이 코드 데이터 한 줄이 되면, 나중에 튜닝할 때 헷갈리지 않는다.
