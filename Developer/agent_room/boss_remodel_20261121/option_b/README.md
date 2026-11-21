# 보스 재모델링 안 B 보관 (2026-11-21, threemini)

Terry 결정(2026-11-21): "둘 다 안 A로 하되, 안 B도 잘 보관해". 게임에는 안 A만 들어갔다. 이 폴더는 게임 번들에 들어가지 않는다.

## 안 B가 무엇인가

| 보스 | 안 B |
|---|---|
| Stage 5 B10 교감 | Kenney Graveyard Kit `character-vampire.glb`(CC0, Mini와 같은 뼈대) 개조. 원래 조끼+셔츠 몸 모양, 망토 → 어깨에 걸친 남색 윗도리, 빨간 셔츠 → 흰 셔츠, 검은 머리 + 빗어 넘긴 가닥, 굵은 검정 뿔테. Kenney 원래 얼굴(빨간 눈·송곳니). 도장·출석부 30% 크게. |
| Stage 6 B05 교장 | Kenney Mini `male-b`(원래 대머리+수염) 개조. 수염 → 은색, 셔츠 → 회색 정장 + 흰 셔츠 V·빨간 넥타이, 동그란 안경, 바닥까지 닿는 조회대 스탠드 마이크, 빨간 어깨띠, 금메달. Kenney 원래 얼굴(빨간 눈). |

## 들어 있는 것

- `renders/` — 안 B 정면(`*_option_b_front.png`), 공격별 포즈(`*_option_b_poses.png`), 게임 카메라 각도 비교(현재·A·B·일반 좀비, `*_all_options_gamecam.png`). 그림 순서·설명은 `../plan_20261121.md`.
- `scripts/` — Blender 5.2 헤드리스 스크립트 사본. 안 B는 `b10.py`의 `option_b()`, `b05.py`의 `option_b()`.
  - `bosslib.py` 공용(우리 Mini GLB 읽기, 툰·외곽선, 포즈 도우미), `r_b10.py`·`r_b05.py` 비교 렌더, `compose.py` 글자 합성(PIL), `cells.py`·`packcells.py` 색 칸 조사.
- 원본 전체(큰 렌더·작업 파일): `F:\ezs-work\backup\boss_remodel_20261121\`.

## 다시 만들기

```
# 미리보기 렌더(안 A·B 둘 다): renders\b10_*.png, b05_*.png
"C:\Program Files\Blender Foundation\Blender 5.2\blender.exe" -b --factory-startup --python scripts\r_b10.py -- sheet
"C:\Program Files\Blender Foundation\Blender 5.2\blender.exe" -b --factory-startup --python scripts\r_b05.py -- sheet
#   모드: sheet | gamecam | pose:cur | pose:A | pose:B
```

- 입력: 메쉬옵트 압축이 없는 Mini GLB(`MINI_BOSS_GLB` 환경변수, 기본값 `F:\ezs-work\backup\mini_zombies_stage_20261115\build\mini_zombies_uncompressed.glb` — `scripts/build_kenney_mini_zombies.mjs --raw`로 다시 만들 수 있다), 안 B10-B는 Graveyard Kit 팩(`F:\ezs-work\assets_cc0\characters\kenney-graveyard-kit`, CC0).
- 출력 폴더: `MINI_BOSS_OUT` 환경변수(기본 F: 백업 폴더).

## 안 B를 게임에 넣으려면 (지금은 안 함)

1. 안 B는 새 색 칸 22개(`bosslib.py` SLOTS 끝 `bossSkin`~`shoeBrown`)를 쓴다. 안 A는 이 칸을 기존 52칸에 맞춰 바꿨다(`SUBST`). 안 B를 그대로 넣으려면 `MINI_PALETTE_SLOTS` 끝에 칸을 붙이고 `scripts/build_kenney_mini_zombies.mjs`로 GLB를 다시 구워야 한다(PROVENANCE·3D 매니페스트 sha 갱신).
2. B10-B 뱀파이어 몸은 GLB에 없다: 굽기 스크립트에 Graveyard Kit 몸 1개를 추가하고, 그 팩 색판의 칸(약 8칸)을 우리 색판 칸으로 옮겨 적어야 한다(몸 약 1,100 삼각형, 6~9KB 추정).
3. 그 뒤 `scripts/mini_boss/export_props.py`처럼 `option_b`의 소품을 뽑아 `lib/miniBossProps.data.js` 형식으로 넣고 `lib/miniBossRoster.js`에 몸·색표를 바꾸면 `MiniBossMesh`가 그대로 그린다.
