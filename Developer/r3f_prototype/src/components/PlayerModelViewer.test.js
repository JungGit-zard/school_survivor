import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const source = readFileSync(resolve(__dirname, 'PlayerModelViewer.jsx'), 'utf8')

describe('local protagonist GLB viewer framing', () => {
  it('keeps the grid at the imported GLB foot plane instead of cutting through the body', () => {
    expect(source).toContain("scale={1.28} position={[0, -0.12, 0]}")
    expect(source).toContain("<gridHelper args={[5, 10, '#d6c8ad', '#e8ddc8']} position={[0, -1.784, 0]} />")
  })
})
