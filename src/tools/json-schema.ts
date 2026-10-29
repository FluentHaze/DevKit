import { fail, type Result } from '@/lib/errors';
import { parseJson, stringify } from './data';
import type { Params } from './schema';

type Schema = Record<string, unknown>;
export function inferSchema(values: unknown[], optional: boolean, depth = 0): Schema {
  if (depth > 100) fail('limit');
  const groups = new Map<string, unknown[]>();
  for (const value of values) {
    const type = value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value;
    groups.set(type, [...(groups.get(type) ?? []), value]);
  }
  const alternatives = [...groups].map(([type, samples]): Schema => {
    if (type === 'object') {
      const objects = samples as Record<string, unknown>[];
      const keys = [...new Set(objects.flatMap(Object.keys))];
      return {
        type,
        properties: Object.fromEntries(
          keys.map((k) => [
            k,
            inferSchema(
              objects.filter((v) => Object.hasOwn(v, k)).map((v) => v[k]),
              optional,
              depth + 1
            ),
          ])
        ),
        required: optional ? [] : keys.filter((k) => objects.every((v) => Object.hasOwn(v, k))),
        additionalProperties: false,
      };
    }
    if (type === 'array')
      return { type, items: inferSchema((samples as unknown[][]).flat(), optional, depth + 1) };
    return { type };
  });
  return alternatives.length === 0
    ? {}
    : alternatives.length === 1
      ? alternatives[0]
      : { anyOf: alternatives };
}
function zod(schema: Schema): string {
  if (Array.isArray(schema.anyOf))
    return `z.union([${(schema.anyOf as Schema[]).map(zod).join(', ')}])`;
  if (schema.type === 'array') return `z.array(${zod(schema.items as Schema)})`;
  if (schema.type === 'object') {
    const required = schema.required as string[];
    return `z.object({${Object.entries(schema.properties as Record<string, Schema>)
      .map(
        ([k, v]) => `[${JSON.stringify(k)}]: ${zod(v)}${required.includes(k) ? '' : '.optional()'}`
      )
      .join(', ')}}).strict()`;
  }
  return schema.type ? `z.${String(schema.type)}()` : 'z.unknown()';
}
export async function transformSchema(input: string, p: Params): Promise<Result> {
  const schema = inferSchema([parseJson(input)], Boolean(p.optionalFields));
  if (p.target === 'json-schema')
    return {
      text: stringify({ $schema: 'https://json-schema.org/draft/2020-12/schema', ...schema }),
      extension: 'json',
      note: 'common.inferredSchema',
    };
  const name = String(p.rootName);
  if (!/^[A-Z][A-Za-z0-9_]*$/.test(name)) fail('params');
  const prettier = await import('prettier/standalone');
  const ts = await import('prettier/plugins/typescript');
  const estree = await import('prettier/plugins/estree');
  return {
    text: await prettier.format(
      `import { z } from 'zod';\nexport const ${name}Schema = ${zod(schema)};\nexport type ${name} = z.infer<typeof ${name}Schema>;`,
      { parser: 'typescript', plugins: [ts, estree] }
    ),
    extension: 'ts',
    note: 'common.inferredSchema',
  };
}
