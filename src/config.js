/**
 * 配置加载：合并默认配置与环境变量。
 * key 一律从环境变量读取，绝不硬编码。
 */
import defaults from '../config/default.js';

const cfg = {
  ...defaults,
  location: { ...defaults.location },
  anomaly: { ...defaults.anomaly },
  push: { ...defaults.push },
  secrets: {
    serverchanSendKey: process.env.SERVERCHAN_SENDKEY || '',
    qweatherApiKey: process.env.QW_API_KEY || '',
  },
};

// 允许通过环境变量覆盖坐标与阈值
if (process.env.LOCATION_LAT) cfg.location.latitude = Number(process.env.LOCATION_LAT);
if (process.env.LOCATION_LON) cfg.location.longitude = Number(process.env.LOCATION_LON);
if (process.env.TEMP_CHANGE_THRESHOLD) cfg.anomaly.tempChange24h = Number(process.env.TEMP_CHANGE_THRESHOLD);
if (process.env.PRECIP_PROB_THRESHOLD) cfg.anomaly.precipitationProb = Number(process.env.PRECIP_PROB_THRESHOLD);
if (process.env.AQI_THRESHOLD) cfg.anomaly.aqiThreshold = Number(process.env.AQI_THRESHOLD);

export default cfg;