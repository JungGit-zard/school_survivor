import { useState } from 'react'
import { MISSION_BY_ID } from '../lib/missionCatalog.js'
import { getMissionStatus } from '../lib/missionProgress.js'
import { missionTitle, useT } from '../lib/i18n.js'
import { uiBorders, uiPalette, uiShadows, uiType } from '../lib/uiStyle.js'

export default function MissionTracker({ missionProgress, hidden }) {
  const t = useT()
  const [expanded, setExpanded] = useState(false)
  const pinned = (missionProgress?.pinnedMissionIds ?? []).map((id) => MISSION_BY_ID[id]).filter(Boolean).slice(0, 2)
  if (hidden || pinned.length === 0) return null
  const visible = expanded ? pinned : pinned.slice(0, 1)
  return (
    <section style={styles.root} aria-label={t('missions.trackerAria')}>
      <button type="button" aria-expanded={expanded} style={styles.toggle} onClick={() => setExpanded((value) => !value)}>{t('missions.trackerToggle', { count: pinned.length })} {expanded ? '▴' : '▾'}</button>
      {visible.map((mission) => {
        const { counter, target } = getMissionStatus(missionProgress, mission)
        return <div key={mission.id} style={styles.item}><strong>{missionTitle(mission)}</strong><span>{counter}/{target}</span></div>
      })}
    </section>
  )
}

const styles = {
  root: { position: 'absolute', top: 'max(116px, calc(env(safe-area-inset-top, 0px) + 102px))', left: 14, zIndex: 6, width: 'min(220px, calc(100vw - 28px))', overflow: 'hidden', border: uiBorders.strong, borderRadius: 9, background: 'rgba(255,248,232,0.96)', color: uiPalette.ink, boxShadow: uiShadows.pressSmall, pointerEvents: 'auto', fontFamily: uiType.family },
  toggle: { width: '100%', minHeight: 44, border: 0, borderBottom: uiBorders.hairline, background: 'transparent', color: uiPalette.ink, fontWeight: uiType.weightHeavy, textAlign: 'left', padding: '0 10px', cursor: 'pointer' },
  item: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, minHeight: 30, padding: '5px 10px', fontSize: 12, lineHeight: 1.25 },
}
