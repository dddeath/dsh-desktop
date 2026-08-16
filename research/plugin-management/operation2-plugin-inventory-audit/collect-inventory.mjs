import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const YAML = require('C:/Users/19739/AppData/Roaming/npm/node_modules/@deepseek-ai/dsh/node_modules/yaml');
const profileRoot = process.argv[2] || 'C:/Users/19739/.dsh/profiles/web';
const outputRoot = process.argv[3] || path.resolve('research/plugin-management/operation2-plugin-inventory-audit/evidence');

fs.mkdirSync(outputRoot, { recursive: true });

function sha256File(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
}

function jsonFile(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function repositoryValue(repository) {
  if (!repository) return null;
  if (typeof repository === 'string') return repository;
  return repository.url || null;
}

function optionalFileInfo(root, relative) {
  if (!relative || typeof relative !== 'string') return null;
  const clean = relative.replace(/^\.\//, '');
  const file = path.resolve(root, clean);
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) return null;
  const text = fs.readFileSync(file, 'utf8');
  return {
    relativePath: clean,
    absolutePath: file,
    bytes: fs.statSync(file).size,
    sha256: sha256File(file),
    preview: text.slice(0, 1200),
  };
}

function entryCandidate(manifest) {
  if (typeof manifest.main === 'string') return manifest.main;
  const dot = manifest.exports?.['.'];
  if (typeof dot === 'string') return dot;
  if (dot && typeof dot.import === 'string') return dot.import;
  return 'lib/index.js';
}

function clientCandidate(manifest) {
  const client = manifest.exports?.['./client'];
  if (typeof client === 'string') return client;
  if (client && typeof client.import === 'string') return client.import;
  return 'lib/client.js';
}

function parseStaticInject(entry) {
  if (!entry?.absolutePath) return [];
  const text = fs.readFileSync(entry.absolutePath, 'utf8');
  const match = text.match(/(?:export\s+)?const\s+inject\s*=\s*(\[[\s\S]*?\])/);
  if (!match) return [];
  try {
    return JSON.parse(match[1].replace(/'/g, '"'));
  } catch {
    return [];
  }
}

function extractBoot(html) {
  const marker = 'window.__DSH_BOOT__ = ';
  const start = html.indexOf(marker);
  if (start < 0) throw new Error('DSH boot marker not found');
  const jsonStart = start + marker.length;
  const end = html.indexOf('</script>', jsonStart);
  if (end < 0) throw new Error('DSH boot terminator not found');
  return JSON.parse(html.slice(jsonStart, end));
}

const profilePackagePath = path.join(profileRoot, 'package.json');
const lockPath = path.join(profileRoot, 'pnpm-lock.yaml');
const cordisPath = path.join(profileRoot, 'cordis.yml');
const cordisPatchPath = path.join(profileRoot, 'cordis.patch.yml');
const marketStatePath = path.join(profileRoot, '.dsh-market', 'state.json');
const marketHotRoot = path.join(profileRoot, '.dsh-market');
const profile = jsonFile(profilePackagePath);
const lock = YAML.parse(fs.readFileSync(lockPath, 'utf8'));
const importer = lock.importers?.['.']?.dependencies || {};
const bundles = profile.dsh?.profile?.bundles || [];
const dependencies = [];

for (const [name, declared] of Object.entries(profile.dependencies || {})) {
  const installPath = path.join(profileRoot, 'node_modules', ...name.split('/'));
  const realPath = fs.realpathSync.native(installPath);
  const manifestPath = path.join(realPath, 'package.json');
  const manifest = jsonFile(manifestPath);
  const entry = optionalFileInfo(realPath, entryCandidate(manifest));
  const client = optionalFileInfo(realPath, clientCandidate(manifest));
  const patchFile = optionalFileInfo(realPath, manifest.dsh?.bundle?.patch);
  const lockEntry = importer[name] || {};
  dependencies.push({
    name,
    declared,
    lockSpecifier: lockEntry.specifier || null,
    lockResolution: lockEntry.version || null,
    installedVersion: manifest.version || null,
    description: manifest.description || null,
    license: manifest.license || null,
    repository: repositoryValue(manifest.repository),
    homepage: manifest.homepage || null,
    installPath,
    realPath,
    linked: path.resolve(installPath).toLowerCase() !== path.resolve(realPath).toLowerCase(),
    profileBundleIndex: bundles.indexOf(name),
    profileBundleEnabled: bundles.includes(name),
    main: manifest.main || null,
    exports: manifest.exports || null,
    dsh: manifest.dsh || null,
    scripts: manifest.scripts || null,
    manifestSha256: sha256File(manifestPath),
    entry: entry ? { ...entry, staticInject: parseStaticInject(entry) } : null,
    client,
    patch: patchFile,
  });
}

const homeResponse = await fetch('http://127.0.0.1:3080/');
const html = await homeResponse.text();
const boot = extractBoot(html);
const toolResponse = await fetch('http://127.0.0.1:3080/__dsh-desktop-ui-compat/agent-tools');
const toolCatalog = await toolResponse.json();

const snapshot = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  profileRoot,
  profilePackage: {
    path: profilePackagePath,
    sha256: sha256File(profilePackagePath),
  },
  lockfile: {
    path: lockPath,
    sha256: sha256File(lockPath),
  },
  profileOverlays: {
    cordis: optionalFileInfo(profileRoot, 'cordis.yml'),
    cordisPatch: optionalFileInfo(profileRoot, 'cordis.patch.yml'),
    marketState: fs.existsSync(marketStatePath) ? jsonFile(marketStatePath) : null,
    marketHotLayers: fs.existsSync(marketHotRoot)
      ? fs.readdirSync(marketHotRoot)
          .filter((name) => /^hot-.*\.ya?ml$/i.test(name))
          .sort()
          .map((name) => optionalFileInfo(marketHotRoot, name))
      : [],
  },
  bundleOrder: bundles.map((name, index) => ({ index, name, kind: name.startsWith('@deepseek-ai/') ? 'official' : 'profile' })),
  dependencies,
  runtime: {
    home: { status: homeResponse.status, contentType: homeResponse.headers.get('content-type'), bytes: Buffer.byteLength(html) },
    bootRevision: boot.rev,
    bootEntries: boot.entries,
    toolRoute: { status: toolResponse.status, contentType: toolResponse.headers.get('content-type') },
    toolRevision: toolCatalog.revision,
    tools: toolCatalog.tools,
  },
};

fs.copyFileSync(profilePackagePath, path.join(outputRoot, 'profile-package.json'));
fs.copyFileSync(lockPath, path.join(outputRoot, 'pnpm-lock.yaml'));
if (fs.existsSync(cordisPath)) fs.copyFileSync(cordisPath, path.join(outputRoot, 'profile-cordis.yml'));
if (fs.existsSync(cordisPatchPath)) fs.copyFileSync(cordisPatchPath, path.join(outputRoot, 'profile-cordis.patch.yml'));
if (fs.existsSync(marketStatePath)) fs.copyFileSync(marketStatePath, path.join(outputRoot, 'market-state.json'));
fs.writeFileSync(path.join(outputRoot, 'boot.html'), html, 'utf8');
fs.writeFileSync(path.join(outputRoot, 'agent-tools.json'), JSON.stringify(toolCatalog, null, 2) + '\n', 'utf8');
fs.writeFileSync(path.join(outputRoot, 'inventory.json'), JSON.stringify(snapshot, null, 2) + '\n', 'utf8');

console.log(`PROFILE_DEPENDENCIES=${dependencies.length}`);
console.log(`PROFILE_BUNDLES=${bundles.length}`);
console.log(`BOOT_ENTRIES=${boot.entries.length}`);
console.log(`REGISTERED_TOOLS=${toolCatalog.tools.length}`);
console.log(`HOME_STATUS=${homeResponse.status}`);
console.log(`TOOLS_STATUS=${toolResponse.status}`);
console.log(`INVENTORY=${path.join(outputRoot, 'inventory.json')}`);
