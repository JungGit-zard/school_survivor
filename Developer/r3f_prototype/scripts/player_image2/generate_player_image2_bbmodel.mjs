import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

const outputPath = resolve(process.argv[2] ?? 'src/assets/models/player/source/player-image2-2026-08-29.bbmodel')

const parts = [
  ['head', [0, 125, 0], [-40, 90, -30], [40, 160, 30]],
  ['hair_top', [0, 145, 0], [-46, 142, -38], [46, 178, 38]],
  ['hair_front', [0, 128, 31], [-38, 122, 28], [38, 150, 48]],
  ['hair_side_l', [-42, 112, 0], [-52, 88, -28], [-30, 140, 28]],
  ['hair_side_r', [42, 114, 0], [30, 94, -26], [52, 142, 26]],
  ['hair_tail_l', [-48, 78, -8], [-58, 45, -18], [-35, 100, 8]],
  ['hair_clip_r', [30, 154, 32], [20, 146, 30], [44, 162, 42]],
  ['eye_l', [-18, 116, 32], [-24, 108, 30], [-12, 124, 38]],
  ['eye_r', [18, 116, 32], [12, 108, 30], [24, 124, 38]],
  ['torso_jacket', [0, 57, 0], [-36, 24, -25], [36, 92, 25]],
  ['shirt_panel', [0, 64, 27], [-17, 39, 25], [17, 85, 33]],
  ['tie_yellow', [0, 56, 35], [-10, 35, 31], [10, 74, 39]],
  ['lower_uniform_blue', [0, 20, 0], [-44, 3, -29], [44, 32, 29]],
  ['backpack', [0, 65, -31], [-42, 34, -58], [42, 96, -31]],
  ['backpack_flap', [0, 58, -60], [-23, 46, -64], [23, 69, -56]],
  ['strap_l', [-25, 61, 25], [-30, 32, 21], [-20, 88, 31]],
  ['strap_r', [25, 61, 25], [20, 32, 21], [30, 88, 31]],
  ['arm_l', [-55, 62, 0], [-68, 24, -18], [-42, 82, 18]],
  ['hand_l', [-55, 16, 1], [-68, 4, -16], [-42, 28, 18]],
  ['arm_r', [55, 62, 0], [42, 24, -18], [68, 82, 18]],
  ['hand_r', [55, 16, 1], [42, 4, -16], [68, 28, 18]],
  ['leg_l', [-22, -20, 0], [-35, -58, -16], [-9, 3, 16]],
  ['shoe_l', [-22, -67, 9], [-43, -79, -24], [-1, -58, 29]],
  ['leg_r', [22, -20, 0], [9, -58, -16], [35, 3, 16]],
  ['shoe_r', [22, -67, 9], [1, -79, -24], [43, -58, 29]],
  ['lantern_body', [55, -7, 30], [39, -20, 18], [71, 0, 42]],
  ['lantern_lens', [55, -7, 44], [44, -19, 40], [66, 3, 54]],
  ['lantern_button', [55, 3, 31], [49, 0, 28], [61, 8, 37]],
  ['lantern_loop', [55, 12, 26], [43, 8, 18], [67, 18, 28]],
]

const makeUuid = (id) => `player-image2-${id}`
const makeCube = ([name, origin, from, to]) => ({
  name,
  type: 'cube',
  uuid: makeUuid(`cube-${name}`),
  from,
  to,
  origin,
  autouv: 0,
  color: 0,
  faces: Object.fromEntries(['north', 'east', 'south', 'west', 'up', 'down'].map((face) => [face, {
    uv: [0, 0, 4, 4],
    texture: null,
  }])),
})
const makeGroup = ([name, origin]) => ({
  name,
  origin,
  color: 0,
  uuid: makeUuid(`group-${name}`),
  children: [makeUuid(`cube-${name}`)],
  isOpen: true,
})

const document = {
  meta: {
    format_version: '5.0',
    model_format: 'free',
    box_uv: false,
  },
  name: 'player-image2-2026-08-29',
  geometry_name: 'player_image2_2026_08_29',
  visible_box: [1, 1, 0],
  elements: parts.map(makeCube),
  outliner: [{
    name: 'player_root',
    origin: [0, -79, 0],
    color: 0,
    uuid: makeUuid('group-player_root'),
    children: parts.map(makeGroup),
    isOpen: true,
  }],
  textures: [],
}

mkdirSync(dirname(outputPath), { recursive: true })
writeFileSync(outputPath, `${JSON.stringify(document, null, 2)}\n`, 'utf8')
console.log(`bbmodel=${outputPath}`)
console.log(`named_parts=${parts.length}`)
