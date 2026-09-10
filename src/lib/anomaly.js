/**
 * 异常天气判定：按配置阈值判断，满足任一即返回异常项列表。
 * level 语义：note（提示）< warning（警告）< severe（橙色，强提醒）< alert（红色，强提醒）
 */

// 和风天气 severity 映射：统一归一为 note/warning/severe/alert
const SEVERITY = {
  Minor: 'note',
  minor: 'note',
  Moderate: 'warning',
  moderate: 'warning',
  Severe: 'severe',
  severe: 'severe',
  Emergency: 'alert',
  emergency: 'alert',
  // 中文
  蓝色: 'note',
  黄色: 'warning',
  橙色: 'severe',
  红色: 'alert',
};

export function detectAnomalies(weather, config) {
  const { anomaly } = config;
  const anomalies = [];

  const precipProb = weather.current.precipitationProb;
  if (precipProb != null && precipProb >= anomaly.precipitationProb) {
    anomalies.push({
      type: 'precipitation',
      label: `降雨概率高（${precipProb}%）`,
      level: 'warning',
    });
  }

  // 24h 变温：用当日最高-最低近似
  const { tempMax, tempMin } = weather.daily;
  if (tempMax != null && tempMin != null) {
    const diff = tempMax - tempMin;
    if (diff >= anomaly.tempChange24h) {
      anomalies.push({
        type: 'temp_change',
        label: `昼夜温差大（${Math.round(diff)}℃）`,
        level: 'note',
      });
    }
  }

  if (weather.aqi && weather.aqi.aqi != null && weather.aqi.aqi > anomaly.aqiThreshold) {
    anomalies.push({
      type: 'aqi',
      label: `空气质量差（AQI ${weather.aqi.aqi}${weather.aqi.category ? ' ' + weather.aqi.category : ''}）`,
      level: 'warning',
    });
  }

  if (anomaly.alertEnabled && Array.isArray(weather.alerts) && weather.alerts.length) {
    for (const a of weather.alerts) {
      const level = mapSeverity(a.level);
      anomalies.push({
        type: 'alert',
        label: `${a.level || '预警'}：${a.title || a.type || '气象预警'}`,
        level,
        detail: a.text || null,
      });
    }
  }

  return anomalies;
}

export function mapSeverity(severity) {
  if (severity == null) return 'warning';
  return SEVERITY[severity] || SEVERITY[String(severity)] || 'warning';
}