import type { Engine } from './client';
import { RAW_TABLE, failsExpr, ident, matchExpr, valueExpr, type ColumnType } from './sql';

const CANDIDATES = ['integer', 'decimal', 'boolean', 'date'] as const;
const ISSUE_SAMPLES = 3;

export interface TypeIssue {
  count: number;
  samples: string[];
}

export async function inferTypes(engine: Engine, columns: string[]): Promise<ColumnType[]> {
  const counts = columns.flatMap((column, index) => [
    `count(${valueExpr(column)}) AS c${index}_filled`,
    ...CANDIDATES.map((type) => `count(*) FILTER (WHERE ${matchExpr(column, type)}) AS c${index}_${type}`),
  ]);
  const [row] = await engine.rows(`SELECT ${counts.join(', ')} FROM ${RAW_TABLE}`);

  return columns.map((_, index) => {
    const filled = Number(row[`c${index}_filled`]);
    if (filled === 0) return 'text';
    return CANDIDATES.find((type) => Number(row[`c${index}_${type}`]) === filled) ?? 'text';
  });
}

export async function findIssue(engine: Engine, column: string, type: ColumnType): Promise<TypeIssue | undefined> {
  if (type === 'text') return undefined;
  const fails = failsExpr(column, type);
  const [row] = await engine.rows(`SELECT count(*) FILTER (WHERE ${fails}) AS n FROM ${RAW_TABLE}`);
  const count = Number(row.n);
  if (count === 0) return undefined;
  const samples = await engine.rows(
    `SELECT DISTINCT ${ident(column)} AS value FROM ${RAW_TABLE} WHERE ${fails} LIMIT ${ISSUE_SAMPLES}`,
  );
  return { count, samples: samples.map((sample) => String(sample.value)) };
}
