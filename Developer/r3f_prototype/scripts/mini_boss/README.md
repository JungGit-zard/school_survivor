# mini_boss — Stage 5 B10 / Stage 6 B05 Mini 보스 소품·포즈 생성기 (Blender 5.2 헤드리스)

`src/lib/miniBossProps.data.js`(생성 파일)를 다시 만든다. 게임 런타임은 이 스크립트를 쓰지 않는다.

```
"C:\Program Files\Blender Foundation\Blender 5.2\blender.exe" -b --factory-startup --python scripts\mini_boss\export_props.py -- <out.json>
```

- `export_props.py`가 `b10.option_a` / `b05.option_a`(안 A, Terry 2026-11-21 채택)를 기존 색 칸만 쓰는 모드(`bosslib.USE_EXISTING = True`)로 빌드하고, 소품 삼각형(파트 최종 좌표)·색 칸·포즈 각도를 JSON으로 쓴다.
- JSON → `src/lib/miniBossProps.data.js`: 머리 주석을 유지하고 `{B10:{props,stunProps},B05:{...}}`만 옮긴다. 바꾸면 `Developer/agent_room/3d_asset_provenance_manifest_2026-11-14.json`의 `kenneyMiniBossesB10B05` sha256·bytes를 갱신한다.
- 포즈 각도는 `src/lib/miniBossRoster.js`의 `MINI_BOSS_POSES`와 같은 숫자다(B10 평상·출석부의 오른팔 −0.8은 게임 쪽에서 땅 닿지 않게 고친 값이고 `b10.py`도 같다).
- 입력 GLB: 메쉬옵트 없는 Mini 굽기 결과(`MINI_BOSS_GLB` 환경변수, `scripts/build_kenney_mini_zombies.mjs --raw`로 만든다).
- 안 B·비교 렌더: `Developer/agent_room/boss_remodel_20261121/`.
