import DOMPurify from 'dompurify';
import { fail, ToolError, type Result } from '@/lib/errors';
import type { MediaTask } from '@/workers/media.worker';
import { stringify } from './data';
import { validateParams, type Params } from './schema';

function mediaWorker(task: MediaTask, signal: AbortSignal): Promise<string> {
  signal.throwIfAborted();
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('../workers/media.worker.ts', import.meta.url), {
      type: 'module',
    });
    const clean = () => {
      worker.terminate();
      signal.removeEventListener('abort', abort);
      clearTimeout(timer);
    };
    const abort = () => {
      clean();
      reject(new DOMException('Cancelled', 'AbortError'));
    };
    const timer = setTimeout(() => {
      clean();
      reject(new ToolError('timeout'));
    }, 60000);
    signal.addEventListener('abort', abort, { once: true });
    worker.onerror = () => {
      clean();
      reject(new ToolError('capability'));
    };
    worker.onmessage = ({ data }: MessageEvent<{ ok: boolean; text: string; code: string }>) => {
      clean();
      if (data.ok) resolve(data.text);
      else reject(new ToolError(data.code));
    };
    worker.postMessage(task, task.kind === 'qr' ? [task.data.buffer] : []);
  });
}

export function safePreview(html: string): string {
  const clean = DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
    FORBID_TAGS: [
      'img',
      'video',
      'audio',
      'source',
      'iframe',
      'form',
      'input',
      'button',
      'style',
      'link',
    ],
    FORBID_ATTR: ['style', 'src', 'srcset', 'href', 'action', 'id', 'name'],
  });
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; form-action 'none'; base-uri 'none'">
    <style>
      body{font:16px/1.65 system-ui;padding:20px;overflow-wrap:anywhere;color:#1e293b;background:#fff}
      pre{overflow:auto;padding:12px;background:#f1f5f9}
      code{font-family:monospace}
      table{border-collapse:collapse}
      td,th{padding:8px;border:1px solid #cbd5e1}
    </style>
  </head>
  <body>${clean}</body>
</html>`;
}

export async function exampleImage(qrText?: string): Promise<File> {
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 360;
  const ctx = canvas.getContext('2d');
  if (!ctx) fail('capability');
  if (qrText) {
    const { default: QRCode } = await import('qrcode');
    await QRCode.toCanvas(canvas, qrText, { width: 320, margin: 4 });
  } else {
    const gradient = ctx.createLinearGradient(0, 0, 640, 360);
    gradient.addColorStop(0, '#0066cc');
    gradient.addColorStop(1, '#10b981');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 640, 360);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 56px system-ui';
    ctx.fillText('DevKit', 56, 190);
  }
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (value) => (value ? resolve(value) : reject(new ToolError('imageFormat'))),
      'image/png'
    )
  );
  canvas.width = 0;
  return new File([blob], 'devkit-example.png', { type: 'image/png' });
}

export function cleanSvg(input: string): SVGSVGElement {
  if (/<!DOCTYPE|<!ENTITY/i.test(input)) fail('unsupported');
  const original = new DOMParser().parseFromString(input, 'image/svg+xml');
  if (original.querySelector('parsererror') || original.documentElement.localName !== 'svg')
    fail('invalid');
  const clean = DOMPurify.sanitize(input, {
    USE_PROFILES: { svg: true, svgFilters: true },
    FORBID_TAGS: ['style', 'foreignObject', 'a', 'animate', 'animateTransform', 'set'],
    FORBID_ATTR: ['style'],
  });
  const doc = new DOMParser().parseFromString(clean, 'image/svg+xml');
  const root = doc.documentElement;
  if (!(root instanceof SVGSVGElement)) fail('invalid');
  for (const element of [root, ...root.querySelectorAll('*')]) {
    for (const attr of [...element.attributes]) {
      if (
        (/href$/i.test(attr.name) && !attr.value.startsWith('#')) ||
        /url\(\s*['"]?(?!#)/i.test(attr.value)
      )
        element.removeAttribute(attr.name);
    }
  }
  return root;
}

function jsxNode(node: Node, depth = 1): string {
  const pad = '  '.repeat(depth);
  if (node.nodeType === Node.TEXT_NODE)
    return node.textContent?.trim() ? `${pad}{${JSON.stringify(node.textContent)}}` : '';
  if (!(node instanceof Element)) return '';
  const attrs = [...node.attributes]
    .map(({ name, value }) => {
      const key =
        name === 'class'
          ? 'className'
          : name === 'for'
            ? 'htmlFor'
            : /^(data|aria)-/.test(name)
              ? name
              : name.replace(/[-:]([a-z])/g, (_, c: string) => c.toUpperCase());
      return `${key}={${JSON.stringify(value)}}`;
    })
    .join(' ');
  const open = `<${node.tagName}${attrs ? ' ' + attrs : ''}`;
  const children = [...node.childNodes].map((n) => jsxNode(n, depth + 1)).filter(Boolean);
  return children.length
    ? `${pad}${open}>\n${children.join('\n')}\n${pad}</${node.tagName}>`
    : `${pad}${open} />`;
}

export async function imageCanvas(file: File, signal: AbortSignal): Promise<HTMLCanvasElement> {
  if (
    !['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/avif', 'image/bmp'].includes(
      file.type
    )
  )
    fail('imageFormat');
  if (file.size > 20 * 1024 * 1024) fail('limit');
  signal.throwIfAborted();
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    signal.throwIfAborted();
    if (image.naturalWidth * image.naturalHeight > 32_000_000) fail('limit');
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) fail('capability');
    ctx.drawImage(image, 0, 0);
    return canvas;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function transformBrowser(
  id: string,
  input: string,
  p: Params,
  file: File | undefined,
  signal: AbortSignal
): Promise<Result> {
  signal.throwIfAborted();
  validateParams(id, p);
  if (id === 'svg-tools') {
    if (input.length > 512 * 1024) fail('limit');
    const svg = cleanSvg(input);
    const data = await mediaWorker(
      { kind: 'svg', input: new XMLSerializer().serializeToString(svg) },
      signal
    );
    const image = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(data)}`;
    return {
      text:
        p.mode === 'jsx'
          ? `export default function Icon() {\n  return (\n${jsxNode(cleanSvg(data), 2)}\n  );\n}\n`
          : p.mode === 'data-uri'
            ? image
            : data,
      extension: p.mode === 'jsx' ? 'jsx' : p.mode === 'data-uri' ? 'txt' : 'svg',
      image,
      note: 'common.svgSanitized',
    };
  }
  if (id === 'qr-code' && p.mode === 'generate') {
    const { default: QRCode } = await import('qrcode');
    signal.throwIfAborted();
    if (new TextEncoder().encode(input).length > 2000) fail('limit');
    const width = Number(p.width);
    if (!Number.isInteger(width) || width < 128 || width > 2048) fail('params');
    const level = String(p.correction);
    if (level !== 'L' && level !== 'M' && level !== 'Q' && level !== 'H') fail('params');
    const text = await QRCode.toString(input, {
      type: 'svg',
      errorCorrectionLevel: level,
      width,
      margin: 4,
    });
    return {
      text,
      extension: 'svg',
      image: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(text)}`,
    };
  }
  if (!file) fail('fileRequired');
  const source = await imageCanvas(file, signal);
  try {
    if (id === 'qr-code') {
      signal.throwIfAborted();
      const ctx = source.getContext('2d');
      if (!ctx) fail('capability');
      const image = ctx.getImageData(0, 0, source.width, source.height);
      const text = await mediaWorker(
        { kind: 'qr', data: image.data, width: image.width, height: image.height },
        signal
      );
      return { text, extension: 'txt' };
    }
    const maxWidth = Number(p.width),
      maxHeight = Number(p.height),
      quality = Number(p.quality);
    if (
      ![maxWidth, maxHeight].every((v) => Number.isInteger(v) && v > 0 && v <= 8192) ||
      !Number.isFinite(quality) ||
      quality < 0.1 ||
      quality > 1
    )
      fail('params');
    const ratio = Math.min(1, maxWidth / source.width, maxHeight / source.height);
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(source.width * ratio));
    canvas.height = Math.max(1, Math.round(source.height * ratio));
    const ctx = canvas.getContext('2d');
    if (!ctx) fail('capability');
    if (p.format === 'jpeg') {
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
    const mime = `image/${p.format}`;
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((v) => (v ? resolve(v) : reject(new Error('imageFormat'))), mime, quality)
    );
    signal.throwIfAborted();
    if (blob.type !== mime) fail('imageFormat');
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const image = canvas.toDataURL(mime, quality);
    return {
      text: stringify({
        inputBytes: file.size,
        outputBytes: bytes.length,
        inputWidth: source.width,
        inputHeight: source.height,
        width: canvas.width,
        height: canvas.height,
        format: p.format,
        reductionPercent: +(100 * (1 - bytes.length / file.size)).toFixed(2),
      }),
      bytes,
      bytesExtension: p.format === 'jpeg' ? 'jpg' : String(p.format),
      image,
      extension: 'json',
      note: 'common.imageNote',
    };
  } finally {
    source.width = 0;
    source.height = 0;
  }
}
