import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FileText, 
  Save, 
  Plus, 
  Trash2, 
  ChevronLeft,
  AlertCircle
} from 'lucide-react';
import apiService from '../services/apiService';
import { DocumentFooter } from '../types';
import Card from '../components/shared/Card';

const SettingsFootersView = () => {
  const navigate = useNavigate();
  const [footers, setFooters] = useState<DocumentFooter[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    const fetchFooters = async () => {
      setIsLoading(true);
      try {
        const data = await apiService.getFooters();
        setFooters(data);
      } catch (err) {
        console.error('Failed to fetch footers:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchFooters();
  }, []);

  const handleAddFooter = () => {
    const newFooter: DocumentFooter = {
      id: `f-${Date.now()}`,
      name: 'New Footer Option',
      content: 'Enter footer content here...'
    };
    setFooters([...footers, newFooter]);
    setHasChanges(true);
  };

  const handleUpdateFooter = (id: string, field: keyof DocumentFooter, value: string) => {
    setFooters(footers.map(f => f.id === id ? { ...f, [field]: value } : f));
    setHasChanges(true);
  };

  const handleDeleteFooter = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this footer option?')) {
      if (!id.startsWith('f-')) {
        // Real database ID
        try {
          await apiService.deleteFooter(id);
        } catch (err) {
          console.error('Failed to delete footer:', err);
          alert('Failed to delete footer from database');
          return;
        }
      }
      setFooters(footers.filter(f => f.id !== id));
      setHasChanges(false); // Deleted immediately
    }
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      // Logic for saving multiple footers (upsert)
      await Promise.all(footers.map(footer => {
        if (footer.id.startsWith('f-')) {
          const { id, ...data } = footer;
          return apiService.createFooter(data);
        } else {
          return apiService.updateFooter(footer.id, footer);
        }
      }));
      setHasChanges(false);
      // Refresh to get real IDs
      const data = await apiService.getFooters();
      setFooters(data);
    } catch (err) {
      console.error('Failed to save footers:', err);
      alert('Failed to save footers to database');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-40 space-y-4 font-sans">
        <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-600 rounded-full animate-spin"></div>
        <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Loading footer settings...</p>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <button 
            onClick={() => navigate('/settings')}
            className="flex items-center text-xs font-black text-slate-400 uppercase tracking-widest hover:text-primary transition-colors mb-2 group"
          >
            <ChevronLeft size={14} className="mr-1 group-hover:-translate-x-1 transition-transform" />
            Back to Settings
          </button>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
            <FileText size={28} className="text-indigo-600" />
            Document Footers
          </h1>
          <p className="text-gray-500 font-medium mt-1">Manage reusable footer content for your invoices and quotes</p>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={handleAddFooter}
            className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 text-slate-700 rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm"
          >
            <Plus size={16} /> Add New Footer
          </button>
          <button
            onClick={handleSave}
            disabled={!hasChanges}
            className={`flex items-center gap-2 px-8 py-3 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all shadow-lg ${
              hasChanges 
                ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-600/20' 
                : 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none'
            }`}
          >
            <Save size={16} /> Save Changes
          </button>
        </div>
      </div>

      <div className="grid gap-6">
        {footers.map((footer) => (
          <div 
            key={footer.id}
            className="group bg-white border border-slate-100 rounded-3xl p-8 hover:border-indigo-100 hover:shadow-2xl hover:shadow-slate-200/50 transition-all"
          >
            <div className="flex justify-between items-start gap-8">
              <div className="flex-1 space-y-6">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1 mb-2 block">Option Name</label>
                  <input
                    type="text"
                    value={footer.name}
                    onChange={(e) => handleUpdateFooter(footer.id, 'name', e.target.value)}
                    className="w-full text-lg font-bold text-slate-800 bg-slate-50 border border-transparent rounded-2xl px-6 py-3 focus:bg-white focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/5 transition-all outline-none"
                    placeholder="e.g. Standard Terms"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1 mb-2 block">Footer Content</label>
                  <textarea
                    value={footer.content}
                    onChange={(e) => handleUpdateFooter(footer.id, 'content', e.target.value)}
                    className="w-full min-h-[160px] text-sm font-semibold text-slate-600 bg-slate-50 border border-transparent rounded-3xl px-6 py-4 focus:bg-white focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/5 transition-all outline-none resize-none leading-relaxed"
                    placeholder="Enter what should appear at the bottom of the document..."
                  />
                </div>
              </div>

              <button
                onClick={() => handleDeleteFooter(footer.id)}
                className="p-4 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all opacity-0 group-hover:opacity-100"
              >
                <Trash2 size={20} />
              </button>
            </div>
          </div>
        ))}

        {footers.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 bg-slate-50/50 border-2 border-dashed border-slate-200 rounded-[40px]">
            <AlertCircle size={48} className="text-slate-200 mb-4" />
            <p className="text-slate-400 font-bold">No footer options defined yet</p>
            <button
              onClick={handleAddFooter}
              className="mt-4 text-indigo-600 font-black text-[11px] uppercase tracking-widest hover:underline"
            >
              Click here to create your first one
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SettingsFootersView;
