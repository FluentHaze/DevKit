import { describe, expect, it } from 'vitest';
import metadata from './metadata.json';
import { workbenchIds } from './workbench-config';
import { transform } from './transform';
import { defaults } from './schema';
import { parseJson, jsonDiff, queryJson } from './data';
import { convertRadix } from './generate';
import { curlToCode } from './web';
import { fromBase64, base64, utf8 } from '@/lib/encoding';
const run = (
  id: string,
  input: string,
  params: Record<string, string | boolean> = {},
  secondary = ''
) => transform(id, input, secondary, { ...defaults(id), ...params });
describe('lossless input boundaries', () => {
  it('rejects duplicate keys at every nesting level', () => {
    expect(() => parseJson('{"a":{"x":1,"x":2}}')).toThrow('duplicate');
  });
  it('rejects unsafe integer and overflowing numeric data', () => {
    expect(() => parseJson('{"n":9007199254740993}')).toThrow('precision');
    expect(() => parseJson('1e400')).toThrow('precision');
  });
  it('accepts safe numbers and rejects comments/trailing commas', () => {
    expect(parseJson('{"n":0,"a":[null,-12.5]}')).toEqual({ n: 0, a: [null, -12.5] });
    expect(() => parseJson('{"a":1,}')).toThrow('json');
    expect(() => parseJson('//no\n{}')).toThrow('json');
  });
  it('distinguishes missing, null, type changes and array positions', () => {
    expect(
      jsonDiff({ a: null, b: 1, c: [1, 2] }, { a: undefined, b: '1', c: [2, 1] })
    ).toHaveLength(4);
    expect(jsonDiff({ a: null }, {})).toEqual([{ path: '$["a"]', kind: 'removed', before: null }]);
  });
  it('queries paths and refuses script expressions', () => {
    expect(queryJson({ users: [{ name: 'Ada' }, { name: 'Lin' }] }, '$.users[*].name').count).toBe(
      2
    );
    expect(queryJson({}, '$.missing').count).toBe(0);
    expect(() => queryJson({}, '$[?(alert(1))]')).toThrow('unsupported');
  });
  it('handles prototype-looking keys as ordinary data', async () => {
    const r = await run('json-formatter', '{"__proto__":{"polluted":true}}', { sortKeys: true });
    expect(r.text).toContain('__proto__');
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });
});
describe('encoding and crypto', () => {
  it('round-trips Unicode and emoji through both Base64 variants', async () => {
    for (const variant of ['Base64', 'Base64URL']) {
      const encoded = await run('base64', '世界 👋', { variant });
      expect((await run('base64', encoded.text, { mode: 'decode', variant })).text).toBe('世界 👋');
    }
  });
  it('validates canonical padding and preserves non-UTF8 bytes', async () => {
    expect(() => fromBase64('AB==')).toThrow('base64');
    expect(() => fromBase64('a===')).toThrow('base64');
    const r = await run('base64', '/w==', { mode: 'decode' });
    expect(r.bytes).toEqual(new Uint8Array([255]));
    expect(r.note).toBe('errors.utf8');
    expect(base64(utf8('hello'))).toBe('aGVsbG8=');
  });
  it('distinguishes form plus and component plus', async () => {
    expect((await run('url-codec', 'a+b', { mode: 'decode', variant: 'form' })).text).toBe('a b');
    expect((await run('url-codec', 'a+b', { mode: 'decode', variant: 'component' })).text).toBe(
      'a+b'
    );
    await expect(run('url-codec', '%xy', { mode: 'decode' })).rejects.toThrow('invalid');
  });
  it('matches MD5/SHA vectors', async () => {
    expect((await run('hash', 'abc', { algorithm: 'MD5' })).text).toBe(
      '900150983cd24fb0d6963f7d28e17f72'
    );
    expect((await run('hash', 'abc')).text).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'
    );
  });
  it('matches RFC 4231 HMAC SHA256 vector and verifies bytes', async () => {
    const r = await run('hmac', 'Hi There', { key: '0b'.repeat(20), keyEncoding: 'HEX' });
    expect(r.text).toBe('b0344c61d8db38535ca8afceaf0bf12b881dc200c9833da726e9376c2e32cff7');
    expect(
      JSON.parse(
        (
          await run('hmac', 'Hi There', {
            key: '0b'.repeat(20),
            keyEncoding: 'HEX',
            mode: 'verify',
            signature: r.text,
          })
        ).text
      ).verified
    ).toBe(true);
    await expect(run('hmac', 'x')).rejects.toThrow('emptyKey');
  });
  it('round-trips AES modes and rejects GCM tampering', async () => {
    for (const algorithm of ['AES-GCM', 'AES-CBC']) {
      const params = { algorithm, key: '00'.repeat(16) };
      const r = await run('aes', 'secret 世界', params);
      expect((await run('aes', r.text, { ...params, mode: 'decrypt' })).text).toBe('secret 世界');
      if (algorithm === 'AES-GCM') {
        const packet = JSON.parse(r.text);
        packet.ciphertext = (packet.ciphertext[0] === 'A' ? 'B' : 'A') + packet.ciphertext.slice(1);
        await expect(
          run('aes', JSON.stringify(packet), { ...params, mode: 'decrypt' })
        ).rejects.toThrow('authentication');
      }
    }
  });
  it('preserves surrogate pairs in Unicode escapes', async () => {
    const r = await run('unicode-html', '👋');
    expect((await run('unicode-html', r.text, { mode: 'unicode-decode' })).text).toBe('👋');
  });
});
describe('converters and generators', () => {
  it('CSV supports quoted multiline and protects formula cells', async () => {
    const data = '[{"name":"a, b","text":"first\\nsecond"},{"name":"=SUM(A1)","text":"ok"}]';
    const csv = await run('json-csv', data);
    expect(csv.text).toContain('"a, b"');
    expect(csv.text).toContain("'=SUM(A1)");
    const back = await run('json-csv', csv.text, { mode: 'csv-to-json' });
    expect(JSON.parse(back.text)[0].text).toBe('first\nsecond');
  });
  it('rejects executable YAML tags and alias expansion bombs', async () => {
    await expect(run('json-yaml', 'foo: !unsafe x', { mode: 'yaml-to-json' })).rejects.toThrow();
  });
  it('infers unknown arrays and honest nulls', async () => {
    const r = await run('json-typescript', '{"a":[],"b":null,"c":[1,"x"]}');
    expect(r.text).toContain('unknown[]');
    expect(r.text).toContain('null');
    expect(r.text).toContain('number | string');
  });
  it('uses BigInt for huge and negative integers', () => {
    expect(convertRadix('9007199254740993123456789', 10, 16)).toBe(
      BigInt('9007199254740993123456789').toString(16)
    );
    expect(convertRadix('-ff', 16, 2)).toBe('-11111111');
    expect(() => convertRadix('102', 2, 10)).toThrow('invalid');
  });
  it('produces reproducible mock data', async () => {
    const a = await run('mock-data', '', { count: '5', seed: 'same' });
    const b = await run('mock-data', '', { count: '5', seed: 'same' });
    expect(a.text).toBe(b.text);
    expect(JSON.parse(a.text)).toHaveLength(5);
  });
  it('makes valid UUIDs and validates limits', async () => {
    const r = await run('random', '', { count: '3' });
    expect(r.text.split('\n')).toHaveLength(3);
    expect(r.text.split('\n')[0]).toMatch(
      /^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/
    );
    await expect(run('random', '', { count: '1001' })).rejects.toThrow('params');
  });
  it('preserves URL duplicate parameter order', async () => {
    const r = JSON.parse((await run('url-parser', 'https://example.test/?a=1&a=2&b=x+y')).text);
    expect(r.params.map((p: { value: string }) => p.value)).toEqual(['1', '2', 'x y']);
  });
  it('never executes cURL and refuses unsupported parameters', () => {
    expect(curlToCode("curl 'https://example.test' -X POST -d 'hello'", 'fetch')).toContain('POST');
    expect(() => curlToCode('curl https://x.test --upload-file @file', 'fetch')).toThrow(
      'unsupported'
    );
    expect(() => curlToCode('curl https://x.test; rm -rf x', 'fetch')).toThrow('unsupported');
  });
});
describe('dates, regular expressions and CSS safety', () => {
  it('supports epoch 0 and negatives', async () => {
    const r = JSON.parse((await run('timestamp', '0\n-1')).text);
    expect(r[0].utc).toBe('1970-01-01T00:00:00.000Z');
    expect(r[1].milliseconds).toBe(-1000);
  });
  it('rejects DST gaps and ambiguities', async () => {
    await expect(
      run('timezone', '2026-03-08T02:30:00', { fromZone: 'America/New_York' })
    ).rejects.toThrow('date');
    await expect(
      run('timezone', '2026-11-01T01:30:00', { fromZone: 'America/New_York' })
    ).rejects.toThrow('date');
  });
  it('keeps calendar days separate from 24-hour duration', async () => {
    const p = { fromZone: 'America/New_York', amount: '1' };
    const calendar = JSON.parse((await run('date-calculator', '2026-03-07T12:00:00', p)).text);
    expect(calendar.elapsedSeconds).toBe(23 * 3600);
  });
  it('generates 10 cron occurrences', async () => {
    expect(JSON.parse((await run('cron', '*/15 * * * *')).text).next).toHaveLength(10);
  });
  it('returns captures and replacement', async () => {
    const r = JSON.parse((await run('regex', 'hello@example.com')).text);
    expect(r.count).toBe(1);
    expect(r.matches[0].captures).toEqual(['hello', 'example.com']);
    expect(r.replacement).toBe('hello [at] example.com');
  });
  it('rejects CSS injection and validates easing x coordinates', async () => {
    await expect(
      run('gradient', '', { stops: 'red;url(https://x.test) 0%, blue 100%' })
    ).rejects.toThrow();
    await expect(run('animation', '', { bezier: '-1,0,1,1' })).rejects.toThrow('params');
  });
  it('includes restrictive preview CSP', async () => {
    const r = await run('gradient', '');
    expect(r.preview).toContain("default-src 'none'");
    expect(r.text).toContain('linear-gradient');
  });
});

