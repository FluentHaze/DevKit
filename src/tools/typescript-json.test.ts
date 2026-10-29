import { describe, expect, it } from 'vitest';
import { transform } from './transform';
import { defaults } from './schema';
const run = (source: string, p: Record<string, string | boolean> = {}) =>
  transform('typescript-json', source, '', { ...defaults('typescript-json'), ...p });
const sample = async (source: string, p: Record<string, string | boolean> = {}) =>
  JSON.parse((await run(source, p)).text);

describe('TypeScript sample JSON', () => {
  it('handles interfaces, nested aliases, optionals and deterministic arrays', async () => {
    expect(
      await sample(
        'export interface User { id: number; profile?: Profile; tags: string[] } type Profile = { active: boolean }'
      )
    ).toEqual({ id: 1, profile: { active: true }, tags: ['example'] });
    expect(
      await sample('type A = { x?: string; list: number[] }', {
        includeOptional: false,
        arrayCount: '2',
      })
    ).toEqual({ list: [1, 1] });
  });
  it('selects a named root and preserves literals, tuples, unions and readonly arrays', async () => {
    expect(
      await sample(
        'type A = string; type B = { kind: "ok" | "bad"; n: -2; t: readonly [string, number?]; list: ReadonlyArray<boolean>; nil: null }',
        { rootName: 'B' }
      )
    ).toEqual({ kind: 'ok', n: -2, t: ['example', 1], list: [true], nil: null });
    expect(await sample('type A = undefined | number')).toBe(1);
  });
  it('merges interface inheritance and compatible object intersections', async () => {
    expect(
      await sample('interface Base { id: number } interface User extends Base { name: string }', {
        rootName: 'User',
      })
    ).toEqual({ id: 1, name: 'example' });
    expect(await sample('type A = { x: number } & { y: boolean }')).toEqual({ x: 1, y: true });
  });
  it('preserves prototype-like keys without prototype pollution', async () => {
    const value = await sample('type A = { __proto__: string; constructor: boolean }');
    expect(Object.hasOwn(value, '__proto__')).toBe(true);
    expect(value.__proto__).toBe('example');
  });
  it.each([
    ['type A = { child: A }', 'typeCycle'],
    ['type A = Missing', 'typeReference'],
    ['interface {', 'typescriptSyntax'],
    ['type A = () => void', 'unsupported'],
    ['type A<T> = T', 'unsupported'],
    ['type A = { [key: string]: number }', 'unsupported'],
    ['type A = bigint', 'unsupported'],
    ['type A = 10n', 'unsupported'],
    ['type A = 9007199254740993', 'precision'],
    ['type A = { x: number } & { x: string }', 'unsupported'],
    ['type A = string; fetch("https://example.com")', 'unsupported'],
  ])('rejects unsupported or invalid input: %s', async (source, error) => {
    await expect(run(source)).rejects.toThrow(error);
  });
  it('validates root and count, permits empty arrays, bounds expanded output', async () => {
    await expect(run('type A = string', { rootName: 'B' })).rejects.toThrow('typeReference');
    await expect(run('type A = string[]', { arrayCount: '21' })).rejects.toThrow('params');
    expect(await sample('type A = string[]', { arrayCount: '0' })).toEqual([]);
    await expect(run('type A = number[][][][]', { arrayCount: '20' })).rejects.toThrow('limit');
  });
});
