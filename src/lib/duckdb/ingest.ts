import { ConverterError, toConverterError } from '../errors';
import type { Engine } from './client';
import { RAW_TABLE, literal } from './sql';

export const INPUT_FILE = 'input.csv';

export interface Ingested {
  rowCount: number;
  columns: string[];
}

const readCsv = (encoding?: string) =>
  `CREATE OR REPLACE TABLE ${RAW_TABLE} AS SELECT * FROM read_csv(${literal(INPUT_FILE)}, all_varchar = true, header = true, null_padding = true${
    encoding ? `, encoding = ${literal(encoding)}` : ''
  })`;

export async function ingest(engine: Engine): Promise<Ingested> {
  try {
    await engine.run(readCsv());
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (!/utf-?8|unicode|encoding/i.test(message)) {
      throw toConverterError(error, 'This file could not be read as a table.');
    }
    try {
      await engine.run(readCsv('latin-1'));
    } catch (retryError) {
      throw toConverterError(retryError, 'This file could not be read as a table.');
    }
  }

  const described = await engine.rows(`DESCRIBE ${RAW_TABLE}`);
  const columns = described.map((row) => String(row.column_name));
  const [count] = await engine.rows(`SELECT count(*) AS n FROM ${RAW_TABLE}`);
  const rowCount = Number(count.n);

  if (columns.length === 0) throw new ConverterError('No columns were found in this file.');
  if (rowCount === 0) {
    throw new ConverterError('This file has a header but no data rows.', 'Add at least one row below the header.');
  }
  return { rowCount, columns };
}
