# 插件管理中心视觉与社区插件定制验证

## 修改范围

- 插件：`dsh-plugin-control-center 0.1.1`
- 状态标签：统一为 28px 高、9px 圆角、单行居中；状态标签设置统一最小宽度。
- 详情按钮：卡片标题区固定预留 68px 列，按钮固定 68 × 38px，禁止文字换行。
- 展开详情：统一边框、圆角、内边距和浅色背景。
- 维护方式：详情明确区分“市场托管”和“本地工作区维护”。

## 市场冲突结论

当前 `dsh-better-sidebar` 为 `^0.12.2`（已安装 0.12.2）。dshmarket 1.5.0 更新 npm 插件时重新执行包安装，不合并安装目录中的手工修改。UI/DOM 适配继续放在独立兼容插件；内部行为修改使用 Git fork + `link:`。

完整方案：`E:\deepseek_harness\research\plugin-management\operation6-control-center-visual-community-customization\community-plugin-customization.md`。

## 自动验证

```text
node --check client.js          : exit 0
verify.mjs                      : exit 0, PASS
served client HTTP             : 200
original client SHA-256        : 386D19B7B44CBDD176C6D3D18245AC6B913F656C7E4A8EB4AF4780F481201BD0
modified client SHA-256        : FFA840ACE96B1127EB61254BB719E3D53129DABA8F5E3EF5CB9A989CAC889359
profile package SHA-256        : 9A9DFD65830D2B148E289B8F5A7813009E78EF6C5BF05FD157B74A455E6A6FBD
profile changed                : false
rollback probe                 : PASS, exit 0
```

## 交付角色

- 修改态：`E:\deepseek_harness\research\plugin-management\operation6-control-center-visual-community-customization\modified\plugin-control-center`
- 差异：`E:\deepseek_harness\research\plugin-management\operation6-control-center-visual-community-customization\change.patch`
- 验证：`E:\deepseek_harness\research\plugin-management\operation6-control-center-visual-community-customization\verification.json`
- 回滚：`E:\deepseek_harness\research\plugin-management\operation6-control-center-visual-community-customization\rollback.ps1`

## 人工验收

刷新或重启 Harness 后进入“设置 → 插件 → 管理中心”：

1. 比较长名称与短名称卡片，“详情/收起”按钮应保持相同尺寸和单行显示。
2. “运行中、待重启、分类、敏感度、可更新”等标签高度和圆角应一致。
3. 展开市场插件与本地链接插件，详情面板样式应一致，“维护方式”文字应分别正确。
