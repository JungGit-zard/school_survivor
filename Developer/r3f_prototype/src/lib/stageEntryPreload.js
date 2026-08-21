import { useLoader } from '@react-three/fiber'
import * as THREE from 'three'
import stage1TileUrl from '../assets/background_floor/tile_stage01.webp'
import stage2TileUrl from '../assets/background_floor/tile_stage02_corridor.webp'
import stage2EndWallUrl from '../assets/background_floor/stage02_corridor_end_wall.webp'
import stage4TileUrl from '../assets/background_floor/tile_stage04_cafeteria.webp'
import spawnSmokeUrl from '../assets/effects/spawn_smoke_puff.webp'
import boss01FaceUrl from '../assets/faces/b01_math_teacher_face.webp'
import boss02FaceUrl from '../assets/faces/b02_stage2_boss_face.webp'
import boss03FaceUrl from '../assets/faces/b03_pe_teacher_face.webp'
import boss04FaceUrl from '../assets/faces/b04_chef_boss_face.webp'

// Network/cache warm-up only.  GPU upload still happens in the one real game
// Canvas, which prevents the useless second-WebGL-context prewarm pattern.
export const STAGE_ENTRY_TEXTURE_URLS = Object.freeze({
  stage1: Object.freeze([stage1TileUrl, spawnSmokeUrl, boss01FaceUrl]),
  stage2: Object.freeze([stage2TileUrl, stage2EndWallUrl, spawnSmokeUrl, boss02FaceUrl]),
  stage3: Object.freeze([spawnSmokeUrl, boss03FaceUrl]),
  stage4: Object.freeze([stage4TileUrl, spawnSmokeUrl, boss04FaceUrl]),
})

export function getStageEntryTextureUrls(stageId) {
  return STAGE_ENTRY_TEXTURE_URLS[stageId] ?? STAGE_ENTRY_TEXTURE_URLS.stage1
}

export function preloadStageEntryAssets(stageId) {
  if (typeof document === 'undefined' || import.meta.env?.MODE === 'test') return
  const urls = getStageEntryTextureUrls(stageId)
  for (let index = 0; index < urls.length; index += 1) {
    try {
      useLoader.preload(THREE.TextureLoader, urls[index])
    } catch {
      // A failed opportunistic warm-up must not block stage entry; the same
      // loader cache retries from the real Canvas mount.
    }
  }
}
