# 스테이지 1 수학선생 보스 필살기 구현

## 구현 범위

- `B01`의 돌진 종료 상태를 수학선생 전용 삼각자 휘두르기로 연결했다.
- 충격 프레임에 보스 반경 2.4 안의 살아 있는 좀비를 바깥쪽으로 밀어낸다.
- 삼각자 범위 안의 플레이어는 일반 무적 시간을 무시하고 현재 체력의 30%를 잃는다.
- 삼각자는 `ZombieMesh`의 기존 툰 셰이딩/외곽선 블록으로 구성했고 필살기 상태에서만 표시한다.

## 상태 흐름

`charge → mathSwingWindup(320ms) → mathSwingRecover(430ms) → stun`

삼각자 충격은 `mathSwingWindup` 종료 시 한 번만 실행된다. 다른 차저인 `E05`, `B02`, `B03`의 기존 `charge → stun` 흐름은 유지한다.

## 변경 파일

- `src/components/Enemy.jsx`
- `src/components/ZombieMesh.jsx`
- `src/lib/mathTeacherSpecial.js`
- `src/store/useGameStore.js`
- 대응 단위/회귀 테스트

## 검증 기준

- 현재 체력 100 → 70, 40 → 28
- 보스 자신·죽은 좀비·반경 밖 좀비는 밀치기 제외
- 일반 무적 중에도 필살기 피해 적용
- 전용 상태 종료 후 팔 회전과 삼각자 표시 정상 복귀
