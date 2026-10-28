import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Lock,
  Unlock,
  Save,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  FolderOpen,
  Calendar,
  ShieldAlert
} from 'lucide-react';
import apiService from '../services/apiService';
import { formatDateDMY } from '../utils/dateUtils';

export const SettingsLockDateView: React.FC = () => {
  const navigate = useNavigate();
  const [lockDate, setLockDate] = useState<string>('');
  const [currentLockDate, setCurrentLockDate] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    apiService.getLockDate()
      .then((data) => {
        if (data?.lockDate) {
          setCurrentLockDate(data.lockDate);
          setLockDate(data.lockDate);
        }
      })
      .catch((err) => setError(err?.message || 'Failed to fetch lock date'))
      .finally(() => setIsLoading(false));
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    setMessage('');
    setError('');
    try {
      await apiService.setLockDate(lockDate || null);
      setCurrentLockDate(lockDate || null);
      setMessage(lockDate ? `Period successfully locked up to ${formatDateDMY(lockDate)}.` : 'Lock Date removed.');
    } catch (err: any) {
      setError(err?.response?.data?.error || err.message || 'Failed to save lock date');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClear = async () => {
    setLockDate('');
    setIsSaving(true);
    setMessage('');
    setError('');
    try {
      await apiService.setLockDate(null);
      setCurrentLockDate(null);
      setMessage('Lock Date cleared. All accounting periods are now unlocked.');
    } catch (err: any) {
      setError(err?.response?.data?.error || err.message || 'Failed to clear lock date');
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
          <Link to="/settings" className="hover:text-blue-600 transition-colors">Settings</Link>
          <ChevronRight size={10} className="opacity-30" />
          <span className="text-slate-600">Lock Date</span>
        </div>
      </div>

      <div className="p-8 max-w-2xl mx-auto w-full space-y-6">
        <div className="bg-white rounded-xl shadow-xs border border-gray-200 p-8 space-y-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Lock size={24} />
              </div>
              <div>
                <h1 className="text-xl font-black text-slate-900 tracking-tight">Lock Date</h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Prevent unauthorized or accidental modifications to closed accounting periods.
                </p>
              </div>
            </div>

            {currentLockDate ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                <Lock size={12} /> Active ({formatDateDMY(currentLockDate)})
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600">
                <Unlock size={12} /> Unlocked
              </span>
            )}
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-xs text-amber-800 flex items-start gap-3">
            <ShieldAlert size={18} className="shrink-0 mt-0.5 text-amber-600" />
            <div className="space-y-1">
              <p className="font-bold">Accounting Control Policy:</p>
              <p className="text-amber-700">
                When a lock date is set, users cannot create, edit, or delete any sales invoices, purchase invoices, receipts, payments, credit notes, debit notes, or journal entries with transaction dates on or before the specified date.
              </p>
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

          <div className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Lock Transactions On or Before:
              </label>
              <input
                type="date"
                value={lockDate}
                onChange={(e) => setLockDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-4 py-2.5 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
              <p className="text-[11px] text-gray-500 mt-1.5">
                Dates strictly formatted as <span className="font-mono font-bold">dd.mm.yyyy</span> ({formatDateDMY(lockDate) || 'none'}).
              </p>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={handleClear}
                disabled={isSaving || !currentLockDate}
                className="px-4 py-2 border border-gray-300 text-gray-600 rounded-lg text-xs font-bold hover:bg-gray-50 disabled:opacity-40 transition-colors flex items-center gap-1.5"
              >
                <Unlock size={14} /> Clear Lock Date
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => navigate('/settings')}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-xs font-bold hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="px-5 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-1.5 shadow-xs"
                >
                  <Save size={14} /> {isSaving ? 'Saving...' : 'Save Lock Date'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsLockDateView;
