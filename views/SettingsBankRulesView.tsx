import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  SlidersHorizontal,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertCircle,
  FolderOpen,
  ChevronRight,
  X,
  RefreshCw
} from 'lucide-react';
import apiService from '../services/apiService';

interface BankRule {
  id: string;
  pattern: string;
  accountName: string;
  targetType: string;
  createdAt?: string;
}

export const SettingsBankRulesView: React.FC = () => {
  const navigate = useNavigate();
  const [rules, setRules] = useState<BankRule[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingRule, setEditingRule] = useState<BankRule | null>(null);
  const [formPattern, setFormPattern] = useState('');
  const [formAccountName, setFormAccountName] = useState('');
  const [formTargetType, setFormTargetType] = useState('Payment');
  const [isSaving, setIsSaving] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [rulesData, accountsData] = await Promise.all([
        apiService.getBankRules(),
        apiService.getAccounts()
      ]);
      setRules(Array.isArray(rulesData) ? rulesData : []);
      setAccounts(Array.isArray(accountsData) ? accountsData : []);
      if (accountsData?.length && !formAccountName) {
        setFormAccountName(accountsData[0].name);
      }
    } catch (err: any) {
      console.error('Failed to load bank rules:', err);
      setError('Could not load bank rules.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openNewModal = () => {
    setEditingRule(null);
    setFormPattern('');
    setFormTargetType('Payment');
    if (accounts.length) setFormAccountName(accounts[0].name);
    setShowModal(true);
  };

  const openEditModal = (r: BankRule) => {
    setEditingRule(r);
    setFormPattern(r.pattern);
    setFormAccountName(r.accountName);
    setFormTargetType(r.targetType || 'Payment');
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formPattern || !formAccountName) {
      setError('Pattern and account name are required.');
      return;
    }

    setIsSaving(true);
    setError('');
    setMessage('');
    try {
      if (editingRule) {
        await apiService.updateBankRule(editingRule.id, {
          pattern: formPattern,
          accountName: formAccountName,
          targetType: formTargetType
        });
        setMessage('Bank rule updated successfully.');
      } else {
        await apiService.createBankRule({
          pattern: formPattern,
          accountName: formAccountName,
          targetType: formTargetType
        });
        setMessage('Bank rule created successfully.');
      }
      setShowModal(false);
      loadData();
    } catch (err: any) {
      setError(err?.response?.data?.error || err.message || 'Failed to save bank rule');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this bank rule?')) return;
    try {
      await apiService.deleteBankRule(id);
      setRules(rules.filter(r => r.id !== id));
      setMessage('Rule deleted.');
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to delete rule');
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
          <span className="text-slate-600">Bank Rules</span>
        </div>
      </div>

      <div className="p-8 max-w-5xl mx-auto w-full space-y-6">
        <div className="bg-white rounded-xl shadow-xs border border-gray-200 p-6 space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <SlidersHorizontal size={24} />
              </div>
              <div>
                <h1 className="text-xl font-black text-slate-900 tracking-tight">Bank Rules</h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Automate the categorization of bank statement descriptions to accounts upon import.
                </p>
              </div>
            </div>

            <button
              onClick={openNewModal}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition-colors flex items-center gap-1.5 shadow-xs"
            >
              <Plus size={14} /> New Bank Rule
            </button>
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
                  <th className="py-2.5 px-4">Pattern (Description Match)</th>
                  <th className="py-2.5 px-4">Target Type</th>
                  <th className="py-2.5 px-4">Categorize To Account</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-sans">
                {isLoading ? (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-gray-400">
                      <RefreshCw size={18} className="animate-spin mx-auto mb-2 text-indigo-500" />
                      Loading bank rules...
                    </td>
                  </tr>
                ) : rules.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-gray-400 italic">
                      No bank rules created yet. Click "New Bank Rule" above to create one.
                    </td>
                  </tr>
                ) : (
                  rules.map((rule) => (
                    <tr key={rule.id} className="hover:bg-slate-50/70">
                      <td className="py-2.5 px-4 font-mono font-bold text-slate-800">
                        {rule.pattern}
                      </td>
                      <td className="py-2.5 px-4 font-semibold text-gray-600">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                          {rule.targetType || 'Payment'}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 font-bold text-indigo-700">
                        {rule.accountName}
                      </td>
                      <td className="py-2.5 px-4 text-right space-x-2">
                        <button
                          onClick={() => openEditModal(rule)}
                          className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors inline-block"
                          title="Edit"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          onClick={() => handleDelete(rule.id)}
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
            </table>
          </div>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl border border-gray-200 max-w-md w-full overflow-hidden">
            <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between">
              <span className="font-bold text-sm">
                {editingRule ? 'Edit Bank Rule' : 'New Bank Rule'}
              </span>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-gray-700 font-bold mb-1">
                  Pattern / Keyword in Bank Description:
                </label>
                <input
                  type="text"
                  required
                  value={formPattern}
                  onChange={(e) => setFormPattern(e.target.value)}
                  placeholder="e.g. STANBIC*CHARGE, ZESCO, LUSAKA WATER"
                  className="w-full border border-gray-300 rounded px-3 py-1.5 focus:ring-1 focus:ring-blue-500 focus:outline-none font-mono"
                />
                <p className="text-[10px] text-gray-500 mt-0.5">Case-insensitive match against imported bank lines.</p>
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-1">Target Type:</label>
                <select
                  value={formTargetType}
                  onChange={(e) => setFormTargetType(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-1.5 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="Payment">Payment (Outflow)</option>
                  <option value="Receipt">Receipt (Inflow)</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-1">Categorize to Account:</label>
                <select
                  value={formAccountName}
                  onChange={(e) => setFormAccountName(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-1.5 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.name}>
                      {a.name} ({a.accountType})
                    </option>
                  ))}
                </select>
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
                  {isSaving ? 'Saving...' : editingRule ? 'Update Rule' : 'Create Rule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsBankRulesView;
