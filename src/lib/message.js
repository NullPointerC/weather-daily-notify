/**
 * 生成 Server酱 消息：title（一句话摘要）+ desp（Markdown 详情）。
 * 异常信息单独高亮。
 */
import { detectAnomalies } from './anomaly.js';

export function buildMessage(weather, config) {
  const { location } = config;
  const cur = weather.current;
  const anomalies = detectAnomalies(weather, config);

  const temp = cur.temperature != null ? `${cur.temperature}°C` : '未知';
  const weatherText = cur.weatherText || '未知';
  const hasAlert = anomalies.some((a) => a.level === 'alert');

  const title = hasAlert
    ? `⚠️ 天气预警 | ${location.name}`
    : `${location.name} ${weatherText} ${temp}`;

  const lines = [
    `**${location.name}** · ${location.address}`,
    '',
    `- 🌡 当前 ${temp}`,
  ];

  if (cur.feelsLike != null) lines.push(`- 🧣 体感 ${cur.feelsLike}°C`);
  if (cur.humidity != null) lines.push(`- 💧 湿度 ${cur.humidity}%`);
  if (cur.precipitationProb != null) lines.push(`- ☔ 降雨概率 ${cur.precipitationProb}%`);
  if (cur.windSpeed != null) lines.push(`- 🌬 风速 ${cur.windSpeed} km/h`);

  const d = weather.daily;
  if (d.tempMax != null && d.tempMin != null) {
    lines.push(`- 📅 今日 ${d.tempMin}°C ~ ${d.tempMax}°C`);
  }
  if (d.sunrise && d.sunset) {
    lines.push(`- 🌅 日出 ${formatTz(d.sunrise)} · 🌇 日落 ${formatTz(d.sunset)}`);
  }

  // AQI
  if (weather.aqi && weather.aqi.aqi != null) {
    lines.push(`- 😷 AQI ${weather.aqi.aqi}（${weather.aqi.category || '未知'}）`);
  }

  // 生活指数
  if (weather.indices) {
    const idxLines = [];
    for (const [, v] of Object.entries(weather.indices)) {
      if (v && v.category) idxLines.push(`${v.name || ''} ${v.category}`);
    }
    if (idxLines.length) lines.push(`- 🌟 指数：${idxLines.join(' · ')}`);
  }

  // 异常提醒
  if (anomalies.length) {
    lines.push('');
    lines.push('---');
    lines.push('**⚠️ 特别提醒**');
    for (const a of anomalies) {
      lines.push(`- ${a.label}`);
      if (a.detail) lines.push(`  > ${a.detail}`);
    }
  }

  return {
    title,
    desp: lines.join('\n'),
    anomalies,
  };
}

function formatTz(iso) {
  // Open-Meteo 已按 timezone=Asia/Shanghai 返回北京时间，直接取字面 HH:MM 即可，勿再换算。
  const m = /T(\d{2}):(\d{2})/.exec(iso);
  return m ? `${m[1]}:${m[2]}` : '';
}