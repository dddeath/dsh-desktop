# Operation 5 verification — left character/sidebar synchronization

- Verified at: `2026-08-16T22:14:34+08:00`
- Theme: `dsh-maid-atelier-fix@0.2.2`

## Changed branch/field

The left character now uses `--dsh-left-sidebar-width`, maintained by an independent `ResizeObserver` on the core layout's direct `sidebarCol`. During a `data-side="sidebar"` drag, `data-dsh-left-sidebar-dragging="true"` disables the character's `translate` transition.

## Baseline

The upstream skin used its own `--maid-sidebar-width` observer and retained this transition during the core sidebar drag:

```text
translate 0.62s cubic-bezier(0.22, 0.78, 0.2, 1)
```

## Modified live measurement

Read-only browser evaluation, exit status `0`:

```text
sidebar.width=280px
--dsh-left-sidebar-width=280px
character.translate=280px
data-dsh-left-sidebar-dragging=false
```

Drag-state browser evaluation, exit status `0`:

```text
frame[data-dragging]=true
data-dsh-left-sidebar-dragging=true
character.transition=none
```

Static commands and literal outputs:

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
| Baseline client | `original\client.js` | `809fd96ed707cb0fa11c90b139cf1ab8dab73e9358bc2b73a36d5592dc077895` |
| Baseline package | `original\package.json` | `c62576db06f4e3515a806b54c33ab74c3cad1b67b1ac3f917f22d5f61c883d83` |
| Modified client | `E:\deepseek_harness\themes\maid-atelier-fix\lib\client.js` | `6a6d42d1a8f95b6a59bf49ae2cadba925edfd311ba91bdaaf2dfda23744817fc` |
| Modified package | `E:\deepseek_harness\themes\maid-atelier-fix\package.json` | `75b7d901895920aa611541a4bb84c2f8791d91070732c5ed27801c9b9b8ab90f` |
| Acceptance image | `acceptance-left-character.png` | `a28e6ca1a5fbee9fdf32ce2c7407b25356981f46d8207c13ade0ec137824e29a` |

- Modified artifact: `E:\deepseek_harness\themes\maid-atelier-fix`
- Patch: `E:\deepseek_harness\research\phase2-codex-media\operation5-left-character-sync\change.patch`
- Verification: `E:\deepseek_harness\research\phase2-codex-media\operation5-left-character-sync\verification-ui.md`
- Rollback: `E:\deepseek_harness\research\phase2-codex-media\operation5-left-character-sync\rollback.ps1`

Rollback probe:

```text
RESTORED=...\client.js SHA256=809fd96ed707cb0fa11c90b139cf1ab8dab73e9358bc2b73a36d5592dc077895
RESTORED=...\package.json SHA256=c62576db06f4e3515a806b54c33ab74c3cad1b67b1ac3f917f22d5f61c883d83
ROLLBACK_STATUS=PASS
ROLLBACK_EXIT=0
PATCH_REVERSE_CHECK_EXIT=0
```

Machine gate: `PASS`; manual continuous-drag checkpoint remains pending.
