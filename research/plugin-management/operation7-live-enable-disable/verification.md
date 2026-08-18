# 插件管理中心真实停启验证记录

- 日期：2026-08-19（Asia/Shanghai）
- 修改对象：`E:\deepseek_harness\plugins\plugin-control-center`
- 版本：`0.1.1` → `0.2.0`
- 实机配置：`C:\Users\19739\.dsh\profiles\web\package.json`
- 演练插件：`dsh-notification`（低敏感度、非保护包）

## 1. 基线行为

命令：

```powershell
$orig='E:\deepseek_harness\research\plugin-management\operation7-live-enable-disable\original'
$index=Get-Content -LiteralPath "$orig\lib\index.js" -Raw
$client=Get-Content -LiteralPath "$orig\lib\client.js" -Raw
# 精确匹配 preview-only、/execute、计划按钮和桌面重启协议
```

输入：操作前备份的 `lib/index.js`、`lib/client.js`。

原样输出（`baseline-inspection-output.json`）：

```json
{"actionMode":"preview-only","executeRoute":false,"planDisable":true,"planEnable":true,"realDisableButton":false,"automaticRestart":false}
```

退出状态：`0`。

结论：原版本只有“计划停用/计划启用”，没有执行路由，也没有桌面托管重启。

## 2. 修改后语法、单元测试和在线装载

命令：

```powershell
node --check E:\deepseek_harness\plugins\plugin-control-center\lib\index.js
node --check E:\deepseek_harness\plugins\plugin-control-center\lib\client.js
node --check E:\deepseek_harness\plugins\plugin-control-center\lib\live-actions.js
npm.cmd test --prefix E:\deepseek_harness\plugins\plugin-control-center
Invoke-RestMethod http://127.0.0.1:3080/__dsh-plugin-control-center/snapshot
Invoke-WebRequest http://127.0.0.1:3080/plugins/dsh-plugin-control-center/client.js
```

输入：修改后的插件源码与正在运行的 DSH `web` profile。

原样输出（`final-test-output.txt`）：

```text
COMMAND: node --check lib/index.js && node --check lib/client.js && node --check lib/live-actions.js
SYNTAX_EXIT=0,0,0
COMMAND: npm.cmd test --prefix E:\deepseek_harness\plugins\plugin-control-center

> dsh-plugin-control-center@0.2.0 test
> node --test test/*.test.js

✔ confirmed disable writes the profile and cannot be replayed (14.5515ms)
✔ profile drift blocks execution without changing bundle state (8.712ms)
✔ disable remembers bundle position across service restart and enable restores it (22.0399ms)
✔ expired plans are rejected (8.1758ms)
ℹ tests 4
ℹ suites 0
ℹ pass 4
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 126.1592
TEST_EXIT=0
COMMAND: GET live snapshot and served client assertions
{"snapshotHttp":200,"actionMode":"live-enable-disable","plugins":19,"servedRealLabels":true,"servedDesktopRestart":true,"servedMarketRestart":false}
LIVE_ASSERT_EXIT=0
```

退出状态：`0`。

## 3. 实机配置停用与原位恢复

命令：

```powershell
& E:\deepseek_harness\research\plugin-management\operation7-live-enable-disable\scripts\profile-cycle.ps1
```

输入：`stage-disable` → `dsh-notification` → `stage-enable`；全部通过在线 `/plan` 与 `/execute` 路由。

原样输出（`profile-cycle-output.json`）：

