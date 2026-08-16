import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import apiService from '../services/apiService';
import DataTable from '../components/shared/DataTable';
import Button from '../components/shared/Button';
import { Plus, Search, Users, ChevronRight, ChevronDown, ChevronUp, ArrowUpDown } from 'lucide-react';
import { cn } from '../utils/cn';

const ExpenseClaimPayersView = () => {
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const [pageSize, setPageSize] = useState(50);
    const [currentPage, setCurrentPage] = useState(1);
    const [sortColumn, setSortColumn] = useState<string>('name');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

    const [payers, setPayers] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchPayers = async () => {
        setIsLoading(true);
        try {
            const data = await apiService.getExpenseClaimPayers();
            setPayers(data);
        } catch (err) {
            console.error('Failed to fetch expense claim payers:', err);
        } finally {
            setIsLoading(false);
        }
    };

    React.useEffect(() => {
        fetchPayers();
    }, []);

    const filteredPayers = useMemo(() => {
        let result = [...payers];
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            result = result.filter(p => 
                (p.name || '').toLowerCase().includes(query) ||
                (p.code || '').toLowerCase().includes(query)
            );
        }

        return result.sort((a, b) => {
            let valA: any = a[sortColumn] || '';
            let valB: any = b[sortColumn] || '';
            
            if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
            if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });
    }, [payers, searchQuery, sortColumn, sortDirection]);

    const paginatedData = useMemo(() => {
        return filteredPayers.slice((currentPage - 1) * pageSize, currentPage * pageSize);
    }, [filteredPayers, currentPage, pageSize]);

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

    const handleNewPayer = async () => {
        const name = prompt('Enter the name of the new Expense Claim Payer:');
        if (!name) return;
        
        setIsLoading(true);
        try {
            await apiService.createExpenseClaimPayer({ name });
            await fetchPayers();
        } catch (err: any) {
            alert('Failed to create: ' + err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const columns = [
        {
            id: 'code',
            header: <div className="flex items-center cursor-pointer group hover:text-blue-600 transition-colors" onClick={() => handleSort('code')}>Code <SortIcon column="code" /></div>,
            accessor: (p: any) => <span className="text-slate-400 font-mono text-[11px] uppercase tracking-wider bg-slate-100 px-2 py-1 rounded">{p.code}</span>
        },
        {
            id: 'name',
            header: <div className="flex items-center cursor-pointer group hover:text-blue-600 transition-colors" onClick={() => handleSort('name')}>Name <SortIcon column="name" /></div>,
            accessor: (p: any) => (
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center border border-blue-100 text-blue-600">
                        <Users size={14} />
                    </div>
                    <span className="font-bold text-slate-700">{p.name}</span>
                </div>
            )
        }
    ];

    return (
        <div className="h-full flex flex-col bg-slate-50">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 p-6 flex-shrink-0">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-slate-400 hover:text-blue-600 cursor-pointer text-xs font-bold uppercase tracking-widest transition-colors" onClick={() => navigate('/expense-claims')}>Expense Claims</span>
                            <ChevronRight size={12} className="text-slate-300" />
                            <span className="text-blue-600 text-xs font-bold uppercase tracking-widest">Settings</span>
                        </div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Expense Claim Payers</h1>
                        <p className="text-slate-500 text-sm mt-1">Manage the list of people who can submit expense claims</p>
                    </div>
                    
                    <div className="flex items-center gap-3">
                        <Button variant="primary" onClick={handleNewPayer} className="h-10 shadow-md shadow-blue-500/20">
                            <Plus size={16} className="mr-2" />
                            New Payer
                        </Button>
                    </div>
                </div>
                
                <div className="flex items-center gap-4 mt-6">
                    <div className="relative flex-1 max-w-2xl">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input 
                            type="text"
                            placeholder="Search by name or code..."
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
                        emptyMessage="No expense claim payers found"
                    />
                </div>
            </div>
        </div>
    );
};

export default ExpenseClaimPayersView;
