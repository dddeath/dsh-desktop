import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const pluginRoot = 'C:/Users/19739/.dsh/profiles/web/node_modules/dsh-codex-tools'
const { installImageTools } = await import(pathToFileURL(`${pluginRoot}/tools.js`))
const registered = []
let capturedSpec
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64')
const shell = {
  resolve(spec) {
    capturedSpec = spec
    return spec
  },
  async run(spec) {
    return {
      exitCode: 0,
      stdout: {
        text: JSON.stringify({
          ok: true,
          outputPath: 'output/probe.png',
          absolutePath: 'child-placeholder',
          workspaceRoot: 'child-placeholder',
          bytes: png.length,
          imageBase64: png.toString('base64'),
          model: 'gpt-5.5',
        }) + '\n',
      },
    }
  },
}
const credentials = {
  async resolve(key) {
    return { value: key === 'OPENAI_CODEX_API_KEY' ? 'stale-dsh-access' : 'stale-dsh-refresh' }
  },
}

installImageTools(
  (definition) => definition,
  { shell, credentials },
  (tool) => {
    registered.push(tool)
    return () => {}
  },
)

const workspace = await mkdtemp(join(tmpdir(), 'dsh-codex-tools-publication-'))
try {
  assert.equal(resolve(workspace).startsWith(resolve(tmpdir())), true)
  const imageGen = registered.find((tool) => tool.name === 'image_gen')
  const result = await imageGen.execute(
    { prompt: 'staged publication fixture', out: 'output/probe.png', format: 'png' },
    { signal: new AbortController().signal, agent: { session: { header: { cwd: workspace } } } },
  )
  const target = join(workspace, 'output', 'probe.png')
  assert.deepEqual(await readFile(target), png)
  assert.equal(result.ok, true)
  assert.equal(result.absolutePath, target)
  assert.equal(result.workspaceRoot, workspace)
  assert.equal(result.fileWritten, true)
  assert.equal(capturedSpec.env.DSH_WORKSPACE_ROOT, workspace)
  assert.equal(capturedSpec.env.CODEX_PREFER_AUTH_FILE, '1')
  assert.equal(capturedSpec.env.CG_RETURN_BASE64, '1')
  assert.equal(capturedSpec.stdoutMaxBytes, 32 * 1024 * 1024)
  console.log(`SESSION_WORKSPACE=${workspace}`)
  console.log('TRANSFER_MODE=stdout-base64')
  console.log(`STDOUT_MAX_BYTES=${capturedSpec.stdoutMaxBytes}`)
  console.log(`FINAL_PATH=${result.absolutePath}`)
  console.log(`FINAL_BYTES=${result.bytes}`)
  console.log(`FILE_WRITTEN=${result.fileWritten}`)
  console.log('AUTH_FILE_PRIORITY_FLAG=true')
  console.log('STAGED_PUBLICATION_TEST=true')
} finally {
  const resolved = resolve(workspace)
  if (!resolved.startsWith(resolve(tmpdir()))) throw new Error(`unexpected cleanup path: ${resolved}`)
  await rm(resolved, { recursive: true, force: true })
}
