// node 환경: 구현 소스에 저부하 전역 탭 이펙트 안전장치가 남아있는지 고정한다.
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const source = readFileSync(new URL('./TapFeedbackBurst.jsx', import.meta.url), 'utf8')
const readySource = readFileSync(new URL('./ReadyGameApp.jsx', import.meta.url), 'utf8')

describe('TapFeedbackBurst 저부하 전역 UI 이펙트', () => {
  it('전역 ReadyGameApp에 한 장의 pointer-events-none canvas로만 붙는다', () => {
    expect(readySource).toContain("import TapFeedbackBurst from './TapFeedbackBurst.jsx'")
    expect(readySource).toContain('<TapFeedbackBurst />')
    expect(source).toContain("pointerEvents: 'none'")
    expect(source).toContain("position: 'fixed'")
  })

  it('click 캡처만 사용하고 pointerdown/touchstart에는 반응하지 않는다', () => {
    expect(source).toContain("document.addEventListener('click', handleClick, true)")
    expect(source).toContain("document.removeEventListener('click', handleClick, true)")
    expect(source).not.toContain("addEventListener('pointerdown'")
    expect(source).not.toContain("addEventListener('touchstart'")
  })

  it('reduced-motion, 게임 reducedEffects 설정, 키보드 click, data-fx none을 모두 가드한다', () => {
    expect(source).toContain("'(prefers-reduced-motion: reduce)'")
    expect(source).toContain("document.documentElement.dataset.reducedEffects === 'true'")
    expect(source).toContain('loadTitleSettings().reducedEffects === true')
    expect(source).toContain('if (event.detail === 0) return')
    expect(source).toContain("button.closest('[data-fx=\"none\"]')")
  })

  it('프레임 루프와 캔버스 버퍼는 상한을 둔다', () => {
    expect(source).toContain('const MAX_PARTICLES = 96')
    expect(source).toContain('const DPR_CAP = 1.5')
    expect(source).toContain('function burstAt(x, y, count = 9)')
    expect(source).toContain('const speed = rand(190, 360)')
    expect(source).toContain('cancelAnimationFrame(frameRef.current)')
    expect(source).toContain('particles.splice(0, particles.length - MAX_PARTICLES)')
  })
})
