import { fail, type Result } from '@/lib/errors';
import { utf8 } from '@/lib/encoding';
import { fields, type Params } from './schema';
export async function transform(
  id: string,
  input: string,
  secondary: string,
  params: Params
): Promise<Result> {
  if (utf8(input).length > 5 * 1024 * 1024 || utf8(secondary).length > 5 * 1024 * 1024)
    fail('limit');
  for (const field of fields[id] ?? []) {
    if (field.options && !field.options.includes(String(params[field.key]))) fail('params');
    if (field.type === 'checkbox' && typeof params[field.key] !== 'boolean') fail('params');
  }
  if (id.startsWith('json-'))
    return (await import('./data')).transformData(id, input, secondary, params);
  if (['base64', 'url-codec', 'unicode-html', 'hash', 'aes', 'hmac', 'jwt'].includes(id))
    return (await import('./crypto')).transformCrypto(id, input, params);
  if (['timestamp', 'timezone', 'date-calculator', 'cron'].includes(id))
    return (await import('./time')).transformTime(id, input, params);
  if (
    ['color', 'gradient', 'shadow', 'radius', 'flex', 'grid', 'css-units', 'animation'].includes(id)
  )
    return (await import('./visual')).transformVisual(id, input, params);
  if (['random', 'radix', 'mock-data'].includes(id))
    return (await import('./generate')).transformGenerate(id, input, params);
  if (['url-parser', 'curl-converter'].includes(id))
    return (await import('./web')).transformWeb(id, input, params);
  return (await import('./text')).transformText(id, input, secondary, params);
}
