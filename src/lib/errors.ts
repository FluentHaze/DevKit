export class ToolError extends Error {
  constructor(
    public code: string,
    public detail = ''
  ) {
    super(code);
  }
}
export function fail(code = 'invalid', detail = ''): never {
  throw new ToolError(code, detail);
}
export interface Result {
  text: string;
  extension?: string;
  bytes?: Uint8Array;
  preview?: string;
  note?: string;
  image?: string;
  html?: string;
  bytesExtension?: string;
}
