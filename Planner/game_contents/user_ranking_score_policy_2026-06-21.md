# 유저랭킹 점수 정책 기획 - 2026-06-21

## 결론

랭킹 점수는 `생존 시간`을 중심으로 한다.
단, Stage 1과 Stage 2가 모두 240초 클리어라 생존 시간만으로는 전체 랭킹에서 차이가 부족하다.

따라서 1차 점수 정책은 다음처럼 잡는다.

```text
랭킹 점수 = 생존 초 + 스테이지 보너스 + 클리어 보너스
```

## 1차 공식

```text
Stage 1: 생존 초 + 클리어 보너스
Stage 2: 생존 초 + 60점 + 클리어 보너스
클리어 보너스: 30점
```

예시:

```text
Stage 1에서 3분 생존: 180점
Stage 1 클리어: 240 + 30 = 270점
Stage 2에서 3분 생존: 180 + 60 = 240점
Stage 2 클리어: 240 + 60 + 30 = 330점
```

유저에게 보여줄 설명:

```text
오래 버틸수록 점수가 높고, 어려운 스테이지와 클리어에는 보너스가 붙습니다.
```

## 동점 처리

동점은 다음 순서로 정렬한다.

1. 클리어한 기록이 미클리어 기록보다 위.
2. 더 높은 스테이지 기록이 위.
3. 생존 시간이 더 긴 기록이 위.
4. 처치 수가 더 많은 기록이 위.
5. 먼저 달성한 기록이 위.
6. 그래도 같으면 닉네임 가나다순.

## 제외 기준

1차 공식에는 다음 값을 넣지 않는다.

- 골드
- 누적 골드
- 무기 해금 개수
- 패시브 업그레이드 레벨
- XP
- 레벨업 횟수
- 총 데미지

이유:

- 초보자가 점수 이유를 이해하기 어렵다.
- 특정 무기나 파밍 루트가 랭킹을 왜곡할 수 있다.
- 서버 검증 전에는 조작 위험이 크다.

## 서버 검증 전/후 구분

현재 랭킹은 로컬/개인 기록 표시로 취급한다.
공식 공개 랭킹은 서버 검증 후 적용한다.

서버 검증 후 랭킹 데이터는 개인 진행도와 분리한다.

권장 데이터:

```text
leaderboards/global_survival_v1/entries/{uid}
leaderboards/stage1_survival_v1/entries/{uid}
leaderboards/stage2_survival_v1/entries/{uid}
```

권장 필드:

```text
uid
nickname
score
scoreType = survival_v1
stageId
survivalSeconds
kills
cleared
runId
submittedAt
updatedAt
validationStatus
schemaVersion
```
