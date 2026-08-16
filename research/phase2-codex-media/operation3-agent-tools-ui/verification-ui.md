# Operation 3 verification — settings paging and Agent tool inventory

- Verified at: `2026-08-16T21:59:55.6678836+08:00`
- Workspace: `E:\deepseek_harness`
- Theme package: `dsh-maid-atelier-fix@0.2.0`
- Runtime URL: `http://127.0.0.1:3080/`

## Changed behavior

1. The settings content column is now height-constrained; the option pane owns the vertical scrollbar instead of expanding beyond the dialog.
2. A new `Agent 工具` settings page shows the selected session's latest request-visible tools and the Harness runtime registry.
3. Runtime tool schemas are exposed read-only at `/__maid-atelier-fix/agent-tools`; no tool execution route is added.

## Baseline and modified UI probe

Command shape (in-app browser evaluation):

```js
const el = document.querySelector("[data-dsh-settings-options='true']");
({ clientHeight: el.clientHeight, scrollHeight: el.scrollHeight,
   overflowY: getComputedStyle(el).overflowY });
```

Baseline literal output, exit status `0`:

```text
clientHeight=5745 scrollHeight=5745 overflowY=auto
```

Modified literal outputs, exit status `0`:

```text
Agent 工具: clientHeight=608 scrollHeight=1605 overflowY=auto
插件 > 插件列表: clientHeight=608 scrollHeight=5681 overflowY=auto
```

The modified pane has a fixed viewport and a larger scroll height on both pages, so wheel/trackpad paging is active. Navigation selection was also verified between `Agent 工具` and `插件 > 插件列表`.

## Static and live runtime verification

Commands:

```powershell
& 'C:\Program Files\nodejs\node.exe' --check 'themes\maid-atelier-fix\lib\client.js'
& 'C:\Program Files\nodejs\node.exe' --check 'themes\maid-atelier-fix\lib\index.js'
& 'C:\Program Files\nodejs\node.exe' -e "JSON.parse(require('fs').readFileSync(process.argv[1],'utf8')); console.log('PACKAGE_JSON=PASS')" 'themes\maid-atelier-fix\package.json'
$root = Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:3080/' -TimeoutSec 10
$catalog = Invoke-RestMethod -Uri 'http://127.0.0.1:3080/__maid-atelier-fix/agent-tools' -TimeoutSec 10
```

Literal output and exit status:

```text
CLIENT_CHECK_EXIT=0
HOST_CHECK_EXIT=0
PACKAGE_JSON=PASS
PACKAGE_CHECK_EXIT=0
ROOT_HTTP=200
CATALOG_REVISION=54
CATALOG_COUNT=5
TOOL_IMAGE_GEN=True
TOOL_IMAGE_VISION=True
TOOL_WEB_SEARCH=True
COMMAND_EXIT=0
```

Live page output after searching `image_`, browser evaluation exit status `0`:

```text
Agent 工具
最近请求可见工具 + Harness 运行时已注册工具
30 个工具
最近请求 28
运行时 5
Code Mode
seq 573
image_gen (运行时)
image_vision (运行时)
```

Acceptance image:

`E:\deepseek_harness\research\phase2-codex-media\operation3-agent-tools-ui\acceptance-agent-tools.png`

SHA-256: `5965d9a0688901818f69024243e8b46f8d8f885c479630b6069a7f42e388db60`

## Artifact hashes

| Role | Path | SHA-256 |
|---|---|---|
| Baseline client | `original\client.js` | `22bc8abd70d3d6a06bd131f6f5d29fb23e7a4a246961c223ad80021cf994b1f5` |
| Baseline host | `original\index.js` | `61e5ea3f442afb4842d8356b475b6edb95e6583111e0849dc0b69a5898984249` |
| Baseline package | `original\package.json` | `0d2e3169fa8e2842a70cd736765c89cc2bfe1276f659fc4a2073c74c8f043830` |
| Modified client | `E:\deepseek_harness\themes\maid-atelier-fix\lib\client.js` | `bfd5cc754bb0f3f5174d5ea41c68f455ea4273dd4cb8af4a3912c809c852f00d` |
| Modified host | `E:\deepseek_harness\themes\maid-atelier-fix\lib\index.js` | `e3d24d6954cf54f59ce65bb2f28c4049e44b70d4c608a06db6dd6486cec08984` |
| Modified package | `E:\deepseek_harness\themes\maid-atelier-fix\package.json` | `c7a0c928cbc03a3daf34111d05125a86bcd3699205959224781ff8457255453f` |

## Patch and rollback

- Reviewable patch: `E:\deepseek_harness\research\phase2-codex-media\operation3-agent-tools-ui\change.patch`
- Runnable rollback: `E:\deepseek_harness\research\phase2-codex-media\operation3-agent-tools-ui\rollback.ps1`

Rollback probe command:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File 'E:\deepseek_harness\research\phase2-codex-media\operation3-agent-tools-ui\rollback.ps1' -WorkspaceRoot 'E:\deepseek_harness\research\phase2-codex-media\operation3-agent-tools-ui\rollback-probe'
```

Literal output and exit status:

```text
RESTORED=...\client.js SHA256=22bc8abd70d3d6a06bd131f6f5d29fb23e7a4a246961c223ad80021cf994b1f5
RESTORED=...\index.js SHA256=61e5ea3f442afb4842d8356b475b6edb95e6583111e0849dc0b69a5898984249
RESTORED=...\package.json SHA256=0d2e3169fa8e2842a70cd736765c89cc2bfe1276f659fc4a2073c74c8f043830
ROLLBACK_STATUS=PASS
ROLLBACK_EXIT=0
```

## Result

Machine gate: `PASS`. Manual checkpoint remains open for the desktop window.
