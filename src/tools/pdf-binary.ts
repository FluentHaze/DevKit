import { fail } from '@/lib/errors';
import { PDFDocument } from 'pdf-lib';
import { pageNumbers } from './page-ranges';
import { archive, type Artifact, type WorkResult } from './workbench-files';
import type { Params } from './schema';

export async function processPdfBinary(files: File[], p: Params): Promise<WorkResult> {
  const merged = await PDFDocument.create();
  for (const file of files) {
    const doc = await PDFDocument.load(await file.arrayBuffer());
    if (doc.getPageCount() > 300 || merged.getPageCount() + doc.getPageCount() > 500) fail('limit');
    const pages =
      p.mode === 'merge' ? doc.getPageIndices() : pageNumbers(String(p.pages), doc.getPageCount());
    for (const page of await merged.copyPages(doc, pages)) merged.addPage(page);
  }
  if (!merged.getPageCount()) fail('invalid');
  if (p.mode === 'split') {
    const artifacts: Artifact[] = [];
    for (let i = 0; i < merged.getPageCount(); i++) {
      const page = await PDFDocument.create();
      page.addPage((await page.copyPages(merged, [i]))[0]);
      artifacts.push({
        name: `page-${i + 1}.pdf`,
        bytes: await page.save(),
        mime: 'application/pdf',
      });
    }
    return archive(artifacts);
  }
  return {
    text: `${merged.getPageCount()} pages`,
    artifacts: [{ name: 'result.pdf', bytes: await merged.save(), mime: 'application/pdf' }],
  };
}
