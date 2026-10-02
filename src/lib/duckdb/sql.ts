export const COLUMN_TYPES = ['text', 'integer', 'decimal', 'boolean', 'date'] as const;
export type ColumnType = (typeof COLUMN_TYPES)[number];

export const TYPE_LABELS: Record<ColumnType, string> = {
  text: 'Text',
  integer: 'Integer',
  decimal: 'Decimal',
  boolean: 'Boolean',
  date: 'Date',
};

export const RAW_TABLE = 'raw';

const INTEGER_PATTERN = '-?(0|[1-9][0-9]*)';
const DECIMAL_PATTERN =
  '-?((0|[1-9][0-9]*)(\\.[0-9]+)?([eE][-+]?[0-9]+)?|(0|[1-9][0-9]*|[1-9][0-9]{0,2}(\\.[0-9]{3})+),[0-9]+)';
const DATE_FORMATS = ['%d/%m/%Y', '%Y-%m-%d', '%d-%m-%Y', '%d.%m.%Y', '%Y/%m/%d', '%Y-%m-%d %H:%M:%S', '%d/%m/%Y %H:%M:%S'];
const TRUE_WORDS = ['true', 'yes', 'y', 't', 'si', 'sí', '1'];
const FALSE_WORDS = ['false', 'no', 'n', 'f', '0'];
const STRICT_BOOLEAN_WORDS = ['true', 'false', 'yes', 'no'];

export function ident(name: string) {
  return `"${name.replaceAll('"', '""')}"`;
}

export function literal(value: string) {
  return `'${value.replaceAll("'", "''")}'`;
}

const list = (values: string[]) => values.map(literal).join(', ');

export function valueExpr(column: string) {
  return `NULLIF(trim(${ident(column)}), '')`;
}

export function castExpr(column: string, type: ColumnType) {
  const value = valueExpr(column);
  switch (type) {
    case 'text':
      return `NULLIF(${ident(column)}, '')`;
    case 'integer':
      return `TRY_CAST(${value} AS BIGINT)`;
    case 'decimal':
      return `TRY_CAST(CASE WHEN contains(${value}, ',') THEN replace(replace(${value}, '.', ''), ',', '.') ELSE ${value} END AS DOUBLE)`;
    case 'boolean':
      return `CASE WHEN lower(${value}) IN (${list(TRUE_WORDS)}) THEN true WHEN lower(${value}) IN (${list(FALSE_WORDS)}) THEN false END`;
    case 'date':
      return `CAST(try_strptime(${value}, [${list(DATE_FORMATS)}]) AS DATE)`;
  }
}

export function matchExpr(column: string, type: Exclude<ColumnType, 'text'>) {
  const value = valueExpr(column);
  switch (type) {
    case 'integer':
      return `regexp_full_match(${value}, ${literal(INTEGER_PATTERN)}) AND ${castExpr(column, 'integer')} IS NOT NULL`;
    case 'decimal':
      return `regexp_full_match(${value}, ${literal(DECIMAL_PATTERN)}) AND ${castExpr(column, 'decimal')} IS NOT NULL`;
    case 'boolean':
      return `lower(${value}) IN (${list(STRICT_BOOLEAN_WORDS)})`;
    case 'date':
      return `${castExpr(column, 'date')} IS NOT NULL`;
  }
}

export function failsExpr(column: string, type: ColumnType) {
  return `${valueExpr(column)} IS NOT NULL AND ${castExpr(column, type)} IS NULL`;
}
