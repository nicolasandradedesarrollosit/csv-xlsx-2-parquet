import type { SheetInfo } from '../xlsx/protocol';

export type SourceKind = 'csv' | 'xlsx';

export interface Source {
  name: string;
  size: number;
  kind: SourceKind;
  sheets: SheetInfo[];
  sheet?: string;
}

export interface State {
  source?: Source;
  rowCount: number;
  columnNames: string[];
  busy: boolean;
  run: number;
}

export const state: State = {
  rowCount: 0,
  columnNames: [],
  busy: false,
  run: 0,
};

export function resetState() {
  state.source = undefined;
  state.rowCount = 0;
  state.columnNames = [];
}
