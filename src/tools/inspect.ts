import { fail, type Result } from '@/lib/errors';
import { parseJson, stringify, queryJson } from './data';
import type { Params } from './schema';

export function object(value: unknown): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) fail('invalid');
  return value as Record<string, unknown>;
}

function pairs(input: string, format: string): [string, string][] {
  if (format === 'query') {
    const query = input.trim().replace(/^\?/, '');
    if (/%(?![\da-f]{2})/i.test(query)) fail('invalid');
    try {
      decodeURIComponent(query.replace(/\+/g, ' '));
    } catch {
      fail('invalid');
    }
    return [...new URLSearchParams(query)];
  }
  if (format === 'key-value')
    return input
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => {
        const pos = line.indexOf(':');
        if (pos < 1) fail('invalid');
        return [line.slice(0, pos).trim(), line.slice(pos + 1).trim()];
      });
  const value = parseJson(input);
  if (Array.isArray(value)) {
    if (
      value.some(
        (v) => !Array.isArray(v) || v.length !== 2 || v.some((s: unknown) => typeof s !== 'string')
      )
    )
      fail('invalid');
    return value as [string, string][];
  }
  return Object.entries(object(value)).flatMap(([key, value]) =>
    (Array.isArray(value) ? value : [value]).map((v): [string, string] => {
      if (v !== null && typeof v === 'object') fail('unsupported');
      return [key, String(v ?? '')];
    })
  );
}

