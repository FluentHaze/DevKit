import { useRef } from 'react';
import { Copy, Download, WrapText, Check } from 'lucide-react';
import { Button, type Translate } from './ui';
import { utf8 } from '@/lib/encoding';
interface Props {
  label: string;
  onScroll?: (top: number) => void;
  value: string;
  onChange?: (value: string) => void;
  t: Translate;
  wrap: boolean;
  onWrap: () => void;
  onCopy?: () => void;
  onDownload?: () => void;
  canExport?: boolean;
  copied?: boolean;
  placeholder?: string;
}
export function Editor({
  label,
  onScroll,
  value,
  onChange,
  t,
  wrap,
  onWrap,
  onCopy,
  onDownload,
  canExport,
  copied,
  placeholder,
}: Props) {
  const numbers = useRef<HTMLDivElement>(null);
  const lines = value.split('\n').length;
  return (
    <section className="flex min-w-0 flex-col overflow-hidden rounded-panel border border-border bg-surface shadow-card">
      <div className="flex min-h-12 flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-2">
        <label
          htmlFor={onChange ? 'source-editor' : 'result-editor'}
          className="text-[13px] font-semibold"
        >
          {label}
        </label>
        <div className="flex items-center gap-1">
          <button
            className="rounded-md p-1.5 text-secondary hover:bg-muted"
            aria-label={t('common.wrap')}
            aria-pressed={wrap}
            onClick={onWrap}
          >
            <WrapText size={16} />
          </button>
          {onCopy && (
            <Button
              disabled={!canExport}
              onClick={onCopy}
              className="min-h-7 border-transparent px-2 py-1 text-xs"
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {t(copied ? 'common.copied' : 'common.copy')}
            </Button>
          )}
          {onDownload && (
            <button
              disabled={!canExport}
              onClick={onDownload}
              className="rounded-md p-1.5 text-secondary hover:bg-muted"
              aria-label={t('common.download')}
            >
              <Download size={16} />
            </button>
          )}
        </div>
      </div>
      <div className="flex min-h-100 flex-1 font-mono text-[13px] leading-6">
        <div
          ref={numbers}
          aria-hidden="true"
          className="max-h-150 w-11 shrink-0 overflow-hidden border-e border-border/60 bg-muted/30 py-4 pe-3 text-end text-secondary/65 select-none"
        >
          {Array.from({ length: Math.min(lines, 50000) }, (_, i) => (
            <div key={i}>{i + 1}</div>
          ))}
        </div>
        <textarea
          id={onChange ? 'source-editor' : 'result-editor'}
          aria-label={label}
          aria-describedby={onChange ? 'tool-status' : undefined}
          value={value}
          onChange={onChange ? (e) => onChange(e.target.value) : undefined}
          readOnly={!onChange}
          wrap={wrap ? 'soft' : 'off'}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          placeholder={placeholder}
          onScroll={(e) => {
            if (numbers.current) numbers.current.scrollTop = e.currentTarget.scrollTop;
            onScroll?.(e.currentTarget.scrollTop);
          }}
          className="min-h-100 w-full min-w-0 resize-y bg-transparent p-4 leading-6 text-primary outline-none placeholder:text-secondary/60 focus:bg-accent-subtle/10"
        />
      </div>
      <div className="flex justify-between border-t border-border px-4 py-2 text-[11px] text-secondary">
        <span>
          UTF-8 · {utf8(value).length.toLocaleString()}{' '}
          {t(utf8(value).length === 1 ? 'common.byte' : 'common.bytes')}
        </span>
        <span>
          {lines.toLocaleString()} {t(lines === 1 ? 'common.line' : 'common.lines')} ·{' '}
          {Array.from(value).length.toLocaleString()}{' '}
          {t(Array.from(value).length === 1 ? 'common.char' : 'common.chars')}
        </span>
      </div>
    </section>
  );
}
