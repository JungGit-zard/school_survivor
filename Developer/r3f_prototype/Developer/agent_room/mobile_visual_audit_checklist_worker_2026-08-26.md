# Mobile Visual Audit Checklist — Stage 3 / EXP / Lighting — 2026-08-26

작성: uimini
역할: mobile visual audit lane
범위: Stage 3 basketball hoop/ball, EXP textbook pickup/attraction, stage lighting mobile readability audit plan
소스 코드 수정: 없음

## 1. 전제와 근거 문서

이 체크리스트는 다음 방향을 기준으로 한다.

- 모바일 실게임 화면이 1차 기준이다. 데스크톱 확대 장면만으로 PASS 처리하지 않는다.
- 목표는 `mobile-readable, cute, stylized blocky 3D`이다.
- 어둡고 공포스러운 무드로 해결하지 않는다.
- 단순 상자 나열로 뭉개지지 않아야 하며, 각 오브젝트는 작은 화면에서도 의도된 학교 소품으로 읽혀야 한다.
- 그래픽 결정은 구현보다 먼저 문서화되어야 한다.
- 실제 구현 검증 시 focused test/build와 모바일 뷰포트 스크린샷 증거를 남긴다.

읽은 작업 문서:

- `Developer/agent_room/subagent_lounge_routing_schedule_2026-08-26.md`
- `Developer/agent_room/stage_visual_quality_work_schedule_2026-08-26.md`
- `Developer/agent_room/stage_visual_direction_mobile_blocky_cute_2026-08-26.md`
- `Developer/agent_room/stage3_basketball_hoop_ball_concept_2026-08-26.md`

## 2. 필수 모바일 뷰포트 매트릭스

모든 Stage 3 / EXP / lighting 시각 검수는 아래 3개 뷰포트를 최소 세트로 사용한다.

| ID | Viewport | 대표 의미 | 필수 여부 |
| --- | --- | --- | --- |
| `se` | `375x667` | iPhone SE급 작은 세로 화면 | 필수 |
| `pixel` | `393x851` | 보편 Android/Pixel급 세로 화면 | 필수 |
| `wide` | `430x932` | 넓은 Android/대형 iPhone급 세로 화면 | 필수 |

권장 캡처 상태:

1. Stage 3 시작 직후 중앙 시야.
2. Stage 3 남쪽/6-o'clock hoop 근접 시야.
3. Stage 3 남쪽 벽과 hoop/ball이 동시에 보이는 시야.
4. EXP textbook이 정지 상태로 보이는 시야.
5. EXP textbook이 플레이어에게 끌려오는 중간 프레임.
6. 각 stage lighting 비교용: Stage 1, 2, 3, 4의 대표 플레이 화면.

## 3. 스크린샷 파일명 규칙

스크린샷은 `Developer/r3f_prototype/test-results/mobile-visual-audit/2026-08-26/` 아래에 저장하는 것을 권장한다.

파일명 형식:

```text
<date>_<lane>_<stage-or-system>_<scene>_<viewport>_<pass-or-issue>.png
```

예시:

```text
2026-08-26_uimini_stage3_hoop-south_se_375x667_pass.png
2026-08-26_uimini_stage3_hoop-south_pixel_393x851_issue-edgeclip.png
2026-08-26_uimini_stage3_exp-attract-mid_wide_430x932_pass.png
2026-08-26_uimini_lighting_stage3-gym_se_375x667_pass.png
```

보조 증거가 동영상일 때:

```text
2026-08-26_uimini_stage3_exp-attraction_pixel_393x851_pass.webm
```

이슈 캡처는 파일명 끝에 문제 유형을 붙인다.

- `issue-edgeclip`
- `issue-silhouette`
- `issue-contrast`
- `issue-dark`
- `issue-boxy`
- `issue-jitter`
- `issue-washout`

## 4. 공통 판정 기준

### 4.1 Edge clipping / safe viewport

PASS:

- 핵심 오브젝트가 375x667, 393x851, 430x932 모두에서 화면 가장자리나 HUD에 잘리지 않는다.
- Stage 3 남쪽 hoop/ball은 남쪽 벽에 붙어 보이더라도 rim/backboard/support/ball 중 식별 핵심이 잘리지 않는다.
- 플레이어 이동 중 카메라 추적으로 인해 순간적으로 잘리더라도, 정상 접근 위치에서 1초 이상 안정적으로 읽히는 구간이 있다.
- 터치 HUD/조이스틱/버튼이 시야 위에 겹쳐 핵심 소품을 가리지 않는다.

FAIL:

- 작은 375x667에서 backboard, rim, ball 중 하나가 화면 밖으로 잘려 오브젝트 정체가 불분명하다.
- 남쪽/6-o'clock 소품이 화면 하단 또는 가상 조이스틱 영역에 묻혀 보인다.
- Stage 3 hoop가 남쪽 벽 바깥에 걸친 듯 보이거나, 위치가 너무 바깥이라 mobile framing에서 broken prop처럼 보인다.
- EXP textbook이 플레이어에게 끌려오는 중 HUD/화면 가장자리에서 갑자기 사라져 수집 궤적을 읽을 수 없다.

