// 무기 해금 현황 모달 (로비). 실제 16종 WEAPON_CATALOG + 실제 이질적 OR 해금조건.
// 읽기 전용: 해금 여부는 영구 저장(weaponUnlocks) 또는 누적 기록 평가(evaluateUnlocks) 둘 중 하나라도
// 만족하면 해금으로 본다. 잠긴 무기는 조건과 (측정 가능한) 누적 진행도를 표시한다.
import { WEAPON_CATALOG, STARTER, getAllWeaponIds, evaluateUnlocks, isStarter } from '../lib/weaponCatalog.js'
import { isUnlocked as isWeaponUnlocked } from '../lib/weaponUnlocks.js'
import { load as loadPlayerRecords } from '../lib/playerRecords.js'
import { schoolPanel, schoolButton, uiBorders, uiPalette, uiShadows, uiType } from '../lib/uiStyle.js'

// 조건 type → 사람이 읽는 라벨 + 누적 기록에서 측정 가능한지 여부.
// run* 조건은 한 판 안에서만 측정되어 누적 진행도가 없다(목표만 표시).
const CONDITION_META = {
  totalRuns: { label: '누적 플레이', unit: '회', cumulative: true },
  totalKills: { label: '누적 처치', unit: '', cumulative: true },
  totalGold: { label: '누적 코인', unit: '', cumulative: true },
  totalSurvivalSeconds: { label: '누적 생존', unit: '초', cumulative: true },
  stage1Clears: { label: 'Stage 1 클리어', unit: '회', cumulative: true },
  stage2Clears: { label: 'Stage 2 클리어', unit: '회', cumulative: true },
  stage1Survival180Runs: { label: 'Stage 1 3분 생존', unit: '회', cumulative: true },
  runKills: { label: '한 판 처치', unit: '', cumulative: false },
  runSurvivalSeconds: { label: '한 판 생존', unit: '초', cumulative: false },
  runGold: { label: '한 판 코인', unit: '', cumulative: false },
}

function describeCondition(cond, records) {
  const meta = CONDITION_META[cond.type] ?? { label: cond.type, unit: '', cumulative: false }
  const target = Number(cond.value)
  if (meta.cumulative) {
    const current = Math.min(Number(records[cond.type] ?? 0), target)
    return { text: `${meta.label} ${current}/${target}${meta.unit}`, ratio: target > 0 ? current / target : 0, measurable: true }
  }
  return { text: `${meta.label} ${target}${meta.unit}`, ratio: 0, measurable: false }
}

export default function WeaponModal({ onClose }) {
  const records = loadPlayerRecords()
  const unlockedByRecords = evaluateUnlocks(records)
  const ids = getAllWeaponIds()
  const unlockedCount = ids.filter((id) => isWeaponUnlocked(id) || unlockedByRecords.has(id)).length

  return (
    <div style={styles.overlay}>
      <button type="button" aria-label="무기 현황 닫기 배경" style={styles.scrim} onClick={onClose} />
      <section role="dialog" aria-modal="true" aria-labelledby="lobby-weapon-heading" style={styles.modal}>
        <div style={styles.header}>
          <div>
            <div style={styles.eyebrow}>무기고</div>
            <h2 id="lobby-weapon-heading" style={styles.title}>무기 해금 현황</h2>
          </div>
          <div style={styles.countBadge}>
            <span style={styles.countLabel}>해금</span>
            <strong style={styles.countValue}>{unlockedCount}/{ids.length}</strong>
          </div>
        </div>

        <ul style={styles.list} aria-label="무기 목록">
          {ids.map((id) => {
            const entry = WEAPON_CATALOG[id]
            const starter = isStarter(id)
            const unlocked = starter || isWeaponUnlocked(id) || unlockedByRecords.has(id)
            return (
              <WeaponRow key={id} entry={entry} starter={starter} unlocked={unlocked} records={records} />
            )
          })}
        </ul>

        <button type="button" style={styles.closeBtn} onClick={onClose}>
          닫기
        </button>
      </section>
    </div>
  )
}

