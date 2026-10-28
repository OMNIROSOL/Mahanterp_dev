import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Save,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  FolderOpen,
  Calendar,
  Scale,
  RefreshCw
} from 'lucide-react';
import apiService from '../services/apiService';
import { formatDateDMY } from '../utils/dateUtils';
import { cn } from '../utils/cn';

interface AccountBalanceRow {
  accountId: string;
  code: string;
  name: string;
  accountType: string;
  currency: string;
  debit: number;
  credit: number;
}

export const SettingsStartingBalancesView: React.FC = () => {
  const navigate = useNavigate();
  const [startingDate, setStartingDate] = useState<string>('2025-01-01');
  const [rows, setRows] = useState<AccountBalanceRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [accounts, saved] = await Promise.all([
        apiService.getAccounts(),
        apiService.getStartingBalances()
      ]);

      if (saved?.startingDate) {
        setStartingDate(saved.startingDate);
      }

      const savedMap: Record<string, { debit: number; credit: number }> = {};
      if (Array.isArray(saved?.balances)) {
        for (const b of saved.balances) {
          savedMap[b.accountId] = { debit: Number(b.debit || 0), credit: Number(b.credit || 0) };
        }
      }

      const mapped: AccountBalanceRow[] = (accounts || []).map((acc: any) => ({
        accountId: acc.id,
        code: acc.code || '',
        name: acc.name || '',
        accountType: acc.accountType || 'Asset',
        currency: acc.currency || 'ZMW',
        debit: savedMap[acc.id]?.debit || 0,
        credit: savedMap[acc.id]?.credit || 0,
      }));

      setRows(mapped);
    } catch (err: any) {
      console.error('Failed to load starting balances:', err);
      setError('Could not load chart of accounts.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDebitChange = (idx: number, val: string) => {
    const num = parseFloat(val) || 0;
    const next = [...rows];
    next[idx].debit = num;
    setRows(next);
  };

  const handleCreditChange = (idx: number, val: string) => {
    const num = parseFloat(val) || 0;
    const next = [...rows];
    next[idx].credit = num;
    setRows(next);
  };

  const totalDebits = rows.reduce((s, r) => s + r.debit, 0);
  const totalCredits = rows.reduce((s, r) => s + r.credit, 0);
  const difference = Math.round(Math.abs(totalDebits - totalCredits) * 100) / 100;
  const isBalanced = difference < 0.005;

  const handleSave = async () => {
    setIsSaving(true);
    setMessage('');
    setError('');
    try {
      const balances = rows.filter(r => r.debit > 0 || r.credit > 0).map(r => ({
        accountId: r.accountId,
        code: r.code,
        name: r.name,
        debit: r.debit,
        credit: r.credit
      }));

      await apiService.setStartingBalances({ startingDate, balances });
      setMessage('Starting balances saved successfully.');
    } catch (err: any) {
      setError(err?.response?.data?.error || err.message || 'Failed to save starting balances');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-slate-100 min-h-screen flex flex-col font-sans">
      {/* Breadcrumb */}
      <div className="bg-white px-8 py-3 border-b border-gray-200 flex items-center justify-between text-[11px] font-bold text-gray-400 uppercase tracking-widest select-none">
        <div className="flex items-center space-x-2">
          <FolderOpen size={14} className="text-slate-400" />
          <ChevronRight size={10} className="opacity-30" />
          <Link to="/settings" className="hover:text-blue-600 transition-colors">Settings</Link>
          <ChevronRight size={10} className="opacity-30" />
          <span className="text-slate-600">Starting Balances</span>
        </div>
      </div>

      <div className="p-8 max-w-5xl mx-auto w-full space-y-6">
        <div className="bg-white rounded-xl shadow-xs border border-gray-200 p-6 space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Scale size={24} />
              </div>
              <div>
                <h1 className="text-xl font-black text-slate-900 tracking-tight">Starting Balances</h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Configure opening debit and credit balances for your general ledger accounts as of the conversion date.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving || isLoading}
                className="px-5 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-1.5 shadow-xs"
              >
                <Save size={14} /> {isSaving ? 'Saving...' : 'Save Starting Balances'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-100">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Starting Date (Conversion Date)
              </label>
              <input
                type="date"
                value={startingDate}
                onChange={(e) => setStartingDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <p className="text-[11px] text-gray-500 mt-1">Formatted as: {formatDateDMY(startingDate)}</p>
            </div>

            <div className="md:col-span-2 flex items-center justify-end gap-4 text-xs font-bold">
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-right">
                <span className="text-[10px] text-gray-400 uppercase tracking-wider block">Total Debits</span>
                <span className="text-sm font-black font-mono text-slate-800">
                  ZMW {totalDebits.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-right">
                <span className="text-[10px] text-gray-400 uppercase tracking-wider block">Total Credits</span>
                <span className="text-sm font-black font-mono text-slate-800">
                  ZMW {totalCredits.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className={cn(
                "border rounded-lg p-3 text-right",
                isBalanced ? "bg-emerald-50 border-emerald-300 text-emerald-800" : "bg-rose-50 border-rose-300 text-rose-800"
              )}>
                <span className="text-[10px] uppercase tracking-wider block">{isBalanced ? "Status" : "Difference"}</span>
                <span className="text-sm font-black font-mono">
                  {isBalanced ? "Balanced (0.00)" : `ZMW ${difference.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
                </span>
              </div>
            </div>
          </div>

          {message && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-lg text-xs font-bold flex items-center gap-2">
              <CheckCircle2 size={16} /> {message}
            </div>
          )}

          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-lg text-xs font-bold flex items-center gap-2">
              <AlertCircle size={16} /> {error}
            </div>
          )}

          <div className="overflow-x-auto border border-gray-200 rounded-lg">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 border-b border-gray-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-2.5 px-3">Code</th>
                  <th className="py-2.5 px-3">Account Name</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Currency</th>
                  <th className="py-2.5 px-3 text-right w-44">Starting Debit</th>
                  <th className="py-2.5 px-3 text-right w-44">Starting Credit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-sans">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-gray-400">
                      <RefreshCw size={18} className="animate-spin mx-auto mb-2 text-indigo-500" />
                      Loading accounts...
                    </td>
                  </tr>
                ) : (
                  rows.map((row, idx) => (
                    <tr key={row.accountId} className="hover:bg-slate-50/70">
                      <td className="py-2 px-3 font-mono text-gray-500">{row.code || '—'}</td>
                      <td className="py-2 px-3 font-semibold text-slate-800">{row.name}</td>
                      <td className="py-2 px-3 text-gray-500">{row.accountType}</td>
                      <td className="py-2 px-3 font-bold text-gray-600">{row.currency}</td>
                      <td className="py-2 px-3 text-right">
                        <input
                          type="number"
                          step="0.01"
                          value={row.debit || ''}
                          onChange={(e) => handleDebitChange(idx, e.target.value)}
                          placeholder="0.00"
                          className="w-full text-right bg-white border border-gray-300 rounded px-2 py-1 font-mono font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </td>
                      <td className="py-2 px-3 text-right">
                        <input
                          type="number"
                          step="0.01"
                          value={row.credit || ''}
                          onChange={(e) => handleCreditChange(idx, e.target.value)}
                          placeholder="0.00"
                          className="w-full text-right bg-white border border-gray-300 rounded px-2 py-1 font-mono font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsStartingBalancesView;
