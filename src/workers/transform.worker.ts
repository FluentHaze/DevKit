import { transform } from '@/tools/transform';
import { ToolError } from '@/lib/errors';
import { encodeBytes } from '@/lib/encoding';
import type { Params } from '@/tools/schema';
export interface Task {
  taskId: number;
  id: string;
  input: string;
  secondary: string;
  params: Params;
  file?: File;
}
self.onmessage = async ({ data }: MessageEvent<Task>) => {
  const { taskId, id, input, secondary, params, file } = data;
  const start = performance.now();
  try {
    let result;
    if (id === 'hash' && file) {
      if (file.size > 100 * 1024 * 1024) throw new ToolError('limit');
      const wasm = await import('hash-wasm');
      const hash = await (params.algorithm === 'MD5'
        ? wasm.createMD5()
        : params.algorithm === 'SHA-1'
          ? wasm.createSHA1()
          : params.algorithm === 'SHA-512'
            ? wasm.createSHA512()
            : wasm.createSHA256());
      hash.init();
      for (let offset = 0; offset < file.size; offset += 1024 * 1024)
        hash.update(new Uint8Array(await file.slice(offset, offset + 1024 * 1024).arrayBuffer()));
      result = { text: encodeBytes(hash.digest('binary'), String(params.encoding)) };
    } else result = await transform(id, input, secondary, params);
    self.postMessage({ taskId, ok: true, result, elapsed: performance.now() - start });
  } catch (error) {
    self.postMessage({
      taskId,
      ok: false,
      code: error instanceof ToolError ? error.code : 'invalid',
      detail:
        error instanceof ToolError
          ? error.detail
          : error instanceof Error
            ? error.message.slice(0, 1200)
            : '',
    });
  }
};
