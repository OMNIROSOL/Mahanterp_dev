import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  Building,
  Save,
  ChevronRight,
  FolderOpen,
  ArrowLeft,
  AlertCircle
} from 'lucide-react';
import apiService from '../services/apiService';

export const NewFixedAssetView: React.FC = () => {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [assetCode, setAssetCode] = useState('');
  const [assetName, setAssetName] = useState('');
  const [description, setDescription] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().slice(0, 10));
  const [purchaseCost, setPurchaseCost] = useState('0.00');
  const [depreciationRate, setDepreciationRate] = useState('10');
  const [depreciationMethod, setDepreciationMethod] = useState('Straight Line');
  const [assetAccountId, setAssetAccountId] = useState('');
  const [expenseAccountId, setExpenseAccountId] = useState('');
  const [status, setStatus] = useState('Active');

  const [accounts, setAccounts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    apiService.getAccounts().then((data) => {
      const list = Array.isArray(data) ? data : [];
      setAccounts(list);
      // Auto-select standard accounts if available
      const assetAcc = list.find((a: any) => /fixed|equipment|vehicle|plant|asset/i.test(a.name) && a.accountType === 'Asset');
      const expAcc = list.find((a: any) => /deprec/i.test(a.name) && a.accountType === 'Expense');
      if (assetAcc && !assetAccountId) setAssetAccountId(assetAcc.id);
      if (expAcc && !expenseAccountId) setExpenseAccountId(expAcc.id);
    }).catch(console.error);

    if (id) {
      setIsLoading(true);
      apiService.getFixedAsset(id)
        .then((data) => {
          if (data) {
            setAssetCode(data.assetCode || '');
            setAssetName(data.assetName || '');
            setDescription(data.description || '');
            if (data.purchaseDate) {
              setPurchaseDate(new Date(data.purchaseDate).toISOString().slice(0, 10));
            }
            setPurchaseCost(String(data.purchaseCost || '0.00'));
            setDepreciationRate(String(data.depreciationRate || '10'));
            setDepreciationMethod(data.depreciationMethod || 'Straight Line');
            if (data.assetAccountId) setAssetAccountId(data.assetAccountId);
            if (data.expenseAccountId) setExpenseAccountId(data.expenseAccountId);
            if (data.status) setStatus(data.status);
          }
        })
        .catch((err) => setError(err?.message || 'Failed to load fixed asset'))
        .finally(() => setIsLoading(false));
    }
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assetCode || !assetName) {
      setError('Asset code and name are required.');
      return;
    }

    setIsSaving(true);
    setError('');
    try {
      const payload = {
        assetCode,
        assetName,
        description,
        purchaseDate,
        purchaseCost: parseFloat(purchaseCost) || 0,
        depreciationRate: parseFloat(depreciationRate) || 0,
        depreciationMethod,
        assetAccountId: assetAccountId || null,
        expenseAccountId: expenseAccountId || null,
        status
      };

      if (isEdit && id) {
        await apiService.updateFixedAsset(id, payload);
      } else {
        await apiService.createFixedAsset(payload);
      }
      navigate('/fixed-assets');
    } catch (err: any) {
      setError(err?.response?.data?.error || err.message || 'Failed to save fixed asset');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-slate-100 min-h-screen flex flex-col font-sans">
      {/* Breadcrumb */}
      <div className="bg-white px-8 py-3 border-b border-gray-200 flex items-center justify-between text-[11px] font-bold text-gray-400 uppercase tracking-widest select-none">
        <div className="flex items-center space-x-2">
          <FolderOpen size={14} className="text-slate-400" />
          <ChevronRight size={10} className="opacity-30" />
          <Link to="/fixed-assets" className="hover:text-blue-600 transition-colors">Fixed Assets</Link>
          <ChevronRight size={10} className="opacity-30" />
          <span className="text-slate-600">{isEdit ? 'Edit Asset' : 'New Asset'}</span>
        </div>
      </div>

      <div className="p-8 max-w-3xl mx-auto w-full space-y-6">
        <div className="bg-white rounded-xl shadow-xs border border-gray-200 p-8 space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-gray-100">
            <div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight">
                {isEdit ? 'Edit Fixed Asset' : 'Register New Fixed Asset'}
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Set up asset details, cost, depreciation rate, and corresponding ledger accounts.
              </p>
            </div>
            <button
              onClick={() => navigate('/fixed-assets')}
              className="text-xs text-gray-500 hover:text-gray-800 font-semibold flex items-center gap-1"
            >
              <ArrowLeft size={14} /> Back to Assets
            </button>
          </div>

          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-lg text-xs font-bold flex items-center gap-2">
              <AlertCircle size={16} /> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Asset Code <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={assetCode}
                  onChange={(e) => setAssetCode(e.target.value)}
                  placeholder="e.g. FA-001, VEH-01"
                  className="w-full bg-slate-50 border border-gray-300 rounded-lg px-3 py-2 text-xs font-mono font-bold focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Asset Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={assetName}
                  onChange={(e) => setAssetName(e.target.value)}
                  placeholder="e.g. Toyota Hilux 4x4"
                  className="w-full bg-slate-50 border border-gray-300 rounded-lg px-3 py-2 text-xs font-semibold focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">Description / Serial No.</label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Serial numbers, engine numbers, location, or warranty info"
                className="w-full bg-slate-50 border border-gray-300 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Purchase Date</label>
                <input
                  type="date"
                  value={purchaseDate}
                  onChange={(e) => setPurchaseDate(e.target.value)}
                  className="w-full bg-slate-50 border border-gray-300 rounded-lg px-3 py-2 text-xs font-semibold focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Purchase Cost (ZMW)</label>
                <input
                  type="number"
                  step="0.01"
                  value={purchaseCost}
                  onChange={(e) => setPurchaseCost(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-slate-50 border border-gray-300 rounded-lg px-3 py-2 text-xs font-mono font-bold focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Depreciation Rate (% p.a.)</label>
                <input
                  type="number"
                  step="0.1"
                  value={depreciationRate}
                  onChange={(e) => setDepreciationRate(e.target.value)}
                  placeholder="e.g. 10, 20, 25"
                  className="w-full bg-slate-50 border border-gray-300 rounded-lg px-3 py-2 text-xs font-bold focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Depreciation Method</label>
                <select
                  value={depreciationMethod}
                  onChange={(e) => setDepreciationMethod(e.target.value)}
                  className="w-full bg-slate-50 border border-gray-300 rounded-lg px-3 py-2 text-xs font-semibold focus:ring-1 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="Straight Line">Straight Line</option>
                  <option value="Declining Balance">Declining Balance</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Asset Control Account</label>
                <select
                  value={assetAccountId}
                  onChange={(e) => setAssetAccountId(e.target.value)}
                  className="w-full bg-slate-50 border border-gray-300 rounded-lg px-3 py-2 text-xs font-semibold focus:ring-1 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="">Select Asset Account...</option>
                  {accounts.filter((a: any) => a.accountType === 'Asset').map((a: any) => (
                    <option key={a.id} value={a.id}>{a.code ? `[${a.code}] ` : ''}{a.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Depreciation Expense Account</label>
                <select
                  value={expenseAccountId}
                  onChange={(e) => setExpenseAccountId(e.target.value)}
                  className="w-full bg-slate-50 border border-gray-300 rounded-lg px-3 py-2 text-xs font-semibold focus:ring-1 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="">Select Expense Account...</option>
                  {accounts.filter((a: any) => a.accountType === 'Expense').map((a: any) => (
                    <option key={a.id} value={a.id}>{a.code ? `[${a.code}] ` : ''}{a.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-6 border-t border-gray-100">
              <button
                type="button"
                onClick={() => navigate('/fixed-assets')}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-bold text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold text-xs shadow-xs flex items-center gap-1.5"
              >
                <Save size={14} /> {isSaving ? 'Saving...' : 'Save Fixed Asset'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default NewFixedAssetView;
