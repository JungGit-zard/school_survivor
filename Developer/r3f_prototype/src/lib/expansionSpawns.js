import { EXPANSION_STAGES, EXPANSION_BOSSES, getExpansionStats } from './expansionContent.js'
import { isChiefType } from './stageChiefContent.js'
// 단위: 월드 유닛(u), 1블록 = 4u.

function bodyRadius(type, scaleOverride) {
 const stats=getExpansionStats(type)
 const scale=scaleOverride??stats?.scale??1
 return { scale, radius: .28*scale*4/3 }
}
function overlapsObstacle(x,z,radius,obstacles) {
 return obstacles.some(o=>{const dx=x-o.x,dz=z-o.z,c=o.cosY??Math.cos(o.rotationY??0),sn=o.sinY??Math.sin(o.rotationY??0);return Math.abs(dx*c-dz*sn)<o.halfX+radius&&Math.abs(dx*sn+dz*c)<o.halfZ+radius})
}
function insideMap(x,z,radius,bounds) {
 return Math.abs(x)<=bounds.halfX-radius && Math.abs(z)<=bounds.halfZ-radius
}
function overlapsTaken(x,z,radius,taken) {
 return taken.some(p=>Math.hypot(p[0]-x,p[2]-z)<radius*2+.1)
}
// 화면 사각형(게임이 발행하는 screenBounds — 카메라 끝 노출 연출과 무관한 기본 클램프 사각형, 실제 화면에 보이는 경기장 부분을 늘 포함)을
// margin + 몸 반경만큼 넓힌 안쪽이면 "화면 안"이다. 사각형이 없거나 숫자가 아니면 판정하지 않는다(false).
export function isInsideExpandedScreenRect(x,z,rect,pad) {
 if(!rect || ![rect.minX,rect.maxX,rect.minZ,rect.maxZ].every(Number.isFinite))return false
 return x>=rect.minX-pad && x<=rect.maxX+pad && z>=rect.minZ-pad && z<=rect.maxZ+pad
}

// ── 화면 밖 재배치(2026-11-19 Stage 6: 고정 지점도 화면 밖에서) ──────────────────────────────────────
// spawnPolicy.offscreenMarginUnits가 있는 스테이지만 쓴다. 원래 점에서 0.5u 격자(원래 점을 지나는 격자 — 같은 z/같은 x 줄이 먼저
// 후보가 된다)를 가까운 순으로 훑어 첫 번째 유효 점을 돌려준다: 맵 안 · 장애물·이미 놓인 몸과 안 겹침 · 플레이어와 minPlayerDistance 이상 ·
// (requireOffscreen이면) 화면 사각형 + margin + 몸 반경 밖. 없으면 null. 원래 점이 이미 유효하면 원래 점(거리 0).
const RELOCATE_STEP = 0.5
const RELOCATE_MAX_RADIUS = 34 // 17 × 28u 경기장 대각선(약 32.8u)보다 길다 — 맵 안 모든 격자점을 본다
const RELOCATE_OFFSETS = (() => {
 const n = Math.ceil(RELOCATE_MAX_RADIUS / RELOCATE_STEP), out = []
 for (let i = -n; i <= n; i++) for (let j = -n; j <= n; j++) { const d = Math.hypot(i, j) * RELOCATE_STEP; if (d <= RELOCATE_MAX_RADIUS) out.push([i * RELOCATE_STEP, j * RELOCATE_STEP, d]) }
 // 같은 거리면 z를 덜 바꾸는(같은 줄) 쪽, 그다음 x를 덜 바꾸는 쪽이 먼저다.
 out.sort((a, b) => a[2] - b[2] || Math.abs(a[1]) - Math.abs(b[1]) || Math.abs(a[0]) - Math.abs(b[0]) || a[0] - b[0] || a[1] - b[1])
 return out
})()
export function relocateSpawnPoint(x, z, radius, { bounds, obstacles = [], taken = [], player = null, minPlayerDistance = 0, screenRect = null, pad = 0, requireOffscreen = true }) {
 for (const [dx, dz] of RELOCATE_OFFSETS) {
  const cx = x + dx, cz = z + dz
  if (!insideMap(cx, cz, radius, bounds)) continue
  if (requireOffscreen && isInsideExpandedScreenRect(cx, cz, screenRect, pad)) continue
  if (player && Math.hypot(cx - player.x, cz - player.z) < minPlayerDistance) continue
  if (overlapsObstacle(cx, cz, radius, obstacles) || overlapsTaken(cx, cz, radius, taken)) continue
  return [cx, cz]
 }
 return null
}
function offscreenPad(stage, radius, screenRect) {
 const margin = stage?.spawnPolicy?.offscreenMarginUnits
 return Number.isFinite(margin) && screenRect ? margin + radius : null
}
// 고정 지점 스폰 공통: 화면 밖 유효 점 → (화면 밖 점이 하나도 없으면, 예: 화면이 경기장 폭을 다 덮는 가로 화면) 화면 무시 유효 점 → 원래 점.
// 마릿수는 절대 버리지 않는다.
function placeFixedOffscreen(x, z, radius, ctx) {
 return relocateSpawnPoint(x, z, radius, ctx)
  ?? relocateSpawnPoint(x, z, radius, { ...ctx, requireOffscreen: false })
  ?? relocateSpawnPoint(x, z, radius, { ...ctx, requireOffscreen: false, taken: [], minPlayerDistance: 0 })
  ?? [x, z]
}

