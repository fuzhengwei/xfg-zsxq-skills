---
name: xfg-zsxq-skills
description: "知识星球自动发帖技能。当你需要向小傅哥的知识星球发布内容时使用。触发词：'知识星球'、'发帖'、'发星球'、'zsxq'、'发布到星球'。自动读取 ~/.xfg-zsxq/groups.json 配置。"
author: xiaofuge
license: MIT
triggers:
  - "知识星球"
  - "发帖"
  - "发星球"
  - "zsxq"
  - "发布到星球"
  - "发文章到星球"
  - "发内容到星球"
metadata:
  openclaw:
    emoji: "📝"
---

# 知识星球发帖技能

自动向小傅哥的知识星球发布内容。**自动读取配置文件，无需手动提供参数。**

## ⚡ 自动配置（推荐）

配置文件位置：`~/.xfg-zsxq/groups.json`

**首次配置（只需一次）：**

```bash
# 添加星球配置
node scripts/zsxq.js config add \
  --url "https://wx.zsxq.com/group/你的星球ID" \
  --cookie "你的cookie值"
```

配置说明：
1. 登录 https://wx.zsxq.com
2. 按 **F12** → **Network** 标签 → 点击任意请求 → 复制 **Cookie**

配置完成后，再次发帖**无需提供任何参数**，脚本会自动读取配置！

## 快速发帖

```bash
# 简单发帖（自动读取配置）
node scripts/zsxq.js post --text "今天分享一个设计模式..."

# 指定星球
node scripts/zsxq.js post --text "内容" --name "星球名称"

# 带图片
node scripts/zsxq.js post --text "内容" --images "/path/a.jpg,b.png"
```

## 参数说明

| 参数 | 说明 | 必填 |
|------|------|------|
| `--text` | 帖子内容 | 是 |
| `--name` | 指定星球（不指定则用默认） | 否 |
| `--images` | 图片路径（逗号分隔，最多9张） | 否 |
| `--file` | 从文件读取内容 | 否 |

## 参考

- 知识星球网页版：https://wx.zsxq.com
- 配置文件：`~/.xfg-zsxq/groups.json`
