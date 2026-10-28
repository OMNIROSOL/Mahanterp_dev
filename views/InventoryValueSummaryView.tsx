import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Package,
  Printer,
  ChevronRight,
  FolderOpen,
  RefreshCw,
  Search,
  Building2
} from 'lucide-react';
import apiService from '../services/apiService';
import { getCompanyProfile } from '../utils/companyProfile';

interface InventoryValueRow {
  id: string;
  code: string;
  name: string;
  category: string;
  unit: string;
  qtyOnHand: number;
  unitCost: number;
  totalValue: number;
}

export const InventoryValueSummaryView: React.FC = () => {
  const navigate = useNavigate();
  const company = getCompanyProfile();

  const [rows, setRows] = useState<InventoryValueRow[]>([]);
  const [totals, setTotals] = useState<any>({ totalQty: 0, totalValue: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await apiService.getInventoryValueSummaryReport();
      setRows(data?.rows || []);
      setTotals(data?.totals || { totalQty: 0, totalValue: 0 });
    } catch (err: any) {
      console.error('Failed to load inventory value summary:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredRows = rows.filter(r =>
    r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const money = (n: number | undefined | null) =>
    Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="bg-slate-100 min-h-screen flex flex-col font-sans">
      {/* Breadcrumb */}
      <div className="bg-white px-8 py-3 border-b border-gray-200 flex items-center justify-between text-[11px] font-bold text-gray-400 uppercase tracking-widest select-none no-print">
        <div className="flex items-center space-x-2">
          <FolderOpen size={14} className="text-slate-400" />
          <ChevronRight size={10} className="opacity-30" />
          <Link to="/reports" className="hover:text-blue-600 transition-colors">Reports</Link>
          <ChevronRight size={10} className="opacity-30" />
          <span className="text-slate-600">Inventory Value Summary</span>
        </div>
        <div className="text-xs text-gray-500 font-medium normal-case">
          {company.name} • Mukwa Road, Lusaka
        </div>
      </div>

      <div className="p-6 md:p-8 max-w-[1400px] mx-auto w-full space-y-6">
        <div className="bg-white rounded-xl shadow-xs border border-gray-200 p-8 space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b border-gray-100">
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Inventory Value Summary</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Valuation of stock on hand based on moving average unit costs.
              </p>
            </div>

            <div className="flex items-center gap-2 no-print">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-xs font-bold hover:bg-gray-50 transition-colors flex items-center gap-1.5 shadow-xs"
              >
                <Printer size={13} /> Print Valuation
              </button>
            </div>
          </div>

          {/* Metric Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Total SKUs</span>
              <span className="text-xl font-black text-slate-900 mt-1 block">
                {filteredRows.length}
              </span>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Total Stock Units</span>
              <span className="text-xl font-black text-slate-800 font-mono mt-1 block">
                {Number(totals.totalQty || 0).toLocaleString()}
              </span>
            </div>
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
              <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider block">Total Inventory Valuation</span>
              <span className="text-xl font-black text-indigo-950 font-mono mt-1 block">
                ZMW {money(totals.totalValue)}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between gap-4 pt-2 no-print">
            <div className="relative max-w-sm w-full">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search inventory items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-9 pr-4 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={loadData}
              className="p-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 text-xs"
              title="Refresh"
            >
              <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
            </button>
          </div>

          <div className="overflow-x-auto border border-gray-200 rounded-lg">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 border-b border-gray-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-2.5 px-3">Item Code</th>
                  <th className="py-2.5 px-3">Item Name</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">Unit</th>
                  <th className="py-2.5 px-3 text-right">Qty on Hand</th>
                  <th className="py-2.5 px-3 text-right">Moving Average Cost</th>
                  <th className="py-2.5 px-3 text-right">Total Stock Value (ZMW)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-sans">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-gray-400">
                      <RefreshCw size={18} className="animate-spin mx-auto mb-2 text-indigo-500" />
                      Loading inventory valuations...
                    </td>
                  </tr>
                ) : filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-gray-400 italic">
                      No inventory items found.
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((row) => (
                    <tr
                      key={row.id}
                      onClick={() => navigate(`/items/ledger/${row.id}`)}
                      className="hover:bg-slate-50/70 cursor-pointer transition-colors"
                      title="Click to view item ledger"
                    >
                      <td className="py-2 px-3 font-mono text-gray-500">{row.code}</td>
                      <td className="py-2 px-3 font-semibold text-blue-700 hover:underline">{row.name}</td>
                      <td className="py-2 px-3 text-gray-600">{row.category}</td>
                      <td className="py-2 px-3 text-gray-500">{row.unit}</td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-slate-800">
                        {Number(row.qtyOnHand).toLocaleString()}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-slate-700">
                        {money(row.unitCost)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-black text-indigo-700">
                        {money(row.totalValue)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {filteredRows.length > 0 && (
                <tfoot className="border-t-2 border-slate-800 bg-slate-50 font-bold text-slate-900">
                  <tr>
                    <td colSpan={4} className="py-3 px-3 uppercase text-[10px] tracking-wider">Total Inventory</td>
                    <td className="py-3 px-3 text-right font-mono font-bold">{Number(totals.totalQty || 0).toLocaleString()}</td>
                    <td></td>
                    <td className="py-3 px-3 text-right font-mono text-indigo-900 font-black text-sm">{money(totals.totalValue)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InventoryValueSummaryView;
