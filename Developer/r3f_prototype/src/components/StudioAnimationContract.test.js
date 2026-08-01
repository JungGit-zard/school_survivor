// 스튜디오 튜닝 계약의 정적 게이트.
//
// 배경: 파츠 애니메이션이 매 프레임 `part.rotation.x = ...` 처럼 원시 대입을 하면
// applySavedStudioPartTunings가 넣어 둔 스튜디오 오프셋이 그 즉시 덮어써진다.
// 그러면 사용자가 Graphics Studio에서 조정해도 게임에서는 아무 변화가 없다.
//
// 허용되는 유일한 진입점은 StudioTunedGroup의 합성 헬퍼다:
//   composeStudioPartPosition / composeStudioPartRotation / composeStudioPartScale
//   studioPartPositionOffset / studioPartRotationOffset / studioPartScaleMultiplier
//
// 이 테스트는 "StudioTunedGroup 하위에서 파츠 리그를 애니메이션하는 컴포넌트"가
// 헬퍼를 쓰고 있는지 소스 수준에서 확인한다. 신규 캐릭터/무기를 추가하며 이 계약을
// 잊으면 CI에서 즉시 걸린다.
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const HELPERS = [
  'composeStudioPartPosition',
  'composeStudioPartRotation',
  'composeStudioPartScale',
  'studioPartPositionOffset',
  'studioPartRotationOffset',
  'studioPartScaleMultiplier',
]

// 파츠 리그를 매 프레임 구동하면서 StudioTunedGroup 안에 사는 컴포넌트들.
// (무기 대부분은 단일 정적 모델 + 바깥 스윙 래퍼라 파츠 리그가 없어 대상이 아니다.)
const RIGGED_PART_ANIMATORS = [
  'PlayerMesh.jsx',
  'ZombieMesh.jsx',
  'MatildaMesh.jsx',
  'DogeMesh.jsx',
  'Weapons/Chibiko.jsx',
  'Weapons/StarlinkSatellite.jsx',
]

function read(relativePath) {
  return readFileSync(new URL(`./${relativePath}`, import.meta.url), 'utf8')
}

describe('스튜디오 파츠 애니메이션 계약', () => {
  it.each(RIGGED_PART_ANIMATORS)('%s 는 파츠 변형에 합성 헬퍼를 쓴다', (file) => {
    const source = read(file)
    const used = HELPERS.filter((helper) => source.includes(helper))
    expect(
      used.length,
      `${file}가 StudioTunedGroup 합성 헬퍼를 전혀 쓰지 않는다. `
      + `파츠를 매 프레임 원시 대입하면 스튜디오 튜닝이 게임에서 지워진다. `
      + `PlayerMesh.jsx의 패턴을 따르라.`,
    ).toBeGreaterThan(0)
  })

  it('합성 헬퍼는 StudioTunedGroup 한 곳에서만 정의된다', () => {
    const canonical = read('StudioTunedGroup.jsx')
    for (const helper of HELPERS) {
      expect(canonical, `${helper} 정의가 정본에 없다`).toContain(`export function ${helper}`)
    }
  })

  it('파츠 조회는 정본 하나만 존재한다 (미리보기/런타임 이원화 재발 방지)', () => {
    const canonical = read('StudioTunedGroup.jsx')
    const preview = read('GraphicsStudioPreview.jsx')
    expect(canonical).toContain('export function findStudioPartByKey')
    // 미리보기는 자체 해석 로직을 갖지 않고 정본에 위임만 한다.
    expect(preview).toContain('findStudioPartByKey')
    expect(preview).not.toContain('key.split(\'.\').reduce(')
  })

  it('base는 마운트 시점에 전수 캡처된다 (애니메이션 경합으로 인한 base 오염 방지)', () => {
    const canonical = read('StudioTunedGroup.jsx')
    const preview = read('GraphicsStudioPreview.jsx')
    expect(canonical).toContain('export function captureStudioPartBaseTransforms')
    expect(canonical).toContain('useLayoutEffect')
    expect(preview).toContain('captureStudioPartBaseTransforms')
  })
})