// 드레인 직전 재확인(2026-11-19): 풀 스폰은 프레임당 3마리씩 큐에서 나온다. 좌표를 뽑은 뒤 나오기까지 플레이어·카메라가 움직이면
// 화면 밖이던 점이 화면 안이 된다(프로브 실측: 3,376 중 5건, 대기 중 카메라가 1~2u 이동). 화면 밖 규칙이 있는 스테이지에서만
// 나오는 순간의 화면 사각형으로 다시 보고, 안이면 가장 가까운 화면 밖 유효 점으로 옮긴다. 보스·치프·화면 밖 점이 없을 때는 그대로.
// cache = { id, bounds, obstacles } (Enemies.jsx stageRuntimeCache와 같은 모양). 마릿수·타입·HP는 건드리지 않는다.
export const QUEUED_SPAWN_MIN_PLAYER_DISTANCE = 3.0 // 0.75블록 = 조회 줄 슬롯 최소 거리와 같다
export function refreshQueuedExpansionSpawn(entry, cache, player, screenRect) {
 const stage=EXPANSION_STAGES[cache?.id]
 if(!entry?.pos || !stage || !cache?.bounds || EXPANSION_BOSSES[entry.type] || isChiefType(entry.type))return entry
 const {radius}=bodyRadius(entry.type)
 const pad=offscreenPad(stage,radius,screenRect)
 if(pad==null || !isInsideExpandedScreenRect(entry.pos[0],entry.pos[2],screenRect,pad))return entry
 const moved=relocateSpawnPoint(entry.pos[0],entry.pos[2],radius,{bounds:cache.bounds,obstacles:cache.obstacles??[],player,minPlayerDistance:QUEUED_SPAWN_MIN_PLAYER_DISTANCE,screenRect,pad})
 return moved?{...entry,pos:[moved[0],entry.pos[1],moved[1]]}:entry
}

// 보스 앵커(Stage 6 조회대 앞 (0, −11), 2026-11-18 축소 전 (0, −17)): 맵 안이고 장애물과 겹치지 않고 플레이어와 4u(1블록) 이상이면 앵커,
// 아니면 기존 bossSpawnDistanceUnits 링 규칙(스펙 Part C C-3-6).
export const EXPANSION_BOSS_ANCHOR_MIN_PLAYER_DISTANCE = 4

