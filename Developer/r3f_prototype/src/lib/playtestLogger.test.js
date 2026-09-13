import { describe, expect, it, vi } from 'vitest'
import { formatPlaytestSubmissionMessage, sendPlaytestSummaryToAssistant } from './playtestLogger.js'

describe('playtest log assistant submission', () => {
  const summary = {
    runId: '2026-09-10-14-30-00',
    stageId: 'stage4',
    result: 'gameover',
    duration: '12:34',
    durationMs: 754000,
    finalLevel: 8,
    goldSession: 42,
    stats: { totalKills: 321, totalDamageTaken: 55, totalPickups: 19 },
    events: [{ t: 0, type: 'start' }, { t: 754, type: 'end', result: 'gameover' }],
  }

  it('formats a full JSON payload with a short human-readable header', () => {
    const message = formatPlaytestSubmissionMessage(summary)

    expect(message).toContain('[Escape Zombie School 플레이테스트 로그]')
    expect(message).toContain('stage: stage4')
    expect(message).toContain('kills: 321')
    expect(message).toContain('```json')
    expect(message).toContain('\"events\"')
  })

  it('posts the formatted log to the dev-server Hermes relay endpoint', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ ok: true, chunks: 1 }),
    })

    await expect(sendPlaytestSummaryToAssistant({ summary, fetchImpl })).resolves.toEqual({ ok: true, chunks: 1 })

    expect(fetchImpl).toHaveBeenCalledWith('/__playtest-log/send-to-hana', expect.objectContaining({
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      keepalive: true,
    }))
    const body = JSON.parse(fetchImpl.mock.calls[0][1].body)
    expect(body.summary).toEqual(summary)
    expect(body.message).toContain('stage: stage4')
  })

  it('surfaces relay failures so the HUD can fall back to clipboard copy', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false, status: 500 })

    await expect(sendPlaytestSummaryToAssistant({ summary, fetchImpl })).rejects.toThrow('send_failed:500')
  })
})
