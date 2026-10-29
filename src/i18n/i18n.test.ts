import { expect, it } from 'vitest';
import zh from './zh-CN.json';
import en from './en.json';
import { detectLocale, translate } from './index';
import { tools } from '@/tools/registry';
it('has matching translation keys and interpolation placeholders', () => {
  expect(Object.keys(zh).sort()).toEqual(Object.keys(en).sort());
  for (const key of Object.keys(zh)) {
    expect(((zh as Record<string, string>)[key].match(/\{\w+\}/g) ?? []).sort()).toEqual(
      ((en as Record<string, string>)[key].match(/\{\w+\}/g) ?? []).sort()
    );
  }
});
it('detects supported languages in preference order', () => {
  expect(detectLocale(['fr', 'en-US', 'zh-CN'])).toBe('en');
  expect(detectLocale(['zh-TW'])).toBe('zh-CN');
  expect(detectLocale(['fr'])).toBe('zh-CN');
});
it('registers exactly 49 tools with translated metadata', () => {
  expect(tools).toHaveLength(49);
  expect(new Set(tools.map((t) => t.id)).size).toBe(49);
  for (const tool of tools) {
    expect(translate('en', tool.titleKey)).not.toBe(tool.titleKey);
  }
});
