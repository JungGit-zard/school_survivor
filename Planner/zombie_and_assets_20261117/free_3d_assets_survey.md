# 무료 3D 에셋 출처 조사 + 좀비학교용 로우폴리 후보 (2026-11-14)

조사 전용. 저장소에 다운로드·수정·커밋 없음. 법률 자문 아님.
표기: [직접확인] = 이번에 공식 페이지를 직접 열어 확인 / [보조] = 검색 요약·2차 자료 / [미확인] = 확인 못 함.

## 0. 우리 저장소 현황 (C:\Dev\ezs-cf2, HEAD 6e10c8d0)

- 게임에 들어간 외부 3D 에셋은 **없다**. GLB는 전부 자체 제작(PLAYER_v9_final.glb, PLAYER_wholebody_refined_*.glb 등 Blender 스크립트 산출).
- 3D용 출처 장부도 없다. 오디오 장부 `Developer/agent_room/audio_asset_provenance_manifest_2026-07-30.json`(104건, 103건 `generated`, 1건 `owner-mandated-canonical`)이 유일한 형식 견본이다.
- 과거 조사: `Graphic_designer/Research_References/graphic_resource_research_v1.md`가 Kenney Top-Down Shooter(2D, CC0)를 언급한 정도. Sketchfab 인어 모델은 "품질 기준 참고만, 재사용 금지"로 기록돼 있다.
- 화면 스타일(bench_s6_after 스크린샷 기준): 상자 조립식 캐릭터, 큰 머리, 파스텔 단색, 검은 외곽선, 탑다운 직교 카메라. → **Kenney Blocky 계열이 가장 가깝고**, KayKit(둥근 청키)은 중상, Quaternius(매끈한 로우폴리)는 중.

## 1. 출처 순위표 — 안전하고 잘 맞는 상위 10

