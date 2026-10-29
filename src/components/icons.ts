import {
  Braces,
  Binary,
  Clock3,
  Code2,
  Palette,
  Globe2,
  Dices,
  FileJson2,
  Fingerprint,
  Type,
  LayoutGrid,
  Link2,
  WandSparkles,
  Images,
  Files,
  Coffee,
} from 'lucide-react';
export const categoryIcons = {
  data: Braces,
  crypto: Binary,
  time: Clock3,
  text: Code2,
  css: Palette,
  web: Globe2,
  generate: Dices,
  media: Images,
  files: Files,
  life: Coffee,
};
export const toolIcon = (id: string, category: string) =>
  id === 'json-formatter'
    ? FileJson2
    : id === 'hash' || id === 'aes'
      ? Fingerprint
      : id === 'string-case'
        ? Type
        : id === 'grid' || id === 'flex'
          ? LayoutGrid
          : id === 'url-parser'
            ? Link2
            : id === 'mock-data'
              ? WandSparkles
              : (categoryIcons[category as keyof typeof categoryIcons] ?? Code2);
