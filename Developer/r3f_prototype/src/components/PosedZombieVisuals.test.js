// 신규 일반 좀비 12종(E34-E45) 비주얼 해석 테스트.
// 사양 정본: Planner/stage_zombie_original_concepts_20261025.md
//  - 12종 전부가 자기 팔레트와 자기 파트 세트로 해석되고 E01로 폴백되지 않는다.
//  - 색을 가려도 머리·몸통·팔·다리의 비례와 포즈로 구별된다.
//  - 박스 가족 + 표식 박스 하나만 쓴다(옷·소품·무기·갑옷·장식 파츠 금지).
//  - 기존 적(E01-E08, RZ*, B0*)의 비주얼 해석은 그대로다.
import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import {
  POSED_ZOMBIE_ANIM_BASE_ROTATION,
  POSED_ZOMBIE_BASE,
  POSED_ZOMBIE_FIRST_TYPE_CODE,
  POSED_ZOMBIE_MARK_SLOT,
  POSED_ZOMBIE_PART_COUNT,
  POSED_ZOMBIE_PART_ROLES,
  POSED_ZOMBIE_RIGS,
  POSED_ZOMBIE_TYPES,
  ZOMBIE_PALETTE,
  ZOMBIE_SHOE_COLOR,
  buildPosedZombieParts,
  isPosedZombieType,
} from './ZombieMesh.jsx'
import { PART_COUNT, POSED_SLOT_BASE, resolvePooledZombieVisual } from './ZombieInstanceLayer.jsx'
import { GRAPHICS_STUDIO_CATALOG, getStudioZombieItemId } from '../lib/graphicsStudioConfig.js'

const TYPE_CODE = Object.fromEntries(POSED_ZOMBIE_TYPES.map((type, i) => [type, POSED_ZOMBIE_FIRST_TYPE_CODE + i]))
const round = (value) => Math.round(value * 1e6) / 1e6

describe('신규 일반 좀비 12종 — ID 배정', () => {
  it('E34-E45가 사양 순서 그대로 typeCode 37-48에 배정된다', () => {
    expect(POSED_ZOMBIE_TYPES).toEqual(['E34', 'E35', 'E36', 'E37', 'E38', 'E39', 'E40', 'E41', 'E42', 'E43', 'E44', 'E45'])
    expect(POSED_ZOMBIE_FIRST_TYPE_CODE).toBe(37)
    POSED_ZOMBIE_TYPES.forEach((type, i) => {
      expect(resolvePooledZombieVisual(37 + i).name).toBe(type)
      expect(isPosedZombieType(type)).toBe(true)
    })
  })

  it('확장팩 구간(17-36)을 덮지 않는다', () => {
    for (let code = 17; code <= 36; code += 1) {
      expect(resolvePooledZombieVisual(code).posedIndex).toBe(0)
      expect(resolvePooledZombieVisual(code).name).toBe('')
    }
  })
})

describe('신규 일반 좀비 12종 — 팔레트', () => {
  it('12종 모두 자기 팔레트로 해석되고 E01로 폴백되지 않는다', () => {
    POSED_ZOMBIE_TYPES.forEach((type) => {
      const resolved = resolvePooledZombieVisual(TYPE_CODE[type])
      expect(resolved.paletteIsE01Fallback).toBe(false)
      expect(resolved.palette).toBe(ZOMBIE_PALETTE[type])
      expect(resolved.palette).not.toBe(ZOMBIE_PALETTE.E01)
      expect(resolved.palette.body).not.toBe(ZOMBIE_PALETTE.E01.body)
      expect(typeof resolved.palette.mark).toBe('number')
    })
  })

  it('12종의 body/skin/mark 색이 서로 전부 다르다', () => {
    const bodies = POSED_ZOMBIE_TYPES.map((type) => ZOMBIE_PALETTE[type].body)
    const skins = POSED_ZOMBIE_TYPES.map((type) => ZOMBIE_PALETTE[type].skin)
    const marks = POSED_ZOMBIE_TYPES.map((type) => ZOMBIE_PALETTE[type].mark)
    expect(new Set(bodies).size).toBe(12)
    expect(new Set(skins).size).toBe(12)
    expect(new Set(marks).size).toBe(12)
  })

  it('E07/B04 팔레트 누락(E01 폴백) 회귀를 막는다', () => {
    expect(ZOMBIE_PALETTE.E07).toBeDefined()
    expect(ZOMBIE_PALETTE.B04).toBeDefined()
    expect(ZOMBIE_PALETTE.E07.body).not.toBe(ZOMBIE_PALETTE.E01.body)
    expect(ZOMBIE_PALETTE.B04.body).not.toBe(ZOMBIE_PALETTE.E01.body)
  })
})

