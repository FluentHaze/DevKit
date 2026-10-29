import { fail } from '@/lib/errors';
import { integer } from './workbench-utils';
import type { Params } from './schema';

export function renameFiles(names: string[], p: Params): { from: string; to: string }[] {
  const start = integer(p.start, 0, 1000000);
  const prefix = String(p.prefix);
  const invalidName = (name: string) =>
    /[\\/:*?"<>|]/.test(name) || [...name].some((c) => c.charCodeAt(0) < 32);
  if (invalidName(prefix)) fail('params');
  let expression: RegExp | undefined;
  if (p.mode === 'regex') {
    const flags = String(p.flags);
    if (!String(p.find) || String(p.find).length > 200 || !/^[giu]*$/.test(flags)) fail('params');
    try {
      expression = new RegExp(String(p.find), flags);
    } catch {
      return fail('params');
    }
  }
  const result = names.map((from, i) => {
    const at = from.lastIndexOf('.');
    const ext = at > 0 ? from.slice(at) : '';
    const base = at > 0 ? from.slice(0, at) : from;
    const to = `${prefix}${p.mode === 'sequence' ? String(start + i).padStart(3, '0') : expression ? base.replace(expression, String(p.replace)) : base.split(String(p.find)).join(String(p.replace))}${ext}`;
    if (
      !to ||
      to.length > 240 ||
      invalidName(to) ||
      /[. ]$/.test(to) ||
      /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(to)
    )
      fail('params');
    return { from, to };
  });
  if (new Set(result.map((v) => v.to.toLowerCase())).size !== result.length) fail('duplicate');
  return result;
}
