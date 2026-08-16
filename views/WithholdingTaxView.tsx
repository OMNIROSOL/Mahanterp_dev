import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  CheckCircle2, 
  XCircle,
  FileText,
  ChevronLeft
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Card from '../components/shared/Card';
import apiService from '../services/apiService';
import { WithholdingTax } from '../types';
import { cn } from '../utils/cn';

const WithholdingTaxView = () => {
  const navigate = useNavigate();
  const [taxes, setTaxes] = useState<WithholdingTax[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingTax, setEditingTax] = useState<Partial<WithholdingTax> | null>(null);

  const fetchTaxes = async () => {
    setIsLoading(true);
    try {
      const data = await apiService.getWithholdingTaxes();
      setTaxes(data);
    } catch (err) {
      console.error('Failed to fetch withholding taxes:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTaxes();
  }, []);

  const filteredTaxes = taxes.filter(tax => 
    tax.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tax.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTax?.name || editingTax.rate === undefined) return;

    const taxData = {
      name: editingTax.name,
      rate: Number(editingTax.rate),
      description: editingTax.description || '',
      inactive: editingTax.inactive || false
    };

    try {
      if (editingTax.id) {
        await apiService.updateWithholdingTax(editingTax.id, taxData);
      } else {
        await apiService.createWithholdingTax(taxData);
      }
      setShowModal(false);
      setEditingTax(null);
      fetchTaxes();
    } catch (err) {
      console.error('Failed to save tax:', err);
      alert('Failed to save tax configuration');
    }
  };

  const toggleStatus = async (tax: WithholdingTax) => {
    try {
      await apiService.updateWithholdingTax(tax.id, { ...tax, inactive: !tax.inactive });
      fetchTaxes();
    } catch (err) {
      console.error('Failed to toggle status:', err);
    }
  };

  return (
    <div className="p-8 space-y-6 animate-in fade-in duration-500 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <button 
            onClick={() => navigate('/settings')}
            className="flex items-center gap-2 text-sm text-slate-500 hover:text-primary mb-2 transition-colors group"
          >
            <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
            Back to Settings
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <FileText size={22} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Withholding Tax</h1>
              <p className="text-sm text-slate-500 font-medium tracking-tight">Configure retention rates for various service categories</p>
            </div>
          </div>
        </div>

        <button 
          onClick={() => {
            setEditingTax({ name: '', rate: 0, description: '', inactive: false });
            setShowModal(true);
          }}
          className="flex items-center justify-center gap-2 bg-primary text-white px-5 py-2.5 rounded-xl font-bold hover:bg-primary-dark transition-all shadow-lg shadow-primary/20 active:scale-95"
        >
          <Plus size={20} />
          New Tax Type
        </button>
      </div>

      {/* Table Card */}
      <Card className="overflow-hidden border-slate-200/60 shadow-sm">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <div className="relative group max-w-md w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" size={18} />
            <input 
              type="text" 
              placeholder="Search withholding taxes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-4 focus:ring-primary/5 focus:border-primary/40 transition-all outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 text-[11px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                <th className="px-6 py-4">Tax Type</th>
                <th className="px-6 py-4">Rate (%)</th>
                <th className="px-6 py-4">Legal Basis / Description</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredTaxes.map((tax) => (
                <tr key={tax.id} className="hover:bg-slate-50/80 transition-colors group">
                  <td className="px-6 py-4">
                    <span className="font-bold text-slate-900">{tax.name}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-black bg-indigo-50 text-indigo-700">
                      {tax.rate}%
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-slate-500 font-medium">{tax.description || '-'}</span>
                  </td>
                  <td className="px-6 py-4">
                    <button 
                      onClick={() => toggleStatus(tax)}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all",
                        tax.inactive 
                          ? "bg-slate-100 text-slate-500 hover:bg-slate-200" 
                          : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                      )}
                    >
                      {tax.inactive ? <XCircle size={12} /> : <CheckCircle2 size={12} />}
                      {tax.inactive ? 'Inactive' : 'Active'}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => {
                          setEditingTax(tax);
                          setShowModal(true);
                        }}
                        className="p-2 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-all"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button className="p-2 text-slate-400 hover:text-error hover:bg-error/5 rounded-lg transition-all">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300 border border-slate-200">
            <div className="bg-slate-50 p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-xl font-black text-slate-900 tracking-tight">
                {editingTax?.id ? 'Edit Tax Type' : 'New Withholding Tax'}
              </h2>
              <button 
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <XCircle size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tax Name / Category</label>
                <input 
                  autoFocus
                  required
                  type="text" 
                  value={editingTax?.name || ''}
                  onChange={(e) => setEditingTax({ ...editingTax, name: e.target.value })}
                  placeholder="e.g. WHT 10% Services"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-4 focus:ring-primary/5 focus:border-primary/40 focus:bg-white transition-all outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Rate (%)</label>
                <div className="relative">
                  <input 
                    required
                    type="number" 
                    step="0.01"
                    value={editingTax?.rate || ''}
                    onChange={(e) => setEditingTax({ ...editingTax, rate: Number(e.target.value) })}
                    placeholder="0.00"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-4 focus:ring-primary/5 focus:border-primary/40 focus:bg-white transition-all outline-none"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-black">%</div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Description / Legal Note</label>
                <textarea 
                  value={editingTax?.description || ''}
                  onChange={(e) => setEditingTax({ ...editingTax, description: e.target.value })}
                  placeholder="Details about applicability..."
                  rows={3}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-4 focus:ring-primary/5 focus:border-primary/40 focus:bg-white transition-all outline-none resize-none"
                />
              </div>

              <div className="flex items-center gap-4 pt-4">
                <button 
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-6 py-3 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 px-6 py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary-dark transition-all shadow-lg shadow-primary/20"
                >
                  Save Tax Type
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default WithholdingTaxView;
