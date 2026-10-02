import type { TypeIssue } from '../duckdb/infer';
import type { PreviewRow } from '../duckdb/preview';
import type { ColumnType } from '../duckdb/sql';
import type { SheetInfo } from '../xlsx/protocol';

export type SourceKind = 'csv' | 'xlsx';

export interface Source {
  name: string;
  size: number;
  kind: SourceKind;
  sheets: SheetInfo[];
  sheet?: string;
}

export interface Column {
  name: string;
  inferred: ColumnType;
  type: ColumnType;
  samples: string[];
  issue?: TypeIssue;
}

export interface State {
  source?: Source;
  rowCount: number;
  columns: Column[];
  preview: PreviewRow[];
  busy: boolean;
  run: number;
}

export const state: State = {
  rowCount: 0,
  columns: [],
  preview: [],
  busy: false,
  run: 0,
};

export function resetState() {
  state.source = undefined;
  state.rowCount = 0;
  state.columns = [];
  state.preview = [];
}
