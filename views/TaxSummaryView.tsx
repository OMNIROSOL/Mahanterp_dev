import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Percent,
  Printer,
  ChevronRight,
  FolderOpen,
  RefreshCw,
  FileSpreadsheet,
  Building2,
  AlertCircle
} from 'lucide-react';
import apiService from '../services/apiService';
import { getCompanyProfile } from '../utils/companyProfile';
import { formatDateDMY } from '../utils/dateUtils';
import { cn } from '../utils/cn';

export const TaxSummaryView: React.FC = () => {
  const navigate = useNavigate();
  const company = getCompanyProfile();

  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const todayStr = now.toISOString().slice(0, 10);

  const [from, setFrom] = useState(firstDay);
  const [to, setTo] = useState(todayStr);
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const res = await apiService.getTaxSummaryReport({ from, to });
      setData(res);
    } catch (err: any) {
      console.error('Failed to load tax summary:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const money = (n: number | undefined | null) =>
    Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const netPayable = data?.netTaxPayable || 0;
  const isPayable = netPayable >= 0;

  return (
    <div className="bg-slate-100 min-h-screen flex flex-col font-sans">
      {/* Breadcrumb */}
      <div className="bg-white px-8 py-3 border-b border-gray-200 flex items-center justify-between text-[11px] font-bold text-gray-400 uppercase tracking-widest select-none no-print">
        <div className="flex items-center space-x-2">
          <FolderOpen size={14} className="text-slate-400" />
          <ChevronRight size={10} className="opacity-30" />
          <Link to="/reports" className="hover:text-blue-600 transition-colors">Reports</Link>
          <ChevronRight size={10} className="opacity-30" />
          <span className="text-slate-600">Tax Summary & Audit</span>
        </div>
        <div className="text-xs text-gray-500 font-medium normal-case">
          TPIN: {company.tpin} • Standard VAT 16%
        </div>
      </div>

      <div className="p-6 md:p-8 max-w-4xl mx-auto w-full space-y-6">
        <div className="bg-white rounded-xl shadow-xs border border-gray-200 p-8 space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b border-gray-100">
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Tax Summary & Audit</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Output VAT on sales, Input VAT on purchases, and net tax settlement payable to Zambia Revenue Authority (ZRA).
              </p>
            </div>

            <div className="flex items-center gap-2 no-print">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-xs font-bold hover:bg-gray-50 transition-colors flex items-center gap-1.5 shadow-xs"
              >
                <Printer size={13} /> Print Tax Return
              </button>
            </div>
          </div>

          {/* Date range filter */}
          <div className="flex flex-wrap items-center gap-3 text-xs no-print pb-4 border-b border-gray-100">
            <span className="font-semibold text-gray-500">Tax Period From:</span>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <span className="font-semibold text-gray-500">To:</span>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <button
              onClick={loadData}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-3 py-1.5 rounded text-xs transition-colors flex items-center gap-1"
            >
              <RefreshCw size={12} className={isLoading ? 'animate-spin' : ''} /> Recalculate
            </button>
          </div>

          {/* Net Settlement Banner */}
          <div className={cn(
            "rounded-xl p-6 border flex flex-col md:flex-row items-start md:items-center justify-between gap-4",
            isPayable
              ? "bg-amber-50/60 border-amber-300 text-amber-950"
              : "bg-emerald-50/60 border-emerald-300 text-emerald-950"
          )}>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider block text-slate-600">
                {isPayable ? "Net VAT Payable to ZRA" : "Net VAT Refundable from ZRA"}
              </span>
              <span className="text-3xl font-black font-mono mt-1 block">
                ZMW {money(Math.abs(netPayable))}
              </span>
              <p className="text-xs text-gray-600 mt-1">
                Period: {formatDateDMY(from)} to {formatDateDMY(to)}
              </p>
            </div>
            <div className="text-right">
              <span className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-white border border-gray-200">
                {isPayable ? "Liability" : "Refund Asset"}
              </span>
            </div>
          </div>

          {/* Detailed Tax Breakdown Table */}
          <div className="overflow-x-auto border border-gray-200 rounded-lg">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 border-b border-gray-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Tax Component</th>
                  <th className="py-3 px-4 text-center">Tax Rate</th>
                  <th className="py-3 px-4 text-right">Net Taxable Amount (ZMW)</th>
                  <th className="py-3 px-4 text-right">Tax Amount (ZMW)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-sans">
                {isLoading ? (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-gray-400">
                      <RefreshCw size={18} className="animate-spin mx-auto mb-2 text-indigo-500" />
                      Loading tax calculations...
                    </td>
                  </tr>
                ) : (
                  <>
                    {/* Output VAT */}
                    <tr className="hover:bg-slate-50/70 font-medium">
                      <td className="py-3 px-4 font-semibold text-slate-800">
                        Output VAT on Sales & Services (Invoices minus Credit Notes)
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-slate-600">16%</td>
                      <td className="py-3 px-4 text-right font-mono text-slate-800">
                        {money(data?.outputTaxableSales)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700">
                        {money(data?.outputVat)}
                      </td>
                    </tr>

                    {/* Input VAT */}
                    <tr className="hover:bg-slate-50/70 font-medium">
                      <td className="py-3 px-4 font-semibold text-slate-800">
                        Input VAT on Purchases & Expenses (Bills minus Debit Notes)
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-slate-600">16%</td>
                      <td className="py-3 px-4 text-right font-mono text-slate-800">
                        {money(data?.inputTaxablePurchases)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-rose-700">
                        ({money(data?.inputVat)})
                      </td>
                    </tr>
                  </>
                )}
              </tbody>
              <tfoot className="border-t-2 border-slate-800 bg-slate-50 font-bold text-slate-900">
                <tr>
                  <td colSpan={3} className="py-3 px-4 uppercase text-[11px] tracking-wider text-right">
                    Net VAT Position for Period:
                  </td>
                  <td className={cn(
                    "py-3 px-4 text-right font-mono text-sm font-black",
                    isPayable ? "text-amber-800" : "text-emerald-800"
                  )}>
                    ZMW {money(data?.netTaxPayable)}
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

export default TaxSummaryView;
