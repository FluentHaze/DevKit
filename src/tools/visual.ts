import { parse, formatHex8, formatRgb, formatHsl, wcagContrast, converter } from 'culori';
import { fail, type Result } from '@/lib/errors';
import type { Params } from './schema';
import { parseJson } from './data';

const escapeHtml = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c
  );
function cssValue(value: unknown): string {
  const s = String(value);
  if (
    s.length > 1000 ||
    /[;{}<>\\@]|url\s*\(|expression|\/\*|!important/i.test(s) ||
    !/^[\w\s#.,()%+\-/'"]*$/.test(s)
  )
    fail('params');
  return s;
}
function numeric(value: unknown, min = -10000, max = 10000): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n < min || n > max) fail('params');
  return n;
}
function color(value: unknown): string {
  const result = parse(String(value));
  if (!result) fail('params');
  return formatHex8(result);
}
function jsonArray(input: unknown): Record<string, unknown>[] {
  const value = parseJson(String(input));
  if (
    !Array.isArray(value) ||
    value.length > 30 ||
    !value.length ||
    value.some((v) => !v || typeof v !== 'object' || Array.isArray(v))
  )
    fail('params');
  return value as Record<string, unknown>[];
}
export function previewDocument(
  css: string,
  content = '<div class="demo"></div>',
  background = '#f0f1f4'
): string {
  return `<!doctype html><html><head><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'"><style>*{box-sizing:border-box}body{margin:0;background:${background};min-height:320px;display:grid;place-items:center;padding:32px;font:14px system-ui;color:#1d1d1f}.demo{width:180px;height:140px;background:#0066cc;border-radius:16px}.item{background:#0066cc;color:white;border-radius:8px;padding:20px;display:grid;place-items:center;min-width:0}${css}</style></head><body>${content}</body></html>`;
}
export function transformVisual(id: string, input: string, p: Params): Result {
  if (id === 'css-units') {
    const root = numeric(p.rootSize, 0.1);
    const parent = numeric(p.parentSize, 0.1);
    const vw = numeric(p.viewportWidth, 1, 100000);
    const vh = numeric(p.viewportHeight, 1, 100000);
    const scales: Record<string, number> = {
      px: 1,
      rem: root,
      em: parent,
      vw: vw / 100,
      vh: vh / 100,
    };
    return {
      text: `${Number(((numeric(input, -1e12, 1e12) * scales[String(p.fromUnit)]) / scales[String(p.toUnit)]).toFixed(6))}${p.toUnit}`,
      extension: 'txt',
    };
  }
  if (id === 'color') {
    const value = parse(input.trim());
    const other = parse(String(p.contrast));
    const bg = parse(String(p.background));
    if (!value || !other || !bg) fail('params');
    const rgb = converter('rgb');
    const a = rgb(value);
    const b = rgb(other);
    const background = rgb(bg);
    if ((background.alpha ?? 1) !== 1) fail('params');
    const composite = (c: typeof a) => ({
      mode: 'rgb' as const,
      r: c.r * (c.alpha ?? 1) + background.r * (1 - (c.alpha ?? 1)),
      g: c.g * (c.alpha ?? 1) + background.g * (1 - (c.alpha ?? 1)),
      b: c.b * (c.alpha ?? 1) + background.b * (1 - (c.alpha ?? 1)),
    });
    const ratio = wcagContrast(composite(a), composite(b));
    return {
      text: `HEX: ${formatHex8(value)}\nRGB: ${formatRgb(value)}\nHSL: ${formatHsl(value)}\n\nWCAG 2.x contrast: ${ratio.toFixed(2)}:1\nAA normal (4.5:1): ${ratio >= 4.5}\nAA large (3:1): ${ratio >= 3}\nAAA normal (7:1): ${ratio >= 7}\nLarge: ≥18pt or ≥14pt bold\nComposite background: ${formatHex8(bg)}`,
      preview: previewDocument(
        `.demo{background:${formatHex8(value)};color:${formatHex8(other)};display:grid;place-items:center;font-size:24px}`,
        '<div class="demo">Aa 123</div>',
        formatHex8(bg)
      ),
      extension: 'txt',
    };
  }
  let css: string;
  let content = '<div class="demo"></div>';
  let background = '#f0f1f4';
  if (id === 'gradient') {
    const stops = String(p.stops)
      .split(',')
      .map((stop) => {
        const m = /^(.*?)\s+(-?\d+(?:\.\d+)?)%$/.exec(stop.trim());
        if (!m) fail('params');
        return `${color(m[1])} ${numeric(m[2], 0, 100)}%`;
      });
    if (stops.length < 2 || stops.length > 20) fail('params');
    const pos = String(p.position);
    if (!/^\d+(?:\.\d+)?% \d+(?:\.\d+)?%$/.test(pos)) fail('params');
    const angle = numeric(p.angle, -3600, 3600);
    const prefix =
      p.mode === 'linear'
        ? `${angle}deg`
        : p.mode === 'radial'
          ? `circle at ${pos}`
          : `from ${angle}deg at ${pos}`;
    css = `.demo {\n  background: ${p.mode}-gradient(${prefix}, ${stops.join(', ')});\n  width: 100%;\n  height: 240px;\n}`;
  } else if (id === 'shadow') {
    const layers = jsonArray(p.layers).map(
      (l) =>
        `${l.inset ? 'inset ' : ''}${numeric(l.x)}px ${numeric(l.y)}px ${numeric(l.blur, 0)}px ${numeric(l.spread)}px ${color(l.color)}`
    );
    background = color(p.background);
    css = `.demo {\n  background: #ffffff;\n  box-shadow: ${layers.join(',\n    ')};\n}`;
  } else if (id === 'radius') {
    const radii = (raw: string) => {
      const values = raw.trim().split(/\s+/);
      if (values.length > 4 || !values.length) fail('params');
      return values.map((v) => `${numeric(v, 0, 1000)}${p.unit}`).join(' ');
    };
    css = `.demo {\n  width: ${numeric(p.width, 20, 1000)}px;\n  max-width: 100%;\n  height: ${numeric(p.height, 20, 1000)}px;\n  border-radius: ${radii(String(p.corners))}${p.vertical ? ' / ' + radii(String(p.vertical)) : ''};\n}`;
  } else if (id === 'flex') {
    const items = jsonArray(p.items);
    content = `<div class="container">${items.map((_, i) => `<div class="item item-${i + 1}">${i + 1}</div>`).join('')}</div>`;
    css = `.container {\n  display: flex;\n  width: 100%;\n  min-height: 220px;\n  flex-direction: ${cssValue(p.direction)};\n  flex-wrap: ${cssValue(p.wrap)};\n  justify-content: ${cssValue(p.justify)};\n  align-items: ${cssValue(p.align)};\n  gap: ${numeric(p.gap, 0, 200)}px;\n}\n`;
    css += items
      .map(
        (item, i) =>
          `.item-${i + 1} { flex: ${numeric(item.grow ?? 0, 0, 100)} ${numeric(item.shrink ?? 1, 0, 100)} ${cssValue(item.basis ?? '80px')}; order: ${numeric(item.order ?? 0, -100, 100)}; align-self: ${cssValue(item.alignSelf ?? 'auto')}; }`
      )
      .join('\n');
  } else if (id === 'grid') {
    const items = jsonArray(p.placement);
    content = `<div class="container">${items.map((_, i) => `<div class="item item-${i + 1}">${i + 1}</div>`).join('')}</div>`;
    css = `.container {\n  display: grid;\n  width: 100%;\n  grid-template-columns: ${cssValue(p.columns)};\n  grid-template-rows: ${cssValue(p.rows)};\n  gap: ${numeric(p.gap, 0, 200)}px;${p.areas ? '\n  grid-template-areas: ' + cssValue(p.areas) + ';' : ''}\n}\n`;
    css += items
      .map(
        (item, i) =>
          `.item-${i + 1} { ${item.area ? `grid-area: ${cssValue(item.area)};` : `grid-column: ${cssValue(item.column ?? 'auto')}; grid-row: ${cssValue(item.row ?? 'auto')};`} }`
      )
      .join('\n');
  } else if (id === 'animation') {
    const frames = jsonArray(p.keyframes);
    const bezier = String(p.bezier).split(',').map(Number);
    if (
      bezier.length !== 4 ||
      bezier.some((v) => !Number.isFinite(v)) ||
      bezier[0] < 0 ||
      bezier[0] > 1 ||
      bezier[2] < 0 ||
      bezier[2] > 1
    )
      fail('params');
    if (!/^(infinite|\d+(?:\.\d+)?)$/.test(String(p.iterations))) fail('params');
    const keyframes = frames.map((f) => {
      const properties = Object.entries(f)
        .filter(([key]) => key !== 'offset')
        .map(([key, value]) => {
          if (!['transform', 'opacity', 'backgroundColor', 'borderRadius'].includes(key))
            fail('params');
          if (key === 'opacity') numeric(value, 0, 1);
          return `    ${key.replace(/[A-Z]/g, (s) => '-' + s.toLowerCase())}: ${key === 'backgroundColor' ? color(value) : cssValue(value)};`;
        });
      return `  ${numeric(f.offset, 0, 100)}% {\n${properties.join('\n')}\n  }`;
    });
    css = `@keyframes devkit-motion {\n${keyframes.join('\n')}\n}\n.demo {\n  animation: devkit-motion ${numeric(p.duration, 0.01, 1000)}s cubic-bezier(${bezier.join(', ')}) ${numeric(p.delay, -1000, 1000)}s ${p.iterations} ${cssValue(p.direction)} ${cssValue(p.fill)};\n}\n@media (prefers-reduced-motion: reduce) { .demo { animation-play-state: paused; } }`;
  } else return fail('unsupported');
  const preview = previewDocument(css, content, background);
  if (id === 'flex' || id === 'grid') return { text: preview, preview, extension: 'html' };
  return { text: css, preview, extension: 'css' };
}
export { escapeHtml };
