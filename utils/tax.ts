export const DEFAULT_TAX_CODE = 'VAT 16%';
export const DEFAULT_TAX_RATE = 16;

export function taxRateForCode(taxCodes: { name?: string; id?: string; rate?: number | string }[], taxCode?: string | null): number {
  const raw = String(taxCode || '').trim();
  if (!raw || raw.toLowerCase() === 'no tax' || raw.toLowerCase() === 'exempt') return 0;
  const match = (taxCodes || []).find((tc) =>
    tc.id === raw ||
    String(tc.name || '').toLowerCase() === raw.toLowerCase()
  );
  if (match) return Number(match.rate) || 0;
  if (raw.toLowerCase().includes('16') || raw.toLowerCase() === DEFAULT_TAX_CODE.toLowerCase()) return DEFAULT_TAX_RATE;
  if (raw.toLowerCase().includes('zero')) return 0;
  return 0;
}

/** Inclusive 1160 at 16% → net 1000 + VAT 160. */
export function splitInclusiveAmount(gross: number, ratePercent: number): { net: number; tax: number; gross: number } {
  const amount = Number(gross) || 0;
  const rate = (Number(ratePercent) || 0) / 100;
  if (rate <= 0) return { net: round2(amount), tax: 0, gross: round2(amount) };
  const tax = amount - amount / (1 + rate);
  const net = amount - tax;
  return { net: round2(net), tax: round2(tax), gross: round2(amount) };
}

export function taxOnExclusive(net: number, ratePercent: number): number {
  return round2((Number(net) || 0) * ((Number(ratePercent) || 0) / 100));
}

export function lineTaxSplit(
  qty: number,
  unitPrice: number,
  taxCode: string | null | undefined,
  taxCodes: { name?: string; id?: string; rate?: number | string }[],
  inclusive: boolean,
  discount = 0,
  discountIsPercent = true
) {
  let line = (Number(qty) || 0) * (Number(unitPrice) || 0);
  if (discount) {
    line = discountIsPercent ? line * (1 - Number(discount) / 100) : Math.max(0, line - Number(discount));
  }
  const rate = taxRateForCode(taxCodes, taxCode);
  if (inclusive) {
    const split = splitInclusiveAmount(line, rate);
    return { net: split.net, tax: split.tax, gross: split.gross, rate };
  }
  const tax = taxOnExclusive(line, rate);
  return { net: round2(line), tax, gross: round2(line + tax), rate };
}

function round2(n: number) {
  return Math.round((Number(n) || 0) * 100) / 100;
}
