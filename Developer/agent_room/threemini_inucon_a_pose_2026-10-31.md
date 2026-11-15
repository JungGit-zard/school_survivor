# threemini — 이누콘 양팔 A포즈 (2026-10-31, Terry 지시, receipt 7af28611)
파일: `Developer/r3f_prototype/src/components/Weapons/Inucon.jsx` 하나. 최종 rotation.z = JSX base(마운트 캡처) + Studio 오프셋(불변) + useFrame 애니.

| 팔 | 그룹 base z 전→후 | useFrame 애니 전→후 | 실효 z 전→후 | 팔 축 (수직 대비) 전→후 |
|---|---|---|---|---|
| armR | -0.42 → -2.64 | -0.55+wave(±0.055) → wave×0.5(±0.0275) | -0.97 → -2.64 | 위·바깥 60° 들림 → 아래·바깥 24° |
| armL | 0.18 → -0.46 | 0.18−wave×0.5(±0.0275) → −wave×0.25(±0.014) | 0.36 → -0.46 | 윗끝 바깥 23° 들림 → 아래·바깥 24° |

armR 캡슐은 어깨 위쪽으로 뻗는 형태라 A포즈에는 약 π 회전이 필요(-2.64 = 0.08 − (π − 0.42)). 캡슐 길이·위치, 꼬리·귀·bob 불변.
검증: `npx vitest run src/components/Weapons/Inucon.test.jsx` 4/4 통과. 시각 확인은 배포 후 Advisor 몫. Firebase에 armR/armL 회전 오프셋이 저장돼 있으면 그 값은 새 base 위에 더해진다.
기절 비주얼(추가 지시): 셀렉터 `useGameStore(s => s.inucon?.fainted === true)` (경로 `state.inucon.fainted`, 없으면 false). fainted면 몸통 재질 흰 toon(opacity 0.45, transparent, depthWrite false), 외곽선 opacity 0.97→0.22(연청회색). 재질 두 세트는 useMemo로 한 번만 생성해 참조만 토글.
천사 고리: Torus r0.22/tube0.03, 수평, y=1.82(머리 위 ≈0.25u) ±0.03 흔들림, #fff6c4 opacity 0.8. root의 마지막 자식이라 Studio 파츠 경로가 밀리지 않음.
fainted 중 걷기 bob(모델·무기 그룹)·꼬리 wag·손 흔들기 정지, 전체 둥실 진폭 0.06. 테스트 `Inucon.test.jsx` 5/5 (getInuconVisualState/selectInuconFainted/halo 조건부 렌더 단언).

## 2026-11-02 후속 (Advisor 직접, Terry "명확하게 A 포즈만들어" / "왜 이전팔이 달려있어")
10-31 패스는 armR/armL 그룹만 회전시키고 원래 왼팔(길이 0.92 캡슐, x -0.33)을 그대로 뒀다 → 옛 팔 + 새 팔이 같이 보임. 조치: 옛 왼팔 캡슐 삭제, 양팔을 어깨 피벗(x ±0.2, y 1.02)에서 아래로 매달린 동일 캡슐(r 0.065, len 0.4, 총 0.53u)로 통일, 그룹 z 회전 ±0.5rad(수직 대비 29° 바깥). 팔 끝 (±0.454, 0.555). useFrame 흔들림(±0.03)·기절 비주얼·Studio 합성 경로 불변. Firebase 정본(rev 1952)에 weapon-inucon 튜닝 없음 → 자식 인덱스 이동 영향 없음. `Inucon.test.jsx` 6/6.

## 2026-11-15 후속 (threemini, Terry "A포즈 했는데 옛 팔이 남은 것 같다" + 가드 이펙트)
점검 결과 게임 모델의 팔 그룹은 이미 2개(armR·armL)였다. "세 번째 팔"의 정체는 꼬리: 피벗이 어깨 높이(y 0.96)·몸 정면 평면(z -0.04)에 있고 옆으로 뻗은 채 z축으로 위아래 흔들려 정면·게임 카메라에서 팔처럼 보였다. 조치: 꼬리 피벗을 엉덩이 뒤(-0.02, 0.02, -0.16)로 옮기고 뒤·위 45°로 뻗게, 흔들기는 y축(좌우)으로. 자식 순서(10번)·캡슐 치수·외곽선 헐(CapsulePart 내장) 그대로. 브라우저 측정: 꼬리-왼팔 최소 간격 0.19u(관통 없음), 꼬리는 몸 박스 밖.
개발용 `__inucon_preview.html`/`src/inuconPreview.jsx`는 A포즈 이전 모델 사본(긴 왼팔·들린 오른팔·작은 왼팔·옆 꼬리 = 팔 모양 4개)을 따로 그리고 있었다 → 사본 삭제, 게임 `InuconModel`만 렌더(HTML에 React Refresh 프리앰블 추가).
가드 이펙트: store `damagePlayer`의 흡수 분기에서 기존 `inuconBark` emit 직후 `triggerInuconGuard()`(`src/lib/inuconGuard.js` pub/sub). `Inucon.jsx`의 `InuconGuardEffect`가 주인공 발밑 링(검은 테두리를 캔버스에 같이 그린 평면 1장, 380ms) + 이누콘 머리 위 "멍!멍!" 글자(데미지 숫자와 같은 글자 스타일, 650ms) 2메시. MeshBasic·toneMapped false·파티클/글로우 없음, 평소 visible=false(드로콜 0, 가드 순간 +2). 짖음 쿨다운은 soundmini 소관(sfxRegistry 480ms) 그대로.
증거 스크린샷: `F:\ezs-work\backup\inucon_check\`. 테스트: `Inucon.test.jsx`, `inuconGuard.test.js`, `useGameStore.test.js`(가드 순서) 포함 inucon 관련 15파일 283건 통과.

## 2026-11-15 후속 2 (threemini, 점검 잔여 6건)
1) 얼굴 평면 z 0.525 → 0.24(머리 앞면 0.23 바로 앞, `INUCON_FACE_Z`). 2) 외곽선: 인버티드 헐 그대로, 헐 배율을 축마다 따로(`computeEvenOutlineScale`, 겉면 두께 = 0.02 × 전역 곱수 2 = 0.04 모델 단위, 그룹 scale 반영) → 몸통 위아래 두꺼운 판·가는 팔다리 외곽선 차이 해소. 파츠별 `outlineScale` prop 제거. 3) 목도리: x -0.02(몸통 중심), 폭 0.46·깊이 0.48 대칭 띠(자식 5번 유지). 4) 유령: 2단 밝은 그라데이션 + toneMapped false, transparent=false(불투명 큐 앞→뒤) + CustomBlending 0.72 + depthWrite, 머리·몸통(0·4번) renderOrder 1 선행 → 흰 한 덩어리, 안쪽 파츠 비침 없음. 유령 외곽선 색은 StudioTunedGroup이 기본 외곽선 색(#050209)으로 덮어써 검정으로 보인다(기존 동작). 5) 게임 높이 0.15 → 0.225(`INUCON_GROUND_Y`, 두 bob이 동시에 최저일 때도 발 ≥ 바닥). 가드 글자 높이 1.08 → 1.15. 6) 스튜디오 미리보기 배율 0.265 → `INUCON_COMPANION_SCALE`(0.36).
증거: `F:\ezs-work\backup\inucon_check\60_BEFORE2_*`, `61_AFTER2_*`(390×844). 테스트 `Inucon.test.jsx` 16/16, inucon 관련 + StudioAnimationContract 321건 중 실패 2건은 KaykitProps·Onigiri(기존, 무관).
