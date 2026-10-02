import { PREVIEW_ROWS } from '../../config/site';
import type { Engine } from './client';
import { RAW_TABLE } from './sql';

export type PreviewRow = (string | null)[];

export async function previewRows(engine: Engine, columns: string[]): Promise<PreviewRow[]> {
  const rows = await engine.rows(`SELECT * FROM ${RAW_TABLE} LIMIT ${PREVIEW_ROWS}`);
  return rows.map((row) => columns.map((column) => (row[column] == null ? null : String(row[column]))));
}
