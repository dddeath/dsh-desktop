# 阶段 2 操作 6：持久化与恢复验收记录

验证时间：2026-08-17（Asia/Shanghai）

## 1. 当前结论

- 桌面端重启后，`dsh-codex-tools@1.0.1` 仍在 web profile 的 13 个依赖中。
- 插件当前快照共 11 个文件，关键修复文件哈希与运行目录一致。
- `image_gen`、`image_vision`、`web_search` 的工具注册源码均存在。
- profile 中独立 API Key 配置引用数为 0。
- Codex OAuth 文件及访问/刷新字段存在；证据只记录布尔元数据，不记录令牌值。
- 工作区生成图片仍可读取，SHA-256 与生成时一致。
- 重建后的桌面进程共 4 个，DSH HTTP 返回 200。
- 自动门禁已通过；人工门 F 等待“保留当前方案”或“执行一次卸载并精确恢复”的决定。

## 2. 当前快照

profile：`C:\Users\19739\.dsh\profiles\web`

```text
package.json
sha256=d80c87fb1ab16f477fa884a8ec90a81654ccf75570fca3be97f80f60b1abdf43

pnpm-lock.yaml
sha256=c19a73c0d031d750d115f4cdd91d94678325eddb42cfa9e43b15969c4fde63b9
```

插件快照：`current-plugin/`

profile 快照：`current-profile/`

归档：`artifacts/current-profile-plugin-snapshot.zip`

```text
SNAPSHOT_BYTES=35977
SNAPSHOT_SHA256=b32dc06d8d64aebe6bcf02e7899215b51c5e4112034f289a1051c79fb15583d7
ARCHIVE_PLUGIN_FILES=11
ARCHIVE_REOPEN_OK=True
```

归档重开输出：`evidence/archive-probe-output.txt`

## 3. 持久化验证命令与原样输出

命令：

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File E:\deepseek_harness\research\phase2-codex-media\functional-operation9-persistence-recovery-final\verify-current.ps1
```

退出状态：`0`

```text
PROFILE_ROLE=package.json SHA256=d80c87fb1ab16f477fa884a8ec90a81654ccf75570fca3be97f80f60b1abdf43
PROFILE_ROLE=pnpm-lock.yaml SHA256=c19a73c0d031d750d115f4cdd91d94678325eddb42cfa9e43b15969c4fde63b9
PLUGIN_SNAPSHOT_FILES=11
TOOL_SOURCE_PRESENT=image_gen
TOOL_SOURCE_PRESENT=image_vision
TOOL_SOURCE_PRESENT=web_search
PLUGIN_LISTED=dsh-codex-tools@1.0.1
PROFILE_API_KEY_REFERENCE_COUNT=0
CODEX_AUTH_FIELDS_PRESENT=true
AUTH_VALUES_RECORDED=false
PERSISTED_IMAGE=E:\deepseek_workspace\pro1\output\imagegen\1786892171127.png SHA256=9a0fdff8892c73c49b5e694d9b737826bc7b06ee5ed051ec624f112c3fb4f454
RUNNING_PROCESS_COUNT=4
HTTP_STATUS=200
PERSISTENCE_OK=true
VERIFY_CURRENT_EXIT=0
```

完整输出：`evidence/verify-current-output.txt`

## 4. 卸载入口

干跑命令：

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File E:\deepseek_harness\research\phase2-codex-media\functional-operation9-persistence-recovery-final\uninstall-current.ps1
```

```text
UNINSTALL_COMMAND=dsh.cmd plugin --profile web remove dsh-codex-tools
UNINSTALL_EXECUTED=false
UNINSTALL_DRY_RUN_OK=true
UNINSTALL_DRY_RUN_EXIT=0
```

人工选择执行卸载时使用：

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File E:\deepseek_harness\research\phase2-codex-media\functional-operation9-persistence-recovery-final\uninstall-current.ps1 -Execute
```

脚本先核对当前 11 个插件文件的哈希，仅对预期的 `dsh-codex-tools` 执行包管理器移除。

## 5. 精确恢复入口

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File E:\deepseek_harness\research\phase2-codex-media\functional-operation9-persistence-recovery-final\restore-current.ps1
```

恢复脚本安装 `dsh-codex-tools@1.0.1`，随后恢复当前 profile 清单和 11 个已修复插件文件并逐一校验 SHA-256。

隔离恢复探针：

```text
PACKAGE_MANAGER_EXECUTED=False
RESTORED_PLUGIN_FILES=11
RESTART_REQUIRED=true
RESTORE_OK=true
RESTORE_PROBE_EXIT=0
```

完整输出：`evidence/restore-probe-output.txt`

## 6. 状态补丁与回滚

补丁：`change.patch`

```text
PATCH_CHECK_EXIT=0
PATCH_APPLY_EXIT=0
PATCH_STATE_MATCH=True
PATCH_PROBE_OK=True
```

补丁探针：`evidence/patch-probe-output.txt`

状态回滚：

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File E:\deepseek_harness\research\phase2-codex-media\functional-operation9-persistence-recovery-final\rollback-state.ps1
```

```text
STATE_ROLLBACK_OK=true
STATE_ROLLBACK_EXIT=0
```

## 7. 人工门 F

### A. 保留当前方案（推荐）

- 保留 `dsh-codex-tools@1.0.1`、OAuth 路径和已验证修复。
- 将阶段 2 标记完成，进入阶段 3 插件结构与管理优化。

### B. 执行卸载与恢复演练

- 运行带 `-Execute` 的卸载脚本。
- 重启并确认插件入口消失。
- 运行恢复脚本，重启并确认插件、工具和 OAuth 路径恢复。
- 完成后将阶段 2 标记完成。

## 8. 四个交付角色

1. 当前方案快照：`current-profile/`、`current-plugin/`、`artifacts/current-profile-plugin-snapshot.zip`
2. 状态补丁：`change.patch`
3. 验证记录：`verification.md` 与 `evidence/`
4. 恢复与回滚：`restore-current.ps1`、`rollback-state.ps1`
