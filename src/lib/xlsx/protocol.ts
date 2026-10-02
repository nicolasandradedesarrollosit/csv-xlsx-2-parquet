export interface SheetInfo {
  name: string;
  rows: number;
}

export type WorkbookRequest =
  | { id: number; kind: 'open'; buffer: ArrayBuffer }
  | { id: number; kind: 'csv'; sheet: string };

export type WorkbookResponse =
  | { id: number; ok: true; sheets?: SheetInfo[]; csv?: Uint8Array }
  | { id: number; ok: false; message: string };
