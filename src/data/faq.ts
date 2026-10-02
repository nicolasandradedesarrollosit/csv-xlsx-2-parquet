export interface FaqItem {
  question: string;
  answer: string;
}

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

export const FAQ: FaqItem[] = [
  {
    question: 'How do I convert a CSV file to Parquet?',
    answer:
      'Drop the CSV file on this page, check the detected column types and press Download Parquet. There is nothing to install and no account to create.',
  },
  {
    question: 'Can I convert an Excel (XLSX) file to Parquet?',
    answer:
      'Yes. Drop the .xlsx file, pick the sheet to convert if the workbook has more than one, and download the Parquet file. Old .xls files and password-protected workbooks are not supported.',
  },
  {
    question: 'Are my files uploaded to a server?',
    answer:
      'No. The conversion runs in your browser with DuckDB compiled to WebAssembly. The file never leaves your device and the site has no backend.',
  },
  {
    question: 'Is there a file size limit?',
    answer:
      'There is no fixed limit. The file has to fit in the memory of the browser tab, so files of tens of megabytes convert comfortably and files of several hundred megabytes may not.',
  },
  {
    question: 'Which date and number formats are recognised?',
    answer:
      'Day-first dates such as 31/12/2025 and ISO dates such as 2025-12-31, dot decimals such as 1234.56 and comma decimals such as 1.234,56. Codes with leading zeros such as 00123 are kept as text.',
  },
  {
    question: 'Which compression does the Parquet file use?',
    answer: 'ZSTD, which is read by DuckDB, pandas, Polars, Apache Spark, BigQuery, Athena and Snowflake.',
  },
  {
    question: 'Is it free?',
    answer: 'Yes. It is free and open source, and the code is on GitHub.',
  },
];
