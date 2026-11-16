// Stage 6 「운동장 최후의 조회」 데이터 교체(스펙 Part C C-2·C-4·C-5·C-6·C-7, 부록 C-A).
import { describe, expect, it } from 'vitest'
import { EXPANSION_BOSSES, EXPANSION_ENEMIES, EXPANSION_HAZARDS, EXPANSION_STAGES, getExpansionStageConfig } from './expansionContent.js'
import { EXPANSION_PART2_LIBRARY_ARCHIVE } from './expansionPart2Archive.js'
import { ENEMY_TYPE_CODES } from './enemyEntityPool.js'
import { getBurstEventsForStage, isBossType } from './burstEvents.js'
import { isChiefType } from './stageChiefContent.js'
import { NOVEL2_ZOMBIE_STATS } from './novelZombie2Content.js'

const S6 = EXPANSION_STAGES.stage6
// 2026-11-14 블록 좀비(같은 hp 맞교환): E79·E71 = E01(8 → 20), E73 = E04(32 → 80), E76 = E05(70 → 174).
// E105(2인3각, 2026-11-14 2차 신규)는 Stage 6 절대 HP 30(E19와 같다).
// 2026-11-16 좀비 배치 총검토(운동회 총출동)로 스1~5에서 옮겨 온 종도 같은 기존 종 배수(×2.488)를 탄다:
// E87·E78 = round(8 × 2.488) 20, E83·E70·E80·E88 = round(10 × 2.488) 25, E72 = round(16 × 2.488) 40, E55 = round(70 × 2.488) 174.
// 2026-11-17: E106 기마전(몸마다 절대 30 — 192초 조회 줄 E19 4기 자리).
const S6_HP = { E19: 30, E20: 64, E21: 36, E01: 20, E02: 174, E04: 80, E05: 174, E06: 796, E07: 40, E79: 20, E71: 20, E73: 80, E76: 174, E105: 30,
  E87: 20, E78: 20, E83: 25, E70: 25, E80: 25, E88: 25, E72: 40, E55: 174, E106: 30 }

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
  // 2026-11-14 블록 좀비 4행(16초 E79·52초 E71·108초 E73·120초 E76)은 같은 초의 E01·E01·E04·E05 1기씩을 같은 hp로 맞바꿨다 —
  // 38 → 42행, 마릿수 190·HP 8,910 그대로. E76은 vend 최신안대로 120초(E05 2 → 1 + E76)에만 있고, 200초는 E05 1기 그대로다
  // (Terry 승인 2026-11-14: 200초 E76 행 폐기).
  // 2026-11-14 2차 신규: 150초·168초 E01×8 → E01×5 + E105×2(2인3각 한 쌍씩, 블록 좀비가 쓰지 않은 E01 행).
  // E105 절대 30 × 2 = 실효 E01 20 × 3이라 HP·30초 창 곡선이 그대로이고 마릿수만 190 → 188, 행 42 → 44.
  // 2026-11-16 좀비 배치 총검토(Terry 승인 "운동회 총출동", balanceqa 판정표 #3·#19·#25·#35·#43·#47·#54·#55·#65·#68·#72~#74):
  // 스1~5에서 운동장 컨셉 10행을 받는다. 108·132·216초 E04 행 삭제, 8초 E04 2 → 1 + E87(#43 수정 — 스5 → 스6 오프닝 1.6배 한도).
  // 216초는 판정 #74(2 → 1)에서 한 걸음 더 — 남은 E04 1기도 술래 E70과 맞바꿔 4회 소환 총 HP를 14,057(+2.05%) → 13,977(+1.47%)로
  // 사다리 ±2% 안에 둔다(코디네이터 결정 2026-11-16). 44 → 51행, 일반 적 188 → 193마리, HP 8,910 → 9,063.
  // 2026-11-16 3차(wave 3): 치프 E104 공굴리기 대장 72초 행 1개(절대 HP 250)를 더해 52행. 치프는 사다리 밖 순증이라
  // 아래 마릿수·HP·사다리·30초 곡선은 치프를 빼고 센다(193마리·9,063·+1.47% 그대로).
  // 2026-11-17 3차 둘째 묶음: 192초 정문 조회 줄 E19×12 → ×8 + E106 기마전 몸 4(절대 30씩) 한 행 — 52 → 53행, 193마리·9,063 그대로.
  it('이벤트 52행 + 치프 1행, 보스 1행(150초), 마지막 일반 이벤트 228초, 반복 버스트 없음, 일반 적 193마리·HP 9,063', () => {
    const all = getBurstEventsForStage('stage6')
    expect(all).toHaveLength(53)
    expect(all.filter((e) => isChiefType(e.type))).toEqual([{ sec: 72, type: 'E104', count: 1 }])
    expect(NOVEL2_ZOMBIE_STATS.E104.hp).toBe(250)
    const events = all.filter((e) => !isChiefType(e.type))
    expect(events).toHaveLength(52)
    expect(events.filter((e) => e.type === 'E106')).toEqual([{ sec: 192, type: 'E106', count: 4 }])
    expect(NOVEL2_ZOMBIE_STATS.E106.hp).toBe(S6_HP.E106)
    // 2026-11-14 블록 좀비 4종은 각각 정확히 한 행·한 마리였고, 2026-11-16 E76은 스4 150초에서 200초 행을 하나 더 받았다(#54).
    expect(events.filter((e) => ['E79', 'E71', 'E73', 'E76'].includes(e.type)).map((e) => [e.sec, e.type, e.count]))
      .toEqual([[16, 'E79', 1], [52, 'E71', 1], [108, 'E73', 1], [120, 'E76', 1], [200, 'E76', 1]])
    // 2026-11-16 스1~5에서 옮겨 온 운동장 종 — 전부 1마리 행.
    expect(events.filter((e) => ['E87', 'E83', 'E70', 'E80', 'E88', 'E72', 'E78', 'E55'].includes(e.type)).map((e) => [e.sec, e.type, e.count]))
      .toEqual([[8, 'E87', 1], [44, 'E83', 1], [84, 'E70', 1], [108, 'E80', 1], [124, 'E88', 1], [132, 'E72', 1], [168, 'E78', 1], [184, 'E55', 1], [216, 'E70', 1]])
    expect(events.filter((e) => e.type === 'E05').map((e) => [e.sec, e.count])).toEqual([[84, 2], [120, 1], [200, 1]])
    expect(events.filter((e) => isBossType(e.type))).toEqual([{ sec: 150, type: 'B05', count: 1 }])
    expect(Math.max(...events.filter((e) => !isBossType(e.type)).map((e) => e.sec))).toBe(228)
    expect(events.some((e) => e.repeatIntervalSec)).toBe(false)
    const normal = events.filter((e) => !isBossType(e.type))
    expect(normal.reduce((n, e) => n + e.count, 0)).toBe(193)
    expect(events.filter((e) => e.type === 'E105').map((e) => [e.sec, e.count])).toEqual([[150, 2], [168, 2]])
    expect(normal.reduce((n, e) => n + e.count * S6_HP[e.type], 0)).toBe(9063)
    const summonHp = EXPANSION_BOSSES.B05.summon.count * S6_HP.E21
    const target = Math.round(3710 * 1.3 ** 5)
    expect(target).toBe(13775)
    for (const summons of [3, 4]) {
      const total = normal.reduce((n, e) => n + e.count * S6_HP[e.type], 0) + 4050 + summons * summonHp
      expect(Math.abs(total / target - 1), `${summons} summons`).toBeLessThanOrEqual(0.02)
    }
    const countOf = (type) => normal.filter((e) => e.type === type).reduce((n, e) => n + e.count, 0)
    expect([countOf('E19'), countOf('E20'), countOf('E21')]).toEqual([101, 7, 18])
    expect(events.filter((e) => e.type === 'E20').map((e) => [e.sec, e.count])).toEqual([[24, 1], [72, 2], [108, 2], [168, 2]])
    expect(events.filter((e) => e.formation === 'assembly_row').map((e) => [e.sec, e.side, e.count]))
      .toEqual([[5, 'top', 10], [36, 'bottom', 10], [64, 'top', 12], [64, 'bottom', 12], [96, 'top', 12], [96, 'bottom', 12], [132, 'auto', 12], [192, 'gate', 8], [216, 'gate', 13]])
    expect(events.filter((e) => e.formation === 'track_lanes')).toEqual([{ sec: 124, type: 'E21', count: 6, formation: 'track_lanes' }])
    // 110초 전통 증원(E07 3 + E02 3) 유지.
    expect(events.filter((e) => e.sec === 110).map((e) => [e.type, e.count])).toEqual([['E07', 3], ['E02', 3]])
    // 개방 운동장은 시야 차단물이 없다 — 원거리 E04는 0~60초 동시 2기(8초 1 + 52초 1)로 묶는다(포화점 4.13기 미만).
    // 2026-11-16: 8초 1기 → E87(#43 수정), 108·132초 E04 → E80·E72(#72·#73), 216초 E04 → E70(#74 + 사다리 ±2%).
    expect(events.filter((e) => e.type === 'E04').map((e) => [e.sec, e.count])).toEqual([[8, 1], [52, 1]])
  })

  // 30초 창별 유입 HP(일반 적 + B05 시간 소환 162·192·222초). 곡선 모양을 못박는다.
  it('난이도 곡선: 150초까지 오르막, 보스 창이 오프닝보다 붐빈다, 탈출 이후 구간은 그대로', () => {
    const events = getBurstEventsForStage('stage6').filter((e) => !isBossType(e.type) && !isChiefType(e.type))
    const summonHp = EXPANSION_BOSSES.B05.summon.count * S6_HP.E21
    const windows = [0, 30, 60, 90, 120, 150, 180, 210].map((from) => events
      .filter((e) => e.sec >= from && e.sec < from + 30).reduce((n, e) => n + e.count * S6_HP[e.type], 0)
      + [162, 192, 222].filter((sec) => sec >= from && sec < from + 30).length * summonHp)
    // 2026-11-16 좀비 배치 총검토: [644, 652, 1304, 1650, 1800, 892, 1546, 1070] → 아래(오프닝 60초 1,296 → 1,261).
    expect(windows).toEqual([584, 677, 1329, 1595, 1785, 912, 1894, 935])
    // 60~150초 단조 증가(보스 직전이 정점), 오프닝 60초 합 ≤ 1,300.
    expect(windows[2] < windows[3] && windows[3] < windows[4]).toBe(true)
    expect(windows[0] + windows[1]).toBeLessThanOrEqual(1300)
    // 보스 창(150~240초)의 어느 30초도 오프닝 30초 창보다 한산하지 않다.
    expect(Math.min(...windows.slice(5))).toBeGreaterThan(Math.max(windows[0], windows[1]))
    // 치프 E104(72초, 250)를 더해도 60~150초 오르막이 그대로다(1,579 < 1,595 < 1,785).
    const withChief = windows[2] + NOVEL2_ZOMBIE_STATS.E104.hp
    expect(withChief < windows[3] && windows[3] < windows[4]).toBe(true)
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
