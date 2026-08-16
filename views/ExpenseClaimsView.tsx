import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import apiService from '../services/apiService';
import DataTable from '../components/shared/DataTable';
import Button from '../components/shared/Button';
import { 
    Plus, Search, FileText, ChevronRight, Eye, Edit, Copy, 
    ChevronDown, ChevronUp, ArrowUpDown
} from 'lucide-react';
import { cn } from '../utils/cn';

const ExpenseClaimsView = () => {
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const [pageSize, setPageSize] = useState(50);
    const [currentPage, setCurrentPage] = useState(1);
    const [sortColumn, setSortColumn] = useState<string>('date');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

    const [claims, setClaims] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    React.useEffect(() => {
        const fetchClaims = async () => {
            setIsLoading(true);
            try {
                const data = await apiService.getExpenseClaims();
                setClaims(data);
            } catch (err) {
                console.error('Failed to fetch expense claims:', err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchClaims();
    }, []);

    const filteredClaims = useMemo(() => {
        let result = [...claims];
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            result = result.filter(c => 
                (c.reference || '').toLowerCase().includes(query) ||
                (c.payee || '').toLowerCase().includes(query) ||
                (c.description || '').toLowerCase().includes(query) ||
                (c.payer?.name || '').toLowerCase().includes(query)
            );
        }

        return result.sort((a, b) => {
            let valA: any = a[sortColumn] || '';
            let valB: any = b[sortColumn] || '';
            
            if (sortColumn === 'Amount') {
                valA = a.items?.reduce((sum: number, item: any) => sum + (Number(item.qty) * Number(item.unitPrice)), 0) || 0;
                valB = b.items?.reduce((sum: number, item: any) => sum + (Number(item.qty) * Number(item.unitPrice)), 0) || 0;
            } else if (sortColumn === 'Paid by') {
                valA = a.payer?.name || '';
                valB = b.payer?.name || '';
            }

            if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
            if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });
    }, [claims, searchQuery, sortColumn, sortDirection]);

    const paginatedData = useMemo(() => {
        return filteredClaims.slice((currentPage - 1) * pageSize, currentPage * pageSize);
    }, [filteredClaims, currentPage, pageSize]);

    const SortIcon = ({ column }: { column: string }) => {
        if (sortColumn !== column) return <ArrowUpDown size={12} className="ml-1 opacity-20 group-hover:opacity-50" />;
        return sortDirection === 'asc' ? <ChevronUp size={12} className="ml-1 text-blue-500" /> : <ChevronDown size={12} className="ml-1 text-blue-500" />;
    };

    const handleSort = (column: string) => {
        if (sortColumn === column) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortColumn(column);
            setSortDirection('asc');
        }
    };

    const columns = [
        {
            id: 'actions',
            header: <div className="text-center w-16">Actions</div>,
            className: 'w-16 px-2 text-center',
            accessor: (c: any) => (
                <div className="flex items-center justify-center gap-1">
                    <button onClick={() => navigate(`/expense-claims/view/${c.id}`)} className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-blue-600 transition-colors" title="View"><Eye size={14} /></button>
                    <button onClick={() => navigate(`/expense-claims/edit/${c.id}`)} className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-blue-600 transition-colors" title="Edit"><Edit size={14} /></button>
                </div>
            )
        },
        {
            id: 'date',
            header: <div className="flex items-center cursor-pointer group hover:text-blue-600 transition-colors" onClick={() => handleSort('date')}>Date <SortIcon column="date" /></div>,
            accessor: (c: any) => <span className="text-slate-600 font-medium">{new Date(c.date).toLocaleDateString()}</span>
        },
        {
            id: 'Paid by',
            header: <div className="flex items-center cursor-pointer group hover:text-blue-600 transition-colors" onClick={() => handleSort('Paid by')}>Paid by <SortIcon column="Paid by" /></div>,
            accessor: (c: any) => <span className="font-bold text-slate-700">{c.payer?.name}</span>
        },
        {
            id: 'payee',
            header: <div className="flex items-center cursor-pointer group hover:text-blue-600 transition-colors" onClick={() => handleSort('payee')}>Payee <SortIcon column="payee" /></div>,
            accessor: (c: any) => <span className="text-slate-600 uppercase text-[11px] font-bold">{c.payee || '—'}</span>
        },
        {
            id: 'description',
            header: <div className="flex items-center cursor-pointer group hover:text-blue-600 transition-colors" onClick={() => handleSort('description')}>Description <SortIcon column="description" /></div>,
            accessor: (c: any) => <span className="text-slate-500">{c.description || '—'}</span>
        },
        {
            id: 'Amount',
            header: <div className="flex items-center justify-end cursor-pointer group hover:text-blue-600 transition-colors" onClick={() => handleSort('Amount')}>Amount <SortIcon column="Amount" /></div>,
            className: 'text-right',
            accessor: (c: any) => {
                const total = c.items?.reduce((sum: number, item: any) => sum + (Number(item.qty) * Number(item.unitPrice)), 0) || 0;
                return (
                    <div className="text-right">
                        <span className="text-[10px] text-slate-400 font-bold mr-1">{c.currency || 'ZMW'}</span>
                        <span className="font-black text-slate-700">
                            {total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                    </div>
                );
            }
        }
    ];

    return (
        <div className="h-full flex flex-col bg-slate-50">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 p-6 flex-shrink-0">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <FileText size={14} className="text-blue-600" />
                            <span className="text-gray-400 text-xs font-bold uppercase tracking-widest">Financial Core</span>
                        </div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Expense Claims</h1>
                        <p className="text-slate-500 text-sm mt-1">Manage out-of-pocket expenses and reimbursements</p>
                    </div>
                    
                    <div className="flex items-center gap-3">
                        <Button variant="secondary" onClick={() => navigate('/expense-claim-payers')} className="h-10">
                            Manage Payers
                        </Button>
                        <Button variant="primary" onClick={() => navigate('/expense-claims/new')} className="h-10 shadow-md shadow-blue-500/20">
                            <Plus size={16} className="mr-2" />
                            New Expense Claim
                        </Button>
                    </div>
                </div>
                
                <div className="flex items-center gap-4 mt-6">
                    <div className="relative flex-1 max-w-2xl">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input 
                            type="text"
                            placeholder="Search by payee, description or payer..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                        />
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-6">
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col">
                    <DataTable 
                        columns={columns}
                        data={paginatedData}
                        isLoading={isLoading}
                        emptyMessage="No expense claims found"
                    />
                </div>
            </div>
        </div>
    );
};

export default ExpenseClaimsView;
