import { Select } from '@/components/Select';
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  CircleAlert,
  Copy,
  Download,
  FileUp,
  Loader2,
  Play,
  RotateCcw,
  ShieldCheck,
  Square,
  Star,
  Trash2,
  Undo2,
} from 'lucide-react';
import { Button, controlClass } from '@/components/ui';
import { toolIcon } from '@/components/icons';
import { Editor } from '@/components/Editor';
import type { AppContext } from '@/app/context';
import { ToolError, type Result } from '@/lib/errors';
import { utf8 } from '@/lib/encoding';
import { readDraft, writeDraft } from '@/lib/storage';
import { shortcutModifier } from '@/lib/keyboard';
import { fields, defaults, noInputTools, sensitiveTools, visualTools, type Params } from './schema';
import { tools, type Tool } from './registry';
import VisualControls from './VisualControls';
const CountdownPanel = lazy(() => import('./CountdownPanel'));
const WheelPanel = lazy(() => import('./WheelPanel'));
const TablePanel = lazy(() => import('./TablePanel'));
const Reference = lazy(() => import('./Reference'));
const CronDescription = lazy(() => import('./CronDescription'));
const browserTools = new Set(['svg-tools', 'image-tools', 'qr-code']);
const comparisonTools = new Set([
  'document-diff',
  'subtitle-tools',
  'json-diff',
  'text-diff',
  'env-diff',
  'i18n-check',
  'url-parser',
]);
type Status = 'idle' | 'dirty' | 'running' | 'success' | 'error' | 'cancelled';
interface Draft {
  input: string;
  secondary: string;
  params: Params;
  result?: Result;
  status: Status;
  code?: string;
  detail?: string;
  elapsed?: number;
  layer: number;
}
const drafts = new Map<string, Draft>();
const newDraft = (id: string): Draft => ({
  input: '',
  secondary: '',
  params: defaults(id),
  status: 'idle',
  layer: 0,
});
const initialDraft = (id: string): Draft => {
  const saved = readDraft(id);
  return (
    drafts.get(id) ??
    (saved
      ? { ...newDraft(id), ...saved, params: { ...defaults(id), ...saved.params }, status: 'dirty' }
      : newDraft(id))
  );
};
const notices: Record<string, string> = {
  'json-mock': 'help-json-mock',
  'request-converter': 'help-request-converter',
  openapi: 'help-openapi',
  'sql-tools': 'help-sql-tools',
  'format-converter': 'help-format-converter',
  'text-analyzer': 'help-text-analyzer',
  'css-converter': 'help-css-converter',
  'table-generator': 'help-table-generator',
  'text-cleaner': 'help-text-cleaner',
  'document-diff': 'help-document-diff',
  'subtitle-tools': 'help-subtitle-tools',
  'text-redact': 'help-text-redact',
  'password-generator': 'help-password-generator',
  certificate: 'help-certificate',
  'date-workbench': 'help-date-workbench',
  'split-bill': 'help-split-bill',
  'unit-converter': 'help-unit-converter',
  lottery: 'help-lottery',
  'link-tools': 'help-link-tools',
  decision: 'help-decision',
  workflow: 'help-workflow',
  jwt: 'notVerified',
  hash: 'legacyHash',
  aes: 'aesNote',
  hmac: 'hmacNote',
  'js-obfuscator': 'obfuscationNote',
  'json-csv': 'formulaNote',
  'json-path': 'jsonpathNote',
  timezone: 'dateNote',
  'date-calculator': 'dateNote',
  cron: 'cronNote',
  regex: 'regexNote',
  'unicode-html': 'htmlNote',
  'curl-converter': 'curlNote',
  'mock-data': 'mockNote',
  'css-units': 'unitNote',
  'text-encoding': 'encodingNote',
  'image-tools': 'imageNote',
  'json-diff': 'jsonDiffNote',
  'i18n-check': 'i18nNote',
};
export default function ToolPage({
  tool,
  t,
  locale,
  favorites,
  toggleFavorite,
  navigate,
}: AppContext & { tool: Tool }) {
  const modifier = shortcutModifier();
  const [draft, setDraft] = useState<Draft>(() => initialDraft(tool.id));
  const [wrap, setWrap] = useState(false);
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState('');
  const [saveDraft, setSaveDraft] = useState(() => Boolean(readDraft(tool.id)));
  const [isExported, setExported] = useState(true);
  const [undo, setUndo] = useState<Draft>();
  const [file, setFile] = useState<File>();
  const [isPaused, setPaused] = useState(
    () => matchMedia('(prefers-reduced-motion: reduce)').matches
  );
  const [clockRunning, setClockRunning] = useState(true);
  const [now, setNow] = useState(() => Date.now());
  const [folded, setFolded] = useState(false);
  const [split, setSplit] = useState('50');
  const [syncScroll, setSyncScroll] = useState(true);
  const previewFrame = useRef<HTMLIFrameElement>(null);
  const [animationVersion, setAnimationVersion] = useState(0);
  const worker = useRef<Worker | null>(null);
  const browserTask = useRef<AbortController | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const serial = useRef(0);
  const composing = useRef(false);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const changeDraft = useCallback(
    (update: Partial<Draft> | ((old: Draft) => Draft)) => {
      setDraft((old) => {
        const next = typeof update === 'function' ? update(old) : { ...old, ...update };
        drafts.set(tool.id, next);
        return next;
      });
    },
    [tool.id]
  );
  const stop = useCallback(() => {
    serial.current++;
    worker.current?.terminate();
    worker.current = null;
    browserTask.current?.abort();
    browserTask.current = null;
    if (timer.current) clearTimeout(timer.current);
  }, []);
  useEffect(
    () => () => {
      stop();
      const pending = drafts.get(tool.id);
      if (pending?.status === 'running') drafts.set(tool.id, { ...pending, status: 'cancelled' });
      if (copyTimer.current) clearTimeout(copyTimer.current);
    },
    [stop, tool.id]
  );
  useEffect(() => {
    if (tool.id !== 'timestamp' || !clockRunning) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [tool.id, clockRunning]);
  useEffect(() => {
    if (!saveDraft || sensitiveTools.has(tool.id)) return;
    const timeout = setTimeout(() => {
      if (
        !writeDraft(tool.id, {
          input: draft.input,
          secondary: draft.secondary,
          params: draft.params,
        })
      )
        setMessage('common.draftLimit');
    }, 500);
    return () => clearTimeout(timeout);
  }, [draft.input, draft.secondary, draft.params, saveDraft, tool.id]);
  useEffect(() => {
    if (isExported || draft.status !== 'success') return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isExported, draft.status]);
  const modify = (update: Partial<Draft>) => {
    setExported(false);
    stop();
    changeDraft({
      ...update,
      status: 'dirty',
      result: undefined,
      code: undefined,
      detail: undefined,
    });
    setMessage('');
  };
  const run = useCallback(() => {
    stop();
    setMessage('');
    setCopied(false);
    if (
      !draft.input.length &&
      !noInputTools.has(tool.id) &&
      !file &&
      tool.id !== 'image-tools' &&
      !(tool.id === 'date-workbench' && draft.params.mode === 'countdown') &&
      !(tool.id === 'qr-code' && draft.params.mode === 'read-qr')
    ) {
      changeDraft({ status: 'idle', result: undefined });
      return;
    }
    if (utf8(draft.input).length > 5 * 1024 * 1024) {
      changeDraft({ status: 'error', code: 'limit' });
      return;
    }
    const taskId = ++serial.current;
    changeDraft({ status: 'running', result: undefined, code: undefined, detail: undefined });
    timer.current = setTimeout(
      () => {
        if (serial.current === taskId) {
          stop();
          changeDraft({ status: 'error', code: 'timeout' });
        }
      },
      tool.id === 'regex' ? 1000 : 60000
    );
    if (browserTools.has(tool.id)) {
      const controller = new AbortController();
      browserTask.current = controller;
      const start = performance.now();
      void import('./browser')
        .then(({ transformBrowser }) =>
          transformBrowser(tool.id, draft.input, draft.params, file, controller.signal)
        )
        .then((result) => {
          if (taskId !== serial.current) return;
          stop();
          changeDraft({ status: 'success', result, elapsed: performance.now() - start });
        })
        .catch((error: unknown) => {
          if (taskId !== serial.current) return;
          stop();
          changeDraft({
            status: 'error',
            code: error instanceof ToolError ? error.code : 'invalid',
          });
        });
      return;
    }
    const instance = new Worker(new URL('../workers/transform.worker.ts', import.meta.url), {
      type: 'module',
    });
    worker.current = instance;
    instance.onmessage = async ({
      data,
    }: MessageEvent<{
      taskId: number;
      ok: boolean;
      result: Result;
      elapsed: number;
      code: string;
      detail: string;
    }>) => {
      if (data.taskId !== serial.current) return;
      if (data.ok && data.result.html) {
        try {
          const { safePreview } = await import('./browser');
          if (data.taskId !== serial.current) return;
          data.result.html = safePreview(data.result.html);
        } catch {
          if (data.taskId !== serial.current) return;
          stop();
          changeDraft({ status: 'error', code: 'capability' });
          return;
        }
      }
      stop();
      if (data.ok) changeDraft({ status: 'success', result: data.result, elapsed: data.elapsed });
      else
        changeDraft({
          status: 'error',
          code: data.code,
          detail: sensitiveTools.has(tool.id) ? undefined : data.detail,
        });
    };
    instance.onerror = () => {
      if (serial.current === taskId) {
        stop();
        changeDraft({ status: 'error', code: 'capability' });
      }
    };
    instance.postMessage({
      taskId,
      id: tool.id,
      input: draft.input,
      secondary: draft.secondary,
      params: draft.params,
      file,
    });
  }, [stop, draft.input, draft.secondary, draft.params, tool.id, file, changeDraft]);
  const auto =
    visualTools.has(tool.id) ||
    ['base64', 'url-codec', 'timestamp', 'string-case', 'css-units'].includes(tool.id);
  useEffect(() => {
    if (!auto || composing.current) return;
    const timeout = setTimeout(run, 250);
    return () => clearTimeout(timeout);
  }, [run, auto]);
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
        event.preventDefault();
        run();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [run]);
  const reset = () => {
    setExported(true);
    stop();
    if (!sensitiveTools.has(tool.id)) setUndo(draft);
    changeDraft(newDraft(tool.id));
    setFile(undefined);
    setMessage('');
  };
  const copy = async () => {
    if (draft.status !== 'success' || !draft.result) return;
    try {
      await navigator.clipboard.writeText(draft.result.text);
      setCopied(true);
      setExported(true);
      copyTimer.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.getElementById('result-editor');
      if (textarea instanceof HTMLTextAreaElement) {
        textarea.focus();
        textarea.select();
      }
      setMessage('common.manualCopy');
    }
  };
  const download = (raw = false) => {
    if (draft.status !== 'success' || !draft.result) return;
    const data = raw && draft.result.bytes ? new Uint8Array(draft.result.bytes) : draft.result.text;
    const url = URL.createObjectURL(
      new Blob([data], { type: raw ? 'application/octet-stream' : 'text/plain;charset=utf-8' })
    );
    setExported(true);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${tool.id}-${Date.now()}.${raw ? (draft.result.bytesExtension ?? 'bin') : (draft.result.extension ?? 'txt')}`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const loadFile = async (selected?: File) => {
    if (!selected) return;
    stop();
    const readTask = serial.current;
    setSaveDraft(false);
    writeDraft(tool.id);
    const max =
      tool.id === 'hash'
        ? 100 * 1024 * 1024
        : ['image-tools', 'qr-code'].includes(tool.id)
          ? 20 * 1024 * 1024
          : 5 * 1024 * 1024;
    if (selected.size > max) {
      modify({});
      changeDraft({ status: 'error', code: 'limit' });
      return;
    }
    if (
      ['hash', 'image-tools', 'text-encoding'].includes(tool.id) ||
      (tool.id === 'qr-code' && draft.params.mode === 'read-qr')
    ) {
      setFile(selected);
      modify({});
    } else {
      try {
        const text = new TextDecoder('utf-8', { fatal: true }).decode(await selected.arrayBuffer());
        if (readTask !== serial.current) return;
        setFile(undefined);
        modify({ input: text });
      } catch {
        if (readTask !== serial.current) return;
        changeDraft({ status: 'error', code: 'utf8' });
      }
    }
  };
  const Icon = toolIcon(tool.id, tool.category);
  const canExport = draft.status === 'success' && Boolean(draft.result);
  const notice = notices[tool.id];
  const preview = draft.result?.preview?.startsWith('<!doctype') ? draft.result.preview : undefined;
  const previewSource = preview;
  const binaryInput =
    tool.id === 'image-tools' || (tool.id === 'qr-code' && draft.params.mode === 'read-qr');
  const hasComparison =
    comparisonTools.has(tool.id) && (tool.id !== 'url-parser' || draft.params.mode === 'compare');
  useEffect(() => {
    const demo = previewFrame.current?.contentDocument?.querySelector<HTMLElement>('.demo');
    if (demo) demo.style.animationPlayState = isPaused ? 'paused' : 'running';
  }, [isPaused, preview]);
  const setParam = (key: string, value: string | boolean) => {
    if (tool.id === 'qr-code' && key === 'mode') setFile(undefined);
    modify({ params: { ...draft.params, [key]: value } });
  };
  return (
    <div
      className="mx-auto max-w-400 space-y-6"
      onCompositionStart={() => {
        composing.current = true;
      }}
      onCompositionEnd={() => {
        composing.current = false;
        if (auto) run();
      }}
    >
      <div className="flex items-center gap-2 text-xs text-secondary">
        <button onClick={() => navigate('/')}>{t('common.home')}</button>
        <span>/</span>
        <span>{t(`categories.${tool.category}`)}</span>
      </div>
      <header className="flex items-start justify-between gap-4">
        <div className="flex gap-4">
          <div className="flex size-13 shrink-0 items-center justify-center rounded-2xl border border-border bg-surface text-accent shadow-card">
            <Icon size={27} strokeWidth={1.6} />
          </div>
          <div>
            <h1 className="text-2xl leading-8 font-semibold tracking-tight">{t(tool.titleKey)}</h1>
            <p className="mt-1 text-[13px] text-secondary">{t(tool.descriptionKey)}</p>
          </div>
        </div>
        <button
          className="rounded-lg border border-border bg-surface p-2.5 text-secondary hover:text-accent"
          aria-label={t(favorites.includes(tool.id) ? 'common.unfavorite' : 'common.favorite')}
          aria-pressed={favorites.includes(tool.id)}
          onClick={() => toggleFavorite(tool.id)}
        >
          <Star
            size={18}
            className={favorites.includes(tool.id) ? 'fill-accent text-accent' : ''}
          />
        </button>
      </header>
      {tool.id === 'http-reference' ? (
        <Suspense fallback={<p>{t('common.running')}</p>}>
          <Reference t={t} />
        </Suspense>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2 rounded-panel border border-border bg-surface p-3 shadow-card">
            <Button primary onClick={run} disabled={draft.status === 'running'}>
              {draft.status === 'running' ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <Play size={15} />
              )}{' '}
              {t(draft.status === 'running' ? 'common.running' : 'common.run')}
              <kbd className="ms-2 hidden text-[10px] whitespace-nowrap opacity-65 sm:block">
                {modifier} ↵
              </kbd>
            </Button>
            {draft.status === 'running' && (
              <Button
                onClick={() => {
                  stop();
                  changeDraft({ status: 'cancelled' });
                }}
              >
                <Square size={14} />
                {t('common.cancel')}
              </Button>
            )}
            {!noInputTools.has(tool.id) && (
              <Button
                onClick={() => {
                  if ((draft.input || file) && !window.confirm(t('common.confirmExample'))) return;
                  if (binaryInput) {
                    stop();
                    const taskId = serial.current;
                    changeDraft({ status: 'running', result: undefined });
                    void import('./browser')
                      .then(({ exampleImage }) =>
                        exampleImage(tool.id === 'qr-code' ? tool.example : undefined)
                      )
                      .then((example) => {
                        if (serial.current !== taskId) return;
                        setFile(example);
                        setSaveDraft(false);
                        writeDraft(tool.id);
                        modify({ input: '' });
                      })
                      .catch(() => {
                        if (serial.current === taskId)
                          changeDraft({ status: 'error', code: 'capability' });
                      });
                    return;
                  }
                  setFile(undefined);
                  modify({
                    input: tool.example,
                    ...(tool.id === 'aes'
                      ? {
                          params: {
                            ...draft.params,
                            key: Array.from(crypto.getRandomValues(new Uint8Array(32)), (v) =>
                              v.toString(16).padStart(2, '0')
                            ).join(''),
                            keyEncoding: 'HEX',
                          },
                        }
                      : {}),
                    ...(tool.id === 'hmac'
                      ? { params: { ...draft.params, key: 'example-key', keyEncoding: 'text' } }
                      : {}),
                    secondary:
                      tool.id === 'json-diff'
                        ? '{"name":"DevKit","version":2,"tags":["local","fast"]}'
                        : tool.id === 'text-diff'
                          ? 'Hello DevKit\nPrivate tools\n'
                          : tool.id === 'env-diff'
                            ? 'API_URL=https://staging.example.test\nAPI_TOKEN=another-example\nFEATURE=true'
                            : tool.id === 'i18n-check'
                              ? '{"hello":"你好 {username}","save":"","menu":{"home":"首页"}}'
                              : tool.id === 'url-parser'
                                ? 'https://example.com:8080/path?q=world&channel=ad'
                                : draft.secondary,
                  });
                }}
              >
                <Copy size={14} />
                {t('common.example')}
              </Button>
            )}
            <Button
              onClick={() => {
                setFile(undefined);
                modify({ input: '', secondary: '' });
              }}
            >
              <Trash2 size={14} />
              {t('common.clear')}
            </Button>
            <Button onClick={reset}>
              <RotateCcw size={14} />
              {t('common.reset')}
            </Button>
            {undo && (
              <Button
                onClick={() => {
                  stop();
                  changeDraft(undo);
                  setUndo(undefined);
                }}
              >
                <Undo2 size={14} />
                {t('common.undo')}
              </Button>
            )}
            {!noInputTools.has(tool.id) && (
              <label className="ms-auto inline-flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-secondary hover:bg-muted">
                <FileUp size={15} />
                {t('common.file')}
                <input
                  aria-label={t('common.file')}
                  type="file"
                  accept={
                    binaryInput
                      ? 'image/png,image/jpeg,image/webp,image/gif,image/avif,image/bmp'
                      : undefined
                  }
                  className="sr-only"
                  onChange={(e) => {
                    void loadFile(e.target.files?.[0]);
                    e.currentTarget.value = '';
                  }}
                />
              </label>
            )}
          </div>
          {(fields[tool.id]?.length ?? 0) > 0 && (
            <section
              aria-label={t('common.parameters')}
              className="grid grid-cols-1 gap-4 rounded-panel border border-border bg-surface p-4 sm:grid-cols-2 xl:grid-cols-4"
            >
              {fields[tool.id].map((field) =>
                field.type === 'checkbox' ? (
                  <label
                    key={field.key}
                    className="flex min-h-9 min-w-0 cursor-pointer items-center gap-2.5 self-end rounded-lg border border-border bg-surface px-3 py-1.5 text-[13px] text-primary transition-colors hover:bg-muted"
                  >
                    <input
                      type="checkbox"
                      className="size-4 shrink-0 cursor-pointer accent-accent"
                      checked={Boolean(draft.params[field.key])}
                      onChange={(e) => setParam(field.key, e.target.checked)}
                    />
                    <span className="min-w-0 break-words">{t(`fields.${field.key}`)}</span>
                  </label>
                ) : (
                  <label
                    key={field.key}
                    className={`min-w-0 ${field.type === 'textarea' ? 'sm:col-span-2' : ''}`}
                  >
                    <span className="mb-1.5 block text-xs font-medium text-secondary">
                      {t(
                        `fields.${tool.id === 'qr-code' && field.key === 'width' ? 'qrWidth' : field.key}`
                      )}
                    </span>
                    {field.type === 'select' ? (
                      <Select
                        aria-label={t(`fields.${field.key}`)}
                        value={String(draft.params[field.key])}
                        onValueChange={(value) => setParam(field.key, value)}
                      >
                        {field.options?.map((option) => (
                          <option key={option} value={option}>
                            {t(`options.${option}`).startsWith('options.')
                              ? option
                              : t(`options.${option}`)}
                          </option>
                        ))}
                      </Select>
                    ) : field.type === 'textarea' ? (
                      <textarea
                        className={`${controlClass} min-h-22 font-mono text-xs`}
                        value={String(draft.params[field.key])}
                        onChange={(e) => setParam(field.key, e.target.value)}
                        spellCheck={false}
                      />
                    ) : (
                      <input
                        type={field.type}
                        step="any"
                        autoComplete="off"
                        className={`${controlClass} ${field.type === 'password' ? 'font-mono' : ''}`}
                        value={String(draft.params[field.key])}
                        onChange={(e) => setParam(field.key, e.target.value)}
                      />
                    )}
                  </label>
                )
              )}
            </section>
          )}
          <VisualControls
            id={tool.id}
            params={draft.params}
            onChange={(params) => modify({ params })}
            t={t}
            input={draft.input}
            onInput={(input) => modify({ input })}
          />
          {tool.id === 'cron' && (
            <Suspense fallback={null}>
              <CronDescription
                input={draft.input}
                seconds={Boolean(draft.params.seconds)}
                locale={locale}
                t={t}
              />
            </Suspense>
          )}
          {tool.id === 'date-workbench' && draft.params.mode === 'countdown' && (
            <Suspense fallback={<p>{t('common.running')}</p>}>
              <CountdownPanel instant={String(draft.params.instant)} t={t} />
            </Suspense>
          )}
          {tool.id === 'lottery' && (
            <Suspense fallback={<p>{t('common.running')}</p>}>
              <WheelPanel input={draft.input} result={draft.result} t={t} />
            </Suspense>
          )}
          {tool.id === 'table-generator' && (
            <Suspense fallback={<p>{t('common.running')}</p>}>
              <TablePanel input={draft.input} onChange={(input) => modify({ input })} t={t} />
            </Suspense>
          )}
          {notice && (
            <p className="flex items-start gap-2 text-xs text-secondary">
              <ShieldCheck className="mt-0.5 shrink-0 text-accent" size={15} />
              {t(`common.${notice}`)}
            </p>
          )}
          {tool.id === 'timestamp' && (
            <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-surface px-4 py-2">
              <span className="text-xs text-secondary">{t('common.now')}</span>
              <code>{Math.floor(now / 1000)}</code>
              <span className="text-xs text-secondary">
                {new Intl.DateTimeFormat(locale, {
                  dateStyle: 'medium',
                  timeStyle: 'medium',
                }).format(now)}
              </span>
              <Button onClick={() => setClockRunning(!clockRunning)}>
                {t(clockRunning ? 'common.pause' : 'common.play')}
              </Button>
              <Button
                onClick={() => {
                  void navigator.clipboard
                    .writeText(String(Math.floor(now / 1000)))
                    .catch(() => setMessage('common.manualCopy'));
                }}
              >
                <Copy size={14} />
                {t('common.copy')}
              </Button>
            </div>
          )}
          {file && (
            <p className="text-xs text-secondary">
              {t('common.file')} · {file.size.toLocaleString()} {t('common.bytes')}
              <button
                className="ms-3 text-accent"
                onClick={() => {
                  setFile(undefined);
                  modify({});
                }}
              >
                {t('common.clear')}
              </button>
            </p>
          )}
          {binaryInput && !file && (
            <p className="rounded-panel border border-dashed border-border bg-surface p-8 text-center text-sm text-secondary">
              {t('common.imageInput')}
            </p>
          )}
          {draft.result?.image && (
            <section
              aria-label={t('common.preview')}
              className="rounded-panel border border-border bg-surface p-4"
            >
              <h2 className="mb-3 text-sm font-semibold">{t('common.preview')}</h2>
              <img
                src={draft.result.image}
                alt={t('common.preview')}
                className="mx-auto max-h-100 max-w-full rounded-lg"
              />
            </section>
          )}
          {draft.result?.html && (
            <iframe
              title={t('common.preview')}
              sandbox=""
              srcDoc={draft.result.html}
              className="min-h-80 w-full rounded-panel border border-border bg-surface"
            />
          )}
          {!binaryInput && (
            <label className="hidden items-center justify-end gap-3 text-xs text-secondary desktop:flex">
              <span>{t('common.split')}</span>
              <input
                type="range"
                min="35"
                max="65"
                value={split}
                className="w-28 accent-accent"
                onChange={(e) => setSplit(e.target.value)}
              />
            </label>
          )}
          <div
            style={
              {
                '--split': `${split}fr`,
                '--split-rest': `${100 - Number(split)}fr`,
              } as import('react').CSSProperties
            }
            className={`grid min-w-0 gap-4 ${binaryInput ? '' : 'min-[56.25rem]:grid-cols-2 desktop:grid-cols-[minmax(0,var(--split))_minmax(0,var(--split-rest))]'}`}
          >
            {previewSource ? (
              <section className="overflow-hidden rounded-panel border border-border bg-surface">
                <div className="flex h-12 items-center justify-between border-b border-border px-4">
                  <h2 className="text-[13px] font-semibold">{t('common.preview')}</h2>
                  {tool.id === 'animation' && (
                    <div className="flex gap-2">
                      <Button onClick={() => setPaused(!isPaused)}>
                        {t(isPaused ? 'common.play' : 'common.pause')}
                      </Button>
                      <Button
                        onClick={() => {
                          setAnimationVersion((v) => v + 1);
                        }}
                      >
                        {t('common.reset')}
                      </Button>
                    </div>
                  )}
                </div>
                <iframe
                  title={t('common.preview')}
                  sandbox="allow-same-origin"
                  ref={previewFrame}
                  key={animationVersion}
                  onLoad={() => {
                    const demo =
                      previewFrame.current?.contentDocument?.querySelector<HTMLElement>('.demo');
                    if (demo) demo.style.animationPlayState = isPaused ? 'paused' : 'running';
                  }}
                  srcDoc={previewSource}
                  className="min-h-100 w-full border-0"
                />
              </section>
            ) : (
              !noInputTools.has(tool.id) &&
              !binaryInput &&
              tool.id !== 'color' && (
                <Editor
                  label={t('common.input')}
                  value={draft.input}
                  onChange={(input) => {
                    setFile(undefined);
                    modify({ input });
                  }}
                  t={t}
                  wrap={wrap}
                  onWrap={() => setWrap(!wrap)}
                  onScroll={(top) => {
                    if (syncScroll) {
                      const secondary = document.getElementById('comparison-editor');
                      if (secondary) secondary.scrollTop = top;
                    }
                  }}
                  placeholder={t('common.idle')}
                />
              )
            )}
            <Editor
              label={t('common.output')}
              value={draft.result?.text ?? ''}
              t={t}
              wrap={wrap}
              onWrap={() => setWrap(!wrap)}
              onCopy={() => {
                void copy();
              }}
              onDownload={() => download()}
              canExport={canExport}
              copied={copied}
              placeholder={t('common.emptyOutput')}
            />
          </div>
          {preview && !noInputTools.has(tool.id) && tool.id !== 'color' && (
            <label className="block">
              <span className="mb-2 block text-xs font-medium">{t('common.input')}</span>
              <input
                className={controlClass}
                value={draft.input}
                onChange={(e) => modify({ input: e.target.value })}
              />
            </label>
          )}
          {hasComparison && (
            <label className="flex items-center gap-2 text-xs text-secondary">
              <input
                type="checkbox"
                className="accent-accent"
                checked={syncScroll}
                onChange={(e) => setSyncScroll(e.target.checked)}
              />
              {t('common.syncScroll')}
            </label>
          )}
          {hasComparison && (
            <label className="block">
              <span className="mb-2 block text-xs font-medium">{t('common.second')}</span>
              <textarea
                id="comparison-editor"
                className={`${controlClass} min-h-40 font-mono`}
                onScroll={(e) => {
                  if (syncScroll) {
                    const source = document.getElementById('source-editor');
                    if (source) source.scrollTop = e.currentTarget.scrollTop;
                  }
                }}
                value={draft.secondary}
                onChange={(e) => modify({ secondary: e.target.value })}
              />
            </label>
          )}
          <div
            className="flex flex-wrap items-center gap-3 text-xs"
            id="tool-status"
            role="status"
            aria-live="polite"
          >
            {draft.status === 'error' ? (
              <CircleAlert size={15} className="text-danger" />
            ) : draft.status === 'success' ? (
              <CheckCircle2 size={15} className="text-success" />
            ) : (
              <span className="size-1.5 rounded-full bg-secondary" />
            )}
            <span className={draft.status === 'error' ? 'text-danger' : 'text-secondary'}>
              {t(
                draft.status === 'error'
                  ? `errors.${draft.code ?? 'invalid'}`
                  : `common.${draft.status}`
              )}
            </span>
            {draft.status === 'success' && (
              <span className="text-secondary">
                {new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(
                  draft.elapsed ?? 0
                )}{' '}
                ms
              </span>
            )}
            {message && <span className="text-warning">{t(message)}</span>}
            {draft.result?.note && <span className="text-warning">{t(draft.result.note)}</span>}
          </div>
          {draft.status === 'error' && draft.detail && /· (\d+):(\d+)/.test(draft.detail) && (
            <Button
              onClick={() => {
                const m = /· (\d+):(\d+)/.exec(draft.detail ?? '');
                const editor = document.getElementById('source-editor');
                if (m && editor instanceof HTMLTextAreaElement) {
                  const offset =
                    draft.input
                      .split('\n')
                      .slice(0, Number(m[1]) - 1)
                      .reduce((n, line) => n + line.length + 1, 0) +
                    Number(m[2]) -
                    1;
                  editor.focus();
                  editor.setSelectionRange(offset, offset + 1);
                  editor.scrollTop = (Number(m[1]) - 1) * 24;
                }
              }}
            >
              {t('common.jumpError')}
            </Button>
          )}
          {tool.id === 'json-path' && draft.result && (
            <div className="flex flex-wrap gap-2">
              {readPaths(draft.result.text).map((path) => (
                <Button
                  key={path}
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(path);
                      setMessage('common.copied');
                    } catch {
                      setMessage('common.manualCopy');
                    }
                  }}
                >
                  {path}
                  <Copy size={12} />
                </Button>
              ))}
            </div>
          )}
          {draft.detail && (
            <details className="text-xs text-secondary">
              <summary>{t('common.details')}</summary>
              <pre className="mt-2 overflow-auto rounded-lg bg-muted p-3 whitespace-pre-wrap">
                {draft.detail}
              </pre>
            </details>
          )}
          {draft.result?.bytes && (
            <Button onClick={() => download(true)}>
              <Download size={14} />
              {t(
                tool.id === 'image-tools'
                  ? 'common.downloadImage'
                  : tool.id === 'text-encoding'
                    ? 'common.downloadEncoded'
                    : 'common.downloadBytes'
              )}
            </Button>
          )}
          {draft.result?.preview && !preview && (
            <pre className="rounded-lg bg-muted p-3 text-xs">{draft.result.preview}</pre>
          )}
          {tool.id === 'json-formatter' && draft.result && draft.result.text.length < 100000 && (
            <details
              open={folded}
              onToggle={(e) => setFolded(e.currentTarget.open)}
              className="rounded-lg border border-border bg-surface p-3 text-xs"
            >
              <summary>{t('common.preview')}</summary>
              {folded && <JsonTree value={safeParse(draft.result.text)} />}
            </details>
          )}
          {tool.id === 'json-escape' && (
            <div className="flex items-center gap-3 text-xs text-secondary">
              <span>
                {t('common.layer')}: {draft.layer}
              </span>
              <Button
                disabled={!canExport || draft.params.mode !== 'unescape' || draft.layer >= 10}
                onClick={() => {
                  if (draft.result) {
                    setUndo(draft);
                    modify({ input: draft.result.text, layer: draft.layer + 1 });
                  }
                }}
              >
                {t('options.unescape')}
              </Button>
            </div>
          )}
          {tool.id === 'text-batch' && (
            <Button
              disabled={!canExport}
              onClick={() => {
                if (draft.result) {
                  setUndo(draft);
                  modify({ input: draft.result.text });
                }
              }}
            >
              {t('common.apply')}
            </Button>
          )}
          {!sensitiveTools.has(tool.id) && (
            <label className="flex items-start gap-2 text-xs text-secondary">
              <input
                type="checkbox"
                checked={saveDraft}
                className="mt-0.5 accent-accent"
                onChange={(e) => {
                  setSaveDraft(e.target.checked);
                  if (!e.target.checked) writeDraft(tool.id);
                }}
              />
              <span>
                {t('common.saveDraft')}
                <span className="mt-1 block text-[11px]">{t('common.draftNote')}</span>
              </span>
            </label>
          )}
          {sensitiveTools.has(tool.id) && (
            <p className="text-xs text-secondary">{t('common.sensitiveReset')}</p>
          )}
          {!noInputTools.has(tool.id) && (
            <p className="text-[11px] text-secondary">
              {t(
                binaryInput
                  ? 'common.binaryFileNote'
                  : tool.id === 'svg-tools'
                    ? 'common.svgFileNote'
                    : 'common.fileNote'
              )}
            </p>
          )}
        </>
      )}
      <section className="border-t border-border pt-6">
        <h2 className="mb-3 text-xs font-semibold text-secondary">{t('common.related')}</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {tools
            .filter((item) => item.category === tool.category && item.id !== tool.id)
            .slice(0, 3)
            .map((item) => (
              <button
                key={item.id}
                onClick={() => navigate(`/tools/${item.slug}`)}
                className="flex items-center justify-between gap-2 rounded-panel border border-border bg-surface p-4 text-start text-xs hover:border-accent"
              >
                <span>{t(item.titleKey)}</span>
                <ArrowRight size={14} className="shrink-0 text-secondary" />
              </button>
            ))}
        </div>
      </section>
    </div>
  );
}
function safeParse(text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}
function JsonTree({ value }: { value: unknown }) {
  if (value === null || typeof value !== 'object')
    return <code className="break-all">{JSON.stringify(value)}</code>;
  return (
    <div className="ps-4 font-mono">
      {Object.entries(value).map(([key, v]) =>
        typeof v === 'object' && v !== null ? (
          <details key={key}>
            <summary>
              {JSON.stringify(key)} {Array.isArray(v) ? `[${v.length}]` : '{…}'}
            </summary>
            <JsonTree value={v} />
          </details>
        ) : (
          <div key={key}>
            <span className="text-accent">{JSON.stringify(key)}</span>:{' '}
            <code>{JSON.stringify(v)}</code>
          </div>
        )
      )}
    </div>
  );
}

function readPaths(text: string): string[] {
  try {
    const data: unknown = JSON.parse(text);
    if (data && typeof data === 'object' && 'matches' in data && Array.isArray(data.matches))
      return data.matches
        .slice(0, 100)
        .flatMap((v: unknown) =>
          v && typeof v === 'object' && 'path' in v && typeof v.path === 'string' ? [v.path] : []
        );
    return [];
  } catch {
    return [];
  }
}
