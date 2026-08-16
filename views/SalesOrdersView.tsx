import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate, useLocation, Link, useParams } from 'react-router-dom';
import { SalesOrder, Invoice, ScreenPermission } from '../types';
import apiService from '../services/apiService';
import DataTable from '../components/shared/DataTable';
import Badge from '../components/shared/Badge';
import BatchActionBar from '../components/shared/BatchActionBar';
import {
    ChevronRight, ChevronLeft, Search, Plus,
    ShoppingCart, FileText, Check, X, MoreHorizontal,
    Copy, Trash2, Printer, ChevronDown, ChevronUp,
    ChevronsLeft, ChevronsRight, Eye, Edit, ArrowUpDown, Calendar, RefreshCw
} from 'lucide-react';
import { cn } from '../utils/cn';
import { formatTimestamp } from '../utils/dateUtils';

const SalesOrdersView = () => {
    const navigate = useNavigate();
    const { customerName } = useParams();
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [isBatchOpsOpen, setIsBatchOpsOpen] = useState(false);
    const [showEditColumns, setShowEditColumns] = useState(false);
    const [pageSize, setPageSize] = useState(50);
    const [currentPage, setCurrentPage] = useState(1);
    const [sortColumn, setSortColumn] = useState<string>('Order Date');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [statusFilter, setStatusFilter] = useState<'Active' | 'Invoiced' | 'Rejected' | 'Inactive' | 'All'>('Active');
    const batchOpsRef = useRef<HTMLDivElement>(null);
    const [currentUser, setCurrentUser] = useState<any>({ role: 'Admin' });
    const [perms, setPerms] = useState<ScreenPermission | null>(null);

    useEffect(() => {
        setPerms({ screenId: 'sales-orders', canView: true, canAdd: true, canEdit: true, canDelete: true } as ScreenPermission);
    }, []);

    const [orders, setOrders] = useState<SalesOrder[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchOrders = async () => {
            setIsLoading(true);
            try {
                const data = await apiService.getOrders();
                // Map API data if needed (e.g. date formatting)
                const mappedOrders = data.map((o: any) => ({
                    ...o,
                    customer: o.customer?.name || o.customer || 'Unknown',
                    currency: o.currency || o.customer?.currency?.split(' - ')[0] || 'ZMW',
                    orderDate: o.orderDate ? new Date(o.orderDate).toLocaleDateString('en-GB').replace(/\//g, '.') : '',
                    expiryDate: o.expiryDate 
                        ? new Date(o.expiryDate).toLocaleDateString('en-GB').replace(/\//g, '.') 
                        : (o.orderDate ? new Date(new Date(o.orderDate).getTime() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-GB').replace(/\//g, '.') : ''),
                    timestamp: formatTimestamp(o.createdAt),
                    status: (o.status?.toLowerCase() === 'pending' || !o.status) ? 'Ordered' : o.status,
                    Division: o.items?.[0]?.division || o.docOptions?.division || o.customer?.division || 'General'
                }));
                setOrders(mappedOrders);
            } catch (err) {
                console.error('Failed to fetch orders:', err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchOrders();
    }, [refreshTrigger]);

    const handleStatusChange = async (order: any, newStatus: string, shouldNavigate: boolean = false) => {
        try {
            const finalStatus = shouldNavigate ? 'Invoiced' : newStatus;

            // 1. Update order status in DB
            await apiService.updateOrderStatus(order.id, finalStatus);

            // 2. If moved to invoice, create invoice record in DB
            if (shouldNavigate) {
                const invoiceData = {
                    customerId: order.customerId,
                    reference: order.reference,
                    grandTotal: order.amount,
                    balanceDue: order.amount,
                    description: order.description,
                    items: (order.items || []).map((it: any) => ({
                        itemId: it.itemId || it.item?.id,
                        qty: parseFloat(it.qty),
                        unitPrice: parseFloat(it.unitPrice),
                        division: it.division || 'General',
                        totalAmount: parseFloat(it.totalAmount)
                    })),
                    docOptions: {
                        division: order.items?.[0]?.division || 'General'
                    }
                };
                await apiService.createInvoice(invoiceData);
                navigate('/sales-invoices');
            } else {
                setRefreshTrigger(prev => prev + 1);
                alert(`Order ${newStatus} successfully.`);
            }
        } catch (err) {
            console.error('Failed to update order status:', err);
            alert('Failed to update status in database.');
        }
    };

    // Default visibility settings
    const defaultVisibility = {
        'Actions': true,
        'Order Date': true,
        'Reference': true,
        'Customer': true,
        'QTY RESERVED': true,
        'Division': true,
        'Description': false,
        'Amount': true,
        'Timestamp': true,
        'Approval': true
    };

    // Column Visibility State - Loaded from localStorage
    const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(() => {
        const saved = localStorage.getItem('sales_order_column_visibility_settings');
        return saved ? { ...defaultVisibility, ...JSON.parse(saved) } : defaultVisibility;
    });

    // Strategy for updating and saving visibility
    const toggleColumnVisibility = (id: string) => {
        setVisibleColumns(prev => {
            const next = { ...prev, [id]: !prev[id] };
            localStorage.setItem('sales_order_column_visibility_settings', JSON.stringify(next));
            return next;
        });
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (batchOpsRef.current && !batchOpsRef.current.contains(event.target as Node)) {
                setIsBatchOpsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filteredData = useMemo(() => {
        let result = [...orders];

        if (statusFilter === 'Active') {
            result = result.filter(o => (o as any).status !== 'Invoiced' && (o as any).status !== 'Rejected' && (o as any).status !== 'Inactive');
        } else if (statusFilter === 'Invoiced') {
            result = result.filter(o => (o as any).status === 'Invoiced');
        } else if (statusFilter === 'Rejected') {
            result = result.filter(o => (o as any).status === 'Rejected');
        } else if (statusFilter === 'Inactive') {
            result = result.filter(o => (o as any).status === 'Inactive');
        }
        // If statusFilter is 'All', we don't filter by status

        // 1. Exact Customer Filter from URL Path
        if (customerName) {
            result = result.filter(o => o.customer.toLowerCase() === customerName.toLowerCase());
        }

        // 2. Search Query Filter
        const query = searchQuery.toLowerCase();
        if (query) {
            result = result.filter(o =>
                o.customer.toLowerCase().includes(query) ||
                o.reference.toLowerCase().includes(query) ||
                o.description?.toLowerCase().includes(query)
            );
        }

        // 3. Implement Sorting
        return result.sort((a, b) => {
            let valA: any = (a as any)[sortColumn] || '';
            let valB: any = (b as any)[sortColumn] || '';

            if (sortColumn === 'Order Date') {
                valA = (a.orderDate || '').split('.').reverse().join('-');
                valB = (b.orderDate || '').split('.').reverse().join('-');
            } else if (sortColumn === 'Amount') {
                valA = parseFloat(a.amount as any || 0);
                valB = parseFloat(b.amount as any || 0);
            } else if (sortColumn === 'Reference') {
                valA = a.reference;
                valB = b.reference;
            } else if (sortColumn === 'Customer') {
                valA = a.customer;
                valB = b.customer;
            }

            if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
            if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });
    }, [orders, searchQuery, customerName, refreshTrigger, sortColumn, sortDirection, statusFilter]);

    const totalPages = Math.ceil(filteredData.length / pageSize);
    const displayData = useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return filteredData.slice(start, start + pageSize);
    }, [filteredData, currentPage, pageSize]);

    const copyToClipboard = (data: any[]) => {
        const header = `Order Date\tReference\tCustomer\tDescription\tAmount\tTimestamp`;
        const rows = data.map(o =>
            `${o.orderDate}\t${o.reference}\t${o.customer}\t${o.description || ''}\t${o.amount}\t${o.timestamp || ''}`
        ).join('\n');
        const fullText = `${header}\n${rows}`;

        if (!navigator.clipboard) {
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
                alert('Copied to clipboard');
            } catch (err) {
                console.error('Fallback: Oops, unable to copy', err);
            }
            document.body.removeChild(textArea);
            return;
        }

        navigator.clipboard.writeText(fullText).then(() => {
            alert('Copied to clipboard');
        }).catch(() => {
            alert('Failed to copy');
        });
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

    const handleCopyToClipboard = () => copyToClipboard(filteredData);

    const handleBatchCopy = () => {
        const selectedOrders = orders.filter(o => selectedIds.includes(o.id));
        copyToClipboard(selectedOrders);
    };

    const allColumns = [
        {
            id: 'Selection',
            header: (
                <div className="flex items-center justify-center -ml-1">
                    <div className="relative flex items-center">
                        <input
                            type="checkbox"
                            checked={selectedIds.length === displayData.length && displayData.length > 0}
                            onChange={(e) => {
                                if (e.target.checked) {
                                    setSelectedIds(displayData.map((o: any) => o.id));
                                } else {
                                    setSelectedIds([]);
                                }
                            }}
                            className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-0 cursor-pointer transition-all appearance-none border checked:bg-indigo-600 checked:border-indigo-600"
                        />
                        {selectedIds.length === displayData.length && displayData.length > 0 && <Check size={10} className="absolute inset-0 m-auto text-white pointer-events-none" strokeWidth={4} />}
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
                        onClick={() => navigate(`/sales-orders/view/${o.id}`)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all"
                        title="View Details"
                    >
                        <Eye size={14} />
                    </button>
                    {perms?.edit !== false && (
                        <button
                            onClick={() => navigate(`/sales-orders/edit/${o.id}`)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all font-bold"
                            title="Edit Order"
                        >
                            <Edit size={14} />
                        </button>
                    )}
                </div>
            )
        },
        {
            id: 'Order Date',
            header: <div className="flex items-center cursor-pointer group hover:text-blue-600 transition-colors" onClick={() => handleSort('Order Date')}>Order Date <SortIcon column="Order Date" /></div>,
            className: 'whitespace-nowrap',
            accessor: (o: any) => (
                <span className="font-medium text-[13px] text-slate-800 tracking-normal">{o.orderDate}</span>
            ),
            sortable: false
        },
        {
            id: 'Reference',
            header: <div className="flex items-center cursor-pointer group hover:text-blue-600 transition-colors" onClick={() => handleSort('Reference')}>Reference <SortIcon column="Reference" /></div>,
            className: 'whitespace-nowrap min-w-[140px]',
            accessor: (o: any) => (
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 border border-indigo-100/50">
                        <FileText size={14} />
                    </div>
                    <span className="font-medium text-slate-900 tracking-tight">{o.reference}</span>
                </div>
            ),
            sortable: false
        },

        {
            id: 'Customer',
            header: <div className="flex items-center cursor-pointer group hover:text-blue-600 transition-colors" onClick={() => handleSort('Customer')}>Customer <SortIcon column="Customer" /></div>,
            className: 'min-w-[200px]',
            accessor: (o: any) => (
                <span className="font-medium text-slate-600">{typeof o.customer === 'string' ? o.customer : o.customer?.name || 'Unknown'}</span>
            ),
            sortable: false
        },
        {
            id: 'QTY RESERVED',
            header: 'QTY RESERVED',
            className: 'text-right',
            accessor: (o: any) => (
                <span className="font-bold text-slate-700">{o.qtyReserved || 0}</span>
            ),
            sortable: false
        },
        {
            id: 'Division',
            header: <div className="flex items-center cursor-pointer group hover:text-blue-600 transition-colors" onClick={() => handleSort('Division')}>Division <SortIcon column="Division" /></div>,
            accessor: (o: any) => <span className="text-slate-600 font-medium text-[13px]">{o.Division}</span>,
            sortable: false
        },
        {
            id: 'Description',
            header: 'Description',
            className: 'min-w-[200px]',
            accessor: (o: any) => (
                <span className="text-slate-400 font-medium tracking-tight truncate max-w-[200px]" title={o.description}>{o.description || ''}</span>
            ),
            sortable: false
        },
        {
            id: 'Amount',
            header: <div className="flex items-center justify-end cursor-pointer group hover:text-blue-600 transition-colors" onClick={() => handleSort('Amount')}>Amount <SortIcon column="Amount" /></div>,
            className: 'whitespace-nowrap text-right',
            accessor: (o: any) => (
                <div className="text-right">
                    <span className="text-[10px] text-slate-400 font-bold mr-1">{o.currency}</span>
                    <span className="font-black text-slate-900">
                        {parseFloat(o.amount as any || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                </div>
            ),
            sortable: false
        },
        {
            id: 'Timestamp',
            header: 'Timestamp',
            className: 'whitespace-nowrap',
            accessor: (o: any) => (
                <span className="text-[10px] text-slate-400 font-medium">{o.timestamp || ''}</span>
            ),
            sortable: false
        },
        {
            id: 'Approval',
            header: 'Approval',
            className: 'whitespace-nowrap',
            accessor: (o: any) => (
                <div className="flex items-center gap-1.5 justify-center">
                    {(o.status === 'Draft' || o.status === 'Pending' || o.status === 'Ordered') ? (
                        <>
                            {perms?.edit !== false && (
                                <>
                                    <button
                                        onClick={() => handleStatusChange(o, 'Confirmed', true)}
                                        className="w-7 h-7 flex items-center justify-center rounded-lg border border-emerald-200 bg-white text-emerald-600 hover:bg-emerald-50 hover:border-emerald-500 transition-all shadow-sm"
                                        title="Confirm & Invoice"
                                    >
                                        <Check size={14} strokeWidth={3} />
                                    </button>
                                    <button
                                        onClick={() => handleStatusChange(o, 'Rejected')}
                                        className="w-7 h-7 flex items-center justify-center rounded-lg border border-rose-200 bg-white text-rose-600 hover:bg-rose-50 hover:border-rose-500 transition-all shadow-sm"
                                        title="Reject Order"
                                    >
                                        <X size={14} strokeWidth={3} />
                                    </button>
                                </>
                            )}
                        </>
                    ) : (
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">
                            {o.status}
                        </span>
                    )}
                </div>
            )
        }
    ];

    const columns = useMemo(() => {
        let cols = allColumns.filter(col => visibleColumns[col.id]);

        // Always show Selection column if in selection mode, at the very beginning
        if (isSelectionMode) {
            const selectionCol = allColumns.find(c => c.id === 'Selection');
            if (selectionCol && !cols.some(c => c.id === 'Selection')) {
                cols = [selectionCol, ...cols];
            }
        } else {
            cols = cols.filter(c => c.id !== 'Selection');
        }

        return cols;
    }, [visibleColumns, isSelectionMode, selectedIds, displayData]);

    return (
        <div className="p-8 space-y-6 animate-in fade-in duration-500 font-sans">
            {customerName && (
                <div className="flex items-center space-x-2 text-[11px] font-bold text-slate-400 uppercase tracking-widest bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                    <span
                        onClick={() => navigate('/customers')}
                        className="text-indigo-500 hover:underline cursor-pointer"
                    >
                        Customers
                    </span>
                    <ChevronRight size={10} className="opacity-30" />
                    <span className="text-slate-600 italic">“{customerName}”</span>
                </div>
            )}

            {/* Page Header Area - Synchronized with Quotations */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <div className="flex items-center space-x-2 text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-1">
                        <ShoppingCart size={14} />
                        <span className="text-gray-400">Order Management</span>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 leading-tight tracking-tight">Sales Orders</h1>
                    <p className="text-gray-500 text-sm">Manage and track your customer sales orders.</p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={async () => {
                            try {
                                const data = await apiService.getOrders();
                                alert(`Fetched ${data.length} orders from database.`);
                                setRefreshTrigger(prev => prev + 1);
                            } catch (err: any) {
                                alert(`Fetch failed: ${err.message}`);
                            }
                        }}
                        className="px-4 py-2 bg-slate-100 text-[11px] font-black text-slate-500 rounded-xl hover:bg-slate-200 transition-all uppercase tracking-widest flex items-center gap-2 shadow-sm"
                    >
                        <RefreshCw size={14} /> Refresh
                    </button>
                    {perms?.add !== false && (
                        <button
                            onClick={() => navigate('/sales-orders/new')}
                            className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-bold hover:bg-blue-700 transition-all shadow-sm flex items-center shadow-lg shadow-blue-500/20"
                        >
                            <Plus size={16} className="mr-2" /> CREATE NEW ORDER
                        </button>
                    )}
                </div>
            </div>

            <div className="mt-8 flex flex-col md:flex-row items-center justify-between gap-6 pb-2">
                <div className="flex items-center gap-4 flex-1">
                    <div className="relative flex-1 group max-w-xl">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 transition-colors group-focus-within:text-blue-500" size={14} />
                        <input
                            type="text"
                            placeholder="Search by name, reference, or description..."
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white shadow-sm transition-all"
                        />
                    </div>

                    <select
                        value={statusFilter}
                        onChange={(e) => {
                            setStatusFilter(e.target.value as any);
                            setCurrentPage(1);
                        }}
                        className="bg-white border border-slate-200 text-slate-600 text-[11px] font-black uppercase tracking-widest rounded-xl px-5 py-2.5 focus:outline-none transition-all cursor-pointer shadow-sm hover:border-slate-300"
                    >
                        <option value="All">All Statuses</option>
                        <option value="Active">Active</option>
                        <option value="Invoiced">Invoiced</option>
                        <option value="Rejected">Rejected</option>
                        <option value="Inactive">Inactive</option>
                    </select>
                </div>

                <div className="flex items-center space-x-8">
                    <div className="flex flex-col items-end border-l border-slate-100 pl-8">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Total Orders</span>
                        <span className="text-[18px] font-bold text-gray-900 leading-none">
                            {filteredData.length}
                        </span>
                    </div>
                </div>
            </div>

            <BatchActionBar
                isVisible={isSelectionMode}
                selectedCount={selectedIds.length}
                onReset={() => {
                    setIsSelectionMode(false);
                    setSelectedIds([]);
                }}
                actions={[
                    {
                        icon: <Printer size={16} strokeWidth={3} />,
                        label: 'Print Orders',
                        onClick: () => {
                            if (selectedIds.length === 0) { alert('No orders selected'); return; }
                            navigate(`/sales-orders/print-batch?ids=${selectedIds.join(',')}`);
                        }
                    },
                    {
                        icon: <Copy size={16} strokeWidth={3} />,
                        label: 'Copy Details',
                        onClick: () => {
                            if (selectedIds.length === 0) { alert('No orders selected'); return; }
                            const selectedOrders = displayData.filter(o => selectedIds.includes(o.id));
                            const text = selectedOrders.map(o => `${o.reference}\t${o.customer}\t${o.amount}`).join('\n');
                            navigator.clipboard.writeText(text);
                            alert('Copied to clipboard');
                        }
                    }
                ]}
            />

            <div className="mb-8 custom-scrollbar rounded-2xl border border-slate-100 shadow-sm shadow-indigo-50/50">
                <DataTable
                    data={isLoading ? [] : displayData}
                    columns={columns as any}
                    tableClassName="min-w-[1440px]"
                    className="border-none shadow-none bg-transparent"
                    hideDefaultPagination={true}
                    stickyHeader={true}
                    disableInternalScroll={true}
                    emptyMessage={
                        isLoading ? (
                            <div className="flex flex-col items-center justify-center space-y-4 py-20">
                                <div className="w-10 h-10 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
                                <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Loading sales orders...</p>
                            </div>
                        ) : "No sales orders found."
                    }
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
                                    // Group totals by currency
                                    const totalsByCurrency: Record<string, number> = {};
                                    filteredData.forEach(o => {
                                        const cur = o.currency || 'ZMW';
                                        totalsByCurrency[cur] = (totalsByCurrency[cur] || 0) + parseFloat(o.amount as any || 0);
                                    });
                                    const activeCurs = Object.keys(totalsByCurrency);

                                    return (
                                        <td key={`total-${col.id}`} className="px-6 py-3 whitespace-nowrap text-right bg-slate-50/50">
                                            <div className="flex flex-col items-end gap-1">
                                                {activeCurs.map(cur => (
                                                    <div key={cur} className="flex items-center gap-1.5 justify-end">
                                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-tight">{cur}</span>
                                                        <span className="text-[12px] font-black tracking-tight text-slate-900 underline decoration-slate-200 decoration-2 underline-offset-4 pointer-events-none">
                                                            {totalsByCurrency[cur].toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                        </span>
                                                    </div>
                                                ))}
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

            {/* Management Card - Left-aligned as requested */}
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
                                    onClick={() => { navigate('/sales-orders/edit-columns'); setIsBatchOpsOpen(false); }}
                                    className="w-full text-left px-4 py-2 text-[12px] font-medium text-gray-700 hover:bg-gray-100 transition-colors capitalize"
                                >
                                    Column Settings
                                </button>
                                <button
                                    onClick={() => {
                                        if (!isSelectionMode) {
                                            window.scrollTo({ top: 0, behavior: 'smooth' });
                                            document.querySelector('main')?.scrollTo({ top: 0, behavior: 'smooth' });
                                        }
                                        setIsSelectionMode(!isSelectionMode);
                                        setIsBatchOpsOpen(false);
                                    }}
                                    className="w-full text-left px-4 py-2 text-[12px] font-medium text-gray-700 hover:bg-gray-100 transition-colors border-t border-gray-100 capitalize"
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

export default SalesOrdersView;
