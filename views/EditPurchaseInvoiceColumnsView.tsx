import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Check, FileCheck } from 'lucide-react';
import { cn } from '../utils/cn';

const EditPurchaseInvoiceColumnsView = () => {
    const navigate = useNavigate();
    
    const [columns, setColumns] = useState([
        { id: 'Issue date', label: 'Issue date', visible: true },
        { id: 'Due date', label: 'Due date', visible: true },
        { id: 'Reference', label: 'Reference', visible: true },
        { id: 'Supplier', label: 'Supplier', visible: true },
        { id: 'Description', label: 'Description', visible: true },
        { id: 'Withholding tax', label: 'Withholding tax', visible: true },
        { id: 'Discount', label: 'Discount', visible: true },
        { id: 'Invoice Amount', label: 'Invoice Amount', visible: true },
        { id: 'Balance due', label: 'Balance due', visible: true },
        { id: 'Days to Due Date', label: 'Days to Due Date', visible: true },
        { id: 'Days overdue', label: 'Days overdue', visible: true },
        { id: 'Status', label: 'Status', visible: true },
        { id: 'Timestamp', label: 'Timestamp', visible: true }
    ]);

    useEffect(() => {
        const saved = localStorage.getItem('purchase_invoice_column_visibility');
        if (saved) {
            const visibility = JSON.parse(saved);
            setColumns(prev => prev.map(col => ({
                ...col,
                visible: visibility[col.id] !== false
            })));
        }
    }, []);

    const toggleColumn = (id: string) => {
        setColumns(columns.map((col: any) =>
            col.id === id ? { ...col, visible: !col.visible } : col
        ));
    };

    const handleUpdate = () => {
        const visibility = columns.reduce((acc, col) => ({
            ...acc,
            [col.id]: col.visible
        }), {});
        localStorage.setItem('purchase_invoice_column_visibility', JSON.stringify(visibility));
        window.dispatchEvent(new Event('storage'));
        navigate('/purchase-invoices');
    };

    return (
        <div className="bg-slate-50 min-h-screen selection:bg-indigo-100 selection:text-indigo-900 font-sans p-8 md:p-12 animate-in fade-in duration-700">
            <div className="max-w-2xl mx-auto mb-10">
                <div className="flex items-center space-x-2 text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em] mb-4">
                    <span className="cursor-pointer hover:text-indigo-600 transition-colors" onClick={() => navigate('/purchase-invoices')}>Purchase Invoices</span>
                    <ChevronRight size={10} className="opacity-50" />
                    <span className="text-slate-400">Column Configuration</span>
                </div>
                
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center text-indigo-500">
                        <FileCheck size={22} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Configure Columns</h1>
                        <p className="text-slate-500 font-medium text-sm">Select which data fields you want to see for Purchase Invoices.</p>
                    </div>
                </div>
            </div>

            <div className="max-w-xl mx-auto grid grid-cols-1 gap-3 mb-12">
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

            <div className="max-w-xl mx-auto pt-6 border-t border-slate-200 text-center">
                <button
                    onClick={handleUpdate}
                    className="w-full md:w-auto min-w-[240px] px-10 py-4 bg-emerald-500 text-white rounded-[20px] font-black text-[13px] uppercase tracking-[0.2em] hover:bg-emerald-600 transition-all shadow-xl shadow-emerald-200 active:scale-95"
                >
                    Update View
                </button>
                <div className="mt-6">
                    <button 
                        onClick={() => navigate('/purchase-invoices')}
                        className="text-[11px] font-bold text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors"
                    >
                        Cancel Changes
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EditPurchaseInvoiceColumnsView;