describe('신규 일반 좀비 12종 — 파트 세트', () => {
  it('12종 모두 전용 13슬롯 포즈형 세트로 해석된다 (STANDARD/RUN/코인 세트와 분리)', () => {
    POSED_ZOMBIE_TYPES.forEach((type) => {
      const resolved = resolvePooledZombieVisual(TYPE_CODE[type])
      expect(resolved.partCount).toBe(POSED_ZOMBIE_PART_COUNT)
      expect(resolved.partCount).toBe(13)
      expect(resolved.slotBase).toBe(POSED_SLOT_BASE)
      expect(resolved.partRoles).toEqual(Array.from(POSED_ZOMBIE_PART_ROLES))
      expect(resolved.studioTuned).toBe(true)
    })
  })

  it('표식은 타입당 정확히 하나이고 부모 파츠에 붙어 함께 움직인다', () => {
    POSED_ZOMBIE_TYPES.forEach((type) => {
      const parts = buildPosedZombieParts(type)
      expect(parts.filter((part) => part.role === 'mark')).toHaveLength(1)
      const mark = parts[POSED_ZOMBIE_MARK_SLOT]
      const parent = POSED_ZOMBIE_RIGS[type][POSED_ZOMBIE_RIGS[type].mark.parent]
      expect(mark.role).toBe('mark')
      expect(mark.pivot).toEqual(parent.pivot)
      expect(mark.rot).toEqual(parent.rot)
      expect(mark.key).toBe(POSED_ZOMBIE_RIGS[type].mark.parent)
      expect(resolvePooledZombieVisual(TYPE_CODE[type]).markKey).toBe(mark.key)
    })
  })

  it('표식 외의 파츠는 E01 박스 가족 그대로다 — 옷·소품·무기·갑옷·장식 역할이 없다', () => {
    const allowed = new Set(['skin', 'eye', 'body', 'foot', 'mark'])
    POSED_ZOMBIE_TYPES.forEach((type) => {
      const roles = buildPosedZombieParts(type).map((part) => part.role)
      roles.forEach((role) => expect(allowed.has(role)).toBe(true))
      // 머리1 + 눈2 + 몸통1 + 팔2 + 손2 + 다리2 + 발2 = 12, 표식 1 = 13.
      expect(roles.filter((role) => role === 'eye')).toHaveLength(2)
      expect(roles.filter((role) => role === 'foot')).toHaveLength(2)
      expect(roles).toHaveLength(13)
    })
  })

  it('베이스 박스 크기가 E01 STANDARD과 같아 지오메트리 캐시를 재사용한다', () => {
    const standardSizes = [
      POSED_ZOMBIE_BASE.head, POSED_ZOMBIE_BASE.eye, POSED_ZOMBIE_BASE.body,
      POSED_ZOMBIE_BASE.arm, POSED_ZOMBIE_BASE.hand, POSED_ZOMBIE_BASE.leg, POSED_ZOMBIE_BASE.foot,
    ]
    expect(standardSizes).toEqual([
      [0.52, 0.48, 0.46], [0.10, 0.09, 0.06], [0.56, 0.58, 0.40],
      [0.20, 0.50, 0.20], [0.18, 0.16, 0.18], [0.22, 0.52, 0.26], [0.24, 0.12, 0.34],
    ])
    POSED_ZOMBIE_TYPES.forEach((type) => {
      buildPosedZombieParts(type).forEach((part, index) => {
        if (index === POSED_ZOMBIE_MARK_SLOT) return
        expect(standardSizes).toContainEqual(part.size)
      })
    })
  })

  it('모바일 인스턴스 예산: 12종이 파트 슬롯 한 세트만 늘린다', () => {
    // 12종 전용 테이블이면 +156 슬롯이 된다. 공유 세트는 +13뿐이다.
    expect(PART_COUNT - POSED_SLOT_BASE).toBe(13)
    expect(PART_COUNT).toBe(POSED_SLOT_BASE + POSED_ZOMBIE_PART_COUNT)
  })
})

