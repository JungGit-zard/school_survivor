# 로자리 3세대 모델 기본 색 채도 보정 — v9 참고

- 작성: 2026-10-29, `threemini` (Worker). Advisor diff 검토·커밋 대기. 아트 승인 아님.
- 지시(Terry): "로자리 가장최근 옷갈아입기 되는 모델링 텍스쳐 색상이 너무 색이 약하다. 구형 모델링 색상 참고로 분명하게 수정하고 게임에 적용."
- 작업 트리: `C:/Users/admin/AppData/Local/Temp/ezs-rosari` (origin/zombie_only `5d7cc49e` 위 detached HEAD, `aec5bca4`).
- 변경 파일: `Developer/r3f_prototype/src/lib/rosariOutfits.js`, `Developer/r3f_prototype/src/lib/rosariOutfits.test.js`, `Developer/r3f_prototype/src/components/PlayerRosariModel.test.jsx`. **GLB 바이너리 무변경.**

## 1. 무엇이 흐릿했나

3세대 모델 `PLAYER_wholebody_refined_t_efe49b7c.glb`(29 머티리얼)와 구형
`PLAYER_v9_final.glb`(17 머티리얼)의 `baseColorFactor`를 선형→sRGB로 변환해 직접 비교했다.
두 모델 모두 `lib/toon.js`의 같은 5단 램프(`#09070c`→`#ffffff`)에 `emissive` 검정으로
렌더되므로 비교는 등가다. 램프는 좀비·보스·프랍 전체가 공유하므로 손대지 않았다.

## 2. before/after

`ROSARI_BASE_COLORS` (머티리얼 base name 기준, `.00N` 접미사 제거). L은 상대휘도.

| 머티리얼 base | 적용 노드 | before (GLB) | after | v9 출처 | L |
|---|---|---|---|---|---|
| `jacket` | 몸통 + 어깨캡 2 + 소매 2 | `#dc4b5d` | `#d42020` | `jacket_red` | 0.210 → 0.151 |
| `skirt` | 치마 셸 | `#255aa0` | `#2d8cff` | `skirt_blue` | 0.102 → 0.265 |
| `hair` | 밥 헤어 | `#efafc5` | `#ff8fb0` | `pink_hair` | 0.530 → 0.440 |
| `roundedShoe` | 신발 2 | `#ffffff` | `#8090a8` | `shoes_blue` | 1.000 → 0.274 |
| `sock` | 양말 2 | `#fff4fb` | `#f7e8e6` | `socks_white` | 0.929 → 0.832 |
| `shirt` | 손목 커프 밴드 2 | `#fff2f1` | `#fff8ed` | `shirt_white` | 0.911 → 0.945 |
| `collar` | 칼라 삼각 2 | `#f9ddea` | `#fff8ed` | (v9는 데칼) | 0.778 → 0.945 |
| `backpack` | 가방 본체 + 어깨끈 2 | `#1f59aa` | `#38c8f0` | `pack_blue` | 0.103 → 0.484 |
| `backpackLight` | 가방 윗뚜껑 | `#337bd0` | `#1668a0` | `pack_pocket_blue` | 0.194 → 0.126 |

새 값이 "로자리만의 새 색"이 아니라는 점은 1세대 쪽에서도 확인된다. 타이틀 화면
블록 플레이어(PlayerMesh)의 블록 기본색은 이미 blazer `0xd42020`, skirt `0x2d8cff`다
(`TitleScene3D.playerOutfit.test.jsx`가 그 값으로 가드를 걸어 둔다). 즉 3세대 GLB만 혼자
흐렸던 것이고, 이번 보정은 타이틀 플레이어와 색을 **일치시키는** 방향이다.

**무변경(의도적):** `skin.*` `#ffe0c9`, `faceSkin_under_jaw_clean_solid` `#f7d9c6`,
`tie`/`tie.001` `#ffcc31`, `gold` `#ffc231`, `faceSkin` `#ffffff`+텍스처.
앞의 넷은 이미 v9와 동등하거나 더 진하고, `faceSkin`은 텍스처라 팩터 변경이 듣지 않는다.

## 3. backpack / backpackLight 배정 근거

GLB의 노드→머티리얼 대응을 직접 읽어 면적으로 결정했다.

| 모델 | 머티리얼 | 노드 | tris |
|---|---|---|---|
| v9 | `pack_blue` (밝음) | 본체, 사이드레일 2, 어깨/사이드/프론트 스트랩 6, 윗뚜껑 밴드 | 108 ×9 |
| v9 | `pack_pocket_blue` (어두움) | 앞주머니 패널 **하나** | 108 ×1 |
| 로자리 | `backpack` | `rounded_square_blue_backpack_body` 28 + 양 어깨끈 36 ×2 | 100 |
| 로자리 | `backpackLight` | `blue_backpack_top_flap` **하나** | 12 |

