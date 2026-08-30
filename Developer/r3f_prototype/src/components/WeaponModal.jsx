import { useMemo, useState } from 'react'
import { WEAPON_CATALOG, STARTER, getAllWeaponIds, evaluateUnlocks, isRuntimeCombinationWeapon, isStarter } from '../lib/weaponCatalog.js'
import { isUnlocked as isWeaponUnlocked } from '../lib/weaponUnlocks.js'
import { load as loadPlayerRecords } from '../lib/playerRecords.js'
import { schoolPanel, schoolButton, uiBorders, uiPalette, uiShadows, uiType } from '../lib/uiStyle.js'
import { t as translate, useT, weaponLabel } from '../lib/i18n.js'

const CONDITION_META = {
  totalRuns: { label: '누적 플레이', unitKey: 'cond.unit.times', unit: '회', cumulative: true },
  totalKills: { label: '누적 처치', unit: '', cumulative: true },
  totalGold: { label: '누적 코인', unit: '', cumulative: true },
  totalSurvivalSeconds: { label: '누적 생존', unitKey: 'cond.unit.seconds', unit: '초', cumulative: true },
  stage1Clears: { label: 'Stage 1 클리어', unitKey: 'cond.unit.times', unit: '회', cumulative: true },
  stage2Clears: { label: 'Stage 2 클리어', unitKey: 'cond.unit.times', unit: '회', cumulative: true },
  stage3Clears: { label: 'Stage 3 클리어', unitKey: 'cond.unit.times', unit: '회', cumulative: true },
  bossKills: { label: '보스 처치', unitKey: 'cond.unit.times', unit: '회', cumulative: true },
  stage1Survival180Runs: { label: 'Stage 1 3분 생존', unitKey: 'cond.unit.times', unit: '회', cumulative: true },
  runKills: { label: '한 판 처치', unit: '', cumulative: false },
  runSurvivalSeconds: { label: '한 판 생존', unitKey: 'cond.unit.seconds', unit: '초', cumulative: false },
  runGold: { label: '한 판 코인', unit: '', cumulative: false },
}

const FILTERS = [
  ['all', 'weaponModal.filterAll', '전체'],
  ['unlocked', 'weaponModal.filterUnlocked', '해금'],
  ['locked', 'weaponModal.filterLocked', '잠김'],
  ['new', 'weaponModal.filterNew', '이번 해금'],
]

const COMBINATION_META = {
  hanako: { key: 'weaponModal.combinationHanako', fallback: '치비코 보유 후 런 중 조합 발견' },
  bikittyCutter: { key: 'weaponModal.combinationBikittyCutter', fallback: '커터칼 보유 + 레벨 6 후 런 중 조합 발견' },
  lineDraw: { key: 'weaponModal.combinationLineDraw', fallback: '30cm 자 + 커터칼 보유 + 레벨 8 후 런 중 조합 발견' },
}

function describeCondition(cond, records) {
  const meta = CONDITION_META[cond.type] ?? { label: cond.type, unit: '', cumulative: false }
  const label = translate(`cond.${cond.type}`, null, meta.label)
  const unit = meta.unitKey ? translate(meta.unitKey, null, meta.unit) : meta.unit
  const target = Number(cond.value)
  if (meta.cumulative) {
    const current = Math.min(Number(records[cond.type] ?? 0), target)
    return { text: `${label} ${current}/${target}${unit}`, ratio: target > 0 ? current / target : 0, measurable: true }
  }
  return { text: `${label} ${target}${unit}`, ratio: 0, measurable: false }
}

function isEntryUnlocked(id, unlockedByRecords) {
  if (isRuntimeCombinationWeapon(id)) return false
  return isStarter(id) || isWeaponUnlocked(id) || unlockedByRecords.has(id)
}

