import type { AsyncDuckDB, AsyncDuckDBConnection } from '@duckdb/duckdb-wasm';
import mvpModule from '@duckdb/duckdb-wasm/dist/duckdb-mvp.wasm?url';
import mvpWorker from '@duckdb/duckdb-wasm/dist/duckdb-browser-mvp.worker.js?url';
import ehModule from '@duckdb/duckdb-wasm/dist/duckdb-eh.wasm?url';
import ehWorker from '@duckdb/duckdb-wasm/dist/duckdb-browser-eh.worker.js?url';

import { ConverterError } from '../errors';

export type Row = Record<string, unknown>;

export interface Engine {
  db: AsyncDuckDB;
  conn: AsyncDuckDBConnection;
  registerFile(name: string, file: File): Promise<void>;
  registerBuffer(name: string, buffer: Uint8Array): Promise<void>;
  rows(sql: string): Promise<Row[]>;
  run(sql: string): Promise<void>;
}

let engine: Promise<Engine> | undefined;

async function start(): Promise<Engine> {
  if (typeof WebAssembly === 'undefined' || typeof Worker === 'undefined') {
    throw new ConverterError('This browser cannot run the converter.', 'WebAssembly and Web Workers are required.');
  }

  const duckdb = await import('@duckdb/duckdb-wasm');
  const bundle = await duckdb.selectBundle({
    mvp: { mainModule: mvpModule, mainWorker: mvpWorker },
    eh: { mainModule: ehModule, mainWorker: ehWorker },
  });

  const worker = new Worker(bundle.mainWorker!);
  const db = new duckdb.AsyncDuckDB(new duckdb.VoidLogger(), worker);
  await db.instantiate(bundle.mainModule, bundle.pthreadWorker);
  const conn = await db.connect();

  const drop = async (name: string) => {
    try {
      await db.dropFile(name);
    } catch {
      return;
    }
  };

  return {
    db,
    conn,
    async registerFile(name, file) {
      await drop(name);
      await db.registerFileHandle(name, file, duckdb.DuckDBDataProtocol.BROWSER_FILEREADER, true);
    },
    async registerBuffer(name, buffer) {
      await drop(name);
      await db.registerFileBuffer(name, buffer);
    },
    async rows(sql) {
      const table = await conn.query(sql);
      return table.toArray().map((row) => row.toJSON() as Row);
    },
    async run(sql) {
      await conn.query(sql);
    },
  };
}

export function getEngine() {
  engine ??= start().catch((error: unknown) => {
    engine = undefined;
    throw error;
  });
  return engine;
}