| # | 출처 | 라이선스 (원문 인용, 확인일 2026-11-14) | 상업 | 게임 동봉 | 출처표기 | 스타일 적합 | 비고 |
|---|---|---|---|---|---|---|---|
| 1 | Kenney — https://kenney.nl/support | [직접확인] "all game assets on the asset pages are public domain licensed (CC0)" / "You're free to use them, even in commercial projects." / "Attribution is not required." | O | O | 불필요 | 높음 | Kenney 로고만 별도 사용 자제 |
| 2 | KayKit (Kay Lousberg) — https://kaylousberg.itch.io/ | [직접확인] "Creative Commons Zero v1.0 Universal" (Block Bits 페이지). 무수정 재판매·저작자 사칭만 "자제 요청" | O | O | 불필요 | 중상~높음 | 무료 티어 + 유료 Extra/Source 분리. 1024 그라디언트 아틀라스 1장 → 툰 재질과 궁합 좋음. OBJ/FBX/GLTF |
| 3 | Quaternius — https://quaternius.com/license.html | [직접확인] **2026-08-28부터 자체 라이선스 v1.0 (CC0 아님)**. "worldwide, royalty-free, non-exclusive, perpetual license"; "No attribution is required."; 금지: 에셋을 "extract, repackage, sublicense, sell, or otherwise redistribute" 단독 팩으로 재배포. §7: 받은 시점의 버전이 적용 | O | O (게임에 포함은 명시 허용) | 불필요 | 중 | 팩 페이지/FAQ에는 아직 "CC0" 문구가 남아 있어 충돌. 다운로드 시점 두 페이지 모두 스냅샷 보관. 위반 시 30일 시정 후 해지 가능(완전 비철회는 아님) |
| 4 | Styloo Classroom Asset Pack — https://styloo.itch.io/classroom-asset-pack | [직접확인] "Creative Commons Zero v1.0 Universal", 최소 $5 | O | O | 불필요 | 중 | 유일한 학교 전용 CC0 팩. 텍스처 방식, 삼각형 수 미표기(81MB) → 감량 필요 |
| 5 | Poly Pizza — https://poly.pizza (CC0 표시 모델만) | [보조/직접] 모델별 라이선스 표시. ToS: "adhere to the terms of the Creative Commons license that applies at the time of download"; 서비스를 ML/AI 학습에 쓰는 것 금지 | O | O | CC0 불필요 / CC-BY 필요 | 모델별 | Google Poly 아카이브 모델은 CC-BY 3.0. 같은 Quaternius 모델이 여기선 CC-BY로 붙은 경우 있음 → 원본 사이트에서 받기 |
| 6 | ambientCG — https://docs.ambientcg.com/license/ | [보조] "All ambientCG assets are provided under the Creative Commons CC0 1.0 Universal License." | O | O | 불필요 | 텍스처 전용 | PBR 위주 → 바닥·벽 노이즈 정도만 |
| 7 | Poly Haven — https://polyhaven.com/license | [보조] "You can use our assets for any purpose, including commercial work." / "You do not need to give credit." | O | O | 불필요 | 낮음(모델) | 모델은 고폴리 실사. 텍스처·HDRI만 |
| 8 | Blockbench (도구) — https://www.blockbench.net/faq | [보조] "Everything that you make with Blockbench is your artwork." "you can use and redistribute anything made with Blockbench, even for commercial use." | O | O | 불필요 | **매우 높음** | 상자 조립 + 애니메이션 내장, glTF 출력. 우리 화풍과 동일 계열 |
| 9 | Kenney Asset Forge (도구) — https://kenney.nl/tools/asset-forge | [보조] "The creations you make are your property and you can use them in personal, education and commercial products." 블록은 public domain | O | O | 불필요 | 높음 | 유료 도구, 출력물은 우리 소유 |
| 10 | 애니메이션: KayKit Character Animations — https://kaylousberg.itch.io/kaykit-character-animations / Quaternius Universal Animation Library — https://quaternius.com/packs/universalanimationlibrary.html | KayKit: [보조] "Free for personal and commercial use, no attribution required. (CC0 Licensed)". Quaternius UAL: "Free to use in personal, educational and commercial projects." (현재는 위 v1.0 라이선스 적용 추정) | O | O | 불필요 | 높음 | KayKit 캐릭터와 리그 호환. UAL은 범용 휴머노이드 리그, glTF 제공 |

조건부(쓸 수는 있으나 조건 확인 필요):
- **Sketchfab CC0 / CC-BY** — CC0는 안전, CC-BY는 크레딧 필요. 재업로드 리핑 위험 큼(아래 위험 참고). NoAI 태그는 Standard 라이선스 모델에만 계약상 효력, 게임 사용과는 무관.
- **OpenGameArt CC0만** — 공식 FAQ 403으로 [미확인]. CC-BY-SA/GPL 섞인 항목 금지. 한 항목에 여러 라이선스면 하나 선택 가능.
- **Mixamo (Adobe)** — [보조] 게임 포함 로열티 프리, 크레딧 불필요. 단 원본 FBX를 단독 배포하는 것은 금지 → 웹 빌드에서 GLB가 그대로 받아지는 구조는 회색지대. Adobe 계정 약관 동의 필수, 공식 FAQ 원문 직접 확보 후 사용.
- **Fab (Epic) Standard License** — [보조] "usage is not limited to Unreal Engine", 프로젝트에 포함한 상업 배포 허용, 단독 재배포 금지. 구 Megascans/UE-Only 라벨 항목 제외. Epic에 서면 확인 권장.
- **BlenderKit** — CC0 항목 안전. Royalty Free 항목은 "doesn't allow for re-sale of the asset in the same form" → 게임 포함은 가능해 보이나 웹 GLB 노출 조항 [미확인].
- **Smithsonian Open Access (CC0 표시분)** — 상업·무표기 가능 [보조]. 실사 스캔이라 스타일 부적합.
- **NASA 3D Resources** — 미국 내 저작권 없음이 원칙이나 로고·보증 암시 금지. 스타일 부적합.
- **Khronos glTF-Sample-Assets / three.js examples/models** — 모델마다 README 라이선스가 다름. 저장소 MIT가 모델을 덮지 않음. Soldier/Xbot/Michelle(Mixamo 유래 추정 [미확인]) 등은 개별 확인 전 사용 금지.
- **itch.io 기타 팩** — 팩마다 다름. "소스 파일 재배포 금지" 문구 있으면 웹 빌드와 충돌.
- **MagicaVoxel / Kenney Shape** — 출력물 권리 문구를 공식 페이지에서 못 찾음 [미확인]. 다운로드 동봉 라이선스 확인 후 사용.
- **VRoid Studio** — 프리셋은 상업 사용 가능(특별 조항 없을 때) [보조]. 애니풍 고폴리라 우리 화풍 부적합.
- **MakeHuman** — 공식 빌드 무수정 출력은 CC0 예외 [보조]. 실사 고폴리라 부적합.
- **CMU Mocap 원본** — "free for all uses" [보조, 공식 사이트 인증서 오류]. 노이즈 많고 리타깃 필요. 변환본 중 CC BY-NC 있는 것 주의.
- **Rokoko 무료 모션** — 게임 상업 사용 허용 문구 [보조], 재배포 조항 [미확인].

