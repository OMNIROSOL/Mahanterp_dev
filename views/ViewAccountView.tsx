import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import apiService from '../services/apiService';
import { Account } from '../types';
import { currencyCode, isBaseCurrency, BASE_CURRENCY } from '../utils/currency';
import { formatDateDMY } from '../utils/dateUtils';
import { Search, Calendar, Eye, Edit2, Filter, RotateCcw, Printer, ChevronLeft, ArrowRightLeft } from 'lucide-react';

const formatMoney = (val: number, ccy = BASE_CURRENCY) => {
    if (val === undefined || val === null) return '-';
    return `${ccy} ${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const ViewAccountView = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [account, setAccount] = useState<Account | null>(null);
    const [entries, setEntries] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');

    const fetchAccount = async (from?: string, to?: string) => {
        setIsLoading(true);
        try {
            const data = await apiService.getAccountLedger(id!, { from, to });
            setAccount(data.account);
            setEntries(data.entries || []);
        } catch (err) {
            console.error('Failed to fetch account:', err);
            try {
                const fallback = await apiService.getAccount(id!);
                setAccount(fallback);
            } catch {}
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (id) fetchAccount();
    }, [id]);

    const handleApplyDateFilter = (e: React.FormEvent) => {
        e.preventDefault();
        fetchAccount(fromDate || undefined, toDate || undefined);
    };

    const handleResetDateFilter = () => {
        setFromDate('');
        setToDate('');
        fetchAccount();
    };

    const filteredEntries = useMemo(() => {
        if (!searchTerm.trim()) return entries;
        const q = searchTerm.toLowerCase();
        return entries.filter(e => 
            (e.transactionType || '').toLowerCase().includes(q) ||
            (e.contraAccount || '').toLowerCase().includes(q) ||
            (e.sourceDocumentId || '').toLowerCase().includes(q)
        );
    }, [entries, searchTerm]);

    if (isLoading && !account) {
        return (
            <div className="flex flex-col items-center justify-center py-40 space-y-4">
                <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-600 rounded-full animate-spin"></div>
                <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Loading Account Ledger...</p>
            </div>
        );
    }

    if (!account) return <div className="p-8 text-center text-gray-500 font-black uppercase tracking-widest">Account not found.</div>;

    const isForeign = !isBaseCurrency(account.currency);
    const accCurrency = currencyCode(account.currency);

    return (
        <div className="bg-slate-100 min-h-full flex flex-col font-sans">
            {/* Breadcrumb Navigation */}
            <div className="bg-white px-6 py-2.5 border-b border-gray-200 flex items-center text-[11px] font-bold text-gray-500 uppercase tracking-widest space-x-1.5 select-none no-print shadow-xs">
                <Link to="/accounts" className="text-blue-600 hover:text-blue-800 transition-colors flex items-center gap-1">
                    <ChevronLeft size={13} /> Chart of Accounts
                </Link>
                <span className="text-gray-300">/</span>
                <span className="text-slate-700 font-black">{account.name}</span>
            </div>

            {/* Action Bar */}
            <div className="bg-slate-50 px-6 py-3 border-b border-gray-200 flex items-center justify-between no-print shadow-xs">
                <div className="flex items-center space-x-3">
                    <button 
                        onClick={() => navigate(`/accounts/edit/${account.id}`)} 
                        className="bg-white border border-gray-300 px-4 py-1.5 text-[12px] font-bold text-gray-700 rounded shadow-xs hover:bg-gray-50 flex items-center gap-1.5"
                    >
                        <Edit2 size={13} className="text-gray-500" />
                        <span>Edit Account</span>
                    </button>
                    <button 
                        onClick={() => window.print()} 
                        className="bg-white border border-gray-300 px-4 py-1.5 text-[12px] font-bold text-gray-700 rounded shadow-xs hover:bg-gray-50 flex items-center gap-1.5"
                    >
                        <Printer size={13} className="text-gray-500" />
                        <span>Print Statement</span>
                    </button>
                </div>

                {/* Filter and Search Bar */}
                <form onSubmit={handleApplyDateFilter} className="flex items-center space-x-2">
                    <div className="flex items-center bg-white border border-gray-300 rounded px-2.5 py-1 text-xs shadow-xs space-x-2">
                        <Calendar size={13} className="text-gray-400" />
                        <input
                            type="date"
                            value={fromDate}
                            onChange={(e) => setFromDate(e.target.value)}
                            className="outline-none text-[11px] text-gray-700"
                            placeholder="From"
                            title="From Date"
                        />
                        <span className="text-gray-300">to</span>
                        <input
                            type="date"
                            value={toDate}
                            onChange={(e) => setToDate(e.target.value)}
                            className="outline-none text-[11px] text-gray-700"
                            placeholder="To"
                            title="To Date"
                        />
                    </div>
                    <button
                        type="submit"
                        className="bg-indigo-600 text-white px-3 py-1.5 rounded text-[11px] font-bold hover:bg-indigo-700 flex items-center gap-1 shadow-xs transition-colors"
                    >
                        <Filter size={11} /> Filter
                    </button>
                    {(fromDate || toDate) && (
                        <button
                            type="button"
                            onClick={handleResetDateFilter}
                            className="bg-white border border-gray-300 text-gray-600 px-2.5 py-1.5 rounded text-[11px] font-bold hover:bg-gray-50 shadow-xs"
                            title="Reset Dates"
                        >
                            <RotateCcw size={12} />
                        </button>
                    )}
                    <div className="relative">
                        <Search size={13} className="absolute left-2.5 top-2.5 text-gray-400" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search ledger..."
                            className="bg-white border border-gray-300 rounded pl-8 pr-3 py-1 text-xs outline-none focus:border-indigo-500 w-44 shadow-xs"
                        />
                    </div>
                </form>
            </div>

            {/* Document / Statement Canvas */}
            <div className="flex-1 p-6 flex justify-center overflow-auto bg-slate-100">
                <div className="print-container bg-white shadow-xl p-10 w-full max-w-[1050px] min-h-[600px] relative font-sans text-gray-900 border border-gray-200 rounded-xl">
                    {/* Header */}
                    <div className="flex justify-between items-start mb-8 pb-6 border-b border-gray-200">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                                    {account.type || (account as any).accountType}
                                </span>
                                {account.code && (
                                    <span className="text-[11px] font-bold text-gray-400 font-mono">[{account.code}]</span>
                                )}
                            </div>
                            <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">{account.name}</h1>
                            <p className="text-xs text-slate-500 mt-1">General Ledger Transaction Register & Balance Drill-down</p>
                        </div>

                        {/* Account Balances Card */}
                        <div className="text-right bg-slate-50 border border-slate-200 p-4 rounded-xl min-w-[220px]">
                            <span className="font-black block text-slate-400 uppercase text-[10px] tracking-wider mb-1">Current Ledger Balance</span>
                            <div className="text-xl font-black text-indigo-700 font-mono">
                                {isForeign
                                    ? `${accCurrency} ${(account.foreignBalance ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                    : formatMoney(account.balance || 0, 'ZMW')}
                            </div>
                            {isForeign && (
                                <span className="block text-[11px] font-bold text-slate-500 mt-0.5 font-mono">
                                    Book Value: {formatMoney(account.balanceBase ?? account.balance ?? 0, 'ZMW')}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Ledger Entries Table */}
                    <div className="overflow-x-auto">
                        {filteredEntries.length === 0 ? (
                            <div className="py-16 text-center text-gray-400 text-xs font-bold uppercase tracking-widest">
                                No transactions found for the selected criteria.
                            </div>
                        ) : (
                            <table className="w-full text-left border-collapse text-xs">
                                <thead>
                                    <tr className="border-b-2 border-slate-200 bg-slate-50/80 text-[10px] font-black text-slate-500 uppercase tracking-wider">
                                        <th className="py-2.5 px-3">Date</th>
                                        <th className="py-2.5 px-3">Transaction</th>
                                        <th className="py-2.5 px-3">Contra Account</th>
                                        <th className="py-2.5 px-3 text-right">Debit</th>
                                        <th className="py-2.5 px-3 text-right">Credit</th>
                                        <th className="py-2.5 px-3 text-right">Balance ({accCurrency})</th>
                                        <th className="py-2.5 px-3 text-center no-print w-24">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredEntries.map((entry) => (
                                        <tr key={entry.id} className="hover:bg-slate-50/80 transition-colors group">
                                            {/* Date */}
                                            <td className="py-2.5 px-3 text-slate-600 font-mono whitespace-nowrap">
                                                {formatDateDMY(entry.date)}
                                            </td>

                                            {/* Transaction */}
                                            <td className="py-2.5 px-3 font-semibold text-slate-800">
                                                <span>{entry.transactionType || '—'}</span>
                                            </td>

                                            {/* Contra Account */}
                                            <td className="py-2.5 px-3 text-slate-600">
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-700">
                                                    <ArrowRightLeft size={10} className="text-slate-400" />
                                                    {entry.contraAccount || '—'}
                                                </span>
                                            </td>

                                            {/* Debit */}
                                            <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-800">
                                                {entry.debit > 0 ? entry.debit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}
                                                {isForeign && entry.foreignDebit > 0 && (
                                                    <div className="text-[10px] text-indigo-600 font-normal">
                                                        {accCurrency} {entry.foreignDebit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </div>
                                                )}
                                            </td>

                                            {/* Credit */}
                                            <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-800">
                                                {entry.credit > 0 ? entry.credit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}
                                                {isForeign && entry.foreignCredit > 0 && (
                                                    <div className="text-[10px] text-indigo-600 font-normal">
                                                        {accCurrency} {entry.foreignCredit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </div>
                                                )}
                                            </td>

                                            {/* Running Balance */}
                                            <td className="py-2.5 px-3 text-right font-mono font-black text-slate-900">
                                                {isForeign
                                                    ? `${accCurrency} ${(entry.foreignBalance ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                                    : formatMoney(entry.balance, 'ZMW')}
                                            </td>

                                            {/* Row Actions: View & Edit */}
                                            <td className="py-2.5 px-3 text-center no-print whitespace-nowrap">
                                                <div className="flex items-center justify-center space-x-1">
                                                    {entry.viewUrl && (
                                                        <button
                                                            type="button"
                                                            onClick={() => navigate(entry.viewUrl)}
                                                            className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                                                            title="View Source Document"
                                                        >
                                                            <Eye size={13} />
                                                        </button>
                                                    )}
                                                    {entry.editUrl && (
                                                        <button
                                                            type="button"
                                                            onClick={() => navigate(entry.editUrl)}
                                                            className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                                                            title="Edit Source Document"
                                                        >
                                                            <Edit2 size={13} />
                                                        </button>
                                                    )}
                                                    {!entry.viewUrl && !entry.editUrl && (
                                                        <span className="text-[10px] text-slate-300 font-mono">—</span>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr className="border-t-2 border-slate-300 bg-slate-50 font-black text-slate-900 text-xs">
                                        <td colSpan={3} className="py-3 px-3 uppercase text-[10px] tracking-wider text-slate-500">
                                            Total Period Movements:
                                        </td>
                                        <td className="py-3 px-3 text-right font-mono text-indigo-700">
                                            {filteredEntries.reduce((s, e) => s + Number(e.debit || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </td>
                                        <td className="py-3 px-3 text-right font-mono text-indigo-700">
                                            {filteredEntries.reduce((s, e) => s + Number(e.credit || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </td>
                                        <td className="py-3 px-3 text-right font-mono text-slate-900">
                                            {filteredEntries.length > 0 
                                                ? (isForeign
                                                    ? `${accCurrency} ${(filteredEntries[filteredEntries.length - 1].foreignBalance ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                                    : formatMoney(filteredEntries[filteredEntries.length - 1].balance, 'ZMW'))
                                                : '-'}
                                        </td>
                                        <td className="no-print"></td>
                                    </tr>
                                </tfoot>
                            </table>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ViewAccountView;
