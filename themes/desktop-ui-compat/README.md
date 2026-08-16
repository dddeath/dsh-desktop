# dsh-desktop-ui-compat

DSH desktop theme-neutral capability layer. It owns responsive panel behavior,
composer semantics, runtime status, settings navigation and the Agent tool
inventory. Visual skins remain separate adapters and may override semantic
tokens without owning these behaviors.

The client stylesheet is scoped by `body[data-dsh-ui-compat]` and consumes
DSH `--dsw-alias-*` tokens. It does not select a concrete skin or branch on
`data-ds-dark-theme`.

The client subscribes to the official `theme/change` event and records the
active theme id/revision only for diagnostics. Theme presentation remains the
responsibility of ThemeRuntime and the official layout presenter.

Install through the Web profile:

```powershell
dsh plugin --profile web add link:E:/deepseek_harness/themes/desktop-ui-compat
```
