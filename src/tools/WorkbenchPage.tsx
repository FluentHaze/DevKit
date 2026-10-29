import { useCallback, useEffect, useRef, useState } from 'react';
import { Play, Square, FileUp, Download, Star, Trash2, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui';
import { Editor } from '@/components/Editor';
import { ParameterFields } from '@/components/ParameterFields';
import type { AppContext } from '@/app/context';
import type { Tool } from './registry';
import { defaults, validateParams, type Params } from './schema';
import { ToolError } from '@/lib/errors';
import { shortcutModifier } from '@/lib/keyboard';
import { validateFiles, type WorkResult } from './workbench-files';
import { fileToolIds } from './workbench-config';
import { imageIds } from './workbench-config';
import { safePreview, exampleImage } from './browser';
import { accepts, multiFiles, noFiles } from './workbench-config';
import { SocketPanel, FontPanel, PixelPanel } from './LiveTools';

function fileWorker(
  id: string,
  files: File[],
  input: string,
  params: Params,
  signal: AbortSignal
): Promise<WorkResult> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('../workers/workbench.worker.ts', import.meta.url), {
      type: 'module',
    });
    const cleanup = () => {
      worker.terminate();
      signal.removeEventListener('abort', abort);
    };
    const abort = () => {
      cleanup();
      reject(signal.reason);
    };
    worker.onmessage = ({
      data,
    }: MessageEvent<{ ok: boolean; result: WorkResult; code: string }>) => {
      cleanup();
      if (data.ok) resolve(data.result);
      else reject(new ToolError(data.code));
    };
    worker.onerror = () => {
      cleanup();
      reject(new ToolError('invalid'));
    };
    signal.addEventListener('abort', abort, { once: true });
    if (signal.aborted) abort();
    else worker.postMessage({ id, files, input, params });
  });
}
function environment(): WorkResult {
  return {
    text: JSON.stringify(
      {
        userAgent: navigator.userAgent,
        language: navigator.language,
        languages: navigator.languages,
        online: navigator.onLine,
        secureContext: isSecureContext,
        viewport: { width: innerWidth, height: innerHeight, pixelRatio: devicePixelRatio },
        screen: { width: screen.width, height: screen.height, colorDepth: screen.colorDepth },
        features: {
          webCrypto: !!crypto.subtle,
          clipboard: !!navigator.clipboard,
          serviceWorker: 'serviceWorker' in navigator,
          indexedDB: 'indexedDB' in globalThis,
          canvas: !!document.createElement('canvas').getContext('2d'),
          webSocket: 'WebSocket' in globalThis,
          audioContext: 'AudioContext' in globalThis,
          fileSystemAccess: 'showOpenFilePicker' in globalThis,
        },
      },
      null,
      2
    ),
    extension: 'json',
  };
}

