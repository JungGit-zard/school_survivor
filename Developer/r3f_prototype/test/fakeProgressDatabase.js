// In-memory, path-aware stand-in for the Realtime Database used by firebaseProgress tests.
// Every write is checked against the repo's database.rules.json `.validate` rules for users/$uid
// (a small evaluator, not the Firebase emulator) and rejected like PERMISSION_DENIED when invalid.
// Reads and writes are logged so tests can prove which paths a save touched.
import RULES from '../database.rules.json'

const USER_RULES = RULES.rules.users.$uid
const INCREMENT = '.sv'

if (!Object.hasOwn(String.prototype, 'matches')) {
  Object.defineProperty(String.prototype, 'matches', {
    value(pattern) { return pattern.test(String(this)) },
    configurable: true,
    enumerable: false,
  })
}

const clone = value => (value === undefined ? undefined : structuredClone(value))
const segments = path => String(path).split('/').filter(Boolean)

function prune(value) {
  if (Array.isArray(value)) value = Object.fromEntries(value.map((item, index) => [String(index), item]))
  if (!value || typeof value !== 'object') return value === null ? undefined : value
  const out = {}
  for (const [key, child] of Object.entries(value)) {
    const next = prune(child)
    if (next !== undefined) out[key] = next
  }
  return Object.keys(out).length ? out : undefined
}

function getAt(root, path) {
  return segments(path).reduce((node, key) => (node == null ? undefined : node[key]), root)
}

function setAt(root, path, value) {
  const keys = segments(path)
  let node = root
  for (const key of keys.slice(0, -1)) {
    if (!node[key] || typeof node[key] !== 'object') node[key] = {}
    node = node[key]
  }
  const pruned = prune(value)
  if (pruned === undefined) delete node[keys.at(-1)]
  else node[keys.at(-1)] = pruned
}

function snap(value) {
  const present = v => v !== undefined && v !== null && !(typeof v === 'object' && Object.keys(v).length === 0)
  return {
    exists: () => present(value),
    val: () => (value === undefined ? null : value),
    child: path => snap(segments(path).reduce((node, key) => (node == null ? undefined : node[key]), value)),
    hasChildren: keys => !!value && typeof value === 'object' && (keys ? keys.every(key => present(value[key])) : Object.keys(value).length > 0),
    isNumber: () => typeof value === 'number',
    isString: () => typeof value === 'string',
    isBoolean: () => typeof value === 'boolean',
  }
}

function evaluate(expression, newValue, oldValue, vars) {
  const names = Object.keys(vars)
  // eslint-disable-next-line no-new-func
  return new Function('newData', 'data', 'now', ...names, `return (${expression})`)(snap(newValue), snap(oldValue), Date.now(), ...names.map(name => vars[name]))
}

function validateNode(rule, newValue, oldValue, vars, path, errors) {
  if (newValue === undefined || newValue === null) return
  if (JSON.stringify(newValue) === JSON.stringify(oldValue)) return
  if (rule['.validate'] && !evaluate(rule['.validate'], newValue, oldValue, vars)) errors.push(path)
  if (!newValue || typeof newValue !== 'object') return
  const wildcard = Object.keys(rule).find(key => key.startsWith('$'))
  for (const key of Object.keys(newValue)) {
    let childRule = rule[key]
    let childVars = vars
    if (!childRule && wildcard) {
      childRule = rule[wildcard]
      childVars = { ...vars, [wildcard]: key }
    }
    if (childRule && typeof childRule === 'object') validateNode(childRule, newValue[key], oldValue?.[key], childVars, `${path}/${key}`, errors)
  }
}

export function validateUserNodeWrite(uid, before, after) {
  const errors = []
  validateNode(USER_RULES, after, before, { $uid: uid }, `users/${uid}`, errors)
  return errors
}

export function createFakeProgressDatabase(initialRoot = {}) {
  const root = prune(clone(initialRoot)) ?? {}
  const reads = []
  const writes = []

  function commitUserWrite(path, mutateNode) {
    const [top, uid] = segments(path)
    if (top !== 'users' || !uid) throw new Error(`fake database only serves users/{uid}, got ${path}`)
    const before = clone(getAt(root, `users/${uid}`))
    const after = clone(before) ?? {}
    mutateNode(after)
    const pruned = prune(after)
    const errors = validateUserNodeWrite(uid, before, pruned)
    if (errors.length) {
      throw Object.assign(new Error(`PERMISSION_DENIED: ${errors.join(', ')}`), { code: 'PERMISSION_DENIED', errors })
    }
    setAt(root, `users/${uid}`, pruned)
  }

  const db = {
    root,
    reads,
    writes,
    get: path => clone(getAt(root, path)),
    increment: delta => ({ [INCREMENT]: { increment: delta } }),
    load: async path => {
      reads.push(path)
      return clone(getAt(root, path)) ?? null
    },
    loadFields: async (path, fields) => Object.fromEntries(fields.map(field => {
      reads.push(`${path}/${field}`)
      return [field, clone(getAt(root, `${path}/${field}`)) ?? null]
    })),
    transaction: async (path, mutate) => {
      reads.push(path)
      let next
      try {
        next = mutate(clone(getAt(root, path)) ?? null)
      } catch (error) {
        return Promise.reject(error)
      }
      if (next === undefined) return { committed: false, snapshot: { val: () => clone(getAt(root, path)) ?? null } }
      writes.push({ kind: 'transaction', path, value: clone(next) })
      const relative = segments(path).slice(2).join('/')
      commitUserWrite(path, node => {
        if (relative) setAt(node, relative, clone(next))
        else Object.keys(node).forEach(key => delete node[key]) || Object.assign(node, clone(next))
      })
      return { committed: true, snapshot: { val: () => clone(getAt(root, path)) ?? null } }
    },
    update: async (path, values) => {
      writes.push({ kind: 'update', path, values: clone(values) })
      const relativeBase = segments(path).slice(2)
      commitUserWrite(path, node => {
        for (const [key, value] of Object.entries(values)) {
          const childPath = [...relativeBase, ...segments(key)].join('/')
          if (value && typeof value === 'object' && value[INCREMENT]) {
            const current = getAt(node, childPath)
            setAt(node, childPath, (typeof current === 'number' ? current : 0) + value[INCREMENT].increment)
          } else {
            setAt(node, childPath, clone(value))
          }
        }
      })
    },
    remove: async path => {
      writes.push({ kind: 'remove', path })
      setAt(root, path, null)
    },
  }
  return db
}
