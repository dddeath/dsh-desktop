# DSH 桌面图标替换最终验证记录

验证日期：2026-08-17（Asia/Shanghai）

## 1. 对象与变更

- 用户指定源图：`E:\deepseek_workspace\pro1\output\imagegen\1786892171127.png`
- 源图快照：`source/1786892171127.png`
- 源图：`1254x1254`、RGBA、透明通道范围 `0..255`
- 源图 SHA-256：`9a0fdff8892c73c49b5e694d9b737826bc7b06ee5ed051ec624f112c3fb4f454`
- 运行时图标字段：`desktop/main.js` → `assets/icon.png`
- Windows 打包图标字段：`desktop/package.json` → `assets/icon.ico`

修改后：

```text
desktop/assets/icon.png  256x256 RGBA
SHA256=408b1d493f8faad7651b784340c11c85a3d703c006efadfec7bee433ce5227db

desktop/assets/icon.ico  16,24,32,48,64,128,256 px
SHA256=c8373cffbc401eb3853414afba3e0baa8dd699301bb5ab53540ea2231f5334ac
```

## 2. 基线与修改后行为

基线图标哈希：

```text
icon.png=4410c056f635b5f640cf74ce57c94b993516a34da2eced9938192acd4c473035
icon.ico=ece5e0f0af2c5d6544e9745a1dc985e6cebf0ef2b30b9b99af0060e0c040e825
```

修改前行为：源码、窗口和 Windows 包使用原有鲸鱼图标。

修改后行为：源码窗口图标、便携包、NSIS 安装包及 `dist-status` 运行版本均使用用户指定图像。

## 3. 图标生成命令与输出

命令：

```powershell
C:\Users\19739\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe research\phase2-codex-media\functional-operation8-desktop-icon-update\build-icons.py research\phase2-codex-media\functional-operation8-desktop-icon-update\source\1786892171127.png desktop\assets\icon.png desktop\assets\icon.ico
```

退出状态：`0`

```text
SOURCE_SIZE=1254x1254
PNG_SIZE=256x256
PNG_SHA256=408b1d493f8faad7651b784340c11c85a3d703c006efadfec7bee433ce5227db
ICO_SIZES=16x16,24x24,32x32,48x48,64x64,128x128,256x256
ICO_SHA256=c8373cffbc401eb3853414afba3e0baa8dd699301bb5ab53540ea2231f5334ac
ICON_BUILD_OK=true
ICON_BUILD_EXIT=0
```

完整输出：`evidence/icon-build-output.txt`

## 4. 桌面包重建

默认 portable + NSIS：

```powershell
desktop\node_modules\.bin\electron-builder.cmd --win
```

退出状态：`0`；完整日志：`evidence/builder-dist.log`

当前运行用 `dist-status` portable：

```powershell
desktop\node_modules\.bin\electron-builder.cmd --win portable --config.directories.output=dist-status
```

退出状态：`0`；完整日志：`evidence/builder-dist-status.log`

产物：

```text
desktop/dist/DeepSeek-Harness-Desktop-0.1.0-portable.exe
  bytes=84562363
  sha256=ef50633b4cb850739e0335183768fdb87fd32b9b24de5a9b34595ab432645776
desktop/dist/DeepSeek-Harness-Desktop-Setup-0.1.0.exe
  bytes=84989560
  sha256=8c00d8d50e1231a30a76ee46a2a8085ad30a399f90d9e528d96fd8ddd9d968a7
desktop/dist-status/DeepSeek-Harness-Desktop-0.1.0-portable.exe
  bytes=84562362
  sha256=61ae345f64b484cccfee828dbdfd7b0b7184f4bc6ff364109003287d91148ea1
desktop/dist-status/win-unpacked/DeepSeek Harness Desktop.exe
  bytes=204705792
  sha256=7357148432b61cde8f2ef0e5da674789ea353e3af3afd724e3e80fb75aaca408
```

## 5. 最终验证命令与原样输出

命令：

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File E:\deepseek_harness\research\phase2-codex-media\functional-operation8-desktop-icon-update\verify.ps1
```

退出状态：`0`

```text
MODIFIED_ROLE=icon-png SHA256=408b1d493f8faad7651b784340c11c85a3d703c006efadfec7bee433ce5227db
MODIFIED_ROLE=icon-ico SHA256=c8373cffbc401eb3853414afba3e0baa8dd699301bb5ab53540ea2231f5334ac
MODIFIED_ROLE=state SHA256=d8aa9c31193f3e574fac239f73761f08487a7b5b7c054cd8235d8453955cfe4a
SOURCE_SIZE=1254x1254
SOURCE_ALPHA=0..255
PNG_SIZE=256x256
PNG_MODE=RGBA
ICO_SIZES=16x16,24x24,32x32,48x48,64x64,128x128,256x256
EXE_ICON_SIZE=32x32
EXE_ICON_PIXEL_MATCH=true
ICON_METADATA_OK=true
CONFIG_RUNTIME_ICON=assets/icon.png
CONFIG_PACKAGE_ICON=assets/icon.ico
RUNNING_PROCESS_COUNT=4
HTTP_STATUS=200
VERIFY_OK=true
VERIFY_SCRIPT_EXIT=0
```

从重建 EXE 提取的关联图标：`evidence/exe-associated-icon.png`；其 32px 像素与新 ICO 的 32px 帧完全一致。

完整输出：`evidence/verify-output.txt`

实际桌面窗口检查：

```text
WINDOW_TITLE=深海女仆工坊 · DeepSeek Harness
WINDOW_APP=process:E:\deepseek_harness\desktop\dist-status\win-unpacked\DeepSeek Harness Desktop.exe
COMPUTER_USE_WINDOW_CHECK=true
RUNNING_PROCESS_COUNT=4
HTTP_STATUS=200
```

记录：`evidence/runtime-window-check.txt`

## 6. 补丁与回滚验证

二进制补丁命令：

```powershell
git apply --whitespace=nowarn --check --directory=research/phase2-codex-media/functional-operation8-desktop-icon-update/evidence/patch-probe-20260817004919 research/phase2-codex-media/functional-operation8-desktop-icon-update/change.patch
git apply --whitespace=nowarn --directory=research/phase2-codex-media/functional-operation8-desktop-icon-update/evidence/patch-probe-20260817004919 research/phase2-codex-media/functional-operation8-desktop-icon-update/change.patch
```

```text
PATCH_CHECK_EXIT=0
PATCH_APPLY_EXIT=0
PATCH_MATCH_icon-png=True
PATCH_MATCH_icon-ico=True
PATCH_MATCH_state=True
PATCH_PROBE_OK=True
```

回滚探针：

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File rollback.ps1 -AssetRoot <PROBE_ASSETS> -StateTarget <PROBE_STATE>
```

```text
REBUILD_PERFORMED=False
RESTART_REQUIRED=true
ROLLBACK_OK=true
ROLLBACK_SCRIPT_EXIT=0
```

真实回滚并重建命令：

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File E:\deepseek_harness\research\phase2-codex-media\functional-operation8-desktop-icon-update\rollback.ps1 -Rebuild
```

## 7. 四个交付角色

1. 修改后资源：`modified/`，并已写入 `desktop/assets/`
2. 可应用补丁：`change.patch`
3. 验证记录：`verification.md` 与 `evidence/`
4. 可执行回滚：`rollback.ps1`
