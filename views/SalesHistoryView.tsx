import React, { useMemo, useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { Eye, Edit, Copy, FileText, Search, MoreVertical, ChevronDown, Filter, Trash2, X, ChevronUp, ArrowUpDown, ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight, Calendar, Printer } from 'lucide-react';
import { cn } from '../utils/cn';
import apiService from '../services/apiService';
import { formatTimestamp } from '../utils/dateUtils';

const SalesHistoryView = () => {
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const [typeFilter, setTypeFilter] = useState('All');
    const [statusFilter, setStatusFilter] = useState('All');
    const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
    const [sortColumn, setSortColumn] = useState<string>('date');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
    const [isBatchOpsOpen, setIsBatchOpsOpen] = useState(false);
    const batchOpsRef = useRef<HTMLDivElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [dbQuotes, setDbQuotes] = useState<any[]>([]);
    const [dbInvoices, setDbInvoices] = useState<any[]>([]);
    const [dbOrders, setDbOrders] = useState<any[]>([]);
    const [dbDeliveryNotes, setDbDeliveryNotes] = useState<any[]>([]);


    useEffect(() => {
        const fetchDbData = async () => {
            try {
                const [quotes, invoices, orders, deliveryNotes] = await Promise.all([
                    apiService.getQuotes(),
                    apiService.getInvoices(),
                    apiService.getOrders(),
                    apiService.getDeliveryNotes()
                ]);
                setDbQuotes(quotes);
                setDbInvoices(invoices);
                setDbOrders(orders);
                setDbDeliveryNotes(deliveryNotes);
            } catch (err) {
                console.error('Failed to fetch history from database:', err);
            }
        };
        fetchDbData();
    }, [refreshTrigger]);

    useEffect(() => {
        const handleRefresh = () => setRefreshTrigger(prev => prev + 1);
        window.addEventListener('storage', handleRefresh);
        window.addEventListener('invoices_updated', handleRefresh);
        return () => {
            window.removeEventListener('storage', handleRefresh);
            window.removeEventListener('invoices_updated', handleRefresh);
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

    const allHistory = useMemo(() => {
        const history: any[] = [];
        const deliveredRefs = new Set(
            dbDeliveryNotes.map((dn: any) => dn.reference || dn.invoiceNumber).filter(Boolean)
        );

        dbQuotes.forEach(q => {
            history.push({
                id: q.id,
                date: q.issueDate ? new Date(q.issueDate).toLocaleDateString('en-GB').replace(/\//g, '.') : '—',
                customer: q.customer?.name || 'Unknown',
                amount: parseFloat(q.amount) || 0,
                type: 'Quote',
                reference: q.reference || '—',
                status: q.status,
                currency: q.currency || q.customer?.currency?.split(' - ')[0] || 'ZMW',
                timestamp: formatTimestamp(q.createdAt)
            });
        });

        dbOrders.forEach(o => {
            history.push({
                id: o.id,
                date: o.orderDate ? new Date(o.orderDate).toLocaleDateString('en-GB').replace(/\//g, '.') : '—',
                customer: o.customer?.name || 'Unknown',
                amount: parseFloat(o.amount) || 0,
                type: 'Order',
                reference: o.reference || '—',
                status: (o.status?.toLowerCase() === 'pending' || !o.status) ? 'Ordered' : o.status,
                currency: o.currency || o.customer?.currency?.split(' - ')[0] || 'ZMW',
                timestamp: formatTimestamp(o.createdAt)
            });
        });

        dbInvoices.forEach(inv => {
            history.push({
                id: inv.id,
                date: inv.createdAt ? new Date(inv.createdAt).toLocaleDateString('en-GB').replace(/\//g, '.') : '—',
                customer: inv.customer?.name || 'Unknown',
                amount: parseFloat(inv.grandTotal) || 0,
                type: 'Invoice',
                reference: inv.reference || '—',
                status: inv.status || 'Active',
                currency: inv.currency || inv.customer?.currency?.split(' - ')[0] || 'ZMW',
                timestamp: formatTimestamp(inv.createdAt)
            });
        });

        dbDeliveryNotes.forEach(dn => {
            history.push({
                id: dn.id,
                date: dn.deliveryDate ? new Date(dn.deliveryDate).toLocaleDateString('en-GB').replace(/\//g, '.') : '—',
                customer: dn.customer?.name || 'Unknown',
                amount: 0,
                type: 'Delivery',
                reference: dn.reference || '—',
                status: dn.status || 'Issued',
                currency: dn.currency || dn.customer?.currency?.split(' - ')[0] || 'ZMW',
                timestamp: formatTimestamp(dn.timestamp)
            });
        });

        return history;
    }, [refreshTrigger, dbQuotes, dbInvoices, dbOrders, dbDeliveryNotes]);

    const getComputedStatus = (item: any): string => {
        const normalizedStatus = item.status?.toString().toLowerCase().trim() || '';
        if (item.type === 'Order' && (normalizedStatus === 'pending' || normalizedStatus === '')) return 'Ordered';
        if (item.type === 'Delivery' && normalizedStatus === '') return 'Pending';
        if (item.type !== 'Invoice') return item.status || '—';
        const balance = item.balanceDue !== undefined && item.balanceDue !== null
            ? parseFloat(item.balanceDue)
            : parseFloat(item.amount ?? 0);
        if (balance < 0) return 'Overpaid';
        if (balance === 0) return 'Paid in full';
        if (!item.dueDate) return 'Unpaid';
        const parts = item.dueDate.split('.');
        if (parts.length !== 3) return 'Unpaid';
        const due = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
        const today = new Date(); today.setHours(0, 0, 0, 0); due.setHours(0, 0, 0, 0);
        const diff = Math.round((due.getTime() - today.getTime()) / 86400000);
        if (diff === -1) return 'Yesterday due';
        if (diff === 0) return 'Today due';
        if (diff === 1) return 'Tomorrow due';
        if (diff > 1) return 'Unpaid';
        return 'Overdue';
    };

    const filteredHistory = useMemo(() => {
        const result = allHistory.filter(item => {
            const itemStatus = getComputedStatus(item);
            const matchesSearch =
                item.reference.toLowerCase().includes(searchQuery.toLowerCase()) ||
                item.customer.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesType = typeFilter === 'All' || item.type === typeFilter || (typeFilter === 'Invoiced' && item.type === 'Invoice');
            const matchesStatus = statusFilter === 'All' || itemStatus === statusFilter;
            return matchesSearch && matchesType && matchesStatus;
        });

        return result.sort((a, b) => {
            let valA = a[sortColumn];
            let valB = b[sortColumn];

            if (sortColumn === 'date') {
                valA = (valA || '').split('.').reverse().join('-');
                valB = (valB || '').split('.').reverse().join('-');
            }

            if (sortColumn === 'status') {
                valA = getComputedStatus(a);
                valB = getComputedStatus(b);
            }

            if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
            if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });
    }, [allHistory, searchQuery, typeFilter, statusFilter, sortColumn, sortDirection]);

    const paginatedData = filteredHistory;

    const handleCopyToClipboard = () => {
        const header = "Date\tReference\tCustomer\tType\tAmount\tStatus";
        const rows = filteredHistory.map(item =>
            `${item.date}\t${item.reference || ''}\t${item.customer}\t${item.type}\t${item.amount}\t${getComputedStatus(item)}`
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
        return sortDirection === 'asc' ? <ChevronUp size={12} className="ml-1 text-blue-500" /> : <ChevronDown size={12} className="ml-1 text-blue-500" />;
    };

    const statusOptions = useMemo(() => {
        const statuses = new Set<string>();
        allHistory.forEach(item => {
            statuses.add(getComputedStatus(item));
        });
        return Array.from(statuses).sort();
    }, [allHistory]);

    return (
        <div className="p-8 space-y-8 w-full animate-in fade-in duration-700 relative">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <div className="flex items-center space-x-2 text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-1">
                        <FileText size={14} />
                        <span className="text-gray-400">Commercial Operations</span>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 leading-tight">Sales History</h1>
                    <p className="text-gray-500 text-sm">Unified lifecycle tracking for quotes, orders, and invoices</p>
                </div>
            </div>

            <div className="mt-8 flex flex-col md:flex-row items-center justify-between gap-6 pb-2">
                <div className="flex items-center gap-4 flex-1 w-full">
                    <div className="relative flex-1 group max-w-xl">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 transition-colors group-focus-within:text-blue-500" size={14} />
                        <input
                            type="text"
                            placeholder="Search by reference or customer..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white shadow-sm transition-all"
                        />
                    </div>

                    <div className="flex items-center gap-3">
                        <select
                            value={typeFilter}
                            onChange={(e) => setTypeFilter(e.target.value)}
                            className="bg-white border border-gray-300 text-slate-600 text-[11px] font-black uppercase tracking-wider rounded-md px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all shadow-sm"
                        >
                            <option value="All">All Types</option>
                            <option value="Quote">Quote</option>
                            <option value="Order">Order</option>
                            <option value="Invoiced">Invoiced</option>
                            <option value="Receipt">Receipt</option>
                            <option value="Delivery">Delivery Note</option>
                        </select>

                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="bg-white border border-gray-300 text-slate-600 text-[11px] font-black uppercase tracking-wider rounded-md px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all shadow-sm"
                        >
                            <option value="All">All Statuses</option>
                            {statusOptions.map(opt => (
                                <option key={opt} value={opt}>{opt}</option>
                            ))}
                        </select>
                        <button onClick={() => { setSearchQuery(''); setTypeFilter('All'); setStatusFilter('All'); }} className="flex items-center justify-center w-9 h-9 rounded-md bg-white border border-gray-300 text-gray-400 hover:text-red-500 hover:border-red-300 transition-all shadow-sm" title="Clear Filters">
                            <X size={16} />
                        </button>
                    </div>
                </div>

                <div className="hidden lg:flex flex-col items-end border-l border-slate-100 pl-8">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Total History</span>
                    <span className="text-[18px] font-bold text-gray-900 leading-none">
                        {filteredHistory.length}
                    </span>
                </div>
            </div>

            <div className="w-full mb-8 overflow-visible rounded-2xl border border-slate-100 shadow-sm shadow-indigo-50/50 bg-white">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center w-24">Actions</th>
                            <th onClick={() => handleSort('date')} className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer hover:bg-slate-100 transition-colors">
                                Date
                            </th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                Type
                            </th>
                            <th onClick={() => handleSort('reference')} className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer hover:bg-slate-100 transition-colors">
                                Reference
                            </th>
                            <th onClick={() => handleSort('customer')} className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer hover:bg-slate-100 transition-colors">
                                Customer
                            </th>
                            <th onClick={() => handleSort('amount')} className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right cursor-pointer hover:bg-slate-100 transition-colors">
                                Amount
                            </th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">
                                Status
                            </th>
                            <th onClick={() => handleSort('timestamp')} className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer hover:bg-slate-100 transition-colors">
                                Timestamp
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {paginatedData.length > 0 ? (
                            paginatedData.map((item) => (
                                <tr key={`${item.type}-${item.id}`} className="hover:bg-slate-50/50 transition-colors duration-150">
                                    <td className="px-6 py-4 text-center">
                                        <div className="flex justify-center gap-4">
                                            <button
                                                onClick={() => {
                                                    let route = '';
                                                    if (item.type === 'Quote') route = `/sales-quotes/view/${item.id}`;
                                                    else if (item.type === 'Order') route = `/sales-orders/view/${item.id}`;
                                                    else if (item.type === 'Invoiced') route = `/sales-invoices/view/${item.id}`;
                                                    else if (item.type === 'Receipt') route = `/receipts/view/${item.id}`;
                                                    else if (item.type === 'Delivery') route = `/delivery-notes/view/${item.id}`;
                                                    if (route) navigate(route);
                                                }}
                                                className="text-slate-400 hover:text-indigo-600 transition-colors hover:scale-110 active:scale-95"
                                                title="View"
                                            >
                                                <Eye size={14} />
                                            </button>

                                            <div className="relative">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setOpenDropdownId(openDropdownId === `${item.type}-${item.id}` ? null : `${item.type}-${item.id}`);
                                                    }}
                                                    className="text-slate-400 hover:text-blue-600 transition-colors hover:scale-110 active:scale-95"
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
                                    <td className="px-6 py-4 text-[13px] font-medium text-slate-700 tracking-normal">{item.date}</td>
                                    <td className="px-6 py-4 text-left">
                                        <span className={cn(
                                            "px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border inline-block",
                                            item.type === 'Quote' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                                                item.type === 'Order' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                                    item.type === 'Invoice' ? 'bg-purple-50 text-purple-600 border-purple-100' :
                                                        item.type === 'Receipt' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' :
                                                            item.type === 'Delivery' ? 'bg-slate-50 text-slate-600 border-slate-100' :
                                                                'bg-emerald-50 text-emerald-600 border-emerald-100'
                                        )}>
                                            {item.type}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-[13px] font-medium text-slate-900">{item.reference}</td>
                                    <td className="px-6 py-4">
                                        <span className="font-medium text-[13px] text-slate-600">{item.customer}</span>
                                    </td>
                                    <td className="px-6 py-4 text-right font-black text-[13px] text-slate-900 whitespace-nowrap">
                                        {item.amount > 0 ? `${item.currency} ${item.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '—'}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        {(() => {
                                            const ds = getComputedStatus(item);
                                            const color =
                                                ds === 'Paid in full' || ds === 'Delivered' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                                    ds === 'Overpaid' || ds === 'Shipped' || ds === 'Packed' ? 'bg-purple-50 text-purple-600 border-purple-100' :
                                                        ds === 'Overdue' || ds === 'Yesterday due' || ds === 'Rejected' || ds === 'Inactive' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                                                            ds === 'Unpaid' || ds === 'Active' || ds === 'Ordered' || ds === 'Pending' || ds === 'To Deliver' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                                                'bg-slate-100 text-slate-600 border-slate-200';
                                            return (
                                                <span className={cn("px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border whitespace-nowrap", color)}>
                                                    {ds}
                                                </span>
                                            );
                                        })()}
                                    </td>
                                    <td className="px-6 py-4 text-[10px] font-medium text-slate-400 font-sans tracking-tight whitespace-nowrap">
                                        {item.timestamp}
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={8} className="px-6 py-12 text-center text-slate-400 italic">
                                    No transaction history available for the current filters.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <div className="flex items-center justify-between bg-white p-6 rounded-xl border border-slate-200 shadow-sm mt-4">
                <div className="flex flex-col items-start space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Transaction Summary</span>
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

export default SalesHistoryView;
