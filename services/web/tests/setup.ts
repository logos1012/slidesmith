// Vitest setup — jsdom 추가 polyfill / global mocks.
// jsdom의 localStorage가 일부 환경에서 prototype chain 문제로 깨지는 경우 강제 inject.
import { afterEach, beforeEach } from 'vitest';

class MemoryStorage implements Storage {
  private map = new Map<string, string>();
  get length() { return this.map.size; }
  clear() { this.map.clear(); }
  getItem(key: string): string | null { return this.map.get(key) ?? null; }
  key(index: number): string | null { return [...this.map.keys()][index] ?? null; }
  removeItem(key: string) { this.map.delete(key); }
  setItem(key: string, value: string) { this.map.set(key, String(value)); }
}

beforeEach(() => {
  const ls = new MemoryStorage();
  Object.defineProperty(window, 'localStorage', { value: ls, writable: true, configurable: true });
  Object.defineProperty(globalThis, 'localStorage', { value: ls, writable: true, configurable: true });
  if (typeof window.matchMedia !== 'function') {
    window.matchMedia = (() => ({
      matches: false, media: '', onchange: null,
      addListener() {}, removeListener() {},
      addEventListener() {}, removeEventListener() {}, dispatchEvent() { return false; },
    })) as unknown as typeof window.matchMedia;
  }
});

afterEach(() => {
  // tests using setContainer should reset between cases
});
