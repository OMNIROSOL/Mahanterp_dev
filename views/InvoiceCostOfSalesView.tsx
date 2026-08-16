import React, { useMemo, useState, useRef, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ChevronRight, FileText, ArrowLeft, HelpCircle, Search, LayoutGrid, X, Check, Printer, Copy, MoreHorizontal, ChevronDown, ChevronUp, ChevronsLeft, ChevronsRight, Eye, Edit, Trash2 } from 'lucide-react';
import apiService from '../services/apiService';
import { SalesInvoice, InventoryItem } from '../types';
import { cn } from '../utils/cn';
import Badge from '../components/shared/Badge';

const InvoiceCostOfSalesView = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [invoice, setInvoice] = useState<SalesInvoice | null>(null);
    const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [isBatchOpsOpen, setIsBatchOpsOpen] = useState(false);
    const [showEditColumns, setShowEditColumns] = useState(false);
    const batchOpsRef = useRef<HTMLDivElement>(null);

    // Default visibility settings
    const defaultVisibility = {
        '#': true,
        'Inventory Item': true,
        'Sold Qty': true,
        'Unit Price': true,
        'Line Cost': true
    };

    const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(() => {
        const saved = localStorage.getItem('invoice_cogs_column_visibility_settings');
        return saved ? JSON.parse(saved) : defaultVisibility;
    });

    const toggleColumnVisibility = (id: string) => {
        setVisibleColumns(prev => {
            const next = { ...prev, [id]: !prev[id] };
            localStorage.setItem('invoice_cogs_column_visibility_settings', JSON.stringify(next));
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

    useEffect(() => {
        const fetchData = async () => {
            if (!id) return;
            setIsLoading(true);
            try {
                const [invData, items] = await Promise.all([
                    apiService.getInvoice(id),
                    apiService.getItems()
                ]);
                setInvoice(invData);
                setInventoryItems(items);
            } catch (err) {
                console.error('Failed to fetch invoice COGS data:', err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [id]);

    const costOfSalesData = useMemo(() => {
        if (!invoice || !invoice.items) return [];

        return invoice.items.map(item => {
            const inventoryItem = inventoryItems.find(ii => 
                ii.itemName === item.item || ii.itemCode === item.item
            );
            const purchasePrice = inventoryItem ? (inventoryItem.avgCost || 0) : 0;
            const qty = parseFloat(item.qty as any) || 0;
            const totalCost = qty * purchasePrice;

            return {
                id: item.id || Math.random().toString(),
                item: item.item,
                description: item.description,
                qty: qty,
                purchasePrice: purchasePrice,
                totalCost: totalCost,
                inventoryItemId: inventoryItem?.id
            };
        });
    }, [invoice, inventoryItems]);

    const filteredData = useMemo(() => {
        const query = searchQuery.toLowerCase();
        return costOfSalesData.filter(line =>
            line.item.toLowerCase().includes(query) ||
            (line.description && line.description.toLowerCase().includes(query))
        );
    }, [costOfSalesData, searchQuery]);

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-40 space-y-4 font-sans">
                <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-600 rounded-full animate-spin"></div>
                <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Loading COGS data...</p>
            </div>
        );
    }

    const grandTotalCost = useMemo(() => {
        return filteredData.reduce((sum, line) => sum + line.totalCost, 0);
    }, [filteredData]);

    const handleBatchCopy = () => {
        const selectedItems = filteredData.filter(line => selectedIds.includes(line.id.toString()));
        const header = `Item\tQty\tUnit Price\tTotal Cost`;
        const rows = selectedItems.map(item =>
            `${item.item}\t${item.qty}\t${item.purchasePrice}\t${item.totalCost}`
        ).join('\n');
        const fullText = `${header}\n${rows}`;
        navigator.clipboard.writeText(fullText).then(() => alert('Copied to clipboard'));
    };

    if (!invoice) {
        return (
            <div className="p-8">
                <div className="bg-red-50 text-red-600 p-4 rounded-xl font-bold">
                    Invoice not found.
                </div>
                <button onClick={() => navigate('/sales-invoices')} className="mt-4 text-blue-600 font-bold hover:underline">
                    Back to Sales Invoices
                </button>
            </div>
        );
    }

    return (
        <div className="p-0 bg-slate-50 min-h-screen print:bg-white">
            {/* Breadcrumb Area */}
            <div className="bg-white border-b border-slate-200 px-8 py-3 flex items-center space-x-2 text-[11px] font-bold text-slate-400 uppercase tracking-widest no-print">
                <LayoutGrid size={12} />
                <ChevronRight size={10} className="opacity-30" />
                <Link to="/sales-invoices" className="hover:text-blue-600 transition-colors">Sales Invoices</Link>
                <ChevronRight size={10} className="opacity-30" />
                <span className="text-slate-600">{invoice.reference || invoice.id}</span>
            </div>

            <div className="p-8 space-y-6 print:p-0">
                {/* Header Area */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 no-print">
                    <div className="flex items-center space-x-2">
                        <h1 className="text-sm font-bold text-slate-500 uppercase tracking-tight">Sales Invoice — Cost of Goods Sold</h1>
                        <HelpCircle size={14} className="text-slate-300" />
                    </div>

                    <div className="flex items-center space-x-3">
                        <div className="relative group">
                            <input
                                type="text"
                                placeholder="Search"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-3 pr-10 py-1.5 border border-slate-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 w-64 bg-white"
                            />
                        </div>
                        <button className="bg-white border border-slate-200 px-4 py-1.5 rounded text-sm font-bold text-slate-700 hover:bg-slate-50">
                            Search
                        </button>
                    </div>
                </div>

                {/* Print Only Header */}
                <div className="hidden print:block mb-8">
                    <h1 className="text-2xl font-bold text-slate-900 uppercase">Cost of Sales Breakdown</h1>
                    <p className="text-slate-500 font-bold mb-4">Invoice: {invoice.reference} — {invoice.issueDate}</p>
                    <div className="w-full h-1 bg-slate-900 rounded-full"></div>
                </div>

                {/* Filter Tag Area */}
                <div className="flex no-print">
                    <div className="flex items-center bg-orange-50 border border-orange-100 rounded overflow-hidden shadow-sm">
                        <span className="px-3 py-1.5 text-[12px] font-bold text-orange-800 bg-orange-100/50">Sales Invoice</span>
                        <span className="px-4 py-1.5 text-[12px] font-bold text-slate-700 bg-white border-x border-orange-100">
                            {invoice.reference} — {invoice.issueDate}
                        </span>
                        <button
                            onClick={() => navigate('/sales-invoices')}
                            className="px-3 py-1.5 text-orange-800 hover:bg-orange-100 transition-colors flex items-center"
                        >
                            <X size={14} />
                        </button>
                    </div>
                </div>

                {/* Batch Action Bar */}
                {isSelectionMode && (
                    <div className="bg-indigo-600 px-8 py-4 rounded-[24px] flex items-center justify-between shadow-xl shadow-indigo-200/50 animate-in slide-in-from-top-4 duration-500 border border-white/10 backdrop-blur-md mb-8 no-print">
                        <div className="flex items-center space-x-8">
                            <div className="flex flex-col">
                                <span className="text-white font-black text-[14px] leading-tight tracking-tight">{selectedIds.length}</span>
                                <span className="text-indigo-200 font-bold text-[9px] uppercase tracking-widest whitespace-nowrap">Selected</span>
                            </div>
                            <div className="h-8 w-px bg-white/20"></div>
                            <div className="flex items-center space-x-4">
                                <button
                                    onClick={() => navigate(`/sales-invoices/print-batch?ids=${selectedIds.join(',')}&reportType=cogs&invoiceId=${id}`)}
                                    disabled={selectedIds.length === 0}
                                    className="text-white/90 hover:text-white flex items-center space-x-2 text-[11px] font-black uppercase tracking-widest transition-all disabled:opacity-40"
                                >
                                    <Printer size={14} /> <span>Print Selected</span>
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
                        <button
                            onClick={() => { setIsSelectionMode(false); setSelectedIds([]); }}
                            className="bg-white text-indigo-600 px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-white shadow-lg transition-all border border-transparent active:scale-95"
                        >
                            Reset Mode
                        </button>
                    </div>
                )}


                {/* Table Area */}
                <div className="bg-white border border-slate-200 rounded shadow-sm overflow-hidden mb-8 print:border-none print:shadow-none">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[11px] tracking-wider">
                                    {isSelectionMode && (
                                        <th className="px-4 py-3 w-10 text-center border-r border-slate-200 no-print">
                                            <div className="flex items-center justify-center relative shadow-sm">
                                                <input 
                                                    type="checkbox" 
                                                    className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-0 cursor-pointer appearance-none border checked:bg-indigo-600 checked:border-indigo-600"
                                                    checked={filteredData.length > 0 && selectedIds.length === filteredData.length}
                                                    onChange={(e) => {
                                                        if (e.target.checked) setSelectedIds(filteredData.map(l => l.id.toString()));
                                                        else setSelectedIds([]);
                                                    }}
                                                />
                                                {(filteredData.length > 0 && selectedIds.length === filteredData.length) && <Check size={10} className="absolute inset-0 m-auto text-white pointer-events-none" strokeWidth={4} />}
                                            </div>
                                        </th>
                                    )}
                                    {visibleColumns['#'] && <th className="px-4 py-3 border-r border-slate-200 whitespace-nowrap text-center w-12">#</th>}
                                    {visibleColumns['Inventory Item'] && <th className="px-4 py-3 border-r border-slate-200">Inventory Item</th>}
                                    {visibleColumns['Sold Qty'] && <th className="px-4 py-3 border-r border-slate-200 text-right">Sold Qty</th>}
                                    {visibleColumns['Unit Price'] && <th className="px-4 py-3 border-r border-slate-200 text-right">Unit Price</th>}
                                    {visibleColumns['Line Cost'] && <th className="px-4 py-3 text-right">Line Cost</th>}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-slate-700 font-medium text-[13px]">
                                {filteredData.length > 0 ? (
                                    filteredData.map((line, idx) => (
                                        <tr key={line.id} className={cn("hover:bg-slate-50/50 transition-colors group", isSelectionMode && !selectedIds.includes(line.id.toString()) ? "print:hidden" : "")}>
                                            {isSelectionMode && (
                                                <td className="px-4 py-3 border-r border-slate-100 text-center no-print">
                                                    <div className="flex items-center justify-center relative">
                                                        <input 
                                                            type="checkbox" 
                                                            className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-0 cursor-pointer appearance-none border checked:bg-indigo-600 checked:border-indigo-600"
                                                            checked={selectedIds.includes(line.id.toString())}
                                                            onChange={() => {
                                                                setSelectedIds(prev => prev.includes(line.id.toString()) ? prev.filter(id => id !== line.id.toString()) : [...prev, line.id.toString()]);
                                                            }}
                                                        />
                                                        {selectedIds.includes(line.id.toString()) && <Check size={10} className="absolute inset-0 m-auto text-white pointer-events-none" strokeWidth={4} />}
                                                    </div>
                                                </td>
                                            )}
                                            {visibleColumns['#'] && <td className="px-4 py-3 border-r border-slate-100 text-center text-slate-400 font-normal">{idx + 1}</td>}
                                            {visibleColumns['Inventory Item'] && (
                                                <td className="px-4 py-3 border-r border-slate-100">
                                                    <div className="flex flex-col font-medium text-slate-900">
                                                        <span className="font-bold">{line.item}</span>
                                                        {line.description && <span className="text-[10px] text-slate-400 font-medium truncate max-w-[400px]">{line.description}</span>}
                                                    </div>
                                                </td>
                                            )}
                                            {visibleColumns['Sold Qty'] && <td className="px-4 py-3 border-r border-slate-100 text-right tabular-nums font-bold text-slate-900">{line.qty.toLocaleString()}</td>}
                                            {visibleColumns['Unit Price'] && (
                                                <td className="px-4 py-3 border-r border-slate-100 text-right tabular-nums font-medium text-slate-500">
                                                    {line.inventoryItemId ? (
                                                        <Link 
                                                            to={`/inventory-items/edit/${line.inventoryItemId}`}
                                                            className="text-blue-600 font-bold hover:underline transition-all"
                                                        >
                                                            {line.purchasePrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                        </Link>
                                                    ) : (
                                                        <span>{line.purchasePrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                                    )}
                                                </td>
                                            )}
                                            {visibleColumns['Line Cost'] && (
                                                <td className="px-4 py-3 text-right tabular-nums font-black text-slate-900 group-hover:bg-slate-50/30 transition-all print:font-bold">
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        <span className="text-[9px] font-black text-slate-400 print:font-bold">ZMW</span>
                                                        <span>{line.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                                    </div>
                                                </td>
                                            )}
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-16 text-center text-slate-400 italic">
                                            No cost data available for this search query.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                            <tfoot className="bg-slate-50/80 font-bold border-t-2 border-slate-200 text-slate-900 print:bg-white">
                                <tr>
                                    <td colSpan={isSelectionMode ? (Object.values(visibleColumns).filter(v => v).length - (isSelectionMode ? 0 : 0)) : (Object.values(visibleColumns).filter(v => v).length - 1)} className="px-4 py-4 text-right text-[11px] font-black text-slate-400 uppercase tracking-widest bg-slate-50/50 print:bg-white print:text-gray-900">Grand Total (COGS)</td>
                                    {visibleColumns['Line Cost'] && (
                                        <td className="px-4 py-4 text-right text-lg font-black tabular-nums bg-slate-50/50">
                                            {grandTotalCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </td>
                                    )}
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>

                {/* Management Bar */}
                <div className="flex flex-col md:flex-row items-center justify-between gap-6 bg-white p-6 rounded-[24px] border border-slate-200 shadow-sm mt-4 ml-0 mr-auto w-full no-print">
                    <div className="flex items-center gap-4 border-l border-slate-100 pl-4">
                        <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Total Records</span>
                            <span className="text-xl font-bold text-slate-900 leading-none">{filteredData.length}</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => alert('Exporting...')}
                            className="px-4 py-2 bg-slate-50 text-[11px] font-black text-slate-500 rounded-xl hover:bg-indigo-50 hover:text-indigo-600 transition-all border border-slate-200/50 uppercase tracking-widest flex items-center gap-2 shadow-sm"
                        >
                            <Copy size={12} /> Export CSV
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
                                        onClick={() => { setShowEditColumns(true); setIsBatchOpsOpen(false); }}
                                        className="w-full text-left px-4 py-2 text-[12px] font-medium text-gray-700 hover:bg-gray-100 transition-colors"
                                    >
                                        Column Settings
                                    </button>
                                    <button
                                        onClick={() => {
                                            if (!isSelectionMode) window.scrollTo({ top: 0, behavior: 'smooth' });
                                            setIsSelectionMode(!isSelectionMode);
                                            setIsBatchOpsOpen(false);
                                        }}
                                        className="w-full text-left px-4 py-2 text-[12px] font-medium text-gray-700 hover:bg-gray-100 transition-colors border-t border-gray-100"
                                    >
                                        {isSelectionMode ? 'Disable Batch Mode' : 'Enable Batch Actions'}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Column Settings Modal */}
                {showEditColumns && (
                    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
                        <div className="bg-white rounded-xl border border-gray-200 shadow-2xl w-full max-w-[480px] overflow-hidden">
                            <div className="p-8 pb-4">
                                <h2 className="text-xl font-bold text-slate-800 uppercase tracking-tight mb-6 pb-4 border-b border-gray-100">Edit Table Columns</h2>
                                <div className="max-h-[400px] overflow-y-auto space-y-3 mb-8 custom-scrollbar">
                                    {Object.keys(defaultVisibility).map((id) => (
                                        <div
                                            key={id}
                                            className="flex items-center space-x-4 py-1 cursor-pointer group"
                                            onClick={() => toggleColumnVisibility(id)}
                                        >
                                            <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${visibleColumns[id] ? 'bg-blue-600 border-blue-600 shadow-sm' : 'bg-white border-gray-300 group-hover:border-blue-400'}`}>
                                                {visibleColumns[id] && <Check size={14} className="text-white" strokeWidth={4} />}
                                            </div>
                                            <span className={`text-[15px] transition-colors ${visibleColumns[id] ? 'text-slate-900 font-medium' : 'text-slate-500'}`}>
                                                {id}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex justify-end pt-4 border-t border-gray-100 gap-3">
                                    <button onClick={() => setShowEditColumns(false)} className="bg-blue-600 text-white px-8 py-2 rounded-md font-bold hover:bg-blue-700 transition-all shadow-md">Apply Selection</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default InvoiceCostOfSalesView;
