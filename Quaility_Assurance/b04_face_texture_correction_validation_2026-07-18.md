# B04 얼굴 텍스처 및 카드 레이아웃 검증

## 결과

- PASS: 보스4 얼굴이 파란 피부·검은 안경 이미지에서 지정된 초록 피부 주방장 좀비 이미지로 교체됐다.
- PASS: WebP는 `660x480`, 약 `20.5KB`이며 프로덕션 빌드 산출물에 포함된다.
- PASS: 보스4 카드에서 Preview Zoom, Preview Pan X, Preview Pan Y 변경값이 프리뷰 상태에 즉시 반영된다.
- PASS: B04의 Zoom 의미는 B01~B03과 동일하다.
- PASS: B04 얼굴 중앙 앵커와 기존 UV는 유지된다.
- PASS: Firebase 저장 코드와 다른 보스 에셋은 변경하지 않았다.

## 실행한 검사

```text
npm test -- --run src/components/ZombieMesh.test.js \
  src/components/StageBossPreview.test.jsx \
  src/components/GraphicsStudioPreview.test.js \
  src/components/GraphicsStudio.test.jsx
결과: 4 files, 86 tests passed

npm test -- --run src/components/GraphicsStudio.test.jsx \
  -t "uses the same Stage Boss Card Layout controls when B04 is selected"
결과: 1 test passed

npm test -- --run src/components/StageBossPreview.test.jsx \
  -t "StageBossPreview B04 chef framing"
결과: 2 tests passed

npm run build
결과: PASS, B04 WebP 번들 포함, B02 legacy artifact gate PASS
```

