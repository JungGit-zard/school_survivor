import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { RECORD_KEYS } from './playerRecords.js'
import { validateUserNodeWrite } from '../../test/fakeProgressDatabase.js'

// Deterministic unit expressions, not a deployed Rules/emulator claim.
const bytes = readFileSync(new URL('../../database.rules.json', import.meta.url))
const rules = JSON.parse(bytes).rules
const recordsRules = rules.users.$uid.progress.records
const snapshot = value => ({
  val: () => value,
  exists: () => value !== undefined && value !== null,
  isNumber: () => typeof value === 'number' && Number.isFinite(value),
  child: key => snapshot(value?.[key]),
  hasChildren: keys => keys.every(key => value?.[key] !== undefined && value?.[key] !== null),
})
const evaluate = (expression, next, old) => new Function('newData','data',`return (${expression})`)(snapshot(next),snapshot(old))

describe('existing ledger wire contract and baseline Firebase Rules', () => {
  // a9 바이트(d7aa0a2d…)에서 encounteredZombieTypes 화이트리스트에 E34~E45만 더한 바이트다(25066a57).
  // 클라이언트가 E34~E45 조우를 저장하므로 이 Rules를 클라이언트보다 먼저 배포해야 한다 —
  // 아니면 해당 조우가 들어간 progress 쓰기 전체가 .validate에서 거부된다.
  // 2026-10-26: titleSettings.playerAppearance에 'rosari'만 추가(9dcadbc7…). 스테일 트리 전량 배포 복구용 상위집합.
  // 2026-10-27: 9dcadbc7에서 titleSettings.playerOutfit('default'|'winter') 한 줄만 추가(1bd0e5bd…).
  // 클라이언트가 playerOutfit을 저장하므로 이 Rules를 클라이언트보다 먼저 배포해야 한다.
  // 2026-10-29: 1bd0e5bd에서 runLedger/$run/at(선택)와 users/$uid/ledgerSummary(단조 증가)만 추가(9279bf98…).
  // 클라이언트가 새 run 행에 at을 쓰므로 이 Rules를 클라이언트보다 먼저 배포해야 한다.
  // 2026-11-01: 9279bf98에서 로자리 의상 3곳만 추가(f969eedf…): progress/outfitUnlocks/$outfitId(=1, 5벌),
  // titleSettings.playerOutfit 6값, 공개 랭킹 global·stage 항목의 선택 필드 outfitId(6값).
  // 클라이언트가 셋 다 쓰므로(progress·titleSettings·공개 항목 모두 $other:false) 이 Rules를 먼저 배포해야 한다.
  // 2026-11-07: f969eedf에서 encounteredZombieTypes 화이트리스트에 E46~E70(투사체 좀비 1·2차 25종)만 추가(509c9e29…).
  // 클라이언트(firebaseProgress ZOMBIE_ENCOUNTER_TYPES·도감)가 이 조우를 저장하므로 이 Rules를 클라이언트보다 먼저 배포해야 한다.
  // 2026-11-08: 509c9e29에서 Stage 5·6 보상 키만 추가(5b46c44d…): encounteredZombieTypes에 B10(교감 좀비),
  // bossPassiveUnlocks에 b10ApprovalStamp·b05PrincipalMic, outfitUnlocks·titleSettings.playerOutfit·공개 랭킹 outfitId에
  // prefect·sportsDay. 기존 허용값은 하나도 빠지지 않았다. 클라이언트가 이 키를 저장하므로 Rules를 먼저 배포해야 한다.
  // 2026-11-14: 5b46c44d에서 encounteredZombieTypes 화이트리스트에 블록 좀비 E71~E88(18종)만 추가(aa677f2d…, 리뷰 SAFE).
  // 클라이언트(firebaseProgress ZOMBIE_ENCOUNTER_TYPES·도감)가 이 조우를 저장하므로 이 Rules를 클라이언트보다 먼저 배포해야 한다.
  // 2026-11-15: aa677f2d에서 encounteredZombieTypes 화이트리스트 끝에 2차 신규 좀비 E89~E106(18종)만 추가(b9f18d16…).
  // 블록 좀비 E71~E88을 포함한 기존 허용값은 하나도 빠지지 않았다. 클라이언트가 이 조우를 저장하므로 Rules를 먼저 배포해야 한다.
  // 2026-11-21: b9f18d16에서 스테이지 결과 1회 보장만 추가(Terry "중복은 어떤 경우라도 막는다"): runLedger/$run의 각 잎은
  // 행이 이미 있으면 같은 값으로만 다시 쓸 수 있고(옛 클라이언트의 통째 재기록은 통과), progress/resultWrites는 그 쓰기
  // 전에 없던 행(progress/lastResultKey)을 만들 때만 1 오른다. 새 클라이언트가 이 두 필드를 쓰므로 Rules를 먼저 배포해야 한다.
  it('pins the reviewed Rules bytes: a9 plus the E34-E45, E46-E70, E71-E88, E89-E106 and B10 encounter whitelist, the rosari appearance, the wardrobe playerOutfit, the run-ledger summary, the outfit unlocks/ranking outfitId incl. Stage 5/6 prefect and sportsDay, the B10/B05 boss passives, and the once-only stage result (write-once run rows + progress resultWrites/lastResultKey) (deploy Rules before the client)', () => {
    expect(createHash('sha256').update(bytes).digest('hex')).toBe('f259b6b1234c40fe316e2929b70224e595757ebe9652517b08d4b75ead42e65a')
  })
  it.each([1,2,3,4,5,6,7,8,9,10])('stage %i virtual key uses existing numeric run-row validator, not progress schema additions', n => {
    const key=`stage${n}BossDefeats`
    expect(RECORD_KEYS).toContain(key) // player-facing virtual API retained
    expect(recordsRules).not.toHaveProperty(key)
    // Evaluated by the rules-faithful harness (parent()-aware). A new row takes 1 or 0; a bad value never.
    const user = { schemaVersion: 1, updatedAt: 't', profile: { uid: 'u', displayName: '', nickname: '' }, progress: { goldTotal: 0, records: { totalRuns: 0 }, titleSettings: { vibration: true, reducedEffects: false, unlockAllWeaponsCheat: false, unlockAllStagesCheat: false } } }
    const node = records => ({ ...user, runLedger: { r: { stageId: `stage${n}`, records, gold: 0, best: { bestSurvivalSeconds: 0 } } } })
    expect(validateUserNodeWrite('u', user, node({ [key]: 1 }))).toEqual([])
    expect(validateUserNodeWrite('u', user, node({ [key]: 0 }))).toEqual([]) // explicit not-final, never legacy fallback
    for(const bad of [-1,'1']) expect(validateUserNodeWrite('u', user, node({ [key]: bad }))).not.toEqual([])
    // Write-once: an existing row's value can never be changed (0 -> 1 is a second write of the run).
    expect(validateUserNodeWrite('u', node({ [key]: 0 }), node({ [key]: 1 }))).not.toEqual([])
    // Safe-integer/final-event semantics live in projection; no new security-policy claim.
  })
  it('retains existing record no-erase, monotonic fallback, ledger presence and owner/admin boundary', () => {
    expect(recordsRules.$recordKey['.validate']).toBe('newData.isNumber() && newData.val() >= 0 && newData.val() <= 1000000000 && (!data.exists() || newData.val() >= data.val())')
    expect(evaluate(recordsRules.$recordKey['.validate'],0,1)).toBe(false)
    expect(evaluate(recordsRules['.validate'],{}, {totalRuns:1})).toBe(false)
    expect(rules.users.$uid['.validate']).toContain("!data.child('runLedger').exists() || newData.child('runLedger').exists()")
    expect(rules.users.$uid['.write']).toContain('auth != null')
    expect(rules.users.$uid['.write']).toContain('auth.uid === $uid')
  })
})
