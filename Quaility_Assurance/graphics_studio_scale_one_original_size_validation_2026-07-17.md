# Graphics Studio Scale 1 원본 크기 복귀 검증

## 검증 대상

Graphics Studio에서 선택한 루트, 파트 또는 그룹의 uniform `Scale`을 정확히 `1`로 입력하면 해당 선택 범위의 `scale`, `scaleX`, `scaleY`, `scaleZ`가 모두 `1`이 되는지 검증한다.

이 검증에서 원본 크기는 Studio 선택 범위의 tuning multiplier `[1, 1, 1]`을 뜻한다. TitleScene, StageBossPreview, 전투의 승인된 화면별 배치·게임플레이 wrapper scale(예: B02 lobby `0.82`, title `0.93`, `ENEMY_STATS` `2.0`)은 `1`로 바꾸지 않으며 이번 검증 범위 밖에서 그대로 유지한다.

대표 회귀 fixture는 현재 B02 source revision `3`과 다음 저장값을 사용했다.

- `zombie-b02-teacher`: `scale=1.62`, `scaleX=1.7`, `scaleY=1.6`, `scaleZ=1.9`
- 보존 필드: `positionX=0.45`, `rotationY=27`, `color=#aabbcc`

## 회귀 테스트 결과

`restores the selected B02 root to original scale when Scale is 1` 테스트는 실제 numeric input `scaleValue`에서 `input`과 `blur`를 발생시킨다.

- `Scale=1.4`: 기존 `scaleX/Y/Z`가 보존됨
- `Scale=1`: 저장값과 UI의 네 scale 축이 모두 `1`
- Studio preview: 원본 scale 표시
- live-sync postMessage payload: 네 scale 축 모두 `1`
- 위치, 회전, 색: 저장값과 payload에서 보존

```text
npm test -- --run src/components/GraphicsStudio.test.jsx -t "restores the selected B02 root to original scale when Scale is 1"
결과: PASS, 1 passed / 26 skipped

npm test -- --run src/components/GraphicsStudio.test.jsx
결과: PASS, 27 passed
```

## 교차 회귀

```text
npm test -- --run src/components/StudioTunedGroup.test.jsx src/lib/graphicsStudioConfig.test.js src/components/StageBossPreview.test.jsx src/components/TitleScene3D.test.jsx
결과: 101 passed / 1 failed
```

실패 테스트:

```text
graphicsStudioConfig > never downgrades player tunings from a newer stored revision
Expected: player와 player::part::future만 있는 원문 저장 문자열
Received: 위 값에 기본 zombie-b02-teacher source seed가 추가된 저장 문자열
```

다음 단독 명령에서도 동일 실패가 재현됐다.

```text
npm test -- --run src/lib/graphicsStudioConfig.test.js -t "never downgrades player tunings from a newer stored revision"
결과: 1 failed / 43 skipped
```

이번 변경은 `GraphicsStudio.jsx`의 공통 UI 입력 seam에만 있으므로 위 source-revision 저장 문자열 실패와 실행 경로가 분리된다. Scale 1 회귀 동작은 통과했지만, 전체 지정 회귀군은 기존 1건 때문에 완전 통과 상태로 기록하지 않는다.
