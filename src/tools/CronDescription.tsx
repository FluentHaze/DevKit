import { useEffect, useState } from 'react';
import type { Translate } from '@/components/ui';
import type { Locale } from '@/i18n';
export default function CronDescription({
  input,
  seconds,
  locale,
  t,
}: {
  input: string;
  seconds: boolean;
  locale: Locale;
  t: Translate;
}) {
  const [description, setDescription] = useState<{ key: string; text: string }>();
  const key = `${input}|${seconds}|${locale}`;
  useEffect(() => {
    let active = true;
    if (!input.trim()) return;
    void import('cronstrue/i18n')
      .then(({ default: cron }) => {
        if (!active) return;
        try {
          if (input.trim().split(/\s+/).length !== (seconds ? 6 : 5) || /[?LW#@]/i.test(input))
            throw Error();
          const text = cron.toString(input, {
            locale: locale === 'zh-CN' ? 'zh_CN' : 'en',
            use24HourTimeFormat: true,
            logicalAndDayFields: false,
          });
          setDescription({ key, text });
        } catch {
          setDescription({ key, text: '' });
        }
      })
      .catch(() => {
        if (active) setDescription({ key, text: '' });
      });
    return () => {
      active = false;
    };
  }, [input, seconds, locale, key]);
  if (!input.trim()) return null;
  return (
    <p className="rounded-lg border border-border bg-surface px-4 py-3 text-xs text-secondary">
      {description?.key === key ? description.text || t('errors.invalid') : t('common.running')}
    </p>
  );
}
