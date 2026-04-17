/**
 * AI 助手接口封装
 */
import api from './index';

/**
 * 通用对话（流式 SSE）
 * 返回 Response 对象，需配合 streamSSE 使用
 */
export function chatWithAIStream(message, context = {}, history = []) {
  const token = localStorage.getItem('token');
  return fetch('/api/ai/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ message, context, history }),
  });
}

/**
 * 数据分析（流式 SSE）
 */
export function analyzeWithAIStream(type, params = {}) {
  const token = localStorage.getItem('token');
  return fetch('/api/ai/analyze', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ type, params }),
  });
}

/**
 * 解析 SSE 流
 * @param {Response} response - fetch 返回的 Response
 * @param {Function} onContent - 每收到一段内容的回调 (content: string) => void
 * @param {Function} onDone - 流结束回调 () => void
 */
export async function streamSSE(response, onContent, onDone) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6);
        if (data === '[DONE]') {
          onDone?.();
          return;
        }
        try {
          const parsed = JSON.parse(data);
          if (parsed.content) onContent(parsed.content);
          if (parsed.error) onContent(`\n\n❌ 错误：${parsed.error}`);
        } catch { /* 忽略解析错误 */ }
      }
    }
  }
  onDone?.();
}