## 2. 쓰지 말 것

| 출처 | 이유 |
|---|---|
| TurboSquid 무료/Royalty Free, Free3D | 라이선스 7(b): 모델을 "proprietary formats so that they cannot be opened or imported"로 보호해야 함. WebGL은 Unity/Unreal/Lumberyard 출력만 허용, 그 외 사전 승인. three.js GLB 공개 빌드와 정면 충돌. Free3D는 TurboSquid 계열 + "Personal Use" 항목 혼재 |
| CGTrader Royalty Free / Editorial | 21A.3 "prevent the end user from gaining access to the Product" 요구 → 웹 GLB 불가. Editorial은 상업 금지 |
| Unity Asset Store (Synty 포함) | EULA "intended purpose", "incorporated and embedded" 배포만, 보안·사용규칙 우회 금지, AI 학습 금지. three.js 이식 위험 |
| Sketchfab Standard / Editorial / CC BY-SA / CC BY-NC | Standard는 단독 배포 금지, Editorial은 "cannot be used for any commercial or promotional use", SA는 공유 조건 전파, NC는 비상업 |
| Bandai Namco Research Motion Dataset | CC BY-NC 4.0 (비상업) |
| CMU mocap의 CC BY-NC 변환본(예: 4TU FBX) | 비상업 |
| ActorCore(Reallusion) 무료 모션 | 게임 배포에 별도 "Mass Distribution License" 필요 [보조] |
| Thingiverse | 대부분 BY-NC/BY-SA, 3D 프린트용(게임 부적합) |
| OpenGameArt의 CC-BY-SA / GPL 항목, johndh "Splatter pack"(CC-BY) | SA/GPL 전파. 피 텍스처는 CC0 대체품 있음 |
| RenderHub "School Kit 48", "33 Classroom Essentials" 등 | AI 생성 + 유료/재판매 금지 |
| 리핑 의심 모델(유명 게임 캐릭터·소품과 똑같은 것) | CC 라벨이 원저작권을 지우지 못함 |
| Poly Pizza 일괄 수집·AI 용도 | ToS가 서비스의 AI/ML 학습 사용 금지. 수작업 개별 다운로드만 |

## 3. 좀비학교용 구체 후보 (적합도 순, 그룹별)

공통 주의: **삼각형 수는 어느 페이지에도 표기 안 됨** → 모두 [미확인]. 가져오기 전 `gltf-transform inspect`로 실측, 소품 2k·캐릭터 5k 초과 시 감량. 외부 모델은 프로젝트 규칙상 MeshToonMaterial + 외곽선으로 재질 교체 필수. **주인공(로사리)은 Studio 절대법칙 대상이라 외부 모델로 대체 금지** — 아래는 소품·적·NPC용.

