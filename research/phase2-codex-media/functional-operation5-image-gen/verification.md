# 图片生成验证记录

完成时间：2026-08-16T14:32:02.3333268Z
工具：image_gen
模型：gpt-5.5
提示词文件：prompt.txt
输出图片：E:\deepseek_harness\research\phase2-codex-media\functional-operation5-image-gen\generated\dsh-maid-whale.png
图片 SHA-256：ea4c5eb4c8d80d316b97b8ae6bc5d0ca5414b1da4f8790c44e576371d4c88577
图片字节数：2375371
授权哈希调用前后：b915374d71b3131183816d220bf4c1baa56602d91d03c1943bed488d2584373c
令牌内容：未记录

## 基线状态

命令：
Get-FileHash -Algorithm SHA256 original/STATE.json

字面输出：
8d06d2f695b98836e201f8fb363d25c869f4e68881e6a11c0207fcd8052a7336

退出状态：0

## 生成命令与输入

命令：
CG_PROMPT=<prompt.txt 内容>
CG_OUT=research/phase2-codex-media/functional-operation5-image-gen/generated/dsh-maid-whale.png
CG_SIZE=1024x1024
CG_FORMAT=png
CG_MODEL=gpt-5.5
node C:\Users\19739\.dsh\profiles\web\node_modules\dsh-codex-tools\scripts\codex-imagegen.mjs

完整字面输出：evidence/generation-result.txt
退出状态：0

## 解码验证

命令：
System.Drawing.Image.FromFile(E:\deepseek_harness\research\phase2-codex-media\functional-operation5-image-gen\generated\dsh-maid-whale.png)

字面输出：
IMAGE_WIDTH=1254
IMAGE_HEIGHT=1254
IMAGE_FORMAT=PNG
IMAGE_BYTES=2375371
IMAGE_SHA256=ea4c5eb4c8d80d316b97b8ae6bc5d0ca5414b1da4f8790c44e576371d4c88577

退出状态：0

## 判定

工具调用完成、文件存在、PNG 可解码，机器门通过。
请求尺寸为 1024x1024，实际尺寸为 1254x1254，size_match=false。
人工门 E 待核对：提示词遵循度、画面质量、DSH 内展示效果及尺寸差异。
更新状态 SHA-256：ca37940df5de8efd262a9925c0f79d128e6235318cccf1120613fbfdf0cdf3b4
## 隔离回滚探针

命令：
powershell.exe -NoProfile -ExecutionPolicy Bypass -File rollback.ps1 -TargetState evidence/rollback-probe-state.json -TargetImage evidence/rollback-probe-image.png

字面输出见：evidence/rollback-probe.txt

判定：状态恢复为原始哈希，探针图片已删除，实际生成图与工作状态保持不变。
