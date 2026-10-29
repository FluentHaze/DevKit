import { useEffect, useState } from 'react';
import { Button, type Translate } from '@/components/ui';

export default function CountdownPanel({ instant, t }: { instant: string; t: Translate }) {
  const [now, setNow] = useState(Date.now),
    [running, setRunning] = useState(true);
  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [running]);
  const time = Date.parse(instant);
  if (!Number.isFinite(time) || !/(?:Z|[+-]\d{2}:\d{2})$/.test(instant)) return null;
  const seconds = Math.ceil((time - now) / 1000),
    abs = Math.abs(seconds);
  return (
    <section className="flex flex-wrap items-center justify-between gap-4 rounded-panel border border-border bg-surface p-5">
      <div>
        <p className="text-xs text-secondary">
          {t(seconds >= 0 ? 'workbench.remaining' : 'workbench.elapsed')}
        </p>
        <output className="font-mono text-2xl tabular-nums">
          {Math.floor(abs / 86400)}d {String(Math.floor(abs / 3600) % 24).padStart(2, '0')}:
          {String(Math.floor(abs / 60) % 60).padStart(2, '0')}:{String(abs % 60).padStart(2, '0')}
        </output>
      </div>
      <Button
        onClick={() => {
          setNow(Date.now());
          setRunning(!running);
        }}
      >
        {t(running ? 'common.pause' : 'common.play')}
      </Button>
    </section>
  );
}
