import { expect, it } from 'vitest';
import { writeFile } from 'node:fs/promises';
import { createSHA256 } from 'hash-wasm';
import { transform } from './transform';
import { defaults } from './schema';
it('measures 1/5 MiB text and a 100 MiB streaming hash', async () => {
  const metrics: Record<string, number> = {};
  for (const size of [1024 * 1024, 5 * 1024 * 1024]) {
    const input = 'a\n'.repeat(size / 2);
    const start = performance.now();
    const result = await transform('text-batch', input, '', defaults('text-batch'));
    expect(result.text).toBe('a');
    metrics[`text${size / 1024 / 1024}MiB`] = performance.now() - start;
    console.info(`Text ${size / 1024 / 1024} MiB: ${(performance.now() - start).toFixed(1)} ms`);
  }
  const hash = await createSHA256();
  hash.init();
  const block = new Uint8Array(1024 * 1024);
  const start = performance.now();
  for (let i = 0; i < 100; i++) hash.update(block);
  expect(hash.digest('hex')).toHaveLength(64);
  metrics.hash100MiB = performance.now() - start;
  if (process.env.DEVKIT_BENCHMARK_REPORT)
    await writeFile(
      process.env.DEVKIT_BENCHMARK_REPORT,
      JSON.stringify(
        { platform: process.platform, arch: process.arch, node: process.version, metrics },
        null,
        2
      )
    );
  console.info(`SHA-256 100 MiB / 1 MiB chunks: ${(performance.now() - start).toFixed(1)} ms`);
}, 15000);
