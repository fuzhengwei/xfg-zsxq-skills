#!/usr/bin/env node

/**
 * 知识星球 CLI 工具
 * 支持多星球配置管理，无需额外依赖
 *
 * 命令：
 *   node zsxq.js config add    --name "小傅哥星球" --url "https://wx.zsxq.com/group/48885154455258" --cookie "..."
 *   node zsxq.js config list
 *   node zsxq.js config remove --name "小傅哥星球"
 *   node zsxq.js config default --name "小傅哥星球"
 *   node zsxq.js post          --name "小傅哥星球" --text "帖子内容"
 *   node zsxq.js post          --text "帖子内容"   (使用默认星球)
 *   node zsxq.js post          --file "/path/to/post.txt"  (从文件读取内容)
 */

const https = require('https');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const os = require('os');

// 配置文件路径
const CONFIG_DIR = path.join(os.homedir(), '.xfg-zsxq');
const CONFIG_FILE = path.join(CONFIG_DIR, 'groups.json');

// ─── 配置管理 ────────────────────────────────────────────

function loadConfig() {
    if (!fs.existsSync(CONFIG_FILE)) return { default: null, groups: {} };
    try {
        return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    } catch {
        return { default: null, groups: {} };
    }
}

function saveConfig(config) {
    if (!fs.existsSync(CONFIG_DIR)) fs.mkdirSync(CONFIG_DIR, { recursive: true });
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), { mode: 0o600 });
}

// 从 URL 中提取星球 ID
function extractGroupId(url) {
    const match = url.match(/\/group\/(\d+)/);
    return match ? match[1] : null;
}

// 从 cookie 中提取 token
function extractToken(cookie) {
    const match = cookie.match(/zsxq_access_token=([^;]+)/);
    return match ? match[1].trim() : null;
}

// ─── 签名算法 ────────────────────────────────────────────

function generateSignature(timestamp, body) {
    const bodyMd5 = crypto.createHash('md5').update(body).digest('hex');
    const signature = crypto.createHash('sha1').update(timestamp + bodyMd5).digest('hex');
    return signature;
}

function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0;
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
}

// ─── HTTP 请求 ───────────────────────────────────────────

function sendRequest(options, body) {
    return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try { resolve(JSON.parse(data)); }
                catch { resolve({ raw: data }); }
            });
        });
        req.on('error', reject);
        req.write(body);
        req.end();
    });
}

// 获取星球信息（名称）
function fetchGroupInfo(groupId, cookie) {
    return new Promise((resolve) => {
        const options = {
            hostname: 'api.zsxq.com',
            path: `/v2/groups/${groupId}`,
            method: 'GET',
            headers: {
                'accept': 'application/json, text/plain, */*',
                'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
                'referer': 'https://wx.zsxq.com/',
                'cookie': cookie
            }
        };
        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try { resolve(JSON.parse(data)); }
                catch { resolve(null); }
            });
        });
        req.on('error', () => resolve(null));
        req.end();
    });
}

// ─── 命令处理 ────────────────────────────────────────────

// config add
async function cmdConfigAdd(args) {
    const { name, url, cookie } = args;

    if (!url || !cookie) {
        console.error('❌ 用法: node zsxq.js config add --url "https://wx.zsxq.com/group/ID" --cookie "..."');
        process.exit(1);
    }

    const groupId = extractGroupId(url);
    if (!groupId) {
        console.error('❌ 无法从 URL 中提取星球 ID，请确认格式：https://wx.zsxq.com/group/48885154455258');
        process.exit(1);
    }

    const token = extractToken(cookie);
    if (!token) {
        console.error('❌ 无法从 cookie 中提取 zsxq_access_token');
        process.exit(1);
    }

    // 自动获取星球名称
    let groupName = name;
    if (!groupName) {
        process.stdout.write('🔍 正在获取星球信息...');
        const info = await fetchGroupInfo(groupId, cookie);
        if (info?.succeeded && info?.resp_data?.group?.name) {
            groupName = info.resp_data.group.name;
            console.log(` ✓ 获取到名称：${groupName}`);
        } else {
            groupName = `星球_${groupId}`;
            console.log(` ⚠️  未能获取名称，使用默认：${groupName}`);
        }
    }

    const config = loadConfig();
    config.groups[groupName] = { groupId, cookie, url };

    // 如果是第一个，设为默认
    if (!config.default) {
        config.default = groupName;
        console.log(`⭐ 已设为默认星球`);
    }

    saveConfig(config);
    console.log(`✅ 已添加星球：${groupName}（ID: ${groupId}）`);
    console.log(`📁 配置已保存到 ${CONFIG_FILE}`);
}

