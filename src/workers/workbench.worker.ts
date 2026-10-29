import { processFiles } from '@/tools/file-workbench';
import { ToolError } from '@/lib/errors';
import type { Params } from '@/tools/schema';
self.onmessage = async ({
  data,
}: MessageEvent<{ id: string; files: File[]; input: string; params: Params }>) => {
  try {
    self.postMessage({
      ok: true,
      result: await processFiles(data.id, data.files, data.input, data.params),
    });
  } catch (error) {
    self.postMessage({ ok: false, code: error instanceof ToolError ? error.code : 'invalid' });
  }
};
