# DeepSeek Harness Desktop v0.2.0

发布日期：2026-08-17
平台：Windows x64

## 主要内容

- 完成桌面三栏、Composer、设置页、主题切换和桌宠响应式 UI 优化。
- 集成并验收 `dsh-codex-tools@1.0.1`，复用本机 Codex/ChatGPT 登录态提供图片识别与图片生成。
- 新增主题中立插件管理中心，包括来源、运行状态、敏感能力、更新、维护方式和恢复入口。
- 修复 Harness 重启时端口残留、Agent 运行遮挡、图片输出目录和内部生图错误折叠等问题。
- 完成真实插件停用、重启、恢复、重启闭环。

## 下载产物

| 产物 | 大小 | SHA-256 |
|---|---:|---|
| `DeepSeek-Harness-Desktop-0.2.0-portable.exe` | 84561810 bytes | `6622B6C7066853F33858A4BBAF42035772C8F664C5ABDC5042A36624915A958E` |
| `DeepSeek-Harness-Desktop-Setup-0.2.0.exe` | 84989014 bytes | `E0CA067904A6A8623FA3B9BAF773A0320FB4C2F4D45AF83D0A2036FD7B91564D` |

本机路径：

- `E:\deepseek_harness\desktop\dist\DeepSeek-Harness-Desktop-0.2.0-portable.exe`
- `E:\deepseek_harness\desktop\dist\DeepSeek-Harness-Desktop-Setup-0.2.0.exe`

## 验证

- 构建退出状态：`0`
- 六个生产 JavaScript 文件通过 `node --check`
- 便携版、安装版、解包程序 PE 头均为 `MZ`
- `app.asar` 包含 `main.js`、`dsh-process.js` 和桌面图标
- Harness 健康检查：HTTP 200
- 隔离回滚：PASS

完整记录：`release/v0.2.0/verification.json`。

## 已知限制

- Windows 可执行文件当前为 `NotSigned`，首次下载或运行时可能出现 SmartScreen 提示。
- 本次固定源码、分支、标签、构建日志和 SHA-256；未包含代码签名证书。

## 回滚

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File E:\deepseek_harness\release\v0.2.0\rollback.ps1
```

回滚恢复桌面版本、lockfile、计划、状态和 README 到发布前哈希；不会修改正在使用的 DSH web profile。