### 3-1. 학교 실내
1. **KayKit Furniture Bits** — https://kaylousberg.itch.io/furniture-bits — Kay Lousberg — CC0 — 무료 50+개, OBJ/FBX/GLTF — 책상·의자·책장류. 적합 높음(아틀라스 1장).
2. **KayKit Block Bits** — https://kaylousberg.itch.io/block-bits — CC0 [직접확인] — 무료 32+개, 블록형 — 벽·바닥·사물함 대용 블록. 적합 높음.
3. **Kenney Furniture Kit** — https://kenney.nl/assets/furniture-kit — CC0 — 140 파일 — 책상·의자·책장·화장실 소품. 적합 높음.
4. **Kenney Desk (Poly Pizza 미러)** — https://poly.pizza/m/6PbVkqPzEU — Kenney — CC0 — 교사 책상/학생 책상 대용. 적합 높음.
5. **Styloo Classroom Asset Pack** — https://styloo.itch.io/classroom-asset-pack — styloo — CC0, $5 [직접확인] — FBX/GLTF — 칠판·사물함·책상·과학실(현미경·바이알)·컴퓨터실·화장실(변기·소변기·칸막이)·급식실(식판·자판기)·미술실·교장의자·소화기. 학교 전용 유일. 적합 중(텍스처 → 단색화·감량 필요).
6. **KayKit Restaurant Bits** — https://kaylousberg.itch.io/restaurant-bits — CC0 — 무료 140+개 — 급식실 테이블·식판·주방. 적합 높음.
7. **Locker (J-Toastie)** — https://poly.pizza/m/aGmZ4jQD2y — CC-BY 3.0 — 학교 사물함. 적합 중상. 크레딧 필요.
8. **Vending Machine (J-Toastie)** — https://poly.pizza/m/ZhziWexNWk — CC-BY 3.0 — 적합 중상. 크레딧 필요. (Styloo 팩 자판기가 CC0 대안)
9. **Gym mat (Zsky)** — https://poly.pizza/m/gHLnNRu37P — CC-BY 3.0 — 체육관. 적합 중상.
10. **Basketball ball and hoop (Armory_3D)** — https://poly.pizza/m/i3LLacyQP4 — CC0 [보조] — 체육관/운동장. 적합 중상.
11. Blackboard (jeremy) — https://poly.pizza/m/duhtFXbJCfc — CC-BY 3.0 — 적합 중 (Styloo 칠판이 CC0 대안).

### 3-2. 운동장
12. **Kenney Nature Kit** — https://kenney.nl/assets/nature-kit — CC0 — 330 파일 — 나무·덤불·바위. 적합 높음.
13. **KayKit City Builder Bits** — https://kaylousberg.itch.io/city-builder-bits — CC0 — 무료 32+개(Extra에 공원) — 벤치·가로등·도로. 적합 높음.
14. **Kenney City Kit (Suburban)** — https://kenney.nl/assets/city-kit-suburban — CC0 — 40 파일 — 울타리·담장 대용. 적합 높음.
15. Soccer goal (Poly by Google) — https://poly.pizza/m/7t4hmicGHV4 — CC-BY 3.0 — 축구 골대. 적합 중. 크레딧 필요.
16. 울타리/정문 후보: Kenney Fence Fortified https://poly.pizza/m/9FQPNr0sdJ, Quaternius Fence https://poly.pizza/m/JfSPlkPhRD, Zsky Fence Gate https://poly.pizza/m/SIimyf3ShX — 라이선스 개별 [미확인].

