import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { STAGE_LIGHTING_PROFILES } from '../lib/stageLightingProfile.js'

const SRC_ROOT = fileURLToPath(new URL('..', import.meta.url))

function collectSourceFiles(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      collectSourceFiles(full, out)
      continue
    }
    // 테스트 파일은 문자열 리터럴로 금지 패턴을 인용하므로 스캔 대상에서 뺀다.
    if (/\.(js|jsx)$/.test(entry.name) && !/\.test\.(js|jsx)$/.test(entry.name)) out.push(full)
  }
  return out
}

// 2026-08-25 모바일 성능 회귀 방지선.
// 스테이지 색 구역을 실시간 spotLight 3개로 만들었더니 픽셀마다 거리 감쇠 + 원뿔
// smoothstep이 3회, MeshToonMaterial gradientMap 종속 페치가 3회 추가됐다. 바닥이
// 화면 전체를 덮고 dpr이 최대 1.5라 순수 풀스크린 필레이트 비용이었고, 스테이지
// 진입마다 셰이더 프로그램 키가 바뀌어 전 머티리얼이 재컴파일됐다.
// 그래서 색 구역은 바닥 lightMap으로 굽는다. 씬의 spotLight 개수 0이 유일한 판정 기준이다.
describe('스테이지 색 구역: 런타임 광원 0개 + 바닥 굽기', () => {
  it('src 전체에 spotLight를 만드는 코드가 하나도 없다', () => {
    const offenders = []
    for (const file of collectSourceFiles(SRC_ROOT)) {
      const source = readFileSync(file, 'utf8')
      if (/<spotLight\b/.test(source) || /\bnew\s+THREE\.SpotLight\b/.test(source)) {
        offenders.push(file)
      }
    }
    expect(offenders).toEqual([])
  })

  it('폐기된 StageLighting 컴포넌트가 되살아나지 않는다', () => {
    expect(existsSync(join(SRC_ROOT, 'components', 'StageLighting.jsx'))).toBe(false)

    const source = readFileSync(new URL('./Game.jsx', import.meta.url), 'utf8')
    expect(source).not.toContain('StageLighting')
    expect(source).not.toContain('<spotLight')
    expect(source).not.toContain('<pointLight')
  })

  it('회귀 이전부터 있던 ambientLight 1 + directionalLight 2는 그대로다', () => {
    const source = readFileSync(new URL('./Game.jsx', import.meta.url), 'utf8')

    expect(source).toContain('<ambientLight intensity={0.38} color={0x6d6780} />')
    expect(source).toContain('position={[-10, 22, 12]}')
    expect(source).toContain('intensity={3.2}')
    expect(source).toContain('<directionalLight position={[10, 12, -10]} intensity={0.85} color={0xffe2b0} />')
    expect(source.match(/<ambientLight/g)).toHaveLength(1)
    expect(source.match(/<directionalLight/g)).toHaveLength(2)
  })

  it('바닥이 stageLightingProfile 정본에서 구운 lightMap을 쓴다', () => {
    const source = readFileSync(new URL('./ClassroomFloor.jsx', import.meta.url), 'utf8')

    expect(source).toContain("import { buildStageFloorLightMap, stageFloorLightMapProps } from '../lib/stageFloorLightBake.js'")
    expect(source).toContain('buildStageFloorLightMap(stageId, { width: floorPlaneWidth, depth: floorPlaneDepth })')
    expect(source).toContain('...stageFloorLightMapProps(lightBake)')
    expect(source).toContain('useEffect(() => () => lightBake?.texture.dispose(), [lightBake])')

    const bake = readFileSync(new URL('../lib/stageFloorLightBake.js', import.meta.url), 'utf8')
    // 색·좌표는 프로파일에서 읽어야 한다. 굽는 쪽에 값을 다시 적으면 정본이 두 벌이 된다.
    expect(bake).toContain("import { getStageLightingProfile } from './stageLightingProfile.js'")
    for (const profile of Object.values(STAGE_LIGHTING_PROFILES)) {
      for (const light of profile) {
        expect(bake).not.toContain(light.color)
      }
    }
  })
})
