// 밸런스 프로브 통계(§10.1 통계 규칙). 순수 함수만 둔다.
//
// - 이항 지표(클리어율·사망률): Wilson 95% CI, 시드 클러스터 부트스트랩 CI.
// - 같은 시드 짝비교: 시드별 차이를 시드 단위로 재표본(부트스트랩 10,000회)해 95% CI를 낸다.
//   한 시드에 봇 변형이 여러 개(KITE 6변형)면 시드를 클러스터로 묶어 재표본한다 — 변형끼리는 독립 표본이 아니다.
// - 연속 지표(받은 피해, 레벨, XP): 중앙값과 부트스트랩 95% CI. 짝비교는 시드별 비율(후/전)의 중앙값.
// 부트스트랩 난수는 고정 시드라 같은 입력이면 같은 CI가 나온다.

// 부트스트랩 전용 PRNG. stageBalanceProbe.js의 mulberry32와 같은 식이지만, 그 모듈을 import하면
// 게임 모듈 전체(Enemies.jsx 등)를 끌고 오므로 통계 모듈을 순수하게 두려고 여기 따로 둔다.
// 게임 스폰 난수와 무관하다(재표본 순서만 정한다).
function mulberry32(seed) {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export const BOOTSTRAP_RESAMPLES = 10_000
const Z95 = 1.959963984540054

export function mean(values) {
  if (!values.length) return NaN
  let sum = 0
  for (const value of values) sum += value
  return sum / values.length
}

export function median(values) {
  if (!values.length) return NaN
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

// 정렬된 배열의 분위수(선형 보간).
function quantileSorted(sorted, q) {
  if (!sorted.length) return NaN
  const position = (sorted.length - 1) * q
  const lower = Math.floor(position)
  const upper = Math.ceil(position)
  if (lower === upper) return sorted[lower]
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (position - lower)
}

export function wilsonInterval(successes, n, z = Z95) {
  if (!(n > 0)) return { rate: NaN, low: NaN, high: NaN }
  const p = successes / n
  const z2 = z * z
  const denominator = 1 + z2 / n
  const center = (p + z2 / (2 * n)) / denominator
  const half = (z * Math.sqrt((p * (1 - p)) / n + z2 / (4 * n * n))) / denominator
  return { rate: p, low: Math.max(0, center - half), high: Math.min(1, center + half) }
}

/**
 * 시드 클러스터 부트스트랩. clusters = 시드별 값 배열의 배열([[v1, v2, ...], ...]).
 * statistic(flatValues) 의 95% CI를 낸다. 기본 통계량은 평균.
 */
export function clusterBootstrap(clusters, { statistic = mean, resamples = BOOTSTRAP_RESAMPLES, seed = 0x5eed } = {}) {
  const nonEmpty = clusters.filter((cluster) => cluster.length > 0)
  const point = statistic(nonEmpty.flat())
  if (nonEmpty.length < 2) return { point, low: point, high: point, resamples: 0 }
  const random = mulberry32(seed)
  const estimates = new Float64Array(resamples)
  const scratch = []
  for (let r = 0; r < resamples; r += 1) {
    scratch.length = 0
    for (let i = 0; i < nonEmpty.length; i += 1) {
      const cluster = nonEmpty[Math.floor(random() * nonEmpty.length)]
      for (const value of cluster) scratch.push(value)
    }
    estimates[r] = statistic(scratch)
  }
  const sorted = Array.from(estimates).sort((a, b) => a - b)
  return { point, low: quantileSorted(sorted, 0.025), high: quantileSorted(sorted, 0.975), resamples }
}

// 이항(0/1) 결과를 시드 클러스터로 묶은 비율 CI. Wilson도 같이 낸다(독립 가정, 참고용).
export function proportionCI(clusters, options = {}) {
  const flat = clusters.flat()
  const successes = flat.reduce((sum, value) => sum + (value ? 1 : 0), 0)
  const boot = clusterBootstrap(clusters.map((c) => c.map((v) => (v ? 1 : 0))), options)
  return { n: flat.length, seeds: clusters.length, rate: boot.point, low: boot.low, high: boot.high, wilson: wilsonInterval(successes, flat.length) }
}

/**
 * 같은 시드 짝비교(이항). before/after = 시드별 0/1 배열의 배열(같은 순서·같은 변형 순서).
 * 차이(after − before) 비율의 95% CI(시드 클러스터 부트스트랩)와 McNemar 불일치 쌍 수를 낸다.
 */
export function pairedProportionDiff(beforeClusters, afterClusters, options = {}) {
  if (beforeClusters.length !== afterClusters.length) throw new Error('paired: seed count mismatch')
  const diffs = beforeClusters.map((cluster, i) => {
    const other = afterClusters[i]
    if (cluster.length !== other.length) throw new Error(`paired: variant count mismatch at seed ${i}`)
    return cluster.map((value, j) => (other[j] ? 1 : 0) - (value ? 1 : 0))
  })
  let gained = 0
  let lost = 0
  for (const cluster of diffs) for (const d of cluster) { if (d > 0) gained += 1; else if (d < 0) lost += 1 }
  const boot = clusterBootstrap(diffs, options)
  return { diff: boot.point, low: boot.low, high: boot.high, discordant: { afterOnly: gained, beforeOnly: lost } }
}

/**
 * 같은 시드 짝비교(연속). 시드별 비율(after/before, 변형 평균끼리)의 중앙값과 95% CI.
 * before가 0인 시드는 비율을 정의할 수 없어 제외하고 excluded로 센다.
 */
export function pairedRatioMedian(beforeClusters, afterClusters, options = {}) {
  if (beforeClusters.length !== afterClusters.length) throw new Error('paired: seed count mismatch')
  const ratios = []
  let excluded = 0
  for (let i = 0; i < beforeClusters.length; i += 1) {
    const b = mean(beforeClusters[i])
    const a = mean(afterClusters[i])
    if (!(b > 0)) { excluded += 1; continue }
    ratios.push([a / b])
  }
  const boot = clusterBootstrap(ratios, { ...options, statistic: median })
  return { ratio: boot.point, low: boot.low, high: boot.high, seeds: ratios.length, excluded }
}

// 연속 지표의 중앙값 CI(시드 클러스터 단위로 재표본, 통계량 = 전체 중앙값).
export function medianCI(clusters, options = {}) {
  const boot = clusterBootstrap(clusters, { ...options, statistic: median })
  return { median: boot.point, low: boot.low, high: boot.high }
}

// 판정 도우미(§10.1): 신뢰구간 전체가 [low, high] 창 안에 들어올 때만 통과.
export function ciInsideWindow(ci, low, high) {
  return Number.isFinite(ci.low) && Number.isFinite(ci.high) && ci.low >= low && ci.high <= high
}

export function ciHalfWidth(ci) {
  return (ci.high - ci.low) / 2
}
