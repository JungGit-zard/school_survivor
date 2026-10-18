import { readFileSync } from 'node:fs'
import path from 'node:path'

const SDK_VERSION = '1.1.3'
const DECLARATION = "const PersistentStorage = createStoragefor('localStorage');"

// RTDB has no public switch for these persistent transport/host hints. Select
// its own MemoryStorage before any DOM-storage capability probe can execute.
// This is deliberately NOT a browser Storage shim or a user-data cache.
export function firebaseDatabaseMemoryStoragePlugin() {
 return {
  name: 'firebase-database-memory-storage',
  enforce: 'pre',
  transform(code, id) {
   const filename = id.split('?')[0].replace(/\\/g, '/')
   if (!filename.endsWith('/@firebase/database/dist/index.esm.js')) return null
   const manifest = JSON.parse(readFileSync(path.resolve(path.dirname(filename), '../package.json'), 'utf8'))
   if (manifest.name !== '@firebase/database' || manifest.version !== SDK_VERSION) {
    throw new Error(`RTDB memory-storage transform requires reviewed @firebase/database ${SDK_VERSION}; found ${manifest.version}`)
   }
   if (code.split(DECLARATION).length !== 2 || !code.includes('class MemoryStorage {')) {
    throw new Error('RTDB memory-storage transform: SDK storage declaration changed; review required')
   }
   return { code: code.replace(DECLARATION, 'const PersistentStorage = new MemoryStorage();'), map: null }
  },
 }
}
