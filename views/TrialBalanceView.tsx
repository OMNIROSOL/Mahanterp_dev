import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiService from '../services/apiService';
import { Scale } from 'lucide-react';

const TrialBalanceView = () => {
    const navigate = useNavigate();
    const [rows, setRows] = useState<any[]>([]);
    const [totals, setTotals] = useState({ debit: 0, credit: 0 });
    const [isLoading, setIsLoading] = useState(true);
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');

    const load = async (fromDate?: string, toDate?: string) => {
        setIsLoading(true);
        try {
            const params: any = {};
            if (fromDate) params.from = fromDate;
            if (toDate) params.to = toDate;
            const data = await apiService.getTrialBalance(params);
            setRows(data.rows || []);
            setTotals(data.totals || { debit: 0, credit: 0 });
        } catch (err) {
            console.error('Failed to fetch trial balance:', err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    const formatCurrency = (val: number) => {
        if (!val) return '-';
        return val < 0
            ? `(ZMW ${Math.abs(val).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`
            : `ZMW ${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const drift = Math.abs((totals.debit || 0) - (totals.credit || 0));

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between no-print">
                <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
                        <Scale size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Trial Balance</h1>
                        <p className="text-sm font-medium text-slate-500 mt-1">Debit and credit totals from the general ledger</p>
                    </div>
                </div>
                <div className="flex items-center space-x-3">
                    <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-[13px] font-semibold" />
                    <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-[13px] font-semibold" />
                    <button onClick={() => load(from, to)} className="px-5 py-2.5 bg-indigo-600 text-white font-bold text-[13px] rounded-xl hover:bg-indigo-700">Apply</button>
                    <button onClick={() => window.print()} className="px-5 py-2.5 bg-white border border-slate-200 text-slate-600 font-bold text-[13px] rounded-xl">Print</button>
                </div>
            </div>

            <div className="bg-white rounded-[32px] p-8 shadow-xl shadow-slate-200/40 border border-slate-100">
                {isLoading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-600 rounded-full animate-spin"></div>
                    </div>
                ) : (
                    <>
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-slate-100">
                                    <th className="py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Code</th>
                                    <th className="py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Account</th>
                                    <th className="py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Type</th>
                                    <th className="py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Debit</th>
                                    <th className="py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Credit</th>
                                    <th className="py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Balance</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((row) => (
                                    <tr key={row.id} className="border-b border-slate-50 hover:bg-slate-50 cursor-pointer" onClick={() => navigate(`/accounts/view/${row.id}`)}>
                                        <td className="py-3 text-[12px] font-bold text-slate-400">{row.code}</td>
                                        <td className="py-3 text-[13px] font-bold text-slate-800">{row.name}</td>
                                        <td className="py-3 text-[12px] text-slate-500">{row.accountType}</td>
                                        <td className="py-3 text-[13px] font-black text-right text-slate-700">{formatCurrency(row.debit)}</td>
                                        <td className="py-3 text-[13px] font-black text-right text-slate-700">{formatCurrency(row.credit)}</td>
                                        <td className={`py-3 text-[13px] font-black text-right ${row.balance < 0 ? 'text-rose-500' : 'text-slate-800'}`}>{formatCurrency(row.balance)}</td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr>
                                    <td colSpan={3} className="pt-6 text-[11px] font-black uppercase tracking-widest text-slate-400">Totals</td>
                                    <td className="pt-6 text-[15px] font-black text-right">{formatCurrency(totals.debit)}</td>
                                    <td className="pt-6 text-[15px] font-black text-right">{formatCurrency(totals.credit)}</td>
                                    <td className="pt-6"></td>
                                </tr>
                            </tfoot>
                        </table>
                        {drift > 0.01 && (
                            <div className="mt-6 p-3 bg-rose-50 rounded-xl text-rose-600 text-[11px] font-bold text-center border border-rose-100">
                                Trial balance is out of balance by {formatCurrency(drift)}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default TrialBalanceView;
