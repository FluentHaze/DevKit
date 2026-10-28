import { fail, type Result } from '@/lib/errors';
import type { Params } from './schema';
import { parseJson, stringify } from './data';

export function tokenizeCurl(input: string): string[] {
  const tokens: string[] = [];
  let token = '';
  let quote = '';
  let active = false;
  for (let i = 0; i < input.length; i++) {
    const c = input[i];
    if (c === '\\' && quote !== "'") {
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
export function curlToCode(input: string, target: string): string {
  const tokens = tokenizeCurl(input);
  if (tokens.shift() !== 'curl') fail('unsupported');
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
  const headerObject = Object.fromEntries(headers);
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
export function transformWeb(id: string, input: string, p: Params): Result {
  if (id === 'curl-converter')
    return {
      text: curlToCode(input, String(p.target)),
      extension: p.target === 'python' ? 'py' : 'js',
    };
  const url = new URL(input.trim());
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
