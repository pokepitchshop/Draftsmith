/**
 * Minimal Ollama /api/chat client (POK-635).
 *
 * Streams NDJSON so long generations on a small GPU don't hit fetch's
 * headers timeout while the full response is being produced.
 */

/**
 * Rough token estimate for a guard against silent context truncation.
 * ~4 chars/token is conservative enough for English Markdown + code.
 */
export function estimateTokens(text) {
  return Math.ceil(text.length / 4);
}

/**
 * Remove reasoning blocks some local models (e.g. qwen3) emit inline, and an
 * outer ``` fence when the model wraps the whole file in one.
 */
export function cleanModelOutput(text) {
  let out = text.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
  const fenced = out.match(/^```[a-z]*\n([\s\S]*)\n```$/i);
  if (fenced && !fenced[1].includes("\n```")) {
    out = fenced[1].trim();
  }
  return `${out}\n`;
}

/**
 * Send a chat request and return the concatenated assistant content.
 *
 * @param {object} opts
 * @param {string} opts.host       e.g. http://localhost:11434
 * @param {string} opts.model      e.g. qwen3:8b
 * @param {Array}  opts.messages   [{ role, content }]
 * @param {object} [opts.options]  Ollama options (num_ctx, temperature, ...)
 * @param {(chars: number) => void} [opts.onProgress]
 */
export async function ollamaChat({ host, model, messages, options = {}, onProgress = null }) {
  const url = new URL("/api/chat", host);

  let response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ model, messages, stream: true, options }),
    });
  } catch (error) {
    throw new Error(`ollama: cannot reach ${host} (${error.cause?.code ?? error.message})`);
  }

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`ollama: HTTP ${response.status} from ${url} — ${body.trim()}`);
  }

  const decoder = new TextDecoder();
  let buffer = "";
  let content = "";
  let stats = null;

  const handleLine = (line) => {
    if (!line.trim()) return;
    const chunk = JSON.parse(line);
    if (chunk.error) throw new Error(`ollama: ${chunk.error}`);
    content += chunk.message?.content ?? "";
    onProgress?.(content.length);
    if (chunk.done) {
      stats = {
        promptTokens: chunk.prompt_eval_count ?? null,
        outputTokens: chunk.eval_count ?? null,
        seconds: chunk.total_duration ? chunk.total_duration / 1e9 : null,
      };
    }
  };

  for await (const part of response.body) {
    buffer += decoder.decode(part, { stream: true });
    let newline;
    while ((newline = buffer.indexOf("\n")) !== -1) {
      handleLine(buffer.slice(0, newline));
      buffer = buffer.slice(newline + 1);
    }
  }
  handleLine(buffer);

  if (!stats) {
    throw new Error("ollama: stream ended before completion");
  }

  return { content, stats };
}
