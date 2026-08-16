import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  CheckCircle2, 
  XCircle,
  ChevronLeft
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Card from '../components/shared/Card';
import apiService from '../services/apiService';
import { Division } from '../types';
import { cn } from '../utils/cn';

const DivisionsView = () => {
  const navigate = useNavigate();
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showNewModal, setShowNewModal] = useState(false);
  const [editingDivision, setEditingDivision] = useState<Partial<Division> | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchDivisions = async () => {
    try {
      const data = await apiService.getDivisions();
      setDivisions(data);
    } catch (err) {
      console.error('Failed to fetch divisions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDivisions();
  }, []);

  const filteredDivisions = divisions.filter(div => 
    div.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    div.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDivision?.name) return;

    try {
      await apiService.createDivision({
        name: editingDivision.name,
        description: editingDivision.description || ''
      });
      setShowNewModal(false);
      setEditingDivision(null);
      fetchDivisions();
    } catch (err: any) {
      console.error('Failed to save division:', err);
      const msg = err.response?.data?.error || err.message || 'Unknown error';
      alert(`Failed to save division: ${msg}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this division?')) return;
    try {
      await apiService.deleteDivision(id);
      fetchDivisions();
    } catch (err) {
      console.error('Failed to delete division:', err);
      alert('Failed to delete division. It might be in use.');
    }
  };

  return (
    <div className="p-8 space-y-6 animate-in fade-in duration-500 max-w-6xl mx-auto font-sans">
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
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Building2 size={22} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Divisions</h1>
              <p className="text-sm text-slate-500 font-medium tracking-tight">Manage business units, branches, and regional departments</p>
            </div>
          </div>
        </div>

        <button 
          onClick={() => {
            setEditingDivision({ name: '', description: '' });
            setShowNewModal(true);
          }}
          className="flex items-center justify-center gap-2 bg-primary text-white px-5 py-2.5 rounded-xl font-bold hover:bg-primary-dark transition-all shadow-lg shadow-primary/20 active:scale-95"
        >
          <Plus size={20} />
          New Division
        </button>
      </div>

      {/* Main Table Card */}
      <Card className="overflow-hidden border-slate-200/60 shadow-sm">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <div className="relative group max-w-md w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" size={18} />
            <input 
              type="text" 
              placeholder="Search divisions..."
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
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">Description</th>
                <th className="px-6 py-4">Created At</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-400 animate-pulse font-bold uppercase tracking-widest text-xs">
                    Loading divisions...
                  </td>
                </tr>
              ) : filteredDivisions.map((div) => (
                <tr key={div.id} className="hover:bg-slate-50/80 transition-colors group">
                  <td className="px-6 py-4">
                    <span className="font-bold text-slate-900">{div.name}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-slate-500 font-medium">{div.description || '-'}</span>
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-400 font-medium">
                    {div.createdAt ? new Date(div.createdAt).toLocaleDateString() : '-'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => handleDelete(div.id)}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && filteredDivisions.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-12 h-12 rounded-2xl bg-slate-50 text-slate-300 flex items-center justify-center">
                        <Building2 size={24} />
                      </div>
                      <p className="text-sm font-bold text-slate-500">No divisions found</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* New Modal */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300 border border-slate-200">
            <div className="bg-slate-50 p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-xl font-black text-slate-900 tracking-tight">
                New Division
              </h2>
              <button 
                onClick={() => setShowNewModal(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <XCircle size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Division Name</label>
                <input 
                  autoFocus
                  required
                  type="text" 
                  value={editingDivision?.name || ''}
                  onChange={(e) => setEditingDivision({ ...editingDivision, name: e.target.value })}
                  placeholder="e.g. Lusaka Branch"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-4 focus:ring-primary/5 focus:border-primary/40 focus:bg-white transition-all outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Description</label>
                <textarea 
                  value={editingDivision?.description || ''}
                  onChange={(e) => setEditingDivision({ ...editingDivision, description: e.target.value })}
                  placeholder="Optional notes about this division..."
                  rows={3}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-4 focus:ring-primary/5 focus:border-primary/40 focus:bg-white transition-all outline-none resize-none"
                />
              </div>

              <div className="flex items-center gap-4 pt-4">
                <button 
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="flex-1 px-6 py-3 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 px-6 py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary-dark transition-all shadow-lg shadow-primary/20"
                >
                  Save Division
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DivisionsView;
