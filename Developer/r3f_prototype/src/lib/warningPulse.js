// 경고 그래픽 맥동 속도 정본 (2026-11-14 Terry: "커졌다,작아지는 속도를 절반으로 줄여").
//
// 바닥 경고와 경고 표식의 "주기적" 맥동·깜빡임은 전부 이전 속도의 절반이다. 값은 이전 값 × 0.5로
// 적어 두어, 어느 쪽이 원래 속도였는지 코드에서 바로 읽히게 한다.
// windup/텔레그래프 진행도에 1:1로 묶인 일회성 변화(채움이 점점 진해지거나 자라는 것)는 맥동이 아니다 —
// 그걸 늦추면 실제 타격 시각과 어긋나므로 여기 넣지 않는다.
export const WARNING_PULSE_SPEED_SCALE = 0.5

// E05/B01/마틸다 돌진 "GO!" 말풍선 크기 맥동: sin(t × 12 rad/s) → sin(t × 6 rad/s).
export const CHARGE_CUE_PULSE_RAD_PER_SEC = 12 * WARNING_PULSE_SPEED_SCALE

// 투사체 좀비 착탄 예정 원(DECAL) 크기 맥동: sin(ageMs × 0.025) → sin(ageMs × 0.0125).
export const PROJECTILE_DECAL_PULSE_RAD_PER_MS = 0.025 * WARNING_PULSE_SPEED_SCALE

// E05/B01 돌진 예고 화살표 깜빡임: 수명 동안 sin(t × π × 6) → sin(t × π × 3).
export const CHARGE_WARNING_LINE_BLINK_HALF_TURNS = 6 * WARNING_PULSE_SPEED_SCALE