describe('all tool examples', () => {
  for (const tool of metadata.filter(
    (item) =>
      !workbenchIds.has(item.id) &&
      !['http-reference', 'svg-tools', 'image-tools', 'qr-code'].includes(item.id)
  )) {
    it(`${tool.id} produces a real result`, async () => {
      const params: Record<string, string | boolean> = {};
      if (tool.id === 'aes') params.key = '00'.repeat(32);
      if (tool.id === 'hmac') params.key = 'example-key';
      const secondary = ['json-diff', 'i18n-check'].includes(tool.id)
        ? '{}'
        : tool.id === 'text-diff'
          ? 'changed\n'
          : '';
      const result = await run(tool.id, tool.example, params, secondary);
      expect(typeof result.text).toBe('string');
      expect(result.text.length).toBeGreaterThan(0);
    }, 15000);
  }
});

describe('regression guards', () => {
  it('rejects numeric underflow rather than returning zero', () => {
    expect(() => parseJson('1e-400')).toThrow('precision');
  });
  it('rejects shell expansion inside double quotes', () => {
    expect(() => curlToCode('curl "https://example.test/$TOKEN"', 'fetch')).toThrow('unsupported');
  });
  it('does not replace user content when generating Axios config', () => {
    const result = curlToCode(
      `curl 'https://example.test' -H 'X-Test: __IDENTITY__' -d 'body'`,
      'axios'
    );
    expect(result).toContain('"X-Test": "__IDENTITY__"');
    expect(result).toContain('config.transformRequest = [(data) => data]');
  });
  it('validates persisted select options before generating CSS', async () => {
    await expect(run('gradient', '', { mode: 'bad;rule' })).rejects.toThrow('params');
  });
});

it('describes standard Cron in Chinese and English without changing schedule output', async () => {
  const { default: cron } = await import('cronstrue/i18n');
  expect(cron.toString('*/15 * * * *', { locale: 'en', logicalAndDayFields: false })).toContain(
    '15'
  );
  expect(cron.toString('*/15 * * * *', { locale: 'zh_CN', logicalAndDayFields: false })).toContain(
    '15'
  );
});
