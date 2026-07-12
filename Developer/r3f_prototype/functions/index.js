import { getApps, initializeApp } from 'firebase-admin/app'
import { getDatabase } from 'firebase-admin/database'
import { HttpsError, onCall } from 'firebase-functions/v2/https'

import {
  applyRunSubmission,
  normalizeRun,
  sanitizeDisplayName,
} from './src/ranking.js'

if (!getApps().length) initializeApp()

const REGION = 'asia-northeast3'
const RANKING_ROOT = 'rankingService/v1'
const DEFAULT_SEASON_ID = 'season-001'

export const submitRankingRun = onCall({ region: REGION }, async (request) => {
  const uid = request.auth?.uid
  if (!uid) throw new HttpsError('unauthenticated', 'Google sign-in is required.')

  let run
  try {
    run = normalizeRun(request.data)
  } catch (error) {
    throw new HttpsError('invalid-argument', error.message)
  }

  const db = getDatabase()
  const profileSnapshot = await db.ref(`users/${uid}/profile/nickname`).get()
  const displayName = sanitizeDisplayName(profileSnapshot.val() || request.auth.token.name)
  const submittedAt = Date.now()
  const seasonId = process.env.RANKING_SEASON_ID?.trim() || DEFAULT_SEASON_ID
  let outcome = { duplicate: false }

  try {
    const result = await db.ref(RANKING_ROOT).transaction((current) => {
      outcome = applyRunSubmission(current, { uid, displayName, run, seasonId, nowMs: submittedAt })
      return outcome.state
    })
    if (!result.committed) throw new Error('Ranking transaction was not committed')
  } catch (error) {
    console.error('submitRankingRun failed', { uid, runId: run.runId, error: error.message })
    throw new HttpsError('internal', 'Unable to record this run. Please retry with the same runId.')
  }

  return { accepted: true, duplicate: outcome.duplicate, runId: run.runId }
})
