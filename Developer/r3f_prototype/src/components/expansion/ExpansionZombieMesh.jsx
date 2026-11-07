import { useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import StudioTunedGroup from '../StudioTunedGroup.jsx'
import { getExpansionVisual } from '../../lib/expansionVisuals.js'
import { getFlashMat } from '../../lib/toon.js'
import { animateExpansionRig, createExpansionRig, disposeExpansionRig } from './expansionRig.js'

export default function ExpansionZombieMesh({ type, animPhase='normal', hitFlash=false, staticPose=false }) {
  const def=getExpansionVisual(type)
  const root=useMemo(()=>createExpansionRig(type),[type])
  // Mount the rig directly under StudioTunedGroup: paths 0.0.0.0 etc.
  // R3F reparents this child; the off-scene root retains animation refs only.
  const rig=useMemo(()=>root?.children[0]??null,[root])
  useEffect(()=>()=>disposeExpansionRig(rig),[rig])
  // Studio part contract: animateExpansionRig (expansionRig.js) composes every part with composeStudioPartPosition / composeStudioPartRotation.
  useFrame(({clock})=>{
    if(!root)return
    const reduced=staticPose||(typeof document!=='undefined'&&document.documentElement?.hasAttribute('data-reduced-effects'))
    animateExpansionRig(root,clock.elapsedTime,animPhase,reduced)
    rig.traverse(node=>{
      if(!node.isMesh||node.userData.expansionOutline)return
      // Swap per mesh, never recolor: without Studio material tuning node.material is the shared
      // getCachedToonMat singleton, so mutating its color whitened every zombie using it.
      if(hitFlash){if(!node.userData.expansionFlashRestore){node.userData.expansionFlashRestore=node.material;node.material=getFlashMat();node.userData.studioNonTunable=true}}
      else if(node.userData.expansionFlashRestore){node.material=node.userData.expansionFlashRestore;delete node.userData.expansionFlashRestore;delete node.userData.studioNonTunable}
    })
  })
  if(!def||!rig)return null
  return <StudioTunedGroup itemId={def.studioItemId}><primitive object={rig} dispose={null} /></StudioTunedGroup>
}
