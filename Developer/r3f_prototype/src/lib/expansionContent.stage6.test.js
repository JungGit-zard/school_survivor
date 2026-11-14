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

  // 2026-11-13 S6 재조정(levelmini): 오프닝 0~60초 HP 1,740 → 1,256(S5 832의 2.09배 → 1.51배), 보스 창 150~180초
  // 388 → 892(스테이지에서 가장 한산했던 30초 해소), 180~210초 1,780 → 1,546. 60~120초·탈출 이후 210~240초는 그대로.
  // 일반 적 190 → 188마리, HP 9,224 → 8,870. 총 HP(B05 4,050 + 시간 소환 3회 648) 13,568, 격노 소환까지 4회면 13,784 —
  // 둘 다 사다리 목표 3,710 × 1.3^5 = 13,775의 ±2% 안.
  // 2026-11-13 2차(levelmini, balanceqa 노트): 52초 E01 8 → 10. 오프닝 1,256 → 1,296(S5의 1.56배), 60초 계단 2.13배 → 2.0배.
  // 일반 적 190마리·HP 8,910, 총 HP 13,608(소환 3회)·13,824(4회).
  it('이벤트 38행, 보스 1행(150초), 마지막 일반 이벤트 228초, 반복 버스트 없음, 일반 적 190마리·HP 8,910', () => {
    const events = getBurstEventsForStage('stage6')
    expect(events).toHaveLength(38)
    expect(events.filter((e) => isBossType(e.type))).toEqual([{ sec: 150, type: 'B05', count: 1 }])
    expect(Math.max(...events.filter((e) => !isBossType(e.type)).map((e) => e.sec))).toBe(228)
    expect(events.some((e) => e.repeatIntervalSec)).toBe(false)
    const normal = events.filter((e) => !isBossType(e.type))
    expect(normal.reduce((n, e) => n + e.count, 0)).toBe(190)
    expect(normal.reduce((n, e) => n + e.count * S6_HP[e.type], 0)).toBe(8910)
    const summonHp = EXPANSION_BOSSES.B05.summon.count * S6_HP.E21
    const target = Math.round(3710 * 1.3 ** 5)
    expect(target).toBe(13775)
    for (const summons of [3, 4]) {
      const total = normal.reduce((n, e) => n + e.count * S6_HP[e.type], 0) + 4050 + summons * summonHp
      expect(Math.abs(total / target - 1), `${summons} summons`).toBeLessThanOrEqual(0.02)
    }
    const countOf = (type) => normal.filter((e) => e.type === type).reduce((n, e) => n + e.count, 0)
    expect([countOf('E19'), countOf('E20'), countOf('E21')]).toEqual([105, 7, 18])
    expect(events.filter((e) => e.type === 'E20').map((e) => [e.sec, e.count])).toEqual([[24, 1], [72, 2], [108, 2], [168, 2]])
    expect(events.filter((e) => e.formation === 'assembly_row').map((e) => [e.sec, e.side, e.count]))
      .toEqual([[5, 'top', 10], [36, 'bottom', 10], [64, 'top', 12], [64, 'bottom', 12], [96, 'top', 12], [96, 'bottom', 12], [132, 'auto', 12], [192, 'gate', 12], [216, 'gate', 13]])
    expect(events.filter((e) => e.formation === 'track_lanes')).toEqual([{ sec: 124, type: 'E21', count: 6, formation: 'track_lanes' }])
    // 110초 전통 증원(E07 3 + E02 3) 유지.
    expect(events.filter((e) => e.sec === 110).map((e) => [e.type, e.count])).toEqual([['E07', 3], ['E02', 3]])
    // 개방 운동장은 시야 차단물이 없다 — 원거리 E04는 0~60초 동시 3기(8초 2 + 52초 1)로 묶는다(포화점 4.13기 미만).
    expect(events.filter((e) => e.type === 'E04').map((e) => [e.sec, e.count])).toEqual([[8, 2], [52, 1], [108, 2], [132, 1], [216, 2]])
  })

  // 30초 창별 유입 HP(일반 적 + B05 시간 소환 162·192·222초). 곡선 모양을 못박는다.
  it('난이도 곡선: 150초까지 오르막, 보스 창이 오프닝보다 붐빈다, 탈출 이후 구간은 그대로', () => {
    const events = getBurstEventsForStage('stage6').filter((e) => !isBossType(e.type))
    const summonHp = EXPANSION_BOSSES.B05.summon.count * S6_HP.E21
    const windows = [0, 30, 60, 90, 120, 150, 180, 210].map((from) => events
      .filter((e) => e.sec >= from && e.sec < from + 30).reduce((n, e) => n + e.count * S6_HP[e.type], 0)
      + [162, 192, 222].filter((sec) => sec >= from && sec < from + 30).length * summonHp)
    expect(windows).toEqual([644, 652, 1304, 1650, 1800, 892, 1546, 1070])
    // 60~150초 단조 증가(보스 직전이 정점), 오프닝 60초 합 ≤ 1,300.
    expect(windows[2] < windows[3] && windows[3] < windows[4]).toBe(true)
    expect(windows[0] + windows[1]).toBeLessThanOrEqual(1300)
    // 보스 창(150~240초)의 어느 30초도 오프닝 30초 창보다 한산하지 않다.
    expect(Math.min(...windows.slice(5))).toBeGreaterThan(Math.max(windows[0], windows[1]))
  })

  it('훈화 고리(H06) 피해는 같은 고리를 쓰는 교장 B05 훈화 고리와 같다(튜토리얼 기믹이 보스판보다 아프지 않게)', () => {
    expect(EXPANSION_HAZARDS.H06.pattern.damage).toBe(9)
    expect(EXPANSION_HAZARDS.H06.pattern.damage).toBe(EXPANSION_BOSSES.B05.patterns[0].damage)
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
