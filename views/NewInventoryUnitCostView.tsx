import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Save, X, ArrowLeft, Package, Calendar, DollarSign, ShieldAlert, Database } from 'lucide-react';
import { apiService } from '../services/apiService';
import { InventoryUnitCost, InventoryItem, ItemCategory } from '../types';

const NewInventoryUnitCostView = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const [isLoading, setIsLoading] = useState(true);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [categories, setCategories] = useState<ItemCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  
  const [formData, setFormData] = useState<Partial<InventoryUnitCost>>({
    date: new Date().toISOString().split('T')[0],
    itemId: '',
    itemName: '',
    unitCost: 0,
    marginPercent: 0,
    minSellingPrice: 0,
    category: '',
    division: 'WAREHOUSE'
  });

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [itemsList, costList, categoriesList] = await Promise.all([
          apiService.getItems(),
          apiService.getInventoryUnitCosts(),
          apiService.getItemCategories()
        ]);
        setItems(itemsList);
        setCategories(categoriesList);
        
        if (isEdit && id) {
          const existingCost = costList.find((c: any) => c.id === id);
          if (existingCost) {
            setFormData({
              ...existingCost,
              unitCost: parseFloat(existingCost.unitCost as any || 0),
              marginPercent: existingCost.marginPercent ? parseFloat(existingCost.marginPercent as any) : 0,
              minSellingPrice: parseFloat(existingCost.minSellingPrice as any || 0)
            });
            setSelectedCategory(existingCost.category || '');
          }
        }
      } catch (err) {
        console.error('Failed to fetch unit cost data:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [id, isEdit]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    setFormData(prev => {
      const updated = { ...prev };
      
      if (name === 'unitCost') {
        const cost = Number(value) || 0;
        updated.unitCost = cost;
        updated.minSellingPrice = Number((cost * (1 + (updated.marginPercent || 0) / 100)).toFixed(2));
      } else if (name === 'marginPercent') {
        const margin = Number(value) || 0;
        updated.marginPercent = margin;
        updated.minSellingPrice = Number(((updated.unitCost || 0) * (1 + margin / 100)).toFixed(2));
      } else if (name === 'minSellingPrice') {
        const minPrice = Number(value) || 0;
        updated.minSellingPrice = minPrice;
        const cost = updated.unitCost || 0;
        updated.marginPercent = cost > 0 ? Number((((minPrice - cost) / cost) * 100).toFixed(2)) : 0;
      } else {
        (updated as any)[name] = value;
      }
      
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.itemId || !formData.date || formData.unitCost === undefined) {
      alert('Please fill all required fields (Item, Date, and Unit Cost).');
      return;
    }

    setIsLoading(true);
    try {
      const payload = {
        date: formData.date!,
        itemId: formData.itemId!,
        itemName: formData.itemName!,
        unitCost: formData.unitCost!,
        marginPercent: formData.marginPercent || 0,
        minSellingPrice: formData.minSellingPrice || 0,
        category: formData.category || selectedCategory || '',
        division: formData.division || 'WAREHOUSE'
      };

      if (isEdit && id) {
        await apiService.updateInventoryUnitCost(id, payload);
      } else {
        await apiService.createInventoryUnitCost(payload);
      }
      navigate('/settings/inventory-unit-costs');
    } catch (err) {
      console.error('Failed to save unit cost record:', err);
      alert('Failed to save unit cost record to database');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-40 space-y-4 font-sans">
        <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-600 rounded-full animate-spin"></div>
        <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">{isEdit ? 'Updating record...' : 'Creating record...'}</p>
      </div>
    );
  }

  const filteredItems = selectedCategory ? items.filter(item => item.category === selectedCategory) : items;

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500 bg-slate-50/30 min-h-screen">
      <div className="flex items-center justify-between border-b border-gray-100 pb-6 bg-white -m-8 mb-8 p-8 sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/settings/inventory-unit-costs')}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft size={20} className="text-gray-500" />
          </button>
          <div>
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-blue-500 mb-1">
              <ShieldAlert size={12} />
              <span>Admin Restricted Area</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
              {isEdit ? 'Edit Unit Cost Record' : 'New Unit Cost Record'}
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/settings/inventory-unit-costs')}
            className="px-6 py-2.5 bg-white text-[11px] font-black text-gray-500 rounded-xl hover:bg-gray-50 transition-all border border-gray-200 uppercase tracking-widest flex items-center gap-2"
          >
            <X size={14} /> Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-8 py-2.5 bg-blue-600 text-[11px] font-black text-white rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 flex items-center gap-2 uppercase tracking-widest border border-blue-500"
          >
            <Save size={14} /> {isEdit ? 'Save Changes' : 'Create Record'}
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-3xl mx-auto space-y-8 pb-12">
        <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm space-y-8">
          <div className="space-y-6">
            <h2 className="text-[12px] font-black uppercase tracking-[0.2em] text-blue-600 border-b border-gray-50 pb-4">Core Identification</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
                  <Package size={12} />
                  Category filter
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => {
                    const cat = e.target.value;
                    setSelectedCategory(cat);
                    setFormData(prev => {
                      const item = items.find(i => i.id === prev.itemId);
                      if (item && cat && item.category !== cat) {
                        return { ...prev, itemId: '', itemName: '', category: '' };
                      }
                      return { ...prev, category: cat };
                    });
                  }}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-medium font-bold text-slate-700"
                >
                  <option value="">All Categories</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.name}>{cat.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
                  <Package size={12} />
                  Inventory Item
                </label>
                <select
                  name="itemId"
                  value={formData.itemId}
                  onChange={(e) => {
                    const item = items.find(i => i.id === e.target.value);
                    setFormData(prev => ({ 
                      ...prev, 
                      itemId: e.target.value,
                      itemName: item ? `${item.itemCode} - ${item.itemName}` : '',
                      category: item?.category || prev.category
                    }));
                    if (item && item.category && !selectedCategory) {
                      setSelectedCategory(item.category);
                    }
                  }}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-medium font-bold text-slate-700"
                  required
                >
                  <option value="">Select Item...</option>
                  {filteredItems.map(item => (
                    <option key={item.id} value={item.id}>
                      {item.itemCode} - {item.itemName} {item.category ? `(${item.category})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <h2 className="text-[12px] font-black uppercase tracking-[0.2em] text-blue-600 border-b border-gray-50 pb-4 pt-4">Pricing & Scoping</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
                  <Calendar size={12} />
                  Record Date
                </label>
                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-medium text-[11px] uppercase tracking-tighter"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
                  <DollarSign size={12} />
                  Unit Cost (ZMW)
                </label>
                <input
                  type="number"
                  step="0.01"
                  name="unitCost"
                  value={formData.unitCost || ''}
                  onChange={handleChange}
                  placeholder="0.00"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-black text-blue-600"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
                  <DollarSign size={12} />
                  Margin Percentage (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  name="marginPercent"
                  value={formData.marginPercent === 0 ? '0' : (formData.marginPercent || '')}
                  onChange={handleChange}
                  placeholder="e.g. 25"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-black text-slate-700"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
                  <DollarSign size={12} />
                  Min. Selling Price (ZMW)
                </label>
                <input
                  type="number"
                  step="0.01"
                  name="minSellingPrice"
                  value={formData.minSellingPrice || ''}
                  onChange={handleChange}
                  placeholder="0.00"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-black text-emerald-600"
                  required
                />
              </div>


            </div>
          </div>

          <div className="p-4 bg-amber-50 rounded-xl border border-amber-100 flex gap-4">
            <div className="p-2 bg-amber-100 rounded-lg text-amber-600 h-fit">
              <ShieldAlert size={20} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-amber-900 uppercase tracking-tight">Administrative Control</h3>
              <p className="text-xs text-amber-700 leading-relaxed mt-1">
                This record directly influences inventory valuation and COGS calculations. Changes are logged and should only be performed by authorized administrators.
              </p>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default NewInventoryUnitCostView;
