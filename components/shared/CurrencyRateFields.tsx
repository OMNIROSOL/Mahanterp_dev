import React from 'react';
import { Coins, RefreshCcw } from 'lucide-react';
import { BASE_CURRENCY, currencyCode, isBaseCurrency } from '../../utils/currency';

type Props = {
  currency: string;
  exchangeRate: number | string;
  currencies?: { code: string; name?: string }[];
  onCurrencyChange: (code: string) => void;
  onRateChange: (rate: number) => void;
  className?: string;
};

const FALLBACK = [
  { code: 'ZMW', name: 'Zambian Kwacha' },
  { code: 'USD', name: 'US Dollar' },
  { code: 'EUR', name: 'Euro' },
  { code: 'GBP', name: 'British Pound' },
  { code: 'ZAR', name: 'South African Rand' },
];

export function CurrencyRateFields({
  currency,
  exchangeRate,
  currencies,
  onCurrencyChange,
  onRateChange,
  className,
}: Props) {
  const code = currencyCode(currency);
  const options = (currencies && currencies.length ? currencies : FALLBACK).map((c) => ({
    code: currencyCode(c.code),
    name: c.name || c.code,
  }));
  if (!options.some((c) => c.code === code)) {
    options.unshift({ code, name: code });
  }
  const baseLocked = isBaseCurrency(code);

  return (
    <div className={className || 'grid grid-cols-1 md:grid-cols-2 gap-6'}>
      <div className="space-y-2">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Currency</label>
        <div className="relative group">
          <Coins size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500" />
          <select
            value={code}
            onChange={(e) => onCurrencyChange(currencyCode(e.target.value))}
            className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-2xl pl-11 pr-5 py-3 text-[13px] font-semibold text-slate-700 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 cursor-pointer"
          >
            {options.map((c) => (
              <option key={c.code} value={c.code}>
                {c.code}{c.name && c.name !== c.code ? ` — ${c.name}` : ''}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="space-y-2">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">
          Exchange rate (1 {code} = {BASE_CURRENCY})
        </label>
        <div className="relative group">
          <RefreshCcw size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500" />
          <input
            type="number"
            step="0.0001"
            min="0"
            value={baseLocked ? 1 : exchangeRate}
            readOnly={baseLocked}
            onChange={(e) => onRateChange(parseFloat(e.target.value) || 0)}
            className={`w-full bg-slate-50 border border-slate-200 rounded-2xl pl-11 pr-5 py-3 text-[13px] font-semibold text-slate-700 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 ${baseLocked ? 'opacity-60 cursor-not-allowed bg-slate-100' : ''}`}
          />
        </div>
      </div>
    </div>
  );
}

export function BaseEquivalent({ amount, currency, exchangeRate }: { amount: number; currency?: string; exchangeRate?: number }) {
  const code = currencyCode(currency);
  if (isBaseCurrency(code)) return null;
  const base = (Number(amount) || 0) * (Number(exchangeRate) || 1);
  return (
    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
      {BASE_CURRENCY} equivalent {base.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
    </p>
  );
}

export function DualAmount({
  amount,
  amountBase,
  currency,
}: {
  amount: number;
  amountBase?: number;
  currency?: string;
}) {
  const code = currencyCode(currency);
  const fc = Number(amount) || 0;
  const zmw = amountBase != null ? Number(amountBase) : null;
  return (
    <>
      <span className="text-[14px] mr-2 text-slate-400">{code}</span>
      {fc.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      {!isBaseCurrency(code) && zmw != null && (
        <span className="block text-[11px] font-bold text-slate-400 mt-1 uppercase tracking-widest">
          {BASE_CURRENCY} {zmw.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      )}
    </>
  );
}