// Bounded safe-ring search, no fallback onto player or obstructed positions.
// spawnPolicy.offscreenMarginUnits가 있는 스테이지(2026-11-18 Stage 6 축소)는 screenRect 밖 후보를 먼저 고르고, maxAttempts 안에
// 화면 밖 후보가 없으면 맵 안·겹침 없는 첫 후보로 돌아간다(마릿수 보존). 없는 스테이지는 예전과 같은 결과·같은 난수 소비다.
export function expansionSpawnPosition(type,stageId,player,bounds,taken=[],obstacles=[],random=Math.random,scaleOverride,screenRect=null) {
 const s=EXPANSION_STAGES[stageId];if(!s)return null
 const {scale,radius}=bodyRadius(type,scaleOverride)
 const boss=!!EXPANSION_BOSSES[type]
 const anchor=boss?s.layout?.bossAnchorUnits:null
 if(anchor){
  const x=anchor[0],z=anchor[2]
  if(insideMap(x,z,radius,bounds) && !overlapsObstacle(x,z,radius,obstacles) && !overlapsTaken(x,z,radius,taken)
   && Math.hypot(x-player.x,z-player.z)>=EXPANSION_BOSS_ANCHOR_MIN_PLAYER_DISTANCE) return [x,.25*scale*4/3,z]
 }
 const offscreenMargin=!boss && Number.isFinite(s.spawnPolicy.offscreenMarginUnits) && screenRect ? s.spawnPolicy.offscreenMarginUnits : null
 let fallback=null
 for(let i=0;i<s.spawnPolicy.maxAttempts;i++){
  const angle=random()*Math.PI*2
  const r=boss?s.spawnPolicy.bossSpawnDistanceUnits:s.spawnPolicy.minDistanceUnits+random()*(s.spawnPolicy.maxDistanceUnits-s.spawnPolicy.minDistanceUnits)
  const x=player.x+Math.sin(angle)*r,z=player.z+Math.cos(angle)*r
  if(!insideMap(x,z,radius,bounds))continue
  if(overlapsTaken(x,z,radius,taken))continue
  if(overlapsObstacle(x,z,radius,obstacles))continue
  if(offscreenMargin!=null && isInsideExpandedScreenRect(x,z,screenRect,offscreenMargin+radius)){fallback??=[x,.25*scale*4/3,z];continue}
  return [x,.25*scale*4/3,z]
 }
 // 2026-11-19: 24번 다 화면 안이었으면 첫 유효 후보에서 가장 가까운 화면 밖 유효 점으로 옮긴다(링 거리 규칙 대신 플레이어와 최소 거리만).
 // 유효 후보가 하나도 없었으면 마지막 링 방향 점에서 찾는다. 그래도 화면 밖 점이 없으면 예전처럼 fallback(화면 안)을 쓴다.
 if(offscreenMargin!=null){
  const seed=fallback??[player.x,0,player.z+s.spawnPolicy.minDistanceUnits]
  const moved=relocateSpawnPoint(seed[0],seed[2],radius,{bounds,obstacles,taken,player,minPlayerDistance:s.spawnPolicy.minDistanceUnits*.5,screenRect,pad:offscreenMargin+radius})
  if(moved) return [moved[0],.25*scale*4/3,moved[1]]
  if(!fallback){
   const any=relocateSpawnPoint(seed[0],seed[2],radius,{bounds,obstacles,taken,player,minPlayerDistance:s.spawnPolicy.minDistanceUnits*.5,requireOffscreen:false})
   if(any) return [any[0],.25*scale*4/3,any[1]]
  }
 }
 return fallback
}

// ── Stage 6 신규 포메이션(스펙 Part C C-5-3) ─────────────────────────────────────
export const ASSEMBLY_ROW_SPACING = 1.1          // 0.275블록. E19 몸 지름 0.747u + 여유
export const ASSEMBLY_ROW_SCREEN_MARGIN = 1.0    // 화면 끝 바로 밖 1u
export const ASSEMBLY_ROW_MIN_PLAYER_Z_GAP = 6.0 // 1.5블록. 이보다 가까우면 반대쪽으로 1회 바꾼다
export const ASSEMBLY_ROW_MIN_PLAYER_DISTANCE = 3.0 // 0.75블록. 화면 안 생성 허용 시 슬롯별 최소 거리
// 정본은 stage6 layout.trackLanePointsUnits(2026-11-18 축소: ±5.5 × −4.2/0/+4.2, 둘째 바퀴 +2.1u). 여기는 그 사본이다.
const STAGE6_LAYOUT = EXPANSION_STAGES.stage6.layout
export const TRACK_LANE_POINTS = Object.freeze(STAGE6_LAYOUT.trackLanePointsUnits.map((p) => Object.freeze([p[0], p[1]])))
export const TRACK_LANE_SECOND_LAP_Z_OFFSET = STAGE6_LAYOUT.trackLaneSecondLapZOffsetUnits
export const TRACK_LANE_MIN_PLAYER_DISTANCE = 4.0 // 1블록

