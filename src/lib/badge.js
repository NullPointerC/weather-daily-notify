/**
 * README 天气徽章：根据当天天气生成 weather-badge.svg。
 * 零依赖，纯字符串拼 SVG。随每日推送一起写盘，由 workflow 提交回仓库。
 */
export function buildBadgeSvg(weather, locationName) {
  const cur = weather.current;
  const temp = cur.temperature != null ? `${cur.temperature}°C` : '—';
  const text = cur.weatherText || '未知';

  const iconEmoji = pickWeatherEmoji(cur.weatherCode);
  const bg = '#3d85c6';
  const W = 300;
  const H = 40;

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="sans-serif">`,
    `<rect x="0" y="0" width="${W}" height="${H}" rx="20" fill="${bg}" opacity="0.15"/>`,
    `<text x="16" y="26" font-size="20">${iconEmoji}</text>`,
    `<text x="46" y="26" font-size="14" font-weight="bold" fill="#333">${locationName}</text>`,
    `<text x="${W - 16}" y="26" font-size="14" font-weight="bold" fill="#1a5276" text-anchor="end">${text} ${temp}</text>`,
    `</svg>`,
  ].join('');
}

function pickWeatherEmoji(code) {
  const c = String(code ?? '');
  if (c === '0') return '☀️';
  if (c === '1') return '🌤️';
  if (c === '2') return '⛅';
  if (c === '3') return '☁️';
  if (/^(45|48)/.test(c)) return '🌫️';
  if (/^(51|53|55|56|57|61|63|65|66|67|80|81|82|95|96|99)/.test(c)) return '🌧️';
  if (/^(71|73|75|77|85|86)/.test(c)) return '❄️';
  return '🌡️';
}