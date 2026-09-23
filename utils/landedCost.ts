import { BASE_CURRENCY, currencyCode, isBaseCurrency, toBaseAmount } from './currency';

export const FOREIGN_CHARGE_KEYS = ['totalFob', 'fobCharge', 'freight', 'insurance'] as const;
export const LOCAL_CHARGE_KEYS = ['roadTransport', 'clearingAgent', 'duty', 'zabs', 'overweight', 'bankCharges'] as const;

export type ChargeKey = typeof FOREIGN_CHARGE_KEYS[number] | typeof LOCAL_CHARGE_KEYS[number];

export function defaultChargeCurrencies(docCurrency?: string | null): Record<string, string> {
  const doc = currencyCode(docCurrency);
  const map: Record<string, string> = {};
  FOREIGN_CHARGE_KEYS.forEach((key) => { map[key] = doc; });
  LOCAL_CHARGE_KEYS.forEach((key) => { map[key] = BASE_CURRENCY; });
  return map;
}

export function chargeToBase(amount: number, currency?: string | null, rate?: number | null): number {
  return toBaseAmount(Number(amount) || 0, currency, rate);
}

export function landedCostTotals(
  expenses: Record<string, number>,
  chargeCurrencies: Record<string, string>,
  rate: number
) {
  const fx = Number(rate) > 0 ? Number(rate) : 1;
  const toBase = (key: ChargeKey) => chargeToBase(expenses[key] || 0, chargeCurrencies[key], fx);
  const fobBase = toBase('totalFob');
  const charges: ChargeKey[] = ['fobCharge', 'freight', 'insurance', 'roadTransport', 'clearingAgent', 'duty', 'zabs', 'overweight', 'bankCharges'];
  const expensesBase = charges.reduce((sum, key) => sum + toBase(key), 0);
  const grandBase = Math.round((fobBase + expensesBase) * 100) / 100;
  const expenseRatio = fobBase > 0 ? (expensesBase / fobBase) * 100 : 0;
  return {
    fobBase: Math.round(fobBase * 100) / 100,
    expensesBase: Math.round(expensesBase * 100) / 100,
    grandBase,
    expenseRatio,
    rate: fx,
    baseCurrency: BASE_CURRENCY,
  };
}

export { BASE_CURRENCY, currencyCode, isBaseCurrency };
