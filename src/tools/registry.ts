import metadata from './metadata.json';
export const categories = ['data', 'crypto', 'time', 'text', 'css', 'web', 'generate'] as const;
export type Category = (typeof categories)[number];
export interface Tool {
  id: string;
  slug: string;
  category: string;
  order: number;
  titleKey: string;
  descriptionKey: string;
  keywords: string[];
  example: string;
  capabilities: { local: true; worker: boolean; download: boolean; sensitive: boolean };
  loader: () => Promise<typeof import('./ToolPage')>;
}
export const tools: Tool[] = metadata.map((tool) => ({
  ...tool,
  capabilities: {
    local: true,
    worker: tool.id !== 'http-reference',
    download: tool.id !== 'http-reference',
    sensitive: ['aes', 'hmac', 'jwt', 'curl-converter'].includes(tool.id),
  },
  loader: () => import('./ToolPage'),
}));
export const getTool = (id: string) => tools.find((tool) => tool.id === id);
