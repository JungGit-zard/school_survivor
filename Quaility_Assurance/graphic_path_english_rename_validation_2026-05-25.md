# Graphic path English rename validation - 2026-05-25

## 검증 목표

그래픽 분류 폴더의 한글 이름 계열이 `Graphic_designer/A.graphic` 계열 영어 경로로 바뀐 뒤에도 코드 실행, 테스트, 빌드, 문서 참조에 문제가 없는지 확인한다.

## 실제 확인한 경로

- `Graphic_designer/A.graphic`
- `Graphic_designer/A.graphic/A-1.weapon`
- `Graphic_designer/A.graphic/A-2.character`
- `Graphic_designer/A.graphic/A-3.background`
- `Graphic_designer/A.graphic/A-4.effect`

## 조치

예전 한글 경로를 참조하던 문서 링크를 새 영어 경로로 수정했다.

- 그래픽 루트 -> `Graphic_designer/A.graphic`
- 무기 그래픽 -> `A-1.weapon`
- 캐릭터 그래픽 -> `A-2.character`
- 배경 그래픽 -> `A-3.background`
- 효과 그래픽 -> `A-4.effect`

## 실행한 검증

```powershell
rg -n "<old Korean graphic path patterns>" . --glob '!tmp/**' --glob '!Developer/r3f_prototype/dist/**'
rg -n "Graphic_designer/A\.graphic|Graphic_designer/A\.그래픽" . --glob '!tmp/**' --glob '!Developer/r3f_prototype/dist/**'
cd Developer/r3f_prototype
npm test -- --run
npm run build
```

## 결과

- 예전 한글 경로 참조는 검색 결과 없음.
- 새 영어 경로 참조는 의도한 문서들에서 확인됨.
- 테스트 파일 18개 통과.
- 테스트 130개 통과.
- Vite 빌드 성공.
- 기존 Vite chunk size warning은 계속 표시되지만 빌드 실패는 아니다.

## 판정

영어 경로 변경은 현재 게임 실행 코드의 테스트와 빌드에 문제를 만들지 않는다. 문서 참조도 새 경로 기준으로 정리했다.
