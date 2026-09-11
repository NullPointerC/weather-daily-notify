# weather-daily-notify

每天定时抓取天气，通过 [Server酱](https://sct.ftqq.com/) 推送到微信，并把历史天气数据归档到本仓库。

- 主数据源：[Open-Meteo](https://open-meteo.com/)（免费、无需 key）
- 第二数据源：[和风天气 QWeather](https://www.qweather.com/)（可选，提供 AQI / 生活指数 / 气象预警）
- 运行环境：GitHub Actions（Node.js 18+，使用内置 `fetch`，无第三方运行时依赖）
- 默认地点：江西省南昌市南昌县昌东镇紫阳大道 99 号，江西师范大学（瑶湖校区）

![今日天气](https://raw.githubusercontent.com/NullPointerC/weather-daily-notify/main/weather-badge.svg)

## 特性

- ⏰ 每天北京时间 06:45 自动推送一条天气
- ⚠️ 异常天气额外提醒（24h 变温 / 降雨概率 / AQI / 气象预警）
- 📦 历史数据每日归档，每月自动压缩合并
- 🔄 多源降级：Open-Meteo 失败自动切换和风天气
- 🖱 支持 `workflow_dispatch` 手动触发

## 快速开始

### 1. 配置 Secrets

在仓库 `Settings → Secrets and variables → Actions` 里添加：

| Secret 名称 | 必填 | 说明 |
|-------------|------|------|
| `SERVERCHAN_SENDKEY` | ✅ | Server酱 SendKey，在 [sct.ftqq.com](https://sct.ftqq.com/) 注册获取 |
| `QW_API_KEY` | 可选 | 和风天气 API Key，用于 AQI / 生活指数 / 预警（不填则自动跳过） |

### 2. 修改地点 / 阈值

编辑 [`config/default.js`](config/default.js)：

```js
location: {
  name: '江西师范大学（瑶湖校区）',
  latitude: 28.68,
  longitude: 116.03,
  timezone: 'Asia/Shanghai',
},
```

替换成你的城市坐标即可。

### 3. 本地测试

```bash
# 先设置环境变量（Windows PowerShell）
$env:SERVERCHAN_SENDKEY = "你的SendKey"
$env:QW_API_KEY = "你的和风key"   # 可选

# 运行
node src/index.js
```

- 不设置 `SERVERCHAN_SENDKEY` 时**不会真正推送**（仅打印消息内容），适合先本地调试。
- 运行会生成 `data/` 归档目录，这是运行时产物，无需手动创建；本地调试后可用 `Test-Path data` 确认，不必提交进仓库（线上 workflow 会自动生成并 commit）。
- 需要 Node.js ≥ 18（使用内置 `fetch`，无需 `npm install`）。

## 目录结构

```
weather-daily-notify/
├── .github/workflows/daily.yml   # 定时 + 手动触发
├── config/default.js             # 地点与阈值配置
├── src/
│   ├── index.js                  # 主流程入口
│   ├── config.js                 # 配置加载（环境变量合并）
│   ├── fetch/
│   │   ├── openmeteo.js          # 主数据源
│   │   ├── qweather.js           # 第二数据源（可选）
│   │   └── index.js              # 多源降级编排
│   ├── lib/
│   │   ├── weather-code.js       # WMO 天气码 → 中文
│   │   ├── anomaly.js            # 异常判定
│   │   └── message.js            # 消息生成
│   ├── push.js                   # Server酱推送（含重试）
│   └── archive.js                # 历史归档（日 + 月压缩）
└── data/                         # 历史天气数据（自动提交回仓库）
```

## 推送时间说明

GitHub Actions 的 `schedule` 使用 **UTC 时间**。要得到北京时间 06:45，workflow 里配置的是：

```yaml
schedule:
  - cron: "45 22 * * *"  # UTC 22:45 = 北京时间 06:45
```

> 注意：分钟刻意避开「整点」（`:00`），因为 GitHub Actions 在每小时整点是高负载时段，整点触发的定时任务可能延迟数十分钟甚至数小时。

## License

[MIT](LICENSE)

---

<p align="center">Powered by <strong>DeepSeek-V4-Pro</strong></p>