// config list
function cmdConfigList() {
    const config = loadConfig();
    const groups = Object.entries(config.groups);

    if (groups.length === 0) {
        console.log('📭 暂无配置的星球');
        console.log('');
        console.log('添加星球：');
        console.log('  node zsxq.js config add --url "https://wx.zsxq.com/group/ID" --cookie "..."');
        return;
    }

    console.log('📋 已配置的知识星球：');
    console.log('');
    groups.forEach(([name, info]) => {
        const isDefault = name === config.default;
        console.log(`  ${isDefault ? '⭐' : '  '} ${name}`);
        console.log(`     星球ID：${info.groupId}`);
        console.log(`     链接：${info.url}`);
        console.log('');
    });
    console.log(`默认星球：${config.default || '未设置'}`);
}

// config remove
function cmdConfigRemove(args) {
    const { name } = args;
    if (!name) {
        console.error('❌ 用法: node zsxq.js config remove --name "星球名称"');
        process.exit(1);
    }

    const config = loadConfig();
    if (!config.groups[name]) {
        console.error(`❌ 未找到星球：${name}`);
        process.exit(1);
    }

    delete config.groups[name];
    if (config.default === name) {
        const remaining = Object.keys(config.groups);
        config.default = remaining.length > 0 ? remaining[0] : null;
        if (config.default) console.log(`⭐ 默认星球已切换为：${config.default}`);
    }

    saveConfig(config);
    console.log(`✅ 已移除星球：${name}`);
}

// config default
function cmdConfigDefault(args) {
    const { name } = args;
    if (!name) {
        console.error('❌ 用法: node zsxq.js config default --name "星球名称"');
        process.exit(1);
    }

    const config = loadConfig();
    if (!config.groups[name]) {
        console.error(`❌ 未找到星球：${name}`);
        process.exit(1);
    }

    config.default = name;
    saveConfig(config);
    console.log(`⭐ 默认星球已设置为：${name}`);
}

// post
async function cmdPost(args) {
    let { name, text, file } = args;

    // 支持从文件读取内容
    if (file) {
        if (!fs.existsSync(file)) {
            console.error(`❌ 文件不存在：${file}`);
            process.exit(1);
        }
        text = fs.readFileSync(file, 'utf8').trim();
    }

    if (!text) {
        console.error('❌ 用法: node zsxq.js post --text "帖子内容" [--name "星球名称"]');
        console.error('       node zsxq.js post --file "/path/to/post.txt" [--name "星球名称"]');
        process.exit(1);
    }

    const config = loadConfig();

    // 选择目标星球
    const targetName = name || config.default;
    if (!targetName) {
        console.error('❌ 未指定星球，且没有默认星球');
        console.error('请先添加星球：node zsxq.js config add --url "..." --cookie "..."');
        process.exit(1);
    }

    const group = config.groups[targetName];
    if (!group) {
        console.error(`❌ 未找到星球：${targetName}`);
        console.error('查看已配置的星球：node zsxq.js config list');
        process.exit(1);
    }

    console.log(`📮 发帖到：${targetName}（ID: ${group.groupId}）`);

    // 构建请求体
    const body = JSON.stringify({
        req_data: {
            type: 'topic',
            text,
            image_ids: [],
            file_ids: [],
            mentioned_user_ids: []
        }
    });

    // 生成签名
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const signature = generateSignature(timestamp, body);
    const requestId = generateUUID();

    console.log('🚀 正在发帖...');

    const options = {
        hostname: 'api.zsxq.com',
        path: `/v2/groups/${group.groupId}/topics`,
        method: 'POST',
        headers: {
            'accept': 'application/json, text/plain, */*',
            'accept-language': 'zh-CN,zh;q=0.9',
            'cache-control': 'no-cache',
            'content-type': 'application/json',
            'content-length': Buffer.byteLength(body),
            'dnt': '1',
            'origin': 'https://wx.zsxq.com',
            'pragma': 'no-cache',
            'referer': 'https://wx.zsxq.com/',
            'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36',
            'x-request-id': requestId,
            'x-signature': signature,
            'x-timestamp': timestamp,
            'x-version': '2.89.0',
            'cookie': group.cookie
        }
    };

    const result = await sendRequest(options, body);

    if (result.succeeded) {
        console.log('✅ 发帖成功！');
        const topicId = result.resp_data?.topic?.topic_id;
        if (topicId) console.log(`📌 帖子ID：${topicId}`);
    } else {
        console.error('❌ 发帖失败');
        console.error('响应:', JSON.stringify(result, null, 2));
        if (result.code === 401) {
            console.error(`\n⚠️  Cookie 已过期，请更新 "${targetName}" 的 cookie：`);
            console.error(`  node zsxq.js config add --name "${targetName}" --url "${group.url}" --cookie "新的COOKIE"`);
        }
        process.exit(1);
    }
}