### 3-3. 좀비·학생 캐릭터 (리그/애니)
17. **Kenney Blocky Characters v2.0** — https://kenney.nl/assets/blocky-characters — CC0 [직접확인] — 20 파일, "Animation" 기능 표기(리그 여부·동작 목록 [미확인]) — 학생·좀비 재채색. **우리 화풍과 가장 가까움.**
18. **Kenney Mini Characters v2.0** — https://kenney.nl/assets/mini-characters — CC0 — 40 파일, 애니메이션 — 적합 중상.
19. **KayKit Skeletons** — https://kaylousberg.itch.io/kaykit-skeletons — CC0 — FBX/GLTF, 리그 + 기본 애니, 무료 4종 — 좀비로 재스킨. 적합 중상.
20. **KayKit Adventurers** — https://kaylousberg.itch.io/kaykit-adventurers — CC0 — 무료 5종, 리그·애니 — 학생/교사 베이스. 적합 중상.
21. **KayKit Character Animations** — https://kaylousberg.itch.io/kaykit-character-animations — CC0 — 위 두 팩과 리그 호환 걷기·공격 등.
22. **Quaternius Zombie Apocalypse Kit** — https://quaternius.com/packs/zombieapocalypsekit.html — Quaternius 라이선스 v1.0 — 60 모델(캐릭터 4종×20 애니, 적 4, 개 2, 환경·차량) glTF 포함 — 적합 중(매끈함).
23. **Quaternius Animated Zombie** — https://quaternius.com/packs/animatedzombie.html — 위와 동일 — 좀비 + 다수 애니. 적합 중. (Poly Pizza 미러 https://poly.pizza/m/jkrEvQZb8J 는 CC-BY 3.0으로 붙어 있음 → 원본에서 받기)

### 3-4. 교사·보스형
24. 전용 교사·경비·보건·코치 CC0 모델은 **못 찾음**. Quaternius Ultimate Animated Character Pack https://quaternius.com/packs/ultimatedanimatedcharacter.html (52 모델, 성인 체형 포함 추정 [미확인]) 또는 Kenney Blocky/KayKit Adventurers에 소품(넥타이·안경·호루라기) 추가가 현실적.

### 3-5. 획득물
25. **Onigiri (Quaternius)** — https://poly.pizza/m/VWPcsVqOiP — "Public Domain (CC0)" [직접확인] — 적합 높음.
26. **Rice Ball (Kenney)** — https://poly.pizza/m/BYwdAyw9aY — CC0 — 적합 높음.
27. **Kenney Food Kit v2** — https://kenney.nl/assets/food-kit — CC0 — 200 파일 — 샌드위치·우유 등. 적합 높음.
28. Quaternius Ultimate Food Pack — https://quaternius.com/packs/ultimatefood.html — v1.0 — 103 모델, 무텍스처(단색) — 적합 중상.
29. Paper Plane (Anonymous) — https://poly.pizza/m/5X4zRUBadun — CC-BY 3.0 — 적합 중. 직접 만드는 편이 빠름(삼각형 수십 개).
※ 현재 게임에 주먹밥·종이비행기 모델이 이미 있음(스크린샷 확인) → 교체 우선순위 낮음.

### 3-6. 공포 연출
30. **Kenney Graveyard Kit v5** — https://kenney.nl/assets/graveyard-kit — CC0 — 90 파일, horror 태그 — 부서진 울타리·잔해·좀비. 적합 높음.
31. **Kenney Survival Kit v2** — https://kenney.nl/assets/survival-kit — CC0 — 80 파일 — 바리케이드·상자. 적합 높음.
32. **Kenney Barricade (Poly Pizza)** — https://poly.pizza/m/JSTjgVIyX8 — CC0 — 적합 높음.
33. **KayKit Halloween Bits** — https://kaylousberg.itch.io/halloween-bits — CC0 — 무료 60+개. 적합 높음.
34. 피 데칼(OpenGameArt, CC0 표기 — 각 페이지 재확인 필수): Horror Texture Pack https://opengameart.org/content/horror-texture-pack , 100 grunge brushstrokes and splatters https://opengameart.org/content/100-grunge-brushstrokes-and-splatters-set , Liquid Splatter Pixel Texture https://opengameart.org/content/liquid-splatter-pixel-texture
35. VFX 텍스처: **Kenney Particle Pack** — https://kenney.nl/assets/particle-pack — CC0 — 80장 512×512.

