import { fail, type Result } from '@/lib/errors';

export interface Artifact {
  name: string;
  bytes: Uint8Array;
  mime: string;
}
export interface WorkResult extends Result {
  artifacts?: Artifact[];
}
export function validateFiles(files: File[]) {
  if (
    files.length > 50 ||
    files.some((f) => f.size > 50 * 1024 * 1024) ||
    files.reduce((n, f) => n + f.size, 0) > 150 * 1024 * 1024
  )
    fail('limit');
}
export async function archive(artifacts: Artifact[], text = ''): Promise<WorkResult> {
  if (!artifacts.length) fail('invalid');
  if (artifacts.length === 1) return { text: text || artifacts[0].name, artifacts };
  const { zipSync } = await import('fflate');
  const names = new Set<string>();
  for (const file of artifacts) {
    if (
      names.has(file.name) ||
      file.name.includes('/') ||
      file.name.includes('\\') ||
      !file.name ||
      file.name === '.' ||
      file.name === '..'
    )
      fail('duplicate');
    names.add(file.name);
  }
  return {
    text: text || artifacts.map((a) => a.name).join('\n'),
    artifacts: [
      {
        name: 'devkit-results.zip',
        bytes: zipSync(Object.fromEntries(artifacts.map((a) => [a.name, a.bytes])), { level: 1 }),
        mime: 'application/zip',
      },
    ],
  };
}
