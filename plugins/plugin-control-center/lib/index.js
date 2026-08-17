import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export const inject = ["webServer"];

const BASE = "/__dsh-plugin-control-center";
const PROFILE_FILES = ["package.json", "pnpm-lock.yaml", "cordis.yml", "cordis.patch.yml"];
const PROTECTED = new Map([
  ["dsh-plugin-control-center", "管理与恢复入口自身"],
  ["dshmarket", "复用的包操作服务"],
  ["dsh-desktop-ui-compat", "已验收的跨主题 UI 核心"],
  ["dsh-codex-tools", "已验收并固定提交的视觉与生图工具链"],
]);
const POLICY = {
  "@dsh-external/dsh-client-ui-skin-maid-atelier": ["UI/皮肤", "中", "保留当前", ["主题切换", "全局样式"]],
  "@liustack/modlens": ["模型/视觉", "高", "保留并观察更新", ["图片读取", "外部进程"]],
  "dsh-arknights": ["UI/皮肤", "中", "按需启用", ["主题切换", "全局样式"]],
  "dsh-at-file": ["工作区", "中", "保留", ["文件检索", "路径读取"]],
  "dsh-better-sidebar": ["工作区/UI", "高", "保留，单独更新", ["文件操作", "终端", "Git", "浏览器"]],
  "dsh-codex-tools": ["工具", "高", "固定版本", ["视觉识别", "图片生成", "联网搜索"]],
  "dsh-context": ["对话/可观测", "中", "保留并观察更新", ["上下文读取", "会话展示"]],
  "dsh-desktop-ui-compat": ["UI/核心", "中", "保留", ["全局布局", "设置页扩展"]],
  "dsh-find-plugin": ["市场/发现", "中", "按需启用", ["GitHub 搜索", "联网"]],
  "dsh-maid-atelier-fix": ["UI/皮肤适配", "中", "随皮肤启用", ["全局样式", "角色布局"]],
  "dsh-notification": ["系统支持", "低", "保留", ["系统通知"]],
  "dsh-open-in-vscode": ["工作区", "中", "按需启用", ["启动外部编辑器"]],
  "dshmarket": ["市场/管理", "高", "保留，隔离更新", ["依赖写入", "安装", "更新", "卸载"]],
  "whale-girl": ["桌宠", "中", "保留并观察", ["运行状态读取", "全局覆盖层"]],
};

function profileRoot() {
  return process.env.DSH_PROFILE_ROOT || path.join(os.homedir(), ".dsh", "profiles", process.env.DSH_PROFILE || "web");
}

