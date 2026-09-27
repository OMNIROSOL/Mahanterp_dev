import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus } from 'lucide-react';
import apiService from '../services/apiService';
import Button from '../components/shared/Button';

type Item = {
  id: string;
  name: string;
  itemType: string;
  expenseAccountId?: string | null;
  liabilityAccountId?: string | null;
  inactive?: boolean;
};

const SECTIONS = [
  { type: 'earning', title: 'Earnings', hint: 'Debit an expense account. This raises gross pay and net pay.', needsExpense: true, needsLiability: false },
  { type: 'deduction', title: 'Deductions', hint: 'Credit a liability such as PAYE, NAPSA or NHIMA. This lowers net pay.', needsExpense: false, needsLiability: true },
  { type: 'contribution', title: 'Contributions', hint: 'Debit an expense and credit a liability. Employer cost. Net pay does not change.', needsExpense: true, needsLiability: true },
];

const blank = { name: '', expenseAccountId: '', liabilityAccountId: '' };

const SettingsPayslipItemsView = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<Item[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [drafts, setDrafts] = useState<Record<string, typeof blank>>({
    earning: { ...blank },
    deduction: { ...blank },
    contribution: { ...blank },
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const [rows, accs] = await Promise.all([apiService.getPayslipItems(), apiService.getAccounts()]);
    setItems(rows);
    setAccounts(accs);
  };

  useEffect(() => {
    load().catch((err) => setError(err?.response?.data?.error || err.message));
  }, []);

  const expenses = useMemo(() => accounts.filter((a) => /expense/i.test(a.accountType || '')), [accounts]);
  const liabilities = useMemo(() => accounts.filter((a) => /liability/i.test(a.accountType || '')), [accounts]);

  const accountName = (id?: string | null) => accounts.find((a) => a.id === id)?.name || '—';

  const add = async (type: string) => {
    const draft = drafts[type];
    if (!draft.name.trim()) return;
    setBusy(true);
    setError('');
    try {
      await apiService.createPayslipItem({
        name: draft.name.trim(),
        itemType: type,
        expenseAccountId: draft.expenseAccountId || null,
        liabilityAccountId: draft.liabilityAccountId || null,
      });
      setDrafts((prev) => ({ ...prev, [type]: { ...blank } }));
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.error || err.message);
    } finally {
      setBusy(false);
    }
  };

  const save = async (item: Item, patch: Partial<Item>) => {
    setError('');
    try {
      await apiService.updatePayslipItem(item.id, { ...item, ...patch });
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.error || err.message);
    }
  };

  return (
    <div className="h-full overflow-auto bg-slate-50">
      <div className="bg-white border-b border-slate-200 p-6">
        <button type="button" onClick={() => navigate('/settings')} className="text-sm font-semibold text-slate-500 hover:text-indigo-600 inline-flex items-center gap-1 mb-3">
          <ArrowLeft size={14} /> Settings
        </button>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Payslip items</h1>
        <p className="text-slate-500 text-sm mt-1">Earnings, deductions and employer contributions used on payslips. Accounts are posted in ZMW.</p>
      </div>
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        {error && <p className="text-sm font-semibold text-rose-600">{error}</p>}
        {SECTIONS.map((section) => (
          <section key={section.type} className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
              <h2 className="text-lg font-black text-slate-800">{section.title}</h2>
              <p className="text-sm text-slate-500 mt-1">{section.hint}</p>
            </div>
            <div className="divide-y divide-slate-100">
              {items.filter((item) => item.itemType === section.type).map((item) => (
                <div key={item.id} className="px-6 py-4 grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                  <input
                    defaultValue={item.name}
                    onBlur={(e) => e.target.value.trim() && e.target.value !== item.name && save(item, { name: e.target.value.trim() })}
                    className="md:col-span-3 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold text-slate-700"
                  />
                  {section.needsExpense && (
                    <select
                      value={item.expenseAccountId || ''}
                      onChange={(e) => save(item, { expenseAccountId: e.target.value || null })}
                      className="md:col-span-4 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700"
                    >
                      <option value="">Expense account</option>
                      {expenses.map((a) => <option key={a.id} value={a.id}>{a.code} — {a.name}</option>)}
                    </select>
                  )}
                  {section.needsLiability && (
                    <select
                      value={item.liabilityAccountId || ''}
                      onChange={(e) => save(item, { liabilityAccountId: e.target.value || null })}
                      className="md:col-span-4 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700"
                    >
                      <option value="">Liability account</option>
                      {liabilities.map((a) => <option key={a.id} value={a.id}>{a.code} — {a.name}</option>)}
                    </select>
                  )}
                  <label className="md:col-span-1 text-xs font-bold text-slate-500 flex items-center gap-2">
                    <input type="checkbox" checked={!!item.inactive} onChange={(e) => save(item, { inactive: e.target.checked })} />
                    Off
                  </label>
                  <p className="md:hidden text-[11px] text-slate-400">
                    {section.needsExpense && accountName(item.expenseAccountId)}
                    {section.needsLiability && ` · ${accountName(item.liabilityAccountId)}`}
                  </p>
                </div>
              ))}
            </div>
            <div className="px-6 py-4 bg-slate-50/70 grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
              <input
                value={drafts[section.type].name}
                onChange={(e) => setDrafts((prev) => ({ ...prev, [section.type]: { ...prev[section.type], name: e.target.value } }))}
                placeholder={`New ${section.title.toLowerCase()} item`}
                className="md:col-span-3 bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm"
              />
              {section.needsExpense && (
                <select
                  value={drafts[section.type].expenseAccountId}
                  onChange={(e) => setDrafts((prev) => ({ ...prev, [section.type]: { ...prev[section.type], expenseAccountId: e.target.value } }))}
                  className="md:col-span-4 bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm"
                >
                  <option value="">Expense account</option>
                  {expenses.map((a) => <option key={a.id} value={a.id}>{a.code} — {a.name}</option>)}
                </select>
              )}
              {section.needsLiability && (
                <select
                  value={drafts[section.type].liabilityAccountId}
                  onChange={(e) => setDrafts((prev) => ({ ...prev, [section.type]: { ...prev[section.type], liabilityAccountId: e.target.value } }))}
                  className="md:col-span-4 bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm"
                >
                  <option value="">Liability account</option>
                  {liabilities.map((a) => <option key={a.id} value={a.id}>{a.code} — {a.name}</option>)}
                </select>
              )}
              <Button type="button" variant="primary" disabled={busy} onClick={() => add(section.type)} className="md:col-span-1 h-10">
                <Plus size={14} />
              </Button>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
};

export default SettingsPayslipItemsView;
