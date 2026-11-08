// 슬테라 즉시 출현(오너 치트, Terry 2026-11-08) UI.
// - SlteraInstantSpawnToggle: 켜기/끄기 항목. 개발 빌드에서는 타이틀 치트 메뉴(↑↓↑↓ASD) 안에 있다.
// - SlteraMasterTitleToggle: 라이브(배포 빌드)용 — 프로젝트 마스터(Terry 구글 계정)로 로그인했을 때만 타이틀
//   왼쪽 아래에 같은 토글이 뜬다(치트 코드 불필요). 다른 치트는 여전히 개발 빌드 전용이다.
// - 기본 export SlteraInstantSpawnButton: 사용 자격(개발 빌드 또는 마스터) + 모드 켜짐 + S1~S5 런(SlteraEvent
//   마운트) 진행 중일 때만 화면 왼쪽에 뜨는 작은 버튼. 누르면 질주가 바로 시작되고, 이미 질주 중이면 무시된다.
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
  button: {
    position: 'absolute',
    left: 'max(8px, calc(env(safe-area-inset-left, 0px) + 8px))',
    top: '42%',
    zIndex: 11,
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
