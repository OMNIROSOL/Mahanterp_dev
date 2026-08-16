import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PurchaseEnquiry, ScreenPermission, AppUser } from '../types';
import apiService from '../services/apiService';
import Button from '../components/shared/Button';
import Badge from '../components/shared/Badge';
import Card from '../components/shared/Card';
import DataTable from '../components/shared/DataTable';
import {
    Plus, Copy, FileText, Check, X, Eye, Edit, Printer, ChevronRight, ChevronLeft, Search, Share2,
    ChevronsLeft, ChevronsRight, ChevronDown, ChevronUp, LayoutGrid, HelpCircle, ArrowUpDown
} from 'lucide-react';
import { cn } from '../utils/cn';
import { motion } from 'framer-motion';
import { formatTimestamp } from '../utils/dateUtils';

const PurchaseQuotesView = () => {
    const navigate = useNavigate();
    const { supplierName } = useParams();
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

    const [viewMode, setViewMode] = useState<'list' | 'quotes'>('quotes');
    const [quoteInputs, setQuoteInputs] = useState<Record<string, number>>({});
    const [savingQuotes, setSavingQuotes] = useState<Record<string, boolean>>({});

    const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(() => {
        const defaultVisible: Record<string, boolean> = {
            'Actions': true,
            'Issue Date': true,
            'Expiry Date': true,
            'Reference': true,
            'Supplier': true,
            'Description': true,
            'Status': true,
            'Timestamp': true
        };
        const saved = localStorage.getItem('purchase_quote_column_settings');
        if (saved) {
            const parsed = JSON.parse(saved);
            const record: Record<string, boolean> = { 'Actions': true };
            parsed.forEach((col: any) => {
                const mapping: Record<string, string> = {
                    'issuedate': 'Issue Date',
                    'expirydate': 'Expiry Date',
                    'reference': 'Reference',
                    'supplier': 'Supplier',
                    'description': 'Description',
                    'status': 'Status',
                    'timestamp': 'Timestamp'
                };
                const normalizedId = mapping[col.id.toLowerCase()] || col.id;
                record[normalizedId] = col.visible;
            });
            return { ...defaultVisible, ...record };
        }
        return defaultVisible;
    });

    useEffect(() => {
        setPerms({ screenId: 'purchase-quotes', view: true, add: true, edit: true, delete: true });
    }, [currentUser]);

    useEffect(() => {
        const updateVisibility = () => {
            const saved = localStorage.getItem('purchase_quote_column_settings');
            if (saved) {
                const parsed = JSON.parse(saved);
                const record: Record<string, boolean> = { 'Actions': true };
                parsed.forEach((col: any) => {
                    const mapping: Record<string, string> = {
                        'issuedate': 'Issue Date',
                        'expirydate': 'Expiry Date',
                        'reference': 'Reference',
                        'supplier': 'Supplier',
                        'description': 'Description',
                        'status': 'Status',
                        'timestamp': 'Timestamp'
                    };
                    const normalizedId = mapping[col.id.toLowerCase()] || col.id;
                    record[normalizedId] = col.visible;
                });
                setVisibleColumns(prev => ({ ...prev, ...record }));
            }
        };
        window.addEventListener('storage', updateVisibility);
        return () => window.removeEventListener('storage', updateVisibility);
    }, []);

    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (batchOpsRef.current && !batchOpsRef.current.contains(event.target as Node)) {
                setIsBatchOpsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);




    const toggleColumnVisibility = (id: string) => {
        const newVisible = { ...visibleColumns, [id]: !visibleColumns[id] };
        setVisibleColumns(newVisible);

        const columnsToSave = [
            { id: 'Issue Date', label: 'Issue date', visible: newVisible['Issue Date'] ?? true },
            { id: 'Expiry Date', label: 'Expiry date', visible: newVisible['Expiry Date'] ?? true },
            { id: 'Reference', label: 'Reference', visible: newVisible['Reference'] ?? true },
            { id: 'Supplier', label: 'Supplier', visible: newVisible['Supplier'] ?? true },
            { id: 'Description', label: 'Description', visible: newVisible['Description'] ?? true },
            { id: 'Status', label: 'Status', visible: newVisible['Status'] ?? true },
            { id: 'Timestamp', label: 'Timestamp', visible: newVisible['Timestamp'] ?? false },
        ];
        localStorage.setItem('purchase_quote_column_settings', JSON.stringify(columnsToSave));
        window.dispatchEvent(new Event('storage'));
    };

    const handleSaveQuotes = async (enquiry: any) => {
        setSavingQuotes(prev => ({ ...prev, [enquiry.id]: true }));
        try {
            const itemsToUpdate = (enquiry.items || []).map((i: any) => ({
                id: i.id,
                unitPrice: quoteInputs[i.id] ?? Number(i.unitPrice || 0),
                qty: Number(i.qty || 0),
                totalAmount: (quoteInputs[i.id] ?? Number(i.unitPrice || 0)) * Number(i.qty || 0)
            }));
            await apiService.updateEnquiryQuotes(enquiry.id, itemsToUpdate);
            // Re-fetch to show updated data
            setRefreshTrigger(prev => prev + 1);
        } catch (err) {
            console.error(err);
            alert('Failed to save quotes');
        } finally {
            setSavingQuotes(prev => ({ ...prev, [enquiry.id]: false }));
        }
    };

    const handlePriceChange = (itemId: string, val: string) => {
        setQuoteInputs(prev => ({ ...prev, [itemId]: Number(val) }));
    };

    const [purchaseQuotes, setPurchaseQuotes] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchQuotes = async () => {
            setIsLoading(true);
            try {
                const data = await apiService.getPurchaseEnquiries();
                const mapped = data.map((q: any) => ({
                    ...q,
                    supplier: q.supplier?.name || q.supplier || 'Unknown',
                    currency: q.currency || q.supplier?.currency?.split(' - ')[0] || 'ZMW',
                    issueDate: q.issueDate ? new Date(q.issueDate).toLocaleDateString('en-GB').replace(/\//g, '.') : '',
                    amount: parseFloat(q.amount) || 0,
                    timestamp: formatTimestamp(q.createdAt)
                }));
                setPurchaseQuotes(mapped);
            } catch (err) {
                console.error('Failed to fetch purchase enquiries:', err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchQuotes();
    }, [refreshTrigger]);

    const handleStatusChange = async (id: string, newStatus: string) => {
        try {
            await apiService.updatePurchaseEnquiryStatus(id, newStatus);
            setRefreshTrigger(prev => prev + 1);
            if (newStatus === 'Accepted') {
                navigate('/purchase-orders');
            }
        } catch (err) {
            console.error('Failed to update status:', err);
            alert('Failed to update status. Please try again.');
        }
    };

    const copyToClipboard = (data: any[]) => {
        const header = "Issue Date\tReference\tSupplier\tDescription\tStatus\tTimestamp";
        const rows = data.map(q =>
            `${q.issueDate}\t${q.reference}\t${q.supplier}\t${q.description || ''}\t${q.status}\t${q.timestamp || ''}`
        ).join('\n');
        const fullText = `${header}\n${rows}`;

        if (navigator.clipboard) {
            navigator.clipboard.writeText(fullText).then(() => {
                setCopiedNotification(true);
                setTimeout(() => setCopiedNotification(false), 2000);
            });
        }
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

    const handleCopyToClipboard = () => copyToClipboard(filteredData);

    const handleBatchCopy = () => {
        const selectedQuotes = purchaseQuotes.filter(q => selectedIds.includes(q.id));
        copyToClipboard(selectedQuotes);
    };

    const filteredData = useMemo(() => {
        let result = purchaseQuotes.filter(q => q.status !== 'Accepted' && q.status !== 'Rejected');

        if (statusFilter !== 'All') {
            result = result.filter(q => q.status === statusFilter);
        }
        if (supplierName) {
            result = result.filter(q => q.supplier.toLowerCase() === supplierName.toLowerCase());
        }
        const query = searchQuery.toLowerCase();
        if (query) {
            result = result.filter(q =>
                q.supplier.toLowerCase().includes(query) ||
                q.reference.toLowerCase().includes(query) ||
                q.status.toLowerCase().includes(query) ||
                (q.issueDate && q.issueDate.toLowerCase().includes(query))
            );
        }
        return result.sort((a, b) => {
            let valA: any = a[sortColumn as keyof any] || '';
            let valB: any = b[sortColumn as keyof any] || '';
            if (sortColumn === 'Issue Date') {
                valA = (a.issueDate || '').split('.').reverse().join('-');
                valB = (b.issueDate || '').split('.').reverse().join('-');
            }
            if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
            if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });
    }, [searchQuery, purchaseQuotes, supplierName, statusFilter, sortColumn, sortDirection, refreshTrigger]);



    const paginatedData = useMemo(() => {
        return filteredData.slice((currentPage - 1) * pageSize, currentPage * pageSize);
    }, [filteredData, currentPage, pageSize]);

    const totalPages = Math.ceil(filteredData.length / pageSize) || 1;

    const allColumns = [
        {
            id: 'Selection',
            header: (
                <div className="flex items-center justify-center">
                    <input
                        type="checkbox"
                        checked={selectedIds.length === paginatedData.length && paginatedData.length > 0}
                        onChange={(e) => {
                            if (e.target.checked) setSelectedIds(paginatedData.map(o => o.id));
                            else setSelectedIds([]);
                        }}
                        className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-0 cursor-pointer"
                    />
                </div>
            ),
            accessor: (o: any) => (
                <div className="flex items-center justify-center">
                    <div className="relative flex items-center justify-center w-4 h-4">
                        <input
                            type="checkbox"
                            checked={selectedIds.includes(o.id)}
                            onChange={() => {
                                setSelectedIds(prev =>
                                    prev.includes(o.id) ? prev.filter(id => id !== o.id) : [...prev, o.id]
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
                        onClick={() => navigate(`/purchase-quotes/view/${o.id}`)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all"
                        title="View Details"
                    >
                        <Eye size={14} />
                    </button>
                    {perms?.edit !== false && (
                        <button
                            onClick={() => navigate(`/purchase-quotes/edit/${o.id}`)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all font-bold"
                            title="Edit Enquiry"
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
            className: 'whitespace-nowrap min-w-[120px]',
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
            id: 'Supplier',
            header: <div className="flex items-center cursor-pointer group hover:text-indigo-600 transition-colors" onClick={() => handleSort('Supplier')}>Supplier <SortIcon column="Supplier" /></div>,
            className: 'min-w-[160px]',
            accessor: (o: any) => (
                <span className="font-medium text-slate-600">{typeof o.supplier === 'string' ? o.supplier : o.supplier?.name || 'Unknown'}</span>
            )
        },
        {
            id: 'Description',
            header: <div className="flex items-center cursor-pointer group hover:text-indigo-600 transition-colors" onClick={() => handleSort('Description')}>Description <SortIcon column="Description" /></div>,
            accessor: (o: any) => (
                <span className="text-[11px] text-slate-400 font-medium tracking-tight truncate max-w-[200px] block" title={o.description}>
                    {o.description || '—'}
                </span>
            )
        },

        {
            id: 'Status',
            header: <div className="flex items-center cursor-pointer group hover:text-indigo-600 transition-colors" onClick={() => handleSort('Status')}>Status <SortIcon column="Status" /></div>,
            className: 'whitespace-nowrap',
            accessor: (o: any) => {
                let displayStatus = o.status || 'Draft';
                let isExpired = false;
                return (
                    <div className="flex items-center gap-4">
                        <Badge variant={
                            isExpired ? 'danger' :
                                displayStatus === 'Active' || displayStatus === 'Accepted' ? 'success' :
                                    displayStatus === 'Pending Approval' ? 'warning' :
                                        displayStatus === 'Rejected' ? 'error' :
                                            'default'
                        } className="text-[10px]">
                            {displayStatus.toUpperCase()}
                        </Badge>
                        {(displayStatus === 'Active' || displayStatus === 'Pending Approval') && perms?.edit !== false && !isExpired && (
                            <div className="flex items-center gap-1.5">
                                <button
                                    onClick={() => handleStatusChange(o.id, 'Accepted')}
                                    className="w-7 h-7 flex items-center justify-center rounded-lg border border-emerald-200 bg-white text-emerald-600 hover:bg-emerald-50 hover:border-emerald-500 transition-all shadow-sm"
                                    title="Accept Enquiry"
                                >
                                    <Check size={13} strokeWidth={3} />
                                </button>
                                <button
                                    onClick={() => handleStatusChange(o.id, 'Rejected')}
                                    className="w-7 h-7 flex items-center justify-center rounded-lg border border-rose-200 bg-white text-rose-600 hover:bg-rose-50 hover:border-rose-500 transition-all shadow-sm"
                                    title="Reject Enquiry"
                                >
                                    <X size={13} strokeWidth={3} />
                                </button>
                            </div>
                        )}
                    </div>
                );
            }
        },
        {
            id: 'Timestamp',
            header: <div className="flex items-center cursor-pointer group hover:text-indigo-600 transition-colors" onClick={() => handleSort('Timestamp')}>Timestamp <SortIcon column="Timestamp" /></div>,
            className: 'whitespace-nowrap',
            accessor: (o: any) => (
                <span className="text-[10px] text-slate-400 font-medium font-sans tracking-tight whitespace-nowrap">
                    {o.timestamp || '—'}
                </span>
            )
        }
    ];

    const columns = useMemo(() => {
        let cols = allColumns.filter(col => visibleColumns[col.id]);
        if (isSelectionMode) cols = [allColumns.find(c => c.id === 'Selection')!, ...cols.filter(c => c.id !== 'Selection')];
        return cols;
    }, [visibleColumns, isSelectionMode, selectedIds, paginatedData]);

    return (
        <div className="p-8 space-y-8 animate-in fade-in duration-700 font-sans">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <div className="flex items-center space-x-2 text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] mb-2">
                        <FileText size={14} />
                        <span className="text-gray-400">Procurement Module</span>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Purchase Enquiry</h1>
                    <p className="text-gray-500 text-sm font-medium">Manage and track supplier enquiries</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center bg-slate-100 p-1 rounded-xl">
                        <button 
                            onClick={() => setViewMode('quotes')}
                            className={cn("px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all", viewMode === 'quotes' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700")}
                        >
                            Quotes Entry
                        </button>
                        <button 
                            onClick={() => setViewMode('list')}
                            className={cn("px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all", viewMode === 'list' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700")}
                        >
                            List View
                        </button>
                    </div>
                    {perms?.add !== false && (
                        <button onClick={() => navigate('/purchase-quotes/new')} className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-[12px] font-black hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-500/20 flex items-center uppercase tracking-widest">
                            <Plus size={16} className="mr-2" /> CREATE ENQUIRY
                        </button>
                    )}
                </div>
            </div>

            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-4 flex-1">
                    <div className="relative flex-1 group max-w-xl">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                        <input type="text" placeholder="Search by supplier, reference..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 transition-all" />
                    </div>
                    <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="bg-white border border-slate-200 text-slate-600 text-[11px] font-black uppercase rounded-xl px-5 py-2.5 shadow-sm">
                        <option value="All">All Statuses</option>
                        <option value="Active">Active</option>
                        <option value="Accepted">Accepted</option>
                        <option value="Pending Approval">Pending</option>
                    </select>
                </div>
                <div className="flex flex-col items-end border-l border-slate-100 pl-8">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Active Requests</span>
                    <span className="text-[18px] font-black text-gray-900">{filteredData.length}</span>
                </div>
            </div>

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
                                onClick={() => navigate(`/purchase-quotes/print-batch?ids=${selectedIds.join(',')}`)}
                                disabled={selectedIds.length === 0}
                                className="text-white/90 hover:text-white flex items-center space-x-2 text-[11px] font-black uppercase tracking-widest transition-all disabled:opacity-40"
                            >
                                <Printer size={14} /> <span>Print Enquiries</span>
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
                    <button onClick={() => { setIsSelectionMode(false); setSelectedIds([]); }} className="bg-white/10 hover:bg-white/20 text-white px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border border-white/20">Cancel Batch Mode</button>
                </div>
            )}

            {viewMode === 'list' ? (
                <div className="w-fit min-w-full overflow-hidden mb-8 custom-scrollbar rounded-2xl border border-slate-100 shadow-sm shadow-indigo-50/50">
                    <DataTable
                        data={isLoading ? [] : paginatedData}
                        columns={columns as any}
                        tableClassName="min-w-[1100px]"
                        className="border-none shadow-none bg-transparent"
                        hideDefaultPagination={true}
                        stickyHeader={true}
                        disableInternalScroll={false}
                        emptyMessage={
                            isLoading ? (
                                <div className="flex flex-col items-center justify-center py-20 space-y-4">
                                    <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-600 rounded-full animate-spin"></div>
                                    <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Fetching purchase enquiries...</p>
                                </div>
                            ) : undefined
                        }
                    />
                </div>
            ) : (
                <div className="space-y-6">
                    {paginatedData.map(enquiry => (
                        <div key={enquiry.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                                <div>
                                    <div className="text-[10px] font-black uppercase tracking-widest text-indigo-600 mb-1">{enquiry.reference}</div>
                                    <h3 className="font-bold text-slate-800">{enquiry.supplier}</h3>
                                    <p className="text-xs text-slate-500 mt-1">{enquiry.issueDate}</p>
                                </div>
                                <button 
                                    onClick={() => handleSaveQuotes(enquiry)}
                                    disabled={savingQuotes[enquiry.id]}
                                    className="px-6 py-2 bg-indigo-600 text-white rounded-xl text-[10px] uppercase tracking-widest font-black shadow-md shadow-indigo-200 hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                                >
                                    {savingQuotes[enquiry.id] ? 'Saving...' : 'Save Quotes'}
                                </button>
                            </div>
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="text-[9px] font-black uppercase tracking-widest text-slate-400 bg-slate-50 border-y border-slate-100">
                                        <th className="px-4 py-2">Item Name</th>
                                        <th className="px-4 py-2 text-center">Qty</th>
                                        <th className="px-4 py-2 w-48 text-right">Quoted Unit Price ({enquiry.currency || 'ZMW'})</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {(enquiry.items || []).map((item: any) => (
                                        <tr key={item.id} className="hover:bg-slate-50/50">
                                            <td className="px-4 py-3 text-xs font-bold text-slate-700">
                                                {item.item?.itemName || item.description || 'Unknown Item'}
                                            </td>
                                            <td className="px-4 py-3 text-xs font-bold text-slate-600 text-center">
                                                {Number(item.qty).toString()} {item.unit}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <input 
                                                    type="number"
                                                    className="w-32 px-3 py-1.5 border border-slate-200 rounded-lg text-right text-xs font-black text-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                    placeholder={Number(item.unitPrice).toString()}
                                                    value={quoteInputs[item.id] !== undefined ? quoteInputs[item.id] : (Number(item.unitPrice) || '')}
                                                    onChange={(e) => handlePriceChange(item.id, e.target.value)}
                                                />
                                            </td>
                                        </tr>
                                    ))}
                                    {(!enquiry.items || enquiry.items.length === 0) && (
                                        <tr>
                                            <td colSpan={3} className="px-4 py-4 text-center text-[10px] uppercase font-bold tracking-widest text-slate-400">
                                                No items in this enquiry
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    ))}
                    {paginatedData.length === 0 && !isLoading && (
                        <div className="text-center py-12 text-slate-400 font-bold uppercase tracking-widest text-[10px]">
                            No enquiries found.
                        </div>
                    )}
                </div>
            )}

            <div className="flex flex-col md:flex-row items-center justify-between bg-white px-8 py-6 rounded-[32px] border border-slate-100 shadow-sm gap-8 mt-8">
                <div className="flex flex-col items-start gap-1">
                    <div className="flex items-center gap-2 text-slate-400">
                        <button
                            onClick={() => { setCurrentPage(1); document.querySelector('main')?.scrollTo({ top: 0, behavior: 'smooth' }); }}
                            disabled={currentPage === 1}
                            className="p-1 hover:text-indigo-600 disabled:opacity-20 transition-all"
                        >
                            <ChevronsLeft size={18} strokeWidth={1.5} />
                        </button>
                        <button
                            onClick={() => { setCurrentPage(prev => Math.max(1, prev - 1)); document.querySelector('main')?.scrollTo({ top: 0, behavior: 'smooth' }); }}
                            disabled={currentPage === 1}
                            className="p-1 hover:text-indigo-600 disabled:opacity-20 transition-all mr-2"
                        >
                            <ChevronLeft size={18} strokeWidth={1.5} />
                        </button>
                        <span className="text-[13px] font-semibold text-slate-600 tracking-tight">Page {currentPage} of {totalPages || 1}</span>
                        <button
                            onClick={() => { setCurrentPage(prev => Math.min(totalPages, prev + 1)); document.querySelector('main')?.scrollTo({ top: 0, behavior: 'smooth' }); }}
                            disabled={currentPage === totalPages || totalPages === 0}
                            className="p-1 hover:text-indigo-600 disabled:opacity-20 transition-all ml-2"
                        >
                            <ChevronRight size={18} strokeWidth={1.5} />
                        </button>
                        <button
                            onClick={() => { setCurrentPage(totalPages); document.querySelector('main')?.scrollTo({ top: 0, behavior: 'smooth' }); }}
                            disabled={currentPage === totalPages || totalPages === 0}
                            className="p-1 hover:text-indigo-600 disabled:opacity-20 transition-all"
                        >
                            <ChevronsRight size={18} strokeWidth={1.5} />
                        </button>
                    </div>
                    <div className="flex items-center gap-6 mt-1">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">SHOW PER PAGE:</span>
                        <div className="flex items-center gap-4">
                            {[50, 100, 250, 500].map(size => (
                                <button
                                    key={size}
                                    onClick={() => { setPageSize(size); setCurrentPage(1); document.querySelector('main')?.scrollTo({ top: 0, behavior: 'smooth' }); }}
                                    className={cn(
                                        "text-[11px] font-black transition-all relative py-1",
                                        pageSize === size ? "text-indigo-600" : "text-slate-400 hover:text-slate-600"
                                    )}
                                >
                                    {size}
                                    {pageSize === size && <motion.div layoutId="activeQuotePageSize" className="absolute -bottom-1 left-0 right-0 h-0.5 bg-indigo-600 rounded-full" />}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <button
                        onClick={handleCopyToClipboard}
                        className="px-8 py-3.5 bg-white border border-slate-200 rounded-full text-[11px] font-black text-slate-500 uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center gap-3 shadow-sm"
                    >
                        <Copy size={16} className="text-slate-400" /> EXPORT DATA
                    </button>
                    <div className="relative group" ref={batchOpsRef}>
                        <button
                            onClick={() => setIsBatchOpsOpen(!isBatchOpsOpen)}
                            className="px-10 py-3.5 bg-indigo-600 text-white rounded-[20px] text-[11px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-600/20 flex items-center gap-4"
                        >
                            MANAGEMENT <ChevronUp size={16} className={cn("transition-transform", isBatchOpsOpen && "rotate-180")} />
                        </button>
                        {isBatchOpsOpen && (
                            <div className="absolute bottom-full right-0 mb-4 w-56 bg-white border border-gray-100 shadow-2xl rounded-2xl py-3 z-[100] animate-in slide-in-from-bottom-2 duration-200 overflow-hidden">
                                <button
                                    onClick={() => { setIsSelectionMode(!isSelectionMode); setIsBatchOpsOpen(false); }}
                                    className="w-full text-left px-6 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 transition-all"
                                >
                                    {isSelectionMode ? 'Disable Batch Mode' : 'Enable Batch Actions'}
                                </button>
                                <button
                                    onClick={() => { navigate('/purchase-quotes/edit-columns'); setIsBatchOpsOpen(false); }}
                                    className="w-full text-left px-6 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 transition-all"
                                >
                                    Column Setting
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PurchaseQuotesView;
