import { fail, type Result } from '@/lib/errors';
import type { Params } from './schema';
import { parseJson, stringify } from './data';

function hasCmdEscapes(input: string): boolean {
  let quote = '';
  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    if (char === '\\' && quote !== "'") {
      i++;
      continue;
    }
    if (quote) {
      if (char === quote) quote = '';
      continue;
    }
    if (char === '^' && ['"', '\r', '\n'].includes(input[i + 1])) return true;
    if (char === '"' || char === "'") quote = char;
  }
  return false;
}

export function tokenizeCurl(input: string): string[] {
  // DevTools 的 CMD 格式使用 ^" 包围参数、^\^" 表示参数内的引号。
  if (hasCmdEscapes(input)) return tokenizeCmdCurl(input);
  if (/^\s*curl\.exe\b/i.test(input) || /`\r?\n/.test(input)) return tokenizePowerShellCurl(input);
  const tokens: string[] = [];
  let token = '';
  let quote = '';
  let active = false;
  for (let i = 0; i < input.length; i++) {
    const c = input[i];
    if (c === '\\' && quote !== "'") {
      if (input[i + 1] === '\r' && input[i + 2] === '\n') {
        i += 2;
        continue;
      }
      if (input[i + 1] === '\n') {
        i++;
        continue;
      }
      if (!input[i + 1]) fail('unsupported');
      if (quote === '"' && !['$', '`', '"', '\\'].includes(input[i + 1])) token += '\\';
      token += input[++i];
      active = true;
      continue;
    }
    if (quote) {
      if (quote === '"' && /[$`]/.test(c)) fail('unsupported');
      if (c === quote) quote = '';
      else token += c;
      active = true;
      continue;
    }
    if (c === "'" || c === '"') {
      quote = c;
      active = true;
      continue;
    }
    if (/\s/.test(c)) {
      if (active) tokens.push(token);
      token = '';
      active = false;
      continue;
    }
    if (/[|;&<>`$^]/.test(c)) fail('unsupported');
    token += c;
    active = true;
  }
  if (quote) fail('unsupported');
  if (active) tokens.push(token);
  return tokens;
}

