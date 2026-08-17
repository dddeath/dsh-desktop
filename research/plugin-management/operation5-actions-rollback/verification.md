# 阶段 3 操作 4：管理动作与回滚验证

## 边界

- 隔离 profile：`research/plugin-management/operation5-actions-rollback/evidence/isolated-*`
- 真实 profile：`C:\Users\19739\.dsh\profiles\web`
- 本轮不写入真实 profile，不重启 Harness。
- 受保护插件策略保持不变；隔离演练使用非保护插件 `dsh-notification` 和 `dsh-context`。

## 演练矩阵

| 动作 | 对象 | 预期 |
|---|---|---|
| 安全备份 | 隔离 profile | 保存 package、lock、patch 和 SHA-256 清单 |
| 停用 | `dsh-notification` | 从 bundle 移除；lock 不变；标记需重启 |
| 启用 | `dsh-notification` | 回到原 bundle index；lock 不变；标记需重启 |
| 版本锁定 | `dsh-context` | `^0.7.3` → `0.7.3`；标记需 install + restart |
| 更新检查 | `dsh-context` | 当前 `0.7.3`、最新 `0.10.2`、可更新 |
| 漂移护栏 | 错误 package 哈希 | 拒绝动作，profile 不变 |
| 恢复 | 备份 manifest | package、lock、patch 逐字节恢复基线 |

## 验证命令

```powershell
& 'C:\Program Files\nodejs\node.exe' --check E:\deepseek_harness\plugins\plugin-control-center\lib\profile-actions.js
& 'C:\Program Files\nodejs\node.exe' E:\deepseek_harness\research\plugin-management\operation5-actions-rollback\verify-isolated.mjs
```

## 真实 profile 决策点

隔离验证通过后，由用户决定：

1. 执行一次 `dsh-notification` 停用 → 手工重启 → 运行核验 → 恢复 → 手工重启的真实演练；或
2. 跳过真实 profile 写入，以隔离验证作为操作 4 证据。

两种选择都不执行批量更新，也不触碰四个受保护插件。

## 隔离验证结果

执行时间：`2026-08-17`。命令 exit `0`，字面结果：

```text
result                   : PASS
liveProfileChanged       : false
dsh-notification disable : bundle index 9 -> -1
dsh-notification enable  : bundle index -1 -> 9
dsh-context pin          : ^0.7.3 -> 0.7.3
dsh-context update       : 0.7.3 -> 0.10.2, updateAvailable=true
protectionGuard          : protected package: dsh-codex-tools
driftGuard               : profile package drift
restore package SHA-256  : CC8B82C9C5AFB4C616484292A41E59CB5D6008FB74BF79ADEE138D61C7E0CCEE
restore lock SHA-256     : 6747E099BA23F07CB5D94D693D24DD0EA517B7AD2A3215DAC6E3DB42DE698131
restore patch SHA-256    : 803B183C9B487A26981FEEA690D22C942A8DE4899D6E671E03429763C949D354
```

真实 profile 在验证前后保持同一组哈希，未发生写入。

隔离回滚探针输出（exit `0`）：

```text
result              : ROLLBACK PASS
actionEngineRemoved : true
stateRestored       : true
profileChanged      : false
restored package    : 839F974F5FBA9CDD375F3B4B620F12A5EB59F8968C40A512023D37378722A173
restored README     : 435187229F5971910D323A7E77604CA5FB0245915F0096E26B27AB5AE1766ACB
restored STATE      : 90D3EDF3FA282452ABD9B89F80A58549FF42A6509BD277598AAFF7A3D542D80B
```
