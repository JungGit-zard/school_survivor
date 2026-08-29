import { useT } from '../lib/i18n.js'

// 일일/주간 랭킹 창은 스테이지 랭킹과 통합 랭킹 두 화면에 똑같이 나온다.
// 같은 개념이 화면마다 다르게 생기면 안 되므로 목록과 버튼을 여기 한 곳에서만 정의한다.
export const RANKING_WINDOWS = [
  { id: 'daily', labelKey: 'ranking.tab.daily', noteKey: 'ranking.tab.dailyNote' },
  { id: 'weekly', labelKey: 'ranking.tab.weekly', noteKey: 'ranking.tab.weeklyNote' },
]

// 선택 상태를 색으로만 알리면 색각 이상 사용자가 어느 보드를 보는지 알 수 없다.
// 그래서 세 가지 비색상 단서를 함께 준다: ●/○ 마커, 밑줄, 눌린 깊이.
// 두 마커의 글자폭이 같아 전환해도 라벨이 흔들리지 않는다.
export default function RankingWindowTabs({ ariaLabel, value, onChange }) {
  // 부모가 아니라 여기서 로케일을 구독해야 언어를 바꿨을 때 라벨이 확실히 따라온다.
  const t = useT()
  return (
    <div role="group" aria-label={ariaLabel} style={styles.tabs}>
      {RANKING_WINDOWS.map((window) => {
        const active = window.id === value
        return (
          <button
            key={window.id}
            type="button"
            aria-pressed={active}
            style={active ? styles.tabActive : styles.tab}
            onClick={() => onChange(window.id)}
          >
            <span aria-hidden="true" style={styles.marker}>{active ? '●' : '○'}</span>
            {t(window.labelKey)}
          </button>
        )
      })}
    </div>
  )
}

const tabBase = {
  // 44px는 모바일 터치 타깃 최소 권장치다. 42px이던 통합 랭킹 탭도 여기에 맞춰 올라간다.
  minHeight: 44,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
  border: '2px solid #050209',
  borderRadius: 8,
  color: '#050209',
  fontFamily: 'inherit',
  fontSize: 14,
  lineHeight: 1,
  fontWeight: 1000,
  cursor: 'pointer',
}

const styles = {
  tabs: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 },
  tab: {
    ...tabBase,
    background: '#f6ead0',
    boxShadow: '0 3px 0 #050209',
    textDecoration: 'none',
  },
  tabActive: {
    ...tabBase,
    background: '#f7d17e',
    boxShadow: 'inset 0 -3px 0 rgba(5,2,9,0.45)',
    transform: 'translateY(2px)',
    textDecoration: 'underline',
    textUnderlineOffset: 3,
  },
  marker: { fontSize: 11, lineHeight: 1 },
}