export default function WeaponModal({ onClose, initialWeaponId = null, newlyUnlockedWeaponIds = [], playerRecords }) {
  const t = useT()
  const records = playerRecords ?? loadPlayerRecords()
  const unlockedByRecords = evaluateUnlocks(records)
  const ids = getAllWeaponIds()
  const accountIds = ids.filter((id) => !isRuntimeCombinationWeapon(id))
  const newIds = useMemo(() => new Set(newlyUnlockedWeaponIds), [newlyUnlockedWeaponIds])
  const [filter, setFilter] = useState(initialWeaponId ? 'all' : 'all')
  const [selectedId, setSelectedId] = useState(initialWeaponId)
  const unlockedCount = accountIds.filter((id) => isEntryUnlocked(id, unlockedByRecords)).length
  const visibleIds = ids.filter((id) => {
    if (isRuntimeCombinationWeapon(id)) return filter === 'all' || (filter === 'new' && newIds.has(id))
    const unlocked = isEntryUnlocked(id, unlockedByRecords)
    if (filter === 'unlocked') return unlocked
    if (filter === 'locked') return !unlocked
    if (filter === 'new') return newIds.has(id)
    return true
  })
  const selectedEntry = selectedId ? WEAPON_CATALOG[selectedId] : null

  return (
    <div style={styles.overlay}>
      <button type="button" aria-label={t('weaponModal.closeAria')} style={styles.scrim} onClick={onClose} />
      <section role="dialog" aria-modal="true" aria-labelledby="lobby-weapon-heading" style={styles.modal}>
        <div style={styles.header}>
          <div>
            <div style={styles.eyebrow}>{t('weaponModal.eyebrow')}</div>
            <h2 id="lobby-weapon-heading" style={styles.title}>{t('weaponModal.title')}</h2>
          </div>
          <div style={styles.countBadge} aria-label={t('weaponModal.countAria', { unlocked: unlockedCount, total: accountIds.length }, `${unlockedCount}/${accountIds.length} 해금`)}>
            <span style={styles.countLabel}>{t('weaponModal.countLabel')}</span>
            <strong data-testid="weapon-account-unlock-count" style={styles.countValue}>{unlockedCount}/{accountIds.length}</strong>
          </div>
        </div>

        {selectedEntry ? (
          <WeaponDetail
            entry={selectedEntry}
            unlocked={isEntryUnlocked(selectedEntry.id, unlockedByRecords)}
            combination={isRuntimeCombinationWeapon(selectedEntry.id)}
            records={records}
            isNew={newIds.has(selectedEntry.id)}
            onBack={() => setSelectedId(null)}
          />
        ) : (
          <>
            <div style={styles.filters} aria-label={t('weaponModal.filtersAria', null, '무기 상태 필터')}>
              {FILTERS.map(([value, key, fallback]) => (
                <button
                  key={value}
                  type="button"
                  data-testid={`weapon-filter-${value}`}
                  aria-pressed={filter === value}
                  style={filter === value ? styles.filterActive : styles.filterButton}
                  onClick={() => setFilter(value)}
                >
                  {t(key, null, fallback)}
                </button>
              ))}
            </div>
            <ul style={styles.list} aria-label={t('weaponModal.listAria')}>
              {visibleIds.map((id) => {
                const entry = WEAPON_CATALOG[id]
                const unlocked = isEntryUnlocked(id, unlockedByRecords)
                return (
                  <WeaponRow
                    key={id}
                    entry={entry}
                    unlocked={unlocked}
                    combination={isRuntimeCombinationWeapon(id)}
                    records={records}
                    isNew={newIds.has(id)}
                    onOpen={() => setSelectedId(id)}
                  />
                )
              })}
              {visibleIds.length === 0 && <li style={styles.empty}>{t('weaponModal.empty', null, '해당 무기가 없습니다.')}</li>}
            </ul>
          </>
        )}

        <button type="button" style={styles.closeBtn} onClick={onClose}>{t('common.close')}</button>
      </section>
    </div>
  )
}

