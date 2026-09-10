/**
 * 每月天气报告：读取上月归档 data/YYYY-MM.json，手写 SVG 温度曲线 + 统计卡。
 * 零第三方依赖，纯字符串拼 SVG。
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, '..', '..', 'data');

/**
 * 生成上月月度报告。返回 { month, stats, svg, reportFile }。
 * 若无法读取上月数据，返回 { month, stats: null, svg: null }（不抛错）。
 */
export async function generateMonthlyReport(now = new Date()) {
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const ym = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`;
  const mergedFile = path.join(DATA_DIR, `${ym}.json`);

  let records = [];
  try {
    const raw = await fs.readFile(mergedFile, 'utf8');
    const parsed = JSON.parse(raw);
    records = Array.isArray(parsed.records) ? parsed.records : [];
  } catch {
    // 无上月数据（如首月运行）→ 返回空报告
    return { month: ym, stats: null, svg: null, reportFile: null };
  }

  if (!records.length) {
    return { month: ym, stats: null, svg: null, reportFile: null };
  }

  const stats = computeStats(records);
  const svg = buildSvg(records, stats);
  return { month: ym, stats, svg, reportFile: null };
}

function computeStats(records) {
  let tMax = -Infinity;
  let tMin = Infinity;
  let sum = 0;
  let tempCount = 0;
  let rainDays = 0;
  let clearDays = 0;

  for (const r of records) {
    const cur = r.current || {};
    const daily = r.daily || {};
    const t = cur.temperature;
    if (t != null) {
      sum += t;
      tempCount++;
    }
    const hi = daily.tempMax;
    const lo = daily.tempMin;
    if (hi != null && hi > tMax) tMax = hi;
    if (lo != null && lo < tMin) tMin = lo;

    const ppt = cur.precipitationProb;
    if (ppt != null && ppt >= 50) rainDays++;
    const code = cur.weatherCode;
    if (code === '0' || code === '1') clearDays++;
  }

  return {
    days: records.length,
    tempMax: tMax === -Infinity ? null : round1(tMax),
    tempMin: tMin === Infinity ? null : round1(tMin),
    avgTemp: tempCount ? round1(sum / tempCount) : null,
    rainDays,
    clearDays,
  };
}

function buildSvg(records, stats) {
  const W = 720;
  const H = 260;
  const padX = 50;
  const padY = 30;

  // 收集每日最高温，用于画折线
  const points = [];
  records.forEach((r, i) => {
    const hi = r.daily?.tempMax;
    const lo = r.daily?.tempMin;
    if (hi != null && lo != null) {
      points.push({ i, hi, lo });
    }
  });

  const allTemp = points.flatMap((p) => [p.hi, p.lo]);
  if (!allTemp.length) return simpleEmptySvg(W, H, stats);

  const minT = Math.floor(Math.min(...allTemp));
  const maxT = Math.ceil(Math.max(...allTemp));
  const range = Math.max(1, maxT - minT);

  const x = (i) => padX + (i / Math.max(1, records.length - 1)) * (W - padX * 2);
  const y = (t) => padY + (1 - (t - minT) / range) * (H - padY * 2);

  const hiPath = points.map((p) => `${x(p.i)},${y(p.hi)}`).join(' ');
  const loPath = points.map((p) => `${x(p.i)},${y(p.lo)}`).join(' ');

  const svg = [];
  svg.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="sans-serif">`);
  svg.push(`<rect width="100%" height="100%" fill="#f7f9fc"/>`);
  svg.push(`<text x="${padX}" y="20" font-size="14" font-weight="bold" fill="#333">月度温度走势（每日最高/最低温）</text>`);

  // 网格线
  for (let t = minT; t <= maxT; t++) {
    const yy = y(t);
    svg.push(`<line x1="${padX}" y1="${yy}" x2="${W - padX}" y2="${yy}" stroke="#e5e8ee" stroke-width="1"/>`);
    svg.push(`<text x="${padX - 8}" y="${yy + 4}" font-size="10" fill="#999" text-anchor="end">${t}°</text>`);
  }

  // 折线
  svg.push(`<polyline points="${hiPath}" fill="none" stroke="#e74c3c" stroke-width="2"/>`);
  svg.push(`<polyline points="${loPath}" fill="none" stroke="#3498db" stroke-width="2"/>`);

  // 图例
  svg.push(`<circle cx="${W - padX - 110}" cy="236" r="4" fill="#e74c3c"/><text x="${W - padX - 100}" y="240" font-size="11" fill="#555">最高温</text>`);
  svg.push(`<circle cx="${W - padX - 40}" cy="236" r="4" fill="#3498db"/><text x="${W - padX - 30}" y="240" font-size="11" fill="#555">最低温</text>`);

  svg.push('</svg>');
  return svg.join('\n');
}

function simpleEmptySvg(W, H, stats) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="sans-serif">
  <rect width="100%" height="100%" fill="#f7f9fc"/>
  <text x="${W / 2}" y="${H / 2}" font-size="16" fill="#999" text-anchor="middle">本月暂无足够数据绘制曲线</text>
</svg>`;
}

export function formatStatsText(stats) {
  if (!stats) return '本月暂无数据';
  const lines = [
    `统计天数：${stats.days} 天`,
    `最高温：${stats.tempMax ?? '—'}°C`,
    `最低温：${stats.tempMin ?? '—'}°C`,
    `平均温：${stats.avgTemp ?? '—'}°C`,
    `降雨日：${stats.rainDays} 天 · 晴天：${stats.clearDays} 天`,
  ];
  return lines.join(' · ');
}

function round1(v) {
  return Math.round(v * 10) / 10;
}