// 'assembly_row' — X축 평행 가로줄(조회 줄). side: top(화면 위 밖) / bottom·gate(화면 아래 밖, 정문 = +Z) / auto(경계까지 여유 큰 쪽).
// 실패한 슬롯만 건너뛴다(대체 위치 없음 = skip_individual).
export function expansionRowPositions(type,stageId,player,bounds,screenRect,count,side='top',obstacles=[],taken=[]) {
 const stage=EXPANSION_STAGES[stageId]
 if(!stage || !(count>0))return []
 const {scale,radius}=bodyRadius(type)
 // 2026-11-19 화면 밖 규칙(offscreenMarginUnits)이 있는 스테이지: 줄은 화면 끝에서 margin + 몸 반경 밖에 선다(몸 전체가 화면 밖 + 1u).
 // 경기장 끝에 막혀 화면 안에 걸리는 슬롯·플레이어에 너무 가깝거나 골대·다른 몸과 겹치는 슬롯은 버리지 않고
 // 가장 가까운 화면 밖 유효 점으로 옮긴다(같은 z 줄의 화면 좌우 바깥이 먼저 — 조회 줄이 화면 양옆에서 들어온다).
 const pad=offscreenPad(stage,radius,screenRect)
 const rowMargin=pad??ASSEMBLY_ROW_SCREEN_MARGIN
 const y=.25*scale*4/3
 const width=(count-1)*ASSEMBLY_ROW_SPACING
 const minCx=-bounds.halfX+radius+width/2, maxCx=bounds.halfX-radius-width/2
 const cx=minCx>maxCx?0:Math.min(maxCx,Math.max(minCx,player.x))
 const screen=screenRect??{minZ:player.z-12,maxZ:player.z+7}
 let resolved=side==='gate'?'bottom':side
 if(resolved==='auto') resolved=(screen.minZ+bounds.halfZ)>=(bounds.halfZ-screen.maxZ)?'top':'bottom'
 const zFor=(which)=>{
  const raw=which==='top'?screen.minZ-rowMargin-1e-6:screen.maxZ+rowMargin+1e-6
  return Math.min(bounds.halfZ-radius,Math.max(-bounds.halfZ+radius,raw))
 }
 let z=zFor(resolved)
 if(Math.abs(z-player.z)<ASSEMBLY_ROW_MIN_PLAYER_Z_GAP){
  const other=resolved==='top'?'bottom':'top'
  const z2=zFor(other)
  if(Math.abs(z2-player.z)>Math.abs(z-player.z)) z=z2
 }
 const out=[],placed=[...taken]
 for(let i=0;i<count;i++){
  const x=cx-width/2+i*ASSEMBLY_ROW_SPACING
  if(pad!=null){
   const [px,pz]=placeFixedOffscreen(x,z,radius,{bounds,obstacles,taken:placed,player,minPlayerDistance:ASSEMBLY_ROW_MIN_PLAYER_DISTANCE,screenRect,pad})
   const pos=[px,y,pz]
   out.push(pos);placed.push(pos)
   continue
  }
  if(!insideMap(x,z,radius,bounds))continue
  if(Math.hypot(x-player.x,z-player.z)<ASSEMBLY_ROW_MIN_PLAYER_DISTANCE)continue
  if(overlapsObstacle(x,z,radius,obstacles) || overlapsTaken(x,z,radius,placed))continue
  const pos=[x,y,z]
  out.push(pos);placed.push(pos)
 }
 return out
}

