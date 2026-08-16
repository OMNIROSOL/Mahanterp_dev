import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import apiService from '../services/apiService';
import { Account } from '../types';
import DataTable from '../components/shared/DataTable';
import Button from '../components/shared/Button';
import Badge from '../components/shared/Badge';
import { 
    Plus, Search, FileText, ChevronRight, Eye, Edit, Copy, 
    ChevronDown, ChevronUp, ChevronsLeft, ChevronsRight, 
    ChevronLeft, LayoutGrid, HelpCircle, ArrowUpDown, Check, X,
    DollarSign, Briefcase, CreditCard, Building, Landmark,
    TrendingUp, Calculator, PieChart, Download
} from 'lucide-react';
import { cn } from '../utils/cn';

const AccountsView = () => {
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [pageSize, setPageSize] = useState(50);
    const [currentPage, setCurrentPage] = useState(1);
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [isBatchOpsOpen, setIsBatchOpsOpen] = useState(false);
    const [sortColumn, setSortColumn] = useState<string>('Name');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
    const batchOpsRef = React.useRef<HTMLDivElement>(null);

    const [accounts, setAccounts] = useState<Account[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (batchOpsRef.current && !batchOpsRef.current.contains(event.target as Node)) {
                setIsBatchOpsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    React.useEffect(() => {
        const fetchAccounts = async () => {
            setIsLoading(true);
            try {
                const data = await apiService.getAccounts();
                setAccounts(data);
            } catch (err) {
                console.error('Failed to fetch accounts:', err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchAccounts();
    }, []);

    const filteredAccounts = useMemo(() => {
        let result = [...accounts];
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            result = result.filter(a => 
                a.name.toLowerCase().includes(query) || 
                a.type.toLowerCase().includes(query)
            );
        }
        if (statusFilter !== 'All') {
            // Placeholder for type-based filtering if needed
        }

        return result.sort((a, b) => {
            let valA: any = a[sortColumn as keyof Account] || '';
            let valB: any = b[sortColumn as keyof Account] || '';
            
            if (sortColumn === 'Balance') {
                valA = a.balance;
                valB = b.balance;
            }

            if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
            if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });
    }, [accounts, searchQuery, sortColumn, sortDirection, statusFilter]);

    const paginatedData = useMemo(() => {
        return filteredAccounts.slice((currentPage - 1) * pageSize, currentPage * pageSize);
    }, [filteredAccounts, currentPage, pageSize]);

    const totalPages = Math.ceil(filteredAccounts.length / pageSize) || 1;

    const totalBalance = useMemo(() => filteredAccounts.reduce((sum, a) => sum + a.balance, 0), [filteredAccounts]);

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

    const columns = [
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
                        onClick={() => navigate(`/accounts/view/${a.id}`)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all"
                        title="View Details"
                    >
                        <Eye size={14} />
                    </button>
                    <button
                        onClick={() => navigate(`/accounts/edit/${a.id}`)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all font-bold"
                        title="Edit Account"
                    >
                        <Edit size={14} />
                    </button>
                </div>
            )
        },
        {
            id: 'Name',
            header: <div className="flex items-center cursor-pointer group hover:text-blue-600 transition-colors" onClick={() => handleSort('Name')}>Account Title <SortIcon column="Name" /></div>,
            className: 'min-w-[250px]',
            accessor: (a: any) => (
                <div className="flex items-center gap-3">
                    <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center border",
                        a.type === 'Asset' ? "bg-blue-50 text-blue-600 border-blue-100/50" : 
                        a.type === 'Liability' ? "bg-rose-50 text-rose-600 border-rose-100/50" :
                        a.type === 'Equity' ? "bg-amber-50 text-amber-600 border-amber-100/50" :
                        "bg-slate-50 text-slate-600 border-slate-100/50"
                    )}>
                        {a.type === 'Asset' ? <Landmark size={14} /> : a.type === 'Liability' ? <CreditCard size={14} /> : <TrendingUp size={14} />}
                    </div>
                    <div className="flex flex-col">
                        <span className="font-black text-slate-900 uppercase tracking-tight text-[11px]">{a.name}</span>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{a.code || 'NO-REF'}</span>
                    </div>
                </div>
            )
        },
        {
            id: 'Type',
            header: <div className="flex items-center cursor-pointer group hover:text-blue-600 transition-colors" onClick={() => handleSort('Type')}>Classification <SortIcon column="Type" /></div>,
            className: 'min-w-[150px]',
            accessor: (a: any) => (
                <Badge variant={a.type === 'Asset' ? 'success' : a.type === 'Liability' ? 'warning' : 'neutral'} className="text-[10px] tracking-widest">
                    {a.type.toUpperCase()}
                </Badge>
            )
        },
        {
            id: 'Balance',
            header: <div className="flex items-center justify-end cursor-pointer group hover:text-blue-600 transition-colors" onClick={() => handleSort('Balance')}>Current Balance <SortIcon column="Balance" /></div>,
            className: 'text-right min-w-[180px]',
            accessor: (a: any) => (
                <div className="text-right">
                    <span className="text-[10px] text-slate-400 font-bold mr-1 group-hover:text-blue-600 transition-colors tracking-tighter">ZMW</span>
                    <span className={cn(
                        "font-black tracking-tight",
                        a.balance < 0 ? "text-rose-600" : "text-blue-600"
                    )}>
                        {Math.abs(a.balance).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        {a.balance < 0 && <span className="ml-1 opacity-50 text-[9px]">(CR)</span>}
                    </span>
                </div>
            )
        }
    ];

    const visibleColumns = useMemo(() => {
        let cols = columns;
        if (!isSelectionMode) {
            cols = cols.filter(c => c.id !== 'Selection');
        }
        return cols;
    }, [isSelectionMode, selectedIds, paginatedData]);

    return (
        <div className="p-8 space-y-8 max-w-[1600px] mx-auto animate-in fade-in duration-700 font-sans">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <div className="flex items-center space-x-2 text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] mb-2">
                        <Calculator size={14} />
                        <span className="text-gray-400">Financial Core</span>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Chart of Accounts</h1>
                    <p className="text-gray-500 text-sm font-medium">Manage your financial structure and ledger balances</p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate('/accounts/new')}
                        className="bg-blue-600 text-white px-5 py-2.5 rounded-xl text-[12px] font-black hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20 flex items-center uppercase tracking-widest"
                    >
                        <Plus size={16} className="mr-2" /> CREATE NEW ACCOUNT
                    </button>
                </div>
            </div>

            <div className="mt-8 flex flex-col md:flex-row items-center justify-between gap-6 pb-2">
                <div className="flex items-center gap-4 flex-1">
                    <div className="relative flex-1 group max-w-xl">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 transition-colors group-focus-within:text-blue-500" size={14} />
                        <input
                            type="text"
                            placeholder="Search by title, code or classification..."
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white shadow-sm transition-all"
                        />
                    </div>
                </div>

                <div className="flex items-center space-x-4">
                    <div className="flex flex-col items-end border-l border-slate-100 pl-8">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Total Accounts</span>
                        <span className="text-[18px] font-black text-gray-900 leading-none">
                            {filteredAccounts.length}
                        </span>
                    </div>
                </div>
            </div>

            <div className="w-fit min-w-full overflow-visible mb-8 custom-scrollbar rounded-2xl border border-slate-100 shadow-sm shadow-indigo-50/50 overflow-hidden bg-white">
                <DataTable
                    data={paginatedData}
                    columns={visibleColumns as any}
                    tableClassName="w-full"
                    className="border-none shadow-none bg-transparent"
                    hideDefaultPagination={true}
                    tableFooter={
                        <tr className="bg-slate-50/50 font-black">
                            <td className="px-6 py-6" colSpan={isSelectionMode ? 4 : 3}>
                                <div className="flex items-center gap-2">
                                    <PieChart size={14} className="text-slate-400" />
                                    <span className="text-[10px] text-slate-400 uppercase tracking-[0.2em]">Aggregate Equity Balance</span>
                                </div>
                            </td>
                            <td className="px-6 py-6 text-right">
                                <span className="text-[10px] text-slate-400 font-bold mr-1 tracking-tighter">ZMW</span>
                                <span className={cn(
                                    "text-[14px] underline underline-offset-4 decoration-2",
                                    totalBalance < 0 ? "text-rose-600 decoration-rose-100" : "text-blue-600 decoration-blue-100"
                                )}>
                                    {Math.abs(totalBalance).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    {totalBalance < 0 && <span className="ml-1 text-[9px] opacity-50">(CR)</span>}
                                </span>
                            </td>
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
                            <div className="absolute bottom-full right-0 mb-2 w-56 bg-white border border-gray-200 shadow-xl rounded-md py-1 z-[100] animate-in slide-in-from-bottom-2 duration-300 overflow-hidden text-left">
                                <button
                                    onClick={() => { navigate('/accounts/edit-columns'); setIsBatchOpsOpen(false); }}
                                    className="w-full text-left px-4 py-2 text-[12px] font-medium text-gray-700 hover:bg-gray-100 transition-colors"
                                >
                                    Column Settings
                                </button>
                                <button
                                    onClick={() => {
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

export default AccountsView;