function WeaponRow({ entry, unlocked, combination, records, isNew, onOpen }) {
  const conditions = Array.isArray(entry.unlockConditions) ? entry.unlockConditions : []
  const described = conditions.map((cond) => describeCondition(cond, records))
  const starter = isStarter(entry.id) || entry.unlockConditions === STARTER

  return (
    <li data-testid={`weapon-row-${entry.id}`} style={{ ...styles.row, ...(combination || unlocked ? styles.rowUnlocked : styles.rowLocked) }}>
      <button type="button" style={styles.rowButton} onClick={onOpen} aria-label={translate('weaponModal.openDetail', { name: weaponLabel(entry.id, entry.label) }, `${weaponLabel(entry.id, entry.label)} 상세 보기`)}>
        <span style={{ ...styles.silhouette, ...(!unlocked && !combination ? styles.silhouetteLocked : null) }} aria-hidden="true">?</span>
        <span style={styles.rowCopy}>
          <span style={styles.rowTop}>
            <span style={styles.weaponName}>{weaponLabel(entry.id, entry.label)}</span>
            <span data-testid={`weapon-status-${entry.id}`} style={combination ? styles.tagCombination : unlocked ? styles.tagUnlocked : styles.tagLocked}>
              {combination ? translate('weaponModal.runtimeCombination', null, '런 중 조합') : unlocked ? translate('common.unlocked') : translate('common.locked')}
            </span>
          </span>
          {isNew && <span style={styles.newBadge}>{translate('weaponModal.newBadge', null, 'NEW')}</span>}
          {combination ? (
            <span style={styles.condText}>{translate(COMBINATION_META[entry.id]?.key, null, COMBINATION_META[entry.id]?.fallback)}</span>
          ) : starter ? (
            <span style={styles.condText}>{translate('weaponModal.starter')}</span>
          ) : unlocked ? (
            <span style={styles.condText}>{translate('weaponModal.unlockDone')}</span>
          ) : (
            <span style={styles.condGroup}>
              <span style={styles.condHint}>{translate('weaponModal.anyCondition')}</span>
              {described.map((d, index) => (
                <span key={index} style={styles.condItem}>
                  <span style={styles.condLabel}>{d.text}</span>
                  {d.measurable && <span style={styles.progressTrack}><span style={{ ...styles.progressFill, width: `${Math.round(Math.min(1, d.ratio) * 100)}%` }} /></span>}
                </span>
              ))}
            </span>
          )}
        </span>
      </button>
    </li>
  )
}

function WeaponDetail({ entry, unlocked, combination, records, isNew, onBack }) {
  const conditions = Array.isArray(entry.unlockConditions) ? entry.unlockConditions : []
  const starter = isStarter(entry.id) || entry.unlockConditions === STARTER
  return (
    <div data-testid={`weapon-detail-${entry.id}`} style={styles.detail}>
      <div style={styles.detailHero}>
        <span style={{ ...styles.detailSilhouette, ...(!unlocked && !combination ? styles.silhouetteLocked : null) }} aria-hidden="true">?</span>
        <div style={styles.detailTitleWrap}>
          <div style={styles.detailName}>{weaponLabel(entry.id, entry.label)}</div>
          <span style={combination ? styles.tagCombination : unlocked ? styles.tagUnlocked : styles.tagLocked}>
            {combination ? translate('weaponModal.runtimeCombination', null, '런 중 조합') : unlocked ? translate('common.unlocked') : translate('common.locked')}
          </span>
          {isNew && <span style={styles.newBadge}>{translate('weaponModal.newBadge', null, 'NEW')}</span>}
        </div>
      </div>
      <div style={styles.detailSection}>
        <strong style={styles.detailHeading}>{combination ? translate('weaponModal.runtimeCombination', null, '런 중 조합') : translate('weaponModal.accountUnlock', null, '계정 해금')}</strong>
        {combination ? (
          <div style={styles.detailText}>{translate(COMBINATION_META[entry.id]?.key, null, COMBINATION_META[entry.id]?.fallback)}</div>
        ) : starter ? (
          <div style={styles.detailText}>{translate('weaponModal.starter')}</div>
        ) : unlocked ? (
          <div style={styles.detailText}>{translate('weaponModal.unlockDone')}</div>
        ) : (
          <>
            <div style={styles.detailHint}>{translate('weaponModal.anyCondition')}</div>
            {conditions.map((condition, index) => {
              const described = describeCondition(condition, records)
              return <ConditionProgress key={index} described={described} />
            })}
          </>
        )}
      </div>
      {entry.minLevelToAppear != null && (
        <div style={styles.detailSection}>
          <strong style={styles.detailHeading}>{translate('weaponModal.runAcquire', null, '이번 판 획득')}</strong>
          <div style={styles.detailText}>{translate('weaponModal.appearAtLevel', { level: entry.minLevelToAppear }, `레벨 ${entry.minLevelToAppear} 이상에서 카드로 등장`)}</div>
        </div>
      )}
      <button type="button" data-testid="weapon-detail-back" style={styles.backBtn} onClick={onBack}>{translate('weaponModal.backToList', null, '목록으로')}</button>
    </div>
  )
}

