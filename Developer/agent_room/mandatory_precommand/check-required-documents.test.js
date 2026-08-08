import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const repositoryRoot = resolve(import.meta.dirname, '..', '..', '..')
const checker = resolve(import.meta.dirname, 'check-required-documents.ps1')
const requiredNotice = 'AAB 생성 후 반드시 Google Play 배포 경로의 실제 Android 기기에서 로그인·타이틀·로비·게임 진입을 테스트해 주세요.'

describe('launchmini AAB pre-command notice', () => {
  it('always emits the physical-device acceptance notice for launchmini', () => {
    const result = spawnSync('powershell.exe', [
      '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', checker,
      '-Profile', 'launchmini', '-Domain', 'auto', '-TaskSummary', 'AAB build',
    ], { cwd: repositoryRoot, encoding: 'utf8' })

    expect(result.status).toBe(0)
    expect(JSON.parse(result.stdout).mandatory_aab_notice).toBe(requiredNotice)
  })
})
