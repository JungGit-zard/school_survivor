import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { createExpansionTelegraphVisual, disposeExpansionTelegraphVisual, updateExpansionTelegraphVisual, EXPANSION_TELEGRAPH_CAPACITY } from './expansionTelegraphs.js'

export function syncExpansionTelegraphs(group,cache,source) {
 if(!group)return
 const seen=new Set(),values=source?.values?source.values():source??[]
 let count=0
 for(const event of values) {
   if(!event||!['windup','telegraph','active'].includes(event.phase))continue
   if(count>=EXPANSION_TELEGRAPH_CAPACITY)break
   const key=event.key??event.id??event
   let entry=cache.get(key)
   if(!entry||entry.snapshot!==event||entry.phase!==event.phase) {
     if(entry){group.remove(entry.root);disposeExpansionTelegraphVisual(entry.root);cache.delete(key)}
     const root=createExpansionTelegraphVisual(event)
     if(!root)continue
     entry={root,snapshot:event,phase:event.phase};cache.set(key,entry);group.add(root)
   }
   updateExpansionTelegraphVisual(entry.root,event)
   seen.add(key);count++
 }
 for(const [key,entry]of cache)if(!seen.has(key)){group.remove(entry.root);disposeExpansionTelegraphVisual(entry.root);cache.delete(key)}
}
export function ExpansionHazardLayer({events=[],eventsRef=null,resetKey}) {
 const ref=useRef(),cache=useRef(new Map()),source=useRef(events),external=useRef(eventsRef)
 source.current=events;external.current=eventsRef
 useEffect(()=>()=>{
   for(const entry of cache.current.values()){ref.current?.remove(entry.root);disposeExpansionTelegraphVisual(entry.root)}
   cache.current.clear()
 },[resetKey])
 useFrame(()=>syncExpansionTelegraphs(ref.current,cache.current,external.current?.current??source.current))
 return <group ref={ref} name="expansion-authoritative-attack-telegraphs" />
}
export default ExpansionHazardLayer
