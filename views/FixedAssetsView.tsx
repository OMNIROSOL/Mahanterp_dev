import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Building,
  Plus,
  Search,
  Printer,
  ChevronRight,
  FolderOpen,
  Edit2,
  Trash2,
  Calendar,
  Layers,
  RefreshCw,
  TrendingDown
} from 'lucide-react';
import apiService from '../services/apiService';
import { formatDateDMY } from '../utils/dateUtils';
import { cn } from '../utils/cn';

interface FixedAsset {
  id: string;
  assetCode: string;
  assetName: string;
  description?: string;
  purchaseDate?: string;
  purchaseCost: number;
  depreciationRate: number;
  depreciationMethod: string;
  accumulatedDepreciation: number;
  bookValue: number;
  assetAccountName?: string;
  expenseAccountName?: string;
  status: string;
}

export const FixedAssetsView: React.FC = () => {
  const navigate = useNavigate();
  const [assets, setAssets] = useState<FixedAsset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await apiService.getFixedAssets();
      setAssets(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('Failed to load fixed assets:', err);
      setError('Could not load fixed assets.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this fixed asset?')) return;
    try {
      await apiService.deleteFixedAsset(id);
      setAssets(assets.filter(a => a.id !== id));
    } catch (err: any) {
      alert(err?.response?.data?.error || 'Failed to delete asset');
    }
  };

  const filteredAssets = assets.filter(a =>
    a.assetCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.assetName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (a.description || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalCost = filteredAssets.reduce((s, a) => s + Number(a.purchaseCost || 0), 0);
  const totalDeprec = filteredAssets.reduce((s, a) => s + Number(a.accumulatedDepreciation || 0), 0);
  const totalBookValue = filteredAssets.reduce((s, a) => s + Number(a.bookValue || 0), 0);

  const money = (n: number) =>
    Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="bg-slate-100 min-h-screen flex flex-col font-sans">
      {/* Breadcrumb */}
      <div className="bg-white px-8 py-3 border-b border-gray-200 flex items-center justify-between text-[11px] font-bold text-gray-400 uppercase tracking-widest select-none no-print">
        <div className="flex items-center space-x-2">
          <FolderOpen size={14} className="text-slate-400" />
          <ChevronRight size={10} className="opacity-30" />
          <span className="text-slate-600">Fixed Assets</span>
        </div>
        <div className="flex items-center gap-4 text-xs font-semibold normal-case text-gray-500">
          <Link to="/depreciation-entries" className="hover:text-blue-600 flex items-center gap-1 font-bold">
            <TrendingDown size={14} /> Depreciation Entries
          </Link>
        </div>
      </div>

      <div className="p-6 md:p-8 max-w-[1400px] mx-auto w-full space-y-6">
        {/* Header & Stats Card */}
        <div className="bg-white rounded-xl shadow-xs border border-gray-200 p-6 space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b border-gray-100">
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Fixed Assets</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Register property, plant, and equipment, track accumulated depreciation, and compute net book values.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Link
                to="/fixed-assets/new"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition-colors flex items-center gap-1.5 shadow-xs"
              >
                <Plus size={14} /> New Fixed Asset
              </Link>
              <Link
                to="/depreciation-entries"
                className="px-4 py-2 bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-bold hover:bg-slate-200 transition-colors flex items-center gap-1.5"
              >
                <TrendingDown size={14} /> Depreciation Entries
              </Link>
              <button
                onClick={() => window.print()}
                className="px-3.5 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-xs font-bold hover:bg-gray-50 transition-colors flex items-center gap-1.5"
              >
                <Printer size={13} /> Print
              </button>
            </div>
          </div>

          {/* Metric Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Total Assets</span>
              <span className="text-xl font-black text-slate-900 mt-1 block">
                {filteredAssets.length}
              </span>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Total Acquisition Cost</span>
              <span className="text-xl font-black text-slate-800 font-mono mt-1 block">
                ZMW {money(totalCost)}
              </span>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Accumulated Depreciation</span>
              <span className="text-xl font-black text-rose-700 font-mono mt-1 block">
                ZMW {money(totalDeprec)}
              </span>
            </div>
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
              <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider block">Net Book Value</span>
              <span className="text-xl font-black text-indigo-950 font-mono mt-1 block">
                ZMW {money(totalBookValue)}
              </span>
            </div>
          </div>

          {/* Search bar */}
          <div className="flex items-center justify-between gap-4 pt-2">
            <div className="relative max-w-sm w-full">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search assets by code, name, description..."
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

          {/* Assets Table */}
          <div className="overflow-x-auto border border-gray-200 rounded-lg">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 border-b border-gray-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-2.5 px-3">Code</th>
                  <th className="py-2.5 px-3">Asset Name</th>
                  <th className="py-2.5 px-3">Purchase Date</th>
                  <th className="py-2.5 px-3 text-right">Purchase Cost (ZMW)</th>
                  <th className="py-2.5 px-3 text-center">Deprec. Rate</th>
                  <th className="py-2.5 px-3 text-right">Accumulated Deprec. (ZMW)</th>
                  <th className="py-2.5 px-3 text-right">Book Value (ZMW)</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3 text-right no-print">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-sans">
                {isLoading ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-gray-400">
                      <RefreshCw size={18} className="animate-spin mx-auto mb-2 text-indigo-500" />
                      Loading fixed assets...
                    </td>
                  </tr>
                ) : filteredAssets.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-gray-400 italic">
                      No fixed assets found.
                    </td>
                  </tr>
                ) : (
                  filteredAssets.map((asset) => (
                    <tr key={asset.id} className="hover:bg-slate-50/70">
                      <td className="py-2 px-3 font-mono font-bold text-slate-800">
                        {asset.assetCode}
                      </td>
                      <td className="py-2 px-3 font-semibold text-slate-900">
                        {asset.assetName}
                        {asset.description && (
                          <span className="block text-[11px] text-gray-500 font-normal truncate max-w-xs">
                            {asset.description}
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-3 font-mono text-gray-600">
                        {formatDateDMY(asset.purchaseDate) || '—'}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-slate-800">
                        {money(asset.purchaseCost)}
                      </td>
                      <td className="py-2 px-3 text-center font-bold text-slate-600">
                        {asset.depreciationRate > 0 ? `${asset.depreciationRate}%` : '—'}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-rose-700">
                        {money(asset.accumulatedDepreciation)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-black text-indigo-700">
                        {money(asset.bookValue)}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <span className={cn(
                          "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                          asset.status === 'Active' ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"
                        )}>
                          {asset.status || 'Active'}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right space-x-2 no-print">
                        <button
                          onClick={() => navigate(`/fixed-assets/edit/${asset.id}`)}
                          className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors inline-block"
                          title="Edit"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          onClick={() => handleDelete(asset.id)}
                          className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors inline-block"
                          title="Delete"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {filteredAssets.length > 0 && (
                <tfoot className="border-t-2 border-slate-800 bg-slate-50 font-bold text-slate-900">
                  <tr>
                    <td colSpan={3} className="py-3 px-3 uppercase text-[10px] tracking-wider">Totals</td>
                    <td className="py-3 px-3 text-right font-mono">{money(totalCost)}</td>
                    <td></td>
                    <td className="py-3 px-3 text-right font-mono text-rose-700">{money(totalDeprec)}</td>
                    <td className="py-3 px-3 text-right font-mono text-indigo-700 font-black">{money(totalBookValue)}</td>
                    <td colSpan={2}></td>
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

export default FixedAssetsView;
