# dsh-plugin-control-center

DeepSeek Harness 的已安装插件管理视图。

- 入口：设置 → 插件 → 管理中心
- 读取：官方 Loader inventory、`dshmarket` 已安装/状态/更新接口、profile 文件哈希
- 写入边界：操作 3 只创建安全快照与动作计划，不修改 profile，不自动重启
- 保护包：本插件、`dshmarket`、`dsh-desktop-ui-compat`、`dsh-codex-tools`
- 预演入口：计划启停、更新、卸载与恢复；保护包的全部变更入口锁定

真实启停、更新和恢复演练留到阶段 3 操作 4，由用户逐项决定。
