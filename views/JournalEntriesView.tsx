import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, BookOpen, Trash2, Edit3, Eye, Copy, ArrowUpDown, ChevronDown, ChevronUp } from 'lucide-react';
import apiService from '../services/apiService';
import RowActions from '../components/shared/RowActions';
import { cn } from '../utils/cn';

interface JournalEntryLine {
    id: string;
    accountId: string;
    description?: string;
    debit: number;
    credit: number;
    account?: {
        id: string;
        code: string;
        name: string;
    };
}

interface JournalEntry {
    id: string;
    reference: string;
    date: string;
    description?: string;
    currency?: string;
    exchangeRate?: number;
    totalDebit: number;
    totalCredit: number;
    createdAt?: string;
    lines: JournalEntryLine[];
}

const JournalEntriesView = () => {
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const [entries, setEntries] = useState<JournalEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadEntries();
    }, []);

    const loadEntries = async () => {
        setIsLoading(true);
        try {
            const data = await apiService.getJournalEntries();
            setEntries(data || []);
        } catch (error) {
            console.error('Failed to load journal entries:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (id: string, ref: string) => {
        if (!window.confirm(`Are you sure you want to delete journal entry ${ref}? This will reverse its general ledger impact.`)) {
            return;
        }
        try {
            await apiService.deleteJournalEntry(id);
            setEntries(prev => prev.filter(e => e.id !== id));
        } catch (err: any) {
            alert(err?.response?.data?.error || 'Failed to delete journal entry');
        }
    };

    const filteredEntries = useMemo(() => {
        const query = searchQuery.toLowerCase();
        return entries.filter(e =>
            e.reference?.toLowerCase().includes(query) ||
            e.description?.toLowerCase().includes(query) ||
            e.lines?.some(l => l.account?.name.toLowerCase().includes(query) || l.description?.toLowerCase().includes(query))
        );
    }, [entries, searchQuery]);

    const totalDebits = useMemo(() => {
        return filteredEntries.reduce((sum, e) => sum + (Number(e.totalDebit) || 0), 0);
    }, [filteredEntries]);

    const totalCredits = useMemo(() => {
        return filteredEntries.reduce((sum, e) => sum + (Number(e.totalCredit) || 0), 0);
    }, [filteredEntries]);

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return '—';
        const d = new Date(dateStr);
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return `${day}.${month}.${year}`;
    };

    return (
        <div className="flex flex-col h-full bg-slate-50/50">
            {/* Header */}
            <div className="flex-none bg-white border-b border-slate-200/50 sticky top-0 z-10 p-6 md:p-8 pt-20 shadow-sm">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 max-w-7xl mx-auto">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 rounded-[14px] bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-sm">
                                <BookOpen size={20} strokeWidth={2.5} />
                            </div>
                            <h1 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight">Journal Entries</h1>
                        </div>
                        <p className="text-[13px] font-bold text-slate-500 max-w-xl">
                            Multi-line double-entry journal adjustments impacting the General Ledger and Trial Balance.
                        </p>
                    </div>

                    <div className="flex items-center gap-4 w-full md:w-auto">
                        <div className="relative flex-1 md:w-80 group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
                            <input
                                type="text"
                                placeholder="Search reference, account, memo..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-11 pr-4 py-3.5 bg-white border-2 border-slate-200/60 rounded-2xl text-[13px] font-bold text-slate-700 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-sm placeholder:text-slate-400"
                            />
                        </div>

                        <button
                            onClick={() => navigate('/journal-entries/new')}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3.5 rounded-2xl text-[13px] font-black tracking-widest uppercase transition-all shadow-lg shadow-indigo-600/20 hover:shadow-indigo-600/40 hover:-translate-y-0.5 active:translate-y-0 flex items-center gap-2 whitespace-nowrap border-b-4 border-indigo-800"
                        >
                            <Plus size={16} /> New Journal Entry
                        </button>
                    </div>
                </div>
            </div>

            {/* Content Table */}
            <div className="flex-1 overflow-auto p-6 md:p-8">
                <div className="max-w-7xl mx-auto bg-white rounded-3xl border border-slate-200/60 shadow-xl shadow-slate-200/20 overflow-hidden">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/80 border-b border-slate-200">
                                <th className="px-6 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Date</th>
                                <th className="px-6 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Reference</th>
                                <th className="px-6 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Description</th>
                                <th className="px-6 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Accounts / Lines</th>
                                <th className="px-6 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap text-right">Debit (ZMW)</th>
                                <th className="px-6 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap text-right">Credit (ZMW)</th>
                                <th className="px-6 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap text-center">Status</th>
                                <th className="px-6 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={8} className="text-center py-12 text-slate-500 font-bold text-sm">
                                        Loading journal entries...
                                    </td>
                                </tr>
                            ) : filteredEntries.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="text-center py-12 text-slate-500 font-bold text-sm">
                                        No journal entries found. Click "New Journal Entry" to create one.
                                    </td>
                                </tr>
                            ) : (
                                filteredEntries.map((entry) => (
                                    <tr
                                        key={entry.id}
                                        className="hover:bg-slate-50/60 transition-colors group cursor-pointer"
                                        onClick={() => navigate(`/journal-entries/view/${entry.id}`)}
                                    >
                                        <td className="px-6 py-4 whitespace-nowrap text-[13px] font-bold text-slate-600">
                                            {formatDate(entry.date)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="text-[13px] font-black text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md">
                                                {entry.reference}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 max-w-xs truncate text-[13px] font-semibold text-slate-700">
                                            {entry.description || '—'}
                                        </td>
                                        <td className="px-6 py-4 text-[12px] text-slate-500 max-w-sm">
                                            <div className="flex flex-wrap gap-1">
                                                {entry.lines?.slice(0, 3).map((l, idx) => (
                                                    <span key={idx} className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[11px] font-semibold truncate">
                                                        {l.account?.name || 'Account'}
                                                    </span>
                                                ))}
                                                {entry.lines?.length > 3 && (
                                                    <span className="text-[10px] text-slate-400 font-black self-center">
                                                        +{entry.lines.length - 3} more
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-[13px] font-black text-slate-900 tabular-nums">
                                            {Number(entry.totalDebit || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-[13px] font-black text-slate-900 tabular-nums">
                                            {Number(entry.totalCredit || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center">
                                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-600 border border-emerald-100">
                                                Posted
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right" onClick={(e) => e.stopPropagation()}>
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => navigate(`/journal-entries/view/${entry.id}`)}
                                                    className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-indigo-600 rounded-lg transition-colors"
                                                    title="View"
                                                >
                                                    <Eye size={16} />
                                                </button>
                                                <button
                                                    onClick={() => navigate(`/journal-entries/edit/${entry.id}`)}
                                                    className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-indigo-600 rounded-lg transition-colors"
                                                    title="Edit"
                                                >
                                                    <Edit3 size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(entry.id, entry.reference)}
                                                    className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
                                                    title="Delete"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                        {!isLoading && filteredEntries.length > 0 && (
                            <tfoot className="bg-slate-50/80 border-t-2 border-slate-200">
                                <tr>
                                    <td colSpan={4} className="px-6 py-4 text-right text-[11px] font-black text-slate-400 uppercase tracking-widest">
                                        Grand Totals:
                                    </td>
                                    <td className="px-6 py-4 text-right whitespace-nowrap">
                                        <span className="text-[14px] font-black text-slate-900 tabular-nums underline decoration-slate-300 decoration-2 underline-offset-4">
                                            {totalDebits.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right whitespace-nowrap">
                                        <span className="text-[14px] font-black text-slate-900 tabular-nums underline decoration-slate-300 decoration-2 underline-offset-4">
                                            {totalCredits.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </span>
                                    </td>
                                    <td colSpan={2}></td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>
            </div>
        </div>
    );
};

export default JournalEntriesView;
