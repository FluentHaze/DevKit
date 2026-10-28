import { fail, type Result } from '@/lib/errors';
import {
  base64,
  decodeBytes,
  decodeUtf8,
  encodeBytes,
  fromBase64,
  fromHex,
  hex,
  utf8,
} from '@/lib/encoding';
import { parseJson, stringify } from './data';
import type { Params } from './schema';

export async function transformCrypto(id: string, input: string, p: Params): Promise<Result> {
  if (id === 'base64') {
    if (p.mode === 'encode') {
      let text = base64(p.format === 'bytes' ? fromHex(input) : utf8(input));
      if (p.variant === 'Base64URL')
        text = text.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      return { text };
    }
    const bytes = fromBase64(input, p.variant === 'Base64URL');
    if (p.format === 'bytes') return { text: hex(bytes), bytes };
    try {
      return { text: decodeUtf8(bytes), bytes };
    } catch {
      return { text: hex(bytes), bytes, note: 'errors.utf8' };
    }
  }
  if (id === 'url-codec') {
    const encode = p.variant === 'uri' ? encodeURI : encodeURIComponent;
    const decode = p.variant === 'uri' ? decodeURI : decodeURIComponent;
    if (p.mode === 'encode')
      return { text: p.variant === 'form' ? encode(input).replace(/%20/g, '+') : encode(input) };
    const bad = /%(?![\da-f]{2})/i.exec(input);
    if (bad) fail('invalid', `Offset: ${bad.index}`);
    try {
      return { text: decode(p.variant === 'form' ? input.replace(/\+/g, ' ') : input) };
    } catch {
      return fail('invalid');
    }
  }
  if (id === 'unicode-html') {
    const { default: he } = await import('he');
    if (p.mode === 'html-encode') return { text: he.encode(input, { useNamedReferences: true }) };
    if (p.mode === 'html-decode') return { text: he.decode(input, { strict: true }) };
    if (p.mode === 'unicode-encode')
      return {
        text: Array.from(
          { length: input.length },
          (_, i) => `\\u${input.charCodeAt(i).toString(16).padStart(4, '0')}`
        ).join(''),
      };
    if (/\\(?!u[\da-f]{4}|["\\/bfnrt])/i.test(input)) fail('invalid');
    try {
      return {
        text: JSON.parse(
          `"${input
            .replace(/(?<!\\)"/g, '\\"')
            .replace(/\n/g, '\\n')
            .replace(/\r/g, '\\r')}"`
        ) as string,
      };
    } catch {
      return fail('invalid');
    }
  }
  if (id === 'jwt') {
    const parts = input.trim().split('.');
    if (parts.length !== 3) fail('invalid');
    const header = parseJson(decodeUtf8(fromBase64(parts[0], true)));
    const payload = parseJson(decodeUtf8(fromBase64(parts[1], true)));
    if (
      !header ||
      typeof header !== 'object' ||
      !payload ||
      typeof payload !== 'object' ||
      Array.isArray(header) ||
      Array.isArray(payload)
    )
      fail('invalid');
    const times: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(payload)) {
      if (['iat', 'exp', 'nbf'].includes(key) && typeof value === 'number') {
        const date = new Date(value * 1000);
        if (!Number.isFinite(date.getTime())) fail('date');
        times[key] = { utc: date.toISOString(), local: date.toString() };
      }
    }
    return {
      text: stringify({ signatureVerified: false, header, payload, times }),
      extension: 'json',
    };
  }
  if (id === 'hash') {
    const wasm = await import('hash-wasm');
    const fn =
      p.algorithm === 'MD5'
        ? wasm.md5
        : p.algorithm === 'SHA-1'
          ? wasm.sha1
          : p.algorithm === 'SHA-512'
            ? wasm.sha512
            : wasm.sha256;
    return { text: encodeBytes(fromHex(await fn(utf8(input))), String(p.encoding)) };
  }
  if (!globalThis.crypto?.subtle) fail('capability');
  const keyBytes = decodeBytes(String(p.key), String(p.keyEncoding));
  if (id === 'hmac') {
    if (!keyBytes.length && !p.allowEmpty) fail('emptyKey');
    // Web Crypto 拒绝零字节 HMAC key；一个全零 block 与空 key 按 RFC 2104 等价。
    const actualKey = keyBytes.length
      ? keyBytes
      : new Uint8Array(p.algorithm === 'SHA-512' ? 128 : 64);
    const key = await crypto.subtle.importKey(
      'raw',
      actualKey,
      { name: 'HMAC', hash: String(p.algorithm) },
      false,
      ['sign', 'verify']
    );
    if (p.mode === 'verify') {
      const signature = decodeBytes(String(p.signature), String(p.encoding));
      return {
        text: stringify({
          verified: await crypto.subtle.verify('HMAC', key, signature, utf8(input)),
        }),
      };
    }
    return {
      text: encodeBytes(
        new Uint8Array(await crypto.subtle.sign('HMAC', key, utf8(input))),
        String(p.encoding)
      ),
    };
  }
  if (![16, 24, 32].includes(keyBytes.length)) fail('key');
  const algorithm = String(p.algorithm);
  const key = await crypto.subtle.importKey('raw', keyBytes, algorithm, false, [
    'encrypt',
    'decrypt',
  ]);
  if (p.mode === 'encrypt') {
    const iv = crypto.getRandomValues(new Uint8Array(algorithm === 'AES-GCM' ? 12 : 16));
    const encrypted = await crypto.subtle.encrypt(
      { name: algorithm, iv, tagLength: 128 },
      key,
      utf8(input)
    );
    return {
      text: stringify({
        version: 1,
        algorithm,
        encoding: 'Base64',
        iv: base64(iv),
        ...(algorithm === 'AES-GCM'
          ? { tagLength: 128, format: 'ciphertext+tag' }
          : { padding: 'PKCS#7', format: 'ciphertext' }),
        ciphertext: base64(new Uint8Array(encrypted)),
      }),
      extension: 'json',
    };
  }
  let ciphertext: Uint8Array<ArrayBuffer>;
  let iv: Uint8Array<ArrayBuffer>;
  if (input.trim().startsWith('{')) {
    const packet = parseJson(input) as Record<string, unknown>;
    if (packet.algorithm !== algorithm || packet.encoding !== 'Base64') fail('params');
    ciphertext = fromBase64(String(packet.ciphertext));
    iv = fromBase64(String(packet.iv));
  } else {
    ciphertext = fromBase64(input);
    iv = fromBase64(String(p.iv));
  }
  if (iv.length !== (algorithm === 'AES-GCM' ? 12 : 16)) fail('params');
  try {
    return {
      text: decodeUtf8(
        new Uint8Array(
          await crypto.subtle.decrypt({ name: algorithm, iv, tagLength: 128 }, key, ciphertext)
        )
      ),
    };
  } catch {
    return fail('authentication');
  }
}
