import { fail, type Result } from '@/lib/errors';
import type { Params } from './schema';
import { stringify } from './data';

const gbkMap = new Map<string, number[]>();
export function encodeText(text: string, encoding: string): Uint8Array {
  for (let i = 0; i < text.length; i++) {
    const unit = text.charCodeAt(i);
    if (unit >= 0xd800 && unit <= 0xdbff) {
      const next = text.charCodeAt(++i);
      if (!(next >= 0xdc00 && next <= 0xdfff)) fail('encoding');
    } else if (unit >= 0xdc00 && unit <= 0xdfff) fail('encoding');
  }
  if (encoding === 'utf-8') return new TextEncoder().encode(text);
  if (encoding === 'utf-16le' || encoding === 'utf-16be') {
    const bytes = new Uint8Array(text.length * 2);
    const view = new DataView(bytes.buffer);
    for (let i = 0; i < text.length; i++)
      view.setUint16(i * 2, text.charCodeAt(i), encoding === 'utf-16le');
    return bytes;
  }
  if (encoding !== 'gbk') fail('params');
  if (!gbkMap.size) {
    const decoder = new TextDecoder('gbk', { fatal: true });
    for (let a = 0; a <= 0x80; a++) {
      try {
        gbkMap.set(decoder.decode(new Uint8Array([a])), [a]);
      } catch {
        /* 未定义字节不参与反向映射。 */
      }
    }
    for (let a = 0x81; a <= 0xfe; a++)
      for (let b = 0x40; b <= 0xfe; b++) {
        if (b === 0x7f) continue;
        try {
          const char = decoder.decode(new Uint8Array([a, b]));
          if (!gbkMap.has(char)) gbkMap.set(char, [a, b]);
        } catch {
          /* 跳过非法序列。 */
        }
      }
  }
  const bytes: number[] = [];
  for (const char of text) {
    const encoded = gbkMap.get(char);
    if (!encoded) fail('unrepresentable');
    bytes.push(...encoded);
  }
  return new Uint8Array(bytes);
}

export async function transformEncoding(input: string, p: Params, file?: File): Promise<Result> {
  let text = input;
  let hasBom = input.startsWith('\uFEFF');
  let sourceBytes: number | undefined;
  if (file) {
    if (file.size > 5 * 1024 * 1024) fail('limit');
    const bytes = new Uint8Array(await file.arrayBuffer());
    sourceBytes = bytes.length;
    hasBom =
      (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) ||
      (bytes[0] === 0xff && bytes[1] === 0xfe) ||
      (bytes[0] === 0xfe && bytes[1] === 0xff);
    try {
      text = new TextDecoder(String(p.sourceEncoding), { fatal: true }).decode(bytes);
    } catch {
      fail('encoding');
    }
  }
  const invisibles: { offset: number; codePoint: string }[] = [];
  for (let offset = 0; offset < text.length && invisibles.length < 500; offset++) {
    const code = text.charCodeAt(offset);
    if (
      (code < 32 && ![9, 10, 13].includes(code)) ||
      [0x7f, 0xa0, 0x2060, 0xfeff].includes(code) ||
      (code >= 0x200b && code <= 0x200f) ||
      (code >= 0x202a && code <= 0x202e) ||
      (code >= 0x2066 && code <= 0x2069)
    )
      invisibles.push({
        offset,
        codePoint: `U+${code.toString(16).toUpperCase().padStart(4, '0')}`,
      });
  }
  const report = {
    sourceEncoding: file ? p.sourceEncoding : 'Unicode text',
    sourceBytes,
    hasBom,
    crlf: (text.match(/\r\n/g) ?? []).length,
    lf: (text.match(/(?<!\r)\n/g) ?? []).length,
    cr: (text.match(/\r(?!\n)/g) ?? []).length,
    invisibleCharacters: invisibles,
  };
  if (p.mode === 'inspect') return { text: stringify(report), extension: 'json' };
  if (p.newline === 'LF') text = text.replace(/\r\n|\r/g, '\n');
  if (p.newline === 'CRLF') text = text.replace(/\r\n|\r|\n/g, '\r\n');
  const encoding = String(p.targetEncoding);
  if (p.bom) {
    if (encoding === 'gbk') fail('params');
    text = '\uFEFF' + text.replace(/^\uFEFF/, '');
  }
  const bytes = encodeText(text, encoding);
  return {
    text,
    bytes,
    bytesExtension: 'txt',
    extension: 'txt',
    preview: stringify({ ...report, targetEncoding: encoding, outputBytes: bytes.length }),
    note: 'common.encodingDownload',
  };
}
