import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Check, ShoppingBag, Landmark } from 'lucide-react';
import { cn } from '../utils/cn';

const EditBankAccountColumnsView = () => {
    const navigate = useNavigate();
    
    const [columns, setColumns] = useState(() => {
        const saved = localStorage.getItem('bank_account_column_settings');
        const defaultCols = [
            { id: 'code', label: 'Code', visible: true },
            { id: 'name', label: 'Name', visible: true },
            { id: 'control_account', label: 'Control account', visible: true },
            { id: 'division', label: 'Division', visible: true },
            { id: 'uncategorized_receipts', label: 'Uncategorized Receipts', visible: true },
            { id: 'uncategorized_payments', label: 'Uncategorized Payments', visible: true },
            { id: 'cleared_balance', label: 'Cleared balance', visible: true },
            { id: 'pending_deposits', label: 'Pending deposits', visible: true },
            { id: 'pending_withdrawals', label: 'Pending withdrawals', visible: true },
            { id: 'actual_balance', label: 'Actual balance', visible: true },
            { id: 'available_credit', label: 'Available credit', visible: true },
            { id: 'last_reconciliation', label: 'Last Bank Reconciliation', visible: true },
            { id: 'timestamp', label: 'Timestamp', visible: true }
        ];

        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                return defaultCols.map(def => {
                    const found = parsed.find((p: any) => p.id === def.id);
                    return found ? { ...def, visible: found.visible } : def;
                });
            } catch (e) {
                return defaultCols;
            }
        }
        return defaultCols;
    });

    const toggleColumn = (id: string) => {
        setColumns(columns.map((col: any) =>
            col.id === id ? { ...col, visible: !col.visible } : col
        ));
    };

    const handleUpdate = () => {
        localStorage.setItem('bank_account_column_settings', JSON.stringify(columns));
        window.dispatchEvent(new Event('storage'));
        navigate('/account');
    };

    return (
        <div className="bg-slate-50 min-h-screen selection:bg-indigo-100 selection:text-indigo-900 font-sans p-8 md:p-12 animate-in fade-in duration-700">
            {/* Breadcrumb Header */}
            <div className="max-w-2xl mx-auto mb-10">
                <div className="flex items-center space-x-2 text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em] mb-4">
                    <span className="cursor-pointer hover:text-indigo-600 transition-colors" onClick={() => navigate('/account')}>Bank Accounts</span>
                    <ChevronRight size={10} className="opacity-50" />
                    <span className="text-slate-400">Column Configuration</span>
                </div>
                
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center text-indigo-500">
                        <ShoppingBag size={22} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Configure Columns</h1>
                        <p className="text-slate-500 font-medium text-sm">Select which data fields you want to see for Bank and Cash Accounts.</p>
                    </div>
                </div>
            </div>

            {/* Checklist Area */}
            <div className="max-w-xl mx-auto space-y-3 mb-12 pr-2">
                {columns.map((col: any) => (
                    <div
                        key={col.id}
                        onClick={() => toggleColumn(col.id)}
                        className={cn(
                            "flex items-center space-x-5 bg-white border rounded-[24px] p-5 cursor-pointer transition-all hover:scale-[1.01] hover:shadow-md active:scale-[0.99]",
                            col.visible 
                                ? "border-emerald-500/30 bg-white" 
                                : "border-slate-100 bg-white/60 opacity-60"
                        )}
                    >
                        <div className={cn(
                            "w-7 h-7 rounded-xl border-2 flex items-center justify-center transition-all",
                            col.visible 
                                ? "bg-emerald-500 border-emerald-500 shadow-lg shadow-emerald-200" 
                                : "bg-white border-slate-200"
                        )}>
                            {col.visible && <Check size={16} className="text-white" strokeWidth={4} />}
                        </div>
                        <span className={cn(
                            "text-[15px] transition-all tracking-tight",
                            col.visible ? "text-slate-900 font-bold" : "text-slate-400 font-medium"
                        )}>
                            {col.label}
                        </span>
                    </div>
                ))}
            </div>

            {/* Action Area */}
            <div className="max-w-xl mx-auto pt-6 border-t border-slate-200 text-center">
                <button
                    onClick={handleUpdate}
                    className="w-full md:w-auto min-w-[240px] px-10 py-4 bg-emerald-500 text-white rounded-[20px] font-black text-[13px] uppercase tracking-[0.2em] hover:bg-emerald-600 transition-all shadow-xl shadow-emerald-200 active:scale-95"
                >
                    Update View
                </button>
                <div className="mt-6">
                    <button 
                        onClick={() => navigate('/account')}
                        className="text-[11px] font-bold text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors"
                    >
                        Cancel Changes
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EditBankAccountColumnsView;
