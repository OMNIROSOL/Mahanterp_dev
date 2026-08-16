import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import apiService from '../services/apiService';
import { CreditNote, ScreenPermission, AppUser } from '../types';
import Badge from '../components/shared/Badge';
import DataTable from '../components/shared/DataTable';
import {
    Plus, Copy, FileText, Check, X, Eye, Edit, Printer, ChevronRight, ChevronLeft, Search,
    ChevronsLeft, ChevronsRight, ChevronDown, ChevronUp, ArrowUpDown
} from 'lucide-react';
import { cn } from '../utils/cn';
import { motion, AnimatePresence } from 'framer-motion';

const CreditNotesView = () => {
    const navigate = useNavigate();
    const { customerName } = useParams();
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [pageSize, setPageSize] = useState(50);
    const [currentPage, setCurrentPage] = useState(1);
    const [copiedNotification, setCopiedNotification] = useState(false);
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [sortColumn, setSortColumn] = useState<string>('Issue Date');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [isBatchOpsOpen, setIsBatchOpsOpen] = useState(false);
    const batchOpsRef = React.useRef<HTMLDivElement>(null);
    const [currentUser, setCurrentUser] = useState<AppUser>({
        id: 'admin', name: 'Admin', role: 'Admin', avatar: 'A', email: 'admin@example.com'
    });
    const [perms, setPerms] = useState<ScreenPermission | null>(null);
    const [selectedCOGS, setSelectedCOGS] = useState<CreditNote | null>(null);
    const [creditNotes, setCreditNotes] = useState<CreditNote[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const data = await apiService.getCreditNotes();
                console.log('FETCHED CREDIT NOTES:', data); setCreditNotes(data);
            } catch (err) {
                console.error('Failed to fetch credit notes:', err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [refreshTrigger]);

    useEffect(() => {
        setPerms({ screenId: 'credit-notes', view: true, add: true, edit: true, delete: true });
    }, [currentUser]);

    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (batchOpsRef.current && !batchOpsRef.current.contains(event.target as Node)) {
                setIsBatchOpsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(() => {
        const defaultVisible: Record<string, boolean> = {
            'Actions': true,
            'Issue Date': true,
            'Reference': true,
            'Customer': true,
            'Sales Invoice': true,
            'Description': true,
            'Amount': true,
            'Cost of Sales': true,
            'Timestamp': true
        };

        const saved = localStorage.getItem('credit_note_column_settings');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                const record: Record<string, boolean> = { 'Actions': true };
                parsed.forEach((col: any) => {
                    record[col.id] = col.visible;
                });
                return { ...defaultVisible, ...record };
            } catch (e) {
                return defaultVisible;
            }
        }
        return defaultVisible;
    });

    const copyToClipboard = (data: CreditNote[]) => {
        const header = "Issue Date\tReference\tCustomer\tDescription\tAmount\tStatus\tTimestamp";
        const rows = data.map(q =>
            `${q.issueDate}\t${q.reference}\t${q.customer}\t${q.description || ''}\t${q.amount}\t${q.status}\t${q.timestamp || ''}`
        ).join('\n');
        const fullText = `${header}\n${rows}`;

        if (!navigator.clipboard) {
            const textArea = document.createElement("textarea");
            textArea.value = fullText;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
        } else {
            navigator.clipboard.writeText(fullText);
        }
        setCopiedNotification(true);
        setTimeout(() => setCopiedNotification(false), 2000);
    };

    const handleSort = (column: string) => {
        if (sortColumn === column) {
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortColumn(column);
            setSortDirection('asc');
        }
    };

    const SortIcon = ({ column }: { column: string }) => {
        if (sortColumn !== column) return <ArrowUpDown size={12} className="ml-1 opacity-20 group-hover:opacity-50" />;
        return sortDirection === 'asc' ? <ChevronUp size={12} className="ml-1 text-indigo-500" /> : <ChevronDown size={12} className="ml-1 text-indigo-500" />;
    };

    const filteredData = useMemo(() => {
        let result = [...creditNotes];
        if (customerName) {
            result = result.filter(q => q.customer.toLowerCase() === customerName.toLowerCase());
        }
        if (statusFilter !== 'All') {
            result = result.filter(q => q.status === statusFilter);
        }
        const query = searchQuery.toLowerCase();
        if (query) {
            result = result.filter(q =>
                q.customer.toLowerCase().includes(query) ||
                q.reference.toLowerCase().includes(query) ||
                q.status.toLowerCase().includes(query) ||
                q.issueDate.toLowerCase().includes(query)
            );
        }
        return result.sort((a, b) => {
            let valA: any = a[sortColumn as keyof CreditNote] || '';
            let valB: any = b[sortColumn as keyof CreditNote] || '';
            if (sortColumn === 'Issue Date') {
                valA = (a.issueDate || '').split('.').reverse().join('-');
                valB = (b.issueDate || '').split('.').reverse().join('-');
            } else if (sortColumn === 'Amount') {
                valA = parseFloat(a.amount as any || 0);
                valB = parseFloat(b.amount as any || 0);
            }
            if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
            if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });
    }, [creditNotes, searchQuery, refreshTrigger, customerName, statusFilter, sortColumn, sortDirection]);

    const currencyTotals = useMemo(() => {
        const totals: Record<string, number> = {};
        filteredData.forEach(q => {
            const curr = q.currency || 'ZMW';
            totals[curr] = (totals[curr] || 0) + (parseFloat(q.amount as any) || 0);
        });
        return totals;
    }, [filteredData]);

    const paginatedData = useMemo(() => {
        return filteredData.slice((currentPage - 1) * pageSize, currentPage * pageSize);
    }, [filteredData, currentPage, pageSize]);

    const totalPages = Math.ceil(filteredData.length / pageSize) || 1;

    const allColumns = [
        {
            id: 'Selection',
            header: (
                <div className="flex items-center justify-center -ml-1">
                    <div className="relative flex items-center">
                        <input
                            type="checkbox"
                            checked={selectedIds.length === paginatedData.length && paginatedData.length > 0}
                            onChange={(e) => {
                                if (e.target.checked) {
                                    setSelectedIds(paginatedData.map((o: any) => o.id));
                                } else {
                                    setSelectedIds([]);
                                }
                            }}
                            className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-0 cursor-pointer transition-all appearance-none border checked:bg-indigo-600 checked:border-indigo-600"
                        />
                        {selectedIds.length === paginatedData.length && paginatedData.length > 0 && <Check size={10} className="absolute inset-0 m-auto text-white pointer-events-none" strokeWidth={4} />}
                    </div>
                </div>
            ),
            accessor: (o: any) => (
                <div className="flex items-center justify-center">
                    <div className="relative flex items-center">
                        <input
                            type="checkbox"
                            checked={selectedIds.includes(o.id)}
                            onChange={() => {
                                setSelectedIds(prev =>
                                    prev.includes(o.id)
                                        ? prev.filter(id => id !== o.id)
                                        : [...prev, o.id]
                                );
                            }}
                            className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-0 cursor-pointer transition-all appearance-none border checked:bg-indigo-600 checked:border-indigo-600"
                        />
                        {selectedIds.includes(o.id) && <Check size={10} className="absolute inset-0 m-auto text-white pointer-events-none" strokeWidth={4} />}
                    </div>
                </div>
            )
        },
        {
            id: 'Actions',
            header: 'Actions',
            accessor: (o: any) => (
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => navigate(`/credit-notes/view/${o.id}`)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all font-bold"
                        title="View Details"
                    >
                        <Eye size={14} />
                    </button>
                    {perms?.edit !== false && (
                        <button
                            onClick={() => navigate(`/credit-notes/edit/${o.id}`)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all font-bold"
                            title="Edit Credit Note"
                        >
                            <Edit size={14} />
                        </button>
                    )}
                </div>
            )
        },
        {
            id: 'Issue Date',
            header: <div className="flex items-center cursor-pointer group hover:text-indigo-600 transition-colors" onClick={() => handleSort('Issue Date')}>Issue Date <SortIcon column="Issue Date" /></div>,
            className: 'whitespace-nowrap',
            accessor: (o: any) => (
                <span className="font-medium text-[13px] text-slate-800 tracking-normal">{o.issueDate}</span>
            )
        },
        {
            id: 'Reference',
            header: <div className="flex items-center cursor-pointer group hover:text-indigo-600 transition-colors" onClick={() => handleSort('Reference')}>Reference <SortIcon column="Reference" /></div>,
            className: 'whitespace-nowrap min-w-[140px]',
            accessor: (o: any) => (
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 border border-indigo-100/50">
                        <FileText size={14} />
                    </div>
                    <span className="font-medium text-slate-900 tracking-tight">{o.reference}</span>
                </div>
            )
        },
        {
            id: 'Customer',
            header: <div className="flex items-center cursor-pointer group hover:text-indigo-600 transition-colors" onClick={() => handleSort('Customer')}>Customer <SortIcon column="Customer" /></div>,
            className: 'min-w-[200px]',
            accessor: (o: any) => (
                <span className="font-medium text-slate-600">{typeof o.customer === 'string' ? o.customer : o.customer?.name || 'Unknown'}</span>
            )
        },
        {
            id: 'Sales Invoice',
            header: <div className="flex items-center cursor-pointer group hover:text-indigo-600 transition-colors" onClick={() => handleSort('Sales Invoice')}>Sales Invoice <SortIcon column="Sales Invoice" /></div>,
            className: 'whitespace-nowrap',
            accessor: (o: any) => (
                <span className="font-medium text-indigo-600 cursor-pointer hover:underline" onClick={() => navigate(`/sales-invoices/view/${o.salesInvoice}`)}>
                    {o.salesInvoice || '—'}
                </span>
            )
        },
        {
            id: 'Description',
            header: 'Description',
            className: 'min-w-[200px]',
            accessor: (o: any) => (
                <span className="text-slate-400 font-medium tracking-tight truncate max-w-[200px]" title={o.description}>{o.description || ''}</span>
            )
        },
        {
            id: 'Amount',
            header: <div className="flex items-center justify-end cursor-pointer group hover:text-indigo-600 transition-colors" onClick={() => handleSort('Amount')}>Amount <SortIcon column="Amount" /></div>,
            className: 'whitespace-nowrap text-right',
            accessor: (o: any) => (
                <div className="text-right">
                    <span className="text-[10px] text-slate-400 font-bold mr-1">{o.currency || 'ZMW'}</span>
                    <span className="font-black text-slate-900">
                        {parseFloat(o.amount as any || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                </div>
            )
        },
        {
            id: 'Cost of Sales',
            header: <div className="flex items-center justify-end cursor-pointer group hover:text-indigo-600 transition-colors" onClick={() => handleSort('Cost of Sales')}>Cost of Sales <SortIcon column="Cost of Sales" /></div>,
            className: 'whitespace-nowrap text-right',
            accessor: (o: any) => (
                <div
                    className="text-right cursor-pointer group/cost"
                    onClick={() => setSelectedCOGS(o)}
                >
                    <span className="text-[10px] text-slate-400 font-bold mr-1 group-hover/cost:text-indigo-400 transition-colors">{o.currency || 'ZMW'}</span>
                    <span className="font-black text-slate-900 group-hover/cost:text-indigo-600 transition-colors underline decoration-slate-200 underline-offset-4 decoration-dashed">
                        {parseFloat(o.costOfSales as any || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                </div>
            )
        },
        {
            id: 'Timestamp',
            header: 'Timestamp',
            className: 'whitespace-nowrap',
            accessor: (o: any) => (
                <span className="text-[10px] text-slate-400 font-medium">{o.timestamp || ''}</span>
            )
        }
    ];

    const columns = useMemo(() => {
        let cols = allColumns.filter(col => visibleColumns[col.id]);
        if (isSelectionMode) {
            const selectionCol = allColumns.find(c => c.id === 'Selection');
            if (selectionCol && !cols.some(c => c.id === 'Selection')) {
                cols = [selectionCol, ...cols];
            }
        }
        return cols;
    }, [visibleColumns, isSelectionMode, selectedIds, paginatedData]);

    return (
        <div className="p-8 space-y-8 max-w-[1600px] mx-auto animate-in fade-in duration-700 font-sans">
            {copiedNotification && (
                <div className="fixed top-10 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-8 py-4 rounded-[20px] shadow-2xl z-[9999] animate-in slide-in-from-top-4 duration-500">
                    <p className="font-black uppercase tracking-widest text-[11px]">Data Copied to Clipboard</p>
                </div>
            )}

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <div className="flex items-center space-x-2 text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] mb-2">
                        <FileText size={14} />
                        <span className="text-gray-400">Financial Documents</span>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Credit Notes</h1>
                    <p className="text-gray-500 text-sm font-medium">Manage and track your credits and returns</p>
                </div>

                <div className="flex items-center gap-3">
                    {perms?.add !== false && (
                        <button
                            onClick={() => navigate('/credit-notes/new')}
                            className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-[12px] font-black hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-500/20 flex items-center uppercase tracking-widest"
                        >
                            <Plus size={16} className="mr-2" /> CREATE NEW CREDIT NOTE
                        </button>
                    )}
                </div>
            </div>

            {/* Search and Filters */}
            <div className="mt-8 flex flex-col md:flex-row items-center justify-between gap-6 pb-2">
                <div className="flex items-center gap-4 flex-1">
                    <div className="relative flex-1 group max-w-xl">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 transition-colors group-focus-within:text-indigo-500" size={14} />
                        <input
                            type="text"
                            placeholder="Search by name, reference, or status..."
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white shadow-sm transition-all"
                        />
                    </div>
                </div>

                <div className="flex items-center space-x-4">
                    <div className="flex flex-col items-end border-l border-slate-100 pl-8">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Total Notes</span>
                        <span className="text-[18px] font-black text-gray-900 leading-none">
                            {filteredData.length}
                        </span>
                    </div>
                </div>
            </div>

            {/* Batch Action Bar */}
            {isSelectionMode && (
                <div className="bg-indigo-600 px-8 py-4 rounded-[24px] flex items-center justify-between shadow-xl shadow-indigo-200/50 animate-in slide-in-from-top-4 duration-500 border border-white/10 backdrop-blur-md mb-8 max-w-[1200px]">
                    <div className="flex items-center space-x-8">
                        <div className="flex flex-col">
                            <span className="text-white font-black text-[14px] leading-tight tracking-tight">{selectedIds.length}</span>
                            <span className="text-indigo-200 font-bold text-[9px] uppercase tracking-widest whitespace-nowrap">Selected</span>
                        </div>
                        <div className="h-8 w-px bg-white/20"></div>
                        <div className="flex items-center space-x-4">
                            <button
                                onClick={() => navigate(`/credit-notes/print-batch?ids=${selectedIds.join(',')}`)}
                                disabled={selectedIds.length === 0}
                                className="text-white/90 hover:text-white flex items-center space-x-2 text-[11px] font-black uppercase tracking-widest transition-all disabled:opacity-40"
                            >
                                <Printer size={14} /> <span>Print Selected</span>
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

            {/* Table Container - Invoice Style */}
            <div className="w-fit min-w-full overflow-visible mb-8 custom-scrollbar rounded-2xl border border-slate-100 shadow-sm shadow-indigo-50/50 overflow-hidden bg-white">
                <DataTable
                    data={isLoading ? [] : paginatedData}
                    columns={columns as any}
                    tableClassName="w-full"
                    className="border-none shadow-none bg-transparent"
                    hideDefaultPagination={true}
                    emptyMessage={
                        isLoading ? (
                            <div className="flex flex-col items-center justify-center space-y-4 py-20">
                                <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
                                <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Loading credit notes...</p>
                            </div>
                        ) : "No credit notes found matching your criteria."
                    }
                    tableFooter={
                        <tr className="bg-slate-50/50">
                            <td className="px-6 py-4"></td>
                            {columns.map((col: any) => {
                                if (col.id === 'Amount') {
                                    const activeCurs = Object.keys(currencyTotals);
                                    return (
                                        <td key={col.id} className="px-6 py-4 text-right">
                                            <div className="flex flex-col gap-1">
                                                {activeCurs.map(cur => (
                                                    <div key={cur} className="flex items-center justify-end gap-1.5">
                                                        <span className="text-[9px] font-black text-slate-400 uppercase">{cur}</span>
                                                        <span className="text-[12px] font-black text-slate-900 underline decoration-slate-200 decoration-2 underline-offset-4 pointer-events-none">
                                                            {currencyTotals[cur].toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </td>
                                    );
                                }
                                return <td key={col.id} className="px-6 py-4"></td>;
                            })}
                        </tr>
                    }
                />
            </div>

            {/* Pagination Controls */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 bg-white p-6 rounded-[24px] border border-slate-200 shadow-sm mt-4">
                <div className="flex flex-col items-center space-y-2">
                    <div className="flex items-center space-x-2 text-[12px] text-slate-500 font-medium whitespace-nowrap">
                        <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1} className="p-1 rounded-md hover:bg-slate-100 disabled:opacity-30 transition-all active:scale-90"><ChevronsLeft size={16} /></button>
                        <button onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage === 1} className="p-1 rounded-md hover:bg-slate-100 disabled:opacity-30 transition-all active:scale-90"><ChevronLeft size={16} /></button>
                        <span className="mx-2 text-slate-700">Page {currentPage} of {totalPages || 1}</span>
                        <button onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages || totalPages === 0} className="p-1 rounded-md hover:bg-slate-100 disabled:opacity-30 transition-all active:scale-90"><ChevronRight size={16} /></button>
                        <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages || totalPages === 0} className="p-1 rounded-md hover:bg-slate-100 disabled:opacity-30 transition-all active:scale-90"><ChevronsRight size={16} /></button>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => copyToClipboard(filteredData)}
                        className="px-4 py-2 bg-slate-50 text-[11px] font-black text-slate-500 rounded-xl hover:bg-indigo-50 hover:text-indigo-600 transition-all border border-slate-200/50 uppercase tracking-widest flex items-center gap-2 shadow-sm"
                    >
                        <Copy size={12} /> Export Data
                    </button>
                    <div className="relative" ref={batchOpsRef}>
                        <button
                            onClick={() => setIsBatchOpsOpen(!isBatchOpsOpen)}
                            className="px-4 py-2 bg-indigo-600 text-[11px] font-bold text-white rounded-md hover:bg-indigo-700 transition-all uppercase tracking-wider flex items-center shadow-sm"
                        >
                            Management {isBatchOpsOpen ? <ChevronDown size={14} className="ml-2" /> : <ChevronUp size={14} className="ml-2" />}
                        </button>
                        {isBatchOpsOpen && (
                            <div className="absolute bottom-full right-0 mb-2 w-56 bg-white border border-gray-200 shadow-xl rounded-md py-1 z-[100] animate-in slide-in-from-bottom-2 duration-300 overflow-hidden text-left">
                                <button
                                    onClick={() => { navigate('/credit-notes/edit-columns'); setIsBatchOpsOpen(false); }}
                                    className="w-full text-left px-4 py-2 text-[12px] font-medium text-gray-700 hover:bg-gray-100 transition-colors"
                                >
                                    Column Settings
                                </button>
                                <button
                                    onClick={() => { setIsSelectionMode(!isSelectionMode); setIsBatchOpsOpen(false); }}
                                    className="w-full text-left px-4 py-2 text-[12px] font-medium text-gray-700 hover:bg-gray-100 transition-colors border-t border-gray-100"
                                >
                                    {isSelectionMode ? 'Disable Selection' : 'Enable Selection Mode'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Cost of Sales Breakdown Modal */}
            <AnimatePresence>
                {selectedCOGS && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setSelectedCOGS(null)}
                            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="bg-white rounded-[32px] shadow-2xl w-full max-w-2xl overflow-hidden relative z-10 border border-slate-100"
                        >
                            <div className="p-8 border-b border-slate-50 flex items-center justify-between">
                                <div>
                                    <h3 className="text-xl font-black text-slate-900 tracking-tight">Cost of Sales Breakdown</h3>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
                                        Reference: <span className="text-indigo-500">{selectedCOGS.reference}</span>
                                    </p>
                                </div>
                                <button
                                    onClick={() => setSelectedCOGS(null)}
                                    className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-all"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="p-0 overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50/50">
                                            <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Item Description</th>
                                            <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">Qty</th>
                                            <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Unit Cost</th>
                                            <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Total Cost</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {(selectedCOGS.items || []).map((item, idx) => {
                                            const qty = parseFloat(item.qty as any) || 0;
                                            const uCost = parseFloat(item.unitCost as any) || 0;
                                            const total = qty * uCost;
                                            return (
                                                <tr key={idx} className="hover:bg-slate-50/30 transition-colors">
                                                    <td className="px-8 py-5">
                                                        <p className="text-[13px] font-bold text-slate-800">{item.item}</p>
                                                        <p className="text-[11px] text-slate-400 font-medium">{item.description}</p>
                                                    </td>
                                                    <td className="px-8 py-5 text-center text-[13px] font-black text-slate-600 tabular-nums">{qty}</td>
                                                    <td className="px-8 py-5 text-right text-[13px] font-black text-slate-600 tabular-nums">
                                                        {uCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                    </td>
                                                    <td className="px-8 py-5 text-right">
                                                        <span className="text-[10px] font-bold text-slate-300 mr-1">{selectedCOGS.currency}</span>
                                                        <span className="text-[13px] font-black text-indigo-600 tabular-nums">
                                                            {total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                    <tfoot>
                                        <tr className="bg-indigo-50/30">
                                            <td colSpan={3} className="px-8 py-6 text-right text-[11px] font-black text-indigo-400 uppercase tracking-widest">Grand Total Cost</td>
                                            <td className="px-8 py-6 text-right">
                                                <span className="text-xs font-black text-indigo-400 mr-2 uppercase">{selectedCOGS.currency}</span>
                                                <span className="text-[18px] font-black text-indigo-600 tabular-nums tracking-tight">
                                                    {(selectedCOGS.costOfSales || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                </span>
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>

                            <div className="p-8 bg-slate-50/50 border-t border-slate-100 flex justify-end">
                                <button
                                    onClick={() => setSelectedCOGS(null)}
                                    className="px-8 py-3 bg-white border border-slate-200 rounded-2xl text-[11px] font-black text-slate-500 hover:bg-slate-100 transition-all uppercase tracking-widest shadow-sm"
                                >
                                    Close Breakdown
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default CreditNotesView;
