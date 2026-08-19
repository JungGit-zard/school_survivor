import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const rulesText = readFileSync(new URL('../../database.rules.json', import.meta.url), 'utf8')
const rules = JSON.parse(rulesText).rules

const MASTER_CLAUSE = /auth\.token\.email === 'zard5388@gmail\.com'\s*&&\s*auth\.token\.email_verified === true\s*&&\s*auth\.token\.firebase\.sign_in_provider === 'google\.com'/

// 마스터(소유자 구글 계정) 권한이 붙은 노드는 이 네 곳뿐이어야 한다. 새 경로가 마스터 권한을
// 얻으면 목록에 나타나 테스트가 깨진다 — 관리자 표면이 조용히 넓어지는 것을 막는 게이트다.
// runtimeControl/v1/inspection은 점검 모드 원격 스위치로, 쓰기는 마스터 전용·읽기는 공개다.
const EXPECTED_MASTER_RULES = [
  'runtimeControl/v1/inspection/.write',
  'studioWorkspaces/v1/canonical/current/.write',
  'users/$uid/.read',
  'users/$uid/.write',
]

function collectMasterRules(node, trail = []) {
  if (!node || typeof node !== 'object') return []
  return Object.entries(node).flatMap(([key, value]) => (
    typeof value === 'string'
      ? (MASTER_CLAUSE.test(value) ? [[...trail, key].join('/')] : [])
      : collectMasterRules(value, [...trail, key])
  ))
}

describe('Realtime Database project master rule', () => {
  it('keeps root denied and grants owner-or-verified-Google-master access only to the four known paths', () => {
    expect(rules['.read']).toBe(false)
    expect(rules['.write']).toBe(false)
    expect(collectMasterRules(rules).sort()).toEqual(EXPECTED_MASTER_RULES)
  })
})
