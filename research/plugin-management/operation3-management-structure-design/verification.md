# 阶段 3 / 操作 2 最终验证记录

验证时间：2026-08-17 02:15（Asia/Shanghai）

对象：插件管理结构方案与交互原型

结果：**PASS，等待人工验收 H**

## A. 设计契约、原型与服务验证

命令：

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File `
  'research/plugin-management/operation3-management-structure-design/verify.ps1'
```

输入：

- `management-contract.json`
- `management-structure-plan.md`
- `mockup/management-center.png`
- `evidence/service-probe.json`
- `evidence/profile-before.json`
- 当前 DSH HTTP 服务

字面输出：

```text
CONTRACT_OK=true TAB=manage ORDER=20 PROTECTED=4
PLAN_OK=true REQUIRED_FIELDS=7
MOCKUP_OK=true WIDTH=1600 HEIGHT=1000
SERVICES_OK=true HTTP=200 INSTALLED=15 UPDATES=4 TOOLS=5
PROFILE_UNCHANGED=true FILES=4
LIVE_HTTP_OK=true HOME=200 MARKET=200
VERIFY_EXIT=0
EXIT=0
```

退出状态：`0`

## B. 现有服务基线

探针：

| 路由 | 状态 | 关键结果 |
|---|---:|---|
| `/` | 200 | DSH 页面可用 |
| `/dsh-market/installed` | 200 | 15 个已声明依赖 |
| `/dsh-market/status` | 200 | boot `46316-1786901638013` |
| `/dsh-market/updates` | 200 | 4 个可用更新 |
| `/__dsh-desktop-ui-compat/agent-tools` | 200 | 5 个工具 |

完整响应结构见 `evidence/service-probe.json`。

## C. CLI 恢复能力

基线命令：

```powershell
$env:PATH='C:\Program Files\nodejs;'+$env:PATH
& 'C:\Users\19739\AppData\Roaming\npm\dsh.cmd' plugin --profile web --help
```

字面结果：pnpm `11.19.0` 帮助页列出 `add`、`install`、`remove`、`update`；退出状态 `0`。完整输出见 `evidence/dsh-plugin-help.txt`。

## D. live profile 前后对比

检查文件：

- `package.json`：`35f6c56ed0f296f4d74d2d6392342cb005eb17f0dd13998cbd732f49623d663c`
- `pnpm-lock.yaml`：`ed0ec1581354108ea8313fc9e3a9c5902294c2bf1c0d37c7f2ff5e553ab61bdf`
- `cordis.yml`：`c300dcf2ebc5f02062d6591268d29d3db6fe45e0cb138f5467276fe2ba06076e`
- `cordis.patch.yml`：`9374d4607541e9fddfccc1b0b2e841ba10ca2d595d9b0c7aa3b53844fe23a5c8`

基线与当前字面结果：

```text
PROFILE_HASHES_MATCH=true FILES=4
```

操作 2 未更新、启停或重启任何插件。

## E. 补丁探针

基线：独立临时目录中的 `HEAD:.agent/STATE.json`。

命令：

```powershell
git apply --check phase3-operation2.patch
git apply phase3-operation2.patch
node -e '<assert gate H, manage tab and PNG artifact>'
```

字面输出：

```text
PATCH_CONTENT_OK=true GATE=H TAB=manage PNG_BYTES=193317 VERIFIED=true
PATCH_CHECK_EXIT=0
PATCH_APPLY_EXIT=0
PATCH_CONTENT_EXIT=0
```

退出状态：`0`

## F. 回滚探针

命令：

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File `
  '<probe>\research\plugin-management\operation3-management-structure-design\rollback.ps1' `
  -TargetRoot '<probe>'
```

字面输出：

```text
RESTORED_STATE=<probe>\.agent\STATE.json
REMOVED_OPERATION=<probe>\research\plugin-management\operation3-management-structure-design
ROLLBACK_OK=true
ROLLBACK_EXIT=0
ROLLBACK_STATE_MATCH_EXIT=0
OPERATION_REMOVED=True
```

退出状态：`0`；恢复状态与 `HEAD:.agent/STATE.json` 的 JSON 结构一致。

## G. 四个可验证角色

1. 修改产物：`management-structure-plan.md`、`management-contract.json`、`mockup/management-center.png`、`.agent/STATE.json`
2. 补丁：`phase3-operation2.patch`
3. 验证记录：本文件与 `evidence/verification-output.txt`
4. 回滚：`rollback.ps1`
