import { useEffect, useState, useMemo } from 'react'
import { useGameStore } from '../store/useGameStore.js'
import { UPGRADE_EFFECTS, isUpgradeAvailable } from '../lib/upgrades.js'
import { WEAPON_CATALOG } from '../lib/weaponCatalog.js'
import { isUnlocked as isWeaponUnlocked } from '../lib/weaponUnlocks.js'
import { buildPlaytestSummary } from '../lib/playtestLogger.js'
import { getStageConfig } from '../lib/stageConfig.js'
import pencilIconSrc from '../assets/weapon_icon/01_wea_pencil.png.png'
import rulerIconSrc from '../assets/weapon_icon/02_wea_30ruller.png.png'
import boxCutterIconSrc from '../assets/weapon_icon/13_wea_boxcutter.svg'
import tumblerIconSrc from '../assets/weapon_icon/03_wea_tumbler.png.png'
import flaskIconSrc from '../assets/weapon_icon/04_wea_science.png.png'
import bellIconSrc from '../assets/weapon_icon/05_wea_bell.png.png'
import stunIconSrc from '../assets/weapon_icon/06_wea_stungun.png.png'
import onigiriIconSrc from '../assets/weapon_icon/07_wea_onigiri.png.png'
import missileIconSrc from '../assets/weapon_icon/08_wea_extrabattery.png.png'
import starlinkIconSrc from '../assets/weapon_icon/09_wea_starlink.png.png'
import compassBladeIconSrc from '../assets/weapon_icon/10_wea_compass.png.png'
import umbrellaIconSrc from '../assets/weapon_icon/11_wea_umb.png.png'
import eraserIconSrc from '../assets/weapon_icon/12_wea_eraser.png.png'
import chibikoIconSrc from '../assets/weapon_icon/14_wea_chibiko.svg'
import sharkMissileIconSrc from '../assets/weapon_icon/14_wea_shark_missile.svg'

const GAMEOVER_TRANSITION_MS = 1000

const damageLabel = (name, weaponKey, upgradeKey) => (w) =>
  `${name} +${UPGRADE_EFFECTS[upgradeKey].dmg} (Lv${(w[weaponKey].level ?? 1) + 1})`

const UPGRADES = [
  { key: 'acquireBoxCutter', icon: 'boxCutter', label: '커터칼 해금', desc: '전방 좁은 범위를 찌르고 옆으로 베어냄' },
  { key: 'boxCutterDamage', icon: 'boxCutter', labelFn: damageLabel('커터칼 피해', 'boxCutter', 'boxCutterDamage'), desc: '찌르기 피해 증가' },
  { key: 'boxCutterRange', icon: 'boxCutter', label: '커터칼 사거리 +', desc: '전방 찌르기 사거리 증가' },
  { key: 'pencilDamage', icon: 'pencil', labelFn: damageLabel('연필 데미지', 'pencilThrow', 'pencilDamage'), desc: '투척 연필의 공격력 증가' },
  { key: 'pencilCount', icon: 'pencil', label: '연필 발사 수 +1', desc: '동시에 날리는 연필 수 증가 (최대 4)' },
  { key: 'pencilPierce', icon: 'pencil', label: '연필 관통 +1', desc: '연필이 적을 관통 (최대 3회)' },
  { key: 'acquireBag', icon: 'ruler', label: '30cm 자 해금', desc: '가까운 적을 자 휘두르기로 방어' },
  { key: 'bagDamage', icon: 'ruler', labelFn: damageLabel('30cm 자 피해', 'schoolBag', 'bagDamage'), desc: '자 휘두르기 타격 피해 증가' },
  { key: 'bagRadius', icon: 'ruler', label: '30cm 자 사거리 +', desc: '자 휘두르기 타격 범위 증가' },
  { key: 'acquireTumbler', icon: 'tumbler', label: '텀블러 해금', desc: '플레이어 주변을 회전하는 방어 무기' },
  { key: 'tumblerCount', icon: 'tumbler', label: '텀블러 개수 +1', desc: '회전 텀블러 개수 증가 (최대 3개)' },
  { key: 'tumblerDamage', icon: 'tumbler', labelFn: damageLabel('텀블러 피해', 'tumbler', 'tumblerDamage'), desc: '회전 텀블러 접촉 피해 증가' },
  { key: 'acquireFlask', icon: 'flask', label: '플라스크 해금', desc: '밀집한 적에게 광역 폭발 투척' },
  { key: 'flaskDamage', icon: 'flask', labelFn: damageLabel('플라스크 피해', 'scienceFlask', 'flaskDamage'), desc: '폭발 피해 증가' },
  { key: 'flaskRadius', icon: 'flask', label: '플라스크 범위 +', desc: '폭발 반경 증가' },
  { key: 'acquireBell', icon: 'bell', label: '벨 해금', desc: '8방향 충격파 스킬 해금' },
  { key: 'bellDamage', icon: 'bell', labelFn: damageLabel('벨 데미지', 'bell', 'bellDamage'), desc: '충격파 공격력 증가' },
  { key: 'acquireStun', icon: 'stun', label: '전기충격 해금', desc: '체인 스턴건 스킬 해금' },
  { key: 'stunDamage', icon: 'stun', labelFn: damageLabel('전기 데미지', 'stunGun', 'stunDamage'), desc: '체인 스턴 데미지 증가' },
  { key: 'stunChain', icon: 'stun', label: '전기 연쇄 +1', desc: '연쇄 대상 수 증가 (최대 4)' },
  { key: 'acquireOnigiri', icon: 'onigiri', label: '오니기리 해금', desc: '적 사이를 튕기며 공격하는 주먹밥' },
  { key: 'onigiiriBounce', icon: 'onigiri', label: '오니기리 바운스 +1', desc: '튕기는 횟수 증가 (최대 7회)' },
  { key: 'onigiiriDamage', icon: 'onigiri', labelFn: damageLabel('오니기리 피해', 'onigiri', 'onigiiriDamage'), desc: '충돌 피해 증가' },
  { key: 'acquireMissile', icon: 'missile', label: '보조배터리 미사일 해금', desc: '먼 적 무리를 호밍 폭발로 처리' },
  { key: 'missileDamage', icon: 'missile', labelFn: damageLabel('미사일 피해', 'guidedMissile', 'missileDamage'), desc: '폭발 피해 증가' },
  { key: 'missileRadius', icon: 'missile', label: '미사일 반경 +', desc: '폭발 반경 증가 (최대 2.2)' },
  { key: 'acquireStarlink', icon: 'starlink', label: '고장난 스타링크 해금', desc: '주변에 무작위 낙뢰 발생' },
  { key: 'starlinkDamage', icon: 'starlink', labelFn: damageLabel('낙뢰 피해', 'starlink', 'starlinkDamage'), desc: '낙뢰 한 발 피해 증가' },
  { key: 'starlinkCount', icon: 'starlink', label: '낙뢰 개수 +1', desc: '동시 낙뢰 수 증가 (최대 3)' },
  { key: 'acquireCompassBlade', icon: 'compassBlade', label: '나침반 칼날 해금', desc: '플레이어를 도는 회전 칼날' },
  { key: 'compassBladeDamage', icon: 'compassBlade', labelFn: damageLabel('칼날 피해', 'compassBlade', 'compassBladeDamage'), desc: '회전 칼날 피해 증가' },
  { key: 'compassBladeCount', icon: 'compassBlade', label: '칼날 개수 +1', desc: '회전 칼날 수 증가 (최대 3)' },
  { key: 'acquireUmbrellaGuard', icon: 'umbrella', label: '우산 방어막 해금', desc: '주기적 펄스로 근접 적 밀어냄' },
  { key: 'umbrellaDamage', icon: 'umbrella', labelFn: damageLabel('방어막 피해', 'umbrellaGuard', 'umbrellaDamage'), desc: '펄스 한 회 피해 증가' },
  { key: 'umbrellaRadius', icon: 'umbrella', label: '방어막 반경 +', desc: '펄스 반경 증가' },
  { key: 'acquireEraserBomb', icon: 'eraser', label: '지우개 폭탄 해금', desc: '느린 한 방 광역 폭발' },
  { key: 'eraserDamage', icon: 'eraser', labelFn: damageLabel('폭탄 피해', 'eraserBomb', 'eraserDamage'), desc: '폭발 피해 증가' },
  { key: 'eraserRadius', icon: 'eraser', label: '폭탄 반경 +', desc: '폭발 반경 증가' },
  { key: 'acquireChibiko', icon: 'chibiko', label: '치비코 해금', desc: '뒤따라다니며 레벨1 연필을 던짐' },
  { key: 'acquireSharkMissile', icon: 'sharkMissile', label: '상어미사일 해금', desc: '가장 빽빽한 좀비 무리로 호밍 폭발' },
  { key: 'sharkMissileDamage', icon: 'sharkMissile', labelFn: damageLabel('상어미사일 피해', 'sharkMissile', 'sharkMissileDamage'), desc: '폭발 피해 증가' },
  { key: 'sharkMissileRadius', icon: 'sharkMissile', label: '상어미사일 반경 +', desc: '폭발 반경 증가' },
  { key: 'moveSpeed', icon: 'speed', label: '이동속도 +10%', desc: '플레이어 이동속도 증가' },
  { key: 'maxHealth', icon: 'health', label: '최대 체력 +20', desc: '최대 HP 및 현재 HP 증가' },
]

