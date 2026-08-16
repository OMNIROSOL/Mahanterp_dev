import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
    Eye, Edit, ChevronRight, LayoutGrid, Search, Filter, Plus, UserPlus,
    Download, UserX, UserCheck, Users, Check, Copy, ChevronLeft,
    ChevronsLeft, ChevronsRight, ChevronDown, ChevronUp, Printer, HelpCircle,
    Building2, Trash2
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';

import { Supplier } from '../types';
import { cn } from '../utils/cn';
import apiService from '../services/apiService';

const SuppliersView = () => {
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const [copiedNotification, setCopiedNotification] = useState(false);
    const [selectedSupplierIds, setSelectedSupplierIds] = useState<Set<string>>(new Set());
    const [isBatchViewMode, setIsBatchViewMode] = useState(() => localStorage.getItem('is_supplier_batch_view_mode') === 'true');
    const [isBatchOpsOpen, setIsBatchOpsOpen] = useState(false);
    const batchOpsRef = useRef<HTMLDivElement>(null);
    const [pageSize, setPageSize] = useState(50);
    const [currentPage, setCurrentPage] = useState(1);
    const [sortConfig, setSortConfig] = useState<{ key: string | null, direction: 'asc' | 'desc' }>({ key: null, direction: 'asc' });
    const [showInactive, setShowInactive] = useState(false);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (batchOpsRef.current && !batchOpsRef.current.contains(event.target as Node)) {
                setIsBatchOpsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const [refreshTrigger, setRefreshTrigger] = useState(0);
    useEffect(() => {
        const handleRefresh = () => setRefreshTrigger(prev => prev + 1);
        window.addEventListener('focus', handleRefresh);
        window.addEventListener('storage', handleRefresh);
        window.addEventListener('purchase_quotes_updated', handleRefresh);
        window.addEventListener('purchase_orders_updated', handleRefresh);
        window.addEventListener('purchase_invoices_updated', handleRefresh);
        window.addEventListener('debit_notes_updated', handleRefresh);
        window.addEventListener('grn_updated', handleRefresh);

        return () => {
            window.removeEventListener('focus', handleRefresh);
            window.removeEventListener('storage', handleRefresh);
            window.removeEventListener('purchase_quotes_updated', handleRefresh);
            window.removeEventListener('purchase_orders_updated', handleRefresh);
            window.removeEventListener('purchase_invoices_updated', handleRefresh);
            window.removeEventListener('debit_notes_updated', handleRefresh);
            window.removeEventListener('grn_updated', handleRefresh);
        };
    }, []);

    useEffect(() => {
        localStorage.setItem('is_supplier_batch_view_mode', isBatchViewMode.toString());
    }, [isBatchViewMode]);

    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
    const [goodsReceivedNotes, setGoodsReceivedNotes] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const [suppData, poData, grnData] = await Promise.all([
                    apiService.getSuppliers(),
                    apiService.getPurchaseOrders(),
                    apiService.getGoodsReceivedNotes()
                ]);
                setSuppliers(suppData);
                setPurchaseOrders(poData);
                setGoodsReceivedNotes(grnData);
            } catch (err) {
                console.error('Failed to fetch data:', err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [refreshTrigger]);

    const defaultColumns = [
        { id: 'name', label: 'Supplier Name', visible: true },
        { id: 'code', label: 'Supplier Code', visible: true },
        { id: 'division', label: 'Division', visible: true },
        { id: 'email', label: 'Email address', visible: false },
        { id: 'address', label: 'Address', visible: false },
        { id: 'controlAccount', label: 'Control account', visible: false },
        { id: 'receipts', label: 'Receipts', visible: false },
        { id: 'payments', label: 'Payments', visible: false },
        { id: 'purchaseEnquiries', label: 'Purchase Enquiry', visible: true },
        { id: 'purchaseOrders', label: 'Purchase Orders', visible: true },
        { id: 'purchaseInvoices', label: 'Purchase Invoices', visible: true },
        { id: 'debitNotes', label: 'Debit Notes', visible: true },
        { id: 'goodsReceipts', label: 'Goods Receipts', visible: true },
        { id: 'qtyToReceive', label: 'Qty to receive', visible: true },
        { id: 'status', label: 'Status', visible: true },
        { id: 'balance', label: 'Accounts payable', visible: true },
        { id: 'withholdingTax', label: 'Withholding tax payable', visible: false },
        { id: 'timestamp', label: 'Timestamp', visible: false }
    ];

    const [columns, setColumns] = useState(() => {
        const saved = localStorage.getItem('supplier_column_settings');
        if (!saved) return defaultColumns;
        const parsed = JSON.parse(saved);
        // Merge to ensure new columns like purchaseQuotes are included if missing in saved settings
        return defaultColumns.map(def => {
            const existing = parsed.find((p: any) => p.id === def.id);
            return existing ? { ...def, visible: existing.visible } : def;
        });
    });

    useEffect(() => {
        const handleStorageChange = () => {
            const saved = localStorage.getItem('supplier_column_settings');
            if (saved) setColumns(JSON.parse(saved));
        };
        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, []);

    const handleSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
        setSortConfig({ key, direction });
    };

    const enrichedSuppliers = useMemo(() => {
        return suppliers.map(supplier => {
            const supplierPOs = purchaseOrders.filter(po => 
                (po.supplierId === supplier.id || po.supplier?.name === supplier.name) && 
                po.status !== 'Closed' && po.status !== 'Rejected'
            );
            
            const supplierGRNs = goodsReceivedNotes.filter(grn => 
                grn.supplierId === supplier.id || grn.supplier === supplier.name
            );

            let qtyOrdered = 0;
            supplierPOs.forEach(po => {
                po.items?.forEach((it: any) => {
                    qtyOrdered += Number(it.qty || 0);
                });
            });

            let qtyReceived = 0;
            supplierGRNs.forEach(grn => {
                grn.items?.forEach((it: any) => {
                    qtyReceived += Number(it.qty || 0);
                });
            });

            const qtyToReceive = Math.max(0, qtyOrdered - qtyReceived);

            return {
                ...supplier,
                qtyToReceive
            };
        });
    }, [suppliers, purchaseOrders, goodsReceivedNotes]);

    const sortedSuppliers = useMemo(() => {
        const query = searchQuery.toLowerCase();
        let result = enrichedSuppliers.filter(s => {
            if (showInactive) {
                if (!s.inactive && s.status !== 'Inactive') return false;
            } else {
                if (s.inactive || s.status === 'Inactive') return false;
            }
            const searchStr = `${s.name} ${s.code || ''} ${s.division || ''} ${s.status || ''} ${s.tpin || ''}`.toLowerCase();
            return searchStr.includes(query);
        });

        if (sortConfig.key) {
            result.sort((a: any, b: any) => {
                let aVal = a[sortConfig.key!] ?? '';
                let bVal = b[sortConfig.key!] ?? '';
                if (['balance', 'qtyToReceive', 'paymentTerms', 'availableCredit', 'withholdingTax'].includes(sortConfig.key!)) {
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
    }, [enrichedSuppliers, searchQuery, sortConfig, showInactive]);

    const currentSlice = sortedSuppliers.slice((currentPage - 1) * pageSize, currentPage * pageSize);
    const totalPages = Math.ceil(sortedSuppliers.length / pageSize) || 1;

    const totals = useMemo<Record<string, { balance: number; withholding: number }>>(() => {
        const res: Record<string, { balance: number; withholding: number }> = {};
        sortedSuppliers.forEach(s => {
            const curCode = String(s.currency || 'ZMW').split(' ')[0] || 'ZMW';
            if (!res[curCode]) res[curCode] = { balance: 0, withholding: 0 };

            const cleanVal = (v: any) => typeof v === 'number' ? v : parseFloat(String(v || 0).replace(/[^-0-9.]/g, '')) || 0;

            res[curCode].balance += cleanVal(s.balance);
            res[curCode].withholding += cleanVal(s.withholdingTax);
        });
        return res;
    }, [sortedSuppliers]);

    const handleBatchPrint = () => {
        if (selectedSupplierIds.size === 0) return;
        const ids = Array.from(selectedSupplierIds).join(',');
        navigate(`/suppliers/print-batch?ids=${ids}`);
    };

    const handleBatchCopy = () => {
        if (selectedSupplierIds.size === 0) return;
        const selectedList = suppliers.filter(s => selectedSupplierIds.has(s.id));
        const header = columns.filter((col: any) => col.visible).map((col: any) => col.label).join('\t');
        const rows = selectedList.map((s: any) =>
            columns.filter((col: any) => col.visible).map((col: any) => s[col.id] || '').join('\t')
        ).join('\n');

        const fullText = `${header}\n${rows}`;
        if (navigator.clipboard) {
            navigator.clipboard.writeText(fullText).then(() => {
                setCopiedNotification(true);
                setTimeout(() => setCopiedNotification(false), 2000);
            });
        }
    };

    const handleDeleteSupplier = async (id: string, name: string) => {
        if (!window.confirm(`Are you sure you want to delete supplier "${name}"?`)) {
            return;
        }
        try {
            await apiService.deleteSupplier(id);
            alert(`Supplier "${name}" deleted successfully.`);
            setRefreshTrigger(prev => prev + 1);
        } catch (err: any) {
            console.error('Failed to delete supplier:', err);
            alert(err.response?.data?.error || err.message || 'Failed to delete supplier.');
        }
    };

    const toggleSelectAll = () => {
        if (selectedSupplierIds.size === currentSlice.length && currentSlice.length > 0) {
            setSelectedSupplierIds(new Set());
        } else {
            setSelectedSupplierIds(new Set(currentSlice.map(s => s.id)));
        }
    };

    const toggleSelectOne = (id: string) => {
        setSelectedSupplierIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const handleCopyToClipboard = () => {
        const header = columns.filter((c: any) => c.visible).map((c: any) => c.label).join('\t');
        const rows = sortedSuppliers.map((s: any) =>
            columns.filter((col: any) => col.visible).map((col: any) => s[col.id] || '').join('\t')
        ).join('\n');
        const fullText = `${header}\n${rows}`;

        if (navigator.clipboard) {
            navigator.clipboard.writeText(fullText).then(() => {
                setCopiedNotification(true);
                setTimeout(() => setCopiedNotification(false), 2000);
            });
        }
    };

    return (
        <div className="p-8 space-y-10 relative font-sans">
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
                        <Building2 size={14} />
                        <span className="text-gray-400">Procurement Management</span>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900">Suppliers</h1>
                    <p className="text-gray-500 text-sm">Directory of your vendors and supply chain partners</p>
                </div>

                <div className="flex space-x-4 items-center mb-1">
                    <button
                        onClick={() => navigate('/suppliers/new')}
                        className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-[12px] font-black hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-500/20 flex items-center uppercase tracking-widest"
                    >
                        <UserPlus size={16} className="mr-2" /> REGISTER SUPPLIER
                    </button>
                </div>
            </div>

            {/* Search & Stats */}
            <div className="mt-8 flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-4 flex-1">
                    <div className="relative flex-1 group max-w-2xl">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                        <input
                            type="text"
                            placeholder="Search by supplier name, code, or division..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
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
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{showInactive ? 'Inactive Vendors' : 'Active Vendors'}</span>
                        <span className="text-[18px] font-bold text-gray-900">
                            {suppliers.filter(s => showInactive ? (s.inactive || s.status === 'Inactive') : (!s.inactive && s.status !== 'Inactive')).length}
                        </span>
                    </div>
                </div>
            </div>

            {/* Batch Action Bar */}
            {isBatchViewMode && (
                <div className="bg-indigo-600 px-8 py-4 rounded-[24px] flex items-center justify-between shadow-xl shadow-indigo-200/50 animate-in slide-in-from-top-4 duration-500 border border-white/10 backdrop-blur-md">
                    <div className="flex items-center space-x-8">
                        <div className="flex flex-col">
                            <span className="text-white font-black text-[14px] leading-tight tracking-tight">{selectedSupplierIds.size}</span>
                            <span className="text-indigo-200 font-bold text-[9px] uppercase tracking-widest whitespace-nowrap">Selected</span>
                        </div>
                        <div className="h-8 w-px bg-white/20"></div>
                        <div className="flex items-center space-x-4">
                            <button
                                onClick={handleBatchPrint}
                                disabled={selectedSupplierIds.size === 0}
                                className="text-white/90 hover:text-white flex items-center space-x-2 text-[11px] font-black uppercase tracking-widest transition-all disabled:opacity-40"
                            >
                                <Printer size={14} /> <span>Print Dossiers</span>
                            </button>
                            <button
                                onClick={handleBatchCopy}
                                disabled={selectedSupplierIds.size === 0}
                                className="text-white/90 hover:text-white flex items-center space-x-2 text-[11px] font-black uppercase tracking-widest transition-all disabled:opacity-40"
                            >
                                <Copy size={14} /> <span>Copy Details</span>
                            </button>
                        </div>
                    </div>
                    <button
                        onClick={() => { setIsBatchViewMode(false); setSelectedSupplierIds(new Set()); localStorage.setItem('is_supplier_batch_view_mode', 'false'); }}
                        className="bg-white text-indigo-600 px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-white shadow-lg transition-all border border-transparent active:scale-95"
                    >
                        Reset Mode
                    </button>
                </div>
            )}

            {/* Table Area */}
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm w-fit min-w-full mb-8 overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse min-w-[1600px]">
                    <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                            {isBatchViewMode && (
                                <th className="sticky top-0 lg:top-[-2rem] z-30 bg-gray-50/95 backdrop-blur-md px-6 py-3 border-b border-gray-200 text-center shadow-sm">
                                    <input
                                        type="checkbox"
                                        checked={selectedSupplierIds.size === currentSlice.length && currentSlice.length > 0}
                                        onChange={toggleSelectAll}
                                        className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer transition-all hover:scale-110"
                                    />
                                </th>
                            )}
                            <th className="sticky top-0 lg:top-[-2rem] z-30 bg-gray-50/95 backdrop-blur-md px-6 py-3 border-b border-gray-200 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center whitespace-nowrap shadow-sm">Actions</th>
                            {columns.filter((c: any) => c.visible || c.id === 'name' || c.id === 'division' || c.id === 'controlAccount').map((col: any) => (
                                <th
                                    key={col.id}
                                    className={`sticky top-0 lg:top-[-2rem] z-30 bg-gray-50/95 backdrop-blur-md px-6 py-3 border-b border-gray-200 text-[10px] font-bold text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors ${col.id === 'name' ? 'w-[280px]' : ''} shadow-sm`}
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
                        ) : currentSlice.length > 0 ? (
                            currentSlice.map((supplier: any) => (
                                <tr key={supplier.id} className={`group hover:bg-indigo-50/30 transition-all duration-300 ${selectedSupplierIds.has(supplier.id) ? 'bg-indigo-50/50' : ''}`}>
                                    {isBatchViewMode && (
                                        <td className="px-6 py-4 text-center">
                                            <input
                                                type="checkbox"
                                                checked={selectedSupplierIds.has(supplier.id)}
                                                onChange={() => toggleSelectOne(supplier.id)}
                                                className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer transition-all hover:scale-110"
                                            />
                                        </td>
                                    )}
                                    <td className="px-6 py-4 text-center">
                                        <div className="flex items-center justify-center space-x-1">
                                            <button
                                                onClick={() => navigate(`/suppliers/view/${supplier.id}`)}
                                                className="p-2 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all"
                                                title="View Details"
                                            >
                                                <Eye size={16} />
                                            </button>
                                            <button
                                                onClick={() => navigate(`/suppliers/edit/${supplier.id}`)}
                                                className="p-2 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all"
                                                title="Edit Supplier"
                                            >
                                                <Edit size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteSupplier(supplier.id, supplier.name)}
                                                className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all"
                                                title="Delete Supplier"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                    {columns.filter((c: any) => c.visible || c.id === 'name' || c.id === 'division' || c.id === 'controlAccount').map((col: any) => {
                                        const val = supplier[col.id];

                                        if (col.id === 'division' || col.id === 'controlAccount') {
                                            return (
                                                <td key={col.id} className="px-6 py-4 text-[12px] font-medium text-slate-600 whitespace-nowrap">
                                                    {val || (supplier as any)[col.id] || (col.id === 'division' ? 'General' : 'Accounts Payable')}
                                                </td>
                                            );
                                        }

                                        if (col.id === 'balance' || col.id === 'withholdingTax') {
                                            const symbol = (supplier.currency || 'ZMW').split(' ')[0];
                                            const cleanVal = typeof val === 'number' ? val : parseFloat(String(val || 0).replace(/[^-0-9.]/g, '')) || 0;
                                            return (
                                                <td key={col.id} className="px-6 py-4">
                                                    <span className={`text-[12px] font-medium ${col.id === 'balance' ? 'text-slate-900 cursor-pointer hover:text-indigo-600' : 'text-slate-600'}`}>
                                                        {symbol} {cleanVal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                    </span>
                                                </td>
                                            );
                                        }

                                        if (col.id === 'qtyToReceive') {
                                            return (
                                                <td key={col.id} className="px-6 py-4">
                                                    <span className={`text-sm font-bold ${val > 0 ? 'text-indigo-600 cursor-pointer' : 'text-slate-400'}`}>
                                                        {val || '0'}
                                                    </span>
                                                </td>
                                            );
                                        }

                                        if (col.id === 'status') {
                                            const isPaid = val === 'Paid';
                                            const isOverpaid = val === 'Overpaid';
                                            let badgeClass = 'bg-amber-50 text-amber-600 border-amber-100'; // Unpaid / default
                                            if (isPaid) badgeClass = 'bg-emerald-50 text-emerald-600 border-emerald-100';
                                            if (isOverpaid) badgeClass = 'bg-blue-50 text-blue-600 border-blue-100';
                                            return (
                                                <td key={col.id} className="px-6 py-4">
                                                    <div className="flex gap-2 items-center">
                                                        {supplier.inactive && (
                                                            <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-slate-100 text-slate-500 border border-slate-200">
                                                                Inactive
                                                            </span>
                                                        )}
                                                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${badgeClass}`}>
                                                            {val || 'Unpaid'}
                                                        </span>
                                                    </div>
                                                </td>
                                            );
                                        }

                                        if (['purchaseOrders', 'purchaseInvoices', 'goodsReceipts', 'purchaseEnquiries', 'debitNotes', 'receipts', 'payments'].includes(col.id)) {
                                            const count = Number(val) || 0;
                                            const getRoute = (id: string) => {
                                                const mapping: Record<string, string> = {
                                                    'purchaseEnquiries': '/purchase-quotes',
                                                    'purchaseOrders': '/purchase-orders',
                                                    'purchaseInvoices': '/purchase-invoices',
                                                    'debitNotes': '/debit-notes',
                                                    'goodsReceipts': '/goods-received-notes',
                                                    'receipts': '/receipts',
                                                    'payments': '/payments'
                                                };
                                                return mapping[id] || '/purchase-history';
                                            };

                                            return (
                                                <td key={col.id} className="px-6 py-4">
                                                    <span
                                                        onClick={() => count > 0 && navigate(`${getRoute(col.id)}/supplier/${supplier.name}`)}
                                                        className={`text-sm font-bold ${count > 0 ? 'text-indigo-600 cursor-pointer hover:text-indigo-800' : 'text-slate-400'}`}
                                                    >
                                                        {count}
                                                    </span>
                                                </td>
                                            );
                                        }

                                        if (col.id === 'timestamp') {
                                            const dateObj = val ? new Date(val) : new Date();
                                            return (
                                                <td key={col.id} className="px-6 py-4">
                                                    <span className="text-[10px] font-medium text-slate-400 font-sans tracking-tight whitespace-nowrap">
                                                        {dateObj.toLocaleString('en-GB', {
                                                            day: '2-digit', month: '2-digit', year: 'numeric',
                                                            hour: '2-digit', minute: '2-digit', second: '2-digit',
                                                            hour12: true
                                                        }).replace(/\//g, '.').replace(',', '').toUpperCase()}
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
                                            <td key={col.id} className="px-6 py-4 text-[12px] font-medium text-slate-600 whitespace-nowrap">
                                                {col.id === 'address' ? (supplier.billingAddress || (supplier as any).address || '—') : (val || '—')}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={columns.filter((c: any) => c.visible).length + (isBatchViewMode ? 2 : 1)} className="px-8 py-20 text-center text-slate-400 font-bold">
                                    No suppliers found matching your criteria.
                                </td>
                            </tr>
                        )}
                    </tbody>
                    <tfoot className="bg-[#f8fafc]/80 border-t-2 border-slate-200">
                        <tr>
                            {isBatchViewMode && <td className="px-6 py-4"></td>}
                            <td className="px-6 py-4"></td>
                            {(() => {
                                const activeCols = columns.filter((c: any) => c.visible || c.id === 'name' || c.id === 'division' || c.id === 'controlAccount');
                                const allCurrencies = Array.from(new Set(sortedSuppliers.map(s => String(s.currency || 'ZMW').split(' ')[0] || 'ZMW'))).sort();
                                return activeCols.map((col: any) => {
                                    if (col.id === 'balance' || col.id === 'withholdingTax') {
                                        const key = col.id === 'balance' ? 'balance' : 'withholding';
                                        return (
                                            <td key={`total-${col.id}`} className="px-6 py-4 whitespace-nowrap bg-indigo-50/5">
                                                <div className="flex flex-col gap-1.5">
                                                    {allCurrencies.length > 0 ? allCurrencies.map(cur => {
                                                        const amount = totals[cur]?.[key] || 0;
                                                        return (
                                                            <div key={cur} className="flex items-center gap-1.5 group/total">
                                                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-tight w-7 text-right">{cur}</span>
                                                                <span className={cn(
                                                                    "text-[12px] font-black tracking-tight",
                                                                    amount !== 0
                                                                        ? (col.id === 'balance' ? 'text-indigo-600' : 'text-slate-900')
                                                                        : 'text-slate-300'
                                                                )}>
                                                                    {amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                                </span>
                                                            </div>
                                                        );
                                                    }) : (
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="text-[9px] font-black text-slate-300 uppercase tracking-tight w-7 text-right">ZMW</span>
                                                            <span className="text-[12px] font-black text-slate-200 tracking-tight">0.00</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                        );
                                    }
                                    if (col.id === 'name') {
                                        return (
                                            <td key={`total-${col.id}`} className="px-6 py-4">
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] whitespace-nowrap">GRAND TOTALS:</p>
                                            </td>
                                        );
                                    }
                                    return <td key={`total-${col.id}`} className="px-6 py-4"></td>;
                                });
                            })()}
                        </tr>
                    </tfoot>
                </table>
            </div>

            {/* Pagination & Export */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm">
                <div className="flex flex-col items-center space-y-2">
                    <div className="flex items-center space-x-2 text-[12px] text-slate-500 font-medium whitespace-nowrap">
                        <button
                            onClick={() => { setCurrentPage(1); document.querySelector('main')?.scrollTo({ top: 0, behavior: 'smooth' }); }}
                            disabled={currentPage === 1}
                            className="p-1 rounded-md hover:bg-slate-100 disabled:opacity-30 transition-all active:scale-90"
                        >
                            <ChevronsLeft size={16} />
                        </button>
                        <button
                            onClick={() => { setCurrentPage(prev => Math.max(1, prev - 1)); document.querySelector('main')?.scrollTo({ top: 0, behavior: 'smooth' }); }}
                            disabled={currentPage === 1}
                            className="p-1 rounded-md hover:bg-slate-100 disabled:opacity-30 transition-all active:scale-90"
                        >
                            <ChevronLeft size={16} />
                        </button>
                        <span>Page {currentPage} of {totalPages || 1}</span>
                        <button
                            onClick={() => { setCurrentPage(prev => Math.min(totalPages, prev + 1)); document.querySelector('main')?.scrollTo({ top: 0, behavior: 'smooth' }); }}
                            disabled={currentPage === totalPages || totalPages === 0}
                            className="p-1 rounded-md hover:bg-slate-100 disabled:opacity-30 transition-all active:scale-90"
                        >
                            <ChevronRight size={16} />
                        </button>
                        <button
                            onClick={() => { setCurrentPage(totalPages); document.querySelector('main')?.scrollTo({ top: 0, behavior: 'smooth' }); }}
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
                            className="px-4 py-2 bg-indigo-600 text-[11px] font-bold text-white rounded-md hover:bg-indigo-700 transition-all uppercase tracking-wider flex items-center shadow-sm"
                        >
                            Management {isBatchOpsOpen ? <ChevronDown size={14} className="ml-2" /> : <ChevronUp size={14} className="ml-2" />}
                        </button>
                        {isBatchOpsOpen && (
                            <div className="absolute bottom-full right-0 mb-2 w-56 bg-white border border-gray-200 shadow-xl rounded-md py-1 z-50 overflow-hidden text-left">
                                <button
                                    onClick={() => {
                                        navigate('/suppliers/edit-columns');
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
                                        localStorage.setItem('is_supplier_batch_view_mode', 'true');
                                        document.querySelector('main')?.scrollTo({ top: 0, behavior: 'smooth' });
                                    }}
                                    className="w-full text-left px-4 py-2 text-[12px] font-medium text-gray-700 hover:bg-gray-100 transition-colors border-t border-gray-100 flex items-center justify-between"
                                >
                                    <span>Batch Print & Operations</span>
                                    <Printer size={12} className="text-slate-400" />
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SuppliersView;
