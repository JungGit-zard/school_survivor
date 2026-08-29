# 원화 입력 폴더 계약

자산 하나당 별도 하위 폴더를 만든 뒤 다음만 넣는다.

```text
<asset-id>/
  concept/                  # 사용자가 준 원화 (정면/측면/후면 우선)
  <asset-id>.bbmodel        # Blockbench 수정 원본
  blockbench-export.glb     # Blender로 넘길 표준 교환 파일
  notes.md                  # 앞 방향, 목표 크기, 분리 파츠, rig 필요 여부
```

원화가 제공되기 전에는 이 구조에 게임의 기존 모델을 복사하거나 대체 모델을 넣지 않는다. Blender 정리 입력은 `blockbench-export.glb`이며 `.bbmodel`은 Blockbench에서만 수정한다.
