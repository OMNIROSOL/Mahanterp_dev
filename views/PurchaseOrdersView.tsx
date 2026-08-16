import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import apiService from '../services/apiService';
import { PurchaseOrder, ScreenPermission } from '../types';
import DataTable from '../components/shared/DataTable';
import Badge from '../components/shared/Badge';
import {
    ChevronRight, ChevronLeft, Search, Plus,
    ShoppingCart, FileText, Check, X, MoreHorizontal,
    Copy, Trash2, Printer, ChevronDown, ChevronUp,
    ChevronsLeft, ChevronsRight, Eye, Edit, ArrowUpDown, Calendar
} from 'lucide-react';
import { cn } from '../utils/cn';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, Settings } from 'lucide-react';

const PurchaseOrdersView = () => {
    const navigate = useNavigate();
    const { supplierName } = useParams();
    const [searchQuery, setSearchQuery] = useState('');
    const [pageSize, setPageSize] = useState(50);
    const [currentPage, setCurrentPage] = useState(1);
    const [sortColumn, setSortColumn] = useState<string>('Order Date');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [isBatchOpsOpen, setIsBatchOpsOpen] = useState(false);
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const batchOpsRef = useRef<HTMLDivElement>(null);

    const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(() => {
        const defaultVisible: Record<string, boolean> = {
            'Actions': true,
            'Order Date': true,
            'Reference': true,
            'Supplier': true,
            'Qty on Order': true,
            'Qty Shipped': true,
            'Qty Received': true,
            'Qty Balance': true,
            'Description': true,
            'Amount': true,
            'Timestamp': true,
            'Status': true
        };
        const saved = localStorage.getItem('purchase_order_column_settings');
        if (saved) {
            const parsed = JSON.parse(saved);
            const record: Record<string, boolean> = { 'Actions': true };
            const validIds = ['Order Date', 'Reference', 'Supplier', 'Qty on Order', 'Qty Shipped', 'Qty Received', 'Qty Balance', 'Description', 'Amount', 'Timestamp', 'Status'];
            
            parsed.forEach((col: any) => {
                const mapping: Record<string, string> = {
                    'orderdate': 'Order Date',
                    'reference': 'Reference',
                    'supplier': 'Supplier',
                    'qtyondeliver': 'Qty on Order',
                    'description': 'Description',
                    'amount': 'Amount',
                    'approval': 'Approval',
                    'timestamp': 'Timestamp'
                };
                const id = mapping[col.id.toLowerCase().replace(/\s/g, '')] || col.id;
                if (validIds.includes(id)) {
                    record[id] = col.visible;
                }
            });
            
            // Ensure all valid columns have a value
            validIds.forEach(id => {
                if (record[id] === undefined) record[id] = true;
            });
            
            return record;
        }
        return defaultVisible;
    });

    useEffect(() => {
        const updateVisibility = () => {
            const saved = localStorage.getItem('purchase_order_column_settings');
            if (saved) {
                const parsed = JSON.parse(saved);
                const record: Record<string, boolean> = { 'Actions': true };
                parsed.forEach((col: any) => {
                    const mapping: Record<string, string> = {
                        'orderdate': 'Order Date',
                        'reference': 'Reference',
                        'supplier': 'Supplier',
                        'qtyondeliver': 'Qty on Order',
                        'description': 'Description',
                        'amount': 'Amount',
                        'approval': 'Approval',
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
        const handleRefresh = () => setRefreshTrigger(prev => prev + 1);
        window.addEventListener('purchase_orders_updated', handleRefresh);
        window.addEventListener('storage', handleRefresh);
        return () => {
            window.removeEventListener('purchase_orders_updated', handleRefresh);
            window.removeEventListener('storage', handleRefresh);
        };
    }, []);

    const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchOrders = async () => {
            setIsLoading(true);
            try {
                const data = await apiService.getPurchaseOrders();
                const mapped = data.map((o: any) => {
                    // Extremely robust mapping to prevent object-rendering crashes
                    let supplierName = 'Unknown';
                    if (o.supplier) {
                        supplierName = typeof o.supplier === 'object' ? (o.supplier.name || 'Unknown') : o.supplier;
                    }

                    let statusStr = (o.status || 'Open').toString();
                    if (typeof o.status === 'object') statusStr = 'Open';

                    return {
                        ...o,
                        supplier: supplierName,
                        status: statusStr,
                        currency: o.currency || (typeof o.supplier === 'object' ? o.supplier?.currency?.split(' - ')[0] : null) || 'ZMW',
                        orderDate: o.orderDate ? new Date(o.orderDate).toLocaleDateString('en-GB').replace(/\//g, '.') : '',
                        amount: parseFloat(o.amount) || 0,
                        timestamp: o.createdAt
                    };
                });
                console.log('Mapped Purchase Orders:', mapped);
                setPurchaseOrders(mapped);
            } catch (err) {
                console.error('Failed to fetch purchase orders:', err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchOrders();
    }, [refreshTrigger]);

    const handleStatusChange = async (id: string, newStatus: string, shouldNavigate: boolean = false) => {
        try {
            await apiService.updatePurchaseOrderStatus(id, newStatus);
            setRefreshTrigger(prev => prev + 1);
            if (shouldNavigate) navigate('/purchase-invoices');
        } catch (err) {
            console.error('Failed to update status:', err);
            alert('Failed to update status. Please try again.');
        }
    };

    const filteredData = useMemo(() => {
        let result = [...purchaseOrders].filter(o => {
            const status = (o.status || '').toString().toLowerCase();
            return status !== 'invoiced' && status !== 'rejected' && status !== 'closed';
        });

        if (supplierName) {
            result = result.filter(o => (o.supplier || '').trim().toLowerCase() === supplierName.trim().toLowerCase());
        }

        const query = searchQuery.trim().toLowerCase();
        if (query) {
            result = result.filter(o =>
                o.supplier.toString().toLowerCase().includes(query) ||
                o.reference.toString().toLowerCase().includes(query) ||
                o.description?.toString().toLowerCase().includes(query)
            );
        }

        return result.sort((a, b) => {
            let valA: any = (a as any)[sortColumn] || '';
            let valB: any = (b as any)[sortColumn] || '';

            if (sortColumn === 'Order Date') {
                valA = (a.orderDate || '').split('.').reverse().join('-');
                valB = (b.orderDate || '').split('.').reverse().join('-');
            } else if (sortColumn === 'Timestamp') {
                const getSortTime = (ts?: string) => {
                    if (!ts) return 0;
                    const d = new Date(ts);
                    if (!isNaN(d.getTime())) return d.getTime();
                    return 0;
                };
                valA = getSortTime(a.timestamp);
                valB = getSortTime(b.timestamp);
            }

            if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
            if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });
    }, [purchaseOrders, searchQuery, supplierName, refreshTrigger, sortColumn, sortDirection]);

    const totalPages = Math.ceil(filteredData.length / pageSize) || 1;
    const displayData = filteredData.slice((currentPage - 1) * pageSize, currentPage * pageSize);

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
            id: 'Actions',
            header: 'Actions',
            accessor: (o: any) => (
                <div className="flex items-center gap-2">
                    <button onClick={() => navigate(`/purchase-orders/view/${o.id}`)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"><Eye size={14} /></button>
                    <button onClick={() => navigate(`/purchase-orders/edit/${o.id}`)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"><Edit size={14} /></button>
                </div>
            )
        },
        {
            id: 'Order Date',
            header: 'Order Date',
            accessor: (o: any) => {
                if (!o.orderDate) return '—';
                try {
                    const d = new Date(o.orderDate);
                    if (isNaN(d.getTime())) return o.orderDate;
                    return d.toLocaleDateString('en-GB').replace(/\//g, '.');
                } catch {
                    return o.orderDate;
                }
            }
        },
        {
            id: 'Reference',
            header: 'Reference',
            accessor: (o: any) => (
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 border border-indigo-100/50">
                        <FileText size={14} />
                    </div>
                    <span className="font-bold text-slate-900 whitespace-nowrap">{o.reference}</span>
                </div>
            )
        },
        {
            id: 'Supplier',
            header: 'Supplier',
            accessor: (o: any) => <span className="font-medium text-slate-600 truncate max-w-[150px]" title={typeof o.supplier === 'string' ? o.supplier : o.supplier?.name}>{typeof o.supplier === 'string' ? o.supplier : o.supplier?.name || 'Unknown'}</span>
        },
        {
            id: 'Qty on Order',
            header: 'Qty on Order',
            className: 'text-right',
            accessor: (o: any) => <span className="font-bold text-slate-700">{o.qtyOnDeliver || 0}</span>
        },
        {
            id: 'Qty Shipped',
            header: 'Qty Shipped',
            className: 'text-right',
            accessor: (o: any) => <span className="font-bold text-amber-600">{o.qtyShipped || 0}</span>
        },
        {
            id: 'Qty Received',
            header: 'Qty Received',
            className: 'text-right',
            accessor: (o: any) => <span className="font-bold text-emerald-600">{o.qtyReceived || 0}</span>
        },
        {
            id: 'Qty Balance',
            header: 'Qty Balance',
            className: 'text-right',
            accessor: (o: any) => <span className="font-bold text-rose-500">{o.qtyBalance || 0}</span>
        },
        {
            id: 'Description',
            header: 'Description',
            accessor: (o: any) => <span className="text-xs text-slate-500 truncate max-w-[200px]" title={o.description}>{o.description || '—'}</span>
        },
        {
            id: 'Amount',
            header: 'Amount',
            className: 'text-right',
            accessor: (o: any) => (
                <div className="text-right font-black text-slate-900 whitespace-nowrap">
                    <span className="text-[10px] text-slate-400 mr-1">{o.currency}</span>
                    {o.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
            )
        },
        {
            id: 'Timestamp',
            header: <div onClick={() => handleSort('Timestamp')} className="cursor-pointer hover:text-indigo-600 transition-colors flex items-center gap-1">Timestamp <ArrowUpDown size={10} /></div>,
            accessor: (o: any) => {
                if (!o.timestamp) return <span className="text-[10px] text-slate-300">—</span>;
                const d = new Date(o.timestamp);
                const display = !isNaN(d.getTime())
                    ? d.toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }).replace(/\//g, '.').replace(',', '').toUpperCase()
                    : o.timestamp;
                return <span className="text-[10px] text-slate-400 font-medium font-sans whitespace-nowrap">{display}</span>;
            }
        },
        {
            id: 'Status',
            header: 'Status',
            accessor: (o: any) => (
                <div className="flex items-center justify-center">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">
                        {o.status || 'Open'}
                    </span>
                </div>
            )
        }
    ];


    return (
        <div className="p-8 space-y-6 animate-in fade-in duration-500 min-w-[1500px] font-sans">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <div className="flex items-center space-x-2 text-[10px] font-bold text-indigo-600 uppercase tracking-widest mb-1">
                        <ShoppingCart size={14} />
                        <span className="text-gray-400">Order Management</span>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 leading-tight">Purchase Orders</h1>
                    <p className="text-gray-500 text-sm">Issue and track orders sent to your suppliers.</p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate('/purchase-orders/new')}
                        className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20 flex items-center"
                    >
                        <Plus size={16} className="mr-2" /> CREATE NEW PO
                    </button>
                </div>
            </div>

            <div className="mt-8 flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-4 flex-1">
                    <div className="relative flex-1 group max-w-xl">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                        <input
                            type="text"
                            placeholder="Search by supplier, reference, or description..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white transition-all"
                        />
                    </div>
                </div>

                <div className="flex flex-col items-end border-l border-slate-100 pl-8">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total Orders</span>
                    <span className="text-[18px] font-bold text-gray-900">{filteredData.length}</span>
                </div>
            </div>

            <div className="mb-8 bg-white rounded-2xl border border-slate-100 shadow-sm shadow-indigo-50/50">
                <DataTable
                    data={isLoading ? [] : displayData}
                    columns={columns.filter(c => visibleColumns[c.id]) as any}
                    tableClassName="min-w-[1440px]"
                    hideDefaultPagination={true}
                    disableInternalScroll={true}
                    stickyHeader={true}
                    emptyMessage={
                        isLoading ? (
                            <div className="flex flex-col items-center justify-center py-20 space-y-4">
                                <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-600 rounded-full animate-spin"></div>
                                <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Fetching purchase orders...</p>
                            </div>
                        ) : searchQuery.trim() ? (
                            <div className="flex flex-col items-center justify-center py-20 space-y-4">
                                <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-300">
                                    <Search size={24} />
                                </div>
                                <div className="text-center">
                                    <p className="text-slate-900 font-bold">No matching records found</p>
                                    <p className="text-slate-400 text-xs mt-1">Try adjusting your search or filters</p>
                                </div>
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="text-indigo-600 text-[11px] font-bold uppercase tracking-widest hover:text-indigo-700 transition-colors"
                                >
                                    Clear Search
                                </button>
                            </div>
                        ) : undefined
                    }
                    tableFooter={
                        <tr className="bg-slate-50/50 font-black">
                            {columns.filter(c => visibleColumns[c.id]).map(col => {
                                if (['Qty on Order', 'Qty Shipped', 'Qty Received', 'Qty Balance'].includes(col.id)) {
                                    const totalQty = filteredData.reduce((sum, o) => {
                                        if (col.id === 'Qty on Order') return sum + (o.qtyOnDeliver || 0);
                                        if (col.id === 'Qty Shipped') return sum + (o.qtyShipped || 0);
                                        if (col.id === 'Qty Received') return sum + (o.qtyReceived || 0);
                                        if (col.id === 'Qty Balance') return sum + (o.qtyBalance || 0);
                                        return sum;
                                    }, 0);
                                    let textColorClass = 'text-slate-900';
                                    if (col.id === 'Qty Shipped') textColorClass = 'text-amber-700';
                                    if (col.id === 'Qty Received') textColorClass = 'text-emerald-700';
                                    if (col.id === 'Qty Balance') textColorClass = 'text-rose-600';

                                    return (
                                        <td key={col.id} className="px-6 py-4 text-right">
                                            <span className={`text-[12px] font-black tracking-tight ${textColorClass}`}>{totalQty.toLocaleString()}</span>
                                        </td>
                                    );
                                }
                                if (col.id === 'Amount') {
                                    const totalsByCurrency: Record<string, number> = {};
                                    filteredData.forEach(o => {
                                        const cur = o.currency || 'ZMW';
                                        totalsByCurrency[cur] = (totalsByCurrency[cur] || 0) + (o.amount || 0);
                                    });
                                    const activeCurs = Object.keys(totalsByCurrency);
                                    return (
                                        <td key={col.id} className="px-6 py-4 text-right">
                                            <div className="flex flex-col gap-1">
                                                {activeCurs.map(cur => (
                                                    <div key={cur} className="flex items-center justify-end gap-1.5">
                                                        <span className="text-[9px] text-slate-400 uppercase tracking-tight">{cur}</span>
                                                        <span className="text-[12px] font-black tracking-tight">{totalsByCurrency[cur].toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </td>
                                    );
                                }
                                if (col.id === 'Supplier') {
                                    return (
                                        <td key={col.id} className="px-6 py-4">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] whitespace-nowrap">GRAND TOTALS:</p>
                                        </td>
                                    );
                                }
                                return <td key={col.id} className="px-6 py-4"></td>;
                            })}
                        </tr>
                    }
                />
            </div>

            <div className="flex flex-col md:flex-row items-center justify-between bg-white px-6 py-4 rounded-[24px] border border-slate-100 shadow-sm gap-8 mt-4">
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
                    <div className="flex items-center gap-4 mt-0.5">
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
                                    {pageSize === size && <motion.div layoutId="activeOrderPageSize" className="absolute -bottom-1 left-0 right-0 h-0.5 bg-indigo-600 rounded-full" />}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <button
                        onClick={() => {
                            const header = "Order Date\tReference\tSupplier\tQty on Order\tQty Shipped\tQty Received\tQty Balance\tDescription\tAmount\tStatus";
                            const rows = filteredData.map(o =>
                                `${o.orderDate}\t${o.reference}\t${o.supplier}\t${o.qtyOnDeliver || 0}\t${o.qtyShipped || 0}\t${o.qtyReceived || 0}\t${o.qtyBalance || 0}\t${o.description || ''}\t${o.amount}\t${o.status}`
                            ).join('\n');
                            navigator.clipboard.writeText(`${header}\n${rows}`);
                            alert('Data copied to clipboard!');
                        }}
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
                                    onClick={() => { navigate('/purchase-orders/edit-columns'); setIsBatchOpsOpen(false); }}
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

export default PurchaseOrdersView;