const UMBRELLA_UPGRADE_COPY = {
  acquireUmbrellaGuard: { label: '우산 방어막 해금', desc: '펼쳐진 우산이 회전 후 폭발' },
  umbrellaDamage: { labelFn: damageLabel('우산 폭발 피해', 'umbrellaGuard', 'umbrellaDamage'), desc: '마지막 폭발 피해 증가' },
  umbrellaRadius: { label: '우산 폭발 범위 +', desc: '폭발 범위 증가' },
}

for (const upgrade of UPGRADES) {
  if (UMBRELLA_UPGRADE_COPY[upgrade.key]) Object.assign(upgrade, UMBRELLA_UPGRADE_COPY[upgrade.key])
}

const PENCIL_UPGRADE_KEYS = new Set(['pencilDamage', 'pencilCount', 'pencilPierce'])

const WEAPON_UPGRADE_ICON_SRC = {
  pencil: pencilIconSrc,
  ruler: rulerIconSrc,
  boxCutter: boxCutterIconSrc,
  tumbler: tumblerIconSrc,
  flask: flaskIconSrc,
  bell: bellIconSrc,
  stun: stunIconSrc,
  onigiri: onigiriIconSrc,
  missile: missileIconSrc,
  starlink: starlinkIconSrc,
  compassBlade: compassBladeIconSrc,
  umbrella: umbrellaIconSrc,
  eraser: eraserIconSrc,
  chibiko: chibikoIconSrc,
  sharkMissile: sharkMissileIconSrc,
}

function resolveAssetSrc(src, depth = 0) {
  if (!src) return null
  if (typeof src === 'string') return src
  if (depth > 4) return String(src)
  if (typeof src.default === 'string') return src.default
  if (typeof src.src === 'string') return src.src
  return resolveAssetSrc(src.default ?? src.src ?? src.href, depth + 1)
}

export function getWeaponUpgradeIconSrc(type) {
  const src = WEAPON_UPGRADE_ICON_SRC[type]
  if (!src) return null
  return resolveAssetSrc(src)
}

export function limitPencilUpgradeOptions(options, random = Math.random) {
  const pencilOptions = options.filter((option) => PENCIL_UPGRADE_KEYS.has(option.key))
  if (pencilOptions.length <= 1) return options

  const selectedPencil = pencilOptions[Math.floor(random() * pencilOptions.length)]
  return [
    ...options.filter((option) => !PENCIL_UPGRADE_KEYS.has(option.key)),
    selectedPencil,
  ]
}

function getUpgradeChoiceGroupKey(option) {
  const effect = UPGRADE_EFFECTS[option.key]
  if (effect?.weapon) return `weapon:${effect.weapon}`
  return `nonWeapon:${option.key}`
}

export function limitDuplicateWeaponUpgradeOptions(options, random = Math.random) {
  const groups = new Map()
  for (const option of options) {
    const groupKey = getUpgradeChoiceGroupKey(option)
    const group = groups.get(groupKey)
    if (group) group.push(option)
    else groups.set(groupKey, [option])
  }

  const limited = []
  for (const group of groups.values()) {
    if (group.length === 1) {
      limited.push(group[0])
      continue
    }
    limited.push(group[Math.floor(random() * group.length)])
  }
  return limited
}

export function getUpgradeChoiceLabel(option, weapons = {}) {
  const effect = UPGRADE_EFFECTS[option.key]
  if (effect?.kind === 'acquire') {
    return `${WEAPON_CATALOG[effect.weapon]?.label ?? weapons[effect.weapon]?.label ?? effect.weapon} 획득`
  }
  return option.labelFn ? option.labelFn(weapons) : option.label
}

export function getUpgradeChoiceDesc(option) {
  const effect = UPGRADE_EFFECTS[option.key]
  if (effect?.kind === 'acquire') return option.desc?.replaceAll('해금', '획득') ?? ''
  return option.desc
}

function pickThree(level, weapons, player) {
  const available = UPGRADES.filter((u) => isUpgradeAvailable(UPGRADE_EFFECTS[u.key], level, weapons, player))
  const limited = limitDuplicateWeaponUpgradeOptions(available)
  const shuffled = [...limited].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, 3)
}

