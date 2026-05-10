// tests/sse-stream.test.ts — SSE encoder + stream behavior.

import { describe, it, expect } from 'vitest';
import { encodeSseEvent, sseStream } from '../src/lib/sse-stream.js';

const dec = new TextDecoder();

describe('sse-stream', () => {
  it('encodes event + data + id', () => {
    const buf = encodeSseEvent({ event: 'token', data: { token: 'hi' }, id: '1' });
    const text = dec.decode(buf);
    expect(text).toContain('id: 1');
    expect(text).toContain('event: token');
    expect(text).toContain('"token":"hi"');
    expect(text.endsWith('\n\n')).toBe(true);
  });

  it('splits multiline data into multiple data: lines', () => {
    const buf = encodeSseEvent({ event: 'msg', data: 'line1\nline2' });
    const text = dec.decode(buf);
    expect(text).toContain('data: line1');
    expect(text).toContain('data: line2');
  });

  it('streams iterable events into ReadableStream', async () => {
    async function* gen() {
      yield { event: 'a', data: 1 };
      yield { event: 'b', data: 2 };
    }
    const stream = sseStream(gen());
    const reader = stream.getReader();
    let raw = '';
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      raw += dec.decode(value, { stream: true });
    }
    expect(raw).toContain('event: a');
    expect(raw).toContain('event: b');
  });

  it('emits error frame when generator throws', async () => {
    async function* gen() {
      yield { event: 'first', data: 1 };
      throw new Error('explode');
    }
    const stream = sseStream(gen());
    const reader = stream.getReader();
    let raw = '';
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      raw += dec.decode(value, { stream: true });
    }
    expect(raw).toContain('event: first');
    expect(raw).toContain('event: error');
    expect(raw).toContain('STREAM_ERROR');
  });
});
