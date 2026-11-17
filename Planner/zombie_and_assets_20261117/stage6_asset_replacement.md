# Stage 6 "운동장 최후의 조회" 그래픽 전면 교체용 무료 3D 에셋 조사 (2026-11-14)

조사 전용. 다운로드·저장소 수정·dev 서버 실행 없음. 법률 자문 아님.
기준 문서: `free_3d_assets_survey.md`(같은 scratchpad). 거기서 정한 허용/금지 출처를 그대로 따른다.

표기
- [직접확인] = 이번에 해당 페이지를 직접 열어 라이선스 문구를 읽음
- [보조] = 검색 요약·2차 자료·같은 작성자 패턴으로 추정
- [미확인] = 확인 못 함. **삼각형 수는 어떤 페이지에도 없어서 전부 [미확인]**
- 스타일 적합 = 우리 화풍(상자형 넨도로이드, 평면 파스텔, MeshToonMaterial + 검은 외곽선, 탑다운) 대비 높음/중/낮음

## 0. 먼저 결론

1. **Stage 6을 전부 대체해 줄 "운동장/학교 운동회" 무료 팩은 없다.** Kenney 3D 카탈로그 전 4쪽(66개 팩)을 다 열어 봤지만 스포츠·학교 3D 키트는 없다. KayKit 33개 팩, Quaternius 84개 팩에도 없다.
2. 무료로 **잘 메워지는 것**은 나무(9), 울타리·정문 문짝(11 일부), 학교 건물 외벽(4 일부), 장식 소품(12), 운동회 소품 일부(콘·벤치·천막·공)뿐이다. 모두 CC0.
3. **운동장 특유의 물건**(축구 골대, 스탠드, 정글짐, 국기 게양대, 조회대, 확성기 기둥)은 Poly Pizza에 있긴 하지만 **거의 전부 CC-BY 3.0**(크레딧 필수)이고, 대부분 "Poly by Google" 아카이브 모델이라 화풍도 제각각이다.
4. 땅·축구장 라인·트랙은 **지금의 바닥 셰이더/평면이 정답**이다. 맞는 무료 모델이 없고, 있어도 바닥을 GLB로 바꾸면 손해다.
5. 따라서 현실적인 그림: **CC0 팩 4~5개 + Poly Pizza CC0 낱개 8개 정도 + 자체 제작 10여 종**. CC-BY를 하나도 안 쓰는 구성이 가능하고, 그 편을 권장한다.

## 1. 조각별 후보

### 1. 땅: 흙 경기장 판, 외야 잔디, 축구장 라인(센터서클·하프라인·페널티박스)

| 후보 | URL | 작성자 | 라이선스 (원문) | 형식 | 무료/유료 | 적합 |
|---|---|---|---|---|---|---|
| Soccer Field | https://poly.pizza/m/8yoy_wgAlof | Mark Steelman | [직접확인] "Creative Commons Attribution" (CC BY 3.0). 설명: "Soccer field, lines come out of field a little bit but not very much" | OBJ/GLTF | 무료 | 낮음 — 라인이 바닥 위로 튀어나온 지오메트리, 크기·비율 맞추기 어렵고 크레딧 필요 |
| KayKit Forest Nature Pack (잔디 덤불만) | https://kaylousberg.itch.io/kaykit-forest | Kay Lousberg | [직접확인] "Creative Commons Zero v1.0 Universal" / "Free for personal and commercial use, no attribution required. (CC0 Licensed)" | FBX/GLTF/OBJ | 무료 100+개, Extra $9.99, Source $14.99 | 중상 — 땅 자체가 아니라 잔디 가장자리에 흩뿌릴 풀 덤불("Grass in two styles and varying cluster sizes") 용도 |

