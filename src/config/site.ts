export const SITE = {
  name: 'csv-xlsx-2-parquet',
  keywords: [
    'csv to parquet',
    'xlsx to parquet',
    'excel to parquet',
    'convert csv to parquet online',
    'parquet converter',
    'duckdb wasm',
  ],
  author: 'Nicolás Andrade',
  authorUrl: 'https://github.com/nicolasandradedesarrollosit',
  repo: 'https://github.com/nicolasandradedesarrollosit/csv-xlsx-2-parquet',
  ogImage: { path: 'og-default.png', width: 1200, height: 630, alt: 'csv-xlsx-2-parquet: convert CSV and XLSX to Parquet in your browser' },
  googleSiteVerification: 'AyHnvdJBgHN2EIzZwG_Z-zBOSK9FWGaUFo_kDyziq0U',
} as const;

export const PAGES = {
  home: {
    path: '/',
    label: 'CSV and XLSX to Parquet',
    title: 'CSV and XLSX to Parquet converter — free, online, in your browser | csv-xlsx-2-parquet',
    description:
      'Convert CSV and Excel (XLSX) files to Parquet online, for free and without uploading them. Preview the data, fix column types and download a compressed Parquet file. Everything runs in your browser.',
  },
  csv: {
    path: 'csv-to-parquet/',
    label: 'CSV to Parquet',
    title: 'CSV to Parquet converter — free, online, no upload | csv-xlsx-2-parquet',
    description:
      'Convert CSV files to Parquet online without uploading them. The delimiter is detected, comma decimals and day-first dates are understood, and you download a ZSTD-compressed Parquet file. Everything runs in your browser.',
  },
  xlsx: {
    path: 'xlsx-to-parquet/',
    label: 'XLSX to Parquet',
    title: 'XLSX to Parquet converter — Excel to Parquet online, no upload | csv-xlsx-2-parquet',
    description:
      'Convert Excel (XLSX) workbooks to Parquet online without uploading them. Pick a sheet, check the detected column types and download a ZSTD-compressed Parquet file. Everything runs in your browser.',
  },
} as const;

export type PageKey = keyof typeof PAGES;

export const PREVIEW_ROWS = 50;
