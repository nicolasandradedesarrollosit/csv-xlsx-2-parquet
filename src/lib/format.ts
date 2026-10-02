const UNITS = ['B', 'KB', 'MB', 'GB'];
const integer = new Intl.NumberFormat('en-US');

export function formatBytes(bytes: number) {
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < UNITS.length - 1) {
    value /= 1024;
    unit++;
  }
  return `${unit === 0 || value >= 100 ? Math.round(value) : value.toFixed(value >= 10 ? 1 : 2)} ${UNITS[unit]}`;
}

export function formatCount(value: number) {
  return integer.format(value);
}

export function formatRatio(original: number, result: number) {
  if (original === 0) return '';
  const change = Math.round((1 - result / original) * 100);
  if (change === 0) return 'same size';
  return change > 0 ? `${change}% smaller` : `${-change}% larger`;
}
