import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiService from '../services/apiService';
import { ApprovalRequest } from '../types';
import {
    Check,
    X,
    ChevronDown,
    Eye,
    MoreHorizontal,
    Search,
    ShieldCheck,
    User,
    Clock,
    AlertCircle,
    ChevronRight,
    ChevronLeft,
    ChevronsLeft,
    ChevronsRight,
    ArrowUpDown,
    ChevronUp,
    ChevronDown as ChevronDownIcon,
    Copy,
    LayoutGrid
} from 'lucide-react';
import { cn } from '../utils/cn';
import { formatTimestamp } from '../utils/dateUtils';
import DataTable from '../components/shared/DataTable';
import Badge from '../components/shared/Badge';

const ApprovalsView = () => {
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);
    const [sortColumn, setSortColumn] = useState<string>('Date');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
    const [requests, setRequests] = useState<ApprovalRequest[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Pagination & UI States
    const [pageSize, setPageSize] = useState(50);
    const [currentPage, setCurrentPage] = useState(1);
    const [isBatchOpsOpen, setIsBatchOpsOpen] = useState(false);
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const batchOpsRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (openMenuId) setOpenMenuId(null);
            if (batchOpsRef.current && !batchOpsRef.current.contains(event.target as Node)) {
                setIsBatchOpsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [openMenuId, isBatchOpsOpen]);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [quotes, orders] = await Promise.all([
                apiService.getQuotes(),
                apiService.getOrders()
            ]);

            const pendingQuotes = quotes.filter((q: any) => q.status === 'Pending Approval');
            const pendingOrders = orders.filter((o: any) => o.status === 'Pending Approval');

            const mappedQuotes: ApprovalRequest[] = pendingQuotes.map((q: any) => {
                const options = q.docOptions || {};
                return {
                    id: q.id,
                    type: 'Quote',
                    customer: q.customer?.name || 'Unknown',
                    amount: parseFloat(q.amount || 0),
                    currency: q.currency || q.customer?.currency?.split(' - ')[0] || 'ZMW',
                    requestedBy: options.requestedBy || 'System',
                    approver: 'Admin',
                    reason: options.approvalReason || q.description || 'Margin Review Required',
                    status: 'Pending',
                    date: q.issueDate ? new Date(q.issueDate).toLocaleDateString('en-GB').replace(/\//g, '.') : '',
                    reference: q.reference,
                    timestamp: formatTimestamp(q.createdAt)
                };
            });

            const mappedOrders: ApprovalRequest[] = pendingOrders.map((o: any) => {
                const options = o.docOptions || {};
                return {
                    id: o.id,
                    type: 'Order',
                    customer: o.customer?.name || o.customer || 'Unknown',
                    amount: parseFloat(o.amount || 0),
                    currency: o.currency || o.customer?.currency?.split(' - ')[0] || 'ZMW',
                    requestedBy: options.requestedBy || 'System',
                    approver: 'Admin',
                    reason: options.approvalReason || o.description || 'Stock/Margin Review Required',
                    status: 'Pending',
                    date: o.orderDate ? new Date(o.orderDate).toLocaleDateString('en-GB').replace(/\//g, '.') : '',
                    reference: o.reference,
                    timestamp: formatTimestamp(o.createdAt)
                };
            });

            setRequests([...mappedQuotes, ...mappedOrders]);
        } catch (err) {
            console.error('Failed to fetch approvals:', err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleAction = async (id: string, status: 'Approved' | 'Rejected', type: 'Quote' | 'Order') => {
        try {
            if (type === 'Quote') {
                const newStatus = status === 'Approved' ? 'Active' : 'Inactive';
                await apiService.updateQuoteStatus(id, newStatus);
            } else {
                const newStatus = status === 'Approved' ? 'Ordered' : 'Inactive';
                await apiService.updateOrderStatus(id, newStatus);
            }
            setRequests(prev => prev.filter(r => r.id !== id));
            alert(`${type} ${status === 'Approved' ? 'Approved' : 'marked as Inactive'} successfully.`);
        } catch (err) {
            console.error('Failed to update status:', err);
            alert('Failed to update status.');
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
        if (sortColumn !== column) return <ArrowUpDown size={12} className="ml-1 opacity-20" />;
        return sortDirection === 'asc' ? <ChevronUp size={12} className="ml-1 text-blue-500" /> : <ChevronDownIcon size={12} className="ml-1 text-blue-500" />;
    };

    const handleCopyToClipboard = () => {
        const header = "Date\tTimestamp\tCustomer\tType\tReference\tAmount\tRequested By\tReason\tStatus";
        const rows = filteredRequests.map(r =>
            `${r.date}\t${r.timestamp || '—'}\t${r.customer}\t${r.type}\t${r.reference}\t${r.amount}\t${r.requestedBy}\t${r.reason}\t${r.status}`
        ).join('\n');
        navigator.clipboard.writeText(`${header}\n${rows}`).then(() => alert('Exported to clipboard'));
    };

    const filteredRequests = useMemo(() => {
        const query = searchQuery.toLowerCase();
        const result = requests.filter(r => {
            return (
                r.customer.toLowerCase().includes(query) ||
                (r.reference && r.reference.toLowerCase().includes(query)) ||
                r.reason.toLowerCase().includes(query) ||
                r.requestedBy.toLowerCase().includes(query)
            );
        });

        return result.sort((a, b) => {
            let valA: any = (a as any)[sortColumn.toLowerCase()] || '';
            let valB: any = (b as any)[sortColumn.toLowerCase()] || '';

            if (sortColumn === 'Timestamp') {
                const parseTs = (s: string) => {
                    if (!s || s === '—') return '';
                    const parts = s.split(' ');
                    if (parts.length < 2) return s;
                    const [d, t] = parts;
                    const dateParts = d.split('.');
                    if (dateParts.length !== 3) return s;
                    return `${dateParts[2]}-${dateParts[1]}-${dateParts[0]} ${t} ${parts[2] || ''}`;
                };
                valA = parseTs(a.timestamp || '');
                valB = parseTs(b.timestamp || '');
            }

            if (sortColumn === 'Date') {
                valA = a.date.split('.').reverse().join('-');
                valB = b.date.split('.').reverse().join('-');
            }

            if (valA === valB) return 0;
            if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
            return sortDirection === 'asc' ? 1 : -1;
        });
    }, [requests, searchQuery, sortColumn, sortDirection]);

    const totalPages = Math.ceil(filteredRequests.length / pageSize);
    const displayData = useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return filteredRequests.slice(start, start + pageSize);
    }, [filteredRequests, currentPage, pageSize]);

    const columns = [
        {
            id: 'Actions',
            header: <span className="text-center w-full block">Actions</span>,
            className: 'w-32',
            accessor: (request: ApprovalRequest, index: number) => (
                <div className="flex justify-center relative">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuId(openMenuId === request.id ? null : request.id);
                        }}
                        className={cn(
                            "bg-white border rounded-md px-3 py-1.5 text-[11px] font-bold transition-all shadow-sm flex items-center justify-center space-x-2 active:scale-95",
                            openMenuId === request.id ? "border-indigo-500 text-indigo-600 ring-4 ring-indigo-50" : "border-slate-200 text-slate-600 hover:border-slate-400"
                        )}
                    >
                        <span>Review</span>
                        <span className="bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full text-[9px] font-bold">
                            {(currentPage - 1) * pageSize + index + 1}
                        </span>
                        <ChevronDown size={10} className={cn("transition-transform duration-200", openMenuId === request.id && "rotate-180")} />
                    </button>

                    {openMenuId === request.id && (
                        <div
                            onMouseDown={(e) => e.stopPropagation()}
                            className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-44 bg-white border border-slate-200 rounded-xl shadow-2xl z-50 p-1.5 animate-in fade-in zoom-in-95 duration-200"
                        >
                            <button
                                onClick={() => handleAction(request.id, 'Approved', request.type)}
                                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-emerald-600 hover:bg-emerald-50 text-[11px] font-black uppercase tracking-wider transition-colors"
                            >
                                <div className="w-5 h-5 rounded-md bg-emerald-100 flex items-center justify-center">
                                    <Check size={12} strokeWidth={3} />
                                </div>
                                Approve
                            </button>
                            <button
                                onClick={() => handleAction(request.id, 'Rejected', request.type)}
                                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-rose-600 hover:bg-rose-50 text-[11px] font-black uppercase tracking-wider transition-colors mt-0.5"
                            >
                                <div className="w-5 h-5 rounded-md bg-rose-100 flex items-center justify-center">
                                    <X size={12} strokeWidth={3} />
                                </div>
                                Reject
                            </button>
                            <div className="h-px bg-slate-100 my-1 mx-2" />
                            <button
                                onClick={() => navigate(request.type === 'Quote' ? `/sales-quotes/view/${request.id}` : `/sales-orders/view/${request.id}`)}
                                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-slate-500 hover:bg-slate-50 text-[11px] font-black uppercase tracking-wider transition-colors"
                            >
                                <div className="w-5 h-5 rounded-md bg-slate-100 flex items-center justify-center">
                                    <Eye size={12} strokeWidth={3} />
                                </div>
                                Details
                            </button>
                        </div>
                    )}
                </div>
            )
        },
        {
            id: 'Date',
            header: <div className="flex items-center cursor-pointer group" onClick={() => handleSort('Date')}>Date <SortIcon column="Date" /></div>,
            accessor: (r: ApprovalRequest) => <span className="text-slate-500 font-medium tabular-nums text-xs whitespace-nowrap">{r.date}</span>
        },
        {
            id: 'Reference',
            header: <div className="flex items-center cursor-pointer group" onClick={() => handleSort('Reference')}>Reference <SortIcon column="Reference" /></div>,
            accessor: (r: ApprovalRequest) => <span className="font-bold text-indigo-600 text-xs tracking-tight">{r.reference}</span>
        },
        {
            id: 'Customer',
            header: <div className="flex items-center cursor-pointer group" onClick={() => handleSort('Customer')}>Customer <SortIcon column="Customer" /></div>,
            accessor: (r: ApprovalRequest) => (
                <span className="font-medium text-slate-600">{r.customer}</span>
            )
        },
        {
            id: 'Amount',
            header: <div className="flex items-center justify-end cursor-pointer group" onClick={() => handleSort('Amount')}>Amount <SortIcon column="Amount" /></div>,
            className: 'text-right',
            accessor: (r: ApprovalRequest) => (
                <div className="flex flex-col items-end">
                    <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{r.currency || 'ZMW'}</span>
                    <span className="text-[14px] font-black text-slate-900 tracking-tighter">
                        {r.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                </div>
            )
        },
        {
            id: 'Requested By',
            header: 'Requested By',
            accessor: (r: ApprovalRequest) => (
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 border border-slate-200">
                        <User size={12} />
                    </div>
                    <span className="text-slate-600 font-medium">{r.requestedBy}</span>
                </div>
            )
        },
        {
            id: 'Reason',
            header: 'Reason',
            className: 'max-w-[300px]',
            accessor: (r: ApprovalRequest) => (
                <div className="flex items-start gap-2">
                    <AlertCircle size={14} className="text-amber-400 mt-0.5 shrink-0" />
                    <span className="text-slate-500 text-xs leading-relaxed truncate group-hover:whitespace-normal transition-all" title={r.reason}>
                        {r.reason}
                    </span>
                </div>
            )
        },
        {
            id: 'Status',
            header: 'Status',
            accessor: (r: ApprovalRequest) => (
                <Badge variant={r.status === 'Pending' ? 'warning' : r.status === 'Approved' ? 'success' : 'danger'}>
                    {r.status}
                </Badge>
            )
        },
        {
            id: 'Timestamp',
            header: <div className="flex items-center cursor-pointer group" onClick={() => handleSort('Timestamp')}>Timestamp <SortIcon column="Timestamp" /></div>,
            accessor: (r: ApprovalRequest) => <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap">{r.timestamp || '—'}</span>
        }
    ];

    return (
        <div className="p-8 space-y-6 max-w-[1600px] mx-auto animate-in fade-in duration-500 font-sans">
            {/* Page Header Area */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <div className="flex items-center space-x-2 text-[10px] font-bold text-indigo-600 uppercase tracking-widest mb-1">
                        <ShieldCheck size={14} />
                        <span className="text-gray-400">Workflow Management</span>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 leading-tight tracking-tight">Pending Approvals</h1>
                    <p className="text-gray-500 text-sm">Review and manage document submission requests.</p>
                </div>
            </div>

            {/* Dashboard Stats / Search Area */}
            <div className="mt-8 flex flex-col md:flex-row items-center justify-between gap-6 pb-2">
                <div className="flex items-center gap-4 flex-1">
                    <div className="relative flex-1 group max-w-xl">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 transition-colors group-focus-within:text-indigo-500" size={14} />
                        <input
                            type="text"
                            placeholder="Search by customer, quote ID, or requester..."
                            value={searchQuery}
                            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-4 focus:ring-indigo-50 focus:border-indigo-400 bg-white shadow-sm transition-all"
                        />
                    </div>
                </div>

                <div className="flex items-center space-x-8">
                    <div className="flex flex-col items-end border-l border-slate-100 pl-8 text-right">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Pending Count</span>
                        <div className="flex items-center gap-2">
                            <Clock size={16} className="text-amber-500" />
                            <span className="text-[20px] font-bold text-gray-900 leading-none">
                                {requests.length}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="overflow-visible mb-8 bg-white rounded-2xl border border-slate-100 shadow-sm shadow-indigo-50/50">
                <DataTable
                    data={displayData}
                    columns={columns as any}
                    tableClassName="w-full"
                    className="border-none shadow-none bg-transparent"
                    hideDefaultPagination={true}
                    stickyHeader={true}
                    disableInternalScroll={true}
                    tableFooter={
                        <tr>
                            {columns.map((col: any) => {
                                if (col.id === 'Customer') {
                                    return (
                                        <td key={`total-label-${col.id}`} className="px-6 py-4 text-left">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Grand Totals:</span>
                                        </td>
                                    );
                                }

                                if (col.id === 'Amount') {
                                    const total = filteredRequests.reduce((sum, r) => sum + r.amount, 0);
                                    return (
                                        <td key={`total-${col.id}`} className="px-6 py-3 whitespace-nowrap text-right bg-slate-50/50">
                                            <div className="flex flex-col items-end gap-1">
                                                <div className="flex items-center gap-1.5 justify-end">
                                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-tight">ZMW</span>
                                                    <span className="text-[12px] font-black tracking-tight text-slate-900 underline decoration-slate-200 decoration-2 underline-offset-4 pointer-events-none">
                                                        {total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                    );
                                }

                                return <td key={`total-empty-${col.id}`} className="px-6 py-4"></td>;
                            })}
                        </tr>
                    }
                />
            </div>

            {/* Management Card - Matching Sales Order footer */}
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
                                    className={`text-[10px] font-black transition-all ${pageSize === size ? 'text-indigo-600 underline underline-offset-4 decoration-2' : 'text-slate-400 hover:text-slate-600'}`}
                                >
                                    {size}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={handleCopyToClipboard}
                        className="px-4 py-2 bg-slate-50 text-[11px] font-black text-slate-500 rounded-xl hover:bg-indigo-50 hover:text-indigo-600 transition-all border border-slate-200/50 uppercase tracking-widest flex items-center gap-2 shadow-sm"
                    >
                        <Copy size={12} /> Export Data
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ApprovalsView;

