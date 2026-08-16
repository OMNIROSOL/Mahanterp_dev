import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Edit, Package, History, TrendingUp, AlertCircle } from 'lucide-react';
import { apiService } from '../services/apiService';

const ViewInventoryItemView = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [item, setItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchItem = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const data = await apiService.getItem(id);
        setItem(data);
      } catch (err) {
        console.error('Failed to fetch item:', err);
        // Fallback
        try {
          const items = await apiService.getItems();
          const found = items.find((i: any) => i.id === id);
          if (found) setItem(found);
        } catch (e) {}
      } finally {
        setLoading(false);
      }
    };
    fetchItem();
  }, [id]);

  if (loading) return <div className="p-8 text-center text-slate-500 font-black uppercase tracking-widest">Loading item...</div>;

  if (!item) {
    return (
      <div className="p-8 text-center mt-20">
        <AlertCircle size={48} className="mx-auto text-rose-500 mb-4" />
        <h2 className="text-xl font-bold text-gray-900">Item Not Found</h2>
        <button 
          onClick={() => navigate('/inventory-items')}
          className="mt-4 text-blue-600 font-bold hover:underline"
        >
          Back to Inventory
        </button>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between border-b border-gray-100 pb-6">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/inventory-items')}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft size={20} className="text-gray-500" />
          </button>
          <div>
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-blue-600 mb-1">
              <Package size={12} />
              <span>Inventory Item Details</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">{item.itemName}</h1>
            <p className="text-sm text-gray-400 font-medium">{item.itemCode}</p>
          </div>
        </div>
        <button
          onClick={() => navigate(`/inventory-items/edit/${item.id}`)}
          className="px-8 py-2 bg-blue-600 text-[11px] font-black text-white rounded-md hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 flex items-center gap-2 uppercase tracking-widest"
        >
          <Edit size={14} /> Edit Item
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm space-y-6">
            <h2 className="text-[12px] font-black uppercase tracking-[0.2em] text-gray-400 border-b border-gray-50 pb-4">General Information</h2>
            <div className="grid grid-cols-2 gap-8">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-300 block mb-1">Category</label>
                <div className="text-sm font-bold text-slate-700">{item.category || 'N/A'}</div>
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-300 block mb-1">Unit</label>
                <div className="text-sm font-bold text-slate-700">{item.unitName}</div>
              </div>
              <div className="col-span-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-300 block mb-1">Description</label>
                <div className="text-sm font-medium text-slate-600 leading-relaxed">{item.description || 'No description provided.'}</div>
              </div>
            </div>
          </div>

          <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-gray-50 pb-4">
              <h2 className="text-[12px] font-black uppercase tracking-[0.2em] text-gray-400">Stock Status</h2>
              <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                item.qtyOnHand <= (item.reorderLevel || 0) ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'
              }`}>
                {item.qtyOnHand <= (item.reorderLevel || 0) ? 'Low Stock' : 'Optimized'}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-8">
              <div className="p-4 bg-slate-50 rounded-xl">
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-1">Qty on Hand</label>
                <div className="text-xl font-black text-slate-900">{item.qtyOnHand}</div>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl">
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-1">Selling Price</label>
                <div className="text-xl font-black text-slate-900">ZMW {(parseFloat(item.sellingPrice) || 0).toLocaleString()}</div>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl">
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-1">Purchase Price</label>
                <div className="text-xl font-black text-slate-900">ZMW {(parseFloat(item.purchasePrice) || 0).toLocaleString()}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <div className="bg-slate-900 p-8 rounded-2xl shadow-xl text-white space-y-6">
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 border-b border-white/10 pb-4">Activity Highlights</h2>
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400 mt-1">
                  <TrendingUp size={16} />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-200 uppercase tracking-widest mb-1">Reorder Level</div>
                  <div className="text-sm font-black text-white">{item.reorderLevel || 0} units</div>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400 mt-1">
                  <History size={16} />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-200 uppercase tracking-widest mb-1">Created At</div>
                  <div className="text-sm font-black text-white">{new Date(item.createdAt).toLocaleDateString('en-GB')}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewInventoryItemView;
