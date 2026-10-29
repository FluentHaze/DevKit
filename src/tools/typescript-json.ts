import { parsers } from 'prettier/plugins/typescript';
import * as estree from 'prettier/plugins/estree';
import { format } from 'prettier/standalone';
import { fail, type Result } from '@/lib/errors';
import type { Params } from './schema';

// Read only the AST produced by the bundled parser; never evaluate source text.
interface Node {
  type: string;
  [key: string]: unknown;
}
type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
const node = (value: unknown): Node => {
  if (!value || typeof value !== 'object' || !('type' in value)) fail('unsupported');
  return value as Node;
};
const nodes = (value: unknown): Node[] => (Array.isArray(value) ? value.map(node) : []);
const object = (value: Json): value is { [key: string]: Json } =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

export async function transformTypescript(input: string, p: Params): Promise<Result> {
  const count = Number(p.arrayCount);
  if (!Number.isInteger(count) || count < 0 || count > 20) fail('params');
  let parsed: unknown;
  try {
    await format(input, {
      parser: 'capture-typescript',
      plugins: [
        estree,
        {
          parsers: {
            'capture-typescript': {
              ...parsers.typescript,
              async parse(text, options) {
                parsed = await parsers.typescript.parse(text, options);
                return parsed;
              },
            },
          },
        },
      ],
    });
  } catch {
    fail('typescriptSyntax');
  }
  const ast = node(parsed);
  const declarations = new Map<string, Node>();
  for (let declaration of nodes(ast.body)) {
    if (declaration.type === 'ExportNamedDeclaration') declaration = node(declaration.declaration);
    if (!['TSInterfaceDeclaration', 'TSTypeAliasDeclaration'].includes(declaration.type))
      fail('unsupported');
    if (declaration.typeParameters) fail('unsupported');
    const name = String(node(declaration.id).name);
    if (declarations.has(name)) fail('duplicate');
    declarations.set(name, declaration);
  }
  const root = String(p.rootName).trim() || declarations.keys().next().value;
  if (!root || !declarations.has(root)) fail('typeReference');
  let budget = 0;
  function merge(values: Json[]): Json {
    const result: { [key: string]: Json } = Object.create(null);
    for (const value of values) {
      if (!object(value)) fail('unsupported');
      for (const [key, entry] of Object.entries(value)) {
        if (Object.hasOwn(result, key) && JSON.stringify(result[key]) !== JSON.stringify(entry))
          fail('unsupported');
        result[key] = entry;
      }
    }
    return result;
  }
  function reference(name: string, stack: string[], depth: number): Json {
    if (stack.includes(name)) fail('typeCycle');
    const declaration = declarations.get(name);
    if (!declaration) fail('typeReference');
    return generate(declaration, [...stack, name], depth + 1);
  }
  function generate(
    n: Node,
    stack: string[],
    depth: number,
    optional = Boolean(p.includeOptional)
  ): Json {
    if (++budget > 20000 || depth > 60) fail('limit');
    switch (n.type) {
      case 'TSStringKeyword':
        return 'example';
      case 'TSNumberKeyword':
        return 1;
      case 'TSBooleanKeyword':
        return true;
      case 'TSNullKeyword':
        return null;
      case 'TSLiteralType': {
        const literal = node(n.literal);
        if (literal.bigint !== undefined) return fail('unsupported');
        if (literal.type === 'UnaryExpression' && literal.operator === '-') {
          const value = node(literal.argument).value;
          if (typeof value === 'number' && Number.isFinite(value)) {
            if (Number.isInteger(value) && !Number.isSafeInteger(value)) return fail('precision');
            return -value;
          }
        }
        const value = literal.value;
        if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
        if (typeof value === 'number' && Number.isFinite(value)) {
          if (Number.isInteger(value) && !Number.isSafeInteger(value)) return fail('precision');
          return value;
        }
        return fail('unsupported');
      }
      case 'TSTypeAliasDeclaration':
      case 'TSTypeAnnotation':
      case 'TSParenthesizedType':
        return generate(node(n.typeAnnotation), stack, depth + 1, optional);
      case 'TSTypeOperator':
        if (n.operator !== 'readonly') fail('unsupported');
        return generate(node(n.typeAnnotation), stack, depth + 1, optional);
      case 'TSUnionType': {
        const alternatives = nodes(n.types).filter((v) => v.type !== 'TSUndefinedKeyword');
        if (!alternatives.length) fail('unsupported');
        return generate(alternatives[0], stack, depth + 1, optional);
      }
      case 'TSIntersectionType':
        return merge(nodes(n.types).map((v) => generate(v, stack, depth + 1, optional)));
      case 'TSArrayType':
        return Array.from({ length: count }, () => generate(node(n.elementType), stack, depth + 1));
      case 'TSTupleType':
        return nodes(n.elementTypes)
          .filter((v) => p.includeOptional || !(v.optional || v.type === 'TSOptionalType'))
          .map((v) =>
            generate(
              v.type === 'TSNamedTupleMember'
                ? node(v.elementType)
                : v.type === 'TSOptionalType'
                  ? node(v.typeAnnotation)
                  : v,
              stack,
              depth + 1
            )
          );
      case 'TSTypeReference': {
        const name = node(n.typeName);
        if (name.type !== 'Identifier') fail('unsupported');
        const args = n.typeArguments ? nodes(node(n.typeArguments).params) : [];
        if (['Array', 'ReadonlyArray'].includes(String(name.name)) && args.length === 1)
          return Array.from({ length: count }, () => generate(args[0], stack, depth + 1));
        if (args.length) fail('unsupported');
        return reference(String(name.name), stack, depth);
      }
      case 'TSInterfaceDeclaration': {
        const bases = nodes(n.extends).map((base) => {
          if (base.typeArguments) fail('unsupported');
          const name = node(base.expression);
          if (name.type !== 'Identifier') fail('unsupported');
          return reference(String(name.name), stack, depth);
        });
        return merge([...bases, generate(node(n.body), stack, depth + 1, optional)]);
      }
      case 'TSInterfaceBody':
      case 'TSTypeLiteral': {
        const result: { [key: string]: Json } = Object.create(null);
        for (const member of nodes(n.type === 'TSInterfaceBody' ? n.body : n.members)) {
          if (member.type !== 'TSPropertySignature' || member.computed) fail('unsupported');
          if (member.optional && !optional) continue;
          const key = node(member.key);
          const name = key.type === 'Identifier' ? String(key.name) : String(key.value);
          if (Object.hasOwn(result, name)) fail('duplicate');
          result[name] = generate(node(member.typeAnnotation), stack, depth + 1);
        }
        return result;
      }
      default:
        fail('unsupported');
    }
  }
  return {
    text: JSON.stringify(reference(root, [], 0), null, 2),
    extension: 'json',
    note: 'common.typeSample',
  };
}
