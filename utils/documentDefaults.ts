import { DEFAULT_TAX_CODE } from './tax';

const KEY = 'mahant.documentDefaults';

export type DocumentDefaults = {
  amountsAreTaxInclusive: boolean;
  defaultTaxCode: string;
  columnDescription: boolean;
  columnDiscount: boolean;
};

const FALLBACK: DocumentDefaults = {
  amountsAreTaxInclusive: true,
  defaultTaxCode: DEFAULT_TAX_CODE,
  columnDescription: false,
  columnDiscount: false,
};

export function getDocumentDefaults(): DocumentDefaults {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...FALLBACK };
    const parsed = JSON.parse(raw);
    return {
      amountsAreTaxInclusive: parsed.amountsAreTaxInclusive ?? true,
      defaultTaxCode: parsed.defaultTaxCode || DEFAULT_TAX_CODE,
      columnDescription: Boolean(parsed.columnDescription),
      columnDiscount: Boolean(parsed.columnDiscount),
    };
  } catch {
    return { ...FALLBACK };
  }
}

export function saveDocumentDefaults(next: Partial<DocumentDefaults>) {
  const merged = { ...getDocumentDefaults(), ...next };
  localStorage.setItem(KEY, JSON.stringify(merged));
  return merged;
}
