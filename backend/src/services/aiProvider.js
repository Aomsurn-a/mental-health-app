class AiProviderError extends Error {
  constructor(code, upstreamStatus) {
    super(code);
    this.code = code;
    this.upstreamStatus = upstreamStatus;
  }
}

function providerConfig() {
  const base = (process.env.MAXPLUS_BASE_URL || 'https://api.maxplus-ai.cc').replace(/\/+$/, '');
  const path = (process.env.MAXPLUS_API_PATH || '').replace(/^\/+|\/+$/g, '');
  const root = (path && !base.endsWith('/' + path) ? base + '/' + path : base).replace(/\/v1$/, '');
  return { url: root + '/v1/messages', model: process.env.MAXPLUS_MODEL || 'claude-sonnet-4-5' };
}

async function reply(messages, system) {
  if (!process.env.MAXPLUS_API_KEY?.trim()) throw new AiProviderError('AI_NOT_CONFIGURED');
  const { url, model } = providerConfig();
  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + process.env.MAXPLUS_API_KEY.trim(),
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({ model, max_tokens: 1024, stream: false, system, messages }),
      signal: AbortSignal.timeout(30000),
    });
  } catch (error) {
    throw new AiProviderError(error.name === 'TimeoutError' ? 'AI_TIMEOUT' : 'AI_NETWORK_ERROR');
  }
  const result = await response.json().catch(() => null);
  if (!response.ok) {
    const code = response.status === 503 ? 'AI_PROVIDER_UNAVAILABLE'
      : response.status === 401 || response.status === 403 ? 'AI_PROVIDER_AUTH'
      : response.status === 429 ? 'AI_RATE_LIMIT' : 'AI_PROVIDER_ERROR';
    throw new AiProviderError(code, response.status);
  }
  const text = result?.content?.filter(block => block.type === 'text').map(block => block.text).join('\n').trim();
  if (!text) throw new AiProviderError('AI_EMPTY_RESPONSE');
  return text;
}
module.exports = { reply, providerConfig, AiProviderError };
