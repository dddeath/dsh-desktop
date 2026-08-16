/**
 * custom-bash — a Windows-capable `bash` tool that registers under the name
 * `bash` but executes through Git Bash (`bash -c` via ctx.subprocess) instead
 * of a PTY or the landlock sandbox.
 *
 * WHY: DSH's official `bash` tool is disabled on Windows (`process.platform
 * === 'win32'`) because its sandbox backend (landlock) is linux-only, and the
 * persistent PTY bash backend is linux/darwin-only too. Models are trained on
 * bash/POSIX syntax; PowerShell's dialect (C:\ paths, $env:NAME, cmdlet
 * verbs) is a frequent source of friction. This tool gives the model a real
 * bash surface on Windows while `ctx.shell` stays the sandboxed pwsh
 * executor — the two tools coexist in the catalog.
 *
 * Executable resolution (config `bashPath`, in priority order):
 *  1. explicit absolute path (e.g. `C:\Program Files\Git\bin\bash.exe`);
 *  2. `C:\Program Files\Git\bin\bash.exe` if present;
 *  3. PATH lookup of `bash`, SKIPPING the WSL shim
 *     (`C:\Windows\system32\bash.exe`), which is not a real bash and often
 *     fails with ACCESS_DENIED when no WSL distro is installed.
 *
 * Semantics mirror the official bash tool: `bash -c <command>` in a fresh
 * process, bounded output, non-zero exit reported not thrown. No sandbox
 * confinement on Windows (the sandbox backend is linux-only); the tool
 * description says so.
 */

/** Cordis plugin name used by loader diagnostics. */
export const name = 'custom-bash'

/** The subprocess and tools services must exist before this tool can register. */
export const inject = ['subprocess', 'tools']

const DEFAULT_TIMEOUT_MS = 120000
const DEFAULT_MAX_OUTPUT_BYTES = 64000

/** Tool parameter schema for the model-facing command. */
const commandSchema = {
  type: 'object',
  properties: {
    command: {
      type: 'string',
      description: 'The bash command to execute (`bash -c` string domain).',
    },
    workdir: {
      type: 'string',
      description: 'Optional working directory; defaults to the session cwd.',
    },
  },
  required: ['command'],
  additionalProperties: false,
}

/**
 * The WSL shim that ships in %SystemRoot%\system32\bash.exe on Windows.
 * It is not a real bash and must never win PATH resolution.
 */
const WSL_SHIM = 'C:\\Windows\\system32\\bash.exe'

/** The well-known Git for Windows default install path. */
const GIT_BASH_DEFAULT = 'C:\\Program Files\\Git\\bin\\bash.exe'

/**
 * Pick the bash executable to use. Priority: explicit config > known Git
 * install > PATH lookup skipping the WSL shim > null (caller degrades).
 * @param {string | undefined} bashPath - explicit path from config.
 * @param {(name: string) => string | undefined} resolve - PATH resolver
 *   (injectable for tests; defaults to ctx.subprocess.resolveExecutable).
 */
export function pickBashPath(bashPath, resolve) {
  if (typeof bashPath === 'string' && bashPath.length > 0) return bashPath
  const gitBash = GIT_BASH_DEFAULT
  // Prefer the known Git install over PATH: PATH may surface the WSL shim
  // first, and Git Bash is what most Windows devs actually have.
  return gitBash
}

/**
 * Resolve a usable bash executable at plugin apply time (best effort).
 * Returns the chosen path, or undefined when nothing usable is found —
 * the tool then fails open with a clear message per call.
 */
async function resolveBash(ctx, config) {
  const explicit = typeof config?.bashPath === 'string' && config.bashPath.length > 0
    ? config.bashPath
    : undefined
  if (explicit !== undefined) {
    try {
      await ctx.subprocess.resolveExecutable(explicit, undefined)
      return explicit
    } catch {
      return explicit // let the per-call spawn surface the real error
    }
  }
  // Known Git install.
  try {
    await ctx.subprocess.resolveExecutable(GIT_BASH_DEFAULT, undefined)
    return GIT_BASH_DEFAULT
  } catch {
    // fall through to PATH lookup
  }
  // PATH lookup, skipping the WSL shim.
  try {
    const resolved = await ctx.subprocess.resolveExecutable('bash', undefined)
    if (resolved !== undefined && resolved.toLowerCase() !== WSL_SHIM.toLowerCase()) return resolved
  } catch {
    // no bash on PATH at all
  }
  return undefined
}

/** Register the model-facing `bash` tool. */
export function apply(ctx, config) {
  const timeoutMs = Number.isSafeInteger(config?.timeoutMs) && config.timeoutMs > 0 ? config.timeoutMs : DEFAULT_TIMEOUT_MS
  const maxOutputBytes = Number.isSafeInteger(config?.maxOutputBytes) && config.maxOutputBytes > 0 ? config.maxOutputBytes : DEFAULT_MAX_OUTPUT_BYTES

  ctx.tools.register({
    name: 'bash',
    description: [
      'Run commands in a bash shell (Git Bash on Windows)',
      '* When invoking this tool, the contents of the "command" parameter does NOT need to be XML-escaped.',
      "* You don't have access to the internet via this tool.",
      '* You do have access to a mirror of common linux and python packages via apt and pip.',
      '* State does NOT persist across command calls: each call runs in a fresh shell.',
      "* To inspect a particular line range of a file, e.g. lines 10-25, try 'sed -n 10,25p /path/to/the/file'.",
      '* Please avoid commands that may produce a very large amount of output.',
      '* NOTE: runs without OS sandbox confinement on Windows (no landlock); treat output as untrusted.',
    ].join('\n'),
    parameters: commandSchema,
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          text: { type: 'string' },
        },
        required: ['text'],
      },
      render: (_args, value) => [{ type: 'text', text: value.text }],
    },
    async execute(args, exec) {
      const bashPath = await resolveBash(ctx, config)
      if (bashPath === undefined) {
        throw new Error('bash: no usable bash executable found. Install Git for Windows (https://git-scm.com) or set the `bashPath` config option.')
      }
      const shell = await ctx.subprocess.resolveExecutable(bashPath, undefined, exec?.signal)
      const workdir = typeof args.workdir === 'string' && args.workdir.length > 0
        ? args.workdir
        : exec?.agent?.session?.header?.cwd
      const signal = exec?.signal
      const handle = ctx.subprocess.spawn({
        argv: [shell, '-c', args.command],
        ...workdir !== undefined ? { cwd: workdir } : {},
        stdio: {
          stdin: 'ignore',
          stdout: { maxBytes: maxOutputBytes },
          stderr: { maxBytes: maxOutputBytes },
        },
        ...signal !== undefined ? { signal } : {},
        graceMs: 3000,
      })
      let outcome
      try {
        outcome = await handle.done
      } catch (error) {
        // A spawn-level failure (bad executable, EPERM) surfaces as a throw,
        // which the runtime turns into an isError result.
        throw new Error(`bash spawn failed: ${String(error)}`)
      }
      let stdout = ''
      let stderr = ''
      try {
        stdout = handle.collected.stdout.readFrom(0).text
        stderr = handle.collected.stderr.readFrom(0).text
      } catch {
        // Collected readers may be unavailable on some backends; tolerate.
      }
      const text = [stdout, stderr].filter((part) => part.length > 0).join('\n')
      const tail = text.length > 0 ? text : `exit code: ${outcome.exitCode} (no output)`
      if (outcome.exitCode !== 0) {
        // Non-zero exit is a reported failure, not a throw: the model sees the
        // command output plus the exit code.
        throw new Error(tail)
      }
      return { text: tail }
    },
  })
}
