import { fail, ToolError } from '@/lib/errors';
import { integer, finite } from './workbench-utils';
import { canvas, png } from './image-workbench';
import { archive, validateFiles, type WorkResult, type Artifact } from './workbench-files';
import type { Params } from './schema';
import { sitePath } from '@/lib/urls';

export { pageNumbers } from './page-ranges';
import { pageNumbers } from './page-ranges';

async function pdf(files: File[], p: Params, signal: AbortSignal): Promise<WorkResult> {
  if (p.mode === 'images') {
    if (files.length !== 1) fail('params');
    const pdfjs = await import('pdfjs-dist');
    const data = await files[0].arrayBuffer();
    signal.throwIfAborted();
    const worker = new Worker(new URL('pdfjs-dist/build/pdf.worker.mjs', import.meta.url), {
      type: 'module',
    });
    const pdfWorker = pdfjs.PDFWorker.create({ port: worker });
    const loading = pdfjs.getDocument({
      data,
      worker: pdfWorker,
      useSystemFonts: true,
      disableFontFace: true,
      cMapUrl: sitePath('/pdf-resources/cmaps/'),
      cMapPacked: true,
      standardFontDataUrl: sitePath('/pdf-resources/standard_fonts/'),
      wasmUrl: sitePath('/pdf-resources/wasm/'),
      iccUrl: sitePath('/pdf-resources/iccs/'),
    });
    const abort = () => {
      void loading.destroy();
      worker.terminate();
    };
    signal.addEventListener('abort', abort, { once: true });
    try {
      const doc = await loading.promise;
      const pages = pageNumbers(String(p.pages), doc.numPages);
      if (pages.length > 30) fail('limit');
      const artifacts: Artifact[] = [];
      for (const number of pages) {
        signal.throwIfAborted();
        const page = await doc.getPage(number + 1),
          viewport = page.getViewport({ scale: finite(p.scale, 0.25, 3) });
        const c = canvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
        const ctx = c.getContext('2d') ?? fail('capability');
        await page.render({ canvas: c, canvasContext: ctx, viewport }).promise;
        artifacts.push(await png(c, `page-${number + 1}.png`));
        c.width = 0;
        page.cleanup();
      }
      return archive(artifacts);
    } finally {
      signal.removeEventListener('abort', abort);
      await loading.destroy();
      worker.terminate();
      pdfWorker.destroy();
    }
  }
  return (await import('./pdf-binary')).processPdfBinary(files, p);
}

export function wav(channels: Float32Array[], sampleRate: number): Uint8Array {
  if (!channels.length || channels.some((c) => c.length !== channels[0].length)) fail('invalid');
  const count = channels[0].length,
    bytes = new Uint8Array(44 + count * channels.length * 2),
    view = new DataView(bytes.buffer);
  const text = (at: number, s: string) => {
    for (let i = 0; i < s.length; i++) bytes[at + i] = s.charCodeAt(i);
  };
  text(0, 'RIFF');
  view.setUint32(4, bytes.length - 8, true);
  text(8, 'WAVE');
  text(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels.length, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * channels.length * 2, true);
  view.setUint16(32, channels.length * 2, true);
  view.setUint16(34, 16, true);
  text(36, 'data');
  view.setUint32(40, bytes.length - 44, true);
  for (let i = 0; i < count; i++)
    for (let c = 0; c < channels.length; c++) {
      const value = Math.max(-1, Math.min(1, channels[c][i]));
      view.setInt16(
        44 + (i * channels.length + c) * 2,
        Math.round(value * (value < 0 ? 32768 : 32767)),
        true
      );
    }
  return bytes;
}

