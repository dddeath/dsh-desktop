import { spawnSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { writeFileSync } from 'node:fs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const specs = [
  ['original/icon.png', 'modified/icon.png', 'a/desktop/assets/icon.png', 'b/desktop/assets/icon.png'],
  ['original/icon.ico', 'modified/icon.ico', 'a/desktop/assets/icon.ico', 'b/desktop/assets/icon.ico'],
  ['original/STATE.json', 'modified/STATE.json', 'a/.agent/STATE.json', 'b/.agent/STATE.json'],
]

const parts = specs.map(([before, after, beforeLabel, afterLabel]) => {
  const result = spawnSync(
    'git',
    ['-c', 'core.autocrlf=false', 'diff', '--no-index', '--binary', '--', before, after],
    { cwd: root, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 },
  )
  if (result.status !== 1) {
    throw new Error(`git diff failed for ${before}: exit=${result.status}\n${result.stderr}`)
  }
  return result.stdout.replaceAll(`a/${before}`, beforeLabel).replaceAll(`b/${after}`, afterLabel)
})

writeFileSync(resolve(root, 'change.patch'), parts.join(''), 'utf8')
console.log('PATCH_BUILD_OK=true')
