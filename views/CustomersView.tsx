import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
    Eye, Edit, ChevronRight, LayoutGrid, Search, Filter, Plus, UserPlus,
    Download, UserX, UserCheck, Users, Check, Copy, ChevronLeft,
    ChevronsLeft, ChevronsRight, ChevronDown, ChevronUp, Printer, HelpCircle
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { Customer } from '../types';
import { cn } from '../utils/cn';
import apiService from '../services/apiService';

const CustomersView = () => {
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const [copiedNotification, setCopiedNotification] = useState(false);
    const [selectedCustomerIds, setSelectedCustomerIds] = useState<Set<string>>(new Set());
    const [isBatchViewMode, setIsBatchViewMode] = useState(() => localStorage.getItem('is_batch_view_mode') === 'true');
    const [isBatchOpsOpen, setIsBatchOpsOpen] = useState(false);
    const batchOpsRef = useRef<HTMLDivElement>(null);
    const [pageSize, setPageSize] = useState(50);
    const [currentPage, setCurrentPage] = useState(1);
    const [sortConfig, setSortConfig] = useState<{ key: string | null, direction: 'asc' | 'desc' }>({ key: null, direction: 'asc' });
    const [showInactive, setShowInactive] = useState(false);
    const [showEditColumns, setShowEditColumns] = useState(false);

    const [customers, setCustomers] = useState<Customer[]>([]);
    const [quotes, setQuotes] = useState<any[]>([]);
    const [orders, setOrders] = useState<any[]>([]);
    const [invoices, setInvoices] = useState<any[]>([]);
    const [deliveryNotes, setDeliveryNotes] = useState<any[]>([]);
    const [receipts, setReceipts] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (batchOpsRef.current && !batchOpsRef.current.contains(event.target as Node)) {
                setIsBatchOpsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Force refresh when component gains focus or mount
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    useEffect(() => {
        const handleFocus = () => setRefreshTrigger(prev => prev + 1);
        window.addEventListener('focus', handleFocus);
        return () => window.removeEventListener('focus', handleFocus);
    }, []);

    useEffect(() => {
        localStorage.setItem('is_batch_view_mode', isBatchViewMode.toString());
    }, [isBatchViewMode]);

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const [custs, qts, ords, invs, dns, rcs] = await Promise.all([
                    apiService.getCustomers(),
                    apiService.getQuotes(),
                    apiService.getOrders(),
                    apiService.getInvoices(),
                    apiService.getDeliveryNotes(),
                    apiService.getReceipts()
                ]);
                setCustomers(custs);
                setQuotes(qts.map((q: any) => ({
                    ...q,
                    issueDate: q.issueDate ? new Date(q.issueDate).toLocaleDateString('en-GB').replace(/\//g, '.') : ''
                })));
                setOrders(ords);
                setInvoices(invs);
                setDeliveryNotes(dns);
                setReceipts(rcs);
            } catch (err) {
                console.error('Failed to fetch data:', err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [refreshTrigger]);

    const defaultColumns = [
        { id: 'name', label: 'Customer Name', visible: true },
        { id: 'division', label: 'Division', visible: true },
        { id: 'email', label: 'Email address', visible: false },
        { id: 'billingAddress', label: 'Billing address', visible: false },
        { id: 'deliveryAddress', label: 'Delivery address', visible: false },
        { id: 'controlAccount', label: 'Control account', visible: false },
        { id: 'receipts', label: 'Receipts', visible: false },
        { id: 'payments', label: 'Payments', visible: false },
        { id: 'salesQuotes', label: 'Sales Quotes', visible: false },
        { id: 'salesOrders', label: 'Sales Orders', visible: false },
        { id: 'salesInvoices', label: 'Sales Invoices', visible: false },
        { id: 'creditNotes', label: 'Credit Notes', visible: false },
        { id: 'deliveryNotes', label: 'Delivery Notes', visible: false },
        { id: 'withholdingTax', label: 'Withholding tax receivable', visible: false },
        { id: 'qtyToDeliver', label: 'Qty to Deliver', visible: true },
        { id: 'uninvoiced', label: 'Uninvoiced', visible: true },
        { id: 'status', label: 'Status', visible: true },
        { id: 'availableCredit', label: 'Available credit', visible: false },
        { id: 'tpin', label: 'TPIN', visible: true },
        { id: 'salesPerson', label: 'Sales Person', visible: true },
        { id: 'creditDays', label: 'Credit Days', visible: true },
        { id: 'balance', label: 'Total Outstanding Balance', visible: true },
        { id: 'timestamp', label: 'Timestamp', visible: false }
    ];

    const [columns, setColumns] = useState(() => {
        const saved = localStorage.getItem('customer_column_settings');
        return saved ? JSON.parse(saved) : defaultColumns;
    });

    useEffect(() => {
        const handleStorageChange = () => {
            const saved = localStorage.getItem('customer_column_settings');
            if (saved) setColumns(JSON.parse(saved));
        };
        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, []);

    const toggleColumnVisibility = (id: string) => {
        const newColumns = columns.map((col: any) =>
            col.id === id ? { ...col, visible: !col.visible } : col
        );
        setColumns(newColumns);
        localStorage.setItem('customer_column_settings', JSON.stringify(newColumns));
        window.dispatchEvent(new Event('storage'));
    };

    const visibleColumnMap = useMemo(() => {
        const map: Record<string, boolean> = { 'Actions': true, 'name': true };
        columns.forEach((col: any) => {
            map[col.id] = col.visible;
        });
        return map;
    }, [columns]);

    const handleSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
        setSortConfig({ key, direction });
    };

    const enrichedCustomers = useMemo(() => {
        return customers.map(customer => {
            // Calculate Qty to Deliver: sum of quantities in pending delivery notes
            const customerDNs = deliveryNotes.filter(dn => {
                const dnCustId = dn.customerId || dn.customer?.id;
                const dnCustName = dn.customerName || (typeof dn.customer === 'string' ? dn.customer : dn.customer?.name);
                return (dnCustId === customer.id || dnCustName === customer.name) && 
                       (dn.status || 'Pending') !== 'Delivered';
            });
            let qtyToDeliver = 0;
            customerDNs.forEach(dn => {
                dn.items?.forEach((it: any) => {
                    qtyToDeliver += Number(it.qty || 0);
                });
            });

            // Calculate Uninvoiced: sum of amounts from orders that aren't fully invoiced or rejected
            const customerOrders = orders.filter(o => {
                const oCustId = o.customerId || o.customer?.id;
                const oCustName = o.customerName || (typeof o.customer === 'string' ? o.customer : o.customer?.name);
                return (oCustId === customer.id || oCustName === customer.name) && 
                       o.status !== 'Invoiced' && o.status !== 'Rejected';
            });
            const uninvoiced = customerOrders.reduce((sum, o) => sum + Number(o.amount || 0), 0);

            return {
                ...customer,
                qtyToDeliver,
                uninvoiced
            };
        });
    }, [customers, deliveryNotes, orders]);

    const sortedCustomers = useMemo(() => {
        const query = searchQuery.toLowerCase();
        let result = enrichedCustomers.filter(c => {
            if (showInactive) {
                if (!c.inactive && c.status !== 'Inactive') return false;
            } else {
                if (c.inactive || c.status === 'Inactive') return false;
            }
            const searchStr = `${c.name} ${c.code} ${c.division} ${c.status} ${c.salesPerson} ${c.tpin}`.toLowerCase();
            return searchStr.includes(query);
        });

        if (sortConfig.key) {
            result.sort((a: any, b: any) => {
                let aVal = a[sortConfig.key!] ?? '';
                let bVal = b[sortConfig.key!] ?? '';
                if (['balance', 'qtyToDeliver', 'uninvoiced', 'creditDays'].includes(sortConfig.key!)) {
                    aVal = Number(aVal) || 0;
                    bVal = Number(bVal) || 0;
                } else {
                    aVal = String(aVal).toLowerCase();
                    bVal = String(bVal).toLowerCase();
                }
                if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return result;
    }, [enrichedCustomers, searchQuery, sortConfig, showInactive]);

    const toggleSelectAll = () => {
        if (selectedCustomerIds.size === currentSlice.length && currentSlice.length > 0) {
            setSelectedCustomerIds(new Set());
        } else {
            setSelectedCustomerIds(new Set(currentSlice.map(c => c.id)));
        }
    };

    const toggleSelectOne = (id: string) => {
        setSelectedCustomerIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const handleBatchPrint = () => {
        if (selectedCustomerIds.size === 0) return;
        const ids = Array.from(selectedCustomerIds).join(',');
        navigate(`/customers/print-batch?ids=${ids}`);
    };

    const handleBatchCopy = () => {
        if (selectedCustomerIds.size === 0) return;
        const selectedList = customers.filter(c => selectedCustomerIds.has(c.id));
        const header = columns.filter((col: any) => col.visible).map((col: any) => col.label).join('\t');
        const rows = selectedList.map((c: any) =>
            columns.filter((col: any) => col.visible).map((col: any) => c[col.id] || '').join('\t')
        ).join('\n');

        const fullText = `${header}\n${rows}`;
        if (navigator.clipboard) {
            navigator.clipboard.writeText(fullText).then(() => {
                setCopiedNotification(true);
                setTimeout(() => setCopiedNotification(false), 2000);
            });
        }
    };

    const totals = useMemo<Record<string, { balance: number; withholding: number; qtyToDeliver: number; uninvoiced: number }>>(() => {
        const res: Record<string, { balance: number; withholding: number; qtyToDeliver: number; uninvoiced: number }> = {};
        sortedCustomers.forEach(c => {
            const curCode = String(c.currency || 'ZMW').split(' ')[0] || 'ZMW';
            if (!res[curCode]) res[curCode] = { balance: 0, withholding: 0, qtyToDeliver: 0, uninvoiced: 0 };
            res[curCode].balance += Number(c.balance || 0);
            res[curCode].qtyToDeliver += Number(c.qtyToDeliver || 0);
            res[curCode].uninvoiced += Number(c.uninvoiced || 0);
            const wtVal = typeof c.withholdingTax === 'number' ? c.withholdingTax : parseFloat(String(c.withholdingTax || 0).replace(/[^-0-9.]/g, '')) || 0;
            res[curCode].withholding += wtVal;
        });
        return res;
    }, [sortedCustomers]);

    const totalPages = Math.ceil(sortedCustomers.length / pageSize) || 1;
    const currentSlice = sortedCustomers.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    const handleCopyToClipboard = () => {
        const header = columns.filter((c: any) => c.visible).map((c: any) => c.label).join('\t');
        const rows = sortedCustomers.map((c: any) =>
            columns.filter((col: any) => col.visible).map((col: any) => c[col.id] || '').join('\t')
        ).join('\n');
        const fullText = `${header}\n${rows}`;

        const fallbackCopy = (text: string) => {
            const textArea = document.createElement("textarea");
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            try {
                document.execCommand('copy');
                setCopiedNotification(true);
                setTimeout(() => setCopiedNotification(false), 2000);
            } catch (err) {
                console.error('Fallback: Oops, unable to copy', err);
            }
            document.body.removeChild(textArea);
        };

        if (!navigator.clipboard) {
            fallbackCopy(fullText);
            return;
        }

        navigator.clipboard.writeText(fullText).then(() => {
            setCopiedNotification(true);
            setTimeout(() => setCopiedNotification(false), 2000);
        }).catch(() => {
            fallbackCopy(fullText);
        });
    };

    return (
        <div className="p-8 space-y-10 relative">
            {copiedNotification && (
                <div className="fixed top-10 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-8 py-4 rounded-[20px] shadow-[0_20px_50px_rgba(0,0,0,0.3)] z-[9999] animate-in slide-in-from-top-4 fade-in duration-500 border border-white/10 backdrop-blur-md">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-inner">
                            <Check size={18} strokeWidth={3} />
                        </div>
                        <div>
                            <p className="font-black uppercase tracking-[0.2em] text-[11px] text-white">Export Successful</p>
                            <p className="text-[10px] text-slate-400 font-bold">Table data copied to system clipboard</p>
                        </div>
                    </div>
                </div>
            )}
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <div className="flex items-center space-x-2 text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-1">
                        <Users size={14} />
                        <span className="text-gray-400">Relationship Management</span>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
                    <p className="text-gray-500 text-sm">Directory of your business partners and accounts</p>
                </div>

                <div className="flex space-x-4 items-center mb-1">
                    <button
                        onClick={() => navigate('/customers/new')}
                        className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-bold hover:bg-blue-700 transition-all shadow-sm flex items-center"
                    >
                        <UserPlus size={16} className="mr-2" /> REGISTER CUSTOMER
                    </button>
                </div>
            </div>

            {/* Pagination & Export */}
            <div className="mt-8 flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-4 flex-1">
                    <div className="relative flex-1 group max-w-2xl">
                        <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs"></i>
                        <input
                            type="text"
                            placeholder="Search by name, TPIN, or division..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>
                </div>

                <div className="flex items-center space-x-8 mr-4">
                    <div
                        onClick={() => setShowInactive(!showInactive)}
                        className="flex items-center space-x-2 cursor-pointer group"
                    >
                        <div
                            className={`w-10 h-5 rounded-full relative transition-all ${showInactive ? 'bg-indigo-600' : 'bg-slate-200'}`}
                        >
                            <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all shadow-sm ${showInactive ? 'right-0.5' : 'left-0.5'}`}></div>
                        </div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest group-hover:text-slate-600 transition-colors">Show Inactive</span>
                    </div>
                    <div className="flex flex-col items-end border-l border-slate-100 pl-8">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{showInactive ? 'Inactive Accounts' : 'Active Accounts'}</span>
                        <span className="text-[18px] font-bold text-gray-900">
                            {customers.filter(c => showInactive ? (c.inactive || c.status === 'Inactive') : (!c.inactive && c.status !== 'Inactive')).length}
                        </span>
                    </div>
                </div>
            </div>

            {/* Batch Action Bar */}
            {isBatchViewMode && (
                <div className="bg-indigo-600 px-8 py-4 rounded-[24px] flex items-center justify-between shadow-xl shadow-indigo-200/50 animate-in slide-in-from-top-4 duration-500 border border-white/10 backdrop-blur-md">
                    <div className="flex items-center space-x-8">
                        <div className="flex flex-col">
                            <span className="text-white font-black text-[14px] leading-tight tracking-tight">{selectedCustomerIds.size}</span>
                            <span className="text-indigo-200 font-bold text-[9px] uppercase tracking-widest whitespace-nowrap">Selected</span>
                        </div>
                        <div className="h-8 w-px bg-white/20"></div>
                        <div className="flex items-center space-x-4">
                            <button
                                onClick={handleBatchPrint}
                                disabled={selectedCustomerIds.size === 0}
                                className="text-white/90 hover:text-white flex items-center space-x-2 text-[11px] font-black uppercase tracking-widest transition-all disabled:opacity-40"
                            >
                                <Printer size={14} /> <span>Print Dossiers</span>
                            </button>
                            <button
                                onClick={handleBatchCopy}
                                disabled={selectedCustomerIds.size === 0}
                                className="text-white/90 hover:text-white flex items-center space-x-2 text-[11px] font-black uppercase tracking-widest transition-all disabled:opacity-40"
                            >
                                <Copy size={14} /> <span>Copy Details</span>
                            </button>
                        </div>
                    </div>
                    <button
                        onClick={() => { setIsBatchViewMode(false); setSelectedCustomerIds(new Set()); }}
                        className="bg-white text-indigo-600 px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-white shadow-lg transition-all border border-transparent active:scale-95"
                    >
                        Reset Mode
                    </button>
                </div>
            )}

            {/* Table Area */}
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm w-fit min-w-full mb-8">
                <table className="w-full text-left border-collapse min-w-[1600px]">
                    <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                            {isBatchViewMode && (
                                <th className="sticky top-[-32px] z-20 bg-gray-50 px-6 py-3 border-b border-gray-200 text-center">
                                    <input
                                        type="checkbox"
                                        checked={selectedCustomerIds.size === currentSlice.length && currentSlice.length > 0}
                                        onChange={toggleSelectAll}
                                        className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer transition-all hover:scale-110"
                                    />
                                </th>
                            )}
                            <th className="sticky top-[-32px] z-20 bg-gray-50 px-6 py-3 border-b border-gray-200 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center whitespace-nowrap shadow-sm">Actions</th>
                            {columns.filter((c: any) => c.visible || c.id === 'name').map((col: any) => (
                                <th
                                    key={col.id}
                                    className={`sticky top-[-32px] z-20 bg-gray-50 px-6 py-3 border-b border-gray-200 text-[10px] font-bold text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors ${col.id === 'name' ? 'w-[280px]' : ''} shadow-sm`}
                                    onClick={() => handleSort(col.id)}
                                >
                                    <div className="flex items-center">
                                        {col.label}
                                        <ChevronDown size={10} className={`ml-2 transition-all ${sortConfig.key === col.id ? 'opacity-100 text-indigo-600' : 'opacity-20'}`} />
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {isLoading ? (
                            <tr>
                                <td colSpan={columns.filter((c: any) => c.visible).length + (isBatchViewMode ? 2 : 1)} className="px-8 py-20 text-center">
                                    <div className="flex flex-col items-center justify-center space-y-4">
                                        <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
                                        <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Synchronizing with database...</p>
                                    </div>
                                </td>
                            </tr>
                        ) : currentSlice.length === 0 ? (
                            <tr>
                                <td colSpan={columns.filter((c: any) => c.visible).length + (isBatchViewMode ? 2 : 1)} className="px-8 py-20 text-center text-slate-400 font-bold">
                                    No customers found matching your criteria.
                                </td>
                            </tr>
                        ) : currentSlice.map((customer: any) => (
                            <tr key={customer.id} className={`group hover:bg-slate-50/80 transition-all duration-300 ${selectedCustomerIds.has(customer.id) ? 'bg-indigo-50/50' : ''}`}>
                                {isBatchViewMode && (
                                    <td className="px-6 py-4 text-center">
                                        <input
                                            type="checkbox"
                                            checked={selectedCustomerIds.has(customer.id)}
                                            onChange={() => toggleSelectOne(customer.id)}
                                            className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer transition-all hover:scale-110"
                                        />
                                    </td>
                                )}
                                <td className="px-4 py-4 text-center">
                                    <div className="flex items-center justify-center space-x-1">
                                        <button
                                            onClick={() => navigate(`/customers/view/${customer.id}`)}
                                            className="p-2 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all"
                                            title="View Details"
                                        >
                                            <Eye size={16} />
                                        </button>
                                        <button
                                            onClick={() => navigate(`/customers/edit/${customer.id}`)}
                                            className="p-2 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all"
                                            title="Edit Customer"
                                        >
                                            <Edit size={16} />
                                        </button>
                                    </div>
                                </td>
                                {columns.filter((c: any) => c.visible).map((col: any) => {
                                    const val = customer[col.id];

                                    if (col.id === 'balance' || col.id === 'uninvoiced' || col.id === 'qtyToDeliver') {
                                        if (col.id === 'qtyToDeliver') {
                                            return (
                                                <td key={col.id} className="px-6 py-4">
                                                    <Link
                                                        to={`/customers/qty-to-deliver/${customer.id}`}
                                                        className={`text-[12px] font-medium hover:underline transition-all ${val !== 0 ? 'text-blue-600' : 'text-slate-300'}`}
                                                    >
                                                        {val || '0'}
                                                    </Link>
                                                </td>
                                            );
                                        }
                                        if (col.id === 'balance') {
                                            return (
                                                <td key={col.id} className="px-6 py-4">
                                                    <Link
                                                        to={`/customers/transactions/${customer.id}`}
                                                        className="text-[12px] font-bold text-slate-600 hover:text-blue-600 hover:underline transition-all"
                                                    >
                                                        {customer.currency?.split(' ')[0] || 'ZMW'} {(Number(val) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </Link>
                                                </td>
                                            );
                                        }
                                        return (
                                            <td key={col.id} className="px-6 py-4">
                                                <span className={`text-[12px] font-medium ${val > 0 ? 'text-slate-900' : 'text-slate-300'}`}>
                                                    {customer.currency?.split(' ')[0] || 'ZMW'} {parseFloat(val || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                </span>
                                            </td>
                                        );
                                    }

                                    if (col.id === 'status') {
                                        return (
                                            <td key={col.id} className="px-6 py-4">
                                                <div className="flex gap-2 items-center">
                                                    {customer.inactive && (
                                                        <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-slate-100 text-slate-500 border border-slate-200">
                                                            Inactive
                                                        </span>
                                                    )}
                                                    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${val === 'Paid' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>
                                                        {val || 'Unknown'}
                                                    </span>
                                                </div>
                                            </td>
                                        );
                                    }

                                    if (['receipts', 'salesQuotes', 'salesOrders', 'salesInvoices', 'deliveryNotes', 'payments', 'creditNotes'].includes(col.id)) {
                                        let count = 0;
                                        if (col.id === 'receipts') count = receipts.filter(r => r.paidByContact === customer.name || r.customerId === customer.id).length;
                                        if (col.id === 'salesQuotes') {
                                            count = quotes.filter(q => {
                                                if (q.customerId !== customer.id && q.customer?.name !== customer.name) return false;
                                                if (q.status === 'Accepted' || q.status === 'Rejected') return false;
                                                // Parity with SalesQuotesView.tsx: exclude expired active quotes
                                                if (q.status === 'Active' && q.issueDate && q.expiryDays) {
                                                    try {
                                                        const [d, m, y] = q.issueDate.split('.');
                                                        if (d && m && y) {
                                                            const expDate = new Date(`${y}-${m}-${d}`);
                                                            expDate.setHours(23, 59, 59, 999);
                                                            expDate.setDate(expDate.getDate() + parseInt(q.expiryDays));
                                                            if (new Date() > expDate) return false;
                                                        }
                                                    } catch (e) {
                                                        console.error('Date parsing failed for quote:', q.reference, e);
                                                    }
                                                }
                                                return true;
                                            }).length;
                                        }
                                        if (col.id === 'salesOrders') count = orders.filter(o => (o.customerId === customer.id || o.customer?.name === customer.name) && o.status !== 'Invoiced' && o.status !== 'Rejected').length;
                                        if (col.id === 'salesInvoices') count = invoices.filter(i => (i.customerId === customer.id || i.customer?.name === customer.name) && i.status !== 'Delivered').length;
                                        if (col.id === 'deliveryNotes') count = deliveryNotes.filter(d => (d.customerId === customer.id || d.customer?.name === customer.name) && (d.status || 'Pending') === 'Pending').length;

                                        if (['receipts', 'salesQuotes', 'salesOrders', 'salesInvoices', 'deliveryNotes', 'payments'].includes(col.id) && count > 0) {
                                            const routeMap: Record<string, string> = {
                                                'receipts': '/receipts',
                                                'salesQuotes': '/sales-quotes',
                                                'salesOrders': '/sales-orders',
                                                'salesInvoices': '/sales-invoices',
                                                'deliveryNotes': '/delivery-notes',
                                                'payments': '/receipts' // Logic fallback
                                            };
                                            const basePath = routeMap[col.id];

                                            return (
                                                <td key={col.id} className="px-6 py-4">
                                                    <Link
                                                        to={`${basePath}/customer/${encodeURIComponent(customer.name)}`}
                                                        className="text-[12px] font-medium text-blue-600 hover:underline transition-all"
                                                    >
                                                        {count}
                                                    </Link>
                                                </td>
                                            );
                                        }

                                        return (
                                            <td key={col.id} className="px-6 py-4 text-[12px] font-medium text-slate-500">
                                                {count || 0}
                                            </td>
                                        );
                                    }

                                    if (['email', 'billingAddress', 'deliveryAddress', 'controlAccount', 'timestamp', 'availableCredit', 'withholdingTax', 'code'].includes(col.id)) {
                                        const symbol = customer.currency?.split(' ')[0] || 'ZMW';
                                        let displayVal = val || '—';
                                        if (col.id === 'controlAccount' && !val) displayVal = 'Accounts receivable';
                                        if (col.id === 'availableCredit') displayVal = `${symbol} ${(Number(val) || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
                                        if (col.id === 'withholdingTax') displayVal = `${symbol} ${(Number(val) || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
                                        if (col.id === 'timestamp') {
                                            const dateObj = val ? new Date(val) : new Date();
                                            displayVal = dateObj.toLocaleString('en-GB', {
                                                day: '2-digit', month: '2-digit', year: 'numeric',
                                                hour: '2-digit', minute: '2-digit', second: '2-digit',
                                                hour12: true
                                            }).replace(/\//g, '.').replace(',', '').toUpperCase();
                                        }

                                        return (
                                            <td key={col.id} className="px-6 py-4">
                                                <span className={cn(
                                                    "whitespace-nowrap",
                                                    col.id === 'timestamp'
                                                        ? "text-[10px] font-medium text-slate-400 font-sans tracking-tight"
                                                        : "text-[12px] font-medium text-slate-500"
                                                )}>
                                                    {displayVal}
                                                </span>
                                            </td>
                                        );
                                    }

                                    if (col.id === 'name') {
                                        return (
                                            <td key={col.id} className="px-6 py-4 w-[280px]">
                                                <div className="flex flex-col max-w-[280px]">
                                                    <span className="text-[12px] font-medium text-slate-800 uppercase tracking-tight truncate" title={val}>{val}</span>
                                                </div>
                                            </td>
                                        );
                                    }

                                    return (
                                        <td key={col.id} className="px-6 py-4">
                                            <span className="text-[12px] font-medium text-slate-500 whitespace-nowrap">{val || '—'}</span>
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                    <tfoot className="bg-[#f8fafc]/80 border-t-2 border-slate-200">
                        <tr>
                            {isBatchViewMode && (
                                <td className="px-6 py-4 border-b border-transparent"></td>
                            )}
                            <td className="px-6 py-4"></td>
                            {columns.filter((c: any) => c.visible).map((col: any) => {
                                if (['balance', 'withholdingTax', 'uninvoiced'].includes(col.id)) {
                                    const keyMap: Record<string, keyof typeof totals[string]> = {
                                        'balance': 'balance',
                                        'withholdingTax': 'withholding',
                                        'uninvoiced': 'uninvoiced'
                                    };
                                    const key = keyMap[col.id];
                                    const activeCurs = Object.keys(totals).filter(cur => totals[cur][key] !== 0);
                                    
                                    return (
                                        <td
                                            key={`total-${col.id}`}
                                            className={`px-6 py-3 whitespace-nowrap ${col.id === 'balance' ? 'cursor-pointer hover:bg-indigo-50/50 transition-colors' : ''}`}
                                            onClick={() => col.id === 'balance' && navigate('/reports/customer-transactions')}
                                            title={col.id === 'balance' ? 'View All Customer Transactions' : ''}
                                        >
                                            <div className="flex flex-col gap-1">
                                                {activeCurs.length > 0 ? activeCurs.map(cur => (
                                                    <div key={cur} className="flex items-center gap-1.5 justify-start">
                                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-tight">{cur}</span>
                                                        <span className={cn("text-[12px] font-black tracking-tight", col.id === 'balance' ? 'text-indigo-600' : 'text-slate-600')}>
                                                            {totals[cur][key].toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                        </span>
                                                    </div>
                                                )) : (
                                                    <span className="text-[12px] font-black text-slate-300">0.00</span>
                                                )}
                                            </div>
                                        </td>
                                    );
                                }
                                if (col.id === 'name') {
                                    return (
                                        <td key={`total-${col.id}`} className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Grand Totals:</td>
                                    );
                                }
                                return <td key={`total-${col.id}`} className="px-6 py-4"></td>;
                            })}
                        </tr>
                    </tfoot>
                </table>
            </div>

            {/* Pagination & Export */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm">
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
                        <span>Page {currentPage} of {totalPages || 1}</span>
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
                        {[50, 100, 250, 500].map(size => (
                            <button
                                key={size}
                                onClick={() => {
                                    setPageSize(size);
                                    setCurrentPage(1);
                                    document.querySelector('main')?.scrollTo({ top: 0, behavior: 'smooth' });
                                }}
                                className={`text-[10px] font-black transition-all ${pageSize === size ? 'text-indigo-600 underline underline-offset-4 decoration-2' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                {size}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button onClick={handleCopyToClipboard} className="px-6 py-3 bg-slate-50 text-[11px] font-black text-slate-500 rounded-2xl hover:bg-indigo-50 hover:text-indigo-600 transition-all border border-slate-200/50 uppercase tracking-widest flex items-center gap-2">
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
                            <div className="absolute bottom-full right-0 mb-2 w-56 bg-white border border-gray-200 shadow-xl rounded-md py-1 z-50 overflow-hidden text-left">
                                <button
                                    onClick={() => {
                                        navigate('/customers/edit-columns');
                                        setIsBatchOpsOpen(false);
                                    }}
                                    className="w-full text-left px-4 py-2 text-[12px] font-medium text-gray-700 hover:bg-gray-100 transition-colors capitalize"
                                >
                                    Column Settings
                                </button>
                                <button
                                    onClick={() => {
                                        setIsBatchOpsOpen(false);
                                        setIsBatchViewMode(true);
                                        document.querySelector('main')?.scrollTo({ top: 0, behavior: 'smooth' });
                                    }}
                                    className="w-full text-left px-4 py-2 text-[12px] font-medium text-gray-700 hover:bg-gray-100 transition-colors border-t border-gray-100"
                                >
                                    Enable Batch Actions
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CustomersView;