async function audio(file: File, p: Params, signal: AbortSignal): Promise<WorkResult> {
  const ctx = new AudioContext();
  try {
    const buffer = await ctx.decodeAudioData(await file.arrayBuffer());
    signal.throwIfAborted();
    const start = finite(p.start, 0, buffer.duration),
      end = String(p.end).trim() ? finite(p.end, start, buffer.duration) : buffer.duration;
    if (end <= start || end - start > 600 || buffer.numberOfChannels > 2) fail('limit');
    const gain = finite(p.volume, 0, 4),
      fade = finite(p.fade, 0, (end - start) / 2),
      count = Math.floor((end - start) * buffer.sampleRate);
    if (count * buffer.numberOfChannels > 30000000) fail('limit');
    const channels = Array.from({ length: buffer.numberOfChannels }, (_, c) => {
      const data = buffer
        .getChannelData(c)
        .slice(
          Math.floor(start * buffer.sampleRate),
          Math.floor(start * buffer.sampleRate) + count
        );
      for (let i = 0; i < data.length; i++)
        data[i] *=
          gain *
          (fade
            ? Math.min(
                1,
                i / (fade * buffer.sampleRate),
                (data.length - 1 - i) / (fade * buffer.sampleRate)
              )
            : 1);
      return data;
    });
    signal.throwIfAborted();
    return {
      text: JSON.stringify(
        {
          duration: end - start,
          sampleRate: buffer.sampleRate,
          channels: channels.length,
          format: 'PCM 16-bit WAV',
        },
        null,
        2
      ),
      artifacts: [
        { name: 'audio.wav', bytes: wav(channels, buffer.sampleRate), mime: 'audio/wav' },
      ],
    };
  } finally {
    await ctx.close();
  }
}

function mediaEvent(
  video: HTMLVideoElement,
  event: string,
  signal: AbortSignal,
  action: () => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      video.removeEventListener(event, done);
      video.removeEventListener('error', error);
      signal.removeEventListener('abort', abort);
      clearTimeout(timer);
    };
    const done = () => {
      cleanup();
      resolve();
    };
    const error = () => {
      cleanup();
      reject(new ToolError('invalid'));
    };
    const abort = () => {
      cleanup();
      reject(new DOMException('Cancelled', 'AbortError'));
    };
    const timer = setTimeout(() => {
      cleanup();
      reject(new ToolError('timeout'));
    }, 15000);
    video.addEventListener(event, done, { once: true });
    video.addEventListener('error', error, { once: true });
    signal.addEventListener('abort', abort, { once: true });
    if (signal.aborted) abort();
    else action();
  });
}
async function videoFrames(file: File, p: Params, signal: AbortSignal): Promise<WorkResult> {
  const video = document.createElement('video'),
    url = URL.createObjectURL(file);
  video.muted = true;
  video.preload = 'auto';
  try {
    await mediaEvent(video, 'loadeddata', signal, () => {
      video.src = url;
    });
    const times = String(p.times)
      .split(',')
      .map((v) => finite(v.trim(), 0, video.duration));
    if (!times.length || times.length > 30) fail('limit');
    const artifacts: Artifact[] = [];
    for (const time of times) {
      signal.throwIfAborted();
      if (video.currentTime !== time)
        await mediaEvent(video, 'seeked', signal, () => {
          video.currentTime = time;
        });
      const scale = Math.min(1, integer(p.width, 32, 3840) / video.videoWidth),
        c = canvas(
          Math.max(1, Math.round(video.videoWidth * scale)),
          Math.max(1, Math.round(video.videoHeight * scale))
        );
      const ctx = c.getContext('2d') ?? fail('capability');
      ctx.drawImage(video, 0, 0, c.width, c.height);
      artifacts.push(await png(c, `frame-${artifacts.length + 1}-${time}s.png`));
      c.width = 0;
    }
    return archive(artifacts);
  } finally {
    video.pause();
    video.removeAttribute('src');
    video.load();
    URL.revokeObjectURL(url);
  }
}
export async function processMedia(
  id: string,
  files: File[],
  p: Params,
  signal: AbortSignal
): Promise<WorkResult> {
  validateFiles(files);
  if (!files.length) fail('filesRequired');
  if (id === 'pdf-tools') return pdf(files, p, signal);
  if (files.length !== 1) fail('params');
  return id === 'audio-editor' ? audio(files[0], p, signal) : videoFrames(files[0], p, signal);
}
