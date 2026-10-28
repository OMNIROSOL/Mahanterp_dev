import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  TrendingDown,
  Plus,
  Trash2,
  Calendar,
  Building,
  RefreshCw,
  FolderOpen,
  ChevronRight,
  X,
  Printer,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import apiService from '../services/apiService';
import { formatDateDMY } from '../utils/dateUtils';

interface DepreciationEntry {
  id: string;
  assetId: string;
  assetCode: string;
  assetName: string;
  entryDate: string;
  amount: number;
  description?: string;
  createdAt?: string;
}

export const DepreciationEntriesView: React.FC = () => {
  const navigate = useNavigate();
  const [entries, setEntries] = useState<DepreciationEntry[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [formAssetId, setFormAssetId] = useState('');
  const [formEntryDate, setFormEntryDate] = useState(new Date().toISOString().slice(0, 10));
  const [formAmount, setFormAmount] = useState('0.00');
  const [formDescription, setFormDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [entriesData, assetsData] = await Promise.all([
        apiService.getDepreciationEntries(),
        apiService.getFixedAssets()
      ]);
      setEntries(Array.isArray(entriesData) ? entriesData : []);
      setAssets(Array.isArray(assetsData) ? assetsData : []);
      if (assetsData?.length && !formAssetId) {
        setFormAssetId(assetsData[0].id);
        calculateDefaultAmount(assetsData[0]);
      }
    } catch (err: any) {
      console.error('Failed to load depreciation data:', err);
      setError('Could not load depreciation entries.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const calculateDefaultAmount = (asset: any) => {
    if (!asset) return;
    const cost = Number(asset.purchaseCost || 0);
    const rate = Number(asset.depreciationRate || 10) / 100;
    // Monthly depreciation estimate
    const monthly = Math.round((cost * rate / 12) * 100) / 100;
    setFormAmount(String(monthly || '0.00'));
    setFormDescription(`Monthly depreciation - ${asset.assetName}`);
  };

  const handleAssetSelect = (assetId: string) => {
    setFormAssetId(assetId);
    const found = assets.find(a => a.id === assetId);
    if (found) calculateDefaultAmount(found);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(formAmount) || 0;
    if (!formAssetId || amt <= 0) {
      setError('Select an asset and enter a valid positive depreciation amount.');
      return;
    }

    setIsSaving(true);
    setError('');
    setMessage('');
    try {
      await apiService.createDepreciationEntry({
        assetId: formAssetId,
        entryDate: formEntryDate,
        amount: amt,
        description: formDescription
      });
      setMessage('Depreciation entry posted to General Ledger.');
      setShowModal(false);
      loadData();
    } catch (err: any) {
      setError(err?.response?.data?.error || err.message || 'Failed to post depreciation entry');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this depreciation entry? This will reverse accumulated depreciation and GL ledger entries.')) return;
    try {
      await apiService.deleteDepreciationEntry(id);
      setEntries(entries.filter(e => e.id !== id));
      setMessage('Depreciation entry removed and ledger reversed.');
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to delete entry');
    }
  };

  const totalAmount = entries.reduce((s, e) => s + Number(e.amount || 0), 0);
  const money = (n: number) =>
    Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="bg-slate-100 min-h-screen flex flex-col font-sans">
      {/* Breadcrumb */}
      <div className="bg-white px-8 py-3 border-b border-gray-200 flex items-center justify-between text-[11px] font-bold text-gray-400 uppercase tracking-widest select-none no-print">
        <div className="flex items-center space-x-2">
          <FolderOpen size={14} className="text-slate-400" />
          <ChevronRight size={10} className="opacity-30" />
          <Link to="/fixed-assets" className="hover:text-blue-600 transition-colors">Fixed Assets</Link>
          <ChevronRight size={10} className="opacity-30" />
          <span className="text-slate-600">Depreciation Entries</span>
        </div>
        <div className="text-xs font-semibold text-gray-500">
          General Ledger Depreciation
        </div>
      </div>

      <div className="p-6 md:p-8 max-w-[1400px] mx-auto w-full space-y-6">
        <div className="bg-white rounded-xl shadow-xs border border-gray-200 p-6 space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                <TrendingDown size={24} />
              </div>
              <div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">Depreciation Entries</h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Record periodic asset depreciation expenses and update accumulated depreciation on the balance sheet.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (assets.length) handleAssetSelect(assets[0].id);
                  setShowModal(true);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition-colors flex items-center gap-1.5 shadow-xs"
              >
                <Plus size={14} /> New Depreciation Entry
              </button>
              <Link
                to="/fixed-assets"
                className="px-4 py-2 bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-bold hover:bg-slate-200 transition-colors flex items-center gap-1.5"
              >
                <Building size={14} /> Fixed Assets Register
              </Link>
              <button
                onClick={() => window.print()}
                className="px-3.5 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-xs font-bold hover:bg-gray-50 transition-colors flex items-center gap-1.5"
              >
                <Printer size={13} /> Print
              </button>
            </div>
          </div>

          {message && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-lg text-xs font-bold flex items-center gap-2">
              <CheckCircle2 size={16} /> {message}
            </div>
          )}

          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-lg text-xs font-bold flex items-center gap-2">
              <AlertCircle size={16} /> {error}
            </div>
          )}

          <div className="overflow-x-auto border border-gray-200 rounded-lg">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 border-b border-gray-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-2.5 px-3">Entry Date</th>
                  <th className="py-2.5 px-3">Asset Code</th>
                  <th className="py-2.5 px-3">Asset Name</th>
                  <th className="py-2.5 px-3">Description</th>
                  <th className="py-2.5 px-3 text-right">Amount (ZMW)</th>
                  <th className="py-2.5 px-3 text-right no-print">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-sans">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-gray-400">
                      <RefreshCw size={18} className="animate-spin mx-auto mb-2 text-indigo-500" />
                      Loading entries...
                    </td>
                  </tr>
                ) : entries.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-gray-400 italic">
                      No depreciation entries recorded yet.
                    </td>
                  </tr>
                ) : (
                  entries.map((entry) => (
                    <tr key={entry.id} className="hover:bg-slate-50/70">
                      <td className="py-2 px-3 font-mono font-semibold text-slate-700">
                        {formatDateDMY(entry.entryDate)}
                      </td>
                      <td className="py-2 px-3 font-mono font-bold text-slate-800">
                        {entry.assetCode}
                      </td>
                      <td className="py-2 px-3 font-semibold text-slate-900">
                        {entry.assetName}
                      </td>
                      <td className="py-2 px-3 text-gray-600 max-w-sm truncate" title={entry.description}>
                        {entry.description || '—'}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-rose-700">
                        {money(entry.amount)}
                      </td>
                      <td className="py-2 px-3 text-right no-print">
                        <button
                          onClick={() => handleDelete(entry.id)}
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
              {entries.length > 0 && (
                <tfoot className="border-t-2 border-slate-800 bg-slate-50 font-bold text-slate-900">
                  <tr>
                    <td colSpan={4} className="py-3 px-3 uppercase text-[10px] tracking-wider">Total Depreciation</td>
                    <td className="py-3 px-3 text-right font-mono text-rose-700 font-black">
                      {money(totalAmount)}
                    </td>
                    <td className="no-print"></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl border border-gray-200 max-w-md w-full overflow-hidden">
            <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between">
              <span className="font-bold text-sm">Post Depreciation Entry</span>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-gray-700 font-bold mb-1">Fixed Asset:</label>
                <select
                  value={formAssetId}
                  onChange={(e) => handleAssetSelect(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-1.5 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                >
                  {assets.map((a) => (
                    <option key={a.id} value={a.id}>
                      [{a.assetCode}] {a.assetName} (Book Value: ZMW {money(a.bookValue)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-1">Entry Date:</label>
                <input
                  type="date"
                  value={formEntryDate}
                  onChange={(e) => setFormEntryDate(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-1.5 focus:ring-1 focus:ring-blue-500 focus:outline-none font-semibold"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-1">Depreciation Amount (ZMW):</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={formAmount}
                  onChange={(e) => setFormAmount(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-1.5 focus:ring-1 focus:ring-blue-500 focus:outline-none font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-1">Description:</label>
                <input
                  type="text"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Monthly depreciation entry"
                  className="w-full border border-gray-300 rounded px-3 py-1.5 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-1.5 border border-gray-300 rounded text-gray-700 hover:bg-gray-50 font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 font-bold text-xs shadow-xs"
                >
                  {isSaving ? 'Posting...' : 'Post Entry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DepreciationEntriesView;
