# 그래픽 리소스 탐색 보고서 v1

탐색일: 2026-04-20  
탐색 범위: itch.io / OpenGameArt / CraftPix / Kenney / Lospec / 공포 게임 색채 분석

---

## 1. 핵심 결론

| 우선순위 | 카테고리 | 즉시 활용 가능 여부 |
|----------|----------|---------------------|
| ★★★ | Lospec 팔레트 → 게임 색채 기준선 수립 | 코드에 직접 반영 가능 |
| ★★★ | LimeZu Modern Interiors → 학교 인테리어 시각 레퍼런스 | 레퍼런스로 활용 |
| ★★☆ | CraftPix 좀비 스프라이트 → 캐릭터 디자인 레퍼런스 | 라이선스 허용, 직접 사용 가능 |
| ★★☆ | Kenney Top-Down Shooter → CC0, 580개 에셋 | 직접 사용 가능 |
| ★☆☆ | Japanese Horror School tiles → 분위기 레퍼런스 | 유료 레퍼런스 |

---

## 2. 컬러 팔레트 (Lospec)

### 2-1. Survival Horror 32 ★ 최우선 추천

> "어두운 색만 쓰면 지루하다" — 밝은 색을 전략적으로 포함한 32색 공포 팔레트

**용도별 분류:**

| 역할 | 색상 (hex) |
|------|-----------|
| 바닥/배경 어두운 기반 | `#2d2738` `#403e52` `#5c6174` |
| 벽·구조물 중간톤 | `#8c929e` `#b7c0c7` |
| 피부·나무 따뜻한 계열 | `#805947` `#a99a73` `#c9cb9f` |
| 감염 녹색 계열 | `#41745a` `#679a73` `#95bf91` |
| 혈흔·위험 빨간 계열 | `#4f1b30` `#71353f` `#9e6363` `#cea19d` |
| 엘리트/보스 보라 계열 | `#351740` `#402c56` `#514a78` `#6f779e` |
| 강조·UI | `#ffffff` `#000000` |

**전체 32색:**
```
#cea19d #9e6363 #71353f #4f1b30 #380e27
#c9cb9f #a99a73 #805947 #623333 #471f1f
#95bf91 #679a73 #41745a #20494b #0f2935
#96a5bc #6f779e #514a78 #402c56 #351740
#b29cc3 #a278ad #8b5084 #693054 #5a2033
#b7c0c7 #8c929e #5c6174 #403e52 #2d2738
#ffffff #000000
```

---

### 2-2. Poison (감염 계열 5색)

감염 장판, XP 오브, 감염 스테인에 특화된 5색 조합.

```
#2a2a2b  ← 감염 그림자/바닥 베이스
#454a4d  ← 중간 오염 톤
#2f7571  ← 감염 테두리 (청록)
#5a9470  ← 감염 중간 녹색
#81b071  ← 감염 밝은 녹색 (XP 오브)
```

---

### 2-3. Vampire-16 (전체 분위기 팔레트)

뱀파이어 서바이버 스타일 게임에 맞는 16색 범용 팔레트.

```
#0e0116  #340a43  #6d1a3d  #ca2828  ← 어둠/위험
#e99039  #f4e27b                     ← 경고/UI 강조
#95c74d  #2c9639  #0b4b3b            ← 생존/녹색
#6739bc  #7ca0f4  #f8f7f2            ← 마법/보스
#9a826b  #4b2933  #9d442c  #f8b97f  ← 피부/따뜻한 계열
```

---

### 2-4. Look of Horror (4색 드라마틱 강조용)

보스 등장, 게임오버 화면 등 극적인 순간에 사용하는 최소 팔레트.

```
#0a202f  ← 배경 어둠
#302d6a  ← 공포 보라
#871c3e  ← 혈흔 다크 레드
#d32836  ← 위험 브라이트 레드
```

---

## 3. 학교 환경 타일셋 레퍼런스

### 3-1. LimeZu — Modern Interiors RPG Tileset ★★★

