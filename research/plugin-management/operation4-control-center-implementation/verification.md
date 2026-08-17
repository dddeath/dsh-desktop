# 阶段 3 操作 3：插件管理中心验证记录

## 当前结论

- 实现状态：已实现并写入 `web` profile。
- 自动验证：静态语法、UTF-8、profile 依赖、bundle 顺序、组合配置、回滚探针均通过。
- 运行边界：本操作只读取聚合状态并生成“备份 + 执行计划”；不会启停、更新、卸载插件，也不会自动重启。
- 人工门：Gate I 等待用户从桌面菜单执行一次 `Harness → Restart Harness (dsh web)`，随后验收真实设置页面。

## 变更对象

- 插件源码：`E:\deepseek_harness\plugins\plugin-control-center`
- live profile：`C:\Users\19739\.dsh\profiles\web`
- 设置插槽：`settings.plugins.tab`
- 页签：`manage` / `管理中心` / order `20`
- 受保护包：`dsh-plugin-control-center`、`dshmarket`、`dsh-desktop-ui-compat`、`dsh-codex-tools`

## 基线命令、输入和字面输出

命令：

```powershell
Get-FileHash C:\Users\19739\.dsh\profiles\web\package.json -Algorithm SHA256
Get-FileHash C:\Users\19739\.dsh\profiles\web\pnpm-lock.yaml -Algorithm SHA256
Get-FileHash E:\deepseek_harness\.agent\STATE.json -Algorithm SHA256
```

输出（exit `0`）：

```text
B47943F6F707DA9A34B106D3353169A63C540A4505912010C64544E7FE8CF1D6  package.json
386782CE50A4C6E32AEE8E9BDE3B84C46046FB83380654B927651C26950DA771  pnpm-lock.yaml
1CB877BDFF81A60197B305166FA2267EADE5884A61E07F70247288FDA516F0C2  STATE.json
```

用户更新插件后，原 `cordis.patch.yml` 中仍有已失去目标的 `auto-continue` 禁用项。它的保存哈希为：

```text
9374D4607541E9FDDFCCC1B0B2E841BA10CA2D595D9B0C7AA3B53844FE23A5C8  cordis.patch.yml
```

独立 `dsh --profile web --dump-config` 对该旧项的字面诊断：

```text
dsh: [C:\Users\19739\.dsh\profiles\web\cordis.patch.yml] patch: entry "auto-continue" not found
```

因此保存原件后把这个无对象补丁替换为空 patch layer；未改变任何仍存在插件的启用状态。

## 修改后命令、输入和字面输出

安装命令：

```powershell
$env:PATH='C:\Program Files\nodejs;'+$env:PATH
& "$env:APPDATA\npm\dsh.cmd" plugin --profile web add 'link:E:/deepseek_harness/plugins/plugin-control-center'
```

输出（exit `0`）：

```text
dependencies:
+ dsh-plugin-control-center link:E:/deepseek_harness/plugins/plugin-control-center
Already up to date
Done in 1.5s using pnpm v11.19.0
```

综合验证命令：

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File E:\deepseek_harness\research\plugin-management\operation4-control-center-implementation\verify.ps1
```

输出（exit `0`）：

```text
result                    : PASS
profile                   : C:\Users\19739\.dsh\profiles\web
controlCenterBundleIndex  : 3
immediatelyAfterDshmarket : True
actionMode                : preview-only
liveEndpointChecked       : False
packageSha256             : CC8B82C9C5AFB4C616484292A41E59CB5D6008FB74BF79ADEE138D61C7E0CCEE
lockSha256                : 6747E099BA23F07CB5D94D693D24DD0EA517B7AD2A3215DAC6E3DB42DE698131
patchSha256               : 803B183C9B487A26981FEEA690D22C942A8DE4899D6E671E03429763C949D354
```

`--dump-config` 在清除旧补丁后输出（exit `0`）：

```text
# == dsh-plugin-control-center
  name: dsh-plugin-control-center
```

## 回滚探针

探针在隔离副本上执行：

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File E:\deepseek_harness\research\plugin-management\operation4-control-center-implementation\rollback.ps1 `
  -ProfileRoot <PROBE_PROFILE> -PluginRoot <PROBE_PLUGIN> -StateTarget <PROBE_STATE> -SkipInstall -RestoreWorkspace
```

输出（exit `0`）：

```text
result            : ROLLBACK PASS
workspaceRestored : True
installExecuted   : False
restartRequired   : True
```

恢复后的字面哈希：

```text
B47943F6F707DA9A34B106D3353169A63C540A4505912010C64544E7FE8CF1D6  package.json
386782CE50A4C6E32AEE8E9BDE3B84C46046FB83380654B927651C26950DA771  pnpm-lock.yaml
9374D4607541E9FDDFCCC1B0B2E841BA10CA2D595D9B0C7AA3B53844FE23A5C8  cordis.patch.yml
1CB877BDFF81A60197B305166FA2267EADE5884A61E07F70247288FDA516F0C2  STATE.json
plugin_removed=true
```

## Gate I 人工验收

1. 桌面菜单点击 `Harness → Restart Harness (dsh web)`；确认不再出现端口占用错误。
2. 进入 `设置 → 插件 → 管理中心`；确认有“运行中 / 待重启 / 可更新 / 已纳管”四个统计。
3. 测试搜索、分组、状态、敏感度和“仅看更新”筛选；展开任一插件查看来源、能力、装载位置、建议。
4. 确认四个受保护插件显示锁定原因，计划启停和更新按钮不可用。
5. 对非保护插件点击“恢复预演”，输入插件名并生成计划；确认结果显示 `profileChanged: false`、`execute: false` 及备份路径。
6. 截图管理中心总览和一次操作预演结果，回复“通过验收”或指出具体异常。

人工重启前，旧服务继续使用旧启动图，`/__dsh-plugin-control-center/snapshot` 返回 SPA 页面而非 JSON；该状态未被记作运行通过。重启后使用下列命令完成 live 验证：

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File E:\deepseek_harness\research\plugin-management\operation4-control-center-implementation\verify.ps1 -RequireLiveEndpoint
```
