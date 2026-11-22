import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { b05ChantTelegraphFading, createExpansionTelegraphVisual, disposeExpansionTelegraphVisual, updateExpansionTelegraphVisual, EXPANSION_TELEGRAPH_CAPACITY } from './expansionTelegraphs.js'

export function syncExpansionTelegraphs(group,cache,source) {
 if(!group)return
 const seen=new Set(),values=source?.values?source.values():source??[]
 let count=0
 for(const event of values) {
   if(!event)continue
   const key=event.key??event.id??event
   let entry=cache.get(key)
   // B05 교가 제창(b05_p2) 십자는 이미 그리던 것만 recovery 페이드 동안 남긴다(새로 만들지는 않는다).
   const fading=entry?.root.userData.b05Chant===true&&b05ChantTelegraphFading(event)
   if(!fading&&!['windup','telegraph','active'].includes(event.phase))continue
   if(count>=EXPANSION_TELEGRAPH_CAPACITY)break
   // 같은 스냅샷의 페이즈가 바뀌면 보통은 다시 만든다(색·불투명도 초기값). b05_p2는 같은 root를 이어 써서 끊김 없이 넘긴다.
   if(entry&&entry.snapshot===event&&entry.phase!==event.phase&&entry.root.userData.b05Chant)entry.phase=event.phase
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
