import { spawnSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { writeFileSync } from 'node:fs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const specs = [
  ['original/tools.js', 'modified/tools.js', 'a/tools.js', 'b/tools.js'],
  ['original/codex-common.mjs', 'modified/codex-common.mjs', 'a/scripts/codex-common.mjs', 'b/scripts/codex-common.mjs'],
  ['original/codex-imagegen.mjs', 'modified/codex-imagegen.mjs', 'a/scripts/codex-imagegen.mjs', 'b/scripts/codex-imagegen.mjs'],
  ['original/codex-vision.mjs', 'modified/codex-vision.mjs', 'a/scripts/codex-vision.mjs', 'b/scripts/codex-vision.mjs'],
  ['original/codex-search.mjs', 'modified/codex-search.mjs', 'a/scripts/codex-search.mjs', 'b/scripts/codex-search.mjs'],
  ['original/STATE.json', 'modified/STATE.json', 'a/.agent/STATE.json', 'b/.agent/STATE.json'],
]
const parts = specs.map(([before, after, beforeLabel, afterLabel]) => {
  const result = spawnSync('git', ['-c', 'core.autocrlf=false', 'diff', '--no-index', '--', before, after], { cwd: root, encoding: 'utf8' })
  if (result.status !== 1) throw new Error(`git diff failed for ${before}: exit=${result.status}\n${result.stderr}`)
  return result.stdout.replaceAll(`a/${before}`, beforeLabel).replaceAll(`b/${after}`, afterLabel)
})
writeFileSync(resolve(root, 'change.patch'), parts.join(''), 'utf8')
console.log('PATCH_BUILD_OK=true')