```json
{
  "target": "dsh-notification",
  "baseline": {
    "actionMode": "live-enable-disable",
    "inBundle": true,
    "bundleIndex": 16,
    "profileSha256": "708F4057A27DB4FA73A9D44492BC2AD63DB5FFE6DB27DCFAE1F6D85612233913"
  },
  "plan": {
    "executable": true,
    "execute": false,
    "profileUnchanged": true,
    "backupPath": "C:\\Users\\19739\\.dsh\\control-center\\snapshots\\2026-08-18T18-12-06-970Z-stage-disable-dsh-notification",
    "manifestSha256": "98904106322E66E628BDB96679F3475CFBAB9B846BD78D62B1756D2639EBD110"
  },
  "disabled": {
    "execute": true,
    "profileChanged": true,
    "inBundle": false,
    "packageSha256": "B18E66860B33B1C5B2106728D6E0F2CCB5E444FC5AECFF262B78E2D9A240A46C"
  },
  "restored": {
    "execute": true,
    "profileChanged": true,
    "inBundle": true,
    "bundleIndex": 16,
    "packageSha256": "708F4057A27DB4FA73A9D44492BC2AD63DB5FFE6DB27DCFAE1F6D85612233913",
    "exactBaselineHash": true
  }
}
```

退出状态：`0`。

结论：生成计划不会改配置；确认停用真实移除 bundle；重新启用恢复到原索引 16，并恢复完全相同的 `package.json` 哈希。

## 4. 保护包护栏

命令：

```powershell
Invoke-WebRequest -SkipHttpErrorCheck -Method Post `
  http://127.0.0.1:3080/__dsh-plugin-control-center/plan `
  -ContentType application/json `
  -Body '{"action":"stage-disable","name":"dsh-plugin-control-center"}'
```

输入：对管理中心自身请求停用计划。

原样输出（`protected-package-output.json`）：

```json
{"command":"POST /plan stage-disable dsh-plugin-control-center","status":409,"body":"{\"ok\":false,\"error\":\"protected_package\",\"detail\":\"管理与恢复入口自身\"}","profileHashBefore":"708F4057A27DB4FA73A9D44492BC2AD63DB5FFE6DB27DCFAE1F6D85612233913","profileHashAfter":"708F4057A27DB4FA73A9D44492BC2AD63DB5FFE6DB27DCFAE1F6D85612233913","unchanged":true}
```

退出状态：`0`。

## 5. 重启路径修正

首次部署探测误用了 `dshmarket` 的自重启端点；桌面守护进程与自重启助手同时接管进程，页面短暂出现 `pluginInventory/list Failed to fetch` 和“加载提供方目录失败”。最终实现已删除该调用，改用桌面端已经验收的：

```text
dsh-desktop://restart
```

该协议由 `E:\deepseek_harness\desktop\main.js` 的 `restartHarness()` 接管，统一完成会话静默检查、会话备份、端口释放、进程启动与窗口重新装载。在线客户端断言确认 `servedDesktopRestart=true`、`servedMarketRestart=false`。

## 6. 回滚探针

补丁先执行：

```powershell
git apply --check --reverse -- E:\deepseek_harness\research\plugin-management\operation7-live-enable-disable\plugin-control-center-live-enable-disable.patch
```

原样输出：`PATCH_REVERSE_CHECK_EXIT=0`；退出状态：`0`。这证明当前修改版可以由该补丁精确反向还原。

命令：

```powershell
& E:\deepseek_harness\research\plugin-management\operation7-live-enable-disable\rollback.ps1 `
  -TargetRoot E:\deepseek_harness\research\plugin-management\operation7-live-enable-disable\rollback-probe\plugin-control-center
```

输入：修改版插件的隔离副本。

原样结果（`rollback-probe-output.json`）：`ok=true`，版本恢复为 `0.1.1`；5 个原始文件 SHA-256 全部与 `original-hashes.json` 相同；`lib/live-actions.js` 已移除；实时源码仍为 `0.2.0`。

退出状态：`0`。

## 7. 行为结论

- 基线：点击启停仅生成预演，`profileChanged=false`、`execute=false`。
- 修改后：先创建配置备份和 5 分钟一次性计划；二次确认后通过 `/execute` 写入 profile；哈希漂移、计划过期、计划重放或保护包操作均中止。
- 停用后：目标依赖保留，但从 `dsh.profile.bundles` 移除；桌面托管重启后不再加载。
- 启用后：目标重新加入 bundle，并优先恢复停用前的 bundle 索引；桌面托管重启后重新加载。
