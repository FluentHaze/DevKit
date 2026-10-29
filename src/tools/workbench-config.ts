// These tools own multiple files or browser-only APIs; text transforms retain ToolPage.
export const workbenchIds = new Set([
  'websocket',
  'spreadsheet',
  'font-preview',
  'image-batch',
  'image-stitch',
  'image-palette',
  'image-annotate',
  'markdown-workbench',
  'pdf-tools',
  'audio-editor',
  'video-frames',
  'file-rename',
  'file-duplicates',
  'file-signature',
  'image-css',
  'pixel-editor',
  'ascii-art',
  'screenshot-beautify',
  'code-card',
  'browser-check',
]);
export const accepts: Record<string, string> = {
  spreadsheet: '.xlsx,.csv',
  'font-preview': '.woff,.woff2,.ttf,.otf',
  'pdf-tools': '.pdf',
  'audio-editor': 'audio/*',
  'video-frames': 'video/*',
};
export const noFiles = new Set([
  'websocket',
  'markdown-workbench',
  'pixel-editor',
  'code-card',
  'browser-check',
]);
export const multiFiles = new Set([
  'font-preview',
  'spreadsheet',
  'image-batch',
  'image-stitch',
  'pdf-tools',
  'file-rename',
  'file-duplicates',
  'file-signature',
]);

export const imageIds = new Set([
  'image-batch',
  'image-stitch',
  'image-palette',
  'image-annotate',
  'ascii-art',
  'screenshot-beautify',
  'code-card',
  'pixel-editor',
]);
export const fileToolIds = new Set([
  'spreadsheet',
  'file-rename',
  'file-duplicates',
  'file-signature',
  'image-css',
]);

export const everydayIds = new Set([
  'json-mock',
  'text-analyzer',
  'table-generator',
  'text-cleaner',
  'document-diff',
  'subtitle-tools',
  'file-rename',
  'text-redact',
  'password-generator',
  'date-workbench',
  'split-bill',
  'unit-converter',
  'lottery',
  'link-tools',
  'decision',
  'workflow',
]);

export const developerIds = new Set([
  'request-converter',
  'openapi',
  'sql-tools',
  'format-converter',
  'css-converter',
  'certificate',
]);
