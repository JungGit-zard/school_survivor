import { useCallback, useEffect, useState } from 'react'
import { useGameStore } from '../store/useGameStore.js'
import { emitUiSfx } from '../lib/uiSfx.js'
import { playDialogueVoice, stopDialogueVoice } from '../lib/dialogueVoice.js'
import { getDialogueText } from '../dialogues/dialogueStore.js'
import { useT } from '../lib/i18n.js'
import { schoolButton } from '../lib/uiStyle.js'
import SlteraRunOverlay from './SlteraRunOverlay.jsx'
import nikuoSlteraPortraitSrc from '../assets/character/nikuo_sltera.webp'
import rosariIntroPortraitSrc from '../assets/character/rosari_intro.jpg'

// Stage 3 탈출 컷(Terry 2026-11-22): 슬테라 운전자 니쿠오가 차를 몰고 와 로자리에게 타라고 한다.
// - Stage 3 탈출 때마다(보스 처치 여부 무관) 결과창 위에 뜬다. 저장 필드를 새로 두지 않는다.
// - UI는 Stage 1 시작 로자리 대사(HUD 스테이지 인트로)와 같다: HUD가 그 스타일 객체를 dialogueStyles로 넘긴다.
// - 마지막 대사 뒤 '슬테라에 타시겠습니까?' → 탑니다(슬테라 코스트 런) / 타지 않습니다. 두 길 모두 로비로 끝난다.
// - 결과 확정: 스토어 finalizeDeferredStageResult({ racerKills }) (backendmini, 킬 상한·점수 규칙은 lib/slteraRacerBonus.js).
//   이 컴포넌트는 저장·랭킹 로직을 직접 건드리지 않는다.
// HUD는 Stage 3 클리어 동안 key={gameKey}로 이 컴포넌트를 마운트한다 — 마운트될 때마다 첫 대사부터 시작한다.
export const NIKUO_CUT_STAGE_ID = 'stage3'
export const NIKUO_CUT_LINES = Object.freeze([
  Object.freeze({ id: 'ending.stage3.nikuo.001', speaker: 'nikuo' }),
  Object.freeze({ id: 'ending.stage3.nikuo.002', speaker: 'rosari' }),
  Object.freeze({ id: 'ending.stage3.nikuo.003', speaker: 'nikuo' }),
  Object.freeze({ id: 'ending.stage3.nikuo.004', speaker: 'nikuo' }),
])
const CHOICE_STEP = NIKUO_CUT_LINES.length

export function isNikuoCutStage(phase, stageId) {
  return phase === 'cleared' && stageId === NIKUO_CUT_STAGE_ID
}