- **URL**: https://limezu.itch.io/moderninteriors
- **가격**: $1.50 (name your price)
- **타일 크기**: 16×16 / 32×32 / 48×48 세 버전 제공
- **포함 요소**: 교실, 병원, 도서관, 박물관, 상점, 주거 등 40+ 인테리어 환경
  - 책상, 의자, 책장, 교실 소품 확인됨
- **라이선스**: 상업용 게임 배포 가능 / 에셋 재판매 불가 / 크레딧 필요
- **추천 이유**: 본 게임의 학교 실내 프롭 디자인 레퍼런스로 최적. 32×32 버전이 현재 게임의 프롭 스케일과 일치.

### 3-2. Japanese Horror School tiles — cjtouhey

- **URL**: https://itch.io/game-assets/tag-school (검색 결과 내)
- **가격**: $10
- **타일 크기**: 32×32
- **스타일**: Corpse Party, RPG Maker, Project Kat 분위기
- **추천 이유**: 감염 학교 분위기와 가장 직접 매칭. 어두운 일본식 공포 학교 타일.

### 3-3. 2D School Classroom Asset Pack — styloo

- **URL**: https://itch.io/game-assets/tag-school
- **가격**: 무료
- **포함**: 3000+ 스프라이트 (교실 가구, 소품 전체)
- **주의**: RPG Maker 기반, Phaser 호환성 확인 필요

---

## 4. 캐릭터/적 스프라이트 레퍼런스

### 4-1. CraftPix — Free Urban Zombie Sprite Sheet ★★★

- **URL**: https://craftpix.net/freebies/free-urban-zombie-sprite-sheet-pixel-art-pack/
- **가격**: 무료
- **캐릭터**: Corporate Corpse, Street Stalker, Urban Grotesque, Wasteland Walker (4종)
- **애니메이션**: idle, walk, attack, take damage, fall (캐릭터당)
- **파일 형식**: PNG + PSD (레이어 편집 가능)
- **라이선스**: 상업용 무제한 배포 가능
- **Three.js 활용**: 직접 사용은 어렵지만 캐릭터 실루엣·색채 디자인 레퍼런스로 활용

### 4-2. CraftPix — Free Zombie Sprite Sheet Pack

- **URL**: https://craftpix.net/freebies/free-zombie-sprite-sheet-pack-pixel-art/
- **가격**: 무료
- **캐릭터**: Zombie man, Zombie woman, Wild zombie man (3종)
- **애니메이션**: attack ×3, walk, dead, eating, hurt, idle, jump, run (캐릭터당 10개)
- **라이선스**: 상업용 무제한

### 4-3. Kenney — Top-Down Shooter ★★★ (CC0)

- **URL**: https://kenney.nl/assets/top-down-shooter
- **가격**: 무료 (CC0 — 저작권 없음, 출처 표기 불필요)
- **파일 수**: 580개
- **포함**: 타일, 캐릭터, 좀비, 오브젝트 (전반적인 탑다운 슈터 에셋 세트)
- **추천 이유**: CC0 라이선스로 제약 없이 사용 가능. 프롭·바닥 타일 레퍼런스로 즉시 활용.

### 4-4. OpenGameArt — Animated Top Down Survivor + Zombie

- **URL**: https://opengameart.org/content/animated-top-down-survivor-player
- **URL**: https://opengameart.org/content/animated-top-down-zombie
- **라이선스**: 무료 (구체적 라이선스는 페이지 확인 필요)
- **포함**: 서바이버 플레이어 + 좀비 애니메이션 스프라이트

---

## 5. 공포 게임 색채 설계 원칙 (분석 결과)

### 5-1. Resident Evil 접근법 → 본 게임에 직접 적용 가능

- **기반**: 채도 낮은 어두운 베이스 팔레트 → 단조롭지만 공포감 조성
- **강조**: 밝은 대비색 1~2개로 플레이어 시선 유도
- **실제 사례**: Leon(파란색), Claire(빨간색) → 플레이어를 배경에서 즉시 구분
- **본 게임 적용**: 플레이어 링(`#59c7ff` 하늘색)이 이미 이 원칙을 따름 ✅

