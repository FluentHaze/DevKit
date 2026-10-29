import { describe, expect, it } from 'vitest';
import { transform } from './transform';
import { defaults } from './schema';
import { renameFiles } from './file-names';
import { processFiles } from './file-workbench';
import { pageNumbers, wav } from './media-workbench';
import { unzipSync, strFromU8 } from 'fflate';
import type { Params } from './schema';
const run = (id: string, input = '', p: Params = {}, secondary = '') =>
  transform(id, input, secondary, { ...defaults(id), ...p });
const json = async (id: string, input = '', p: Params = {}) =>
  JSON.parse((await run(id, input, p)).text);

describe('developer workbenches', () => {
  it('converts literal fetch and axios without executing code', async () => {
    const fetch =
      'fetch("https://example.com", {method:"POST",headers:{"X-Test":"yes"},body:JSON.stringify({a:1})})';
    const curl = (await run('request-converter', fetch, { target: 'curl' })).text;
    expect(curl).toContain('--data-raw');
    expect(curl).toContain('{"a":1}');
    expect(
      (
        await run(
          'request-converter',
          'axios({url:"https://example.com",method:"POST",data:{a:1}})',
          { target: 'fetch' }
        )
      ).text
    ).toContain('fetch');
    await expect(run('request-converter', 'fetch(getUrl())')).rejects.toThrow();
    await expect(
      run('request-converter', 'fetch("https://example.com", {credentials:"include"})')
    ).rejects.toThrow('unsupported');
  });
  it('generates referenced OpenAPI types and rejects remote references', async () => {
    const source = {
      openapi: '3.0.3',
      components: {
        schemas: {
          User: { type: 'object', required: ['id'], properties: { id: { type: 'integer' } } },
          List: { type: 'array', items: { $ref: '#/components/schemas/User' } },
        },
      },
    };
    const text = (await run('openapi', JSON.stringify(source))).text;
    expect(text).toContain('Array<User>');
    expect(text).toContain('"id": number');
    source.components.schemas.List.items.$ref = 'https://example.com/schema';
    await expect(run('openapi', JSON.stringify(source))).rejects.toThrow('typeReference');
  });
  it('escapes SQL values and preserves placeholders in quotes/comments', async () => {
    const insert = (await run('sql-tools', '[{"name":"O\u0027Brien","active":true}]')).text;
    expect(insert).toContain("'O''Brien'");
    expect(insert).toContain('TRUE');
    const filled = await run('sql-tools', "SELECT '?' AS marker WHERE id=? -- ?\n", {
      mode: 'fill',
      values: '[42]',
    });
    expect(filled.text).toContain("SELECT '?' AS marker WHERE id=42 -- ?");
    expect(
      (
        await run('sql-tools', 'CREATE TABLE users (id INTEGER NOT NULL, name VARCHAR(100));', {
          mode: 'ddl-types',
        })
      ).text
    ).toContain('"name": string | null');
    await expect(run('sql-tools', 'SELECT ?', { mode: 'fill', values: '[]' })).rejects.toThrow(
      'params'
    );
  });
  it.each(['yaml', 'xml', 'toml', 'ini'])(
    'round trips supported structures through %s',
    async (format) => {
      const input = '{"app":{"name":"DevKit","port":3000}}';
      const converted = await run('format-converter', input, { outputFormat: format });
      const back = await json('format-converter', converted.text, {
        sourceFormat: format,
        outputFormat: 'json',
      });
      expect(back.app.name).toBe('DevKit');
      expect(Number(back.app.port)).toBe(3000);
    }
  );
  it('rejects XML entities and unsafe CSS conversions', async () => {
    await expect(
      run('format-converter', '<!DOCTYPE a [<!ENTITY x SYSTEM "file:///secret">]><a>&x;</a>', {
        sourceFormat: 'xml',
      })
    ).rejects.toThrow('unsupported');
    await expect(run('css-converter', 'color:red;color:blue')).rejects.toThrow('duplicate');
    await expect(run('css-converter', 'color:red!important')).rejects.toThrow('unsupported');
    expect((await run('css-converter', 'margin:16px 32px', { mode: 'px-rem' })).text).toContain(
      '1rem 2rem'
    );
    expect(await json('css-converter', 'margin-top:10px')).toEqual({ marginTop: '10px' });
  });
});

