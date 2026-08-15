// Extract the skin's full injected CSS string from the built bundle and
// pretty-print each top-level rule so we can inspect the exact token values
// and selectors to override.
import fs from "node:fs";

const file = "C:/Users/19739/.dsh/profiles/web/node_modules/@dsh-external/dsh-client-ui-skin-maid-atelier/lib/client.js";
const src = fs.readFileSync(file, "utf8");

const start = src.indexOf('const css = "');
if (start < 0) throw new Error("css string marker not found");
const body = src.slice(start + 'const css = "'.length);
const end = body.indexOf('";');
if (end < 0) throw new Error("css string terminator not found");
const css = body.slice(0, end);

// unescape JS string escapes
const unescaped = css
  .replace(/\\"/g, '"')
  .replace(/\\\\/g, "\\")
  .replace(/\\n/g, "\n");

fs.writeFileSync("E:/deepseek_harness/research/skin-css-extracted.txt", unescaped, "utf8");

// Also dump every distinct custom property name + its light/dark values
const props = new Map();
const light = unescaped.match(/body\[data-dsh-maid-atelier\]\{(.*?)\}/)?.[1] ?? "";
const dark = unescaped.match(/body\[data-dsh-maid-atelier\]\[data-ds-dark-theme\]\{(.*?)\}/)?.[1] ?? "";
for (const m of light.matchAll(/(--[\w-]+):([^;]+);/g)) props.set(m[1], { light: m[2], dark: undefined });
for (const m of dark.matchAll(/(--[\w-]+):([^;]+);/g)) {
  if (props.has(m[1])) props.get(m[1]).dark = m[2];
  else props.set(m[1], { light: undefined, dark: m[2] });
}
let table = "property\tlight\tdark\n";
for (const [k, v] of [...props.entries()].sort()) table += `${k}\t${v.light ?? "—"}\t${v.dark ?? "—"}\n`;
fs.writeFileSync("E:/deepseek_harness/research/skin-tokens.tsv", table, "utf8");

console.log(`css length: ${css.length} chars; rules extracted: ${(unescaped.match(/}/g) || []).length} '}'`);
console.log(`tokens: ${props.size}`);