즉 v9는 "큰 덩어리 전부 = 밝은 색, 좁은 패널 하나 = 어두운 색"이다. 로자리도 같은 방식으로
쪼개져 있으므로 `backpack`(본체+끈)에 밝은 `#38c8f0`, `backpackLight`(윗뚜껑 하나)에
어두운 `#1668a0`을 줬다. 본체-뚜껑 명도차가 0.091 → 0.358로 벌어져 가방이 한 덩어리로
뭉치지 않는다.

이 배정은 **이 GLB 자체의 기존 명암 관계는 뒤집는다** — 출고 `backpackLight` `#337bd0`가
`backpack` `#1f59aa`보다 밝았다. v9의 관계를 보존하라는 지시가 우선이고, 반대로 두면
가장 넓은 면에 칙칙한 색이 남아 "색이 약하다"는 지적이 그대로 남는다. 머티리얼 이름은
GLB 저작값이라 그대로 두고 값만 바꿨다 — 이름이 값과 어긋나는 점은 주석에 명시했다.

## 4. collar 판단: 분홍 폴백 쓰지 않음

출고 `collar` `#f9ddea`는 모델 전체에서 가장 약한 명도 단차였다. 노드 이름은
`white_collar_left/right_triangle`인데 값은 연분홍이고, 바로 위 `faceSkin_under_jaw_clean_solid`
`#f7d9c6`(L 0.735)와의 차이가 **0.043**뿐이었다. 2026-10-27 동복 작업의 부정 학습 그대로,
스텐실 아웃라인 아래의 내부 디테일에는 잉크선이 붙지 않으므로 이 0.043이 칼라를 분리하는
유일한 수단이었다.

`#fff8ed`(v9 `shirt_white`)로 올린 뒤:

- vs 턱밑 피부: 0.043 → **0.210** (약 5배)
- vs 재킷 `#d42020`: 0.568 → **0.794**

즉 흰 칼라는 사라지지 않고 오히려 잘 보인다. 셔츠와 융합할 위험도 없다 — 이 GLB에서
`shirt` 머티리얼이 붙은 면은 **손목 커프 밴드 두 개뿐**이고 칼라와 인접하지 않는다
(몸통은 `jacket.002`). 따라서 지시에 적힌 분홍 폴백 `#f0b8d2`는 쓰지 않았다.
검증 근거는 5단 램프 각 밴드에서 색을 직접 셰이딩해 본 스와치(§6)다.

## 5. 왜 GLB 바이너리를 안 건드렸나

1. **같은 GLB가 리포에 두 벌 있다.** `src/assets/models/`와 `public/assets/rosari-room/`에
   각각 ~366KB. `baseColorFactor`를 패치하면 리뷰 불가능한 바이너리 diff가 두 개 생기고,
   둘이 어긋나면 방과 게임플레이의 색이 갈라지는 조용한 회귀가 된다.
2. **두 소비 경로가 이미 한 함수를 지난다.** `PlayerRosariModel.jsx`(게임플레이 + Studio
   프리뷰)와 `RosariRoom.jsx`(방)가 **둘 다** 클론마다 `applyRosariOutfit(root, id, make)`를
   1회 호출한다(프레임당 아님). 런타임 리컬러는 한 파일로 두 경로를 다 덮는다.
3. **Studio/Firebase 경계를 건드리지 않는다.** 이 모듈은 호출자가 이미 소유한 머티리얼의
   `color`만 바꾼다. Studio 튜닝값은 종전대로 그 위에 얹힌다. 읽기·쓰기 모두 없음.

`material.color`만 바꾸는 것으로 충분하고 완전하다: 이 GLB에는 `emissiveFactor`가 전혀
없어서(머티리얼 키는 `name`, `pbrMetallicRoughness`뿐) 게임 경로의 `cloneMaterial`이
`toonMat`의 `emissive = color` 위에 검정을 덮어쓰고, 방 경로의 `makeArchiveToonMaterial`은
emissive를 아예 설정하지 않는다. 묵은 색이 남는 캐시도 없다.

## 6. 적용 구조와 회귀 가드

색은 **두 겹**이다. `applyRosariOutfit`의 traverse 안에서 base를 먼저 칠하고 그 위에
의상 가먼트 색을 덮는다. 이 순서라야 `winter`(동복)가 blazer/skirt/legwear/shirt/collar/tie를
계속 override하고, hair·가방·신발 같은 비가먼트는 모든 의상에서 새 base 색으로 읽힌다.

