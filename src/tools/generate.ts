import { fail, type Result } from '@/lib/errors';
import { parseJson, stringify, csvOutput } from './data';
import type { Params } from './schema';
const integer = (v: unknown, min: number, max: number) => {
  const n = Number(v);
  if (!Number.isInteger(n) || n < min || n > max) fail('params');
  return n;
};
export function secureString(length: number, charset: string): string {
  const chars = [...new Set(Array.from(charset))];
  if (chars.length < 2 || chars.length > 256) fail('params');
  const limit = 256 - (256 % chars.length);
  let result = '';
  let used = 0;
  while (used < length) {
    const bytes = crypto.getRandomValues(new Uint8Array(Math.min(length * 2, 65536)));
    for (const byte of bytes) {
      if (byte >= limit) continue;
      result += chars[byte % chars.length];
      used++;
      if (used === length) break;
    }
  }
  return result;
}
export function convertRadix(input: string, from: number, to: number): string {
  const text = input.trim().toLowerCase();
  const negative = text.startsWith('-');
  const body = negative ? text.slice(1) : text;
  if (!body || ![2, 8, 10, 16].includes(from) || ![2, 8, 10, 16].includes(to)) fail('params');
  let result = 0n;
  for (let i = 0; i < body.length; i++) {
    const value = '0123456789abcdef'.indexOf(body[i]);
    if (value < 0 || value >= from) fail('invalid', `Offset: ${i + (negative ? 1 : 0)}`);
    result = result * BigInt(from) + BigInt(value);
  }
  return (negative ? -result : result).toString(to);
}
export async function transformGenerate(id: string, input: string, p: Params): Promise<Result> {
  if (id === 'radix') return { text: convertRadix(input, Number(p.fromBase), Number(p.toBase)) };
  const count = integer(p.count, 1, id === 'mock-data' ? 10000 : 1000);
  if (id === 'random') {
    if (!globalThis.crypto?.getRandomValues) fail('capability');
    const length = integer(p.length, 1, 4096);
    if (p.mode === 'string' && count * length > 1000000) fail('limit');
    return {
      text: Array.from({ length: count }, () =>
        p.mode === 'uuid' ? crypto.randomUUID() : secureString(length, String(p.charset))
      ).join('\n'),
    };
  }
  const schema = parseJson(String(p.schema));
  if (!Array.isArray(schema) || !schema.length || schema.length > 100) fail('params');
  let state = 2166136261;
  for (const c of String(p.seed)) state = Math.imul(state ^ c.charCodeAt(0), 16777619) >>> 0;
  const random = () => {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const names = ['Ada', 'Lin', 'Grace', 'Alan', 'Ken', 'Margaret', 'Edsger', 'Barbara'];
  const keys = new Set<string>();
  for (const field of schema) {
    if (
      !field ||
      typeof field !== 'object' ||
      typeof field.name !== 'string' ||
      !['id', 'name', 'email', 'integer', 'boolean', 'date', 'string'].includes(
        String(field.type)
      ) ||
      keys.has(field.name)
    )
      fail('params');
    keys.add(field.name);
  }
  const rows = Array.from({ length: count }, (_, index) =>
    Object.fromEntries(
      schema.map((field: Record<string, unknown>) => {
        let value: unknown;
        switch (field.type) {
          case 'id':
            value = index + 1;
            break;
          case 'name':
            value = names[Math.floor(random() * names.length)];
            break;
          case 'email':
            value = `user${Math.floor(random() * 1e9)}@example.test`;
            break;
          case 'integer': {
            const min = integer(field.min ?? 0, -1e9, 1e9);
            const max = integer(field.max ?? 100, min, 1e9);
            value = min + Math.floor(random() * (max - min + 1));
            break;
          }
          case 'boolean':
            value = random() >= 0.5;
            break;
          case 'date':
            value = new Date(Date.UTC(2020, 0, 1) + Math.floor(random() * 3650) * 86400000)
              .toISOString()
              .slice(0, 10);
            break;
          default:
            value = `sample-${Math.floor(random() * 1e9).toString(36)}`;
        }
        return [String(field.name), value];
      })
    )
  );
  return {
    text:
      p.format === 'csv'
        ? await csvOutput(rows, { delimiter: ',', header: true, formula: true })
        : stringify(rows),
    extension: p.format === 'csv' ? 'csv' : 'json',
  };
}
