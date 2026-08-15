# DeepSeek Harness Desktop (dsh-desktop)

一套 DeepSeek Harness（`dsh`）桌面端与社区插件方案。

## 内容

- **`desktop/`** — Electron 桌面壳：包装官方 `dsh web`，独立窗口、单实例、自动附加/拉起服务、`Harness → Restart Harness` 菜单、已打包为 Windows exe（`npm run pack`）。
- **`themes/maid-atelier-fix/`** — 「深海女仆工坊」皮肤（`dsh-deep-whale` / maid-atelier）的浅色模式修复插件：
  1. 左侧边栏/顶部菜单栏随浅色主题切换（不再恒为深蓝）
  2. 右栏空态文案对比度增强
  3. 对话/轨迹/上下文三个视图 tab 增加符合主题的边框
  4. 右侧边栏改为契合主题的长春花蓝调
- **`scripts/`** — 安装插件、重启、生成图标等运维脚本。
- **`plugin-recommendations.md`** — 社区插件推荐清单（按推荐程度分级）。
- **`research/plugin-report.md`** — 766 个社区插件全量排名（按 GitHub 星标 + npm 下载量）。

## 快速开始

```cmd
:: 启动桌面端
启动桌面端.cmd

:: 重启 Harness（激活新装插件）
重启DSH.cmd
```

## 依赖

- Node.js ≥ 20，全局安装 `@deepseek-ai/dsh`（`npm i -g @deepseek-ai/dsh`）
- `pnpm`（`dsh plugin` 安装插件依赖）

## 许可

- `desktop/`、`themes/maid-atelier-fix/`、`scripts/`：MIT
- 「深海女仆工坊」皮肤素材为第三方创作（CC BY-NC-SA 4.0），本仓库不包含其素材，仅提供兼容性修复层。
