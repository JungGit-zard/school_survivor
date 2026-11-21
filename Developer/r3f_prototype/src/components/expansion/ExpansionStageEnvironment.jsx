import { useEffect, useMemo, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import StudioTunedGroup from '../StudioTunedGroup.jsx'
import { getStageBounds } from '../../lib/stageConfig.js'
import { useGameStore } from '../../store/useGameStore.js'
import { createExpansionEnvironment, animateExpansionEnvironment, disposeExpansionEnvironment } from './expansionEnvironment.js'
import { loadSchoolyardDressingScene, attachSchoolyardDressing, cullSchoolyardDressing } from './schoolyardDressing.js'
import Stage6FinishTape from './Stage6FinishTape.jsx'

export default function ExpansionStageEnvironment({stageId,staticPose=false}) {
 const {halfX,halfZ}=getStageBounds(stageId)
 const root=useMemo(()=>createExpansionEnvironment(stageId,{halfX,halfZ}),[stageId,halfX,halfZ])
 const prefersReduced=useMemo(()=>typeof window!=='undefined'&&typeof window.matchMedia==='function'&&window.matchMedia('(prefers-reduced-motion: reduce)').matches,[])
 useEffect(()=>()=>disposeExpansionEnvironment(root),[root])
 // Stage 6 free-pack dressing: load the GLB once, merge it into root slot 4, then remount the Studio group
 // (key) so the floor item's saved Studio tuning is applied to the new chunk meshes too. Decoration only:
 // a failed load leaves the hand-built set and the ground exactly as they are.
 const [dressedRoot,setDressedRoot]=useState(null)
 useEffect(()=>{
   if(!root?.userData.schoolyardDressingSlot)return undefined
   let live=true
   loadSchoolyardDressingScene().then(scene=>{
     if(!live)return
     attachSchoolyardDressing(root,scene)
     setDressedRoot(root)
   }).catch(error=>{ if(live)console.warn('[stage6] schoolyard dressing not loaded',error) })
   return ()=>{live=false}
 },[root])
 // Studio part contract: animateExpansionEnvironment (expansionEnvironment.js) composes every part with composeStudioPartPosition / composeStudioPartRotation.
 // Stage 6 정문: 탈출구(escapePortalActive)가 열리면 철문이 1.0초 동안 좌우로 미끄러져 열린다(비주얼만).
 useFrame(({clock,camera})=>{
   const reduced=staticPose||prefersReduced||document.hidden||document.documentElement?.hasAttribute('data-reduced-effects')
   const gateOpen=!staticPose&&useGameStore.getState().escapePortalActive===true
   animateExpansionEnvironment(root,clock.elapsedTime,reduced,{gateOpen})
   cullSchoolyardDressing(root,camera)
 })
 if(!root)return null
 // Stage 6 탈출구 결승 테이프(Stage6FinishTape.jsx, 탈출구 자리를 따라감): Studio 튜닝 그룹 밖 형제 — 바닥 Studio 파트 경로는 그대로다.
 return <>
   <StudioTunedGroup key={dressedRoot===root?'dressed':'bare'} itemId={`stage-floor-${stageId}`}><primitive object={root} dispose={null}/></StudioTunedGroup>
   {stageId==='stage6'&&!staticPose&&<Stage6FinishTape stageId={stageId}/>}
 </>
}
