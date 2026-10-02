import { ConverterError } from '../errors';
import { getEngine } from '../duckdb/client';
import { exportParquet, failingColumns } from '../duckdb/export';
import { findIssue, inferTypes } from '../duckdb/infer';
import { INPUT_FILE, ingest } from '../duckdb/ingest';
import { previewRows } from '../duckdb/preview';
import { COLUMN_TYPES, type ColumnType } from '../duckdb/sql';
import { closeWorkbook, openWorkbook, sheetToCsv } from '../xlsx/client';
import { parquetName, saveFile } from './download';
import {
  clearAlert,
  clearResult,
  renderPreview,
  renderResult,
  renderSchema,
  renderSource,
  renderStats,
  setBusy,
  setStatus,
  showAlert,
  showWorkspace,
} from './render';
import { resetState, state, type Column, type SourceKind } from './state';

const SAMPLE_VALUES = 3;

function kindOf(file: File): SourceKind | undefined {
  const extension = file.name.split('.').pop()?.toLowerCase();
  if (extension === 'csv' || extension === 'tsv' || extension === 'txt') return 'csv';
  if (extension === 'xlsx') return 'xlsx';
  return undefined;
}

async function task(label: string, work: (isCurrent: () => boolean) => Promise<void>) {
  const run = ++state.run;
  const isCurrent = () => run === state.run;
  state.busy = true;
  setBusy(true);
  setStatus(label);
  clearAlert();
  try {
    await work(isCurrent);
  } catch (error) {
    if (isCurrent()) showAlert(error);
  } finally {
    if (isCurrent()) {
      state.busy = false;
      setBusy(false);
      setStatus(null);
    }
  }
}

function sampleValues(index: number) {
  const values = new Set<string>();
  for (const row of state.preview) {
    const value = row[index];
    if (value !== null && value.trim() !== '') values.add(value);
    if (values.size === SAMPLE_VALUES) break;
  }
  return [...values];
}

async function loadTable(isCurrent: () => boolean) {
  const { source } = state;
  if (!source) return;
  setStatus('Starting the engine…');
  const engine = await getEngine();
  if (source.kind === 'xlsx' && source.sheet) {
    setStatus(`Reading sheet “${source.sheet}”…`);
    await engine.registerBuffer(INPUT_FILE, await sheetToCsv(source.sheet));
  }
  setStatus('Reading rows…');
  const table = await ingest(engine);
  const preview = await previewRows(engine, table.columns);
  setStatus('Detecting column types…');
  const types = await inferTypes(engine, table.columns);
  if (!isCurrent()) return;
  state.rowCount = table.rowCount;
  state.preview = preview;
  state.columns = table.columns.map<Column>((name, index) => ({
    name,
    inferred: types[index],
    type: types[index],
    samples: sampleValues(index),
  }));
  renderSource(source);
  renderStats(source, state.rowCount, state.columns.length);
  renderSchema(state.columns);
  renderPreview(table.columns, state.preview, state.rowCount);
  showWorkspace(true);
}

function reset() {
  state.run++;
  state.busy = false;
  resetState();
  closeWorkbook();
  setBusy(false);
  setStatus(null);
  clearAlert();
  showWorkspace(false);
  const input = document.querySelector<HTMLInputElement>('[data-file-input]');
  if (input) input.value = '';
}

function loadFile(file: File) {
  return task('Reading file…', async (isCurrent) => {
    showWorkspace(false);
    resetState();
    const kind = kindOf(file);
    if (!kind) {
      throw new ConverterError('This file type is not supported.', 'Choose a .csv or .xlsx file. Old .xls files are not supported.');
    }
    if (file.size === 0) throw new ConverterError('This file is empty.');

    state.source = { name: file.name, size: file.size, kind, sheets: [] };
    if (kind === 'xlsx') {
      const sheets = await openWorkbook(file);
      const first = sheets.find((sheet) => sheet.rows > 0);
      if (!first) throw new ConverterError('This workbook has no data.', 'Every sheet is empty or has only a header row.');
      state.source.sheets = sheets;
      state.source.sheet = first.name;
    } else {
      const engine = await getEngine();
      await engine.registerFile(INPUT_FILE, file);
    }
    if (!isCurrent()) return;
    await loadTable(isCurrent);
  });
}

