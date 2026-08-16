import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Save, X, Package, Trash2, ArrowLeft, HelpCircle, Plus } from 'lucide-react';
import { InventoryItem, Division, Unit, ItemCategory } from '../types';
import { apiService } from '../services/apiService';

const NewInventoryItemView = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const [formData, setFormData] = useState<Partial<InventoryItem>>({
    itemCode: '',
    itemName: '',
    description: '',
    unitName: 'Each',
    valuationMethod: 'WeightedAverage',
    division: '',
    qtyOnHand: 0,
    qtyReserved: 0,
    qtyDesired: 0,
    avgCost: 0,
    totalValue: 0,
    reorderLevel: 0,
    category: '',
    marginPercentage: 0,
    incomeAccount: '',
    expenseAccount: '',
    autoFillDescription: false,
    autoFillPurchasePrice: false,
    autoFillSalesPrice: false,
    autoFillDivision: false,
    autoFillTaxCode: false,
    hideItemName: false
  });

  const [availableDivisions, setAvailableDivisions] = useState<Division[]>([]);
  const [availableUnits, setAvailableUnits] = useState<Unit[]>([]);
  const [availableCategories, setAvailableCategories] = useState<ItemCategory[]>([]);

  React.useEffect(() => {
    const loadData = async () => {
      try {
        const divs = await apiService.getDivisions();
        setAvailableDivisions(divs);

        const unitsData = await apiService.getUnits();
        setAvailableUnits(unitsData);

        const categoriesData = await apiService.getItemCategories();
        setAvailableCategories(categoriesData);

        if (isEdit) {
          const items = await apiService.getItems();
          const item = items.find((i: any) => i.id === id);
          if (item) {
            setFormData({
              ...item,
              qtyOnHand: parseFloat(item.qtyOnHand || 0),
              sellingPrice: parseFloat(item.sellingPrice || 0),
              purchasePrice: parseFloat(item.purchasePrice || 0),
              marginPercentage: parseFloat(item.marginPercentage || 0)
            });
          }
        }
      } catch (err) {
        console.error('Failed to load data:', err);
      }
    };
    loadData();
  }, [id, isEdit]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    setFormData(prev => ({ ...prev, [name]: val }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const dataToSave = {
        itemCode: formData.itemCode,
        itemName: formData.itemName,
        description: formData.description,
        unitName: formData.unitName,
        category: formData.category,
        sellingPrice: parseFloat(formData.sellingPrice as any || 0),
        purchasePrice: parseFloat(formData.purchasePrice as any || 0),
        marginPercentage: parseFloat(formData.marginPercentage as any || 0),
        qtyOnHand: parseFloat(formData.qtyOnHand as any || 0),
        imageUrl: formData.imageUrl
      };

      if (isEdit) {
        await apiService.updateItem(id!, dataToSave);
      } else {
        await apiService.createItem(dataToSave);
      }
      navigate('/inventory-items');
    } catch (err: any) {
      console.error('Failed to save item:', err);
      alert('Failed to save item: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    if (!window.confirm(`Are you sure you want to delete this inventory item: "${formData.itemName || 'this item'}"?`)) {
      return;
    }
    try {
      await apiService.deleteItem(id);
      navigate('/inventory-items');
    } catch (err: any) {
      console.error('Failed to delete item:', err);
      const errorMsg = err.response?.data?.error || err.message || 'Unknown error occurred';
      alert(`Failed to delete item: ${errorMsg}`);
    }
  };


  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500 bg-slate-50/30 min-h-screen">
      <div className="flex items-center justify-between border-b border-gray-100 pb-6 bg-white -m-8 mb-8 p-8 sticky top-0 z-10 shadow-sm">
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
              <span>Inventory Management</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
              {isEdit ? `Edit Item: ${formData.itemName}` : 'New Inventory Item'}
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/inventory-items')}
            className="px-6 py-2.5 bg-white text-[11px] font-black text-gray-500 rounded-xl hover:bg-gray-50 transition-all border border-gray-200 uppercase tracking-widest flex items-center gap-2"
          >
            <X size={14} /> Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-8 py-2.5 bg-blue-600 text-[11px] font-black text-white rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 flex items-center gap-2 uppercase tracking-widest border border-blue-500"
          >
            <Save size={14} /> {isEdit ? 'Update Item' : 'Create Item'}
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-5xl mx-auto space-y-8 pb-12">
        {/* Core Details */}
        <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm space-y-8">
          <div className="flex items-center justify-between border-b border-gray-50 pb-4">
            <h2 className="text-[12px] font-black uppercase tracking-[0.2em] text-blue-600">Core Identification</h2>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                name="inactive"
                id="inactive"
                checked={formData.inactive}
                onChange={handleChange}
                className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
              />
              <label htmlFor="inactive" className="text-[10px] font-bold uppercase text-gray-400">Mark Inactive</label>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-8">
            {/* Image Upload Section */}
            <div className="w-full md:w-1/3 space-y-4">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block text-center md:text-left">Product Image</label>
              <div className="relative group mx-auto md:mx-0">
                <div className="w-full aspect-square bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl flex flex-items-center justify-center overflow-hidden transition-all group-hover:border-blue-300 group-hover:bg-blue-50/30">
                  {formData.imageUrl ? (
                    <img src={formData.imageUrl} alt="Product preview" className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center justify-center p-6 text-center">
                      <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 mb-3 group-hover:text-blue-500 group-hover:bg-white transition-all shadow-sm">
                        <Plus size={24} />
                      </div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 group-hover:text-blue-600">Select Image</p>
                      <p className="text-[9px] text-gray-300 mt-1 font-bold">PNG, JPG up to 2MB</p>
                    </div>
                  )}
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      if (file.size > 2 * 1024 * 1024) {
                        alert('Image size must be less than 2MB');
                        return;
                      }
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        setFormData(prev => ({ ...prev, imageUrl: reader.result as string }));
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                  className="absolute inset-0 opacity-0 cursor-pointer z-10"
                />
                {formData.imageUrl && (
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, imageUrl: '' }))}
                    className="absolute -top-2 -right-2 bg-rose-500 text-white p-1.5 rounded-full shadow-lg hover:bg-rose-600 transition-all z-20"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>

            {/* Identification Fields */}
            <div className="flex-1 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Item Code</label>
                  <input
                    type="text"
                    name="itemCode"
                    value={formData.itemCode}
                    onChange={handleChange}
                    placeholder="e.g. MI-001"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-medium"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Item Name</label>
                  <input
                    type="text"
                    name="itemName"
                    value={formData.itemName}
                    onChange={handleChange}
                    placeholder="e.g. Engine Oil 20L"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-medium"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={4}
                  placeholder="Full product specification..."
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-medium"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Unit Name</label>
              <select
                name="unitName"
                value={formData.unitName}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-medium font-bold text-slate-700"
                required
              >
                <option value="">Select Unit</option>
                {availableUnits.map(unit => (
                  <option key={unit.id} value={unit.name}>{unit.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Valuation Method</label>
              <select
                name="valuationMethod"
                value={formData.valuationMethod}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-medium font-bold text-indigo-600"
              >
                <option value="FirstInFirstOut">First In-First Out (FIFO)</option>
                <option value="WeightedAverage">Weighted Average Cost</option>
                <option value="Manual">Manual</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Division</label>
              <select
                name="division"
                value={formData.division}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-medium"
              >
                <option value="">Select Division/Location</option>
                <option value="General">General</option>
                {availableDivisions.map(div => (
                  <option key={div.id} value={div.name}>{div.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Category</label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-medium font-bold text-slate-700"
              >
                <option value="">Select Category</option>
                {availableCategories.map(cat => (
                  <option key={cat.id} value={cat.name}>{cat.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Stock & Best Practice Limits */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2 bg-white p-8 rounded-2xl border border-gray-200 shadow-sm space-y-8">
            <h2 className="text-[12px] font-black uppercase tracking-[0.2em] text-blue-600 border-b border-gray-50 pb-4">Stock Parameters</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
                  Qty on Hand
                  <HelpCircle size={12} className="text-gray-300" />
                </label>
                <div className="w-full px-4 py-3 bg-slate-100 border border-slate-200 rounded-xl text-slate-500 font-black cursor-not-allowed flex items-center gap-2">
                  {formData.qtyOnHand || 0}
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">(Managed by Transactions)</span>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Qty Desired</label>
                <input
                  type="number"
                  name="qtyDesired"
                  value={formData.qtyDesired}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-medium"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Reorder Level</label>
                <input
                  type="number"
                  name="reorderLevel"
                  value={formData.reorderLevel}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-medium"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Reserved Qty</label>
                <div className="w-full px-4 py-3 bg-amber-50 border border-amber-100 rounded-xl text-amber-600 font-black">
                  {formData.qtyReserved || 0}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Margin (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    name="marginPercentage"
                    value={formData.marginPercentage}
                    onChange={handleChange}
                    placeholder="e.g. 20"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-medium font-bold text-slate-700"
                  />
              </div>
            </div>
          </div>

          <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm space-y-6 flex flex-col justify-center">
            <h2 className="text-[11px] font-black uppercase tracking-wider text-gray-400 text-center mb-4">Print Options</h2>
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100 hover:bg-gray-100 transition-all cursor-pointer">
                <input
                  type="checkbox"
                  name="hideItemName"
                  id="hideItemName"
                  checked={formData.hideItemName}
                  onChange={handleChange}
                  className="w-5 h-5 text-blue-600 rounded-lg border-gray-300 focus:ring-blue-500"
                />
                <label htmlFor="hideItemName" className="text-[11px] font-bold text-gray-600 cursor-pointer">Hide item name on printed document</label>
              </div>
              <p className="text-[10px] text-gray-400 italic text-center px-4">
                Reflects the print screen for sales documents and receipts.
              </p>
            </div>
          </div>
        </div>

        {/* Accounting & Auto-Fill */}
        <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm space-y-8">
          <h2 className="text-[12px] font-black uppercase tracking-[0.2em] text-blue-600 border-b border-gray-50 pb-4">Accounting & Automation</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Custom Income Account</label>
              <select
                name="incomeAccount"
                value={formData.incomeAccount}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-medium"
              >
                <option value="">Select Account</option>
                <option value="Inventory Sales">Inventory Sales</option>
                <option value="Service Income">Service Income</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Custom Expense Account</label>
              <select
                name="expenseAccount"
                value={formData.expenseAccount}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-medium"
              >
                <option value="">Select Account</option>
                <option value="Cost of Goods Sold">Cost of Goods Sold</option>
                <option value="Stock Write-off">Stock Write-off</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <h3 className="col-span-full text-[10px] font-black uppercase tracking-widest text-gray-300 mb-2">Auto-fill Preferences</h3>
            {[
              { name: 'autoFillDescription', label: 'Auto-fill Line Description' },
              { name: 'autoFillPurchasePrice', label: 'Auto-fill Purchase Unit Price' },
              { name: 'autoFillSalesPrice', label: 'Auto-fill Sales Unit Price' },
              { name: 'autoFillDivision', label: 'Auto-fill Sales Division' },
              { name: 'autoFillTaxCode', label: 'Auto-fill Tax Code' },
            ].map(pref => (
              <div key={pref.name} className="flex items-center gap-3 p-3 bg-gray-50/50 rounded-lg border border-gray-100">
                <input
                  type="checkbox"
                  name={pref.name}
                  id={pref.name}
                  checked={(formData as any)[pref.name]}
                  onChange={handleChange}
                  className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                />
                <label htmlFor={pref.name} className="text-[11px] font-semibold text-gray-600">{pref.label}</label>
              </div>
            ))}
          </div>
        </div>

        {isEdit && (
          <div className="flex justify-end pt-4">
            <button
              type="button"
              onClick={handleDelete}
              className="group flex items-center gap-2 text-rose-400 font-bold text-[11px] uppercase tracking-widest hover:text-rose-600 transition-all"
            >
              <Trash2 size={16} className="group-hover:scale-110 transition-transform" /> Delete Item
            </button>
          </div>
        )}
      </form>
    </div>
  );
};


export default NewInventoryItemView;
