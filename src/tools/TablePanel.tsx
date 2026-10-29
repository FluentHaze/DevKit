import { Button, controlClass, type Translate } from '@/components/ui';

export default function TablePanel({
  input,
  onChange,
  t,
}: {
  input: string;
  onChange: (value: string) => void;
  t: Translate;
}) {
  let rows: Record<string, unknown>[] = [];
  try {
    const v: unknown = JSON.parse(input);
    if (
      Array.isArray(v) &&
      v.length <= 100 &&
      v.every((r) => r && typeof r === 'object' && !Array.isArray(r))
    )
      rows = v;
  } catch {
    /* Source editor may contain unfinished JSON. */
  }
  const keys = [...new Set(rows.flatMap(Object.keys))];
  const update = (next: Record<string, unknown>[]) => onChange(JSON.stringify(next, null, 2));
  return (
    <section className="space-y-3 rounded-panel border border-border bg-surface p-4">
      <div className="flex flex-wrap gap-2">
        <Button
          onClick={() =>
            update([
              ...rows,
              Object.fromEntries((keys.length ? keys : ['name', 'value']).map((k) => [k, ''])),
            ])
          }
          disabled={rows.length >= 100}
        >
          {t('workbench.addRow')}
        </Button>
        <Button
          onClick={() => {
            let name = 'column';
            let i = 1;
            while (keys.includes(name)) name = `column${i++}`;
            update((rows.length ? rows : [{}]).map((row) => ({ ...row, [name]: '' })));
          }}
        >
          {t('workbench.addColumn')}
        </Button>
      </div>
      <div className="overflow-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              {keys.map((k) => (
                <th key={k} className="min-w-32 border border-border p-2 text-start">
                  {k}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i}>
                {keys.map((k) => (
                  <td key={k} className="border border-border p-1">
                    <input
                      aria-label={`${k} ${i + 1}`}
                      className={controlClass}
                      value={
                        typeof row[k] === 'object' ? JSON.stringify(row[k]) : String(row[k] ?? '')
                      }
                      onChange={(e) =>
                        update(rows.map((r, at) => (at === i ? { ...r, [k]: e.target.value } : r)))
                      }
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
