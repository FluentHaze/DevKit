import { fail } from '@/lib/errors';
import { integer } from './workbench-utils';

export function pageNumbers(spec: string, total: number): number[] {
  const numbers = spec.trim()
    ? spec.split(',').flatMap((part) => {
        const m = /^\s*(\d+)(?:\s*-\s*(\d+))?\s*$/.exec(part);
        if (!m) fail('params');
        const first = integer(m[1], 1, total),
          last = integer(m[2] ?? m[1], first, total);
        return Array.from({ length: last - first + 1 }, (_, i) => first + i - 1);
      })
    : Array.from({ length: total }, (_, i) => i);
  if (numbers.length > 300) fail('limit');
  return numbers;
}
