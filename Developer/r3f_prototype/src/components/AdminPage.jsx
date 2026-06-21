import { useMemo, useState } from 'react'
import {
  DEFAULT_ADMIN_CONFIG,
  loadAdminConfig,
  normalizeAdminConfig,
  resetAdminConfig,
  saveAdminConfig,
} from '../lib/adminConfig.js'

const TAB_BALANCE = 'balance'
const TAB_RANKING = 'ranking'

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
      </nav>

      <main style={styles.content}>
        <section style={styles.panel}>
          {activeTab === TAB_BALANCE ? (
            <BalanceControls draft={draft} updateBalance={updateBalance} />
          ) : (
            <RankingControls
              draft={draft}
              updateSeason={updateSeason}
              updateScorePolicy={updateScorePolicy}
              updateStageBonus={updateStageBonus}
              updateRewardTier={updateRewardTier}
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

function BalanceControls({ draft, updateBalance }) {
  const { balance } = draft
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
  note: {
    margin: '12px 0 0',
    color: '#b9c4d4',
    fontSize: 11,
    lineHeight: 1.4,
  },
}
