---
name: xfg-zsxq
description: "知识星球自动发帖技能。当你需要向小傅哥的知识星球发布内容时使用。触发词：'知识星球'、'发帖'、'发星球'、'zsxq'、'发布到星球'。需要提供 cookie、签名和时间戳参数。"
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

自动向小傅哥的知识星球发布内容。

## ⚠️ 使用前配置

知识星球 API 需要以下参数：

### 1. Cookie

1. 登录 https://wx.zsxq.com
2. 按 **F12** → **Network** 标签
3. 点击任意请求，复制 **Cookie** 值

### 2. 签名参数（x-signature, x-timestamp）

由于知识星球的签名算法未公开，需要从浏览器获取：

1. 在知识星球网页版发布一条**测试帖子**
2. 在 Network 中找到 `topics` 请求
3. 复制请求头中的：
   - `x-signature`
   - `x-timestamp`

> 签名有时效性（通常几分钟到几小时），过期后需重新获取

## 快速发帖

```bash
bash scripts/post.sh \
  --cookie "sajssdk_2015_cross_new_user=1; zsxq_access_token=..." \
  --signature "9a50178a81cd42977b7688a2a347a1218c5025fe" \
  --timestamp "1774404109" \
  --text "今天分享一个设计模式..."
```

## 参数说明

| 参数 | 说明 | 必填 |
|------|------|------|
| `--cookie` | 完整的 cookie 字符串 | 是 |
| `--signature` | x-signature 值 | 是 |
| `--timestamp` | x-timestamp 值 | 是 |
| `--text` | 帖子内容 | 是 |
| `--images` | 图片路径（逗号分隔） | 否 |

## 完全自动化方案

如需完全自动化（无需手动获取签名），建议使用：

### 方案一：浏览器自动化

使用 Puppeteer 或 Playwright 模拟浏览器操作：

```javascript
const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto('https://wx.zsxq.com');
  // 自动登录、发帖
})();
```

### 方案二：逆向工程

分析知识星球前端 JS，找到签名生成算法并复现。

## 参考

- 知识星球网页版：https://wx.zsxq.com