### 먼저 시험할 5개
1. **Kenney Blocky Characters** — 좀비·학생 NPC 재채색 테스트(화풍 일치 최우선 확인).
2. **KayKit Furniture Bits + Block Bits** — 교실 책상·의자·사물함 블록.
3. **Styloo Classroom Asset Pack($5, CC0)** — 칠판·화장실·과학실·급식실 공백을 한 번에. 감량·단색화 비용 실측.
4. **Kenney Graveyard + Survival Kit** — 바리케이드·잔해로 공포 연출.
5. **KayKit Skeletons + Character Animations** — 리그·걷기/공격 애니가 있는 좀비 베이스.

## 4. 에셋 반입 체크리스트 (자산마다)

오디오 장부 형식을 그대로 따라 `Developer/agent_room/3d_asset_provenance_manifest_YYYY-MM-DD.json`(신규)에 기록:
1. `logicalId`, `category`(prop/character/animation/texture), 저장소 내 `paths[]` 각 `bytes`·`sha256`.
2. `provenanceType`: `third-party-cc0` / `third-party-cc-by` / `third-party-custom`(Quaternius v1.0 등) / `generated`.
3. `source`: 모델·팩 **원본 페이지 URL**(미러 말고 원작자 사이트), 작성자명, 다운로드 일시, 원본 압축파일 sha256.
4. `licenseEvidence`: 라이선스 이름 + 라이선스 페이지 URL + **원문 인용 + 그날 페이지 스냅샷(PDF/HTML)** 파일 경로. Quaternius는 license.html 버전·날짜까지.
5. CC-BY면 `credit` 문구(제목·작성자·라이선스·링크)를 크레딧 화면 목록에 동시 등록.
6. 리핑 점검: 유명 게임/브랜드와 닮았는지 육안 확인, 작성자의 다른 업로드 확인, AI 생성 표기 여부 기록. 의심되면 반입 금지.
7. 수정 내역(감량·재질 교체·리그 변경)과 실측 삼각형 수 기록. 소품 ≤2k, 캐릭터 ≤5k.
8. 금지 체크: SA/NC/Editorial/Standard/"보호 포맷 요구"/"단독 재배포 금지인데 원본 그대로 공개"에 해당하지 않는지.
9. 2D 콘셉트 확인 후 반입(그래픽 정책), MeshToonMaterial + 외곽선 적용, 기록은 `Graphic_designer/`.
10. 검토자(threemini 반입 / balanceqa 확인) 이름 기록.

## 5. 무료로 메울 수 없는 공백과 대응

| 공백 | 대응 |
|---|---|
| 신발장(한국·일본 학교 특유), 교단·조회대, 국기 게양대, 육상 트랙, 자전거 거치대, 출입금지 테이프, 우유팩, 동전 | 대부분 상자·원기둥 몇 개 → Blockbench나 기존 Blender 스크립트(넨도로이드 저예산 방식)로 자체 제작, 100~500 삼각형. 트랙·라인은 지금처럼 바닥 셰이더/선으로 |
| 교사·경비·보건·코치 등 성인 NPC, 보스형 캐릭터 | Kenney Blocky/KayKit 베이스 + 자체 소품 조립, 또는 기존 자체 보스 파이프라인 유지. 보스는 정체성이 중요하므로 자체 제작 권장 |
| 피아노·드럼 등 음악실, 과학실 세부 | Styloo 팩 일부 + 자체 제작 |
| 우리 화풍과 100% 맞는 좀비 애니메이션 | KayKit/Quaternius UAL 동작을 우리 리그로 리타깃하거나, 지금처럼 three.js 코드 포즈 애니 유지 |
| 삼각형 수 정보 전무 | 반입 전 실측 필수 |
| Mixamo 공식 문구, MagicaVoxel 라이선스, Blender FAQ 원문 | 이번에 403/미표기로 직접 확보 실패 → 쓰기 전 수동으로 원문 저장 |
