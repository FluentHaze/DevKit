import { ToolError } from '@/lib/errors';

export type MediaTask =
  | { kind: 'svg'; input: string }
  | { kind: 'qr'; data: Uint8ClampedArray; width: number; height: number };
self.onmessage = async ({ data }: MessageEvent<MediaTask>) => {
  try {
    let text: string;
    if (data.kind === 'svg') {
      const { optimize } = await import('svgo/browser');
      text = optimize(data.input, {
        multipass: true,
        plugins: [{ name: 'preset-default', params: { overrides: { cleanupIds: false } } }],
      }).data;
    } else {
      const { default: jsQR } = await import('jsqr');
      const result = jsQR(data.data, data.width, data.height);
      if (!result) throw new ToolError('qrNotFound');
      text = result.data;
    }
    self.postMessage({ ok: true, text });
  } catch (error) {
    self.postMessage({ ok: false, code: error instanceof ToolError ? error.code : 'invalid' });
  }
};
