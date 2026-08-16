import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Search, Plus, ArrowRightLeft, Eye } from 'lucide-react';
import apiService from '../services/apiService';
import { cn } from '../utils/cn';

interface InterAccountTransfer {
    id: string;
    reference: string;
    date: string;
    paidFromAccount: string;
    receivedInAccount: string;
    description: string;
    amount: string | number;
    status: string;
}

const InterAccountTransfersView = () => {
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const [transfers, setTransfers] = useState<InterAccountTransfer[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadTransfers();
    }, []);

    const loadTransfers = async () => {
        setIsLoading(true);
        try {
            const data = await apiService.getInterAccountTransfers();
            setTransfers(data);
        } catch (error) {
            console.error('Failed to load transfers:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const filteredTransfers = useMemo(() => {
        return transfers.filter(t => 
            t.reference?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            t.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            t.paidFromAccount?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            t.receivedInAccount?.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [transfers, searchQuery]);

    const totalFilteredAmount = filteredTransfers.reduce((sum, t) => sum + (parseFloat(String(t.amount)) || 0), 0);

    return (
        <div className="flex flex-col h-full bg-slate-50/50">
            <div className="flex-none bg-white border-b border-slate-200/50 sticky top-0 z-10 p-6 md:p-8 pt-20 shadow-sm">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 max-w-7xl mx-auto">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 rounded-[14px] bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-sm">
                                <ArrowRightLeft size={20} strokeWidth={2.5} />
                            </div>
                            <h1 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight">Inter Account Transfers</h1>
                        </div>
                        <p className="text-[13px] font-bold text-slate-500 max-w-xl">
                            Move funds between your internal bank and cash accounts.
                        </p>
                    </div>

                    <div className="flex items-center gap-4 w-full md:w-auto">
                        <div className="relative flex-1 md:w-80 group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
                            <input
                                type="text"
                                placeholder="Search transfers..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-11 pr-4 py-3.5 bg-white border-2 border-slate-200/60 rounded-2xl text-[13px] font-bold text-slate-700 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-sm placeholder:text-slate-400"
                            />
                        </div>

                        <button
                            onClick={() => navigate('/inter-account-transfers/new')}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3.5 rounded-2xl text-[13px] font-black tracking-widest uppercase transition-all shadow-lg shadow-indigo-600/20 hover:shadow-indigo-600/40 hover:-translate-y-0.5 active:translate-y-0 flex items-center gap-2 whitespace-nowrap border-b-4 border-indigo-800"
                        >
                            <Plus size={16} /> New Transfer
                        </button>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-auto p-6 md:p-8">
                <div className="max-w-7xl mx-auto bg-white rounded-3xl border border-slate-200/60 shadow-xl shadow-slate-200/20 overflow-hidden">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/80 border-b border-slate-200">
                                <th className="px-6 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Date</th>
                                <th className="px-6 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Reference</th>
                                <th className="px-6 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Paid from</th>
                                <th className="px-6 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Received in</th>
                                <th className="px-6 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Amount</th>
                                <th className="px-6 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Status</th>
                                <th className="px-6 py-5 w-20"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {isLoading ? (
                                <tr><td colSpan={7} className="text-center py-12 text-slate-500 font-bold text-sm">Loading transfers...</td></tr>
                            ) : filteredTransfers.length === 0 ? (
                                <tr><td colSpan={7} className="text-center py-12 text-slate-500 font-bold text-sm">No transfers found.</td></tr>
                            ) : (
                                filteredTransfers.map((t) => (
                                    <tr key={t.id} className="hover:bg-slate-50/50 transition-colors group cursor-pointer" onClick={() => navigate(`/inter-account-transfers/view/${t.id}`)}>
                                        <td className="px-6 py-4 whitespace-nowrap text-[13px] font-bold text-slate-600">{new Date(t.date).toLocaleDateString()}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="text-[13px] font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md">{t.reference}</span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-[13px] font-bold text-slate-700">{t.paidFromAccount}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-[13px] font-bold text-slate-700">{t.receivedInAccount}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-[14px] font-black text-slate-900">${parseFloat(String(t.amount)).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-600 border border-emerald-200">
                                                {t.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                            <button onClick={(e) => { e.stopPropagation(); navigate(`/inter-account-transfers/view/${t.id}`); }} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all">
                                                <Eye size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                        {!isLoading && filteredTransfers.length > 0 && (
                            <tfoot className="bg-slate-50 border-t border-slate-200">
                                <tr>
                                    <td colSpan={4} className="px-6 py-4 text-right text-[11px] font-black text-slate-400 uppercase tracking-widest">Total</td>
                                    <td colSpan={3} className="px-6 py-4">
                                        <span className="text-[15px] font-black text-slate-900 underline decoration-slate-200 decoration-2 underline-offset-4">
                                            ${totalFilteredAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </span>
                                    </td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>
            </div>
        </div>
    );
};

export default InterAccountTransfersView;
