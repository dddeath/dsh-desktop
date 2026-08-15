# DeepSeek Harness Desktop (dsh-desktop)

Native desktop shell for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness): it wraps the official `dsh web` GUI in an Electron window. All official and community plugins work exactly as in the browser.

## Usage

```cmd
npm start
```

Or double-click `..\启动桌面端.cmd` (one level up).

- If a DSH Web server is already running on `127.0.0.1:3080`, the app **attaches** to it (no second server).
- Otherwise it starts `dsh web` itself, hidden, and opens a window on the printed URL.
- **Harness → Restart Harness (dsh web)** (`Ctrl+Shift+R`): stops whichever server is running and starts a fresh one — the way to activate newly installed plugins.
- **File → Open in Browser**: same GUI in your default browser.
- On quit, the app stops only the server it started. A server it attached to (or `DSH_DESKTOP_KEEP_RUNNING=1`) stays alive.

## Environment

- `DSH_BIN` — path to the dsh launcher (default: `dsh.cmd` / `dsh` from PATH)
- `DSH_DESKTOP_KEEP_RUNNING=1` — never kill the server on quit

## Notes

- Requires Node.js and an installed `dsh` CLI (`npm i -g @deepseek-ai/dsh`).
- Window bounds persist under Electron's `userData` dir (`window-state.json`).
- External links open in the system browser; navigation is pinned to the DSH server origin.
