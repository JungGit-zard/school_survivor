import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('StageBossPreview', () => {
  it('recreates the R3F camera when zoom changes', () => {
    const source = readFileSync(new URL('./StageBossPreview.jsx', import.meta.url), 'utf8')

    // 보스별 크라운 보정 zoom(renderZoom)으로 카메라를 재생성한다.
    expect(source).toContain('key={renderZoom}')
    expect(source).toContain('camera={{ position: [0, 2.2, 5.5], zoom: renderZoom }}')
    expect(source).toContain('resolveBossPreviewZoom(frame.zoom)')
    // 얼굴 중앙 앵커: 보스 타입별 base Y를 계산해 panY를 그 위 오프셋으로 더한다.
    expect(source).toContain('resolveBossPreviewBaseY')
    expect(source).toContain('baseY + framing.panY')
  })
})
