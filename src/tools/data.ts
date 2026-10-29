import { parseTree, type Node, type ParseError, printParseErrorCode } from 'jsonc-parser';
import { fail, type Result } from '@/lib/errors';
import type { Params } from './schema';

export function parseJson(input: string): unknown {
  const errors: ParseError[] = [];
  const tree = parseTree(input, errors, { allowTrailingComma: false, disallowComments: true });
  if (errors.length || !tree) {
    const error = errors[0];
    const before = input.slice(0, error?.offset ?? 0).split('\n');
    fail(
      'json',
      `${error ? printParseErrorCode(error.error) : 'Empty'} · ${before.length}:${(before.at(-1)?.length ?? 0) + 1}`
    );
  }
  function visit(node: Node) {
    if (node.type === 'object') {
      const keys = new Set<string>();
      for (const property of node.children ?? []) {
        const key = String(property.children?.[0].value);
        if (keys.has(key)) fail('duplicate');
        keys.add(key);
      }
    }
    if (node.type === 'number') {
      const value = Number(node.value);
      if (!Number.isFinite(value) || (Number.isInteger(value) && !Number.isSafeInteger(value)))
        fail('precision');
      const literal = input.slice(node.offset, node.offset + node.length);
      if (value === 0 && /[1-9]/.test(literal.split(/[eE]/)[0])) fail('precision');
      // 拒绝超过 IEEE-754 可可靠表达的有效数字，避免悄悄改写小数。
      const significant = literal
        .replace(/^-/, '')
        .split(/[eE]/)[0]
        .replace('.', '')
        .replace(/^0+|0+$/g, '');
      if (significant.length > 15 && String(value) !== literal) fail('precision');
    }
    node.children?.forEach(visit);
  }
  visit(tree);
  return JSON.parse(input) as unknown;
}
export const stringify = (v: unknown, indent: number | string = 2) =>
  JSON.stringify(v, null, indent);
