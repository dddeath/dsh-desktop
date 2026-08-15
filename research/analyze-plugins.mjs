/**
 * Analyze the awesome-dsh-plugin.com plugins.json dataset:
 *  - rank by GitHub stars overall and per category
 *  - cross-reference dsh-external/hub membership (CATALOG.md)
 *  - fetch npm download counts (last month) for the top candidates
 * Outputs research/plugin-report.md (UTF-8) for human review.
 */
import fs from "node:fs";

const ROOT = new URL(".", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const data = JSON.parse(fs.readFileSync(new URL("./plugins.json", import.meta.url), "utf8"));
const catalog = fs.readFileSync(new URL("./awesome-deepseek-harness/CATALOG.md", import.meta.url), "utf8");

// --- hub membership: dsh-external/* repos mentioned in CATALOG.md (match by repo basename) ---
const hubNames = new Set();
for (const m of catalog.matchAll(/github\.com\/dsh-external\/([A-Za-z0-9._-]+)/g)) hubNames.add(m[1].toLowerCase());

const plugins = (data.plugins ?? []).map((p) => {
  const ownerRepo = p.url.replace("https://github.com/", "").split("/").slice(0, 2).join("/").toLowerCase();
  const basename = ownerRepo.split("/")[1] ?? "";
  return {
    ...p,
    ownerRepo,
    hub: hubNames.has(basename),
    stars: p.stars ?? 0,
  };
});

const CAT_NAMES = {
  ui: "UI 增强", theme: "主题与外观", model: "模型与账号接入", session: "会话与消息",
  memory: "记忆", tools: "工具与能力", skill: "技能包", workflow: "工作流与自动化",
  notify: "通知与集成", dev: "开发与运行时", market: "插件市场与管理", fun: "娱乐",
};

const byStars = (a, b) => b.stars - a.stars;
const overall = [...plugins].sort(byStars);

// --- npm downloads for top candidates (npm-published only) ---
const TOP_N = 80;
const candidates = overall.slice(0, TOP_N).filter((p) => p.npm);
async function npmDownloads(pkg) {
  try {
    const r = await fetch(`https://api.npmjs.org/downloads/point/last-month/${encodeURIComponent(pkg)}`, { signal: AbortSignal.timeout(10000) });
    if (!r.ok) return null;
    const j = await r.json();
    return typeof j.downloads === "number" ? j.downloads : null;
  } catch { return null; }
}
const dlMap = new Map();
{
  let i = 0;
  for (let s = 0; s < candidates.length; s += 8) {
    const batch = candidates.slice(s, s + 8);
    await Promise.all(batch.map(async (p) => { dlMap.set(p.npm, await npmDownloads(p.npm)); i++; }));
  }
  console.error(`npm download probes done: ${i}`);
}

const fmt = (n) => n === null || n === undefined ? "—" : n.toLocaleString("en-US");
const esc = (s) => s.replace(/\|/g, "\\|");

let md = "";
md += "# DeepSeek Harness 社区插件推荐报告\n\n";
md += `> 数据源：[awesome-dsh-plugin.com](https://awesome-dsh-plugin.com) 目录（${data.count} 个插件，更新于 ${data.updated}），星标为 GitHub stars，下载量为 npm 近 30 天下载。\n`;
md += `> 该报告由脚本自动生成，仅供人工验收参考。安装插件等于在本机运行第三方代码，请逐项审核。\n\n`;

md += "## 全库 Top 40（按 GitHub 星标）\n\n";
md += "| # | 插件 | 分类 | 星标 | npm 月下载 | npm 包 | Hub收录 | 安装命令 |\n|---|------|------|-----|-----------|--------|---------|----------|\n";
overall.slice(0, 40).forEach((p, idx) => {
  md += `| ${idx + 1} | [${esc(p.name)}](https://github.com/${p.ownerRepo.split("/").slice(0,2).join("/")}) | ${CAT_NAMES[p.category] ?? p.category} | ${fmt(p.stars)} | ${fmt(dlMap.get(p.npm))} | ${p.npm ?? "—"} | ${p.hub ? "✅" : ""} | \`${esc(p.install)}\` |\n`;
});

for (const [cat, catName] of Object.entries(CAT_NAMES)) {
  const list = plugins.filter((p) => p.category === cat).sort(byStars);
  if (list.length === 0) continue;
  md += `\n## ${catName}（${list.length} 个，Top 12）\n\n`;
  md += "| # | 插件 | 星标 | npm 月下载 | npm 包 | 安装命令 |\n|---|------|-----|-----------|--------|----------|\n";
  list.slice(0, 12).forEach((p, idx) => {
    md += `| ${idx + 1} | [${esc(p.name)}](https://github.com/${p.ownerRepo.split("/").slice(0,2).join("/")}) | ${fmt(p.stars)} | ${fmt(dlMap.get(p.npm))} | ${p.npm ?? "—"} | \`${esc(p.install)}\` |\n`;
  });
}

fs.writeFileSync(new URL("./plugin-report.md", import.meta.url), md, "utf8");
console.log(`wrote plugin-report.md: ${plugins.length} plugins, top40 + per-category`);
