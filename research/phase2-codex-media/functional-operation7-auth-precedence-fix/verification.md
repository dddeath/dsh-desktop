# DSH 内部 `image_gen` 发布链路最终验证记录

验证时间：2026-08-17（Asia/Shanghai）
工作区：`E:\deepseek_harness`
目标插件：`C:\Users\19739\.dsh\profiles\web\node_modules\dsh-codex-tools`

## 1. 问题与修改结论

- 基线行为：DSH 对话内部调用 `image_gen` 返回 `backend_unavailable`，没有可定位的工作区文件。
- 已确认根因：DSH shell 沙箱中的子进程对最终工作区和系统临时目录写入均返回 `EPERM`；订阅后端本身可用。
- 修改字段/分支：
  - `tools.js` 的 `image_gen` 执行分支改为接收受限大小的 `imageBase64`，由插件宿主进程写入会话工作区。
  - `stdoutMaxBytes=33554432`（32 MiB），解码后图片上限 24 MiB。
  - `CODEX_PREFER_AUTH_FILE=1`：DSH 内部调用优先读取当前 Codex 登录态，DSH 凭据保留为回退来源。
  - 错误分类不再因输出文件名包含 `auth` 而误报 `auth_failed`。
  - 成功返回补齐 `outputPath`、`absolutePath`、`workspaceRoot`、`bytes`、`fileWritten`。

## 2. 基线调用、输入、原样输出

输入（DSH 对话内部工具调用）：

```text
image_gen({
  "format": "png",
  "prompt": "Anime app icon: cute moe mascot girl personifying DeepSeek AI. Long deep-blue hair with blue gradient highlights, big sparkling blue eyes, gentle smile. White and blue futuristic tech uniform. Blue whale motifs: small blue whale hair clip and tiny cute baby whale floating beside her shoulder. Centered bust portrait, clean flat anime illustration with soft shading, blue and white palette, simple gradient background, rounded square app icon composition, 1:1 square, crisp and polished.",
  "size": "1024x1024"
})
```

原样输出：

```json
{
  "backend": "chatgpt-subscription",
  "ok": false,
  "error": "backend_unavailable"
}
```

退出状态：工具结果 `ok=false`。
基线截图：`evidence/reported-internal-backend-unavailable.png`

## 3. 修改后真实 DSH 内部调用、输入、原样输出

输入（仅调用一次，无重试）：

```text
仅调用一次 image_gen，不要重试。生成一个极简蓝色鲸鱼圆形应用图标，白色背景，无文字。参数：out="output/imagegen/base64-publication-live.png"; size="1024x1024"; format="png"。调用后立即停止，并原样返回完整工具结果。
```

原样工具输出：

```json
{
  "backend": "chatgpt-subscription",
  "ok": true,
  "outputPath": "output/imagegen/base64-publication-live.png",
  "absolutePath": "E:\\deepseek_workspace\\pro1\\output\\imagegen\\base64-publication-live.png",
  "workspaceRoot": "E:\\deepseek_workspace\\pro1",
  "bytes": 990149,
  "revisedPrompt": "Minimalist flat design circular app icon of a blue whale, solid white background, no text, clean vector style, simple geometric whale silhouette, centered, blue color. PNG, 1024x1024.",
  "model": "gpt-5.5",
  "fileWritten": true
}
```

退出状态：工具结果 `ok=true`，调用次数 1。
结果记录：`evidence/successful-internal-result.json`
验收截图：`evidence/acceptance-internal-success.png`

## 4. 文件级结果

```text
LIVE_OUTPUT=E:\deepseek_workspace\pro1\output\imagegen\base64-publication-live.png
LIVE_BYTES=990149
LIVE_SIZE=1254x1254
LIVE_SHA256=031a8bb0cfb6a06f9b6f50e54c3f97ea802a883dc3e13a2b17159410e6a89e3d
LIVE_FILE_WRITTEN=True
```

说明：后端返回的实际位图尺寸为 `1254x1254`；插件完整保存返回内容，没有二次缩放。

## 5. 自动验证命令与原样输出

