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
