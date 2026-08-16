import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import apiService from '../services/apiService';
import { Account } from '../types';
import { LayoutDashboard, TrendingUp, TrendingDown, DollarSign, Wallet, Scale } from 'lucide-react';

const SummaryView = () => {
    const navigate = useNavigate();
    const [accounts, setAccounts] = useState<(Account & { balance: number })[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchSummary = async () => {
            try {
                const data = await apiService.getSummary();
                setAccounts(data);
            } catch (err) {
                console.error('Failed to fetch summary:', err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchSummary();
    }, []);

    // Group accounts
    const assets = accounts.filter(a => a.accountType === 'Asset');
    const liabilities = accounts.filter(a => a.accountType === 'Liability');
    const equity = accounts.filter(a => a.accountType === 'Equity');
    const income = accounts.filter(a => a.accountType === 'Income' || a.accountType === 'Revenue');
    const expenses = accounts.filter(a => a.accountType === 'Expense');

    // Totals
    const totalAssets = assets.reduce((sum, a) => sum + (a.balance || 0), 0);
    const totalLiabilities = liabilities.reduce((sum, a) => sum + (a.balance || 0), 0);
    const totalEquity = equity.reduce((sum, a) => sum + (a.balance || 0), 0);
    const totalIncome = income.reduce((sum, a) => sum + (a.balance || 0), 0);
    const totalExpenses = expenses.reduce((sum, a) => sum + (a.balance || 0), 0);
    
    const netProfit = totalIncome - totalExpenses;
    const totalLiabilitiesAndEquity = totalLiabilities + totalEquity + netProfit;

    const formatCurrency = (val: number) => {
        if (val === 0) return '-';
        return val < 0 
            ? `(ZMW ${Math.abs(val).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`
            : `ZMW ${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const AccountList = ({ title, items, total, icon: Icon, isProfit = false }: any) => (
        <div className="mb-10">
            <div className="flex items-center space-x-3 mb-6 pb-2 border-b-2 border-slate-100">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isProfit ? 'bg-emerald-50 text-emerald-500' : 'bg-indigo-50 text-indigo-500'}`}>
                    <Icon size={16} />
                </div>
                <h2 className="text-xl font-black text-slate-800 tracking-tight">{title}</h2>
            </div>
            
            <div className="space-y-1">
                {items.length === 0 ? (
                    <div className="py-4 text-sm font-medium text-slate-400 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">No accounts</div>
                ) : (
                    items.map((acc: any) => (
                        <div key={acc.id} className="group flex justify-between items-center py-3 px-4 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer border border-transparent hover:border-slate-100" onClick={() => navigate(`/account/view/${acc.id}`)}>
                            <div className="flex flex-col">
                                <span className="font-bold text-slate-700 group-hover:text-indigo-600 transition-colors text-[13px]">{acc.name}</span>
                                {acc.code && <span className="text-[10px] font-bold text-slate-400 mt-0.5">{acc.code}</span>}
                            </div>
                            <span className={`font-black text-[13px] ${acc.balance < 0 ? 'text-rose-500' : 'text-slate-700'}`}>
                                {formatCurrency(acc.balance)}
                            </span>
                        </div>
                    ))
                )}
            </div>
            <div className="flex justify-between items-center mt-4 pt-4 border-t border-slate-100 px-4">
                <span className="font-black text-[11px] uppercase tracking-widest text-slate-400">Total {title}</span>
                <span className={`font-black text-[15px] ${total < 0 ? 'text-rose-500' : 'text-slate-800'}`}>{formatCurrency(total)}</span>
            </div>
        </div>
    );

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[600px]">
                <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-600 rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between no-print">
                <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
                        <LayoutDashboard size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Summary</h1>
                        <p className="text-sm font-medium text-slate-500 mt-1">Live overview of your financial position</p>
                    </div>
                </div>
                <div className="flex space-x-3">
                    <button onClick={() => window.print()} className="px-5 py-2.5 bg-white border border-slate-200 text-slate-600 font-bold text-[13px] rounded-xl shadow-sm hover:bg-slate-50 transition-all active:scale-95">Print</button>
                    <button onClick={() => navigate('/accounts')} className="px-5 py-2.5 bg-indigo-50 text-indigo-600 font-bold text-[13px] rounded-xl hover:bg-indigo-100 transition-all active:scale-95">Manage Accounts</button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Balance Sheet Side */}
                <div className="bg-white rounded-[32px] p-8 shadow-xl shadow-slate-200/40 border border-slate-100">
                    <div className="mb-8">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Statement of Position</span>
                        <h3 className="text-2xl font-black text-slate-800 tracking-tight mt-1">Balance Sheet</h3>
                    </div>

                    <AccountList title="Assets" items={assets} total={totalAssets} icon={Wallet} />
                    <AccountList title="Liabilities" items={liabilities} total={totalLiabilities} icon={Scale} />
                    <AccountList title="Equity" items={equity} total={totalEquity} icon={DollarSign} />

                    <div className="mt-8 pt-8 border-t-2 border-dashed border-slate-200">
                        <div className="flex justify-between items-center py-3 px-4 bg-emerald-50/50 rounded-xl mb-4">
                            <span className="font-bold text-emerald-700 text-[13px]">Net Profit (Loss)</span>
                            <span className={`font-black text-[13px] ${netProfit < 0 ? 'text-rose-500' : 'text-emerald-700'}`}>{formatCurrency(netProfit)}</span>
                        </div>
                        
                        <div className="flex justify-between items-center px-4">
                            <span className="font-black text-slate-800">Total Liabilities & Equity</span>
                            <span className="font-black text-lg text-indigo-600">{formatCurrency(totalLiabilitiesAndEquity)}</span>
                        </div>
                        {Math.abs(totalAssets - totalLiabilitiesAndEquity) > 0.01 && (
                            <div className="mt-4 p-3 bg-rose-50 rounded-xl text-rose-600 text-[11px] font-bold text-center border border-rose-100">
                                Warning: Balance Sheet is out of balance by {formatCurrency(Math.abs(totalAssets - totalLiabilitiesAndEquity))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Profit & Loss Side */}
                <div className="bg-white rounded-[32px] p-8 shadow-xl shadow-slate-200/40 border border-slate-100">
                    <div className="mb-8">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Statement of Performance</span>
                        <h3 className="text-2xl font-black text-slate-800 tracking-tight mt-1">Profit and Loss</h3>
                    </div>

                    <AccountList title="Income" items={income} total={totalIncome} icon={TrendingUp} isProfit={true} />
                    <AccountList title="Expenses" items={expenses} total={totalExpenses} icon={TrendingDown} />

                    <div className="mt-8 pt-8 border-t-2 border-dashed border-slate-200">
                        <div className="flex justify-between items-center px-4 py-6 bg-slate-900 rounded-2xl shadow-xl shadow-slate-900/20">
                            <span className="font-black text-white text-lg">Net Profit (Loss)</span>
                            <span className={`font-black text-2xl ${netProfit < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>{formatCurrency(netProfit)}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SummaryView;
