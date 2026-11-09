// Stage 6 「운동장 최후의 조회」 데이터 교체(스펙 Part C C-2·C-4·C-5·C-6·C-7, 부록 C-A).
import { describe, expect, it } from 'vitest'
import { EXPANSION_BOSSES, EXPANSION_ENEMIES, EXPANSION_HAZARDS, EXPANSION_STAGES, getExpansionStageConfig } from './expansionContent.js'
import { EXPANSION_PART2_LIBRARY_ARCHIVE } from './expansionPart2Archive.js'
import { ENEMY_TYPE_CODES } from './enemyEntityPool.js'
import { getBurstEventsForStage, isBossType } from './burstEvents.js'

const S6 = EXPANSION_STAGES.stage6
const S6_HP = { E19: 30, E20: 64, E21: 36, E01: 20, E02: 174, E04: 80, E05: 174, E06: 796, E07: 40 }

describe('stage6 운동장 — 같은 id·기록 키·typeCode, 내용만 교체', () => {
  it('정체·경계 12×20·e04 8초·오버타임 240초·1부 데이터', () => {
    expect(S6).toMatchObject({
      id: 'stage6', order: 6, nameKo: '운동장 최후의 조회', themeKey: 'schoolyard', bossId: 'B05', enemyIds: ['E19', 'E20', 'E21'],
      durationSec: 240, bossSec: 150, portalSec: 210, matildaWarningSec: 205, matildaSec: 210,
      mapHalfXUnits: 12, mapHalfXBlocks: 3, mapHalfZUnits: 20, mapHalfZBlocks: 5, e04IntroSec: 8,
      clearRecordKey: 'stage6Clears', bestRecordKey: 'stage6BestSurvivalSec', newEnemyHpMode: 'absolute', scoreStageBonus: 300,
      descriptionKo: '끝나지 않는 훈화 고리를 넘어, 열린 정문으로 탈출하세요.',
    })
    expect(S6.existingEnemyHpMultiplier).toBeCloseTo(1.2 ** 5, 9)
    expect(S6.overtime).toMatchObject({ startSec: 240, intervalSec: 30, count: 30, mixedTypes: ['E19', 'E20', 'E21'] })
    expect(S6.milestones.map((m) => [m.sec, m.gold])).toEqual([[48, 6], [144, 8], [192, 13], [240, 22]])
    expect(S6.spawnPolicy).toMatchObject({ minDistanceUnits: 8.5, maxDistanceUnits: 12.5, maxAttempts: 24, bossSpawnDistanceUnits: 6 })
    expect(S6.layout).toMatchObject({ layoutId: 'expansion_schoolyard', portalMode: 'anchor', portalAnchorUnits: [0, 0, 16.5], bossAnchorUnits: [0, 0, -17], speechOriginUnits: [0, -19] })
    expect(S6.layout.obstacles.map((o) => [o.id, o.xUnits, o.zUnits, o.halfXUnits, o.halfZUnits]))
      .toEqual([['exp_s6_goal_north', 0, -11, 1.6, 0.45], ['exp_s6_goal_south', 0, 11, 1.6, 0.45]])
  })

  it('getExpansionStageConfig: 설명·마일스톤 라벨·고정 정문 앵커', () => {
    const config = getExpansionStageConfig('stage6')
    expect(config).toMatchObject({ title: '운동장 최후의 조회', description: S6.descriptionKo, mapHalfX: 12, mapHalfZ: 20, e04IntroSec: 8, portalAnchor: { x: 0, z: 16.5, fixed: true } })
    expect(config.survivalMilestones.map((m) => m.label)).toEqual(['운동장 진입 보너스', '조회 버티기 보너스', '교장 조우 보너스', '정문 탈출 보너스'])
    // stage7~10은 필드가 없어 기존 결과 그대로(무작위 포탈, 공통 설명·라벨).
    const s7 = getExpansionStageConfig('stage7')
    expect(s7.portalAnchor).toBeUndefined()
    expect(s7.description).toBe('3분 30초 후 열린 탈출구로 탈출하기')
    expect(s7.survivalMilestones[0].label).toBe(`${EXPANSION_STAGES.stage7.nameKo} 생존 보너스`)
  })

  // 2026-11-08 wave 5(S6 난이도): E20 13 → 7마리(−384 HP), E19 +9(줄 5개 +2/+2/+2/+2/+1, +270 HP). 일반 적 HP 9,338 → 9,224,
  // 총 HP 13,820 → 13,706(−0.82%, ±2% 사다리 안).
  it('이벤트 34행, 보스 1행(150초), 마지막 일반 이벤트 228초, 반복 버스트 없음, 일반 적 190마리·HP 9,224', () => {
    const events = getBurstEventsForStage('stage6')
    expect(events).toHaveLength(34)
    expect(events.filter((e) => isBossType(e.type))).toEqual([{ sec: 150, type: 'B05', count: 1 }])
    expect(Math.max(...events.filter((e) => !isBossType(e.type)).map((e) => e.sec))).toBe(228)
    expect(events.some((e) => e.repeatIntervalSec)).toBe(false)
    const normal = events.filter((e) => !isBossType(e.type))
    expect(normal.reduce((n, e) => n + e.count, 0)).toBe(190)
    expect(normal.reduce((n, e) => n + e.count * S6_HP[e.type], 0)).toBe(9224)
    const total = normal.reduce((n, e) => n + e.count * S6_HP[e.type], 0) + 4050 + 432
    expect(Math.abs(total / 13820 - 1)).toBeLessThanOrEqual(0.02)
    const countOf = (type) => normal.filter((e) => e.type === type).reduce((n, e) => n + e.count, 0)
    expect([countOf('E19'), countOf('E20'), countOf('E21')]).toEqual([115, 7, 18])
    expect(events.filter((e) => e.type === 'E20').map((e) => [e.sec, e.count])).toEqual([[24, 2], [72, 2], [108, 2], [168, 1]])
    expect(events.filter((e) => e.formation === 'assembly_row').map((e) => [e.sec, e.side]))
      .toEqual([[5, 'top'], [36, 'bottom'], [64, 'top'], [64, 'bottom'], [96, 'top'], [96, 'bottom'], [132, 'auto'], [192, 'gate'], [216, 'gate']])
    expect(events.filter((e) => e.formation === 'track_lanes')).toEqual([{ sec: 124, type: 'E21', count: 6, formation: 'track_lanes' }])
    // 110초 전통 증원(E07 3 + E02 3) 유지.
    expect(events.filter((e) => e.sec === 110).map((e) => [e.type, e.count])).toEqual([['E07', 3], ['E02', 3]])
  })

  it('E19~E21·B05 typeCode 17·18·19·32 유지, 이름·수치·행동 교체', () => {
    expect([ENEMY_TYPE_CODES.E19, ENEMY_TYPE_CODES.E20, ENEMY_TYPE_CODES.E21, ENEMY_TYPE_CODES.B05]).toEqual([17, 18, 19, 32])
    expect(EXPANSION_ENEMIES.E19).toMatchObject({ typeCode: 17, nameKo: '조회 줄서기 좀비', hp: 30, speedUnitsPerSec: 0.6, contactDamage: 10, xpPerTextbook: 6, scale: 1, contactDistUnits: 0.28, behaviorId: 'chase', textbookChance: 0.3, studioItemId: 'zombie-e19', modelKey: 'expansion-e19' })
    expect(EXPANSION_ENEMIES.E20).toMatchObject({ typeCode: 18, nameKo: '국민체조 좀비', hp: 64, speedUnitsPerSec: 0.55, contactDamage: 10, xpPerTextbook: 12, scale: 1.1, contactDistUnits: 0.3, behaviorId: 'ring' })
    expect(EXPANSION_ENEMIES.E21).toMatchObject({ typeCode: 19, nameKo: '계주 바통 좀비', hp: 36, speedUnitsPerSec: 1.1, contactDamage: 9, xpPerTextbook: 8, scale: 0.9, contactDistUnits: 0.25, behaviorId: 'dash' })
    expect(EXPANSION_BOSSES.B05).toMatchObject({ typeCode: 32, nameKo: '교장 선생님 좀비', hp: 4050, speedUnitsPerSec: 0.5, contactDamage: 22, scale: 2.2, enrageHpRatio: 0.5, enrageTransitionMs: 1500, studioItemId: 'zombie-b05', modelKey: 'expansion-b05' })
    expect(EXPANSION_BOSSES.B05.patterns[1].nameKo).toBe('교가 제창')
    // wave 5: 확장 행동 표(ring 14)는 stage7~10과 공유라 그대로 두고 E20만 적별 덮어쓰기 7. B05 패턴 피해 9·쿨다운 9,000/8,000ms.
    expect(EXPANSION_ENEMIES.E20.attackDamage).toBe(7)
    expect(EXPANSION_BOSSES.B05.patterns.map((p) => [p.damage, p.cooldownMs, p.phase2CooldownMs, p.windupMs])).toEqual([[9, 9000, 8000, 1600], [9, 9000, 8000, 1400]])
    expect(EXPANSION_HAZARDS.H06.stageId).toBe('stage6')
  })

  it('stage7~10은 건드리지 않았다(이름·보스·장애물 4개·이벤트 수)', () => {
    expect(['stage7', 'stage8', 'stage9', 'stage10'].map((id) => [EXPANSION_STAGES[id].bossId, EXPANSION_STAGES[id].layout.obstacles.length, EXPANSION_STAGES[id].overtime.startSec]))
      .toEqual([['B06', 4, 300], ['B07', 4, 300], ['B08', 4, 300], ['B09', 4, 300]])
    expect(EXPANSION_ENEMIES.E22.stageId).toBe('stage7')
    expect(EXPANSION_BOSSES.B06.hp).toBe(2000)
  })
})

