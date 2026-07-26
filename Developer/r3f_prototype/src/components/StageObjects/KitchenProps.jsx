// stage4 급식실(주방) 프랍 9종.
// 원화: Graphic_designer/graphic_asset/background_floor/4stage/stage4_prop.png
// ("ZOMBIE SCHOOL KITCHEN - ROBLOX STYLE ASSET SHEET")
//
// 2026-07-26 사용자 지시: 이전 모델링 폐기 후 원화 기준 전면 재작성.
// 좌표는 이전 파일을 전혀 참고하지 않고, stageObjectColliders.js의 콜라이더 봉투
// (주 몸통 x·z 외곽 치수)와 원화 FRONT/SIDE 비례만으로 새로 도출했다.
//
// 스테인리스 표현은 톤을 4단계로 분리한다 — top(거의 흰색) / panel(밝은 회색) /
// frame(중간 회색) / dark(짙은 차콜, 발/그릴/음영). 단일 회색만 쓰면 툰 셰이딩에서
// 상판·측면·다리 경계가 뭉개져 형태가 안 읽힌다.
//
// 아웃라인은 프랍당 2~5개로 제한한다 — stage4에는 이 프랍들이 30개 이상 배치되므로
// 노브·자석·병뚜껑까지 전부 외곽선을 두면 드로우콜이 과도해진다. 실루엣을 만드는
// 주 몸통 박스(상판·바디·후드 등)에만 적용한다.
import {
  getPropOutlineScale,
  getStagePropOutlineMaterial,
  getStagePropToonMaterial,
  STAGE_PROP_MESH_RENDERING,
  STAGE_PROP_SHARED_RESOURCE_MESH_RENDERING,
  STAGE_PROP_UNIT_BOX_GEOMETRY,
} from './propRendering.js'
import StudioTunedGroup from '../StudioTunedGroup.jsx'

export const KITCHEN_PREP_TABLE_VARIANTS = Object.freeze(['bare', 'pans', 'cutting', 'side'])
export const KITCHEN_TRASH_BIN_VARIANTS = Object.freeze(['wheelie', 'round'])
export const KITCHEN_CLUTTER_VARIANTS = Object.freeze(['pots', 'bags', 'trays'])

function pickVariant(variant, validVariants, fallback) {
  return validVariants.includes(variant) ? variant : fallback
}

// 4톤 스테인리스 팔레트. 컴포넌트 호출마다 getStagePropToonMaterial(캐시됨)을 다시
// 불러오는 함수 형태로 둬서, 모듈 최상단 상수로 한 번만 만들지 않는다 — HMR 때
// toon.js의 캐시가 비워져도(재조립) 다음 렌더에서 항상 최신 캐시를 다시 받아온다.
function stainlessPalette() {
  return {
    top: getStagePropToonMaterial(0xf2f5f7, 0.05),
    panel: getStagePropToonMaterial(0xd7dde1, 0.04),
    frame: getStagePropToonMaterial(0xa9afb3, 0.04),
    dark: getStagePropToonMaterial(0x34383b, 0.02),
  }
}

function stageOutline() {
  return getStagePropOutlineMaterial(0.96, 0x050209)
}

// 공유 유닛 박스(STAGE_PROP_UNIT_BOX_GEOMETRY)를 scale로 늘려 쓰는 기본 박스 헬퍼.
// outline을 넘기면 getPropOutlineScale로 부풀린 두 번째 메쉬를 함께 그린다.
function PropBox({ position = [0, 0, 0], rotation = [0, 0, 0], scale = [1, 1, 1], material, outline: outlineMaterial }) {
  return (
    <group position={position} rotation={rotation}>
      <mesh
        {...STAGE_PROP_SHARED_RESOURCE_MESH_RENDERING}
        geometry={STAGE_PROP_UNIT_BOX_GEOMETRY}
        material={material}
        scale={scale}
      />
      {outlineMaterial && (
        <mesh
          {...STAGE_PROP_SHARED_RESOURCE_MESH_RENDERING}
          geometry={STAGE_PROP_UNIT_BOX_GEOMETRY}
          material={outlineMaterial}
          scale={getPropOutlineScale(scale)}
        />
      )}
    </group>
  )
}

// 육각형 단면(radialSegments=6) 실린더 헬퍼 — 양동이·수전·캐스터·병 몸체에 공용.
function PropCylinder({ position = [0, 0, 0], rotation = [0, 0, 0], args, material }) {
  return (
    <mesh {...STAGE_PROP_MESH_RENDERING} position={position} rotation={rotation} material={material}>
      <cylinderGeometry args={args} />
    </mesh>
  )
}

// 외곽선이 필요한 육각 실린더(원형 쓰레기통 본체 전용) — PropCylinder에 outline을 더한 변형.
function OutlinedCylinder({ position = [0, 0, 0], rotation = [0, 0, 0], args, material, outline: outlineMaterial }) {
  const s = getPropOutlineScale(1)
  return (
    <group position={position} rotation={rotation}>
      <mesh {...STAGE_PROP_MESH_RENDERING} material={material}>
        <cylinderGeometry args={args} />
      </mesh>
      {outlineMaterial && (
        <mesh {...STAGE_PROP_MESH_RENDERING} material={outlineMaterial} scale={[s, s, s]}>
          <cylinderGeometry args={args} />
        </mesh>
      )}
    </group>
  )
}

