// Extract CSS strings from DSH client bundles for UI inspection
const fs = require('fs');

function extractCss(bundlePath, pattern, label) {
  const src = fs.readFileSync(bundlePath, 'utf8');
  const lines = src.split('\n');
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    if (pattern.test(lines[i])) {
      const m = lines[i].match(/const css\$\d+ = "(.*?)";/);
      if (m) {
        let s = m[1].replace(/\\"/g, '"').replace(/\\\\/g, '\\');
        out.push(`===== ${label} @ line ${i + 1} =====\n` + s.split(/(?<=})/).map(x => x.trim()).filter(x => x !== '').join('\n'));
      }
    }
  }
  return out.join('\n\n');
}

const conv = 'C:/Users/19739/AppData/Roaming/npm/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/dsh-client-ui-conversation/lib/client.js';
const modelSel = 'C:/Users/19739/AppData/Roaming/npm/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/dsh-client-ui-model-selection/lib/client.js';
const layout = 'C:/Users/19739/AppData/Roaming/npm/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/dsh-client-ui-layout/lib/client.js';

console.log(extractCss(conv, /InputBar\.module\.css/, 'InputBar'));