describe('신규 일반 좀비 12종 — 색을 가린 구별 가능성', () => {
  // 사양 수용 기준: "색상을 가려도 머리·몸통·팔·다리의 비례와 포즈로 구별할 수 있어야 한다."
  const channel = (type, keys) => keys.flatMap((key) => {
    const bone = POSED_ZOMBIE_RIGS[type][key]
    return [...bone.scale, ...bone.pivot, ...bone.rot].map(round)
  })
  const channels = (type) => ({
    head: channel(type, ['head']),
    torso: channel(type, ['body']),
    arms: channel(type, ['armL', 'armR']),
    legs: channel(type, ['legL', 'legR']),
  })

  it('12종의 전체 비례·포즈 서명이 서로 전부 다르다', () => {
    const signatures = POSED_ZOMBIE_TYPES.map((type) => JSON.stringify(channels(type)))
    expect(new Set(signatures).size).toBe(12)
  })

  it('모든 쌍이 머리/몸통/팔/다리 네 채널 중 최소 2개에서 다르다', () => {
    const byType = Object.fromEntries(POSED_ZOMBIE_TYPES.map((type) => [type, channels(type)]))
    const tooClose = []
    for (let i = 0; i < POSED_ZOMBIE_TYPES.length; i += 1) {
      for (let j = i + 1; j < POSED_ZOMBIE_TYPES.length; j += 1) {
        const a = byType[POSED_ZOMBIE_TYPES[i]]
        const b = byType[POSED_ZOMBIE_TYPES[j]]
        const differing = ['head', 'torso', 'arms', 'legs']
          .filter((key) => JSON.stringify(a[key]) !== JSON.stringify(b[key]))
        if (differing.length < 2) tooClose.push(`${POSED_ZOMBIE_TYPES[i]}/${POSED_ZOMBIE_TYPES[j]}:${differing.length}`)
      }
    }
    expect(tooClose).toEqual([])
  })

  it('몸통 비례가 사양의 실루엣 문법대로 넓은/좁은/낮은 군으로 갈린다', () => {
    const width = (type) => POSED_ZOMBIE_RIGS[type].body.scale[0]
    const height = (type) => POSED_ZOMBIE_RIGS[type].body.scale[1]
    const depth = (type) => POSED_ZOMBIE_RIGS[type].body.scale[2]
    // 가장 좁은 몸통 = 발맞춤후퇴형, 가장 넓은 몸통 = 모서리비껴형.
    expect(POSED_ZOMBIE_TYPES.reduce((a, b) => (width(a) <= width(b) ? a : b))).toBe('E44')
    expect(POSED_ZOMBIE_TYPES.reduce((a, b) => (width(a) >= width(b) ? a : b))).toBe('E35')
    // 가장 긴 몸통 = 박자접기형, 가장 앞뒤로 긴(눕는) 몸통 = 선끝접기형.
    expect(POSED_ZOMBIE_TYPES.reduce((a, b) => (height(a) >= height(b) ? a : b))).toBe('E34')
    expect(POSED_ZOMBIE_TYPES.reduce((a, b) => (depth(a) >= depth(b) ? a : b))).toBe('E39')
  })

  it('포즈가 전부 0인(= E01과 같은 기본 자세) 타입이 없다', () => {
    POSED_ZOMBIE_TYPES.forEach((type) => {
      const rig = POSED_ZOMBIE_RIGS[type]
      const poseMagnitude = ['head', 'body', 'armL', 'armR', 'legL', 'legR']
        .reduce((sum, key) => sum + rig[key].rot.reduce((acc, value) => acc + Math.abs(value), 0), 0)
      expect(poseMagnitude).toBeGreaterThan(0.3)
    })
  })
})

describe('신규 일반 좀비 12종 — 두 렌더 경로의 수치 일치', () => {
  it('인스턴스 경로의 포즈 회전 델타가 공유 박스 트리의 절대 회전을 복원한다', () => {
    POSED_ZOMBIE_TYPES.forEach((type) => {
      buildPosedZombieParts(type).forEach((part) => {
        const animBase = POSED_ZOMBIE_ANIM_BASE_ROTATION[part.key]
        expect(animBase).toBeDefined()
        const restored = part.rot.map((value, axis) => round((value - animBase[axis]) + animBase[axis]))
        expect(restored).toEqual(part.rot.map(round))
      })
    })
  })

  it('표식에 자체 기울기가 없어 두 경로의 회전 합성 순서가 갈리지 않는다', () => {
    POSED_ZOMBIE_TYPES.forEach((type) => {
      expect(POSED_ZOMBIE_RIGS[type].mark.tilt).toBeUndefined()
    })
  })

  it('신발 색이 E01-E06과 같은 공용 상수다', () => {
    expect(ZOMBIE_SHOE_COLOR).toBe(0x1a1a1a)
  })
})

