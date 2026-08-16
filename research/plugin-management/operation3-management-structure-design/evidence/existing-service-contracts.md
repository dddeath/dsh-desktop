# 现有服务复用证据

## DSH 官方只读插件清单

本机包：

- `@deepseek-ai/dsh-host-plugin-inventory`
- `@deepseek-ai/dsh-client-ui-settings-plugin-inventory`

公开字段：`entryId`、`moduleName`、`enabled`、`fiberPhase`。官方 README 明确该服务没有来源、历史与修改路径。

客户端现有注册：

```js
ctx.slots.inject("settings.plugins.tab", () => ctx.slots.register({
  name: "settings.plugins.tab",
  id: "all",
  order: 10
}, PluginInventorySettingsTab));
```

因此新增管理页使用相同 slot、`id: manage`、`order: 20`，不替换官方页面。

## dshmarket 1.2.2

当前可复用路由：

| 路由 | 方法 | 作用 |
|---|---|---|
| `/dsh-market/installed` | GET | profile、installed spec、live hot mounts |
| `/dsh-market/status` | GET | pnpm、boot id、进行中的动作 |
| `/dsh-market/updates` | GET | current/latest/updateAvailable/source kind |
| `/dsh-market/use-skin` | POST | 实时皮肤切换 |
| `/dsh-market/update` | POST | 重新解析单个 npm/Git 依赖 |
| `/dsh-market/uninstall` | POST | 单个插件移除和 hot unmount 结果 |
| `/dsh-market/logs` | GET | 导出市场动作日志 |

写路由具有 same-origin 检查和单动作互斥。管理中心在它们之前增加备份与确认，不复制 pnpm 执行器。

## CLI 恢复入口

命令：

```powershell
$env:PATH='C:\Program Files\nodejs;'+$env:PATH
& 'C:\Users\19739\AppData\Roaming\npm\dsh.cmd' plugin --profile web --help
```

退出码：`0`。输出表明 `dsh plugin --profile web` 转发到 pnpm，支持 `install`、`add`、`remove`、`update`；完整输出见 `dsh-plugin-help.txt`。
