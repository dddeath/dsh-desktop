import assert from 'node:assert/strict'
import { pathToFileURL } from 'node:url'

const pluginRoot = 'C:/Users/19739/.dsh/profiles/web/node_modules/dsh-codex-tools'
const { installImageTools } = await import(pathToFileURL(`${pluginRoot}/tools.js`))
const { resolveWorkspacePath } = await import(pathToFileURL(`${pluginRoot}/scripts/codex-common.mjs`))

const registered = []
let capturedSpec
const shell = {
  resolve(spec) {
    capturedSpec = spec
    return spec
  },
  async run() {
    return { exitCode: 1, stdout: { text: '{"ok":false,"error":"output_exists"}\n' } }
  },
}
const credentials = { async resolve() { throw new Error('credential not configured in fixture') } }

installImageTools(
  (definition) => definition,
  { shell, credentials },
  (tool) => {
    registered.push(tool)
    return () => {}
  },
)

const workspace = 'E:\\deepseek_workspace\\pro1'
const imageGen = registered.find((tool) => tool.name === 'image_gen')
assert.ok(imageGen, 'image_gen was not registered')

const result = await imageGen.execute(
  { prompt: 'workspace binding probe', out: 'output/imagegen/future.png', format: 'png' },
  {
    signal: new AbortController().signal,
    agent: { session: { header: { cwd: workspace } } },
  },
)

const resolved = resolveWorkspacePath('output/imagegen/future.png', 'out', workspace)
assert.equal(resolved, 'E:\\deepseek_workspace\\pro1\\output\\imagegen\\future.png')
assert.equal(capturedSpec.env.DSH_WORKSPACE_ROOT, workspace)
assert.match(capturedSpec.command, /C:\/Users\/19739\/\.dsh\/profiles\/web\/node_modules\/dsh-codex-tools\/scripts\/codex-imagegen\.mjs/)
assert.deepEqual(result, { backend: 'chatgpt-subscription', ok: false, error: 'invalid_path' })

console.log(`SESSION_WORKSPACE=${workspace}`)
console.log(`RESOLVED_OUTPUT=${resolved}`)
console.log(`CHILD_WORKSPACE_ENV=${capturedSpec.env.DSH_WORKSPACE_ROOT}`)
console.log(`CHILD_COMMAND=${capturedSpec.command}`)
console.log(`PARSED_RESULT=${JSON.stringify(result)}`)
console.log('WORKSPACE_BINDING_TEST=true')