function WeaponRow({ entry, starter, unlocked, records }) {
  const conditions = Array.isArray(entry.unlockConditions) ? entry.unlockConditions : []
  const described = conditions.map((cond) => describeCondition(cond, records))

  return (
    <li style={{ ...styles.row, ...(unlocked ? styles.rowUnlocked : styles.rowLocked) }}>
      <div style={styles.rowTop}>
        <span style={styles.weaponName}>{entry.label}</span>
        <span style={unlocked ? styles.tagUnlocked : styles.tagLocked}>
          {unlocked ? '해금' : '잠김'}
        </span>
      </div>
      {starter || entry.unlockConditions === STARTER ? (
        <div style={styles.condText}>기본 제공 무기</div>
      ) : unlocked ? (
        <div style={styles.condText}>해금 완료</div>
      ) : (
        <div style={styles.condGroup}>
          <div style={styles.condHint}>다음 조건 중 하나 달성 시 해금</div>
          {described.map((d, index) => (
            <div key={index} style={styles.condItem}>
              <span style={styles.condLabel}>{d.text}</span>
              {d.measurable && (
                <span style={styles.progressTrack}>
                  <span style={{ ...styles.progressFill, width: `${Math.round(Math.min(1, d.ratio) * 100)}%` }} />
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </li>
  )
}

const styles = {
  overlay: {
    position: 'absolute',
    inset: 0,
    zIndex: 40,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: uiType.family,
  },
  scrim: {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    border: 0,
    padding: 0,
    background: 'rgba(5,2,9,0.5)',
    backdropFilter: 'blur(2px)',
    cursor: 'pointer',
  },
  modal: {
    ...schoolPanel('dark'),
    position: 'relative',
    width: 'min(100% - 28px, 440px)',
    maxHeight: 'min(88%, 640px)',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    padding: 14,
    boxSizing: 'border-box',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  eyebrow: {
    color: uiPalette.reward,
    fontSize: 11,
    lineHeight: 1,
    fontWeight: uiType.weightHeavy,
    textShadow: `0 2px 0 ${uiPalette.ink}`,
  },
  title: {
    margin: '5px 0 0',
    color: uiPalette.paperLight,
    fontSize: 22,
    lineHeight: 1,
    fontWeight: uiType.weightHeavy,
    textShadow: `0 3px 0 ${uiPalette.ink}`,
  },
  countBadge: {
    minWidth: 78,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '7px 10px',
    border: uiBorders.strong,
    borderRadius: 8,
    background: uiPalette.reward,
    color: uiPalette.ink,
    boxShadow: uiShadows.pressSmall,
  },
  countLabel: {
    fontSize: 10,
    lineHeight: 1,
    fontWeight: uiType.weightStrong,
  },
  countValue: {
    marginTop: 3,
    fontFamily: uiType.numeric,
    fontSize: 18,
    lineHeight: 1,
    fontWeight: uiType.weightHeavy,
  },
  list: {
    flex: 1,
    minHeight: 0,
    margin: 0,
    padding: '2px 2px 4px',
    display: 'flex',
    flexDirection: 'column',
    gap: 7,
    overflowY: 'auto',
    listStyle: 'none',
    scrollbarWidth: 'thin',
  },
  row: {
    padding: '9px 11px',
    border: uiBorders.strong,
    borderRadius: 8,
    boxShadow: uiShadows.pressSmall,
    boxSizing: 'border-box',
  },
  rowUnlocked: {
    background: uiPalette.paperLight,
    color: uiPalette.ink,
  },
  rowLocked: {
    background: '#2a2433',
    color: uiPalette.paperLight,
    opacity: 0.96,
  },
  rowTop: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  weaponName: {
    minWidth: 0,
    overflow: 'hidden',
    fontSize: 15,
    lineHeight: 1.15,
    fontWeight: uiType.weightHeavy,
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  tagUnlocked: {
    flex: '0 0 auto',
    padding: '3px 8px',
    border: uiBorders.strong,
    borderRadius: 999,
    background: uiPalette.infection,
    color: uiPalette.ink,
    fontSize: 11,
    lineHeight: 1,
    fontWeight: uiType.weightHeavy,
  },
  tagLocked: {
    flex: '0 0 auto',
    padding: '3px 8px',
    border: uiBorders.strong,
    borderRadius: 999,
    background: '#5d5668',
    color: uiPalette.paperLight,
    fontSize: 11,
    lineHeight: 1,
    fontWeight: uiType.weightHeavy,
  },
  condText: {
    marginTop: 6,
    color: 'rgba(5,2,9,0.6)',
    fontSize: 11,
    lineHeight: 1.3,
    fontWeight: 800,
  },
  condGroup: {
    marginTop: 7,
    display: 'flex',
    flexDirection: 'column',
    gap: 5,
  },
  condHint: {
    color: uiPalette.reward,
    fontSize: 10,
    lineHeight: 1.2,
    fontWeight: uiType.weightStrong,
  },
  condItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  condLabel: {
    flex: '0 0 auto',
    minWidth: 128,
    color: uiPalette.mutedChalk,
    fontSize: 11,
    lineHeight: 1.2,
    fontWeight: 800,
  },
  progressTrack: {
    flex: 1,
    height: 8,
    border: `1.5px solid ${uiPalette.ink}`,
    borderRadius: 999,
    background: 'rgba(5,2,9,0.4)',
    overflow: 'hidden',
    boxSizing: 'border-box',
  },
  progressFill: {
    display: 'block',
    height: '100%',
    background: uiPalette.cta,
  },
  closeBtn: {
    ...schoolButton('paper'),
    width: '100%',
    minHeight: 46,
    fontSize: 16,
    lineHeight: 1,
  },
}
