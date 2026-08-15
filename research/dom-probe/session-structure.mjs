// Inspect the raw decompressed structure of a dsh session log.
import { readFileSync } from "node:fs";
import { createZstdDecompress } from "node:zlib";

function decompressAll(buf) {
  const chunks = [];
  const d = createZstdDecompress();
  d.on("data", (c) => chunks.push(c));
  d.end(buf);
  return new Promise((resolve) => d.on("end", () => resolve(Buffer.concat(chunks))));
}

const path = process.argv[2] ?? "C:/Users/19739/.dsh/sessions/--E-deepseek_harness--/session-cdd14410-2b1d-487b-ae7e-2884bb577f0e/session.jsonl.zstd";
const buf = readFileSync(path);
const text = (await decompressAll(buf)).toString("utf8");
console.log("total chars:", text.length);
const lines = text.split("\n");
console.log("line count:", lines.length);
for (let i = 0; i < Math.min(3, lines.length); i++) {
  console.log(`--- line ${i + 1} (len ${lines[i].length}) ---`);
  console.log(lines[i].slice(0, 400));
  if (i === 1) console.log("...tail of line 2:", JSON.stringify(lines[i].slice(-300)));
}
