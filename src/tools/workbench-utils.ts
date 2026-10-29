import { fail } from '@/lib/errors';
import { parseJson } from './data';
import type { Params } from './schema';

export const integer = (value: unknown, min: number, max: number): number => {
  if (!['string', 'number'].includes(typeof value) || String(value).trim() === '') fail('params');
  const n = Number(value);
  if (!Number.isInteger(n) || n < min || n > max) fail('params');
  return n;
};
export const finite = (value: unknown, min = -1e12, max = 1e12): number => {
  if (!['string', 'number'].includes(typeof value)) fail('params');
  if (String(value).trim() === '') fail('params');
  const n = Number(value);
  if (!Number.isFinite(n) || n < min || n > max) fail('params');
  return n;
};
export const record = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail('invalid');
  return value as Record<string, unknown>;
};
export const rows = (text: string): Record<string, unknown>[] => {
  const value = parseJson(text);
  if (!Array.isArray(value) || value.length > 10000) fail('limit');
  return value.map(record);
};
export const escapeHtml = (value: string): string =>
  value.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!
  );
export function randomIndex(length: number): number {
  if (!globalThis.crypto?.getRandomValues) fail('capability');
  if (!Number.isSafeInteger(length) || length < 1 || length > 0xffffffff) fail('params');
  const bound = 0x100000000 - (0x100000000 % length);
  const bytes = new Uint32Array(1);
  do {
    crypto.getRandomValues(bytes);
  } while (bytes[0] >= bound);
  return bytes[0] % length;
}
export const jsonResult = (value: unknown) => ({
  text: JSON.stringify(value, null, 2),
  extension: 'json',
});
export function outputLimit(text: string): string {
  if (text.length > 10 * 1024 * 1024) fail('limit');
  return text;
}
export const textParam = (p: Params, key: string) => String(p[key] ?? '');