function selectSheet(name: string) {
  if (!state.source || state.source.sheet === name) return;
  state.source.sheet = name;
  return task('Reading sheet…', loadTable);
}

function changeType(index: number, type: ColumnType) {
  const column = state.columns[index];
  if (!column || !COLUMN_TYPES.includes(type)) return;
  column.type = type;
  clearResult();
  return task('Checking values…', async (isCurrent) => {
    const engine = await getEngine();
    const issue = await findIssue(engine, column.name, type);
    if (!isCurrent()) return;
    column.issue = issue;
    renderSchema(state.columns);
  });
}

function download() {
  const { source, columns } = state;
  if (!source || columns.length === 0) return;
  return task('Writing the Parquet file…', async (isCurrent) => {
    const engine = await getEngine();
    const failing = await failingColumns(engine, columns);
    if (failing.length > 0) {
      for (const index of failing) {
        columns[index].issue = await findIssue(engine, columns[index].name, columns[index].type);
      }
      if (isCurrent()) renderSchema(columns);
      const names = failing.map((index) => columns[index].name).join(', ');
      throw new ConverterError(
        'Some values do not fit the chosen type.',
        `Change the type of ${names} or fix those values in the source file. Nothing was exported.`,
      );
    }
    const file = await exportParquet(engine, columns);
    if (!isCurrent()) return;
    const name = parquetName(source.name, source.sheets.length > 1 ? source.sheet : undefined);
    saveFile(file.bytes, name);
    renderResult(name, source.size, file.bytes.byteLength, file.rowCount);
  });
}

async function loadSample(url: string) {
  clearAlert();
  try {
    const response = await fetch(url);
    if (!response.ok) throw new ConverterError('The sample file could not be loaded.', `HTTP ${response.status}`);
    await loadFile(new File([await response.blob()], url.split('/').pop() ?? 'sample.csv'));
  } catch (error) {
    showAlert(error);
  }
}

function warmUp() {
  getEngine().catch(() => undefined);
}

export function initConverter() {
  const root = document.querySelector<HTMLElement>('[data-converter]');
  const dropzone = root?.querySelector<HTMLElement>('[data-dropzone]');
  const input = root?.querySelector<HTMLInputElement>('[data-file-input]');
  if (!root || !dropzone || !input) return;

  let depth = 0;
  const dragging = (on: boolean) => dropzone.toggleAttribute('data-dragging', on);

  dropzone.addEventListener('dragenter', (event) => {
    event.preventDefault();
    depth++;
    dragging(true);
    warmUp();
  });
  dropzone.addEventListener('dragover', (event) => event.preventDefault());
  dropzone.addEventListener('dragleave', () => {
    depth = Math.max(depth - 1, 0);
    if (depth === 0) dragging(false);
  });
  dropzone.addEventListener('drop', (event) => {
    event.preventDefault();
    depth = 0;
    dragging(false);
    const file = event.dataTransfer?.files[0];
    if (file && !state.busy) loadFile(file);
  });
  dropzone.addEventListener('pointerenter', warmUp, { once: true });
  input.addEventListener('focus', warmUp, { once: true });
  input.addEventListener('change', () => {
    const file = input.files?.[0];
    if (file) loadFile(file);
  });

  root.addEventListener('click', (event) => {
    const target = event.target as HTMLElement;
    const sample = target.closest<HTMLElement>('[data-sample]');
    if (sample?.dataset.sample && !state.busy) loadSample(sample.dataset.sample);
    else if (target.closest('[data-reset]')) reset();
    else if (target.closest('[data-download]') && !state.busy) download();
    else if (target.closest('[data-alert-close]')) clearAlert();
  });

  root.addEventListener('change', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLSelectElement)) return;
    if (target.matches('[data-sheet-select]')) selectSheet(target.value);
    else if (target.dataset.typeSelect) changeType(Number(target.dataset.typeSelect), target.value as ColumnType);
  });
}