### 5-2. Silent Hill 접근법 → 위험 구역 시각화

- **안전**: 차가운 파란색/회색 계열
- **위험**: 따뜻한 주황/녹슨 계열
- **본 게임 적용**: 보스 등장 시 배경 색온도를 따뜻하게 시프트하는 연출 가능

### 5-3. Vampire Survivors 성능 최적화 원칙

- 캐릭터: 32×32픽셀, 2~6프레임 애니메이션
- 다수 적 렌더링 시 색상으로 타입 즉시 구분 (실루엣보다 색 우선)
- **Three.js 현황**: 현재 모든 캐릭터가 동일 캡슐+구 형태 → 색상 구분이 유일한 수단 → Survival Horror 32 팔레트 적용 시 즉각 개선 가능

---

## 6. 즉시 코드에 반영 가능한 색상 개선안

현재 게임의 tint 색상을 Survival Horror 32 팔레트 기준으로 리매핑:

| 오브젝트 | 현재 | 팔레트 기반 개선안 |
|----------|------|--------------------|
| 바닥 타일 밝은 판자 | `0xd4a04a` | `0xa99a73` (좀 더 탁한 나무) |
| 감염 학생 | `0x76ef82` | `0x95bf91` (Survival Horror 녹색) |
| 감염 학생 떼 | `0xa4ff70` | `0x679a73` (더 탁한 구분 색) |
| 체육교사 | `0xcc6633` | `0x805947` (갈색 계열 유지, 더 어둡게) |
| 오염 침뱉개 | `0x7cffc4` | `0x2f7571` (Poison 팔레트 청록) |
| 광폭 질주 | `0xff9c3d` | `0xe99039` (Vampire-16 주황) |
| 엘리트 교사 | `0xb06dff` | `0x6f779e` (Survival Horror 보라) |
| 보스 | `0x9bff64` | `0x95bf91` (감염 녹색 통일) |
| XP 오브 | `0x00e5cc` (추정) | `0x81b071` (Poison 밝은 녹색) |
| 감염 장판 | `0x1a7a3a` | `0x41745a` + 테두리 `0x95bf91` |
| 충격파 경고 | 보라 | `0x693054` (Survival Horror 보라) |

---

## 7. 다운로드 우선순위 액션 목록

| # | 항목 | URL | 비용 | 즉시 활용 |
|---|------|-----|------|-----------|
| 1 | Kenney Top-Down Shooter | kenney.nl/assets/top-down-shooter | 무료 CC0 | 레퍼런스/직접 |
| 2 | CraftPix Urban Zombie Sprite | craftpix.net/freebies/free-urban-zombie-sprite-sheet-pixel-art-pack/ | 무료 | 레퍼런스 |
| 3 | CraftPix Zombie Sprite Pack | craftpix.net/freebies/free-zombie-sprite-sheet-pack-pixel-art/ | 무료 | 레퍼런스 |
| 4 | LimeZu Modern Interiors | limezu.itch.io/moderninteriors | $1.50 | 레퍼런스 |
| 5 | Survival Horror 32 팔레트 | lospec.com/palette-list/survival-horror-32 | 무료 | 코드 직접 반영 |
| 6 | Poison 팔레트 | lospec.com/palette-list/poison | 무료 | 코드 직접 반영 |
| 7 | Japanese Horror School tiles | itch.io (cjtouhey) | $10 | 레퍼런스 |

---

## 8. 다음 단계 권장 작업

1. **즉시 (코드 반영)**: Section 6의 tint 색상 리매핑을 `data.js` + `game.js`에 반영
2. **단기 (레퍼런스 수집)**: Kenney + CraftPix 무료 팩 다운로드 후 프롭 디자인 재검토
3. **중기 (분위기 강화)**: LimeZu Modern Interiors 참고하여 classroom prop 세트 재설계
4. **선택적**: Silent Hill 컬러 접근법으로 보스 등장 시 화면 색온도 연출 추가