// 'track_lanes' — 트랙 직선 위 6지점(stage6 layout.trackLanePointsUnits), 6마리 넘으면 z +2.1u로 한 바퀴 더(최대 12).
// 2026-11-19 화면 밖 규칙(offscreenMarginUnits + screenRect)이 있으면: 화면 안(+ margin + 몸 반경)이거나 플레이어 4u 안이거나 겹치는 지점은
// 버리지 않고 ① 아직 안 쓴 다른 계주 지점(12점 중 화면 밖·유효, 원래 점에서 가까운 순) → ② 원래 점에서 가장 가까운 화면 밖 유효 점으로 옮긴다.
export function expansionTrackLanePositions(type,stageId,player,bounds,count,obstacles=[],taken=[],screenRect=null) {
 const stage=EXPANSION_STAGES[stageId]
 if(!stage || !(count>0))return []
 const {scale,radius}=bodyRadius(type)
 const y=.25*scale*4/3
 const out=[],placed=[...taken]
 const total=Math.min(count,TRACK_LANE_POINTS.length*2)
 const pad=offscreenPad(stage,radius,screenRect)
 if(pad!=null){
  const lanePoints=[...TRACK_LANE_POINTS.map(([x,z])=>[x,z]),...TRACK_LANE_POINTS.map(([x,z])=>[x,z+TRACK_LANE_SECOND_LAP_Z_OFFSET])]
  const used=new Set()
  const valid=([x,z])=>insideMap(x,z,radius,bounds) && Math.hypot(x-player.x,z-player.z)>=TRACK_LANE_MIN_PLAYER_DISTANCE
   && !overlapsObstacle(x,z,radius,obstacles) && !overlapsTaken(x,z,radius,placed) && !isInsideExpandedScreenRect(x,z,screenRect,pad)
  for(let i=0;i<total;i++){
   const own=lanePoints[i]
   let pick=null
   if(!used.has(i) && valid(own)){pick=own;used.add(i)}
   else {
    let best=-1,bestD=Infinity
    for(let k=0;k<lanePoints.length;k++){
     if(used.has(k) || k<total&&k>i)continue // 뒤에 올 자기 지점은 남겨 둔다
     if(!valid(lanePoints[k]))continue
     const d=Math.hypot(lanePoints[k][0]-own[0],lanePoints[k][1]-own[1])
     if(d<bestD){bestD=d;best=k}
    }
    if(best>=0){pick=lanePoints[best];used.add(best)}
    else pick=placeFixedOffscreen(own[0],own[1],radius,{bounds,obstacles,taken:placed,player,minPlayerDistance:TRACK_LANE_MIN_PLAYER_DISTANCE,screenRect,pad})
   }
   const pos=[pick[0],y,pick[1]]
   out.push(pos);placed.push(pos)
  }
  return out
 }
 for(let i=0;i<total;i++){
  const [bx,bz]=TRACK_LANE_POINTS[i%TRACK_LANE_POINTS.length]
  const x=bx,z=bz+(i>=TRACK_LANE_POINTS.length?TRACK_LANE_SECOND_LAP_Z_OFFSET:0)
  if(!insideMap(x,z,radius,bounds))continue
  if(Math.hypot(x-player.x,z-player.z)<TRACK_LANE_MIN_PLAYER_DISTANCE)continue
  if(overlapsObstacle(x,z,radius,obstacles) || overlapsTaken(x,z,radius,placed))continue
  const pos=[x,y,z]
  out.push(pos);placed.push(pos)
 }
 return out
}

// ── 2026-11-19 A8 ②: 90초 전 행 몸 나눠 내기(stage6 earlyRowStagger) ─────────────────────────────────────
// 같은 몸·같은 순서·같은 좌표(배치 때 뽑은 자리 — 나오는 순간 화면 밖 재확인은 드레인이 한다), 버리지 않는다.
// i번째 몸은 now + spreadSec × i / n 에 나온다(첫 몸은 즉시). 보스·한 마리 행은 대상이 아니다.
export function shouldStaggerExpansionBurst(stageId, evt, batchLength) {
 const policy=EXPANSION_STAGES[stageId]?.earlyRowStagger
 if(!policy || !evt || !(batchLength>1) || !Number.isFinite(evt.sec) || !(evt.sec<policy.beforeSec))return false
 return !EXPANSION_BOSSES[evt.type] && !/^B\d/.test(String(evt.type))
}
export function scheduleStaggeredBurst(list, stageId, batch, nowSec, token) {
 const spread=EXPANSION_STAGES[stageId]?.earlyRowStagger?.spreadSec??0
 for(let i=0;i<batch.length;i++) list.push({atSec:nowSec+spread*i/batch.length,entry:batch[i],token})
 return list
}
// 시각이 된 몸을 넣은 순서대로 꺼낸다(list는 제자리에서 줄어든다).
export function takeDueStaggered(list, nowSec, out=[]) {
 let w=0
 for(let r=0;r<list.length;r++){const item=list[r];if(item.atSec<=nowSec)out.push(item);else list[w++]=item}
 list.length=w
 return out
}
