import { useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import StudioTunedGroup from '../StudioTunedGroup.jsx'
import { getExpansionVisual } from '../../lib/expansionVisuals.js'
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
      const mat=node.material
      if(hitFlash){if(!mat.userData.expansionFlashColor)mat.userData.expansionFlashColor=mat.color.clone();mat.color.set('#ffffff')}
      else if(mat.userData.expansionFlashColor){mat.color.copy(mat.userData.expansionFlashColor);delete mat.userData.expansionFlashColor}
    })
  })
  if(!def||!rig)return null
  return <StudioTunedGroup itemId={def.studioItemId}><primitive object={rig} dispose={null} /></StudioTunedGroup>
}
