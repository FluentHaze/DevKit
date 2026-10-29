import { fail } from '@/lib/errors';
import { base64 } from '@/lib/encoding';
import { parseJson } from './data';
import { record, integer, jsonResult } from './workbench-utils';
import { renameFiles } from './file-names';
import type { Params } from './schema';

import { archive, validateFiles, type Artifact, type WorkResult } from './workbench-files';

export async function processFiles(
  id: string,
  files: File[],
  input: string,
  p: Params
): Promise<WorkResult> {
  validateFiles(files);
  if (id === 'markdown-workbench') {
    if (new TextEncoder().encode(input).length > 5 * 1024 * 1024) fail('limit');
    const html = await (await import('marked')).marked.parse(input);
    return { text: html, html, extension: 'html' };
  }
  if (id === 'pdf-tools') {
    if (!files.length) fail('filesRequired');
    return (await import('./pdf-binary')).processPdfBinary(files, p);
  }
  if (id === 'file-rename') {
    if (!files.length) fail('filesRequired');
    const plan = renameFiles(
      files.map((f) => f.name),
      p
    );
    if (p.mode === 'replace' && !String(p.find)) fail('params');
    if (!p.exportFiles) return jsonResult(plan);
    return archive(
      await Promise.all(
        plan.map(async (r, i) => ({
          name: r.to,
          bytes: new Uint8Array(await files[i].arrayBuffer()),
          mime: files[i].type,
        }))
      ),
      JSON.stringify(plan, null, 2)
    );
  }
  if (id === 'file-duplicates') {
    if (!files.length) fail('filesRequired');
    const { createSHA256 } = await import('hash-wasm');
    const groups = new Map<string, string[]>();
    for (const file of files) {
      const hash = await createSHA256();
      hash.init();
      for (let at = 0; at < file.size; at += 1024 * 1024)
        hash.update(new Uint8Array(await file.slice(at, at + 1024 * 1024).arrayBuffer()));
      const digest = hash.digest();
      groups.set(digest, [...(groups.get(digest) ?? []), file.name]);
    }
    return jsonResult(
      [...groups].map(([sha256, names]) => ({ sha256, names, duplicate: names.length > 1 }))
    );
  }
  if (id === 'file-signature') {
    if (!files.length) fail('filesRequired');
    return jsonResult(
      await Promise.all(
        files.map(async (file) => {
          const bytes = new Uint8Array(await file.slice(0, 32).arrayBuffer());
          const hex = [...bytes].map((v) => v.toString(16).padStart(2, '0')).join('');
          const signatures: [string, string[]][] = [
            ['89504e470d0a1a0a', ['png']],
            ['ffd8ff', ['jpg', 'jpeg']],
            ['474946383', ['gif']],
            ['25504446', ['pdf']],
            ['504b0304', ['zip', 'xlsx', 'docx', 'pptx']],
            ['00000100', ['ico']],
            ['1f8b', ['gz']],
          ];
          let detected = signatures.find(([prefix]) => hex.startsWith(prefix))?.[1] ?? [];
          const ascii = new TextDecoder().decode(bytes);
          if (ascii.startsWith('RIFF') && ascii.slice(8, 12) === 'WEBP') detected = ['webp'];
          if (ascii.startsWith('RIFF') && ascii.slice(8, 12) === 'WAVE') detected = ['wav'];
          return {
            name: file.name,
            size: file.size,
            declaredMime: file.type,
            detected,
            extensionMatches: detected.length
              ? detected.includes(file.name.split('.').pop()?.toLowerCase() ?? '')
              : null,
            headerHex: hex,
          };
        })
      )
    );
  }
  if (id === 'image-css') {
    if (
      files.length !== 1 ||
      !/^image\/(png|jpeg|webp|gif|avif)$/.test(files[0].type) ||
      files[0].size > 5 * 1024 * 1024
    )
      fail('invalid');
    const url = `data:${files[0].type};base64,${base64(new Uint8Array(await files[0].arrayBuffer()))}`;
    return {
      text: p.mode === 'css' ? `background-image: url("${url}");` : url,
      extension: p.mode === 'css' ? 'css' : 'txt',
    };
  }
  if (id === 'spreadsheet') {
    const { default: ExcelJS } = await import('exceljs');
    let grid: unknown[][] = [];
    if (files.length) {
      for (const file of files) {
        let data: unknown[][];
        if (/\.xlsx$/i.test(file.name)) {
          const workbook = new ExcelJS.Workbook();
          await workbook.xlsx.load(await file.arrayBuffer());
          const sheet = workbook.worksheets[integer(p.sheet, 1, workbook.worksheets.length) - 1];
          if (!sheet || sheet.rowCount > 10000 || sheet.columnCount > 200) fail('limit');
          data = [];
          sheet.eachRow({ includeEmpty: true }, (row) =>
            data.push(
              Array.from({ length: sheet.columnCount }, (_, i) => {
                const cell = row.getCell(i + 1);
                return cell.type === ExcelJS.ValueType.Formula ? (cell.result ?? '') : cell.text;
              })
            )
          );
        } else {
          const { default: Papa } = await import('papaparse');
          const parsed = Papa.parse<string[]>(await file.text(), { skipEmptyLines: true });
          if (parsed.errors.length) fail('csv');
          data = parsed.data;
        }
        if (grid.length && JSON.stringify(grid[0]) !== JSON.stringify(data[0])) fail('invalid');
        grid.push(...(grid.length ? data.slice(1) : data));
      }
    } else {
      const value: unknown = parseJson(input);
      if (!Array.isArray(value)) fail('invalid');
      const data = value.map(record),
        keys = [...new Set(data.flatMap(Object.keys))];
      grid = [keys, ...data.map((row) => keys.map((k) => row[k] ?? ''))];
    }
    if (
      !grid.length ||
      !grid[0].length ||
      grid.length > 10001 ||
      grid.some((row) => row.length > 200)
    )
      fail('limit');
    const header = grid[0].map(String);
    if (new Set(header).size !== header.length) fail('duplicate');
    let data = grid.slice(1);
    if (String(p.filterColumn)) {
      const at = header.indexOf(String(p.filterColumn));
      if (at < 0) fail('params');
      data = data.filter((row) => String(row[at]).includes(String(p.filterValue)));
    }
    if (p.unique) {
      const seen = new Set<string>();
      data = data.filter((row) => {
        const key = JSON.stringify(row);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    }
    const selected = String(p.columnNames).trim()
      ? String(p.columnNames)
          .split(',')
          .map((s) => s.trim())
      : header;
    if (new Set(selected).size !== selected.length) fail('duplicate');
    const indexes = selected.map((k) => header.indexOf(k));
    if (indexes.some((i) => i < 0)) fail('params');
    if (p.format === 'json')
      return jsonResult(
        data.map((row) => Object.fromEntries(selected.map((k, i) => [k, row[indexes[i]] ?? ''])))
      );
    const safe = (v: unknown) => {
      const s = typeof v === 'object' ? JSON.stringify(v) : String(v ?? '');
      return /^[\s]*[=+\-@\t\r]/.test(s) ? `'${s}` : s;
    };
    const projected = [selected.map(safe), ...data.map((row) => indexes.map((i) => safe(row[i])))];
    const chunk = integer(p.chunk, 0, 10000) || Math.max(1, data.length);
    const artifacts: Artifact[] = [];
    for (let at = 1; at < projected.length || (at === 1 && projected.length === 1); at += chunk) {
      const group = [projected[0], ...projected.slice(at, at + chunk)];
      if (p.format === 'csv') {
        const { default: Papa } = await import('papaparse');
        artifacts.push({
          name: `sheet-${artifacts.length + 1}.csv`,
          mime: 'text/csv',
          bytes: new TextEncoder().encode(Papa.unparse(group)),
        });
      } else {
        const workbook = new ExcelJS.Workbook(),
          sheet = workbook.addWorksheet('Data');
        sheet.addRows(group);
        const bytes = new Uint8Array(await workbook.xlsx.writeBuffer());
        artifacts.push({
          name: `sheet-${artifacts.length + 1}.xlsx`,
          mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          bytes,
        });
      }
      if (artifacts.length > 100) fail('limit');
    }
    return archive(
      artifacts,
      JSON.stringify({ rows: data.length, columns: selected, files: artifacts.length }, null, 2)
    );
  }
  return fail('unsupported');
}