function tokenizePowerShellCurl(input: string): string[] {
  const tokens: string[] = [];
  let quote = '',
    token = '',
    active = false;
  for (let i = 0; i < input.length; i++) {
    const c = input[i];
    if (c === '`' && quote !== "'") {
      if (input[i + 1] === '\r' && input[i + 2] === '\n') {
        i += 2;
        continue;
      }
      const next = input[++i];
      if (next === undefined) fail('unsupported');
      if (next === '\n') continue;
      if (!['`', '"', '$', ' ', "'"].includes(next)) fail('unsupported');
      token += next;
      active = true;
      continue;
    }
    if (quote) {
      if (quote === '"' && /[$]/.test(c)) fail('unsupported');
      if (c === quote) {
        if (quote === "'" && input[i + 1] === "'") {
          token += "'";
          i++;
        } else quote = '';
      } else token += c;
      active = true;
      continue;
    }
    if (c === '"' || c === "'") {
      quote = c;
      active = true;
      continue;
    }
    if (/\s/.test(c)) {
      if (active) tokens.push(token);
      token = '';
      active = false;
      continue;
    }
    if (/[|;&<>`$(){}@]/.test(c)) fail('unsupported');
    token += c;
    active = true;
  }
  if (quote) fail('unsupported');
  if (active) tokens.push(token);
  return tokens;
}

function tokenizeCmdCurl(input: string): string[] {
  const tokens: string[] = [];
  let token = '';
  let quoted = false;
  let active = false;
  for (let i = 0; i < input.length; i++) {
    const c = input[i];
    if (c === '^') {
      if (input.slice(i, i + 4) === '^\\^"') {
        token += '"';
        i += 3;
        active = true;
        continue;
      }
      if (input[i + 1] === '\r' && input[i + 2] === '\n') {
        i += 2;
        continue;
      }
      const next = input[++i];
      if (next === undefined) fail('unsupported');
      if (next === '\n') continue;
      if (next === '"') quoted = !quoted;
      else token += next;
      active = true;
      continue;
    }
    if (c === '\\' && input[i + 1] === '"') {
      token += '"';
      i++;
      active = true;
      continue;
    }
    if (c === '"') {
      quoted = !quoted;
      active = true;
      continue;
    }
    if (!quoted && /[&|<>();`$]/.test(c)) fail('unsupported');
    if (/[\r\n]/.test(c)) fail('unsupported');
    if (
      (c === '%' &&
        !/^%[\da-f]{2}/i.test(input.slice(i)) &&
        /^%[A-Za-z_][^%\s]*%/.test(input.slice(i))) ||
      (c === '!' && /^![^!\s]+!/.test(input.slice(i)))
    )
      fail('unsupported');
    if (!quoted && /\s/.test(c)) {
      if (active) tokens.push(token);
      token = '';
      active = false;
      continue;
    }
    token += c;
    active = true;
  }
  if (quoted) fail('unsupported');
  if (active) tokens.push(token);
  return tokens;
}
export interface CurlRequest {
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: string;
}
export function parseCurl(input: string): CurlRequest {
  const tokens = tokenizeCurl(input);
  if (!['curl', 'curl.exe'].includes(String(tokens.shift()))) fail('unsupported');
  let url = '';
  let method = '';
  let body: string | undefined;
  const headers: [string, string][] = [];
  let formData = false;
  for (let i = 0; i < tokens.length; i++) {
    let t = tokens[i];
    let inline: string | undefined;
    if (t.startsWith('--') && t.includes('=')) {
      const pos = t.indexOf('=');
      inline = t.slice(pos + 1);
      t = t.slice(0, pos);
    }
    const value = () => {
      const v = inline ?? tokens[++i];
      if (v === undefined) fail('unsupported');
      return v;
    };
    if (t === '-X' || t === '--request') {
      method = value();
      if (!/^[A-Z]+$/i.test(method)) fail('params');
    } else if (t === '-H' || t === '--header') {
      const h = value();
      const colon = h.indexOf(':');
      if (colon <= 0 || /[\r\n]/.test(h)) fail('unsupported');
      headers.push([h.slice(0, colon), h.slice(colon + 1).trim()]);
    } else if (['-d', '--data', '--data-raw', '--data-binary', '--data-urlencode'].includes(t)) {
      const data = value();
      if (data.startsWith('@') || body !== undefined || t === '--data-urlencode')
        fail('unsupported');
      body = data;
      formData = t === '-d' || t === '--data';
    } else if (t === '--url') {
      if (url) fail('unsupported');
      url = value();
    } else if (t.startsWith('-')) fail('unsupported', t);
    else {
      if (url) fail('unsupported');
      url = t;
    }
  }
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) fail('unsupported');
  } catch {
    return fail('invalid');
  }
  if (
    headers.some(
      ([name], index) =>
        headers.findIndex(([n]) => n.toLowerCase() === name.toLowerCase()) !== index
    )
  )
    fail('unsupported', 'Duplicate headers require manual handling.');
  if (body !== undefined && formData && !headers.some(([h]) => h.toLowerCase() === 'content-type'))
    headers.push(['Content-Type', 'application/x-www-form-urlencoded']);
  method ||= body === undefined ? 'GET' : 'POST';
  return {
    url,
    method,
    headers: Object.fromEntries(headers),
    ...(body !== undefined ? { body } : {}),
  };
}
const secretKey =
  /token|password|passwd|secret|authorization|cookie|api[-_]?key|session|credential|signature/i;