function ConditionProgress({ described }) {
  return (
    <div style={styles.detailCondition}>
      <span style={styles.detailText}>{described.text}</span>
      {described.measurable && <span style={styles.progressTrack}><span style={{ ...styles.progressFill, width: `${Math.round(Math.min(1, described.ratio) * 100)}%` }} /></span>}
    </div>
  )
}

const styles = {
  overlay: { position: 'absolute', inset: 0, zIndex: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: uiType.family },
  scrim: { position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0, padding: 0, background: 'rgba(5,2,9,0.5)', backdropFilter: 'blur(2px)', cursor: 'pointer' },
  modal: { ...schoolPanel('dark'), position: 'relative', width: 'min(100% - 28px, 440px)', maxHeight: 'min(calc(100dvh - 28px - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px)), 640px)', display: 'flex', flexDirection: 'column', gap: 10, padding: 14, boxSizing: 'border-box' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  eyebrow: { color: uiPalette.reward, fontSize: 11, lineHeight: 1, fontWeight: uiType.weightHeavy, textShadow: `0 2px 0 ${uiPalette.ink}` },
  title: { margin: '5px 0 0', color: uiPalette.paperLight, fontSize: 22, lineHeight: 1, fontWeight: uiType.weightHeavy, textShadow: `0 3px 0 ${uiPalette.ink}` },
  countBadge: { minWidth: 78, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '7px 10px', border: uiBorders.strong, borderRadius: 8, background: uiPalette.reward, color: uiPalette.ink, boxShadow: uiShadows.pressSmall },
  countLabel: { fontSize: 10, lineHeight: 1, fontWeight: uiType.weightStrong },
  countValue: { marginTop: 3, fontFamily: uiType.numeric, fontSize: 18, lineHeight: 1, fontWeight: uiType.weightHeavy },
  filters: { display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 5 },
  filterButton: { ...schoolButton('paper'), minHeight: 44, padding: '5px 2px', fontSize: 11, lineHeight: 1 },
  filterActive: { ...schoolButton('cta'), minHeight: 44, padding: '5px 2px', fontSize: 11, lineHeight: 1 },
  list: { flex: 1, minHeight: 0, margin: 0, padding: '2px 2px 4px', display: 'flex', flexDirection: 'column', gap: 7, overflowY: 'auto', listStyle: 'none', scrollbarWidth: 'thin' },
  row: { flexShrink: 0, border: uiBorders.strong, borderRadius: 8, boxShadow: uiShadows.pressSmall, boxSizing: 'border-box', overflow: 'hidden' },
  rowUnlocked: { background: uiPalette.paperLight, color: uiPalette.ink },
  rowLocked: { background: '#2a2433', color: uiPalette.paperLight },
  rowButton: { width: '100%', minHeight: 72, display: 'flex', alignItems: 'center', gap: 9, padding: '8px 9px', border: 0, background: 'transparent', color: 'inherit', font: 'inherit', textAlign: 'left', cursor: 'pointer', boxSizing: 'border-box' },
  silhouette: { flex: '0 0 48px', width: 48, height: 48, display: 'grid', placeItems: 'center', border: uiBorders.strong, borderRadius: 9, background: 'rgba(89,199,255,0.34)', color: uiPalette.paperLight, fontSize: 22, fontWeight: uiType.weightHeavy },
  silhouetteLocked: { background: 'rgba(0,0,0,0.34)', color: 'rgba(255,255,255,0.58)' },
  rowCopy: { minWidth: 0, flex: 1, display: 'flex', flexDirection: 'column', gap: 4 },
  rowTop: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  weaponName: { minWidth: 0, overflow: 'hidden', fontSize: 15, lineHeight: 1.15, fontWeight: uiType.weightHeavy, textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  tagUnlocked: { flex: '0 0 auto', padding: '3px 8px', border: uiBorders.strong, borderRadius: 999, background: uiPalette.infection, color: uiPalette.ink, fontSize: 11, lineHeight: 1, fontWeight: uiType.weightHeavy },
  tagLocked: { flex: '0 0 auto', padding: '3px 8px', border: uiBorders.strong, borderRadius: 999, background: '#5d5668', color: uiPalette.paperLight, fontSize: 11, lineHeight: 1, fontWeight: uiType.weightHeavy },
  tagCombination: { flex: '0 0 auto', padding: '3px 8px', border: uiBorders.strong, borderRadius: 999, background: uiPalette.reward, color: uiPalette.ink, fontSize: 11, lineHeight: 1, fontWeight: uiType.weightHeavy },
  newBadge: { alignSelf: 'flex-start', padding: '2px 5px', borderRadius: 5, background: uiPalette.reward, color: uiPalette.ink, fontSize: 10, lineHeight: 1, fontWeight: uiType.weightHeavy },
  condText: { color: 'rgba(5,2,9,0.6)', fontSize: 11, lineHeight: 1.3, fontWeight: 800 },
  condGroup: { display: 'flex', flexDirection: 'column', gap: 4 },
  condHint: { color: uiPalette.reward, fontSize: 10, lineHeight: 1.2, fontWeight: uiType.weightStrong },
  condItem: { display: 'flex', alignItems: 'center', gap: 8 },
  condLabel: { flex: '0 1 auto', minWidth: 0, color: uiPalette.mutedChalk, fontSize: 11, lineHeight: 1.2, fontWeight: 800 },
  progressTrack: { flex: 1, minWidth: 36, height: 8, border: `1.5px solid ${uiPalette.ink}`, borderRadius: 999, background: 'rgba(5,2,9,0.4)', overflow: 'hidden', boxSizing: 'border-box' },
  progressFill: { display: 'block', height: '100%', background: uiPalette.cta },
  empty: { minHeight: 92, display: 'grid', placeItems: 'center', color: uiPalette.mutedChalk, fontWeight: uiType.weightStrong, textAlign: 'center' },
  detail: { flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 9, overflowY: 'auto', padding: '2px 2px 4px' },
  detailHero: { display: 'flex', alignItems: 'center', gap: 10, padding: '8px 9px', border: uiBorders.strong, borderRadius: 8, background: uiPalette.paperLight, color: uiPalette.ink },
  detailSilhouette: { width: 58, height: 58, display: 'grid', placeItems: 'center', border: uiBorders.strong, borderRadius: 10, background: 'rgba(89,199,255,0.34)', fontSize: 28, fontWeight: uiType.weightHeavy },
  detailTitleWrap: { minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 5 },
  detailName: { fontSize: 18, lineHeight: 1.1, fontWeight: uiType.weightHeavy },
  detailSection: { padding: '10px 11px', border: uiBorders.strong, borderRadius: 8, background: '#2a2433', color: uiPalette.paperLight, display: 'flex', flexDirection: 'column', gap: 7 },
  detailHeading: { color: uiPalette.reward, fontSize: 12, lineHeight: 1, fontWeight: uiType.weightHeavy },
  detailHint: { color: uiPalette.reward, fontSize: 11, fontWeight: uiType.weightStrong },
  detailText: { fontSize: 12, lineHeight: 1.35, fontWeight: 800 },
  detailCondition: { display: 'flex', alignItems: 'center', gap: 8 },
  backBtn: { ...schoolButton('paper'), minHeight: 42, fontSize: 14 },
  closeBtn: { ...schoolButton('paper'), width: '100%', minHeight: 46, fontSize: 16, lineHeight: 1 },
}
