import { EXPANSION_STAGES, EXPANSION_BOSSES, getExpansionStats } from './expansionContent.js'
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
 if(!EXPANSION_STAGES[stageId] || !(count>0))return []
 const {scale,radius}=bodyRadius(type)
 const y=.25*scale*4/3
 const width=(count-1)*ASSEMBLY_ROW_SPACING
 const minCx=-bounds.halfX+radius+width/2, maxCx=bounds.halfX-radius-width/2
 const cx=minCx>maxCx?0:Math.min(maxCx,Math.max(minCx,player.x))
 const screen=screenRect??{minZ:player.z-12,maxZ:player.z+7}
 let resolved=side==='gate'?'bottom':side
 if(resolved==='auto') resolved=(screen.minZ+bounds.halfZ)>=(bounds.halfZ-screen.maxZ)?'top':'bottom'
 const zFor=(which)=>{
  const raw=which==='top'?screen.minZ-ASSEMBLY_ROW_SCREEN_MARGIN:screen.maxZ+ASSEMBLY_ROW_SCREEN_MARGIN
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
  if(!insideMap(x,z,radius,bounds))continue
  if(Math.hypot(x-player.x,z-player.z)<ASSEMBLY_ROW_MIN_PLAYER_DISTANCE)continue
  if(overlapsObstacle(x,z,radius,obstacles) || overlapsTaken(x,z,radius,placed))continue
  const pos=[x,y,z]
  out.push(pos);placed.push(pos)
 }
 return out
}

// 'track_lanes' — 트랙 직선 위 6지점(stage6 layout.trackLanePointsUnits), 6마리 넘으면 z +2.1u로 한 바퀴 더(최대 12).
export function expansionTrackLanePositions(type,stageId,player,bounds,count,obstacles=[],taken=[]) {
 if(!EXPANSION_STAGES[stageId] || !(count>0))return []
 const {scale,radius}=bodyRadius(type)
 const y=.25*scale*4/3
 const out=[],placed=[...taken]
 const total=Math.min(count,TRACK_LANE_POINTS.length*2)
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
