# Composer 权限按钮侧栏状态同步验证记录

- 日期：2026-08-16（Asia/Shanghai）
- 主题：`dsh-maid-atelier-fix 0.2.3`
- 修改字段：权限按钮在右侧栏展开与收起时均保持图标模式

## 修改前

```text
open:      width=38px, label=none
collapsed: width=121.91667175292969px, label=block
```

右侧栏收起后按钮会展开为 `Workspace Write` 文本状态，与展开侧栏时的纯图标状态不一致。

## 修改后

```text
open:      width=38px height=36px padding-inline=0px label=none
collapsed: width=38px height=36px padding-inline=0px label=none
```

验收图：

- `evidence/acceptance-open-sidebar.jpg`
- `evidence/acceptance-collapsed-sidebar.jpg`

## 自动验证

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "E:\deepseek_harness\research\ui-audit\phase2-composer-permission-sync\verify.ps1"
```

字面输出与退出状态：

```text
CLIENT_NODE_CHECK_EXIT=0
THEME_VERSION=0.2.3
PERMISSION_ICON_ONLY_RULE=true
LAYOUT_STATE=open WIDTH=38 HEIGHT=36 PADDING=0px LABEL=none
LAYOUT_STATE=collapsed WIDTH=38 HEIGHT=36 PADDING=0px LABEL=none
SCREENSHOT=acceptance-open-sidebar.jpg DECODE=true SIZE=1280x720
SCREENSHOT=acceptance-collapsed-sidebar.jpg DECODE=true SIZE=1280x720
HTTP_STATUS=200
VERIFY_OK=true
UI_VERIFY_SCRIPT_EXIT=0
```

## 补丁与回滚

`change.patch` 与当前工作区反向检查通过：

```text
PATCH_REVERSE_CHECK_EXIT=0
PATCH_CURRENT_WORKTREE_MATCH=True
```

`rollback.ps1` 已在隔离副本执行，恢复三个角色并核对基线哈希：

```text
ROLLBACK_ROLE=theme-client SHA256=6a6d42d1a8f95b6a59bf49ae2cadba925edfd311ba91bdaaf2dfda23744817fc
ROLLBACK_ROLE=theme-package SHA256=75b7d901895920aa611541a4bb84c2f8791d91070732c5ed27801c9b9b8ab90f
ROLLBACK_ROLE=state SHA256=e3394215d1739c039820aedbb63b2d3fc5e343e11bb6458ec104e931b477a40a
ROLLBACK_OK=true
ROLLBACK_PROBE_EXIT=0
```

真实回滚入口：

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "E:\deepseek_harness\research\ui-audit\phase2-composer-permission-sync\rollback.ps1"
```

## 交付角色

- 修改产物：`modified/client.js`、`modified/package.json`、`modified/STATE.json`
- 补丁：`change.patch`
- 验证记录：`verification.md`
- 回滚：`rollback.ps1`