export default function WorkbenchPage({
  tool,
  t,
  favorites,
  toggleFavorite,
}: AppContext & { tool: Tool }) {
  const [input, setInput] = useState(''),
    [params, setParams] = useState<Params>(() => defaults(tool.id)),
    [files, setFiles] = useState<File[]>([]);
  const [result, setResult] = useState<WorkResult>(),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [wrap, setWrap] = useState(true),
    [notice, setNotice] = useState('');
  const [downloads, setDownloads] = useState<{ name: string; url: string }[]>([]);
  const [sourcePreview, setSourcePreview] = useState('');
  const task = useRef<AbortController | null>(null),
    urls = useRef<string[]>([]),
    frame = useRef<HTMLIFrameElement>(null),
    fileInput = useRef<HTMLInputElement>(null);
  const liveTask = useRef<AbortController | null>(null);
  const stop = useCallback(() => {
    task.current?.abort();
    liveTask.current?.abort();
    task.current = null;
  }, []);
  const release = useCallback(() => {
    urls.current.forEach((url) => URL.revokeObjectURL(url));
    urls.current = [];
  }, []);
  useEffect(
    () => () => {
      stop();
      release();
    },
    [stop, release]
  );
  useEffect(() => {
    if (!files[0] || !['image-annotate', 'video-frames'].includes(tool.id)) return;
    const url = URL.createObjectURL(files[0]);
    setSourcePreview(url);
    return () => {
      URL.revokeObjectURL(url);
      setSourcePreview('');
    };
  }, [files, tool.id]);
  const invalidate = () => {
    stop();
    release();
    setDownloads([]);
    setBusy(false);
    setResult(undefined);
    setError('');
    setNotice('');
  };
  const modify = (text: string) => {
    invalidate();
    setInput(text);
  };
  const setParam = (key: string, value: string | boolean) => {
    invalidate();
    setParams((old) => ({ ...old, [key]: value }));
  };
  const run = async () => {
    invalidate();
    const controller = new AbortController();
    task.current = controller;
    setBusy(true);
    const timer = setTimeout(
      () => controller.abort(new ToolError('timeout')),
      tool.id === 'file-rename' && params.mode === 'regex' ? 5000 : 120000
    );
    try {
      if (new TextEncoder().encode(input).length > 5 * 1024 * 1024) throw new ToolError('limit');
      validateFiles(files);
      validateParams(tool.id, params);
      let output: WorkResult;
      if (fileToolIds.has(tool.id) || (tool.id === 'pdf-tools' && params.mode !== 'images'))
        output = await fileWorker(tool.id, files, input, params, controller.signal);
      else if (imageIds.has(tool.id))
        output = await (
          await import('./image-workbench')
        ).processImages(tool.id, files, input, params, controller.signal);
      else if (tool.id === 'markdown-workbench') {
        const parsed = await fileWorker(tool.id, [], input, params, controller.signal);
        const html = safePreview(parsed.text);
        output = {
          text: html,
          extension: 'html',
          html,
          artifacts: [
            { name: 'document.html', bytes: new TextEncoder().encode(html), mime: 'text/html' },
          ],
        };
      } else if (tool.id === 'font-preview')
        output = {
          text: JSON.stringify(
            { font: files[0]?.name ?? 'system-ui', ...params, sample: input },
            null,
            2
          ),
          extension: 'json',
        };
      else if (tool.id === 'browser-check') {
        output = environment();
        const storage = await navigator.storage?.estimate().catch(() => undefined);
        const permissions: Record<string, string> = {};
        for (const name of [
          'geolocation',
          'notifications',
          'camera',
          'microphone',
        ] as PermissionName[]) {
          try {
            permissions[name] = (await navigator.permissions.query({ name })).state;
          } catch {
            permissions[name] = 'unsupported';
          }
        }
        output.text = JSON.stringify({ ...JSON.parse(output.text), storage, permissions }, null, 2);
      } else
        output = await (
          await import('./media-workbench')
        ).processMedia(tool.id, files, params, controller.signal);
      controller.signal.throwIfAborted();
      if (task.current !== controller) return;
      const artifacts = output.artifacts ?? [
        {
          name: `devkit.${output.extension ?? 'txt'}`,
          mime: 'text/plain',
          bytes: new TextEncoder().encode(output.text),
        },
      ];
      const links = artifacts.map((a) => ({
        name: a.name,
        url: URL.createObjectURL(new Blob([new Uint8Array(a.bytes).buffer], { type: a.mime })),
      }));
      urls.current = links.map((l) => l.url);
      setDownloads(links);
      setResult(output);
    } catch (e) {
      if (task.current === controller)
        setError(
          e instanceof ToolError
            ? `errors.${e.code}`
            : controller.signal.aborted
              ? 'workbench.cancelled'
              : 'errors.invalid'
        );
    } finally {
      clearTimeout(timer);
      if (task.current === controller) {
        task.current = null;
        setBusy(false);
      }
    }
  };
  // Markdown refreshes after typing stops; all other expensive tools run explicitly.
  useEffect(() => {
    if (tool.id !== 'markdown-workbench') return;
    let active = true;
    const controller = new AbortController();
    liveTask.current = controller;
    const timeout = setTimeout(() => controller.abort(new ToolError('timeout')), 10000);
    const timer = setTimeout(() => {
      void fileWorker('markdown-workbench', [], input, {}, controller.signal)
        .then((output) => {
          const html = safePreview(output.text);
          if (active) setResult({ text: html, extension: 'html', html });
        })
        .catch(() => {
          if (active && !controller.signal.aborted) setError('errors.invalid');
        })
        .finally(() => clearTimeout(timeout));
    }, 350);
    return () => {
      active = false;
      controller.abort();
      clearTimeout(timeout);
      clearTimeout(timer);
    };
  }, [tool.id, input]);
  const example = async () => {
    if ((input || files.length) && !confirm(t('common.confirmExample'))) return;
    invalidate();
    const controller = new AbortController();
    task.current = controller;
    setBusy(true);
    try {
      let examples: File[] = [];
      if (
        [
          'image-batch',
          'image-stitch',
          'image-palette',
          'image-annotate',
          'ascii-art',
          'screenshot-beautify',
          'image-css',
        ].includes(tool.id)
      ) {
        const file = await exampleImage();
        examples = [file];
        if (multiFiles.has(tool.id))
          examples.push(new File([file], 'second.png', { type: file.type }));
      } else if (tool.id === 'pdf-tools') {
        const { PDFDocument, StandardFonts } = await import('pdf-lib');
        const pdf = await PDFDocument.create();
        const font = await pdf.embedFont(StandardFonts.Helvetica);
        for (let i = 1; i <= 3; i++)
          pdf.addPage([400, 300]).drawText(`DevKit Page ${i}`, { x: 60, y: 180, size: 24, font });
        examples = [
          new File([new Uint8Array(await pdf.save()).buffer], 'example.pdf', {
            type: 'application/pdf',
          }),
        ];
      } else if (tool.id === 'audio-editor') {
        const { wav } = await import('./media-workbench');
        const samples = Float32Array.from(
          { length: 44100 },
          (_, i) => Math.sin((i * 2 * Math.PI * 440) / 44100) * 0.2
        );
        examples = [
          new File([new Uint8Array(wav([samples], 44100)).buffer], 'tone.wav', {
            type: 'audio/wav',
          }),
        ];
      } else if (tool.id === 'spreadsheet')
        examples = [
          new File(['name,score\nAda,95\nLin,88\nAda,95'], 'example.csv', { type: 'text/csv' }),
        ];
      else if (['file-rename', 'file-duplicates', 'file-signature'].includes(tool.id))
        examples = [new File(['DevKit'], 'first.txt'), new File(['DevKit'], 'second.txt')];
      controller.signal.throwIfAborted();
      if (task.current !== controller) return;
      setFiles(examples);
      setInput(tool.example);
      setParams(defaults(tool.id));
    } catch {
      if (task.current === controller) setError('errors.invalid');
    } finally {
      if (task.current === controller) {
        task.current = null;
        setBusy(false);
      }
    }
  };
  return (
    <div
      className="space-y-5"
      onKeyDown={(e) => {
        if (
          (e.ctrlKey || e.metaKey) &&
          e.key === 'Enter' &&
          !e.nativeEvent.isComposing &&
          !busy &&
          tool.id !== 'websocket'
        ) {
          e.preventDefault();
          void run();
        }
      }}
    >
      <header className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold">{t(tool.titleKey)}</h1>
          <p className="mt-1 text-sm text-secondary">{t(tool.descriptionKey)}</p>
        </div>
        <Button
          aria-label={t('common.favorites')}
          aria-pressed={favorites.includes(tool.id)}
          onClick={() => toggleFavorite(tool.id)}
        >
          <Star size={16} fill={favorites.includes(tool.id) ? 'currentColor' : 'none'} />
        </Button>
      </header>
      <p className="rounded-lg border border-border bg-surface px-4 py-3 text-xs leading-relaxed text-secondary">
        {t(`workbench.help.${tool.id}`)}
      </p>
      {tool.id === 'websocket' ? (
        <SocketPanel t={t} />
      ) : (
        <>
          <ParameterFields id={tool.id} params={params} onChange={setParam} t={t} />
          <div className="flex flex-wrap items-center gap-2">
            <Button primary onClick={() => void run()} disabled={busy}>
              <Play size={14} />
              {t('common.run')}
              <kbd className="text-[11px] opacity-70">{shortcutModifier()} ↵</kbd>
            </Button>
            {busy && (
              <Button
                onClick={() => {
                  invalidate();
                  setError('workbench.cancelled');
                }}
              >
                <Square size={14} />
                {t('common.cancel')}
              </Button>
            )}
            {!['video-frames', 'browser-check'].includes(tool.id) && (
              <Button onClick={() => void example()} disabled={busy}>
                {t('common.example')}
              </Button>
            )}
            {!noFiles.has(tool.id) && (
              <>
                <Button onClick={() => fileInput.current?.click()}>
                  <FileUp size={14} />
                  {t('common.file')}
                </Button>
                <input
                  ref={fileInput}
                  type="file"
                  className="hidden"
                  aria-label={t('common.file')}
                  accept={accepts[tool.id] ?? (tool.id.startsWith('file-') ? undefined : 'image/*')}
                  multiple={multiFiles.has(tool.id)}
                  onChange={(e) => {
                    const selected = Array.from(e.target.files ?? []);
                    e.target.value = '';
                    invalidate();
                    try {
                      validateFiles(selected);
                      setFiles(selected);
                    } catch {
                      setError('errors.limit');
                    }
                  }}
                />
              </>
            )}
            <Button
              onClick={() => {
                invalidate();
                setInput('');
                setFiles([]);
              }}
            >
              <Trash2 size={14} />
              {t('common.clear')}
            </Button>
            <Button
              onClick={() => {
                invalidate();
                setInput('');
                setFiles([]);
                setParams(defaults(tool.id));
              }}
            >
              <RotateCcw size={14} />
              {t('common.reset')}
            </Button>
          </div>
          {files.length > 0 && (
            <ul className="max-h-40 overflow-auto rounded-lg border border-border bg-surface p-3 text-xs break-all">
              {files.map((file, i) => (
                <li key={`${file.name}-${i}`}>
                  {file.name} · {(file.size / 1024).toFixed(1)} KiB
                </li>
              ))}
            </ul>
          )}
          {tool.id === 'font-preview' &&
            (files.length ? files : [undefined]).map((file, i) => (
              <FontPanel key={i} file={file} text={input} params={params} t={t} />
            ))}
          {tool.id === 'pixel-editor' && <PixelPanel input={input} onChange={modify} t={t} />}
          {tool.id === 'image-annotate' && sourcePreview && (
            <button
              className="block max-w-full rounded-panel border border-border bg-surface p-2"
              aria-label={t('workbench.annotationClick')}
              onClick={(e) => {
                const image = e.currentTarget.querySelector('img');
                if (!image) return;
                const rect = image.getBoundingClientRect();
                const x = Math.max(
                  0,
                  Math.min(
                    image.naturalWidth - 1,
                    Math.round(
                      ((e.detail ? e.clientX - rect.left : rect.width / 2) / rect.width) *
                        image.naturalWidth
                    )
                  )
                );
                const y = Math.max(
                  0,
                  Math.min(
                    image.naturalHeight - 1,
                    Math.round(
                      ((e.detail ? e.clientY - rect.top : rect.height / 2) / rect.height) *
                        image.naturalHeight
                    )
                  )
                );
                try {
                  const annotations: unknown = JSON.parse(input || '[]');
                  if (!Array.isArray(annotations)) return;
                  modify(
                    JSON.stringify(
                      [
                        ...annotations,
                        {
                          type: 'rect',
                          x,
                          y,
                          width: Math.min(100, image.naturalWidth - x),
                          height: Math.min(60, image.naturalHeight - y),
                          color: '#ff3b30',
                        },
                      ],
                      null,
                      2
                    )
                  );
                } catch {
                  setError('errors.json');
                }
              }}
            >
              <img
                src={sourcePreview}
                alt={t('workbench.annotationClick')}
                className="max-h-96 max-w-full"
              />
            </button>
          )}
          {tool.id === 'video-frames' && sourcePreview && (
            <video src={sourcePreview} controls className="max-h-96 max-w-full" />
          )}
          {![
            'browser-check',
            'pdf-tools',
            'audio-editor',
            'video-frames',
            'file-rename',
            'file-duplicates',
            'file-signature',
            'image-css',
            'image-batch',
            'image-stitch',
            'image-palette',
            'screenshot-beautify',
          ].includes(tool.id) && (
            <Editor
              label={t('common.input')}
              value={input}
              onChange={modify}
              t={t}
              wrap={wrap}
              onWrap={() => setWrap(!wrap)}
            />
          )}
          <div
            role="status"
            aria-live="polite"
            className={`min-h-6 text-sm ${error ? 'text-danger' : 'text-secondary'}`}
          >
            {busy
              ? t('workbench.processing')
              : error
                ? t(error)
                : notice
                  ? t(notice)
                  : result
                    ? t('workbench.done')
                    : t('workbench.ready')}
          </div>
          {result?.image && (
            <img
              src={result.image}
              alt={t('common.preview')}
              className="mx-auto max-h-120 max-w-full rounded-panel border border-border"
            />
          )}
          {result?.html && (
            <section className="space-y-3">
              <Button onClick={() => frame.current?.contentWindow?.print()}>
                {t('workbench.print')}
              </Button>
              <nav aria-label={t('workbench.outline')} className="flex flex-wrap gap-2">
                {[
                  ...new DOMParser()
                    .parseFromString(result.html, 'text/html')
                    .querySelectorAll('h1,h2,h3,h4,h5,h6'),
                ].map((heading, i) => (
                  <button
                    key={i}
                    className="rounded-lg border border-border px-3 py-2 text-xs text-accent hover:bg-muted"
                    onClick={() => {
                      const headings =
                        frame.current?.contentDocument?.querySelectorAll('h1,h2,h3,h4,h5,h6');
                      headings?.[i]?.scrollIntoView();
                    }}
                  >
                    {heading.textContent}
                  </button>
                ))}
              </nav>
              <iframe
                ref={frame}
                title={t('common.preview')}
                sandbox="allow-same-origin allow-modals"
                srcDoc={result.html}
                className="min-h-100 w-full rounded-panel border border-border bg-white"
              />
            </section>
          )}
          {result && (
            <Editor
              label={t('common.output')}
              value={result.text}
              t={t}
              wrap={wrap}
              onWrap={() => setWrap(!wrap)}
              canExport
              onCopy={() => {
                if (!navigator.clipboard?.writeText) {
                  setNotice('common.manualCopy');
                  return;
                }
                void navigator.clipboard
                  .writeText(result.text)
                  .then(() => setNotice('common.copied'))
                  .catch(() => setNotice('common.manualCopy'));
              }}
            />
          )}
          {!!downloads.length && (
            <div className="flex flex-wrap gap-3">
              {downloads.map((link) => (
                <a
                  key={link.url}
                  href={link.url}
                  download={link.name}
                  className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border bg-surface px-4 text-sm text-accent"
                >
                  <Download size={15} />
                  {link.name}
                </a>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
