import { useEffect, useRef, useState } from 'react';
import { Button, controlClass, type Translate } from '@/components/ui';
import { ToolError } from '@/lib/errors';
import type { Params } from './schema';

export function SocketPanel({ t }: { t: Translate }) {
  const socket = useRef<WebSocket | null>(null),
    token = useRef(0);
  const [url, setUrl] = useState(''),
    [message, setMessage] = useState(''),
    [logs, setLogs] = useState<string[]>([]),
    [status, setStatus] = useState('closed');
  const log = (s: string) =>
    setLogs((old) => [...old.slice(-199), `${new Date().toISOString()} ${s.slice(0, 10000)}`]);
  const disconnect = () => {
    token.current++;
    const ws = socket.current;
    socket.current = null;
    if (ws) {
      ws.onopen = ws.onmessage = ws.onerror = ws.onclose = null;
      ws.close();
    }
    setStatus('closed');
  };
  useEffect(
    () => () => {
      token.current++;
      const ws = socket.current;
      if (ws) {
        ws.onopen = ws.onmessage = ws.onerror = ws.onclose = null;
        ws.close();
      }
    },
    []
  );
  const connect = () => {
    disconnect();
    try {
      const target = new URL(url);
      if (!['ws:', 'wss:'].includes(target.protocol) || target.username || target.password)
        throw new ToolError('invalid');
      if (location.protocol === 'https:' && target.protocol !== 'wss:')
        throw new ToolError('capability');
      const ws = new WebSocket(target.href);
      socket.current = ws;
      const current = ++token.current;
      setStatus('connecting');
      ws.onopen = () => {
        if (token.current === current) {
          setStatus('open');
          log('OPEN');
        }
      };
      ws.onmessage = async (event) => {
        let text =
          typeof event.data === 'string'
            ? event.data
            : event.data instanceof Blob
              ? `[binary ${event.data.size} bytes]`
              : '[binary]';
        try {
          text = JSON.stringify(JSON.parse(text), null, 2);
        } catch {
          /* Keep non-JSON frames as text. */
        }
        if (token.current === current) log(`← ${text}`);
      };
      ws.onerror = () => {
        if (token.current === current) log(t('workbench.socketError'));
      };
      ws.onclose = (event) => {
        if (token.current === current) {
          setStatus('closed');
          log(`CLOSE ${event.code}`);
        }
      };
    } catch {
      log(t('errors.invalid'));
    }
  };
  return (
    <section className="space-y-4 rounded-panel border border-border bg-surface p-4">
      <label className="block">
        {t('workbench.socketUrl')}
        <input
          className={controlClass}
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="wss://…"
        />
      </label>
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={connect} disabled={status !== 'closed'}>
          {t('workbench.connect')}
        </Button>
        <Button onClick={disconnect} disabled={status === 'closed'}>
          {t('workbench.disconnect')}
        </Button>
        <span role="status">{t(`workbench.${status}`)}</span>
      </div>
      <label className="block">
        {t('workbench.message')}
        <textarea
          className={`${controlClass} min-h-24 font-mono`}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
      </label>
      <div className="flex gap-2">
        <Button
          disabled={status !== 'open' || !message || message.length > 100000}
          onClick={() => {
            if (socket.current?.readyState === WebSocket.OPEN) {
              socket.current.send(message);
              log(`→ ${message}`);
            }
          }}
        >
          {t('workbench.send')}
        </Button>
        <Button onClick={() => setLogs([])}>{t('common.clear')}</Button>
      </div>
      <pre
        aria-live="polite"
        className="max-h-96 overflow-auto rounded-lg bg-muted p-3 text-xs break-all whitespace-pre-wrap"
      >
        {logs.join('\n')}
      </pre>
    </section>
  );
}

export function FontPanel({
  file,
  text,
  params,
  t,
}: {
  file?: File;
  text: string;
  params: Params;
  t: Translate;
}) {
  const [family, setFamily] = useState('system-ui'),
    [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    let face: FontFace | undefined;
    if (file)
      void file
        .arrayBuffer()
        .then(async (bytes) => {
          if (bytes.byteLength > 10 * 1024 * 1024) throw new ToolError('limit');
          face = new FontFace(`DevKitLocal${crypto.randomUUID().replaceAll('-', '')}`, bytes);
          await face.load();
          if (active) {
            document.fonts.add(face);
            setFamily(face.family);
            setError('');
          }
        })
        .catch(() => {
          if (active) setError('errors.invalid');
        });
    return () => {
      active = false;
      if (face) document.fonts.delete(face);
    };
  }, [file]);
  return (
    <section className="overflow-hidden rounded-panel border border-border bg-surface p-5">
      {error && (
        <p role="alert" className="text-danger">
          {t(error)}
        </p>
      )}
      <p className="mb-4 text-xs text-secondary">{file?.name ?? t('workbench.systemFont')}</p>
      <div
        className="break-words whitespace-pre-wrap"
        style={{
          fontFamily: file ? family : 'system-ui',
          fontSize: Math.max(8, Math.min(120, Number(params.fontSize) || 24)),
          fontWeight: Math.max(100, Math.min(900, Number(params.fontWeight) || 400)),
          lineHeight: Math.max(1, Math.min(3, Number(params.lineHeight) || 1.6)),
        }}
      >
        {text || 'DevKit Aa 你好 0123456789'}
      </div>
    </section>
  );
}

export function PixelPanel({
  input,
  onChange,
  t,
}: {
  input: string;
  onChange: (value: string) => void;
  t: Translate;
}) {
  const [color, setColor] = useState('#0066cc'),
    [erase, setErase] = useState(false);
  let grid: string[][] = [];
  try {
    const value: unknown = JSON.parse(input);
    if (
      Array.isArray(value) &&
      value.length <= 32 &&
      value.every(
        (row) =>
          Array.isArray(row) &&
          row.length === value.length &&
          row.every((c) => c === 'transparent' || /^#[0-9a-f]{6}$/i.test(String(c)))
      )
    )
      grid = value;
  } catch {
    /* Editable source can be incomplete. */
  }
  return (
    <section className="space-y-3 rounded-panel border border-border bg-surface p-4">
      <div className="flex flex-wrap items-center gap-3">
        <label>
          {t('fields.color')}
          <input type="color" value={color} onChange={(e) => setColor(e.target.value)} />
        </label>
        <label className="flex gap-2">
          <input type="checkbox" checked={erase} onChange={(e) => setErase(e.target.checked)} />
          {t('workbench.eraser')}
        </label>
        <Button
          onClick={() =>
            onChange(
              JSON.stringify(
                Array.from({ length: 16 }, () => Array<string>(16).fill('transparent'))
              )
            )
          }
        >
          {t('workbench.blankGrid')}
        </Button>
      </div>
      <div
        role="group"
        aria-label={t('tools.pixel-editor.title')}
        className="grid max-w-lg gap-px border border-border bg-border"
        style={{ gridTemplateColumns: `repeat(${grid.length || 1}, minmax(0,1fr))` }}
      >
        {grid.flatMap((row, y) =>
          row.map((fill, x) => (
            <button
              key={`${x}-${y}`}
              aria-label={`${x + 1}, ${y + 1}: ${fill}`}
              className="aspect-square min-w-0 bg-surface"
              style={{ backgroundColor: fill }}
              onClick={() => {
                const next = grid.map((r) => [...r]);
                next[y][x] = erase ? 'transparent' : color;
                onChange(JSON.stringify(next));
              }}
            />
          ))
        )}
      </div>
    </section>
  );
}
