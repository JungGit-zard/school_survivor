// 슬테라 즉시 출현(오너 치트, Terry 2026-11-08) UI.
// - SlteraInstantSpawnToggle: 켜기/끄기 항목. 개발 빌드에서는 타이틀 치트 메뉴(↑↓↑↓ASD) 안에 있다.
// - SlteraMasterTitleToggle: 라이브(배포 빌드)용 — 프로젝트 마스터(Terry 구글 계정)로 로그인했을 때만 타이틀
//   왼쪽 아래에 같은 토글이 뜬다(치트 코드 불필요). 다른 치트는 여전히 개발 빌드 전용이다.
// - 기본 export SlteraInstantSpawnButton: 사용 자격(개발 빌드 또는 마스터) + 모드 켜짐 + S1~S5 런(SlteraEvent
//   마운트) 진행 중일 때만 화면 왼쪽 위(점수 아래)에 뜨는 작은 버튼. 누르면 질주가 바로 시작되고, 이미 질주 중이면 무시된다.
// 게스트·일반 계정은 배포 빌드에서 토글도 버튼도 보지 못한다. 상태는 lib/slteraInstantSpawn.js(탭 메모리).
import { useSyncExternalStore } from 'react'
// GameplayScreen과 같은 평문 t — 부모(타이틀·게임 화면)가 다시 그릴 때 현재 언어로 따라온다.
import { t } from '../lib/i18n.js'
import {
  hasSlteraInstantSpawnTarget, isSlteraInstantSpawnEnabled, requestSlteraInstantPass, setSlteraInstantSpawnEnabled,
  subscribeSlteraInstantSpawn,
} from '../lib/slteraInstantSpawn.js'
import { uiBorders, uiPalette, uiShadows, uiType } from '../lib/uiStyle.js'
import { isProjectMaster } from '../lib/projectAdmin.js'
import { useAuthStore } from '../store/useAuthStore.js'

/** 슬테라 즉시 출현을 쓸 수 있나: 개발 빌드(치트 메뉴와 같은 범위) 또는 프로젝트 마스터 계정만. */
export function canUseSlteraInstantSpawn(user, dev = import.meta.env.DEV) {
  return dev === true || isProjectMaster(user)
}

function useSlteraInstantSpawnEnabled() {
  return useSyncExternalStore(subscribeSlteraInstantSpawn, isSlteraInstantSpawnEnabled, isSlteraInstantSpawnEnabled)
}

export function SlteraInstantSpawnToggle({ style }) {
  const enabled = useSlteraInstantSpawnEnabled()
  return (
    <button
      type="button"
      data-testid="sltera-instant-toggle"
      data-ui-sfx={enabled ? 'toggleOff' : 'toggleOn'}
      aria-pressed={enabled}
      style={style}
      onClick={() => setSlteraInstantSpawnEnabled(!enabled)}
    >
      {t(enabled ? 'sltera.cheatToggleOn' : 'sltera.cheatToggleOff')}
    </button>
  )
}

// 라이브 타이틀용: 마스터 계정에게만 보이는 작은 토글(치트 코드 없이). 그 외에는 아무것도 그리지 않는다.
export function SlteraMasterTitleToggle() {
  const user = useAuthStore((state) => state.user)
  if (!isProjectMaster(user)) return null
  return (
    <div data-testid="sltera-master-toggle" style={styles.masterWrap}>
      <SlteraInstantSpawnToggle style={styles.masterToggle} />
    </div>
  )
}

export default function SlteraInstantSpawnButton({ phase }) {
  const user = useAuthStore((state) => state.user)
  const enabled = useSlteraInstantSpawnEnabled()
  const hasTarget = useSyncExternalStore(subscribeSlteraInstantSpawn, hasSlteraInstantSpawnTarget, hasSlteraInstantSpawnTarget)
  if (!canUseSlteraInstantSpawn(user) || !enabled || !hasTarget || phase !== 'playing') return null
  return (
    <button
      type="button"
      data-testid="sltera-instant-spawn"
      // 누르면 슬테라 질주(엔진음)가 바로 시작된다 — 그 소리가 피드백이라 UI 탭음은 겹치지 않게 뺀다.
      data-ui-sfx="none"
      aria-label={t('sltera.spawnAria')}
      title={t('sltera.spawnAria')}
      style={styles.button}
      onClick={(event) => {
        // 키보드 이동(Space·Enter)이 이 버튼을 다시 누르지 않게 포커스를 놓는다.
        event.currentTarget.blur()
        requestSlteraInstantPass()
      }}
    >
      {t('sltera.spawnButton')}
    </button>
  )
}

const styles = {
  masterWrap: {
    position: 'absolute',
    left: 'max(8px, calc(env(safe-area-inset-left, 0px) + 8px))',
    bottom: 'max(10px, calc(env(safe-area-inset-bottom, 0px) + 10px))',
    zIndex: 4,
  },
  masterToggle: {
    minHeight: 36,
    padding: '0 10px',
    borderRadius: 8,
    border: uiBorders.strong,
    background: 'linear-gradient(180deg, #eef2f7 0%, #b7bec8 100%)',
    color: uiPalette.ink,
    fontFamily: uiType.family,
    fontSize: 12,
    fontWeight: uiType.weightHeavy,
    boxShadow: uiShadows.pressSmall,
    cursor: 'pointer',
  },
  // 위치(2026-11-08 uimini 모바일 검수): 예전 top 42%는 가로 화면(844x390 → 220px 세로 프레임)에서 왼손 엄지가
  // 조이스틱을 잡는 자리 바로 위라 링과 겹쳤다. 이제 왼쪽 위 HUD 열(가방 → 점수) 아래, 엄지가 닿지 않는 곳에 둔다.
  // 점수 칸 = 안전 위 + 50px ~ +85px → 그 아래 +96px. 왼쪽 여백은 HUD 열과 같은 14px.
  // zIndex 9: HUD 루트(10, pointer-events none)보다 아래 — 보스·마틸다 경고나 퀘스트 팝업이 뜨면 그쪽이 위에 그려진다.
  // 조이스틱(100)도 이 버튼 위에 그려진다.
  button: {
    position: 'absolute',
    left: 'max(14px, env(safe-area-inset-left, 0px))',
    top: 'calc(max(14px, env(safe-area-inset-top, 0px)) + 96px)',
    zIndex: 9,
    minWidth: 64,
    height: 44,
    padding: '0 10px',
    borderRadius: 8,
    border: uiBorders.strong,
    background: 'linear-gradient(180deg, #eef2f7 0%, #b7bec8 100%)',
    color: uiPalette.ink,
    fontFamily: uiType.family,
    fontSize: 14,
    fontWeight: uiType.weightHeavy,
    boxShadow: uiShadows.pressSmall,
    cursor: 'pointer',
    pointerEvents: 'auto',
    touchAction: 'manipulation',
    whiteSpace: 'nowrap',
  },
}
