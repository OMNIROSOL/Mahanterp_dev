import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
    Eye, Edit, Search, Plus, Receipt as ReceiptIcon, ChevronRight,
    ChevronsLeft, ChevronLeft, ChevronRight as ChevronRightIcon,
    ChevronsRight, Copy, Check, Filter, LayoutGrid, FolderOpen,
    ChevronDown, ChevronUp, Printer, Download, Trash2, Settings,
    Layout
} from 'lucide-react';
import { Receipt } from '../types';
import apiService from '../services/apiService';
import { cn } from '../utils/cn';
import BatchActionBar from '../components/shared/BatchActionBar';

const ReceiptsView = () => {
    const navigate = useNavigate();
    const { customerName } = useParams();
    const [searchQuery, setSearchQuery] = useState('');
    const [pageSize, setPageSize] = useState(50);
    const [currentPage, setCurrentPage] = useState(1);
    const [sortConfig, setSortConfig] = useState<{ key: keyof Receipt | null, direction: 'asc' | 'desc' }>({ key: null, direction: 'asc' });
    const [isBatchOpsOpen, setIsBatchOpsOpen] = useState(false);
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [copiedNotification, setCopiedNotification] = useState(false);
    const batchOpsRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (batchOpsRef.current && !batchOpsRef.current.contains(event.target as Node)) {
                setIsBatchOpsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const defaultColumns = [
        { id: 'date', label: 'Date', visible: true },
        { id: 'reference', label: 'Reference', visible: true },
        { id: 'paidByContact', label: 'Paid by', visible: true },
        { id: 'receivedInAccount', label: 'Received in', visible: true },
        { id: 'description', label: 'Description', visible: true },
        { id: 'amount', label: 'Total amount', visible: true },
        { id: 'status', label: 'Status', visible: true },
        { id: 'timestamp', label: 'Timestamp', visible: true },
    ];

    const [columns] = useState(defaultColumns);

    const handleSort = (key: keyof Receipt | null) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const [receipts, setReceipts] = useState<Receipt[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchReceipts = async () => {
            setIsLoading(true);
            try {
                const data = await apiService.getReceipts();
                setReceipts(data.map((r: any) => ({
                    ...r,
                    date: r.date ? new Date(r.date).toLocaleDateString('en-GB').replace(/\//g, '.') : ''
                })));
            } catch (err) {
                console.error('Failed to fetch receipts:', err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchReceipts();
    }, []);

    const filteredReceipts = useMemo(() => {
        let result = [...receipts];
        if (customerName) {
            result = result.filter(r => r.paidByContact.toLowerCase() === customerName.toLowerCase());
        }
        const query = searchQuery.toLowerCase();
        if (query) {
            result = result.filter(receipt => {
                return (
                    (receipt.paidByContact || '').toLowerCase().includes(query) ||
                    (receipt.description || '').toLowerCase().includes(query) ||
                    (receipt.reference || '').toLowerCase().includes(query) ||
                    (receipt.status || '').toLowerCase().includes(query) ||
                    (receipt.date || '').toLowerCase().includes(query) ||
                    (receipt.amount?.toString() || '').includes(query)
                );
            });
        }
        if (sortConfig.key) {
            result.sort((a, b) => {
                const aValue = (a as any)[sortConfig.key!];
                const bValue = (b as any)[sortConfig.key!];
                if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return result;
    }, [searchQuery, sortConfig, customerName, receipts]);

    const totalFilteredAmount = useMemo(() => {
        return filteredReceipts.reduce((sum, item) => sum + parseFloat(item.amount?.toString() || '0'), 0);
    }, [filteredReceipts]);

    const totalPages = Math.ceil(filteredReceipts.length / pageSize) || 1;
    const currentReceiptsSlice = useMemo(() => {
        return filteredReceipts.slice((currentPage - 1) * pageSize, currentPage * pageSize);
    }, [filteredReceipts, currentPage, pageSize]);

    const toggleSelectAll = () => {
        if (selectedIds.length === currentReceiptsSlice.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(currentReceiptsSlice.map(item => item.id));
        }
    };

    const toggleSelect = (id: string) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    const handleCopyToClipboard = (data: Receipt[]) => {
        const rows = data.map(r =>
            `${r.date}\t${r.reference}\t${r.paidByContact}\t${r.receivedInAccount}\t${r.description}\t${r.amount}\t${r.status}\t${r.timestamp || ''}`
        ).join('\n');
        navigator.clipboard.writeText(rows).then(() => {
            setCopiedNotification(true);
            setTimeout(() => setCopiedNotification(false), 2000);
        });
    };

    return (
        <div className="p-8 space-y-6 max-w-[1400px] ml-0 mr-auto animate-in fade-in duration-500 font-sans">
            {customerName && (
                <div className="flex items-center space-x-2 text-[11px] font-bold text-slate-400 uppercase tracking-widest bg-white p-3 rounded-xl border border-slate-100 shadow-sm transition-all hover:shadow-md">
                    <FolderOpen size={14} className="text-indigo-500" />
                    <ChevronRight size={10} className="opacity-30" />
                    <Link to="/customers" className="text-indigo-500 hover:text-indigo-700 transition-colors">Customers</Link>
                    <ChevronRight size={10} className="opacity-30" />
                    <span className="text-slate-600 italic">“{customerName}”</span>
                </div>
            )}

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <div className="flex items-center space-x-2 text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-1">
                        <ReceiptIcon size={14} />
                        <span className="text-gray-400">Financial Records</span>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 leading-tight tracking-tight">Receipts</h1>
                    <p className="text-gray-500 text-sm">Manage and track your incoming payments</p>
                </div>
                {!customerName && (
                    <div className="flex bg-indigo-50/50 border border-indigo-100 p-4 rounded-xl shadow-sm items-center gap-6 animate-in slide-in-from-top-4 duration-500">
                        <div className="h-10 w-10 bg-indigo-600 rounded-full flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
                            <ReceiptIcon size={20} />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-0.5">Grand Total Received</span>
                            <div className="flex items-baseline gap-2">
                                <span className="text-2xl font-black text-slate-900 tracking-tighter">ZMW {totalFilteredAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                <span className="text-[10px] font-bold text-slate-400">across {filteredReceipts.length} records</span>
                            </div>
                        </div>
                    </div>
                )}
                {customerName && (
                    <div className="flex bg-blue-50/50 border border-blue-100 p-4 rounded-xl shadow-sm items-center gap-6 animate-in slide-in-from-top-4 duration-500">
                        <div className="h-10 w-10 bg-blue-600 rounded-full flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                            <ReceiptIcon size={20} />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em] mb-0.5">Total Received</span>
                            <div className="flex items-baseline gap-2">
                                <span className="text-2xl font-black text-slate-900 tracking-tighter">ZMW {totalFilteredAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                <span className="text-[10px] font-bold text-slate-400">from {customerName}</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div className="mt-8 flex flex-col md:flex-row items-center justify-between gap-6 pb-2">
                <div className="flex items-center gap-4 flex-1">
                    <div className="relative flex-1 group max-w-xl">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 transition-colors group-focus-within:text-blue-500" size={14} />
                        <input
                            type="text"
                            placeholder="Search receipts by reference, contact, or status..."
                            value={searchQuery}
                            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white shadow-sm transition-all"
                        />
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate('/receipts/new')}
                        className="bg-blue-600 text-white px-6 py-2.5 rounded-lg text-sm font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 flex items-center gap-2"
                    >
                        <Plus size={16} /> NEW RECEIPT
                    </button>
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
                        label: 'Print Receipts',
                        onClick: () => {
                            if (selectedIds.length === 0) { alert('No receipts selected'); return; }
                            navigate(`/receipts/print-batch?ids=${selectedIds.join(',')}`);
                        }
                    },
                    {
                        icon: <Copy size={16} strokeWidth={3} />,
                        label: 'Copy Details',
                        onClick: () => {
                            if (selectedIds.length === 0) { alert('No receipts selected'); return; }
                            const selectedReceipts = filteredReceipts.filter(r => selectedIds.includes(r.id));
                            const text = selectedReceipts.map(r => `${r.id}\t${r.customer}\t${r.amount}`).join('\n');
                            navigator.clipboard.writeText(text);
                            alert('Copied to clipboard');
                        }
                    }
                ]}
            />

            <div className="bg-white border border-slate-100 rounded-[28px] shadow-sm shadow-indigo-50/50 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50">
                                {isSelectionMode && (
                                    <th className="px-6 py-4 w-12 text-center">
                                        <div className="flex items-center justify-center">
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.length > 0 && selectedIds.length === currentReceiptsSlice.length}
                                                onChange={toggleSelectAll}
                                                className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-0 cursor-pointer appearance-none border checked:bg-indigo-600 checked:border-indigo-600 relative"
                                            />
                                            {selectedIds.length > 0 && selectedIds.length === currentReceiptsSlice.length && <Check size={10} className="absolute text-white pointer-events-none" strokeWidth={4} />}
                                        </div>
                                    </th>
                                )}
                                <th className="px-6 py-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Actions</th>
                                {columns.filter(c => c.visible).map(col => (
                                    <th
                                        key={col.id}
                                        className={`px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer hover:bg-slate-100/50 transition-colors ${col.id === 'amount' ? 'text-right' : ''}`}
                                        onClick={() => handleSort(col.id as any)}
                                    >
                                        <div className={`flex items-center ${col.id === 'amount' ? 'justify-end' : ''}`}>
                                            {col.label}
                                            <Filter size={10} className={`ml-2 opacity-30 ${sortConfig.key === col.id ? 'opacity-100 text-indigo-500' : ''}`} />
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={columns.length + 2} className="px-6 py-20 text-center">
                                        <div className="flex flex-col items-center justify-center space-y-3">
                                            <div className="w-8 h-8 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Fetching receipts...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : currentReceiptsSlice.length === 0 ? (
                                <tr>
                                    <td colSpan={columns.length + 2} className="px-6 py-20 text-center">
                                        <p className="text-slate-400 font-medium">No receipts found.</p>
                                    </td>
                                </tr>
                            ) : currentReceiptsSlice.map((item) => (
                                <tr key={item.id} className={`group hover:bg-slate-50/80 transition-all duration-300 ${selectedIds.includes(item.id) ? 'bg-indigo-50/40' : ''}`}>
                                    {isSelectionMode && (
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex items-center justify-center">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedIds.includes(item.id)}
                                                    onChange={() => toggleSelect(item.id)}
                                                    className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-0 cursor-pointer appearance-none border checked:bg-indigo-600 checked:border-indigo-600 relative"
                                                />
                                                {selectedIds.includes(item.id) && <Check size={10} className="absolute text-white pointer-events-none" strokeWidth={4} />}
                                            </div>
                                        </td>
                                    )}
                                    <td className="px-4 py-4 text-center">
                                        <div className="flex items-center justify-center space-x-1 opacity-0 group-hover:opacity-100 transition-all">
                                            <button onClick={() => navigate(`/receipts/view/${item.id}`)} className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all"><Eye size={16} /></button>
                                            <button onClick={() => navigate(`/receipts/edit/${item.id}`)} className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all"><Edit size={16} /></button>
                                        </div>
                                    </td>
                                    {columns.filter(c => c.visible).map(col => {
                                        const val = (item as any)[col.id];
                                        if (col.id === 'amount') {
                                            return (
                                                <td key={col.id} className="px-6 py-4 text-right whitespace-nowrap">
                                                    <span className="text-[13px] font-black text-slate-900 tracking-tight">
                                                        <span className="text-[10px] text-slate-400 font-bold mr-1">{item.currency}</span>
                                                        {parseFloat(item.amount.toString()).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                    </span>
                                                </td>
                                            );
                                        }
                                        if (col.id === 'status') {
                                            return (
                                                <td key={col.id} className="px-6 py-4 text-center">
                                                    <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border bg-emerald-50 text-emerald-600 border-emerald-100">
                                                        {item.status}
                                                    </span>
                                                </td>
                                            );
                                        }
                                        return (
                                            <td key={col.id} className="px-6 py-4">
                                                <span className={`text-[12px] font-semibold ${col.id === 'paidByContact' ? 'text-slate-900 uppercase tracking-tight' : 'text-slate-500'}`}>
                                                    {val || '—'}
                                                </span>
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                        <tfoot className="bg-slate-50/50 border-t-2 border-slate-100 transition-all">
                            <tr>
                                {isSelectionMode && <td className="px-6 py-4"></td>}
                                <td className="px-6 py-4 text-center font-black text-[10px] text-slate-400 uppercase tracking-widest italic">Grand Totals:</td>
                                {columns.filter(c => c.visible).map(col => {
                                    if (col.id === 'amount') {
                                        return (
                                            <td key={col.id} className="px-6 py-4 text-right whitespace-nowrap border-l border-slate-200/20">
                                                <div className="flex flex-col items-end">
                                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-tight mb-0.5">Total Amount</span>
                                                    <span className="text-[15px] font-black text-slate-900 tracking-tighter underline decoration-slate-200 decoration-2 underline-offset-4">
                                                        <span className="text-[10px] text-slate-400 font-bold mr-1">ZMW</span>
                                                        {totalFilteredAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                    </span>
                                                </div>
                                            </td>
                                        );
                                    }
                                    return <td key={col.id} className="px-6 py-4"></td>;
                                })}
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>

            {/* Management Card - Refactored like Sales Order Footer */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 bg-white p-6 rounded-[24px] border border-slate-200 shadow-sm mt-4 ml-0 mr-auto max-w-[1240px]">
                <div className="flex flex-col items-center space-y-3">
                    <div className="flex items-center space-x-2 text-[12px] text-slate-500 font-medium whitespace-nowrap">
                        <button
                            onClick={() => { setCurrentPage(1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                            disabled={currentPage === 1}
                            className="p-1 rounded-md hover:bg-slate-100 disabled:opacity-30 transition-all active:scale-90"
                        >
                            <ChevronsLeft size={18} />
                        </button>
                        <button
                            onClick={() => { setCurrentPage(prev => Math.max(1, prev - 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                            disabled={currentPage === 1}
                            className="p-1 rounded-md hover:bg-slate-100 disabled:opacity-30 transition-all active:scale-90"
                        >
                            <ChevronLeft size={18} />
                        </button>
                        <span className="mx-4 text-slate-700 font-bold text-[13px] tracking-tight">Page {currentPage} of {totalPages || 1}</span>
                        <button
                            onClick={() => { setCurrentPage(prev => Math.min(totalPages, prev + 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                            disabled={currentPage === totalPages || totalPages === 0}
                            className="p-1 rounded-md hover:bg-slate-100 disabled:opacity-30 transition-all active:scale-90"
                        >
                            <ChevronRight size={18} />
                        </button>
                        <button
                            onClick={() => { setCurrentPage(totalPages); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                            disabled={currentPage === totalPages || totalPages === 0}
                            className="p-1 rounded-md hover:bg-slate-100 disabled:opacity-30 transition-all active:scale-90"
                        >
                            <ChevronsRight size={18} />
                        </button>
                    </div>

                    <div className="flex items-center space-x-6">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Lines per page:</span>
                        <div className="flex items-center gap-4">
                            {[50, 100, 250, 500].map(size => (
                                <button
                                    key={size}
                                    onClick={() => { setPageSize(size); setCurrentPage(1); }}
                                    className={cn(
                                        "text-[10px] font-black transition-all",
                                        pageSize === size ? "text-indigo-600 underline underline-offset-4 decoration-2" : "text-slate-400 hover:text-slate-600"
                                    )}
                                >
                                    {size}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4 relative">
                    {copiedNotification && (
                        <div className="absolute top-0 right-0 -translate-y-full mb-4 bg-slate-900 text-white text-[10px] px-5 py-2.5 rounded-full font-black uppercase tracking-[0.2em] shadow-2xl animate-in slide-in-from-bottom-2 duration-300 z-50">
                            Snapshot Copied
                        </div>
                    )}
                    
                    <button 
                        onClick={() => handleCopyToClipboard(filteredReceipts)} 
                        className="px-5 py-3 bg-slate-50 text-[11px] font-black text-slate-500 rounded-2xl hover:bg-indigo-50 hover:text-indigo-600 transition-all border border-slate-200/50 uppercase tracking-widest flex items-center gap-2 shadow-sm"
                    >
                        <Copy size={14} /> Export Data
                    </button>

                    <div className="relative" ref={batchOpsRef}>
                        <button
                            onClick={() => setIsBatchOpsOpen(!isBatchOpsOpen)}
                            className="group px-6 py-3 bg-indigo-600 text-[11px] font-black text-white rounded-[20px] hover:bg-indigo-700 transition-all uppercase tracking-[0.2em] flex items-center shadow-xl shadow-indigo-100"
                        >
                            Management {isBatchOpsOpen ? <ChevronDown size={14} className="ml-3" /> : <ChevronUp size={14} className="ml-3" />}
                        </button>

                        {isBatchOpsOpen && (
                            <div className="absolute bottom-full right-0 mb-3 w-64 bg-white border border-slate-100 shadow-2xl rounded-[24px] py-2 z-[100] animate-in slide-in-from-bottom-4 duration-500 overflow-hidden text-left ring-8 ring-slate-50/50">
                                <button
                                    onClick={() => { /* Column Settings Logic */ setIsBatchOpsOpen(false); }}
                                    className="w-full text-left px-6 py-3 text-[12px] font-bold text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-3"
                                >
                                    <Settings size={14} className="text-slate-400" /> Column Settings
                                </button>
                                <button
                                    onClick={() => {
                                        setIsSelectionMode(!isSelectionMode);
                                        setIsBatchOpsOpen(false);
                                        if (!isSelectionMode) {
                                            window.scrollTo({ top: 0, behavior: 'smooth' });
                                        }
                                    }}
                                    className="w-full text-left px-6 py-3 text-[12px] font-bold text-slate-700 hover:bg-slate-50 transition-colors border-t border-slate-50 flex items-center gap-3"
                                >
                                    <Layout size={14} className="text-teal-500" /> {isSelectionMode ? 'Disable Batch Mode' : 'Enable Batch Actions'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

        </div>
    );
};

export default ReceiptsView;
