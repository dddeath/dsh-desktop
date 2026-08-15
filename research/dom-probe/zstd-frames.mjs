// Find zstd frame magic positions in a dsh session log.
import { readFileSync } from "node:fs";

const path = process.argv[2] ?? "C:/Users/19739/.dsh/sessions/--E-deepseek_harness--/session-cdd14410-2b1d-487b-ae7e-2884bb577f0e/session.jsonl.zstd";
const buf = readFileSync(path);
console.log("file size:", buf.length);
const MAGIC = [0x28, 0xb5, 0x2f, 0xfd];
const positions = [];
for (let i = 0; i + 4 <= buf.length; i++) {
  if (buf[i] === MAGIC[0] && buf[i + 1] === MAGIC[1] && buf[i + 2] === MAGIC[2] && buf[i + 3] === MAGIC[3]) positions.push(i);
}
console.log("frame count:", positions.length);
positions.slice(0, 12).forEach((p, idx) => {
  const next = positions[idx + 1] ?? buf.length;
  console.log(`frame ${idx + 1} @ ${p}, len=${next - p}, next@=${positions[idx + 1] ?? "END"}`);
});
console.log("--- first 64 bytes hex ---");
console.log(buf.subarray(0, 64).toString("hex"));
console.log("--- bytes between frame 1 end and frame 2 (if any gap) ---");
if (positions.length >= 2) {
  console.log("frame1 size:", positions[1] - positions[0]);
}
