/**
 * 默认配置。所有可通过环境变量覆盖的项，见 src/config.js。
 * 这里集中描述「地点」与「异常判定阈值」，方便 fork 后修改复用。
 */
export default {
  // 地点：江西省南昌市南昌县昌东镇紫阳大道 99 号，江西师范大学（瑶湖校区）
  location: {
    name: '江西师范大学（瑶湖校区）',
    address: '江西省南昌市南昌县昌东镇紫阳大道 99 号',
    latitude: 28.68,
    longitude: 116.03,
    timezone: 'Asia/Shanghai',
  },

  // 异常判定阈值（满足任一即标记为「异常天气」，触发额外提醒）
  anomaly: {
    tempChange24h: 8, // 24 小时内最高/最低温变化 >= 8℃
    precipitationProb: 80, // 降雨概率 >= 80%
    aqiThreshold: 150, // AQI > 150（轻度污染及以上）
    alertEnabled: true, // 出现气象预警即视为异常
  },

  // 推送渠道（Server酱）。KEY 从环境变量 SERVERCHAN_SENDKEY 读取，不在此处硬编码。
  push: {
    endpoint: 'https://sctapi.ftqq.com',
    retries: 2, // 失败重试次数
  },
};