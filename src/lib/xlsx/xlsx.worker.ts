import { read, utils, SSF, type CellObject, type WorkBook, type WorkSheet } from 'xlsx';

import type { SheetInfo, WorkbookRequest, WorkbookResponse } from './protocol';

let workbook: WorkBook | undefined;

const pad = (value: number, length = 2) => String(value).padStart(length, '0');

function dateText(serial: number) {
  const parts = SSF.parse_date_code(serial);
  if (!parts) return String(serial);
  const date = `${pad(parts.y, 4)}-${pad(parts.m)}-${pad(parts.d)}`;
  if (serial < 1) return `${pad(parts.H)}:${pad(parts.M)}:${pad(Math.floor(parts.S))}`;
  if (parts.H || parts.M || parts.S) return `${date} ${pad(parts.H)}:${pad(parts.M)}:${pad(Math.floor(parts.S))}`;
  return date;
}

function cellText(cell: CellObject | undefined) {
  if (!cell || cell.v === undefined || cell.v === null) return '';
  switch (cell.t) {
    case 'n': {
      const format = typeof cell.z === 'string' ? cell.z : '';
      if (format && SSF.is_date(format)) return dateText(cell.v as number);
      if (/^0{2,}$/.test(format) && cell.w) return cell.w;
      return String(cell.v);
    }
    case 'b':
      return cell.v ? 'true' : 'false';
    case 'd':
      return (cell.v as Date).toISOString().slice(0, 10);
    case 'e':
    case 'z':
      return '';
    default:
      return String(cell.v);
  }
}

function csvField(text: string) {
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function sheetRows(sheet: WorkSheet) {
  const data = (sheet['!data'] ?? []) as (CellObject | undefined)[][];
  const range = sheet['!ref'] ? utils.decode_range(sheet['!ref']) : undefined;
  if (!range) return [];
  const lines: string[] = [];
  for (let r = range.s.r; r <= range.e.r; r++) {
    const row = data[r] ?? [];
    const fields: string[] = [];
    let filled = false;
    for (let c = range.s.c; c <= range.e.c; c++) {
      const text = cellText(row[c]);
      if (text !== '') filled = true;
      fields.push(csvField(text));
    }
    if (filled) lines.push(fields.join(','));
  }
  return lines;
}

function sheetInfo(book: WorkBook): SheetInfo[] {
  return book.SheetNames.map((name) => ({ name, rows: Math.max(sheetRows(book.Sheets[name]).length - 1, 0) }));
}

function handle(request: WorkbookRequest): WorkbookResponse {
  if (request.kind === 'open') {
    workbook = read(request.buffer, { type: 'array', dense: true, cellNF: true, cellText: true });
    return { id: request.id, ok: true, sheets: sheetInfo(workbook) };
  }
  const sheet = workbook?.Sheets[request.sheet];
  if (!sheet) return { id: request.id, ok: false, message: `Sheet "${request.sheet}" was not found.` };
  const csv = new TextEncoder().encode(sheetRows(sheet).join('\n'));
  return { id: request.id, ok: true, csv };
}

self.addEventListener('message', (event: MessageEvent<WorkbookRequest>) => {
  let response: WorkbookResponse;
  try {
    response = handle(event.data);
  } catch (error) {
    response = { id: event.data.id, ok: false, message: error instanceof Error ? error.message : String(error) };
  }
  const transfer = response.ok && response.csv ? [response.csv.buffer] : [];
  (self as unknown as Worker).postMessage(response, transfer);
});
