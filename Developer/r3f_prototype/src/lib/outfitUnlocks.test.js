import { beforeEach, describe, expect, it } from 'vitest'
import {
  _resetFirebaseProgressForTests,
  _seedHydratedFirebaseProgressForTests,
  buildCloudProgressSnapshot,
  readFirebasePlayerProgressOrDefault,
  setCloudProgressUser,
  updateFirebasePlayerProgress,
} from './firebaseProgress.js'
import { _resetGuestSessionSettingsForTests, saveGuestSessionSettings, saveTitleSettings } from './titleSettings.js'
import {
  _resetGuestOutfitUnlocksForTests,
  getAllUnlockedOutfits,
  getOwnedOutfitIds,
  grantOutfitUnlocksFromRecords,
  isOutfitUnlocked,
  resolveRunOutfitId,
  setOutfitUnlocked,
  syncOutfitUnlocksFromRecords,
} from './outfitUnlocks.js'

beforeEach(() => {
  _resetFirebaseProgressForTests()
  _resetGuestSessionSettingsForTests()
  _resetGuestOutfitUnlocksForTests()
})

describe('account outfit ownership (progress.outfitUnlocks)', () => {
  beforeEach(() => _seedHydratedFirebaseProgressForTests({ uid: 'outfit-user' }))

  it('new account owns only default', () => {
    expect([...getOwnedOutfitIds()]).toEqual(['default'])
    expect(isOutfitUnlocked('default')).toBe(true)
    expect(isOutfitUnlocked('winter')).toBe(false)
  })

  it('stores the same shape as weaponUnlocks and never stores default', () => {
    expect(setOutfitUnlocked('default')).toBe(false)
    expect(setOutfitUnlocked('labcoat')).toBe(false)
    expect(setOutfitUnlocked('gym')).toBe(true)
    expect(setOutfitUnlocked('gym')).toBe(false)
    expect(readFirebasePlayerProgressOrDefault().outfitUnlocks).toEqual({ gym: 1 })
    expect(buildCloudProgressSnapshot().progress.outfitUnlocks).toEqual({ gym: 1 })
  })

  it('normalizes unknown ids and default out of a remote snapshot', () => {
    _seedHydratedFirebaseProgressForTests({ uid: 'remote-user' }, {
      schemaVersion: 1,
      profile: { uid: 'remote-user', displayName: '', nickname: '' },
      progress: { outfitUnlocks: { winter: 1, default: 1, labcoat: 1, gym: 0, grad: true } },
    })
    expect(readFirebasePlayerProgressOrDefault().outfitUnlocks).toEqual({ winter: 1, grad: 1 })
  })

  it('retroactive grant reads records and returns only new ids', () => {
    updateFirebasePlayerProgress((p) => { p.records.stage1Clears = 2; p.records.stage3Clears = 1 })
    const records = readFirebasePlayerProgressOrDefault().records
    expect(syncOutfitUnlocksFromRecords(records).sort()).toEqual(['gym', 'winter'])
    expect(syncOutfitUnlocksFromRecords(records)).toEqual([])
    expect(readFirebasePlayerProgressOrDefault().records.stage1Clears).toBe(2)
  })

  it('T-03 winter protection: saved playerOutfit winter + 0 clears => owns winter', () => {
    saveTitleSettings({ playerOutfit: 'winter' })
    expect(syncOutfitUnlocksFromRecords({})).toEqual(['winter'])
    expect(isOutfitUnlocked('winter')).toBe(true)
    expect(resolveRunOutfitId()).toBe('winter')
  })

  it('T-04 saved but not owned outfit => run outfit default, saved value untouched', () => {
    saveTitleSettings({ playerOutfit: 'gym' })
    expect(resolveRunOutfitId()).toBe('default')
    expect(readFirebasePlayerProgressOrDefault().titleSettings.playerOutfit).toBe('gym')
    setOutfitUnlocked('gym')
    expect(resolveRunOutfitId()).toBe('gym')
  })

  it('grant from run evalInput returns first-time unlocks only', () => {
    expect(grantOutfitUnlocksFromRecords({ stage2Clears: 1 })).toEqual(['raincoat'])
    expect(grantOutfitUnlocksFromRecords({ stage2Clears: 2 })).toEqual([])
  })
})

describe('signed in but progress not hydrated yet', () => {
  it('owns only default and writes nowhere', () => {
    setCloudProgressUser({ uid: 'waiting' })
    expect(setOutfitUnlocked('winter')).toBe(false)
    expect(grantOutfitUnlocksFromRecords({ stage1Clears: 1 })).toEqual([])
    expect(syncOutfitUnlocksFromRecords({ stage1Clears: 1 })).toEqual([])
    expect([...getOwnedOutfitIds()]).toEqual(['default'])
    expect(resolveRunOutfitId()).toBe('default')
  })
})

describe('T-12 guest session memory', () => {
  it('unions unlocks across runs in the session and never touches account progress', () => {
    expect(grantOutfitUnlocksFromRecords({ stage1Clears: 1 })).toEqual(['winter'])
    // next run's evalInput is that run alone; winter must stay
    expect(grantOutfitUnlocksFromRecords({})).toEqual([])
    expect(grantOutfitUnlocksFromRecords({ stage2Clears: 1 })).toEqual(['raincoat'])
    expect([...getAllUnlockedOutfits()].sort()).toEqual(['raincoat', 'winter'])
    saveGuestSessionSettings({ playerOutfit: 'winter' })
    expect(resolveRunOutfitId()).toBe('winter')
    // guest has no runtime progress at all
    expect(() => readFirebasePlayerProgressOrDefault()).not.toThrow()
    expect(readFirebasePlayerProgressOrDefault().outfitUnlocks ?? {}).toEqual({})
  })

  it('a reload (fresh module memory) forgets guest outfits', () => {
    grantOutfitUnlocksFromRecords({ stage1Clears: 1 })
    _resetGuestOutfitUnlocksForTests() // what a page reload does to module memory
    expect([...getOwnedOutfitIds()]).toEqual(['default'])
  })

  it('grad can be collected over several guest runs', () => {
    for (const n of [1, 2, 3]) grantOutfitUnlocksFromRecords({ [`stage${n}Clears`]: 1 })
    expect(isOutfitUnlocked('grad')).toBe(false)
    // each guest run carries only its own stage; the session accumulates them so grad still arrives
    expect(grantOutfitUnlocksFromRecords({ stage4Clears: 1 }).sort()).toEqual(['apron', 'grad'])
  })
})