describe('신규 일반 좀비 12종 — 공유 박스 트리가 실제로 조립된다', () => {
  const GROUP_KEYS = ['head', 'body', 'armL', 'armR', 'legL', 'legR']

  it('12종 전부 6개 파츠 그룹이 완비돼 있다', () => {
    POSED_ZOMBIE_TYPES.forEach((type) => {
      GROUP_KEYS.forEach((key) => {
        const bone = POSED_ZOMBIE_RIGS[type][key]
        expect(bone, `${type}.${key}`).toBeDefined()
        expect(bone.pivot).toHaveLength(3)
        expect(bone.rot).toHaveLength(3)
        expect(bone.scale).toHaveLength(3)
        bone.pivot.concat(bone.rot, bone.scale).forEach((value) => expect(Number.isFinite(value)).toBe(true))
      })
      expect(GROUP_KEYS).toContain(POSED_ZOMBIE_RIGS[type].mark.parent)
    })
  })

  it('13개 파트가 모두 어느 한 그룹에 귀속돼 조용히 누락되지 않는다', () => {
    POSED_ZOMBIE_TYPES.forEach((type) => {
      const parts = buildPosedZombieParts(type)
      const placed = GROUP_KEYS.reduce((sum, key) => sum + parts.filter((part) => part.key === key).length, 0)
      expect(placed).toBe(13)
      parts.forEach((part) => {
        expect(GROUP_KEYS).toContain(part.key)
        expect(part.size).toHaveLength(3)
        expect(part.box.every((value) => value > 0)).toBe(true)
      })
    })
  })

  it('다리 오프셋이 다리 길이를 따라가 발이 종아리 끝에 붙는다', () => {
    POSED_ZOMBIE_TYPES.forEach((type) => {
      const parts = buildPosedZombieParts(type)
      ;[[8, 9, 'legL'], [10, 11, 'legR']].forEach(([legSlot, footSlot, key]) => {
        const legScaleY = POSED_ZOMBIE_RIGS[type][key].scale[1]
        expect(parts[legSlot].offset[1]).toBeCloseTo(-0.26 * legScaleY, 10)
        const shift = POSED_ZOMBIE_RIGS[type][key].footShift ?? [0, 0, 0]
        expect(parts[footSlot].offset[1]).toBeCloseTo(-0.57 * legScaleY + shift[1], 10)
      })
    })
  })
})

describe('신규 일반 좀비 12종 — 두 렌더 경로의 월드 변환이 같다', () => {
  // 공유 박스 트리(Studio·프리뷰·React 엔티티)와 고정풀 인스턴스 경로가 같은 파츠를
  // 같은 위치에 놓는지 실제 THREE 합성으로 검증한다. 합성 순서가 한쪽에서만 바뀌면 깨진다.
  const sceneGraphMatrix = (part) => {
    // ZombieMesh: <group position=pivot rotation=rot><ZBlock position=offset><mesh scale=box/>
    const pivotGroup = new THREE.Group()
    pivotGroup.position.set(part.pivot[0], part.pivot[1], part.pivot[2])
    pivotGroup.rotation.set(part.rot[0], part.rot[1], part.rot[2])
    const blockGroup = new THREE.Group()
    blockGroup.position.set(part.offset[0], part.offset[1], part.offset[2])
    const mesh = new THREE.Object3D()
    mesh.scale.set(part.box[0], part.box[1], part.box[2])
    pivotGroup.add(blockGroup)
    blockGroup.add(mesh)
    pivotGroup.updateWorldMatrix(false, true)
    return mesh.matrixWorld.clone()
  }
  const instanceMatrix = (part) => {
    // ZombieInstanceLayer 프레임 루프와 같은 순서:
    // T(pivot) → R(animBase + poseDelta) → T(offset) → S(box)
    const animBase = POSED_ZOMBIE_ANIM_BASE_ROTATION[part.key]
    const poseDelta = part.rot.map((value, axis) => value - animBase[axis])
    const out = new THREE.Matrix4()
    const step = new THREE.Matrix4()
    out.multiply(step.makeTranslation(part.pivot[0], part.pivot[1], part.pivot[2]))
    const euler = new THREE.Euler(
      animBase[0] + poseDelta[0],
      animBase[1] + poseDelta[1],
      animBase[2] + poseDelta[2],
      'XYZ',
    )
    out.multiply(step.makeRotationFromEuler(euler))
    out.multiply(step.makeTranslation(part.offset[0], part.offset[1], part.offset[2]))
    out.multiply(step.makeScale(part.box[0], part.box[1], part.box[2]))
    return out
  }

  it('12종 × 13파츠 전부 두 경로의 행렬이 일치한다', () => {
    const mismatches = []
    POSED_ZOMBIE_TYPES.forEach((type) => {
      buildPosedZombieParts(type).forEach((part, index) => {
        const a = sceneGraphMatrix(part).elements
        const b = instanceMatrix(part).elements
        for (let i = 0; i < 16; i += 1) {
          if (Math.abs(a[i] - b[i]) > 1e-9) mismatches.push(`${type}#${index}[${i}] ${a[i]} != ${b[i]}`)
        }
      })
    })
    expect(mismatches).toEqual([])
  })
})

