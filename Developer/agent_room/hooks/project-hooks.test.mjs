import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, mkdtempSync, writeFileSync, unlinkSync, rmdirSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const root = fileURLToPath(new URL('../../../', import.meta.url))
const config = JSON.parse(readFileSync(join(root, '.codex/hooks.json'), 'utf8'))
const all = Object.values(config.hooks).flatMap((entry) => entry.flatMap((group) => group.hooks))
function run(command, payload = {}, shell = 'powershell', cwd = join(root, 'Developer/r3f_prototype')) {
  const args = shell === 'powershell' ? ['-NoProfile', '-Command', command] : ['/d', '/c', `"${command}"`]
  const result = spawnSync(shell === 'powershell' ? 'powershell.exe' : process.env.COMSPEC, args, {
    cwd, input: JSON.stringify(payload), encoding: 'utf8', timeout: 20_000,
    windowsVerbatimArguments: shell === 'cmd',
    env: { ...process.env, CODEX_PROJECT_DIR: 'D:/nonexistent-old-checkout', CLAUDE_PROJECT_DIR: 'D:/nonexistent-old-checkout' },
  })
  assert.equal(result.status, 0, `${result.error ?? ''}\n${result.stderr}`)
  return result.stdout.trim()
}

test('preserves eight handlers and matchers and executes Windows overrides from a subdirectory', () => {
  assert.equal(all.length, 8)
  assert.equal(config.hooks.SessionStart[0].matcher, 'startup|resume|compact')
  assert.deepEqual(config.hooks.PreToolUse.map((group) => group.matcher), ['Bash|PowerShell|shell_command|terminal|exec_command', 'Write', 'Edit', 'MultiEdit', 'Skill'])
  for (const hook of all) {
    assert.match(hook.command, /git rev-parse --show-toplevel/)
    assert.match(hook.commandWindows, /git rev-parse --show-toplevel/)
    assert.doesNotMatch(hook.command + hook.commandWindows, /D:\\JungSil/)
    for (const shell of ['powershell', 'cmd']) for (const cwd of [root, join(root, 'Developer/r3f_prototype')]) {
    const output = run(hook.commandWindows, { hook_event_name: 'PreToolUse', tool_name: 'Bash', tool_input: { command: 'git status' } }, shell, cwd)
    if (hook.command.includes('require-today-resume-summary')) assert.match(output, /REQUIRED RESUME SUMMARY/)
    else if (hook.command.includes('require-advisor-worker-mode')) {
      assert.match(output, /Advisor\/Worker split/)
      assert.doesNotMatch(output, /Spark-class|spark-only|gpt-5\.3-codex-spark/)
    } else assert.equal(typeof JSON.parse(output), 'object')
    }
  }
})

test('forwards synthetic stdin to both deletion and Stage 2 guards without executing requested commands', () => {
  const deletion = all.find((hook) => hook.command.includes('destructive_shell_deletion_guard.py'))
  for (const shell of ['powershell', 'cmd']) {
  const blocked = JSON.parse(run(deletion.commandWindows, { tool_name: 'Bash', tool_input: { command: 'cmd.exe /c rd /s /q D:\\' } }, shell))
  assert.equal(blocked.hookSpecificOutput.permissionDecision, 'deny')
  const stage = all.find((hook) => hook.command.includes('require-stage2-boss-v2-gate.sh'))
  const rejected = JSON.parse(run(stage.commandWindows, { tool_name: 'Edit', tool_input: { file_path: 'B02 old commit recover' } }, shell))
  assert.equal(rejected.permissionDecision, 'deny')
  }
})

test('retains the scope-controlled policy guard after removing superseded model pins', () => {
  const fixture = mkdtempSync(join(tmpdir(), 'project-role-hook-'))
  const agents = join(fixture, 'AGENTS.md')
  writeFileSync(agents, '## Direct Scope-Controlled Execution Rules\n<!-- immediate-execution smallest-coherent-change no-subagent-by-default concise-final-report -->\n')
  try {
    const result = spawnSync('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', join(root, 'Developer/agent_room/hooks/require-advisor-worker-mode.ps1')], {
      cwd: fixture, encoding: 'utf8', env: { ...process.env, CODEX_PROJECT_DIR: fixture, CLAUDE_PROJECT_DIR: fixture },
    })
    assert.notEqual(result.status, 0)
    assert.match(result.stderr, /minimal verification/)
  } finally { unlinkSync(agents); rmdirSync(fixture) }
})
