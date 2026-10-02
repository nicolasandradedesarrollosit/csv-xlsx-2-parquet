import { toConverterError } from '../errors';
import type { Engine } from './client';
import { RAW_TABLE, castExpr, failsExpr, ident, literal, type ColumnType } from './sql';

let exports = 0;

export interface ExportColumn {
  name: string;
  type: ColumnType;
}

export interface ParquetFile {
  bytes: Uint8Array;
  rowCount: number;
}

export async function failingColumns(engine: Engine, columns: ExportColumn[]): Promise<number[]> {
  const typed = columns.map((column, index) => ({ column, index })).filter(({ column }) => column.type !== 'text');
  if (typed.length === 0) return [];
  const counts = typed.map(
    ({ column, index }) => `count(*) FILTER (WHERE ${failsExpr(column.name, column.type)}) AS c${index}`,
  );
  const [row] = await engine.rows(`SELECT ${counts.join(', ')} FROM ${RAW_TABLE}`);
  return typed.filter(({ index }) => Number(row[`c${index}`]) > 0).map(({ index }) => index);
}

export async function exportParquet(engine: Engine, columns: ExportColumn[]): Promise<ParquetFile> {
  const output = `output-${++exports}.parquet`;
  const select = columns.map((column) => `${castExpr(column.name, column.type)} AS ${ident(column.name)}`).join(', ');
  try {
    await engine.run(
      `COPY (SELECT ${select} FROM ${RAW_TABLE}) TO ${literal(output)} (FORMAT parquet, COMPRESSION zstd)`,
    );
    const [row] = await engine.rows(`SELECT count(*) AS n FROM read_parquet(${literal(output)})`);
    const bytes = await engine.db.copyFileToBuffer(output);
    return { bytes, rowCount: Number(row.n) };
  } catch (error) {
    throw toConverterError(error, 'The Parquet file could not be written.');
  } finally {
    await engine.db.dropFile(output).catch(() => undefined);
  }
}
