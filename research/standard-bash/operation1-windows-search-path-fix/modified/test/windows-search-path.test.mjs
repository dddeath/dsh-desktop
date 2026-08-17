import assert from 'node:assert/strict'
import test from 'node:test'

import {
  normalizeSearchArgs,
  normalizeWindowsSearchPath,
  wrapSearchDefinition,
} from '../preset/custom-fs-search-windows.mjs'

test('converts Git Bash absolute drive paths on Windows', () => {
  assert.equal(normalizeWindowsSearchPath('/c/Users/19739/project', 'win32'), 'C:\\Users\\19739\\project')
  assert.equal(normalizeWindowsSearchPath('/E/deepseek_memory', 'win32'), 'E:\\deepseek_memory')
  assert.equal(normalizeWindowsSearchPath('/c', 'win32'), 'C:\\')
})

test('converts WSL drive paths and preserves unrelated paths', () => {
  assert.equal(normalizeWindowsSearchPath('/mnt/e/work/file.ts', 'win32'), 'E:\\work\\file.ts')
  assert.equal(normalizeWindowsSearchPath('src/client', 'win32'), 'src/client')
  assert.equal(normalizeWindowsSearchPath('/usr/local/bin', 'win32'), '/usr/local/bin')
  assert.equal(normalizeWindowsSearchPath('/c/work', 'linux'), '/c/work')
})

test('copies only path-bearing search arguments', () => {
  const input = { pattern: 'needle', path: '/c/work', include: '*.ts' }
  const output = normalizeSearchArgs(input, 'win32')
  assert.deepEqual(output, { pattern: 'needle', path: 'C:\\work', include: '*.ts' })
  assert.notEqual(output, input)
  assert.equal(normalizeSearchArgs({ pattern: 'needle' }, 'win32').pattern, 'needle')
})

test('wraps only grep and glob execution', async () => {
  const grep = wrapSearchDefinition({
    name: 'grep',
    description: 'official grep',
    async execute(args) { return args.path },
  }, 'win32')
  const glob = wrapSearchDefinition({
    name: 'glob',
    description: 'official glob',
    async execute(args) { return args.path },
  }, 'win32')
  const read = { name: 'read', async execute() {} }

  assert.equal(await grep.execute({ path: '/c/source' }), 'C:\\source')
  assert.equal(await glob.execute({ path: '/e/source' }), 'E:\\source')
  assert.equal(wrapSearchDefinition(read, 'win32'), read)
})
