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
const codeLanguage = () => select('language', ['javascript', 'typescript', 'html', 'css', 'sql']);
const outputEncoding = () => select('encoding', ['HEX', 'Base64']);
export const fields: Record<string, Field[]> = {
  'json-formatter': [
    select('mode', ['format', 'compact', 'validate']),
    select('indent', ['2', '4', 'tab']),
    check('sortKeys'),
  ],
  'json-escape': [select('mode', ['escape', 'unescape'])],
  'json-diff': [],
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
    text('protocol'),
    text('hostname'),
    text('port'),
    text('pathname'),
    text('fragment'),
    text('params', '', 'textarea'),
    check('reencode'),
  ],
  'curl-converter': [select('target', ['fetch', 'axios', 'python'])],
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
export const sensitiveTools = new Set(['aes', 'hmac', 'jwt', 'curl-converter']);
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
  'gradient',
  'shadow',
  'radius',
  'flex',
  'grid',
  'animation',
  'random',
  'mock-data',
]);
