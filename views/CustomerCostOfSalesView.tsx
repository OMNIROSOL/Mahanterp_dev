import React, { useMemo, useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ChevronRight, LayoutGrid, HelpCircle, Search, FileText, ArrowLeft } from 'lucide-react';
import apiService from '../services/apiService';
import { Customer, SalesInvoice, InventoryItem } from '../types';

const CustomerCostOfSalesView = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [customer, setCustomer] = useState<Customer | null>(null);
    const [invoices, setInvoices] = useState<SalesInvoice[]>([]);
    const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        const fetchData = async () => {
            if (!id) return;
            setIsLoading(true);
            try {
                const [custData, invList, items] = await Promise.all([
                    apiService.getCustomer(id),
                    apiService.getInvoices(),
                    apiService.getItems()
                ]);
                setCustomer(custData);
                setInvoices(invList.filter((inv: any) => inv.customerName === custData.name || inv.customerId === id));
                setInventoryItems(items);
            } catch (err) {
                console.error('Failed to fetch customer COGS data:', err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [id]);

    const costOfSalesData = useMemo(() => {
        if (!customer) return [];
        
        const lines: any[] = [];
        invoices.forEach(inv => {
            if (inv.items) {
                inv.items.forEach(item => {
                    const inventoryItem = inventoryItems.find(ii => ii.itemName === item.item || ii.itemCode === item.item);
                    const purchasePrice = inventoryItem ? (inventoryItem.avgCost || 0) : 0;
                    const qty = parseFloat(item.qty as any) || 0;
                    const totalCost = qty * purchasePrice;
                    
                    lines.push({
                        id: `${inv.id}-${item.id || Math.random()}`,
                        date: inv.issueDate,
                        reference: inv.reference,
                        item: item.item,
                        description: item.description,
                        qty: qty,
                        purchasePrice: purchasePrice,
                        totalCost: totalCost,
                        currency: inv.currency || 'ZMW'
                    });
                });
            }
        });
        
        return lines.sort((a, b) => {
            const dateA = (a.date || '').split('.').reverse().join('-');
            const dateB = (b.date || '').split('.').reverse().join('-');
            return dateB.localeCompare(dateA);
        });
    }, [customer, invoices, inventoryItems]);

    const filteredData = useMemo(() => {
        const query = searchQuery.toLowerCase();
        return costOfSalesData.filter(line => 
            line.item.toLowerCase().includes(query) ||
            line.reference.toLowerCase().includes(query) ||
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

    if (!customer) {
        return (
            <div className="p-8">
                <div className="bg-red-50 text-red-600 p-4 rounded-xl font-bold">
                    Customer not found.
                </div>
                <button onClick={() => navigate('/customers')} className="mt-4 text-blue-600 font-bold hover:underline">
                    Back to Customers
                </button>
            </div>
        );
    }

    return (
        <div className="p-0 bg-slate-50 min-h-screen">
            {/* Breadcrumb Area */}
            <div className="bg-white border-b border-slate-200 px-8 py-3 flex items-center space-x-2 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                <LayoutGrid size={12} />
                <ChevronRight size={10} className="opacity-30" />
                <Link to="/customers" className="hover:text-blue-600 transition-colors">Customers</Link>
                <ChevronRight size={10} className="opacity-30" />
                <span className="text-slate-600">{customer.name}</span>
                <ChevronRight size={10} className="opacity-30" />
                <span className="text-slate-400">Cost of Sales</span>
            </div>

            <div className="p-8 space-y-6">
                {/* Header Area */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center space-x-4">
                        <button 
                            onClick={() => navigate(-1)}
                            className="p-2 bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-blue-600 hover:border-blue-100 transition-all"
                        >
                            <ArrowLeft size={16} />
                        </button>
                        <div className="flex items-center space-x-2 text-slate-400">
                            <span className="text-sm font-bold">Customer — Cost of Sales</span>
                            <HelpCircle size={14} className="opacity-50" />
                        </div>
                    </div>

                    <div className="flex items-center space-x-2">
                        <div className="relative group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 transition-colors group-focus-within:text-blue-500" size={14} />
                            <input
                                type="text"
                                placeholder="Search by item or reference..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10 pr-4 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 w-64 bg-white shadow-sm"
                            />
                        </div>
                    </div>
                </div>

                {/* Info Card */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                            <FileText size={24} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-900 leading-tight">{customer.name}</h2>
                            <p className="text-slate-500 text-xs font-medium uppercase tracking-wider">{customer.code}</p>
                        </div>
                    </div>
                    <div className="flex flex-col items-end">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Cost of Sales</span>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-tight">ZMW</span>
                            <span className="text-2xl font-black text-slate-900 tracking-tight">
                                {grandTotalCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Table Area */}
                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-[0.1em]">
                                    <th className="px-6 py-4 border-r border-slate-200">Date</th>
                                    <th className="px-6 py-4 border-r border-slate-200">Reference</th>
                                    <th className="px-6 py-4 border-r border-slate-200">Item Name</th>
                                    <th className="px-6 py-4 border-r border-slate-200 text-right">Qty</th>
                                    <th className="px-6 py-4 border-r border-slate-200 text-right">Avg Cost</th>
                                    <th className="px-6 py-4 text-right">Total Cost</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-slate-700">
                                {filteredData.length > 0 ? (
                                    filteredData.map((line) => (
                                        <tr key={line.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-4 border-r border-slate-100 whitespace-nowrap font-medium text-slate-600">{line.date}</td>
                                            <td className="px-6 py-4 border-r border-slate-100 font-bold text-slate-900">{line.reference || '—'}</td>
                                            <td className="px-6 py-4 border-r border-slate-100">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-slate-900">{line.item}</span>
                                                    {line.description && <span className="text-[10px] text-slate-400 truncate max-w-[300px]">{line.description}</span>}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 border-r border-slate-100 text-right tabular-nums font-bold text-slate-900">{line.qty.toLocaleString()}</td>
                                            <td className="px-6 py-4 border-r border-slate-100 text-right tabular-nums text-slate-500 font-medium">{line.purchasePrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                            <td className="px-6 py-4 text-right tabular-nums font-black text-slate-900 bg-slate-50/30">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <span className="text-[9px] font-black text-slate-300">ZMW</span>
                                                    <span className="text-[13px]">{line.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic font-medium">
                                            No cost of sales record found for this customer.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                            {filteredData.length > 0 && (
                                <tfoot className="bg-slate-50/80 font-bold border-t border-slate-200">
                                    <tr>
                                        <td colSpan={5} className="px-6 py-4 text-right text-[11px] font-black text-slate-400 uppercase tracking-widest">Grand Total Cost:</td>
                                        <td className="px-6 py-4 text-right text-slate-900 text-lg tracking-tight font-black tabular-nums underline decoration-slate-200 decoration-2 underline-offset-4 pointer-events-none">
                                            {grandTotalCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </td>
                                    </tr>
                                </tfoot>
                            )}
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CustomerCostOfSalesView;
