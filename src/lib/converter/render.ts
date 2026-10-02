import { ConverterError } from '../errors';
import { formatBytes, formatCount, formatRatio } from '../format';
import type { PreviewRow } from '../duckdb/preview';
import { COLUMN_TYPES, TYPE_LABELS } from '../duckdb/sql';
import type { Column, Source } from './state';

const one = <T extends HTMLElement>(selector: string) => document.querySelector<T>(selector);

export function setStatus(text: string | null) {
  const status = one('[data-status]');
  if (!status) return;
  status.hidden = text === null;
  const label = status.querySelector('[data-status-text]');
  if (label) label.textContent = text ?? '';
}

export function setBusy(busy: boolean) {
  document.querySelectorAll<HTMLButtonElement | HTMLSelectElement>('[data-busy-lock]').forEach((el) => {
    el.disabled = busy;
  });
  one('[data-converter]')?.toggleAttribute('data-busy', busy);
}

export function showAlert(error: unknown) {
  const alert = one('[data-alert]');
  if (!alert) return;
  const known = error instanceof ConverterError;
  const title = alert.querySelector('[data-alert-title]');
  const detail = alert.querySelector<HTMLElement>('[data-alert-detail]');
  if (title) title.textContent = known ? error.message : 'Something went wrong.';
  if (detail) {
    const text = known ? error.detail : error instanceof Error ? error.message : String(error);
    detail.textContent = text ?? '';
    detail.hidden = !text;
  }
  alert.hidden = false;
  alert.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

export function clearAlert() {
  const alert = one('[data-alert]');
  if (alert) alert.hidden = true;
}

export function showWorkspace(visible: boolean) {
  const workspace = one('[data-workspace]');
  if (workspace) workspace.hidden = !visible;
}

export function renderSource(source: Source) {
  const name = one('[data-file-name]');
  if (name) name.textContent = source.name;
  const meta = one('[data-file-meta]');
  if (meta) meta.textContent = `${source.kind.toUpperCase()} · ${formatBytes(source.size)}`;

  const picker = one('[data-sheet-picker]');
  const select = one<HTMLSelectElement>('[data-sheet-select]');
  if (!picker || !select) return;
  picker.hidden = source.sheets.length < 2;
  select.replaceChildren(
    ...source.sheets.map((sheet) => {
      const option = document.createElement('option');
      option.value = sheet.name;
      option.textContent = sheet.rows === 0 ? `${sheet.name} (empty)` : sheet.name;
      option.disabled = sheet.rows === 0;
      option.selected = sheet.name === source.sheet;
      return option;
    }),
  );
}

export function setStat(key: string, value: string, note = '') {
  const tile = one(`[data-stat="${key}"]`);
  if (!tile) return;
  const valueEl = tile.querySelector('[data-stat-value]');
  const noteEl = tile.querySelector<HTMLElement>('[data-stat-note]');
  if (valueEl) valueEl.textContent = value;
  if (noteEl) {
    noteEl.textContent = note;
    noteEl.hidden = !note;
  }
}

export function renderStats(source: Source, rowCount: number, columnCount: number) {
  setStat('rows', formatCount(rowCount));
  setStat('columns', formatCount(columnCount));
  setStat('original', formatBytes(source.size), source.kind.toUpperCase());
  clearResult();
}

export function clearResult() {
  setStat('parquet', '—');
  const result = one('[data-result]');
  if (result) result.hidden = true;
}

export function renderResult(name: string, originalSize: number, parquetSize: number, rowCount: number) {
  setStat('parquet', formatBytes(parquetSize), formatRatio(originalSize, parquetSize));
  const result = one('[data-result]');
  if (!result) return;
  result.textContent = `Saved ${name}: ${formatCount(rowCount)} rows, ${formatBytes(parquetSize)} (was ${formatBytes(originalSize)}).`;
  result.hidden = false;
}

function cell(tag: 'th' | 'td', text: string | null) {
  const el = document.createElement(tag);
  if (text === null) {
    el.textContent = 'empty';
    el.dataset.empty = '';
  } else {
    el.textContent = text;
    el.title = text;
  }
  return el;
}

export function renderPreview(columns: string[], rows: PreviewRow[], rowCount: number) {
  const table = one<HTMLTableElement>('[data-preview]');
  if (!table) return;

  const head = document.createElement('thead');
  const headRow = head.insertRow();
  const index = cell('th', '#');
  index.scope = 'col';
  headRow.append(index);
  columns.forEach((name) => {
    const th = cell('th', name);
    th.scope = 'col';
    headRow.append(th);
  });

  const body = document.createElement('tbody');
  rows.forEach((values, position) => {
    const row = body.insertRow();
    row.append(cell('td', String(position + 1)), ...values.map((value) => cell('td', value)));
  });

  table.replaceChildren(head, body);
  const caption = one('[data-preview-caption]');
  if (caption) {
    caption.textContent =
      rowCount > rows.length
        ? `First ${formatCount(rows.length)} of ${formatCount(rowCount)} rows, as read from the file.`
        : `All ${formatCount(rowCount)} rows, as read from the file.`;
  }
}

function issueText(column: Column) {
  if (!column.issue) return '';
  const { count, samples } = column.issue;
  const values = samples.map((sample) => `“${sample}”`).join(', ');
  const noun = count === 1 ? 'value' : 'values';
  return `${formatCount(count)} ${noun} cannot be read as ${TYPE_LABELS[column.type].toLowerCase()}: ${values}${count > samples.length ? '…' : ''}`;
}

function schemaRow(column: Column, index: number) {
  const row = document.createElement('tr');
  row.toggleAttribute('data-invalid', Boolean(column.issue));

  const name = document.createElement('td');
  name.className = 'font-mono text-xs font-medium';
  name.textContent = column.name;

  const type = document.createElement('td');
  const select = document.createElement('select');
  select.className = 'select';
  select.dataset.typeSelect = String(index);
  select.dataset.busyLock = '';
  select.setAttribute('aria-label', `Type of ${column.name}`);
  COLUMN_TYPES.forEach((option) => {
    const el = document.createElement('option');
    el.value = option;
    el.textContent = option === column.inferred ? `${TYPE_LABELS[option]} (detected)` : TYPE_LABELS[option];
    el.selected = option === column.type;
    select.append(el);
  });
  type.append(select);

  const detail = document.createElement('td');
  if (column.issue) {
    detail.className = 'text-xs text-danger';
    detail.textContent = issueText(column);
  } else {
    detail.className = 'max-w-md truncate font-mono text-xs text-muted';
    detail.textContent = column.samples.length > 0 ? column.samples.join('  ·  ') : 'no values';
  }

  row.append(name, type, detail);
  return row;
}

export function renderSchema(columns: Column[]) {
  const body = one('[data-schema-body]');
  if (!body) return;
  const focused = document.activeElement instanceof HTMLSelectElement ? document.activeElement.dataset.typeSelect : undefined;
  body.replaceChildren(...columns.map(schemaRow));
  if (focused !== undefined) body.querySelector<HTMLElement>(`[data-type-select="${focused}"]`)?.focus();

  const summary = one('[data-schema-summary]');
  if (!summary) return;
  const invalid = columns.filter((column) => column.issue).length;
  summary.textContent =
    invalid > 0
      ? `${invalid} ${invalid === 1 ? 'column needs' : 'columns need'} a different type before exporting.`
      : 'Types were detected from every value in the file. Change any that look wrong.';
  summary.classList.toggle('text-danger', invalid > 0);
}
