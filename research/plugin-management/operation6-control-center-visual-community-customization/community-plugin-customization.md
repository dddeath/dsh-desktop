# 社区插件定制与插件市场兼容方案

## 当前结论

会发生覆盖风险，但只限于直接修改安装目录的做法。

当前 `dsh-better-sidebar` 在 web profile 中的依赖是 `^0.12.2`，实际安装版本为 `0.12.2`。dshmarket 1.5.0 更新 npm 插件时执行等价于 `pnpm add dsh-better-sidebar@latest` 的包操作；它会重新解析并安装上游版本，不会把 `node_modules/dsh-better-sidebar` 里的手工改动做 Git 三方合并。

因此不要直接修改：

```text
C:\Users\19739\.dsh\profiles\web\node_modules\dsh-better-sidebar
```

## 分层选择

### 1. 仅修改布局、颜色、响应式或 DOM 外观

优先放入独立兼容插件，例如当前已有的：

```text
E:\deepseek_harness\themes\desktop-ui-compat
```

该插件以 `link:` 方式安装，并排在 `dsh-better-sidebar` 后加载。上游侧边栏仍由市场更新，本地插件只覆盖需要的主题无关样式或适配逻辑。通常只需在上游更新后跑一次 DOM/视觉回归，不需要合并整份上游源码。

### 2. 修改侧边栏内部 React、服务接口、终端或 Git 行为

建立可追踪的 fork，不直接改安装目录：

```powershell
git clone https://github.com/ACCOUNT/DSH-better-sidebar.git E:\deepseek_harness\plugins\dsh-better-sidebar-custom
git -C E:\deepseek_harness\plugins\dsh-better-sidebar-custom remote add upstream https://github.com/omdsh-dev/DSH-better-sidebar.git
git -C E:\deepseek_harness\plugins\dsh-better-sidebar-custom switch -c custom/main
```

完成构建后，以本地链接替换市场依赖：

```powershell
& "$env:APPDATA\npm\dsh.cmd" plugin --profile web add "link:E:/deepseek_harness/plugins/dsh-better-sidebar-custom"
```

dshmarket 对 `link:`/`file:` 依赖明确跳过在线更新并提示“从 checkout 更新”，不会再用市场版本覆盖本地代码。

后续同步上游：

```powershell
git -C E:\deepseek_harness\plugins\dsh-better-sidebar-custom fetch upstream
git -C E:\deepseek_harness\plugins\dsh-better-sidebar-custom rebase upstream/main
pnpm --dir E:\deepseek_harness\plugins\dsh-better-sidebar-custom install --frozen-lockfile
pnpm --dir E:\deepseek_harness\plugins\dsh-better-sidebar-custom build
pnpm --dir E:\deepseek_harness\plugins\dsh-better-sidebar-custom test
```

冲突会在 Git rebase 阶段显式出现，由你决定保留本地逻辑还是采用上游实现；这才是可审计的合并点。

### 3. 使用 GitHub fork 规格

也可将 profile 固定为 `github:ACCOUNT/DSH-better-sidebar#COMMIT`。需要注意，市场更新 GitHub 依赖时跟随的是该 fork 的 HEAD，而不是官方仓库 HEAD；官方更新仍需先合并到 fork。若要求每次变更都可本地验证，优先选择 `link:` 工作区方案。

## 推荐规则

| 修改类型 | 推荐承载方式 | 市场行为 | 上游同步 |
|---|---|---|---|
| CSS、尺寸、响应式 | 独立兼容插件 | 原插件可正常更新 | 更新后视觉回归 |
| DOM 小型适配 | 独立兼容插件 | 原插件可正常更新 | 更新后选择器回归 |
| React/服务/终端核心逻辑 | 本地 fork + `link:` | 市场跳过更新 | Git rebase/merge |
| 临时验证 | 临时分支或隔离副本 | 不写入正式 profile | 验证后丢弃 |
| 直接编辑 `node_modules` | 禁止作为持久方案 | 更新时可能被覆盖 | 没有可靠合并点 |

## 本次管理中心补充

插件详情新增“维护方式”：

- `link:`/`file:`：显示“本地工作区维护；市场不自动更新”；
- npm/GitHub：显示“插件市场托管；直接修改安装目录会被更新覆盖”。

证据来自当前安装的 dshmarket 1.5.0 `lib/routes.js` 与 `lib/updates.js`，文件哈希记录在 `market-behavior.json`。
