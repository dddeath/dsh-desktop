import { spawnSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { writeFileSync } from 'node:fs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const result = spawnSync(
  'git',
  ['-c', 'core.autocrlf=false', 'diff', '--no-index', '--', 'original/STATE.json', 'modified/STATE.json'],
  { cwd: root, encoding: 'utf8' },
)
if (result.status !== 1) {
  throw new Error(`git diff failed: exit=${result.status}\n${result.stderr}`)
}
const patch = result.stdout
  .replaceAll('a/original/STATE.json', 'a/.agent/STATE.json')
  .replaceAll('b/modified/STATE.json', 'b/.agent/STATE.json')
writeFileSync(resolve(root, 'change.patch'), patch, 'utf8')
console.log('PATCH_BUILD_OK=true')