// ─── 入口 ────────────────────────────────────────────────

function parseArgs(argv) {
    const params = {};
    for (let i = 0; i < argv.length; i++) {
        if (argv[i].startsWith('--')) {
            const key = argv[i].slice(2);
            // 支持 --key value 和 --key=value 两种格式
            if (argv[i].includes('=')) {
                const [k, ...v] = argv[i].slice(2).split('=');
                params[k] = v.join('=');
            } else {
                params[key] = argv[i + 1] || true;
                i++;
            }
        }
    }
    return params;
}

function showHelp() {
    console.log(`
知识星球 CLI 工具 🦞

命令：
  config add      添加/更新星球配置
  config list     查看所有已配置的星球
  config remove   移除星球配置
  config default  设置默认星球
  post            发帖

示例：
  # 添加星球（自动获取名称）
  node zsxq.js config add \\
    --url "https://wx.zsxq.com/group/48885154455258" \\
    --cookie "zsxq_access_token=..."

  # 添加星球（手动指定名称）
  node zsxq.js config add \\
    --name "小傅哥星球" \\
    --url "https://wx.zsxq.com/group/48885154455258" \\
    --cookie "zsxq_access_token=..."

  # 查看已配置的星球
  node zsxq.js config list

  # 发帖到默认星球
  node zsxq.js post --text "Hello 知识星球！"

  # 从文件读取内容发帖
  node zsxq.js post --file "/path/to/post.txt"

  # 发帖到指定星球
  node zsxq.js post --name "小傅哥星球" --text "Hello！"

  # 设置默认星球
  node zsxq.js config default --name "小傅哥星球"

配置文件：~/.xfg-zsxq/groups.json
`);
}

async function main() {
    const [,, cmd, sub, ...rest] = process.argv;
    const args = parseArgs(rest);

    if (!cmd || cmd === '--help' || cmd === 'help') {
        showHelp();
        return;
    }

    if (cmd === 'config') {
        if (sub === 'add')     return await cmdConfigAdd(args);
        if (sub === 'list')    return cmdConfigList();
        if (sub === 'remove')  return cmdConfigRemove(args);
        if (sub === 'default') return cmdConfigDefault(args);
        console.error(`❌ 未知子命令: config ${sub}`);
        showHelp();
    } else if (cmd === 'post') {
        // post 命令的参数紧跟在 post 后面
        const postArgs = parseArgs([sub, ...rest].filter(Boolean));
        return await cmdPost(postArgs);
    } else {
        console.error(`❌ 未知命令: ${cmd}`);
        showHelp();
    }
}

main().catch(console.error);
