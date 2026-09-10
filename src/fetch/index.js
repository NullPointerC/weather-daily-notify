/**
 * 多源降级编排：优先 Open-Meteo（主源），失败时切换和风天气基础天气兜底。
 * 和风天气的 AQI / 生活指数 / 预警作为「可选增强」，有 key 才合并进来。
 *
 * 统一输出 schema：
 * {
 *   source: 'openmeteo' | 'qweather',
 *   current: { temperature, feelsLike, humidity, precipitationProb, windSpeed, weatherText, weatherCode },
 *   daily:   { tempMax, tempMin, sunrise, sunset },
 *   forecast: [{ date, tempMax, tempMin, weatherText, weatherCode }],  // 今/明/后天
 *   hourly:  [{ time, precipitationProb, weatherCode }],               // 未来逐小时
 *   aqi:     { aqi, category, primary } | null,
 *   indices: { <type>: { name, category, text } } | null,
 *   alerts:  [{ id, type, level, title, text }] | null,
 * }
 */
import { fetchOpenMeteo } from './openmeteo.js';
import { fetchQWeather } from './qweather.js';

export async function fetchWeather(config) {
  const { latitude, longitude, timezone } = config.location;
  const apiKey = config.secrets.qweatherApiKey;

  const errors = [];

  // 1) 主源 Open-Meteo
  let basis = null;
  try {
    basis = await fetchOpenMeteo({ latitude, longitude, timezone });
  } catch (e) {
    errors.push(`openmeteo: ${e.message}`);
  }

  // 2) 主源失败 → 和风天气基础天气兜底
  if (!basis && apiKey) {
    try {
      basis = await fetchQWeather({ latitude, longitude, apiKey });
    } catch (e) {
      errors.push(`qweather: ${e.message}`);
    }
  }

  if (!basis) {
    throw new Error(`所有天气数据源均失败：${errors.join('; ') || '无可用源'}`);
  }

  // 3) 有 key 且主源成功时，合并和风的增强数据（AQI/指数/预警）
  //    主源失败时 basis 已经是和风结果，无需再合并
  let enriched = null;
  if (apiKey && basis.source === 'openmeteo') {
    enriched = await fetchQWeather({ latitude, longitude, apiKey });
  }

  return {
    ...basis,
    remarks: errors.length ? errors : undefined,
    forecast: basis.forecast ?? null,
    hourly: basis.hourly ?? null,
    aqi: enriched?.aqi ?? basis.aqi ?? null,
    indices: enriched?.indices ?? basis.indices ?? null,
    alerts: enriched?.alerts ?? basis.alerts ?? null,
  };
}