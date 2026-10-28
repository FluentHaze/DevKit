import { Temporal } from '@js-temporal/polyfill';
import { fail, type Result } from '@/lib/errors';
import type { Params } from './schema';
import { stringify } from './data';

export function parseZoned(input: string, zone: string) {
  if (!/^\d{4}-\d\d-\d\d(?:T\d\d:\d\d(?::\d\d(?:\.\d+)?)?(?:Z|[+-]\d\d:\d\d)?)?$/.test(input))
    fail('date');
  try {
    if (/(?:Z|[+-]\d\d:\d\d)$/.test(input))
      return Temporal.Instant.from(input).toZonedDateTimeISO(zone);
    return Temporal.PlainDateTime.from(
      input.includes('T') ? input : `${input}T00:00:00`
    ).toZonedDateTime(zone, { disambiguation: 'reject' });
  } catch {
    return fail('date');
  }
}
export async function transformTime(id: string, input: string, p: Params): Promise<Result> {
  try {
    if (id === 'timestamp') {
      const text = input
        .split(/\r?\n/)
        .filter((x) => x.trim())
        .map((line) => {
          const s = line.trim();
          let date: Date;
          let unit: string;
          if (/^-?\d+(?:\.\d+)?$/.test(s)) {
            const value = Number(s);
            unit = p.unit === 'auto' ? (Math.abs(value) >= 1e11 ? 'ms' : 's') : String(p.unit);
            date = new Date(unit === 's' ? value * 1000 : value);
          } else {
            if (!/^\d{4}-\d\d-\d\dT.*(?:Z|[+-]\d\d:\d\d)$/.test(s)) fail('date');
            date = new Date(s);
            unit = 'ISO';
          }
          if (!Number.isFinite(date.getTime())) fail('date');
          return {
            input: s,
            inferredUnit: unit,
            seconds: date.getTime() / 1000,
            milliseconds: date.getTime(),
            utc: date.toISOString(),
            local: date.toString(),
          };
        });
      return { text: stringify(text), extension: 'json' };
    }
    if (id === 'timezone') {
      const date = parseZoned(input.trim(), String(p.fromZone));
      return {
        text: stringify({
          source: date.toString(),
          target: date.withTimeZone(String(p.toZone)).toString(),
          utc: date.toInstant().toString(),
        }),
        extension: 'json',
      };
    }
    if (id === 'date-calculator') {
      const amount = Number(p.amount);
      if (!Number.isFinite(amount)) fail('params');
      if (p.mode === 'convert' && !Number.isFinite(Number(input))) fail('params');
      if (p.mode === 'convert')
        return {
          text: stringify({
            seconds: Number(input),
            minutes: Number(input) / 60,
            hours: Number(input) / 3600,
            days24h: Number(input) / 86400,
          }),
        };
      const start = parseZoned(input.trim(), String(p.fromZone));
      if (p.mode === 'difference') {
        const end = parseZoned(String(p.endDate), String(p.fromZone));
        const seconds = (end.epochMilliseconds - start.epochMilliseconds) / 1000;
        return {
          text: stringify({
            seconds,
            minutes: seconds / 60,
            hours: seconds / 3600,
            days24h: seconds / 86400,
          }),
        };
      }
      if (p.mode === 'calendar' && !Number.isInteger(amount)) fail('params');
      const end = start.add(
        p.mode === 'calendar' ? { days: amount } : { milliseconds: amount * 1000 }
      );
      return {
        text: stringify({
          start: start.toString(),
          end: end.toString(),
          elapsedSeconds: (end.epochMilliseconds - start.epochMilliseconds) / 1000,
        }),
      };
    }
    const parts = input.trim().split(/\s+/);
    if (parts.length !== (p.seconds ? 6 : 5) || /[?LW#@]/i.test(input)) fail('unsupported');
    const { CronExpressionParser } = await import('cron-parser');
    const interval = CronExpressionParser.parse(input, {
      tz: String(p.toZone),
      currentDate: new Date(),
    });
    const dates = Array.from({ length: 10 }, () => {
      const date = interval.next().toDate();
      return {
        utc: date.toISOString(),
        zoned: Temporal.Instant.fromEpochMilliseconds(date.getTime())
          .toZonedDateTimeISO(String(p.toZone))
          .toString(),
      };
    });
    return {
      text: stringify({ expression: input, timezone: p.toZone, next: dates }),
      extension: 'json',
    };
  } catch (error) {
    if (error instanceof Error && ['date', 'params', 'unsupported'].includes(error.message))
      throw error;
    return fail(id === 'cron' ? 'invalid' : 'date');
  }
}