// detail-0 정20면체(저분할) 헬퍼 — 냄비·볼·봉지 같은 각진 블롭 형태에 공용.
function PropBlob({ position = [0, 0, 0], radius = 0.16, squashY = 1, material }) {
  return (
    <mesh {...STAGE_PROP_MESH_RENDERING} position={position} material={material} scale={[radius, radius * squashY, radius]}>
      <icosahedronGeometry args={[1, 0]} />
    </mesh>
  )
}

// 캐스터(바퀴) — 트레이랙/선반카트/휠리형 쓰레기통에서 재사용.
function Caster({ position = [0, 0, 0], material }) {
  return <PropCylinder position={position} rotation={[Math.PI / 2, 0, 0]} args={[0.055, 0.055, 0.045, 6]} material={material} />
}

// 유리병/양동이 몸체 — 프렙테이블 언더셸프·선반카트·바닥 클러터에서 재사용.
function Vessel({ position = [0, 0, 0], args = [0.14, 0.11, 0.22, 6], material, capMaterial }) {
  return (
    <group position={position}>
      <PropCylinder args={args} material={material} />
      {capMaterial && (
        <PropCylinder position={[0, args[2] * 0.5 + 0.014, 0]} args={[args[0] * 0.92, args[0] * 0.92, 0.028, 6]} material={capMaterial} />
      )}
    </group>
  )
}

// GN팬(식판) — 조리대 상판/트레이랙 슬라이드/바닥 클러터 전역에서 반복되는 형태.
function GnPan({ position = [0, 0, 0], rotation = [0, 0, 0], size = [0.5, 0.06, 0.32], trayMaterial, fillMaterial, chunkMaterial }) {
  const [w, h, d] = size
  return (
    <group position={position} rotation={rotation}>
      <PropBox scale={[w, h, d]} material={trayMaterial} />
      {fillMaterial && (
        <PropBox position={[0, h * 0.4, 0]} scale={[w * 0.86, h * 0.5, d * 0.8]} material={fillMaterial} />
      )}
      {chunkMaterial && (
        <>
          <PropBlob position={[-w * 0.18, h * 0.68, d * 0.12]} radius={h * 0.9} material={chunkMaterial} />
          <PropBlob position={[w * 0.16, h * 0.68, -d * 0.14]} radius={h * 0.8} material={chunkMaterial} />
        </>
      )}
    </group>
  )
}

