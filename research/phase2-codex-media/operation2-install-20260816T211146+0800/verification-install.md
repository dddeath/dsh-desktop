# 阶段 2 操作 2：`dsh-codex-tools` 安装验证记录

- 时间：2026-08-16 21:11–21:16 +08:00
- 目标 profile：`web`
- 安装源：`github:SPYQWER1/dsh-codex-tools#9519949dd340ff07a7ef8182692704d2487ce690`
- 认证检查边界：只核验 `C:\Users\19739\.codex\auth.json` 存在与文件元数据；未读取认证内容。
- 当前结论：安装和离线注册验证通过；运行中的 Harness 尚待用户重启后进行桌面端人工验收。

## 1. 安装前基线

命令：

```powershell
& "$env:APPDATA\npm\dsh.cmd" plugin --profile web list
Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:3080/' -TimeoutSec 10
```

输入：profile `web`；HTTP `http://127.0.0.1:3080/`。

字面输出摘要：

```text
13 packages
HTTP_STATUS=200
EXIT=0
```

退出状态：插件列表 `0`；HTTP 检查 `0`。

原文件：

```text
package.json   SHA256=661DBCA2ADBC5DCE7ACD32A11EB26FE8307643557392B63182B20A5A6BF02B81
pnpm-lock.yaml SHA256=7A6AF21F6F569E03ED954061EA2BDA1EA7FEE3EBB46326D880E200521BF6CEC1
```

原件备份：

```text
artifacts/web-profile-manifests-before.zip
SHA256=F75C4D8BE78F0C76EEF1B045EE69CAA33ED974BFAFCC5A21E89CA3D7AFEBB2B5
```

## 2. 安装

命令：

```powershell
$env:PATH = 'C:\Program Files\nodejs;' + $env:PATH
& "$env:APPDATA\npm\dsh.cmd" plugin --profile web add 'github:SPYQWER1/dsh-codex-tools#9519949dd340ff07a7ef8182692704d2487ce690'
```

输入：固定 GitHub 提交 `9519949dd340ff07a7ef8182692704d2487ce690`。

字面输出：

```text
✓ Lockfile passes supply-chain policies (verified 1h ago)
Progress: resolved 1, reused 0, downloaded 0, added 0
Progress: resolved 12, reused 6, downloaded 0, added 0
Progress: resolved 12, reused 6, downloaded 1, added 0
[WARN] 1 deprecated subdependencies found: xterm@5.3.0
[WARN] Issues with peer dependencies found. Run "pnpm peers check" to list them.

dependencies:
+ dsh-codex-tools github:SPYQWER1/dsh-codex-tools#9519949dd340ff07a7ef8182692704d2487ce690

Packages: +2
++
Progress: resolved 69, reused 6, downloaded 1, added 2, done
Done in 5.2s using pnpm v11.19.0
INSTALL_EXIT=0
```

退出状态：`0`。

## 3. 安装后最小机器门禁

### 3.1 插件与配置

命令：

```powershell
& "$env:APPDATA\npm\dsh.cmd" plugin --profile web list
& "$env:APPDATA\npm\dsh.cmd" --profile web --dump-config
```

字面输出：

```text
├── dsh-codex-tools@1.0.1
14 packages
PLUGIN_LIST_EXIT=0

# == dsh-codex-tools
- id: tool-codex-tools
  name: dsh-codex-tools
DUMP_CONFIG_EXIT=0
```

退出状态：插件列表 `0`；配置转储 `0`。

### 3.2 真实安装包离线注册

命令：使用 `C:\Users\19739\.dsh\profiles\web\node_modules\dsh-codex-tools\index.js` 调用 `apply(ctx)`，以无网络 mock registry 收集工具名。

输入：实际安装的包入口；不传认证数据，不发送模型请求。

字面输出：

```json
{"name":"dsh-codex-tools","tools":["image_gen","image_vision","web_search"]}
```

退出状态：`0`。

### 3.3 HTTP

命令：

```powershell
Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:3080/' -TimeoutSec 10
```

字面输出：

```text
HTTP_STATUS=200
EXIT=0
```

退出状态：`0`。该结果只证明安装期间原 Harness 进程持续可用；新插件的运行中加载状态需重启后人工确认。

安装后文件：

```text
package.json   SHA256=765BB02389D2A7DE57C7C6E6CF63AE83049CE85B8F961D4413D3E963FF36A5B6
pnpm-lock.yaml SHA256=886218B682F5EC17FEBCDA476E11DD1686C151745D0CD7BB991CBFAC53C35FC8
```

修改产物：`artifacts/web-profile-manifests-after.zip`。

精确差异：`artifacts/web-profile-manifests.patch`。

## 4. 回滚隔离验证

命令：

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\rollback.ps1 `
  -ProfilePath $PROBE_DIR -SkipPackageManager
```

输入：隔离目录中安装后的 `package.json` 与 `pnpm-lock.yaml` 副本。

字面输出：

```text
"ok": true
"package_manager_executed": false
ROLLBACK_PROBE_EXIT=0
RESTORED_PACKAGE_SHA256=661DBCA2ADBC5DCE7ACD32A11EB26FE8307643557392B63182B20A5A6BF02B81
RESTORED_LOCK_SHA256=7A6AF21F6F569E03ED954061EA2BDA1EA7FEE3EBB46326D880E200521BF6CEC1
```

退出状态：`0`。实际 profile 未执行回滚，仍保留已安装状态。

实际回滚命令：

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "E:\deepseek_harness\research\phase2-codex-media\operation2-install-20260816T211146+0800\rollback.ps1"
```

脚本会先拒绝覆盖安装后又发生变化的 manifest，再移除插件、恢复两份原文件并核对原哈希。

## 5. 人工验收 B

1. 在“桌面运行状态”中点击“重启 Harness”。
2. 等状态恢复为“运行正常”。
3. 打开“设置 → 插件”，确认出现 `dsh-codex-tools` / `1.0.1`。
4. 确认对话 Agent 的工具集合包含 `image_vision` 与 `image_gen`。
5. 暂不执行真实识图或生图；人工验收 B 通过后再进入真实额度调用。