export function getNextUnlockPreview(phase, weapons) {
  if (phase !== 'gameover' && phase !== 'cleared') return null
  const candidates = Object.entries(UPGRADE_EFFECTS)
    .filter(([, eff]) => eff.kind === 'acquire' && !weapons[eff.weapon]?.active && isWeaponUnlocked(eff.weapon))
    .map(([key, eff]) => ({ key, weapon: eff.weapon, minLevel: eff.minLevel ?? 0 }))
    .sort((a, b) => a.minLevel - b.minLevel)
  if (candidates.length === 0) return null
  const top = candidates[0]
  const entry = UPGRADES.find((u) => u.key === top.key)
  return { ...top, icon: entry?.icon, label: weapons[top.weapon]?.label ?? WEAPON_CATALOG[top.weapon]?.label ?? top.weapon }
}

export function UpgradeIcon({ type }) {
  const imageSrc = getWeaponUpgradeIconSrc(type)
  const [imageFailed, setImageFailed] = useState(false)

  useEffect(() => {
    setImageFailed(false)
  }, [imageSrc])

  return (
    <div style={styles.iconBox}>
      {imageSrc && !imageFailed && (
        <img
          src={imageSrc}
          alt=""
          aria-hidden="true"
          draggable={false}
          style={styles.weaponIconImage}
          onError={() => setImageFailed(true)}
        />
      )}
      {(!imageSrc || imageFailed) && (
        <span data-upgrade-fallback-icon={type} style={styles.fallbackIconWrap}>
      {type === 'pencil' && (
        <div style={styles.pencilIcon}>
          <span style={styles.pencilLead} />
          <span style={styles.pencilBody} />
          <span style={styles.pencilEraser} />
        </div>
      )}
      {type === 'ruler' && (
        <div style={styles.rulerIcon}>
          <span style={styles.rulerEdge} />
          <span style={styles.rulerMarkA} />
          <span style={styles.rulerMarkB} />
          <span style={styles.rulerMarkC} />
        </div>
      )}
      {type === 'boxCutter' && (
        <div style={styles.boxCutterIcon}>
          <span style={styles.boxCutterBlade} />
          <span style={styles.boxCutterBody} />
          <span style={styles.boxCutterGrip} />
        </div>
      )}
      {type === 'flask' && (
        <div style={styles.flaskIcon}>
          <span style={styles.flaskNeck} />
          <span style={styles.flaskLiquid} />
        </div>
      )}
      {type === 'tumbler' && (
        <div style={styles.tumblerIcon}>
          <span style={styles.tumblerCap} />
        </div>
      )}
      {type === 'bell' && (
        <div style={styles.bellIcon}>
          <span style={styles.bellKnob} />
          <span style={styles.bellClapper} />
        </div>
      )}
      {type === 'stun' && (
        <div style={styles.stunIcon}>
          <span style={styles.stunBolt} />
        </div>
      )}
      {type === 'missile' && (
        <div style={styles.missileIcon}>
          <span style={styles.missileBody} />
          <span style={styles.missileNose} />
          <span style={styles.missileFlame} />
        </div>
      )}
      {type === 'starlink' && (
        <div style={styles.starlinkIcon}>
          <span style={styles.starlinkBolt} />
          <span style={styles.starlinkRingA} />
          <span style={styles.starlinkRingB} />
        </div>
      )}
      {type === 'compassBlade' && (
        <div style={styles.compassBladeIcon}>
          <span style={styles.compassBladeBlade} />
          <span style={styles.compassBladeHandle} />
        </div>
      )}
      {type === 'umbrella' && (
        <div style={styles.umbrellaIcon}>
          <span style={styles.umbrellaCanopy} />
          <span style={styles.umbrellaHandle} />
        </div>
      )}
      {type === 'eraser' && (
        <div style={styles.eraserIcon}>
          <span style={styles.eraserBody} />
          <span style={styles.eraserBand} />
        </div>
      )}
      {type === 'onigiri' && (
        <svg width="50" height="46" viewBox="0 0 50 46" style={{ display: 'block', margin: '0 auto' }}>
          {/* 두꺼운 검은 외곽선 */}
          <path d="M25 1 C20 8 2 30 2 37 Q2 45 10 45 H40 Q48 45 48 37 C48 30 30 8 25 1 Z" fill="#111" />
          {/* 흰 쌀 본체 */}
          <path d="M25 5 C20 12 6 31 6 37 Q6 43 11 43 H39 Q44 43 44 37 C44 31 30 12 25 5 Z" fill="#f8f7f0" />
          {/* 쌀알 타원 질감 — 크고 둥글게 */}
          <ellipse cx="25" cy="9"  rx="5.5" ry="3.8" fill="#e8e6d6" />
          <ellipse cx="17" cy="16" rx="5.8" ry="4.0" fill="#e8e6d6" />
          <ellipse cx="33" cy="15" rx="5.5" ry="3.8" fill="#e8e6d6" />
          <ellipse cx="12" cy="25" rx="5.2" ry="3.8" fill="#e8e6d6" />
          <ellipse cx="25" cy="23" rx="6.0" ry="4.2" fill="#e8e6d6" />
          <ellipse cx="38" cy="24" rx="4.8" ry="3.5" fill="#e8e6d6" />
          <ellipse cx="9"  cy="33" rx="4.0" ry="2.9" fill="#e8e6d6" />
          <ellipse cx="21" cy="30" rx="5.0" ry="3.6" fill="#e8e6d6" />
          <ellipse cx="33" cy="30" rx="4.8" ry="3.4" fill="#e8e6d6" />
          <ellipse cx="41" cy="33" rx="3.8" ry="2.8" fill="#e8e6d6" />
          {/* 김 조각 — 아래 중앙에만 붙임 */}
          <rect x="15" y="29" width="20" height="14" rx="2.5" fill="#111" />
          <rect x="17" y="31" width="16" height="11" rx="2" fill="#192e13" />
          {/* 김 질감 */}
          <line x1="19" y1="34" x2="31" y2="32" stroke="#36542c" strokeWidth="1.2" />
          <line x1="20" y1="39" x2="31" y2="37" stroke="#36542c" strokeWidth="1.0" />
        </svg>
      )}
      {type === 'speed' && (
        <div style={styles.speedIcon}>
          <span style={styles.speedLine1} />
          <span style={styles.speedLine2} />
          <span style={styles.speedLine3} />
        </div>
      )}
      {type === 'health' && (
        <div style={styles.healthIcon}>
          <span style={styles.healthH} />
          <span style={styles.healthV} />
        </div>
      )}
        </span>
      )}
    </div>
  )
}

