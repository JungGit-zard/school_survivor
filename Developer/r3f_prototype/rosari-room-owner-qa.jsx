// Development-only evidence entry. No App/Auth startup and no persistent state.
import React, { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { _roots } from '@react-three/fiber'
import RosariRoom from './src/components/RosariRoom.jsx'
const blocked = []
const originalFetch = window.fetch.bind(window)
window.fetch = (input, init) => {
  const url = new URL(typeof input === 'string' ? input : input.url, location.href)
  if (url.origin !== location.origin || !['GET', 'HEAD'].includes(init?.method || 'GET')) {
    blocked.push(url.origin + url.pathname)
    throw new Error('QA external/write fetch blocked')
  }
  return originalFetch(input, init)
}
const NativeWebSocket = window.WebSocket
window.WebSocket = class extends NativeWebSocket {
  constructor(url, ...args) {
    if (new URL(url, location.href).host !== location.host) throw Error('QA external websocket blocked')
    super(url, ...args)
  }
}
for (const name of ['setItem', 'getItem', 'removeItem', 'clear']) Storage.prototype[name] = () => { if(name!=='getItem') window.qaStorageAttempts?.push(name); throw Error('QA storage prohibited') }
navigator.sendBeacon = () => { throw Error('QA beacon prohibited') }
const host = document.getElementById('room-host')
const root = createRoot(host)
let backs = 0
const disposals = new Map()
const THREE = await import('three')
for (const prototype of [THREE.Material.prototype, THREE.BufferGeometry.prototype]) {
  const dispose = prototype.dispose
  prototype.dispose = function () { disposals.set(this.uuid, (disposals.get(this.uuid) || 0) + 1); return dispose.call(this) }
}
let tracked
const state = () => _roots.get(document.querySelector('canvas'))?.store.getState()
const character = () => state()?.scene.children.find(node => node.type === 'Group' && node.children.length === 1)
window.roomOwnerQa = {
  model() { const node=character(); return node ? {position:node.position.toArray(),scale:node.scale.toArray()} : null },
  stats() {
    const s=state(), node=character(), materials=new Set(), hulls=new Set(), shared=new Set(), uniforms=[]
    node?.traverse(mesh => { if(!mesh.isMesh)return; for(const mat of Array.isArray(mesh.material)?mesh.material:[mesh.material]) materials.add(mat); if(mesh.userData.isOutline){ hulls.add(mesh.geometry); uniforms.push(mesh.material.userData.outlineUniforms?.outlineViewport.value.toArray()) } else shared.add(mesh.geometry) })
    const counts=set=>[...set].map(item=>disposals.get(item.uuid)||0)
    return {deviceDpr:devicePixelRatio,renderDpr:s?.gl.getPixelRatio(),size:s?.size,position:node?.position.toArray(),materials:materials.size,hulls:hulls.size,disposedMaterials:counts(materials),disposedHulls:counts(hulls),disposedShared:counts(shared),uniforms,memory:s?.gl.info.memory,allDisposals:[...disposals.values()]}
  },
  track() { const materials=new Set(), hulls=new Set(), shared=new Set(); character()?.traverse(mesh=>{if(!mesh.isMesh)return;for(const mat of Array.isArray(mesh.material)?mesh.material:[mesh.material])materials.add(mat); (mesh.userData.isOutline?hulls:shared).add(mesh.geometry)});tracked={materials,hulls,shared};return this.stats() },
  disposalResult() { const result={}; for(const [name,items]of Object.entries(tracked||{}))result[name]=[...items].map(item=>disposals.get(item.uuid)||0);return result },
  async outline(degrees, nonuniform, visible, renderDpr) {
    const s=state(), node=character();s.setFrameloop('never');s.setDpr(renderDpr)
    for(const other of s.scene.children)if(other.type==='Group'&&other!==node)other.visible=false
    node.scale.set(nonuniform?0.65:1,nonuniform?1.25:1,nonuniform?1.15:1);node.rotation.set(0,degrees*Math.PI/180,0)
    s.camera.position.set(node.position.x,0.9,node.position.z+3.2);s.camera.lookAt(node.position.x,0.7,node.position.z);s.scene.background.set('#fff1f4')
    node.traverse(mesh=>{if(mesh.userData.isOutline){mesh.visible=visible;mesh.material.userData.outlineUniforms?.outlineViewport.value.set(s.size.width,s.size.height)}})
    s.scene.updateMatrixWorld(true);s.camera.updateMatrixWorld(true);s.gl.render(s.scene,s.camera)
    return {png:s.gl.domElement.toDataURL('image/png'),stats:this.stats(),degrees,nonuniform,visible}
  },
  async frames(count=3) { for(let i=0;i<count;i++)await new Promise(requestAnimationFrame) },
  async hudLong() { await this.hud(true); const {useGameStore}=await import('./src/store/useGameStore.js'); useGameStore.setState({studentDialogue:{...useGameStore.getState().studentDialogue,subjectName:'긴 이름 안내 '.repeat(100)}}) },
  resetDisposals() { disposals.clear() },
  blocked,
  mount() { root.render(<StrictMode><RosariRoom onBack={() => { backs++ }} /></StrictMode>) },
  unmount() { root.render(null) },
  backCount() { return backs },
  three() { return _roots.get(document.querySelector('canvas'))?.store },
  constrain(width, height) { Object.assign(host.style, { width: width ? width+'px' : '100%', height: height ? height+'px' : '100%' }) },
  async hud(dialogue = true) {
    root.render(null)
    const progress = await import('./src/lib/firebaseProgress.js')
    progress._resetFirebaseProgressForTests()
    progress._setFirebaseProgressClientForTests({load:async()=>null,save:async()=>{throw Error('QA unexpected progress save')},remove:async()=>{throw Error('QA remove')},transaction:async()=>{throw Error('QA transaction')}})
    const [{useGameStore}, {default:HUD}, {getStageQuestDefinitions}] = await Promise.all([import('./src/store/useGameStore.js'),import('./src/components/HUD.jsx'),import('./src/lib/quests.js')])
    const [quest] = getStageQuestDefinitions('stage1')
    // In-memory state only. No reset/startQuest action that could persist progress.
    useGameStore.setState({ phase: 'paused', pauseSource: 'dialogue', introDialogue:null, questToast:{type:'started',questId:quest.id}, studentDialogue:dialogue?{dialogueId:quest.startDialogueId,subjectType:'quest',subjectName:quest.giver.name}:null })
    root.render(<HUD />)
    return {questId:quest.id,dialogue}
  },
}
window.roomOwnerQa.mount()
