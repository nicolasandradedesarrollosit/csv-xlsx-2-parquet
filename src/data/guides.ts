import type { PageKey } from '../config/site';

interface Guide {
  hero: { kicker: string; title: string; lead: string };
  kicker: string;
  title: string;
  intro: string;
  blocks: { title: string; body: string }[];
}

export const GUIDES = {
  home: {
    hero: {
      kicker: '/ csv · xlsx → parquet',
      title: 'Convert CSV and XLSX to Parquet, without leaving your browser.',
      lead: 'Drop a file, fix the column types and download a Parquet file. Nothing is uploaded.',
    },
    kicker: '/ why parquet',
    title: 'Why convert a spreadsheet to Parquet',
    intro: 'What changes when a CSV or an Excel sheet becomes a Parquet file.',
    blocks: [
      {
        title: 'Smaller, typed and columnar',
        body: 'Parquet stores a table column by column, keeps a type for each column and compresses the values. The same data usually takes much less space than as CSV, and a query engine reads only the columns it needs instead of parsing every line as text.',
      },
      {
        title: 'Your file stays on your device',
        body: 'The conversion runs inside the page, with DuckDB compiled to WebAssembly. The file is read by your browser and is never sent to a server, which matters when it holds customers, invoices or salaries.',
      },
      {
        title: 'Types you can check before exporting',
        body: 'Every column is detected as text, integer, decimal, boolean or date, and the first 50 rows are shown as they were read. If you force a type that some values do not fit, the converter says how many and shows examples instead of writing empty values without telling you.',
      },
      {
        title: 'Ready for your data tools',
        body: 'The download is a ZSTD-compressed Parquet file with 64-bit integer, double, boolean, date and string columns. It opens in DuckDB, pandas, Polars, Spark, BigQuery and Athena.',
      },
    ],
  },
  csv: {
    hero: {
      kicker: '/ csv → parquet',
      title: 'Convert CSV to Parquet, without leaving your browser.',
      lead: 'Drop a CSV, check the detected column types and download a Parquet file. Nothing is uploaded.',
    },
    kicker: '/ csv',
    title: 'How CSV files are read',
    intro: 'What the converter does with delimiters, encodings, numbers and dates.',
    blocks: [
      {
        title: 'The delimiter is detected',
        body: 'Comma, semicolon and tab separated files all work: the delimiter and the quoting are detected from the file itself. Files ending in .csv, .tsv and .txt are accepted. The first row gives the column names, and a row with fewer fields than the header is completed with empty values.',
      },
      {
        title: 'UTF-8 first, then Latin-1',
        body: 'The file is read as UTF-8. If that fails it is read again as Latin-1, the encoding that Excel often writes on Windows, so accented letters are not lost.',
      },
      {
        title: 'Comma decimals and day-first dates',
        body: 'Numbers such as 1.234,56 are detected as decimals. Dates such as 31/12/2024, 31-12-2024, 31.12.2024 and 2024-12-31 are detected as dates. Slash dates are read day first, so 03/04/2024 is the 3rd of April.',
      },
      {
        title: 'Codes keep their leading zeros',
        body: 'Every value is loaded as text and typed afterwards. A column becomes an integer only when none of its values has a leading zero, so postcodes and identifiers such as 00123 stay as text. Empty cells become nulls in the Parquet file.',
      },
    ],
  },
  xlsx: {
    hero: {
      kicker: '/ xlsx → parquet',
      title: 'Convert Excel (XLSX) to Parquet, without leaving your browser.',
      lead: 'Drop a workbook, pick a sheet, check the column types and download a Parquet file. Nothing is uploaded.',
    },
    kicker: '/ xlsx',
    title: 'How Excel workbooks are read',
    intro: 'What the converter does with sheets, dates, formulas and formatted cells.',
    blocks: [
      {
        title: 'One sheet per Parquet file',
        body: 'A workbook with several sheets gets a sheet picker that shows how many rows each one has. The sheet you choose becomes one Parquet file, and you can switch to another sheet without loading the workbook again. The first row gives the column names and fully empty rows are skipped.',
      },
      {
        title: 'Date cells become real dates',
        body: 'A date cell is converted from the serial number Excel stores to an ISO date (yyyy-mm-dd), with no time zone shift, and the column is then detected as a date. Dates typed as text go through the same detection as in a CSV.',
      },
      {
        title: 'Formulas export their values',
        body: 'A cell with a formula is exported with the result Excel last calculated, not with the formula text. A cell that holds an error such as #DIV/0! becomes empty.',
      },
      {
        title: 'Numbers at full precision',
        body: 'Numbers are exported as stored, not as rounded for display. The exception is a cell formatted as a zero-padded code, such as 00123, which keeps the text you see. Only .xlsx workbooks are accepted: save an older .xls file as .xlsx first.',
      },
    ],
  },
} satisfies Record<PageKey, Guide>;
