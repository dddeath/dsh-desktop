// Dump events around seq regressions in a session log.
import { readFileSync } from "node:fs";
import { zstdDecompressSync } from "node:zlib";

const path = process.argv[2];
const buf = readFileSync(path);
const MAGIC = [0x28, 0xb5, 0x2f, 0xfd];
const pos = [];
for (let i = 0; i + 4 <= buf.length; i++)
  if (buf[i] === MAGIC[0] && buf[i + 1] === MAGIC[1] && buf[i + 2] === MAGIC[2] && buf[i + 3] === MAGIC[3]) pos.push(i);
let text = "";
for (let i = 0; i < pos.length; i++) text += zstdDecompressSync(buf.subarray(pos[i], pos[i + 1] ?? buf.length)).toString("utf8");
const lines = text.split("\n").filter((l) => l.length > 0);
const events = [];
for (let i = 1; i < lines.length; i++) {
  try { const e = JSON.parse(lines[i]); events.push({ line: i + 1, ...e }); } catch {}
}
let prev = -1;
for (const e of events) {
  if (typeof e.seq === "number") {
    if (prev >= 0 && e.seq < prev) {
      const idx = events.indexOf(e);
      console.log(`REGRESSION at line ${e.line}: seq ${prev} -> ${e.seq}, type=${e.type}`);
      console.log("  event:", JSON.stringify(e).slice(0, 400));
      const before = events[idx - 1];
      if (before) console.log("  prev event:", JSON.stringify(before).slice(0, 300));
    }
    prev = e.seq;
  }
}
