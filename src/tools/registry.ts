import { sensitiveTools } from '@/lib/sensitive-tools';
import metadata from './metadata.json';
import { workbenchIds, fileToolIds } from './workbench-config';
export const categories = [
  'data',
  'crypto',
  'time',
  'text',
  'css',
  'web',
  'generate',
  'media',
  'files',
  'life',
] as const;
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
  capabilities: { local: boolean; worker: boolean; download: boolean; sensitive: boolean };
  loader: () => Promise<typeof import('./ToolPage')>;
}
export const tools: Tool[] = metadata.map((tool) => ({
  ...tool,
  capabilities: {
    local: tool.id !== 'websocket',
    worker:
      tool.id !== 'http-reference' &&
      (!workbenchIds.has(tool.id) ||
        fileToolIds.has(tool.id) ||
        ['pdf-tools', 'markdown-workbench'].includes(tool.id)),
    download: !['http-reference', 'websocket'].includes(tool.id),
    sensitive: sensitiveTools.has(tool.id),
  },
  loader: () => (workbenchIds.has(tool.id) ? import('./WorkbenchPage') : import('./ToolPage')),
}));
export const getTool = (id: string) => tools.find((tool) => tool.id === id);
