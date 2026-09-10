/**
 * 历史归档：
 *  - 每天写入 data/YYYY-MM/YYYY-MM-DD.json
 *  - 每月 1 号（或执行日期跨月时）把上月日文件合并为 data/YYYY-MM.json 并清理日文件
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, '..', 'data');

export async function archive(weather, now = new Date()) {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const yyyymm = `${y}-${m}`;
  const yyyymmdd = `${yyyymm}-${d}`;

  const monthDir = path.join(DATA_DIR, yyyymm);
  await fs.mkdir(monthDir, { recursive: true });

  // 1) 写当日文件
  const dayFile = path.join(monthDir, `${yyyymmdd}.json`);
  const entry = {
    date: yyyymmdd,
    location: weather.location || null,
    source: weather.source,
    current: weather.current,
    daily: weather.daily,
    aqi: weather.aqi,
    indices: weather.indices,
    alerts: weather.alerts,
    fetchedAt: now.toISOString(),
  };
  await fs.writeFile(dayFile, JSON.stringify(entry, null, 2) + '\n', 'utf8');

  // 2) 月初压缩上月数据
  const monthYearPath = path.join(DATA_DIR, yyyymm);
  await compressPreviousMonth(now, yyyymm, yyyymmdd, yyyymm);

  return { dayFile, yyyymmdd };
}

/**
 * 检测上一个月是否已不在「当前目录」，若存在日文件且尚未合并，则合并后清理。
 */
async function compressPreviousMonth(now, currentYm, currentDate, currentYmUnused) {
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const py = prev.getFullYear();
  const pm = String(prev.getMonth() + 1).padStart(2, '0');
  const prevYm = `${py}-${pm}`;
  const prevDir = path.join(DATA_DIR, prevYm);
  const prevMergedFile = path.join(DATA_DIR, `${prevYm}.json`);

  let files = [];
  try {
    files = (await fs.readdir(prevDir)).filter((f) => f.endsWith('.json'));
  } catch {
    return; // 上月目录不存在，跳过
  }

  if (!files.length) {
    // 清理空目录
    await fs.rm(prevDir, { recursive: true, force: true }).catch(() => {});
    return;
  }

  const records = [];
  for (const f of files.sort()) {
    try {
      const raw = await fs.readFile(path.join(prevDir, f), 'utf8');
      records.push(JSON.parse(raw));
    } catch {
      // 损坏文件跳过
    }
  }

  if (records.length) {
    const merged = {
      month: prevYm,
      generatedAt: currentDate,
      count: records.length,
      records,
    };
    await fs.writeFile(prevMergedFile, JSON.stringify(merged, null, 2) + '\n', 'utf8');
  }

  // 清理日文件目录
  await fs.rm(prevDir, { recursive: true, force: true }).catch(() => {});
  console.log(`[archive] 已压缩上月 ${prevYm}：${records.length} 条`);
  return prevMergedFile;
}