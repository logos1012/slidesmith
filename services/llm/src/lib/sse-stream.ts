// src/lib/sse-stream.ts — minimal SSE writer helper.
// Used by /chat/stream and any future SSE endpoint. Format follows W3C SSE.

export interface SseEvent {
  /** SSE event name; defaults to 'message' if omitted. */
  event?: string;
  /** Arbitrary payload — JSON-stringified into a single `data:` line. */
  data: unknown;
  /** Optional event id (allows EventSource Last-Event-ID). */
  id?: string;
}

/** Encode a single SSE frame to a UTF-8 byte buffer. */
export function encodeSseEvent(evt: SseEvent): Uint8Array {
  const lines: string[] = [];
  if (evt.id) lines.push(`id: ${evt.id}`);
  if (evt.event) lines.push(`event: ${evt.event}`);
  const payload =
    typeof evt.data === 'string' ? evt.data : JSON.stringify(evt.data);
  // Spec: each newline in data must produce its own `data:` line.
  for (const line of payload.split('\n')) lines.push(`data: ${line}`);
  lines.push('', ''); // terminating blank line
  return new TextEncoder().encode(lines.join('\n'));
}

/** Build a ReadableStream from an async generator of SseEvents. */
export function sseStream(
  source: AsyncIterable<SseEvent>
): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const evt of source) controller.enqueue(encodeSseEvent(evt));
        controller.close();
      } catch (err) {
        controller.enqueue(
          encodeSseEvent({
            event: 'error',
            data: { code: 'STREAM_ERROR', message: String(err) },
          })
        );
        controller.close();
      }
    },
  });
}
