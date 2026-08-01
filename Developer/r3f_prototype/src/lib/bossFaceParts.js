import { getFirebaseStudioRuntimeDataset, setFirebaseStudioRuntimeDataset } from './studioRuntimeState.js'
import { getStudioZombieItemId } from './graphicsStudioConfig.js'

export const BOSS_FACE_RECIPES_EVENT = 'escape-zombie-school.bossFaceRecipes.changed'

export const BOSS_FACE_BOSS_OPTIONS = Object.freeze([
  { type: 'B01', itemId: getStudioZombieItemId('B01'), label: 'Boss B01 · 수학선생 좀비' },
  { type: 'B02', itemId: getStudioZombieItemId('B02'), label: 'Boss B02 · Stage 2 Boss' },
  { type: 'B03', itemId: getStudioZombieItemId('B03'), label: 'Boss B03 · 몸짱 체육교사' },
  { type: 'B04', itemId: getStudioZombieItemId('B04'), label: 'Boss B04 · 주방장 좀비' },
])

export const BOSS_FACE_PART_CATEGORIES = Object.freeze([
  {
    key: 'brow',
    label: '눈썹',
    parts: Object.freeze([
      { id: 'brow-soft-arc', label: '둥근 멍眉' },
      { id: 'brow-angry-slash', label: '화난 사선眉' },
      { id: 'brow-worried-roof', label: '걱정 지붕眉' },
      { id: 'brow-flat-deadpan', label: '무표정 일자眉' },
      { id: 'brow-wiggle-goofy', label: '꼬불 장난眉' },
    ]),
  },
  {
    key: 'eye',
    label: '눈',
    parts: Object.freeze([
      { id: 'eye-dot-beady', label: '콩알 눈' },
      { id: 'eye-happy-arc', label: '웃는 반달 눈' },
      { id: 'eye-empty-oval', label: '멍한 타원 눈' },
      { id: 'eye-x-dizzy', label: '빙글 X 눈' },
      { id: 'eye-squint-lines', label: '째려보는 선눈' },
    ]),
  },
  {
    key: 'nose',
    label: '코',
    parts: Object.freeze([
      { id: 'nose-hook', label: '갈고리 코' },
      { id: 'nose-dot', label: '점 코' },
      { id: 'nose-triangle', label: '세모 코' },
      { id: 'nose-long-line', label: '긴 선 코' },
      { id: 'nose-piggy', label: '돼지 콧구멍' },
    ]),
  },
  {
    key: 'mouth',
    label: '입',
    parts: Object.freeze([
      { id: 'mouth-big-smile', label: '활짝 웃음' },
      { id: 'mouth-wavy-grin', label: '흐물 웃음' },
      { id: 'mouth-open-o', label: '멍한 O입' },
      { id: 'mouth-zigzag', label: '삐뚤 지그재그' },
      { id: 'mouth-tiny-frown', label: '작은 찡찡입' },
    ]),
  },
])

export const BOSS_FACE_PART_INDEX = Object.freeze(Object.fromEntries(
  BOSS_FACE_PART_CATEGORIES.flatMap((category) => category.parts.map((part, index) => [part.id, index])),
))

export const DEFAULT_BOSS_FACE_RECIPE = Object.freeze({
  brow: 'brow-soft-arc',
  eye: 'eye-dot-beady',
  nose: 'nose-hook',
  mouth: 'mouth-big-smile',
})

const VALID_PART_IDS_BY_CATEGORY = Object.freeze(Object.fromEntries(
  BOSS_FACE_PART_CATEGORIES.map((category) => [category.key, new Set(category.parts.map((part) => part.id))]),
))

const VALID_BOSS_TYPES = new Set(BOSS_FACE_BOSS_OPTIONS.map((boss) => boss.type))

export function normalizeBossFaceRecipe(input = {}) {
  const source = input && typeof input === 'object' ? input : {}
  return Object.fromEntries(BOSS_FACE_PART_CATEGORIES.map((category) => {
    const candidate = source[category.key]
    return [
      category.key,
      VALID_PART_IDS_BY_CATEGORY[category.key].has(candidate)
        ? candidate
        : DEFAULT_BOSS_FACE_RECIPE[category.key],
    ]
  }))
}

export function normalizeBossFaceRecipeMap(input = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return {}
  return Object.fromEntries(
    Object.entries(input)
      .filter(([bossType]) => VALID_BOSS_TYPES.has(bossType))
      .map(([bossType, recipe]) => [bossType, normalizeBossFaceRecipe(recipe)]),
  )
}

export function loadBossFaceRecipes(storage) {
  if (storage) throw new TypeError('Graphics Studio storage adapters are forbidden. Firebase runtime only.')
  return normalizeBossFaceRecipeMap(getFirebaseStudioRuntimeDataset('bossFaceRecipes'))
}

export function saveBossFaceRecipes(recipes, storage) {
  if (storage) throw new TypeError('Graphics Studio storage adapters are forbidden. Firebase runtime only.')
  const normalized = normalizeBossFaceRecipeMap(recipes)
  setFirebaseStudioRuntimeDataset('bossFaceRecipes', normalized)
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(BOSS_FACE_RECIPES_EVENT, { detail: normalized }))
  }
  return normalized
}

export function getBossFacePartIndex(partId) {
  return BOSS_FACE_PART_INDEX[partId] ?? 0
}
