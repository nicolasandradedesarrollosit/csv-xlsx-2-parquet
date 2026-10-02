import { ConverterError } from '../errors';
import { formatBytes } from '../format';
import type { Source } from './state';

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
