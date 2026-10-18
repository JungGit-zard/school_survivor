import { useEffect, useLayoutEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { enemyPool, screenBounds } from '../../lib/refs.js'
import { GRAPHICS_STUDIO_TUNING_EVENT, loadStudioTunings } from '../../lib/graphicsStudioConfig.js'
import { isFirebaseStudioRuntimeReady } from '../../lib/studioRuntimeState.js'
import { createExpansionInstanceState, refreshExpansionInstanceTunings, updateExpansionInstances, disposeExpansionInstanceState } from './expansionInstances.js'

export function refreshExpansionInstanceFromRuntime(state) {
 const runtimeReady=isFirebaseStudioRuntimeReady()
 // A blocked dataset is not an intentional empty revision. Keep the current
 // rig/material state in memory; first offline mount still needs authored batches.
 if(!runtimeReady&&state.ready)return
 refreshExpansionInstanceTunings(state,runtimeReady?loadStudioTunings():{})
}

export default function ExpansionZombieInstanceLayer({resetKey}) {
 const state=useMemo(()=>createExpansionInstanceState(200),[])
 const meshes=useMemo(()=>[state.group,state.shadow,state.healthBack,state.health,state.smoke],[state])
 useLayoutEffect(()=>{updateExpansionInstances(state,null)},[state,resetKey])
 useEffect(()=>{
   const refresh=()=>{
     refreshExpansionInstanceFromRuntime(state)
   }
   refresh();window.addEventListener(GRAPHICS_STUDIO_TUNING_EVENT,refresh)
   return()=>window.removeEventListener(GRAPHICS_STUDIO_TUNING_EVENT,refresh)
 },[state])
 useEffect(()=>()=>disposeExpansionInstanceState(state),[state])
 useFrame(({clock,camera})=>updateExpansionInstances(state,enemyPool,{
   time:clock.elapsedTime,cameraQuaternion:camera.quaternion,
   reducedMotion:document.documentElement?.hasAttribute('data-reduced-effects'),
   isVisible:(x,z)=>!screenBounds||(x>=screenBounds.minX-2&&x<=screenBounds.maxX+2&&z>=screenBounds.minZ-2&&z<=screenBounds.maxZ+2),
 }))
 return <group name="expansion-normal-instance-layer" dispose={null}>{meshes.map((mesh,i)=><primitive key={i} object={mesh} dispose={null}/>)}</group>
}