// 자석/메모/버튼 같은 단발성 표면 디테일 전용 박스 — 유일하게 리터럴 boxGeometry를
// 직접 쓴다(공유 유닛박스를 쓸 만큼 반복되지 않는 1~3회성 소품이라 굳이 캐시를 태우지 않음).
function MagnetTag({ position = [0, 0, 0], rotation = [0, 0, 0], scale = [0.05, 0.05, 0.01], material }) {
  return (
    <mesh {...STAGE_PROP_MESH_RENDERING} position={position} rotation={rotation} scale={scale} material={material}>
      <boxGeometry args={[1, 1, 1]} />
    </mesh>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// KitchenPrepTable — 원화 "PREP TABLES" 행 + "SIDE COUNTER/EQUIPMENT" 행.
// 콜라이더: position [0,0.47,0] size 2.16 x 0.94 x 1.02. 상판(2.16x1.02)이 가장
// 넓은 부재라 이 슬랩의 x/z가 곧 콜라이더 외곽과 정확히 일치한다. 4변형 모두 같은
// 뼈대(상판+다리+발+하부 그릴)를 공유하고, 상판 위/하부 내용물만 바뀐다.
// ─────────────────────────────────────────────────────────────────────────
export function KitchenPrepTable({ variant = 'bare', ...props }) {
  const v = pickVariant(variant, KITCHEN_PREP_TABLE_VARIANTS, 'bare')
  const stainless = stainlessPalette()
  const outlineMat = stageOutline()
  const lime = getStagePropToonMaterial(0x8fd13f, 0.1)
  const orange = getStagePropToonMaterial(0xe8862c, 0.1)
  const yellow = getStagePropToonMaterial(0xe0b93a, 0.1)
  const blue = getStagePropToonMaterial(0x3f7fc1, 0.1)
  const wood = getStagePropToonMaterial(0xc9a06a, 0.06)
  const blade = getStagePropToonMaterial(0xcfd4d6, 0.04)
  const handle = getStagePropToonMaterial(0x232527, 0.0)
  const darkWindow = getStagePropToonMaterial(0x23262a, 0.02)
  const red = getStagePropToonMaterial(0xc0392b, 0.12)
  const white = getStagePropToonMaterial(0xf4f1e8, 0.06)
  const green = getStagePropToonMaterial(0x4f9d4a, 0.1)

  const legPositions = [
    [-0.98, 0.47, -0.41],
    [0.98, 0.47, -0.41],
    [-0.98, 0.47, 0.41],
    [0.98, 0.47, 0.41],
  ]
  const shelfTopY = 0.425

  return (
    <group {...props} name="kitchen-prep-table">
      <StudioTunedGroup itemId="stage-object-kitchen-prep-table">
        {/* 상판: 콜라이더 외곽(2.16x1.02)과 정확히 일치하는 가장 넓은 부재. 2분할 이음선. */}
        <PropBox position={[0, 0.90, 0]} scale={[2.16, 0.08, 1.02]} material={stainless.top} outline={outlineMat} />
        <PropBox position={[-0.36, 0.945, 0]} scale={[0.02, 0.01, 1.0]} material={stainless.dark} />
        <PropBox position={[0.36, 0.945, 0]} scale={[0.02, 0.01, 1.0]} material={stainless.dark} />

        {legPositions.map((pos, i) => (
          <group key={i}>
            <PropBox position={pos} scale={[0.08, 0.86, 0.08]} material={stainless.frame} />
            <PropBox position={[pos[0], 0.025, pos[2]]} scale={[0.11, 0.05, 0.11]} material={stainless.dark} />
          </group>
        ))}

        {v !== 'side' && (
          <PropBox position={[0, 0.40, 0]} scale={[1.9, 0.05, 0.86]} material={stainless.panel} outline={outlineMat} />
        )}

        {v !== 'side' && (
          <>
            {/* 하부 통풍 그릴(정면) */}
            <PropBox position={[0, 0.12, 0.49]} scale={[0.9, 0.16, 0.02]} material={stainless.dark} />
            <PropBox position={[0, 0.145, 0.495]} scale={[0.82, 0.01, 0.01]} material={stainless.frame} />
            <PropBox position={[0, 0.095, 0.495]} scale={[0.82, 0.01, 0.01]} material={stainless.frame} />
          </>
        )}

        {v === 'bare' && (
          <>
            <Vessel position={[-0.55, shelfTopY + 0.10, 0]} args={[0.13, 0.10, 0.20, 6]} material={yellow} />
            <Vessel position={[-0.15, shelfTopY + 0.10, 0]} args={[0.13, 0.10, 0.20, 6]} material={blue} />
            <group position={[0.55, shelfTopY + 0.11, 0]}>
              <PropBox scale={[0.34, 0.22, 0.30]} material={lime} />
              <PropBox position={[0, 0.02, 0.151]} scale={[0.30, 0.16, 0.01]} material={stainless.dark} />
            </group>
          </>
        )}

        {v === 'pans' && (
          <>
            <GnPan position={[-0.5, 0.975, 0]} size={[0.62, 0.07, 0.34]} trayMaterial={stainless.panel} fillMaterial={red} chunkMaterial={green} />
            <GnPan position={[0.3, 0.975, 0]} size={[0.62, 0.07, 0.34]} trayMaterial={stainless.panel} fillMaterial={orange} chunkMaterial={yellow} />
            <group position={[-0.55, shelfTopY + 0.11, 0]}>
              <PropBox scale={[0.34, 0.22, 0.30]} material={lime} />
              <PropBox position={[0, 0.02, 0.151]} scale={[0.30, 0.16, 0.01]} material={stainless.dark} />
            </group>
            <PropBox position={[0.1, shelfTopY + 0.11, 0]} scale={[0.36, 0.22, 0.30]} material={orange} />
          </>
        )}

        {v === 'cutting' && (
          <>
            <group position={[0, 0.96, 0.12]}>
              <PropBox scale={[0.48, 0.04, 0.32]} material={wood} />
              <group position={[0.30, 0.025, 0]} rotation={[0, 0, 0.06]}>
                <PropBox scale={[0.30, 0.012, 0.05]} material={blade} />
                <PropBox position={[0.19, -0.005, 0]} scale={[0.12, 0.03, 0.055]} material={handle} />
              </group>
            </group>
            <PropBox position={[-0.5, shelfTopY + 0.11, 0]} scale={[0.34, 0.22, 0.30]} material={lime} />
            <PropBox position={[0.55, shelfTopY + 0.11, 0]} scale={[0.34, 0.22, 0.30]} material={orange} />
          </>
        )}

        {v === 'side' && (
          <>
            {/* 여닫이 캐비닛 도어 2짝(오픈 셀프 대체) */}
            <PropBox position={[-0.47, 0.40, 0.435]} scale={[0.9, 0.78, 0.05]} material={stainless.panel} outline={outlineMat} />
            <PropBox position={[0.47, 0.40, 0.435]} scale={[0.9, 0.78, 0.05]} material={stainless.panel} />
            <PropBox position={[-0.10, 0.40, 0.465]} scale={[0.04, 0.22, 0.04]} material={stainless.dark} />
            <PropBox position={[0.10, 0.40, 0.465]} scale={[0.04, 0.22, 0.04]} material={stainless.dark} />

            {/* 전자레인지 */}
            <group position={[-0.55, 1.09, 0]}>
              <PropBox scale={[0.52, 0.30, 0.38]} material={stainless.panel} />
              <PropBox position={[-0.08, 0, 0.191]} scale={[0.30, 0.20, 0.01]} material={darkWindow} />
              {[-0.09, 0, 0.09].map((oy, i) => (
                <MagnetTag key={i} position={[0.20, oy, 0.191]} scale={[0.05, 0.04, 0.01]} material={stainless.dark} />
              ))}
            </group>

            <PropBox position={[0.05, 0.96, 0.1]} scale={[0.36, 0.03, 0.24]} material={wood} />
            <Vessel position={[0.45, 1.02, -0.1]} args={[0.045, 0.045, 0.16, 6]} material={orange} capMaterial={stainless.dark} />
            <PropBlob position={[0.85, 1.017, 0.28]} radius={0.11} squashY={0.7} material={white} />
            <PropBlob position={[0.85, 1.148, 0.28]} radius={0.09} squashY={0.6} material={red} />
          </>
        )}
      </StudioTunedGroup>
    </group>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// KitchenCookLine — 원화 "COOK LINE / STOVE & OVEN BLOCK" 행. 원화의 주역이라
// 후드(캐노피+덕트)가 콜라이더 높이(0.92) 위로 크게 솟는다(허용된 예외). 오븐도어
// 3짝 + 빨간 노브 줄 + 6구 버너 그레이트 + 화구 위 냄비 하나.
// 콜라이더: position [0,0.46,0] size 2.66 x 0.92 x 1.12.
// ─────────────────────────────────────────────────────────────────────────
export function KitchenCookLine({ ...props }) {
  const stainless = stainlessPalette()
  const outlineMat = stageOutline()
  const red = getStagePropToonMaterial(0xc0392b, 0.14)
  const darkWindow = getStagePropToonMaterial(0x23262a, 0.02)
  const green = getStagePropToonMaterial(0x4f9d4a, 0.1)

  const doorXs = [-0.85, 0, 0.85]
  const knobXs = [-1.0, -0.7, -0.15, 0.15, 0.7, 1.0]

  return (
    <group {...props} name="kitchen-cook-line">
      <StudioTunedGroup itemId="stage-object-kitchen-cook-line">
        {/* 하부 오븐 캐비닛(0~0.82) + 상부 카운터 캡(0.82~0.92) — 둘 다 콜라이더 x/z와 일치. */}
        <PropBox position={[0, 0.41, 0]} scale={[2.66, 0.82, 1.12]} material={stainless.panel} outline={outlineMat} />
        <PropBox position={[0, 0.87, 0]} scale={[2.66, 0.10, 1.12]} material={stainless.top} outline={outlineMat} />

        {/* 6구 버너 그레이트 */}
        <PropBox position={[0, 0.935, 0]} scale={[2.3, 0.03, 0.85]} material={stainless.dark} />
        {[-0.24, 0, 0.24].map((oz) => (
          <PropBox key={oz} position={[0, 0.94, oz]} scale={[2.2, 0.008, 0.02]} material={stainless.frame} />
        ))}

        {/* 오븐 도어 3짝(창+손잡이) */}
        {doorXs.map((x) => (
          <group key={x} position={[x, 0.32, 0.53]}>
            <PropBox scale={[0.75, 0.55, 0.03]} material={stainless.panel} />
            <PropBox position={[0, 0.02, 0.001]} scale={[0.42, 0.28, 0.01]} material={darkWindow} />
            <PropBox position={[0, -0.22, 0.01]} scale={[0.28, 0.03, 0.03]} material={stainless.dark} />
          </group>
        ))}

        {/* 컨트롤 패널 + 빨간 노브 줄 */}
        <PropBox position={[0, 0.70, 0.53]} scale={[2.3, 0.14, 0.02]} material={stainless.dark} />
        {knobXs.map((x) => (
          <PropCylinder key={x} position={[x, 0.70, 0.54]} rotation={[Math.PI / 2, 0, 0]} args={[0.032, 0.032, 0.014, 6]} material={red} />
        ))}

        {/* 후드: 덕트 라이저 + 캐노피 + 정면 벤트 그릴(SIDE 뷰의 L자 프로파일). 전부 x/z 봉투 안. */}
        <PropBox position={[0, 1.345, -0.15]} scale={[0.5, 0.85, 0.42]} material={stainless.panel} />
        <PropBox position={[0, 1.92, -0.08]} scale={[2.5, 0.30, 0.85]} material={stainless.top} outline={outlineMat} />
        <PropBox position={[0, 1.80, 0.34]} scale={[2.2, 0.14, 0.05]} material={stainless.dark} />
        <PropBox position={[0, 1.845, 0.35]} scale={[2.1, 0.012, 0.01]} material={stainless.frame} />
        <PropBox position={[0, 1.755, 0.35]} scale={[2.1, 0.012, 0.01]} material={stainless.frame} />

        {/* 화구 위 냄비 */}
        <group position={[0.2, 1.03, -0.05]}>
          <PropCylinder args={[0.22, 0.20, 0.20, 6]} material={green} />
          <PropCylinder position={[0, 0.11, 0]} args={[0.18, 0.18, 0.02, 6]} material={green} />
          <PropBox position={[-0.24, 0.02, 0]} scale={[0.10, 0.03, 0.03]} material={stainless.dark} />
          <PropBox position={[0.24, 0.02, 0]} scale={[0.10, 0.03, 0.03]} material={stainless.dark} />
        </group>
      </StudioTunedGroup>
    </group>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// KitchenSinkCounter — 원화 "SINK COUNTER" 행. 2조 싱크볼(색 차이로 recessed
// 표현) + 높은 구스넥 수전 + 백스플래시 + 언더셸프 소품. 콜라이더보다 얇은
// 뼈대(다리+셸프)는 프렙테이블과 동일 패턴을 공유한다.
// 콜라이더: position [0,0.44,0] size 2.26 x 0.88 x 0.94.
// ─────────────────────────────────────────────────────────────────────────
export function KitchenSinkCounter({ ...props }) {
  const stainless = stainlessPalette()
  const outlineMat = stageOutline()
  const orange = getStagePropToonMaterial(0xe8862c, 0.1)
  const green = getStagePropToonMaterial(0x8fd13f, 0.1)
  const wood = getStagePropToonMaterial(0xc9a06a, 0.06)

  const legPositions = [
    [-1.03, 0.36, -0.37],
    [1.03, 0.36, -0.37],
    [-1.03, 0.36, 0.37],
    [1.03, 0.36, 0.37],
  ]

  return (
    <group {...props} name="kitchen-sink-counter">
      <StudioTunedGroup itemId="stage-object-kitchen-sink-counter">
        {/* 상판: 콜라이더 외곽(2.26x0.94)과 일치하는 최대 부재 */}
        <PropBox position={[0, 0.84, 0]} scale={[2.26, 0.08, 0.94]} material={stainless.top} outline={outlineMat} />

        {/* 2조 싱크볼(림+어두운 내부면으로 recessed 표현) */}
        {[-0.5, 0.5].map((x) => (
          <group key={x} position={[x, 0.845, 0]}>
            <PropBox scale={[0.62, 0.02, 0.62]} material={stainless.top} />
            <PropBox position={[0, -0.015, 0]} scale={[0.52, 0.05, 0.52]} material={stainless.dark} />
          </group>
        ))}

        {legPositions.map((pos, i) => (
          <group key={i}>
            <PropBox position={pos} scale={[0.08, 0.72, 0.08]} material={stainless.frame} />
            <PropBox position={[pos[0], 0.025, pos[2]]} scale={[0.11, 0.05, 0.11]} material={stainless.dark} />
          </group>
        ))}
        <PropBox position={[0, 0.70, 0]} scale={[1.98, 0.05, 0.78]} material={stainless.panel} outline={outlineMat} />

        {/* 백스플래시(허용된 높이 초과 — 후드/수전과 같은 예외) */}
        <PropBox position={[0, 1.04, -0.44]} scale={[2.26, 0.32, 0.05]} material={stainless.panel} outline={outlineMat} />

        {/* 구스넥 수전 */}
        <group position={[0, 0, -0.30]}>
          <PropCylinder position={[0, 1.03, 0]} args={[0.03, 0.03, 0.30, 6]} material={stainless.frame} />
          <PropCylinder position={[0, 1.16, 0.12]} rotation={[Math.PI / 2, 0, 0]} args={[0.025, 0.025, 0.24, 6]} material={stainless.frame} />
          <PropCylinder position={[0, 1.10, 0.24]} args={[0.02, 0.02, 0.08, 6]} material={stainless.dark} />
        </group>

        {/* 상판 소품: 세제병 2개 + 디스펜서 */}
        <Vessel position={[-0.9, 0.90, 0.28]} args={[0.045, 0.045, 0.16, 6]} material={orange} capMaterial={stainless.dark} />
        <Vessel position={[-0.78, 0.90, 0.28]} args={[0.045, 0.045, 0.16, 6]} material={green} capMaterial={stainless.dark} />
        <PropBox position={[0.95, 0.895, 0.30]} scale={[0.14, 0.10, 0.10]} material={stainless.panel} />

        {/* 언더셸프 소품: 냄비 + 유리병 + 목재 박스 */}
        <group position={[-0.55, 0.735, 0]}>
          <PropCylinder args={[0.16, 0.15, 0.18, 6]} material={stainless.frame} />
        </group>
        <Vessel position={[0, 0.73, 0]} args={[0.09, 0.09, 0.16, 6]} material={green} capMaterial={stainless.dark} />
        <PropBox position={[0.6, 0.745, 0]} scale={[0.32, 0.18, 0.26]} material={wood} />
      </StudioTunedGroup>
    </group>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// KitchenRefrigerator — 원화 "REFRIGERATOR" 행. 양문형, 문 경계선 + 긴 수직
// 손잡이 2개 + 상단 벤트 그릴 + 자석/메모. open=true면 오른쪽 문이 힌지를 축으로
// 바깥으로 돌아가며 내부 선반이 드러난다(문 스윙은 콜라이더에서 의도적으로 제외).
// 콜라이더: position [0,0.96,0] size 1.20 x 1.92 x 0.92. SIDE 뷰는 얇다(z=0.92).
// ─────────────────────────────────────────────────────────────────────────
export function KitchenRefrigerator({ open = false, ...props }) {
  const stainless = stainlessPalette()
  const outlineMat = stageOutline()
  const green = getStagePropToonMaterial(0x8fd13f, 0.15)
  const red = getStagePropToonMaterial(0xc0392b, 0.15)
  const white = getStagePropToonMaterial(0xf4f1e8, 0.06)

  return (
    <group {...props} name="kitchen-refrigerator">
      <StudioTunedGroup itemId="stage-object-kitchen-refrigerator">
        {/* 본체: 콜라이더 외곽(1.20x1.92x0.92)과 정확히 일치 */}
        <PropBox position={[0, 0.96, 0]} scale={[1.20, 1.92, 0.92]} material={stainless.panel} outline={outlineMat} />
        <PropBox position={[0, 1.83, 0.42]} scale={[1.0, 0.12, 0.05]} material={stainless.dark} outline={outlineMat} />

        {!open && (
          <>
            <PropBox position={[0, 0.96, 0.45]} scale={[0.02, 1.86, 0.02]} material={stainless.dark} />
            <PropBox position={[-0.10, 0.96, 0.435]} scale={[0.05, 0.85, 0.05]} material={stainless.dark} />
            <PropBox position={[0.10, 0.96, 0.435]} scale={[0.05, 0.85, 0.05]} material={stainless.dark} />
            <MagnetTag position={[-0.32, 1.35, 0.455]} scale={[0.09, 0.09, 0.01]} material={green} />
            <MagnetTag position={[0.30, 1.35, 0.455]} scale={[0.08, 0.08, 0.01]} material={red} />
            <MagnetTag position={[0.30, 1.15, 0.455]} rotation={[0, 0, 0.05]} scale={[0.12, 0.15, 0.008]} material={white} />
          </>
        )}

        {open && (
          <>
            <PropBox position={[0, 0.96, -0.42]} scale={[1.14, 1.86, 0.04]} material={stainless.dark} />
            <PropBox position={[0, 0.60, 0]} scale={[1.0, 0.03, 0.7]} material={stainless.panel} />
            <PropBox position={[0, 1.20, 0]} scale={[1.0, 0.03, 0.7]} material={stainless.panel} />
            <PropBox position={[0, 0.90, 0]} scale={[0.5, 0.18, 0.5]} material={red} />

            <PropBox position={[-0.30, 0.96, 0.435]} scale={[0.58, 1.86, 0.05]} material={stainless.panel} />
            <PropBox position={[-0.16, 0.96, 0.435]} scale={[0.05, 0.85, 0.05]} material={stainless.dark} />

            <group position={[0.60, 0.96, 0.46]} rotation={[0, -1.65, 0]}>
              <PropBox position={[0.29, 0, 0]} scale={[0.58, 1.86, 0.05]} material={stainless.panel} />
              <PropBox position={[0.14, 0, 0.02]} scale={[0.05, 0.85, 0.05]} material={stainless.dark} />
            </group>
          </>
        )}
      </StudioTunedGroup>
    </group>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// KitchenTrayRack — 원화 "ROLLING TRAY RACK" 행. 개방 프레임(코너 기둥 4 + 상/
// 하 레일) + 5단 슬라이딩 GN팬 + 캐스터 4. 상/하 레일이 콜라이더 x/z와 정확히
// 일치하는 최대 부재다.
// 콜라이더: position [0,0.84,0] size 0.72 x 1.68 x 0.78.
// ─────────────────────────────────────────────────────────────────────────
export function KitchenTrayRack({ ...props }) {
  const stainless = stainlessPalette()
  const outlineMat = stageOutline()
  const red = getStagePropToonMaterial(0xc0392b, 0.1)
  const green = getStagePropToonMaterial(0x4f9d4a, 0.1)
  const orange = getStagePropToonMaterial(0xe8862c, 0.1)
  const yellow = getStagePropToonMaterial(0xe0b93a, 0.1)

  const postXs = [-0.325, 0.325]
  const postZs = [-0.335, 0.335]
  const trayYs = [0.25, 0.55, 0.85, 1.15, 1.45]
  const trayFills = [red, green, orange, yellow, null]

  return (
    <group {...props} name="kitchen-tray-rack">
      <StudioTunedGroup itemId="stage-object-kitchen-tray-rack">
        <PropBox position={[0, 1.65, 0]} scale={[0.72, 0.06, 0.78]} material={stainless.frame} outline={outlineMat} />
        <PropBox position={[0, 0.09, 0]} scale={[0.72, 0.06, 0.78]} material={stainless.frame} outline={outlineMat} />

        {postXs.flatMap((x) => postZs.map((z) => (
          <PropBox key={`${x}:${z}`} position={[x, 0.87, z]} scale={[0.045, 1.5, 0.045]} material={stainless.frame} />
        )))}

        {[[-0.30, -0.30], [0.30, -0.30], [-0.30, 0.30], [0.30, 0.30]].map(([x, z]) => (
          <Caster key={`${x}:${z}`} position={[x, 0.045, z]} material={stainless.dark} />
        ))}

        {trayYs.map((y, i) => (
          <GnPan key={y} position={[0, y, 0]} size={[0.62, 0.035, 0.66]} trayMaterial={stainless.panel} fillMaterial={trayFills[i]} />
        ))}
      </StudioTunedGroup>
    </group>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// KitchenShelfCart — 원화 "SHELF CART" 행. 3단 선반(색 다른 뚜껑 유리병 + 골판지
// 박스) + 캐스터 4 + 밀대 손잡이 바. 세 선반 모두 콜라이더 x/z와 정확히 일치.
// 콜라이더: position [0,0.60,0] size 1.04 x 1.20 x 0.52.
// ─────────────────────────────────────────────────────────────────────────
export function KitchenShelfCart({ ...props }) {
  const stainless = stainlessPalette()
  const outlineMat = stageOutline()
  const red = getStagePropToonMaterial(0xc0392b, 0.1)
  const blue = getStagePropToonMaterial(0x3f7fc1, 0.1)
  const green = getStagePropToonMaterial(0x4f9d4a, 0.1)
  const cardboard = getStagePropToonMaterial(0xb98a55, 0.05)
  const wood = getStagePropToonMaterial(0xc9a06a, 0.06)

  const shelfYs = [0.10, 0.60, 1.10]
  const postXs = [-0.48, 0.48]
  const postZs = [-0.22, 0.22]

  return (
    <group {...props} name="kitchen-shelf-cart">
      <StudioTunedGroup itemId="stage-object-kitchen-shelf-cart">
        {shelfYs.map((y) => (
          <PropBox key={y} position={[0, y, 0]} scale={[1.04, 0.05, 0.52]} material={stainless.frame} outline={outlineMat} />
        ))}

        {postXs.flatMap((x) => postZs.map((z) => (
          <PropBox key={`${x}:${z}`} position={[x, 0.60, z]} scale={[0.045, 1.0, 0.045]} material={stainless.frame} />
        )))}

        {[[-0.46, -0.20], [0.46, -0.20], [-0.46, 0.20], [0.46, 0.20]].map(([x, z]) => (
          <Caster key={`${x}:${z}`} position={[x, 0.05, z]} material={stainless.dark} />
        ))}

        <PropBox position={[0, 1.16, -0.24]} scale={[1.0, 0.04, 0.04]} material={stainless.dark} />
        <PropBox position={[-0.46, 1.13, -0.24]} scale={[0.03, 0.08, 0.03]} material={stainless.dark} />
        <PropBox position={[0.46, 1.13, -0.24]} scale={[0.03, 0.08, 0.03]} material={stainless.dark} />

        {/* 상단 선반: 색 다른 뚜껑 유리병 3개 */}
        <Vessel position={[-0.3, 1.16, 0]} args={[0.08, 0.08, 0.14, 6]} material={stainless.top} capMaterial={red} />
        <Vessel position={[0, 1.16, 0]} args={[0.08, 0.08, 0.14, 6]} material={stainless.top} capMaterial={blue} />
        <Vessel position={[0.3, 1.16, 0]} args={[0.08, 0.08, 0.14, 6]} material={stainless.top} capMaterial={green} />

        {/* 중단/하단 선반: 골판지 박스 + 목재 크레이트 */}
        <PropBox position={[-0.2, 0.685, 0]} scale={[0.36, 0.18, 0.34]} material={cardboard} />
        <PropBox position={[0.28, 0.685, 0]} scale={[0.30, 0.18, 0.30]} material={cardboard} />
        <PropBox position={[-0.15, 0.185, 0]} scale={[0.40, 0.18, 0.36]} material={wood} />
        <PropBox position={[0.32, 0.185, 0]} scale={[0.30, 0.18, 0.30]} material={cardboard} />
      </StudioTunedGroup>
    </group>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// KitchenTrashBins — 원화 "TRASH BINS" 행. wheelie: 뚜껑이 본체보다 넓고 바퀴 2 +
// 정면 흰 아이콘. round: 육각 단면 돔형 뚜껑 + 상단 손잡이. 두 변형 모두 콜라이더
// 폭(0.68)과 정확히 일치하는 부재(휠리는 뚜껑, 라운드는 몸통 하단 반지름)를 둔다.
// 콜라이더: position [0,0.51,0] size 0.68 x 1.02 x 0.68.
// ─────────────────────────────────────────────────────────────────────────
export function KitchenTrashBins({ variant = 'wheelie', ...props }) {
  const v = pickVariant(variant, KITCHEN_TRASH_BIN_VARIANTS, 'wheelie')
  const stainless = stainlessPalette()
  const outlineMat = stageOutline()
  const green = getStagePropToonMaterial(0x5cad3f, 0.12)
  const white = getStagePropToonMaterial(0xf4f1e8, 0.08)

  return (
    <group {...props} name="kitchen-trash-bins">
      <StudioTunedGroup itemId="stage-object-kitchen-trash-bins">
        {v === 'wheelie' && (
          <>
            <PropBox position={[0, 0.41, 0]} scale={[0.60, 0.82, 0.60]} material={green} outline={outlineMat} />
            {/* 뚜껑: 콜라이더 외곽(0.68x0.68)과 정확히 일치하는 최대 부재 */}
            <PropBox position={[0, 0.92, 0]} scale={[0.68, 0.20, 0.68]} material={green} outline={outlineMat} />
            <PropBox position={[0, 1.03, -0.1]} scale={[0.10, 0.05, 0.14]} material={stainless.dark} />
            <Caster position={[-0.18, 0.06, -0.26]} material={stainless.dark} />
            <Caster position={[0.18, 0.06, -0.26]} material={stainless.dark} />
            <MagnetTag position={[0, 0.55, 0.301]} scale={[0.16, 0.20, 0.008]} material={white} />
          </>
        )}

        {v === 'round' && (
          <>
            <OutlinedCylinder position={[0, 0.39, 0]} args={[0.34, 0.32, 0.78, 6]} material={stainless.dark} outline={outlineMat} />
            <OutlinedCylinder position={[0, 0.88, 0]} args={[0.32, 0.06, 0.20, 6]} material={stainless.dark} outline={outlineMat} />
            <PropCylinder position={[0, 1.0, 0]} args={[0.03, 0.03, 0.05, 6]} material={stainless.frame} />
          </>
        )}
      </StudioTunedGroup>
    </group>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// KitchenCrateStack — 원화 "CRATES & BOXES" 행. 층마다 종류를 구분한다(라임 플라스틱
// 크레이트 / 목재 슬랫 크레이트 / 골판지 박스, 3종을 순환). count(1~6)로 층수를
// 조절하고, 모든 층이 콜라이더 x/z(0.72x0.60)와 정확히 일치하는 동일 폭을 쓴다.
// 콜라이더: position [0,0.49,0] size 0.72 x 0.98 x 0.60 (count=3 기준 높이).
// ─────────────────────────────────────────────────────────────────────────
export function KitchenCrateStack({ count = 3, ...props }) {
  const layers = Math.min(6, Math.max(1, Math.round(count)))
  const stainless = stainlessPalette()
  const outlineMat = stageOutline()
  const lime = getStagePropToonMaterial(0x8fd13f, 0.1)
  const wood = getStagePropToonMaterial(0xc9a06a, 0.06)
  const cardboard = getStagePropToonMaterial(0xb98a55, 0.05)
  const label = getStagePropToonMaterial(0xf4f1e8, 0.06)

  const layerHeight = 0.98 / 3
  const bodyHeight = layerHeight * 0.92

  return (
    <group {...props} name="kitchen-crate-stack">
      <StudioTunedGroup itemId="stage-object-kitchen-crate-stack">
        {Array.from({ length: layers }, (_, i) => i).map((i) => {
          const y = layerHeight * (i + 0.5)
          const kind = i % 3
          const outline = (i === 0 || i === layers - 1) ? outlineMat : undefined

          if (kind === 0) {
            return (
              <group key={i} position={[0, y, 0]}>
                <PropBox scale={[0.72, bodyHeight, 0.60]} material={lime} outline={outline} />
                <PropBox position={[0, 0, 0.295]} scale={[0.60, bodyHeight * 0.7, 0.008]} material={stainless.dark} />
                <PropBox position={[0, 0, -0.295]} scale={[0.60, bodyHeight * 0.7, 0.008]} material={stainless.dark} />
              </group>
            )
          }
          if (kind === 1) {
            return (
              <group key={i} position={[0, y, 0]}>
                <PropBox scale={[0.72, bodyHeight, 0.60]} material={wood} outline={outline} />
                <PropBox position={[0, bodyHeight * 0.22, 0.295]} scale={[0.66, 0.015, 0.008]} material={stainless.dark} />
                <PropBox position={[0, -bodyHeight * 0.22, 0.295]} scale={[0.66, 0.015, 0.008]} material={stainless.dark} />
              </group>
            )
          }
          return (
            <group key={i} position={[0, y, 0]}>
              <PropBox scale={[0.72, bodyHeight, 0.60]} material={cardboard} outline={outline} />
              <PropBox position={[0, 0, 0.295]} scale={[0.02, bodyHeight, 0.008]} material={label} />
              <PropBox position={[0.16, 0.02, 0.296]} scale={[0.20, bodyHeight * 0.4, 0.006]} material={label} />
            </group>
          )
        })}
      </StudioTunedGroup>
    </group>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// KitchenClutter — 원화 "POTS & BOWLS" / "FOOD TRAYS/GN PANS" / "SMALL PROPS"
// 행. 콜라이더 없음(바닥에 낮게 깔린 시야 통과 소품). 노브/뚜껑 급 디테일과 마찬
// 가지로 외곽선은 두지 않는다 — 프랍 자체가 이미 작다.
// ─────────────────────────────────────────────────────────────────────────
export function KitchenClutter({ variant = 'pots', ...props }) {
  const v = pickVariant(variant, KITCHEN_CLUTTER_VARIANTS, 'pots')
  const stainless = stainlessPalette()
  const green = getStagePropToonMaterial(0x4f9d4a, 0.1)
  const yellow = getStagePropToonMaterial(0xe0b93a, 0.1)
  const black = getStagePropToonMaterial(0x1c1e20, 0.0)
  const red = getStagePropToonMaterial(0xc0392b, 0.12)
  const orange = getStagePropToonMaterial(0xe8862c, 0.1)
  const blue = getStagePropToonMaterial(0x3f7fc1, 0.1)
  const white = getStagePropToonMaterial(0xf4f1e8, 0.06)
  const amber = getStagePropToonMaterial(0x8a5a24, 0.08)

  return (
    <group {...props} name="kitchen-clutter">
      <StudioTunedGroup itemId="stage-object-kitchen-clutter">
        {v === 'pots' && (
          <>
            <group position={[-0.3, 0.11, 0]}>
              <PropCylinder args={[0.20, 0.18, 0.22, 6]} material={stainless.frame} />
              <PropBox position={[0.22, 0.02, 0]} scale={[0.10, 0.03, 0.03]} material={stainless.dark} />
            </group>
            <PropBlob position={[0.15, 0.09, 0.05]} radius={0.14} squashY={0.7} material={yellow} />
            <PropBlob position={[0.35, 0.08, -0.15]} radius={0.12} squashY={0.65} material={stainless.frame} />
            <group position={[-0.05, 0.05, -0.28]} rotation={[0, 0.4, 0]}>
              <PropCylinder args={[0.13, 0.13, 0.03, 6]} material={black} />
              <PropBox position={[0.16, 0, 0]} scale={[0.16, 0.02, 0.02]} material={black} />
            </group>
          </>
        )}

        {v === 'bags' && (
          <>
            <PropBlob position={[-0.25, 0.16, 0]} radius={0.18} squashY={1.1} material={black} />
            <PropBlob position={[0.05, 0.13, 0.1]} radius={0.15} squashY={0.95} material={black} />
            <group position={[0.35, 0.08, -0.1]}>
              <PropCylinder args={[0.06, 0.06, 0.11, 6]} material={red} />
              <PropBox position={[0, 0.07, 0]} scale={[0.09, 0.02, 0.02]} material={white} />
            </group>
            <Vessel position={[0.5, 0.10, 0.15]} args={[0.045, 0.045, 0.18, 6]} material={orange} capMaterial={stainless.dark} />
            <Vessel position={[-0.5, 0.11, -0.2]} args={[0.05, 0.05, 0.20, 6]} material={red} capMaterial={red} />
          </>
        )}

        {v === 'trays' && (
          <>
            <GnPan position={[-0.4, 0.03, 0]} size={[0.5, 0.06, 0.32]} trayMaterial={stainless.panel} fillMaterial={green} />
            <GnPan position={[0.15, 0.03, 0.1]} size={[0.5, 0.06, 0.32]} trayMaterial={stainless.panel} fillMaterial={orange} />
            <GnPan position={[0.55, 0.03, -0.2]} size={[0.5, 0.06, 0.32]} trayMaterial={stainless.panel} />
            {[0, 1, 2].map((i) => (
              <PropBox key={i} position={[-0.75, 0.02 + i * 0.025, 0.25]} scale={[0.22, 0.02, 0.22]} material={white} />
            ))}
            <group position={[-0.7, 0.08, -0.15]}>
              <PropCylinder args={[0.06, 0.06, 0.09, 6]} material={blue} />
              <PropBox position={[0.07, 0, 0]} scale={[0.02, 0.05, 0.05]} material={blue} />
            </group>
            <PropBox position={[0.1, 0.06, -0.3]} scale={[0.16, 0.12, 0.10]} material={white} />
            <PropBox position={[0.1, 0.115, -0.3]} scale={[0.13, 0.03, 0.09]} material={amber} />
          </>
        )}
      </StudioTunedGroup>
    </group>
  )
}
