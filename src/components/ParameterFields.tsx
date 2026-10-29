import { Select } from './Select';
import { controlClass, type Translate } from './ui';
import { fields, type Params } from '@/tools/schema';

export function ParameterFields({
  id,
  params,
  onChange,
  t,
}: {
  id: string;
  params: Params;
  onChange: (key: string, value: string | boolean) => void;
  t: Translate;
}) {
  return (
    <section
      aria-label={t('common.parameters')}
      className="grid grid-cols-1 gap-4 rounded-panel border border-border bg-surface p-4 sm:grid-cols-2 xl:grid-cols-4"
    >
      {(fields[id] ?? []).map((field) =>
        field.type === 'checkbox' ? (
          <label
            key={field.key}
            className="flex min-h-11 cursor-pointer items-center gap-2 self-end rounded-lg border border-border px-3 text-[13px] hover:bg-muted"
          >
            <input
              type="checkbox"
              className="size-4 accent-accent"
              checked={Boolean(params[field.key])}
              onChange={(e) => onChange(field.key, e.target.checked)}
            />
            <span>{t(`fields.${field.key}`)}</span>
          </label>
        ) : (
          <label
            key={field.key}
            className={`min-w-0 ${field.type === 'textarea' ? 'sm:col-span-2' : ''}`}
          >
            <span className="mb-1.5 block text-xs font-medium text-secondary">
              {t(`fields.${field.key}`)}
            </span>
            {field.type === 'select' ? (
              <Select
                value={String(params[field.key])}
                aria-label={t(`fields.${field.key}`)}
                onValueChange={(value) => onChange(field.key, value)}
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
                className={`${controlClass} min-h-24 font-mono`}
                value={String(params[field.key])}
                onChange={(e) => onChange(field.key, e.target.value)}
                spellCheck={false}
              />
            ) : (
              <input
                type={field.type}
                step="any"
                className={controlClass}
                value={String(params[field.key])}
                onChange={(e) => onChange(field.key, e.target.value)}
                autoComplete="off"
              />
            )}
          </label>
        )
      )}
    </section>
  );
}
