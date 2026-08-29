# Blockbench·Blender GLB 그래픽 작업 기록

- 담당: Three_Mini
- Kanban: `escape-zombie-school` / `t_5504612d`
- 적용 범위: 원화 기반 저폴리 자산 제작 경로. 기존 게임·Studio·Firebase·타이틀 시각 정본에는 변경 없음.

원화가 오면 Blockbench에서 `.bbmodel` 수정 원본을 보관하고, export GLB를 Blender 5.2에서 최종 정리한다. 원화가 없는 지금은 기존 캐릭터나 소품을 추정해 바꾸지 않는다.

작업자는 원화가 지정한 asset-id를 그대로 쓴다. 형식이 lower-kebab-case가 아니면 다른 이름으로 자동 변환하지 않고 파이프라인을 중단한다. 기존 output GLB도 기본적으로 덮어쓰지 않으며, 작업자가 `-Force`를 명시한 경우만 교체한다.

최종 GLB는 flat한 면별 노멀, 의미 있는 part 이름, 안정적인 root/child 이름, 필요한 재질과 선택적 armature 계약을 갖는다. flat 품질은 face boundary 분리와 GLB 재가져오기 후 loop-normal 검증으로 확인한다.

Smoke fixture는 시스템 임시 보관물에서만 쓰고 검증 뒤 workspace에서 제거했다. 이 fixture는 게임 자산·원화 대체물·Studio 입력이 아니며, 필요하면 `make_lowpoly_fixture.py`로 다시 만든다.
