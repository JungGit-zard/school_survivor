import * as THREE from 'three'
import { getExpansionVisual } from '../../lib/expansionVisuals.js'
import { getCachedChamferedBoxGeo, getCachedToonMat, getCachedOutlineMat, inflateScale } from '../../lib/toon.js'
import { captureStudioPartBaseTransforms, composeStudioPartPosition, composeStudioPartRotation, disposeStudioOwnedMaterials } from '../StudioTunedGroup.jsx'

// Unit geometry is shared by mesh and instance consumers. The authored leaf scale
// lives on the actual mesh, so a numeric Studio mesh-path sees exactly this tree.
const geometryCache = new Map()
export function getExpansionGeometry(shape) {
  if (!geometryCache.has(shape)) {
    const geometry = shape==='box' ? getCachedChamferedBoxGeo(1,1,1,1,.09)
      : shape==='cylinder' ? new THREE.CylinderGeometry(.5,.5,1,8)
      : shape==='orb' ? new THREE.SphereGeometry(.5,8,6)
      : shape==='cone' ? new THREE.ConeGeometry(.5,1,4)
      : shape==='ring' ? new THREE.TorusGeometry(.40,.075,4,12)
      : null
    if (!geometry) throw new Error(`Unknown expansion art shape: ${shape}`)
    geometryCache.set(shape,geometry)
  }
  return geometryCache.get(shape)
}
function makeNode(def) {
  const node = new THREE.Group()
  node.name=def.name;node.position.fromArray(def.position??[0,0,0]);node.rotation.fromArray(def.rotation??[0,0,0])
  if (def.motion) node.userData.expansionMotion=def.motion
  if(def.children) def.children.forEach(child=>node.add(makeNode(child)))
  else {
    const geo=getExpansionGeometry(def.shape)
    const solid=new THREE.Mesh(geo,getCachedToonMat(def.color,def.emissive))
    solid.name=def.name;solid.scale.fromArray(def.size)
    solid.userData.expansionShape=def.shape
    solid.castShadow=false
    const outline=new THREE.Mesh(geo,getCachedOutlineMat())
    outline.name=`${def.name}-outline`;outline.scale.fromArray(def.size.map(v=>v*inflateScale(1.035)))
    outline.userData.expansionShape=def.shape;outline.userData.expansionOutline=true;outline.renderOrder=1
    node.add(solid,outline)
  }
  return node
}
export function createExpansionRig(type) {
  const def=getExpansionVisual(type)
  if(!def) return null
  const root=new THREE.Group();root.name=`expansion-${type}-studio-root`
  const rig=new THREE.Group();rig.name=`expansion-${type}-rig`
  def.rig.forEach(node=>rig.add(makeNode(node)));root.add(rig)
  root.userData.expansionType=type
  root.userData.expansionAnimated=[]
  root.traverse(node=>{if(node.userData.expansionMotion)root.userData.expansionAnimated.push(node)})
  captureStudioPartBaseTransforms(root)
  return root
}
export function collectExpansionLeaves(root) {
 const leaves=[];root?.traverse(node=>{if(node.isMesh)leaves.push(node)});return leaves
}
export function animateExpansionRig(root,time=0,phase='normal',reducedMotion=false) {
 if(!root)return
 const t=Number.isFinite(time)?time:0
 const moving=!reducedMotion&&phase!=='stun'
 const stride=moving?Math.sin(t*5.4)*.29:0
 const shake=moving?Math.sin(t*2.1)*.045:0
 for(const node of root.userData.expansionAnimated) {
   const motion=node.userData.expansionMotion
   const rx=motion==='legL'?stride:motion==='legR'?-stride:motion==='armL'?stride*.24:motion==='armR'?-stride*.24:motion==='body'&&phase==='charge'?-.17:0
   const rz=motion==='head'?shake:motion==='gear'?shake*.25:0
   const py=motion==='body'&&moving?Math.sin(t*5.4)*.014:0
   node.position.y=composeStudioPartPosition(node,'y',0,py)
   node.rotation.x=composeStudioPartRotation(node,'x',0,rx)
   node.rotation.y=composeStudioPartRotation(node,'y',0,0)
   node.rotation.z=composeStudioPartRotation(node,'z',0,rz)
 }
}
export function disposeExpansionRig(root) { disposeStudioOwnedMaterials(root) }

if(import.meta.hot) import.meta.hot.dispose(()=>{
 for(const [shape,geometry] of geometryCache) if(shape!=='box') geometry.dispose()
 geometryCache.clear()
})
