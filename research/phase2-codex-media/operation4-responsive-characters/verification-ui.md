# Operation 4 verification — responsive background characters

- Verified at: `2026-08-16T22:09:43+08:00`
- Workspace: `E:\deepseek_harness`
- Theme package: `dsh-maid-atelier-fix@0.2.1`

## Root cause and changed field

`dsh-better-sidebar` updates `--dsh-sidebar-width` on every drag animation frame. The upstream skin positioned the right character with `right: clamp(320px, 24vw, 460px)`, so the character position was independent of the actual panel width.

The override now uses:

```css
right: calc(var(--dsh-sidebar-width, 0px) + clamp(0px, 0.5vw, 8px));
```

While `data-dsh-sidebar-dragging` is present, the character uses `transition: none` so it tracks the drag frame without delayed easing.

## Baseline and modified browser measurements

Read-only measurement shape:

```js
const right = document.querySelector('[data-maid-character="right"]');
({
  cssRight: getComputedStyle(right).right,
  sidebar: getComputedStyle(document.documentElement)
    .getPropertyValue('--dsh-sidebar-width').trim(),
  transition: getComputedStyle(right).transition
});
```

Baseline literal output, browser evaluation exit status `0`:

```text
sidebar=384px
character.cssRight=319.179px (settled value 320px)
binding=independent
```

Modified literal output, browser evaluation exit status `0`:

```text
sidebar=384px
character.cssRight=390.4px
clearance=6.4px
binding=384px + 6.4px
```

Drag-state literal output, browser evaluation exit status `0`:

```text
data-dsh-sidebar-dragging=true
character.transition=none
```

## Static verification

Commands and literal outputs:

```powershell
& 'C:\Program Files\nodejs\node.exe' --check 'themes\maid-atelier-fix\lib\client.js'
# CLIENT_CHECK_EXIT=0

& 'C:\Program Files\nodejs\node.exe' -e "JSON.parse(require('fs').readFileSync(process.argv[1],'utf8'))" 'themes\maid-atelier-fix\package.json'
# PACKAGE_CHECK_EXIT=0

git diff --check
# DIFF_CHECK_EXIT=0
```

## Artifacts

| Role | Path | SHA-256 |
|---|---|---|
| Baseline client | `original\client.js` | `bfd5cc754bb0f3f5174d5ea41c68f455ea4273dd4cb8af4a3912c809c852f00d` |
| Baseline package | `original\package.json` | `c7a0c928cbc03a3daf34111d05125a86bcd3699205959224781ff8457255453f` |
| Modified client | `E:\deepseek_harness\themes\maid-atelier-fix\lib\client.js` | `809fd96ed707cb0fa11c90b139cf1ab8dab73e9358bc2b73a36d5592dc077895` |
| Modified package | `E:\deepseek_harness\themes\maid-atelier-fix\package.json` | `c62576db06f4e3515a806b54c33ab74c3cad1b67b1ac3f917f22d5f61c883d83` |
| Acceptance image | `acceptance-responsive-character.png` | `74327230239b8c5dae1634e0dbed15a86646c2396318d8fb7ebdef88825e5091` |

- Modified artifact: `E:\deepseek_harness\themes\maid-atelier-fix`
- Patch: `E:\deepseek_harness\research\phase2-codex-media\operation4-responsive-characters\change.patch`
- Verification: `E:\deepseek_harness\research\phase2-codex-media\operation4-responsive-characters\verification-ui.md`
- Rollback: `E:\deepseek_harness\research\phase2-codex-media\operation4-responsive-characters\rollback.ps1`

Rollback probe command and literal output:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File 'E:\deepseek_harness\research\phase2-codex-media\operation4-responsive-characters\rollback.ps1' -WorkspaceRoot 'E:\deepseek_harness\research\phase2-codex-media\operation4-responsive-characters\rollback-probe'
# RESTORED=...\client.js SHA256=bfd5cc754bb0f3f5174d5ea41c68f455ea4273dd4cb8af4a3912c809c852f00d
# RESTORED=...\package.json SHA256=c7a0c928cbc03a3daf34111d05125a86bcd3699205959224781ff8457255453f
# ROLLBACK_STATUS=PASS
# ROLLBACK_EXIT=0
```

Patch correspondence: `git apply --check --reverse change.patch` → exit status `0`.

## Result

Machine gate: `PASS`. Desktop drag-feel checkpoint remains open for user acceptance.
