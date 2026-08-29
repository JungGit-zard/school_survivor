# Blockbench → Blender → GLB 도구

원화가 들어오면 이 폴더의 입력 계약을 따라 **Blockbench에서 `.bbmodel` 원본을 보관**하고, Blockbench의 `File → Export → glTF 2.0`으로 만든 `.glb`만 Blender 정리 단계에 넘긴다. Blender는 `.bbmodel`을 직접 읽지 않는다.

입력 파일은 별도의 자산 작업 폴더에 두고, 아래처럼 실행한다. 예시는 Windows PowerShell 기준이며 Blender 5.2의 지정 경로를 사용한다.

```powershell
$blender = 'C:\Program Files\Blender Foundation\Blender 5.2\blender.exe'
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/blockbench_blender_glb/run_pipeline.ps1 `
  -InputPath D:\art\zombie-e01\blockbench-export.glb `
  -OutputPath D:\art\zombie-e01\zombie-e01.glb `
  -AssetId zombie-e01 `
  -Armature optional
```

`AssetId`는 사용자가 지정한 값을 그대로 쓴다. 값은 lower-kebab-case여야 하며, 형식이 틀리면 자동 변환하지 않고 실패한다. 기본적으로 이미 있는 출력 파일은 실패하며, 사용자가 덮어쓰기를 명시한 경우에만 `-Force`를 추가한다. 입력과 출력 경로를 같게 지정하는 것은 항상 실패한다.

`-Armature required`는 원화가 리깅까지 요구할 때만 사용한다. 스크립트는 뼈대를 자동 생성하지 않으며, 있는 armature와 애니메이션 훅을 보존한다.

정리 계약:

- Blender 단위는 미터, GLB 축은 glTF 표준(Y-up)으로 내보낸다.
- 최상위 Empty는 `asset-id`, 하위 메시/armature 이름은 `asset-id__...`으로 결정적으로 만든다.
- 메시의 회전·스케일만 적용하고, 배치는 부모 계층에 보존한다.
- flat shading, re-import 가능한 per-face normal, 안정적인 material 이름, 누락 시 기본 재질을 보장한다.
- 이 도구는 Firebase, Graphics Studio, 타이틀 또는 게임 런타임을 읽거나 수정하지 않는다. 실제 게임 적용은 사용자가 원화를 제공한 뒤 별도 승인된 vertical slice에서만 한다.