export function sortObject(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortObject);
  if (value !== null && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b, 'en'))
        .map(([k, v]) => [k, sortObject(v)])
    );
  return value;
}
export function jsonDiff(a: unknown, b: unknown, path = '$', identityKey = ''): unknown[] {
  if (Object.is(a, b)) return [];
  if (
    a === null ||
    b === null ||
    typeof a !== typeof b ||
    Array.isArray(a) !== Array.isArray(b) ||
    typeof a !== 'object'
  )
    return [{ path, kind: 'changed', before: a, after: b }];
  if (
    identityKey &&
    Array.isArray(a) &&
    Array.isArray(b) &&
    [...a, ...b].some((v: unknown) => v !== null && typeof v === 'object' && !Array.isArray(v))
  ) {
    const index = (items: unknown[]) => {
      const result = new Map<string, unknown>();
      for (const item of items) {
        if (
          !item ||
          typeof item !== 'object' ||
          Array.isArray(item) ||
          !Object.hasOwn(item, identityKey)
        )
          fail('params');
        const key: unknown = (item as Record<string, unknown>)[identityKey];
        if (typeof key !== 'string' && typeof key !== 'number') fail('params');
        const encoded = JSON.stringify(key);
        if (result.has(encoded)) fail('duplicate');
        result.set(encoded, item);
      }
      return result;
    };
    const left = index(a),
      right = index(b);
    return [...new Set([...left.keys(), ...right.keys()])].flatMap((key): unknown[] => {
      const next = `${path}[${JSON.stringify(identityKey)}=${key}]`;
      if (!left.has(key)) return [{ path: next, kind: 'added', after: right.get(key) }];
      if (!right.has(key)) return [{ path: next, kind: 'removed', before: left.get(key) }];
      return jsonDiff(left.get(key), right.get(key), next, identityKey);
    });
  }
  const left = a as Record<string, unknown>;
  const right = b as Record<string, unknown>;
  return [...new Set([...Object.keys(left), ...Object.keys(right)])].flatMap((key) => {
    const next = Array.isArray(a) ? `${path}[${key}]` : `${path}[${JSON.stringify(key)}]`;
    if (!Object.hasOwn(left, key)) return [{ path: next, kind: 'added', after: right[key] }];
    if (!Object.hasOwn(right, key)) return [{ path: next, kind: 'removed', before: left[key] }];
    return jsonDiff(left[key], right[key], next, identityKey);
  });
}
export function queryJson(root: unknown, query: string) {
  if (!query.startsWith('$')) fail('unsupported');
  type Match = { path: string; value: unknown };
  let matches: Match[] = [{ path: '$', value: root }];
  let rest = query.slice(1);
  while (rest) {
    const token =
      /^(\.\.[A-Za-z_$][\w$]*|\.[A-Za-z_$][\w$]*|\.\*|\[(?:\*|-?\d+|-?\d*:-?\d*(?::-?\d+)?|"(?:[^"\\]|\\.)*"|'[^']*')\])/.exec(
        rest
      )?.[0];
    if (!token) fail('unsupported');
    rest = rest.slice(token.length);
    const result: Match[] = [];
    const add = (m: Match, key: string) => {
      if (m.value !== null && typeof m.value === 'object' && Object.hasOwn(m.value, key))
        result.push({
          path: `${m.path}[${JSON.stringify(key)}]`,
          value: (m.value as Record<string, unknown>)[key],
        });
    };
    for (const match of matches) {
      if (token.startsWith('..')) {
        const walk = (m: Match) => {
          if (m.value !== null && typeof m.value === 'object') {
            add(m, token.slice(2));
            Object.entries(m.value).forEach(([k, value]) =>
              walk({ path: `${m.path}[${JSON.stringify(k)}]`, value })
            );
          }
        };
        walk(match);
      } else if (token === '[*]' || token === '.*') {
        if (match.value !== null && typeof match.value === 'object')
          Object.keys(match.value).forEach((k) => add(match, k));
      } else if (token.includes(':')) {
        if (!Array.isArray(match.value)) continue;
        const n = match.value.length;
        const [start, end, stepText] = token.slice(1, -1).split(':');
        const step = stepText ? Number(stepText) : 1;
        if (step <= 0) fail('unsupported');
        const index = (s: string, fallback: number) =>
          s === '' ? fallback : Math.min(n, Math.max(0, Number(s) < 0 ? n + Number(s) : Number(s)));
        for (let i = index(start, 0); i < index(end, n); i += step) add(match, String(i));
      } else {
        let key = token.startsWith('.') ? token.slice(1) : token.slice(1, -1);
        if (key.startsWith('"')) key = JSON.parse(key) as string;
        else if (key.startsWith("'")) key = key.slice(1, -1);
        else if (Array.isArray(match.value) && Number(key) < 0)
          key = String(match.value.length + Number(key));
        add(match, key);
      }
    }
    matches = result;
  }
  return { count: matches.length, matches };
}
export function inferType(values: unknown[]): string {
  const types = new Set(
    values.map((value): string => {
      if (value === null) return 'null';
      if (Array.isArray(value)) return value.length ? `(${inferType(value)})[]` : 'unknown[]';
      if (typeof value === 'object') {
        const entries = Object.entries(value);
        return `{ ${entries.map(([key, v]) => `${JSON.stringify(key)}: ${inferType([v])};`).join(' ')} }`;
      }
      return typeof value;
    })
  );
  return [...types].join(' | ');
}
export async function csvOutput(data: unknown, p: Params): Promise<string> {
  const { default: Papa } = await import('papaparse');
  if (
    !Array.isArray(data) ||
    data.some((row) => row === null || typeof row !== 'object' || Array.isArray(row))
  )
    fail('csv');
  const rows = data.map((row) =>
    Object.fromEntries(
      Object.entries(row).map(([key, value]) => {
        if (value !== null && typeof value === 'object') {
          if (p.nested !== 'stringify') fail('csv');
          return [key, JSON.stringify(value)];
        }
        return [key, value];
      })
    )
  );
  const delimiter = String(p.delimiter ?? ',');
  if (delimiter.length !== 1 || /["\r\n]/.test(delimiter)) fail('params');
  const columns = [...new Set(rows.flatMap((row) => Object.keys(row)))];
  return (
    (p.bom ? '\uFEFF' : '') +
    Papa.unparse(
      { fields: columns, data: rows.map((row) => columns.map((key) => row[key] ?? '')) },
      {
        delimiter,
        header: Boolean(p.header),
        newline: p.newline === 'CRLF' ? '\r\n' : '\n',
        escapeFormulae: Boolean(p.formula),
      }
    )
  );
}
export async function transformData(
  id: string,
  input: string,
  secondary: string,
  p: Params
): Promise<Result> {
  if (id === 'json-escape')
    return {
      text:
        p.mode === 'escape'
          ? JSON.stringify(input)
          : (() => {
              const value = parseJson(input);
              return typeof value === 'string' ? value : stringify(value);
            })(),
      extension: 'txt',
    };
  if (id === 'json-yaml' && p.mode === 'yaml-to-json') {
    const { parseDocument } = await import('yaml');
    const doc = parseDocument(input, { schema: 'core', uniqueKeys: true, intAsBigInt: true });
    if (doc.errors.length || doc.warnings.length)
      fail('invalid', doc.errors[0]?.message ?? doc.warnings[0]?.message);
    const yamlValue: unknown = doc.toJS({ maxAliasCount: 50, mapAsMap: true });
    const normalizeYaml = (v: unknown): unknown => {
      if (typeof v === 'number' && !Number.isFinite(v)) fail('unsupported');
      if (v instanceof Map) {
        if ([...v.keys()].some((key) => typeof key !== 'string')) fail('unsupported');
        return Object.fromEntries([...v].map(([key, value]) => [key, normalizeYaml(value)]));
      }
      if (Array.isArray(v)) return v.map(normalizeYaml);
      return v;
    };
    const value = normalizeYaml(yamlValue);
    const serialized = JSON.stringify(
      value,
      (_, v: unknown) => {
        if (typeof v === 'bigint') {
          if (v > BigInt(Number.MAX_SAFE_INTEGER) || v < BigInt(Number.MIN_SAFE_INTEGER))
            fail('precision');
          return Number(v);
        }
        if (v instanceof Map || v instanceof Set || v instanceof Date) fail('unsupported');
        return v;
      },
      2
    );
    parseJson(serialized);
    return { text: serialized, extension: 'json' };
  }
  if (id === 'json-csv' && p.mode === 'csv-to-json') {
    const { default: Papa } = await import('papaparse');
    const delimiter = String(p.delimiter);
    if (delimiter.length !== 1) fail('params');
    const result = Papa.parse(input, {
      header: Boolean(p.header),
      delimiter,
      skipEmptyLines: 'greedy',
    });
    if (result.errors.length || (result.meta as { renamedHeaders?: unknown }).renamedHeaders)
      fail('csv', result.errors[0]?.message);
    return { text: stringify(result.data), extension: 'json' };
  }
  const value = parseJson(input);
  switch (id) {
    case 'json-formatter':
      if (p.mode === 'validate') return { text: input, extension: 'json' };
      return {
        text: stringify(
          p.sortKeys ? sortObject(value) : value,
          p.mode === 'compact' ? 0 : p.indent === 'tab' ? '\t' : Number(p.indent)
        ),
        extension: 'json',
      };
    case 'json-diff':
      return {
        text: stringify(jsonDiff(value, parseJson(secondary), '$', String(p.identityKey ?? ''))),
        extension: 'json',
      };
    case 'json-path':
      return { text: stringify(queryJson(value, String(p.query))), extension: 'json' };
    case 'json-yaml': {
      const { stringify: yaml } = await import('yaml');
      return { text: yaml(value), extension: 'yaml' };
    }
    case 'json-csv':
      return { text: await csvOutput(value, p), extension: 'csv' };
    case 'json-typescript': {
      const name = String(p.rootName);
      if (
        !/^[A-Za-z_$][\w$]*$/.test(name) ||
        ['class', 'interface', 'type', 'default', 'export'].includes(name)
      )
        fail('params');
      const type = inferType([value]);
      const declaration =
        p.mode === 'interface' &&
        value !== null &&
        typeof value === 'object' &&
        !Array.isArray(value)
          ? `export interface ${name} ${type}`
          : `export type ${name} = ${type};`;
      const prettier = await import('prettier/standalone');
      const ts = await import('prettier/plugins/typescript');
      const estree = await import('prettier/plugins/estree');
      return {
        text: await prettier.format(declaration, { parser: 'typescript', plugins: [ts, estree] }),
        extension: 'ts',
      };
    }
    default:
      return fail('unsupported');
  }
}
