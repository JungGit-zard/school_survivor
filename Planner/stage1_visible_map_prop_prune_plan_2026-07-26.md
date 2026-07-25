# Stage 1 visible map and prop prune plan

- 전투 경계는 `mapHalfX=10`, `mapHalfZ=14.4`(20 × 28.8 units = 5 × 7.2 블록) 정본을 유지한다.
- 시각 바닥만 같은 정확한 치수로 제한하고, 기존 약 6.9 units/타일 밀도를 X/Z별 반복값으로 유지한다.
- 프랍 루트 중심 가시 envelope는 경계 + 3 units(0.75블록): `|x| ≤ 13`, `|z| ≤ 17.4`이다.
- authored 60개 중 이 범위 밖 29개를 삭제해 책상 9, 의자 6, 학생 16의 31개를 남긴다. 중앙 플레이존 규칙과 학생 방향/variant 혼합은 유지한다.
- Firebase 원격 데이터는 읽거나 쓰지 않는다. 과거 Stage 1 override 중 envelope 밖 항목은 런타임 소비에서만 제외한다.
