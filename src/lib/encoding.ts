import { fail } from './errors';
export const utf8 = (s: string) => new TextEncoder().encode(s);
export const hex = (b: Uint8Array) =>
  Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
export function fromHex(s: string): Uint8Array<ArrayBuffer> {
  const normalized = s.replace(/\s/g, '');
  if (!/^(?:[a-f\d]{2})*$/i.test(normalized)) fail('invalid');
  return Uint8Array.from(normalized.match(/../g) ?? [], (v) => parseInt(v, 16));
}
export function base64(b: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < b.length; i += 8192)
    binary += String.fromCharCode(...b.subarray(i, i + 8192));
  return btoa(binary);
}
export function fromBase64(input: string, url = false): Uint8Array<ArrayBuffer> {
  let s = input.trim();
  if (url) {
    if (!/^[\w-]*={0,2}$/.test(s)) fail('base64');
    s = s.replace(/-/g, '+').replace(/_/g, '/');
    if (s.length % 4 === 1) fail('base64');
    if (!s.includes('=')) s += '='.repeat((4 - (s.length % 4)) % 4);
  }
  if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(s)) fail('base64');
  const bytes = Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
  if (base64(bytes) !== s) fail('base64');
  return bytes;
}
export function decodeUtf8(b: Uint8Array): string {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(b);
  } catch {
    return fail('utf8');
  }
}
export const encodeBytes = (bytes: Uint8Array, encoding: string) =>
  encoding === 'Base64' ? base64(bytes) : hex(bytes);
export const decodeBytes = (text: string, encoding: string) =>
  encoding === 'Base64' ? fromBase64(text) : encoding === 'HEX' ? fromHex(text) : utf8(text);
