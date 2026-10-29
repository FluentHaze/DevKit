import { fail, type Result } from '@/lib/errors';
import { utf8 } from '@/lib/encoding';
import { everydayIds, developerIds } from './workbench-config';
import { validateParams, type Params } from './schema';
export async function transform(
  id: string,
  input: string,
  secondary: string,
  params: Params,
  file?: File
): Promise<Result> {
  if (utf8(input).length > 5 * 1024 * 1024 || utf8(secondary).length > 5 * 1024 * 1024)
    fail('limit');
  validateParams(id, params);
  if (everydayIds.has(id))
    return (await import('./everyday')).transformEveryday(id, input, secondary, params);
  if (developerIds.has(id))
    return (await import('./developer-tools')).transformDeveloper(id, input, params);
  if (id === 'typescript-json')
    return (await import('./typescript-json')).transformTypescript(input, params);
  if (id === 'json-schema') return (await import('./json-schema')).transformSchema(input, params);
  if (['request-params', 'json-reshape', 'env-diff', 'i18n-check', 'har-analyzer'].includes(id))
    return (await import('./inspect')).transformInspect(id, input, secondary, params);
  if (id === 'text-encoding')
    return (await import('./encoding')).transformEncoding(input, params, file);
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
    return (await import('./web')).transformWeb(id, input, params, secondary);
  return (await import('./text')).transformText(id, input, secondary, params);
}