### 4.2 Silhouette readability

PASS:

- Stage 3 hoop는 작은 캡처에서도 `backboard + rim + net hint + support` 조합으로 읽힌다.
- ball은 orange body와 dark seam cue가 있어 단순 주황 구체/상자로 보이지 않는다.
- EXP textbook은 이동 중에도 책 형태, 표지색, 테두리 또는 stripe cue가 남아 있다.
- Stage lighting은 각 스테이지의 주요 이동 경로와 위험 요소의 외곽을 죽이지 않는다.

FAIL:

- hoop가 stacked boxes, broken boxes, generic cubes처럼 보인다.
- rim이 너무 얇거나 같은 색에 묻혀 hoop가 아니라 표지판/벽장식처럼 보인다.
- ball seam이 보이지 않아 basketball 정체성이 사라진다.
- EXP textbook이 회전/흡입 중 픽셀 덩어리나 노이즈처럼 보인다.
- 조명이 강한 명암 또는 어두운 그림자로 실루엣을 먹어 버린다.

### 4.3 Color contrast / hierarchy

PASS:

- Stage 3 gym은 밝고 playful한 sports festival 느낌이다.
- hoop rim의 orange, backboard cream/white, border blue, support/post color가 바닥과 분리된다.
- EXP textbook은 바닥, 적, 코인, projectile과 구분된다.
- lighting은 stage별 콘셉트를 주되 gameplay target과 pickups를 washout하지 않는다.
- 중요한 시각 계층은 `player > enemies/hazards > pickups > props > floor detail` 순서를 해치지 않는다.

FAIL:

- Stage 3가 어둡거나 horror/murky 방향으로 보인다.
- 바닥색과 prop색이 비슷해서 mobile screenshot에서 한 덩어리로 뭉친다.
- 강한 bloom/색조 때문에 EXP textbook이나 hoop edge가 뭉개진다.
- Stage lighting이 예쁘지만 적/플레이어/픽업 판독을 방해한다.
- 지나치게 많은 accent color가 들어가서 mobile 화면에서 noise가 된다.

### 4.4 Cute/blocky readability

PASS:

- blocky primitive를 쓰더라도 authored shape로 보인다.
- 각 소품에 iconic cue가 있다: hoop rim, backboard border, ball seam, textbook stripe/cover.
- 모서리는 너무 살벌하거나 horror damage처럼 보이지 않고 toy-like, chunky, friendly한 인상을 준다.
- detail은 mobile에서 읽히는 큰 형태와 색 cue 중심이다.

FAIL:

- 모든 물체가 무작위 box stack처럼 보인다.
- damage/crack/dark stain이 Stage 3 sports/gym mood를 깨고 공포 방향으로 간다.
- realistic detail이 작게 뭉개져 오히려 지저분해 보인다.
- 단순화가 너무 과해 basketball hoop, ball, textbook 정체성이 사라진다.

## 5. Stage 3 basketball hoop/ball 전용 체크리스트

### 5.1 South / 6-o'clock hoop risk

주의: 기존 concept note 기준 south hoop는 `position: [0, 0, 17.0]`, rotation `[0, Math.PI, 0]`이며 남쪽/6-o'clock 배치가 mobile edge clipping 위험 지점이다.

특히 확인할 위험:

- 375x667에서 hoop가 화면 하단에 걸려 backboard/rim/ball이 잘리는지.
- 남쪽 벽 또는 하단 HUD와 겹쳐 broken boxes처럼 보이는지.
- 카메라가 플레이어를 따라갈 때 hoop의 중요한 실루엣이 너무 늦게 나타나거나 너무 빨리 사라지는지.
- `z ≈ 17.0` 위치가 mobile에서 너무 바깥이면 concept note의 후보처럼 `z ≈ 15.8~16.2` inward pull 검토가 필요하다는 이슈를 남긴다. 이 문서는 구현하지 않고 검수 기준만 남긴다.

### 5.2 Hoop visual PASS 기준

- Cream/white backboard와 bold border가 phone screenshot에서 구분된다.
- Orange rim이 backboard와 분리되어 hoop로 읽힌다.
- Net hint는 6~8개 정도의 단순 strip으로 보이고 dense mesh/noise가 아니다.
- Support/post가 있어 벽에 붙은 이상한 판자가 아니라 gym prop으로 보인다.
- Damage/broken horror cue가 제거되거나 매우 약한 playful scuff 수준이다.

### 5.3 Ball visual PASS 기준

- Orange body가 floor와 구분된다.
- Thick dark seam arcs가 375x667에서도 최소 1개 이상 읽힌다.
- 크기는 toy-like로 살짝 커도 되지만 player/enemy 판독을 방해하지 않는다.
- loose ball이 여러 개 있으면 clutter가 되지 않아야 한다.

## 6. EXP textbook pickup / attraction 체크리스트

### 6.1 Static readability

PASS:

