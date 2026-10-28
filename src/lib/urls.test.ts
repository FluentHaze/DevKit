import { expect, it } from 'vitest';
import { readRoute, sitePath } from './urls';

it('keeps routes and assets under the GitHub project base', () => {
  expect(sitePath('/tools/hash', '/DevKit/')).toBe('/DevKit/tools/hash');
  expect(sitePath('sw.js', '/DevKit/')).toBe('/DevKit/sw.js');
  expect(sitePath('/', '/DevKit/')).toBe('/DevKit/');
  expect(readRoute('/DevKit/', '/DevKit/')).toBe('/');
  expect(readRoute('/DevKit/tools/hash/', '/DevKit/')).toBe('/tools/hash');
  expect(readRoute('/DevKit/tools/hash', '/DevKit/')).toBe('/tools/hash');
  expect(readRoute('/other/tools/hash', '/DevKit/')).toBe('/404');
});

it('also supports normal root hosting', () => {
  expect(sitePath('/tools/base64', '/')).toBe('/tools/base64');
  expect(readRoute('/tools/base64/', '/')).toBe('/tools/base64');
  expect(readRoute('/', '/')).toBe('/');
});
