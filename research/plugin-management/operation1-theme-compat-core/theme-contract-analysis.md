# DSH 主题兼容契约与迁移结果

## 核对结论

当前 DSH rc.6 已提供可供插件统一接入的主题层，不需要让每个主题重复实现设置、编辑器、侧栏和运行状态逻辑：

1. `ThemeRuntime` 是主题状态唯一来源，读取使用 `getTheme()`，持续同步使用 `theme/change`。
2. 第三方主题通过 `register(definition)` 注册主题；局部语义色修改通过 `overrideTokens(source, tokens)` 叠加。
3. 功能插件应消费 `--dsw-*` / `--dsw-alias-*` 语义令牌，不应判断某个主题 ID，也不应直接判断 `data-ds-dark-theme`。
4. 主题插件仍可使用自身 `body[data-*]` 属性和 `apply/dispose` 管理专属图片、人物、装饰和局部外观；这些规则必须随属性或 disposer 一起退出。

本机核对来源：

- `@deepseek-ai/dsh-client-ui-theme/lib/types/client/index.d.ts`
- `@deepseek-ai/dsh-client-ui-theme/README.zh.md`
- 官方文档：<https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/web-styling.md>
- 社区皮肤开发约定：<https://github.com/zhu1090093659/dsh-web-ui/blob/main/.dsh/skills/skin-developer/SKILL.md>

## 已执行的归属拆分

### 通用核心：`dsh-desktop-ui-compat`

统一拥有以下与主题无关的行为：

- 设置页面结构、滚动与导航；
- Agent 工具列表和 `/__dsh-desktop-ui-compat/agent-tools` 数据入口；
- 顶部运行状态与无文字阴影约束；
- 编辑器输入区、权限按钮、模型选择布局；
- 左右侧栏响应式宽度与主对话区联动；
- 监听官方 `theme/change`，记录当前主题 ID/修订号用于诊断；
- 所有样式由 `body[data-dsh-ui-compat]` 限定，并只消费语义令牌。

### Maid 适配层：`dsh-maid-atelier-fix`

只保留以下主题专属职责：

- Maid 轻色外观覆盖；
- 左右人物随侧栏实时宽度联动；
- 所有可见规则由 `body[data-dsh-maid-atelier]` 限定；
- 不再注册 Agent 工具路由，不再安装设置、编辑器、运行状态和通用侧栏控制器。

## 兼容边界

- 切换到其他主题时，通用功能继续存在并自动使用新主题的语义令牌。
- Maid 属性退出后，Maid 专属规则不再命中；人物 DOM 的创建/销毁仍由 Maid 原主题插件负责。
- 其他主题若使用官方语义令牌，无需再维护本项目功能代码。
- 其他主题若直接硬编码全局选择器或 `!important` 颜色，仍需在该主题自身适配层修正，通用核心不会识别具体主题名称。

## 人工验收矩阵

依次切换“默认主题 → Maid Atelier → 任一其他社区主题”，每次只检查以下五项：

1. 设置页可滚动，Agent 工具可展开；
2. 顶部运行状态文字清晰且无阴影/描边；
3. 编辑器输入区高度、权限按钮和模型选择尺寸正常；
4. 右侧栏拖拽超过半屏时面板与对话区同步，面板不冻结；
5. Maid 人物只在 Maid 主题出现，并随左右侧栏移动；切走后无 Maid 外观残留。
