import React, { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ChevronLeft,
    Printer,
    Download,
    Share2,
    Calendar,
    Building2,
    Users,
    FileSpreadsheet
} from 'lucide-react';
import { cn } from '../utils/cn';
import { exportToPDF, exportToCSV } from '../utils/exportUtils';

import apiService from '../services/apiService';

interface TransactionLine {
    date: string;
    customerName: string;
    transactionType: string;
    referenceNo: string;
    description: string;
    debit: number;
    credit: number;
    currency: string;
}

const ViewCustomerTransactionsReportView: React.FC = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const report = useMemo(() => {
        const saved = localStorage.getItem('customer_transaction_reports');
        if (saved) {
            try {
                const reports = JSON.parse(saved);
                return reports.find((r: any) => r.id === id);
            } catch (e) { return null; }
        }
        return null;
    }, [id]);

    const [selectedCustomer, setSelectedCustomer] = React.useState<{ name: string, currency: string } | null>(null);
    const [dbTransactions, setDbTransactions] = React.useState<TransactionLine[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);

    React.useEffect(() => {
        const loadData = async () => {
            setIsLoading(true);
            try {
                const [invoices, receipts] = await Promise.all([
                    apiService.getInvoices(),
                    apiService.getReceipts()
                ]);

                const txs: TransactionLine[] = [];

                invoices.forEach((inv: any) => {
                    if (inv.status === 'Draft') return;
                    txs.push({
                        date: inv.issueDate ? new Date(inv.issueDate).toLocaleDateString('en-GB').replace(/\//g, '.') : '',
                        customerName: inv.customer?.name || inv.customer || 'Unknown',
                        transactionType: 'Sales Invoice',
                        referenceNo: inv.reference,
                        description: inv.description || '',
                        debit: parseFloat(inv.grandTotal) || 0,
                        credit: 0,
                        currency: inv.currency || inv.customer?.currency?.split(' - ')[0] || 'ZMW'
                    });
                });

                receipts.forEach((r: any) => {
                    txs.push({
                        date: r.date ? new Date(r.date).toLocaleDateString('en-GB').replace(/\//g, '.') : '',
                        customerName: r.paidByContact || 'Unknown',
                        transactionType: 'Receipt',
                        referenceNo: r.reference,
                        description: r.description || '',
                        debit: 0,
                        credit: parseFloat(r.amount) || 0,
                        currency: r.currency || 'ZMW'
                    });
                });

                setDbTransactions(txs);
            } catch (err) {
                console.error('Failed to load transaction data:', err);
            } finally {
                setIsLoading(false);
            }
        };
        loadData();
    }, []);

    const groupedData = useMemo(() => {
        const groups: Record<string, Array<{ name: string, count: number, debit: number, credit: number }>> = {};
        
        dbTransactions.forEach(item => {
            if (!groups[item.currency]) groups[item.currency] = [];
            
            let customerEntry = groups[item.currency].find(e => e.name === item.customerName);
            if (!customerEntry) {
                customerEntry = { name: item.customerName, count: 0, debit: 0, credit: 0 };
                groups[item.currency].push(customerEntry);
            }
            
            customerEntry.count += 1;
            customerEntry.debit += item.debit;
            customerEntry.credit += item.credit;
        });
        
        return groups;
    }, [dbTransactions]);

    const customerDetails = useMemo(() => {
        if (!selectedCustomer) return [];
        return dbTransactions.filter(tx => 
            tx.customerName === selectedCustomer.name && 
            tx.currency === selectedCustomer.currency
        );
    }, [selectedCustomer, dbTransactions]);

    const currencies = useMemo(() => {
        return Object.keys(groupedData).sort((a, b) => {
            if (a === 'ZMW') return -1;
            if (b === 'ZMW') return 1;
            return a.localeCompare(b);
        });
    }, [groupedData]);

    const formatCurrency = (val: number) => {
        if (val === 0) return '—';
        return val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    const handleExportPDF = () => {
        const headers = ['Currency', 'Customer Name', 'Transactions', 'Total Debit', 'Total Credit', 'Closing Balance'];
        const rows: any[][] = [];
        currencies.forEach(curr => {
            groupedData[curr].forEach(row => {
                rows.push([curr, row.name, row.count, row.debit.toFixed(2), row.credit.toFixed(2), (row.debit - row.credit).toFixed(2)]);
            });
        });
        exportToPDF('Customer Transaction Summary', 'customer_transactions_report', headers, rows);
    };

    const handleExportCSV = () => {
        const headers = ['Currency', 'Customer Name', 'Transactions', 'Total Debit', 'Total Credit', 'Closing Balance'];
        const rows: any[][] = [];
        currencies.forEach(curr => {
            groupedData[curr].forEach(row => {
                rows.push([curr, row.name, row.count, row.debit.toFixed(2), row.credit.toFixed(2), (row.debit - row.credit).toFixed(2)]);
            });
        });
        exportToCSV('customer_transactions_report', headers, rows);
    };

    if (isLoading) {
        return <div className="p-20 text-center font-bold text-slate-400">LOADING DATABASE TRANSACTIONS...</div>;
    }

    return (
        <div className="min-h-screen bg-slate-50/50 p-8 space-y-8 animate-in fade-in duration-700 font-sans relative">
            {/* Detail Modal */}
            {selectedCustomer && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-4xl max-h-[80vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
                        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <div>
                                <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">Transaction Audit Trail</h4>
                                <h3 className="text-xl font-bold text-slate-900 tracking-tight">{selectedCustomer.name}</h3>
                                <p className="text-[12px] font-medium text-slate-400 mt-1 uppercase tracking-tight">Viewing all {selectedCustomer.currency} activity</p>
                            </div>
                            <button 
                                onClick={() => setSelectedCustomer(null)}
                                className="w-10 h-10 flex items-center justify-center bg-white border border-slate-200 rounded-full hover:bg-slate-50 transition-colors shadow-sm text-slate-400"
                            >
                                <ChevronLeft size={20} className="rotate-90" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-8">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b-2 border-slate-900">
                                        <th className="pb-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-900">Date</th>
                                        <th className="pb-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-900 px-4">Type</th>
                                        <th className="pb-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-900 px-4">Reference</th>
                                        <th className="pb-4 text-right text-[10px] font-black uppercase tracking-widest text-slate-900 px-4">Debit</th>
                                        <th className="pb-4 text-right text-[10px] font-black uppercase tracking-widest text-slate-900 pl-4">Credit</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {customerDetails.map((tx, idx) => (
                                        <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="py-4 text-[12px] font-medium text-slate-500 tabular-nums">{tx.date}</td>
                                            <td className="py-4 px-4 text-[12px] font-bold text-slate-700 uppercase tracking-tight">{tx.transactionType}</td>
                                            <td className="py-4 px-4 text-[11px] font-black text-slate-400">{tx.referenceNo}</td>
                                            <td className="py-4 text-right font-medium text-[12px] text-slate-900 tabular-nums px-4">{formatCurrency(tx.debit)}</td>
                                            <td className="py-4 text-right font-medium text-[12px] text-slate-900 tabular-nums pl-4">{formatCurrency(tx.credit)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="p-6 bg-slate-50/80 border-t border-slate-100 flex justify-between items-center px-10">
                            <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">End of Ledger</span>
                            <div className="flex gap-10">
                                <div className="text-right">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Total Debit</span>
                                    <span className="text-[14px] font-black text-slate-900">{formatCurrency(customerDetails.reduce((a, c) => a + c.debit, 0))}</span>
                                </div>
                                <div className="text-right">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Total Credit</span>
                                    <span className="text-[14px] font-black text-slate-900">{formatCurrency(customerDetails.reduce((a, c) => a + c.credit, 0))}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Action Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 max-w-[1400px] mx-auto">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={() => navigate('/reports/customer-transactions')}
                        className="w-10 h-10 flex items-center justify-center bg-white border border-slate-200 rounded-full hover:bg-slate-50 transition-colors shadow-sm text-slate-400 hover:text-indigo-600"
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold text-slate-900 tracking-tight">Transaction Summary</h1>
                        <p className="text-[12px] font-medium text-slate-500 uppercase tracking-widest">ID: {id?.replace('tx-report-', '')}</p>
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

            {/* Document Content */}
            <div className="max-w-[1400px] mx-auto bg-white rounded-[32px] shadow-2xl shadow-slate-200/50 border border-slate-100 overflow-hidden print:border-none print:shadow-none print:rounded-none">
                <div className="p-10 space-y-10">
                    {/* Document Header */}
                    <div className="text-center space-y-1">
                        <h2 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">MAHANT INVESTMENT LTD</h2>
                        <h3 className="text-2xl font-black text-slate-900 tracking-tight">Customer Transaction Summary</h3>
                    </div>

                    {/* Metadata Strip */}
                    <div className="flex justify-between items-end border-b border-slate-100 pb-8 text-slate-400">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 border border-indigo-100">
                                <Calendar size={14} />
                            </div>
                            <div>
                                <span className="text-[10px] font-black uppercase tracking-widest block text-slate-400">Analysis Period</span>
                                <span className="text-[12px] font-bold text-slate-700">
                                    {report?.fromDate || '01.04.2026'} — {report?.toDate || '30.04.2026'}
                                </span>
                            </div>
                        </div>
                        <div className="flex items-center gap-10 text-right">
                            <div>
                                <span className="text-[10px] font-black uppercase tracking-widest block mb-1 text-slate-400">Customers Audited</span>
                                <span className="text-[16px] font-black text-slate-900 leading-none">
                                    {(Object.values(groupedData) as any[]).reduce((acc, curr) => acc + curr.length, 0)}
                                </span>
                            </div>
                            <div>
                                <span className="text-[10px] font-black uppercase tracking-widest block mb-1">Division</span>
                                <span className="text-[12px] font-bold text-slate-900 uppercase tracking-tight">{report?.division || 'All Divisions'}</span>
                            </div>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b-2 border-slate-900">
                                    <th className="py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-900 px-4">Customer Name</th>
                                    <th className="py-4 text-center text-[10px] font-black uppercase tracking-widest text-slate-900 px-4">Transactions</th>
                                    <th className="py-4 text-right text-[10px] font-black uppercase tracking-widest text-slate-900 px-4 text-slate-400">Total Debit</th>
                                    <th className="py-4 text-right text-[10px] font-black uppercase tracking-widest text-slate-900 px-4 text-slate-400">Total Credit</th>
                                    <th className="py-4 text-right text-[10px] font-black uppercase tracking-widest text-slate-900 pl-4">Closing Balance</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {currencies.map(curr => {
                                    const currencyData = groupedData[curr];
                                    const totalDebit = currencyData.reduce((acc, r) => acc + r.debit, 0);
                                    const totalCredit = currencyData.reduce((acc, r) => acc + r.credit, 0);

                                    return (
                                        <React.Fragment key={curr}>
                                            <tr className="bg-slate-50/80">
                                                <td colSpan={5} className="py-2.5 px-3">
                                                    <span className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em]">{curr}</span>
                                                </td>
                                            </tr>
                                            {currencyData.map((row, idx) => (
                                                <tr key={idx} className="group hover:bg-slate-50/50 transition-colors">
                                                    <td className="py-4 px-4">
                                                        <button 
                                                            onClick={() => setSelectedCustomer({ name: row.name, currency: curr })}
                                                            className="text-[12px] font-bold text-blue-400 hover:text-blue-600 transition-colors uppercase tracking-tight text-left"
                                                        >
                                                            {row.name}
                                                        </button>
                                                    </td>
                                                    <td className="py-4 px-4 text-center">
                                                        <span className="px-2 py-1 rounded bg-slate-100 text-slate-600 text-[11px] font-black">{row.count}</span>
                                                    </td>
                                                    <td className="py-4 text-right font-medium text-[12px] text-slate-400 tabular-nums px-4">{formatCurrency(row.debit)}</td>
                                                    <td className="py-4 text-right font-medium text-[12px] text-slate-400 tabular-nums px-4">{formatCurrency(row.credit)}</td>
                                                    <td className="py-4 text-right font-black text-[12px] text-slate-900 tabular-nums pl-4">{formatCurrency(row.debit - row.credit)}</td>
                                                </tr>
                                            ))}
                                            <tr className="border-t border-slate-200 bg-slate-50/30">
                                                <td colSpan={2} className="py-4 pr-4 pl-3 font-black text-[11px] text-slate-400 uppercase tracking-widest italic text-right">Period Result {curr}</td>
                                                <td className="py-4 text-right font-black text-[13px] text-slate-400 tabular-nums px-4">{formatCurrency(totalDebit)}</td>
                                                <td className="py-4 text-right font-black text-[13px] text-slate-400 tabular-nums px-4">{formatCurrency(totalCredit)}</td>
                                                <td className="py-4 text-right font-black text-[14px] text-indigo-600 tabular-nums pl-4 underline decoration-2 underline-offset-4">{formatCurrency(totalDebit - totalCredit)}</td>
                                            </tr>
                                            <tr className="h-4"></tr>
                                        </React.Fragment>
                                    );
                                })}
                            </tbody>
                            <tfoot>
                                <tr className="border-t-2 border-slate-900">
                                    <td className="py-4 font-black text-[12px] text-slate-900 uppercase tracking-widest">End of Report</td>
                                    <td colSpan={4} className="py-4 text-right text-slate-400 text-[10px] font-bold italic">
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

export default ViewCustomerTransactionsReportView;
