import React, { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  ChevronLeft, 
  Printer, 
  Download, 
  Share2, 
  Calendar,
  Users,
  Search,
  FileSpreadsheet
} from 'lucide-react';
import apiService from '../services/apiService';
import { cn } from '../utils/cn';
import { exportToPDF, exportToCSV } from '../utils/exportUtils';

interface SalesInvoiceTotalRow {
  customer: string;
  invoiceCount: number;
  totalValue: number;
  paidAmount: number;
  balance: number;
  currency: string;
}

const ViewSalesInvoiceTotalsByCustomerReportView: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  // Mock fetching report metadata
  const report = useMemo(() => {
    // In a real app, this would fetch from localStorage or API
    return {
      id: id,
      fromDate: '01.03.2026',
      toDate: '31.03.2026',
      description: 'Q1 Sales Performance Summary',
      division: 'All Divisions'
    };
  }, [id]);

  const [customers, setCustomers] = React.useState<any[]>([]);
  const [allInvoices, setAllInvoices] = React.useState<any[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const [custs, invs] = await Promise.all([
          apiService.getCustomers(),
          apiService.getInvoices()
        ]);
        setCustomers(custs);
        setAllInvoices(invs);
      } catch (err) {
        console.error('Failed to load report data:', err);
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
    const headers = ['Currency', 'Customer Name', 'Invoice Count', 'Total Invoiced', 'Total Paid', 'Outstanding Balance'];
    const rows: any[][] = [];
    currencies.forEach(curr => {
      groupedData[curr].forEach(row => {
        rows.push([curr, row.customer, row.invoiceCount, row.totalValue.toFixed(2), row.paidAmount.toFixed(2), row.balance.toFixed(2)]);
      });
    });
    exportToPDF('Sales Invoice Totals By Customer', 'sales_totals_by_customer', headers, rows);
  };

  const handleExportCSV = () => {
    const headers = ['Currency', 'Customer Name', 'Invoice Count', 'Total Invoiced', 'Total Paid', 'Outstanding Balance'];
    const rows: any[][] = [];
    currencies.forEach(curr => {
      groupedData[curr].forEach(row => {
        rows.push([curr, row.customer, row.invoiceCount, row.totalValue.toFixed(2), row.paidAmount.toFixed(2), row.balance.toFixed(2)]);
      });
    });
    exportToCSV('sales_totals_by_customer', headers, rows);
  };

  // Aggregate totals by customer
  const totalsByCustomer = useMemo(() => {
    return customers.map(customer => {
      const customerInvoices = allInvoices.filter(inv => 
        (inv.customerId === customer.id || inv.customer?.id === customer.id) &&
        inv.status !== 'Draft'
      );

      const totalValue = customerInvoices.reduce((sum, inv) => sum + (parseFloat(inv.grandTotal) || 0), 0);
      const paidAmount = customerInvoices.reduce((sum, inv) => 
        sum + (inv.status === 'Paid' ? (parseFloat(inv.grandTotal) || 0) : 0), 0
      );

      return {
        customer: customer.name,
        invoiceCount: customerInvoices.length,
        totalValue: totalValue,
        paidAmount: paidAmount,
        balance: totalValue - paidAmount,
        currency: customer.currency?.split(' - ')[0] || 'ZMW'
      };
    }).filter(row => row.invoiceCount > 0);
  }, [customers, allInvoices]);

  const groupedData = useMemo(() => {
    const groups: Record<string, SalesInvoiceTotalRow[]> = {};
    totalsByCustomer.forEach(item => {
      if (!groups[item.currency]) groups[item.currency] = [];
      groups[item.currency].push(item);
    });
    return groups;
  }, [totalsByCustomer]);

  const currencies = useMemo(() => {
    return Object.keys(groupedData).sort((a, b) => {
      if (a === 'ZMW') return -1;
      if (b === 'ZMW') return 1;
      return a.localeCompare(b);
    });
  }, [groupedData]);

  if (isLoading) {
    return <div className="p-20 text-center font-bold text-slate-400">LOADING DATABASE REPORT...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50/50 p-8 space-y-8 animate-in fade-in duration-700 font-sans">
      {/* Action Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 max-w-[1400px] mx-auto">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/reports/sales-invoice-totals-by-customer')}
            className="w-10 h-10 flex items-center justify-center bg-white border border-slate-200 rounded-full hover:bg-slate-50 transition-colors shadow-sm text-slate-400 hover:text-indigo-600"
          >
            <ChevronLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Report Details</h1>
            <p className="text-[12px] font-medium text-slate-500 uppercase tracking-widest">ID: {id?.replace('sit-report-', '')}</p>
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
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">Sales Invoice Totals by Customer</h3>
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
                    {report?.fromDate} — {report?.toDate}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-8 text-right">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest block mb-0.5 text-slate-400">Customers Analyzed</span>
                <span className="text-[12px] font-bold text-slate-900">{totalsByCustomer.length}</span>
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest block mb-0.5">Division</span>
                <span className="text-[12px] font-bold text-slate-900">{report?.division}</span>
              </div>
            </div>
          </div>

          {/* Table Area */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-slate-900">
                  <th className="py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-900">Customer Name</th>
                  <th className="py-3 text-right text-[10px] font-black uppercase tracking-widest text-slate-900">Invoice Count</th>
                  <th className="py-3 text-right text-[10px] font-black uppercase tracking-widest text-slate-900">Total Invoiced</th>
                  <th className="py-3 text-right text-[10px] font-black uppercase tracking-widest text-slate-900">Total Paid</th>
                  <th className="py-3 text-right text-[10px] font-black uppercase tracking-widest text-slate-900">Outstanding Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {currencies.map(curr => (
                  <React.Fragment key={curr}>
                    {/* Currency Group Header */}
                    <tr className="bg-slate-50/80">
                      <td colSpan={5} className="py-2 px-3">
                        <span className="text-[11px] font-black text-slate-900 uppercase tracking-widest">{curr}</span>
                      </td>
                    </tr>
                    {groupedData[curr].map((row, idx) => (
                      <tr key={idx} className="group hover:bg-slate-50/50 transition-colors">
                        <td className="py-2.5 pr-6 pl-3">
                          <span className="text-[12px] font-bold text-blue-400 group-hover:text-blue-600 transition-colors uppercase tracking-tight">{row.customer}</span>
                        </td>
                        <td className="py-1.5 text-right font-medium text-[12px] text-slate-500 tabular-nums">{row.invoiceCount}</td>
                        <td className="py-1.5 text-right font-medium text-[12px] text-slate-900 tabular-nums">{formatCurrency(row.totalValue)}</td>
                        <td className="py-1.5 text-right font-medium text-[12px] text-emerald-600 tabular-nums">{formatCurrency(row.paidAmount)}</td>
                        <td className="py-1.5 text-right font-black text-[12px] text-indigo-600 tabular-nums">{formatCurrency(row.balance)}</td>
                      </tr>
                    ))}
                    {/* Currency Sub-total */}
                    <tr className="border-t border-slate-200 bg-slate-50/30">
                      <td className="py-2 pr-6 pl-3 font-black text-[11px] text-slate-700 uppercase tracking-widest italic text-right" colSpan={2}>Total {curr}</td>
                      <td className="py-2 text-right font-black text-[11px] text-slate-900 tabular-nums">{formatCurrency(groupedData[curr].reduce((acc, r) => acc + r.totalValue, 0))}</td>
                      <td className="py-2 text-right font-black text-[11px] text-emerald-600 tabular-nums">{formatCurrency(groupedData[curr].reduce((acc, r) => acc + r.paidAmount, 0))}</td>
                      <td className="py-2 text-right font-black text-[12px] text-indigo-600 tabular-nums underline decoration-1 underline-offset-2">
                        {formatCurrency(groupedData[curr].reduce((acc, r) => acc + r.balance, 0))}
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
                  <td colSpan={4} className="py-4 text-right text-slate-400 text-[10px] font-bold italic">
                    * Values are presented in their respective transaction currencies. Balances reflect outstanding invoices for the selected period.
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

export default ViewSalesInvoiceTotalsByCustomerReportView;
