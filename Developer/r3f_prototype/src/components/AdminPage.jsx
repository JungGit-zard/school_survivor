import { useMemo, useState } from 'react'
import {
  DEFAULT_ADMIN_CONFIG,
  loadAdminConfig,
  normalizeAdminConfig,
  resetAdminConfig,
  saveAdminConfig,
} from '../lib/adminConfig.js'
import { getDefaultWavePhases } from '../lib/waveTimelines.js'
import { getRuntimeBurstEventsForStage, isBossPhase } from '../lib/burstEvents.js'
import {
  WAVE_ZOMBIE_TYPES,
  phaseToEditorEntry,
  minSecToSec,
  secToMin,
  secToRemainder,
} from '../lib/waveControl.js'

const TAB_BALANCE = 'balance'
const TAB_RANKING = 'ranking'
const TAB_WAVES = 'waves'

const ZOMBIE_LABELS = {
  E01: 'E01 기본',
  E02: 'E02 탱커',
  E03: 'E03 러너',
  E04: 'E04 원거리',
  E05: 'E05 돌진',
  E06: 'E06 거대',
}

const BOSS_TYPES = ['B01', 'B02']
const isBossType = (type) => BOSS_TYPES.includes(type)
// 버스트 좀비 라벨: 일반은 ZOMBIE_LABELS 재사용, 보스(B01/B02)는 '보스'.
const burstTypeLabel = (type) => (isBossType(type) ? '보스' : (ZOMBIE_LABELS[type] ?? type))
const formatMinSec = (sec) => `${secToMin(sec)}:${String(secToRemainder(sec)).padStart(2, '0')}`

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState(TAB_BALANCE)
  const [draft, setDraft] = useState(() => loadAdminConfig())
  const [status, setStatus] = useState('변경 전')
  const preview = useMemo(() => buildPreview(draft), [draft])

  const updateBalance = (section, key, value) => {
    setDraft((prev) => normalizeAdminConfig({
      ...prev,
      balance: {
        ...prev.balance,
        [section]: {
          ...prev.balance[section],
          [key]: value,
        },
      },
    }))
    setStatus('저장 필요')
  }

  const updateOperations = (key, value) => {
    setDraft((prev) => normalizeAdminConfig({
      ...prev,
      operations: {
        ...prev.operations,
        [key]: value,
      },
    }))
    setStatus('저장 필요')
  }

  const updateSeason = (key, value) => {
    setDraft((prev) => normalizeAdminConfig({
      ...prev,
      rankingSeason: {
        ...prev.rankingSeason,
        [key]: value,
      },
    }))
    setStatus('저장 필요')
  }

  const updateScorePolicy = (key, value) => {
    setDraft((prev) => normalizeAdminConfig({
      ...prev,
      rankingSeason: {
        ...prev.rankingSeason,
        scorePolicy: {
          ...prev.rankingSeason.scorePolicy,
          [key]: value,
        },
      },
    }))
    setStatus('저장 필요')
  }

  const updateStageBonus = (stageId, value) => {
    setDraft((prev) => normalizeAdminConfig({
      ...prev,
      rankingSeason: {
        ...prev.rankingSeason,
        scorePolicy: {
          ...prev.rankingSeason.scorePolicy,
          stageBonus: {
            ...prev.rankingSeason.scorePolicy.stageBonus,
            [stageId]: value,
          },
        },
      },
    }))
    setStatus('저장 필요')
  }

  const updateRewardTier = (index, key, value) => {
    setDraft((prev) => {
      const nextTiers = prev.rankingSeason.rewardTiers.map((tier, tierIndex) => (
        tierIndex === index ? { ...tier, [key]: value } : tier
      ))
      return normalizeAdminConfig({
        ...prev,
        rankingSeason: {
          ...prev.rankingSeason,
          rewardTiers: nextTiers,
        },
      })
    })
    setStatus('저장 필요')
  }

  // ── 스테이지별 웨이브 컨트롤 ──────────────────────────────────────────────
  const setWaveEntries = (stageId, entries) => {
    setDraft((prev) => normalizeAdminConfig({
      ...prev,
      waveControl: { ...prev.waveControl, [stageId]: entries },
    }))
    setStatus('저장 필요')
  }

  // 커스텀이 없으면 기본 타임라인을 편집 entry로 변환해 편집 시작점으로 복사
  const ensureWaveEntries = (stageId) =>
    draft.waveControl[stageId] ?? getDefaultWavePhases(stageId).map(phaseToEditorEntry)

  const updateWaveEntry = (stageId, index, patch) => {
    const entries = ensureWaveEntries(stageId).map((entry, i) => (
      i === index ? { ...entry, ...patch } : entry
    ))
    setWaveEntries(stageId, entries)
  }

  const updateWaveCount = (stageId, index, type, count) => {
    const entries = ensureWaveEntries(stageId).map((entry, i) => (
      i === index ? { ...entry, counts: { ...entry.counts, [type]: count } } : entry
    ))
    setWaveEntries(stageId, entries)
  }

  const addWaveEntry = (stageId) => {
    const entries = ensureWaveEntries(stageId)
    const lastEnd = entries.length > 0 ? Math.max(...entries.map((e) => e.end)) : 0
    const counts = Object.fromEntries(WAVE_ZOMBIE_TYPES.map((t) => [t, 0]))
    setWaveEntries(stageId, [...entries, {
      start: lastEnd, end: lastEnd + 20, counts: { ...counts, E01: 10 },
    }])
  }

  const removeWaveEntry = (stageId, index) => {
    const entries = ensureWaveEntries(stageId).filter((_, i) => i !== index)
    setWaveEntries(stageId, entries.length > 0 ? entries : null)
  }

  const resetWaveEntries = (stageId) => {
    setWaveEntries(stageId, null)
  }

  const saveDraft = () => {
    setDraft(saveAdminConfig(draft))
    setStatus('저장 완료')
  }

  const restoreDefaults = () => {
    resetAdminConfig()
    setDraft(loadAdminConfig())
    setStatus('기본값 복원')
  }

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div>
          <p style={styles.kicker}>Escape! zombie school</p>
          <h1 style={styles.title}>운영 콘솔</h1>
          <p style={styles.subtitle}>저장된 설정은 새 게임 시작과 랭킹 화면에 반영됩니다.</p>
        </div>
        <button type="button" style={styles.linkButton} onClick={() => { window.location.href = '/' }}>
          게임으로 돌아가기
        </button>
      </header>

      <nav style={styles.tabs} aria-label="어드민 설정 탭">
        <button
          type="button"
          style={styles.tab(activeTab === TAB_BALANCE)}
          onClick={() => setActiveTab(TAB_BALANCE)}
        >
          게임 밸런스
        </button>
        <button
          type="button"
          style={styles.tab(activeTab === TAB_RANKING)}
          onClick={() => setActiveTab(TAB_RANKING)}
        >
          랭킹/시즌
        </button>
        <button
          type="button"
          style={styles.tab(activeTab === TAB_WAVES)}
          onClick={() => setActiveTab(TAB_WAVES)}
        >
          스테이지별 웨이브 컨트롤
        </button>
      </nav>

      <main style={styles.content}>
        <section style={styles.panel}>
          {activeTab === TAB_BALANCE && (
            <BalanceControls draft={draft} updateBalance={updateBalance} updateOperations={updateOperations} />
          )}
          {activeTab === TAB_RANKING && (
            <RankingControls
              draft={draft}
              updateSeason={updateSeason}
              updateScorePolicy={updateScorePolicy}
              updateStageBonus={updateStageBonus}
              updateRewardTier={updateRewardTier}
            />
          )}
          {activeTab === TAB_WAVES && (
            <WaveControls
              draft={draft}
              ensureWaveEntries={ensureWaveEntries}
              updateWaveEntry={updateWaveEntry}
              updateWaveCount={updateWaveCount}
              addWaveEntry={addWaveEntry}
              removeWaveEntry={removeWaveEntry}
              resetWaveEntries={resetWaveEntries}
            />
          )}
        </section>

        <aside style={styles.previewPanel}>
          <div style={styles.statusBox}>
            <span style={styles.statusLabel}>상태</span>
            <strong>{status}</strong>
          </div>
          <div style={styles.previewGroup}>
            <h2 style={styles.previewTitle}>적용 미리보기</h2>
            <dl style={styles.previewList}>
              <PreviewItem label="Stage 1 클리어" value={preview.stage1Clear} />
              <PreviewItem label="Stage 2 클리어" value={preview.stage2Clear} />
              <PreviewItem label="시작 HP" value={preview.hp} />
              <PreviewItem label="이동 속도" value={preview.speed} />
              <PreviewItem label="랭킹 시즌" value={draft.rankingSeason.seasonName} />
              <PreviewItem label="보상 요약" value={preview.rewards} />
            </dl>
          </div>
          <div style={styles.buttonRow}>
            <button type="button" style={styles.saveButton} onClick={saveDraft}>설정 저장</button>
            <button type="button" style={styles.resetButton} onClick={restoreDefaults}>기본값 복원</button>
          </div>
          <p style={styles.note}>
            서버 권한이 붙기 전까지 이 페이지는 내부 밸런스 실험용입니다. 공식 랭킹 지급은 별도 서버 검증 뒤 확장합니다.
          </p>
        </aside>
      </main>
    </div>
  )
}

