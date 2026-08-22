import { existsSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(fileURLToPath(import.meta.url))
const projectRoot = join(root, '..')
const ids = [
  ['enemies', 'zombieDeathGrunt'],
  ['enemies', 'zombieDeathHeavy'],
  ['enemies', 'zombieDeathShriek'],
  ['enemies', 'zombieDeathGurgle'],
  ['enemies', 'zombieDeathBellow'],
  ['enemies', 'zombieSpawn'],
  ['enemies', 'zombieGroan'],
  ['enemies', 'zombieTankGroan'],
  ['enemies', 'zombieRunnerScreech'],
  ['enemies', 'zombieRangedShoot'],
  ['enemies', 'zombieChargeRoar'],
  ['events', 'bossSpawn'],
  ['enemies', 'bossRoar'],
  ['enemies', 'bossDeath'],
  ['enemies', 'matildaSpawn'],
  ['enemies', 'matildaLaugh'],
  ['enemies', 'matildaDash'],
  ['enemies', 'matildaDeath'],
  ['player', 'playerHit'],
  ['player', 'playerDeath'],
  ['player', 'playerHeal'],
  ['enemies', 'dogeEscape'],
  ['enemies', 'dogeYelp'],
  ['enemies', 'dogeDeath'],
  ['enemies', 'inuconBite'],
  ['enemies', 'inuconHeal'],
  ['events', 'rzlWhistle'],
  ['events', 'stage2GuardWhistle'],
  ['events', 'matildaCountdownEnd'],
]

const missing = []
for (const [dir, id] of ids) {
  for (const ext of ['ogg', 'mp3']) {
    const file = join(projectRoot, 'public', 'sfx', dir, `${id}.${ext}`)
    if (!existsSync(file) || statSync(file).size <= 0) missing.push(file)
  }
}
if (missing.length) {
  console.error(`missing voice sfx assets:\n${missing.join('\n')}`)
  process.exit(1)
}
console.log(`verified ${ids.length} voice-like SFX ids (${ids.length * 2} files)`)
