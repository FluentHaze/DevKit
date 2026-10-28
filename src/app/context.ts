import type { Locale } from '@/i18n';
import type { Translate } from '@/components/ui';
export interface AppContext {
  t: Translate;
  locale: Locale;
  favorites: string[];
  toggleFavorite: (id: string) => void;
  navigate: (path: string) => void;
}
