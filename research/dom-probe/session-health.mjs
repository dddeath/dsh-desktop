// Full health check: scan frames (zstd magic), decompress frame-by-frame,
// concatenate JSONL, verify header and seq continuity, detect torn tails.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { zstdDecompressSync } from "node:zlib";
import { join } from "node:path";

const MAGIC = [0x28, 0xb5, 0x2f, 0xfd];

function frames(buf) {
  const pos = [];
  for (let i = 0; i + 4 <= buf.length; i++)
    if (buf[i] === MAGIC[0] && buf[i + 1] === MAGIC[1] && buf[i + 2] === MAGIC[2] && buf[i + 3] === MAGIC[3]) pos.push(i);
  return pos;
}

async function check(label, path) {
  const buf = readFileSync(path);
  const pos = frames(buf);
  let text = "";
  let decompressFails = 0;
  for (let i = 0; i < pos.length; i++) {
    const start = pos[i];
    const end = pos[i + 1] ?? buf.length;
    try { text += zstdDecompressSync(buf.subarray(start, end)).toString("utf8"); }
    catch { decompressFails++; }
  }
  const lines = text.split("\n");
  const last = lines[lines.length - 1];
  const complete = last === "";
  let headerOk = false;
  try { const h = JSON.parse(lines[0]); headerOk = h?.type === "session"; } catch {}
  let seqs = 0, gaps = 0, regress = 0, firstGap = null, firstRegress = null, prev = -1;
  const end = complete ? lines.length - 1 : lines.length;
  for (let i = 1; i < end; i++) {
    let e; try { e = JSON.parse(lines[i]); } catch { firstGap ??= `unparsable line ${i + 1}`; break; }
    if (typeof e.seq === "number") {
      seqs++;
      if (prev >= 0 && e.seq < prev) { regress++; firstRegress ??= `line ${i + 1}: seq went ${prev} -> ${e.seq}`; }
      if (prev >= 0 && e.seq !== prev + 1 && e.seq >= prev) { gaps++; firstGap ??= `line ${i + 1}: expected ${prev + 1}, got ${e.seq}`; }
      prev = e.seq;
    }
  }
  console.log(`${label} ${path.split("\\").slice(-2).join("/")}`);
  console.log(`  bytes=${buf.length}, frames=${pos.length} (${decompressFails} failed), lines=${lines.length}, headerOk=${headerOk}, lastLineComplete=${complete}`);
  console.log(`  seqEvents=${seqs}, lastSeq=${prev}, forwardGaps=${gaps}${firstGap ? ` | first: ${firstGap}` : ""}, REGRESSIONS=${regress}${firstRegress ? ` | first: ${firstRegress}` : ""}`);
  if (!complete) console.log(`  TORN TAIL (no final newline): ${JSON.stringify(last.slice(0, 140))}`);
}

const ROOT = "C:/Users/19739/.dsh/sessions/--E-deepseek_harness--";
for (const dir of readdirSync(ROOT).filter((d) => !d.endsWith(".bak") && !d.endsWith(".tmp"))) {
  const logPath = join(ROOT, dir, "session.jsonl.zstd");
  await check("LOG ", logPath);
  const bakPath = logPath + ".corrupt.bak";
  try { if (statSync(bakPath).isFile()) await check("BAK ", bakPath); } catch {}
  console.log("---");
}