命令：

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File E:\deepseek_harness\research\phase2-codex-media\functional-operation7-auth-precedence-fix\verify.ps1
```

退出状态：`0`

原样输出：

```text
MODIFIED_ROLE=tools SHA256=bf968292e54312d7e0f78aa71b06dcf179d06dd674034f592c636877c5a101cd
NODE_CHECK_TOOLS_EXIT=0
MODIFIED_ROLE=codex-common SHA256=4870ccd23b3d3e0c0c065251ec8e99f270319b38b152cc19e82b2ef5b01231eb
NODE_CHECK_CODEX_COMMON_EXIT=0
MODIFIED_ROLE=codex-imagegen SHA256=4eb23025f32da2ce95aab51d2458b4329f500ec7cd0eb61e25b1055660ebc2b0
NODE_CHECK_CODEX_IMAGEGEN_EXIT=0
MODIFIED_ROLE=codex-vision SHA256=d53a918be81f909867d834b6c37899195d9b361cb21d3ee496b0b05460bf0ee7
NODE_CHECK_CODEX_VISION_EXIT=0
MODIFIED_ROLE=codex-search SHA256=5ed942093445efd6135a6085394dae62bf79f30f6fef307d72610dcd05ed15f6
NODE_CHECK_CODEX_SEARCH_EXIT=0
SESSION_WORKSPACE=C:\Users\19739\AppData\Local\Temp\dsh-codex-tools-publication-XBgw41
TRANSFER_MODE=stdout-base64
STDOUT_MAX_BYTES=33554432
FINAL_PATH=C:\Users\19739\AppData\Local\Temp\dsh-codex-tools-publication-XBgw41\output\probe.png
FINAL_BYTES=68
FILE_WRITTEN=true
AUTH_FILE_PRIORITY_FLAG=true
STAGED_PUBLICATION_TEST=true
PUBLICATION_FIXTURE_EXIT=0
LIVE_OUTPUT=E:\deepseek_workspace\pro1\output\imagegen\base64-publication-live.png
LIVE_BYTES=990149
LIVE_SIZE=1254x1254
LIVE_SHA256=031a8bb0cfb6a06f9b6f50e54c3f97ea802a883dc3e13a2b17159410e6a89e3d
LIVE_FILE_WRITTEN=True
ACCEPTANCE_SCREENSHOT=true SIZE=1280x720
HTTP_STATUS=200
VERIFY_OK=true
VERIFY_SCRIPT_EXIT=0
```

完整输出：`evidence/verify-output.txt`

## 6. 补丁应用验证

命令：

```powershell
git apply --check --directory=research/phase2-codex-media/functional-operation7-auth-precedence-fix/evidence/patch-probe-20260817000902 research/phase2-codex-media/functional-operation7-auth-precedence-fix/change.patch
git apply --directory=research/phase2-codex-media/functional-operation7-auth-precedence-fix/evidence/patch-probe-20260817000902 research/phase2-codex-media/functional-operation7-auth-precedence-fix/change.patch
```

原样结果：

```text
PATCH_CHECK_EXIT=0
PATCH_APPLY_EXIT=0
PATCH_MATCH_tools=True
PATCH_MATCH_codex-common=True
PATCH_MATCH_codex-imagegen=True
PATCH_MATCH_codex-vision=True
PATCH_MATCH_codex-search=True
PATCH_MATCH_STATE=True
PATCH_PROBE_OK=True
```

完整输出：`evidence/patch-probe-output.txt`

## 7. 回滚验证

探针命令：

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File E:\deepseek_harness\research\phase2-codex-media\functional-operation7-auth-precedence-fix\rollback.ps1 -PluginRoot <ROLLBACK_PROBE_PLUGIN> -StateTarget <ROLLBACK_PROBE_STATE>
```

退出状态：`0`

原样结尾：

```text
RESTART_REQUIRED=true
ROLLBACK_OK=true
ROLLBACK_SCRIPT_EXIT=0
```

完整输出：`evidence/rollback-probe-output.txt`

## 8. 四个交付角色

1. 修改后快照：`modified/`
2. 补丁：`change.patch`
3. 最终验证记录：`verification.md`（机器原始输出位于 `evidence/`）
4. 可运行回滚：`rollback.ps1`

回滚真实安装时运行：

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File E:\deepseek_harness\research\phase2-codex-media\functional-operation7-auth-precedence-fix\rollback.ps1
```

回滚脚本将校验每个原始文件的 SHA-256，并提示重启 DSH。
