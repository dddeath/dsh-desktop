import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { join } from 'node:path'

import { normalizeWindowsSearchPath } from '../../../standard-bash/preset/custom-fs-search-windows.mjs'

const gitBashPath = '/c/Users/19739/AppData/Roaming/npm/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/dsh-agent-loop'
const nativePath = normalizeWindowsSearchPath(gitBashPath, 'win32')
const rg = join(
  process.env.APPDATA,
  'npm', 'node_modules', '@deepseek-ai', 'dsh', 'node_modules',
  '@vscode', 'ripgrep-win32-x64', 'bin', 'rg.exe',
)
const run = spawnSync(rg, ['--files', '--', nativePath], { encoding: 'utf8' })

assert.equal(nativePath, 'C:\\Users\\19739\\AppData\\Roaming\\npm\\node_modules\\@deepseek-ai\\dsh\\node_modules\\@deepseek-ai\\dsh-agent-loop')
assert.equal(run.status, 0, run.stderr)
assert.match(run.stdout, /README\.md/)

console.log(JSON.stringify({
  input: gitBashPath,
  normalized: nativePath,
  exitCode: run.status,
  firstResult: run.stdout.trim().split(/\r?\n/, 1)[0],
}, null, 2))
