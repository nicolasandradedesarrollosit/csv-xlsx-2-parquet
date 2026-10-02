export class ConverterError extends Error {
  readonly detail?: string;

  constructor(message: string, detail?: string) {
    super(message);
    this.name = 'ConverterError';
    this.detail = detail;
  }
}

export function toConverterError(error: unknown, fallback: string) {
  if (error instanceof ConverterError) return error;
  const detail = error instanceof Error ? error.message : String(error);
  return new ConverterError(fallback, detail.split('\n').slice(0, 4).join('\n'));
}
