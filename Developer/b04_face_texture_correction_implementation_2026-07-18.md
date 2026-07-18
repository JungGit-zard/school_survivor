# B04 얼굴 텍스처 교체 구현 기록

## 범위

- 사용자 지정 원본: `Graphic_designer/graphic_asset/boss_etc/texture_boss04.png`
- 런타임 에셋: `Developer/r3f_prototype/src/assets/faces/b04_chef_boss_face.webp`
- 모델, UV, Graphics Studio 레이아웃 수치, Firebase 저장 코드는 변경하지 않았다.

## 구현

- 지정 원본을 실제 WebP(VP8, 품질 92)로 재인코딩했다.
- 원본과 같은 `660x480` 해상도 및 `1.375` 화면비를 유지했다.
- 런타임 WebP SHA-256:
  `1bb8899b0b132bf787491aef924914d148d3071c0448633e395bea10cc8117c9`
- `ZombieMesh.test.js`에 위 승인 에셋의 SHA-256 회귀 검사를 추가했다.

## 레이아웃 호환성

`B04_CHEF_FACE.size`는 `0.66 / 0.48 = 1.375`로 원본 화면비와 정확히 같다.
따라서 기존 얼굴 평면 크기, 위치, repeat, offset은 그대로 유지했다.

