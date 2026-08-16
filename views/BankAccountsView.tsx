import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DataTable from '../components/shared/DataTable';
import Button from '../components/shared/Button';
import Badge from '../components/shared/Badge';
import { 
    Plus, Search, FileText, ChevronRight, Eye, Edit, Copy, 
    ChevronDown, ChevronUp, ChevronsLeft, ChevronsRight, 
    ChevronLeft, LayoutGrid, HelpCircle, ArrowUpDown, Check, X,
    DollarSign, Briefcase, CreditCard, Building, Landmark,
    Terminal, Download, Printer
} from 'lucide-react';
import { cn } from '../utils/cn';
import apiService from '../services/apiService';

const BankAccountsView = () => {
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const [pageSize, setPageSize] = useState(50);
    const [currentPage, setCurrentPage] = useState(1);
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [isBatchOpsOpen, setIsBatchOpsOpen] = useState(false);
    const [sortColumn, setSortColumn] = useState<string>('Name');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
    const batchOpsRef = React.useRef<HTMLDivElement>(null);

    const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(() => {
        const saved = localStorage.getItem('bank_account_column_settings');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                const record: Record<string, boolean> = { 'Actions': true, 'Selection': true };
                parsed.forEach((col: any) => {
                    record[col.id] = col.visible;
                });
                return record;
            } catch (e) {
                console.error('Failed to parse column settings', e);
            }
        }
        return {
            'Actions': true,
            'Selection': true,
            'code': true,
            'name': true,
            'control_account': true,
            'division': true,
            'uncategorized_receipts': true,
            'uncategorized_payments': true,
            'cleared_balance': true,
            'pending_deposits': true,
            'pending_withdrawals': true,
            'actual_balance': true,
            'available_credit': true,
            'last_reconciliation': true,
            'timestamp': true
        };
    });

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (batchOpsRef.current && !batchOpsRef.current.contains(event.target as Node)) {
                setIsBatchOpsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        
        const handleStorage = () => {
            const saved = localStorage.getItem('bank_account_column_settings');
            if (saved) {
                try {
                    const parsed = JSON.parse(saved);
                    const record: Record<string, boolean> = { 'Actions': true, 'Selection': true };
                    parsed.forEach((col: any) => {
                        record[col.id] = col.visible;
                    });
                    setVisibleColumns(record);
                } catch (e) {
                    console.error('Failed to parse column settings', e);
                }
            }
        };
        window.addEventListener('storage', handleStorage);
        
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            window.removeEventListener('storage', handleStorage);
        };
    }, []);

    const [bankAccounts, setBankAccounts] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchAccounts = async () => {
            setIsLoading(true);
            try {
                const data = await apiService.getBankAccounts();
                // We don't need to filter on frontend since getBankAccounts does it
                // otherwise show all or filter based on name/code
                const filtered = data.filter((a: any) => 
                    a.name.toLowerCase().includes(searchQuery.toLowerCase())
                );
                
                setBankAccounts(filtered.sort((a: any, b: any) => {
                    let valA: any = a[sortColumn as keyof typeof a] || '';
                    let valB: any = b[sortColumn as keyof typeof b] || '';
                    
                    if (sortColumn === 'cleared_balance' || sortColumn === 'actual_balance') {
                        valA = a.balance;
                        valB = b.balance;
                    }

                    if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
                    if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
                    return 0;
                }));
            } catch (err) {
                console.error('Failed to fetch accounts:', err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchAccounts();
    }, [searchQuery, sortColumn, sortDirection]);

    const paginatedData = useMemo(() => {
        return bankAccounts.slice((currentPage - 1) * pageSize, currentPage * pageSize);
    }, [bankAccounts, currentPage, pageSize]);

    const totalPages = Math.ceil(bankAccounts.length / pageSize) || 1;

    const totalClearedBalance = useMemo(() => bankAccounts.reduce((sum, a) => sum + a.balance, 0), [bankAccounts]);
    const totalActualBalance = useMemo(() => bankAccounts.reduce((sum, a) => sum + a.balance, 0), [bankAccounts]);

    const SortIcon = ({ column }: { column: string }) => {
        if (sortColumn !== column) return <ArrowUpDown size={12} className="ml-1 opacity-20 group-hover:opacity-50" />;
        return sortDirection === 'asc' ? <ChevronUp size={12} className="ml-1 text-blue-500" /> : <ChevronDown size={12} className="ml-1 text-blue-500" />;
    };

    const handleSort = (column: string) => {
        if (sortColumn === column) {
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortColumn(column);
            setSortDirection('asc');
        }
    };

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
                                    setSelectedIds(paginatedData.map((a: any) => a.id));
                                } else {
                                    setSelectedIds([]);
                                }
                            }}
                            className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-0 cursor-pointer transition-all appearance-none border checked:bg-blue-600 checked:border-blue-600"
                        />
                        {selectedIds.length === paginatedData.length && paginatedData.length > 0 && <Check size={10} className="absolute inset-0 m-auto text-white pointer-events-none" strokeWidth={4} />}
                    </div>
                </div>
            ),
            accessor: (a: any) => (
                <div className="flex items-center justify-center">
                    <div className="relative flex items-center">
                        <input
                            type="checkbox"
                            checked={selectedIds.includes(a.id)}
                            onChange={() => {
                                setSelectedIds(prev =>
                                    prev.includes(a.id)
                                        ? prev.filter(id => id !== a.id)
                                        : [...prev, a.id]
                                );
                            }}
                            className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-0 cursor-pointer transition-all appearance-none border checked:bg-blue-600 checked:border-blue-600"
                        />
                        {selectedIds.includes(a.id) && <Check size={10} className="absolute inset-0 m-auto text-white pointer-events-none" strokeWidth={4} />}
                    </div>
                </div>
            )
        },
        {
            id: 'Actions',
            header: 'Actions',
            accessor: (a: any) => (
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => navigate(`/account/view/${a.id}`)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all"
                        title="View Details"
                    >
                        <Eye size={14} />
                    </button>
                    <button
                        onClick={() => navigate(`/account/edit/${a.id}`)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all font-bold"
                        title="Edit Account"
                    >
                        <Edit size={14} />
                    </button>
                </div>
            )
        },
        {
            id: 'code',
            header: <div className="flex items-center cursor-pointer group hover:text-blue-600 transition-colors" onClick={() => handleSort('code')}>Code <SortIcon column="code" /></div>,
            accessor: (a: any) => <span className="text-slate-500 font-medium">{a.id?.substring(0, 8).toUpperCase() || '—'}</span>
        },
        {
            id: 'name',
            header: <div className="flex items-center cursor-pointer group hover:text-blue-600 transition-colors" onClick={() => handleSort('name')}>Account Name <SortIcon column="name" /></div>,
            className: 'min-w-[200px]',
            accessor: (a: any) => (
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 border border-blue-100/50">
                        <Landmark size={14} />
                    </div>
                    <span 
                        onClick={() => navigate(`/account/view/${a.id}`)}
                        className="font-black text-blue-600 hover:underline cursor-pointer uppercase tracking-tight text-[11px]"
                    >
                        {a.name}
                    </span>
                </div>
            )
        },
        {
            id: 'control_account',
            header: 'Control Account',
            accessor: () => <span className="text-slate-400 font-medium">—</span>
        },
        {
            id: 'division',
            header: 'Division',
            accessor: () => <span className="text-slate-400 font-medium">—</span>
        },
        {
            id: 'uncategorized_receipts',
            header: 'Uncategorized Receipts',
            className: 'text-right',
            accessor: () => <span className="text-slate-400 font-medium">—</span>
        },
        {
            id: 'uncategorized_payments',
            header: 'Uncategorized Payments',
            className: 'text-right',
            accessor: () => <span className="text-slate-400 font-medium">—</span>
        },
        {
            id: 'cleared_balance',
            header: <div className="flex items-center justify-end cursor-pointer group hover:text-blue-600 transition-colors" onClick={() => handleSort('cleared_balance')}>Cleared Balance <SortIcon column="cleared_balance" /></div>,
            className: 'text-right',
            accessor: (a: any) => (
                <div className="text-right">
                    <span className="text-[10px] text-slate-400 font-bold mr-1">ZMW</span>
                    <span className="font-black text-blue-600">
                        {(a.balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                </div>
            )
        },
        {
            id: 'pending_deposits',
            header: 'Pending Deposits',
            className: 'text-right',
            accessor: () => <span className="text-slate-400 font-medium">—</span>
        },
        {
            id: 'pending_withdrawals',
            header: 'Pending Withdrawals',
            className: 'text-right',
            accessor: () => <span className="text-slate-400 font-medium">—</span>
        },
        {
            id: 'actual_balance',
            header: <div className="flex items-center justify-end cursor-pointer group hover:text-blue-600 transition-colors" onClick={() => handleSort('actual_balance')}>Actual Balance <SortIcon column="actual_balance" /></div>,
            className: 'text-right',
            accessor: (a: any) => (
                <div className="text-right">
                    <span className="text-[10px] text-slate-400 font-bold mr-1">ZMW</span>
                    <span className="font-black text-blue-600">
                        {(a.balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                </div>
            )
        },
        {
            id: 'available_credit',
            header: 'Available Credit',
            className: 'text-right',
            accessor: () => <span className="text-slate-400 font-medium">—</span>
        },
        {
            id: 'last_reconciliation',
            header: 'Last Reconciliation',
            accessor: () => <span className="text-slate-400 font-medium">—</span>
        },
        {
            id: 'timestamp',
            header: 'Timestamp',
            accessor: () => <span className="text-slate-400 font-medium">—</span>
        }
    ];

    const currentColumns = useMemo(() => {
        let cols = allColumns.filter(c => visibleColumns[c.id]);
        if (isSelectionMode) {
            if (!cols.find(c => c.id === 'Selection')) {
                cols = [allColumns.find(c => c.id === 'Selection')!, ...cols];
            }
        } else {
            cols = cols.filter(c => c.id !== 'Selection');
        }
        return cols;
    }, [isSelectionMode, visibleColumns, selectedIds, paginatedData]);

    const handleBatchCopy = () => {
        const selectedAccounts = bankAccounts.filter(a => selectedIds.includes(a.id));
        const text = selectedAccounts.map(a => `${a.name}\t${a.balance}`).join('\n');
        navigator.clipboard.writeText(text);
        alert('Copied to clipboard');
    };

    return (
        <div className="p-8 space-y-8 max-w-[1600px] mx-auto animate-in fade-in duration-700 font-sans text-left">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="text-left">
                    <div className="flex items-center space-x-2 text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] mb-2">
                        <Landmark size={14} />
                        <span className="text-gray-400">Cash & Liquidity</span>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Bank and Cash Accounts</h1>
                    <p className="text-gray-500 text-sm font-medium">Manage your financial accounts and reconciliations</p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate('/account/new')}
                        className="bg-blue-600 text-white px-5 py-2.5 rounded-xl text-[12px] font-black hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20 flex items-center uppercase tracking-widest"
                    >
                        <Plus size={16} className="mr-2" /> NEW BANK ACCOUNT
                    </button>
                </div>
            </div>

            <div className="mt-8 flex flex-col md:flex-row items-center justify-between gap-6 pb-2">
                <div className="flex items-center gap-4 flex-1">
                    <div className="relative flex-1 group max-w-xl">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 transition-colors group-focus-within:text-blue-500" size={14} />
                        <input
                            type="text"
                            placeholder="Search by account name..."
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white shadow-sm transition-all"
                        />
                    </div>
                </div>

                <div className="flex items-center space-x-4 text-right">
                    <div className="flex flex-col items-end border-l border-slate-100 pl-8">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Total Accounts</span>
                        <span className="text-[18px] font-black text-gray-900 leading-none">
                            {bankAccounts.length}
                        </span>
                    </div>
                </div>
            </div>

            {/* Batch Action Bar */}
            {isSelectionMode && (
                <div className="bg-blue-600 px-8 py-4 rounded-[24px] flex items-center justify-between shadow-xl shadow-blue-200/50 animate-in slide-in-from-top-4 duration-500 border border-white/10 backdrop-blur-md mb-8 max-w-[1200px]">
                    <div className="flex items-center space-x-8">
                        <div className="flex flex-col">
                            <span className="text-white font-black text-[14px] leading-tight tracking-tight">{selectedIds.length}</span>
                            <span className="text-blue-200 font-bold text-[9px] uppercase tracking-widest whitespace-nowrap">Selected</span>
                        </div>
                        <div className="h-8 w-px bg-white/20"></div>
                        <div className="flex items-center space-x-4">
                            <button
                                disabled={selectedIds.length === 0}
                                className="text-white/90 hover:text-white flex items-center space-x-2 text-[11px] font-black uppercase tracking-widest transition-all disabled:opacity-40"
                            >
                                <Printer size={14} /> <span>Print Statements</span>
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
                        className="bg-white text-blue-600 px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-white shadow-lg transition-all border border-transparent active:scale-95"
                    >
                        Reset Mode
                    </button>
                </div>
            )}

            <div className="w-fit min-w-full overflow-visible mb-8 custom-scrollbar rounded-2xl border border-slate-100 shadow-sm shadow-indigo-50/50 overflow-hidden bg-white">
                <DataTable
                    data={paginatedData}
                    columns={currentColumns as any}
                    tableClassName="w-full"
                    className="border-none shadow-none bg-transparent"
                    hideDefaultPagination={true}
                    tableFooter={
                        <tr className="bg-slate-50/50 font-black">
                            <td className="px-6 py-6" colSpan={currentColumns.length - (visibleColumns['cleared_balance'] ? 1 : 0) - (visibleColumns['actual_balance'] ? 1 : 0) - (visibleColumns['available_credit'] ? 1 : 0) - (visibleColumns['last_reconciliation'] ? 1 : 0) - (visibleColumns['timestamp'] ? 1 : 0) - (visibleColumns['pending_deposits'] ? 1 : 0) - (visibleColumns['pending_withdrawals'] ? 1 : 0)}>
                                <span className="text-[10px] text-slate-400 uppercase tracking-widest">Grand Total</span>
                            </td>
                            {visibleColumns['cleared_balance'] && (
                                <td className="px-6 py-6 text-right">
                                    <span className="text-[10px] text-slate-400 font-bold mr-1 group-hover:text-blue-600 transition-colors">ZMW</span>
                                    <span className="text-[14px] text-blue-600 underline underline-offset-4 decoration-2 decoration-blue-100">
                                        {totalClearedBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </span>
                                </td>
                            )}
                            {visibleColumns['pending_deposits'] && <td className="px-6 py-6 text-right text-slate-400">—</td>}
                            {visibleColumns['pending_withdrawals'] && <td className="px-6 py-6 text-right text-slate-400">—</td>}
                            {visibleColumns['actual_balance'] && (
                                <td className="px-6 py-6 text-right">
                                    <span className="text-[10px] text-slate-400 font-bold mr-1 group-hover:text-blue-600 transition-colors">ZMW</span>
                                    <span className="text-[14px] text-blue-600 underline underline-offset-4 decoration-2 decoration-blue-100">
                                        {totalActualBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </span>
                                </td>
                            )}
                            {visibleColumns['available_credit'] && <td className="px-6 py-6 text-right text-slate-400">—</td>}
                            {visibleColumns['last_reconciliation'] && <td className="px-6 py-6 text-right text-slate-400">—</td>}
                            {visibleColumns['timestamp'] && <td className="px-6 py-6 text-right text-slate-400">—</td>}
                        </tr>
                    }
                />
            </div>

            <div className="flex flex-col md:flex-row items-center justify-between gap-6 bg-white p-6 rounded-[24px] border border-slate-200 shadow-sm mt-4 ml-0 mr-auto max-w-[1200px]">
                <div className="flex flex-col items-center space-y-2">
                    <div className="flex items-center space-x-2 text-[12px] text-slate-500 font-medium whitespace-nowrap">
                        <button
                            onClick={() => setCurrentPage(1)}
                            disabled={currentPage === 1}
                            className="p-1 rounded-md hover:bg-slate-100 disabled:opacity-30 transition-all active:scale-90"
                        >
                            <ChevronsLeft size={16} />
                        </button>
                        <button
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={currentPage === 1}
                            className="p-1 rounded-md hover:bg-slate-100 disabled:opacity-30 transition-all active:scale-90"
                        >
                            <ChevronLeft size={16} />
                        </button>
                        <span className="mx-2 text-slate-700">Page {currentPage} of {totalPages || 1}</span>
                        <button
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={currentPage === totalPages || totalPages === 0}
                            className="p-1 rounded-md hover:bg-slate-100 disabled:opacity-30 transition-all active:scale-90"
                        >
                            <ChevronRight size={16} />
                        </button>
                        <button
                            onClick={() => setCurrentPage(totalPages)}
                            disabled={currentPage === totalPages || totalPages === 0}
                            className="p-1 rounded-md hover:bg-slate-100 disabled:opacity-30 transition-all active:scale-90"
                        >
                            <ChevronsRight size={16} />
                        </button>
                    </div>

                    <div className="flex items-center space-x-4">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Show per page:</span>
                        <div className="flex items-center gap-4">
                            {[50, 100, 250, 500].map(size => (
                                <button
                                    key={size}
                                    onClick={() => { setPageSize(size); setCurrentPage(1); }}
                                    className={`text-[10px] font-black transition-all ${pageSize === size ? 'text-blue-600 underline underline-offset-4 decoration-2' : 'text-slate-400 hover:text-slate-600'}`}
                                >
                                    {size}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        className="px-4 py-2 bg-slate-50 text-[11px] font-black text-slate-500 rounded-xl hover:bg-blue-50 hover:text-blue-600 transition-all border border-slate-200/50 uppercase tracking-widest flex items-center gap-2 shadow-sm"
                    >
                        <Download size={12} /> Export CSV
                    </button>

                    <div className="relative" ref={batchOpsRef}>
                        <button
                            onClick={() => setIsBatchOpsOpen(!isBatchOpsOpen)}
                            className="px-4 py-2 bg-blue-600 text-[11px] font-bold text-white rounded-md hover:bg-blue-700 transition-all uppercase tracking-wider flex items-center shadow-sm"
                        >
                            Management {isBatchOpsOpen ? <ChevronDown size={14} className="ml-2" /> : <ChevronUp size={14} className="ml-2" />}
                        </button>

                        {isBatchOpsOpen && (
                            <div className="absolute bottom-full right-0 mb-2 w-56 bg-white border border-gray-200 shadow-xl rounded-md py-1 z-[100] animate-in slide-in-from-bottom-2 duration-300 overflow-hidden text-left text-[12px]">
                                <button
                                    onClick={() => { navigate('/account/edit-columns'); setIsBatchOpsOpen(false); }}
                                    className="w-full text-left px-4 py-2 text-[12px] font-medium text-gray-700 hover:bg-gray-100 transition-colors"
                                >
                                    Column Settings
                                </button>
                                <button
                                    onClick={() => {
                                        if (!isSelectionMode) {
                                            window.scrollTo({ top: 0, behavior: 'smooth' });
                                        }
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
        </div>
    );
};

export default BankAccountsView;
