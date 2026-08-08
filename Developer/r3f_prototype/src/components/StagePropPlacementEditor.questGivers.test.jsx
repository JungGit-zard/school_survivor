// @vitest-environment jsdom
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { describe, expect, it, vi } from 'vitest'
import { getStageQuestDefinitions } from '../lib/quests.js'
import StagePropPlacementEditor, {
  getCanonicalQuestGiverPlacements,
  getQuestGiverPresentation,
} from './StagePropPlacementEditor.jsx'

describe('Graphics Studio quest giver props', () => {
  it('derives every giver, including Stage 2 copy placements, from the canonical quest giver placement IDs', () => {
    const colors = new Set()

    for (const stageId of ['stage1', 'stage2', 'stage3', 'stage4']) {
      const canonicalPlacements = getCanonicalQuestGiverPlacements(stageId)
      expect(canonicalPlacements).toHaveLength(getStageQuestDefinitions(stageId).length)

      for (const placement of canonicalPlacements) {
        const presentation = getQuestGiverPresentation(stageId, placement.id)
        expect(presentation?.quest.giver.placementId).toBeTruthy()
        expect(presentation?.color).toMatch(/^#[0-9a-f]{6}$/)
        colors.add(presentation.color)
      }
    }

    expect(colors.size).toBe(8)
    expect(getQuestGiverPresentation('stage2', 'stage2-student-east-north-copy-1')?.quest.id)
      .toBe('stage2-bandage')
  })

  it('labels each giver separately and restores a deliberately deleted giver only from its dedicated action', () => {
    const onChange = vi.fn()
    const container = document.createElement('div')
    document.body.append(container)
    const root = createRoot(container)
    const [talkBook, attendance] = getStageQuestDefinitions('stage1')

    try {
      act(() => {
        root.render(<StagePropPlacementEditor onChange={onChange} />)
      })

      const talkBookList = container.querySelector(`[data-testid="prop-list-${talkBook.giver.placementId}"]`)
      const attendanceList = container.querySelector(`[data-testid="prop-list-${attendance.giver.placementId}"]`)
      const talkBookMarker = container.querySelector(`[data-testid="prop-marker-${talkBook.giver.placementId}"]`)
      const restore = container.querySelector(`[data-testid="quest-giver-restore-${talkBook.giver.placementId}"]`)

      expect(talkBookList.textContent).toContain('퀘스트 제공자')
      expect(attendanceList.textContent).toContain('퀘스트 제공자')
      expect(talkBookList.style.borderColor).not.toBe(attendanceList.style.borderColor)
      expect(talkBookMarker.getAttribute('aria-label')).toContain('퀘스트 제공자')
      expect(talkBookMarker.textContent).toContain('퀘스트 제공자')
      expect(restore.disabled).toBe(true)

      act(() => {
        talkBookMarker.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))
      })

      expect(container.querySelector(`[data-testid="prop-marker-${talkBook.giver.placementId}"]`)).toBeNull()
      expect(restore.disabled).toBe(false)

      act(() => {
        restore.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      })

      const restoredStage = onChange.mock.calls.at(-1)[0].stage1
      expect(restoredStage.find(({ id }) => id === talkBook.giver.placementId)).toMatchObject({
        id: talkBook.giver.placementId,
        type: 'unconsciousStudent',
        position: [-6.2, 0, 0.6],
      })
      expect(restore.disabled).toBe(true)
    } finally {
      act(() => root.unmount())
      container.remove()
    }
  })
})
