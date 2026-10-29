import { useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import StudioTunedGroup from '../StudioTunedGroup.jsx'
import { getStageBounds } from '../../lib/stageConfig.js'
import { createExpansionEnvironment, animateExpansionEnvironment, disposeExpansionEnvironment } from './expansionEnvironment.js'

export default function ExpansionStageEnvironment({stageId,staticPose=false}) {
 const {halfX,halfZ}=getStageBounds(stageId)
 const root=useMemo(()=>createExpansionEnvironment(stageId,{halfX,halfZ}),[stageId,halfX,halfZ])
 const prefersReduced=useMemo(()=>typeof window!=='undefined'&&typeof window.matchMedia==='function'&&window.matchMedia('(prefers-reduced-motion: reduce)').matches,[])
 useEffect(()=>()=>disposeExpansionEnvironment(root),[root])
 // Studio part contract: animateExpansionEnvironment (expansionEnvironment.js) composes every part with composeStudioPartPosition / composeStudioPartRotation.
 useFrame(({clock})=>{
   const reduced=staticPose||prefersReduced||document.hidden||document.documentElement?.hasAttribute('data-reduced-effects')
   animateExpansionEnvironment(root,clock.elapsedTime,reduced)
 })
 if(!root)return null
 return <StudioTunedGroup itemId={`stage-floor-${stageId}`}><primitive object={root} dispose={null}/></StudioTunedGroup>
}
