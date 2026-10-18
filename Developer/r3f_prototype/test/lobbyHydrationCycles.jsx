// Test-only shared oracle. Real Lobby, progress, auth and game stores in both DOM engines.
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { expect } from 'chai'
import Lobby from '../src/components/Lobby.jsx'
import { _resetFirebaseProgressForTests, _seedHydratedFirebaseProgressForTests, buildCloudProgressSnapshot, updateFirebasePlayerProgress } from '../src/lib/firebaseProgress.js'
import { useAuthStore } from '../src/store/useAuthStore.js'
import { useGameStore } from '../src/store/useGameStore.js'
import { commitFirebaseStudioRuntime } from '../src/lib/studioRuntimeState.js'
import { useLocaleStore } from '../src/lib/i18n.js'

export const account = Object.freeze({ uid: 'master-account', displayName: '정실장', email: 'zard5388@gmail.com' })
export const canonicalRecords = Object.freeze({ stage1Clears: 23, stage2Clears: 9, stage3Clears: 2, stage4Clears: 1, bestSurvivalSeconds: 766, stage2BestSurvivalSec: 366, stage3BestSurvivalSec: 321, stage4BestSurvivalSec: 481 })

export async function runLobbyHydrationCycles({ count, onCheckpoint = () => {}, profileDom = false }) {
  expect(Number.isInteger(count) && count > 0).to.equal(true)
  const previousAct = Object.getOwnPropertyDescriptor(globalThis, 'IS_REACT_ACT_ENVIRONMENT')
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  useLocaleStore.setState({ locale: 'ko' })
  commitFirebaseStudioRuntime({ tunings: {}, sfxTunings: {}, stageBossPreview: {}, decals: {}, propPlacements: {} }, { revision: 0 })
  useGameStore.setState({ goldTotal: 12 })
  const fixtureBefore = JSON.stringify({ account, canonicalRecords })
  const warnings = { warn: 0, error: 0, act: 0 }
  const restore = ['warn', 'error'].map(method => {
    const original = console[method]
    console[method] = (...args) => {
      warnings[method]++
      if (args.some(arg => typeof arg === 'string' && /act\(|support act|wrapped in act/.test(arg))) warnings.act++
      original.apply(console, args)
    }
    return () => { console[method] = original }
  })
  const timings = { mount: 0, loadingAssertions: 0, hydrate: 0, readyAssertions: 0, unmount: 0, cssSetterMs: 0, cssSetterCalls: 0 }
  // Diagnostic only: delegate all native setters unchanged; never strip CSS or real cards.
  if (profileDom) {
    const proto = Object.getPrototypeOf(document.createElement('div').style)
    for (const name of Object.getOwnPropertyNames(proto)) {
      const descriptor = Object.getOwnPropertyDescriptor(proto, name)
      if (!descriptor?.set || !descriptor.configurable) continue
      Object.defineProperty(proto, name, { ...descriptor, set(value) {
        const start = performance.now()
        try { return descriptor.set.call(this, value) } finally { timings.cssSetterMs += performance.now() - start; timings.cssSetterCalls++ }
      } })
      restore.push(() => Object.defineProperty(proto, name, descriptor))
    }
  }
  let completed = 0, assertions = 0, baselineProgress
  const started = performance.now(), iterationProof = []
  const check = (value, context) => { assertions++; return expect(value, context) }
  const record = async kind => {
    const sample = { kind, completed, assertions, elapsedMs: performance.now() - started, warnings: { ...warnings }, memory: globalThis.process?.memoryUsage?.() || { ...performance.memory && { heapUsed: performance.memory.usedJSHeapSize, heapTotal: performance.memory.totalJSHeapSize, heapLimit: performance.memory.jsHeapSizeLimit } }, timings: { ...timings }, fixture: JSON.stringify({ account, canonicalRecords }) }
    await onCheckpoint(sample)
    return sample
  }
  await record('start')
  try {
    for (let attempt = 1; attempt <= count; attempt++) {
      const assertionsBefore = assertions
      _resetFirebaseProgressForTests()
      useAuthStore.setState({ status: 'signedIn', user: account, initialized: true, progressStatus: 'loading', progressError: null })
      const container = document.createElement('div')
      document.body.appendChild(container)
      const root = createRoot(container)
      let t = performance.now()
      try {
        await act(async () => { root.render(<Lobby />) })
        timings.mount += performance.now() - t; t = performance.now()
        check(container.querySelector('[data-testid="lobby-records-pending"]'), `attempt ${attempt}: loading pending`).not.to.equal(null)
        check(container.querySelectorAll('[data-testid="stage-lock-preview"]').length, `attempt ${attempt}: unknown locks`).to.equal(9)
        check(container.querySelectorAll('[data-testid="stage-boss-preview"]').length, `attempt ${attempt}: visible Stage1`).to.equal(1)
        for (const record of ['12:46', '6:06', '5:21', '8:01']) check(container.textContent, `attempt ${attempt}: before hydrate`).not.to.include(record)
        timings.loadingAssertions += performance.now() - t; t = performance.now()
        await act(async () => {
          _seedHydratedFirebaseProgressForTests(account)
          updateFirebasePlayerProgress(progress => { progress.records = { ...(progress.records ?? {}), ...canonicalRecords }; return progress })
          useAuthStore.setState({ progressStatus: 'ready' })
        })
        timings.hydrate += performance.now() - t; t = performance.now()
        check(useAuthStore.getState().user.uid, `attempt ${attempt}: UID`).to.equal(account.uid)
        check(container.querySelector('[data-testid="lobby-records-pending"]'), `attempt ${attempt}: ready pending`).to.equal(null)
        check(container.querySelectorAll('[data-testid="stage-lock-preview"]').length, `attempt ${attempt}: ready locked`).to.equal(5)
        check(container.querySelectorAll('[data-testid="stage-boss-preview"]').length, `attempt ${attempt}: ready previews`).to.equal(5)
        check(container.querySelectorAll('section').length, `attempt ${attempt}: full cards`).to.equal(10)
        for (let stage = 1; stage <= 10; stage++) {
          const card = container.querySelector(`section[aria-label^="Stage ${stage} "]`)
          check(card, `attempt ${attempt}: Stage ${stage}`).not.to.equal(null)
          if (stage <= 5) {
            const enter = Array.from(card.querySelectorAll('button')).find(button => button.textContent === '입장하기')
            check(enter, `attempt ${attempt}: Stage ${stage} entry`).not.to.equal(undefined)
            check(enter.disabled, `attempt ${attempt}: Stage ${stage} unlocked`).to.equal(false)
            check(card.querySelector('[data-testid="stage-lock-preview"]'), `attempt ${attempt}: Stage ${stage} lock`).to.equal(null)
            if (stage <= 4) check(card.textContent, `attempt ${attempt}: Stage ${stage} record`).not.to.include('기록 없음')
            else check(card.textContent, `attempt ${attempt}: unplayed Stage5`).to.include('기록 없음')
          } else {
            check(card.querySelector('[data-testid="stage-lock-preview"]'), `attempt ${attempt}: Stage ${stage} locked`).not.to.equal(null)
            check(card.querySelectorAll('button').length, `attempt ${attempt}: Stage ${stage} buttons`).to.equal(2)
            for (const button of card.querySelectorAll('button')) check(button.disabled, `attempt ${attempt}: Stage ${stage} disabled`).to.equal(true)
          }
        }
        const text = container.textContent
        for (const record of ['12:46', '6:06', '5:21', '8:01']) check(text, `attempt ${attempt}: record ${record}`).to.include(record)
        const progress = buildCloudProgressSnapshot().progress
        if (!baselineProgress) baselineProgress = structuredClone(progress)
        check(progress, `attempt ${attempt}: complete progress`).to.deep.equal(baselineProgress)
        timings.readyAssertions += performance.now() - t
      } finally {
        t = performance.now()
        await act(async () => { root.unmount() })
        container.remove()
        timings.unmount += performance.now() - t
      }
      check(container.childElementCount, `attempt ${attempt}: unmounted`).to.equal(0)
      check(container.isConnected, `attempt ${attempt}: detached`).to.equal(false)
      completed = attempt
      iterationProof.push({ attempt, assertions: assertions - assertionsBefore, uid: useAuthStore.getState().user.uid, mounted: true, hydrated: true, unmounted: container.childElementCount === 0 && !container.isConnected })
      if (completed % 1000 === 0) await record('checkpoint')
    }
    check(completed, 'all independent cycles completed').to.equal(count)
    check(JSON.stringify({ account, canonicalRecords }), 'immutable canonical fixture').to.equal(fixtureBefore)
    const after = buildCloudProgressSnapshot().progress
    check(after, 'full progress before/after').to.deep.equal(baselineProgress)
    check(warnings.act, 'no React act warnings').to.equal(0)
    const sample = await record('complete')
    return { ...sample, fixtureBefore, fixtureAfter: JSON.stringify({ account, canonicalRecords }), before: baselineProgress, after, iterationProof }
  } finally {
    await record('finally')
    restore.reverse().forEach(fn => fn())
    if (previousAct) Object.defineProperty(globalThis, 'IS_REACT_ACT_ENVIRONMENT', previousAct)
    else delete globalThis.IS_REACT_ACT_ENVIRONMENT
  }
}
