import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Printer, Edit3, Trash2, BookOpen } from 'lucide-react';
import apiService from '../services/apiService';
import { BASE_CURRENCY } from '../utils/currency';

const ViewJournalEntryView = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const [entry, setEntry] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        load();
    }, [id]);

    const load = async () => {
        setIsLoading(true);
        try {
            if (id) {
                const data = await apiService.getJournalEntry(id);
                setEntry(data);
            }
        } catch (err) {
            console.error('Failed to load journal entry:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!entry) return;
        if (!window.confirm(`Are you sure you want to delete journal entry ${entry.reference}? This will reverse all ledger entries.`)) {
            return;
        }
        try {
            await apiService.deleteJournalEntry(entry.id);
            navigate('/journal-entries');
        } catch (err: any) {
            alert(err?.response?.data?.error || 'Failed to delete journal entry');
        }
    };

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return '—';
        const d = new Date(dateStr);
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return `${day}.${month}.${year}`;
    };

    if (isLoading) return <div className="p-12 text-center text-slate-500 font-bold">Loading journal entry...</div>;
    if (!entry) return <div className="p-12 text-center text-slate-500 font-bold">Journal entry not found.</div>;

    return (
        <div className="flex flex-col h-full bg-slate-50/50">
            {/* Top Bar */}
            <div className="flex-none bg-white border-b border-slate-200/50 sticky top-0 z-10 p-6 shadow-sm print:hidden">
                <div className="flex items-center justify-between max-w-4xl mx-auto">
                    <div className="flex items-center gap-4">
                        <button onClick={() => navigate('/journal-entries')} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                            <ArrowLeft size={20} className="text-slate-500" />
                        </button>
                        <div>
                            <h1 className="text-xl font-black text-slate-800 tracking-tight">
                                Journal Entry {entry.reference}
                            </h1>
                            <p className="text-xs text-slate-400 font-bold">Posted to General Ledger</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => window.print()}
                            className="bg-white hover:bg-slate-50 text-slate-700 border-2 border-slate-200 px-5 py-2.5 rounded-xl text-[12px] font-black tracking-widest uppercase transition-all flex items-center gap-2"
                        >
                            <Printer size={15} /> Print
                        </button>
                        <button
                            onClick={() => navigate(`/journal-entries/edit/${entry.id}`)}
                            className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-5 py-2.5 rounded-xl text-[12px] font-black tracking-widest uppercase transition-all flex items-center gap-2"
                        >
                            <Edit3 size={15} /> Edit
                        </button>
                        <button
                            onClick={handleDelete}
                            className="bg-rose-50 hover:bg-rose-100 text-rose-600 px-5 py-2.5 rounded-xl text-[12px] font-black tracking-widest uppercase transition-all flex items-center gap-2"
                        >
                            <Trash2 size={15} /> Delete
                        </button>
                    </div>
                </div>
            </div>

            {/* Document Body */}
            <div className="flex-1 overflow-auto p-6 md:p-8">
                <div className="max-w-4xl mx-auto bg-white rounded-3xl border border-slate-200/60 shadow-xl shadow-slate-200/20 p-10 md:p-14 print:border-none print:shadow-none print:p-0">
                    <div className="flex justify-between items-start mb-10 pb-8 border-b border-slate-100">
                        <div>
                            <span className="text-[11px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 px-3 py-1 rounded-md">
                                General Journal
                            </span>
                            <h2 className="text-3xl font-black text-slate-900 tracking-tight mt-3">
                                {entry.reference}
                            </h2>
                            {entry.description && (
                                <p className="text-sm font-semibold text-slate-600 mt-2 max-w-lg">
                                    {entry.description}
                                </p>
                            )}
                        </div>
                        <div className="text-right">
                            <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3 ml-auto">
                                <BookOpen size={26} strokeWidth={2.5} />
                            </div>
                            <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Date</p>
                            <p className="text-sm font-black text-slate-800">{formatDate(entry.date)}</p>
                            <span className="inline-block mt-2 px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-600 border border-emerald-100">
                                Balanced & Posted
                            </span>
                        </div>
                    </div>

                    {/* Lines Table */}
                    <div className="overflow-hidden border border-slate-200 rounded-2xl mb-10">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-200">
                                    <th className="px-5 py-3 w-12 text-center">#</th>
                                    <th className="px-5 py-3">Account</th>
                                    <th className="px-5 py-3">Description</th>
                                    <th className="px-5 py-3 text-right">Debit ({BASE_CURRENCY})</th>
                                    <th className="px-5 py-3 text-right">Credit ({BASE_CURRENCY})</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {entry.lines?.map((line: any, idx: number) => (
                                    <tr key={line.id} className="text-[13px]">
                                        <td className="px-5 py-3.5 text-center text-xs font-bold text-slate-400">
                                            {idx + 1}
                                        </td>
                                        <td className="px-5 py-3.5 font-bold text-slate-800">
                                            {line.account?.code ? `${line.account.code} - ` : ''}{line.account?.name || 'Account'}
                                        </td>
                                        <td className="px-5 py-3.5 text-slate-600">
                                            {line.description || '—'}
                                        </td>
                                        <td className="px-5 py-3.5 text-right font-black text-slate-900 tabular-nums">
                                            {Number(line.debit || 0) > 0
                                                ? Number(line.debit).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                                                : '—'}
                                        </td>
                                        <td className="px-5 py-3.5 text-right font-black text-slate-900 tabular-nums">
                                            {Number(line.credit || 0) > 0
                                                ? Number(line.credit).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                                                : '—'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot className="bg-slate-50 border-t-2 border-slate-200">
                                <tr>
                                    <td colSpan={3} className="px-5 py-3.5 text-right text-[11px] font-black text-slate-400 uppercase tracking-widest">
                                        Total
                                    </td>
                                    <td className="px-5 py-3.5 text-right font-black text-sm text-slate-900 tabular-nums">
                                        {Number(entry.totalDebit || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </td>
                                    <td className="px-5 py-3.5 text-right font-black text-sm text-slate-900 tabular-nums">
                                        {Number(entry.totalCredit || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ViewJournalEntryView;
