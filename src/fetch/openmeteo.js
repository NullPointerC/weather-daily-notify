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
    forecast_days: '1',
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
    ].join(','),
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
    aqi: null,
    indices: null,
    alerts: null,
  };
}

function round1(v) {
  return v == null ? null : Math.round(v * 10) / 10;
}

function first(arr) {
  return Array.isArray(arr) && arr.length ? arr[0] : null;
}