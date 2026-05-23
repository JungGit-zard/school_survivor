import { PROP_LAYOUT, PROP_KINDS, isCollidable } from '../lib/stagePropsLayout.js'
import {
  FallenDesk,
  ChairPile,
  ContaminatedLocker,
  SafetyCone,
  BarricadeSmall,
  WarningTape,
} from './Props/index.js'
import {
  ExamPaper,
  PollutionPuddleStatic,
  WindowShadowBroken,
} from './Atmosphere/index.js'

// kind → 컴포넌트 매핑. 새 kind 추가 시 stagePropsLayout.js의 PROP_KINDS와 함께 갱신.
const KIND_TO_COMPONENT = {
  fallen_desk:             FallenDesk,
  chair_pile:              ChairPile,
  contaminated_locker:     ContaminatedLocker,
  safety_cone:             SafetyCone,
  barricade_small:         BarricadeSmall,
  warning_tape:            WarningTape,
  exam_paper:              ExamPaper,
  pollution_puddle_static: PollutionPuddleStatic,
  window_shadow_broken:    WindowShadowBroken,
}

// Dev-only 가드: PROP_KINDS와 KIND_TO_COMPONENT가 drift하면 module-load 시 1회 경고.
// 운영에는 영향 없음 (NODE_ENV==='production'에서는 logger 호출 자체가 dead branch).
if (typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production') {
  for (const id of Object.keys(PROP_KINDS)) {
    if (!KIND_TO_COMPONENT[id]) {
      // eslint-disable-next-line no-console
      console.warn(`[StageProps] kind '${id}' in PROP_KINDS but missing from KIND_TO_COMPONENT — entries with this kind will silently fail to render`)
    }
  }
}

// PROP_LAYOUT 정적 배열을 읽어 kind별 컴포넌트를 1회 렌더. 무대 그래픽은 5분 세션 동안 정적이다.
export default function StageProps() {
  return (
    <group>
      {PROP_LAYOUT.map((entry, i) => {
        const Component = KIND_TO_COMPONENT[entry.kind]
        if (!Component) return null
        return (
          <Component
            key={i}
            pos={entry.pos}
            rot={entry.rot ?? 0}
            scale={entry.scale ?? 1}
            collides={isCollidable(entry)}
          />
        )
      })}
    </group>
  )
}
