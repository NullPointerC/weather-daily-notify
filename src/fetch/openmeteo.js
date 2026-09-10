/**
 * 主数据源：Open-Meteo（免费、无需 key）。
 * 返回统一的标准天气数据结构（见 src/fetch/index.js 的 schema 约定）。
 */
import { wmoToText } from '../lib/weather-code.js';

const API = 'https://api.open-meteo.com/v1/forecast';

export async function fetchOpenMeteo({ latitude, longitude, timezone }) {
  const params = new URLSearchParams({
    latitude,
    longitude,
    timezone,
    forecast_days: '3',
    current: [
      'temperature_2m',
      'relative_humidity_2m',
      'apparent_temperature',
      'precipitation',
      'weather_code',
      'wind_speed_10m',
    ].join(','),
    daily: [
      'temperature_2m_max',
      'temperature_2m_min',
      'sunrise',
      'sunset',
      'precipitation_probability_max',
      'weather_code',
    ].join(','),
    hourly: ['precipitation_probability', 'weather_code'].join(','),
  });

  const resp = await fetch(`${API}?${params.toString()}`, {
    headers: { 'User-Agent': 'weather-daily-notify/1.0' },
    signal: AbortSignal.timeout(15000),
  });

  if (!resp.ok) {
    throw new Error(`Open-Meteo HTTP ${resp.status}`);
  }

  const data = await resp.json();
  const cur = data.current || {};
  const daily = data.daily || {};
  const hourly = data.hourly || {};

  return {
    source: 'openmeteo',
    current: {
      temperature: round1(cur.temperature_2m),
      feelsLike: round1(cur.apparent_temperature),
      humidity: cur.relative_humidity_2m ?? null,
      precipitationProb: first(daily.precipitation_probability_max),
      windSpeed: round1(cur.wind_speed_10m),
      weatherText: wmoToText(cur.weather_code),
      weatherCode: String(cur.weather_code ?? ''),
    },
    daily: {
      tempMax: round1(first(daily.temperature_2m_max)),
      tempMin: round1(first(daily.temperature_2m_min)),
      sunrise: first(daily.sunrise) || null,
      sunset: first(daily.sunset) || null,
    },
    // 多天预报（今/明/后天），供消息里的“明后天预报”使用
    forecast: buildForecast(daily),
    // 未来 24 小时逐小时降水概率（仅今天部分保留），供“降雨时段预估”使用
    hourly: buildHourly(hourly),
    aqi: null,
    indices: null,
    alerts: null,
  };
}

function buildForecast(daily) {
  const out = [];
  const times = daily.time || [];
  const tmax = daily.temperature_2m_max || [];
  const tmin = daily.temperature_2m_min || [];
  const codes = daily.weather_code || [];
  for (let i = 0; i < times.length; i++) {
    out.push({
      date: times[i],
      tempMax: round1(tmax[i]),
      tempMin: round1(tmin[i]),
      weatherText: wmoToText(codes[i]),
      weatherCode: String(codes[i] ?? ''),
    });
  }
  return out;
}

function buildHourly(hourly) {
  const out = [];
  const times = hourly.time || [];
  const prob = hourly.precipitation_probability || [];
  const codes = hourly.weather_code || [];
  for (let i = 0; i < times.length; i++) {
    out.push({
      time: times[i],
      precipitationProb: prob[i] == null ? null : Number(prob[i]),
      weatherCode: String(codes[i] ?? ''),
    });
  }
  return out;
}

function round1(v) {
  return v == null ? null : Math.round(v * 10) / 10;
}

function first(arr) {
  return Array.isArray(arr) && arr.length ? arr[0] : null;
}