# 그래픽 에이전트 핸드오프 · 2026-06-09

그래픽 작업을 맡은 에이전트에게 남기는 인수인계 메시지다. **작업 시작 전 1~2번을 반드시 먼저 읽어라.**

---

## 1. ⚠️ Git 워크플로가 바뀌었다 (가장 중요)

저장소가 **단일 트렁크 `main`** 모델로 재정비됐다. 예전 브랜치 구조는 더 이상 쓰지 않는다.

- **트렁크 = `main`** (GitHub 기본 브랜치). 모든 작업의 진실은 여기다.
- **사라진 브랜치**: `integration`, `feature/codex-gameplay-iteration`, `claude/gameplay-iteration`, `feature/player-ellipse-shadow`, 기타 stale 브랜치 → 전부 삭제됨(복구용 `archive/*` 태그로만 보존). **이 이름들로 분기·머지하지 마라.**
- **작업 방식**: 작업 단위 단기 브랜치.
  ```bash
  git fetch origin
  git switch -c claude/<작업명> origin/main   # 항상 최신 main에서 분기
  # …작업·커밋…
  git push -u origin claude/<작업명>
  ```
  (codex 워크트리면 prefix를 `codex/`로)
- **완료 시**: main에 머지 후 그 브랜치는 삭제. 더 이상 "integration을 merge-down" 하는 절차는 없다.
- 자세한 전환 배경은 계획서(트렁크 모델) 참조. 헷갈리면 `main`에서 분기하는 것만 기억하면 된다.

## 2. 방금 main에 들어온 것 (2026-06-09)

Stage 1 교실 stage-object 작업이 main에 머지됐다 (`feature/stage-object-chair-student` → main):

- `Developer/r3f_prototype/src/components/StageObjects/` 에 **ClassroomDesk / ClassroomChair / UnconsciousStudent** 컴포넌트 + `StageObjectLayer` + `stageObjectPlacements` (+테스트).
- 쓰러진 책상·의자 더미·쓰러진 학생 등 "버려진 교실" 소품 클러터가 배치됨.

→ 너의 그래픽 작업은 **이 StageObjects 위에 얹히거나 보강**하는 방향이다. 같은 배치 데이터(`stageObjectPlacements.js`)와 컴포넌트 패턴을 재사용하라. 처음부터 새로 만들지 마라.

## 3. 그래픽 작업 대상 — Stage 1 "버려진 교실" 재구성

정본 요구사항: **`CEO/docs/brainstorms/2026-05-20-stage-graphic-redesign-requirements.md`** (이걸 origin으로 삼아라).

핵심 목표: 현재 회색 콘크리트 + 격자선 바닥의 "프로토타입 인상"을 없애고, 출근길 타깃이 **첫 30초에 "감염된 학교 교실"임을 시각으로 인식**하게 한다. (CEO 기준 이 첫인상 해소는 다른 작업의 출시 게이트이기도 하다.)

미구현으로 남은 그래픽 요소:
- **바닥**: `Floor.jsx`를 `color_palette_guide.md` §2-1 마루 계열(주색 `0xa99a73` 등)로 교체, `<lineSegments>` 격자 오버레이 **완전 제거**(판자 이음새가 그리드 역할 대체).
- **외곽 props**: 오염된 사물함·안전콘·바리케이드·경고 테이프 등 (책상/의자/학생은 §2에서 일부 완료).
- **분위기 overlay**: 찢어진 시험지, 환경 오염 웅덩이(정적), 깨진 창문 그림자 — 모두 충돌 없는 장식.

## 4. 시작 전 반드시 결정할 것 (Blocker)

**[R10] 환경 오염 웅덩이(정적 장식) vs 보스 오염 장판(동적 위험)의 시각 구분 정책** 이 아직 미결이다. 둘 다 녹색 계열이라, 플레이어가 즉시 구분 못 하면 "밟아도 안전한 것"과 "밟으면 피해"가 헷갈린다. 후보: (a) 외곽선 굵기, (b) 내부 채도/명도, (c) 펄스 애니메이션 유무, (d) 조합. **이걸 정하기 전엔 오염 웅덩이 구현에 들어가지 마라** (AE2 수용 기준 직결).

## 5. 지켜야 할 제약

- **카툰 렌더링 정책 준수**: `current_visual_rules.md` §1 — `MeshToonMaterial` + outlined hull 외곽선, 좌표 일치, 2D 픽셀 캐릭터 금지. props/overlay도 동일 시각 언어.
- **모바일 9:16 가독성**: 플레이어·적·드랍이 props·분위기 요소에 묻히면 안 됨 (390×844 / 375×812 기준).
- **정적 무대**: 5분 세션 동안 바닥·props·분위기는 변하지 않는다 (동적인 것은 VFX·드랍·캐릭터·보스뿐).
- **건드리지 말 것**: 기존 보스 오염 장판 VFX, 캐릭터/적/무기 시각, 실시간 그림자·라이팅. R3F 단일 스택(Phaser 합성 모델은 historical).

## 6. 작업 시작 절차 요약

1. `git fetch origin && git switch -c claude/stage1-classroom-graphics origin/main`
2. 4번(R10) 결정 확인/요청 → 미결이면 그것부터.
3. `CEO/docs/brainstorms/2026-05-20-...md` 요구사항대로 구현, StageObjects 패턴 재사용.
4. 모바일 9:16 + 토온 정책 검증 후 커밋·푸시 → main 머지 요청.

질문이나 막히는 점은 이 파일 옆에 메모를 남기거나 CEO 우선순위 문서를 참조하라.
