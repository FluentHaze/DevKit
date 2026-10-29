import { readFile, readdir, access } from 'node:fs/promises';
import { dirname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = (path) => readFile(resolve(root, path), 'utf8');
const problems = [];
const metadata = JSON.parse(await read('src/tools/metadata.json'));
const zh = JSON.parse(await read('src/i18n/zh-CN.json'));
const handbook = await read('docs/tools.md');
const sections = new Map();
const headings = [...handbook.matchAll(/^### `([^`]+)` · (.+)$/gm)];
for (const [index, match] of headings.entries()) {
  if (sections.has(match[1])) problems.push(`Duplicate tool section: ${match[1]}`);
  sections.set(match[1], {
    title: match[2],
    text: handbook.slice(match.index, headings[index + 1]?.index ?? handbook.length),
  });
}

// 静态读取项目自己的字段声明，不执行 TS 或用户输入，也不启动开发服务器。
const source = ts.createSourceFile(
  'schema.ts',
  await read('src/tools/schema.ts'),
  ts.ScriptTarget.Latest,
  true
);
const declarations = new Map();
for (const statement of source.statements) {
  if (!ts.isVariableStatement(statement)) continue;
  for (const declaration of statement.declarationList.declarations) {
    if (ts.isIdentifier(declaration.name))
      declarations.set(declaration.name.text, declaration.initializer);
  }
}
function fieldInfo(expression, seen = new Set()) {
  if (!expression || !ts.isCallExpression(expression)) throw Error('Expected a field helper call');
  const key = expression.arguments[0];
  if (key && ts.isStringLiteral(key)) {
    const choices = expression.arguments[1];
    return {
      key: key.text,
      choices:
        choices && ts.isArrayLiteralExpression(choices)
          ? choices.elements.map((choice) => {
              if (!ts.isStringLiteral(choice))
                throw Error('Document checker requires literal enum choices');
              return choice.text;
            })
          : [],
    };
  }
  const name = expression.expression.getText(source);
  if (seen.has(name)) throw Error(`Recursive field helper: ${name}`);
  seen.add(name);
  const helper = declarations.get(name);
  if (!helper || !ts.isArrowFunction(helper))
    throw Error(`Update document checker for field helper: ${name}`);
  return fieldInfo(helper.body, seen);
}
const fields = declarations.get('fields');
if (!fields || !ts.isObjectLiteralExpression(fields)) throw Error('Cannot read fields registry');
const fieldMap = new Map(
  fields.properties.map((property) => {
    if (!ts.isPropertyAssignment(property) || !ts.isArrayLiteralExpression(property.initializer))
      throw Error('Expected literal tool fields');
    return [
      property.name.text,
      property.initializer.elements.map((expression) => fieldInfo(expression)),
    ];
  })
);
const sensitiveSource = ts.createSourceFile(
  'sensitive.ts',
  await read('src/lib/sensitive-tools.ts'),
  ts.ScriptTarget.Latest,
  true
);
const sensitive = new Set();
function visit(node) {
  if (ts.isNewExpression(node) && node.expression.getText(sensitiveSource) === 'Set') {
    const list = node.arguments?.[0];
    if (list && ts.isArrayLiteralExpression(list))
      for (const item of list.elements) {
        if (ts.isStringLiteral(item)) sensitive.add(item.text);
      }
  }
  ts.forEachChild(node, visit);
}
visit(sensitiveSource);

for (const tool of metadata) {
  const section = sections.get(tool.id);
  if (!section) {
    problems.push(`Missing tool documentation: ${tool.id}`);
    continue;
  }
  if (section.title !== zh[tool.titleKey]) problems.push(`Stale tool title: ${tool.id}`);
  if (!section.text.includes(`\`/tools/${tool.slug}\``)) problems.push(`Missing route: ${tool.id}`);
  for (const label of ['用途', '输入', '输出', '使用注解与限制', '实现', '参数']) {
    if (!section.text.includes(`**${label}**`)) problems.push(`Missing ${label}: ${tool.id}`);
  }
  if (sensitive.has(tool.id) !== section.text.includes('**持久草稿**：禁用'))
    problems.push(`Stale draft policy: ${tool.id}`);
  if (!fieldMap.has(tool.id)) problems.push(`Missing schema fields entry: ${tool.id}`);
  for (const field of fieldMap.get(tool.id) ?? []) {
    for (const value of [field.key, ...field.choices]) {
      if (!section.text.includes(`\`${value}\``))
        problems.push(`Undocumented parameter/choice: ${tool.id} / ${field.key} / ${value}`);
    }
  }
}
for (const id of sections.keys())
  if (!metadata.some((tool) => tool.id === id)) problems.push(`Unknown documented tool: ${id}`);
const count = `${new Set(metadata.map((tool) => tool.category)).size} 类、${metadata.length} 个`;
for (const file of ['README.md', 'AGENTS.md', 'docs/requirements.md']) {
  if (!(await read(file)).includes(count))
    problems.push(`Stale tool count in ${file}; expected ${count}`);
}

async function markdownFiles(path) {
  const entries = await readdir(resolve(root, path), { withFileTypes: true });
  const files = await Promise.all(
    entries.map((entry) =>
      entry.isDirectory()
        ? markdownFiles(`${path}/${entry.name}`)
        : entry.name.endsWith('.md')
          ? [`${path}/${entry.name}`]
          : []
    )
  );
  return files.flat();
}
function withoutFences(text) {
  let fence;
  return text
    .split('\n')
    .map((line) => {
      const mark = /^ {0,3}(`{3,}|~{3,})/.exec(line)?.[1];
      if (mark && !fence) {
        fence = mark;
        return '';
      }
      if (mark && mark[0] === fence?.[0] && mark.length >= fence.length) {
        fence = undefined;
        return '';
      }
      return fence ? '' : line;
    })
    .join('\n');
}
const files = ['README.md', 'AGENTS.md', ...(await markdownFiles('docs'))];
for (const file of files) {
  const text = withoutFences(await read(file));
  for (const match of text.matchAll(/!?\[[^\]\n]*\]\(([^)\n]+)\)/g)) {
    const target = match[1].trim().replace(/^<|>$/g, '');
    if (/^[a-z][\w+.-]*:/i.test(target) || target.startsWith('#')) continue;
    try {
      const path = decodeURIComponent(target.split(/[?#]/)[0]);
      const absolute = resolve(root, dirname(file), path);
      if (relative(root, absolute).startsWith('..')) throw Error('Link escapes repository');
      await access(absolute);
    } catch {
      problems.push(`Broken local link in ${file}: ${target}`);
    }
  }
}
if (problems.length) {
  for (const problem of problems) process.stderr.write(`- ${problem}\n`);
  process.exitCode = 1;
} else
  process.stdout.write(
    `Documentation checks passed: ${metadata.length} tools, ${files.length} Markdown files; fields, enum choices, draft policies and local links match.\n`
  );