describe('everyday tools', () => {
  it('extracts fields and groups numeric data without coercing null', async () => {
    const source = '[{"team":"A","name":"Ada","amount":3},{"team":"A","name":"Lin","amount":4}]';
    expect(
      await json('text-analyzer', source, { mode: 'group', groupKey: 'team', sumKey: 'amount' })
    ).toEqual([{ value: 'A', count: 2, sum: 7 }]);
    expect(await json('text-analyzer', source, { mode: 'extract', extractFields: 'name' })).toEqual(
      [{ name: 'Ada' }, { name: 'Lin' }]
    );
    await expect(
      run('decision', '{"weights":{"x":1},"options":[{"name":"A","scores":{"x":null}}]}')
    ).rejects.toThrow('params');
  });
  it('finds fewer transfers than greedy settlement for small groups', async () => {
    const plan = await json(
      'split-bill',
      '[{"paidBy":"A","amount":0,"for":["B"]},{"paidBy":"C","amount":4,"for":["B"]},{"paidBy":"D","amount":6,"for":["A"]}]'
    );
    expect(plan.transfers).toHaveLength(2);
    const balances: Record<string, number> = { ...plan.balances };
    for (const tx of plan.transfers) {
      balances[tx.from] += tx.amount;
      balances[tx.to] -= tx.amount;
    }
    expect(Object.values(balances)).toEqual([0, 0, 0, 0]);
  });
  it('requires explicit time offsets and supports countdown without zone input', async () => {
    await expect(run('date-workbench', '[]', { instant: '2026-10-29 12:00' })).rejects.toThrow(
      'date'
    );
    const output = await json('date-workbench', '', {
      mode: 'countdown',
      instant: '2026-10-29T12:00:00+08:00',
    });
    expect(output.target).toBe('2026-10-29T04:00:00.000Z');
  });
  it('preserves JSON mock structure and generates safe example emails', async () => {
    const data = await json('json-mock', '{"email":"x","meta":{"active":true},"list":[1]}', {
      count: '2',
    });
    expect(data[1]).toEqual({ email: 'user2@example.com', meta: { active: false }, list: [2] });
  });
  it('escapes HTML and handles Unicode cleanup', async () => {
    expect((await run('table-generator', '[{"a":"<script>alert(1)</script>"}]')).text).toContain(
      '&lt;script&gt;'
    );
    expect(
      (
        await run('text-cleaner', '  ＡＢＣ，  \n\nABC,', {
          normalization: 'NFKC',
          unique: true,
          removeBlank: true,
        })
      ).text
    ).toBe('ABC,');
  });
  it('shifts and merges matching subtitles, refusing lossy timelines', async () => {
    const s = '1\n00:00:01,000 --> 00:00:02,000\nHello';
    expect((await run('subtitle-tools', s, { offset: '1', format: 'vtt' })).text).toContain(
      '00:00:02.000 --> 00:00:03.000'
    );
    expect(
      (await run('subtitle-tools', s, { mode: 'merge' }, s.replace('Hello', '你好'))).text
    ).toContain('Hello\n你好');
    await expect(run('subtitle-tools', s, { offset: '-2' })).rejects.toThrow('params');
  });
  it('redacts common secrets, emails, IDs and phones', async () => {
    const text = (
      await run('text-redact', 'ada@example.com 13800138000 110101199001011234 token=secret')
    ).text;
    expect(text).not.toContain('secret');
    expect(text).not.toContain('13800138000');
    expect(text).toContain('[EMAIL]');
    expect(text).toContain('[ID]');
    expect(
      (
        await run(
          'text-redact',
          'Authorization: Bearer private-token\nAuthorization=Basic c2VjcmV0'
        )
      ).text
    ).not.toMatch(/private-token|c2VjcmV0/);
  });
  it('passwords satisfy enabled character classes', async () => {
    const passwords = (
      await run('password-generator', '', { count: '30', length: '16' })
    ).text.split('\n');
    for (const password of passwords) {
      expect(password).toHaveLength(16);
      expect(password).toMatch(/[a-z]/);
      expect(password).toMatch(/[A-Z]/);
      expect(password).toMatch(/\d/);
      expect(password).toMatch(/[!@#$%^&*()-_=+]/);
    }
    expect(
      (
        await run('password-generator', '', { mode: 'passphrase', words: '5', count: '1' })
      ).text.split('-')
    ).toHaveLength(5);
  });
  it('settles cents exactly and rejects ambiguous fractional money', async () => {
    const data = await json(
      'split-bill',
      '[{"paidBy":"A","amount":0.01,"for":["A","B","C"]},{"paidBy":"B","amount":10,"for":["A","B"]}]'
    );
    expect(Object.values(data.balances).reduce((a: number, n) => a + Number(n), 0)).toBe(0);
    expect(data.transfers).toEqual([{ from: 'A', to: 'B', amount: 5 }]);
    await expect(run('split-bill', '[{"paidBy":"A","amount":0.001,"for":["B"]}]')).rejects.toThrow(
      'precision'
    );
  });
  it('converts temperature/storage and rejects unrelated dimensions', async () => {
    expect((await run('unit-converter', '32', { fromUnit: 'F', toUnit: 'C' })).text).toBe('0');
    expect((await run('unit-converter', '1', { fromUnit: 'GiB', toUnit: 'MiB' })).text).toBe(
      '1024'
    );
    await expect(run('unit-converter', '1', { fromUnit: 'kg', toUnit: 'm' })).rejects.toThrow(
      'params'
    );
  });
  it('draws without replacement, scores decisions and preserves duplicate query values', async () => {
    const picks = await json('lottery', '[{"name":"A","weight":1},{"name":"B","weight":10}]', {
      count: '2',
    });
    expect(new Set(picks).size).toBe(2);
    const ranked = await json(
      'decision',
      '{"weights":{"quality":1},"options":[{"name":"A","scores":{"quality":2}},{"name":"B","scores":{"quality":9}}]}'
    );
    expect(ranked[0].name).toBe('B');
    expect(
      (await run('link-tools', 'https://example.com/?x=1', { mode: 'append', query: 'x=2&x=' }))
        .text
    ).toContain('?x=1&x=2&x=');
  });
  it('chains built-in conversions and refuses arbitrary tools or recursive workflows', async () => {
    const result = await run('workflow', '{"id":1}', {
      workflowSteps:
        '[{"tool":"json-formatter","params":{"mode":"compact"}},{"tool":"json-typescript"}]',
    });
    expect(result.text).toContain('interface Root');
    await expect(run('workflow', '', { workflowSteps: '[{"tool":"workflow"}]' })).rejects.toThrow(
      'unsupported'
    );
    await expect(run('workflow', '', { workflowSteps: '[{"tool":"fetch"}]' })).rejects.toThrow(
      'unsupported'
    );
  });
});

describe('local files and media boundaries', () => {
  it('renames with regex captures and rejects malformed patterns', () => {
    const p = {
      ...defaults('file-rename'),
      mode: 'regex',
      find: '^(photo)-(\\d+)$',
      replace: '$2-$1',
      prefix: '',
    };
    expect(renameFiles(['photo-12.png'], p)[0].to).toBe('12-photo.png');
    expect(() => renameFiles(['photo-12.png'], { ...p, find: '(' })).toThrow('params');
  });
  it('previews safe names and refuses collisions and reserved names', () => {
    const params = defaults('file-rename');
    expect(renameFiles(['a.txt', 'b.txt'], params)).toEqual([
      { from: 'a.txt', to: 'file-001.txt' },
      { from: 'b.txt', to: 'file-002.txt' },
    ]);
    expect(() =>
      renameFiles(['a.txt', 'a.TXT'], { ...params, mode: 'replace', prefix: '' })
    ).toThrow('duplicate');
    expect(() => renameFiles(['a.txt'], { ...params, prefix: '../' })).toThrow('params');
  });
  it('exports renamed copies and retains content', async () => {
    const output = await processFiles(
      'file-rename',
      [new File(['one'], 'a.txt'), new File(['two'], 'b.txt')],
      '',
      { ...defaults('file-rename'), exportFiles: true }
    );
    const files = unzipSync(output.artifacts![0].bytes);
    expect(strFromU8(files['file-001.txt'])).toBe('one');
    expect(strFromU8(files['file-002.txt'])).toBe('two');
  });
  it('detects equal content and inspects headers without trusting extensions', async () => {
    const output = await processFiles(
      'file-duplicates',
      [new File(['same'], 'a'), new File(['same'], 'b')],
      '',
      {}
    );
    expect(JSON.parse(output.text)[0].names).toEqual(['a', 'b']);
    const signature = await processFiles(
      'file-signature',
      [new File(['%PDF-1.7'], 'wrong.jpg')],
      '',
      {}
    );
    expect(JSON.parse(signature.text)[0].extensionMatches).toBe(false);
  });
  it('deduplicates spreadsheet rows and prevents formula injection in CSV exports', async () => {
    const file = new File(['name,n\n=CMD(),1\nAda,2\nAda,2'], 'demo.csv');
    const p = { ...defaults('spreadsheet'), format: 'csv', unique: true };
    const output = await processFiles('spreadsheet', [file], '', p);
    const text = new TextDecoder().decode(output.artifacts![0].bytes);
    expect(text).toContain("'=CMD()");
    expect(text.match(/Ada/g)).toHaveLength(1);
  });
  it('reorders pages with one-based ranges and writes valid PCM headers', () => {
    expect(pageNumbers('3,1-2', 3)).toEqual([2, 0, 1]);
    expect(() => pageNumbers('0', 3)).toThrow('params');
    const bytes = wav([new Float32Array([0, 1, -1])], 44100);
    expect(new TextDecoder().decode(bytes.slice(0, 4))).toBe('RIFF');
    expect(new DataView(bytes.buffer).getUint32(40, true)).toBe(6);
  });
});
