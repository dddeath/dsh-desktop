// Dump data for a hand-picked list of plugin names.
import fs from "node:fs";
const data = JSON.parse(fs.readFileSync(new URL("./plugins.json", import.meta.url), "utf8"));
const want = process.argv.slice(2).map((s) => s.toLowerCase());
const rows = (data.plugins ?? [])
  .filter((p) => want.some((w) => p.name.toLowerCase().includes(w) || (p.npm ?? "").toLowerCase().includes(w)))
  .map((p) => ({ name: p.name, owner: p.owner, cat: p.category, stars: p.stars, npm: p.npm, install: p.install }))
  .sort((a, b) => b.stars - a.stars);
for (const r of rows) console.log(JSON.stringify(r));