// ── 스테이지별 웨이브 컨트롤 탭 ─────────────────────────────────────────────
// 각 웨이브(행) = 시작~끝 시각 + 좀비별 등장 수. 엔진에는 target(합계)+weights(비율)로
// 변환되어 유지 스폰 타임라인이 된다. 커스텀 없으면 기본 타임라인 표시.
function WaveControls({ draft, ensureWaveEntries, updateWaveEntry, updateWaveCount, addWaveEntry, removeWaveEntry, resetWaveEntries }) {
  const [stageId, setStageId] = useState('stage1')
  const isCustom = draft.waveControl[stageId] != null
  const entries = ensureWaveEntries(stageId)

  return (
    <div>
      <SectionTitle
        title="스테이지별 웨이브 컨트롤"
        subtitle="웨이브 = 해당 시간 구간에 유지되는 좀비 구성. 좀비를 체크하고 마리 수를 입력하면 그 비율·총량으로 스폰됩니다. 저장 후 새 게임부터 적용."
      />

      <div style={styles.waveStageRow}>
        {['stage1', 'stage2'].map((id) => (
          <button key={id} type="button" style={styles.tab(stageId === id)} onClick={() => setStageId(id)}>
            {id === 'stage1' ? 'Stage 1 (교실)' : 'Stage 2 (복도)'}
          </button>
        ))}
        <span style={styles.waveBadge(isCustom)}>
          {isCustom ? '커스텀 타임라인 사용 중' : '기본 타임라인 (편집하면 커스텀으로 전환)'}
        </span>
      </div>

      <div style={styles.waveList}>
        {entries.map((entry, index) => (
          <WaveRow
            key={index}
            entry={entry}
            index={index}
            stageId={stageId}
            onTime={(patch) => updateWaveEntry(stageId, index, patch)}
            onCount={(type, count) => updateWaveCount(stageId, index, type, count)}
            onRemove={() => removeWaveEntry(stageId, index)}
          />
        ))}
      </div>

      <div style={styles.waveActions}>
        <button type="button" style={styles.saveButton} onClick={() => addWaveEntry(stageId)}>
          ＋ 웨이브 더하기
        </button>
        <button type="button" style={styles.resetButton} onClick={() => resetWaveEntries(stageId)} disabled={!isCustom}>
          기본 타임라인으로 되돌리기
        </button>
      </div>
      <p style={styles.note}>
        좀비 합계가 0이거나 끝 시각이 시작 이하인 웨이브는 무시됩니다. 시간이 겹치면 나중 시작 웨이브가 우선합니다.
        '보스 구간'은 보스 등장 시각(버스트 스폰) 이후 웨이브에 자동 표시되며 편집할 수 없습니다.
      </p>

      <BurstSpawnSection stageId={stageId} />
    </div>
  )
}

