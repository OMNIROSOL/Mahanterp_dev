import React, { useMemo, useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Eye, Edit, ChevronRight, LayoutGrid, HelpCircle, Receipt, Search } from 'lucide-react';
import apiService from '../services/apiService';
import { Customer } from '../types';

const CustomerTransactionsView = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [customer, setCustomer] = useState<Customer | null>(null);
    const [transactions, setTransactions] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        const fetchData = async () => {
            if (!id) return;
            setIsLoading(true);
            try {
                const cData = await apiService.getCustomer(id);
                setCustomer(cData);
                const tData = await apiService.getCustomerTransactions(id);
                setTransactions(tData);
            } catch (err) {
                console.error('Failed to fetch customer transactions:', err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();

        window.addEventListener('invoices_updated', fetchData);
        window.addEventListener('receipts_updated', fetchData);
        window.addEventListener('credit_notes_updated', fetchData);
        return () => {
            window.removeEventListener('invoices_updated', fetchData);
            window.removeEventListener('receipts_updated', fetchData);
            window.removeEventListener('credit_notes_updated', fetchData);
        };
    }, [id]);

    const filteredTransactions = useMemo(() => {
        return transactions.filter(t =>
            t.transaction.toLowerCase().includes(searchQuery.toLowerCase()) ||
            t.description.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [transactions, searchQuery]);

    if (isLoading) {
        return (
            <div className="p-20 flex flex-col items-center justify-center space-y-4">
                <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-600 rounded-full animate-spin"></div>
                <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Fetching transaction history...</p>
            </div>
        );
    }

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
                    <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2 text-slate-400">
                            <span className="text-sm font-bold">Customer — Transactions</span>
                            <HelpCircle size={14} className="opacity-50" />
                        </div>

                    </div>

                    <div className="flex items-center space-x-2">
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Search"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-3 pr-10 py-1.5 border border-slate-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 w-64"
                            />
                        </div>
                        <Search size={16} className="absolute right-12 top-1/2 -translate-y-1/2 text-slate-300" />
                        <button className="bg-white border border-slate-200 px-4 py-1.5 rounded text-sm font-bold text-slate-700 hover:bg-slate-50">
                            Search
                        </button>
                    </div>
                </div>

                {/* Table Area */}
                <div className="bg-white border border-slate-200 rounded shadow-sm w-fit min-w-full text-[13px] mb-8">
                    <table className="w-full text-left border-collapse min-w-[1500px]">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[11px] tracking-wider">
                                <th className="px-4 py-3 border-r border-slate-200 text-center whitespace-nowrap">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Actions</span>
                                </th>
                                <th className="px-4 py-3 border-r border-slate-200 whitespace-nowrap">Date</th>
                                <th className="px-4 py-3 border-r border-slate-200 whitespace-nowrap">Transaction</th>
                                <th className="px-4 py-3 border-r border-slate-200 whitespace-nowrap">Customer</th>
                                <th className="px-4 py-3 border-r border-slate-200 whitespace-nowrap">Bank or Cash Account</th>
                                <th className="px-4 py-3 border-r border-slate-200 whitespace-nowrap">Description</th>
                                <th className="px-4 py-3 text-right border-r border-slate-200 whitespace-nowrap">Amount</th>
                                <th className="px-4 py-3 text-right whitespace-nowrap">Balance</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700">
                            {filteredTransactions.map((t) => {
                                const isReceipt = t.transaction.startsWith('Receipt');
                                const viewPath = isReceipt ? `/receipts/view/${t.id}` : `/sales-invoices/view/${t.id}`;
                                const editPath = isReceipt ? `/receipts/edit/${t.id}` : `/sales-invoices/edit/${t.id}`;

                                return (
                                    <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-4 py-3 border-r border-slate-100">
                                            <div className="flex items-center justify-center gap-1">
                                                <button
                                                    onClick={() => navigate(viewPath)}
                                                    className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all"
                                                    title={isReceipt ? 'View Receipt' : 'View Invoice'}
                                                >
                                                    <Eye size={14} />
                                                </button>
                                                <button
                                                    onClick={() => navigate(editPath)}
                                                    className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all"
                                                    title={isReceipt ? 'Edit Receipt' : 'Edit Invoice'}
                                                >
                                                    <Edit size={14} />
                                                </button>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 border-r border-slate-100 whitespace-nowrap">{t.date}</td>
                                        <td className="px-4 py-3 border-r border-slate-100">
                                            <div className="max-w-xs overflow-hidden text-ellipsis whitespace-nowrap font-medium" title={t.transaction}>
                                                {t.transaction}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 border-r border-slate-100">{t.customer}</td>
                                        <td className="px-4 py-3 border-r border-slate-100 text-[12px]">{t.bankAccount || '—'}</td>
                                        <td className="px-4 py-3 border-r border-slate-100 text-[12px]">{t.description}</td>
                                        <td className={`px-4 py-3 text-right border-r border-slate-100 font-bold whitespace-nowrap ${t.amount < 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                                            {t.amount < 0 ? `- ${t.currency}` : t.currency} {Math.abs(t.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </td>
                                        <td className="px-4 py-3 text-right text-slate-400 font-medium">
                                            {t.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    {filteredTransactions.length === 0 && (
                        <div className="p-8 text-center text-slate-400">
                            No transactions found.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CustomerTransactionsView;
