export const STEPS = [
  {
    title: 'Drop a file',
    body: 'Pick a CSV or an Excel workbook. If it has several sheets, choose the one to convert.',
  },
  {
    title: 'Review the types',
    body: 'Every column gets a detected type: text, integer, decimal, boolean or date. Change any that look wrong.',
  },
  {
    title: 'Download Parquet',
    body: 'Get a ZSTD-compressed Parquet file, ready for DuckDB, pandas, Polars, Spark, BigQuery or Athena.',
  },
] as const;
