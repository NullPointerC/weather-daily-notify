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
  // 橙/红预警 → 标题强提醒
  const hasSevere = anomalies.some((a) => a.level === 'severe' || a.level === 'alert');

  const title = hasSevere
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

  // 降雨时段预估（今日未来数小时）
  const rainSlices = buildRainSlices(weather.hourly);
  if (rainSlices) {
    lines.push(`- ☂️ ${rainSlices}`);
  }

  // 明后天预报
  const forecastLine = buildForecastLine(weather.forecast);
  if (forecastLine) {
    lines.push(`- 🔮 ${forecastLine}`);
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

/**
 * 今日降雨时段预估：统计未来 24h 内降水概率 >= 50% 的时段，合并连续时段。
 * 返回一句话，或 null（无 hourly 数据时）。
 */
function buildRainSlices(hourly) {
  if (!Array.isArray(hourly) || !hourly.length) return null;

  const slices = [];
  let start = null;
  let peak = 0;

  const flush = () => {
    if (start) {
      slices.push({ start, end: null, peak });
    }
    start = null;
    peak = 0;
  };

  for (const h of hourly) {
    const prob = h.precipitationProb;
    if (prob != null && prob >= 50) {
      if (!start) start = hhmm(h.time);
      if (prob > peak) peak = prob;
    } else {
      if (start) {
        slices.push({ start, end: hhmm(h.time), peak });
        start = null;
        peak = 0;
      }
    }
  }
  if (start) {
    slices.push({ start, end: null, peak });
  }

  if (!slices.length) return '今日无明显降雨';

  const parts = slices.map((s, i) => {
    if (i === 0) {
      return s.end ? `${s.start}-${s.end}（概率 ${s.peak}%）` : `${s.start} 起（概率 ${s.peak}%）`;
    }
    return s.end ? `${s.start}-${s.end}` : `${s.start} 起`;
  });

  return `降雨时段 ${parts.join('、')}`;
}

function buildForecastLine(forecast) {
  if (!Array.isArray(forecast) || forecast.length < 2) return null;
  // forecast[0] 是今天，[1][2] 是明后天
  const tomorrow = forecast[1];
  const after = forecast[2];
  if (!tomorrow) return null;
  const parts = [`明天 ${round(tomorrow.tempMin)}~${round(tomorrow.tempMax)}°C ${tomorrow.weatherText || ''}`];
  if (after) {
    parts.push(`后天 ${round(after.tempMin)}~${round(after.tempMax)}°C ${after.weatherText || ''}`);
  }
  return parts.join(' · ');
}

function round(v) {
  return v == null ? '?' : Math.round(v * 10) / 10;
}

function hhmm(iso) {
  const m = /T(\d{2}):(\d{2})/.exec(iso || '');
  return m ? `${Number(m[1])}:${m[2]}` : '';
}

function formatTz(iso) {
  // Open-Meteo 已按 timezone=Asia/Shanghai 返回北京时间，直接取字面 HH:MM 即可，勿再换算。
  const m = /T(\d{2}):(\d{2})/.exec(iso);
  return m ? `${m[1]}:${m[2]}` : '';
}