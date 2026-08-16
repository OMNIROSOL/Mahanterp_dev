import React, { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ChevronLeft,
  Printer,
  Download,
  Share2,
  FileText,
  Calendar,
  Building2,
  Filter,
  FileSpreadsheet
} from 'lucide-react';
import apiService from '../services/apiService';
import { exportToPDF, exportToCSV } from '../utils/exportUtils';

interface AgingData {
  customer: string;
  current: number;
  days1_30: number;
  days31_60: number;
  days61_90: number;
  days90Plus: number;
  lessCredit: number;
  total: number;
  currency: string;
}

const ViewAgedReceivableReportView: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  const report = useMemo(() => {
    const saved = localStorage.getItem('aged_receivable_reports');
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

  const [dbData, setDbData] = React.useState<AgingData[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const [customers, invoices] = await Promise.all([
          apiService.getCustomers(),
          apiService.getInvoices()
        ]);

        const today = new Date();
        const aging = customers.map(cust => {
          const custInvoices = invoices.filter(inv => (inv.customerId === cust.id || inv.customer?.id === cust.id) && inv.status !== 'Draft' && inv.status !== 'Paid');
          
          let current = 0, d1_30 = 0, d31_60 = 0, d61_90 = 0, d90Plus = 0;
          
          custInvoices.forEach(inv => {
            const dueDate = new Date(inv.dueDate || inv.issueDate || inv.createdAt);
            const diffDays = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 3600 * 24));
            const amount = parseFloat(inv.grandTotal) || 0;

            if (diffDays <= 0) current += amount;
            else if (diffDays <= 30) d1_30 += amount;
            else if (diffDays <= 60) d31_60 += amount;
            else if (diffDays <= 90) d61_90 += amount;
            else d90Plus += amount;
          });

          return {
            customer: cust.name,
            current,
            days1_30: d1_30,
            days31_60: d31_60,
            days61_90: d61_90,
            days90Plus: d90Plus,
            lessCredit: 0,
            total: current + d1_30 + d31_60 + d61_90 + d90Plus,
            currency: cust.currency?.split(' - ')[0] || 'ZMW'
          };
        }).filter(a => a.total > 0);

        setDbData(aging);
      } catch (err) {
        console.error('Failed to load aging data:', err);
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
    const headers = ['Currency', 'Customer Name', 'Current', '1-30 days', '31-60 days', '61-90 days', '90+ days', 'Less: Credit', 'Total'];
    const rows: any[][] = [];
    currencies.forEach(curr => {
      groupedData[curr].forEach(row => {
        rows.push([curr, row.customer, row.current.toFixed(2), row.days1_30.toFixed(2), row.days31_60.toFixed(2), row.days61_90.toFixed(2), row.days90Plus.toFixed(2), row.lessCredit.toFixed(2), row.total.toFixed(2)]);
      });
    });
    exportToPDF('Aged Receivables Report', 'aged_receivables_report', headers, rows);
  };

  const handleExportCSV = () => {
    const headers = ['Currency', 'Customer Name', 'Current', '1-30 days', '31-60 days', '61-90 days', '90+ days', 'Less: Credit', 'Total'];
    const rows: any[][] = [];
    currencies.forEach(curr => {
      groupedData[curr].forEach(row => {
        rows.push([curr, row.customer, row.current.toFixed(2), row.days1_30.toFixed(2), row.days31_60.toFixed(2), row.days61_90.toFixed(2), row.days90Plus.toFixed(2), row.lessCredit.toFixed(2), row.total.toFixed(2)]);
      });
    });
    exportToCSV('aged_receivables_report', headers, rows);
  };

  const groupedData = useMemo(() => {
    const groups: Record<string, AgingData[]> = {};
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
    return <div className="p-20 text-center font-bold text-slate-400">LOADING DATABASE AGING...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50/50 p-8 space-y-8 animate-in fade-in duration-700 font-sans">
      {/* Action Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 max-w-[1400px] mx-auto">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/reports/aged-receivables')}
            className="w-10 h-10 flex items-center justify-center bg-white border border-slate-200 rounded-full hover:bg-slate-50 transition-colors shadow-sm text-slate-400 hover:text-indigo-600"
          >
            <ChevronLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Report Details</h1>
            <p className="text-[12px] font-medium text-slate-500 uppercase tracking-widest">ID: {id?.replace('report-', '')}</p>
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
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">Aged Receivables</h3>
          </div>

          {/* Report Metadata */}
          <div className="flex justify-between items-end border-b border-slate-100 pb-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                  <Calendar size={14} />
                </div>
                <div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Report Date</span>
                  <span className="text-[12px] font-bold text-slate-700">{report?.date || '10 April 2026'}</span>
                </div>
              </div>
            </div>
            <div className="text-right">
              {/* Status section removed */}
            </div>
          </div>

          {/* Aging Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-slate-900">
                  <th className="py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-900">Customer Name</th>
                  <th className="py-2 text-right text-[10px] font-black uppercase tracking-widest text-slate-900">Current</th>
                  <th className="py-2 text-right text-[10px] font-black uppercase tracking-widest text-slate-900">1-30 days</th>
                  <th className="py-2 text-right text-[10px] font-black uppercase tracking-widest text-slate-900">31-60 days</th>
                  <th className="py-2 text-right text-[10px] font-black uppercase tracking-widest text-slate-900">61-90 days</th>
                  <th className="py-2 text-right text-[10px] font-black uppercase tracking-widest text-slate-900">90+ days</th>
                  <th className="py-2 text-right text-[10px] font-black uppercase tracking-widest text-slate-900">Less: Credit</th>
                  <th className="py-2 text-right text-[10px] font-black uppercase tracking-widest text-slate-900">Total</th>
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
                        <td className="py-1.5 text-right font-medium text-[12px] text-slate-600 tabular-nums">{formatCurrency(row.current)}</td>
                        <td className="py-1.5 text-right font-medium text-[12px] text-slate-600 tabular-nums">{formatCurrency(row.days1_30)}</td>
                        <td className="py-1.5 text-right font-medium text-[12px] text-slate-600 tabular-nums">{formatCurrency(row.days31_60)}</td>
                        <td className="py-1.5 text-right font-medium text-[12px] text-slate-600 tabular-nums">{formatCurrency(row.days61_90)}</td>
                        <td className="py-1.5 text-right font-medium text-[12px] text-slate-600 tabular-nums">{formatCurrency(row.days90Plus)}</td>
                        <td className="py-1.5 text-right font-medium text-[12px] text-slate-400 tabular-nums">{formatCurrency(row.lessCredit)}</td>
                        <td className="py-1.5 text-right font-black text-[12px] text-slate-900 tabular-nums">{formatCurrency(row.total)}</td>
                      </tr>
                    ))}
                    {/* Currency Sub-total */}
                    <tr className="border-t border-slate-200 bg-slate-50/30">
                      <td className="py-2 pr-8 pl-3 font-black text-[11px] text-slate-700 uppercase tracking-widest italic text-right">Total {curr}</td>
                      <td className="py-2 text-right font-black text-[11px] text-slate-900 tabular-nums">{formatCurrency(groupedData[curr].reduce((acc, r) => acc + r.current, 0))}</td>
                      <td className="py-2 text-right font-black text-[11px] text-slate-900 tabular-nums">{formatCurrency(groupedData[curr].reduce((acc, r) => acc + r.days1_30, 0))}</td>
                      <td className="py-2 text-right font-black text-[11px] text-slate-900 tabular-nums">{formatCurrency(groupedData[curr].reduce((acc, r) => acc + r.days31_60, 0))}</td>
                      <td className="py-2 text-right font-black text-[11px] text-slate-900 tabular-nums">{formatCurrency(groupedData[curr].reduce((acc, r) => acc + r.days61_90, 0))}</td>
                      <td className="py-2 text-right font-black text-[11px] text-slate-900 tabular-nums">{formatCurrency(groupedData[curr].reduce((acc, r) => acc + r.days90Plus, 0))}</td>
                      <td className="py-2 text-right font-black text-[11px] text-slate-400 tabular-nums">{formatCurrency(groupedData[curr].reduce((acc, r) => acc + r.lessCredit, 0))}</td>
                      <td className="py-2 text-right font-black text-[12px] text-indigo-600 tabular-nums underline decoration-1 underline-offset-2">
                        {formatCurrency(groupedData[curr].reduce((acc, r) => acc + r.total, 0))}
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

export default ViewAgedReceivableReportView;
