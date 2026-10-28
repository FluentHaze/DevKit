import { Select } from '@/components/Select';
import { useState } from 'react';
import { ArrowDown, ArrowUp, Plus, Trash2, Pipette } from 'lucide-react';
import { Button, controlClass, type Translate } from '@/components/ui';
import type { Params } from './schema';
import { encodeBytes } from '@/lib/encoding';
interface Props {
  id: string;
  params: Params;
  onChange: (params: Params) => void;
  t: Translate;
  input: string;
  onInput: (input: string) => void;
}
interface ListColumn {
  key: string;
  type: 'number' | 'text' | 'checkbox';
  fallback: string | number | boolean;
}
const column = (
  key: string,
  type: ListColumn['type'] = 'text',
  fallback: ListColumn['fallback'] = ''
): ListColumn => ({ key, type, fallback });
const listConfigs: Record<
  string,
  { key: string; columns: ListColumn[]; initial: Record<string, unknown> }
> = {
  shadow: {
    key: 'layers',
    columns: [
      column('x', 'number', 0),
      column('y', 'number', 8),
      column('blur', 'number', 24),
      column('spread', 'number', 0),
      column('color', 'text', '#00000033'),
      column('inset', 'checkbox', false),
    ],
    initial: { x: 0, y: 8, blur: 24, spread: 0, color: '#00000033', inset: false },
  },
  animation: {
    key: 'keyframes',
    columns: [
      column('offset', 'number', 100),
      column('transform', 'text', 'scale(1)'),
      column('opacity', 'number', 1),
    ],
    initial: { offset: 100, transform: 'scale(1)', opacity: 1 },
  },
  'mock-data': {
    key: 'schema',
    columns: [
      column('name', 'text', 'field'),
      column('type', 'text', 'string'),
      column('min', 'number', 0),
      column('max', 'number', 100),
    ],
    initial: { name: 'field', type: 'string' },
  },
  flex: {
    key: 'items',
    columns: [
      column('grow', 'number', 0),
      column('shrink', 'number', 1),
      column('basis', 'text', '80px'),
      column('order', 'number', 0),
      column('alignSelf', 'text', 'auto'),
    ],
    initial: { grow: 0, shrink: 1, basis: '80px', order: 0 },
  },
};
function parseList(raw: unknown): Record<string, unknown>[] | undefined {
  try {
    const v: unknown = JSON.parse(String(raw));
    return Array.isArray(v) &&
      v.every((row) => row && typeof row === 'object' && !Array.isArray(row))
      ? v
      : undefined;
  } catch {
    return undefined;
  }
}
export default function VisualControls({ id, params, onChange, t, input, onInput }: Props) {
  const [anchor, setAnchor] = useState<number>();
  const [selectedItem, setSelectedItem] = useState(0);
  const [linked, setLinked] = useState(false);
  const [pickerError, setPickerError] = useState(false);
  const [keyBits, setKeyBits] = useState('256');
  const update = (key: string, value: string | boolean) => onChange({ ...params, [key]: value });
  const config = listConfigs[id];
  const list = config ? parseList(params[config.key]) : undefined;
  const placement = id === 'grid' ? parseList(params.placement) : undefined;
  const pick = async () => {
    try {
      const api = window as unknown as {
        EyeDropper?: new () => { open: () => Promise<{ sRGBHex: string }> };
      };
      if (!api.EyeDropper) return;
      const result = await new api.EyeDropper().open();
      onInput(result.sRGBHex);
    } catch {
      setPickerError(true);
    }
  };
  if (!config && !['color', 'gradient', 'radius', 'grid', 'cron', 'text-batch', 'aes'].includes(id))
    return null;
  return (
    <section
      className="space-y-4 rounded-panel border border-border bg-surface p-4"
      aria-label={t('common.visualControls')}
    >
      <h2 className="text-xs font-semibold text-secondary">{t('common.visualControls')}</h2>
      {id === 'aes' && (
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-xs">
            <span className="mb-1 block text-secondary">{t('fields.keyBits')}</span>
            <Select value={keyBits} onChange={(e) => setKeyBits(e.target.value)}>
              {['128', '192', '256'].map((bits) => (
                <option key={bits} value={bits}>
                  {bits} bit
                </option>
              ))}
            </Select>
          </label>
          <Button
            onClick={() => {
              if (!crypto?.getRandomValues) return;
              update(
                'key',
                encodeBytes(
                  crypto.getRandomValues(new Uint8Array(Number(keyBits) / 8)),
                  String(params.keyEncoding)
                )
              );
            }}
          >
            {t('common.generateKey')}
          </Button>
        </div>
      )}
      {id === 'animation' && (
        <div className="flex flex-wrap gap-2">
          {[
            {
              key: 'fade',
              frames: [
                { offset: 0, opacity: 0 },
                { offset: 100, opacity: 1 },
              ],
            },
            {
              key: 'slide',
              frames: [
                { offset: 0, transform: 'translateX(-60px)', opacity: 0.5 },
                { offset: 100, transform: 'translateX(60px)', opacity: 1 },
              ],
            },
            {
              key: 'pulse',
              frames: [
                { offset: 0, transform: 'scale(0.8)', opacity: 0.6 },
                { offset: 100, transform: 'scale(1.15)', opacity: 1 },
              ],
            },
          ].map((preset) => (
            <Button
              key={preset.key}
              onClick={() => update('keyframes', JSON.stringify(preset.frames))}
            >
              {t(`presets.${preset.key}`)}
            </Button>
          ))}
        </div>
      )}
      {id === 'color' && (
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex-1">
            <span className="mb-1 block text-xs text-secondary">{t('common.input')}</span>
            <input
              className={controlClass}
              value={input}
              onChange={(e) => onInput(e.target.value)}
            />
          </label>
          <input
            aria-label={t('fields.color')}
            type="color"
            value={/^#[\da-f]{6}$/i.test(input) ? input : '#0066cc'}
            className="h-9 w-12 cursor-pointer rounded-lg border border-border bg-transparent"
            onChange={(e) => onInput(e.target.value)}
          />
          {'EyeDropper' in window && (
            <Button
              onClick={() => {
                void pick();
              }}
            >
              <Pipette size={15} />
              {t('common.pickColor')}
            </Button>
          )}
          {pickerError && (
            <span className="text-xs text-secondary">{t('common.pickerCancelled')}</span>
          )}
        </div>
      )}
      {id === 'gradient' && (
        <>
          <div className="flex flex-wrap gap-2">
            {[
              ['#0066cc 0%, #8b5cf6 55%, #ec4899 100%', 'gradientOcean'],
              ['#fb923c 0%, #ec4899 100%', 'gradientSunset'],
              ['#10b981 0%, #06b6d4 100%', 'gradientForest'],
            ].map(([stops, name]) => (
              <Button key={name} onClick={() => update('stops', stops)}>
                {t(`common.${name}`)}
              </Button>
            ))}
          </div>
          <div className="space-y-2">
            {String(params.stops)
              .split(',')
              .map((stop, index, stops) => {
                const match = /^(.*?)\s+(-?\d+(?:\.\d+)?)%$/.exec(stop.trim());
                if (!match) return null;
                const change = (color: string, position: string) =>
                  update(
                    'stops',
                    stops.map((s, i) => (i === index ? `${color} ${position}%` : s)).join(', ')
                  );
                return (
                  <div key={index} className="flex flex-wrap items-center gap-2">
                    <input
                      className={`${controlClass} max-w-40`}
                      aria-label={t('fields.color')}
                      value={match[1]}
                      onChange={(e) => change(e.target.value, match[2])}
                    />
                    <input
                      aria-label={t('fields.position')}
                      type="range"
                      min="0"
                      max="100"
                      value={Number(match[2])}
                      className="min-w-24 flex-1 accent-accent"
                      onChange={(e) => change(match[1], e.target.value)}
                    />
                    <span className="w-10 text-xs text-secondary">{match[2]}%</span>
                    <button
                      aria-label={t('common.remove')}
                      disabled={stops.length <= 2}
                      onClick={() =>
                        update('stops', stops.filter((_, i) => i !== index).join(', '))
                      }
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                );
              })}
          </div>
          <Button onClick={() => update('stops', String(params.stops) + ', #ffffff 100%')}>
            <Plus size={14} />
            {t('common.add')}
          </Button>
        </>
      )}
      {['gradient', 'radius', 'grid', 'flex', 'animation'].includes(id) && (
        <div className="grid gap-4 sm:grid-cols-2">
          {(id === 'gradient'
            ? [['angle', 0, 360, 1]]
            : id === 'radius'
              ? [
                  ['width', 20, 800, 1],
                  ['height', 20, 600, 1],
                ]
              : id === 'animation'
                ? [
                    ['duration', 0.1, 10, 0.1],
                    ['delay', 0, 5, 0.1],
                  ]
                : [['gap', 0, 100, 1]]
          ).map(([key, min, max, step]) => (
            <label key={String(key)}>
              <span className="mb-1 block text-xs text-secondary">
                {t(`fields.${key}`)}: {params[String(key)]}
              </span>
              <input
                type="range"
                className="w-full accent-accent"
                min={Number(min)}
                max={Number(max)}
                step={Number(step)}
                value={Number(params[String(key)])}
                onChange={(e) => update(String(key), e.target.value)}
              />
            </label>
          ))}
        </div>
      )}
      {id === 'radius' && (
        <>
          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              className="accent-accent"
              checked={linked}
              onChange={(e) => setLinked(e.target.checked)}
            />
            {t('common.linkCorners')}
          </label>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {['topLeft', 'topRight', 'bottomRight', 'bottomLeft'].map((corner, index) => {
              const values = String(params.corners).trim().split(/\s+/);
              const v = values[index] ?? values[0] ?? '0';
              return (
                <label key={corner}>
                  <span className="mb-1 block text-xs text-secondary">{t(`common.${corner}`)}</span>
                  <input
                    className={controlClass}
                    type="number"
                    min="0"
                    max="1000"
                    value={v}
                    onChange={(e) => {
                      const next = Array.from({ length: 4 }, (_, i) =>
                        linked || i === index ? e.target.value : (values[i] ?? values[0] ?? '0')
                      );
                      update('corners', next.join(' '));
                    }}
                  />
                </label>
              );
            })}
          </div>
        </>
      )}
      {config && list && (
        <>
          <div className="space-y-3">
            {list.map((row, index) => (
              <div
                key={index}
                className="flex flex-wrap items-end gap-3 rounded-lg bg-muted/60 p-3"
              >
                {config.columns.map((col) => (
                  <label key={col.key} className="min-w-16 flex-1">
                    <span className="mb-1 block text-[11px] text-secondary">
                      {t(`fields.${col.key}`)}
                    </span>
                    {col.type === 'checkbox' ? (
                      <input
                        className="size-5 accent-accent"
                        type="checkbox"
                        checked={Boolean(row[col.key])}
                        onChange={(e) =>
                          update(
                            config.key,
                            JSON.stringify(
                              list.map((item, i) =>
                                i === index ? { ...item, [col.key]: e.target.checked } : item
                              )
                            )
                          )
                        }
                      />
                    ) : (
                      <input
                        className={controlClass}
                        type={col.type}
                        step="any"
                        value={String(row[col.key] ?? col.fallback)}
                        onChange={(e) =>
                          update(
                            config.key,
                            JSON.stringify(
                              list.map((item, i) =>
                                i === index
                                  ? {
                                      ...item,
                                      [col.key]:
                                        col.type === 'number'
                                          ? Number(e.target.value)
                                          : e.target.value,
                                    }
                                  : item
                              )
                            )
                          )
                        }
                      />
                    )}
                  </label>
                ))}
                <button
                  aria-label={t('common.remove')}
                  className="p-2 text-secondary"
                  disabled={list.length <= 1}
                  onClick={() =>
                    update(config.key, JSON.stringify(list.filter((_, i) => i !== index)))
                  }
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
          <Button
            onClick={() =>
              update(
                config.key,
                JSON.stringify([
                  ...list,
                  {
                    ...config.initial,
                    ...(id === 'mock-data' ? { name: `field${list.length + 1}` } : {}),
                  },
                ])
              )
            }
          >
            <Plus size={14} />
            {t('common.add')}
          </Button>
        </>
      )}
      {id === 'grid' && placement && (
        <>
          <p className="text-xs text-secondary">{t('common.gridSelection')}</p>
          <label className="flex items-center gap-3 text-xs">
            {t('common.selectedItem')}
            <Select
              wrapperClassName="w-28 shrink-0"
              value={selectedItem}
              onChange={(e) => setSelectedItem(Number(e.target.value))}
            >
              {placement.map((_, i) => (
                <option key={i} value={i}>
                  {i + 1}
                </option>
              ))}
            </Select>
          </label>
          <div className="grid max-w-80 grid-cols-3 gap-2">
            {Array.from({ length: 9 }, (_, i) => (
              <button
                key={i}
                aria-label={`${t('common.gridCell')} ${Math.floor(i / 3) + 1},${(i % 3) + 1}`}
                aria-pressed={anchor === i}
                className={`h-12 rounded-lg border text-xs ${anchor === i ? 'border-accent bg-accent-subtle text-accent' : 'border-border bg-muted text-secondary'}`}
                onClick={() => {
                  if (anchor === undefined) {
                    setAnchor(i);
                    return;
                  }
                  const row1 = Math.min(Math.floor(anchor / 3), Math.floor(i / 3)) + 1;
                  const row2 = Math.max(Math.floor(anchor / 3), Math.floor(i / 3)) + 2;
                  const col1 = Math.min(anchor % 3, i % 3) + 1;
                  const col2 = Math.max(anchor % 3, i % 3) + 2;
                  onChange({
                    ...params,
                    columns: 'repeat(3, 1fr)',
                    rows: 'repeat(3, 80px)',
                    placement: JSON.stringify(
                      placement.map((item, index) =>
                        index === selectedItem
                          ? { ...item, column: `${col1} / ${col2}`, row: `${row1} / ${row2}` }
                          : item
                      )
                    ),
                  });
                  setAnchor(undefined);
                }}
              >
                {Math.floor(i / 3) + 1} / {(i % 3) + 1}
              </button>
            ))}
          </div>
        </>
      )}
      {id === 'cron' && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {[
            ...(params.seconds ? ['second'] : []),
            'minute',
            'hour',
            'dayOfMonth',
            'month',
            'dayOfWeek',
          ].map((key, index, keys) => {
            const parts = input.trim().split(/\s+/);
            return (
              <label key={key}>
                <span className="mb-1 block text-xs text-secondary">{t(`fields.${key}`)}</span>
                <input
                  className={controlClass}
                  value={parts.length === keys.length ? parts[index] : '*'}
                  onChange={(e) =>
                    onInput(
                      keys
                        .map((_, i) =>
                          i === index
                            ? e.target.value
                            : parts.length === keys.length
                              ? parts[i]
                              : '*'
                        )
                        .join(' ')
                    )
                  }
                />
              </label>
            );
          })}
        </div>
      )}
      {id === 'text-batch' && (
        <>
          <div className="flex flex-wrap gap-2">
            {['trim', 'empty', 'unique', 'sort', 'reverse', 'prefix', 'suffix'].map((step) => (
              <Button
                key={step}
                onClick={() =>
                  update('steps', [String(params.steps), step].filter(Boolean).join(','))
                }
              >
                {t(`steps.${step}`)}
                <Plus size={12} />
              </Button>
            ))}
          </div>
          <div className="space-y-1">
            {String(params.steps)
              .split(',')
              .filter(Boolean)
              .map((step, index, steps) => (
                <div
                  className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-xs"
                  key={index}
                >
                  <span className="text-secondary">{index + 1}.</span>
                  <span className="flex-1">{t(`steps.${step.trim()}`)}</span>
                  {[-1, 1].map((delta) => (
                    <button
                      key={delta}
                      aria-label={t(delta === -1 ? 'common.moveUp' : 'common.moveDown')}
                      disabled={index + delta < 0 || index + delta >= steps.length}
                      onClick={() => {
                        const next = [...steps];
                        [next[index], next[index + delta]] = [next[index + delta], next[index]];
                        update('steps', next.join(','));
                      }}
                    >
                      {delta === -1 ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
                    </button>
                  ))}
                  <button
                    aria-label={t('common.remove')}
                    onClick={() => update('steps', steps.filter((_, i) => i !== index).join(','))}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
          </div>
        </>
      )}
    </section>
  );
}