function sha256(file) {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

function fileRecord(root, relativePath) {
  const absolutePath = path.join(root, relativePath);
  try {
    const stat = fs.statSync(absolutePath);
    return { relativePath, absolutePath, exists: true, bytes: stat.size, modifiedAt: stat.mtime.toISOString(), sha256: sha256(absolutePath) };
  } catch {
    return { relativePath, absolutePath, exists: false, bytes: 0, modifiedAt: null, sha256: null };
  }
}

function readProfile(root) {
  try { return JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8")); }
  catch { return { dependencies: {}, dsh: { profile: { bundles: [] } } }; }
}

function policyFor(name) {
  const row = POLICY[name] || ["依赖/其他", "中", "观察", ["能力未分类"]];
  return {
    group: row[0],
    sensitivity: row[1],
    recommendation: row[2],
    capabilities: row[3],
    protected: PROTECTED.has(name),
    protectedReason: PROTECTED.get(name) || null,
  };
}

function snapshot() {
  const root = profileRoot();
  const profile = readProfile(root);
  const dependencies = profile.dependencies || {};
  const bundles = profile.dsh?.profile?.bundles || [];
  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    profile: path.basename(root),
    profileRoot: root,
    files: PROFILE_FILES.map((name) => fileRecord(root, name)),
    plugins: Object.keys(dependencies).sort().map((name) => ({
      name,
      source: dependencies[name],
      bundleIndex: bundles.indexOf(name),
      inBundle: bundles.includes(name),
      ...policyFor(name),
    })),
    protectedPackages: Array.from(PROTECTED, ([name, reason]) => ({ name, reason })),
    actionMode: "preview-only",
  };
}

function snapshotsRoot() {
  return path.join(os.homedir(), ".dsh", "control-center", "snapshots");
}

function createSafetySnapshot(action, packageName) {
  const root = profileRoot();
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const destination = path.join(snapshotsRoot(), `${stamp}-${action}-${packageName.replace(/[^a-zA-Z0-9._-]+/g, "_")}`);
  fs.mkdirSync(destination, { recursive: true });
  const files = [];
  for (const relativePath of PROFILE_FILES) {
    const source = path.join(root, relativePath);
    if (!fs.existsSync(source)) continue;
    fs.copyFileSync(source, path.join(destination, relativePath));
    files.push(fileRecord(destination, relativePath));
  }
  const manifest = {
    schemaVersion: 1,
    createdAt: new Date().toISOString(),
    action,
    packageName,
    profileRoot: root,
    profileUnchanged: true,
    files,
  };
  const manifestPath = path.join(destination, "manifest.json");
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  return { path: destination, manifestPath, manifestSha256: sha256(manifestPath), files };
}

function sendJson(res, statusCode, value) {
  const body = JSON.stringify(value);
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Length", Buffer.byteLength(body));
  res.end(body);
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    let settled = false;
    req.setEncoding("utf8");
    req.on("data", (chunk) => {
      if (settled) return;
      body += chunk;
      if (body.length > 65536) {
        settled = true;
        reject(new Error("request body exceeds 64 KiB"));
      }
    });
    req.on("end", () => {
      if (settled) return;
      try { resolve(body ? JSON.parse(body) : {}); }
      catch { reject(new Error("invalid JSON body")); }
    });
    req.on("error", reject);
  });
}

export function apply(ctx) {
  const offSnapshot = ctx.webServer.register({
    kind: "exact",
    path: `${BASE}/snapshot`,
    handler(req, res) {
      if (req.method !== "GET") return sendJson(res, 405, { ok: false, error: "method_not_allowed" });
      try { sendJson(res, 200, { ok: true, value: snapshot() }); }
      catch (error) { sendJson(res, 500, { ok: false, error: "snapshot_failed", detail: error.message }); }
    },
  });

  const offPlan = ctx.webServer.register({
    kind: "exact",
    path: `${BASE}/plan`,
    async handler(req, res) {
      if (req.method !== "POST") return sendJson(res, 405, { ok: false, error: "method_not_allowed" });
      try {
        const body = await readJsonBody(req);
        const allowed = new Set(["stage-enable", "stage-disable", "update", "remove", "restore"]);
        const action = String(body.action || "");
        const packageName = String(body.name || "");
        if (!allowed.has(action) || !packageName) return sendJson(res, 400, { ok: false, error: "invalid_action" });
        const current = snapshot();
        const plugin = current.plugins.find((item) => item.name === packageName);
        if (!plugin) return sendJson(res, 404, { ok: false, error: "package_not_found" });
        if (plugin.protected) {
          return sendJson(res, 409, { ok: false, error: "protected_package", detail: plugin.protectedReason });
        }
        const backup = createSafetySnapshot(action, packageName);
        sendJson(res, 200, {
          ok: true,
          value: {
            action,
            packageName,
            protected: plugin.protected,
            protectedReason: plugin.protectedReason,
            execute: false,
            profileChanged: false,
            restartRequired: true,
            backup,
            nextStep: "操作 4 人工决定",
            restoreCommand: `dsh.cmd plugin --profile ${current.profile} install --offline --frozen-lockfile`,
          },
        });
      } catch (error) {
        sendJson(res, 500, { ok: false, error: "plan_failed", detail: error.message });
      }
    },
  });

  return () => {
    offPlan();
    offSnapshot();
  };
}
