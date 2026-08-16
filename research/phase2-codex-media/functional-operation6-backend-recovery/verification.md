# ChatGPT 订阅生图后端恢复验证

- 日期：2026-08-16（Asia/Shanghai）
- 会话工作区：`E:\deepseek_workspace\pro1`
- 后端：`chatgpt-subscription`
- 模型：`gpt-5.5`

## 用户报告

截图 `evidence/reported-backend-unavailable.png` 中的工具结果为：

```json
{
  "backend": "chatgpt-subscription",
  "ok": false,
  "error": "backend_unavailable"
}
```

当时 DSH 服务仍返回 HTTP 200，Codex `auth.json` 存在且认证模式为 `chatgpt`。该结果发生在订阅生图后端的短暂异常区间，不是工作区路径校验返回。

## 后续实测

保持现有安装代码与认证配置不变，使用同一订阅后端执行一次生图。完整原始输出：`evidence/diagnostic-run.txt`；结构化结果：`evidence/successful-result.json`。

```json
{
  "backend": "chatgpt-subscription",
  "ok": true,
  "outputPath": "output/imagegen/backend-recovery-20260816-233610.png",
  "absolutePath": "E:\\deepseek_workspace\\pro1\\output\\imagegen\\backend-recovery-20260816-233610.png",
  "workspaceRoot": "E:\\deepseek_workspace\\pro1",
  "bytes": 790464,
  "width": 1254,
  "height": 1254,
  "sha256": "47c72fa3efb62e2fe3bcef4eb5cbb32c9882ed5f13a3673c3556a187f7eb745e",
  "model": "gpt-5.5"
}
```

图片已重新打开并完成解码核验，内容为白底蓝色鲸鱼圆形图标。输出同时满足：

1. 文件存在于当前会话工作目录；
2. `absolutePath` 明确给出完整生成位置；
3. `workspaceRoot` 与会话工作区一致；
4. 生成结果不再落到 DSH 服务启动目录。

## 结论

本次恢复验证没有改动已安装插件代码，因此沿用上一项工作区修复的补丁、验证与回滚：

- 补丁：`E:\deepseek_harness\research\phase2-codex-media\functional-operation5-workspace-output-fix\change.patch`
- 验证：`E:\deepseek_harness\research\phase2-codex-media\functional-operation5-workspace-output-fix\verification.md`
- 回滚：`E:\deepseek_harness\research\phase2-codex-media\functional-operation5-workspace-output-fix\rollback.ps1`

人工验收只需在 `pro1` 对话中再次调用一次 `image_gen`，核对界面展示的 `absolutePath`。
