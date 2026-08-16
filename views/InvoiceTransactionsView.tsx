import React, { useMemo, useState, useRef, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Eye, Edit, ChevronRight, LayoutGrid, HelpCircle, Search, FileText, ArrowLeft, X, Printer, Copy, Check, ChevronDown, ChevronUp, ChevronsLeft, ChevronsRight } from 'lucide-react';
import apiService from '../services/apiService';
import { SalesInvoice } from '../types';
import { cn } from '../utils/cn';

const InvoiceTransactionsView = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [invoice, setInvoice] = useState<SalesInvoice | null>(null);
    const [transactions, setTransactions] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [isBatchOpsOpen, setIsBatchOpsOpen] = useState(false);
    const [showEditColumns, setShowEditColumns] = useState(false);
    const batchOpsRef = useRef<HTMLDivElement>(null);

    // Default visibility settings
    const defaultVisibility = {
        'Actions': true,
        'DATE': true,
        'TRANSACTION': true,
        'CUSTOMER': true,
        'DESCRIPTION': true,
        'AMOUNT': true,
        'BALANCE': true
    };

    const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(() => {
        const saved = localStorage.getItem('invoice_transactions_column_visibility_settings');
        return saved ? JSON.parse(saved) : defaultVisibility;
    });

    const toggleColumnVisibility = (colId: string) => {
        setVisibleColumns(prev => {
            const next = { ...prev, [colId]: !prev[colId] };
            localStorage.setItem('invoice_transactions_column_visibility_settings', JSON.stringify(next));
            return next;
        });
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (batchOpsRef.current && !batchOpsRef.current.contains(event.target as Node)) {
                setIsBatchOpsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        const fetchData = async () => {
            if (!id) return;
            setIsLoading(true);
            try {
                const invData = await apiService.getInvoice(id);
                setInvoice(invData);
                const transData = await apiService.getInvoiceTransactions(invData.reference || invData.id);
                setTransactions(transData);
            } catch (err) {
                console.error('Failed to fetch invoice transactions:', err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [id]);

    const filteredTransactions = useMemo(() => {
        return transactions.filter(t =>
            t.transaction.toLowerCase().includes(searchQuery.toLowerCase()) ||
            t.description.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [transactions, searchQuery]);

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-40 space-y-4 font-sans">
                <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-600 rounded-full animate-spin"></div>
                <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Loading transactions...</p>
            </div>
        );
    }

    const handleBatchCopy = () => {
        const selectedTransactions = filteredTransactions.filter(t => selectedIds.includes(t.id));
        if (selectedTransactions.length === 0) return;

        const headers = ['DATE', 'TRANSACTION', 'CUSTOMER', 'DESCRIPTION', 'AMOUNT', 'BALANCE'];
        const rows = selectedTransactions.map(t => [
            t.date, t.transaction, t.customer, t.description, t.amount.toFixed(2), t.balance.toFixed(2)
        ]);

        const content = [headers, ...rows].map(row => row.join('\t')).join('\n');
        navigator.clipboard.writeText(content).then(() => alert('Copied to clipboard!'));
    };

    if (!invoice && id !== '6666') {
        return (
            <div className="p-8">
                <div className="bg-red-50 text-red-600 p-4 rounded-xl font-bold">
                    Invoice not found.
                </div>
                <button onClick={() => navigate('/sales-invoices')} className="mt-4 text-blue-600 font-bold hover:underline">
                    Back to Sales Invoices
                </button>
            </div>
        );
    }

    const displayInfo = invoice || { reference: '6666', date: '20.02.2027' };

    return (
        <div className="p-0 bg-slate-50 min-h-screen print:bg-white">
            {/* Breadcrumb Area */}
            <div className="bg-white border-b border-slate-200 px-8 py-3 flex items-center space-x-2 text-[11px] font-bold text-slate-400 uppercase tracking-widest no-print">
                <LayoutGrid size={12} />
                <ChevronRight size={10} className="opacity-30" />
                <Link to="/sales-invoices" className="hover:text-blue-600 transition-colors">Sales Invoices</Link>
                <ChevronRight size={10} className="opacity-30" />
                <span className="text-slate-600">{displayInfo.reference || displayInfo.id}</span>
            </div>

            <div className="p-8 space-y-6 print:p-0">
                {/* Header Area */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 no-print">
                    <div className="flex items-center space-x-2">
                        <h1 className="text-sm font-bold text-slate-500 uppercase tracking-tight">Sales Invoice — Transactions</h1>
                        <HelpCircle size={14} className="text-slate-300" />
                    </div>

                    <div className="flex items-center space-x-3">
                        <Link
                            to={`/receipts/new?customer=${encodeURIComponent(displayInfo.customer || '')}&amount=${invoice?.balanceDue || 0}&reference=${displayInfo.reference}`}
                            className="bg-white border border-slate-200 px-4 py-1.5 rounded text-sm font-bold text-slate-700 hover:bg-slate-50 shadow-sm transition-all flex items-center gap-2 uppercase tracking-wide"
                        >
                            <FileText size={14} /> New Receipt
                        </Link>
                        <div className="relative text-left">
                            <input
                                type="text"
                                placeholder="Search"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-3 pr-10 py-1.5 border border-slate-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 w-64 bg-white shadow-sm"
                            />
                        </div>
                        <button className="bg-white border border-slate-200 px-4 py-1.5 rounded text-sm font-bold text-slate-700 hover:bg-slate-50 shadow-sm">
                            Search
                        </button>
                    </div>
                </div>

                {/* Print Only Header */}
                <div className="hidden print:block mb-8">
                    <h1 className="text-2xl font-bold text-slate-900 uppercase">Statement of Transactions</h1>
                    <p className="text-slate-500 font-bold mb-4">Invoice: {displayInfo.reference} — {displayInfo.issueDate || displayInfo.date}</p>
                    <div className="w-full h-1 bg-slate-900 rounded-full"></div>
                </div>

                {/* Filter Tag Area */}
                <div className="flex no-print">
                    <div className="flex items-center bg-orange-50 border border-orange-100 rounded overflow-hidden shadow-sm">
                        <span className="px-3 py-1.5 text-[12px] font-bold text-orange-800 bg-orange-100/50">Sales Invoice</span>
                        <span className="px-4 py-1.5 text-[12px] font-bold text-slate-700 bg-white border-x border-orange-100">
                            {displayInfo.reference} — {displayInfo.issueDate || displayInfo.date}
                        </span>
                        <button
                            onClick={() => navigate('/sales-invoices')}
                            className="px-3 py-1.5 text-orange-800 hover:bg-orange-100 transition-colors flex items-center"
                        >
                            <X size={14} />
                        </button>
                    </div>
                </div>

                {/* Batch Action Bar */}
                {isSelectionMode && (
                    <div className="bg-indigo-600 px-8 py-4 rounded-[24px] flex items-center justify-between shadow-xl shadow-indigo-200/50 animate-in slide-in-from-top-4 duration-500 border border-white/10 backdrop-blur-md mb-8 no-print">
                        <div className="flex items-center space-x-8">
                            <div className="flex flex-col">
                                <span className="text-white font-black text-[14px] leading-tight tracking-tight">{selectedIds.length}</span>
                                <span className="text-indigo-200 font-bold text-[9px] uppercase tracking-widest whitespace-nowrap">Selected</span>
                            </div>
                            <div className="h-8 w-px bg-white/20"></div>
                            <div className="flex items-center space-x-4">
                                <button
                                    onClick={() => navigate(`/sales-invoices/print-batch?ids=${selectedIds.join(',')}&reportType=transactions&invoiceId=${id}`)}
                                    disabled={selectedIds.length === 0}
                                    className="text-white/90 hover:text-white flex items-center space-x-2 text-[11px] font-black uppercase tracking-widest transition-all disabled:opacity-40"
                                >
                                    <Printer size={14} /> <span>Print Selected</span>
                                </button>
                                <button
                                    onClick={handleBatchCopy}
                                    disabled={selectedIds.length === 0}
                                    className="text-white/90 hover:text-white flex items-center space-x-2 text-[11px] font-black uppercase tracking-widest transition-all disabled:opacity-40"
                                >
                                    <Copy size={14} /> <span>Copy Details</span>
                                </button>
                            </div>
                        </div>
                        <button
                            onClick={() => { setIsSelectionMode(false); setSelectedIds([]); }}
                            className="bg-white text-indigo-600 px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-white shadow-lg transition-all border border-transparent active:scale-95"
                        >
                            Reset Mode
                        </button>
                    </div>
                )}


                {/* Table Area */}
                <div className="bg-white border border-slate-200 rounded shadow-sm overflow-hidden text-[13px] bg-white print:border-none print:shadow-none">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[11px] tracking-wider">
                                    {isSelectionMode && (
                                        <th className="px-4 py-3 w-10 text-center border-r border-slate-200 no-print">
                                            <div className="flex items-center justify-center relative">
                                                <input 
                                                    type="checkbox" 
                                                    className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-0 cursor-pointer appearance-none border checked:bg-indigo-600 checked:border-indigo-600 shadow-sm"
                                                    checked={filteredTransactions.length > 0 && selectedIds.length === filteredTransactions.length}
                                                    onChange={(e) => {
                                                        if (e.target.checked) setSelectedIds(filteredTransactions.map(t => t.id));
                                                        else setSelectedIds([]);
                                                    }}
                                                />
                                                {(filteredTransactions.length > 0 && selectedIds.length === filteredTransactions.length) && <Check size={10} className="absolute inset-0 m-auto text-white pointer-events-none" strokeWidth={4} />}
                                            </div>
                                        </th>
                                    )}
                                    {visibleColumns['Actions'] && <th className="px-4 py-3 border-r border-slate-200 text-center whitespace-nowrap">Actions</th>}
                                    {visibleColumns['DATE'] && <th className="px-4 py-3 border-r border-slate-200 whitespace-nowrap">DATE</th>}
                                    {visibleColumns['TRANSACTION'] && <th className="px-4 py-3 border-r border-slate-200 whitespace-nowrap">TRANSACTION</th>}
                                    {visibleColumns['CUSTOMER'] && <th className="px-4 py-3 border-r border-slate-200 whitespace-nowrap">CUSTOMER</th>}
                                    {visibleColumns['DESCRIPTION'] && <th className="px-4 py-3 border-r border-slate-200 whitespace-nowrap">DESCRIPTION</th>}
                                    {visibleColumns['AMOUNT'] && <th className="px-4 py-3 text-right border-r border-slate-200 whitespace-nowrap">AMOUNT</th>}
                                    {visibleColumns['BALANCE'] && <th className="px-4 py-3 text-right whitespace-nowrap">BALANCE</th>}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-slate-700">
                                {filteredTransactions.length > 0 ? (
                                    filteredTransactions.map((t) => (
                                        <tr key={t.id} className={cn("hover:bg-slate-50/50 transition-colors group", isSelectionMode && !selectedIds.includes(t.id) ? "print:hidden" : "")}>
                                            {isSelectionMode && (
                                                <td className="px-4 py-3 border-r border-slate-100 text-center no-print">
                                                    <div className="flex items-center justify-center relative">
                                                        <input 
                                                            type="checkbox" 
                                                            className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-0 cursor-pointer appearance-none border checked:bg-indigo-600 checked:border-indigo-600"
                                                            checked={selectedIds.includes(t.id)}
                                                            onChange={() => {
                                                                setSelectedIds(prev => prev.includes(t.id) ? prev.filter(id => id !== t.id) : [...prev, t.id]);
                                                            }}
                                                        />
                                                        {selectedIds.includes(t.id) && <Check size={10} className="absolute inset-0 m-auto text-white pointer-events-none" strokeWidth={4} />}
                                                    </div>
                                                </td>
                                            )}
                                            {visibleColumns['Actions'] && (
                                                <td className="px-4 py-3 border-r border-slate-100 no-print">
                                                    <div className="flex items-center justify-center gap-1">
                                                        <button
                                                            onClick={() => navigate(`/sales-invoices/view/${id}`)}
                                                            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all"
                                                            title="View Invoice"
                                                        >
                                                            <Eye size={14} />
                                                        </button>
                                                        <button
                                                            onClick={() => navigate(`/sales-invoices/edit/${id}`)}
                                                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all font-bold"
                                                            title="Edit Invoice"
                                                        >
                                                            <Edit size={14} />
                                                        </button>
                                                    </div>
                                                </td>
                                            )}
                                            {visibleColumns['DATE'] && <td className="px-4 py-3 border-r border-slate-100 whitespace-nowrap font-medium text-slate-900">{t.date}</td>}
                                            {visibleColumns['TRANSACTION'] && (
                                                <td className="px-4 py-3 border-r border-slate-100">
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-slate-900">{t.transaction}</span>
                                                        {t.timestamp && <span className="text-[10px] text-slate-400 font-medium mt-0.5 tracking-tight uppercase">{t.timestamp}</span>}
                                                    </div>
                                                </td>
                                            )}
                                            {visibleColumns['CUSTOMER'] && <td className="px-4 py-3 border-r border-slate-100 text-slate-600 font-medium">{t.customer}</td>}
                                            {visibleColumns['DESCRIPTION'] && <td className="px-4 py-3 border-r border-slate-100 text-slate-400 font-medium">{t.description}</td>}
                                            {visibleColumns['AMOUNT'] && (
                                                <td className={`px-4 py-3 text-right border-r border-slate-100 font-black tabular-nums whitespace-nowrap ${t.amount < 0 ? 'text-rose-600' : 'text-slate-900'}`}>
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        <span className="text-[9px] font-black text-slate-400">{t.amount < 0 ? `- ${t.currency}` : t.currency}</span>
                                                        <span>{Math.abs(t.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                                    </div>
                                                </td>
                                            )}
                                            {visibleColumns['BALANCE'] && (
                                                <td className="px-4 py-3 text-right text-slate-400 font-black tabular-nums">
                                                    {t.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                </td>
                                            )}
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={10} className="p-16 text-center text-slate-400 italic text-[14px]">
                                            No transactions matched your search.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                            <tfoot className="bg-slate-50/50 border-t border-slate-200 print:bg-white">
                                <tr>
                                    <td colSpan={Object.values(visibleColumns).filter(v => v).length + (isSelectionMode ? 0 : -1) - (isSelectionMode ? 0 : 0)} className="px-6 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest print:text-gray-900">Grand Total Balance:</td>
                                    {visibleColumns['BALANCE'] && (
                                        <td className="px-6 py-4 text-right text-slate-900 font-black text-lg bg-white shadow-inner print:shadow-none print:bg-transparent">
                                            {transactions.reduce((acc, t) => acc + t.amount, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </td>
                                    )}
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>

                {/* Bottom Management Area */}
                <div className="flex flex-col md:flex-row items-center justify-between gap-6 bg-white p-6 rounded-[24px] border border-slate-200 shadow-sm mt-4 ml-0 mr-auto w-full no-print">
                    <div className="flex items-center gap-4 border-l border-slate-100 pl-4">
                        <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Total Records</span>
                            <span className="text-xl font-bold text-slate-900 leading-none">{filteredTransactions.length}</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => alert('Exporting...')}
                            className="px-4 py-2 bg-slate-50 text-[11px] font-black text-slate-500 rounded-xl hover:bg-indigo-50 hover:text-indigo-600 transition-all border border-slate-200/50 uppercase tracking-widest flex items-center gap-2 shadow-sm"
                        >
                            <Copy size={12} /> Export CSV
                        </button>

                        <div className="relative" ref={batchOpsRef}>
                            <button
                                onClick={() => setIsBatchOpsOpen(!isBatchOpsOpen)}
                                className="px-4 py-2 bg-blue-600 text-[11px] font-bold text-white rounded-md hover:bg-blue-700 transition-all uppercase tracking-wider flex items-center shadow-sm"
                            >
                                Management {isBatchOpsOpen ? <ChevronDown size={14} className="ml-2" /> : <ChevronUp size={14} className="ml-2" />}
                            </button>

                            {isBatchOpsOpen && (
                                <div className="absolute bottom-full right-0 mb-2 w-56 bg-white border border-gray-200 shadow-xl rounded-md py-1 z-[100] animate-in slide-in-from-bottom-2 duration-300 overflow-hidden text-left">
                                    <button
                                        onClick={() => { setShowEditColumns(true); setIsBatchOpsOpen(false); }}
                                        className="w-full text-left px-4 py-2 text-[12px] font-medium text-gray-700 hover:bg-gray-100 transition-colors"
                                    >
                                        Column Settings
                                    </button>
                                    <button
                                        onClick={() => {
                                            if (!isSelectionMode) window.scrollTo({ top: 0, behavior: 'smooth' });
                                            setIsSelectionMode(!isSelectionMode);
                                            setIsBatchOpsOpen(false);
                                        }}
                                        className="w-full text-left px-4 py-2 text-[12px] font-medium text-gray-700 hover:bg-gray-100 transition-colors border-t border-gray-100"
                                    >
                                        {isSelectionMode ? 'Disable Batch Mode' : 'Enable Batch Actions'}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Column Settings Modal */}
                {showEditColumns && (
                    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
                        <div className="bg-white rounded-xl border border-gray-200 shadow-2xl w-full max-w-[480px] overflow-hidden">
                            <div className="p-8 pb-4">
                                <h2 className="text-xl font-bold text-slate-800 uppercase tracking-tight mb-6 pb-4 border-b border-gray-100">Edit Table Columns</h2>
                                <div className="max-h-[400px] overflow-y-auto space-y-3 mb-8 custom-scrollbar">
                                    {Object.keys(defaultVisibility).map((colId) => (
                                        <div
                                            key={colId}
                                            className="flex items-center space-x-4 py-1 cursor-pointer group"
                                            onClick={() => toggleColumnVisibility(colId)}
                                        >
                                            <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${visibleColumns[colId] ? 'bg-blue-600 border-blue-600 shadow-sm' : 'bg-white border-gray-300 group-hover:border-blue-400'}`}>
                                                {visibleColumns[colId] && <Check size={14} className="text-white" strokeWidth={4} />}
                                            </div>
                                            <span className={`text-[15px] transition-colors ${visibleColumns[colId] ? 'text-slate-900 font-medium' : 'text-slate-500'}`}>
                                                {colId}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex justify-end pt-4 border-t border-gray-100 gap-3">
                                    <button onClick={() => setShowEditColumns(false)} className="bg-blue-600 text-white px-8 py-2 rounded-md font-bold hover:bg-blue-700 transition-all shadow-md">Apply Selection</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default InvoiceTransactionsView;
