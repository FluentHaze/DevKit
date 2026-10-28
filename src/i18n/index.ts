import zh from './zh-CN.json';
import en from './en.json';
import { readPreference } from '@/lib/storage';
export type Locale = 'zh-CN' | 'en';
export type LanguagePreference = Locale | 'auto';
export function detectLocale(languages: readonly string[]): Locale {
  for (const language of languages) {
    if (/^zh(?:-|$)/i.test(language)) return 'zh-CN';
    if (/^en(?:-|$)/i.test(language)) return 'en';
  }
  return 'zh-CN';
}
export const initialLanguage = () =>
  readPreference<LanguagePreference>('language', 'auto', (v): v is LanguagePreference =>
    ['auto', 'zh-CN', 'en'].includes(String(v))
  );
export function translate(locale: Locale, key: string): string {
  const resource: Record<string, string> = locale === 'en' ? en : zh;
  return resource[key] ?? (zh as Record<string, string>)[key] ?? key;
}