describe('부록 C-A: 금서 도서관 원안 보존(2부 후보, 런타임 미연결)', () => {
  it('원안 stage6·E19~E21·B05 값을 그대로 담는다', () => {
    const a = EXPANSION_PART2_LIBRARY_ARCHIVE
    expect(a.source).toContain('1c085b2d')
    expect(a.stage).toMatchObject({ id: 'stage6', nameKo: '금서 도서관', themeKey: 'library', mapHalfXUnits: 7.5, mapHalfZUnits: 19.2 })
    expect(a.stage.overtime.startSec).toBe(300)
    expect(a.stage.layout.obstacles).toHaveLength(4)
    expect(a.stage.events).toHaveLength(23)
    expect(a.enemies.map((e) => [e.id, e.nameKo, e.hp, e.behaviorId])).toEqual([
      ['E19', '서가운반 좀비', 48, 'chase'], ['E20', '색인질주 좀비', 24, 'sidestep'], ['E21', '반납투척 좀비', 60, 'lob'],
    ])
    expect(a.boss).toMatchObject({ id: 'B05', nameKo: '금서관장', hp: 1800, gold: 8 })
    expect(a.boss.patterns.map((p) => p.shape)).toEqual(['cross', 'annulus'])
    expect(Object.isFrozen(a.stage)).toBe(true)
  })
})
