import { load as loadPlayerRecords } from './playerRecords.js'
import { getStageConfig } from './stageConfig.js'
import { compareRankingEntries, getRankingScore, getRankingScorePolicy, SCORE_TYPE } from './rankingScorePolicy.js'
import { getSavedNickname } from './userNickname.js'

export const RANKING_LIMIT = 100

const DEFAULT_PLAYER_NAME = '내 기록'

export function createRankingRows(entries = [], limit = RANKING_LIMIT) {
  // policy를 상위에서 한 번만 읽는다 — 엔트리마다 localStorage를 파싱하는 N회 읽기 방지.
  const policy = getRankingScorePolicy()
  const rankedEntries = entries
    .map((entry) => normalizeRankingEntry(entry, policy))
    .filter(Boolean)
    .sort(compareRankingEntries)
    .slice(0, limit)
    .map((entry, index) => ({
      ...entry,
      rank: index + 1,
      empty: false,
    }))

  while (rankedEntries.length < limit) {
    rankedEntries.push({
      rank: rankedEntries.length + 1,
      displayName: '',
      score: 0,
      scoreType: SCORE_TYPE,
      survivalSeconds: 0,
      stageId: '',
      stageLabel: '',
      kills: 0,
      cleared: false,
      submittedAt: '',
      local: false,
      empty: true,
    })
  }

  return rankedEntries
}

export function buildLocalPlayerRankingEntry(records = loadPlayerRecords(), profile = {}) {
  const displayName = readDisplayName(getSavedNickname(profile)) || readDisplayName(profile.displayName) || DEFAULT_PLAYER_NAME
  const candidates = [
    buildLocalStageEntry({
      displayName,
      stageId: 'stage1',
      survivalSeconds: records.bestSurvivalSeconds,
      clearCount: records.stage1Clears,
    }),
    buildLocalStageEntry({
      displayName,
      stageId: 'stage2',
      survivalSeconds: records.stage2BestSurvivalSec,
      clearCount: records.stage2Clears,
    }),
  ].filter(Boolean)

  if (candidates.length === 0) return null
  return candidates.sort(compareRankingEntries)[0]
}

export function loadLocalRankingEntries(profile = {}) {
  const localEntry = buildLocalPlayerRankingEntry(loadPlayerRecords(), profile)
  return localEntry ? [localEntry] : []
}

export function formatSurvivalTime(seconds) {
  const value = readScore(seconds)
  const minutes = Math.floor(value / 60)
  const remain = value % 60
  return `${minutes}:${String(remain).padStart(2, '0')}`
}

export function formatRankScore(score) {
  return `${readScore(score)}점`
}

function buildLocalStageEntry({ displayName, stageId, survivalSeconds, clearCount }) {
  const stage = getStageConfig(stageId)
  const safeSurvivalSeconds = readScore(survivalSeconds)
  if (safeSurvivalSeconds <= 0) return null

  const cleared = safeSurvivalSeconds >= stage.durationSec || readScore(clearCount) > 0
  return normalizeRankingEntry({
    displayName,
    stageId,
    survivalSeconds: safeSurvivalSeconds,
    stageLabel: stage.label,
    cleared,
    local: true,
  })
}

function normalizeRankingEntry(entry, policy) {
  if (!entry || typeof entry !== 'object') return null
  const stageId = readStageId(entry.stageId, entry.stageLabel)
  const stage = getStageConfig(stageId)
  const survivalSeconds = readScore(entry.survivalSeconds ?? entry.scoreSec ?? entry.bestSurvivalSeconds)
  if (survivalSeconds <= 0) return null

  const cleared = entry.cleared === true || survivalSeconds >= stage.durationSec
  // entry.score가 null이면 Number(null)=0 으로 isFinite를 통과해 0점 오분류된다.
  // null과 undefined 모두 명시적으로 제외해 누락된 score는 재계산 경로를 탄다.
  const score = entry.score != null && Number.isFinite(Number(entry.score))
    ? readScore(entry.score)
    : getRankingScore({ stageId, survivalSeconds, cleared }, policy)

  return {
    displayName: readDisplayName(entry.displayName) || DEFAULT_PLAYER_NAME,
    score,
    scoreType: SCORE_TYPE,
    survivalSeconds,
    stageId,
    stageLabel: readStageLabel(entry.stageLabel) || stage.label,
    kills: readScore(entry.kills),
    cleared,
    submittedAt: readString(entry.submittedAt),
    local: entry.local === true,
  }
}

function readStageId(stageId, stageLabel) {
  if (stageId === 'stage2' || stageLabel === 'Stage 2') return 'stage2'
  return 'stage1'
}

function readScore(value) {
  const score = Number(value)
  if (!Number.isFinite(score) || score < 0) return 0
  return Math.floor(score)
}

function readDisplayName(value) {
  if (typeof value !== 'string') return ''
  // normalizeNickname과 동일한 공백 정규화(내부 연속 공백 → 단일 공백)를 적용한다.
  // 기존: trim+slice만 하여 Firebase 엔트리와 로컬 저장 닉네임이 다르게 표시됐다.
  return value.replace(/\s+/g, ' ').trim().slice(0, 24)
}

function readStageLabel(value) {
  if (typeof value !== 'string') return ''
  return value.trim().slice(0, 16)
}

function readString(value) {
  return typeof value === 'string' ? value : ''
}
