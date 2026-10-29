import { imageCanvas } from './browser';
import { fail, ToolError } from '@/lib/errors';
import { integer, finite, rows, jsonResult } from './workbench-utils';
import { archive, type Artifact, type WorkResult, validateFiles } from './workbench-files';
import type { Params } from './schema';

export function canvas(width: number, height: number): HTMLCanvasElement {
  if (
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    width < 1 ||
    height < 1 ||
    width * height > 32000000 ||
    width > 16000 ||
    height > 16000
  )
    fail('limit');
  const c = document.createElement('canvas');
  c.width = width;
  c.height = height;
  return c;
}
export async function png(
  c: HTMLCanvasElement,
  name = 'result.png',
  format = 'png',
  quality = 0.85
): Promise<Artifact> {
  const type = `image/${format}`;
  const blob = await new Promise<Blob>((resolve, reject) =>
    c.toBlob((v) => (v ? resolve(v) : reject(new ToolError('imageFormat'))), type, quality)
  );
  if (blob.type !== type) fail('imageFormat');
  return { name, bytes: new Uint8Array(await blob.arrayBuffer()), mime: blob.type };
}
const color = (v: unknown): string => {
  if (!/^#[0-9a-f]{6}$/i.test(String(v))) fail('params');
  return String(v);
};
const context = (c: HTMLCanvasElement) => c.getContext('2d') ?? fail('capability');

async function codeCard(input: string, p: Params): Promise<HTMLCanvasElement> {
  const hljs = (await import('highlight.js/lib/common')).default;
  const language = String(p.language);
  if (!hljs.getLanguage(language)) fail('params');
  const size = integer(p.fontSize, 10, 48),
    padding = integer(p.padding, 0, 200);
  const lines = input.replace(/\r\n?/g, '\n').split('\n');
  if (lines.length > 300 || input.length > 50000) fail('limit');
  const measure = context(canvas(1, 1));
  measure.font = `${size}px monospace`;
  const width = Math.ceil(
    Math.max(
      400,
      ...lines.map((line) => measure.measureText(line.replaceAll('\t', '  ')).width + 100)
    ) +
      padding * 2
  );
  const c = canvas(width, Math.ceil(lines.length * size * 1.6 + 72 + padding * 2));
  const ctx = context(c);
  ctx.fillStyle = color(p.background);
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.fillStyle = '#1c1c1e';
  ctx.beginPath();
  ctx.roundRect(padding, padding, c.width - padding * 2, c.height - padding * 2, 14);
  ctx.fill();
  ['#ff5f57', '#febc2e', '#28c840'].forEach((fill, i) => {
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.arc(padding + 20 + i * 20, padding + 21, 5, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.fillStyle = '#aeaeb6';
  ctx.font = '13px system-ui';
  ctx.fillText(String(p.title).slice(0, 80), padding + 90, padding + 26);
  const html = hljs.highlight(input, { language }).value;
  // Parse only markup produced by highlight.js; it escapes all user HTML.
  const doc = new DOMParser().parseFromString(html, 'text/html');
  ctx.font = `${size}px monospace`;
  let x = padding + 55,
    y = padding + 65,
    lineNumber = 1;
  const colors: Record<string, string> = {
    keyword: '#c792ea',
    string: '#c3e88d',
    number: '#f78c6c',
    comment: '#8b949e',
    title: '#82aaff',
    attr: '#ffcb6b',
    literal: '#f78c6c',
  };
  const number = () => {
    ctx.fillStyle = '#8b949e';
    ctx.fillText(String(lineNumber), padding + 15, y);
  };
  number();
  function draw(n: Node, fill: string) {
    if (n.nodeType === Node.TEXT_NODE) {
      const pieces = (n.textContent ?? '').replaceAll('\t', '  ').split('\n');
      pieces.forEach((piece, i) => {
        if (i) {
          y += size * 1.6;
          x = padding + 55;
          lineNumber++;
          number();
        }
        ctx.fillStyle = fill;
        ctx.fillText(piece, x, y);
        x += ctx.measureText(piece).width;
      });
    } else {
      const el = n as Element;
      const token = [...el.classList].map((c) => c.replace('hljs-', '')).find((c) => colors[c]);
      for (const child of el.childNodes) draw(child, token ? colors[token] : fill);
    }
  }
  for (const child of doc.body.childNodes) draw(child, '#e6edf3');
  return c;
}

export async function processImages(
  id: string,
  files: File[],
  input: string,
  p: Params,
  signal: AbortSignal
): Promise<WorkResult> {
  validateFiles(files);
  signal.throwIfAborted();
  if (id === 'code-card') {
    const c = await codeCard(input, p);
    signal.throwIfAborted();
    return {
      text: `${c.width} × ${c.height}`,
      image: c.toDataURL(),
      artifacts: [await png(c, 'code-card.png')],
    };
  }
  if (id === 'pixel-editor') {
    const grid = JSON.parse(input) as unknown;
    if (
      !Array.isArray(grid) ||
      !grid.length ||
      grid.length > 32 ||
      grid.some((row) => !Array.isArray(row) || row.length !== grid.length)
    )
      fail('invalid');
    const scale = integer(p.scale, 1, 40),
      c = canvas(grid.length * scale, grid.length * scale),
      ctx = context(c);
    grid.forEach((row: unknown[], y) =>
      row.forEach((v, x) => {
        if (v !== 'transparent') {
          ctx.fillStyle = color(v);
          ctx.fillRect(x * scale, y * scale, scale, scale);
        }
      })
    );
    const css = (grid as unknown[][])
      .flatMap((row, y) =>
        row.flatMap((v, x) => (v === 'transparent' ? [] : [`${x}px ${y}px ${color(v)}`]))
      )
      .join(',\n  ');
    return {
      text: `width: 1px;\nheight: 1px;\nbox-shadow:\n  ${css || 'none'};`,
      extension: 'css',
      image: c.toDataURL(),
      artifacts: [await png(c, 'pixel-art.png')],
    };
  }
  if (!files.length && !(id === 'ascii-art' && input.trim())) fail('filesRequired');
  const images: HTMLCanvasElement[] = [];
  try {
    if (!files.length && id === 'ascii-art') {
      const lines = input.split(/\r?\n/);
      if (lines.length > 20 || input.length > 1000) fail('limit');
      const textCanvas = canvas(1200, Math.max(100, lines.length * 100)),
        ctx = context(textCanvas);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, textCanvas.width, textCanvas.height);
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 80px monospace';
      lines.forEach((line, i) => ctx.fillText(line, 20, 80 + i * 100));
      images.push(textCanvas);
    }
    for (const file of files) {
      signal.throwIfAborted();
      images.push(await imageCanvas(file, signal));
      if (images.reduce((n, c) => n + c.width * c.height, 0) > 64000000) fail('limit');
    }
    const first = images[0];
    if (id === 'image-palette') {
      const c = canvas(100, 100),
        ctx = context(c);
      ctx.drawImage(first, 0, 0, 100, 100);
      const data = ctx.getImageData(0, 0, 100, 100).data,
        counts = new Map<string, number>();
      for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] < 128) continue;
        const hex =
          '#' +
          [data[i], data[i + 1], data[i + 2]]
            .map((v) =>
              Math.min(255, Math.round(v / 32) * 32)
                .toString(16)
                .padStart(2, '0')
            )
            .join('');
        counts.set(hex, (counts.get(hex) ?? 0) + 1);
      }
      const palette = [...counts].sort((a, b) => b[1] - a[1]).slice(0, integer(p.count, 2, 16));
      return {
        ...jsonResult({
          palette: palette.map(([hex, count]) => ({ hex, pixels: count })),
          gradient:
            palette.length > 1
              ? `linear-gradient(90deg, ${palette.map(([hex]) => hex).join(', ')})`
              : (palette[0]?.[0] ?? 'transparent'),
        }),
        image: first.toDataURL(),
      };
    }
    if (id === 'ascii-art') {
      const width = integer(p.width, 10, 200),
        c = canvas(width, Math.max(1, Math.round((first.height / first.width) * width * 0.5))),
        ctx = context(c);
      ctx.drawImage(first, 0, 0, c.width, c.height);
      const data = ctx.getImageData(0, 0, c.width, c.height).data,
        chars = [...String(p.characters)];
      if (chars.length < 2 || chars.length > 30) fail('params');
      return {
        text: Array.from({ length: c.height }, (_, y) =>
          Array.from({ length: c.width }, (_, x) => {
            const i = (y * c.width + x) * 4;
            const brightness =
              (((data[i] * 0.2126 + data[i + 1] * 0.7152 + data[i + 2] * 0.0722) * data[i + 3]) /
                255 +
                255 -
                data[i + 3]) /
              255;
            return chars[Math.min(chars.length - 1, Math.floor(brightness * chars.length))];
          }).join('')
        ).join('\n'),
      };
    }
    if (id === 'image-batch') {
      const width = integer(p.width, 1, 8000),
        height = integer(p.height, 1, 8000),
        quality = finite(p.quality, 0.1, 1);
      const artifacts: Artifact[] = [];
      for (let i = 0; i < images.length; i++) {
        signal.throwIfAborted();
        const source = images[i],
          ratio = Math.min(1, width / source.width, height / source.height),
          c = canvas(
            Math.max(1, Math.round(source.width * ratio)),
            Math.max(1, Math.round(source.height * ratio))
          ),
          ctx = context(c);
        ctx.fillStyle = '#ffffff';
        if (p.format === 'jpeg') ctx.fillRect(0, 0, c.width, c.height);
        ctx.drawImage(source, 0, 0, c.width, c.height);
        if (String(p.watermark)) {
          ctx.font = `${Math.max(12, c.width / 30)}px system-ui`;
          ctx.fillStyle = '#ffffff';
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 3;
          ctx.strokeText(String(p.watermark), 12, c.height - 16);
          ctx.fillText(String(p.watermark), 12, c.height - 16);
        }
        artifacts.push(
          await png(
            c,
            `image-${String(i + 1).padStart(3, '0')}.${String(p.format)}`,
            String(p.format),
            quality
          )
        );
        c.width = 0;
      }
      return archive(
        artifacts,
        JSON.stringify(
          artifacts.map((a, i) => ({
            source: files[i].name,
            output: a.name,
            before: files[i].size,
            after: a.bytes.length,
          })),
          null,
          2
        )
      );
    }
    let c: HTMLCanvasElement;
    if (id === 'image-stitch') {
      const gap = integer(p.gap, 0, 200),
        columns =
          p.layout === 'vertical'
            ? 1
            : p.layout === 'horizontal'
              ? images.length
              : integer(p.columns, 1, 10),
        rows = Math.ceil(images.length / columns);
      const size = integer(p.width, 50, 2000),
        cellHeight = integer(p.height, 50, 2000);
      c = canvas(columns * size + (columns + 1) * gap, rows * cellHeight + (rows + 1) * gap);
      const ctx = context(c);
      ctx.fillStyle = color(p.background);
      ctx.fillRect(0, 0, c.width, c.height);
      images.forEach((source, i) => {
        const ratio = Math.min(size / source.width, cellHeight / source.height);
        const w = source.width * ratio,
          h = source.height * ratio;
        ctx.drawImage(
          source,
          gap + (i % columns) * (size + gap) + (size - w) / 2,
          gap + Math.floor(i / columns) * (cellHeight + gap) + (cellHeight - h) / 2,
          w,
          h
        );
      });
    } else if (id === 'screenshot-beautify') {
      const padding = Math.max(p.phoneFrame ? 24 : 0, integer(p.padding, 0, 300)),
        radius = integer(p.radius, 0, 100),
        bar = p.windowFrame && !p.phoneFrame ? 36 : 0;
      c = canvas(first.width + padding * 2, first.height + padding * 2 + bar);
      const ctx = context(c);
      const gradient = ctx.createLinearGradient(0, 0, c.width, c.height);
      gradient.addColorStop(0, color(p.background));
      gradient.addColorStop(1, color(p.backgroundEnd));
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.save();
      ctx.shadowColor = '#00000055';
      ctx.shadowBlur = padding / 2;
      ctx.shadowOffsetY = 8;
      ctx.fillStyle = '#ffffff';
      if (p.phoneFrame) {
        ctx.fillStyle = '#1c1c1e';
        ctx.beginPath();
        ctx.roundRect(padding - 12, padding - 12, first.width + 24, first.height + 24, radius + 12);
        ctx.fill();
      }
      ctx.beginPath();
      ctx.roundRect(padding, padding, first.width, first.height + bar, radius);
      ctx.fill();
      ctx.restore();
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(padding, padding, first.width, first.height + bar, radius);
      ctx.clip();
      ctx.drawImage(first, padding, padding + bar);
      ctx.restore();
      if (p.phoneFrame) {
        ctx.fillStyle = '#1c1c1e';
        ctx.beginPath();
        ctx.roundRect(
          padding + first.width / 3,
          padding + 8,
          first.width / 3,
          Math.min(20, first.height / 8),
          10
        );
        ctx.fill();
      }
      if (bar)
        ['#ff5f57', '#febc2e', '#28c840'].forEach((fill, i) => {
          ctx.fillStyle = fill;
          ctx.beginPath();
          ctx.arc(padding + 20 + i * 20, padding + 18, 5, 0, Math.PI * 2);
          ctx.fill();
        });
    } else if (id === 'image-annotate') {
      c = canvas(first.width, first.height);
      const ctx = context(c);
      ctx.drawImage(first, 0, 0);
      const annotations = rows(input);
      if (annotations.length > 100) fail('limit');
      for (const a of annotations) {
        const x = finite(a.x, 0, c.width),
          y = finite(a.y, 0, c.height),
          w = finite(a.width ?? 100, a.type === 'arrow' ? -c.width : 1, c.width),
          h = finite(a.height ?? 40, a.type === 'arrow' ? -c.height : 1, c.height);
        ctx.strokeStyle = color(a.color ?? '#ff3b30');
        ctx.fillStyle = ctx.strokeStyle;
        ctx.lineWidth = 4;
        if (a.type === 'rect') ctx.strokeRect(x, y, w, h);
        else if (a.type === 'text' || a.type === 'number') {
          ctx.font = `${integer(a.size ?? 24, 8, 150)}px system-ui`;
          ctx.fillText(String(a.text ?? '1'), x, y + 24);
        } else if (a.type === 'arrow') {
          const endX = Math.max(0, Math.min(c.width, x + w)),
            endY = Math.max(0, Math.min(c.height, y + h)),
            angle = Math.atan2(endY - y, endX - x);
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(endX, endY);
          ctx.lineTo(endX - 15 * Math.cos(angle - 0.5), endY - 15 * Math.sin(angle - 0.5));
          ctx.moveTo(endX, endY);
          ctx.lineTo(endX - 15 * Math.cos(angle + 0.5), endY - 15 * Math.sin(angle + 0.5));
          ctx.stroke();
        } else if (a.type === 'blur') {
          const tiny = canvas(Math.max(1, Math.round(w / 12)), Math.max(1, Math.round(h / 12)));
          context(tiny).drawImage(c, x, y, w, h, 0, 0, tiny.width, tiny.height);
          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(tiny, x, y, w, h);
          ctx.imageSmoothingEnabled = true;
        } else fail('params');
      }
    } else return fail('unsupported');
    signal.throwIfAborted();
    return { text: `${c.width} × ${c.height}`, image: c.toDataURL(), artifacts: [await png(c)] };
  } finally {
    images.forEach((c) => {
      c.width = 0;
    });
  }
}
