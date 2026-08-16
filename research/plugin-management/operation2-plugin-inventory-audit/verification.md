# 阶段 3 / 操作 1 最终验证记录

验证时间：2026-08-17 02:04（Asia/Shanghai）

对象：web profile 插件结构分析

结果：**PASS，等待人工验收 G**

## A. 基线采集

命令：

```powershell
& 'C:\Program Files\nodejs\node.exe' `
  'research/plugin-management/operation2-plugin-inventory-audit/collect-inventory.mjs'
```

输入：

- profile：`C:\Users\19739\.dsh\profiles\web`
- runtime：`http://127.0.0.1:3080`
- 工具路由：`/__dsh-desktop-ui-compat/agent-tools`

字面输出：

```text
PROFILE_DEPENDENCIES=15
PROFILE_BUNDLES=16
BOOT_ENTRIES=49
REGISTERED_TOOLS=5
HOME_STATUS=200
TOOLS_STATUS=200
INVENTORY=E:\deepseek_harness\research\plugin-management\operation2-plugin-inventory-audit\evidence\inventory.json
```

退出状态：`0`

更新检查命令：

```powershell
& 'C:\Program Files\nodejs\node.exe' `
  'research/plugin-management/operation2-plugin-inventory-audit/check-updates.mjs'
```

输入：5 个 npm 包、7 个 GitHub 仓库。逐项字面输出及退出状态见 `evidence/update-check.txt`；全部 `EXIT=0`。

## B. 分析产物验证

命令：

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File `
  'research/plugin-management/operation2-plugin-inventory-audit/verify.ps1'
```

输入：

- `inventory-summary.json`
- `plugin-inventory-analysis.md`
- `evidence/inventory.json`
- `evidence/snapshot.sha256`
- 当前 DSH HTTP 服务

字面输出：

```text
JSON_OK=true DEPENDENCIES=15 BOOT_ENTRIES=49 TOOLS=5 UNIQUE_TOOLS=5
REPORT_OK=true PLUGINS=15
HASH_OK=true FILES=11
HTTP_OK=true HOME=200 TOOLS=200
VERIFY_EXIT=0
EXIT=0
```

退出状态：`0`

## C. 补丁探针

基线：`git show HEAD:.agent/STATE.json` 写入独立临时目录。

补丁：`phase3-operation1.patch`。

命令：

```powershell
git apply --check phase3-operation1.patch
git apply phase3-operation1.patch
& 'C:\Program Files\nodejs\node.exe' -e '<assert state, gate and 15 plugins>'
```

字面输出：

```text
PATCH_CONTENT_OK=true PLUGINS=15 GATE=awaiting_user_validation VERIFIED=true
PATCH_CHECK_EXIT=0
PATCH_APPLY_EXIT=0
PATCH_CONTENT_EXIT=0
```

三个命令退出状态均为 `0`，`git apply` 未产生空白错误警告。

## D. 回滚探针

命令：

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File `
  '<probe>\research\plugin-management\operation2-plugin-inventory-audit\rollback.ps1' `
  -TargetRoot '<probe>'
```

字面输出：

```text
RESTORED_STATE=<probe>\.agent\STATE.json
REMOVED_OPERATION=<probe>\research\plugin-management\operation2-plugin-inventory-audit
ROLLBACK_OK=true
ROLLBACK_EXIT=0
ROLLBACK_STATE_MATCH_EXIT=0
OPERATION_REMOVED=True
```

退出状态：`0`。恢复后的 `.agent/STATE.json` 与 `HEAD:.agent/STATE.json` 做 JSON 结构比较，结果一致。

## E. 基线行为 / 当前行为

| 检查 | 基线命令与结果 | 当前命令与结果 |
|---|---|---|
| DSH 首页 | `GET /` → `200` | `verify.ps1` → `HOME=200` |
| 工具目录 | `GET /__dsh-desktop-ui-compat/agent-tools` → `200`, 5 工具 | `verify.ps1` → `TOOLS=200`, `UNIQUE_TOOLS=5` |
| profile 依赖 | 采集器 → 15 | 报告验证 → 15/15 均出现 |
| 插件实际变更 | 无包更新、无启停、无重启 | 无包更新、无启停、无重启 |

## F. 四个可验证角色

1. 修改产物：`plugin-inventory-analysis.md`、`inventory-summary.json`、`.agent/STATE.json`
2. 补丁：`phase3-operation1.patch`
3. 验证记录：本文件与 `evidence/verification-output.txt`
4. 回滚：`rollback.ps1`