// ── 버스트 스폰(일회성) 읽기전용 미러 ────────────────────────────────────────
// 게임 코드 상수(BURST_EVENTS / STAGE2_BURST_EVENTS)를 getBurstEventsForStage로
// 그대로 읽어 시각순 렌더. 복제/수기 입력 없음 — 코드가 바뀌면 여기 자동 반영.
function BurstSpawnSection({ stageId }) {
  const events = useMemo(
    () => [...getRuntimeBurstEventsForStage(stageId)].sort((a, b) => a.sec - b.sec),
    [stageId],
  )

  return (
    <div style={styles.burstSection}>
      <h3 style={styles.burstHeading}>버스트 스폰(일회성)</h3>
      <p style={styles.burstSubtitle}>
        이 목록은 게임 코드에서 자동 반영됩니다(읽기전용). 지속 웨이브는 위에서 편집.
      </p>
      <div style={styles.burstList}>
        {events.map((event, index) => {
          const boss = isBossType(event.type)
          return (
            <div
              key={index}
              data-testid="burst-row"
              data-sec={event.sec}
              style={styles.burstRow(boss)}
            >
              <span style={styles.burstTime}>{formatMinSec(event.sec)}</span>
              <span style={styles.burstType}>{burstTypeLabel(event.type)}</span>
              <span style={styles.burstCount}>×{event.count}</span>
              {boss && <span style={styles.burstBossBadge}>보스 등장</span>}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function WaveTimeInput({ label, sec, onChange }) {
  return (
    <label style={styles.waveTimeGroup}>
      <span style={styles.waveTimeLabel}>{label}</span>
      <input
        type="number" min={0} max={7} value={secToMin(sec)} style={styles.waveTimeInput}
        onChange={(e) => onChange(minSecToSec(e.target.value, secToRemainder(sec)))}
      />
      <span style={styles.waveTimeUnit}>분</span>
      <input
        type="number" min={0} max={59} value={secToRemainder(sec)} style={styles.waveTimeInput}
        onChange={(e) => onChange(minSecToSec(secToMin(sec), e.target.value))}
      />
      <span style={styles.waveTimeUnit}>초</span>
    </label>
  )
}

function WaveRow({ entry, index, stageId, onTime, onCount, onRemove }) {
  const total = WAVE_ZOMBIE_TYPES.reduce((sum, t) => sum + (entry.counts[t] ?? 0), 0)
  // 보스 구간은 편집 대상이 아니라 파생 표시 — 시작 시각이 보스 등장 이후면 자동 체크.
  const bossPhase = isBossPhase(entry.start, stageId)
  return (
    <div style={styles.waveRow}>
      <div style={styles.waveRowHead}>
        <strong style={styles.waveRowTitle}>웨이브 {index + 1}</strong>
        <WaveTimeInput label="시작" sec={entry.start} onChange={(start) => onTime({ start })} />
        <WaveTimeInput label="끝" sec={entry.end} onChange={(end) => onTime({ end })} />
        <label style={styles.waveBossLabel} title="보스 등장 시각 이후 자동 표시(편집 불가)">
          <input type="checkbox" checked={bossPhase} readOnly disabled />
          보스 구간
        </label>
        <span style={styles.waveTotal}>합계 {total}마리</span>
        <button type="button" style={styles.waveRemoveButton} onClick={onRemove}>－ 웨이브 빼기</button>
      </div>
      <div style={styles.waveZombieGrid}>
        {WAVE_ZOMBIE_TYPES.map((type) => {
          const count = entry.counts[type] ?? 0
          const enabled = count > 0
          return (
            <div key={type} style={styles.waveZombieCell(enabled)}>
              <label style={styles.waveZombieCheck}>
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) => onCount(type, e.target.checked ? Math.max(1, count) : 0)}
                />
                {ZOMBIE_LABELS[type]}
              </label>
              <input
                type="number" min={0} max={200} value={count} disabled={!enabled}
                style={styles.waveZombieCount}
                onChange={(e) => onCount(type, e.target.value)}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}

function BalanceControls({ draft, updateBalance, updateOperations }) {
  const { balance, operations } = draft
  return (
    <div>
      <SectionTitle title="게임 밸런스" subtitle="생존 시간, 시작 능력치, 골드 보상 배율을 조정합니다." />
      <div style={styles.formGrid}>
        <NumberField
          name="stage1DurationSec"
          label="Stage 1 생존 시간"
          min={120}
          max={420}
          step={1}
          suffix="초"
          value={balance.stageDurationSec.stage1}
          onChange={(value) => updateBalance('stageDurationSec', 'stage1', value)}
        />
        <NumberField
          name="stage2DurationSec"
          label="Stage 2 생존 시간"
          min={120}
          max={420}
          step={1}
          suffix="초"
          value={balance.stageDurationSec.stage2}
          onChange={(value) => updateBalance('stageDurationSec', 'stage2', value)}
        />
        <NumberField
          name="maxHpBonus"
          label="시작 최대 HP 보너스"
          min={0}
          max={200}
          step={5}
          suffix="HP"
          value={balance.player.maxHpBonus}
          onChange={(value) => updateBalance('player', 'maxHpBonus', value)}
        />
        <NumberField
          name="speedMultiplier"
          label="이동 속도 배율"
          min={0.5}
          max={1.5}
          step={0.05}
          suffix="배"
          value={balance.player.speedMultiplier}
          onChange={(value) => updateBalance('player', 'speedMultiplier', value)}
        />
        <NumberField
          name="goldMultiplier"
          label="생존 골드 배율"
          min={0}
          max={3}
          step={0.1}
          suffix="배"
          value={balance.rewards.goldMultiplier}
          onChange={(value) => updateBalance('rewards', 'goldMultiplier', value)}
        />
      </div>
      <div style={styles.operationsGroup}>
        <CheckboxField
          name="cheatMenuButtonVisible"
          label="치트 버튼 노출"
          description="타이틀 화면 상단의 치트 메뉴 버튼을 외부 테스터에게 보여줄지 정합니다."
          checked={operations.cheatMenuButtonVisible}
          onChange={(checked) => updateOperations('cheatMenuButtonVisible', checked)}
        />
      </div>
    </div>
  )
}

function RankingControls({ draft, updateSeason, updateScorePolicy, updateStageBonus, updateRewardTier }) {
  const { rankingSeason } = draft
  return (
    <div>
      <SectionTitle title="랭킹/시즌" subtitle="시즌 진행 상태, 점수 보너스, 순위 보상을 설정합니다." />
      <div style={styles.formGrid}>
        <TextField
          name="seasonId"
          label="시즌 ID"
          value={rankingSeason.seasonId}
          onChange={(value) => updateSeason('seasonId', value)}
        />
        <TextField
          name="seasonName"
          label="시즌명"
          value={rankingSeason.seasonName}
          onChange={(value) => updateSeason('seasonName', value)}
        />
        <label style={styles.field}>
          <span style={styles.label}>시즌 상태</span>
          <select
            name="seasonStatus"
            value={rankingSeason.status}
            onChange={(event) => updateSeason('status', event.target.value)}
            style={styles.input}
          >
            <option value="draft">draft</option>
            <option value="live">live</option>
            <option value="closed">closed</option>
          </select>
        </label>
        <TextField
          name="startsAt"
          label="시작일"
          value={rankingSeason.startsAt}
          placeholder="2026-06-21"
          onChange={(value) => updateSeason('startsAt', value)}
        />
        <TextField
          name="endsAt"
          label="종료일"
          value={rankingSeason.endsAt}
          placeholder="2026-07-21"
          onChange={(value) => updateSeason('endsAt', value)}
        />
        <NumberField
          name="stage2Bonus"
          label="Stage 2 보너스 점수"
          min={0}
          max={200}
          step={5}
          suffix="점"
          value={rankingSeason.scorePolicy.stageBonus.stage2}
          onChange={(value) => updateStageBonus('stage2', value)}
        />
        <NumberField
          name="clearBonus"
          label="클리어 보너스 점수"
          min={0}
          max={200}
          step={5}
          suffix="점"
          value={rankingSeason.scorePolicy.clearBonus}
          onChange={(value) => updateScorePolicy('clearBonus', value)}
        />
      </div>

      <h2 style={styles.tableTitle}>순위 보상</h2>
      <div style={styles.rewardTable}>
        {rankingSeason.rewardTiers.map((tier, index) => (
          <div key={tier.label} style={styles.rewardRow}>
            <NumberField
              name={`rewardRankTo${index}`}
              label="순위"
              min={1}
              max={100}
              step={1}
              suffix="위까지"
              value={tier.rankTo}
              onChange={(value) => updateRewardTier(index, 'rankTo', value)}
            />
            <NumberField
              name={`rewardGold${index}`}
              label="골드"
              min={0}
              max={99999}
              step={1}
              suffix="골드"
              value={tier.gold}
              onChange={(value) => updateRewardTier(index, 'gold', value)}
            />
            <TextField
              name={`rewardBadge${index}`}
              label="배지명"
              value={tier.badge}
              onChange={(value) => updateRewardTier(index, 'badge', value)}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

function SectionTitle({ title, subtitle }) {
  return (
    <div style={styles.sectionTitle}>
      <h2 style={styles.sectionHeading}>{title}</h2>
      <p style={styles.sectionSubtitle}>{subtitle}</p>
    </div>
  )
}

function NumberField({ name, label, value, min, max, step, suffix, onChange }) {
  const handleChange = (event) => onChange(Number(event.target.value))
  return (
    <label style={styles.field}>
      <span style={styles.label}>{label}</span>
      <span style={styles.inputWrap}>
        <input
          name={name}
          type="number"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={handleChange}
          onInput={handleChange}
          style={styles.input}
        />
        <span style={styles.suffix}>{suffix}</span>
      </span>
      <span style={styles.range}>{min} - {max}</span>
    </label>
  )
}

function TextField({ name, label, value, placeholder, onChange }) {
  const handleChange = (event) => onChange(event.target.value)
  return (
    <label style={styles.field}>
      <span style={styles.label}>{label}</span>
      <input
        name={name}
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={handleChange}
        onInput={handleChange}
        style={styles.input}
      />
    </label>
  )
}

function CheckboxField({ name, label, description, checked, onChange }) {
  const handleChange = (event) => onChange(event.target.checked)
  return (
    <label style={styles.checkboxField}>
      <input
        name={name}
        type="checkbox"
        checked={checked}
        onChange={handleChange}
        style={styles.checkboxInput}
      />
      <span style={styles.checkboxCopy}>
        <span style={styles.checkboxLabel}>{label}</span>
        <span style={styles.checkboxDescription}>{description}</span>
      </span>
      <span style={styles.toggleTrack(checked)}>
        <span style={styles.toggleKnob(checked)} />
      </span>
    </label>
  )
}

function PreviewItem({ label, value }) {
  return (
    <>
      <dt style={styles.previewLabel}>{label}</dt>
      <dd style={styles.previewValue}>{value}</dd>
    </>
  )
}

function buildPreview(config) {
  const stage1Duration = config.balance.stageDurationSec.stage1
  const stage2Duration = config.balance.stageDurationSec.stage2
  const stage2Bonus = config.rankingSeason.scorePolicy.stageBonus.stage2
  const clearBonus = config.rankingSeason.scorePolicy.clearBonus
  const hp = 100 + config.balance.player.maxHpBonus
  const speed = Math.round(3 * config.balance.player.speedMultiplier * 100) / 100
  const rewards = config.rankingSeason.rewardTiers
    .map((tier) => `${tier.label} ${tier.gold}G`)
    .join(' / ')

  return {
    stage1Clear: `${stage1Duration + clearBonus}점`,
    stage2Clear: `${stage2Duration + stage2Bonus + clearBonus}점`,
    hp: `${hp}`,
    speed: `${speed}`,
    rewards,
  }
}

const styles = {
  // ── 웨이브 컨트롤 탭 ──
  waveStageRow: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' },
  waveBadge: (custom) => ({
    fontSize: 12, padding: '4px 10px', borderRadius: 999,
    background: custom ? '#3b2f13' : '#1c2431',
    color: custom ? '#ffd35c' : '#8fa3bf',
    border: `1px solid ${custom ? '#8a6d1f' : '#2c3a4f'}`,
  }),
  waveList: { display: 'flex', flexDirection: 'column', gap: 10, maxHeight: '52vh', overflowY: 'auto', paddingRight: 4 },
  waveRow: { border: '1px solid #2c3a4f', borderRadius: 10, padding: '10px 12px', background: '#161c27' },
  waveRowHead: { display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 8 },
  waveRowTitle: { fontSize: 13, color: '#dfe8f5', minWidth: 64 },
  waveTimeGroup: { display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#8fa3bf' },
  waveTimeLabel: { marginRight: 2 },
  waveTimeInput: { width: 46, padding: '4px 6px', borderRadius: 6, border: '1px solid #2c3a4f', background: '#0f141d', color: '#eef4fd' },
  waveTimeUnit: { color: '#65758c' },
  waveBossLabel: { display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#e8b4ff' },
  waveTotal: { fontSize: 12, color: '#8fa3bf', marginLeft: 'auto' },
  waveRemoveButton: { padding: '5px 10px', borderRadius: 8, border: '1px solid #5c2c34', background: '#2a161b', color: '#ff9aa6', cursor: 'pointer', fontSize: 12 },
  waveZombieGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 6 },
  waveZombieCell: (enabled) => ({
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6,
    padding: '6px 8px', borderRadius: 8,
    border: `1px solid ${enabled ? '#33507a' : '#222c3b'}`,
    background: enabled ? '#182338' : '#131822',
    opacity: enabled ? 1 : 0.65,
  }),
  waveZombieCheck: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#dfe8f5', whiteSpace: 'nowrap' },
  waveZombieCount: { width: 54, padding: '4px 6px', borderRadius: 6, border: '1px solid #2c3a4f', background: '#0f141d', color: '#eef4fd' },
  waveActions: { display: 'flex', gap: 8, marginTop: 12 },

  // ── 버스트 스폰(일회성) 미러 ──
  burstSection: { marginTop: 16, paddingTop: 12, borderTop: '1px solid #344052' },
  burstHeading: { margin: '0 0 4px', fontSize: 15, color: '#dfe8f5' },
  burstSubtitle: { margin: '0 0 10px', color: '#9caabc', fontSize: 11, lineHeight: 1.4 },
  burstList: { display: 'flex', flexDirection: 'column', gap: 6, maxHeight: '32vh', overflowY: 'auto', paddingRight: 4 },
  burstRow: (boss) => ({
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '7px 12px', borderRadius: 8,
    border: `1px solid ${boss ? '#c74e8a' : '#2c3a4f'}`,
    background: boss ? '#2a1622' : '#161c27',
  }),
  burstTime: { fontSize: 13, fontWeight: 900, color: '#7ee4c8', minWidth: 46, fontVariantNumeric: 'tabular-nums' },
  burstType: { fontSize: 13, color: '#dfe8f5', minWidth: 72 },
  burstCount: { fontSize: 12, color: '#ffcf70', fontWeight: 800 },
  burstBossBadge: {
    marginLeft: 'auto', fontSize: 11, fontWeight: 900,
    padding: '3px 10px', borderRadius: 999,
    background: '#8a2f5f', color: '#ffe3f0', border: '1px solid #c74e8a',
  },

  page: {
    height: '100vh',
    minHeight: 560,
    padding: '14px 16px',
    boxSizing: 'border-box',
    background: '#11151d',
    color: '#eef3f8',
    fontFamily: "'Segoe UI', 'Noto Sans KR', sans-serif",
    overflow: 'hidden',
  },
  header: {
    maxWidth: 1248,
    minHeight: 54,
    margin: '0 auto 10px',
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 16,
  },
  kicker: {
    margin: 0,
    color: '#7ee4c8',
    fontSize: 12,
    fontWeight: 900,
    letterSpacing: 0,
  },
  title: {
    margin: '2px 0',
    fontSize: 26,
    lineHeight: 1.1,
    letterSpacing: 0,
  },
  subtitle: {
    margin: 0,
    color: '#b9c4d4',
    fontSize: 13,
  },
  linkButton: {
    border: '1px solid #3a4658',
    borderRadius: 8,
    background: '#1a2230',
    color: '#eef3f8',
    padding: '8px 12px',
    fontWeight: 800,
    cursor: 'pointer',
  },
  tabs: {
    maxWidth: 1248,
    margin: '0 auto 10px',
    display: 'inline-flex',
    gap: 4,
    padding: 3,
    border: '1px solid #344052',
    borderRadius: 8,
    background: '#171e29',
  },
  tab: (active) => ({
    minWidth: 120,
    border: 0,
    borderRadius: 6,
    background: active ? '#7ee4c8' : 'transparent',
    color: active ? '#07100f' : '#d2dbe7',
    padding: '8px 12px',
    fontWeight: 900,
    cursor: 'pointer',
  }),
  content: {
    maxWidth: 1248,
    height: 'calc(100vh - 110px)',
    minHeight: 430,
    margin: '0 auto',
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1fr) 318px',
    gap: 12,
    alignItems: 'stretch',
  },
  panel: {
    border: '1px solid #344052',
    borderRadius: 8,
    background: '#171e29',
    padding: 14,
    minHeight: 0,
    overflowY: 'auto',
  },
  previewPanel: {
    border: '1px solid #344052',
    borderRadius: 8,
    background: '#17212b',
    padding: 14,
    minHeight: 0,
    overflow: 'hidden',
  },
  sectionTitle: {
    marginBottom: 10,
  },
  sectionHeading: {
    margin: '0 0 4px',
    fontSize: 20,
    lineHeight: 1.12,
    letterSpacing: 0,
  },
  sectionSubtitle: {
    margin: 0,
    color: '#b9c4d4',
    fontSize: 12,
    lineHeight: 1.35,
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(176px, 1fr))',
    gap: 10,
  },
  operationsGroup: {
    marginTop: 12,
    paddingTop: 12,
    borderTop: '1px solid #344052',
  },
  checkboxField: {
    minHeight: 52,
    display: 'grid',
    gridTemplateColumns: 'auto minmax(0, 1fr) auto',
    alignItems: 'center',
    gap: 10,
    padding: '8px 10px',
    border: '1px solid #344052',
    borderRadius: 8,
    background: '#111922',
    cursor: 'pointer',
  },
  checkboxInput: {
    width: 18,
    height: 18,
    margin: 0,
    accentColor: '#7ee4c8',
    cursor: 'pointer',
  },
  checkboxCopy: {
    display: 'grid',
    gap: 3,
    minWidth: 0,
  },
  checkboxLabel: {
    color: '#f5f8fb',
    fontSize: 13,
    fontWeight: 900,
  },
  checkboxDescription: {
    color: '#9caabc',
    fontSize: 11,
    lineHeight: 1.3,
    fontWeight: 700,
  },
  field: {
    display: 'grid',
    gap: 5,
    minWidth: 0,
  },
  label: {
    color: '#dfe7f2',
    fontSize: 12,
    fontWeight: 850,
  },
  inputWrap: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1fr) auto',
    alignItems: 'center',
    gap: 8,
  },
  input: {
    width: '100%',
    minHeight: 34,
    border: '1px solid #465368',
    borderRadius: 8,
    background: '#0f151f',
    color: '#f5f8fb',
    padding: '6px 9px',
    boxSizing: 'border-box',
    fontWeight: 800,
  },
  suffix: {
    color: '#ffcf70',
    fontSize: 12,
    fontWeight: 900,
  },
  range: {
    color: '#8e9bad',
    fontSize: 11,
  },
  tableTitle: {
    margin: '14px 0 8px',
    fontSize: 16,
  },
  rewardTable: {
    display: 'grid',
    gap: 8,
  },
  rewardRow: {
    display: 'grid',
    gridTemplateColumns: '120px 128px minmax(0, 1fr)',
    gap: 8,
    padding: 8,
    border: '1px solid #344052',
    borderRadius: 8,
    background: '#111922',
  },
  statusBox: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 10,
    padding: '2px 0 10px',
    borderBottom: '1px solid #344052',
  },
  statusLabel: {
    color: '#9caabc',
    fontWeight: 800,
  },
  previewGroup: {
    marginTop: 12,
  },
  previewTitle: {
    margin: '0 0 10px',
    fontSize: 16,
  },
  previewList: {
    display: 'grid',
    gridTemplateColumns: '96px minmax(0, 1fr)',
    gap: '8px 10px',
    margin: 0,
  },
  previewLabel: {
    color: '#9caabc',
    fontSize: 12,
    fontWeight: 850,
  },
  previewValue: {
    margin: 0,
    color: '#f5f8fb',
    fontSize: 12,
    fontWeight: 900,
    overflowWrap: 'anywhere',
  },
  buttonRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 8,
    marginTop: 14,
  },
  saveButton: {
    border: 0,
    borderRadius: 8,
    background: '#7ee4c8',
    color: '#07100f',
    minHeight: 38,
    fontWeight: 950,
    cursor: 'pointer',
  },
  resetButton: {
    border: '1px solid #465368',
    borderRadius: 8,
    background: '#202a36',
    color: '#f5f8fb',
    minHeight: 38,
    fontWeight: 900,
    cursor: 'pointer',
  },
  toggleTrack: (enabled) => ({
    flex: '0 0 auto',
    width: 46,
    height: 26,
    padding: 3,
    border: '1px solid #050b10',
    borderRadius: 999,
    background: enabled ? '#7ee4c8' : '#465368',
    boxSizing: 'border-box',
  }),
  toggleKnob: (enabled) => ({
    display: 'block',
    width: 18,
    height: 18,
    borderRadius: '50%',
    background: '#f5f8fb',
    transform: enabled ? 'translateX(20px)' : 'translateX(0)',
    transition: 'transform 120ms ease',
  }),
  note: {
    margin: '12px 0 0',
    color: '#b9c4d4',
    fontSize: 11,
    lineHeight: 1.4,
  },
}
