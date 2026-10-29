import { fail } from '@/lib/errors';

export type Params = Record<string, string | boolean>;
export interface Field {
  key: string;
  type: 'text' | 'number' | 'select' | 'checkbox' | 'textarea' | 'password';
  default: string | boolean;
  options?: string[];
}
const select = (key: string, options: string[], value = options[0]): Field => ({
  key,
  type: 'select',
  default: value,
  options,
});
const text = (key: string, value = '', type: Field['type'] = 'text'): Field => ({
  key,
  type,
  default: value,
});
const number = (key: string, value: number): Field => text(key, String(value), 'number');
const check = (key: string, value = false): Field => ({ key, type: 'checkbox', default: value });
const zone = () => text('fromZone', Intl.DateTimeFormat().resolvedOptions().timeZone);
const codeLanguage = () =>
  select('language', ['javascript', 'typescript', 'html', 'css', 'sql', 'markdown']);
const outputEncoding = () => select('encoding', ['HEX', 'Base64']);
export const fields: Record<string, Field[]> = {
  'json-mock': [number('count', 10)],
  'request-converter': [select('target', ['fetch', 'axios', 'curl', 'python'])],
  openapi: [select('mode', ['types', 'requests'])],
  websocket: [],
  spreadsheet: [
    select('format', ['json', 'csv', 'xlsx']),
    number('sheet', 1),
    check('unique', false),
    text('columnNames', ''),
    text('filterColumn', ''),
    text('filterValue', ''),
    number('chunk', 0),
  ],
  'sql-tools': [
    select('mode', ['insert', 'ddl-types', 'fill']),
    text('table', 'users'),
    text('values', '[1,"Ada"]', 'textarea'),
  ],
  'format-converter': [
    select('sourceFormat', ['json', 'xml', 'yaml', 'toml', 'ini']),
    select('outputFormat', ['yaml', 'json', 'xml', 'toml', 'ini']),
  ],
  'text-analyzer': [
    select('mode', ['statistics', 'extract', 'group']),
    text('extractFields', 'name,email'),
    text('groupKey', 'team'),
    text('sumKey'),
  ],
  'image-css': [select('mode', ['data-uri', 'css'])],
  'css-converter': [
    select('mode', ['css-to-js', 'js-to-css', 'px-rem', 'sort']),
    number('rootSize', 16),
  ],
  'font-preview': [number('fontSize', 36), number('fontWeight', 400), number('lineHeight', 1.6)],
  'table-generator': [select('format', ['html', 'markdown'])],
  'image-batch': [
    select('format', ['webp', 'jpeg', 'png']),
    number('width', 1920),
    number('height', 1080),
    number('quality', 0.85),
    text('watermark', ''),
  ],
  'image-stitch': [
    select('layout', ['grid', 'vertical', 'horizontal']),
    number('columns', 2),
    number('width', 480),
    number('height', 320),
    number('gap', 16),
    text('background', '#ffffff'),
  ],
  'image-palette': [number('count', 6)],
  'image-annotate': [],
  'markdown-workbench': [],
  'pdf-tools': [
    select('mode', ['merge', 'extract', 'split', 'images']),
    text('pages', ''),
    number('scale', 1.5),
  ],
  'text-cleaner': [
    select('normalization', ['none', 'NFC', 'NFKC']),
    check('trimLines', true),
    check('removeBlank', false),
    check('unique', false),
    select('punctuation', ['preserve', 'ascii']),
  ],
  'document-diff': [select('mode', ['lines', 'words'])],
  'audio-editor': [number('start', 0), text('end', ''), number('volume', 1), number('fade', 0)],
  'video-frames': [text('times', '0'), number('width', 1280)],
  'subtitle-tools': [
    select('mode', ['convert', 'merge']),
    select('format', ['srt', 'vtt']),
    number('offset', 0),
  ],
  'file-rename': [
    select('mode', ['sequence', 'replace', 'regex']),
    text('prefix', 'file-'),
    number('start', 1),
    text('find', 'old'),
    text('flags', 'g'),
    text('replace', 'new'),
    check('exportFiles', false),
  ],
  'file-duplicates': [],
  'file-signature': [],
  'text-redact': [
    check('email', true),
    check('phone', true),
    check('identity', true),
    check('token', true),
  ],
  'password-generator': [
    select('mode', ['password', 'passphrase']),
    number('count', 5),
    number('length', 20),
    number('words', 6),
    check('lower', true),
    check('upper', true),
    check('digits', true),
    check('symbols', true),
  ],
  certificate: [],
  'date-workbench': [
    select('mode', ['zones', 'countdown']),
    text('instant', '2026-10-29T12:00:00+08:00'),
  ],
  'split-bill': [],
  'unit-converter': [
    select('fromUnit', [
      'm',
      'km',
      'cm',
      'inch',
      'ft',
      'kg',
      'g',
      'lb',
      'C',
      'F',
      'K',
      'm/s',
      'km/h',
      'mph',
      'B',
      'KB',
      'MB',
      'GB',
      'KiB',
      'MiB',
      'GiB',
    ]),
    select('toUnit', [
      'km',
      'm',
      'cm',
      'inch',
      'ft',
      'kg',
      'g',
      'lb',
      'C',
      'F',
      'K',
      'm/s',
      'km/h',
      'mph',
      'B',
      'KB',
      'MB',
      'GB',
      'KiB',
      'MiB',
      'GiB',
    ]),
  ],
  lottery: [number('count', 1), check('unique', true)],
  'pixel-editor': [number('scale', 20)],
  'ascii-art': [number('width', 80), text('characters', '@%#*+=-:. ')],
  'screenshot-beautify': [
    number('padding', 60),
    number('radius', 16),
    check('windowFrame', true),
    check('phoneFrame'),
    text('background', '#0066cc'),
    text('backgroundEnd', '#10b981'),
  ],
  'code-card': [
    select('language', ['javascript', 'typescript', 'json', 'css', 'html', 'python', 'sql']),
    number('fontSize', 18),
    number('padding', 40),
    text('title', 'DevKit'),
    text('background', '#0066cc'),
  ],
  'link-tools': [select('mode', ['extract', 'append']), text('query', 'utm_source=devkit')],
  decision: [],
  'browser-check': [],
  workflow: [
    text(
      'workflowSteps',
      '[\n  {\n    "tool": "json-formatter",\n    "params": {\n      "mode": "format"\n    }\n  },\n  {\n    "tool": "json-typescript",\n    "params": {\n      "rootName": "Root"\n    }\n  }\n]',
      'textarea'
    ),
  ],
  'json-formatter': [
    select('mode', ['format', 'compact', 'validate']),
    select('indent', ['2', '4', 'tab']),
    check('sortKeys'),
  ],
  'json-escape': [select('mode', ['escape', 'unescape'])],
  'json-diff': [text('identityKey')],
  'request-params': [
    select('sourceFormat', ['query', 'json', 'key-value', 'pairs']),
    select('outputFormat', ['json', 'query', 'key-value', 'pairs']),
  ],
  'typescript-json': [text('rootName'), check('includeOptional', true), number('arrayCount', 1)],
  'json-schema': [
    select('target', ['zod', 'json-schema']),
    text('rootName', 'Root'),
    check('optionalFields'),
  ],
  'json-reshape': [
    select('mode', ['pick-rename', 'flatten', 'to-map']),
    text('query', '$'),
    text('pickFields'),
    text('renameFields', '{}', 'textarea'),
    text('identityKey', 'id'),
  ],
  'har-analyzer': [number('count', 10), check('redact', true)],
  'env-diff': [select('mode', ['compare', 'env-example']), check('showValues')],
  'i18n-check': [],
  'svg-tools': [select('mode', ['optimize', 'jsx', 'data-uri'])],
  'image-tools': [
    select('format', ['webp', 'jpeg', 'png']),
    number('width', 1920),
    number('height', 1080),
    number('quality', 0.8),
  ],
  'qr-code': [
    select('mode', ['generate', 'read-qr']),
    number('width', 320),
    select('correction', ['M', 'L', 'Q', 'H']),
  ],
  'text-encoding': [
    select('mode', ['inspect', 'convert']),
    select('sourceEncoding', ['utf-8', 'gbk', 'utf-16le', 'utf-16be']),
    select('targetEncoding', ['utf-8', 'gbk', 'utf-16le', 'utf-16be']),
    select('newline', ['preserve', 'LF', 'CRLF']),
    check('bom'),
  ],
  'json-path': [text('query', '$.users[*].name')],
  'json-yaml': [select('mode', ['json-to-yaml', 'yaml-to-json'])],
  'json-csv': [
    select('mode', ['json-to-csv', 'csv-to-json']),
    text('delimiter', ','),
    check('header', true),
    select('newline', ['LF', 'CRLF']),
    check('bom'),
    select('nested', ['reject', 'stringify']),
    check('formula', true),
  ],
  'json-typescript': [select('mode', ['interface', 'type']), text('rootName', 'Root')],
  base64: [
    select('mode', ['encode', 'decode']),
    select('variant', ['Base64', 'Base64URL']),
    select('format', ['text', 'bytes']),
  ],
  'url-codec': [
    select('mode', ['encode', 'decode']),
    select('variant', ['component', 'uri', 'form']),
  ],
  'unicode-html': [
    select('mode', ['unicode-encode', 'unicode-decode', 'html-encode', 'html-decode']),
  ],
  hash: [select('algorithm', ['SHA-256', 'SHA-512', 'SHA-1', 'MD5']), outputEncoding()],
  aes: [
    select('mode', ['encrypt', 'decrypt']),
    select('algorithm', ['AES-GCM', 'AES-CBC']),
    select('keyEncoding', ['HEX', 'Base64']),
    text('key', '', 'password'),
    text('iv'),
  ],
  hmac: [
    select('mode', ['generate', 'verify']),
    select('algorithm', ['SHA-256', 'SHA-512']),
    select('keyEncoding', ['text', 'HEX', 'Base64']),
    text('key', '', 'password'),
    check('allowEmpty'),
    outputEncoding(),
    text('signature'),
  ],
  jwt: [],
  timestamp: [select('unit', ['auto', 's', 'ms'])],
  timezone: [zone(), text('toZone', 'UTC')],
  'date-calculator': [
    select('mode', ['calendar', 'duration', 'difference', 'convert']),
    zone(),
    number('amount', 1),
    text('endDate', '2026-10-29T09:00:00'),
  ],
  cron: [check('seconds'), text('toZone', 'UTC')],
  'code-formatter': [
    codeLanguage(),
    select('dialect', ['postgresql', 'mysql', 'sqlite', 'sql']),
    select('indent', ['2', '4', 'tab']),
  ],
  'code-minifier': [select('language', ['javascript', 'html', 'css'])],
  'js-obfuscator': [
    select('preset', ['light', 'standard']),
    check('compact', true),
    check('stringArray'),
  ],
  'text-diff': [select('mode', ['line', 'character']), check('ignoreSpace'), check('ignoreCase')],
  regex: [
    text('pattern', '([\\w.+-]+)@([\\w.-]+)'),
    text('flags', 'g'),
    text('replacement', '$1 [at] $2'),
  ],
  'text-batch': [text('steps', 'trim,empty,unique'), text('prefix'), text('suffix')],
  'string-case': [
    select('mode', [
      'camelCase',
      'PascalCase',
      'snake_case',
      'kebab-case',
      'UPPERCASE',
      'lowercase',
      'escape',
      'unescape',
      'LF',
      'CRLF',
    ]),
  ],
  color: [text('contrast', '#ffffff'), text('background', '#ffffff')],
  gradient: [
    select('mode', ['linear', 'radial', 'conic']),
    text('stops', '#0066cc 0%, #8b5cf6 55%, #ec4899 100%'),
    number('angle', 135),
    text('position', '50% 50%'),
  ],
  shadow: [
    text(
      'layers',
      '[{"x":0,"y":12,"blur":32,"spread":-8,"color":"#0066cc55","inset":false},{"x":0,"y":2,"blur":6,"spread":0,"color":"#00000012"}]',
      'textarea'
    ),
    text('background', '#f0f1f4'),
  ],
  radius: [
    text('corners', '24 48 24 48'),
    text('vertical'),
    select('unit', ['px', '%']),
    number('width', 280),
    number('height', 180),
  ],
  flex: [
    select('direction', ['row', 'column', 'row-reverse', 'column-reverse']),
    select('wrap', ['wrap', 'nowrap', 'wrap-reverse']),
    select('justify', [
      'flex-start',
      'center',
      'flex-end',
      'space-between',
      'space-around',
      'space-evenly',
    ]),
    select('align', ['stretch', 'center', 'flex-start', 'flex-end', 'baseline']),
    number('gap', 12),
    text(
      'items',
      '[{"grow":0,"shrink":1,"basis":"80px","order":0,"alignSelf":"auto"},{"grow":1,"shrink":1,"basis":"80px"},{"grow":0,"shrink":1,"basis":"80px"}]',
      'textarea'
    ),
  ],
  grid: [
    text('columns', 'repeat(3, 1fr)'),
    text('rows', 'repeat(2, 90px)'),
    number('gap', 12),
    text('areas'),
    text(
      'placement',
      '[{"column":"1 / 3","row":"1"},{"column":"3","row":"1 / 3"},{"column":"1 / 3","row":"2"}]',
      'textarea'
    ),
  ],
  'css-units': [
    select('fromUnit', ['px', 'rem', 'em', 'vw', 'vh']),
    select('toUnit', ['rem', 'px', 'em', 'vw', 'vh']),
    number('rootSize', 16),
    number('parentSize', 16),
    number('viewportWidth', 1440),
    number('viewportHeight', 900),
  ],
  animation: [
    number('duration', 1.5),
    number('delay', 0),
    text('iterations', 'infinite'),
    select('direction', ['alternate', 'normal', 'reverse', 'alternate-reverse']),
    select('fill', ['both', 'none', 'forwards', 'backwards']),
    text('bezier', '0.4, 0, 0.2, 1'),
    text(
      'keyframes',
      '[{"offset":0,"transform":"translateX(-60px) scale(0.8)","opacity":0.4},{"offset":100,"transform":"translateX(60px) scale(1)","opacity":1}]',
      'textarea'
    ),
  ],
  'url-parser': [
    select('mode', ['parse', 'compare']),
    text('protocol'),
    text('hostname'),
    text('port'),
    text('pathname'),
    text('fragment'),
    text('params', '', 'textarea'),
    check('reencode'),
  ],
  'curl-converter': [
    select('target', ['fetch', 'axios', 'python', 'request-json']),
    check('redact'),
  ],
  'http-reference': [],
  random: [
    select('mode', ['uuid', 'string']),
    number('count', 1),
    number('length', 24),
    text('charset', 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'),
  ],
  radix: [select('fromBase', ['10', '2', '8', '16']), select('toBase', ['16', '10', '2', '8'])],
  'mock-data': [
    number('count', 100),
    text('seed', 'devkit'),
    select('format', ['json', 'csv']),
    text(
      'schema',
      '[{"name":"id","type":"id"},{"name":"name","type":"name"},{"name":"email","type":"email"},{"name":"age","type":"integer","min":18,"max":80}]',
      'textarea'
    ),
  ],
};
export const defaults = (id: string): Params =>
  Object.fromEntries((fields[id] ?? []).map((f) => [f.key, f.default]));
export function validateParams(id: string, params: Params) {
  for (const field of fields[id] ?? []) {
    if (field.options && !field.options.includes(String(params[field.key]))) fail('params');
    if (field.type === 'checkbox' && typeof params[field.key] !== 'boolean') fail('params');
  }
}
export { sensitiveTools } from '@/lib/sensitive-tools';
export const visualTools = new Set([
  'color',
  'gradient',
  'shadow',
  'radius',
  'flex',
  'grid',
  'animation',
]);
export const noInputTools = new Set([
  'password-generator',
  'gradient',
  'shadow',
  'radius',
  'flex',
  'grid',
  'animation',
  'random',
  'mock-data',
]);