export default function NikuoCut({ onFinish, dialogueStyles: ds }) {
  const t = useT()
  // 0..대사 수-1 = 대사, CHOICE_STEP = 선택지, -1 = 닫힘(레이서 중이거나 로비로 가는 중).
  const [step, setStep] = useState(0)
  const [racerOpen, setRacerOpen] = useState(false)
  const line = step >= 0 && step < CHOICE_STEP ? NIKUO_CUT_LINES[step] : null
  const isRosari = line?.speaker === 'rosari'

  useEffect(() => {
    // 로자리 대사만 기존 주인공 목소리. 니쿠오 전용 목소리는 아직 없다(soundmini 몫) — 글자만 나온다.
    if (!line || line.speaker !== 'rosari') return undefined
    playDialogueVoice(getDialogueText(line.id), 'protagonistIntro', { volume: 1 })
    return () => stopDialogueVoice()
  }, [line])

  // 두 출구(타지 않습니다 = 0킬, 레이서 종료 = 레이서 킬)는 모두 여기 한 곳을 지난다.
  const finish = useCallback((racerKills = 0) => {
    useGameStore.getState().finalizeDeferredStageResult?.({ racerKills })
    onFinish?.()
  }, [onFinish])
  const decline = useCallback(() => { setStep(-1); finish(0) }, [finish])
  const accept = useCallback(() => { setStep(-1); setRacerOpen(true) }, [])
  // 레이서 종료 단일 콜백. result = { kills, arrived }(SlteraRunOverlay.readSlteraRunResult가 정리한 값).
  const closeRacer = useCallback((result) => { setRacerOpen(false); finish(result?.kills ?? 0) }, [finish])

  return (
    <>
      {step >= 0 && (
        <div
          data-testid="nikuo-cut-catcher"
          style={ds.catcher}
          onPointerDown={() => {
            if (step >= CHOICE_STEP) return // 선택지 화면의 빈 곳 탭은 아무 것도 하지 않는다.
            emitUiSfx('advance')
            setStep((s) => (s < 0 || s >= CHOICE_STEP ? s : s + 1))
          }}
        >
          {line && (
            // 건너뛰기는 대사만 건너뛴다 — 탑니다/타지 않습니다 분기는 그대로 묻는다.
            <button
              type="button"
              data-testid="nikuo-cut-skip"
              data-ui-sfx="close"
              style={ds.skipButton}
              onPointerDown={(event) => event.stopPropagation()}
              onClick={() => setStep((s) => (s < 0 ? s : CHOICE_STEP))}
            >
              {t('hud.skipIntro')}
            </button>
          )}
          <div style={ds.box} role="dialog" aria-modal="true" aria-label={t('hud.nikuoCut.aria')}>
            <div style={ds.row}>
              <div style={ds.portraitFrame}>
                <img
                  data-testid="nikuo-cut-portrait"
                  data-speaker={isRosari ? 'rosari' : 'nikuo'}
                  src={isRosari ? rosariIntroPortraitSrc : nikuoSlteraPortraitSrc}
                  alt={t(isRosari ? 'hud.introPortraitAlt' : 'hud.nikuoCut.nikuoPortraitAlt')}
                  draggable={false}
                  style={isRosari ? ds.portrait : styles.nikuoPortrait}
                />
              </div>
              {/* Stage 1 시작 로자리 대사와 같은 줄 — 이름표 없이 초상이 말하는 사람을 보여 준다. */}
              <div data-testid="nikuo-cut-line" style={ds.line} aria-live="polite">
                {line ? getDialogueText(line.id) : t('hud.nikuoCut.question')}
              </div>
            </div>
            {line ? (
              <div style={ds.hint}>{t('hud.tapToContinue')}</div>
            ) : (
              <div data-testid="nikuo-cut-choice" style={styles.choiceRow}>
                <button
                  type="button"
                  data-testid="nikuo-cut-yes"
                  data-ui-sfx="confirm"
                  style={styles.choiceYes}
                  onPointerDown={(event) => event.stopPropagation()}
                  onClick={accept}
                >
                  {t('hud.nikuoCut.yes')}
                </button>
                <button
                  type="button"
                  data-testid="nikuo-cut-no"
                  data-ui-sfx="close"
                  style={styles.choiceNo}
                  onPointerDown={(event) => event.stopPropagation()}
                  onClick={decline}
                >
                  {t('hud.nikuoCut.no')}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      {racerOpen && <SlteraRunOverlay onExit={closeRacer} />}
    </>
  )
}

const styles = {
  // 니쿠오 초상: 실제 SlteraCar 모델에서 찍은 운전석 정사각 컷(로자리 초상과 달리 확대 없이 그대로).
  nikuoPortrait: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    objectPosition: 'center',
    display: 'block',
    userSelect: 'none',
  },
  // 탑니다/타지 않습니다: 게임 공용 버튼, 높이 52px(터치 44px 이상), 나란히 두 개.
  choiceRow: { display: 'flex', gap: 10, marginTop: 6 },
  choiceYes: { ...schoolButton('primary'), flex: '1 1 0', minHeight: 52, padding: '12px 10px', fontSize: 18 },
  choiceNo: { ...schoolButton('paper'), flex: '1 1 0', minHeight: 52, padding: '12px 10px', fontSize: 18 },
}
