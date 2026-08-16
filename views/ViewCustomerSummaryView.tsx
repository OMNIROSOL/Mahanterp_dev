import React, { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ChevronLeft,
  Printer,
  Download,
  Share2,
  Calendar,
  Users,
  FileSpreadsheet
} from 'lucide-react';
import { cn } from '../utils/cn';
import { exportToPDF, exportToCSV } from '../utils/exportUtils';

import apiService from '../services/apiService';

interface CustomerSummaryData {
  customer: string;
  openingBalance: number;
  invoices: number;
  receipts: number;
  journalEntries: number;
  creditNotes: number;
  refunds: number;
  closingBalance: number;
  currency: string;
}

const ViewCustomerSummaryView: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  const report = useMemo(() => {
    const saved = localStorage.getItem('customer_summary_reports');
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

  const [dbData, setDbData] = React.useState<CustomerSummaryData[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const [customers, invoices] = await Promise.all([
          apiService.getCustomers(),
          apiService.getInvoices()
        ]);

        const summary = customers.map(cust => {
          const custInvoices = invoices.filter(inv => (inv.customerId === cust.id || inv.customer?.id === cust.id) && inv.status !== 'Draft');
          
          const totalInvoiced = custInvoices.reduce((acc, inv) => acc + (parseFloat(inv.grandTotal) || 0), 0);
          const totalPaid = custInvoices.filter(inv => inv.status === 'Paid').reduce((acc, inv) => acc + (parseFloat(inv.grandTotal) || 0), 0);

          return {
            customer: cust.name,
            openingBalance: 0, // Placeholder
            invoices: totalInvoiced,
            receipts: totalPaid,
            journalEntries: 0,
            creditNotes: 0,
            refunds: 0,
            closingBalance: totalInvoiced - totalPaid,
            currency: cust.currency?.split(' - ')[0] || 'ZMW'
          };
        }).filter(s => s.invoices > 0 || s.closingBalance !== 0);

        setDbData(summary);
      } catch (err) {
        console.error('Failed to load summary data:', err);
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

  const handleExportPDF = () => {
    const headers = ['Currency', 'Customer Name', 'Opening balance', 'Invoices', 'Receipts', 'Journal Entries', 'Credit Notes', 'Refunds', 'Closing balance'];
    const rows: any[][] = [];
    currencies.forEach(curr => {
      groupedData[curr].forEach(row => {
        rows.push([curr, row.customer, row.openingBalance.toFixed(2), row.invoices.toFixed(2), row.receipts.toFixed(2), row.journalEntries.toFixed(2), row.creditNotes.toFixed(2), row.refunds.toFixed(2), row.closingBalance.toFixed(2)]);
      });
    });
    exportToPDF('Customer Summary', 'customer_summary', headers, rows);
  };

  const handleExportCSV = () => {
    const headers = ['Currency', 'Customer Name', 'Opening balance', 'Invoices', 'Receipts', 'Journal Entries', 'Credit Notes', 'Refunds', 'Closing balance'];
    const rows: any[][] = [];
    currencies.forEach(curr => {
      groupedData[curr].forEach(row => {
        rows.push([curr, row.customer, row.openingBalance.toFixed(2), row.invoices.toFixed(2), row.receipts.toFixed(2), row.journalEntries.toFixed(2), row.creditNotes.toFixed(2), row.refunds.toFixed(2), row.closingBalance.toFixed(2)]);
      });
    });
    exportToCSV('customer_summary', headers, rows);
  };

  const groupedData = useMemo(() => {
    const groups: Record<string, CustomerSummaryData[]> = {};
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
    return <div className="p-20 text-center font-bold text-slate-400">LOADING DATABASE SUMMARY...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50/50 p-8 space-y-8 animate-in fade-in duration-700 font-sans">
      {/* Action Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 max-w-[1400px] mx-auto">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/reports/customer-summary')}
            className="w-10 h-10 flex items-center justify-center bg-white border border-slate-200 rounded-full hover:bg-slate-50 transition-colors shadow-sm text-slate-400 hover:text-indigo-600"
          >
            <ChevronLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Summary Details</h1>
            <p className="text-[12px] font-medium text-slate-500 uppercase tracking-widest">ID: {id?.replace('cs-report-', '')}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-[12px] font-black hover:bg-slate-50 transition-all shadow-sm text-slate-600 uppercase tracking-widest">
            <Share2 size={16} /> Share
          </button>
          <button onClick={handleExportCSV} className="flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-200 rounded-xl text-[12px] font-black hover:bg-emerald-100 transition-all shadow-sm text-emerald-600 uppercase tracking-widest">
            <FileSpreadsheet size={16} /> Excel
          </button>
          <button onClick={handleExportPDF} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-[12px] font-black hover:bg-slate-50 transition-all shadow-sm text-slate-600 uppercase tracking-widest">
            <Download size={16} /> PDF
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-6 py-2 bg-indigo-600 border border-indigo-700 rounded-xl text-[12px] font-black hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 text-white uppercase tracking-widest"
          >
            <Printer size={16} /> Print
          </button>
        </div>
      </div>

      {/* Report Document */}
      <div className="max-w-[1400px] mx-auto bg-white rounded-[32px] shadow-2xl shadow-slate-200/50 border border-slate-100 overflow-hidden print:border-none print:shadow-none print:rounded-none">
        <div className="p-8 space-y-8">
          {/* Document Header */}
          <div className="text-center space-y-1">
            <h2 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">MAHANT INVESTMENT LTD</h2>
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">Customer Summary</h3>
          </div>

          {/* Report Metadata */}
          <div className="flex justify-between items-end border-b border-slate-100 pb-6 text-slate-400">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 border border-indigo-100">
                  <Calendar size={14} />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest block text-slate-400">Analysis Period</span>
                  <span className="text-[12px] font-bold text-slate-700">
                    {report?.fromDate || '01.04.2026'} — {report?.toDate || report?.date || '30.04.2026'}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-8 text-right">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest block mb-0.5 text-slate-400">Total Accounts</span>
                <span className="text-[12px] font-bold text-slate-900">{dbData.length}</span>
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest block mb-0.5">Division</span>
                <span className="text-[12px] font-bold text-slate-900">{report?.division || 'All Divisions'}</span>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-slate-900">
                  <th className="py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-900">Customer Name</th>
                  <th className="py-3 text-right text-[10px] font-black uppercase tracking-widest text-slate-900">Opening balance</th>
                  <th className="py-3 text-right text-[10px] font-black uppercase tracking-widest text-slate-900">Invoices</th>
                  <th className="py-3 text-right text-[10px] font-black uppercase tracking-widest text-slate-900">Receipts</th>
                  <th className="py-3 text-right text-[10px] font-black uppercase tracking-widest text-slate-900">Journal Entries</th>
                  <th className="py-3 text-right text-[10px] font-black uppercase tracking-widest text-slate-900">Credit Notes</th>
                  <th className="py-3 text-right text-[10px] font-black uppercase tracking-widest text-slate-900">Refunds</th>
                  <th className="py-3 text-right text-[10px] font-black uppercase tracking-widest text-slate-900">Closing balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {currencies.map(curr => (
                  <React.Fragment key={curr}>
                    {/* Currency Group Header */}
                    <tr className="bg-slate-50/80">
                      <td colSpan={8} className="py-2 px-3">
                        <span className="text-[11px] font-black text-slate-900 uppercase tracking-widest">{curr}</span>
                      </td>
                    </tr>
                    {groupedData[curr].map((row, idx) => (
                      <tr key={idx} className="group hover:bg-slate-50/50 transition-colors">
                        <td className="py-2.5 pr-6 pl-3">
                          <span className="text-[12px] font-bold text-blue-400 group-hover:text-blue-600 transition-colors uppercase tracking-tight">{row.customer}</span>
                        </td>
                        <td className="py-1.5 text-right font-medium text-[12px] text-slate-600 tabular-nums">{formatCurrency(row.openingBalance)}</td>
                        <td className="py-1.5 text-right font-medium text-[12px] text-slate-600 tabular-nums">{formatCurrency(row.invoices)}</td>
                        <td className="py-1.5 text-right font-medium text-[12px] text-emerald-600 tabular-nums">{formatCurrency(row.receipts)}</td>
                        <td className="py-1.5 text-right font-medium text-[12px] text-slate-600 tabular-nums">{formatCurrency(row.journalEntries)}</td>
                        <td className="py-1.5 text-right font-medium text-[12px] text-rose-600 tabular-nums">{formatCurrency(row.creditNotes)}</td>
                        <td className="py-1.5 text-right font-medium text-[12px] text-slate-600 tabular-nums">{formatCurrency(row.refunds)}</td>
                        <td className="py-1.5 text-right font-black text-[12px] text-slate-900 tabular-nums">{formatCurrency(row.closingBalance)}</td>
                      </tr>
                    ))}
                    {/* Currency Sub-total */}
                    <tr className="border-t border-slate-200 bg-slate-50/30">
                      <td className="py-2 pr-6 pl-3 font-black text-[11px] text-slate-700 uppercase tracking-widest italic text-right">Total {curr}</td>
                      <td className="py-2 text-right font-black text-[11px] text-slate-900 tabular-nums">{formatCurrency(groupedData[curr].reduce((acc, r) => acc + r.openingBalance, 0))}</td>
                      <td className="py-2 text-right font-black text-[11px] text-slate-900 tabular-nums">{formatCurrency(groupedData[curr].reduce((acc, r) => acc + r.invoices, 0))}</td>
                      <td className="py-2 text-right font-black text-[11px] text-emerald-600 tabular-nums">{formatCurrency(groupedData[curr].reduce((acc, r) => acc + r.receipts, 0))}</td>
                      <td className="py-2 text-right font-black text-[11px] text-slate-900 tabular-nums">{formatCurrency(groupedData[curr].reduce((acc, r) => acc + r.journalEntries, 0))}</td>
                      <td className="py-2 text-right font-black text-[11px] text-rose-600 tabular-nums">{formatCurrency(groupedData[curr].reduce((acc, r) => acc + r.creditNotes, 0))}</td>
                      <td className="py-2 text-right font-black text-[11px] text-slate-900 tabular-nums">{formatCurrency(groupedData[curr].reduce((acc, r) => acc + r.refunds, 0))}</td>
                      <td className="py-2 text-right font-black text-[12px] text-indigo-600 tabular-nums underline decoration-1 underline-offset-2">
                        {formatCurrency(groupedData[curr].reduce((acc, r) => acc + r.closingBalance, 0))}
                      </td>
                    </tr>
                    {/* Spacer row */}
                    <tr className="h-4"></tr>
                  </React.Fragment>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-900">
                  <td className="py-4 font-black text-[12px] text-slate-900 uppercase tracking-widest">End of Report</td>
                  <td colSpan={7} className="py-4 text-right text-slate-400 text-[10px] font-bold italic">
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

export default ViewCustomerSummaryView;
