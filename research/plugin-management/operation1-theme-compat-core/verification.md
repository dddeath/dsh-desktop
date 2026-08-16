# 最终验证记录：主题兼容核心拆分

日期：2026-08-17（Asia/Shanghai）

工作区：`E:\deepseek_harness`

Web profile：`C:\Users\19739\.dsh\profiles\web`

## 1. 基线

### 原始文件哈希

命令：

```powershell
Get-FileHash -Algorithm SHA256 <maid-original-files>
```

输入与字面输出保存在 `evidence/original.sha256`，结果：

```text
8671437A583A84ECECEE17ACEE4DE3C404742A6B7F2339EABFB99513671E3B44  maid-client.js
FA553A49D6A9D4F7DDC3F1248ECB451891A1F4D7756E525AA4F0C68DA7F46260  maid-cordis.patch.yml
E3D24D6954CF54F59CE65BB2F28C4049E44B70D4C608A06DB6DD6486CEC08984  maid-index.js
F44667F40E0ACAFD03B51FEEE5498152D9F207EAF63887C4860171A05A5BEEEC  maid-package.json
```

退出状态：`0`。

### 新路由基线行为

命令：

```powershell
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:3080/__dsh-desktop-ui-compat/agent-tools
```

安装前字面输出开头：

```text
STATUS=200
<!doctype html>
<html lang="zh-CN">
```

即旧插件树把未知路径交给 SPA fallback，并未提供 JSON 工具目录。退出状态：`0`。

## 2. 安装与启动

安装命令：

```powershell
& 'C:\Users\19739\AppData\Roaming\npm\dsh.cmd' plugin --profile web add 'link:E:/deepseek_harness/themes/desktop-ui-compat'
```

字面结果：

```text
dependencies:
+ dsh-desktop-ui-compat link:E:/deepseek_harness/themes/desktop-ui-compat
Packages: +1
Done in 625ms using pnpm v11.22.0
ADD_EXIT=0
```

profile 中同时存在两个 junction：

```text
C:\Users\19739\.dsh\profiles\web\node_modules\dsh-desktop-ui-compat -> E:\deepseek_harness\themes\desktop-ui-compat
C:\Users\19739\.dsh\profiles\web\node_modules\dsh-maid-atelier-fix  -> E:\deepseek_harness\themes\maid-atelier-fix
```

旧 DSH PID `38708` 已停止，确认 `PORT_3080_RELEASED=true`；随后以同一 `web` profile 隐藏启动，新 DSH PID `46316`。启动日志 `evidence/runtime/dsh-web-20260817-013355.stdout.log`：

```text
dsh web: http://127.0.0.1:3080
```

stderr 文件为空，启动退出状态：`0`。

## 3. 修改后功能验证

