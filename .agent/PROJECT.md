# DeepSeek Harness Desktop 项目简报

- 当前目标：保留阶段 1 已验收 UI，执行阶段 2 的 Codex 登录额度视觉识别与图片生成插件入口。
- 非目标：本阶段不重做 UI，不展开完整插件管理中心，不切换到独立 API Key 计费。
- 可写范围：`E:\deepseek_harness`；插件试装时仅修改 `C:\Users\19739\.dsh` 的 web profile，并先备份。
- 验收：真实读图、真实生图、DSH 工具轨迹、登录额度路径、插件清单差异、卸载与恢复均有证据。
- 需暂停确认：不可逆生产变更、破坏性数据操作、获取新的凭据。

## 阶段 1 核对

- 用户界面逐项验收完成。
- 最终修正覆盖运行状况文字特效与右侧栏超过 50% 后的拖拽同步。
- 生产脚本语法、HTTP、补丁重放、产物重开和隔离回滚均已有 PASS 记录。
- DSH 插件清单和启动 revision 属于可变运行态；阶段 2 开始时重新采集，不把旧哈希当作失败。

## 阶段 2 启动入口

1. 重新导出当前 web profile 插件清单、版本与配置哈希。
2. 实时审阅 `dsh-codex-tools`、`dsh-plugin-codex`、`dsh-codex-connect`。
3. 优先选择同时覆盖 `image_vision` 与 `image_gen`、且明确复用 Codex/ChatGPT OAuth 的单一插件。
4. 备份后试装，执行真实图片端到端验证。
5. 验证卸载/回滚与阶段 1 UI 回归。
