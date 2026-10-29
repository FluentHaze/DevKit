import { describe, expect, it } from 'vitest';
import { transform } from './transform';
import { defaults, fields } from './schema';
import { transformInspect } from './inspect';
import { inferSchema } from './json-schema';
import { encodeText, transformEncoding } from './encoding';
import { curlToCode, parseCurl } from './web';
import { jsonDiff } from './data';
import { readDraft, writeDraft } from '@/lib/storage';
import { sensitiveTools } from '@/lib/sensitive-tools';
import { translate } from '@/i18n';

const run = (id: string, input: string, secondary = '', p: Record<string, string | boolean> = {}) =>
  transform(id, input, secondary, { ...defaults(id), ...p });
const inspect = (
  id: string,
  input: string,
  secondary = '',
  p: Record<string, string | boolean> = {}
) => JSON.parse(transformInspect(id, input, secondary, { ...defaults(id), ...p }).text);

describe('request parameters', () => {
  it('preserves duplicate order, empty values and Unicode through pair conversion', async () => {
    const query = 'tag=one&x=&tag=%E4%BD%A0%E5%A5%BD&space=a+b';
    const pairs = await run('request-params', query, '', { outputFormat: 'pairs' });
    expect(JSON.parse(pairs.text)).toEqual([
      ['tag', 'one'],
      ['x', ''],
      ['tag', '你好'],
      ['space', 'a b'],
    ]);
    expect(
      (
        await run('request-params', pairs.text, '', {
          sourceFormat: 'pairs',
          outputFormat: 'query',
        })
      ).text
    ).toBe(query);
  });
  it('retains repeated values in JSON without prototype pollution', () => {
    const result = inspect('request-params', '__proto__=safe&a=1&a=2');
    expect(Object.hasOwn(result, '__proto__')).toBe(true);
    expect(result.a).toEqual(['1', '2']);
  });
  it('rejects nested JSON and invalid percent encodings', async () => {
    await expect(
      run('request-params', '{"a":{"b":1}}', '', { sourceFormat: 'json' })
    ).rejects.toThrow('unsupported');
    await expect(run('request-params', 'a=%xy')).rejects.toThrow('invalid');
    await expect(run('request-params', 'a=%ff')).rejects.toThrow('invalid');
  });
  it('keeps colons within form values', () => {
    expect(
      inspect('request-params', 'url: https://example.test:8080', '', { sourceFormat: 'key-value' })
    ).toEqual({ url: 'https://example.test:8080' });
  });
});

describe('schema inference and JSON reshaping', () => {
  it('merges object samples and preserves null and optional fields', () => {
    const schema = inferSchema(
      [
        [
          { id: 1, name: 'Ada' },
          { id: 2, name: null, active: true },
        ],
      ],
      false
    );
    const items = schema.items as Record<string, unknown>;
    expect(items.required).toEqual(['id', 'name']);
    expect((items.properties as Record<string, unknown>).name).toEqual({
      anyOf: [{ type: 'string' }, { type: 'null' }],
    });
    expect(inferSchema([[]], false)).toEqual({ type: 'array', items: {} });
  });
  it('generates syntax-valid Zod code with safe property keys', async () => {
    const result = await run('json-schema', '{"__proto__":1,"odd-name":null,"list":[]}');
    expect(result.text).toContain('["__proto__"]');
    expect(result.text).toContain('z.null()');
    expect(result.text).toContain('z.array(z.unknown())');
  });
  it('can make all inferred fields optional and export JSON Schema', async () => {
    const result = JSON.parse(
      (await run('json-schema', '{"id":1}', '', { target: 'json-schema', optionalFields: true }))
        .text
    );
    expect(result.required).toEqual([]);
    expect(result.$schema).toContain('2020-12');
  });
  it('selects nested arrays then picks and renames fields', () => {
    expect(
      inspect('json-reshape', '{"data":[{"id":1,"name":"Ada","extra":true}]}', '', {
        query: '$.data',
        pickFields: 'id,name',
        renameFields: '{"name":"label"}',
      })
    ).toEqual([{ id: 1, label: 'Ada' }]);
  });
  it('rejects rename collisions and duplicate map keys', () => {
    expect(() =>
      inspect('json-reshape', '{"id":1,"name":2}', '', { renameFields: '{"name":"id"}' })
    ).toThrow('duplicate');
    expect(() => inspect('json-reshape', '[{"id":1},{"id":"1"}]', '', { mode: 'to-map' })).toThrow(
      'duplicate'
    );
  });
  it('flattens ambiguous keys with lossless path arrays and preserves empty containers', () => {
    const result = inspect('json-reshape', '{"a.b":1,"a":{"b":2},"empty":[]}', '', {
      mode: 'flatten',
    });
    expect(result['["a.b"]']).toBe(1);
    expect(result['["a","b"]']).toBe(2);
    expect(result['["empty"]']).toEqual([]);
  });
});

