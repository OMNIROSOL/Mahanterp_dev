import React, { useState, useEffect } from 'react';
import { Database, Plus, Edit2, Trash2, X, Save } from 'lucide-react';
import apiService from '../../services/apiService';
import { Account } from '../../types';

interface TransactionItemsViewProps {
  type: 'Income' | 'Expense';
}

const TransactionItemsView: React.FC<TransactionItemsViewProps> = ({ type }) => {
  const [items, setItems] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [formData, setFormData] = useState({ name: '', description: '', defaultAccountId: '' });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [type]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [allTxItems, allAccounts] = await Promise.all([
        apiService.getTransactionItems(),
        apiService.getAccounts()
      ]);
      setItems(allTxItems.filter((it: any) => it.type === type));
      setAccounts(allAccounts);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenModal = (item?: any) => {
    if (item) {
      setEditingItem(item);
      setFormData({ name: item.name, description: item.description || '', defaultAccountId: item.defaultAccountId || '' });
    } else {
      setEditingItem(null);
      setFormData({ name: '', description: '', defaultAccountId: '' });
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    try {
      const payload = {
        ...formData,
        type,
        defaultAccountId: formData.defaultAccountId || null
      };
      if (editingItem) {
        await apiService.updateTransactionItem(editingItem.id, payload);
      } else {
        await apiService.createTransactionItem(payload);
      }
      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      console.error(err);
      alert('Failed to save item');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this item?')) {
      try {
        await apiService.deleteTransactionItem(id);
        fetchData();
      } catch (err) {
        console.error(err);
        alert('Failed to delete item');
      }
    }
  };

  return (
    <div className="p-10 max-w-7xl mx-auto space-y-6 font-sans animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">{type} Items</h1>
          <p className="text-sm text-slate-500 mt-1">Manage {type.toLowerCase()} items for quick data entry in receipts and payments.</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center space-x-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold text-[13px] hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"
        >
          <Plus size={16} />
          <span>New {type} Item</span>
        </button>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest">Name</th>
              <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest">Description</th>
              <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest">Default Account</th>
              <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={4} className="p-10 text-center text-slate-400">Loading...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={4} className="p-10 text-center text-slate-400">No {type.toLowerCase()} items found.</td></tr>
            ) : (
              items.map((item) => {
                const acc = accounts.find(a => a.id === item.defaultAccountId);
                return (
                  <tr key={item.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold text-slate-800">{item.name}</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500">{item.description}</td>
                    <td className="px-6 py-4 text-sm text-slate-500">
                      {acc ? <span className="bg-slate-100 px-2 py-1 rounded text-xs font-semibold">{acc.name}</span> : '-'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleOpenModal(item)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"><Edit2 size={16} /></button>
                        <button onClick={() => handleDelete(item.id)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h2 className="text-lg font-bold text-slate-800">{editingItem ? 'Edit' : 'New'} {type} Item</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">Item Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full mt-1 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  placeholder="e.g. Consulting Revenue"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">Description (Optional)</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full mt-1 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">Default Account</label>
                <select
                  value={formData.defaultAccountId}
                  onChange={(e) => setFormData({ ...formData, defaultAccountId: e.target.value })}
                  className="w-full mt-1 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="">None</option>
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>{acc.name}</option>
                  ))}
                </select>
                <p className="text-xs text-slate-400 mt-2">Automatically selects this account in the {type === 'Income' ? 'Receipt' : 'Payment'} screen.</p>
              </div>
            </div>
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end space-x-3">
              <button onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-sm font-bold text-slate-500 hover:text-slate-700">Cancel</button>
              <button onClick={handleSave} disabled={!formData.name} className="px-5 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-50 flex items-center space-x-2">
                <Save size={16} />
                <span>Save Item</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransactionItemsView;
