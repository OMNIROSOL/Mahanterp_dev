import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  CheckCircle2,
  Landmark,
  Upload,
  RefreshCw,
  Printer,
  Calendar,
  AlertCircle,
  FileSpreadsheet,
  Check,
  X,
  SlidersHorizontal,
  ChevronRight,
  FolderOpen
} from 'lucide-react';
import apiService from '../services/apiService';
import { formatDateDMY } from '../utils/dateUtils';
import { getCompanyProfile } from '../utils/companyProfile';
import { cn } from '../utils/cn';

const money = (n: number | undefined | null) =>
  Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const dateText = (v: any) => {
  if (!v) return '';
  const s = typeof v === 'string' ? v : new Date(v).toISOString();
  return s.slice(0, 10);
};

export const BankReconciliationView: React.FC = () => {
  const company = getCompanyProfile();
  const fileRef = useRef<HTMLInputElement>(null);

  // Active view tab: 'worksheet' | 'import'
  const [activeTab, setActiveTab] = useState<'worksheet' | 'import'>('worksheet');

  // Accounts
  const [accounts, setAccounts] = useState<any[]>([]);
  const [accountId, setAccountId] = useState('');

  // Worksheet State
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const [statementDate, setStatementDate] = useState<string>(todayStr);
  const [statementBalance, setStatementBalance] = useState<string>('0.00');
  const [reconciliationData, setReconciliationData] = useState<any>(null);
  const [loadingReconciliation, setLoadingReconciliation] = useState(false);

  // File Import State
  const [statements, setStatements] = useState<any[]>([]);
  const [statement, setStatement] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const selectedAccount = accounts.find((a) => a.id === accountId);
  const currency = selectedAccount?.currency || 'ZMW';

  // Load bank accounts
  const loadAccounts = async () => {
    try {
      const rows = await apiService.getBankAccounts();
      setAccounts(rows || []);
      if (!accountId && rows?.[0]?.id) {
        setAccountId(rows[0].id);
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Could not load bank accounts.');
    }
  };

  // Load worksheet reconciliation data
  const loadReconciliation = async (accId: string, sDate: string, sBal: number) => {
    if (!accId) return;
    setLoadingReconciliation(true);
    setError('');
    try {
      const data = await apiService.getBankReconciliationData(accId, {
        statementDate: sDate,
        statementBalance: sBal
      });
      setReconciliationData(data);
    } catch (err: any) {
      console.error('Failed to load reconciliation data:', err);
      setError(err?.response?.data?.error || 'Failed to load reconciliation data.');
    } finally {
      setLoadingReconciliation(false);
    }
  };

  // Load statements for import tab
  const loadStatements = async (name: string, keepId?: string) => {
    if (!name) {
      setStatements([]);
      setStatement(null);
      return;
    }
    const rows = await apiService.getBankStatements(name);
    setStatements(rows || []);
    const openId = keepId || rows?.[0]?.id;
    if (openId) {
      const full = await apiService.getBankStatement(openId);
      setStatement(full);
    } else {
      setStatement(null);
    }
  };

  useEffect(() => {
    loadAccounts();
  }, []);

  useEffect(() => {
    if (accountId) {
      const numBal = parseFloat(statementBalance) || 0;
      loadReconciliation(accountId, statementDate, numBal);
      if (selectedAccount?.name) {
        loadStatements(selectedAccount?.name).catch(console.error);
      }
    }
  }, [accountId, statementDate]);

  const handleBalanceChange = (newVal: string) => {
    setStatementBalance(newVal);
    const numBal = parseFloat(newVal) || 0;
    if (reconciliationData) {
      const cleared = reconciliationData.clearedBalance || 0;
      const discrepancy = Math.round((numBal - cleared) * 100) / 100;
      setReconciliationData({
        ...reconciliationData,
        statementBalance: numBal,
        discrepancy,
        isBalanced: Math.abs(discrepancy) < 0.005
      });
    }
  };

  // Toggle single line cleared
  const handleToggleCleared = async (tx: any) => {
    if (!accountId) return;
    const nextCleared = !tx.cleared;
    const nextDate = nextCleared ? (tx.clearedDate || statementDate) : '';

    // Optimistic UI update
    const updatedTxList = reconciliationData.transactions.map((t: any) => {
      if (t.id === tx.id && t.type === tx.type) {
        return { ...t, cleared: nextCleared, clearedDate: nextDate };
      }
      return t;
    });

    let unclearedDep = 0;
    let unclearedPay = 0;
    for (const t of updatedTxList) {
      if (!t.cleared) {
        if (t.type === 'Receipt' || (t.type === 'Transfer' && t.debit > 0)) unclearedDep += t.debit;
        if (t.type === 'Payment' || (t.type === 'Transfer' && t.credit > 0)) unclearedPay += t.credit;
      }
    }

    const book = reconciliationData.bookBalance || 0;
    const clearedBal = Math.round((book + unclearedPay - unclearedDep) * 100) / 100;
    const stmtBal = parseFloat(statementBalance) || 0;
    const disc = Math.round((stmtBal - clearedBal) * 100) / 100;

    setReconciliationData({
      ...reconciliationData,
      unclearedDeposits: unclearedDep,
      unclearedPayments: unclearedPay,
      clearedBalance: clearedBal,
      discrepancy: disc,
      isBalanced: Math.abs(disc) < 0.005,
      transactions: updatedTxList
    });

    try {
      await apiService.reconcileBankLine(accountId, {
        type: tx.type,
        id: tx.id,
        cleared: nextCleared,
        clearedDate: nextDate
      });
    } catch (err: any) {
      console.error('Failed to toggle line:', err);
      // Revert if error
      loadReconciliation(accountId, statementDate, parseFloat(statementBalance) || 0);
    }
  };

  // Bulk mark all prior to statement date as cleared
  const handleClearAllPrior = async () => {
    if (!reconciliationData?.transactions || !accountId) return;
    setBusy(true);
    try {
      const stmtD = new Date(statementDate);
      stmtD.setHours(23, 59, 59, 999);

      const linesToUpdate = reconciliationData.transactions.map((t: any) => ({
        type: t.type,
        id: t.id,
        cleared: true,
        clearedDate: statementDate
      }));

      await apiService.bulkReconcileBankLines(accountId, { lines: linesToUpdate });
      await loadReconciliation(accountId, statementDate, parseFloat(statementBalance) || 0);
      setMessage('All transactions marked as cleared.');
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to bulk reconcile.');
    } finally {
      setBusy(false);
    }
  };

  // Unclear all
  const handleUnclearAll = async () => {
    if (!reconciliationData?.transactions || !accountId) return;
    setBusy(true);
    try {
      const linesToUpdate = reconciliationData.transactions.map((t: any) => ({
        type: t.type,
        id: t.id,
        cleared: false,
        clearedDate: ''
      }));

      await apiService.bulkReconcileBankLines(accountId, { lines: linesToUpdate });
      await loadReconciliation(accountId, statementDate, parseFloat(statementBalance) || 0);
      setMessage('All transactions marked as uncleared.');
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to reset.');
    } finally {
      setBusy(false);
    }
  };

  // Import file handler
  const importFile = async (file?: File) => {
    if (!file || !selectedAccount) {
      setError('Select a bank or cash account first.');
      return;
    }
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const result = await apiService.importBankStatement(selectedAccount?.name, selectedAccount.id, file);
      setMessage(`Imported ${result.imported} line${result.imported === 1 ? '' : 's'}. Auto-matched ${result.matched}.`);
      await loadStatements(selectedAccount?.name, result.id);
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Import failed.');
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const isBalanced = reconciliationData?.isBalanced;
  const discrepancy = reconciliationData?.discrepancy ?? 0;

  return (
    <div className="bg-slate-100 min-h-screen flex flex-col font-sans">
      {/* Breadcrumb */}
      <div className="bg-white px-8 py-3 border-b border-gray-200 flex items-center justify-between text-[11px] font-bold text-gray-400 uppercase tracking-widest select-none no-print">
        <div className="flex items-center space-x-2">
          <FolderOpen size={14} className="text-slate-400" />
          <ChevronRight size={10} className="opacity-30" />
          <span className="text-slate-600">Bank Reconciliation</span>
        </div>
        <div className="text-xs text-gray-500 font-medium normal-case">
          {company.name} • Mukwa Road, Lusaka
        </div>
      </div>

      {/* Main Container */}
      <div className="p-6 md:p-8 max-w-[1400px] mx-auto w-full space-y-6">
        {/* Top Controls Card */}
        <div className="bg-white rounded-xl shadow-xs border border-gray-200 p-6 no-print">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 pb-6 border-b border-gray-100">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest bg-blue-50 text-blue-700">
                  Manager.io Parity
                </span>
                <span className="text-xs text-gray-400 font-semibold">• Live Balance Matching</span>
              </div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">Bank Reconciliation</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Reconcile your statement closing balance against bank ledger entries to achieve an exact 0.00 discrepancy.
              </p>
            </div>

            {/* Tab Switcher */}
            <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs font-bold">
              <button
                onClick={() => setActiveTab('worksheet')}
                className={cn(
                  "px-4 py-2 rounded-md transition-all",
                  activeTab === 'worksheet'
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-500 hover:text-slate-800"
                )}
              >
                Reconciliation Worksheet
              </button>
              <button
                onClick={() => setActiveTab('import')}
                className={cn(
                  "px-4 py-2 rounded-md transition-all",
                  activeTab === 'import'
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-500 hover:text-slate-800"
                )}
              >
                Statement File Import (CSV)
              </button>
            </div>
          </div>

          {/* Account & Date Controls */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Bank Account
              </label>
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.currency || 'ZMW'})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Statement Date
              </label>
              <input
                type="date"
                value={statementDate}
                onChange={(e) => setStatementDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Statement Closing Balance ({currency})
              </label>
              <input
                type="number"
                step="0.01"
                value={statementBalance}
                onChange={(e) => handleBalanceChange(e.target.value)}
                placeholder="0.00"
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
              />
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-lg text-xs font-semibold flex items-center justify-between">
            <span className="flex items-center gap-2">
              <AlertCircle size={15} /> {error}
            </span>
            <button onClick={() => setError('')}><X size={14} /></button>
          </div>
        )}

        {message && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-lg text-xs font-semibold flex items-center justify-between">
            <span className="flex items-center gap-2">
              <CheckCircle2 size={15} /> {message}
            </span>
            <button onClick={() => setMessage('')}><X size={14} /></button>
          </div>
        )}

        {/* TAB 1: Reconciliation Worksheet */}
        {activeTab === 'worksheet' && (
          <div className="space-y-6">
            {/* Live Discrepancy Calculator Banner */}
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
              <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-xs">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Statement Balance</span>
                <span className="text-base font-black text-slate-900 font-mono mt-1 block">
                  {currency} {money(parseFloat(statementBalance) || 0)}
                </span>
              </div>

              <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-xs">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">GL Book Balance</span>
                <span className="text-base font-black text-slate-800 font-mono mt-1 block">
                  {currency} {money(reconciliationData?.bookBalance)}
                </span>
              </div>

              <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-xs">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">+ Uncleared Payments</span>
                <span className="text-base font-black text-slate-700 font-mono mt-1 block">
                  {currency} {money(reconciliationData?.unclearedPayments)}
                </span>
              </div>

              <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-xs">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">- Uncleared Deposits</span>
                <span className="text-base font-black text-slate-700 font-mono mt-1 block">
                  {currency} {money(reconciliationData?.unclearedDeposits)}
                </span>
              </div>

              <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-xs">
                <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block">Cleared Balance</span>
                <span className="text-base font-black text-blue-800 font-mono mt-1 block">
                  {currency} {money(reconciliationData?.clearedBalance)}
                </span>
              </div>

              <div className={cn(
                "rounded-xl p-4 shadow-xs border flex flex-col justify-center",
                isBalanced
                  ? "bg-emerald-50 border-emerald-300 text-emerald-900"
                  : "bg-rose-50 border-rose-300 text-rose-900"
              )}>
                <span className="text-[10px] font-black uppercase tracking-wider block">
                  {isBalanced ? "Status: Balanced" : "Status: Discrepancy"}
                </span>
                <span className="text-base font-black font-mono mt-1 block">
                  {isBalanced ? "Balanced (0.00)" : `${currency} ${money(discrepancy)}`}
                </span>
              </div>
            </div>

            {/* Table Action Bar */}
            <div className="bg-white rounded-xl shadow-xs border border-gray-200 p-4 flex flex-wrap items-center justify-between gap-4 no-print">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleClearAllPrior}
                  disabled={busy || loadingReconciliation}
                  className="bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 font-bold px-3 py-1.5 rounded text-xs transition-colors"
                >
                  Mark All Cleared
                </button>
                <button
                  onClick={handleUnclearAll}
                  disabled={busy || loadingReconciliation}
                  className="bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200 font-bold px-3 py-1.5 rounded text-xs transition-colors"
                >
                  Unclear All
                </button>
                <button
                  onClick={() => loadReconciliation(accountId, statementDate, parseFloat(statementBalance) || 0)}
                  className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 font-bold px-3 py-1.5 rounded text-xs transition-colors flex items-center gap-1.5"
                >
                  <RefreshCw size={12} className={loadingReconciliation ? 'animate-spin' : ''} /> Refresh
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 font-bold px-3 py-1.5 rounded text-xs transition-colors flex items-center gap-1.5"
                >
                  <Printer size={13} /> Print Worksheet
                </button>
              </div>
            </div>

            {/* Reconciliation Transactions Table */}
            <div className="bg-white rounded-xl shadow-xs border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">
                    Bank Account Transactions ({selectedAccount?.name})
                  </h3>
                  <p className="text-xs text-gray-500">
                    Toggle checkboxes to mark transactions as cleared on the bank statement.
                  </p>
                </div>
                <span className="text-xs font-semibold text-gray-500">
                  {reconciliationData?.transactions?.length || 0} transactions
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 border-b border-gray-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="py-3 px-4 w-12 text-center">Cleared</th>
                      <th className="py-3 px-3">Cleared Date</th>
                      <th className="py-3 px-3">Date</th>
                      <th className="py-3 px-3">Type</th>
                      <th className="py-3 px-3">Reference</th>
                      <th className="py-3 px-3">Party / Contact</th>
                      <th className="py-3 px-3">Description</th>
                      <th className="py-3 px-3 text-right">Debit / Deposit ({currency})</th>
                      <th className="py-3 px-3 text-right">Credit / Withdrawal ({currency})</th>
                      <th className="py-3 px-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-sans">
                    {loadingReconciliation ? (
                      <tr>
                        <td colSpan={10} className="py-12 text-center text-gray-400">
                          <RefreshCw size={20} className="animate-spin mx-auto mb-2 text-indigo-500" />
                          Loading ledger transactions...
                        </td>
                      </tr>
                    ) : !reconciliationData?.transactions || reconciliationData.transactions.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="py-12 text-center text-gray-400 italic">
                          No transactions found for this account.
                        </td>
                      </tr>
                    ) : (
                      reconciliationData.transactions.map((tx: any) => (
                        <tr
                          key={`${tx.type}-${tx.id}`}
                          className={cn(
                            "hover:bg-slate-50/70 transition-colors",
                            tx.cleared ? "bg-emerald-50/20" : ""
                          )}
                        >
                          <td className="py-2 px-4 text-center">
                            <input
                              type="checkbox"
                              checked={!!tx.cleared}
                              onChange={() => handleToggleCleared(tx)}
                              className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
                            />
                          </td>
                          <td className="py-2 px-3 text-gray-700 font-mono">
                            {tx.clearedDate || (tx.cleared ? tx.date : '—')}
                          </td>
                          <td className="py-2 px-3 text-gray-700 font-mono whitespace-nowrap">
                            {tx.date}
                          </td>
                          <td className="py-2 px-3 font-semibold text-slate-800">
                            {tx.type}
                          </td>
                          <td className="py-2 px-3 text-gray-600 font-mono">
                            {tx.reference || '—'}
                          </td>
                          <td className="py-2 px-3 text-gray-800 font-medium max-w-xs truncate" title={tx.contact}>
                            {tx.contact || '—'}
                          </td>
                          <td className="py-2 px-3 text-gray-600 max-w-xs truncate" title={tx.description}>
                            {tx.description || '—'}
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-emerald-700">
                            {tx.debit > 0 ? money(tx.debit) : '—'}
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-slate-800">
                            {tx.credit > 0 ? money(tx.credit) : '—'}
                          </td>
                          <td className="py-2 px-3 text-center">
                            {tx.cleared ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                <Check size={11} /> Cleared
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                                Uncleared
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Statement File Import & Auto Matching */}
        {activeTab === 'import' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-gray-200 shadow-xs p-6 flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Import Electronic Bank Statement</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Upload statement file (CSV or Excel) to automatically match against recorded receipts and payments.
                </p>
              </div>

              <div className="flex gap-2">
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv,.xls,.xlsx"
                  className="hidden"
                  onChange={(e) => importFile(e.target.files?.[0])}
                />
                <button
                  type="button"
                  disabled={busy || !selectedAccount}
                  onClick={() => fileRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                >
                  <Upload size={14} /> Upload Statement
                </button>
              </div>
            </div>

            {/* List of imported statements */}
            {statements.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {statements.map((s) => (
                  <button
                    key={s.id}
                    onClick={async () => setStatement(await apiService.getBankStatement(s.id))}
                    className={cn(
                      "px-3.5 py-1.5 rounded-full text-xs font-bold border transition-colors",
                      statement?.id === s.id
                        ? "bg-indigo-600 text-white border-indigo-600"
                        : "bg-white text-slate-600 border-gray-200 hover:bg-slate-50"
                    )}
                  >
                    {s.fileName} • {dateText(s.importedAt)} • {s.reconciledCount || 0}/{s.lineCount || 0}
                  </button>
                ))}
              </div>
            )}

            {statement && (
              <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center text-xs font-bold text-gray-600">
                  <span>Statement: {statement.fileName}</span>
                  <span>Lines: {statement.lines?.length || 0}</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 border-b border-gray-200 text-slate-500 font-bold uppercase text-[10px]">
                      <tr>
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3">Description</th>
                        <th className="py-2.5 px-3">Reference</th>
                        <th className="py-2.5 px-3 text-right">Debit</th>
                        <th className="py-2.5 px-3 text-right">Credit</th>
                        <th className="py-2.5 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {(statement.lines || []).map((line: any) => (
                        <tr key={line.id} className="hover:bg-slate-50">
                          <td className="py-2 px-3 font-mono">{dateText(line.date)}</td>
                          <td className="py-2 px-3">{line.description}</td>
                          <td className="py-2 px-3 font-mono text-gray-500">{line.reference || '—'}</td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-emerald-700">
                            {line.debit > 0 ? money(line.debit) : '—'}
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-slate-800">
                            {line.credit > 0 ? money(line.credit) : '—'}
                          </td>
                          <td className="py-2 px-3">
                            <span className={cn(
                              "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                              line.status === 'reconciled'
                                ? "bg-emerald-100 text-emerald-800"
                                : line.status === 'matched'
                                ? "bg-indigo-100 text-indigo-800"
                                : "bg-amber-100 text-amber-800"
                            )}>
                              {line.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default BankReconciliationView;
