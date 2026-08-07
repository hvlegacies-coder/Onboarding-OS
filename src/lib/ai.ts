/**
 * Groq client.
 *
 * Groq runs open-weight models (Llama, Qwen, GPT-OSS) on their own inference
 * hardware. The API is OpenAI-compatible, so this is a thin fetch wrapper
 * rather than an SDK — one less dependency for a prototype.
 *
 * TWO WAYS TO RUN IT
 *  • VITE_AI_PROXY_URL — recommended. Point it at a small server route that
 *    holds the key and forwards to Groq. Nothing secret reaches the browser.
 *  • VITE_GROQ_API_KEY — direct from the browser. Simplest to demo, but the key
 *    ships inside the bundle and anyone with devtools can read and spend it.
 *    Use a throwaway key with a spend cap, and never this path in production.
 */

const PROXY = import.meta.env.VITE_AI_PROXY_URL as string | undefined
const KEY = import.meta.env.VITE_GROQ_API_KEY as string | undefined
export const AI_MODEL = (import.meta.env.VITE_GROQ_MODEL as string) || 'llama-3.3-70b-versatile'

const ENDPOINT = PROXY || 'https://api.groq.com/openai/v1/chat/completions'

/** Which route is live, so the UI can say so instead of failing silently. */
export const aiMode: 'proxy' | 'direct' | 'off' = PROXY ? 'proxy' : KEY ? 'direct' : 'off'
export const aiConfigured = aiMode !== 'off'

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export type AiResult = { ok: true; text: string } | { ok: false; error: string }

/** A stalled request must not leave the assistant stuck "thinking". */
const TIMEOUT_MS = 45000

/**
 * Streams a reply, calling `onDelta` with each chunk as it arrives.
 *
 * Falls back to a single non-streamed read if the response isn't a stream, so
 * a proxy that buffers still works.
 */
export async function askAI(
  messages: ChatMessage[],
  onDelta?: (chunk: string) => void,
  signal?: AbortSignal,
): Promise<AiResult> {
  if (!aiConfigured) {
    return { ok: false, error: 'not-configured' }
  }

  const abort = new AbortController()
  const timer = setTimeout(() => abort.abort(), TIMEOUT_MS)
  // Either the caller cancelling or our timeout should stop the request.
  signal?.addEventListener('abort', () => abort.abort())

  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(PROXY ? {} : { Authorization: `Bearer ${KEY}` }),
      },
      body: JSON.stringify({
        model: AI_MODEL,
        messages,
        stream: Boolean(onDelta),
        temperature: 0.2,
      }),
      signal: abort.signal,
    })

    if (!res.ok) {
      const detail = (await res.text()).slice(0, 300)
      return { ok: false, error: `${res.status} ${res.statusText}${detail ? ` — ${detail}` : ''}` }
    }

    if (!onDelta || !res.body) {
      const json = await res.json()
      return { ok: true, text: json.choices?.[0]?.message?.content ?? '' }
    }

    // Server-sent events: "data: {json}" lines, terminated by "data: [DONE]".
    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let text = ''
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      // The last element may be a partial line; keep it for the next chunk.
      buffer = lines.pop() ?? ''
      for (const line of lines) {
        const t = line.trim()
        if (!t.startsWith('data:')) continue
        const payload = t.slice(5).trim()
        if (payload === '[DONE]') continue
        try {
          const delta = JSON.parse(payload).choices?.[0]?.delta?.content
          if (delta) {
            text += delta
            onDelta(delta)
          }
        } catch {
          // A malformed frame shouldn't kill the whole stream.
        }
      }
    }
    return { ok: true, text }
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError') {
      return { ok: false, error: signal?.aborted ? 'cancelled' : 'timed out' }
    }
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  } finally {
    clearTimeout(timer)
  }
}
