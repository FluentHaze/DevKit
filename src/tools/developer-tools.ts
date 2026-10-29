import { fail, type Result } from '@/lib/errors';
import { parseJson } from './data';
import { curlToCode, parseCurl } from './web';
import { record, rows, finite, jsonResult, outputLimit } from './workbench-utils';
import type { Params } from './schema';

interface Ast {
  type: string;
  [key: string]: unknown;
}
const ast = (v: unknown): Ast => record(v) as Ast;
async function literalRequest(input: string): Promise<string> {
  const { format } = await import('prettier/standalone');
  const { parsers } = await import('prettier/plugins/babel');
  const estree = await import('prettier/plugins/estree');
  let tree: unknown;
  await format(input, {
    parser: 'capture',
    plugins: [
      estree,
      {
        parsers: {
          capture: {
            ...parsers.babel,
            async parse(text, options) {
              tree = await parsers.babel.parse(text, options);
              return tree;
            },
          },
        },
      },
    ],
  });
  const file = ast(tree),
    program = file.program ? ast(file.program) : file;
  const body = program.body;
  if (!Array.isArray(body) || body.length !== 1) fail('unsupported');
  let expression = ast(ast(body[0]).expression);
  if (expression.type === 'AwaitExpression') expression = ast(expression.argument);
  if (expression.type !== 'CallExpression' || !Array.isArray(expression.arguments))
    fail('unsupported');
  function literal(v: unknown): unknown {
    const n = ast(v);
    if (
      ['StringLiteral', 'NumericLiteral', 'BooleanLiteral', 'NullLiteral', 'Literal'].includes(
        n.type
      )
    )
      return n.value ?? null;
    if (n.type === 'ObjectExpression' && Array.isArray(n.properties))
      return Object.fromEntries(
        n.properties.map((value) => {
          const prop = ast(value),
            key = ast(prop.key);
          if (prop.computed || prop.method || !['ObjectProperty', 'Property'].includes(prop.type))
            fail('unsupported');
          return [String(key.name ?? key.value), literal(prop.value)];
        })
      );
    if (n.type === 'ArrayExpression' && Array.isArray(n.elements)) return n.elements.map(literal);
    if (n.type === 'CallExpression') {
      const callee = ast(n.callee);
      if (
        callee.type === 'MemberExpression' &&
        !callee.computed &&
        ast(callee.object).name === 'JSON' &&
        ast(callee.property).name === 'stringify' &&
        Array.isArray(n.arguments) &&
        n.arguments.length === 1
      )
        return JSON.stringify(literal(n.arguments[0]));
    }
    return fail('unsupported');
  }
  const callee = ast(expression.callee),
    args = expression.arguments;
  let url: unknown, config: Record<string, unknown>;
  if (callee.type === 'Identifier' && callee.name === 'fetch') {
    url = literal(args[0]);
    config = args[1] ? record(literal(args[1])) : {};
    if (Object.keys(config).some((k) => !['method', 'headers', 'body'].includes(k)))
      fail('unsupported');
  } else if (callee.type === 'Identifier' && callee.name === 'axios') {
    config = record(literal(args[0]));
    url = config.url;
    if (Object.keys(config).some((k) => !['url', 'method', 'headers', 'data'].includes(k)))
      fail('unsupported');
    config = {
      ...config,
      body: typeof config.data === 'object' ? JSON.stringify(config.data) : config.data,
    };
  } else if (
    callee.type === 'MemberExpression' &&
    !callee.computed &&
    ast(callee.object).name === 'axios'
  ) {
    const method = String(ast(callee.property).name);
    if (!['get', 'delete', 'head', 'options', 'post', 'put', 'patch'].includes(method))
      fail('unsupported');
    const hasBody = ['post', 'put', 'patch'].includes(method);
    const configIndex = hasBody ? 2 : 1;
    if (args.length > configIndex + 1) fail('unsupported');
    url = literal(args[0]);
    config = args[configIndex] ? record(literal(args[configIndex])) : {};
    if (Object.keys(config).some((k) => k !== 'headers')) fail('unsupported');
    const data = hasBody && args[1] ? literal(args[1]) : undefined;
    config = {
      ...config,
      method: method.toUpperCase(),
      body: typeof data === 'object' ? JSON.stringify(data) : data,
    };
  } else return fail('unsupported');
  if (typeof url !== 'string' || !/^https?:\/\//i.test(url)) fail('invalid');
  if (config.body !== undefined && typeof config.body !== 'string') fail('unsupported');
  const quote = (s: unknown) => `'${String(s).replaceAll("'", "'\\''")}'`;
  const headers = config.headers === undefined ? {} : record(config.headers);
  if (Object.values(headers).some((v) => typeof v !== 'string')) fail('unsupported');
  return [
    'curl',
    quote(url),
    '-X',
    quote(config.method ?? 'GET'),
    ...Object.entries(headers).flatMap(([k, v]) => ['-H', quote(`${k}: ${String(v)}`)]),
    ...(config.body === undefined ? [] : ['--data-raw', quote(config.body)]),
  ].join(' ');
}

function openapi(input: string, p: Params): Result {
  const spec = record(parseJson(input));
  if (!/^3\./.test(String(spec.openapi))) fail('unsupported');
  const components = spec.components === undefined ? {} : record(spec.components);
  const schemas = components.schemas === undefined ? {} : record(components.schemas);
  const typeName = (name: string) => {
    if (!/^[A-Za-z_$][\w$]*$/.test(name)) fail('unsupported');
    return name;
  };
  let visits = 0;
  function type(value: unknown, depth = 0): string {
    if (++visits > 10000 || depth > 50) fail('limit');
    const s = record(value);
    if (s.$ref) {
      const ref = String(s.$ref);
      if (!ref.startsWith('#/components/schemas/') || !Object.hasOwn(schemas, ref.slice(21)))
        fail('typeReference');
      return typeName(ref.slice(21));
    }
    if (Array.isArray(s.enum)) return s.enum.map((v) => JSON.stringify(v)).join(' | ') || 'never';
    if (Array.isArray(s.oneOf) || Array.isArray(s.anyOf))
      return ((s.oneOf ?? s.anyOf) as unknown[]).map((v) => `(${type(v, depth + 1)})`).join(' | ');
    if (Array.isArray(s.allOf)) return s.allOf.map((v) => `(${type(v, depth + 1)})`).join(' & ');
    let result: string;
    if (Array.isArray(s.type))
      return s.type.map((t) => type({ ...s, type: t, nullable: false }, depth + 1)).join(' | ');
    switch (s.type) {
      case 'integer':
      case 'number':
        result = 'number';
        break;
      case 'boolean':
        result = 'boolean';
        break;
      case 'string':
        result = 'string';
        break;
      case 'null':
        result = 'null';
        break;
      case 'array':
        result = `Array<${s.items ? type(s.items, depth + 1) : 'unknown'}>`;
        break;
      default: {
        if (!s.properties && s.type !== 'object') return 'unknown';
        const required = Array.isArray(s.required) ? s.required : [];
        const properties = s.properties === undefined ? {} : record(s.properties);
        const entries = Object.entries(properties).map(
          ([k, v]) =>
            `${JSON.stringify(k)}${required.includes(k) ? '' : '?'}: ${type(v, depth + 1)};`
        );
        if (s.additionalProperties) entries.push(`[key: string]: unknown;`);
        result = `{ ${entries.join(' ')} }`;
      }
    }
    return s.nullable ? `${result} | null` : result;
  }
  const types = Object.entries(schemas)
    .map(([name, s]) => `export type ${typeName(name)} = ${type(s)};`)
    .join('\n\n');
  if (p.mode === 'types') return { text: types, extension: 'ts' };
  const paths = record(spec.paths),
    requests: string[] = [];
  for (const [path, value] of Object.entries(paths))
    for (const [method, operation] of Object.entries(record(value))) {
      if (!['get', 'post', 'put', 'patch', 'delete', 'head', 'options'].includes(method)) continue;
      const op = record(operation);
      requests.push(
        `// ${String(op.operationId ?? `${method} ${path}`).replace(/[\r\n]/g, ' ')}\nfetch(baseUrl + ${JSON.stringify(path)}, { method: ${JSON.stringify(method.toUpperCase())} });`
      );
    }
  return {
    text: `${types}\n\n// Replace path placeholders and add query, auth and body explicitly.\nconst baseUrl = "https://example.com";\n${requests.join('\n\n')}`,
    extension: 'ts',
    note: 'workbench.openapiNote',
  };
}

function sql(input: string, p: Params): Result {
  const table = String(p.table);
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(table)) fail('params');
  const quoteId = (s: string) => `"${s.replaceAll('"', '""')}"`;
  if (p.mode === 'insert') {
    const data = rows(input),
      keys = [...new Set(data.flatMap(Object.keys))];
    if (!data.length || !keys.length) fail('invalid');
    const value = (v: unknown) => {
      if (v === null || v === undefined) return 'NULL';
      if (typeof v === 'number') return String(v);
      if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
      return `'${(typeof v === 'object' ? JSON.stringify(v) : String(v)).replaceAll("'", "''")}'`;
    };
    return {
      text: outputLimit(
        `INSERT INTO ${quoteId(table)} (${keys.map(quoteId).join(', ')}) VALUES\n${data.map((row) => `(${keys.map((k) => value(row[k])).join(', ')})`).join(',\n')};`
      ),
      extension: 'sql',
    };
  }
  if (p.mode === 'fill') {
    const params: unknown = parseJson(String(p.values));
    if (!Array.isArray(params)) fail('params');
    let at = 0;
    const text = input.replace(
      /'(?:''|[^'])*'|"(?:""|[^"])*"|--[^\n]*|\/\*[\s\S]*?\*\/|\?/g,
      (token) => {
        if (token !== '?') return token;
        if (at >= params.length) fail('params');
        const v: unknown = params[at++];
        if (v === null) return 'NULL';
        if (typeof v === 'number' || typeof v === 'boolean') return String(v);
        if (typeof v !== 'string') fail('unsupported');
        return `'${v.replaceAll("'", "''")}'`;
      }
    );
    if (at !== params.length) fail('params');
    return { text, extension: 'sql', note: 'workbench.sqlNote' };
  }
  const match =
    /^\s*CREATE\s+TABLE\s+(?:"([\w]+)"|`([\w]+)`|([\w]+))\s*\(([\s\S]*)\)\s*;?\s*$/i.exec(input);
  if (!match) fail('unsupported');
  const columns = match[4].match(/(?:[^,()']|\([^()]*\)|'(?:''|[^'])*')+/g);
  if (!columns) fail('invalid');
  const members = columns.map((column) => {
    const c = /^\s*[`"]?(\w+)[`"]?\s+(\w+)(?:\([^)]*\))?([\s\S]*)$/i.exec(column);
    if (!c || /^(constraint|primary|foreign|unique|check)$/i.test(c[1])) fail('unsupported');
    const type = /int|decimal|numeric|float|double|real/i.test(c[2])
      ? 'number'
      : /bool/i.test(c[2])
        ? 'boolean'
        : /char|text|date|time|uuid/i.test(c[2])
          ? 'string'
          : undefined;
    if (!type) fail('unsupported');
    return `  ${JSON.stringify(c[1])}: ${type}${/not\s+null|primary\s+key/i.test(c[3]) ? '' : ' | null'};`;
  });
  return { text: `export interface Row {\n${members.join('\n')}\n}`, extension: 'ts' };
}

async function formats(input: string, p: Params): Promise<Result> {
  const read = async (format: string): Promise<unknown> => {
    if (format === 'json') return parseJson(input);
    if (format === 'yaml')
      return (await import('yaml')).parse(input, { uniqueKeys: true, maxAliasCount: 100 });
    if (format === 'toml') return (await import('smol-toml')).parse(input);
    if (format === 'ini') return (await import('ini')).parse(input);
    if (/<!DOCTYPE|<!ENTITY/i.test(input)) fail('unsupported');
    const { XMLParser, XMLValidator } = await import('fast-xml-parser');
    if (XMLValidator.validate(input) !== true) fail('invalid');
    return new XMLParser({ ignoreAttributes: false, processEntities: false }).parse(input);
  };
  const value = await read(String(p.sourceFormat));
  if (p.outputFormat === 'json') return jsonResult(value);
  if (p.outputFormat === 'yaml')
    return { text: (await import('yaml')).stringify(value), extension: 'yaml' };
  if (p.outputFormat === 'toml')
    return { text: (await import('smol-toml')).stringify(record(value)), extension: 'toml' };
  if (p.outputFormat === 'ini') {
    const data = record(value);
    for (const v of Object.values(data))
      if (
        v &&
        typeof v === 'object' &&
        (Array.isArray(v) || Object.values(record(v)).some((x) => x && typeof x === 'object'))
      )
        fail('unsupported');
    return {
      text: (await import('ini')).stringify(data),
      extension: 'ini',
      note: 'workbench.formatNote',
    };
  }
  const { XMLBuilder } = await import('fast-xml-parser');
  return {
    text: new XMLBuilder({ ignoreAttributes: false, format: true }).build(record(value)),
    extension: 'xml',
    note: 'workbench.formatNote',
  };
}

export async function transformDeveloper(id: string, input: string, p: Params): Promise<Result> {
  if (id === 'request-converter') {
    const curl = /^\s*curl(?:\.exe)?\s/i.test(input) ? input : await literalRequest(input);
    if (p.target === 'curl') {
      parseCurl(curl);
      return { text: curl, extension: 'sh' };
    }
    return {
      text: curlToCode(curl, String(p.target)),
      extension: p.target === 'python' ? 'py' : 'js',
    };
  }
  if (id === 'openapi') return openapi(input, p);
  if (id === 'sql-tools') return sql(input, p);
  if (id === 'format-converter') return formats(input, p);
  if (id === 'certificate') {
    await import('reflect-metadata');
    const { X509Certificate } = await import('@peculiar/x509');
    const cert = new X509Certificate(input);
    const fingerprint = await cert.getThumbprint('SHA-256');
    return jsonResult({
      subject: cert.subject,
      issuer: cert.issuer,
      serialNumber: cert.serialNumber,
      notBefore: cert.notBefore.toISOString(),
      notAfter: cert.notAfter.toISOString(),
      expired: cert.notAfter.getTime() < Date.now(),
      notYetValid: cert.notBefore.getTime() > Date.now(),
      signatureAlgorithm: cert.signatureAlgorithm,
      fingerprintSHA256: [...new Uint8Array(fingerprint)]
        .map((v) => v.toString(16).padStart(2, '0'))
        .join(':'),
      verified: false,
    });
  }
  if (id === 'css-converter') {
    if (p.mode === 'js-to-css') {
      const obj = record(parseJson(input));
      return {
        text: Object.entries(obj)
          .map(([k, v]) => {
            if (
              !/^(?:--[\w-]+|[a-zA-Z][\w-]*)$/.test(k) ||
              !['string', 'number'].includes(typeof v) ||
              /[;{}]/.test(String(v))
            )
              fail('unsupported');
            return `${k.startsWith('--') ? k : k.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}: ${String(v)};`;
          })
          .join('\n'),
        extension: 'css',
      };
    }
    const css = await import('css-tree');
    const tree = css.parse(input, {
      context: 'declarationList',
      onParseError: () => fail('invalid'),
    });
    if (p.mode === 'px-rem') {
      const base = finite(p.rootSize, 1, 1000);
      css.walk(tree, (n) => {
        if (n.type === 'Dimension' && n.unit.toLowerCase() === 'px') {
          n.value = String(Number(n.value) / base);
          n.unit = 'rem';
        }
      });
      return { text: css.generate(tree), extension: 'css' };
    }
    if (p.mode === 'sort') {
      const declarations: [string, string][] = [];
      css.walk(tree, (n) => {
        if (n.type === 'Declaration') declarations.push([n.property, css.generate(n)]);
      });
      return {
        text: declarations
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([, text]) => `${text};`)
          .join('\n'),
        extension: 'css',
      };
    }
    const entries: [string, string][] = [];
    css.walk(tree, (n) => {
      if (n.type === 'Declaration') {
        if (n.important) fail('unsupported');
        const k = n.property.startsWith('--')
          ? n.property
          : n.property.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
        entries.push([k, css.generate(n.value)]);
      }
    });
    if (new Set(entries.map(([k]) => k)).size !== entries.length) fail('duplicate');
    return jsonResult(Object.fromEntries(entries));
  }
  return fail('unsupported');
}