`GARMENT_BY_MATERIAL`(가먼트 슬롯)은 **넓히지 않았다.** 슬롯을 넓히면 머리·가방·신발이
`playerV9Outfits.js`/`playerMeshOutfits.js`의 리맵 대상으로 끌려 들어간다. base 팔레트는
머티리얼 base name으로 직접 키를 잡는 별도 테이블이다.

**`ROSARI_OUTFITS[0].colors`는 비워 둔 채로 유지했다.** `resolvePlayerMeshGarmentColor()`가
id로 단축하지 않고 `resolveRosariOutfit(outfitId).colors[slot]`을 그대로 읽으므로, default에
색을 채우면 1세대 PlayerMesh(= '단순' 외형 + 타이틀 화면 플레이어)의 블록 색까지 바뀐다.
`rosari_model_generations_outfit_contract_2026-10-28.md` §2/§4(신규 색은 1·2세대로 확장하지
않는다)와 `project_develop_policy.md`의 타이틀 전면 정본 잠금 양쪽에 걸린다. 테스트로 못 박았다.

### 검증용 스와치

두 램프(게임 `toonMat` 5단, 방 `ARCHIVE_TOON_GRADIENT` 5단) × before/after를 머티리얼별로
셰이딩해 PNG로 뽑아 눈으로 확인했다:
`C:/Users/admin/AppData/Local/Temp/claude/F--From-SSD-D-20261005-JungSil-2-Minigame-project-school-survivor-integration/c13da572-f1a7-4c11-876c-77aa0d8a4fb3/scratchpad/rosari_palette_swatch.png`
(생성 스크립트: 같은 폴더 `swatch.mjs`). 브라우저·dev 서버를 띄우지 않았으므로 **실제
게임 화면 렌더 검증은 아직 없다** — §8 참조.

## 7. 테스트

```
npx vitest run src/lib/rosariOutfits.test.js src/components/PlayerRosariModel.test.jsx \
               src/components/RosariRoom.outline.test.jsx src/components/Player.modelComparison.test.jsx
→ Test Files 4 passed (4) / Tests 50 passed (50)
```

영향 가능 범위 전체(= `rosariOutfits`를 직간접으로 import하거나 로자리/플레이어 모델을
마운트하는 테스트 파일 20개)를 한 번에 돌렸다:

```
→ Test Files 19 passed | 1 failed (20) / Tests 227 passed | 3 failed (230)
```

유일한 실패 파일은 `StudioAnimationContract.test.js`이고, 실패 3건의 대상은
`expansion/ExpansionStageEnvironment.jsx`, `expansion/ExpansionZombieMesh.jsx`,
`StageObjects/PressureCauldron.jsx`다 — 전부 이번 작업이 건드리지 않은 컴포넌트이며
색과 무관한 "StudioTunedGroup + useFrame 계약 선언" 소스 텍스트 검사다.

갱신한 기존 단정(옛 계약 → 새 계약):

- `rosariOutfits.test.js` "default outfit changes nothing" → "default가 base 팔레트를 칠한다".
  픽스처 색도 추정값에서 GLB 실측 `baseColorFactor`로 바꿔 before 상태를 기록하게 했다.
- `PlayerRosariModel.test.jsx` "leaves every material at its GLB color for the default outfit"
  → "base 팔레트를 칠한다". 비가먼트 단정도 `FIXTURE_BASE_COLOR` 고정에서
  `outfit.colors[slot] ?? ROSARI_BASE_COLORS[base] ?? FIXTURE_BASE_COLOR` 두 겹 계약으로.

새로 못 박은 것:

1. `default`에서 jacket `#d42020` / skirt `#2d8cff` / hair `#ff8fb0` / shoe `#8090a8`
   (lib 레벨 + 실제 게임플레이 클론 양쪽).
2. `winter`에서 blazer·skirt·legwear·shirt·collar·tie는 여전히 동복 색, hair·backpack·
   backpackLight·shoe는 새 base 색, 피부는 손대지 않음.
3. `ROSARI_OUTFITS[0].colors`가 `{}`이고 `resolvePlayerMeshGarmentColor(slot, 0x123456,
   'default')`가 모든 슬롯에서 `0x123456`을 그대로 돌려준다(= PlayerMesh/타이틀 회귀 가드).
   `'winter'`는 정상적으로 `0x8a2639`를 돌려준다.
4. base 팔레트의 모든 키가 실제 GLB 머티리얼 base name이다(오타 가드).