function parseEnv(input: string): Map<string, string> {
  const values = new Map<string, string>();
  const lines = input.replace(/^\uFEFF/, '').split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith('#')) continue;
    const match = /^(?:export\s+)?([A-Za-z_][\w]*)\s*=\s*(.*)$/.exec(line);
    if (!match) fail('invalid');
    const key = match[1];
    let value = match[2];
    if (values.has(key)) fail('duplicate');
    if (/^["']/.test(value)) {
      const quote = value[0];
      let end = -1;
      while (end < 0) {
        for (let j = 1; j < value.length; j++) {
          if (
            value[j] === quote &&
            (quote === "'" || (value.slice(0, j).match(/\\*$/)?.[0].length ?? 0) % 2 === 0)
          ) {
            end = j;
            break;
          }
        }
        if (end < 0) {
          if (++i >= lines.length) fail('invalid');
          value += '\n' + lines[i];
        }
      }
      if (
        value.slice(end + 1).trim() &&
        !value
          .slice(end + 1)
          .trim()
          .startsWith('#')
      )
        fail('invalid');
      value = value.slice(1, end);
      if (quote === '"')
        value = value.replace(
          /\\([nrt"\\])/g,
          (_, c: string) => ({ n: '\n', r: '\r', t: '\t', '"': '"', '\\': '\\' })[c] ?? c
        );
    } else value = value.replace(/\s*#.*$/, '').trimEnd();
    values.set(key, value);
  }
  return values;
}

function leaves(value: unknown, path: string[] = [], result = new Map<string, unknown>()) {
  if (value !== null && typeof value === 'object' && Object.keys(value).length) {
    for (const [key, v] of Object.entries(value)) leaves(v, [...path, key], result);
  } else result.set(JSON.stringify(path), value);
  return result;
}
function placeholders(value: string): string[] {
  const named = new Set<string>();
  const positional: string[] = [];
  for (const match of value.matchAll(/%%|%(?:\d+\$)?[sdif]|\{\{?\s*([\w.]+)\s*\}?\}/g)) {
    if (match[0] === '%%') continue;
    if (match[1]) named.add(match[1]);
    else positional.push(match[0]);
  }
  return [...named, ...positional].sort();
}

export function transformInspect(id: string, input: string, secondary: string, p: Params): Result {
  if (id === 'request-params') {
    const entries = pairs(input, String(p.sourceFormat));
    if (p.outputFormat === 'query') return { text: new URLSearchParams(entries).toString() };
    if (p.outputFormat === 'key-value') {
      if (entries.some(([k, v]) => /[:\r\n]/.test(k) || /[\r\n]/.test(v))) fail('unsupported');
      return { text: entries.map(([k, v]) => `${k}: ${v}`).join('\n') };
    }
    if (p.outputFormat === 'pairs') return { text: stringify(entries), extension: 'json' };
    const grouped = new Map<string, string[]>();
    for (const [key, value] of entries) {
      const group = grouped.get(key) ?? [];
      group.push(value);
      grouped.set(key, group);
    }
    return {
      text: stringify(
        Object.fromEntries([...grouped].map(([k, v]) => [k, v.length === 1 ? v[0] : v]))
      ),
      extension: 'json',
    };
  }
  if (id === 'env-diff') {
    const left = parseEnv(input),
      right = parseEnv(secondary);
    if (p.mode === 'env-example')
      return {
        text: [...new Set([...left.keys(), ...right.keys()])].map((k) => `${k}=`).join('\n'),
        extension: 'env.example',
      };
    return {
      text: stringify({
        onlyInSource: [...left.keys()].filter((k) => !right.has(k)),
        onlyInTarget: [...right.keys()].filter((k) => !left.has(k)),
        changed: [...left]
          .filter(([k, v]) => right.has(k) && right.get(k) !== v)
          .map(([key, value]) =>
            p.showValues ? { key, before: value, after: right.get(key) } : { key }
          ),
        unchangedCount: [...left].filter(([k, v]) => right.get(k) === v).length,
      }),
      extension: 'json',
    };
  }
  if (id === 'i18n-check') {
    const left = leaves(object(parseJson(input))),
      right = leaves(object(parseJson(secondary)));
    const describe = (path: string) => JSON.parse(path) as string[];
    return {
      text: stringify({
        missingInTarget: [...left.keys()].filter((k) => !right.has(k)).map(describe),
        extraInTarget: [...right.keys()].filter((k) => !left.has(k)).map(describe),
        emptyTranslations: [...right]
          .filter(([, v]) => typeof v === 'string' && !v.trim())
          .map(([k]) => describe(k)),
        invalidValues: [...new Set([...left.keys(), ...right.keys()])]
          .filter(
            (k) =>
              (left.has(k) && typeof left.get(k) !== 'string') ||
              (right.has(k) && typeof right.get(k) !== 'string')
          )
          .map(describe),
        placeholderMismatches: [...left]
          .filter(
            ([k, v]) =>
              typeof v === 'string' &&
              typeof right.get(k) === 'string' &&
              stringify(placeholders(v)) !== stringify(placeholders(String(right.get(k))))
          )
          .map(([k, v]) => ({
            path: describe(k),
            source: placeholders(String(v)),
            target: placeholders(String(right.get(k))),
          })),
      }),
      extension: 'json',
    };
  }
  if (id === 'json-reshape') {
    const root = parseJson(input);
    const selected = queryJson(root, String(p.query)).matches.map((m) => m.value);
    const value = selected.length === 1 ? selected[0] : selected;
    if (p.mode === 'flatten')
      return { text: stringify(Object.fromEntries(leaves(value))), extension: 'json' };
    if (p.mode === 'to-map') {
      if (!Array.isArray(value) || !p.identityKey) fail('params');
      const result = new Map<string, unknown>();
      for (const row of value) {
        const key = object(row)[String(p.identityKey)];
        if (typeof key !== 'string' && typeof key !== 'number') fail('invalid');
        if (result.has(String(key))) fail('duplicate');
        result.set(String(key), row);
      }
      return { text: stringify(Object.fromEntries(result)), extension: 'json' };
    }
    const names = String(p.pickFields)
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const rename = object(parseJson(String(p.renameFields)));
    if (Object.values(rename).some((v) => typeof v !== 'string' || !v)) fail('params');
    const reshape = (row: unknown) => {
      const result = new Map<string, unknown>();
      for (const [k, v] of Object.entries(object(row))) {
        if (names.length && !names.includes(k)) continue;
        const name = Object.hasOwn(rename, k) ? String(rename[k]) : k;
        if (result.has(name)) fail('duplicate');
        result.set(name, v);
      }
      return Object.fromEntries(result);
    };
    return {
      text: stringify(Array.isArray(value) ? value.map(reshape) : reshape(value)),
      extension: 'json',
    };
  }
  if (id === 'har-analyzer') {
    const entries = object(object(parseJson(input)).log).entries;
    if (!Array.isArray(entries) || entries.length > 50000) fail('invalid');
    const groups = new Map<string, number[]>();
    const requests = entries.map((raw, index) => {
      const e = object(raw),
        req = object(e.request),
        res = object(e.response);
      const url = new URL(String(req.url));
      if (!['http:', 'https:'].includes(url.protocol)) fail('invalid');
      url.username = '';
      url.password = '';
      const identity = `${String(req.method)} ${url.toString()}`;
      const group = groups.get(identity) ?? [];
      group.push(index);
      groups.set(identity, group);
      if (p.redact) {
        url.search = '';
        url.hash = '';
      }
      const time = Number(e.time),
        size = Number(object(res.content).size),
        status = Number(res.status);
      if (![time, size, status].every(Number.isFinite)) fail('invalid');
      const timings = e.timings === undefined ? {} : object(e.timings);
      return {
        index,
        method: String(req.method),
        url: url.toString(),
        status,
        timeMs: time,
        sizeBytes: size,
        timings: Object.fromEntries(
          ['blocked', 'dns', 'connect', 'send', 'wait', 'receive', 'ssl']
            .filter((k) => typeof timings[k] === 'number')
            .map((k) => [k, timings[k]])
        ),
      };
    });
    const limit = Number(p.count);
    if (!Number.isInteger(limit) || limit < 1 || limit > 500) fail('params');
    return {
      text: stringify({
        count: requests.length,
        decodedContentBytes: requests.reduce((n, r) => n + Math.max(0, r.sizeBytes), 0),
        errors: requests.filter((r) => r.status === 0 || r.status >= 400),
        slowest: [...requests].sort((a, b) => b.timeMs - a.timeMs).slice(0, limit),
        largest: [...requests].sort((a, b) => b.sizeBytes - a.sizeBytes).slice(0, limit),
        repeated: [...groups.values()]
          .filter((indices) => indices.length > 1)
          .map((indices) => ({
            request: `${requests[indices[0]].method} ${requests[indices[0]].url}`,
            indices,
          })),
        requests,
      }),
      extension: 'json',
      note: p.redact ? 'common.harRedacted' : undefined,
    };
  }
  return fail('unsupported');
}