- textbook이 gold coin, projectile, enemy fragment와 구분된다.
- 작은 화면에서 책 표지 또는 rectangular book silhouette가 보인다.
- 바닥 위에서 너무 납작하거나 조명에 묻히지 않는다.

FAIL:

- textbook이 바닥 무늬처럼 보인다.
- coin/loot와 혼동된다.
- 적 밀집 또는 Stage lighting 아래에서 사라진다.

### 6.2 Attraction motion readability

PASS:

- 플레이어에게 빨려 들어가는 움직임이 easing처럼 부드럽다.
- 중간 프레임에서 bob/spin 또는 방향 변화가 읽혀 수집 피드백이 있다.
- 가까워질 때까지 갑자기 snap/disappear하지 않는다.
- 375x667에서도 수집 경로가 최소 3~5프레임 이상 시각적으로 추적된다.

FAIL:

- textbook이 순간이동하거나 한 프레임에 사라진다.
- 흡입 중 jitter가 있어 버그처럼 보인다.
- 플레이어 주변 VFX/무기/적과 겹쳐 pickup feedback이 묻힌다.
- 수집 직전 pop/feedback이 없어 획득한 느낌이 약하다.

## 7. Stage lighting 체크리스트

### 7.1 공통 lighting PASS 기준

- stage별 색감이 다르지만 gameplay readability를 우선한다.
- 어두움으로 긴장감을 만들지 않는다.
- player, enemies, pickups, stage props가 floor와 분리된다.
- mobile screenshot에서 전체가 회색/갈색 한 덩어리로 보이지 않는다.
- lightMap/baked/cheap lighting 접근을 유지해 모바일 성능 위험을 키우지 않는다.

### 7.2 Stage별 콘셉트 판정

| Stage | 의도 | PASS 기준 | FAIL 기준 |
| --- | --- | --- | --- |
| Stage 1 Classroom | warm classroom survival | amber/warm classroom cue가 있으나 desk/chair/player가 읽힘 | 너무 어둡거나 desk가 바닥에 묻힘 |
| Stage 2 Corridor | chase corridor / lane readability | hallway lane과 진행 방향이 명확함 | corridor가 공포 복도처럼 어둡고 적이 안 보임 |
| Stage 3 Gym | bright sports festival | court wood, hoop, ball, sports accents가 밝고 귀여움 | muddy/dark gym, hoop가 broken prop처럼 보임 |
| Stage 4 Cafeteria/Kitchen | clean mint/yellow utility | tile, kitchen props, 이동 틈이 읽힘 | 조명 때문에 prop collision gap/경계가 헷갈림 |

## 8. 캡처별 점검 기록 템플릿

각 스크린샷/영상마다 아래 형식으로 기록한다.

```text
Evidence ID:
File:
Viewport:
Stage/System:
Scene:
Observed result:
Edge clipping: PASS / FAIL / N/A
Silhouette: PASS / FAIL / N/A
Contrast: PASS / FAIL / N/A
Cute/blocky readability: PASS / FAIL / N/A
Gameplay readability impact: PASS / FAIL / N/A
Notes:
Required follow-up owner: threemini / levelmini / uimini / balanceqa / none
```

## 9. 최종 evidence checklist

최종 acceptance 전에 아래를 모두 채운다.

- [ ] `375x667` Stage 3 south hoop screenshot exists.
- [ ] `393x851` Stage 3 south hoop screenshot exists.
- [ ] `430x932` Stage 3 south hoop screenshot exists.
- [ ] 각 hoop screenshot에서 edge clipping 판정이 기록되어 있다.
- [ ] 각 hoop screenshot에서 silhouette 판정이 기록되어 있다.
- [ ] south/6-o'clock hoop risk가 PASS 또는 follow-up issue로 명확히 남아 있다.
- [ ] EXP textbook static screenshot exists.
- [ ] EXP textbook attraction mid-motion screenshot 또는 short video exists.
- [ ] EXP attraction이 snap/jitter/disappear 없이 보이는지 판정되어 있다.
- [ ] Stage 1 lighting representative screenshot exists.
- [ ] Stage 2 lighting representative screenshot exists.
- [ ] Stage 3 lighting representative screenshot exists.
- [ ] Stage 4 lighting representative screenshot exists.
- [ ] lighting이 dark/horror 방향으로 가지 않았는지 판정되어 있다.
- [ ] player/enemy/pickup hierarchy가 유지되는지 판정되어 있다.
- [ ] focused tests/build 결과가 구현 담당 handoff에 기록되어 있다. 이 uimini 문서만으로 구현 PASS를 선언하지 않는다.
- [ ] 모든 evidence 파일명이 이 문서의 naming convention을 따른다.
- [ ] 남은 issue는 owner와 함께 Kanban/comment/handoff에 기록되어 있다.

## 10. 이 문서의 완료 범위

이 문서는 구현 전 모바일 시각 검수 계획과 판정 기준을 제공한다.
이 문서 자체는 source code를 수정하지 않았고, screenshot을 실제 촬영하지 않았다.
실제 구현 후 최종 PASS는 각 viewport 증거, focused test/build, balanceqa acceptance를 통해 별도로 판정해야 한다.
