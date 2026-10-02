export function parquetName(fileName: string, sheet?: string) {
  const base = fileName.replace(/\.[^.]+$/, '') || 'data';
  const suffix = sheet ? `-${sheet.trim().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '')}` : '';
  return `${base}${suffix === '-' ? '' : suffix}.parquet`;
}

export function saveFile(bytes: Uint8Array, name: string) {
  const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: 'application/vnd.apache.parquet' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
