import { useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import StudioTunedGroup from '../StudioTunedGroup.jsx'
import { getStageBounds } from '../../lib/stageConfig.js'
import { useGameStore } from '../../store/useGameStore.js'
import { createExpansionEnvironment, animateExpansionEnvironment, disposeExpansionEnvironment } from './expansionEnvironment.js'

export default function ExpansionStageEnvironment({stageId,staticPose=false}) {
 const {halfX,halfZ}=getStageBounds(stageId)
 const root=useMemo(()=>createExpansionEnvironment(stageId,{halfX,halfZ}),[stageId,halfX,halfZ])
 const prefersReduced=useMemo(()=>typeof window!=='undefined'&&typeof window.matchMedia==='function'&&window.matchMedia('(prefers-reduced-motion: reduce)').matches,[])
 useEffect(()=>()=>disposeExpansionEnvironment(root),[root])
 // Studio part contract: animateExpansionEnvironment (expansionEnvironment.js) composes every part with composeStudioPartPosition / composeStudioPartRotation.
 // Stage 6 정문: 탈출구(escapePortalActive)가 열리면 철문이 1.0초 동안 좌우로 미끄러져 열린다(비주얼만).
 useFrame(({clock})=>{
   const reduced=staticPose||prefersReduced||document.hidden||document.documentElement?.hasAttribute('data-reduced-effects')
   const gateOpen=!staticPose&&useGameStore.getState().escapePortalActive===true
   animateExpansionEnvironment(root,clock.elapsedTime,reduced,{gateOpen})
 })
 if(!root)return null
 return <StudioTunedGroup itemId={`stage-floor-${stageId}`}><primitive object={root} dispose={null}/></StudioTunedGroup>
}
