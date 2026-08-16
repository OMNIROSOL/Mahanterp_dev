import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Plus, Eye, Edit, FileText, Check, X, ChevronRight, ChevronLeft, ChevronsLeft, ChevronsRight, Printer, Search, ArrowUpDown, ChevronUp, ChevronDown, Copy, Calendar, Clock, Package, FileCheck } from 'lucide-react';
import { cn } from '../utils/cn';
import apiService from '../services/apiService';
import { ScreenPermission } from '../types';
import DataTable from '../components/shared/DataTable';
import Badge from '../components/shared/Badge';
import { motion, AnimatePresence } from 'framer-motion';

const PurchaseInvoicesView = () => {
    const navigate = useNavigate();
    const { supplierName } = useParams();
    const [searchQuery, setSearchQuery] = useState('');
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [sortColumn, setSortColumn] = useState<string>('issueDate');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
    const [pageSize, setPageSize] = useState(50);
    const [currentPage, setCurrentPage] = useState(1);
    const [isManagementOpen, setIsManagementOpen] = useState(false);
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const managementRef = useRef<HTMLDivElement>(null);

    const [columnVisibility, setColumnVisibility] = useState({
        'Actions': true,
        'Issue date': true,
        'Due date': true,
        'Reference': true,
        'Supplier': true,
        'Description': true,
        'Withholding tax': true,
        'Discount': true,
        'Invoice Amount': true,
        'Balance due': true,
        'Days to Due Date': true,
        'Days overdue': true,
        'Status': true,
        'Timestamp': true
    });

    useEffect(() => {
        const saved = localStorage.getItem('purchase_invoice_column_visibility');
        if (saved) {
            try {
                setColumnVisibility(JSON.parse(saved));
            } catch (e) {
                console.error('Failed to parse saved column visibility:', e);
            }
        }

        const handleStorage = () => {
            const updated = localStorage.getItem('purchase_invoice_column_visibility');
            if (updated) setColumnVisibility(JSON.parse(updated));
        };

        window.addEventListener('storage', handleStorage);
        return () => window.removeEventListener('storage', handleStorage);
    }, []);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (managementRef.current && !managementRef.current.contains(event.target as Node)) {
                setIsManagementOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const [purchaseInvoices, setPurchaseInvoices] = useState<any[]>([]);
    const [goodsReceivedNotes, setGoodsReceivedNotes] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchInvoices = async () => {
            setIsLoading(true);
            try {
                const [invData, grnData] = await Promise.all([
                    apiService.getPurchaseInvoices(),
                    apiService.getGoodsReceivedNotes()
                ]);

                const mappedInvoices = invData.map((inv: any) => {
                    // Defensive mapping to ensure all required fields exist
                    const supplierName = inv.suppliers?.name || inv.supplier || 'Unknown';
                    return {
                        ...inv,
                        supplier: String(supplierName),
                        issueDate: inv.created_at ? new Date(inv.created_at).toLocaleDateString('en-GB').replace(/\//g, '.') : '',
                        dueDate: inv.due_date ? new Date(inv.due_date).toLocaleDateString('en-GB').replace(/\//g, '.') : '—',
                        currency: inv.currency || inv.suppliers?.currency?.split(' - ')[0] || 'ZMW',
                        invoiceAmount: inv.invoiceAmount || parseFloat(inv.grand_total) || 0,
                        balanceDue: inv.balanceDue || parseFloat(inv.grand_total) || 0,
                        timestamp: inv.created_at ? new Date(inv.created_at).toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }).replace(/\//g, '.').replace(',', '').toUpperCase() : ''
                    };
                });
                setPurchaseInvoices(mappedInvoices);
                setGoodsReceivedNotes(grnData);
            } catch (err) {
                console.error('Failed to fetch data:', err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchInvoices();
    }, [refreshTrigger]);

    const filteredData = useMemo(() => {
        let result = purchaseInvoices;

        if (supplierName) {
            result = result.filter(inv => (inv.supplier || '').trim().toLowerCase() === supplierName.trim().toLowerCase());
        }

        const query = searchQuery.toLowerCase().trim();
        result = result.filter(inv => {
            const s = (inv.supplier || '').toLowerCase();
            const r = (inv.reference || '').toLowerCase();
            const st = (inv.status || '').toLowerCase();
            return s.includes(query) || r.includes(query) || st.includes(query);
        });

        return result.sort((a, b) => {
            let valA: any = (a as any)[sortColumn] || '';
            let valB: any = (b as any)[sortColumn] || '';

            if (sortColumn === 'issueDate' || sortColumn === 'timestamp') {
                valA = (a as any)._rawIssueDate || 0;
                valB = (b as any)._rawIssueDate || 0;
            } else if (sortColumn === 'dueDate') {
                valA = (a as any)._rawDueDate || 0;
                valB = (b as any)._rawDueDate || 0;
            }

            if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
            if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });
    }, [searchQuery, purchaseInvoices, supplierName, refreshTrigger, sortColumn, sortDirection]);

    const totalPages = Math.ceil(filteredData.length / pageSize) || 1;
    const displayData = filteredData.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    const calculateDays = (dueDateStr: string | undefined) => {
        if (!dueDateStr) return { remaining: '', overdue: '' };
        const parts = dueDateStr.split('.');
        if (parts.length !== 3) return { remaining: '', overdue: '' };
        const due = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
        const today = new Date(); today.setHours(0, 0, 0, 0); due.setHours(0, 0, 0, 0);
        const diff = Math.round((due.getTime() - today.getTime()) / 86400000);
        return {
            remaining: diff > 0 ? `${diff} days` : (diff === 0 ? 'Due today' : ''),
            overdue: diff < 0 ? `${Math.abs(diff)} days` : ''
        };
    };

    const handleCreateGRN = async (inv: any) => {
        try {
            // 1. Fetch full invoice details to get items
            const fullInv = await apiService.getPurchaseInvoice(inv.id);
            
            if (!fullInv || !fullInv.items) {
                alert('Could not retrieve invoice items.');
                return;
            }

            // 2. Prepare GRN data
            const grnData = {
                supplierId: fullInv.supplierId,
                reference: fullInv.reference,
                description: `Received items for ${fullInv.reference}`,
                inventoryLocation: 'Default Inventory Location',
                receivedDate: new Date().toISOString().split('T')[0],
                status: 'Received',
                items: fullInv.items.map((item: any) => ({
                    itemId: item.itemId,
                    description: item.description || '',
                    qty: Number(item.qty) || 0
                }))
            };

            // 3. Create GRN
            await apiService.createGoodsReceivedNote(grnData);

            // 4. Navigate and refresh
            setRefreshTrigger(prev => prev + 1);
            navigate('/goods-received-notes');
        } catch (err: any) {
            console.error('Failed to create GRN:', err);
            alert('Error creating GRN: ' + (err.response?.data?.error || err.message));
        }
    };

    const columns = [
        {
            id: 'Actions',
            header: 'Actions',
            accessor: (inv: any) => (
                <div className="flex items-center gap-2">
                    <button onClick={() => navigate(`/purchase-invoices/view/${inv.id}`)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg" title="View"><Eye size={14} /></button>
                    <button onClick={() => navigate(`/purchase-invoices/edit/${inv.id}`)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg" title="Edit"><Edit size={14} /></button>
                </div>
            )
        },
        {
            id: 'Issue date',
            header: 'Issue Date',
            accessor: (inv: any) => <span className="font-medium text-[13px] text-slate-800 whitespace-nowrap">{inv.issueDate}</span>
        },
        {
            id: 'Due date',
            header: 'Due Date',
            accessor: (inv: any) => <span className="font-medium text-[13px] text-slate-800 whitespace-nowrap">{inv.dueDate || '—'}</span>
        },
        {
            id: 'Reference',
            header: 'Reference',
            accessor: (inv: any) => (
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 border border-indigo-100/50">
                        <FileCheck size={14} />
                    </div>
                    <span className="font-bold text-slate-900 whitespace-nowrap">{inv.reference}</span>
                </div>
            )
        },
        {
            id: 'Supplier',
            header: 'Supplier',
            accessor: (inv: any) => <span className="font-medium text-slate-600 truncate max-w-[150px]" title={inv.supplier}>{inv.supplier}</span>
        },
        {
            id: 'Description',
            header: 'Description',
            accessor: (inv: any) => <span className="text-xs text-slate-400 truncate max-w-[200px]" title={inv.description}>{inv.description || '—'}</span>
        },
        {
            id: 'Withholding tax',
            header: 'Withholding tax',
            className: 'text-right',
            accessor: (inv: any) => <span className="text-xs text-slate-400">{(inv.withholdingTax || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
        },
        {
            id: 'Discount',
            header: 'Discount',
            className: 'text-right',
            accessor: (inv: any) => (
                <div className="text-right font-medium text-slate-600 whitespace-nowrap">
                    <span className="text-[10px] text-slate-400 mr-1">{inv.currency || 'ZMW'}</span>
                    {(inv.discount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
            )
        },
        {
            id: 'Invoice Amount',
            header: 'Invoice Amount',
            className: 'text-right',
            accessor: (inv: any) => (
                <div className="text-right font-black text-slate-900 whitespace-nowrap">
                    <span className="text-[10px] text-slate-400 mr-1">{inv.currency}</span>
                    {inv.invoiceAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
            )
        },
        {
            id: 'Balance due',
            header: 'Balance Due',
            className: 'text-right',
            accessor: (inv: any) => (
                <div className="text-right font-black text-indigo-600 whitespace-nowrap">
                    <span className="text-[10px] text-indigo-400/60 mr-1">{inv.currency || 'ZMW'}</span>
                    {inv.balanceDue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
            )
        },
        {
            id: 'Days to Due Date',
            header: 'Days to Due Date',
            accessor: (inv: any) => {
                const { remaining } = calculateDays(inv.dueDate);
                return <span className="text-[13px] font-medium text-slate-600">{remaining || '—'}</span>;
            }
        },
        {
            id: 'Days overdue',
            header: 'Days overdue',
            accessor: (inv: any) => {
                const { overdue } = calculateDays(inv.dueDate);
                return <span className="text-[13px] font-bold text-rose-500">{overdue || '—'}</span>;
            }
        },
        {
            id: 'Status',
            header: 'Status',
            accessor: (inv: any) => (
                <Badge variant={inv.status === 'Paid' ? 'success' : 'warning'} className="text-[9px] uppercase tracking-widest font-black whitespace-nowrap">
                    {inv.status}
                </Badge>
            )
        },
        {
            id: 'Timestamp',
            header: 'Timestamp',
            accessor: (inv: any) => <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap">{inv.timestamp || '—'}</span>
        }
    ].filter(col => (columnVisibility as any)[col.id] !== false);

    return (
        <div className="p-8 space-y-6 animate-in fade-in duration-500 min-w-fit">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <div className="flex items-center space-x-2 text-[10px] font-bold text-indigo-600 uppercase tracking-widest mb-1">
                        <FileCheck size={14} />
                        <span className="text-gray-400">Financial Operations</span>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 leading-tight">Purchase Invoices</h1>
                    <p className="text-gray-500 text-sm">Manage and track your supplier invoices and payables.</p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate('/purchase-invoices/new')}
                        className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20 flex items-center"
                    >
                        <Plus size={16} className="mr-2" /> CREATE NEW INVOICE
                    </button>
                </div>
            </div>

            <div className="mt-8 flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-4 flex-1">
                    <div className="relative flex-1 group max-w-xl">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                        <input
                            type="text"
                            placeholder="Search by supplier, reference, or status..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white transition-all shadow-sm"
                        />
                    </div>
                </div>

                <div className="flex flex-col items-end border-l border-slate-100 pl-8">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total Invoices</span>
                    <span className="text-[18px] font-bold text-gray-900">{filteredData.length}</span>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm no-print overflow-hidden">
                <DataTable
                    data={displayData}
                    columns={columns as any}
                    tableClassName="w-full min-w-[1800px]"
                    className="border-none shadow-none rounded-none"
                    hideDefaultPagination={true}
                    emptyMessage={
                        <div className="flex flex-col items-center">
                            <p>No purchase invoices found.</p>
                            <p className="text-xs mt-2 text-slate-400 font-normal">Check if the backend is connected and data exists in the database.</p>
                        </div>
                    }
                    disableInternalScroll={false}
                    stickyHeader={true}
                    tableFooter={
                        <tr className="bg-slate-50/50 font-black">
                            {columns.map(col => {
                                if (col.id === 'Invoice Amount' || col.id === 'Balance due' || col.id === 'Withholding tax' || col.id === 'Discount') {
                                    const fieldMap: Record<string, string> = {
                                        'Invoice Amount': 'invoiceAmount',
                                        'Balance due': 'balanceDue',
                                        'Withholding tax': 'withholdingTax',
                                        'Discount': 'discount'
                                    };
                                    const field = fieldMap[col.id];
                                    const totalsByCurrency: Record<string, number> = {};
                                    filteredData.forEach(o => {
                                        const cur = o.currency || 'ZMW';
                                        totalsByCurrency[cur] = (totalsByCurrency[cur] || 0) + (parseFloat(o[field]) || 0);
                                    });
                                    const activeCurs = Object.keys(totalsByCurrency);
                                    return (
                                        <td key={col.id} className="px-6 py-4 text-right">
                                            <div className="flex flex-col gap-1">
                                                {activeCurs.map(cur => (
                                                    <div key={cur} className="flex items-center justify-end gap-1.5">
                                                        <span className="text-[9px] text-slate-400 uppercase tracking-tight">{cur}</span>
                                                        <span className="text-[12px] underline decoration-slate-200 underline-offset-4">{totalsByCurrency[cur].toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </td>
                                    );
                                }
                                if (col.id === 'Supplier') {
                                    return <td key={col.id} className="px-6 py-4 text-left font-black uppercase text-[10px] text-slate-400">Grand Totals</td>;
                                }
                                return <td key={col.id} className="px-6 py-4"></td>;
                            })}
                        </tr>
                    }
                />
            </div>

            <div className="flex flex-col md:flex-row items-center justify-between bg-white px-8 py-6 rounded-[32px] border border-slate-100 shadow-sm gap-8 mt-8">
                <div className="flex flex-col items-start gap-1">
                    <div className="flex items-center gap-2 text-slate-300">
                        <button
                            onClick={() => { setCurrentPage(1); }}
                            disabled={currentPage === 1}
                            className="p-1 hover:text-indigo-600 disabled:opacity-30 transition-all"
                        >
                            <ChevronsLeft size={16} />
                        </button>
                        <button
                            onClick={() => { setCurrentPage(prev => Math.max(1, prev - 1)); }}
                            disabled={currentPage === 1}
                            className="p-1 hover:text-indigo-600 disabled:opacity-30 transition-all"
                        >
                            <ChevronLeft size={16} />
                        </button>
                        <span className="text-[12px] font-medium text-slate-500 mx-2 tracking-tight">Page {currentPage} of {totalPages}</span>
                        <button
                            onClick={() => { setCurrentPage(prev => Math.min(totalPages, prev + 1)); }}
                            disabled={currentPage === totalPages}
                            className="p-1 hover:text-indigo-600 disabled:opacity-30 transition-all"
                        >
                            <ChevronRight size={16} />
                        </button>
                        <button
                            onClick={() => { setCurrentPage(totalPages); }}
                            disabled={currentPage === totalPages}
                            className="p-1 hover:text-indigo-600 disabled:opacity-30 transition-all"
                        >
                            <ChevronsRight size={16} />
                        </button>
                    </div>

                    <div className="flex items-center gap-6">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Show per page:</span>
                        <div className="flex items-center gap-4">
                            {[50, 100, 250, 500].map(size => (
                                <button
                                    key={size}
                                    onClick={() => { setPageSize(size); setCurrentPage(1); }}
                                    className={cn(
                                        "text-[11px] font-black transition-all relative py-1",
                                        pageSize === size ? "text-indigo-600" : "text-slate-400 hover:text-slate-600"
                                    )}
                                >
                                    {size}
                                    {pageSize === size && <motion.div layoutId="activePageSize" className="absolute -bottom-1 left-0 right-0 h-0.5 bg-indigo-600 rounded-full" />}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <button className="px-8 py-3.5 bg-white border border-slate-200 rounded-full text-[11px] font-black text-slate-500 uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center gap-3 shadow-sm">
                        <Copy size={16} className="text-slate-400" /> EXPORT DATA
                    </button>

                    <div className="relative group" ref={managementRef}>
                        <button
                            onClick={() => setIsManagementOpen(!isManagementOpen)}
                            className="px-10 py-3.5 bg-indigo-600 text-white rounded-[20px] text-[11px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-600/20 flex items-center gap-4"
                        >
                            MANAGEMENT <ChevronUp size={16} className={cn("transition-transform", isManagementOpen && "rotate-180")} />
                        </button>
                        {isManagementOpen && (
                            <div className="absolute bottom-full right-0 mb-4 w-56 bg-white border border-gray-100 shadow-2xl rounded-2xl py-3 z-[100] animate-in slide-in-from-bottom-2 duration-200 overflow-hidden">
                                <button
                                    onClick={() => { setIsSelectionMode(!isSelectionMode); setIsManagementOpen(false); }}
                                    className="w-full text-left px-6 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 transition-all"
                                >
                                    {isSelectionMode ? 'Disable Batch Mode' : 'Enable Batch Actions'}
                                </button>
                                <button
                                    onClick={() => { navigate('/purchase-invoices/columns'); setIsManagementOpen(false); }}
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

export default PurchaseInvoicesView;