命令：

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\verify.ps1
```

完整字面输出：`evidence/verify-runtime.txt`。关键输出：

```text
SYNTAX_EXIT=0
CHECK_PASS=core-scoped
CHECK_PASS=theme-change-sync
CHECK_PASS=core-theme-neutral
CHECK_PASS=core-agent-route
CHECK_PASS=core-no-character-controller
CHECK_PASS=runtime-plain-text
CHECK_PASS=maid-character-controller
CHECK_PASS=maid-no-generic-controller
CHECK_PASS=maid-no-global-agent-style
CHECK_PASS=maid-no-global-band-style
CHECK_PASS=maid-no-host-route
CHECK_PASS=runtime-route-status
CHECK_PASS=runtime-route-json
CHECK_PASS=runtime-image-gen
CHECK_PASS=runtime-image-vision
RUNTIME_TOOL_COUNT=5
CHECK_PASS=boot-core-entry
CHECK_PASS=boot-maid-entry
VERIFY_EXIT=0
SCRIPT_EXIT=0
```

已验证行为：

- 新核心路由为 `application/json; charset=utf-8`，不再返回 SPA fallback；
- 工具列表包含 `image_gen`、`image_vision`；
- 首页 boot entries 同时包含核心包和 Maid 适配层；
- 通用 CSS 没有 Maid 或暗色主题分支；
- Maid apply 只安装人物宽度联动；
- 运行状态全状态禁用文字阴影、描边与滤镜。

修改后逐文件 SHA-256：`evidence/modified.sha256`。验证脚本退出状态：`0`。

## 4. 补丁验证

补丁：`patch.diff`

探针：`evidence/patch-probe.txt`

命令：

```powershell
git clone --no-checkout --no-hardlinks . <TEMP_PROBE>
git -C <TEMP_PROBE> config core.autocrlf false
git -C <TEMP_PROBE> checkout HEAD -- themes/maid-atelier-fix
git -C <TEMP_PROBE> apply --whitespace=nowarn --check patch.diff
git -C <TEMP_PROBE> apply --whitespace=nowarn patch.diff
Get-FileHash <workspace-and-probe-files> -Algorithm SHA256
```

字面结果：

```text
APPLY_CHECK_EXIT=0
APPLY_EXIT=0
PATCH_HASH_PASS=themes/desktop-ui-compat/package.json:6933C7F87387FA2F77E1C1A25830A9DE033E448A9D08801C9EBD122BDA6FBD41
PATCH_HASH_PASS=themes/desktop-ui-compat/cordis.patch.yml:6C811D64A2AF0C3EC27EC3002FBC067AE35ACF1DC9A21B02A7E4B82928BA49C2
PATCH_HASH_PASS=themes/desktop-ui-compat/lib/index.js:DF5617EF359F634B97C8A029130446644CC00B05A8BBBF1D2A8B3E57CB4F4A79
PATCH_HASH_PASS=themes/desktop-ui-compat/lib/client.css:A1ABE4554221BB4A059DD0BBD39DFBD935DABB624134AB7E4AFD6DE443A99123
PATCH_HASH_PASS=themes/desktop-ui-compat/lib/client.js:25C5FD401AC330A3B4B20E472A6E58E7B8EF92B2B410B6F80695D2DD6B26F86A
PATCH_HASH_PASS=themes/desktop-ui-compat/README.md:797FDB5ECBAE14D0A06B4FDBA06957249108D8E5D5AE64C6E92AC509321AEF42
PATCH_HASH_PASS=themes/maid-atelier-fix/package.json:12B6550998B0367E897A759C6015E6D00BAB8ED4EC72750313C660DD2B46C703
PATCH_HASH_PASS=themes/maid-atelier-fix/cordis.patch.yml:F64CAEE7B0C872AD4C6E1D3DAD0B8B9ADEEF9D01293DE123E022EA77070A96DB
PATCH_HASH_PASS=themes/maid-atelier-fix/lib/index.js:D9C4DB5C940DB5B3ECAD34E4B8899EBFE64074DA0D1E69F4CE03C34CB40FEA91
PATCH_HASH_PASS=themes/maid-atelier-fix/lib/client.js:DA3C9707FA5DBB012664B68DCAEF6D4612BEAFC92849ADF11CB90B65DD6C4028
PATCH_PROBE_EXIT=0
```

## 5. 回滚验证

回滚入口：`rollback.ps1`。正式运行会恢复四个 Maid 原文件并从 Web profile 移除 `dsh-desktop-ui-compat`；探针运行使用 `-SkipProfile`，不会改动真实 profile。

命令：

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\rollback.ps1 -WorkspaceRoot <TEMP_PROBE> -SkipProfile
```

完整字面输出：`evidence/rollback-probe.txt`。结果：

```text
ROLLBACK_HASH_PASS=lib\client.js:8671437A583A84ECECEE17ACEE4DE3C404742A6B7F2339EABFB99513671E3B44
ROLLBACK_HASH_PASS=cordis.patch.yml:FA553A49D6A9D4F7DDC3F1248ECB451891A1F4D7756E525AA4F0C68DA7F46260
ROLLBACK_HASH_PASS=lib\index.js:E3D24D6954CF54F59CE65BB2F28C4049E44B70D4C608A06DB6DD6486CEC08984
ROLLBACK_HASH_PASS=package.json:F44667F40E0ACAFD03B51FEEE5498152D9F207EAF63887C4860171A05A5BEEEC
ROLLBACK_EXIT=0
SCRIPT_EXIT=0
```

## 6. 待人工视觉验收

自动验证已经覆盖加载、契约、路由、补丁和回滚。主题切换后的视觉连续性按 `theme-contract-analysis.md` 中五项矩阵由用户直接验收，以便及时观察默认主题、Maid 和另一社区主题之间的真实差异。

## 7. 人工验收结论

验收时间：2026-08-17 01:47（Asia/Shanghai）。

用户已回复“验收完毕”，确认本项主题兼容改造完成最终人工验收。验收范围沿用第 6 节及 `theme-contract-analysis.md` 的三主题矩阵：默认主题、Maid Atelier、其他社区主题之间的切换，以及设置页、Agent 工具、运行状态、编辑器、侧栏拖拽和 Maid 人物联动。

最终状态：自动验证通过、补丁探针通过、隔离回滚通过、人工视觉验收通过。
