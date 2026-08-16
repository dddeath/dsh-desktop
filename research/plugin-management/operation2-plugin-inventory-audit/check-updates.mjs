import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const output = process.argv[2] || path.resolve('research/plugin-management/operation2-plugin-inventory-audit/evidence/update-check.txt');
const node = 'C:/Program Files/nodejs/node.exe';
const npmCli = 'C:/Program Files/nodejs/node_modules/npm/bin/npm-cli.js';
const packages = ['@liustack/modlens', 'dsh-better-sidebar', 'dsh-context', 'dsh-find-plugin', 'dshmarket'];
const repositories = [
  'Small-tailqwq/dsh-deep-whale',
  'omdsh-dev/dsh-at-file',
  'omdsh-dev/dsh-notification',
  'omdsh-dev/dsh-open-in-vscode',
  'vlln/whale-girl',
  'DocJlm/dsh-arknights',
  'SPYQWER1/dsh-codex-tools',
];

const lines = [`CHECKED_AT=${new Date().toISOString()}`];
for (const name of packages) {
  const result = spawnSync(node, [npmCli, 'view', name, 'version', 'dist-tags', '--json'], { encoding: 'utf8' });
  lines.push(`---NPM ${name}---`, (result.stdout || '').trim(), (result.stderr || result.error?.message || '').trim(), `EXIT=${result.status}`);
  if (result.status !== 0) process.exitCode = result.status || 1;
}
for (const repository of repositories) {
  const result = spawnSync('git', ['ls-remote', `https://github.com/${repository}.git`, 'HEAD'], { encoding: 'utf8' });
  lines.push(`---GIT ${repository}---`, (result.stdout || '').trim(), (result.stderr || result.error?.message || '').trim(), `EXIT=${result.status}`);
  if (result.status !== 0) process.exitCode = result.status || 1;
}

fs.writeFileSync(output, lines.filter((line) => line !== '').join('\n') + '\n', 'utf8');
console.log(fs.readFileSync(output, 'utf8'));
