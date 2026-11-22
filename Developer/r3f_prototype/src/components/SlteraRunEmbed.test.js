// 본게임에 실린 레이서(public/minigame/sltera-run): Terry 11-22 — 3스테이지 뒤 탑승 레이스는 선택지 없이 무조건 체육관→식당 한 판.
// 그리고 종료 메시지가 처치 수를 실어 보내야 랭킹 보너스가 붙는다(빠지면 늘 0점).
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const html = readFileSync(new URL('../../public/minigame/sltera-run/index.html', import.meta.url), 'utf8')

describe('embedded Sltera run', () => {
  it('forces the gym→cafeteria course in embed mode, no stage pick or restart', () => {
    expect(html).toMatch(/if \(EMBED \|\| PARAMS\.get\('course'\) === 'gym-to-cafeteria'\) selStage = 3;/)
    for (const id of ['stageSelBtn', 'pStageBtn', 'restartBtn', 'pRestartBtn']) {
      expect(html).toMatch(new RegExp(`class="[^"]*noEmbed[^"]*" id="${id}"`))
    }
    expect(html).toContain('body.embed .noEmbed { display: none; }')
  })

  it('sends kills and arrival with the exit message', () => {
    expect(html).toMatch(/postMessage\(\{ type: 'sltera-run:exit', kills: state\.kills, arrived: state\.overReason === 'clear' \}/)
  })
})
