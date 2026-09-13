export const PLAYER_MESH_SCALE = 0.2664

export const PLAYER_MESH_RAW_HEIGHT = 3.35
export const PLAYER_MESH_WORLD_HEIGHT = PLAYER_MESH_RAW_HEIGHT * PLAYER_MESH_SCALE

// PlayerMesh의 PlayerVisual 부모 좌표계에서, 양 팔 outline의 가장 바깥 X 끝이다.
// 물리 collider(.136)보다 넓어 카메라 가시성 계산에는 이 값을 사용한다.
export const PLAYER_MESH_WORLD_HALF_WIDTH = (0.68 + (0.24 * 1.07) / 2) * PLAYER_MESH_SCALE

export const UNCONSCIOUS_STUDENT_RAW_LENGTH = 2.43
export const UNCONSCIOUS_STUDENT_PLAYER_SCALE = Number(
  (PLAYER_MESH_WORLD_HEIGHT / UNCONSCIOUS_STUDENT_RAW_LENGTH).toFixed(4)
)
