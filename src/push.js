/**
 * Server酱 推送（含失败重试）。
 * Channel: https://sctapi.ftqq.com/{SENDKEY}.send
 */
import config from './config.js';

export async function push(title, desp, { retries = config.push.retries } = {}) {
  const sendKey = config.secrets.serverchanSendKey;
  if (!sendKey) {
    console.warn('[push] 未配置 SERVERCHAN_SENDKEY，跳过推送');
    return { ok: false, reason: 'no-sendkey' };
  }

  const url = `${config.push.endpoint}/${sendKey}.send`;
  let lastErr;

  for (let attempt = 1; attempt <= retries + 1; attempt++) {
    try {
      const body = new URLSearchParams({ title, desp });
      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
        signal: AbortSignal.timeout(15000),
      });

      if (!resp.ok) {
        lastErr = new Error(`HTTP ${resp.status}`);
        throw lastErr;
      }

      const json = await resp.json().catch(() => ({}));
      // Server酱 成功返回 { code: 0 }
      if (json.code !== 0) {
        lastErr = new Error(`Server酱返回 code=${json.code}, message=${json.message || ''}`);
        throw lastErr;
      }

      console.log(`[push] 推送成功（第 ${attempt} 次尝试）`);
      return { ok: true, attempt };
    } catch (e) {
      lastErr = e;
      console.warn(`[push] 第 ${attempt} 次推送失败：${e.message}`);
      if (attempt <= retries) {
        const backoff = attempt * 2000;
        console.log(`[push] ${backoff / 1000}s 后重试…`);
        await sleep(backoff);
      }
    }
  }

  console.error(`[push] 推送最终失败：${lastErr?.message}`);
  return { ok: false, reason: 'push-failed', error: lastErr?.message };
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}