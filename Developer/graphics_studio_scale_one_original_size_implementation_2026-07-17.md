# Graphics Studio Scale 1 원본 크기 복귀 구현

## 범위

- 대상: `Developer/r3f_prototype/src/components/GraphicsStudio.jsx`
- 적용 범위: Graphics Studio에서 현재 선택한 항목 루트, 파트, 그룹의 공통 `Scale` 입력
- B02 전용 분기나 저장소 마이그레이션은 추가하지 않았다.

여기서 원본 크기란 Studio 선택 범위의 tuning multiplier가 `[1, 1, 1]`로 복귀한다는 뜻이다. TitleScene, StageBossPreview, 전투의 의도된 화면별 배치·게임플레이 wrapper scale(예: B02 lobby `0.82`, title `0.93`, `ENEMY_STATS` `2.0`)은 이번 변경 대상이 아니며 그대로 유지된다.

## 확정 원인

2026-06-23에 추가된 uniform `Scale` 입력은 `scale`만 갱신했다. 이후 2026-07-05에 `scale * scaleX/Y/Z` 방식의 축별 배율이 도입됐지만, uniform Scale을 원본값 `1`로 되돌릴 때 축별 배율도 원본값으로 돌아가야 한다는 의미가 연결되지 않았다.

B02의 오래된 루트 저장값 `scaleX=1.7`, `scaleY=1.6`, `scaleZ=1.9`가 이 불일치를 눈에 보이게 만들었다. 사용자가 `Scale=1`을 입력해도 세 축이 남아 저장값, Studio 프리뷰, 타이틀·로비·게임 동기화 크기가 원본으로 복귀하지 않았다.

## 구현

공통 Scale `SliderRow`의 `onChange` patch만 변경했다.

- `scale === 1`: 선택 범위의 `scale`, `scaleX`, `scaleY`, `scaleZ`를 모두 `1`로 저장한다.
- `scale !== 1`: `scale`만 변경해 기존 축별 배율을 보존한다.
- Width X, Height Y, Depth Z 입력은 변경하지 않았다.
- `updateTuning`의 기존 merge 경로를 사용하므로 위치, 회전, 색, 재질, 외곽선, 애니메이션 및 다른 선택 범위의 값은 보존된다.

## 검증

```text
npm test -- --run src/components/GraphicsStudio.test.jsx -t "restores the selected B02 root to original scale when Scale is 1"
PASS: 1 passed, 26 skipped

npm test -- --run src/components/GraphicsStudio.test.jsx
PASS: 27 passed

npm test -- --run src/components/StudioTunedGroup.test.jsx src/lib/graphicsStudioConfig.test.js src/components/StageBossPreview.test.jsx src/components/TitleScene3D.test.jsx
PARTIAL: 101 passed, 1 failed
```

교차 회귀군의 실패 1건은 `graphicsStudioConfig.test.js`의 `never downgrades player tunings from a newer stored revision`이다. 이 UI patch와 무관한 B02 source seed 추가 기대값 불일치이며 단독 실행에서도 동일하게 재현됐다. 기대 문자열에는 player만 있지만 실제 저장 문자열에는 기본 `zombie-b02-teacher`가 추가된다.
