import { spawnSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const operationRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const specs = [
  ['original/tools.js', 'modified/tools.js', 'a/tools.js', 'b/tools.js'],
  ['original/codex-common.mjs', 'modified/codex-common.mjs', 'a/scripts/codex-common.mjs', 'b/scripts/codex-common.mjs'],
  ['original/codex-imagegen.mjs', 'modified/codex-imagegen.mjs', 'a/scripts/codex-imagegen.mjs', 'b/scripts/codex-imagegen.mjs'],
  ['original/STATE.json', 'modified/STATE.json', 'a/.agent/STATE.json', 'b/.agent/STATE.json'],
]

const parts = specs.map(([before, after, beforeLabel, afterLabel]) => {
  const result = spawnSync('git', ['-c', 'core.autocrlf=false', 'diff', '--no-index', '--', before, after], {
    cwd: operationRoot,
    encoding: 'utf8',
  })
  if (result.status !== 1) throw new Error(`git diff failed for ${before}: exit=${result.status}\n${result.stderr}`)
  return result.stdout
    .replaceAll(`a/${before}`, beforeLabel)
    .replaceAll(`b/${after}`, afterLabel)
})

const target = resolve(operationRoot, 'change.patch')
writeFileSync(target, parts.join(''), 'utf8')
const check = readFileSync(target, 'utf8')
if (!check.includes('outputPath, absolutePath, workspaceRoot')) throw new Error('UTF-8 patch content check failed')
console.log(`PATCH_PATH=${target}`)
console.log('PATCH_BUILD_OK=true')
