/**
 * 主流程：抓取天气 → 生成消息 → 推送 → 归档。
 */
import config from './config.js';
import { fetchWeather } from './fetch/index.js';
import { buildMessage } from './lib/message.js';
import { push } from './push.js';
import { archive } from './archive.js';

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
}

main();