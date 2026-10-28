import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Plus, Trash2, BookOpen, CheckCircle2, AlertTriangle, Paperclip, X } from 'lucide-react';
import apiService from '../services/apiService';
import { SearchableSelect } from '../components/shared/SearchableSelect';
import { BASE_CURRENCY, currencyCode } from '../utils/currency';

interface LineItem {
    id: string | number;
    accountId: string;
    description: string;
    debit: string;
    credit: string;
    currency: string;
    exchangeRate: string;
}

const NewJournalEntryView = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const isEdit = Boolean(id);

    const [accounts, setAccounts] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [reference, setReference] = useState('');
    const [useManualRef, setUseManualRef] = useState(false);
    const [description, setDescription] = useState('');
    const [lines, setLines] = useState<LineItem[]>([
        { id: Date.now() + 1, accountId: '', description: '', debit: '', credit: '', currency: 'ZMW', exchangeRate: '1.0' },
        { id: Date.now() + 2, accountId: '', description: '', debit: '', credit: '', currency: 'ZMW', exchangeRate: '1.0' },
    ]);
    const [attachment, setAttachment] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const accs = await apiService.getAccounts();
            const activeAccs = accs.filter((a: any) => !a.inactive);
            setAccounts(activeAccs.length ? activeAccs : accs);

            if (isEdit && id) {
                const entry = await apiService.getJournalEntry(id);
                if (entry) {
                    setDate(entry.date ? entry.date.split('T')[0] : '');
                    setReference(entry.reference || '');
                    setUseManualRef(true);
                    setDescription(entry.description || '');
                    if (entry.lines && entry.lines.length) {
                        setLines(entry.lines.map((l: any) => ({
                            id: l.id || Math.random(),
                            accountId: l.accountId || '',
                            description: l.description || '',
                            debit: l.foreignDebit ? String(l.foreignDebit) : (l.debit ? String(l.debit) : ''),
                            credit: l.foreignCredit ? String(l.foreignCredit) : (l.credit ? String(l.credit) : ''),
                            currency: l.currency || 'ZMW',
                            exchangeRate: String(l.exchangeRate || '1.0'),
                        })));
                    }
                }
            } else {
                const nextRef = await apiService.getNextReference('journal-entry').catch(() => 'JE-0001');
                setReference(nextRef || 'JE-0001');
            }
        } catch (err) {
            console.error('Failed to load accounts/entry:', err);
        }
    };

    const addLine = () => {
        setLines(prev => [
            ...prev,
            { id: Date.now() + Math.random(), accountId: '', description: '', debit: '', credit: '', currency: 'ZMW', exchangeRate: '1.0' }
        ]);
    };

    const removeLine = (idx: number) => {
        if (lines.length <= 2) {
            alert('A journal entry must contain at least 2 lines.');
            return;
        }
        setLines(prev => prev.filter((_, i) => i !== idx));
    };

    const updateLine = (idx: number, patch: Partial<LineItem>) => {
        setLines(prev => prev.map((l, i) => i === idx ? { ...l, ...patch } : l));
    };

    // Calculate line base amounts and totals
    const lineCalcs = useMemo(() => {
        let totalDebit = 0;
        let totalCredit = 0;

        const calculated = lines.map(line => {
            const rate = parseFloat(line.exchangeRate) || 1;
            const rawDebit = parseFloat(line.debit) || 0;
            const rawCredit = parseFloat(line.credit) || 0;
            const baseDebit = line.currency !== 'ZMW' ? Math.round(rawDebit * rate * 100) / 100 : rawDebit;
            const baseCredit = line.currency !== 'ZMW' ? Math.round(rawCredit * rate * 100) / 100 : rawCredit;

            totalDebit += baseDebit;
            totalCredit += baseCredit;

            return {
                baseDebit,
                baseCredit,
            };
        });

        totalDebit = Math.round(totalDebit * 100) / 100;
        totalCredit = Math.round(totalCredit * 100) / 100;
        const diff = Math.round(Math.abs(totalDebit - totalCredit) * 100) / 100;
        const isBalanced = diff < 0.01 && (totalDebit > 0 || totalCredit > 0);

        return {
            calculated,
            totalDebit,
            totalCredit,
            diff,
            isBalanced
        };
    }, [lines]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validation
        if (!reference) {
            alert('Reference is required');
            return;
        }

        const validLines = lines.filter(l => l.accountId && (parseFloat(l.debit) > 0 || parseFloat(l.credit) > 0));
        if (validLines.length < 2) {
            alert('Please enter at least 2 complete lines with accounts and amounts.');
            return;
        }

        if (!lineCalcs.isBalanced) {
            alert(`Journal Entry is out of balance by ${BASE_CURRENCY} ${lineCalcs.diff.toFixed(2)}. Total Debits (${lineCalcs.totalDebit.toFixed(2)}) must equal Total Credits (${lineCalcs.totalCredit.toFixed(2)}).`);
            return;
        }

        setIsLoading(true);
        try {
            const payload = {
                reference,
                date,
                description,
                currency: 'ZMW',
                exchangeRate: 1,
                lines: validLines.map(l => ({
                    accountId: l.accountId,
                    description: l.description,
                    debit: parseFloat(l.debit) || 0,
                    credit: parseFloat(l.credit) || 0,
                    currency: l.currency || 'ZMW',
                    exchangeRate: parseFloat(l.exchangeRate) || 1,
                }))
            };

            let savedId = id;
            if (isEdit && id) {
                await apiService.updateJournalEntry(id, payload);
            } else {
                const res = await apiService.createJournalEntry(payload);
                savedId = res?.id;
            }

            // Upload attachment if present
            if (attachment && savedId) {
                try {
                    await apiService.uploadAttachment('journal-entry', savedId, attachment);
                } catch (attErr) {
                    console.error('Attachment upload error:', attErr);
                }
            }

            navigate('/journal-entries');
        } catch (err: any) {
            console.error('Failed to save journal entry:', err);
            alert(err?.response?.data?.error || 'Failed to save journal entry');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-slate-50/50">
            {/* Header */}
            <div className="flex-none bg-white border-b border-slate-200/50 sticky top-0 z-10 p-6 shadow-sm">
                <div className="flex items-center justify-between max-w-6xl mx-auto">
                    <div className="flex items-center gap-4">
                        <button onClick={() => navigate('/journal-entries')} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                            <ArrowLeft size={20} className="text-slate-500" />
                        </button>
                        <div>
                            <h1 className="text-2xl font-black text-slate-800 tracking-tight">
                                {isEdit ? 'Edit Journal Entry' : 'New Journal Entry'}
                            </h1>
                            <p className="text-xs text-slate-400 font-bold">Standard general journal posting with debits and credits</p>
                        </div>
                    </div>
                    <button
                        onClick={handleSave}
                        disabled={isLoading || !lineCalcs.isBalanced}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-7 py-2.5 rounded-xl text-[13px] font-black tracking-widest uppercase transition-all shadow-md disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        <Save size={16} /> {isLoading ? 'Saving...' : 'Save & Post'}
                    </button>
                </div>
            </div>

            {/* Form */}
            <div className="flex-1 overflow-auto p-6">
                <div className="max-w-6xl mx-auto space-y-6">
                    <form onSubmit={handleSave} className="bg-white rounded-3xl border border-slate-200/60 shadow-xl shadow-slate-200/20 p-8 space-y-8">
                        {/* Header Details */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div>
                                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">Posting Date</label>
                                <input
                                    type="date"
                                    required
                                    value={date}
                                    onChange={e => setDate(e.target.value)}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-[13px] font-bold text-slate-700 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                                />
                            </div>
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest">Reference</label>
                                    <label className="text-[10px] font-bold text-indigo-600 flex items-center gap-1 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={useManualRef}
                                            onChange={e => setUseManualRef(e.target.checked)}
                                            className="rounded text-indigo-600"
                                        />
                                        Manual
                                    </label>
                                </div>
                                <input
                                    type="text"
                                    required
                                    readOnly={!useManualRef}
                                    value={reference}
                                    onChange={e => setReference(e.target.value)}
                                    className={`w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-[13px] font-bold ${!useManualRef ? 'text-indigo-600 bg-slate-100 font-black' : 'text-slate-700'} focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all`}
                                />
                            </div>
                            <div>
                                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">Overall Narration / Memo</label>
                                <input
                                    type="text"
                                    placeholder="Explanation of journal adjustment..."
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-[13px] font-bold text-slate-700 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                                />
                            </div>
                        </div>

                        {/* Dr/Cr Grid */}
                        <div className="space-y-4 pt-4 border-t border-slate-100">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Journal Lines</h3>
                                <button
                                    type="button"
                                    onClick={addLine}
                                    className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-[11px] font-black uppercase tracking-wider hover:bg-indigo-100 transition-all"
                                >
                                    <Plus size={14} /> Add Line
                                </button>
                            </div>

                            <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-200">
                                            <th className="px-4 py-3 w-12 text-center">#</th>
                                            <th className="px-4 py-3 min-w-[240px]">Account</th>
                                            <th className="px-4 py-3 min-w-[200px]">Description</th>
                                            <th className="px-4 py-3 w-28">Currency</th>
                                            <th className="px-4 py-3 w-36 text-right">Debit</th>
                                            <th className="px-4 py-3 w-36 text-right">Credit</th>
                                            <th className="px-4 py-3 w-12"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {lines.map((line, idx) => (
                                            <tr key={line.id} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="px-4 py-3 text-center text-xs font-bold text-slate-400">
                                                    {idx + 1}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <select
                                                        required
                                                        value={line.accountId}
                                                        onChange={e => updateLine(idx, { accountId: e.target.value })}
                                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-[12px] font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer"
                                                    >
                                                        <option value="">Select account...</option>
                                                        {accounts.map(a => (
                                                            <option key={a.id} value={a.id}>
                                                                {a.code ? `${a.code} - ` : ''}{a.name} ({a.accountType || a.type})
                                                            </option>
                                                        ))}
                                                    </select>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <input
                                                        type="text"
                                                        placeholder="Line narration..."
                                                        value={line.description}
                                                        onChange={e => updateLine(idx, { description: e.target.value })}
                                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-[12px] font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                                    />
                                                </td>
                                                <td className="px-4 py-3">
                                                    <select
                                                        value={line.currency}
                                                        onChange={e => updateLine(idx, { currency: e.target.value })}
                                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-[11px] font-black text-slate-600 outline-none cursor-pointer"
                                                    >
                                                        <option value="ZMW">ZMW</option>
                                                        <option value="USD">USD</option>
                                                        <option value="EUR">EUR</option>
                                                        <option value="GBP">GBP</option>
                                                        <option value="ZAR">ZAR</option>
                                                    </select>
                                                    {line.currency !== 'ZMW' && (
                                                        <input
                                                            type="number"
                                                            step="0.0001"
                                                            placeholder="FX Rate"
                                                            value={line.exchangeRate}
                                                            onChange={e => updateLine(idx, { exchangeRate: e.target.value })}
                                                            className="w-full mt-1 bg-white border border-slate-200 rounded-lg px-2 py-1 text-[10px] font-bold text-slate-700 outline-none"
                                                            title={`1 ${line.currency} = ___ ZMW`}
                                                        />
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        min="0"
                                                        placeholder="0.00"
                                                        value={line.debit}
                                                        onChange={e => {
                                                            const val = e.target.value;
                                                            updateLine(idx, { debit: val, credit: val ? '' : line.credit });
                                                        }}
                                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-[13px] font-black text-right text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                                    />
                                                    {line.currency !== 'ZMW' && parseFloat(line.debit) > 0 && (
                                                        <div className="text-[10px] font-bold text-slate-400 mt-0.5">
                                                            ZMW {lineCalcs.calculated[idx]?.baseDebit.toFixed(2)}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        min="0"
                                                        placeholder="0.00"
                                                        value={line.credit}
                                                        onChange={e => {
                                                            const val = e.target.value;
                                                            updateLine(idx, { credit: val, debit: val ? '' : line.debit });
                                                        }}
                                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-[13px] font-black text-right text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                                    />
                                                    {line.currency !== 'ZMW' && parseFloat(line.credit) > 0 && (
                                                        <div className="text-[10px] font-bold text-slate-400 mt-0.5">
                                                            ZMW {lineCalcs.calculated[idx]?.baseCredit.toFixed(2)}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <button
                                                        type="button"
                                                        onClick={() => removeLine(idx)}
                                                        className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                                                        title="Delete row"
                                                    >
                                                        <Trash2 size={15} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot className="bg-slate-50/80 border-t-2 border-slate-200">
                                        <tr>
                                            <td colSpan={4} className="px-4 py-3 text-right text-[11px] font-black text-slate-400 uppercase tracking-widest">
                                                Totals (ZMW Base Equivalent):
                                            </td>
                                            <td className="px-4 py-3 text-right font-black text-sm text-slate-900 tabular-nums">
                                                {lineCalcs.totalDebit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </td>
                                            <td className="px-4 py-3 text-right font-black text-sm text-slate-900 tabular-nums">
                                                {lineCalcs.totalCredit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </td>
                                            <td></td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>

                        {/* Live Balance Checker Banner */}
                        <div className={`p-5 rounded-2xl border transition-all flex items-center justify-between ${
                            lineCalcs.isBalanced
                                ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                                : 'bg-rose-50/70 border-rose-200 text-rose-900'
                        }`}>
                            <div className="flex items-center gap-3">
                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-white ${
                                    lineCalcs.isBalanced ? 'bg-emerald-600' : 'bg-rose-600'
                                }`}>
                                    {lineCalcs.isBalanced ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
                                </div>
                                <div>
                                    <p className="text-[12px] font-black uppercase tracking-wider">
                                        {lineCalcs.isBalanced ? 'Journal Entry is Balanced' : 'Out of Balance'}
                                    </p>
                                    <p className="text-xs font-semibold opacity-80">
                                        {lineCalcs.isBalanced
                                            ? `Total Debit = Total Credit = ${BASE_CURRENCY} ${lineCalcs.totalDebit.toFixed(2)}`
                                            : `Difference: ${BASE_CURRENCY} ${lineCalcs.diff.toFixed(2)} (Debits: ${lineCalcs.totalDebit.toFixed(2)} / Credits: ${lineCalcs.totalCredit.toFixed(2)})`}
                                    </p>
                                </div>
                            </div>
                            {!lineCalcs.isBalanced && (
                                <span className="text-[11px] font-bold uppercase tracking-wider bg-rose-100 text-rose-700 px-3 py-1 rounded-lg">
                                    Debits must equal credits
                                </span>
                            )}
                        </div>

                        {/* Attachment Upload */}
                        <div className="pt-4 border-t border-slate-100">
                            <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">Supporting Document Attachment</label>
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={e => setAttachment(e.target.files?.[0] || null)}
                                className="hidden"
                            />
                            {attachment ? (
                                <div className="inline-flex items-center gap-3 bg-slate-100 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-700">
                                    <Paperclip size={14} className="text-indigo-600" />
                                    <span>{attachment.name}</span>
                                    <button
                                        type="button"
                                        onClick={() => setAttachment(null)}
                                        className="text-slate-400 hover:text-rose-500"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 transition-all"
                                >
                                    <Paperclip size={14} /> Choose Supporting File...
                                </button>
                            )}
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default NewJournalEntryView;