export function redactRequest(request: CurlRequest): CurlRequest {
  const url = new URL(request.url);
  if (url.username) url.username = 'REDACTED';
  if (url.password) url.password = 'REDACTED';
  if (url.hash) url.hash = 'REDACTED';
  const entries = [...url.searchParams].map(
    ([k, v]) => [k, secretKey.test(k) ? 'REDACTED' : v] as [string, string]
  );
  if (entries.some(([k]) => secretKey.test(k)))
    url.search = new URLSearchParams(entries).toString();
  const clean = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(clean);
    if (value && typeof value === 'object')
      return Object.fromEntries(
        Object.entries(value).map(([k, v]) => [k, secretKey.test(k) ? 'REDACTED' : clean(v)])
      );
    return value;
  };
  let body = request.body;
  if (body !== undefined) {
    try {
      body = JSON.stringify(clean(parseJson(body)));
    } catch {
      const contentType =
        Object.entries(request.headers).find(([k]) => k.toLowerCase() === 'content-type')?.[1] ??
        '';
      body = contentType.includes('application/x-www-form-urlencoded')
        ? new URLSearchParams(
            [...new URLSearchParams(body)].map(([k, v]) => [k, secretKey.test(k) ? 'REDACTED' : v])
          ).toString()
        : 'REDACTED';
    }
  }
  return {
    ...request,
    url: url.toString(),
    headers: Object.fromEntries(
      Object.entries(request.headers).map(([k, v]) => [k, secretKey.test(k) ? 'REDACTED' : v])
    ),
    ...(body !== undefined ? { body } : {}),
  };
}
export function curlToCode(input: string, target: string, redact = false): string {
  const parsed = parseCurl(input);
  const { url, method, body, headers: headerObject } = redact ? redactRequest(parsed) : parsed;
  if (target === 'request-json')
    return stringify({
      url,
      method,
      headers: headerObject,
      ...(body !== undefined ? { body } : {}),
    });
  if (target === 'python') {
    const json = JSON.stringify({
      method,
      url,
      headers: headerObject,
      ...(body !== undefined ? { data: body } : {}),
    });
    return `import json\nimport requests\n\noptions = json.loads(${JSON.stringify(json)})\nresponse = requests.request(**options)\nprint(response.text)\n`;
  }
  if (target === 'axios') {
    const config = stringify({
      url,
      method,
      headers: headerObject,
      ...(body !== undefined ? { data: body } : {}),
    });
    return `import axios from 'axios';\n\nconst config = ${config};\n${body !== undefined ? 'config.transformRequest = [(data) => data];\n' : ''}const response = await axios(config);\nconsole.log(response.data);\n`;
  }
  return `const response = await fetch(${JSON.stringify(url)}, ${stringify({ method, headers: headerObject, ...(body !== undefined ? { body } : {}) })});\nconst data = await response.text();\nconsole.log(data);\n`;
}
export function transformWeb(id: string, input: string, p: Params, secondary = ''): Result {
  if (id === 'curl-converter')
    return {
      text: curlToCode(input, String(p.target), Boolean(p.redact)),
      extension: p.target === 'python' ? 'py' : p.target === 'request-json' ? 'json' : 'js',
    };
  const url = new URL(input.trim());
  if (p.mode === 'compare') {
    const other = new URL(secondary.trim());
    if (
      ![url.protocol, other.protocol].every((v) => ['http:', 'https:', 'ftp:', 'file:'].includes(v))
    )
      fail('unsupported');
    const keys = [...new Set([...url.searchParams.keys(), ...other.searchParams.keys()])];
    return {
      text: stringify({
        components: ['protocol', 'username', 'password', 'hostname', 'port', 'pathname', 'hash']
          .filter((key) => url[key as keyof URL] !== other[key as keyof URL])
          .map((key) => ({
            key,
            before: String(url[key as keyof URL]),
            after: String(other[key as keyof URL]),
          })),
        parameters: keys.flatMap((key) => {
          const before = url.searchParams.getAll(key),
            after = other.searchParams.getAll(key);
          return stringify(before) === stringify(after)
            ? []
            : [
                {
                  key,
                  kind: !before.length ? 'added' : !after.length ? 'removed' : 'changed',
                  before,
                  after,
                },
              ];
        }),
        parameterOrderChanged:
          stringify([...url.searchParams]) !== stringify([...other.searchParams]),
      }),
      extension: 'json',
    };
  }
  if (!['http:', 'https:', 'ftp:', 'file:'].includes(url.protocol)) fail('unsupported');
  for (const key of ['protocol', 'hostname', 'port', 'pathname'] as const)
    if (p[key]) url[key] = String(p[key]);
  if (p.fragment) url.hash = String(p.fragment);
  if (p.params) {
    if (!p.reencode) fail('params');
    const pairs = parseJson(String(p.params));
    if (
      !Array.isArray(pairs) ||
      pairs.some(
        (v) => !Array.isArray(v) || v.length !== 2 || v.some((x: unknown) => typeof x !== 'string')
      )
    )
      fail('params');
    url.search = new URLSearchParams(pairs as [string, string][]).toString();
  }
  const params = url.search
    .slice(1)
    .split('&')
    .filter(Boolean)
    .map((part) => {
      const pos = part.indexOf('=');
      const rawKey = pos < 0 ? part : part.slice(0, pos);
      const rawValue = pos < 0 ? '' : part.slice(pos + 1);
      const decode = (s: string) => {
        try {
          return decodeURIComponent(s.replace(/\+/g, ' '));
        } catch {
          return fail('invalid');
        }
      };
      return { rawKey, rawValue, key: decode(rawKey), value: decode(rawValue) };
    });
  return {
    text: stringify({
      url: url.toString(),
      protocol: url.protocol,
      hostname: url.hostname,
      port: url.port,
      pathname: url.pathname,
      hash: url.hash,
      params,
    }),
    extension: 'json',
  };
}