describe('configuration and translations', () => {
  it('compares env values without displaying secrets by default', () => {
    const result = inspect(
      'env-diff',
      'export TOKEN="secret #value"\nHOST=local # comment',
      'TOKEN=other\nNEW=yes'
    );
    expect(result.changed).toEqual([{ key: 'TOKEN' }]);
    expect(result.onlyInSource).toEqual(['HOST']);
    expect(JSON.stringify(result)).not.toContain('secret');
  });
  it('reads multiline quoted env values without expanding variables', () => {
    expect(
      inspect('env-diff', 'TEXT="a\nb"\nREF=${HOME}', 'TEXT="a\nb"\nREF=${HOME}').unchangedCount
    ).toBe(2);
  });
  it('generates example config with no original values', async () => {
    expect(
      (await run('env-diff', 'TOKEN=secret', 'HOST=local', { mode: 'env-example' })).text
    ).toBe('TOKEN=\nHOST=');
  });
  it('rejects duplicates and incomplete env quotes', () => {
    expect(() => inspect('env-diff', 'X=1\nX=2')).toThrow('duplicate');
    expect(() => inspect('env-diff', 'X="unfinished')).toThrow('invalid');
  });
  it('finds missing keys, blanks and changed placeholder names', () => {
    const result = inspect(
      'i18n-check',
      '{"hello":"Hello {{name}}","only":"Only","nested":{"count":"{count}"}}',
      '{"hello":"你好 {{user}}","blank":"","nested":{"count":"{count}"}}'
    );
    expect(result.missingInTarget).toEqual([['only']]);
    expect(result.emptyTranslations).toEqual([['blank']]);
    expect(result.placeholderMismatches).toHaveLength(1);
  });
  it('does not confuse dots in literal keys with nested keys', () => {
    expect(inspect('i18n-check', '{"a.b":"x"}', '{"a":{"b":"x"}}').missingInTarget).toEqual([
      ['a.b'],
    ]);
  });
  it('checks printf argument counts without treating escaped percent signs as arguments', () => {
    const result = inspect('i18n-check', '{"a":"%s %s","b":"%%s"}', '{"a":"%s","b":"literal"}');
    expect(result.placeholderMismatches).toHaveLength(1);
    expect(result.placeholderMismatches[0].path).toEqual(['a']);
  });
  it('blocks persistent drafts for all sensitive tools', () => {
    for (const id of sensitiveTools) {
      expect(readDraft(id)).toBeUndefined();
      expect(writeDraft(id, { input: 'secret', secondary: '', params: {} })).toBe(false);
    }
  });
});

describe('HAR analysis', () => {
  const entry = (url: string, time = 10, size = 100, status = 200) => ({
    request: { url, method: 'GET', headers: [{ name: 'Authorization', value: 'secret' }] },
    response: { status, content: { size, text: 'private' } },
    time,
    timings: { wait: time },
  });
  it('sorts slow and large responses, identifies errors and exact repeats', () => {
    const result = inspect(
      'har-analyzer',
      JSON.stringify({
        log: {
          entries: [
            entry('https://a.test/?q=1'),
            entry('https://a.test/?q=2', 50, 300, 500),
            entry('https://a.test/?q=1', 20),
          ],
        },
      })
    );
    expect(result.slowest[0].timeMs).toBe(50);
    expect(result.largest[0].sizeBytes).toBe(300);
    expect(result.errors).toHaveLength(1);
    expect(result.repeated[0].indices).toEqual([0, 2]);
    expect(JSON.stringify(result)).not.toMatch(/secret|private|q=1|q=2/);
  });
  it('does not count unknown content sizes as negative bytes', () => {
    expect(
      inspect(
        'har-analyzer',
        JSON.stringify({ log: { entries: [entry('https://a.test', 1, -1)] } })
      ).decodedContentBytes
    ).toBe(0);
  });
  it('rejects invalid HAR and reports empty logs', () => {
    expect(() => inspect('har-analyzer', '{"log":{}}')).toThrow('invalid');
    expect(inspect('har-analyzer', '{"log":{"entries":[]}}').count).toBe(0);
  });
});

