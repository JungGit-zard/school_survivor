import { getInvestigationTargets } from './src/lib/studentProximity.js'
import { getDialogueText } from './src/dialogues/dialogueStore.js'
import { commitFirebaseStudioRuntime } from './src/lib/studioRuntimeState.js'

commitFirebaseStudioRuntime({ propPlacements: {} }, { revision: 0 })

for (const stageId of ['stage1', 'stage2', 'stage3', 'stage4']) {
  for (const target of getInvestigationTargets(stageId)) {
    const line = getDialogueText(target.dialogueId, 'ko')
    if (line.length <= 20) console.log(stageId, target.id, target.dialogueId, line.length, line)
  }
}
