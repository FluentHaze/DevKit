import { fail, type Result } from '@/lib/errors';
import { utf8 } from '@/lib/encoding';
import type { Params } from './schema';
import { stringify } from './data';

export async function transformText(
  id: string,
  input: string,
  secondary: string,
  p: Params
): Promise<Result> {
  if (id === 'regex') {
    if (!/^[dgimsuvy]*$/.test(String(p.flags))) fail('params');
    const regex = new RegExp(String(p.pattern), String(p.flags));
    const all = new RegExp(
      regex.source,
      regex.flags.includes('g') ? regex.flags : regex.flags + 'g'
    );
    const matches = [];
    for (const match of input.matchAll(all)) {
      if (matches.length >= 10000) fail('limit');
      matches.push({
        index: match.index,
        value: match[0],
        captures: match.slice(1),
        groups: match.groups ?? {},
        indices: match.indices,
      });
    }
    return {
      text: stringify({
        count: matches.length,
        matches,
        replacement: input.replace(regex, String(p.replacement)),
      }),
      extension: 'json',
    };
  }
  if (id === 'text-batch') {
    let lines = input.split(/\r?\n/);
    for (const step of String(p.steps)
      .split(',')
      .map((s) => s.trim())) {
      switch (step) {
        case 'trim':
          lines = lines.map((s) => s.trim());
          break;
        case 'empty':
          lines = lines.filter((s) => s.trim());
          break;
        case 'unique':
          lines = [...new Set(lines)];
          break;
        case 'sort':
          lines = [...lines].sort();
          break;
        case 'reverse':
          lines = [...lines].reverse();
          break;
        case 'prefix':
          lines = lines.map((s) => p.prefix + s);
          break;
        case 'suffix':
          lines = lines.map((s) => s + p.suffix);
          break;
        default:
          return fail('params', 'trim, empty, unique, sort, reverse, prefix, suffix');
      }
    }
    return { text: lines.join('\n') };
  }
  if (id === 'string-case') {
    const words = input
      .replace(/([a-z\d])([A-Z])/g, '$1 $2')
      .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
      .split(/[^\p{L}\p{N}]+/u)
      .filter(Boolean)
      .map((w) => w.toLowerCase());
    const cap = (w: string) => w.charAt(0).toUpperCase() + w.slice(1);
    switch (p.mode) {
      case 'camelCase':
        return { text: words.map((w, i) => (i ? cap(w) : w)).join('') };
      case 'PascalCase':
        return { text: words.map(cap).join('') };
      case 'snake_case':
        return { text: words.join('_') };
      case 'kebab-case':
        return { text: words.join('-') };
      case 'UPPERCASE':
        return { text: input.toUpperCase() };
      case 'lowercase':
        return { text: input.toLowerCase() };
      case 'LF':
        return { text: input.replace(/\r\n|\r/g, '\n') };
      case 'CRLF':
        return { text: input.replace(/\r\n|\r|\n/g, '\r\n') };
      case 'escape':
        return { text: JSON.stringify(input) };
      case 'unescape': {
        const value: unknown = JSON.parse(input);
        if (typeof value !== 'string') fail('invalid');
        return { text: value };
      }
    }
  }
  if (id === 'text-diff') {
    const { diffLines, diffChars } = await import('diff');
    const normalize = (text: string) => {
      let result = p.ignoreSpace ? text.replace(/[\t ]+/g, '') : text;
      if (p.ignoreCase) result = result.toLowerCase();
      return result;
    };
    const left = normalize(input);
    const right = normalize(secondary);
    const large = utf8(left).length + utf8(right).length > 100000;
    const chunks =
      p.mode === 'character' && !large
        ? diffChars(left, right)
        : diffLines(left, right, { stripTrailingCr: false });
    return {
      text: stringify({
        mode: large ? 'line (large input)' : p.mode,
        sourceLineEnding: input.includes('\r\n') ? 'CRLF' : 'LF',
        targetLineEnding: secondary.includes('\r\n') ? 'CRLF' : 'LF',
        changes: chunks,
      }),
      extension: 'json',
    };
  }
  if (id === 'code-formatter') {
    if (p.language === 'sql') {
      const { format } = await import('sql-formatter');
      return {
        text: format(input, {
          language: String(p.dialect) as 'postgresql',
          tabWidth: p.indent === '4' ? 4 : 2,
          useTabs: p.indent === 'tab',
        }),
        extension: 'sql',
      };
    }
    const prettier = await import('prettier/standalone');
    const language = String(p.language);
    const parser = language === 'javascript' ? 'babel' : language;
    const plugin =
      language === 'javascript'
        ? await import('prettier/plugins/babel')
        : language === 'typescript'
          ? await import('prettier/plugins/typescript')
          : language === 'html'
            ? await import('prettier/plugins/html')
            : await import('prettier/plugins/postcss');
    const estree = await import('prettier/plugins/estree');
    return {
      text: await prettier.format(input, {
        parser,
        plugins: [plugin, estree],
        tabWidth: p.indent === '4' ? 4 : 2,
        useTabs: p.indent === 'tab',
      }),
      extension:
        ({ javascript: 'js', typescript: 'ts' } as Record<string, string>)[language] ?? language,
    };
  }
  if (id === 'code-minifier') {
    let text: string;
    if (p.language === 'javascript') {
      const { minify } = await import('terser');
      text = (await minify(input, { module: false, compress: true, mangle: false })).code ?? '';
    } else if (p.language === 'css') {
      const { parse, generate } = await import('css-tree');
      text = generate(parse(input, { onParseError: () => fail('invalid') }));
    } else {
      const { minify } = await import('html-minifier-terser/dist/htmlminifier.esm.bundle');
      text = await minify(input, {
        removeComments: true,
        collapseWhitespace: false,
        minifyJS: false,
        minifyCSS: false,
      });
    }
    const before = utf8(input).length;
    const after = utf8(text).length;
    return {
      text,
      extension: p.language === 'javascript' ? 'js' : String(p.language),
      preview: stringify({
        before,
        after,
        reductionPercent: before ? +(100 * (1 - after / before)).toFixed(2) : 0,
      }),
    };
  }
  if (id === 'js-obfuscator') {
    // Chance 的浏览器 bundle 在 Worker 内写入全局标识符；预建属性使 ES module 严格模式下也可加载。
    if (!('chance' in globalThis))
      Object.defineProperty(globalThis, 'chance', {
        value: undefined,
        writable: true,
        configurable: true,
      });
    const { default: obfuscator } = await import('javascript-obfuscator');
    return {
      text: obfuscator
        .obfuscate(input, {
          compact: Boolean(p.compact),
          stringArray: Boolean(p.stringArray),
          controlFlowFlattening: p.preset === 'standard',
          controlFlowFlatteningThreshold: 0.25,
          deadCodeInjection: false,
          renameGlobals: false,
          selfDefending: false,
          debugProtection: false,
          target: 'browser-no-eval',
        })
        .getObfuscatedCode(),
      extension: 'js',
    };
  }
  return fail('unsupported');
}
