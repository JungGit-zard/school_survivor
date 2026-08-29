# Blockbench → Blender 5.2 → GLB 파이프라인

- 담당: Three_Mini
- Kanban: `escape-zombie-school` / `t_5504612d`
- 범위: 원화 기반 신규 저폴리 자산의 제작·검증 도구만 제공한다. 게임 런타임, 캐릭터, Firebase, Graphics Studio, Title은 변경하지 않는다.

## 입력과 Blockbench 단계

원화가 들어오면 자산별 작업 폴더에 원화, 제작 메모, Blockbench 원본 `<asset-id>.bbmodel`을 보관한다. `.bbmodel`은 수정 정본이고, Blender 입력은 Blockbench의 `File → Export → glTF 2.0`으로 만든 `.glb`이다. Blender는 `.bbmodel`을 직접 읽지 않는다.

Blockbench에서는 원화에 지정된 실루엣과 분리 파츠를 우선한다. part 이름은 `head`, `body`, `left-arm`처럼 의미 있게 정하고 pivot도 실제 회전 중심에 둔다. 원화가 없는 현재는 기존 게임 모델을 이 단계에서 추정·교체하지 않는다.

## 단일 실행 명령

`Developer/r3f_prototype/scripts/blockbench_blender_glb/run_pipeline.ps1`가 Windows 단일 진입점이다. 고정 Blender 실행 파일 `C:\Program Files\Blender Foundation\Blender 5.2\blender.exe`로 normalize와 validate를 순서대로 실행하고, 실패한 단계의 exit code를 반환한다.

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/blockbench_blender_glb/run_pipeline.ps1 `
  -InputPath D:\art\zombie-e01\blockbench\exports\zombie-e01.glb `
  -OutputPath D:\art\zombie-e01\blender\zombie-e01.glb `
  -AssetId zombie-e01 `
  -Armature optional
```

`AssetId`는 사용자가 지정한 값을 절대 변환하지 않는다. lower-kebab-case가 아니면 입력 원문을 포함한 오류로 중단한다. input/output 경로가 같으면 항상 실패한다. 이미 있는 output은 기본 거부하며, 사용자가 덮어쓰기를 명시했을 때만 `-Force` (`normalize_export.py` 직접 실행 시 `--force`)를 사용한다.

## Blender 정규화 계약

- 단위는 metric, `scale_length=1.0`, GLB는 glTF Y-up으로 export한다.
- 최상위 Empty는 정확히 `asset-id`, 하위 mesh/armature는 결정적인 `asset-id__...` 이름을 사용한다.
- mesh의 회전·스케일을 적용하고, 위치와 부모 계층 배치는 보존한다.
- 누락된 재질은 asset 범위 기본 재질을 붙이고 재질 이름도 asset 범위로 정규화한다.
- armature는 자동 생성하지 않는다. `optional` / `required` / `forbid` 계약으로 기존 rig만 보존·검사한다.
- 이 도구는 Studio 값, Firebase, 숫자 child path, 런타임 base transform을 읽거나 변경하지 않는다. 실제 적용은 사용자가 원화를 제공한 별도 vertical slice에서만 검토한다.

## GLB 재가져오기 검증

`validate_glb.py`는 빈 Blender 세션에 결과 GLB를 다시 가져와 root, 이름, 재질, armature 조건, triangle 수를 검사한다. flat 검증은 Blender importer의 `use_smooth` 플래그만 신뢰하지 않는다. 정규화 단계에서 **face boundary를 분리**하고, validator는 각 loop normal이 해당 face normal과 일치하는지 검사한다. `export_normals=False`는 이 face-normal 결과를 glTF 왕복에서 유지하기 위한 export 설정일 뿐, 단독 수정이 아니다.

## 검증 기록

- `python scripts/blockbench_blender_glb/test_pipeline_contract.py`: 3 tests PASS.
- Blender 5.2 negative smoke: 잘못된 asset-id, 동일 input/output, 기존 output의 무강제 실행은 각각 exit code 1로 거부.
- Blender 5.2 positive smoke: `run_pipeline.ps1 -Force`가 normalize → re-import validate를 완료했고 `mesh_count=2`, `armature_count=0`, `triangle_count=24`, `errors=[]`.

Smoke fixture는 시스템 임시 보관물에서 생성·검증 후 workspace에서 제거했다. 재현 명령은 `make_lowpoly_fixture.py`에 있으며, fixture는 제품 자산·영구 산출물·Studio 입력이 아니다.
