// Outfits for the procedural block player (PlayerMesh: the '단순' appearance and the title-screen player).
//
// The palette is NOT duplicated here: like playerV9Outfits.js it comes from the Rosari room
// wardrobe data (rosariOutfits.js), so the room, the v9 player and the block player wear the
// same 동복. Only garment blocks name a slot; hair, skin, eyes, shoes, bag, straps and the
// waist band keep their own colors. No geometry is added: the winter look is pure recolor.
import { resolveRosariOutfitForModel } from './rosariOutfits.js'

// Garment base color for one PlayerMesh block. Unknown/absent outfit or a slot the outfit
// does not recolor returns `baseColor` unchanged, so the default outfit is a no-op.
// PlayerMesh is also the title-screen player, which the title canon lock keeps on the looks
// it already had (default, 동복): an outfit whose rosariOutfits.js `models` omits 'legacy'
// (the S6 임시안 비옷/체육복/급식 당번복/졸업) is worn here as the default school uniform.
export function resolvePlayerMeshGarmentColor(slot, baseColor, outfitId) {
  const hex = resolveRosariOutfitForModel(outfitId, 'legacy').colors[slot]
  return hex ? parseInt(hex.slice(1), 16) : baseColor
}
