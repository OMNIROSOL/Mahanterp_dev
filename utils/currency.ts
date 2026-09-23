export const BASE_CURRENCY = 'ZMW';

export function currencyCode(raw?: string | null): string {
  if (!raw) return BASE_CURRENCY;
  const code = String(raw).trim().split(/[\s\-\/]/)[0].toUpperCase();
  return code || BASE_CURRENCY;
}

export function isBaseCurrency(raw?: string | null): boolean {
  return currencyCode(raw) === BASE_CURRENCY;
}

export function toBaseAmount(foreignAmount: number, currency?: string | null, rate?: number | null): number {
  const fc = Number(foreignAmount) || 0;
  if (isBaseCurrency(currency)) return Math.round(fc * 100) / 100;
  const r = Number(rate) || 1;
  return Math.round(fc * r * 100) / 100;
}
