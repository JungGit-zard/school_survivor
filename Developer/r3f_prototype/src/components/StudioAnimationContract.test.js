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
// 대상 목록은 손으로 적지 않는다. 손으로 적으면 새 에셋이 목록에 안 들어간 채
// 통과해 버리고, 그게 정확히 이 계약이 뚫리는 방식이었다. 대신 소스를 훑어
// "StudioTunedGroup을 직접 렌더하면서 매 프레임 돌아가는" 컴포넌트를 전부 찾아내
// 각각이 둘 중 하나를 반드시 선언하게 만든다:
//
//   1. 합성 헬퍼를 쓴다                        → 스튜디오 파츠를 변형하는 컴포넌트
//   2. STUDIO_OUTER_MOTION_ONLY 마커를 단다    → 자기 바깥 그룹만 움직이는 컴포넌트
//
// 2번은 면제가 아니라 선언이다. 코인 회전·오브 부유·체력바 빌보드처럼 StudioTunedGroup의
// **부모** 노드를 움직이는 코드는 튜닝을 덮어쓰지 않고 곱해질 뿐이라 정당하다. 다만
// 새 에셋을 추가하는 사람이 "내 컴포넌트는 어느 쪽인가"를 반드시 한 번 판단하게 한다.
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const HELPERS = [
  'composeStudioPartPosition',
  'composeStudioPartRotation',
  'composeStudioPartScale',
  'studioPartPositionOffset',
  'studioPartRotationOffset',
  'studioPartScaleMultiplier',
]

// 바깥 그룹만 움직인다고 선언하는 마커. 소스 주석에 이 토큰을 그대로 넣는다.
const OUTER_MOTION_MARKER = 'STUDIO_OUTER_MOTION_ONLY'

const COMPONENTS_DIR = fileURLToPath(new URL('./', import.meta.url))

function readComponentSources() {
  const files = []
  const walk = (dir) => {
    for (const entry of readdirSync(dir)) {
      const path = join(dir, entry)
      if (statSync(path).isDirectory()) {
        walk(path)
        continue
      }
      if (!/\.jsx?$/.test(entry)) continue
      if (/\.test\.|\.audit\./.test(entry)) continue
      files.push(path)
    }
  }
  walk(COMPONENTS_DIR)
  return files.map((path) => ({
    name: path.slice(COMPONENTS_DIR.length).replace(/\\/g, '/'),
    source: readFileSync(path, 'utf8'),
  }))
}

// StudioTunedGroup을 직접 렌더하면서 매 프레임 구동되는 컴포넌트 = 계약 대상.
function findStudioAnimators() {
  return readComponentSources()
    .filter(({ source }) => source.includes('<StudioTunedGroup') && source.includes('useFrame'))
    .map(({ name }) => name)
}

function read(relativePath) {
  return readFileSync(new URL(`./${relativePath}`, import.meta.url), 'utf8')
}

describe('스튜디오 파츠 애니메이션 계약', () => {
  const animators = findStudioAnimators()

  it('계약 대상이 소스에서 자동으로 도출된다 (하드코딩 목록 금지)', () => {
    // 목록이 비면 스캔이 깨진 것이다 — 그 상태로 통과하면 계약이 조용히 사라진다.
    expect(animators.length).toBeGreaterThan(0)
  })

  it.each(animators)('%s 는 합성 헬퍼를 쓰거나 바깥 그룹 전용임을 선언한다', (file) => {
    const source = read(file)
    const usesHelper = HELPERS.some((helper) => source.includes(helper))
    const declaresOuterOnly = source.includes(OUTER_MOTION_MARKER)

    expect(
      usesHelper || declaresOuterOnly,
      `${file}가 StudioTunedGroup을 렌더하면서 매 프레임 돌아가는데, 스튜디오 변형 계약을 `
      + `선언하지 않았다.\n`
      + `  - 스튜디오 파츠를 변형한다면: StudioTunedGroup의 합성 헬퍼를 써라 (PlayerMesh.jsx 참고). `
      + `파츠를 원시 대입하면 스튜디오 튜닝이 다음 프레임에 지워진다.\n`
      + `  - 자기 바깥 그룹만 움직인다면: 그 useFrame 위에 ${OUTER_MOTION_MARKER} 주석을 달아라.`,
    ).toBe(true)
  })

  it('합성 헬퍼는 StudioTunedGroup 한 곳에서만 정의된다', () => {
    const canonical = read('StudioTunedGroup.jsx')
    for (const helper of HELPERS) {
      expect(canonical, `${helper} 정의가 정본에 없다`).toContain(`export function ${helper}`)
    }
  })

  it('합성 헬퍼를 정본 밖에서 재정의하지 않는다 (독자 변형 경로 차단)', () => {
    const offenders = readComponentSources()
      .filter(({ name }) => name !== 'StudioTunedGroup.jsx')
      .filter(({ source }) => HELPERS.some((helper) => source.includes(`function ${helper}`)))
      .map(({ name }) => name)

    expect(
      offenders,
      `합성 헬퍼는 StudioTunedGroup.jsx에만 존재해야 한다. 같은 이름으로 자체 구현을 두면 `
      + `변형 규칙이 둘로 갈라진다.`,
    ).toEqual([])
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
