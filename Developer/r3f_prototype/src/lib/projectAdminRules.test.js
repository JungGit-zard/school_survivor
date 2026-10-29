import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const rulesText = readFileSync(new URL('../../database.rules.json', import.meta.url), 'utf8')
const rules = JSON.parse(rulesText).rules

const MASTER_CLAUSE = /auth\.token\.email === 'zard5388@gmail\.com'\s*&&\s*auth\.token\.email_verified === true\s*&&\s*auth\.token\.firebase\.sign_in_provider === 'google\.com'/

// 마스터(소유자 구글 계정) 권한이 붙은 노드는 아래 목록뿐이어야 한다. 새 경로가 마스터 권한을
// 얻으면 목록에 나타나 테스트가 깨진다 — 관리자 표면이 조용히 넓어지는 것을 막는 게이트다.
// runtimeControl/v1/inspection은 점검 모드 원격 스위치로, 쓰기는 마스터 전용·읽기는 공개다.
// adminVisitors는 d4364282(관리자 계정 디렉터리), zombieBoard는 e21fd94f(홈페이지 게시판·비공개 문의)
// 에서 마스터 관리 권한을 의도적으로 얻었다.
const EXPECTED_MASTER_RULES = [
  'adminVisitors/$uid/.validate',
  'adminVisitors/$uid/.write',
  'adminVisitors/$uid/authType/.validate',
  'adminVisitors/.read',
  'runtimeControl/v1/inspection/.write',
  'studioWorkspaces/v1/canonical/current/.write',
  'users/$uid/.read',
  'users/$uid/.write',
  'zombieBoard/v1/comments/$postId/$commentId/.write',
  'zombieBoard/v1/comments/$postId/.write',
  'zombieBoard/v1/posts/$postId/.write',
  'zombieBoard/v1/privateComments/$postId/$commentId/.read',
  'zombieBoard/v1/privateComments/$postId/$commentId/.write',
  'zombieBoard/v1/privateComments/$postId/.read',
  'zombieBoard/v1/privateComments/$postId/.write',
  'zombieBoard/v1/privatePosts/$postId/.read',
  'zombieBoard/v1/privatePosts/$postId/.write',
  'zombieBoard/v1/privatePosts/.read',
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
  it('keeps root denied and grants owner-or-verified-Google-master access only to the known admin paths', () => {
    expect(rules['.read']).toBe(false)
    expect(rules['.write']).toBe(false)
    expect(collectMasterRules(rules).sort()).toEqual(EXPECTED_MASTER_RULES)
  })
})
