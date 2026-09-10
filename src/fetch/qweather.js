/**
 * 第二数据源：和风天气 QWeather（可选，需 QW_API_KEY）。
 * 提供 AQI、生活指数、气象预警；未配置 key 时请勿调用（由 index.js 判断）。
 *
 * 接口文档参考：
 *   - 实时天气：/v7/weather/now
 *   - 空气质量：/v7/air/now
 *   - 生活指数：/v7/indices/1d
 *   - 天气预警：/v7/warning/now
 */
import { qweatherCodeToText } from '../lib/weather-code.js';

const BASE = 'https://devapi.qweather.com/v7';

export async function fetchQWeather({ latitude, longitude, apiKey }) {
  if (!apiKey) return null;

  const loc = `${round3(longitude)},${round3(latitude)}`;

  // 并发抓取多个接口，任一失败单独降级
  const [now, air, indices, warning] = await Promise.all([
    qGet('/weather/now', { location: loc, key: apiKey }),
    qGet('/air/now', { location: loc, key: apiKey }),
    qGet('/indices/1d', { location: loc, key: apiKey, type: '0' }),
    qGet('/warning/now', { location: loc, key: apiKey }),
  ]);

  return {
    source: 'qweather',
    current: {
      temperature: now?.now?.temp != null ? Number(now.now.temp) : null,
      feelsLike: now?.now?.feelsLike != null ? Number(now.now.feelsLike) : null,
      humidity: now?.now?.humidity != null ? Number(now.now.humidity) : null,
      precipitationProb: now?.now?.precip != null ? Number(now.now.precip) : null,
      windSpeed:
        now?.now?.windSpeed != null ? Number(now.now.windSpeed) : null,
      weatherText:
        now?.now?.text || (now?.now?.icon ? qweatherCodeToText(now.now.icon) : null),
      weatherCode: now?.now?.icon ? String(now.now.icon) : '',
    },
    daily: {
      tempMax: null,
      tempMin: null,
      sunrise: null,
      sunset: null,
    },
    aqi: air?.now
      ? {
          aqi: air.now.aqi != null ? Number(air.now.aqi) : null,
          category: air.now.category || null,
          primary: air.now.primary || null,
        }
      : null,
    indices: parseIndices(indices),
    alerts: parseAlerts(warning),
  };
}

async function qGet(path, params) {
  try {
    const qs = new URLSearchParams(params);
    const resp = await fetch(`${BASE}${path}?${qs.toString()}`, {
      headers: { 'User-Agent': 'weather-daily-notify/1.0' },
      signal: AbortSignal.timeout(15000),
    });
    if (!resp.ok) return null;
    const json = await resp.json();
    if (json.code !== '200') return null;
    return json;
  } catch {
    return null; // 单接口失败不影响整体
  }
}

function parseIndices(json) {
  const list = json?.daily;
  if (!Array.isArray(list) || !list.length) return null;
  const wanted = new Set(['cwt', 'uv', 'sport', 'drsg']);
  const out = {};
  for (const item of list) {
    if (wanted.has(item.type)) {
      out[item.type] = {
        name: item.name || item.type,
        category: item.category || null,
        text: item.text || null,
      };
    }
  }
  return Object.keys(out).length ? out : null;
}

function parseAlerts(json) {
  const list = json?.warning;
  if (!Array.isArray(list) || !list.length) return null;
  return list.map((w) => ({
    id: w.id,
    type: w.typeName || w.type || null,
    level: w.severity || null,
    title: w.title || null,
    text: w.text || null,
  }));
}

function round3(v) {
  return typeof v === 'number' ? v.toFixed(3) : String(v);
}