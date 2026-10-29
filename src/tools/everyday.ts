import { fail, type Result } from '@/lib/errors';
import { parseJson } from './data';
import { secureString } from './generate';
import {
  integer,
  finite,
  record,
  rows,
  randomIndex,
  jsonResult,
  escapeHtml,
} from './workbench-utils';
import type { Params } from './schema';

export function subtitles(input: string, p: Params): string {
  const shift = finite(p.offset, -86400, 86400) * 1000;
  const time = (s: string): number => {
    const m = /^(?:(\d+):)?(\d{2}):(\d{2})[,.](\d{3})$/.exec(s);
    if (!m || Number(m[2]) > 59 || Number(m[3]) > 59) fail('invalid');
    return Number(m[1] ?? 0) * 3600000 + Number(m[2]) * 60000 + Number(m[3]) * 1000 + Number(m[4]);
  };
  const stamp = (ms: number) => {
    const n = Math.round(ms + shift);
    if (n < 0) fail('params');
    return `${String(Math.floor(n / 3600000)).padStart(2, '0')}:${String(Math.floor(n / 60000) % 60).padStart(2, '0')}:${String(Math.floor(n / 1000) % 60).padStart(2, '0')}${p.format === 'vtt' ? '.' : ','}${String(n % 1000).padStart(3, '0')}`;
  };
  const blocks = input
    .replace(/^\uFEFF/, '')
    .replace(/\r\n?/g, '\n')
    .replace(/^WEBVTT[^\n]*\n/, '')
    .trim()
    .split(/\n\s*\n/);
  const cues = blocks.map((block) => {
    const lines = block.split('\n');
    const at = lines.findIndex((l) => l.includes('-->'));
    if (at < 0) fail('invalid');
    const m = /^(\S+)\s+-->\s+(\S+)(?:\s+.*)?$/.exec(lines[at]);
    if (!m || time(m[2]) < time(m[1]) || !lines.slice(at + 1).length) fail('invalid');
    return `${stamp(time(m[1]))} --> ${stamp(time(m[2]))}\n${lines.slice(at + 1).join('\n')}`;
  });
  return `${p.format === 'vtt' ? 'WEBVTT\n\n' : ''}${cues.map((c, i) => (p.format === 'srt' ? `${i + 1}\n${c}` : c)).join('\n\n')}\n`;
}

function mock(input: string, p: Params): Result {
  const shape: unknown = parseJson(input);
  const count = integer(p.count, 1, 1000);
  let visited = 0;
  function make(value: unknown, key: string, index: number, depth = 0): unknown {
    if (++visited > 100000 || depth > 50) fail('limit');
    if (value === null) return null;
    if (Array.isArray(value)) return value.map((v) => make(v, key, index, depth + 1));
    if (typeof value === 'object')
      return Object.fromEntries(
        Object.entries(record(value)).map(([k, v]) => [k, make(v, k, index, depth + 1)])
      );
    if (typeof value === 'boolean') return index % 2 === 0;
    if (typeof value === 'number') return index + 1;
    if (/email/i.test(key)) return `user${index + 1}@example.com`;
    if (/date|time/i.test(key)) return new Date(Date.UTC(2026, 0, index + 1)).toISOString();
    if (/name/i.test(key)) return ['Ada', 'Lin', 'Grace', 'Alan'][index % 4];
    if (/id$/i.test(key)) return `id-${index + 1}`;
    return `${String(value)} ${index + 1}`;
  }
  return jsonResult(Array.from({ length: count }, (_, i) => make(shape, '', i)));
}

