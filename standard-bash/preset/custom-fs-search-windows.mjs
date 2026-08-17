/**
 * Windows path adapter for DSH's official glob/grep tool suite.
 *
 * The tools execute the packaged native Windows ripgrep binary. Models may
 * copy an absolute path from Git Bash (`/c/Users/...`), which native ripgrep
 * does not resolve. This adapter preserves the official implementation and
 * changes only the optional `path` argument immediately before execution.
 */

import { createRequire } from 'node:module'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

export const name = 'custom-fs-search-windows'

/** Resolve the official package from the running DSH installation. */
async function loadOfficialSearchPlugin() {
  const anchors = []
  if (typeof process.argv[1] === 'string' && process.argv[1].length > 0) {
    anchors.push(process.argv[1])
  }
  if (typeof process.env.APPDATA === 'string' && process.env.APPDATA.length > 0) {
    anchors.push(join(process.env.APPDATA, 'npm', 'node_modules', '@deepseek-ai', 'dsh', 'package.json'))
  }

  const failures = []
  for (const anchor of anchors) {
    try {
      const resolved = createRequire(anchor).resolve('@deepseek-ai/dsh-tool-fs-search')
      return import(pathToFileURL(resolved).href)
    } catch (error) {
      failures.push(`${anchor}: ${String(error)}`)
    }
  }
  throw new Error(`custom-fs-search-windows: official search plugin resolution failed\n${failures.join('\n')}`)
}

const official = await loadOfficialSearchPlugin()

export const inject = official.inject
export const Config = official.Config

/**
 * Convert absolute Git Bash/MSYS and WSL drive paths to native Windows paths.
 * Relative paths and ordinary POSIX paths are intentionally unchanged.
 */
export function normalizeWindowsSearchPath(value, platform = process.platform) {
  if (platform !== 'win32' || typeof value !== 'string') return value

  const gitBash = /^\/([a-zA-Z])(?:\/(.*))?$/.exec(value)
  if (gitBash !== null) {
    const tail = gitBash[2] === undefined || gitBash[2].length === 0
      ? ''
      : gitBash[2].replaceAll('/', '\\')
    return `${gitBash[1].toUpperCase()}:\\${tail}`
  }

  const wsl = /^\/mnt\/([a-zA-Z])(?:\/(.*))?$/.exec(value)
  if (wsl !== null) {
    const tail = wsl[2] === undefined || wsl[2].length === 0
      ? ''
      : wsl[2].replaceAll('/', '\\')
    return `${wsl[1].toUpperCase()}:\\${tail}`
  }

  return value
}

/** Copy arguments so the durable tool-call input remains exactly as submitted. */
export function normalizeSearchArgs(args, platform = process.platform) {
  if (args === null || typeof args !== 'object' || Array.isArray(args)) return args
  if (typeof args.path !== 'string') return args
  const path = normalizeWindowsSearchPath(args.path, platform)
  return path === args.path ? args : { ...args, path }
}

/** Wrap only glob/grep execution; schemas, presentation, retention and hooks stay official. */
export function wrapSearchDefinition(definition, platform = process.platform) {
  if (definition?.name !== 'glob' && definition?.name !== 'grep') return definition
  const execute = definition.execute
  return {
    ...definition,
    description: `${definition.description}\nOn Windows, Git Bash absolute paths such as /c/Users/... are accepted and converted to native drive paths before search.`,
    async execute(args, exec) {
      return execute(normalizeSearchArgs(args, platform), exec)
    },
  }
}

/** Present a normal Cordis context while intercepting official tool registration. */
function adaptedContext(ctx) {
  const tools = new Proxy(ctx.tools, {
    get(target, property) {
      if (property === 'register') {
        return (definition) => target.register(wrapSearchDefinition(definition))
      }
      const value = Reflect.get(target, property, target)
      return typeof value === 'function' ? value.bind(target) : value
    },
  })

  return new Proxy(ctx, {
    get(target, property) {
      if (property === 'tools') return tools
      const value = Reflect.get(target, property, target)
      return typeof value === 'function' ? value.bind(target) : value
    },
  })
}

export function apply(ctx, config) {
  return official.apply(adaptedContext(ctx), config)
}
