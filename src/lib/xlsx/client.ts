import { ConverterError } from '../errors';
import type { SheetInfo, WorkbookRequest, WorkbookResponse } from './protocol';

type Pending = { resolve: (response: WorkbookResponse & { ok: true }) => void; reject: (error: Error) => void };
type RequestBody = { kind: 'open'; buffer: ArrayBuffer } | { kind: 'csv'; sheet: string };

let worker: Worker | undefined;
let nextId = 0;
const pending = new Map<number, Pending>();

function spawn() {
  const instance = new Worker(new URL('./xlsx.worker.ts', import.meta.url), { type: 'module' });
  instance.addEventListener('message', (event: MessageEvent<WorkbookResponse>) => {
    const request = pending.get(event.data.id);
    if (!request) return;
    pending.delete(event.data.id);
    if (event.data.ok) request.resolve(event.data);
    else request.reject(new Error(event.data.message));
  });
  instance.addEventListener('error', (event) => {
    pending.forEach((request) => request.reject(new Error(event.message || 'The spreadsheet reader crashed.')));
    pending.clear();
  });
  return instance;
}

function send(body: RequestBody, transfer: Transferable[] = []) {
  worker ??= spawn();
  const id = nextId++;
  const message: WorkbookRequest = { id, ...body };
  return new Promise<WorkbookResponse & { ok: true }>((resolve, reject) => {
    pending.set(id, { resolve, reject });
    worker!.postMessage(message, transfer);
  });
}

export function closeWorkbook() {
  worker?.terminate();
  worker = undefined;
  pending.clear();
}

export async function openWorkbook(file: File): Promise<SheetInfo[]> {
  closeWorkbook();
  const buffer = await file.arrayBuffer();
  try {
    const response = await send({ kind: 'open', buffer }, [buffer]);
    return response.sheets ?? [];
  } catch (error) {
    throw new ConverterError(
      'This Excel file could not be read.',
      error instanceof Error ? error.message : 'The file may be corrupt or password protected.',
    );
  }
}

export async function sheetToCsv(sheet: string): Promise<Uint8Array> {
  try {
    const response = await send({ kind: 'csv', sheet });
    return response.csv ?? new Uint8Array();
  } catch (error) {
    throw new ConverterError('This sheet could not be read.', error instanceof Error ? error.message : undefined);
  }
}
