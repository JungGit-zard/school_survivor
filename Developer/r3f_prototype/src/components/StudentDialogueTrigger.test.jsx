import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const triggerSource = readFileSync(new URL('./StudentDialogueTrigger.jsx', import.meta.url), 'utf8')

describe('StudentDialogueTrigger', () => {
  it('passes the investigation subject type to the reward policy', () => {
    expect(triggerSource).toContain("rollInvestigationReward(target.subjectType)")
  })
})
