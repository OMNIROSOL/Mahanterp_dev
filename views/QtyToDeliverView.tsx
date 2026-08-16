import React, { useMemo, useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ChevronRight, LayoutGrid, HelpCircle, X } from 'lucide-react';
import apiService from '../services/apiService';
import { Customer } from '../types';
import { cn } from '../utils/cn';

const QtyToDeliverView = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [customer, setCustomer] = useState<Customer | null>(null);
    const [deliveryItems, setDeliveryItems] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            if (!id) return;
            setIsLoading(true);
            try {
                const [custData, deliveryNotes] = await Promise.all([
                    apiService.getCustomer(id),
                    apiService.getDeliveryNotes()
                ]);
                setCustomer(custData);
                
                const itemMap = new Map();
                deliveryNotes
                    .filter((dn: any) => 
                        (dn.customerId === custData.id || (dn.customerName || dn.customer?.name) === custData.name) && 
                        (dn.status || 'Pending') !== 'Delivered'
                    )
                    .forEach((dn: any) => {
                        dn.items?.forEach((it: any) => {
                            const itemName = it.item?.itemName || it.itemName || it.item;
                            if (!itemName) return;
                            const current = itemMap.get(itemName) || 0;
                            itemMap.set(itemName, current + (it.qty || 0));
                        });
                    });
                
                const aggregated = Array.from(itemMap.entries()).map(([item, qty]) => ({ item, qty }));
                setDeliveryItems(aggregated);
            } catch (err) {
                console.error('Failed to fetch delivery details:', err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [id]);

    const filteredItems = useMemo(() => {
        return deliveryItems.filter(i =>
            i.item.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [deliveryItems, searchQuery]);

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-40 space-y-4 font-sans">
                <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-600 rounded-full animate-spin"></div>
                <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Loading delivery details...</p>
            </div>
        );
    }

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedIds(filteredItems.map(i => i.item));
        } else {
            setSelectedIds([]);
        }
    };

    const toggleId = (id: string) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

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
            </div>

            <div className="p-8 space-y-6">
                {/* Header Area */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center space-x-2">
                        <h1 className="text-sm font-bold text-slate-500 uppercase tracking-tight">Customers — Qty to deliver</h1>
                        <HelpCircle size={14} className="text-slate-300" />
                    </div>

                    <div className="flex items-center space-x-3">
                        <div className="flex bg-slate-100/50 p-1 rounded-lg border border-slate-200 shadow-inner">
                            <button
                                onClick={() => {
                                    if (selectedIds.length === 0) {
                                        alert('Please select at least one item to deliver.');
                                        return;
                                    }
                                    navigate(`/delivery-notes/new?customerId=${customer.id}&itemIds=${selectedIds.join(',')}`);
                                }}
                                className={cn(
                                    "px-4 py-1.5 rounded-md text-[11px] font-black uppercase tracking-widest transition-all flex items-center gap-2 shadow-sm",
                                    selectedIds.length > 0 
                                        ? "bg-indigo-600 text-white hover:bg-indigo-700" 
                                        : "bg-slate-200 text-slate-400 cursor-not-allowed"
                                )}
                            >
                                <LayoutGrid size={12} /> New Delivery Note ({selectedIds.length})
                            </button>
                        </div>
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Search"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-3 pr-10 py-1.5 border border-slate-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 w-64"
                            />
                        </div>
                        <button className="bg-white border border-slate-200 px-4 py-1.5 rounded text-sm font-bold text-slate-700 hover:bg-slate-50">
                            Search
                        </button>
                    </div>
                </div>

                {/* Filter Tag Area */}
                <div className="flex">
                    <div className="flex items-center bg-orange-50 border border-orange-100 rounded overflow-hidden">
                        <span className="px-3 py-1.5 text-[12px] font-bold text-orange-800 bg-orange-100/50">Customer</span>
                        <span className="px-4 py-1.5 text-[12px] font-bold text-slate-700 bg-white border-x border-orange-100">{customer.name}</span>
                        <button
                            onClick={() => navigate('/customers')}
                            className="px-3 py-1.5 text-orange-800 hover:bg-orange-100 transition-colors flex items-center"
                        >
                            <X size={14} />
                        </button>
                    </div>
                </div>

                {/* Table Area */}
                <div className="bg-white border border-slate-200 rounded shadow-sm w-full overflow-hidden mb-8">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200">
                                <th className="px-4 py-3 w-10">
                                    <input 
                                        type="checkbox" 
                                        className="rounded border-slate-300"
                                        checked={filteredItems.length > 0 && selectedIds.length === filteredItems.length}
                                        onChange={(e) => handleSelectAll(e.target.checked)}
                                    />
                                </th>
                                <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-r border-slate-200 whitespace-nowrap">Customer</th>
                                <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-r border-slate-200 whitespace-nowrap">Inventory Item</th>
                                <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-right whitespace-nowrap">Qty to deliver</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredItems.map((item) => (
                                <tr key={item.item} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-4 py-3">
                                        <input 
                                            type="checkbox" 
                                            className="rounded border-slate-300" 
                                            checked={selectedIds.includes(item.item)}
                                            onChange={() => toggleId(item.item)}
                                        />
                                    </td>
                                    <td className="px-4 py-3 text-[13px] font-medium text-slate-700 border-r border-slate-100">{customer.name}</td>
                                    <td className="px-4 py-3 text-[13px] font-medium text-blue-600 border-r border-slate-100">
                                        <Link to={`/customers/qty-to-deliver/${customer.id}/transactions?item=${encodeURIComponent(item.item)}`} className="hover:underline">
                                            {item.item}
                                        </Link>
                                    </td>
                                    <td className="px-4 py-3 text-[13px] font-medium text-blue-600 text-right">
                                        <Link to={`/customers/qty-to-deliver/${customer.id}/transactions?item=${encodeURIComponent(item.item)}`} className="hover:underline">
                                            {item.qty === 0 ? '0' : item.qty.toLocaleString(undefined, { minimumFractionDigits: item.qty % 1 !== 0 ? 1 : 0 })}
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot className="bg-slate-50/80 border-t-2 border-slate-200">
                            <tr>
                                <td colSpan={3} className="px-4 py-3 text-[11px] font-black text-slate-500 uppercase tracking-wider text-right">Total</td>
                                <td className="px-4 py-3 text-[13px] font-black text-slate-900 text-right">
                                    {filteredItems.reduce((sum, item) => sum + (item.qty || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 0 })}
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default QtyToDeliverView;