export async function transformEveryday(
  id: string,
  input: string,
  secondary: string,
  p: Params
): Promise<Result> {
  if (id === 'json-mock') return mock(input, p);
  if (id === 'text-cleaner') {
    let text = input.normalize(
      p.normalization === 'none' ? undefined : (String(p.normalization) as 'NFC' | 'NFKC')
    );
    if (p.normalization === 'none') text = input;
    if (p.trimLines)
      text = text
        .split(/\r?\n/)
        .map((s) => s.trim())
        .join('\n');
    if (p.removeBlank)
      text = text
        .split(/\r?\n/)
        .filter((s) => s.trim())
        .join('\n');
    if (p.unique) text = [...new Set(text.split(/\r?\n/))].join('\n');
    if (p.punctuation === 'ascii')
      text = text.replace(
        /[，。！？：；（）【】]/g,
        (c) => ',.!?:;()[]'['，。！？：；（）【】'.indexOf(c)]
      );
    return { text };
  }
  if (id === 'text-analyzer') {
    if (p.mode === 'extract' || p.mode === 'group') {
      const data = rows(input);
      if (p.mode === 'extract') {
        const keys = String(p.extractFields)
          .split(',')
          .map((v) => v.trim())
          .filter(Boolean);
        if (!keys.length || new Set(keys).size !== keys.length) fail('params');
        return jsonResult(
          data.map((row) =>
            Object.fromEntries(keys.filter((k) => Object.hasOwn(row, k)).map((k) => [k, row[k]]))
          )
        );
      }
      const key = String(p.groupKey),
        sumKey = String(p.sumKey),
        groups = new Map<string, { value: unknown; count: number; sum?: number }>();
      if (!key) fail('params');
      for (const row of data) {
        if (!Object.hasOwn(row, key)) fail('params');
        const identity = JSON.stringify(row[key]);
        const group = groups.get(identity) ?? {
          value: row[key],
          count: 0,
          ...(sumKey ? { sum: 0 } : {}),
        };
        group.count++;
        if (sumKey) group.sum = (group.sum ?? 0) + finite(row[sumKey]);
        groups.set(identity, group);
      }
      return jsonResult([...groups.values()]);
    }
    const lines = input.split(/\r?\n/);
    const frequencies = new Map<string, number>();
    for (const line of lines) frequencies.set(line, (frequencies.get(line) ?? 0) + 1);
    return jsonResult({
      characters: [...input].length,
      bytes: new TextEncoder().encode(input).length,
      lines: lines.length,
      words: input.match(/[\p{L}\p{N}_]+/gu)?.length ?? 0,
      duplicates: [...frequencies]
        .filter(([, n]) => n > 1)
        .map(([line, count]) => ({ line, count })),
      groups: Object.fromEntries([...frequencies].slice(0, 10000)),
    });
  }
  if (id === 'table-generator') {
    const data = rows(input);
    const keys = [...new Set(data.flatMap(Object.keys))];
    const cell = (v: unknown) =>
      v === undefined ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v);
    if (p.format === 'markdown')
      return {
        text: [
          `| ${keys.map((k) => k.replaceAll('|', '\\|')).join(' | ')} |`,
          `| ${keys.map(() => '---').join(' | ')} |`,
          ...data.map(
            (row) =>
              `| ${keys.map((k) => cell(row[k]).replaceAll('|', '\\|').replace(/\r?\n/g, '<br>')).join(' | ')} |`
          ),
        ].join('\n'),
        extension: 'md',
      };
    return {
      text: `<table>\n  <thead><tr>${keys.map((k) => `<th>${escapeHtml(k)}</th>`).join('')}</tr></thead>\n  <tbody>\n${data.map((row) => `    <tr>${keys.map((k) => `<td>${escapeHtml(cell(row[k]))}</td>`).join('')}</tr>`).join('\n')}\n  </tbody>\n</table>`,
      extension: 'html',
    };
  }
  if (id === 'document-diff') {
    const { diffLines, diffWords } = await import('diff');
    const parts =
      p.mode === 'words' ? diffWords(input, secondary, {}) : diffLines(input, secondary, {});
    return {
      text: parts
        .map((part) => `${part.added ? '+ ' : part.removed ? '- ' : '  '}${part.value}`)
        .join(''),
      extension: 'diff',
    };
  }
  if (id === 'subtitle-tools') {
    if (p.mode === 'merge') {
      const parse = (s: string) =>
        subtitles(s, { ...p, format: 'vtt', offset: '0' })
          .replace(/^WEBVTT\n\n/, '')
          .trim()
          .split(/\n\n/);
      const a = parse(input),
        b = parse(secondary);
      if (a.length !== b.length || a.some((c, i) => c.split('\n')[0] !== b[i].split('\n')[0]))
        fail('invalid');
      input = a.map((c, i) => `${c}\n${b[i].split('\n').slice(1).join('\n')}`).join('\n\n');
    }
    return { text: subtitles(input, p), extension: String(p.format) };
  }
  if (id === 'text-redact') {
    let text = input;
    if (p.token)
      text = text.replace(
        /(\bauthorization\s*[:=]\s*)(?:Bearer|Basic)\s+[^\s"',;&]+/gi,
        '$1[REDACTED]'
      );
    if (p.email) text = text.replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[EMAIL]');
    if (p.phone) text = text.replace(/(?<!\d)(?:\+?86[- ]?)?1[3-9]\d{9}(?!\d)/g, '[PHONE]');
    if (p.identity) text = text.replace(/(?<!\d)\d{17}[\dXx](?!\d)/g, '[ID]');
    if (p.token)
      text = text.replace(
        /((?:authorization|token|password|secret|api[_-]?key)["']?\s*[:=]\s*)(?:"[^"\n]*"|'[^'\n]*'|[^\s&,;]+)/gi,
        '$1[REDACTED]'
      );
    return { text, note: 'workbench.redactNote' };
  }
  if (id === 'password-generator') {
    const count = integer(p.count, 1, 100),
      length = integer(p.length, 8, 256);
    const groups = [
      p.lower && 'abcdefghijklmnopqrstuvwxyz',
      p.upper && 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
      p.digits && '0123456789',
      p.symbols && '!@#$%^&*()-_=+',
    ].filter((s): s is string => Boolean(s));
    if (!groups.length && p.mode !== 'passphrase') fail('params');
    const words =
      'amber apple arrow atlas autumn bamboo beach birch bloom blue book breeze bridge brook cloud coral dawn desert dream dusk earth echo ember fern field flame forest frost garden glass gold grape green grove harbor hazel hill honey iris island ivory jade lake leaf light lime linen maple meadow mint moon moss night ocean olive opal orange orbit pearl pine plum pond quartz rain reed river rose ruby sage sand silk sky snow solar song spark spring star stone storm sugar sun swift thyme tide trail tree tulip vale violet water wave west wheat wind winter wood'.split(
        ' '
      );
    const lines = Array.from({ length: count }, () => {
      if (p.mode === 'passphrase')
        return Array.from(
          { length: integer(p.words, 4, 12) },
          () => words[randomIndex(words.length)]
        ).join('-');
      const chars = [
        ...groups.map((g) => secureString(1, g)),
        ...secureString(length - groups.length, groups.join('')),
      ];
      for (let i = chars.length - 1; i > 0; i--) {
        const j = randomIndex(i + 1);
        [chars[i], chars[j]] = [chars[j], chars[i]];
      }
      return chars.join('');
    });
    return { text: lines.join('\n'), note: 'workbench.passwordNote' };
  }
  if (id === 'date-workbench') {
    const { Temporal } = await import('@js-temporal/polyfill');
    let instant: Date;
    try {
      instant = new Date(Temporal.Instant.from(String(p.instant)).epochMilliseconds);
    } catch {
      return fail('date');
    }
    if (p.mode === 'countdown')
      return jsonResult({
        target: instant.toISOString(),
        remainingSeconds: Math.ceil((instant.getTime() - Date.now()) / 1000),
      });
    const value = parseJson(input);
    if (!Array.isArray(value) || value.length > 50) fail('invalid');
    return jsonResult(
      value.map((zone) => ({
        zone,
        time: new Intl.DateTimeFormat('en-GB', {
          timeZone: String(zone),
          dateStyle: 'full',
          timeStyle: 'long',
        }).format(instant),
      }))
    );
  }
  if (id === 'split-bill') {
    const items = rows(input),
      balances = new Map<string, number>();
    const add = (who: string, cents: number) => balances.set(who, (balances.get(who) ?? 0) + cents);
    for (const item of items) {
      if (
        typeof item.paidBy !== 'string' ||
        !Array.isArray(item.for) ||
        !item.for.length ||
        item.for.some((v) => typeof v !== 'string') ||
        new Set(item.for).size !== item.for.length
      )
        fail('invalid');
      const amount = finite(item.amount, 0, 1000000);
      if (Math.abs(Math.round(amount * 100) - amount * 100) > 1e-6) fail('precision');
      const cents = Math.round(amount * 100),
        share = Math.floor(cents / item.for.length),
        remainder = cents % item.for.length;
      add(item.paidBy, cents);
      item.for.forEach((who, i) => add(String(who), -share - (i < remainder ? 1 : 0)));
    }
    const debtors = [...balances].filter(([, n]) => n < 0),
      creditors = [...balances].filter(([, n]) => n > 0);
    const transfers = [];
    let a = 0,
      b = 0;
    while (a < debtors.length && b < creditors.length) {
      const cents = Math.min(-debtors[a][1], creditors[b][1]);
      transfers.push({ from: debtors[a][0], to: creditors[b][0], amount: cents / 100 });
      debtors[a][1] += cents;
      creditors[b][1] -= cents;
      if (!debtors[a][1]) a++;
      if (!creditors[b][1]) b++;
    }
    // Exact minimum-transfer search for small groups; retain a bounded greedy fallback.
    let settlement = transfers;
    const accounts = [...balances].filter(([, cents]) => cents !== 0);
    if (accounts.length <= 12) {
      let budget = 0;
      const path: typeof transfers = [];
      const search = (index: number) => {
        if (++budget > 2000000) fail('limit');
        while (index < accounts.length && accounts[index][1] === 0) index++;
        if (index === accounts.length) {
          if (path.length < settlement.length) settlement = [...path];
          return;
        }
        if (path.length >= settlement.length) return;
        const [name, cents] = accounts[index],
          seen = new Set<number>();
        for (let other = index + 1; other < accounts.length; other++) {
          const amount = accounts[other][1];
          if (cents * amount >= 0 || seen.has(amount)) continue;
          seen.add(amount);
          accounts[other][1] += cents;
          path.push({
            from: cents < 0 ? name : accounts[other][0],
            to: cents < 0 ? accounts[other][0] : name,
            amount: Math.abs(cents) / 100,
          });
          search(index + 1);
          path.pop();
          accounts[other][1] = amount;
          if (amount + cents === 0) break;
        }
      };
      search(0);
    }
    return jsonResult({
      balances: Object.fromEntries([...balances].map(([k, n]) => [k, n / 100])),
      transfers: settlement,
      algorithm:
        accounts.length <= 12
          ? 'exact minimum transfer count (up to 12 nonzero balances)'
          : 'greedy settlement; not guaranteed minimum transfer count',
    });
  }
  if (id === 'unit-converter') {
    const units: Record<string, [string, number, number]> = {
      m: ['length', 1, 0],
      km: ['length', 1000, 0],
      cm: ['length', 0.01, 0],
      inch: ['length', 0.0254, 0],
      ft: ['length', 0.3048, 0],
      kg: ['mass', 1, 0],
      g: ['mass', 0.001, 0],
      lb: ['mass', 0.45359237, 0],
      C: ['temperature', 1, 273.15],
      F: ['temperature', 5 / 9, 459.67],
      K: ['temperature', 1, 0],
      'm/s': ['speed', 1, 0],
      'km/h': ['speed', 1 / 3.6, 0],
      mph: ['speed', 0.44704, 0],
      B: ['storage', 1, 0],
      KB: ['storage', 1000, 0],
      MB: ['storage', 1e6, 0],
      GB: ['storage', 1e9, 0],
      KiB: ['storage', 1024, 0],
      MiB: ['storage', 1048576, 0],
      GiB: ['storage', 1073741824, 0],
    };
    const from = units[String(p.fromUnit)],
      to = units[String(p.toUnit)];
    if (!from || !to || from[0] !== to[0]) fail('params');
    if (from[0] === 'temperature') {
      const value = finite(input);
      const celsius =
        p.fromUnit === 'F' ? ((value - 32) * 5) / 9 : p.fromUnit === 'K' ? value - 273.15 : value;
      if (celsius < -273.15) fail('params');
      return {
        text: String(
          Number(
            (p.toUnit === 'F'
              ? (celsius * 9) / 5 + 32
              : p.toUnit === 'K'
                ? celsius + 273.15
                : celsius
            ).toPrecision(12)
          )
        ),
      };
    }
    const base = (finite(input) + from[2]) * from[1];
    if (from[0] === 'temperature' && base < 0) fail('params');
    return { text: String(Number((base / to[1] - to[2]).toPrecision(12))) };
  }
  if (id === 'lottery') {
    const options = rows(input).map((v) => {
      if (typeof v.name !== 'string' || !v.name.trim()) fail('invalid');
      return { name: v.name, weight: integer(v.weight, 1, 10000) };
    });
    if (!options.length || options.length > 1000) fail('limit');
    if (new Set(options.map((v) => v.name)).size !== options.length) fail('duplicate');
    const count = integer(p.count, 1, p.unique ? options.length : 1000),
      picked = [];
    for (let i = 0; i < count; i++) {
      let number = randomIndex(options.reduce((sum, v) => sum + v.weight, 0));
      const at = options.findIndex((v) => (number -= v.weight) < 0);
      picked.push(options[at].name);
      if (p.unique) options.splice(at, 1);
    }
    return jsonResult(picked);
  }
  if (id === 'link-tools') {
    const urls =
      p.mode === 'extract'
        ? (input.match(/https?:\/\/[^\s<>"']+/g) ?? [])
        : input.trim().split(/\r?\n/);
    if (urls.length > 10000) fail('limit');
    const params = new URLSearchParams(String(p.query));
    return {
      text: urls
        .map((s) => {
          const url = new URL(s);
          if (!['http:', 'https:'].includes(url.protocol)) fail('invalid');
          if (p.mode === 'append') for (const [k, v] of params) url.searchParams.append(k, v);
          return url.href;
        })
        .join('\n'),
    };
  }
  if (id === 'decision') {
    const data = record(parseJson(input));
    const criteria = record(data.weights);
    if (!Array.isArray(data.options) || data.options.length > 1000 || !Object.keys(criteria).length)
      fail('invalid');
    const total = Object.values(criteria).reduce<number>((s, v) => s + finite(v, 0, 10000), 0);
    if (!total) fail('params');
    return jsonResult(
      data.options
        .map((v) => {
          const item = record(v),
            scores = record(item.scores);
          return {
            name: item.name,
            score:
              Object.entries(criteria).reduce(
                (s, [k, weight]) => s + finite(weight, 0, 10000) * finite(scores[k], 0, 10),
                0
              ) / total,
          };
        })
        .sort((a, b) => b.score - a.score)
    );
  }
  if (id === 'workflow') {
    const steps: unknown = parseJson(String(p.workflowSteps));
    if (!Array.isArray(steps) || !steps.length || steps.length > 10) fail('params');
    const allowed = new Set([
      'json-formatter',
      'json-yaml',
      'json-csv',
      'json-typescript',
      'json-schema',
      'typescript-json',
      'base64',
      'url-codec',
      'text-cleaner',
      'text-redact',
      'string-case',
    ]);
    const { transform } = await import('./transform');
    const { defaults } = await import('./schema');
    let output: Result = { text: input };
    for (const step of steps) {
      const s = record(step);
      if (typeof s.tool !== 'string' || !allowed.has(s.tool)) fail('unsupported');
      const params = s.params === undefined ? {} : record(s.params);
      if (Object.values(params).some((v) => typeof v !== 'string' && typeof v !== 'boolean'))
        fail('params');
      output = await transform(s.tool, output.text, '', {
        ...defaults(s.tool),
        ...params,
      } as Params);
    }
    return output;
  }
  return fail('unsupported');
}
