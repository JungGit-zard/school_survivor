export const ADMIN_CONFIG_STORAGE_KEY = 'school_survivor:adminConfig'
export const ADMIN_CONFIG_SCHEMA_VERSION = 1

export const DEFAULT_ADMIN_CONFIG = Object.freeze({
  schemaVersion: ADMIN_CONFIG_SCHEMA_VERSION,
  updatedAt: '',
  balance: {
    stageDurationSec: {
      stage1: 240,
      stage2: 240,
    },
    player: {
      maxHpBonus: 0,
      speedMultiplier: 1,
    },
    rewards: {
      goldMultiplier: 1,
    },
  },
  rankingSeason: {
    seasonId: 'season-001',
    seasonName: '첫 생존 시즌',
    status: 'draft',
    startsAt: '',
    endsAt: '',
    scorePolicy: {
      stageBonus: {
        stage1: 0,
        stage2: 60,
      },
      clearBonus: 30,
    },
    rewardTiers: [
      { rankTo: 1, label: '1위', gold: 100, badge: '교장실 탈출왕' },
      { rankTo: 10, label: 'TOP 10', gold: 50, badge: '복도 생존반' },
      { rankTo: 100, label: 'TOP 100', gold: 10, badge: '개근 생존자' },
    ],
  },
})

const ALLOWED_SEASON_STATUSES = new Set(['draft', 'live', 'closed'])

export function loadAdminConfig(storage = getBrowserStorage()) {
  const raw = storage?.getItem?.(ADMIN_CONFIG_STORAGE_KEY)
  if (!raw) return normalizeAdminConfig()

  try {
    return normalizeAdminConfig(JSON.parse(raw))
  } catch {
    return normalizeAdminConfig()
  }
}

export function saveAdminConfig(config, storage = getBrowserStorage()) {
  const normalized = {
    ...normalizeAdminConfig(config),
    updatedAt: new Date().toISOString(),
  }
  storage?.setItem?.(ADMIN_CONFIG_STORAGE_KEY, JSON.stringify(normalized))
  return normalized
}

export function resetAdminConfig(storage = getBrowserStorage()) {
  storage?.removeItem?.(ADMIN_CONFIG_STORAGE_KEY)
  return normalizeAdminConfig()
}

export function getAdminBalanceConfig() {
  return loadAdminConfig().balance
}

export function getAdminRankingSeasonConfig() {
  return loadAdminConfig().rankingSeason
}

export function normalizeAdminConfig(input = {}) {
  const source = isObject(input) ? input : {}
  const balance = isObject(source.balance) ? source.balance : {}
  const duration = isObject(balance.stageDurationSec) ? balance.stageDurationSec : {}
  const player = isObject(balance.player) ? balance.player : {}
  const rewards = isObject(balance.rewards) ? balance.rewards : {}
  const season = isObject(source.rankingSeason) ? source.rankingSeason : {}
  const scorePolicy = isObject(season.scorePolicy) ? season.scorePolicy : {}
  const stageBonus = isObject(scorePolicy.stageBonus) ? scorePolicy.stageBonus : {}

  return {
    schemaVersion: ADMIN_CONFIG_SCHEMA_VERSION,
    updatedAt: readString(source.updatedAt),
    balance: {
      stageDurationSec: {
        stage1: clampInt(duration.stage1, DEFAULT_ADMIN_CONFIG.balance.stageDurationSec.stage1, 120, 420),
        stage2: clampInt(duration.stage2, DEFAULT_ADMIN_CONFIG.balance.stageDurationSec.stage2, 120, 420),
      },
      player: {
        maxHpBonus: clampInt(player.maxHpBonus, DEFAULT_ADMIN_CONFIG.balance.player.maxHpBonus, 0, 200),
        speedMultiplier: clampNumber(player.speedMultiplier, DEFAULT_ADMIN_CONFIG.balance.player.speedMultiplier, 0.5, 1.5, 2),
      },
      rewards: {
        goldMultiplier: clampNumber(rewards.goldMultiplier, DEFAULT_ADMIN_CONFIG.balance.rewards.goldMultiplier, 0, 3, 2),
      },
    },
    rankingSeason: {
      seasonId: readLimitedString(season.seasonId, 36) || DEFAULT_ADMIN_CONFIG.rankingSeason.seasonId,
      seasonName: readLimitedString(season.seasonName, 40) || DEFAULT_ADMIN_CONFIG.rankingSeason.seasonName,
      status: ALLOWED_SEASON_STATUSES.has(season.status) ? season.status : DEFAULT_ADMIN_CONFIG.rankingSeason.status,
      startsAt: readLimitedString(season.startsAt, 24),
      endsAt: readLimitedString(season.endsAt, 24),
      scorePolicy: {
        stageBonus: {
          stage1: clampInt(stageBonus.stage1, DEFAULT_ADMIN_CONFIG.rankingSeason.scorePolicy.stageBonus.stage1, 0, 200),
          stage2: clampInt(stageBonus.stage2, DEFAULT_ADMIN_CONFIG.rankingSeason.scorePolicy.stageBonus.stage2, 0, 200),
        },
        clearBonus: clampInt(scorePolicy.clearBonus, DEFAULT_ADMIN_CONFIG.rankingSeason.scorePolicy.clearBonus, 0, 200),
      },
      rewardTiers: normalizeRewardTiers(season.rewardTiers),
    },
  }
}

function normalizeRewardTiers(rewardTiers) {
  const source = Array.isArray(rewardTiers) ? rewardTiers : []
  return DEFAULT_ADMIN_CONFIG.rankingSeason.rewardTiers.map((defaultTier, index) => {
    const tier = isObject(source[index]) ? source[index] : {}
    return {
      rankTo: clampInt(tier.rankTo, defaultTier.rankTo, 1, 100),
      label: readLimitedString(tier.label, 16) || defaultTier.label,
      gold: clampInt(tier.gold, defaultTier.gold, 0, 99999),
      badge: readLimitedString(tier.badge, 32) || defaultTier.badge,
    }
  })
}

function getBrowserStorage() {
  return typeof localStorage === 'undefined' ? null : localStorage
}

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function clampInt(value, fallback, min, max) {
  return Math.round(clampNumber(value, fallback, min, max, 0))
}

function clampNumber(value, fallback, min, max, fractionDigits = 2) {
  const fallbackNumber = Number(fallback)
  const number = Number(value)
  const safe = Number.isFinite(number) ? number : fallbackNumber
  const clamped = Math.min(max, Math.max(min, safe))
  const scale = 10 ** fractionDigits
  return Math.round(clamped * scale) / scale
}

function readLimitedString(value, limit) {
  if (typeof value !== 'string') return ''
  return value.trim().slice(0, limit)
}

function readString(value) {
  return typeof value === 'string' ? value : ''
}