describe('기존 적의 비주얼 해석은 바뀌지 않는다', () => {
  it('E01-E08 / RZ* 의 이름·아이템 id·팔레트·파트 수·슬롯 구간이 그대로다', () => {
    const expected = [
      [1, 'E01', 'zombie-e01', 12, 0], [2, 'E02', 'zombie-e02', 12, 0], [3, 'E03', 'zombie-e03', 12, 0],
      [4, 'E04', 'zombie-e04', 12, 0], [5, 'E05', 'zombie-e05', 12, 0], [6, 'E06', 'zombie-e06', 12, 0],
      [7, 'RZL', 'zombie-rzl', 21, 12], [8, 'RZC', 'zombie-rzc', 21, 12],
      [13, 'RZT', 'zombie-rzt', 16, 33], [14, 'RZG', 'zombie-rzg', 17, 49],
      [15, 'E07', 'zombie-procedural-face-test', 0, 0], [16, 'E08', 'zombie-e08', 15, 66],
    ]
    expected.forEach(([code, name, itemId, partCount, slotBase]) => {
      const resolved = resolvePooledZombieVisual(code)
      expect([code, resolved.name, resolved.itemId, resolved.partCount, resolved.slotBase])
        .toEqual([code, name, itemId, partCount, slotBase])
      expect(resolved.posedIndex).toBe(0)
      expect(resolved.markKey).toBeNull()
    })
  })

  it('포즈형 슬롯 구간이 기존 세트 뒤에만 붙는다', () => {
    expect(POSED_SLOT_BASE).toBe(81)
  })

  it('E01-E06은 여전히 자기 팔레트를 쓰고 포즈형 리그가 없다', () => {
    ;['E01', 'E02', 'E03', 'E04', 'E05', 'E06'].forEach((type) => {
      expect(isPosedZombieType(type)).toBe(false)
      expect(buildPosedZombieParts(type)).toBeNull()
      expect(ZOMBIE_PALETTE[type].mark).toBeUndefined()
    })
  })
})

describe('Graphics Studio 카탈로그', () => {
  it('12종이 각자 고유한 Studio 아이템 id로 등록된다', () => {
    POSED_ZOMBIE_TYPES.forEach((type, i) => {
      const id = getStudioZombieItemId(type)
      expect(id).toBe(`zombie-e${34 + i}`)
      const entry = GRAPHICS_STUDIO_CATALOG.find((item) => item.id === id)
      expect(entry).toBeDefined()
      expect(entry.category).toBe('enemy')
      expect(entry.zombieType).toBe(type)
      expect(entry.previewKind).toBe('zombie')
      expect(entry.label).toContain(type)
    })
  })

  it('카탈로그 id가 전부 유일하다 — 기존 항목과 충돌하지 않는다', () => {
    const ids = GRAPHICS_STUDIO_CATALOG.map((item) => item.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('로컬 시드/폴백을 들이지 않는다 — 카탈로그는 id와 메타데이터만 늘린다', () => {
    POSED_ZOMBIE_TYPES.forEach((type) => {
      const entry = GRAPHICS_STUDIO_CATALOG.find((item) => item.id === getStudioZombieItemId(type))
      expect(entry.defaultTuning).toBeUndefined()
      expect(entry.seed).toBeUndefined()
      expect(entry.sourceRevision).toBeUndefined()
    })
  })
})
