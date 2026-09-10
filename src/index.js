/**
 * 主流程：抓取天气 → 生成消息 → 推送 → 归档 → （每月 1 号）生成月报并推送。
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import config from './config.js';
import { fetchWeather } from './fetch/index.js';
import { buildMessage } from './lib/message.js';
import { generateMonthlyReport, formatStatsText } from './lib/monthly-report.js';
import { buildBadgeSvg } from './lib/badge.js';
import { push } from './push.js';
import { archive } from './archive.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPORTS_DIR = path.resolve(__dirname, '..', 'reports');
const BADGE_FILE = path.resolve(__dirname, '..', 'weather-badge.svg');

async function main() {
  console.log(`[main] 地点：${config.location.name}（${config.location.latitude}, ${config.location.longitude}）`);

  let weather;
  try {
    weather = await fetchWeather(config);
  } catch (e) {
    console.error(`[main] 抓取天气失败：${e.message}`);
    process.exitCode = 1;
    return;
  }

  weather.location = {
    name: config.location.name,
    address: config.location.address,
  };

  if (weather.remarks?.length) {
    console.warn(`[main] 部分源异常：${weather.remarks.join('; ')}`);
  }

  const message = buildMessage(weather, config);
  console.log(`[main] title: ${message.title}`);
  console.log('[main] desp:\n' + message.desp);

  // 推送（无 SendKey 时静默跳过，便于本地测试）
  const pushResult = await push(message.title, message.desp);
  if (!pushResult.ok && pushResult.reason !== 'no-sendkey') {
    console.warn(`[main] 推送未成功：${pushResult.reason}`);
  }

  // 归档
  try {
    const a = await archive(weather);
    console.log(`[main] 已归档：${a.dayFile}`);
  } catch (e) {
    console.error(`[main] 归档失败：${e.message}`);
  }

  // 生成 README 天气徽章
  try {
    await fs.writeFile(BADGE_FILE, buildBadgeSvg(weather, config.location.name), 'utf8');
    console.log(`[main] 已生成徽章：${BADGE_FILE}`);
  } catch (e) {
    console.error(`[main] 徽章生成失败：${e.message}`);
  }

  // 每月 1 号：生成并推送上月月度报告
  const now = new Date();
  if (now.getDate() === 1) {
    await runMonthlyReport(now);
  }
}

async function runMonthlyReport(now) {
  try {
    const report = await generateMonthlyReport(now);
    if (!report.stats) {
      console.log('[report] 上月无数据，跳过月度报告');
      return;
    }

    await fs.mkdir(REPORTS_DIR, { recursive: true });
    const reportFile = path.join(REPORTS_DIR, `${report.month}.svg`);
    await fs.writeFile(reportFile, report.svg, 'utf8');

    const title = `📊 ${report.month} 天气月报 | ${config.location.name}`;
    const desp = [
      `**${report.month} 月度天气报告**`,
      '',
      formatStatsText(report.stats),
      '',
      `![温度曲线](weather-badge-placeholder)`,
    ].join('\n');

    const r = await push(title, desp);
    console.log(`[report] 月报已生成：${reportFile}，推送${r.ok ? '成功' : `结果：${r.reason}`}`);
  } catch (e) {
    console.error(`[report] 月报生成失败：${e.message}`);
  }
}

main();