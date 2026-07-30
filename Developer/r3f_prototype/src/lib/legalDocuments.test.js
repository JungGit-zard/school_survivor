import { describe, expect, it } from 'vitest'
import { PRIVACY_TEXT, TERMS_TEXT } from './legalDocuments.js'

describe('legal document implementation alignment', () => {
  it('does not promise automatic deletion of ranking periods the client cannot enumerate', () => {
    expect(TERMS_TEXT).not.toMatch(/랭킹 기록이 함께 삭제/)
    expect(PRIVACY_TEXT).not.toMatch(/랭킹 기록을 지체 없이 삭제/)
    expect(TERMS_TEXT).toContain('랭킹 기록은 현재 일간·주간 랭킹에서 확인 가능한 본인 기록을 삭제하고')
    expect(PRIVACY_TEXT).toContain('현재 일간·주간 랭킹에서 확인 가능한 본인 기록은 함께 삭제를 시도합니다')
    expect(PRIVACY_TEXT).toContain('과거 기간 또는 운영자가 추가 확인해야 하는 랭킹 기록은')
  })

  it('discloses Google/Firebase Auth fields that are processed in the signed-in UI', () => {
    expect(PRIVACY_TEXT).toContain('이메일 주소')
    expect(PRIVACY_TEXT).toContain('프로필 사진 URL')
    expect(PRIVACY_TEXT).toContain('이메일 인증 여부')
    expect(PRIVACY_TEXT).toContain('로그인 제공자 정보')
    expect(PRIVACY_TEXT).toContain('화면 표시와 로그인 상태 확인에만 사용')
  })
})