### 이 변경과 무관한 기존 실패

이 HEAD에는 이미 실패하는 테스트가 있다. 전부 이번 diff(내 3개 파일) 바깥이다.

- `StudioAnimationContract.test.js` 3건 — 위 3개 컴포넌트.
- `GraphicsStudioPreview.test.js` → `expect(TitleScene3D.jsx).toContain('playerVisualReady ?')`.
  `TitleScene3D.jsx`에 `playerVisual` 문자열은 0회다. 타이틀이 동결 스냅샷으로 무조건
  렌더하도록 바뀌면서(`AGENTS.md`의 "readiness gate로 그래픽을 숨기지 않는다") 남은 옛
  단정으로 보인다. 타이틀은 정본 잠금 대상이라 손대지 않았다.
- `store/stageUnlockPersistence.test.js` 등 — `FirebaseProgressError: not configured`.
  임시 워크트리에 Firebase 설정이 없어서 나는 환경 실패다.

전체 스위트(388 파일)를 한 번 돌렸을 때 44 파일/127 테스트가 실패했는데, 범위 분석상
이번 변경이 닿을 수 있는 파일은 위 20개뿐이고 그중 회귀는 0건이다. `rosariOutfits.js`의
런타임 효과는 `applyRosariOutfit`이 클론 머티리얼의 `color`를 쓰는 것뿐이고, 그 경로는
`PlayerRosariModel.jsx`/`RosariRoom.jsx` 두 호출지로만 닿는다.

## 8. 남은 리스크

- **실제 화면 미검증.** dev 서버가 떠 있지 않았고, 임시 워크트리에서 5173을 새로 띄우면
  `SchoolSurvivor-Keep-5173` 예약 점검·다른 세션과 충돌할 수 있어 띄우지 않았다.
  2026-08-08 회고 규칙대로 **미검증으로 보고**한다. 수용 전에 방 화면과 게임플레이 화면에서
  실제 렌더를 한 번 확인해야 한다.
- **얼굴 텍스처와의 톤 불일치 → 오히려 해소되는 쪽.** GLB에서 얼굴 텍스처(1024², `faceSkin`)를
  뽑아 직접 봤다. 홍채가 진한 크림슨/와인(대략 `#b03048`~`#c4435c`), 눈꺼풀·눈썹은 짙은 갈색,
  피부 베이스는 `skin.*`/턱밑 솔리드와 같은 계열의 피치다. 즉 **얼굴이 이미 모델에서 가장
  채도가 높은 요소였고, 흐릿했던 쪽은 몸이었다.** 재킷 `#d42020`과 머리 `#ff8fb0`은 홍채의
  적색 계열과 같은 가족이라 올린 뒤가 오히려 정합적이다. 머리/턱밑/목 솔리드 피부색은
  건드리지 않았으므로 머리-목 이음매의 톤도 변하지 않는다.
- **양말-다리 경계가 약간 약해진다.** sock L 0.929 → 0.832, 다리 피부 `#ffe0c9` L 0.788이라
  차이가 0.141 → 0.044다. 다만 v9도 같은 관계(`socks_white` 0.832 vs `face_skin` 0.895,
  차이 0.063)이고 아래쪽 신발이 `#8090a8`(L 0.274)로 강하게 끊어 주므로 v9 수준은 유지된다.
  실제 화면에서 무릎 아래가 한 덩어리로 보이면 sock만 더 밝게 되돌리면 된다.
- **가방 머티리얼 이름과 값의 불일치.** `backpackLight`가 이제 `backpack`보다 어둡다.
  GLB 저작 이름이라 바꾸지 않았고 주석에 남겼다. 나중에 GLB를 다시 저작할 일이 있으면
  이름을 `backpackTrim` 류로 정리하는 편이 낫다.
- **Studio 튜닝 우선순위 불변.** 계정에 플레이어 파트 색 튜닝이 저장돼 있으면 종전처럼
  그 값이 최종이다. 이 변경은 Firebase를 읽지도 쓰지도 않는다.

## 9. 라우팅

- Board `escape-zombie-school` / profile `threemini` (graphics 도메인).
- 필수 사전 문서: `check-required-documents.ps1 -Profile threemini -Domain auto`
  → `resolved_domains ["common","graphics"]`,
  `combined_receipt_sha256 7af286119cd893177be0493b2533acd37b6678472376deb9cb9c0bb13c69e64c`.
  START_HERE + `contents/*` 전부와 추가 `read_required` 2건을 읽었다.
- Git 변경(commit/push/checkout)은 Three_Mini 권한 밖이다. Advisor가 diff 검토 후 커밋한다.
