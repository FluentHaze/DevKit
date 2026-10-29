import { useEffect, useState } from 'react';
import type { Result } from '@/lib/errors';
import type { Translate } from '@/components/ui';

export default function WheelPanel({
  input,
  result,
  t,
}: {
  input: string;
  result?: Result;
  t: Translate;
}) {
  const [rotation, setRotation] = useState(0);
  let choices: { name: string; weight: number }[] = [];
  try {
    const parsed: unknown = JSON.parse(input);
    if (
      Array.isArray(parsed) &&
      parsed.length <= 1000 &&
      parsed.every(
        (v) =>
          v &&
          typeof v.name === 'string' &&
          Number.isInteger(v.weight) &&
          v.weight > 0 &&
          v.weight <= 10000
      )
    )
      choices = parsed;
  } catch {
    /* Incomplete editor input. */
  }
  const total = choices.reduce((sum, v) => sum + v.weight, 0);
  const colors = ['#0066cc', '#10b981', '#8b5cf6', '#f59e0b', '#ec4899', '#0891b2'];
  let at = 0;
  const stops = choices.map((choice, i) => {
    const start = at;
    at += (choice.weight / total) * 360;
    return `${colors[i % colors.length]} ${start}deg ${at}deg`;
  });
  useEffect(() => {
    if (!result) return;
    try {
      const pick = (JSON.parse(result.text) as unknown[])[0];
      const parsed = JSON.parse(input) as { name: string; weight: number }[];
      const index = parsed.findIndex((v) => v.name === pick),
        sum = parsed.reduce((n, v) => n + v.weight, 0);
      if (index < 0 || !sum) return;
      const mid =
        ((parsed.slice(0, index).reduce((n, v) => n + v.weight, 0) + parsed[index].weight / 2) /
          sum) *
        360;
      setRotation((old) => old + 1800 + ((360 - mid - (old % 360) + 360) % 360));
    } catch {
      /* Only successful draw results animate. */
    }
  }, [result, input]);
  return (
    <section
      aria-label={t('tools.lottery.title')}
      className="rounded-panel border border-border bg-surface p-5"
    >
      <div className="relative mx-auto aspect-square w-full max-w-64">
        <span
          aria-hidden="true"
          className="absolute -top-2 left-1/2 z-10 -translate-x-1/2 border-x-8 border-t-16 border-x-transparent border-t-primary"
        />
        <div
          aria-hidden="true"
          className="size-full rounded-full border-4 border-border transition-transform duration-1000 motion-reduce:transition-none"
          style={{
            background: stops.length ? `conic-gradient(${stops.join(',')})` : 'var(--dk-muted)',
            transform: `rotate(${rotation}deg)`,
          }}
        />
        <div className="absolute inset-1/3 flex items-center justify-center rounded-full border border-border bg-surface text-xs font-semibold">
          DevKit
        </div>
      </div>
      <ul className="mt-5 flex flex-wrap justify-center gap-3 text-xs">
        {choices.slice(0, 30).map((choice, i) => (
          <li key={i} className="flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className="size-3 rounded-full"
              style={{ background: colors[i % colors.length] }}
            />
            {choice.name} · {Number(((choice.weight / total) * 100).toFixed(1))}%
          </li>
        ))}
      </ul>
    </section>
  );
}