**판정: 자체 유지(바닥 셰이더).** 바닥은 큰 평면 하나 + 라인은 셰이더/얇은 평면이 가장 싸고 깔끔하다. 외부 모델로 바꾸면 드로우콜·정점이 늘고 팔레트(#D8B57A 흙, #7DBF68 잔디)를 다시 맞춰야 한다. 바꿀 가치가 있는 건 잔디 경계에 놓는 풀 덤불 정도.

### 2. 육상 트랙: 직선, 곡선, 레인 라인

| 후보 | URL | 작성자 | 라이선스 | 형식 | 무료/유료 | 적합 |
|---|---|---|---|---|---|---|
| Kenney Racing Kit (트랙 타일) | https://kenney.nl/assets/racing-kit | Kenney | [직접확인] "Creative Commons CC0", 110 파일, 태그 racing/tile/track/vehicle/car | [미확인] (Kenney 페이지에 형식 표기 없음, OGA 미러 설명은 OBJ [보조]) | 무료 | 낮음 — 자동차 아스팔트 도로 타일. 육상 트랙의 붉은 우레탄 타원과 다름 |

**판정: 자체 유지(바닥 셰이더).** 육상 트랙 3D 모델은 CC0·CC-BY 어느 쪽에서도 못 찾았다. 타원 링 + 레인 선은 셰이더(또는 RingGeometry 몇 개)로 이미 해결돼 있고, 모델로 바꿀 이득이 없다.

### 3. 축구 골대 2개 + 그물

| 후보 | URL | 작성자 | 라이선스 | 형식 | 무료/유료 | 적합 |
|---|---|---|---|---|---|---|
| Soccer goal | https://poly.pizza/m/7t4hmicGHV4 | Poly by Google | [직접확인] "Creative Commons Attribution" (CC BY 3.0) | OBJ/GLTF | 무료 | 중 — 형태는 맞지만 Google Poly 시절 모델이라 비율·색 보정 필요, 크레딧 필수 |
| KayKit Mini Game Variety Pack (Legacy)의 "goals" | https://kaylousberg.itch.io/kay-kit-mini-game-variety-pack | Kay Lousberg | [직접확인] "Free for personal and commercial use, no attribution required. (CC0)" / 내용: "Various different objective assets (goals, gates, rings and hoops, a ball) in 3 distinct colours" | FBX/OBJ/DAE/GLTF | 무료(이름값 지불) | 중 — 팀 게임용 일반 "goal"이라 축구 골대 모양인지 [미확인]. 페이지가 "won't be updated anymore"라고 명시 |
| (제외) KumaSousa Soccer Goal | https://kumasousa.itch.io/soccer-goal | KumaSousa | [직접확인] 라이선스 문구 없음, "Free to use. Support appreciated." 뿐 | FBX만 | 무료 | 사용 금지 — 라이선스 불명확 |

**판정: 자체 제작 권장.** 골대는 원기둥 3개(골포스트·크로스바) + 뒤쪽 받침 2~3개 + 그물(알파 격자 텍스처를 붙인 평면 3장)이면 끝난다. 약 150~250 삼각형. CC-BY 하나 때문에 크레딧 화면을 만드는 것보다 싸다. 그물은 기하로 만들면 삼각형이 폭증하므로 반드시 텍스처/LineSegments로.

### 4. 학교 건물 정면: 창문, 현관문, 학교 명판, 벽시계

| 후보 | URL | 작성자 | 라이선스 | 형식 | 무료/유료 | 적합 |
|---|---|---|---|---|---|---|
| **Kenney Building Kit** | https://kenney.nl/assets/building-kit (미러 https://kenney-assets.itch.io/building-kit) | Kenney | [직접확인] "CC0 1.0 Universal" / "You're allowed to use these game assets in any project including commercial ones." / "This kit includes walls, floors and various doors and windows!" | OBJ/FBX/glTF | 무료(이름값) 80+ 모델 | 높음 — 벽·창문·문 모듈을 일렬로 붙이면 학교 정면이 나온다 |
| **Kenney Modular Buildings** | https://kenney.nl/assets/modular-buildings (미러 https://kenney-assets.itch.io/modular-buildings) | Kenney | [직접확인] "Creative Commons CC0", 100 파일, v2.1 "Complete remake" / 미러: "various models to create all sorts of buildings and high-rise!" | OBJ/FBX/glTF | 무료 90+ 모델 | 높음 — 다층 건물 모듈. 3~4층 학교 본관에 적합 |
| Quaternius Ultimate Buildings Pack | https://quaternius.com/packs/ultimatetexturedbuildings.html | Quaternius | [직접확인] 팩 페이지는 "CC0" 표기, 다만 quaternius.com/license.html은 2026-08-28부터 자체 라이선스 v1.0(게임 동봉 허용, 단독 재배포 금지) — 기존 조사 참고 | FBX/OBJ/Blend | 무료 76 모델 | 중 — "modular buildings, with different atlas textures"; 매끈한 로우폴리 |
| (참고) Quaternius Downtown City MegaKit | https://quaternius.com/packs/downtowncitymegakit.html | Quaternius | [직접확인] "Free to use in personal, educational and commercial projects. (CC0 License)" 표기(위와 같은 v1.0 충돌 주의) / 315 모델, Standard 무료 60~70% | FBX/glTF/OBJ/Blend | 일부 무료 + Source 유료 | 중 — 도심 빌딩. 학교보다는 상가풍 |

- **벽시계**: CC0 벽시계를 못 찾음. Poly Pizza의 시계들은 대부분 "Poly by Google"(CC-BY 계열 [보조]). → **자체 제작**(원기둥 1 + 바늘 상자 2, 50 삼각형 미만).
- **학교 명판**: 한글 "○○고등학교" 글자가 들어가야 하므로 외부 에셋 불가 → **자체 제작**(상자 + 캔버스 텍스처 또는 우리 폰트).
- Poly Pizza "Schoolhouse"(Poly by Google, https://poly.pizza/m/ftnL_OvlkCx)는 미국식 종탑 목조 교사라 부적합, 라이선스도 CC-BY 계열 [보조].

**판정: Kenney Building Kit 또는 Modular Buildings 중 하나로 외벽을 조립, 명판·시계만 자체 제작.** 단, Kenney 건물 키트는 색상표(colormap) 텍스처 방식이므로 MeshToonMaterial로 바꿀 때 맵을 유지하거나 재질별 단색(#2F5FA8 코트색, #F2C94C 테두리)으로 재매핑해야 한다. 외벽이 지금 상자 몇 개로 충분하다면 교체 효과 대비 비용이 크다는 점도 같이 고려.

### 5. 조회대: 계단, 교탁(연설대), 마이크 + 스탠드

| 후보 | URL | 작성자 | 라이선스 | 형식 | 무료/유료 | 적합 |
|---|---|---|---|---|---|---|
| Mic | https://poly.pizza/m/yqbacXdPsg | iPoly3D | [직접확인] "Public Domain (CC0)" / 태그 #Microphone | FBX/GLTF | 무료 | 중 — 마이크 단품. 스탠드 포함 여부 [미확인] |
| Pulpit | https://poly.pizza/m/3nHkaEsTGL | 4444ESOUSA | [직접확인] "Creative Commons Attribution" / 태그 #pulpit #lectern | OBJ/GLTF | 무료 | 중 — 교탁 형태. 크레딧 필요 |
| Pedestal | https://poly.pizza/m/wUeoDKnFBF | Quaternius | 라이선스 [미확인](이번에 개별 페이지 미확인. Quaternius Poly Pizza 항목은 다른 것들이 모두 "Public Domain (CC0)"였음 [보조]) | [미확인] | 무료 | 낮음~중 — 받침대일 뿐 |

**판정: 자체 제작 권장.** 조회대 본체(단 + 계단 3단 + 난간)는 상자 6~10개, 교탁은 상자 2개, 마이크 스탠드는 원기둥 2개 + 구 1개. 합쳐서 200~400 삼각형. 한국 학교 조회대 형태(콘크리트 단 + 앞쪽 계단)는 외부에 없다. 마이크만 iPoly3D CC0를 써도 되지만 크기가 작아 탑다운에선 거의 안 보이므로 자체 제작이 낫다.

### 6. 국기 게양대: 깃대, 깃발, 꼭지 장식

| 후보 | URL | 작성자 | 라이선스 | 형식 | 무료/유료 | 적합 |
|---|---|---|---|---|---|---|
| Flag | https://poly.pizza/m/FuOkF3WBrx | Quaternius | [직접확인] "Public Domain (CC0)" (Poly Pizza 표기. 원본 사이트는 v1.0 라이선스로 바뀜 — 아래 주의 참고) | FBX/GLTF | 무료 | 중 — 깃대+깃발 일체형. 깃발 무늬는 우리 것으로 교체 필요 |
| Goal Flag | https://poly.pizza/m/onAi7dx56P | Quaternius | [직접확인] "Public Domain (CC0)" | FBX/GLTF | 무료 | 중 — 결승 깃발형 |
| KayKit Platformer Pack (깃발) | https://kaylousberg.itch.io/kaykit-platformer | Kay Lousberg | [직접확인] "Creative Commons Zero v1.0 Universal" / "Free for personal and commercial use, no attribution required. (CC0 Licensed)" / 장식 목록에 "railings, barriers, signage, supports and flags!" | FBX/GLTF/OBJ | 무료 120+ (22MB), Extra $9.99 | 중상 — 청키 화풍 깃발. 학교 게양대처럼 긴 깃대인지 [미확인] |
| (CC-BY) Flag | https://poly.pizza/m/kKyGHOG2Ks | J-Toastie | [직접확인] "Creative Commons Attribution" | OBJ/GLTF | 무료 | 중 — 크레딧 필요하므로 비추 |

**판정: 자체 제작 권장.** 깃대(원기둥 8면) + 꼭지 구(저분할) + 깃발 평면(정점 셰이더로 펄럭임) = 100 삼각형 미만. 외부 깃발은 펄럭임 애니가 없거나 깃발 메시가 고정이라, 바람 연출을 이미 코드로 하고 있다면 오히려 퇴보다. 깃발 도안(교기 등)은 어차피 우리 텍스처.

### 7. 방송용 확성기 기둥: 기둥 + 나팔형 스피커

| 후보 | URL | 작성자 | 라이선스 | 형식 | 무료/유료 | 적합 |
|---|---|---|---|---|---|---|
| Loudspearker (News) | https://poly.pizza/m/dDoyTGTyOcO | Shuo Liu | [직접확인] "Creative Commons Attribution" / 태그 #Megaphone #Speaker #Announcement | OBJ/GLTF | 무료 | 중 — 이름상 확성기 나팔 [형태 미확인]. 크레딧 필요 |
| Megaphone | https://poly.pizza/m/Sjgs1h5SU9 | 4444ESOUSA | [직접확인] "Creative Commons Attribution" | FBX/GLTF | 무료 | 낮음~중 — 손 확성기. 크레딧 필요 |
| Speaker | https://poly.pizza/m/zOQOThSpuo | iPoly3D | [직접확인] "Public Domain (CC0)" / 태그 #Speaker #Electronics | FBX/GLTF | 무료 | 낮음 — 상자형 스피커, 나팔형 아님 |
| Speaker | https://poly.pizza/m/GWfUJDmiOO | Kenney | [직접확인] "Public Domain (CC0)" / 태그 #Stereo | OBJ/GLTF | 무료 | 낮음 — 실내 오디오 스피커 |

**판정: 자체 제작 권장.** 학교 운동장 나팔 스피커는 열린 원뿔(LatheGeometry 8~12분할) 2~4개 + 기둥 원기둥 + 받침 상자로 100~200 삼각형. 맞는 CC0 모델이 없고, CC-BY 후보도 형태 보장이 없다.

### 8. 정글짐(철봉 격자 놀이기구)

| 후보 | URL | 작성자 | 라이선스 | 형식 | 무료/유료 | 적합 |
|---|---|---|---|---|---|---|
| Fun Playground | https://tinytreats.itch.io/fun-playground | Tiny Treats | [직접확인] "Free for personal and commercial use, no attribution required. (**CC0** Licensed)" / "No generative AI was used" / 내용: "a variety of slides, swings, see-saws, and other fun classic playground equipment" | OBJ/FBX/GLTF | 무료 32+ 모델, .blend는 $3.95 | 중상 — 스타일화 로우폴리. **정글짐(격자형 등반대) 포함 여부 [미확인]** — 미끄럼틀·그네·시소는 확실 |
| Jungle gym | https://poly.pizza/m/0-7U_RTHzKT | Poly by Google | [직접확인] "Creative Commons Attribution" (CC BY 3.0), 2017-10-22 | OBJ/GLTF | 무료 | 중 — 이름 그대로 정글짐. 크레딧 필요 |
| Monkeybars | https://poly.pizza/m/a1zyPAuesMV | sirkitree | [직접확인] "Creative Commons Attribution" (CC BY 3.0) | OBJ/GLTF | 무료 | 중 — 구름사다리. 크레딧 필요 |
| Play Structure | https://poly.pizza/m/ee0cso-KZnC | Emmett "TawpShelf" Baber | [직접확인] "Creative Commons Attribution" (CC BY 3.0), 태그 jungle gym/playground | OBJ/GLTF | 무료 | 중 — 복합 놀이대. 크레딧 필요 |
| Playground - Low Poly Asset Pack | https://tapdig.itch.io/kids-park-low-poly-assets | peste | [직접확인] "Creative Commons Zero v1.0 Universal" / "No generative AI was used" | obj/fbx/glb, 7개 | 무료(이름값) | [미확인] — 7개 품목이 무엇인지 페이지에 없음 |

제외: loafbrr Playground Equipment($7, 페이지에 라이선스 문구 없음, 42,466 삼각형 — 너무 무거움), CrazyDrPants Playground/Park(CC BY 4.0, 사실풍 "Dirty" 버전 포함).

**판정: 자체 제작 권장, 대안은 Tiny Treats(CC0).** 정글짐은 같은 원기둥을 격자로 반복하는 구조라 InstancedMesh로 직접 만들면 300 삼각형 안팎에 외곽선도 깔끔하다. Tiny Treats 팩은 Stage 6 운동장 가장자리 장식(미끄럼틀·그네·시소)으로 따로 쓸 가치가 있음 — 다운로드 후 정글짐 유무 확인.

### 9. 플라타너스(줄기 + 수관)

| 후보 | URL | 작성자 | 라이선스 | 형식 | 무료/유료 | 적합 |
|---|---|---|---|---|---|---|
| **Kenney Nature Kit** | https://kenney.nl/assets/nature-kit | Kenney | [직접확인] "Creative Commons CC0", 330 파일, 태그 nature/tree/rock/foliage, v1.0(2020) | [미확인] (페이지 표기 없음. Kenney 3D 팩 공통 OBJ/FBX/glTF [보조]) | 무료 | 높음 — 각진 블록형 나무 변형 다수 [보조]. 우리 화풍과 가장 가까움 |
| KayKit Forest Nature Pack | https://kaylousberg.itch.io/kaykit-forest | Kay Lousberg | [직접확인] "Creative Commons Zero v1.0 Universal" / "please don't resell unmodified copies or claim them as your own." | FBX/GLTF/OBJ | 무료 100+ (6.1MB), Extra $9.99 (81MB) | 중상 — 둥글고 청키. 활엽수 많음 |
| Quaternius Stylized Nature MegaKit | https://quaternius.com/packs/stylizednaturemegakit.html | Quaternius | [직접확인] "Free to use in personal, educational and commercial projects. (CC0 License)" 표기(v1.0 충돌 주의) / "40 tree models" | FBX/OBJ/glTF/Blend | Standard 무료 60~70%, Pro/Source 유료 | 중 — 매끈한 스타일화 |
| Tree (Kenney, 낱개) | https://poly.pizza/m/QN3Ru02ayU | Kenney | [직접확인] "Public Domain (CC0)" | OBJ/GLTF | 무료 | 중 — 원뿔형(침엽수). 플라타너스와는 다름 |

**판정: Kenney Nature Kit(1순위) 또는 KayKit Forest(2순위)로 교체.** "플라타너스" 전용 모델은 없으니 둥근 활엽수를 골라 수관 색만 #7DBF68 계열로 재지정. 이 조각이 외부 에셋 교체 효과가 가장 크다.

### 10. 스탠드(관람석 계단)

| 후보 | URL | 작성자 | 라이선스 | 형식 | 무료/유료 | 적합 |
|---|---|---|---|---|---|---|
| Stadium Seats | https://poly.pizza/m/3eKUbGjEPv | Zsky | [직접확인] "Creative Commons Attribution" (CC BY 3.0). 같은 이름 변형 https://poly.pizza/m/wtYoArecHj , https://poly.pizza/m/KAHX68dbXO (라이선스 개별 [미확인]) | OBJ/GLTF | 무료 | 중 — 크레딧 필요 |
| Low Poly Sports Stands | https://poly.pizza/m/26j2bQ3zuUL | Cole Brenner | [직접확인] "Creative Commons Attribution" (CC BY 3.0). 작성자 설명 "First crack at this stadium seating. Do as you wish" — 그래도 표시 라이선스는 CC-BY이므로 크레딧 | OBJ/GLTF | 무료 | 중 |
| Kenney Racing Kit (관람석 포함 여부) | https://kenney.nl/assets/racing-kit | Kenney | [직접확인] "Creative Commons CC0" / 내용은 OGA 설명상 "roads, borders, tents, pitstop, flags, billboards (textured), fences, bridges and more" [보조]. **관람석(grandstand) 포함 여부 [미확인]** | [미확인] | 무료 | 중상(포함 시) |

참고: OpenGameArt에 tiko479 "soccer field"(CC0, bleacher·seat 태그)가 있다는 검색 결과가 있으나 페이지가 403이라 [보조]만.

**판정: 자체 제작 권장.** 계단식 스탠드는 길쭉한 상자 4~6단(단마다 상자 1~2개) = 50~150 삼각형. 우리 팔레트(#C9673F 강조색 좌석)로 칠하기도 쉽다. 굳이 외부를 쓴다면 Racing Kit를 받아 grandstand가 있는지 확인하는 게 유일한 CC0 길.

### 11. 정문 기둥(+모자 장식), 정문 문짝, 둘레 울타리

| 후보 | URL | 작성자 | 라이선스 | 형식 | 무료/유료 | 적합 |
|---|---|---|---|---|---|---|
| **Metal Fence**(철망 울타리) | https://poly.pizza/m/qWKhREFj7H | Quaternius | [직접확인] "Public Domain (CC0)" / 태그 #Barrier #Chain Fence #Wire fence | FBX/GLTF | 무료 | 높음 — 한국 학교 운동장 철망 울타리와 같은 형식 |
| Iron Fence | https://poly.pizza/m/MDROOJeCSQ | Kay Lousberg | [직접확인] "Public Domain (CC0)" / #Fence #Metal #Barrier | FBX/GLTF | 무료 | 중상 — 쇠창살형 (원본 KayKit 팩 [미확인], Halloween Bits 추정 [보조]) |
| Fence Pillar | https://poly.pizza/m/O8wNXcCDLL | Kay Lousberg | [직접확인] "Public Domain (CC0)" / #Pillar #Column | FBX/GLTF | 무료 | 중상 — 정문 기둥(모자 장식형) 대용 |
| Fence Gate | https://poly.pizza/m/h5P9Kuk0V5 | Kay Lousberg | [직접확인] "Public Domain (CC0)" / #Fence #Garden #Barrier | FBX/GLTF | 무료 | 중 — 정원 문 크기. 정문으로 쓰려면 확대 |
| Gate Single | https://poly.pizza/m/vGjS8BPeBh | Isa Lousberg | [직접확인] "Public Domain (CC0)" / #Gate #Door #Entrance | FBX/GLTF | 무료 | 중 |
| Kenney City Kit (Suburban) | https://kenney.nl/assets/city-kit-suburban (미러 https://kenney-assets.itch.io/city-kit-suburban) | Kenney | [직접확인] "Creative Commons Zero v1.0 Universal" / "Also includes some details like fences, trees and driveways." | OBJ/FBX/DAE/STL/glTF | 무료, 1.9MB, 35+ 모델 | 높음 — 주택가 담장·울타리 |

**판정: 울타리는 Quaternius Metal Fence(CC0)로 교체, 정문 기둥은 Kay Lousberg Fence Pillar 또는 자체 상자 기둥, 문짝은 Iron Fence/Gate Single 또는 자체.** 한국 학교 정문(사각 기둥 2개 + 접이식 철문)은 자체 제작해도 100~200 삼각형이다. Poly Pizza 낱개는 가능하면 원본 KayKit/Quaternius 팩에서 받는다(아래 주의 참고).

### 12. 가장자리 "볼거리" 장식 소품 약 10개 (콘·상자·링 등)

| 후보 | URL | 작성자 | 라이선스 | 형식 | 무료/유료 | 적합 |
|---|---|---|---|---|---|---|
| **Traffic Cone** | https://poly.pizza/m/lAx8JytxGD | Quaternius | [직접확인] "Public Domain (CC0)" / #Cone | FBX/GLTF | 무료 | 높음 |
| **KayKit Mini Game Variety Pack** | https://kaylousberg.itch.io/kay-kit-mini-game-variety-pack | Kay Lousberg | [직접확인] "(CC0)" — 위 3번 참고. "goals, gates, rings and hoops, a ball" 3색 + 바닥 타일 + 아이템(Heart, Bomb, Star, Diamond, Power) | FBX/OBJ/DAE/GLTF | 무료(이름값) | 높음 — 링·후프·게이트가 "볼거리" 장식에 딱 맞음 |
| **KayKit Prototype Bits** | https://kaylousberg.itch.io/prototype-bits | Kay Lousberg | [직접확인] "Creative Commons Zero v1.0 Universal" / "Free for personal and commercial use, no attribution required. (CC0 Licensed)" / 캡션: "yellow blocks, stairs, targets, doors, platforms" | OBJ/FBX/GLTF | 무료 64+, Extra $3.95 | 높음 — 상자·과녁 |
| KayKit Platformer Pack | https://kaylousberg.itch.io/kaykit-platformer | Kay Lousberg | [직접확인] 위 6번 참고. "railings, barriers, signage, supports and flags!" | FBX/GLTF/OBJ | 무료 120+ | 중상 |
| Kenney Construction Barrier | https://poly.pizza/m/4mrO9ueiQr | Kenney | [보조] Kenney 항목은 Poly Pizza에서 모두 CC0로 표시됨(이 항목 개별 미확인) | [미확인] | 무료 | 높음 |

**판정: CC0로 충분히 교체 가능.** Quaternius 콘 + KayKit Mini Game(링·후프·게이트) + Prototype Bits(상자·과녁) 조합이면 10종이 쉽게 나온다.

### 13. 운동회 소품

| 소품 | 후보 | URL | 라이선스 | 적합 | 판정 |
|---|---|---|---|---|---|
| 라바콘 | Quaternius Traffic Cone | https://poly.pizza/m/lAx8JytxGD | [직접확인] CC0 | 높음 | 사용 |
| 허들 | Hurdle (Poly by Google) | https://poly.pizza/m/4OWZApdHl1c | [보조] CC-BY 계열(미개봉) | 중 | **자체 제작**(상자 3개, 36 삼각형) |
| 계주 바통 | 없음 | — | — | — | **자체 제작**(원기둥 1개) |
| 줄다리기 줄 | 없음 | — | — | — | **자체 제작**(TubeGeometry, 저분할) |
| 천막/차양 | Kenney Tent | https://poly.pizza/m/LrTs3hVGXv | [직접확인] "Public Domain (CC0)" #Tent #Shelter #Camp | 중 — 캠핑 텐트형. 운동회 흰 차양 천막과 다름 | 운동회 천막은 **자체 제작**(지붕 상자/피라미드 + 다리 4개) 권장. Kenney Racing Kit "tents" [보조]도 후보 |
| 벤치 | Bench (Kay Lousberg) | https://poly.pizza/m/6d92UYCIC1 | [직접확인] "Public Domain (CC0)" #Bench #Park | 높음 | 사용. 원본은 KayKit City Builder Bits(무료 32+, 공원 소품은 Extra $3.95) https://kaylousberg.itch.io/city-builder-bits [직접확인 CC0] |
| 공 | KayKit Mini Game "a ball" | 위 12번 | [직접확인] CC0 | 중상 | 사용 또는 자체(저분할 구). Zsky Football https://poly.pizza/m/tDblqBpmOZ 는 [직접확인] CC BY 3.0 → 비추 |
| 농구대 | Basket ball and hoop (Armory_3D) | https://poly.pizza/m/i3LLacyQP4 | [보조] CC0 (기존 조사) | 중상 | 선택 |
| 라인 마커(석회 수레) | 없음 | — | — | — | **자체 제작** |
| 자전거 거치대 | Bike Rack (J-Toastie) | https://poly.pizza/m/DzsJ2LPVKZ | [직접확인] "Creative Commons Attribution" | 중 | **자체 제작**(U자 파이프 반복) 권장 |
| 자전거 | KayKit Mixed Bag 1 "Bicycle - Lasha3D" | https://kaylousberg.itch.io/mixed-bag-1 | [직접확인] "Creative Commons Zero v1.0 Universal" / 무료 16+, 전체 24종은 $3.99 이상 | 중상 | 자전거가 무료/유료 어느 쪽인지 [미확인] |
| 놀이기구(미끄럼틀·그네·시소) | Tiny Treats Fun Playground | https://tinytreats.itch.io/fun-playground | [직접확인] CC0 | 중상 | 운동장 구석 장식으로 사용 가능 |

## 2. 무료로 쓸 만한 게 없어서 자체 제작이 나은 조각

| 조각 | 이유 | 예상 삼각형 |
|---|---|---|
| 1 땅·축구장 라인 | 맞는 모델 없음. 바닥 셰이더가 가장 가볍고 팔레트 제어가 쉬움 | 현행 유지 |
| 2 육상 트랙 | 육상 트랙 모델 자체가 없음(Racing Kit는 자동차 도로) | 현행 유지 |
| 3 축구 골대 | CC0 축구 골대 없음(유일 후보 CC-BY, KayKit "goals"는 형태 미확인). 원기둥 몇 개면 끝 | 150~250 |
| 4 명판·벽시계 | 한글 교명 필요. CC0 벽시계 없음 | 50~100 |
| 5 조회대 전체 | 한국식 조회대 형태 없음. CC-BY 교탁뿐 | 200~400 |
| 6 국기 게양대 | 펄럭임은 셰이더가 더 나음, 외부 깃발은 정적 | <100 |
| 7 확성기 기둥 | 나팔형 CC0 없음 | 100~200 |
| 8 정글짐 | CC0 확정 후보 없음(Tiny Treats 포함 여부 미확인), 격자 반복은 인스턴싱이 최적 | ~300 |
| 10 스탠드 | CC0 확정 후보 없음, 계단 상자는 자명 | 50~150 |
| 운동회: 허들·바통·줄·석회 수레·거치대·차양 천막 | CC0 없음 또는 형태 부적합 | 각 12~150 |

공통: Blockbench(출력물 우리 소유) 또는 기존 Blender 넨도로이드 스크립트로 제작. 상자/원기둥 기반이라 외곽선 품질도 외부 모델보다 낫다.

## 3. 추천 "Stage 6 전체 교체 세트" — 최소 팩으로 최대 커버

### 받을 것 (모두 CC0, 크레딧 불필요)

| # | 팩/낱개 | 덮는 조각 | 다운로드 크기 |
|---|---|---|---|
| A | **Kenney Nature Kit** https://kenney.nl/assets/nature-kit | 9 나무(+덤불·바위 장식) | [미확인] |
| B | **Kenney Building Kit** https://kenney.nl/assets/building-kit (또는 Modular Buildings) | 4 학교 외벽·창문·현관문 | [미확인] |
| C | **KayKit Mini Game Variety Pack** https://kaylousberg.itch.io/kay-kit-mini-game-variety-pack | 12 링·후프·게이트, 공, (3 골대 대용 가능성) | [미확인] |
| D | **KayKit Prototype Bits** https://kaylousberg.itch.io/prototype-bits | 12 상자·과녁·계단 | [미확인] |
| E | Poly Pizza CC0 낱개 7종: Quaternius Traffic Cone, Quaternius Metal Fence, Kay Lousberg Fence Pillar / Iron Fence / Bench, Isa Lousberg Gate Single, (선택) iPoly3D Mic | 11 울타리·정문, 13 콘·벤치, 5 마이크 | 낱개라 작음 [미확인] |

선택 추가: KayKit City Builder Bits(벤치·가로등 원본, 무료 4.6MB [직접확인]), Kenney City Kit Suburban(담장, 1.9MB [직접확인]), Tiny Treats Fun Playground(놀이기구 장식, CC0), KayKit Forest(나무 2안, 무료 6.1MB [직접확인]), Kenney Racing Kit(관람석·천막 확인용).

**커버리지**: 외부 에셋으로 교체 = 4(외벽 일부), 9, 11, 12, 운동회 소품 일부(콘·벤치·공). 자체 제작 = 1, 2, 3, 4(명판·시계), 5, 6, 7, 8, 10, 운동회 소품 나머지.
즉 **12조각 중 외부 에셋이 실질적으로 대체하는 건 4개 남짓**이다. 나머지는 운동장·한국 학교 특유의 물건이라 무료 시장에 없다.

**압축파일 총량 추정**: 확인된 것만 City Builder 4.6MB + Forest 6.1MB + Suburban 1.9MB. Kenney/KayKit 팩은 보통 수 MB 단위라 A~D 전체도 수십 MB 이내로 예상 [미확인]. 게임 번들에 실제로 들어가는 건 고른 모델 20~30개 GLB뿐이라 훨씬 작다(실측 필요).

### CC-BY를 꼭 쓰고 싶을 때의 크레딧 문구 (권장하지 않음)

자체 제작 대신 쓴다면 크레딧 화면에 아래 형식으로 넣는다(제목 · 작성자 · 라이선스 · 출처 링크):
- "Soccer goal" by Poly by Google, CC BY 3.0, via Poly Pizza — https://poly.pizza/m/7t4hmicGHV4
- "Jungle gym" by Poly by Google, CC BY 3.0, via Poly Pizza — https://poly.pizza/m/0-7U_RTHzKT
- "Stadium Seats" by Zsky, CC BY 3.0, via Poly Pizza — https://poly.pizza/m/3eKUbGjEPv
- "Low Poly Sports Stands" by Cole Brenner, CC BY 3.0, via Poly Pizza — https://poly.pizza/m/26j2bQ3zuUL
- "Pulpit" by 4444ESOUSA, CC BY 3.0, via Poly Pizza — https://poly.pizza/m/3nHkaEsTGL
- "Loudspearker (News)" by Shuo Liu, CC BY 3.0, via Poly Pizza — https://poly.pizza/m/dDoyTGTyOcO
(CC BY 3.0 버전은 Poly Pizza가 링크한 라이선스 URL 기준. 수정했다면 "modified" 표기 추가.)

추천 세트(CC0만)에는 **필요한 크레딧 문구가 없다.** 다만 Kenney/KayKit에 대한 자발적 감사 문구("3D assets: Kenney (kenney.nl), KayKit by Kay Lousberg")는 넣어도 좋다.

## 4. 주의 사항

1. **Quaternius 라이선스 충돌**: Poly Pizza와 Quaternius 팩 페이지는 여전히 "CC0"라고 쓰지만, quaternius.com/license.html은 2026-08-28부터 자체 라이선스 v1.0(게임 동봉 허용, 크레딧 불필요, 에셋 단독 재배포 금지)이다(기존 조사 [직접확인]). 어느 쪽이든 게임 동봉은 허용이지만, 받는 날 Poly Pizza 페이지와 license.html을 함께 스냅샷해 둔다.
2. **Poly Pizza 낱개 vs 원본 팩**: Kay Lousberg/Quaternius/Kenney 낱개는 Poly Pizza에 CC0로 붙어 있지만, 같은 작성자 모델이 Poly Pizza에선 CC-BY로 붙은 사례가 있었다(기존 조사). 출처 장부에는 가능하면 원본 팩 페이지를 기록한다. Iron Fence·Fence Pillar·Fence Gate가 어느 KayKit 팩 소속인지는 [미확인].
3. **재질 교체**: Kenney는 colormap 텍스처 1장, KayKit은 1024 그라디언트 아틀라스 1장 방식. MeshToonMaterial로 바꿀 때 map을 유지하면 팔레트가 원작 색이 되고, 우리 팔레트(#D8B57A/#7DBF68/#C9673F/#2F5FA8/#F2C94C)로 맞추려면 재질별 단색 재매핑이 필요하다.
4. **삼각형 수 전부 [미확인]**: 반입 전 `gltf-transform inspect`로 실측. 소품 ≤2k 기준. loafbrr 팩처럼 42k 삼각형짜리는 즉시 제외.
5. 금지 출처(TurboSquid/Free3D/CGTrader/Unity Store/Sketchfab Standard 등)는 검색에 많이 걸렸지만 전부 제외했다. 라이선스 문구가 없는 itch.io 항목(KumaSousa 골대, loafbrr)도 제외.
6. 확인 못 한 곳: OpenGameArt(403), Kenney 팩 내부 파일 목록(페이지에 없음 — Racing Kit의 grandstand, Nature Kit의 나무 이름, Minigolf Kit 깃발 등은 받아 봐야 앎).
