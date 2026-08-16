import React, { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  ChevronLeft, 
  Printer, 
  Download, 
  Share2, 
  Calendar,
  Layers,
  Users,
  FileSpreadsheet
} from 'lucide-react';
import { cn } from '../utils/cn';
import { exportToPDF, exportToCSV } from '../utils/exportUtils';

import apiService from '../services/apiService';

interface UnpaidInvoice {
  customerName: string;
  invoiceNo: string;
  date: string;
  dueDate: string;
  daysOverdue: number;
  totalAmount: number;
  paidAmount: number;
  balance: number;
  currency: string;
}

const ViewCustomerUnpaidInvoicesView: React.FC = () => {
    const navigate = useNavigate();
    const { id } = useParams();

    const report = useMemo(() => {
        const saved = localStorage.getItem('unpaid_invoice_reports');
        if (saved) {
            try {
                const reports = JSON.parse(saved);
                return reports.find((r: any) => r.id === id);
            } catch (e) {
                return null;
            }
        }
        return null;
    }, [id]);

    const [dbData, setDbData] = React.useState<UnpaidInvoice[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);

    React.useEffect(() => {
        const loadData = async () => {
            setIsLoading(true);
            try {
                const invoices = await apiService.getInvoices();
                const today = new Date();
                
                const unpaid = invoices
                    .filter((inv: any) => inv.status !== 'Paid' && inv.status !== 'Draft')
                    .map((inv: any) => {
                        const dueDate = new Date(inv.dueDate || inv.issueDate || inv.createdAt);
                        const diffDays = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 3600 * 24));
                        const totalAmount = parseFloat(inv.grandTotal) || 0;
                        const paidAmount = 0; // Assuming 0 for now as we don't have detailed payments here

                        return {
                            customerName: inv.customer?.name || inv.customer || 'Unknown',
                            invoiceNo: inv.reference,
                            date: inv.issueDate ? new Date(inv.issueDate).toLocaleDateString('en-GB').replace(/\//g, '.') : '',
                            dueDate: inv.dueDate ? new Date(inv.dueDate).toLocaleDateString('en-GB').replace(/\//g, '.') : '',
                            daysOverdue: diffDays,
                            totalAmount,
                            paidAmount,
                            balance: totalAmount - paidAmount,
                            currency: inv.currency || inv.customer?.currency?.split(' - ')[0] || 'ZMW'
                        };
                    });

                setDbData(unpaid);
            } catch (err) {
                console.error('Failed to load unpaid invoices:', err);
            } finally {
                setIsLoading(false);
            }
        };
        loadData();
    }, []);

    const formatCurrency = (val: number) => {
        if (val === 0) return '—';
        return val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    const getAgingText = (daysOverdue: number) => {
        if (daysOverdue > 0) return `${daysOverdue}D OVERDUE`;
        if (daysOverdue < 0) return `${Math.abs(daysOverdue)}D REMAIN`;
        return 'DUE TODAY';
    };

    const handleExportPDF = () => {
        const headers = ['Currency', 'Customer Name', 'Invoice #', 'Due Date', 'Aging', 'Total Amount', 'Unpaid Balance'];
        const rows: any[][] = [];
        currencies.forEach(curr => {
            groupedData[curr].forEach(row => {
                rows.push([curr, row.customerName, row.invoiceNo, row.dueDate, getAgingText(row.daysOverdue), row.totalAmount.toFixed(2), row.balance.toFixed(2)]);
            });
        });
        exportToPDF('Customer Unpaid Invoices', 'customer_unpaid_invoices', headers, rows);
    };

    const handleExportCSV = () => {
        const headers = ['Currency', 'Customer Name', 'Invoice #', 'Due Date', 'Aging', 'Total Amount', 'Unpaid Balance'];
        const rows: any[][] = [];
        currencies.forEach(curr => {
            groupedData[curr].forEach(row => {
                rows.push([curr, row.customerName, row.invoiceNo, row.dueDate, getAgingText(row.daysOverdue), row.totalAmount.toFixed(2), row.balance.toFixed(2)]);
            });
        });
        exportToCSV('customer_unpaid_invoices', headers, rows);
    };

    const groupedData = useMemo(() => {
        const groups: Record<string, UnpaidInvoice[]> = {};
        dbData.forEach(item => {
            if (!groups[item.currency]) groups[item.currency] = [];
            groups[item.currency].push(item);
        });
        return groups;
    }, [dbData]);

    const currencies = useMemo(() => {
        return Object.keys(groupedData).sort((a, b) => {
            if (a === 'ZMW') return -1;
            if (b === 'ZMW') return 1;
            return a.localeCompare(b);
        });
    }, [groupedData]);

    if (isLoading) {
        return <div className="p-20 text-center font-bold text-slate-400">LOADING DATABASE UNPAID...</div>;
    }

    return (
        <div className="min-h-screen bg-slate-50/50 p-8 space-y-8 animate-in fade-in duration-700 font-sans">
            {/* Action Header - Integrated Component Style */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 max-w-[1400px] mx-auto font-sans">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={() => navigate('/reports/unpaid-invoices')}
                        className="w-10 h-10 flex items-center justify-center bg-white border border-slate-200 rounded-full hover:bg-slate-50 transition-colors shadow-sm text-slate-400 hover:text-indigo-600"
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold text-slate-900 tracking-tight">Report Details</h1>
                        <p className="text-[12px] font-medium text-slate-500 uppercase tracking-widest">ID: {id?.replace('unpaid-report-', '')}</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-[12px] font-black hover:bg-slate-50 transition-all shadow-sm text-slate-600 uppercase tracking-widest leading-none">
                        <Share2 size={16} /> Share
                    </button>
                    <button onClick={handleExportCSV} className="flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-200 rounded-xl text-[12px] font-black hover:bg-emerald-100 transition-all shadow-sm text-emerald-600 uppercase tracking-widest leading-none">
                        <FileSpreadsheet size={16} /> Excel
                    </button>
                    <button onClick={handleExportPDF} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-[12px] font-black hover:bg-slate-50 transition-all shadow-sm text-slate-600 uppercase tracking-widest leading-none">
                        <Download size={16} /> PDF
                    </button>
                    <button 
                        onClick={() => window.print()}
                        className="flex items-center gap-2 px-6 py-2 bg-indigo-600 border border-indigo-700 rounded-xl text-[12px] font-black hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 text-white uppercase tracking-widest leading-none"
                    >
                        <Printer size={16} /> Print
                    </button>
                </div>
            </div>

            {/* Document Content - Standardized High-Density Layout */}
            <div className="max-w-[1400px] mx-auto bg-white rounded-[32px] shadow-2xl shadow-slate-200/50 border border-slate-100 overflow-hidden print:border-none print:shadow-none print:rounded-none">
                <div className="p-10 space-y-10">
                    {/* Document Header */}
                    <div className="text-center space-y-1">
                        <h2 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">MAHANT INVESTMENT LTD</h2>
                        <h3 className="text-2xl font-black text-slate-900 tracking-tight">Unpaid Invoices Report</h3>
                    </div>

                    {/* Metadata Strip */}
                    <div className="flex justify-between items-end border-b border-slate-100 pb-8 text-slate-400">
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 border border-indigo-100">
                                    <Calendar size={14} />
                                </div>
                                <div>
                                    <span className="text-[10px] font-black uppercase tracking-widest block text-slate-400">Analysis Date</span>
                                    <span className="text-[12px] font-bold text-slate-700">{report?.date || '10 April 2026'}</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-10 text-right font-sans">
                            <div>
                                <span className="text-[10px] font-black uppercase tracking-widest block mb-1 text-slate-400">Total Unpaid</span>
                                <span className="text-[16px] font-black text-slate-900 leading-none">{dbData.length}</span>
                            </div>
                            <div>
                                <span className="text-[10px] font-black uppercase tracking-widest block mb-1">Division</span>
                                <span className="text-[12px] font-bold text-slate-900 uppercase tracking-tight">{report?.division || 'All Divisions'}</span>
                            </div>
                        </div>
                    </div>

                    {/* High-Density Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b-2 border-slate-900">
                                    <th className="py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-900">Customer Name</th>
                                    <th className="py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-900 px-4">Invoice #</th>
                                    <th className="py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-900 px-4">Due Date</th>
                                    <th className="py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-900 px-4 text-center">Aging</th>
                                    <th className="py-4 text-right text-[10px] font-black uppercase tracking-widest text-slate-900 px-4">Total Amount</th>
                                    <th className="py-4 text-right text-[10px] font-black uppercase tracking-widest text-slate-900 pl-4">Unpaid Balance</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {currencies.map(curr => {
                                    const currencyData = groupedData[curr];
                                    const totalBalance = currencyData.reduce((acc, r) => acc + r.balance, 0);

                                    return (
                                        <React.Fragment key={curr}>
                                            {/* Currency Strip */}
                                            <tr className="bg-slate-50/80">
                                                <td colSpan={6} className="py-2.5 px-3">
                                                    <span className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em]">
                                                        {curr}
                                                    </span>
                                                </td>
                                            </tr>
                                            {currencyData.map((row, idx) => (
                                                <tr key={idx} className="group hover:bg-slate-50/50 transition-colors duration-200">
                                                    <td className="py-2.5 pr-6 pl-3">
                                                        <span className="text-[12px] font-bold text-blue-400 group-hover:text-blue-600 transition-colors uppercase tracking-tight">{row.customerName}</span>
                                                    </td>
                                                    <td className="py-2.5 text-[12px] font-medium text-slate-500 tabular-nums px-4">{row.invoiceNo}</td>
                                                    <td className="py-2.5 text-[12px] font-medium text-slate-500 tabular-nums px-4">
                                                        {row.dueDate}
                                                        <span className="block text-[9px] font-black text-slate-300 uppercase tracking-tighter">Inv: {row.date}</span>
                                                    </td>
                                                    <td className="py-2.5 px-4 text-center">
                                                        <span className={cn("text-[10px] font-black px-2 py-0.5 rounded-md tracking-tighter inline-block", 
                                                            row.daysOverdue > 30 ? "bg-rose-50 text-rose-600 border border-rose-100" : 
                                                            row.daysOverdue > 0 ? "bg-amber-50 text-amber-600 border border-amber-100" : 
                                                            "bg-emerald-50 text-emerald-600 border border-emerald-100"
                                                        )}>
                                                            {row.daysOverdue > 0 ? `${row.daysOverdue}D OVERDUE` : row.daysOverdue < 0 ? `${Math.abs(row.daysOverdue)}D REMAIN` : 'DUE TODAY'}
                                                        </span>
                                                    </td>
                                                    <td className="py-2.5 text-right font-medium text-[12px] text-slate-400 tabular-nums px-4">{formatCurrency(row.totalAmount)}</td>
                                                    <td className="py-2.5 text-right font-black text-[13px] text-slate-900 tabular-nums pl-4">{formatCurrency(row.balance)}</td>
                                                </tr>
                                            ))}
                                            {/* Group Footer */}
                                            <tr className="border-t border-slate-200 bg-slate-50/30">
                                                <td colSpan={5} className="py-2 pr-4 pl-3 font-black text-[11px] text-slate-400 uppercase tracking-widest italic text-right">Outstanding {curr} Total</td>
                                                <td className="py-2 text-right font-black text-[13px] text-indigo-600 tabular-nums underline decoration-1 underline-offset-4 pl-4">
                                                    {formatCurrency(totalBalance)}
                                                </td>
                                            </tr>
                                            {/* Spacer row */}
                                            <tr className="h-4"></tr>
                                        </React.Fragment>
                                    );
                                })}
                            </tbody>
                            <tfoot>
                                <tr className="border-t-2 border-slate-900">
                                    <td className="py-4 font-black text-[12px] text-slate-900 uppercase tracking-widest">End of Report</td>
                                    <td colSpan={5} className="py-4 text-right text-slate-400 text-[10px] font-bold italic pr-2">
                                        * Values are presented in their respective transaction currencies.
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ViewCustomerUnpaidInvoicesView;
