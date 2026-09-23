import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, Landmark, Link2, Plus, Upload } from 'lucide-react';
import apiService from '../services/apiService';

const money = (n: number) =>
  Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const dateText = (v: any) => {
  if (!v) return '';
  const s = typeof v === 'string' ? v : new Date(v).toISOString();
  return s.slice(0, 10);
};

const statusClass = (status: string) => {
  if (status === 'reconciled') return 'bg-emerald-50 text-emerald-700';
  if (status === 'matched') return 'bg-indigo-50 text-indigo-700';
  return 'bg-amber-50 text-amber-700';
};

const BankReconciliationView = () => {
  const fileRef = useRef<HTMLInputElement>(null);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [accountId, setAccountId] = useState('');
  const [statements, setStatements] = useState<any[]>([]);
  const [statement, setStatement] = useState<any>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [receipts, setReceipts] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [matchPick, setMatchPick] = useState<Record<string, string>>({});

  const selectedAccount = accounts.find((a) => a.id === accountId);

  const loadAccounts = async () => {
    try {
      const rows = await apiService.getBankAccounts();
      setAccounts(rows || []);
      if (!accountId && rows?.[0]?.id) setAccountId(rows[0].id);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Could not load bank accounts.');
    }
  };

  const loadDocs = async () => {
    try {
      const [p, r] = await Promise.all([apiService.getPayments(), apiService.getReceipts()]);
      setPayments(p || []);
      setReceipts(r || []);
    } catch {
      /* list matching still works without live docs */
    }
  };

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
    loadDocs();
  }, []);

  useEffect(() => {
    if (selectedAccount?.name) {
      loadStatements(selectedAccount?.name).catch((err) => setError(err?.response?.data?.error || err.message));
    }
  }, [accountId, selectedAccount?.name]);

  const candidates = useMemo(() => {
    const name = selectedAccount?.name;
    return {
      payments: (payments || []).filter((p) => !name || p.paidFromAccount === name),
      receipts: (receipts || []).filter((r) => !name || r.receivedInAccount === name),
    };
  }, [payments, receipts, selectedAccount?.name]);

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

  const applyMatch = async (line: any, value: string) => {
    if (!value || !statement) return;
    const [type, id, reference] = value.split('|');
    setBusy(true);
    try {
      await apiService.matchBankStatementLine(line.id, {
        matchedType: type,
        matchedId: id,
        matchedReference: reference,
        status: 'matched',
      });
      await loadStatements(selectedAccount?.name, statement.id);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Match failed.');
    } finally {
      setBusy(false);
    }
  };

  const createDoc = async (line: any) => {
    setBusy(true);
    setError('');
    try {
      const created = await apiService.createFromBankStatementLine(line.id);
      setMessage(`Created ${created.type} ${created.document?.reference || ''}.`);
      await loadDocs();
      await loadStatements(selectedAccount?.name, statement.id);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Could not create document.');
    } finally {
      setBusy(false);
    }
  };

  const complete = async () => {
    if (!statement) return;
    setBusy(true);
    try {
      await apiService.completeBankStatement(statement.id);
      setMessage('Matched lines marked reconciled.');
      await loadStatements(selectedAccount?.name, statement.id);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Could not complete reconciliation.');
    } finally {
      setBusy(false);
    }
  };

  const lines = statement?.lines || [];
  const unmatched = lines.filter((l: any) => l.status === 'unmatched').length;
  const matched = lines.filter((l: any) => l.status === 'matched').length;
  const reconciled = lines.filter((l: any) => l.status === 'reconciled').length;

  return (
    <div className="p-8 max-w-[1400px] mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex items-start justify-between gap-6">
        <div>
          <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-2">Accounting</p>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Bank Reconciliation</h1>
          <p className="text-slate-500 text-sm mt-1">Import a CSV or Excel statement, match it to receipts and payments, then mark reconciled.</p>
        </div>
        <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
          <Landmark size={22} />
        </div>
      </div>

      <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm p-6 grid md:grid-cols-[1fr_auto] gap-4 items-end">
        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Bank or cash account</label>
          <select
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3 text-[13px] font-semibold text-slate-700"
          >
            {!accounts.length && <option value="">No payment accounts found</option>}
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>{a.name}{a.currency ? ` · ${a.currency}` : ''}</option>
            ))}
          </select>
        </div>
        <div className="flex gap-3">
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
            className="flex items-center gap-2 px-5 py-3 bg-indigo-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest disabled:opacity-50"
          >
            <Upload size={14} />
            Import statement
          </button>
          <button
            type="button"
            disabled={busy || !statement || matched === 0}
            onClick={complete}
            className="flex items-center gap-2 px-5 py-3 bg-white border border-slate-200 text-slate-600 rounded-2xl text-[11px] font-black uppercase tracking-widest disabled:opacity-50"
          >
            <CheckCircle2 size={14} />
            Mark matched as reconciled
          </button>
        </div>
      </div>

      {(error || message) && (
        <p className={`text-[13px] font-semibold ${error ? 'text-rose-600' : 'text-emerald-700'}`}>{error || message}</p>
      )}

      {!!statements.length && (
        <div className="flex flex-wrap gap-2">
          {statements.map((s) => (
            <button
              key={s.id}
              onClick={async () => setStatement(await apiService.getBankStatement(s.id))}
              className={`px-4 py-2 rounded-full text-[11px] font-bold border ${statement?.id === s.id ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-500 border-slate-200'}`}
            >
              {s.fileName} · {dateText(s.importedAt)} · {s.reconciledCount || 0}/{s.lineCount || 0}
            </button>
          ))}
        </div>
      )}

      {statement && (
        <div className="bg-white rounded-[32px] border border-slate-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-50 flex gap-6 text-[12px] font-bold text-slate-500">
            <span>{unmatched} unmatched</span>
            <span>{matched} matched</span>
            <span>{reconciled} reconciled</span>
          </div>
          <table className="w-full text-[13px]">
            <thead className="bg-slate-50 text-[10px] uppercase tracking-widest text-slate-400">
              <tr>
                <th className="text-left px-6 py-3 font-black">Date</th>
                <th className="text-left px-4 py-3 font-black">Description</th>
                <th className="text-right px-4 py-3 font-black">Amount</th>
                <th className="text-left px-4 py-3 font-black">Status</th>
                <th className="text-left px-6 py-3 font-black">Match</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line: any) => {
                const amt = Number(line.amount || 0);
                const options = amt < 0 ? candidates.payments : candidates.receipts;
                return (
                  <tr key={line.id} className="border-t border-slate-50">
                    <td className="px-6 py-3 font-semibold text-slate-600 whitespace-nowrap">{dateText(line.date)}</td>
                    <td className="px-4 py-3 text-slate-700">
                      <p className="font-semibold">{line.description || '—'}</p>
                      {line.reference && <p className="text-[11px] text-slate-400">{line.reference}</p>}
                    </td>
                    <td className={`px-4 py-3 text-right font-black ${amt < 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                      {amt < 0 ? '-' : ''}{money(Math.abs(amt))}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${statusClass(line.status)}`}>
                        {line.status}
                      </span>
                      {line.matchedReference && (
                        <p className="text-[11px] text-slate-400 mt-1">{line.matchedType} {line.matchedReference}</p>
                      )}
                    </td>
                    <td className="px-6 py-3">
                      {line.status === 'reconciled' ? (
                        <span className="text-slate-400 text-[12px]">Done</span>
                      ) : (
                        <div className="flex flex-wrap gap-2 items-center">
                          <select
                            value={matchPick[line.id] || ''}
                            onChange={(e) => setMatchPick((prev) => ({ ...prev, [line.id]: e.target.value }))}
                            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-[12px] min-w-[180px]"
                          >
                            <option value="">Select {amt < 0 ? 'payment' : 'receipt'}</option>
                            {options.map((doc: any) => (
                              <option key={doc.id} value={`${amt < 0 ? 'payment' : 'receipt'}|${doc.id}|${doc.reference}`}>
                                {doc.reference} · {money(Number(doc.amount))} · {dateText(doc.date)}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            disabled={busy || !matchPick[line.id]}
                            onClick={() => applyMatch(line, matchPick[line.id])}
                            className="px-3 py-2 rounded-xl bg-indigo-50 text-indigo-700 text-[10px] font-black uppercase tracking-widest disabled:opacity-40"
                          >
                            <span className="inline-flex items-center gap-1"><Link2 size={12} /> Match</span>
                          </button>
                          {line.status === 'unmatched' && (
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => createDoc(line)}
                              className="px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-600 text-[10px] font-black uppercase tracking-widest"
                            >
                              <span className="inline-flex items-center gap-1"><Plus size={12} /> Create {amt < 0 ? 'payment' : 'receipt'}</span>
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
              {!lines.length && (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-slate-400">No statement lines yet. Import a CSV with Date, Description and Amount (or Debit/Credit).</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default BankReconciliationView;
