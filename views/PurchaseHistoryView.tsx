import React, { useMemo, useState, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import apiService from '../services/apiService';
import { Eye, Edit, Copy, FileText, Search, MoreVertical, ChevronDown, Filter, Trash2, X, ChevronUp, ArrowUpDown, ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight, Calendar, Printer, ShoppingCart, Quote } from 'lucide-react';
import { cn } from '../utils/cn';

const PurchaseHistoryView = () => {
    const navigate = useNavigate();
    const { supplierName } = useParams();
    const [searchQuery, setSearchQuery] = useState(supplierName || '');
    const [typeFilter, setTypeFilter] = useState('All');
    const [statusFilter, setStatusFilter] = useState('All');
    const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
    const [sortColumn, setSortColumn] = useState<string>('date');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
    const dropdownRef = useRef<HTMLDivElement>(null);
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    useEffect(() => {
        const handleRefresh = () => setRefreshTrigger(prev => prev + 1);
        window.addEventListener('storage', handleRefresh);
        window.addEventListener('purchase_enquiries_updated', handleRefresh);
        window.addEventListener('purchase_orders_updated', handleRefresh);
        window.addEventListener('purchase_invoices_updated', handleRefresh);
        window.addEventListener('debit_notes_updated', handleRefresh);
        window.addEventListener('grn_updated', handleRefresh);
        
        return () => {
            window.removeEventListener('storage', handleRefresh);
            window.removeEventListener('purchase_enquiries_updated', handleRefresh);
            window.removeEventListener('purchase_orders_updated', handleRefresh);
            window.removeEventListener('purchase_invoices_updated', handleRefresh);
            window.removeEventListener('grn_updated', handleRefresh);
            window.removeEventListener('debit_notes_updated', handleRefresh);
        };
    }, []);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setOpenDropdownId(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const [dbQuotes, setDbQuotes] = useState<any[]>([]);
    const [dbOrders, setDbOrders] = useState<any[]>([]);
    const [dbInvoices, setDbInvoices] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchHistory = async () => {
            setIsLoading(true);
            try {
                const [quotes, orders, invoices] = await Promise.all([
                    apiService.getPurchaseEnquiries(),
                    apiService.getPurchaseOrders(),
                    apiService.getPurchaseInvoices()
                ]);
                setDbQuotes(quotes);
                setDbOrders(orders);
                setDbInvoices(invoices);
            } catch (err) {
                console.error('Failed to fetch purchase history:', err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchHistory();
    }, [refreshTrigger]);

    const allHistory = useMemo(() => {
        const history: any[] = [];
        
        dbQuotes.forEach(q => {
            history.push({
                id: q.id,
                date: q.issueDate ? new Date(q.issueDate).toLocaleDateString('en-GB').replace(/\//g, '.') : '—',
                supplier: q.supplier?.name || 'Unknown',
                amount: parseFloat(q.amount) || 0,
                type: 'Enquiry',
                reference: q.reference || '—',
                status: q.status,
                timestamp: q.createdAt ? new Date(q.createdAt).toLocaleString() : '—'
            });
        });
        
        dbOrders.forEach(o => {
            history.push({
                id: o.id,
                date: o.orderDate ? new Date(o.orderDate).toLocaleDateString('en-GB').replace(/\//g, '.') : '—',
                supplier: o.supplier?.name || 'Unknown',
                amount: parseFloat(o.amount) || 0,
                type: 'Order',
                reference: o.reference || '—',
                status: o.status,
                timestamp: o.createdAt ? new Date(o.createdAt).toLocaleString() : '—'
            });
        });

        dbInvoices.forEach(i => {
            history.push({
                id: i.id,
                date: i.created_at ? new Date(i.created_at).toLocaleDateString('en-GB').replace(/\//g, '.') : '—',
                supplier: i.suppliers?.name || 'Unknown',
                amount: parseFloat(i.grand_total) || 0,
                type: 'Invoice',
                reference: i.reference || '—',
                status: i.status,
                timestamp: i.created_at ? new Date(i.created_at).toLocaleString() : '—'
            });
        });

        return history;
    }, [dbQuotes, dbOrders, dbInvoices]);

    const getComputedStatus = (item: any): string => {
        if (item.type !== 'Invoice') return item.status || '—';
        const balance = item.balanceDue ?? item.amount;
        if (balance === 0) return 'Paid in full';
        if (!item.dueDate) return 'Unpaid';
        const parts = item.dueDate.split('.');
        if (parts.length !== 3) return 'Unpaid';
        const due = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
        const today = new Date(); today.setHours(0,0,0,0); due.setHours(0,0,0,0);
        if (due < today && balance > 0) return 'Overdue';
        return item.status || 'Unpaid';
    };

    const uniqueStatuses = useMemo(() => {
        const statuses = new Set<string>();
        allHistory.forEach(item => {
            const status = getComputedStatus(item);
            if (status && status !== '—') {
                statuses.add(status);
            }
        });
        return Array.from(statuses).sort();
    }, [allHistory]);

    const filteredHistory = useMemo(() => {
        const result = allHistory.filter(item => {
            const itemStatus = getComputedStatus(item);
            const query = searchQuery.toLowerCase();
            const matchesSearch =
                (item.reference || '').toLowerCase().includes(query) ||
                (item.supplier || '').toLowerCase().includes(query);
            const matchesType = typeFilter === 'All' || item.type === typeFilter;
            const matchesStatus = statusFilter === 'All' || itemStatus === statusFilter;
            return matchesSearch && matchesType && matchesStatus;
        });

        return result.sort((a, b) => {
            let valA = a[sortColumn];
            let valB = b[sortColumn];

            if (sortColumn === 'date') {
                valA = (valA || '').split('.').reverse().join('-');
                valB = (valB || '').split('.').reverse().join('-');
            } else if (sortColumn === 'timestamp') {
                const getSortTime = (ts: string) => {
                    if (!ts || ts === '—') return 0;
                    const d = new Date(ts);
                    if (!isNaN(d.getTime())) return d.getTime();
                    if (ts.includes('.')) {
                        const pts = ts.split(' ');
                        const dpts = pts[0].split('.');
                        return new Date(`${dpts[2]}-${dpts[1]}-${dpts[0]} ${pts[1]} ${pts[2] || ''}`).getTime() || 0;
                    }
                    return 0;
                };
                valA = getSortTime(valA);
                valB = getSortTime(valB);
            }

            if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
            if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });
    }, [allHistory, searchQuery, typeFilter, statusFilter, sortColumn, sortDirection]);

    const paginatedData = filteredHistory;

    const handleSort = (column: string) => {
        if (sortColumn === column) {
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortColumn(column);
            setSortDirection('asc');
        }
    };

    const handleCopyToClipboard = () => {
        const header = "Date\tReference\tSupplier\tType\tAmount\tStatus";
        const rows = filteredHistory.map(item =>
            `${item.date}\t${item.reference || ''}\t${item.supplier}\t${item.type}\t${item.amount}\t${getComputedStatus(item)}`
        ).join('\n');
        const fullText = `${header}\n${rows}`;

        const textArea = document.createElement("textarea");
        textArea.value = fullText;
        textArea.style.position = "fixed";
        textArea.style.left = "-9999px";
        textArea.style.top = "0";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try {
            document.execCommand('copy');
            alert('Data copied to clipboard');
        } catch (err) {
            console.error('Fallback: Oops, unable to copy', err);
        }
        document.body.removeChild(textArea);
    };

    return (
        <div className="p-8 space-y-8 w-full animate-in fade-in duration-700">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <div className="flex items-center space-x-2 text-[10px] font-bold text-indigo-600 uppercase tracking-widest mb-1">
                        <ShoppingCart size={14} />
                        <span className="text-gray-400">Procurement Operations</span>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 leading-tight">Purchase History</h1>
                    <p className="text-gray-500 text-sm">Unified lifecycle tracking for purchase enquiries, orders, and invoices</p>
                </div>
            </div>

            <div className="mt-8 flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-4 flex-1 w-full">
                    <div className="relative flex-1 group max-w-xl">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                        <input
                            type="text"
                            placeholder="Search by reference or supplier..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all shadow-sm"
                        />
                    </div>

                    <div className="flex gap-3">
                        <select
                            value={typeFilter}
                            onChange={(e) => setTypeFilter(e.target.value)}
                            className="bg-white border border-gray-300 text-[11px] font-black uppercase tracking-wider rounded-md px-4 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                        >
                             <option value="All">All Types</option>
                            <option value="Enquiry">Purchase Enquiry</option>
                            <option value="Order">Order</option>
                            <option value="Invoice">Invoice</option>
                            <option value="GRN">GRN</option>
                            <option value="Debit Note">Debit Note</option>
                        </select>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="bg-white border border-gray-300 text-[11px] font-black uppercase tracking-wider rounded-md px-4 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                        >
                            <option value="All">All Statuses</option>
                            {uniqueStatuses.map(status => (
                                <option key={status} value={status}>{status}</option>
                            ))}
                        </select>
                        <button onClick={() => { setSearchQuery(''); setTypeFilter('All'); setStatusFilter('All'); }} className="p-2 border border-gray-300 rounded-md text-gray-400 hover:text-red-500 bg-white shadow-sm transition-colors" title="Clear Filters">
                            <X size={16} />
                        </button>
                    </div>
                </div>

                <div className="hidden lg:flex flex-col items-end border-l border-slate-100 pl-8">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total History</span>
                    <span className="text-[18px] font-bold text-gray-900">{filteredHistory.length}</span>
                </div>
            </div>

            <div className="w-full mb-8 overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                            <th className="sticky top-0 lg:top-[-2rem] z-30 bg-slate-50/95 backdrop-blur-md shadow-sm px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center w-24">Actions</th>
                            <th onClick={() => handleSort('date')} className="sticky top-0 lg:top-[-2rem] z-30 bg-slate-50/95 backdrop-blur-md shadow-sm px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer hover:bg-slate-100">
                                Date
                            </th>
                            <th className="sticky top-0 lg:top-[-2rem] z-30 bg-slate-50/95 backdrop-blur-md shadow-sm px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Type</th>
                            <th onClick={() => handleSort('reference')} className="sticky top-0 lg:top-[-2rem] z-30 bg-slate-50/95 backdrop-blur-md shadow-sm px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer hover:bg-slate-100">
                                Reference
                            </th>
                            <th onClick={() => handleSort('supplier')} className="sticky top-0 lg:top-[-2rem] z-30 bg-slate-50/95 backdrop-blur-md shadow-sm px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer hover:bg-slate-100">
                                Supplier
                            </th>
                            <th onClick={() => handleSort('amount')} className="sticky top-0 lg:top-[-2rem] z-30 bg-slate-50/95 backdrop-blur-md shadow-sm px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right cursor-pointer hover:bg-slate-100">
                                Amount
                            </th>
                            <th className="sticky top-0 lg:top-[-2rem] z-30 bg-slate-50/95 backdrop-blur-md shadow-sm px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                            <th onClick={() => handleSort('timestamp')} className="sticky top-0 lg:top-[-2rem] z-30 bg-slate-50/95 backdrop-blur-md shadow-sm px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer hover:bg-slate-100">
                                Timestamp
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {paginatedData.map((item) => (
                            <tr key={`${item.type}-${item.id}`} className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-6 py-4 text-center">
                                    <div className="flex justify-center gap-4">
                                        <button 
                                            onClick={() => {
                                                const sName = encodeURIComponent(item.supplier || '');
                                                if (item.type === 'Enquiry') navigate(`/purchase-quotes/view/${item.id}`);
                                                else if (item.type === 'Order') navigate(`/purchase-orders/view/${item.id}`);
                                                else if (item.type === 'Invoice') navigate(`/purchase-invoices/view/${item.id}`);
                                                else if (item.type === 'GRN') navigate(`/goods-received-notes/view/${item.id}`);
                                                else if (item.type === 'Debit Note') navigate(`/debit-notes/supplier/${sName}`);
                                            }}
                                            className="text-slate-400 hover:text-indigo-600 transition-colors"
                                            title="View Details"
                                        >
                                            <Eye size={14} />
                                        </button>
                                        <div className="relative">
                                            <button 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setOpenDropdownId(openDropdownId === `${item.type}-${item.id}` ? null : `${item.type}-${item.id}`);
                                                }}
                                                className="text-slate-400 hover:text-blue-600 transition-colors"
                                                title="Copy/Convert Document"
                                            >
                                                <Copy size={14} />
                                            </button>

                                            {openDropdownId === `${item.type}-${item.id}` && (
                                                <div className="absolute left-0 top-full mt-2 w-56 bg-white border border-slate-200 shadow-xl rounded-xl py-2 z-[100] animate-in fade-in zoom-in duration-200" ref={dropdownRef}>
                                                    <div className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-50 mb-1">
                                                        Copy/Convert To
                                                    </div>
                                                    {[
                                                        { label: 'Sales Quote', path: '/sales-quotes/new' },
                                                        { label: 'Sales Order', path: '/sales-orders/new' },
                                                        { label: 'Sales Invoice', path: '/sales-invoices/new' },
                                                        { label: 'Delivery Note', path: '/delivery-notes/new' },
                                                        { label: 'Credit Note', path: '/credit-notes/new' },
                                                        { label: 'Purchase Enquiry', path: '/purchase-quotes/new' },
                                                        { label: 'Purchase Order', path: '/purchase-orders/new' },
                                                        { label: 'Purchase Invoice', path: '/purchase-invoices/new' },
                                                        { label: 'Goods Receipt', path: '/goods-receipts/new' },
                                                        { label: 'Debit Note', path: '/debit-notes/new' }
                                                    ].map(target => (
                                                        <button
                                                            key={target.label}
                                                            onClick={() => {
                                                                setOpenDropdownId(null);
                                                                navigate(`${target.path}?copyFrom=${item.id}`);
                                                            }}
                                                            className="w-full text-left px-4 py-2 text-[12px] text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 transition-colors flex items-center gap-2"
                                                        >
                                                            New {target.label}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-[13px] font-medium text-slate-700">{item.date}</td>
                                <td className="px-6 py-4">
                                     <span className={cn(
                                        "px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border",
                                        item.type === 'Enquiry' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                                        item.type === 'Order' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                        item.type === 'Invoice' ? 'bg-purple-50 text-purple-600 border-purple-100' :
                                        item.type === 'GRN' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                        item.type === 'Debit Note' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                                        'bg-slate-50 text-slate-600 border-slate-100'
                                    )}>
                                        {item.type}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-[13px] font-medium text-slate-900">{item.reference}</td>
                                <td className="px-6 py-4 text-[13px] font-medium text-slate-600">{item.supplier}</td>
                                <td className="px-6 py-4 text-right font-black text-[13px] text-slate-900 whitespace-nowrap">
                                    {item.amount > 0 ? `ZMW ${item.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '—'}
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <span className={cn(
                                        "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border whitespace-nowrap",
                                        getComputedStatus(item) === 'Paid in full' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                        getComputedStatus(item) === 'Overdue' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                                        'bg-amber-50 text-amber-600 border-amber-100'
                                    )}>
                                        {getComputedStatus(item)}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-[11px] text-slate-400 font-medium tracking-tight whitespace-nowrap">
                                    {(() => {
                                        if (!item.timestamp || item.timestamp === '—') return '—';
                                        const d = new Date(item.timestamp);
                                        if (!isNaN(d.getTime())) {
                                            return d.toLocaleString('en-GB', {
                                                day: '2-digit', month: '2-digit', year: 'numeric',
                                                hour: '2-digit', minute: '2-digit', second: '2-digit',
                                                hour12: true
                                            }).replace(/\//g, '.').replace(',', '').toUpperCase();
                                        }
                                        return item.timestamp;
                                    })()}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="flex items-center justify-between bg-white p-6 rounded-xl border border-slate-200">
                <div className="flex flex-col items-start space-y-1">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Transaction Summary</span>
                    <span className="text-[12px] font-medium text-slate-600 tracking-tight">Showing {filteredHistory.length} records in a single list</span>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={handleCopyToClipboard}
                        className="px-4 py-2 bg-slate-50 text-[11px] font-black text-slate-500 rounded-lg hover:bg-indigo-50 hover:text-indigo-600 transition-all border border-slate-200/50 uppercase tracking-widest flex items-center gap-2 shadow-sm"
                    >
                        <Copy size={12} /> Export Data
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PurchaseHistoryView;
