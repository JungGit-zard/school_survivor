// 약관·개인정보처리방침이 코드의 실제 수집 동작과 어긋나지 않도록 고정한다
// (2026-10-29 Terry: "방침에 적어라, 약관은 거짓없게").
// 수집 동작을 바꾸면 이 테스트와 legalDocuments.js / locales 의 문구를 함께 갱신한다.
import { describe, expect, it } from 'vitest'
import {
  EFFECTIVE_DATE,
  PRIVACY_TEXT,
  PRIVACY_VERSION,
  TERMS_TEXT,
  TERMS_VERSION,
} from './legalDocuments.js'
import en from './locales/en.js'
import ja from './locales/ja.js'

describe('legal documents truthfulness', () => {
  it('bumps both document versions so existing users are asked to consent again', () => {
    expect(TERMS_VERSION).toBeGreaterThanOrEqual(3)
    expect(PRIVACY_VERSION).toBeGreaterThanOrEqual(3)
    expect(EFFECTIVE_DATE).toBe('2026년 10월 29일')
  })

  it('no longer claims that email addresses are not stored', () => {
    // firebaseAdminVisitors.js stores the verified Google email in adminVisitors/{uid}.
    expect(PRIVACY_TEXT).not.toContain('이메일 주소 자체를 게임 데이터베이스에 저장하지 않습니다')
    expect(PRIVACY_TEXT).toContain('Google 로그인 이용자는 이메일 주소도 함께 기록합니다')
    expect(en['legal.privacy.text']).not.toMatch(/email address and profile photo URL themselves are not stored/)
    expect(ja['legal.privacy.text']).not.toContain('メールアドレスとプロフィール写真URL自体はゲームのデータベースに保存しません')
  })

  it('discloses every processor and data flow the code actually uses', () => {
    for (const text of [PRIVACY_TEXT, en['legal.privacy.text'], ja['legal.privacy.text']]) {
      expect(text).toContain('Cloudflare')
      expect(text).toContain('Google Analytics for Firebase')
      expect(text).toContain('Firebase Realtime Database')
      expect(text).toContain('music.escapezombie.com')
      expect(text).toContain('asia-southeast1')
      // The project uses Realtime Database only; Firestore is never initialized.
      expect(text).not.toContain('Firestore')
    }
    expect(PRIVACY_TEXT).toContain('접속 기록')
    expect(PRIVACY_TEXT).toContain('게스트')
    expect(PRIVACY_TEXT).toContain('게시판')
  })

  it('does not deny advertising-ID collection while the Android shell bundles firebase-analytics', () => {
    expect(PRIVACY_TEXT).not.toMatch(/광고 식별자를 수집하지 않습니다/)
    expect(PRIVACY_TEXT).toContain('광고 ID가 수집될 수 있습니다')
    expect(en['legal.privacy.text']).not.toMatch(/or advertising identifiers\./)
    expect(ja['legal.privacy.text']).not.toMatch(/広告識別子を収集しません/)
  })

  it('does not promise ranking deletion that account deletion cannot perform', () => {
    // accountDeletion.js only reaches the current daily/weekly buckets and the all-time boards.
    expect(TERMS_TEXT).not.toContain('계정을 삭제하면 진행 기록, 게임 내 재화, 랭킹 기록이 함께 삭제되며')
    expect(PRIVACY_TEXT).not.toContain('진행 기록과 랭킹 기록을 지체 없이 삭제합니다')
    expect(PRIVACY_TEXT).toContain('이미 지난 기간의 일간·주간 랭킹 기록은 계정 삭제로 자동 삭제되지 않습니다')
  })

  it('states that guests can play and every run reaches the ranking', () => {
    expect(TERMS_TEXT).not.toContain('게임은 Google 계정 로그인으로 이용합니다.')
    expect(TERMS_TEXT).toContain('로그인하지 않고 게스트로 이용할 수 있습니다')
    expect(TERMS_TEXT).toContain('0점 판을 포함해')
  })

  it('keeps the English and Japanese documents on the same effective date', () => {
    expect(en['legal.terms.text']).toContain('Effective date: October 29, 2026')
    expect(en['legal.privacy.text']).toContain('Effective date: October 29, 2026')
    expect(ja['legal.terms.text']).toContain('施行日: 2026年10月29日')
    expect(ja['legal.privacy.text']).toContain('施行日: 2026年10月29日')
  })
})
