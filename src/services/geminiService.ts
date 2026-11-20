import { ChatMessage } from '../types/noc';

export async function streamNgnCopilot(
  conversationHistory: ChatMessage[],
  onChunk: (accumulatedText: string) => void,
  signal: AbortSignal
): Promise<string> {
  const sanitized = conversationHistory.filter(
    (m) =>
      (m.role === 'user' || m.role === 'model') &&
      typeof m.text === 'string' &&
      m.text.trim().length > 0
  );

  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal,
    body: JSON.stringify({
      messages: sanitized.map((m) => ({
        role: m.role,
        text: m.text,
      })),
    }),
  });

  if (!response.ok || !response.body) {
    throw new Error(`HTTP ${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';
  let accumulated = '';

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split('\n\n');
    buffer = events.pop() ?? '';

    for (const evt of events) {
      const lines = evt.split('\n');
      for (const line of lines) {
        if (!line.startsWith('data:')) continue;
        const jsonStr = line.slice(5).trim();
        if (!jsonStr) continue;

        let payload: { text?: string; done?: boolean; error?: string };
        try {
          payload = JSON.parse(jsonStr) as {
            text?: string;
            done?: boolean;
            error?: string;
          };
        } catch {
          continue;
        }

        if (payload.error) {
          throw new Error(payload.error);
        }

        if (payload.text) {
          accumulated += payload.text;
          onChunk(accumulated);
        }
      }
    }
  }

  return accumulated;
}
