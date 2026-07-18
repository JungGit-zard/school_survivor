# 타이틀 화면 붕괴 복구 기술 메모 — dd471b4

작성일: 2026-07-17  
담당: Three_Mini / threemini  
주 산출물: `Graphic_designer/title_scene_collapse_recovery_review_2026-07-17.md`

## 목적

`dd471b4` (`Fix title scene and add CDP inspector`)에서 검은 사각형 두 개의 직접 원인인 `ToonBox` 삭제와 CDP 검사기 추가를 제외하고, 타이틀 장면의 기존 구성을 바꾼 기술 변경을 분리했다.

## 확인한 커밋 범위

- 부모: `676a28d9c7095f4c24e0a307aa541dc09c43cd00`
- 대상: `dd471b420d1fdcdb1a7276c9728bf758c08fffd7`
- 변경 파일:
  - `Developer/r3f_prototype/index.html`
  - `Developer/r3f_prototype/src/components/TitleScene3D.jsx`
  - `Developer/r3f_prototype/src/components/TitleScene3D.test.jsx`
  - `Developer/r3f_prototype/src/debug/screenElementInspector.js`

## 기술 판정

유지할 최소 변경:

- `TitleScene3D.jsx` 부모 라인 570-571의 `ToonBox` 배치 두 줄 삭제.
- 미사용 `ToonBox` 컴포넌트와 전용 import(`inflateScale`, `outlineMat`) 삭제.
- CDP 검사기는 이번 카드 기준으로 허용 범위에 분리했지만, 일반 릴리스 전에는 제거 또는 쿼리 게이트가 필요하다.

복구할 변경:

- `StarlinkSatelliteModel`, `ZomlonbiskModel`, `TitleFarBackgroundStory` 삭제 복구.
- `CLUB_LIGHT_HOUSING_GEO`, `housingMat`, `lensMat`, 하우징/렌즈 mesh 삭제 복구.
- `wallMat`와 좌우 side-wall mesh 삭제 복구.
- 위 복구와 충돌하는 `TitleScene3D.test.jsx` 기대값 복구.

## 검증

이 카드에서는 런타임 코드를 수정하지 않았으므로 테스트/빌드는 실행하지 않았다. 산출물 파일을 직접 읽어 생성 여부를 확인했고, `git status --short -- Graphic_designer/title_scene_collapse_recovery_review_2026-07-17.md`에서 신규 문서 생성을 확인했다.

## 다음 작업자 주의

현재 프로젝트 작업트리에 다수의 미커밋 변경이 존재한다. 복구 패치를 실제 적용할 경우 별도 워크트리 또는 현재 변경 보존 절차를 먼저 수행하고, 최소한 다음을 실행한다.

```bash
cd D:/JungSil/2.Minigame_project/school_survivor-integration/Developer/r3f_prototype
npm test -- src/components/TitleScene3D.test.jsx
npm run build
```