export default function HUD({ onOpenCoinShop, onGoToTitle }) {
  const player    = useGameStore((s) => s.player)
  const weapons   = useGameStore((s) => s.weapons)
  const phase     = useGameStore((s) => s.phase)
  const pauseSource = useGameStore((s) => s.pauseSource)
  const elapsed   = useGameStore((s) => s.elapsedMs)
  const currentStageId = useGameStore((s) => s.currentStageId)
  const bossSpawned = useGameStore((s) => s.bossSpawned)
  const goldSession = useGameStore((s) => s.goldSession)
  const goldTotal   = useGameStore((s) => s.goldTotal)
  const recentMilestone = useGameStore((s) => s.recentMilestone)
  const newlyUnlockedWeaponIds = useGameStore((s) => s.newlyUnlockedWeaponIds)
  const clearMilestone = useGameStore((s) => s.clearMilestone)
  const levelUpChoiceSerial = useGameStore((s) => s.levelUpChoiceSerial)
  const applyUpgrade      = useGameStore((s) => s.applyUpgrade)
  const resumeFromLevelup = useGameStore((s) => s.resumeFromLevelup)
  const resetGame         = useGameStore((s) => s.resetGame)
  const togglePause       = useGameStore((s) => s.togglePause)
  const resumeGame        = useGameStore((s) => s.resumeGame)

  const mins = String(Math.floor(elapsed / 60000)).padStart(2, '0')
  const secs = String(Math.floor((elapsed % 60000) / 1000)).padStart(2, '0')
  const stageConfig = getStageConfig(currentStageId)

  // phase가 'levelup'으로 바뀌는 순간 한 번만 선택지를 고정한다.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const choices = useMemo(
    () => phase === 'levelup' ? pickThree(player.level, weapons, player) : [],
    [phase, player.level, weapons, levelUpChoiceSerial],
  )
  const lowHp   = player.hp / player.maxHp < 0.3
  const isGameover = phase === 'gameover'
  const [gameoverModalReady, setGameoverModalReady] = useState(false)

  // 종료 화면 "다음 해금 가능 무기" 미리보기 — minLevel이 가장 낮은 미해금 무기 1개.
  const nextUnlock = useMemo(() => getNextUnlockPreview(phase, weapons), [phase, weapons])

  // 플레이테스트 로그 복사 (게임오버/클리어 모달의 "📋 로그 복사" 버튼).
  const [copyStatus, setCopyStatus] = useState('idle')
  const copyPlaytestLog = async () => {
    try {
      const summary = buildPlaytestSummary()
      await navigator.clipboard.writeText(JSON.stringify(summary, null, 2))
      setCopyStatus('copied')
      setTimeout(() => setCopyStatus('idle'), 2000)
    } catch {
      setCopyStatus('error')
      setTimeout(() => setCopyStatus('idle'), 2000)
    }
  }

  const bossWarning = useMemo(() => {
    if (bossSpawned || phase !== 'playing') return null
    const elapsedSec = elapsed / 1000
    const warningSec = stageConfig.bossWarningSec ?? 240
    if (elapsedSec < warningSec - 3 || elapsedSec >= warningSec) return null
    return Math.max(1, Math.ceil(warningSec - elapsedSec))
  }, [bossSpawned, elapsed, phase, stageConfig.bossWarningSec])

  const e04IntroWarning = useMemo(() => {
    if (currentStageId !== 'stage2' || phase !== 'playing') return null
    const introSec = stageConfig.e04IntroSec ?? 90
    const elapsedSec = elapsed / 1000
    if (elapsedSec < introSec - 3 || elapsedSec >= introSec) return null
    return Math.max(1, Math.ceil(introSec - elapsedSec))
  }, [currentStageId, elapsed, phase, stageConfig.e04IntroSec])

  useEffect(() => {
    if (!recentMilestone) return undefined
    const timer = setTimeout(clearMilestone, 2000)
    return () => clearTimeout(timer)
  }, [clearMilestone, recentMilestone])

  useEffect(() => {
    if (!isGameover) {
      setGameoverModalReady(false)
      return undefined
    }

    setGameoverModalReady(false)
    const timer = setTimeout(() => setGameoverModalReady(true), GAMEOVER_TRANSITION_MS)
    return () => clearTimeout(timer)
  }, [isGameover])

  // CSS 키프레임 주입. 최초 1회만 추가한다.
  useEffect(() => {
    const style = document.createElement('style')
    style.id = 'hud-keyframes'
    style.textContent = `
      @keyframes hpBlink { 0%,100%{opacity:1} 50%{opacity:0.25} }
      @keyframes vignettePulse { 0%,100%{opacity:0.40} 50%{opacity:0.65} }
      @keyframes milestonePop { 0%{transform:translate(-50%,-8px);opacity:0} 16%,82%{transform:translate(-50%,0);opacity:1} 100%{transform:translate(-50%,-8px);opacity:0} }
      @keyframes bossPulse { 0%,100%{transform:translate(-50%,-50%) scale(1);opacity:0.95} 50%{transform:translate(-50%,-50%) scale(1.06);opacity:1} }
      @keyframes gameoverGrayscaleFade {
        0%{opacity:0;backdrop-filter:grayscale(0);-webkit-backdrop-filter:grayscale(0)}
        100%{opacity:1;backdrop-filter:grayscale(1);-webkit-backdrop-filter:grayscale(1)}
      }
    `
    // StrictMode에서 cleanup이 먼저 실행돼 style이 제거될 수 있으므로
    // 항상 교체(remove → append) 방식으로 주입한다.
    document.getElementById('hud-keyframes')?.remove()
    document.head.appendChild(style)
    return () => { if (document.getElementById('hud-keyframes') === style) style.remove() }
  }, [])

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.code !== 'KeyP' || event.repeat) return
      togglePause()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [togglePause])

  return (
    <div style={styles.root}>
      {/* 저체력 비네트 */}
      {lowHp && (
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'radial-gradient(ellipse at center, transparent 40%, rgba(200,0,0,0.55) 100%)',
          animation: 'vignettePulse 0.8s ease-in-out infinite',
        }} />
      )}
      {recentMilestone && (
        <div style={styles.milestoneToast}>
          <span style={styles.milestoneLabel}>{recentMilestone.label}</span>
          <span style={styles.milestoneGold}>+{recentMilestone.gold} 골드</span>
        </div>
      )}
      {bossWarning != null && (
        <div style={styles.bossWarning}>
          <div style={styles.bossWarningLabel}>보스 출현</div>
          <div style={styles.bossWarningCount}>{bossWarning}</div>
        </div>
      )}
      {e04IntroWarning != null && (
        <div style={styles.projectileWarning}>
          <div style={styles.projectileWarningLabel}>복도 탄환 주의</div>
          <div style={styles.projectileWarningCount}>{e04IntroWarning}</div>
        </div>
      )}
      {/* Top bar */}
      <div style={styles.topBar}>
        <div style={styles.stageChip}>{stageConfig.label}</div>
        <div style={styles.timer}>{mins}:{secs}</div>
        <div style={styles.level}>Lv.{player.level}</div>
      </div>

      {/* HP bar */}
      <div style={styles.hpRow}>
        <span style={styles.hpLabel}>HP</span>
        <div style={styles.barBg}>
          <div style={{
            ...styles.barFill,
            width: `${(player.hp / player.maxHp) * 100}%`,
            background: lowHp ? '#ff2030' : '#e03040',
            animation: lowHp ? 'hpBlink 0.6s ease-in-out infinite' : 'none',
          }} />
        </div>
        <span style={styles.hpNum}>{player.hp}/{player.maxHp}</span>
      </div>

      {/* XP bar */}
      <div style={styles.xpRow}>
        <div style={styles.barBg}>
          <div style={{ ...styles.barFill, width: `${(player.xp / player.xpToNext) * 100}%`, background: '#60d060' }} />
        </div>
      </div>

      {/* Active weapons */}
      <div style={styles.weaponRow}>
        {Object.entries(weapons).filter(([, w]) => w.active).map(([k, w]) => (
          <div key={k} style={styles.weaponChip}>{w.label}</div>
        ))}
      </div>

      {/* Modals */}
      <div style={styles.goldChip}>
        <span style={styles.goldDot} />
        <span style={styles.goldNum}>{goldSession}</span>
      </div>

      {(phase === 'playing' || phase === 'paused') && (
        <div style={styles.topLeftControls}>
          <button type="button" style={styles.pauseButton} onClick={togglePause}>
          {phase === 'paused' ? '▶' : 'Ⅱ'}
          </button>
          <button type="button" style={styles.quickRestartButton} onClick={() => resetGame(currentStageId)} aria-label="Restart" title="Restart">
            R
          </button>
        </div>
      )}

      {phase === 'levelup' && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <h2 style={styles.modalTitle}>레벨 업! Lv.{player.level}</h2>
            <div style={styles.choices}>
              {choices.map((c) => (
                <button key={c.key} style={styles.choiceBtn} onClick={() => applyUpgrade(c.key)}>
                  <UpgradeIcon type={c.icon} />
                  <div style={styles.choiceLabel}>{getUpgradeChoiceLabel(c, weapons)}</div>
                  <div style={styles.choiceDesc}>{getUpgradeChoiceDesc(c)}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {isGameover && (
        <div
          data-testid="gameover-grayscale-transition"
          aria-hidden="true"
          style={styles.gameoverGrayscaleTransition}
        />
      )}

      {isGameover && gameoverModalReady && (
        <div data-testid="gameover-result-overlay" style={styles.overlay}>
          <div style={styles.modal}>
            <h2 style={{ ...styles.modalTitle, color: '#ff4060' }}>GAME OVER</h2>
            <p style={{ color: '#ccc', marginBottom: 8 }}>생존 시간: {mins}:{secs}</p>
            <p style={{ color: '#ffd040', marginBottom: nextUnlock || (newlyUnlockedWeaponIds?.length > 0) ? 12 : 20 }}>획득 골드: {goldSession} (누적 {goldTotal})</p>
            {newlyUnlockedWeaponIds?.length > 0 && (
              <div style={styles.newlyUnlocked}>
                <span style={styles.newlyUnlockedLabel}>🎉 새 무기 해금!</span>
                {newlyUnlockedWeaponIds.map((id) => (
                  <div key={id} style={styles.newlyUnlockedItem}>
                    {WEAPON_CATALOG[id]?.label ?? id}
                  </div>
                ))}
                <div style={styles.newlyUnlockedHint}>다음 판부터 카드에 등장합니다</div>
              </div>
            )}
            {nextUnlock && (
              <div style={styles.nextUnlock}>
                <span style={styles.nextUnlockLabel}>다음에 만날 무기</span>
                <div style={styles.nextUnlockBody}>
                  <div style={styles.nextUnlockSilhouette}>
                    <UpgradeIcon type={nextUnlock.icon} />
                  </div>
                  <div style={styles.nextUnlockText}>
                    <div style={styles.nextUnlockName}>???</div>
                    <div style={styles.nextUnlockHint}>Lv.{nextUnlock.minLevel} 도달 시 획득 가능</div>
                  </div>
                </div>
              </div>
            )}
            <div style={styles.modalButtons}>
              <button style={styles.copyBtn} onClick={copyPlaytestLog}>
                {copyStatus === 'copied' ? '✓ 복사됨' : copyStatus === 'error' ? '복사 실패' : '📋 로그 복사'}
              </button>
              <button style={styles.titleBtn} onClick={onGoToTitle}>타이틀로</button>
              <button style={styles.shopBtn} onClick={onOpenCoinShop}>코인상점</button>
              <button style={styles.restartBtn} onClick={() => resetGame(currentStageId)}>다시 시작</button>
            </div>
          </div>
        </div>
      )}

      {phase === 'paused' && (
        <div style={styles.overlay}>
          <div style={styles.pausePanel}>
            <h2 style={styles.modalTitle}>
              {pauseSource === 'auto' ? '자리를 비우셨네요' : 'PAUSED'}
            </h2>
            {pauseSource === 'auto' && (
              <p style={styles.pauseMessage}>돌아오면 바로 이어서 플레이할 수 있어요.</p>
            )}
            <button style={styles.restartBtn} onClick={resumeGame}>
              {pauseSource === 'auto' ? '이어하기' : '계속하기'}
            </button>
          </div>
        </div>
      )}

      {phase === 'cleared' && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <h2 style={{ ...styles.modalTitle, color: '#ffd040' }}>{currentStageId === 'stage2' ? 'STAGE 2 CLEAR!' : 'STAGE CLEAR!'}</h2>
            <p style={{ color: '#ccc', marginBottom: 8 }}>클리어 시간: {mins}:{secs}</p>
            <p style={{ color: '#ffd040', marginBottom: nextUnlock || (newlyUnlockedWeaponIds?.length > 0) ? 12 : 20 }}>획득 골드: {goldSession} (누적 {goldTotal})</p>
            {newlyUnlockedWeaponIds?.length > 0 && (
              <div style={styles.newlyUnlocked}>
                <span style={styles.newlyUnlockedLabel}>🎉 새 무기 해금!</span>
                {newlyUnlockedWeaponIds.map((id) => (
                  <div key={id} style={styles.newlyUnlockedItem}>
                    {WEAPON_CATALOG[id]?.label ?? id}
                  </div>
                ))}
                <div style={styles.newlyUnlockedHint}>다음 판부터 카드에 등장합니다</div>
              </div>
            )}
            {nextUnlock && (
              <div style={styles.nextUnlock}>
                <span style={styles.nextUnlockLabel}>다음에 만날 무기</span>
                <div style={styles.nextUnlockBody}>
                  <div style={styles.nextUnlockSilhouette}>
                    <UpgradeIcon type={nextUnlock.icon} />
                  </div>
                  <div style={styles.nextUnlockText}>
                    <div style={styles.nextUnlockName}>???</div>
                    <div style={styles.nextUnlockHint}>Lv.{nextUnlock.minLevel} 도달 시 획득 가능</div>
                  </div>
                </div>
              </div>
            )}
            <div style={styles.modalButtons}>
              <button style={styles.copyBtn} onClick={copyPlaytestLog}>
                {copyStatus === 'copied' ? '✓ 복사됨' : copyStatus === 'error' ? '복사 실패' : '📋 로그 복사'}
              </button>
              <button style={styles.titleBtn} onClick={onGoToTitle}>타이틀로</button>
              <button style={styles.shopBtn} onClick={onOpenCoinShop}>코인상점</button>
              <button style={styles.restartBtn} onClick={() => resetGame(currentStageId)}>다시 시작</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const styles = {
  root: {
    position: 'fixed', inset: 0, pointerEvents: 'none',
    fontFamily: "'Segoe UI', sans-serif", userSelect: 'none',
  },
  topBar: {
    position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)',
    display: 'flex', gap: 24, alignItems: 'center',
    pointerEvents: 'auto',
  },
  milestoneToast: {
    position: 'absolute',
    top: 58,
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    background: 'rgba(26, 18, 8, 0.9)',
    border: '1.5px solid #ffd040',
    borderRadius: 8,
    padding: '7px 12px',
    boxShadow: '0 3px 10px rgba(0,0,0,0.45)',
    animation: 'milestonePop 2s ease-in-out forwards',
    pointerEvents: 'auto',
  },
  milestoneLabel: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 800,
  },
  milestoneGold: {
    color: '#ffd040',
    fontSize: 13,
    fontWeight: 900,
  },
  bossWarning: {
    position: 'absolute',
    left: '50%',
    top: '43%',
    transform: 'translate(-50%, -50%)',
    minWidth: 158,
    textAlign: 'center',
    background: 'rgba(42, 0, 8, 0.82)',
    border: '2px solid #ff3048',
    borderRadius: 10,
    padding: '14px 18px',
    boxShadow: '0 0 22px rgba(255, 48, 72, 0.45)',
    animation: 'bossPulse 0.8s ease-in-out infinite',
    pointerEvents: 'auto',
  },
  bossWarningLabel: {
    color: '#ffd8d8',
    fontSize: 16,
    fontWeight: 900,
  },
  bossWarningCount: {
    color: '#ffffff',
    fontSize: 48,
    fontWeight: 900,
    lineHeight: 1,
    marginTop: 4,
  },
  projectileWarning: {
    position: 'absolute',
    left: '50%',
    top: '35%',
    transform: 'translate(-50%, -50%)',
    minWidth: 170,
    textAlign: 'center',
    background: 'rgba(6, 38, 40, 0.82)',
    border: '2px solid #54e0c8',
    borderRadius: 10,
    padding: '11px 16px',
    boxShadow: '0 0 20px rgba(84, 224, 200, 0.35)',
    animation: 'bossPulse 0.8s ease-in-out infinite',
    pointerEvents: 'auto',
  },
  projectileWarningLabel: {
    color: '#d8fffa',
    fontSize: 15,
    fontWeight: 900,
  },
  projectileWarningCount: {
    color: '#ffffff',
    fontSize: 40,
    fontWeight: 900,
    lineHeight: 1,
    marginTop: 3,
  },
  stageChip: {
    color: '#d8fffa',
    fontSize: 13,
    fontWeight: 900,
    textShadow: '0 2px 6px #000',
  },
  timer: { color: '#fff', fontSize: 28, fontWeight: 700, textShadow: '0 2px 6px #000' },
  level: { color: '#ffd040', fontSize: 20, fontWeight: 700, textShadow: '0 2px 6px #000' },
  goldChip: {
    position: 'absolute',
    top: 16, right: 16,
    display: 'flex', alignItems: 'center', gap: 6,
    background: 'rgba(20,16,8,0.78)',
    border: '1.5px solid #b88322',
    borderRadius: 14,
    padding: '4px 10px',
    boxShadow: '0 2px 6px rgba(0,0,0,0.5)',
    pointerEvents: 'auto',
  },
  goldDot: {
    width: 14, height: 14, borderRadius: '50%',
    background: 'radial-gradient(circle at 35% 35%, #fff5b0 0%, #ffd23c 55%, #aa7000 100%)',
    border: '1.5px solid #5b3b08',
    flexShrink: 0,
  },
  goldNum: { color: '#ffe18a', fontSize: 16, fontWeight: 800, textShadow: '0 2px 4px #000' },
  hpRow: {
    position: 'absolute', bottom: 52, left: '50%', transform: 'translateX(-50%)',
    display: 'flex', alignItems: 'center', gap: 8,
    width: 'calc(100% - 48px)', maxWidth: 320,
    pointerEvents: 'auto',
  },
  hpLabel: { color: '#fff', fontSize: 13, fontWeight: 700, width: 22 },
  hpNum:   { color: '#fff', fontSize: 12, width: 60, textAlign: 'right' },
  xpRow: {
    position: 'absolute', bottom: 32, left: '50%', transform: 'translateX(-50%)',
    width: 'calc(100% - 48px)', maxWidth: 320,
    pointerEvents: 'auto',
  },
  barBg: {
    flex: 1, height: 10, background: '#333', borderRadius: 5, overflow: 'hidden',
  },
  barFill: { height: '100%', borderRadius: 5, transition: 'width 0.15s' },
  weaponRow: {
    position: 'absolute', bottom: 72, left: 16,
    display: 'flex', flexDirection: 'column', gap: 4,
    pointerEvents: 'auto',
  },
  weaponChip: {
    background: 'rgba(0,0,0,0.55)', color: '#fff',
    fontSize: 12, padding: '3px 8px', borderRadius: 4, border: '1px solid #555',
  },
  overlay: {
    position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    pointerEvents: 'auto',
  },
  gameoverGrayscaleTransition: {
    position: 'absolute',
    inset: 0,
    background: 'rgba(8, 8, 10, 0.08)',
    backdropFilter: 'grayscale(1)',
    WebkitBackdropFilter: 'grayscale(1)',
    animation: `gameoverGrayscaleFade ${GAMEOVER_TRANSITION_MS}ms ease forwards`,
    pointerEvents: 'none',
  },
  modal: {
    background: '#1a1028', border: '2px solid #6040a0',
    borderRadius: 16, padding: '24px 16px', textAlign: 'center',
    width: 'calc(100% - 28px)', maxWidth: 440, boxSizing: 'border-box',
  },
  modalTitle: { color: '#fff', margin: '0 0 24px', fontSize: 26, fontWeight: 800 },
  pausePanel: {
    background: 'rgba(20, 14, 32, 0.82)', border: '2px solid #8060c0',
    borderRadius: 12, padding: '28px 44px', textAlign: 'center',
  },
  pauseMessage: {
    color: '#d8d0e8',
    fontSize: 14,
    lineHeight: 1.5,
    margin: '-12px 0 20px',
    maxWidth: 220,
  },
  choices: { display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' },
  choiceBtn: {
    background: '#2a1840', border: '2px solid #8060c0', borderRadius: 10,
    color: '#fff', cursor: 'pointer', padding: '10px 10px 12px',
    width: 'min(118px, 31%)', minWidth: 104,
    textAlign: 'center', transition: 'background 0.15s',
  },
  topLeftControls: {
    position: 'absolute',
    top: 14,
    left: 14,
    display: 'flex',
    gap: 8,
    pointerEvents: 'auto',
  },
  pauseButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    border: '1.5px solid rgba(255,255,255,0.55)',
    background: 'rgba(20,16,8,0.72)',
    color: '#fff',
    fontSize: 18,
    fontWeight: 800,
    lineHeight: '36px',
    textAlign: 'center',
    pointerEvents: 'auto',
    cursor: 'pointer',
    boxShadow: '0 2px 6px rgba(0,0,0,0.45)',
  },
  quickRestartButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    border: '1.5px solid rgba(255,255,255,0.55)',
    background: 'rgba(20,16,8,0.72)',
    color: '#fff',
    fontSize: 20,
    fontWeight: 800,
    lineHeight: '36px',
    textAlign: 'center',
    pointerEvents: 'auto',
    cursor: 'pointer',
    boxShadow: '0 2px 6px rgba(0,0,0,0.45)',
  },
  iconBox: {
    position: 'relative', width: 62, height: 54, margin: '0 auto 10px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  fallbackIconWrap: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
  },
  weaponIconImage: {
    width: 54,
    height: 54,
    objectFit: 'contain',
    display: 'block',
    filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.5))',
    userSelect: 'none',
  },
  pencilIcon: { position: 'relative', width: 46, height: 12, transform: 'rotate(-22deg)' },
  pencilLead: {
    position: 'absolute', left: 0, top: 1, width: 0, height: 0,
    borderTop: '5px solid transparent', borderBottom: '5px solid transparent', borderRight: '10px solid #1c1c22',
  },
  pencilBody: {
    position: 'absolute', left: 9, top: 1, width: 27, height: 10,
    background: '#ffcf24', border: '2px solid #111', boxSizing: 'border-box',
  },
  pencilEraser: {
    position: 'absolute', right: 0, top: 1, width: 10, height: 10,
    background: '#f05a78', border: '2px solid #111', boxSizing: 'border-box',
  },
  rulerIcon: {
    position: 'relative', width: 12, height: 46, background: '#f6dd59',
    border: '3px solid #111', borderRadius: 2, transform: 'rotate(-34deg)',
  },
  rulerEdge: {
    position: 'absolute', right: 1, top: 4, width: 2, height: 34, background: '#fff2a3',
  },
  rulerMarkA: {
    position: 'absolute', left: 0, top: 8, width: 8, height: 2, background: '#111',
  },
  rulerMarkB: {
    position: 'absolute', left: 0, top: 20, width: 6, height: 2, background: '#111',
  },
  rulerMarkC: {
    position: 'absolute', left: 0, top: 32, width: 8, height: 2, background: '#111',
  },
  boxCutterIcon: { position: 'relative', width: 42, height: 32, transform: 'rotate(-28deg)' },
  boxCutterBlade: {
    position: 'absolute', right: 0, top: 4,
    display: 'block', width: 20, height: 9,
    background: '#dce6ee', border: '2px solid #111', boxSizing: 'border-box',
  },
  boxCutterBody: {
    position: 'absolute', left: 0, top: 12,
    display: 'block', width: 32, height: 14,
    background: '#ffc928', border: '2px solid #111', borderRadius: 3, boxSizing: 'border-box',
  },
  boxCutterGrip: {
    position: 'absolute', left: 6, top: 16,
    display: 'block', width: 20, height: 4, background: '#2e3747',
  },
  flaskIcon: {
    position: 'relative', width: 34, height: 31, background: '#9be9ff',
    border: '3px solid #111', clipPath: 'polygon(38% 0, 62% 0, 62% 34%, 92% 100%, 8% 100%, 38% 34%)',
  },
  flaskNeck: {
    position: 'absolute', left: 13, top: 0, width: 8, height: 14, background: '#9be9ff',
  },
  flaskLiquid: {
    position: 'absolute', left: 5, right: 5, bottom: 4, height: 10, background: '#62e676',
  },
  tumblerIcon: {
    position: 'relative', width: 19, height: 42, background: '#ff7a3d',
    border: '3px solid #111', borderRadius: '7px 7px 9px 9px', transform: 'rotate(-24deg)',
  },
  tumblerCap: {
    position: 'absolute', left: -2, top: -6, width: 23, height: 8,
    background: '#f4f4f4', border: '3px solid #111', borderRadius: 5,
  },
  bellIcon: {
    width: 34, height: 30, background: '#ffd040', border: '3px solid #111',
    borderRadius: '50% 50% 8px 8px', position: 'relative', marginTop: 6,
  },
  bellKnob: {
    position: 'absolute', top: -9, left: '50%', transform: 'translateX(-50%)',
    width: 9, height: 9, background: '#ffd040', border: '3px solid #111', borderRadius: '50%',
    display: 'block',
  },
  bellClapper: {
    position: 'absolute', bottom: -8, left: '50%', transform: 'translateX(-50%)',
    width: 8, height: 8, background: '#111', borderRadius: '50%', display: 'block',
  },
  stunIcon: {
    position: 'relative', width: 22, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  stunBolt: {
    display: 'block', width: 22, height: 38,
    background: '#ffe65c', border: '2.5px solid #111',
    clipPath: 'polygon(65% 0%, 100% 0%, 38% 50%, 82% 50%, 8% 100%, 28% 52%, 0% 52%)',
  },
  speedIcon: {
    display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 5,
    width: 38, height: 38,
  },
  speedLine1: {
    display: 'block', width: 36, height: 5,
    background: '#8df0ff', border: '2px solid #111', borderRadius: 3,
  },
  speedLine2: {
    display: 'block', width: 26, height: 5, marginLeft: 10,
    background: '#8df0ff', border: '2px solid #111', borderRadius: 3,
  },
  speedLine3: {
    display: 'block', width: 16, height: 5, marginLeft: 20,
    background: '#8df0ff', border: '2px solid #111', borderRadius: 3,
  },
  healthIcon: {
    position: 'relative', width: 34, height: 34,
  },
  healthH: {
    position: 'absolute', top: '50%', left: 0, transform: 'translateY(-50%)',
    display: 'block', width: 34, height: 12,
    background: '#e03040', border: '2.5px solid #111', borderRadius: 2, boxSizing: 'border-box',
  },
  healthV: {
    position: 'absolute', left: '50%', top: 0, transform: 'translateX(-50%)',
    display: 'block', width: 12, height: 34,
    background: '#e03040', border: '2.5px solid #111', borderRadius: 2, boxSizing: 'border-box',
  },
  missileIcon: { position: 'relative', width: 36, height: 36 },
  missileBody: {
    position: 'absolute', left: '50%', top: '50%',
    transform: 'translate(-50%, -50%) rotate(-45deg)',
    display: 'block', width: 8, height: 22,
    background: '#8a90b8', border: '2px solid #111', borderRadius: 3, boxSizing: 'border-box',
  },
  missileNose: {
    position: 'absolute', left: '50%', top: 3,
    transform: 'translateX(-50%) rotate(-45deg)',
    display: 'block', width: 0, height: 0,
    borderLeft: '5px solid transparent', borderRight: '5px solid transparent',
    borderBottom: '9px solid #d0d8f0',
  },
  missileFlame: {
    position: 'absolute', left: '50%', bottom: 3,
    transform: 'translateX(-50%) rotate(-45deg)',
    display: 'block', width: 0, height: 0,
    borderLeft: '4px solid transparent', borderRight: '4px solid transparent',
    borderTop: '8px solid #ff7020',
  },
  starlinkIcon: { position: 'relative', width: 36, height: 36 },
  starlinkBolt: {
    position: 'absolute', left: '50%', top: 2,
    transform: 'translateX(-50%)',
    display: 'block', width: 5, height: 28,
    background: 'linear-gradient(to bottom, #88eeff 0%, #ffffff 40%, #44aaff 100%)',
    border: '1.5px solid #111',
    borderRadius: 2, boxSizing: 'border-box',
    boxShadow: '0 0 5px #44eeff',
  },
  starlinkRingA: {
    position: 'absolute', left: '50%', bottom: 5,
    transform: 'translateX(-50%)',
    display: 'block', width: 18, height: 18,
    borderRadius: '50%',
    border: '2px solid #44eeff',
    opacity: 0.7,
    boxSizing: 'border-box',
  },
  starlinkRingB: {
    position: 'absolute', left: '50%', bottom: 2,
    transform: 'translateX(-50%)',
    display: 'block', width: 28, height: 28,
    borderRadius: '50%',
    border: '1.5px solid #226688',
    opacity: 0.45,
    boxSizing: 'border-box',
  },
  // ── compassBlade icon (회전 칼날) ──
  compassBladeIcon: { position: 'relative', width: 36, height: 36 },
  compassBladeBlade: {
    position: 'absolute', left: '50%', top: '50%',
    transform: 'translate(-50%, -50%) rotate(35deg)',
    display: 'block', width: 28, height: 5,
    background: 'linear-gradient(to right, #b7c0c7 0%, #f0f3f5 50%, #b7c0c7 100%)',
    border: '1.5px solid #111',
    borderRadius: 2, boxSizing: 'border-box',
  },
  compassBladeHandle: {
    position: 'absolute', left: '50%', top: '50%',
    transform: 'translate(-50%, -50%) rotate(35deg) translateX(-9px)',
    display: 'block', width: 7, height: 7,
    background: '#71353f',
    border: '1.5px solid #111',
    borderRadius: 2, boxSizing: 'border-box',
  },
  // ── umbrella icon (우산 방어막) ──
  umbrellaIcon: { position: 'relative', width: 36, height: 36 },
  umbrellaCanopy: {
    position: 'absolute', left: 4, top: 5,
    display: 'block', width: 28, height: 14,
    background: '#351740',
    borderRadius: '50% 50% 0 0 / 100% 100% 0 0',
    border: '1.5px solid #111',
    boxSizing: 'border-box',
  },
  umbrellaHandle: {
    position: 'absolute', left: '50%', top: 18,
    transform: 'translateX(-50%)',
    display: 'block', width: 3, height: 14,
    background: '#4b2933',
    border: '1.5px solid #111',
    borderRadius: '0 0 4px 4px',
    boxSizing: 'border-box',
  },
  // ── newly-unlocked weapon alert (gameover/cleared modal) ──
  newlyUnlocked: {
    marginBottom: 14,
    padding: '10px 12px',
    background: 'rgba(233, 144, 57, 0.16)',
    border: '1.5px solid #e99039',
    borderRadius: 8,
    textAlign: 'center',
  },
  newlyUnlockedLabel: {
    display: 'block',
    color: '#f4e27b',
    fontSize: 13,
    fontWeight: 700,
    marginBottom: 6,
  },
  newlyUnlockedItem: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 800,
    margin: '2px 0',
  },
  newlyUnlockedHint: {
    color: '#c9cb9f',
    fontSize: 11,
    marginTop: 6,
  },
  // ── eraser icon (지우개 폭탄) ──
  eraserIcon: { position: 'relative', width: 36, height: 36 },
  eraserBody: {
    position: 'absolute', left: 3, top: 11,
    display: 'block', width: 30, height: 14,
    background: '#cea19d',
    border: '1.5px solid #111',
    borderRadius: 3, boxSizing: 'border-box',
  },
  eraserBand: {
    position: 'absolute', left: 3, top: 16,
    display: 'block', width: 30, height: 4,
    background: '#4f1b30',
    boxSizing: 'border-box',
  },
  choiceLabel: { fontSize: 14, fontWeight: 700, marginBottom: 6 },
  choiceDesc:  { fontSize: 11, color: '#bbb', lineHeight: 1.4 },
  restartBtn: {
    background: '#4030a0', border: 'none', borderRadius: 8,
    color: '#fff', fontSize: 16, fontWeight: 700, cursor: 'pointer',
    padding: '12px 32px',
  },
  titleBtn: {
    background: 'transparent', border: '1.5px solid #6080c0', borderRadius: 8,
    color: '#a0b8e8', fontSize: 15, fontWeight: 600, cursor: 'pointer',
    padding: '11px 20px',
  },
  shopBtn: {
    background: '#ffd040',
    border: 'none',
    borderRadius: 8,
    color: '#171006',
    fontSize: 16,
    fontWeight: 800,
    cursor: 'pointer',
    padding: '12px 22px',
  },
  modalButtons: {
    display: 'flex', gap: 10, justifyContent: 'center', alignItems: 'center',
    flexWrap: 'wrap',
  },
  copyBtn: {
    background: 'transparent', border: '1.5px solid #8060c0', borderRadius: 8,
    color: '#d0c0f0', fontSize: 13, fontWeight: 600, cursor: 'pointer',
    padding: '11px 16px',
  },
  nextUnlock: {
    background: 'rgba(60, 40, 110, 0.4)',
    border: '1.5px dashed #8060c0',
    borderRadius: 10,
    padding: '12px 16px',
    marginBottom: 20,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
  },
  nextUnlockLabel: {
    color: '#a888d0',
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  nextUnlockBody: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  nextUnlockSilhouette: {
    filter: 'brightness(0.15) contrast(2)',
    opacity: 0.85,
  },
  nextUnlockText: {
    textAlign: 'left',
  },
  nextUnlockName: {
    color: '#d0c0f0',
    fontSize: 16,
    fontWeight: 700,
    letterSpacing: 2,
  },
  nextUnlockHint: {
    color: '#a888d0',
    fontSize: 12,
    marginTop: 2,
  },
}