describe('text encoding', () => {
  it.each(['utf-8', 'utf-16le', 'utf-16be', 'gbk'])('round trips Chinese in %s', (encoding) => {
    expect(
      new TextDecoder(encoding, { fatal: true }).decode(encodeText('Hello 世界', encoding))
    ).toBe('Hello 世界');
  });
  it('rejects characters outside GBK instead of replacing them', () => {
    expect(() => encodeText('😀', 'gbk')).toThrow('unrepresentable');
    expect(() => encodeText('\ud800', 'utf-8')).toThrow('encoding');
  });
  it('detects BOM, mixed line endings and zero width characters from a file', async () => {
    const bytes = new Uint8Array([
      0xef,
      0xbb,
      0xbf,
      ...new TextEncoder().encode('a\r\nb\nc\rd\u200b'),
    ]);
    const result = JSON.parse(
      (await transformEncoding('', defaults('text-encoding'), new File([bytes], 'input.txt'))).text
    );
    expect(result.hasBom).toBe(true);
    expect(result.crlf).toBe(1);
    expect(result.lf).toBe(1);
    expect(result.cr).toBe(1);
    expect(result.invisibleCharacters[0].codePoint).toBe('U+200B');
  });
  it('exports selected encoding with BOM and normalized line endings', async () => {
    const result = await transformEncoding('你好\na', {
      ...defaults('text-encoding'),
      mode: 'convert',
      targetEncoding: 'utf-16le',
      bom: true,
      newline: 'CRLF',
    });
    expect(result.bytes?.slice(0, 2)).toEqual(new Uint8Array([0xff, 0xfe]));
    expect(new TextDecoder('utf-16le').decode(result.bytes)).toBe('你好\r\na');
  });
  it('rejects invalid UTF-8 files', async () => {
    await expect(
      transformEncoding(
        '',
        defaults('text-encoding'),
        new File([new Uint8Array([0xff])], 'invalid.txt')
      )
    ).rejects.toThrow('encoding');
  });
});

describe('existing tool extensions', () => {
  it('matches array objects by typed identity without reporting reordering', () => {
    expect(
      jsonDiff(
        [
          { id: 1, x: 'a' },
          { id: 2, x: 'b' },
        ],
        [
          { id: 2, x: 'b' },
          { id: 1, x: 'a' },
        ],
        '$',
        'id'
      )
    ).toEqual([]);
    expect(jsonDiff([{ id: 1 }], [{ id: '1' }], '$', 'id')).toHaveLength(2);
    expect(() => jsonDiff([{ id: 1 }, { id: 1 }], [], '$', 'id')).toThrow('duplicate');
    expect(() => jsonDiff([{ x: 1 }], [{ id: 1 }], '$', 'id')).toThrow('params');
  });
  it('compares duplicate URL parameters and their order', async () => {
    const result = JSON.parse(
      (
        await run('url-parser', 'https://a.test/?a=1&a=2', 'https://a.test/?a=2&a=1&b=', {
          mode: 'compare',
        })
      ).text
    );
    expect(result.parameters).toEqual([
      { key: 'a', kind: 'changed', before: ['1', '2'], after: ['2', '1'] },
      { key: 'b', kind: 'added', before: [], after: [''] },
    ]);
    expect(result.parameterOrderChanged).toBe(true);
  });
  it('parses common PowerShell curl.exe and escaped single quotes', () => {
    const input =
      "curl.exe 'https://example.test/?a=1&b=2' `\r\n -H 'X-Name: it''s local' `\r\n --data-raw '{\"name\":\"Ada\"}'";
    const result = parseCurl(input);
    expect(result.headers['X-Name']).toBe("it's local");
    expect(result.body).toBe('{"name":"Ada"}');
    expect(result.method).toBe('POST');
  });
  it('rejects dynamic PowerShell expressions', () => {
    expect(() => parseCurl('curl.exe "https://a.test/$TOKEN"')).toThrow('unsupported');
    expect(() => parseCurl("curl.exe 'https://a.test' | Write-Host")).toThrow('unsupported');
  });
  it('redacts URL, headers and nested JSON body while retaining structure', () => {
    const result = JSON.parse(
      curlToCode(
        `curl 'https://a.test/?token=secret&tag=a&tag=b' -H 'Authorization: Bearer secret' -d '{"password":"secret","user":{"api_key":"secret","id":1}}'`,
        'request-json',
        true
      )
    );
    expect(JSON.stringify(result)).not.toContain('secret');
    expect(new URL(result.url).searchParams.getAll('tag')).toEqual(['a', 'b']);
    expect(JSON.parse(result.body).user).toEqual({ api_key: 'REDACTED', id: 1 });
  });
  it('formats Markdown and returns preview HTML separately', async () => {
    const result = await run('code-formatter', '# Hello\n\n**DevKit**', '', {
      language: 'markdown',
    });
    expect(result.extension).toBe('md');
    expect(result.html).toContain('<strong>DevKit</strong>');
  });
  it('has translated labels for every field and tool', () => {
    for (const list of Object.values(fields))
      for (const field of list)
        for (const locale of ['zh-CN', 'en'] as const)
          expect(translate(locale, `fields.${field.key}`)).not.toBe(`fields.${field.key}`);
  });
});
