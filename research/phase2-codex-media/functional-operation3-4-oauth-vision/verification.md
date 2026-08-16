# OAuth 与视觉识别验证记录

完成时间：2026-08-16T14:21:57.8790286Z
输入图片：E:\deepseek_harness\research\phase2-codex-media\operation5-left-character-sync\acceptance-left-character.png
输入 SHA-256：a28e6ca1a5fbee9fdf32ce2c7407b25356981f46d8207c13ade0ec137824e29a
原始状态 SHA-256：24635525a3788e50e37ad7a195204bc023ab84b3923035c221fac1fca39203d7
更新状态 SHA-256：8d06d2f695b98836e201f8fb363d25c869f4e68881e6a11c0207fcd8052a7336
令牌内容：未记录

## 基线命令与字面输出

命令：
& 'C:\Users\19739\AppData\Local\OpenAI\Codex\bin\8e8bf206e63ac436\codex.exe' login status

输出：
Logged in using ChatGPT
LOGIN_STATUS_EXIT=0
OPENAI_API_KEY_PRESENT=False
CODEX_ACCESS_TOKEN_PRESENT=False
CODEX_REFRESH_TOKEN_PRESENT=False

退出状态：0

## 功能命令、输入与字面输出

命令：
VG_IMAGE=research/phase2-codex-media/operation5-left-character-sync/acceptance-left-character.png
VG_QUESTION=请识别截图中的桌面应用界面，重点描述左右背景人物、侧边栏、中央对话区域和可见文字。
& 'C:\Program Files\nodejs\node.exe' 'C:\Users\19739\.dsh\profiles\web\node_modules\dsh-codex-tools\scripts\codex-vision.mjs'

输入：research/phase2-codex-media/operation5-left-character-sync/acceptance-left-character.png

字面结果摘要：
ok=true
model=gpt-5.5
image=research/phase2-codex-media/operation5-left-character-sync/acceptance-left-character.png
exit_status=0
parseable=true

退出状态：0
完整识别结果：evidence/vision-result.json

## 判定

OAuth 机器门：通过；CLI 报告 ChatGPT 登录态，显式 API Key/token 环境变量为空。
视觉机器门：通过；工具退出 0，JSON 可解析，无路径错误。
人工门 D：待用户核对主体、文字、布局与细节。

## 完整字面输出

完整 stdout：evidence/vision-stdout.txt
结构化结果：evidence/vision-result.json
两者均已重新打开并通过 JSON/文本读取验证。

## 隔离回滚探针

命令：
powershell.exe -NoProfile -ExecutionPolicy Bypass -File rollback.ps1 -TargetState evidence/rollback-probe-state.json

字面输出：
ROLLBACK_SHA256=24635525a3788e50e37ad7a195204bc023ab84b3923035c221fac1fca39203d7
ROLLBACK_EXIT=0
EXPECTED_SHA256=24635525a3788e50e37ad7a195204bc023ab84b3923035c221fac1fca39203d7
ACTUAL_SHA256=24635525a3788e50e37ad7a195204bc023ab84b3923035c221fac1fca39203d7

判定：隔离目标恢复为原始状态，实际工作区状态保持更新版本。